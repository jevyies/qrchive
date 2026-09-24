<route lang="yaml">
meta:
  layout: blank
  public: true
  keepAlive: true
</route>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { axiosInstance } from '@/plugins/axios'
import { useEventVaultStore } from '@/stores/eventVault'
import keannAndJennyBg from '@/assets/images/keann-and-jenny.jpg'
import LightBox from '@/views/LightBox.vue'
import Camera from '@/views/Camera.vue'
import {
    saveDemoQuickPhoto,
    getDemoQuickPhotos,
    saveDemoChecklistMoment,
    getDemoChecklistMoments,
    getDemoPhotosCount,
    clearDemoData,
} from '@/utils/demoDb'
import { getStoredEventSession, saveStoredEventSession } from '@/utils/device'

const route = useRoute()
const router = useRouter()
const eventVaultStore = useEventVaultStore()
const { uploadedQuickPhotos, moments } = storeToRefs(eventVaultStore)

const currentWedding = computed(() => eventVaultStore.currentWedding)

// Experience Switcher state: 'checklist' or 'quick'
const captureMode = ref('quick')

const switchExperience = (mode) => {
    captureMode.value = mode
}

// Quick Capture photo stacking & real upload queue state
const pendingQuickPhotos = ref([])
const isUploadingQuick = ref(false)
const uploadedStreamRef = ref(null)

// Helper to convert dataUrl to Blob, or create a realistic sample JPEG
const getBlobFromCapturedPhoto = async (capturedUrl) => {
    if (capturedUrl && capturedUrl.startsWith('data:')) {
        try {
            const res = await fetch(capturedUrl)
            return await res.blob()
        } catch {
            // fallback below
        }
    }
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1440
    const ctx = canvas.getContext('2d')
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1440)
    gradient.addColorStop(0, '#0f172a')
    gradient.addColorStop(0.5, '#1e40af')
    gradient.addColorStop(1, '#1e3a8a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1080, 1440)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 54px sans-serif'
    ctx.textAlign = 'center'
    const eventLabel = String(route.params.id || 'MOMENT').toUpperCase()
    ctx.fillText(`QRCHIVE • ${eventLabel}`, 540, 680)
    ctx.font = '36px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.fillText('Instant Photo Drop • ' + new Date().toLocaleTimeString(), 540, 750)
    ctx.font = '28px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'
    ctx.fillText('Cloudflare R2 Synced', 540, 810)

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9)
    })
}

// Guest session credentials helper
const getGuestCredentials = () => {
    let storedCurrentEvent = null
    if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('currentEvent')
        if (raw) {
            try {
                storedCurrentEvent = JSON.parse(raw)
            } catch (e) {
                console.error('[Quests] Failed to parse currentEvent:', e)
            }
        }
    }

    const eventCode = storedCurrentEvent?.eventCode || route.params.id || 'demo-event'
    const guestCode =
        storedCurrentEvent?.guestCode ||
        (typeof localStorage !== 'undefined' && localStorage.getItem('qrchive_guest_code')) ||
        'guest'
    const guestName =
        storedCurrentEvent?.guestName ||
        (typeof localStorage !== 'undefined' &&
            (localStorage.getItem('qrchive_guest_name') || localStorage.getItem('guestName'))) ||
        'Guest'

    return { eventCode, guestCode, guestName }
}

