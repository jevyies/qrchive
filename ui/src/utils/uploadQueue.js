import { axiosInstance } from '../plugins/axios.js'

/**
 * High-Volume Concurrency Upload Queue for QRchive
 * Supports up to 500+ photos with 3-worker concurrency and adaptive sizing.
 */
export class UploadQueue {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 3
    this.chunkSize = options.chunkSize || 5 * 1024 * 1024 // 5MB chunks for large files
    this.adaptiveThreshold = options.adaptiveThreshold || 10 * 1024 * 1024 // 10MB threshold

    this.onProgress = options.onProgress || (() => {})
    this.onFileComplete = options.onFileComplete || (() => {})
    this.onFileError = options.onFileError || (() => {})
    this.onFinish = options.onFinish || (() => {})

    this.queue = []
    this.totalFiles = 0
    this.completedCount = 0
    this.failedCount = 0
    this.activeWorkers = 0
    this.isPaused = false
    this.isCancelled = false
    this.batchId = null
    this.eventId = null
    this.uploaderInfo = {}
  }

  /**
   * Initializes a batch on the backend Redis server and starts worker processing
   */
  async startBatch({ files, eventId, uploadedBy, deviceName, deviceSerial }) {
    if (!files || files.length === 0) return

    this.eventId = eventId
    this.uploaderInfo = { uploadedBy, deviceName, deviceSerial }
    this.queue = Array.from(files)
    this.totalFiles = this.queue.length
    this.completedCount = 0
    this.failedCount = 0
    this.isPaused = false
    this.isCancelled = false

    // 1. Initialize Redis batch session on backend
    try {
      const { data } = await axiosInstance.post('/api/photos/batch/init', {
        eventId,
        totalFiles: this.totalFiles,
        uploadedBy,
        deviceName: deviceName || (typeof navigator !== 'undefined' ? navigator.userAgent : 'Browser'),
        deviceSerial: deviceSerial || 'WEB-CLIENT',
      })
      this.batchId = data?.batch?.batchId || null
    } catch (err) {
      console.warn('[UploadQueue] Could not init Redis batch, continuing with direct uploads:', err)
      this.batchId = null
    }

    this._notifyProgress()

    // 2. Launch concurrent workers
    const workerPromises = []
    const workerCount = Math.min(this.concurrency, this.totalFiles)
    for (let i = 0; i < workerCount; i++) {
      workerPromises.push(this._runWorker(i))
    }

    await Promise.all(workerPromises)

    this.onFinish({
      batchId: this.batchId,
      total: this.totalFiles,
      completed: this.completedCount,
      failed: this.failedCount,
    })
  }

  async _runWorker(workerId) {
    while (this.queue.length > 0 && !this.isCancelled) {
      if (this.isPaused) {
        await new Promise((r) => setTimeout(r, 400))
        continue
      }

      const file = this.queue.shift()
      if (!file) break

      this.activeWorkers++
      try {
        let photoResult = null
        // Adaptive strategy: Direct upload for < 10MB, Chunked for >= 10MB
        if (file.size >= this.adaptiveThreshold) {
          photoResult = await this._uploadLargeFileInChunks(file)
        } else {
          photoResult = await this._uploadDirect(file)
        }

        this.completedCount++
        this.onFileComplete(file, photoResult)
      } catch (err) {
        console.error(`[UploadQueue Worker ${workerId}] Upload failed for ${file.name}:`, err)
        this.failedCount++
        this.onFileError(file, err)
      } finally {
        this.activeWorkers--
        this._notifyProgress(file)
      }
    }
  }

  /**
   * Fast 1-step direct upload for photos < 10MB
   */
  async _uploadDirect(file) {
    const formData = new FormData()
    formData.append('eventId', String(this.eventId))
    if (this.batchId) formData.append('batchId', this.batchId)
    if (this.uploaderInfo.uploadedBy) formData.append('uploadedBy', this.uploaderInfo.uploadedBy)
    if (this.uploaderInfo.deviceName) formData.append('deviceName', this.uploaderInfo.deviceName)
    if (this.uploaderInfo.deviceSerial) formData.append('deviceSerial', this.uploaderInfo.deviceSerial)
    formData.append('chunk', file, file.name)

    const headers = { 'Content-Type': 'multipart/form-data' }
    if (this.batchId) headers['x-batch-id'] = this.batchId

    const res = await axiosInstance.post('/api/photos/upload/direct', formData, { headers })
    return res.data?.photo
  }

  /**
   * Resilient chunked upload for large photos / 4K clips >= 10MB
   */
  async _uploadLargeFileInChunks(file) {
    const totalChunks = Math.ceil(file.size / this.chunkSize)

    // 1. Init upload session
    const initRes = await axiosInstance.post('/api/photos/upload/init', {
      eventId: this.eventId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'image/jpeg',
      totalChunks,
      uploadedBy: this.uploaderInfo.uploadedBy,
      deviceName: this.uploaderInfo.deviceName,
      deviceSerial: this.uploaderInfo.deviceSerial,
    })

    const { photoId, uploadId } = initRes.data
    const parts = []

    // 2. Upload chunks sequentially for this single file
    for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
      if (this.isCancelled) throw new Error('Upload cancelled')

      const start = (partNumber - 1) * this.chunkSize
      const end = Math.min(file.size, start + this.chunkSize)
      const chunkBlob = file.slice(start, end)

      const chunkForm = new FormData()
      chunkForm.append('photoId', String(photoId))
      chunkForm.append('uploadId', uploadId)
      chunkForm.append('partNumber', String(partNumber))
      chunkForm.append('chunk', chunkBlob, `${file.name}.part${partNumber}`)

      const chunkRes = await axiosInstance.post('/api/photos/upload/chunk', chunkForm, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      parts.push({
        partNumber,
        etag: chunkRes.data?.etag || `chunk_${partNumber}`,
      })
    }

    // 3. Complete chunked upload
    const completeRes = await axiosInstance.post('/api/photos/upload/complete', {
      photoId,
      uploadId,
      parts,
      batchId: this.batchId,
    })

    return completeRes.data?.photo
  }

  _notifyProgress(currentFile = null) {
    const total = this.totalFiles
    const done = this.completedCount + this.failedCount
    const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0

    this.onProgress({
      batchId: this.batchId,
      total,
      completed: this.completedCount,
      failed: this.failedCount,
      percent,
      activeWorkers: this.activeWorkers,
      remainingInQueue: this.queue.length,
      currentFile,
    })
  }

  pause() {
    this.isPaused = true
  }

  resume() {
    this.isPaused = false
  }

  cancel() {
    this.isCancelled = true
    this.queue = []
  }
}
