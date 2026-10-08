/**
 * Utility helpers for media handling, video duration validation, and thumbnail extraction
 */

export const isVideoFile = (file) => {
    if (!file) return false
    return Boolean(
        file.type?.startsWith('video/') ||
        /\.(mp4|webm|mov|m4v|3gp|mkv|avi)$/i.test(file.name || '')
    )
}

export const getImageDataUrl = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result || '')
        reader.onerror = () => resolve('')
        reader.readAsDataURL(file)
    })
}

export const getVideoDetails = (file) => {
    return new Promise((resolve) => {
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.playsInline = true
        video.muted = true
        const objectUrl = URL.createObjectURL(file)
        video.src = objectUrl

        let finished = false
        const done = (result) => {
            if (finished) return
            finished = true
            resolve(result)
        }

        const timeout = setTimeout(() => {
            URL.revokeObjectURL(objectUrl)
            done({
                valid: false,
                error: `Timed out reading video "${file.name}". Please ensure it is a valid video file.`,
            })
        }, 8000)

        video.onloadedmetadata = () => {
            const duration = video.duration
            if (!duration || isNaN(duration) || Math.round(duration) > 30) {
                clearTimeout(timeout)
                URL.revokeObjectURL(objectUrl)
                done({
                    valid: false,
                    duration: duration || 0,
                    error: `Video "${file.name}" is ${Math.round(duration || 0)} seconds long. Videos must be 30 seconds or less.`,
                })
                return
            }

            // Duration is within 30 seconds (<= 30s)
            let seekTimer = setTimeout(() => {
                clearTimeout(timeout)
                done({
                    valid: true,
                    duration,
                    thumbnailDataUrl: '',
                    videoUrl: objectUrl,
                })
            }, 2000)

            video.onseeked = () => {
                clearTimeout(seekTimer)
                clearTimeout(timeout)
                let thumbnailDataUrl = ''
                try {
                    const canvas = document.createElement('canvas')
                    const width = video.videoWidth || 720
                    const height = video.videoHeight || 1280
                    canvas.width = width
                    canvas.height = height
                    const ctx = canvas.getContext('2d')
                    ctx.drawImage(video, 0, 0, width, height)
                    thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.85)
                } catch (e) {
                    console.warn('[Media] Video thumbnail canvas failed:', e)
                }
                done({
                    valid: true,
                    duration,
                    thumbnailDataUrl,
                    videoUrl: objectUrl,
                })
            }

            try {
                video.currentTime = Math.min(0.2, Math.max(0.01, duration / 2))
            } catch {
                clearTimeout(seekTimer)
                clearTimeout(timeout)
                done({
                    valid: true,
                    duration,
                    thumbnailDataUrl: '',
                    videoUrl: objectUrl,
                })
            }
        }

        video.onerror = () => {
            clearTimeout(timeout)
            URL.revokeObjectURL(objectUrl)
            done({
                valid: false,
                error: `Failed to load video "${file.name}". Please ensure it is a supported video format.`,
            })
        }
    })
}

/**
 * Downloads a media file (photo or video) directly to the user's device.
 * Prioritizes backend proxy routes with Content-Disposition headers to bypass
 * external Cloudflare R2 CORS restrictions and prevent opening in a new tab.
 */
export const downloadMediaFile = async ({
    id = null,
    url = '',
    storageKey = '',
    fileName = '',
    defaultPrefix = 'photo',
    isVideo = false,
}) => {
    // 1. Resolve backend API base URL
    const apiBase =
        (typeof import.meta !== 'undefined' &&
            (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_BACKEND_URL)) ||
        'http://localhost:3001'
    const cleanBase = apiBase.replace(/\/+$/, '')

    // 2. Build list of candidate endpoints to attempt
    const candidateUrls = []

    // Candidate A: Dedicated backend ID download route (uses R2 SDK directly + Content-Disposition)
    if (id && !isNaN(Number(id))) {
        candidateUrls.push(`${cleanBase}/api/photos/${id}/download`)
    }

    // Candidate B: Backend proxy download endpoint by storageKey or URL
    if (storageKey || url) {
        const params = new URLSearchParams()
        if (url) params.set('url', url)
        if (storageKey) params.set('key', storageKey)
        if (fileName) params.set('name', fileName)
        candidateUrls.push(`${cleanBase}/api/photos/download-file?${params.toString()}`)
    }

    // Candidate C: Direct media URL
    if (url) {
        let directUrl = url
        if (
            !directUrl.startsWith('http://') &&
            !directUrl.startsWith('https://') &&
            !directUrl.startsWith('blob:') &&
            !directUrl.startsWith('data:')
        ) {
            const cleanPath = directUrl.startsWith('/') ? directUrl : `/${directUrl}`
            directUrl = `${cleanBase}${cleanPath}`
        }
        candidateUrls.push(directUrl)
    }

    if (candidateUrls.length === 0) {
        throw new Error('Missing URL or identifier for download')
    }

    // 3. Attempt candidates in priority order
    let lastError = null
    for (const targetUrl of candidateUrls) {
        try {
            const response = await fetch(targetUrl, { mode: 'cors' })
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const blob = await response.blob()
            const blobUrl = window.URL.createObjectURL(blob)

            // Determine file extension
            let ext = 'jpg'
            if (blob.type) {
                const mime = blob.type.toLowerCase()
                if (mime.includes('png')) ext = 'png'
                else if (mime.includes('webp')) ext = 'webp'
                else if (mime.includes('gif')) ext = 'gif'
                else if (mime.includes('mp4')) ext = 'mp4'
                else if (mime.includes('webm')) ext = 'webm'
                else if (mime.includes('quicktime') || mime.includes('mov')) ext = 'mov'
                else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg'
                else if (mime.includes('svg')) ext = 'svg'
            } else if (isVideo) {
                ext = 'mp4'
            } else if (targetUrl) {
                const match = targetUrl.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/)
                if (match && match[1]) ext = match[1].toLowerCase()
            }

            let finalFileName = fileName
            if (!finalFileName) {
                finalFileName = `${defaultPrefix}-${Date.now()}.${ext}`
            } else if (!/\.[a-zA-Z0-9]+$/.test(finalFileName)) {
                finalFileName = `${finalFileName}.${ext}`
            }

            const link = document.createElement('a')
            link.href = blobUrl
            link.download = finalFileName
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            setTimeout(() => {
                window.URL.revokeObjectURL(blobUrl)
            }, 2000)

            return finalFileName
        } catch (err) {
            lastError = err
            // Try next candidate endpoint
        }
    }

    // 4. Fallback: If blob fetch is blocked across all endpoints, trigger direct anchor download on backend proxy
    const fallbackUrl = candidateUrls[0] || url
    const link = document.createElement('a')
    link.href = fallbackUrl
    link.download = fileName || `${defaultPrefix}-${Date.now()}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return fileName
}