// Sequential upload processor with live percentage blue border signal and float animation
const startQuickUploads = async () => {
    if (isUploadingQuick.value || pendingQuickPhotos.value.length === 0) return
    isUploadingQuick.value = true

    const { eventCode, guestCode, guestName } = getGuestCredentials()

    while (pendingQuickPhotos.value.length > 0) {
        const currentItem = pendingQuickPhotos.value[0]
        currentItem.status = 'uploading'
        currentItem.uploadPercent = 5

        try {
            const isVideo = Boolean(currentItem.isVideo || currentItem.type === 'video')
            if (!currentItem.blob && !isVideo) {
                currentItem.blob = await getBlobFromCapturedPhoto(currentItem.dataUrl)
            }

            const defaultExt = isVideo ? (currentItem.mimeType?.includes('webm') ? 'webm' : 'mp4') : 'jpg'
            const fileName = currentItem.fileName || `${guestCode}_${Date.now()}.${defaultExt}`

            if (String(route.params.id) === 'demo-event') {
                // Simulate smooth progress animation for demo mode
                for (let p = 25; p <= 100; p += 25) {
                    currentItem.uploadPercent = p
                    await new Promise((r) => setTimeout(r, 40))
                }
                currentItem.uploadPercent = 100
                await new Promise((r) => setTimeout(r, 100))

                // Trigger floating animation
                currentItem.isFloating = true
                await new Promise((r) => setTimeout(r, 550))

                // Save to local IndexedDB including the raw video blob
                const savedPhoto = await saveDemoQuickPhoto({
                    id: currentItem.id,
                    url: currentItem.videoUrl || currentItem.dataUrl,
                    fullUrl: currentItem.videoUrl || currentItem.dataUrl,
                    thumbnailUrl: currentItem.dataUrl,
                    isVideo: isVideo,
                    videoUrl: currentItem.videoUrl || null,
                    blob: currentItem.blob || null,
                    videoBlob: isVideo ? (currentItem.videoBlob || currentItem.blob) : null,
                    duration: currentItem.duration || null,
                    fileName: fileName,
                    uploadedBy: guestName || 'You',
                    createdAt: new Date().toISOString(),
                    likes: 0,
                    isLiked: false,
                })

                await updateDemoGalleryCount()

                // Add to centralized store (syncs with live vault)
                eventVaultStore.addUploadedPhoto(savedPhoto, { isChecklist: false })

                // Prepend newly uploaded photo to the beginning of the stream
                if (!uploadedQuickPhotos.value.some((q) => q.id === savedPhoto.id)) {
                    uploadedQuickPhotos.value.unshift({
                        id: savedPhoto.id,
                        url: savedPhoto.url,
                        fullUrl: savedPhoto.fullUrl,
                        thumbnailUrl: savedPhoto.thumbnailUrl,
                        isVideo: isVideo,
                        videoUrl: savedPhoto.videoUrl || currentItem.videoUrl,
                        fileName: savedPhoto.fileName,
                        uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        guest: savedPhoto.uploadedBy || 'You',
                        likes: 0,
                        isLiked: false,
                        isNew: true,
                    })
                }

                // Remove uploaded photo from pending deck
                pendingQuickPhotos.value.shift()

                // Smoothly scroll horizontal stream to beginning
                await nextTick()
                if (uploadedStreamRef.value) {
                    uploadedStreamRef.value.scrollTo({ left: 0, behavior: 'smooth' })
                }

                await new Promise((r) => setTimeout(r, 200))
                continue
            }

            const formData = new FormData()
            formData.append('eventId', String(eventCode))
            formData.append('eventCode', String(eventCode))
            formData.append('guestCode', String(guestCode))
            formData.append('captureMode', 'quick')
            formData.append('uploadedBy', guestName)
            formData.append(
                'deviceName',
                typeof navigator !== 'undefined' && navigator.userAgent.includes('Mobile')
                    ? 'Mobile Device'
                    : 'Desktop Browser',
            )
            if (isVideo && currentItem.dataUrl) {
                formData.append('thumbnailBase64', currentItem.dataUrl)
            }
            formData.append('file', currentItem.blob, fileName)

            const response = await axiosInstance.post('/api/photos/upload/direct', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-event-id': String(eventCode),
                    'x-event-code': String(eventCode),
                    'x-guest-code': String(guestCode),
                    'x-capture-mode': 'quick',
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const pct = Math.min(98, Math.round((progressEvent.loaded * 100) / progressEvent.total))
                        currentItem.uploadPercent = pct
                    } else {
                        currentItem.uploadPercent = Math.min(95, (currentItem.uploadPercent || 5) + 20)
                    }
                },
            })

            currentItem.uploadPercent = 100
            await new Promise((r) => setTimeout(r, 200))

            // Trigger floating animation
            currentItem.isFloating = true
            await new Promise((r) => setTimeout(r, 550))

            // Prepend newly uploaded photo/video to the beginning of the stream and centralized store
            const uploadedPhoto = response.data?.photo
            eventVaultStore.addUploadedPhoto(uploadedPhoto || {
                id: currentItem.id,
                url: currentItem.dataUrl,
                fullUrl: currentItem.dataUrl,
                thumbnailUrl: currentItem.dataUrl,
                isVideo: isVideo,
                videoUrl: currentItem.videoUrl,
                fileName: fileName,
                uploadedBy: guestName || 'You',
                createdAt: new Date().toISOString(),
                likes: 0,
                isLiked: false,
            }, { isChecklist: false })

            if (uploadedPhoto && !uploadedQuickPhotos.value.some((q) => q.id === uploadedPhoto.id)) {
                uploadedQuickPhotos.value.unshift({
                    id: uploadedPhoto.id,
                    url: uploadedPhoto.thumbnailUrl || uploadedPhoto.url || currentItem.dataUrl,
                    fullUrl: uploadedPhoto.fullUrl || uploadedPhoto.url || currentItem.dataUrl,
                    thumbnailUrl: uploadedPhoto.thumbnailUrl || currentItem.dataUrl,
                    isVideo: isVideo,
                    videoUrl: uploadedPhoto.url || currentItem.videoUrl,
                    fileName: uploadedPhoto.fileName || fileName,
                    uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    guest: uploadedPhoto.uploadedBy || 'You',
                    likes: 0,
                    isLiked: false,
                    isNew: true,
                })
            }

            // Remove uploaded photo from pending deck
            pendingQuickPhotos.value.shift()

            // Smoothly scroll horizontal stream to beginning
            await nextTick()
            if (uploadedStreamRef.value) {
                uploadedStreamRef.value.scrollTo({ left: 0, behavior: 'smooth' })
            }

            await new Promise((r) => setTimeout(r, 200))
        } catch (err) {
            console.error('Failed to upload quick drop photo:', err)
            currentItem.status = 'error'
            currentItem.uploadPercent = 0
            await new Promise((r) => setTimeout(r, 800))
            pendingQuickPhotos.value.shift()
        }
    }

    isUploadingQuick.value = false
}

// Upload captured checklist moment to backend with captureMode === 'checklist' and checkListId folder format
const uploadChecklistPhoto = async (momentItem, fileOrBlob, localPreviewUrl, extra = {}) => {
    if (!momentItem || !momentItem.id) return
    const checkListId = momentItem.id
    const isVideo = Boolean(extra.isVideo || momentItem.isVideo)

    // Immediately update local preview in UI & activate uploading border frame
    const found = moments.value.find((m) => Number(m.id) === Number(checkListId))
    let progressTimer = null
    let currentPct = 8

    if (found) {
        found.captured = true
        found.image = localPreviewUrl
        found.isVideo = isVideo
        found.videoUrl = extra.videoUrl || null
        found.videoBlob = isVideo ? fileOrBlob : null
        found.isUploading = true
        found.uploadPercent = currentPct
        found.showSuccessCheck = false

        // Smooth visual ticker so the running border is visibly running to the user
        progressTimer = setInterval(() => {
            if (currentPct < 90) {
                currentPct += Math.floor(Math.random() * 4) + 6
                if (currentPct > 90) currentPct = 90
                found.uploadPercent = currentPct
            }
        }, 50)
    }

    const { eventCode, guestCode, guestName } = getGuestCredentials()

    let blob = fileOrBlob
    if (!blob && !isVideo) {
        blob = await getBlobFromCapturedPhoto(localPreviewUrl)
    }

    const defaultExt = isVideo ? (extra.mimeType?.includes('webm') ? 'webm' : 'mp4') : 'jpg'
    const fileName = extra.fileName || `${guestCode}_${Date.now()}.${defaultExt}`

    if (String(route.params.id) === 'demo-event') {
        if (progressTimer) clearInterval(progressTimer)

        if (found) {
            // Smoothly complete the remaining progress circle to 100%
            while (currentPct < 100) {
                currentPct = Math.min(100, currentPct + 20)
                found.uploadPercent = currentPct
                await new Promise((r) => setTimeout(r, 35))
            }

            found.captured = true
            found.image = localPreviewUrl
            found.fullImage = localPreviewUrl
            found.isVideo = isVideo
            found.videoUrl = extra.videoUrl || localPreviewUrl
            found.videoBlob = isVideo ? blob : null
            found.guest = guestName || 'You'
            found.showSuccessCheck = true

            // Save to IndexedDB demo database with its specific category and actual video blob
            const demoItem = {
                checklistId: checkListId,
                id: `demo_moment_${checkListId}`,
                title: found.title,
                name: found.name,
                category: found.category || 'reception',
                categoryLabel: found.categoryLabel || 'Reception',
                image: localPreviewUrl,
                fullImage: localPreviewUrl,
                url: localPreviewUrl,
                thumbnailUrl: localPreviewUrl,
                fullUrl: localPreviewUrl,
                isVideo: isVideo,
                videoUrl: extra.videoUrl || localPreviewUrl,
                blob: blob,
                videoBlob: isVideo ? blob : null,
                uploadedBy: guestName || 'You',
                createdAt: new Date().toISOString(),
                likes: 0,
                isLiked: false,
            }
            await saveDemoChecklistMoment(demoItem)
            eventVaultStore.addUploadedPhoto(demoItem, { isChecklist: true, checklistId: checkListId })

            await updateDemoGalleryCount()

            // Center checkmark will disappear after exactly 1 second
            setTimeout(() => {
                found.showSuccessCheck = false
                found.isUploading = false
            }, 1000)
        }
        return
    }

    const formData = new FormData()
    formData.append('eventId', String(eventCode))
    formData.append('eventCode', String(eventCode))
    formData.append('guestCode', String(guestCode))
    formData.append('checkListId', String(checkListId))
    formData.append('checklistId', String(checkListId))
    formData.append('captureMode', 'checklist')
    formData.append('uploadedBy', guestName)
    formData.append(
        'deviceName',
        typeof navigator !== 'undefined' && navigator.userAgent.includes('Mobile')
            ? 'Mobile Device'
            : 'Desktop Browser',
    )
    if (isVideo && (extra.dataUrl || localPreviewUrl)) {
        formData.append('thumbnailBase64', extra.dataUrl || localPreviewUrl)
    }
    formData.append('file', blob, fileName)

    try {
        const response = await axiosInstance.post('/api/photos/upload/direct', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'x-event-id': String(eventCode),
                'x-event-code': String(eventCode),
                'x-guest-code': String(guestCode),
                'x-checklist-id': String(checkListId),
                'x-capture-mode': 'checklist',
            },
            onUploadProgress: (progressEvent) => {
                if (found && progressEvent.total) {
                    const actualPct = Math.min(92, Math.round((progressEvent.loaded * 100) / progressEvent.total))
                    if (actualPct > currentPct) {
                        currentPct = actualPct
                        found.uploadPercent = currentPct
                    }
                }
            },
        })

        if (progressTimer) clearInterval(progressTimer)

        const uploadedPhoto = response.data?.photo
        if (uploadedPhoto) {
            eventVaultStore.addUploadedPhoto(uploadedPhoto, { isChecklist: true, checklistId: checkListId })
        }
        if (found) {
            // Smoothly complete the remaining progress circle to 100%
            while (currentPct < 100) {
                currentPct = Math.min(100, currentPct + 15)
                found.uploadPercent = currentPct
                await new Promise((r) => setTimeout(r, 35))
            }

            if (uploadedPhoto?.url || uploadedPhoto?.thumbnailUrl) {
                found.image = uploadedPhoto.thumbnailUrl || (isVideo ? localPreviewUrl : uploadedPhoto.url)
                found.fullImage = uploadedPhoto.fullUrl || uploadedPhoto.url
                found.videoUrl = uploadedPhoto.url
                found.isVideo = isVideo
                found.guest = uploadedPhoto.uploadedBy || 'You'
            }

            // Put a check in the center of the image after successful upload
            found.showSuccessCheck = true

            // Center checkmark will disappear after exactly 1 second
            setTimeout(() => {
                found.showSuccessCheck = false
                found.isUploading = false
            }, 1000)
        }
    } catch (err) {
        if (progressTimer) clearInterval(progressTimer)
        console.error('[Quests] Failed to upload checklist photo to R2:', err)
        if (found) {
            found.isUploading = false
            found.showSuccessCheck = false
            found.uploadPercent = 0
        }
    }
}

// Fetch existing uploaded photos for current event via centralized store
const fetchExistingPhotos = async () => {
    await eventVaultStore.fetchPhotos({ eventId: route.params.id, limit: 10 })
}

// LightBox State & Handlers
const isLightboxOpen = ref(false)
const lightboxItems = ref([])
const lightboxIndex = ref(0)

const openQuickPhotoLightbox = (index) => {
    lightboxItems.value = uploadedQuickPhotos.value.map((p) => ({
        id: p.id,
        url: p.url,
        fullUrl: p.fullUrl || p.url,
        isVideo: Boolean(p.isVideo),
        videoUrl: p.videoUrl || p.fullUrl || p.url,
        videoBlob: p.videoBlob || p.blob || null,
        title: p.fileName ? `${p.isVideo ? 'Video' : 'Photo'}: ${p.fileName}` : (p.isVideo ? 'Quick Video' : 'Quick Drop'),
        guest: p.guest || 'You',
        time: p.uploadedAt || 'Just now',
        categoryLabel: p.isVideo ? 'Quick Video' : 'Quick Snap',
        likes: p.likes || 0,
        isLiked: Boolean(p.isLiked),
    }))
    lightboxIndex.value = Math.max(0, Math.min(index, lightboxItems.value.length - 1))
    isLightboxOpen.value = true
}

const openMomentLightbox = (moment) => {
    if (!moment.image && !moment.fullImage) return
    const list = moments.value
        .filter((m) => m.captured && (m.image || m.fullImage))
        .map((m) => ({
            id: m.id,
            url: m.image,
            fullUrl: m.fullImage || m.image,
            isVideo: Boolean(m.isVideo),
            videoUrl: m.videoUrl || m.fullImage || m.image,
            videoBlob: m.videoBlob || m.blob || null,
            title: m.title,
            guest: m.guest || 'You',
            time: m.time || 'Completed',
            categoryLabel: m.categoryLabel || 'Quest Moment',
            likes: m.likes || 0,
            isLiked: Boolean(m.isLiked),
        }))
    const idx = list.findIndex((m) => m.id === moment.id)
    lightboxItems.value = list
    lightboxIndex.value = idx !== -1 ? idx : 0
    isLightboxOpen.value = true
}

const toggleLightboxLike = async (item, event) => {
    if (event) event.stopPropagation()
    await eventVaultStore.toggleLike(item, event)
}

// File upload & Toast notification state
const fileInput = ref(null)
const currentTargetTitle = ref('')
// Camera Live Feed & Viewfinder Modal State
const isCameraOpen = ref(false)
const activeMoment = ref(null)

// Gallery storage & dynamic counts
const galleryPhotos = ref([])
const demoDbCount = ref(0)

const isDemoRoute = computed(() => {
    const eventId = String(route.params.id || '').toLowerCase().trim()
    return eventId === 'demo-event' || (route.path && route.path.includes('demo-event'))
})

const updateDemoGalleryCount = async () => {
    try {
        demoDbCount.value = await getDemoPhotosCount()
    } catch {
        demoDbCount.value = 0
    }
}

const galleryCount = computed(() => {
    if (isDemoRoute.value) {
        return (demoDbCount.value || 0) + (galleryPhotos.value?.length || 0)
    }
    const quickCount = uploadedQuickPhotos.value?.length || 0
    const checklistCount = (moments.value || []).filter((m) => Boolean(m.captured)).length
    const localGalleryCount = galleryPhotos.value?.length || 0
    return quickCount + checklistCount + localGalleryCount
})

const latestGalleryImage = computed(() => {
    if (galleryPhotos.value && galleryPhotos.value.length > 0) {
        return galleryPhotos.value[galleryPhotos.value.length - 1]
    }
    if (uploadedQuickPhotos.value && uploadedQuickPhotos.value.length > 0) {
        const first = uploadedQuickPhotos.value[0]
        if (first) {
            return first.thumbnailUrl || first.url || first.fullUrl || ''
        }
    }
    if (moments.value && moments.value.length > 0) {
        const capturedMoment = moments.value.find((m) => m.captured && (m.image || m.fullImage))
        if (capturedMoment) {
            return capturedMoment.image || capturedMoment.fullImage
        }
    }
    return 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_b45E9YjZPsE9FZqujCSRNTm6TpITBwM_TaJFgapEZqnACNNwtSVVLegXCWrGpfncDgbRxwks7l8wtobmCfqQkFQv34yOtgKuuNCrqjBvvgccMhT42aq0aHWZnTM-_kf98W7MIzPhbJg7cCIGS2Qy3CEH8ggjzWg0aUNB4Le6KuNEtqtn-DZAcxxNxm62OShpMnoE5uH6Kye6WAxV9WCfQwoP8bbVduYvD1BF5SQjqaIMfsDR8GxI'
})

const openCamera = (moment) => {
    if (isDemoRoute.value) {
        updateDemoGalleryCount()
    }
    activeMoment.value = moment || {
        id: 'quick',
        number: '⚡',
        title: 'Quick Snapshot',
        description: 'Instant candid capture saved to vault',
    }
    currentTargetTitle.value = activeMoment.value ? activeMoment.value.title : ''
    isCameraOpen.value = true
}

const handleCameraClose = () => {
    isCameraOpen.value = false
    // Trigger uploading when user closes camera in quick mode
    if (captureMode.value === 'quick' && pendingQuickPhotos.value.length > 0 && !isUploadingQuick.value) {
        startQuickUploads()
    }
}

const closeCamera = () => {
    handleCameraClose()
}

const handleCameraCapture = async ({ dataUrl, blob, moment, type, isVideo, videoUrl, duration, fileName, mimeType }) => {
    galleryPhotos.value.push(dataUrl)

    const isVid = Boolean(isVideo || type === 'video')
    let finalBlob = blob
    if (!finalBlob && !isVid) {
        finalBlob = await getBlobFromCapturedPhoto(dataUrl)
    }

    const currentMoment = moment || activeMoment.value
    const { guestCode } = getGuestCredentials()

    // If quick capture mode, push into pending stack (upload only when user clicks close button)
    if (captureMode.value === 'quick' || !currentMoment || currentMoment.id === 'quick') {
        const defaultExt = isVid ? (mimeType?.includes('webm') ? 'webm' : 'mp4') : 'jpg'
        const pendingItem = {
            id: 'quick_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            type: isVid ? 'video' : 'photo',
            isVideo: isVid,
            dataUrl: dataUrl,
            videoUrl: videoUrl || null,
            blob: finalBlob,
            videoBlob: isVid ? finalBlob : null,
            fileName: fileName || `${guestCode}_${Date.now()}.${defaultExt}`,
            mimeType: mimeType || (isVid ? 'video/mp4' : 'image/jpeg'),
            duration: duration || null,
            status: 'pending',
            uploadPercent: 0,
            isFloating: false,
        }
        pendingQuickPhotos.value.push(pendingItem)
    }

    // Update active moment status and trigger checklist upload
    // When checklist, record only one video if user selected video tab (or 1 photo) and close camera
    if (currentMoment && currentMoment.id !== 'quick') {
        const cleanTitle = currentMoment.title ? currentMoment.title.replace(' (Replace Entry)', '') : ''
        const found = moments.value.find(
            (m) => Number(m.id) === Number(currentMoment.id) || m.title === cleanTitle || m.title === currentMoment.title,
        )
        if (found) {
            found.captured = true
            found.image = dataUrl
            found.fullImage = dataUrl
            found.isVideo = isVid
            found.videoUrl = videoUrl || null
            found.videoBlob = isVid ? finalBlob : null
            uploadChecklistPhoto(found, finalBlob, dataUrl, {
                isVideo: isVid,
                videoUrl: videoUrl,
                fileName: fileName,
                mimeType: mimeType,
            })
        }
    }

    // In checklist mode: record only one entry/video, then close camera viewfinder
    if (captureMode.value !== 'quick' && currentMoment && currentMoment.id !== 'quick') {
        setTimeout(() => {
            isCameraOpen.value = false
        }, 500)
    }
}

// Fallback native gallery picker
const openGalleryPicker = () => {
    if (fileInput.value) {
        fileInput.value.removeAttribute('capture')
        fileInput.value.click()
    }
}

const handleFileChange = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
        const rawTitle = currentTargetTitle.value || currentWedding.value.couple

        const reader = new FileReader()
        reader.onload = (event) => {
            if (event.target && event.target.result) {
                const dataResult = event.target.result
                galleryPhotos.value.push(dataResult)

                if (currentTargetTitle.value || (activeMoment.value && activeMoment.value.id !== 'quick')) {
                    const cleanTitle = (currentTargetTitle.value || '').replace(' (Replace Entry)', '')
                    const matched = moments.value.find(
                        (m) =>
                            (activeMoment.value && Number(m.id) === Number(activeMoment.value.id)) ||
                            m.title === cleanTitle,
                    )
                    if (matched) {
                        matched.captured = true
                        matched.image = dataResult
                        uploadChecklistPhoto(matched, files[0], dataResult)
                    }
                }
            }
        }
        reader.readAsDataURL(files[0])
        e.target.value = ''
    }
}

// Demo category mapping for demo checklist items
const demoCategoryMap = [
    { id: 1, category: 'grand-entrance', label: 'Grand Entrance', keywords: ['entrance'] },
    { id: 2, category: 'first-dance', label: 'First Dance', keywords: ['first dance'] },
    { id: 3, category: 'dance-with-parents', label: 'Dance with Parents', keywords: ['parent', 'parents'] },
    { id: 4, category: 'guests-laughing', label: 'Guests Laughing', keywords: ['laughing', 'guests'] },
    { id: 5, category: 'emcee', label: 'Emcee on Stage', keywords: ['emcee', 'mc'] },
    { id: 6, category: 'grooms-surprise', label: "Groom's Surprise", keywords: ['groom'] },
    { id: 7, category: 'brides-surprise', label: "Bride's Surprise", keywords: ['bride'] },
    { id: 8, category: 'cake-cutting', label: 'Cake Cutting', keywords: ['cake'] },
    { id: 9, category: 'performances', label: 'Performances', keywords: ['performance', 'band'] },
    { id: 10, category: 'couple-message', label: "Couple's Message", keywords: ['message'] },
]

function getDemoCategoryForItem(item, index) {
    if (!item) return { category: 'reception', label: 'Reception' }
    const titleLower = (item.name || item.title || '').toLowerCase()
    const byId = demoCategoryMap.find((m) => Number(m.id) === Number(item.id))
    if (byId) return { category: byId.category, label: byId.label }

    const byKeyword = demoCategoryMap.find((m) => m.keywords.some((k) => titleLower.includes(k)))
    if (byKeyword) return { category: byKeyword.category, label: byKeyword.label }

    const byIndex = demoCategoryMap[index]
    if (byIndex) return { category: byIndex.category, label: byIndex.label }

    return { category: 'reception', label: 'Reception' }
}

const defaultDemoChecklist = [
    { id: 1, name: "Couple's Grand Entrance", description: "Capture the high-energy moment the newlyweds enter the reception hall." },
    { id: 2, name: "Couple's First Dance", description: "The romantic, intimate spotlight dance beneath the chandeliers." },
    { id: 3, name: "Dance with Parents", description: "Tender, emotional waltz with mother and father." },
    { id: 4, name: "Guests Laughing", description: "Candid smiles, clinking glasses, and genuine banquet reactions." },
    { id: 5, name: "The Emcee on Stage", description: "Master of Ceremonies keeping the reception lively and fun." },
    { id: 6, name: "Groom's Surprise Number", description: "Special choreographed serenade or musical performance." },
]
// Moments Checklist Data from Centralized Store (provided via storeToRefs)

// Helper to populate moments.value from checklist list (id, name, description)
const populateMoments = (list) => {
    eventVaultStore.populateMoments(list)
}

// Fetch checklist items (only id, name, description) from backend
const fetchChecklist = async (eventId) => {
    await eventVaultStore.fetchChecklist(eventId)
}

// Progress calculations
const capturedCount = computed(() => eventVaultStore.capturedCount)
const totalCount = computed(() => eventVaultStore.totalCount)
const progressPercent = computed(() => eventVaultStore.progressPercent)

const navigateToLiveVault = () => {
    const eventId = route.params.id || 'demo-event'
    router.push(`/event/${eventId}/live-vault`)
}

// Fetch existing demo photos from IndexedDB
const fetchDemoExistingPhotos = async () => {
    await eventVaultStore.fetchDemoPhotos()
    await updateDemoGalleryCount()
}

// Reset Demo State (only for demo-event)
const isResettingDemo = ref(false)
const resetSuccess = ref(false)

const handleResetDemo = async () => {
    if (isResettingDemo.value) return
    const confirmed = window.confirm('Reset all demo uploaded photos, videos, and guest profile data?')
    if (!confirmed) return

    isResettingDemo.value = true
    try {
        await clearDemoData()
        await eventVaultStore.resetDemoStore()

        // Clear local component queue and gallery counts
        pendingQuickPhotos.value = []
        galleryPhotos.value = []
        demoDbCount.value = 0

        // Clear guest credentials and demo session from localStorage
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('qrchive_guest_name')
            localStorage.removeItem('guestName')
            localStorage.removeItem('qrchive_guest_code')
            localStorage.removeItem('qrchive_guest_id')
            localStorage.removeItem('guestName')

            try {
                const rawCurrent = localStorage.getItem('currentEvent')
                if (rawCurrent) {
                    const parsed = JSON.parse(rawCurrent)
                    if (String(parsed?.eventCode) === 'demo-event') {
                        localStorage.removeItem('currentEvent')
                    }
                }
            } catch { }

            try {
                const rawSessions = localStorage.getItem('qrchive_event_sessions')
                if (rawSessions) {
                    const sessions = JSON.parse(rawSessions)
                    delete sessions['demo-event']
                    localStorage.setItem('qrchive_event_sessions', JSON.stringify(sessions))
                }
            } catch { }
        }

        resetSuccess.value = true
        setTimeout(() => {
            resetSuccess.value = false
        }, 2200)
    } catch (err) {
        console.error('[Quests] Failed to reset demo data:', err)
    } finally {
        isResettingDemo.value = false
        router.push('/event/demo-event')
    }
}

onMounted(async () => {
    const eventId = route.params.id
    if (eventId !== 'demo-event') {
        let isAuthorized = false
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('currentEvent')
            if (stored) {
                try {
                    const parsed = JSON.parse(stored)
                    if (parsed && String(parsed.eventCode) === String(eventId)) {
                        isAuthorized = true
                    }
                } catch (err) {
                    console.error('[Quests] Error reading currentEvent from localStorage:', err)
                }
            }

            // If not active event in currentEvent, check local multi-event sessions dictionary
            if (!isAuthorized) {
                const session = getStoredEventSession(eventId)
                if (session) {
                    saveStoredEventSession(eventId, session)
                    isAuthorized = true
                }
            }
        }
        if (!isAuthorized) {
            router.replace(`/event/${eventId}`)
            return
        }
    }

    window.triggerUpload = openCamera
    window.switchExperience = switchExperience

    // Centralized store initialization: fetches checklist & initial photos once
    // Does NOT re-query or discard photos when toggling tabs!
    await eventVaultStore.fetchInitialData(eventId)
    if (eventId === 'demo-event') {
        await updateDemoGalleryCount()
    }
})
</script>

<template>
    <div class="checklist-page-root">
        <!-- Main Content Area -->
        <main class="checklist-main">
            <!-- Hero Cover Banner & Couple Header (Shared Navbar) -->
            <section class="vault-hero">
                <div class="vault-hero__banner">
                    <div class="vault-hero__bg"
                        :style="{ backgroundImage: `url(${currentWedding.heroImage})`, backgroundPosition: `0 -90px` }">
                    </div>

                    <!-- Soft Gradients Scrim -->
                    <div class="vault-hero__scrim-top"></div>
                    <div class="vault-hero__scrim-bottom"></div>

                    <!-- Banner Content Overlay -->
                    <div class="vault-hero__content">
                        <div class="vault-hero__eyebrow">
                            <span class="vault-hero__eyebrow-dot"></span>
                            <span class="vault-hero__eyebrow-text">The Wedding of</span>
                            <span class="vault-hero__eyebrow-dot"></span>
                        </div>
                        <h1 class="vault-hero__title">{{ currentWedding.couple }}</h1>
                    </div>
                </div>
            </section>
            <!-- Content Sheet Overlay (Slides over sticky hero on scroll) -->
            <div class="checklist-content">
                <div class="checklist-container">
                    <!-- Interactive Hidden File Input for Native Camera Upload Feel -->
                    <input id="photo-upload-input" ref="fileInput" accept="image/*" capture="environment"
                        class="checklist-hidden-input" type="file" @change="handleFileChange">

                    <!-- Hero Header Progress Card: Experience Switcher -->
                    <div class="checklist-experience-switcher">
                        <div class="checklist-experience-switcher__header">
                            <span class="checklist-experience-switcher__label">Select Capture Experience</span>
                            <span class="checklist-experience-switcher__badge">
                                <span class="material-symbols-outlined">tune</span>
                                Switch anytime
                            </span>
                        </div>

                        <div class="checklist-experience-switcher__grid">
                            <!-- Quick Capture Button -->
                            <button id="btn-quick-capture" class="checklist-experience-card"
                                :class="{ 'is-active': captureMode === 'quick' }" type="button"
                                @click="switchExperience('quick')">
                                <div class="checklist-experience-card__top">
                                    <div class="checklist-experience-card__icon-wrap">
                                        <span class="material-symbols-outlined">shutter_speed</span>
                                    </div>
                                    <span class="checklist-experience-card__check-indicator">
                                        <span v-if="captureMode === 'quick'"
                                            class="material-symbols-outlined">check</span>
                                        <span v-else class="checklist-experience-card__check-dot"></span>
                                    </span>
                                </div>
                                <div class="checklist-experience-card__title-row">
                                    <span class="checklist-experience-card__title">Quick Capture</span>
                                </div>
                                <span class="checklist-experience-card__desc">Snap or upload freely as moments
                                    happen</span>
                            </button>

                            <!-- Photo Checklist Button -->
                            <button id="btn-checklist-capture" class="checklist-experience-card"
                                :class="{ 'is-active': captureMode === 'checklist' }" type="button"
                                @click="switchExperience('checklist')">
                                <div class="checklist-experience-card__top">
                                    <div class="checklist-experience-card__icon-wrap">
                                        <span class="material-symbols-outlined">checklist</span>
                                    </div>
                                    <span class="checklist-experience-card__check-indicator">
                                        <span v-if="captureMode === 'checklist'"
                                            class="material-symbols-outlined">check</span>
                                        <span v-else class="checklist-experience-card__check-dot"></span>
                                    </span>
                                </div>
                                <div class="checklist-experience-card__title-row">
                                    <span class="checklist-experience-card__title">Photo Checklist</span>
                                </div>
                                <span class="checklist-experience-card__desc">Follow guided moments to capture &amp;
                                    earn
                                    memories</span>
                            </button>
                        </div>
                    </div>

                    <!-- Quick Capture Prominent CTA Section -->
                    <div v-show="captureMode === 'quick'" id="quick-capture-section" class="checklist-quick-section">
                        <!-- Horizontally Scrollable Stream of Uploaded Photos -->
                        <div v-if="uploadedQuickPhotos.length > 0" id="quick-uploaded-stream-container"
                            class="quick-uploaded-stream-container">
                            <div class="quick-uploaded-stream-header">
                                <div class="quick-uploaded-stream-title-group">
                                    <span class="material-symbols-outlined quick-uploaded-stream-icon">cloud_done</span>
                                    <span class="quick-uploaded-stream-title">Uploaded Snaps</span>
                                </div>
                                <span class="quick-uploaded-stream-badge">{{ uploadedQuickPhotos.length }}/30</span>
                            </div>
                            <div ref="uploadedStreamRef" class="quick-uploaded-stream">
                                <div v-for="(photo, index) in uploadedQuickPhotos" :key="photo.id || index"
                                    class="quick-uploaded-item" :class="{ 'is-newly-added': photo.isNew }"
                                    @click="openQuickPhotoLightbox(index)">
                                    <img :src="photo.url" alt="Uploaded moment" class="quick-uploaded-img"
                                        @error="(e) => { if (photo.fullUrl && e.target.src !== photo.fullUrl) e.target.src = photo.fullUrl }" />
                                    <!-- Video Play Badge if Video -->
                                    <div v-if="photo.isVideo" class="quick-video-badge">
                                        <span class="material-symbols-outlined">play_arrow</span>
                                    </div>
                                    <div class="quick-uploaded-overlay">
                                        <span class="material-symbols-outlined quick-uploaded-check">check_circle</span>
                                        <span class="quick-uploaded-time">{{ photo.uploadedAt || 'Just now' }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="checklist-quick-card">
                            <!-- When no photos are stacked, show original icon/title/desc -->
                            <template v-if="pendingQuickPhotos.length === 0">
                                <div class="checklist-quick-card__icon-wrap">
                                    <span class="material-symbols-outlined"
                                        style="font-variation-settings: 'FILL' 1;">photo_camera</span>
                                </div>
                                <h2 class="checklist-quick-card__title">Instant Photo Drop</h2>
                                <p class="checklist-quick-card__desc">
                                    Capture spontaneous laughter, candid toasts, and celebration moments as they happen.
                                </p>
                            </template>

                            <!-- When quick photos are snapped, hide original content and show stacked photos deck -->
                            <div v-else class="quick-stack-preview">
                                <div class="quick-stack-deck">
                                    <div v-for="(photo, index) in pendingQuickPhotos.slice(0, 3)" :key="photo.id"
                                        class="quick-stack-card" :class="[
                                            `quick-stack-card--${index}`,
                                            {
                                                'is-uploading': isUploadingQuick && index === 0,
                                                'is-floating': photo.isFloating && index === 0,
                                            },
                                        ]" :style="{
                                            '--count': `${photo.uploadPercent || 0}%`,
                                            '--upload-pct': `${photo.uploadPercent || 0}%`,
                                            '--card-index': index,
                                        }">
                                        <!-- Blue Progress Border Frame -->
                                        <div class="quick-stack-border-frame">
                                            <div class="quick-stack-img-wrap">
                                                <img :src="photo.dataUrl" alt="Stacked capture"
                                                    class="quick-stack-img" />
                                                <!-- Video Pill Indicator -->
                                                <div v-if="photo.isVideo" class="quick-stack-video-pill">
                                                    <span class="material-symbols-outlined">videocam</span>
                                                    <span>{{ photo.duration || 30 }}s</span>
                                                </div>
                                                <!-- Uploading Progress Overlay & Signal -->
                                                <div v-if="isUploadingQuick && index === 0"
                                                    class="quick-stack-upload-overlay">
                                                    <div class="quick-stack-pulse-badge">
                                                        <span
                                                            class="material-symbols-outlined quick-spin-icon">sync</span>
                                                        <span>{{ photo.uploadPercent }}%</span>
                                                    </div>
                                                    <div class="quick-stack-progress-track">
                                                        <div class="quick-stack-progress-bar"
                                                            :style="{ width: `${photo.uploadPercent}%` }"></div>
                                                    </div>
                                                </div>
                                                <!-- Staged badge when pending (before closeCamera) -->
                                                <div v-else-if="index === 0" class="quick-stack-staged-badge">
                                                    <span class="material-symbols-outlined">schedule</span>
                                                    <span>Ready • Close camera to upload</span>
                                                </div>
                                            </div>
                                        </div>
                                        <!-- Count Pill if more than 1 in stack -->
                                        <span v-if="index === 0 && pendingQuickPhotos.length > 1"
                                            class="quick-stack-count-pill">
                                            +{{ pendingQuickPhotos.length - 1 }} more queued
                                        </span>
                                    </div>
                                </div>
                                <div class="quick-stack-status-info">
                                    <p class="quick-stack-status-title">
                                        {{ isUploadingQuick ? `Uploading photo to Event #5...
                                        (${pendingQuickPhotos[0]?.uploadPercent || 0}%)` :
                                            `${pendingQuickPhotos.length} photo${pendingQuickPhotos.length > 1 ? 's' : ''}
                                        captured` }}
                                    </p>
                                    <p class="quick-stack-status-hint">
                                        {{ isUploadingQuick ? 'Streaming directly to Cloudflare R2 bucket' :
                                            'Tap Close in camera to automatically sync' }}
                                    </p>
                                </div>
                            </div>

                            <div class="checklist-quick-card__actions">
                                <button class="checklist-quick-card__submit-btn" type="button"
                                    @click="openCamera({ id: 'quick', number: '⚡', title: 'Quick Snapshot', description: 'Instant candid capture saved to vault' })">
                                    <span class="material-symbols-outlined"
                                        style="font-variation-settings: 'FILL' 1;">photo_camera</span>
                                    <span>Snap &amp; Share Now</span>
                                </button>
                            </div>
                        </div>

                        <!-- Reset Demo Button (Only if route.params.id === 'demo-event') -->
                        <div v-if="String(route.params.id) === 'demo-event'" class="demo-reset-wrapper">
                            <button class="demo-reset-btn" :class="{ 'is-success': resetSuccess }" type="button"
                                :disabled="isResettingDemo" @click="handleResetDemo">
                                <span class="material-symbols-outlined" :class="{ 'demo-spin': isResettingDemo }">
                                    {{ resetSuccess ? 'check_circle' : (isResettingDemo ? 'sync' : 'restart_alt') }}
                                </span>
                                <span>{{ resetSuccess ? 'Demo Reset Complete' : (isResettingDemo ? 'Resetting...' :
                                    'Reset Demo') }}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Photo Checklist Complete Experience Section -->
                    <div v-show="captureMode === 'checklist'" id="checklist-section-wrapper" class="checklist-section">
                        <!-- Progress Card -->
                        <div id="checklist-progress-card" class="checklist-progress-card">
                            <div class="checklist-progress-card__header">
                                <span id="checklist-counter" class="checklist-progress-card__counter">
                                    {{ capturedCount }} of {{ totalCount }} Captured
                                </span>
                            </div>
                            <h1 class="checklist-progress-card__title">Photo Checklist</h1>
                            <p class="checklist-progress-card__desc">
                                Help capture {{ currentWedding.couple }}'s special day.
                                <strong>1 photo or video per moment.</strong> You can replace your entry anytime.
                            </p>
                            <div class="checklist-progress-card__bar-wrap">
                                <div class="checklist-progress-card__track">
                                    <div class="checklist-progress-card__fill"
                                        :style="{ width: `${progressPercent}%` }">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Checklist Stream -->
                        <div id="checklist-items-container" class="checklist-stream">
                            <div v-for="item in moments" :key="item.id" class="moment-item"
                                :data-category="item.category">
                                <div class="moment-item__content">
                                    <!-- Border Style Progress Frame copying .quick-stack-border-frame -->
                                    <div class="moment-item__thumb-frame" :class="{
                                        'is-uploading': item.isUploading,
                                        'is-success': item.showSuccessCheck,
                                    }" :style="{
                                        '--count': `${item.uploadPercent || 0}%`,
                                        '--upload-pct': `${item.uploadPercent || 0}%`,
                                    }">
                                        <!-- Thumbnail if uploaded or currently uploading preview -->
                                        <div v-if="(item.captured || item.isUploading) && item.image"
                                            class="moment-item__thumb-wrap"
                                            @click="item.captured && openMomentLightbox(item)">
                                            <img :alt="item.title" class="moment-item__thumb-img" :src="item.image"
                                                @error="(e) => { if (item.fullImage && e.target.src !== item.fullImage) e.target.src = item.fullImage }">

                                            <!-- Video Play Badge if Video -->
                                            <div v-if="item.isVideo && item.captured && !item.isUploading && !item.showSuccessCheck"
                                                class="moment-item__video-badge">
                                                <span class="material-symbols-outlined">play_arrow</span>
                                            </div>

                                            <!-- Check in the center of the image after successful upload, disappears after 1 second -->
                                            <transition name="center-check-pop">
                                                <div v-if="item.showSuccessCheck" class="moment-item__center-check">
                                                    <span class="material-symbols-outlined check-icon">check</span>
                                                </div>
                                            </transition>

                                            <!-- Regular corner badge when completed and not showing center check -->
                                            <div v-if="item.captured && !item.isUploading && !item.showSuccessCheck"
                                                class="moment-item__thumb-badge">
                                                <span class="material-symbols-outlined"
                                                    style="font-variation-settings: 'FILL' 1;">check</span>
                                            </div>
                                        </div>

                                        <!-- Placeholder if pending -->
                                        <div v-else class="moment-item__placeholder-wrap">
                                            <span class="material-symbols-outlined">broken_image</span>
                                        </div>
                                    </div>

                                    <!-- Moment Details -->
                                    <div class="moment-item__details">
                                        <div class="moment-item__meta">
                                            <span v-if="item.captured" class="moment-item__status-verified">
                                                <span class="material-symbols-outlined"
                                                    style="font-variation-settings: 'FILL' 1;">verified</span>
                                                1/1 Uploaded
                                            </span>
                                            <span v-else class="moment-item__category-label">
                                                {{ item.categoryLabel || 'Reception' }}
                                            </span>
                                        </div>
                                        <h2 class="moment-item__title">{{ item.title }}</h2>
                                        <span class="moment-item__subtitle">{{ item.description }}</span>
                                    </div>
                                </div>

                                <!-- Button Actions -->
                                <button v-if="item.captured" class="moment-item__btn moment-item__btn--replace"
                                    type="button" @click="openCamera(item)">
                                    <span class="material-symbols-outlined">sync</span>
                                    <span>REPLACE ENTRY</span>
                                </button>

                                <button v-else class="moment-item__btn moment-item__btn--add" type="button"
                                    @click="openCamera(item)">
                                    <span class="material-symbols-outlined"
                                        style="font-variation-settings: 'FILL' 1;">photo_camera</span>
                                    <span>ADD ENTRY</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Bottom Navigation Bar -->
        <nav class="checklist-bottom-nav" data-active-classes="text-primary">
            <div class="checklist-bottom-nav__inner">
                <a class="checklist-bottom-nav__item is-active" href="#" @click.prevent="openCamera(null)">
                    <span class="material-symbols-outlined checklist-bottom-nav__icon"
                        style="font-variation-settings: 'FILL' 1;">photo_camera</span>
                    <span class="checklist-bottom-nav__label">Capture</span>
                </a>
                <a class="checklist-bottom-nav__item is-inactive" href="#" @click.prevent="navigateToLiveVault">
                    <span class="material-symbols-outlined checklist-bottom-nav__icon">photo_library</span>
                    <span class="checklist-bottom-nav__label">Live Vault</span>
                </a>
            </div>
        </nav>

        <!-- Fullscreen Camera Viewfinder Modal Component -->
        <Camera :is-open="isCameraOpen" :active-moment="activeMoment" :wedding="currentWedding"
            :gallery-image="latestGalleryImage" :gallery-count="galleryCount" :capture-experience="captureMode"
            @close="handleCameraClose" @capture="handleCameraCapture" @open-gallery="openGalleryPicker" />

        <!-- Fullscreen LightBox Modal Component -->
        <LightBox :is-open="isLightboxOpen" :items="lightboxItems" :initial-index="lightboxIndex"
            @close="isLightboxOpen = false" @like="toggleLightboxLike" />
    </div>
</template>