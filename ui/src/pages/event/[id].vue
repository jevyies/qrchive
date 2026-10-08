<script setup>
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { reactive, ref, computed, onMounted } from 'vue'
import { axiosInstance } from '@/plugins/axios'
import { getDeviceSerial, getDeviceName, saveStoredEventSession, getStoredEventSession } from '@/utils/device';
import { saveDemoQuickPhoto, saveDemoChecklistMoment, getDemoPhotosCount, clearDemoData } from '@/utils/demoDb'
import { isVideoFile, getImageDataUrl, getVideoDetails } from '@/utils/media'
import { useEventVaultStore, resolveStorageUrl } from '@/stores/eventVault'
import BaseError from '@/views/BaseError.vue'
import LoadingEvent from '@/views/LoadingEvent.vue'
import EventWelcomePage from '@/views/EventWelcomePage.vue'
import EventBoard from '@/views/EventBoard.vue'
import AppLogo from '@core/components/AppLogo.vue'
import LiveGallery from '@/views/LiveGallery.vue';
import GuestModal from '@/views/modals/Guest2Modal.vue'
import LightBox from '@/views/LightBox.vue'
import Camera from '@/views/Camera.vue'
import EventTab from '@/views/EventTab.vue'

const route = useRoute()
const router = useRouter()
const eventVaultStore = useEventVaultStore()
const storageURL = import.meta.env.VITE_STORAGE_URL;

const { uploadedQuickPhotos, moments } = storeToRefs(eventVaultStore)
const pendingQuickPhotos = ref([]);
const loading = ref(false);
const hasGuestAuth = ref(false);
const eventDetails = ref(null);
const notFound = ref(false);
const maxGuest = ref(false);
const eventError = ref(false);
const hasNotStartedYet = ref(false);
const daysToGo = ref(0);
const isGuestModalOpen = ref(false);
const isPressed = ref(false);
const isSubmitting = ref(false);
const alreadyLoaded = ref(true);
const tabModel = ref('capture')
const galleryPhotos = ref([]);
const demoDbCount = ref(0)
const isCameraOpen = ref(false);
const eventBoardRef = ref(null)
const isLightboxOpen = ref(false);
const lightboxItems = ref([]);
const lightboxIndex = ref(0);
const isLightboxDeletable = ref(false);
const isLightboxDownloadable = ref(false);
const activeMoment = ref(null)
const fileInput = ref(null);
const captureMode = ref('quick')
const currentTargetTitle = ref('')
const maxNumberOfPhotosAllowed = 30;

const bannerImage = computed(() => {
    if (eventDetails.value?.photos?.length) {
        if (!hasGuestAuth.value) {
            return eventDetails.value?.photos?.find(x => x.type == 'mobile_cropped')?.url;
        }
        else {
            return eventDetails.value?.photos?.find(x => x.type == 'desktop_cropped')?.url;
        }
    }
    return `${storageURL}/static/cover-photo.jpg`;
})
const eventMaxGuest = computed(() => {
    return eventDetails.value?.maxGuest || 0;
})
const isCoupleEvent = computed(() => {
    const category = eventDetails.value?.eventCategory?.toLowerCase();
    if (category && (category.includes('wedding') || category.includes('anniversary'))) {
        return true;
    }
    return false;
})
const isUnlimited = computed(() => {
    return eventDetails.value?.isUnlimited || false;
})
const isDemo = computed(() => {
    return route.params?.id === 'demo-event';
})
const quickPhotosLeft = computed(() => {
    const diff = maxNumberOfPhotosAllowed - (moments.value?.length || 0)
    return diff > 0 ? diff : maxNumberOfPhotosAllowed
})
const capturedCount = computed(() => eventVaultStore.capturedCount)
const totalCount = computed(() => eventVaultStore.totalCount)
const progressPercent = computed(() => eventVaultStore.progressPercent)
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
    return `${storageURL}/static/cover-photo.jpg`;
})
const galleryCount = computed(() => {
    if (isDemo.value) {
        return (demoDbCount.value || 0) + galleryPhotos.value.length
    }
    const quickCount = uploadedQuickPhotos.value.length
    const checklistCount = moments.value.filter((m) => Boolean(m.captured)).length
    const localGalleryCount = galleryPhotos.value.length
    return quickCount + checklistCount + localGalleryCount
})
const diffInDays = (dateStr) => {
    const today = new Date();
    const eventDate = new Date(dateStr);
    const diffInMs = eventDate - today;
    const days = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    return days;
}
const goToHomePage = () => {
    router.push('/')
}
const getEventData = async (eventToken) => {
    try {
        const { data: response } = await axiosInstance.get(`/api/events/token/${eventToken}`)
        if (response?.error) {
            if (response?.message?.includes('Max Guest')) {
                maxGuest.value = true;
                return;
            }
            notFound.value = true;
            return;
        }
        if (new Date(response.eventDate) > new Date()) {
            daysToGo.value = diffInDays(response.eventDate)
            hasNotStartedYet.value = true;
            return;
        }
        if (new Date(response.photoExpiry) < new Date()) {
            notFound.value = true;
            return;
        }
        eventDetails.value = response;
    } catch (err) {
        if (err?.response?.data?.message?.includes('Max Guest')) {
            maxGuest.value = true;
            return;
        }
        eventError.value = true;
    }
}
const getUserDetails = async (eventToken) => {
    const deviceSerial = getDeviceSerial()
    try {
        const { data: response } = await axiosInstance.get(`/api/guests/snap/lookup?eventToken=${eventToken}&deviceSerial=${deviceSerial}`)
        if (response?.error) {
            return;
        }
        hasGuestAuth.value = true;
        saveStoredEventSession(route.params.id, { guestId: response.id, guestName: response.guestName, guestCode: response.guestCode, ...eventDetails.value });
        eventDetails.value.guestCode = response.guestCode;
        eventDetails.value.guestName = response.guestName;
        alreadyLoaded.value = true;
    } catch (error) {
        hasGuestAuth.value = false;
        eventDetails.value.guestCode = null;
        eventDetails.value.guestName = null;
        alreadyLoaded.value = true;
    }
}
const submitGuest = async (guestName) => {
    if (isDemo.value) {
        hasGuestAuth.value = true;
        eventDetails.value.guestCode = 'demo-guest';
        eventDetails.value.guestName = guestName;
        alreadyLoaded.value = true;
        isSubmitting.value = false;
        isGuestModalOpen.value = false;
        return;
    }
    const deviceSerial = getDeviceSerial()
    const deviceName = getDeviceName()
    isSubmitting.value = true;
    try {
        const { data: response } = await axiosInstance.post('/api/guests/snap', {
            guestName,
            eventToken: route.params.id,
            deviceSerial,
            deviceName,
        })
        if (response?.error) {
            if (response?.message?.includes('Max Guest')) {
                maxGuest.value = true;
            }
            return;
        }
        hasGuestAuth.value = true;
        saveStoredEventSession(route.params.id, { guestName, guestCode: response, ...eventDetails.value });
        eventDetails.value.guestCode = response;
        eventDetails.value.guestName = guestName;
        alreadyLoaded.value = true;
        await eventVaultStore.fetchInitialGuestData(route.params.id, response)
    } catch (error) {
        if (error?.response?.data?.message?.includes('Max Guest')) {
            maxGuest.value = true;
            return;
        }
        eventError.value = true;
    } finally {
        isSubmitting.value = false;
        isGuestModalOpen.value = false;
    }
}
const handleGetStarted = () => {
    isPressed.value = true
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15)
    }
    setTimeout(() => {
        isPressed.value = false;
        isGuestModalOpen.value = true;
    }, 150)
}
const updateDemoGalleryCount = async () => {
    try {
        demoDbCount.value = await getDemoPhotosCount()
    } catch {
        demoDbCount.value = 0
    }
}
const resetDemo = async () => {
    try {
        await clearDemoData()
        await eventVaultStore.resetDemoStore()
        pendingQuickPhotos.value = []
        galleryPhotos.value = []
        demoDbCount.value = 0
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('guestName')
        }
        hasGuestAuth.value = false;
        alreadyLoaded.value = false;
        eventBoardRef.value?.successDemoReset();
    } catch (err) {
        console.error('[Quests] Failed to reset demo data:', err)
    }
}
const openCamera = (moment) => {
    if (isDemo.value) {
        updateDemoGalleryCount()
    }
    activeMoment.value = moment;
    if (moment && moment.id && moment.id !== 'quick') {
        captureMode.value = 'checklist'
    }
    currentTargetTitle.value = activeMoment.value ? activeMoment.value.title : ''
    isCameraOpen.value = true
}
const handleCameraClose = () => {
    isCameraOpen.value = false;
}
const getBlobFromCapturedPhoto = async (capturedUrl) => {
    if (capturedUrl && capturedUrl.startsWith('data:')) {
        try {
            const res = await fetch(capturedUrl)
            return await res.blob()
        } catch {
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
const handleCameraCapture = async ({ dataUrl, blob, moment, type, isVideo, videoUrl, duration, fileName, mimeType }) => {
    const isVid = Boolean(isVideo || type === 'video')
    let finalBlob = blob
    if (!finalBlob && !isVid) {
        finalBlob = await getBlobFromCapturedPhoto(dataUrl)
    }

    const currentMoment = moment || activeMoment.value
    const guestCode = eventDetails.value?.guestCode || (typeof localStorage !== 'undefined' ? localStorage.getItem('guestCode') : '') || 'guest'
    const guestName = eventDetails.value?.guestName || (typeof localStorage !== 'undefined' ? localStorage.getItem('guestName') : '') || 'Guest'

    // If quick capture mode, push directly into uploadedQuickPhotos and queue sequential upload
    if (captureMode.value === 'quick' || !currentMoment || currentMoment.id === 'quick') {
        galleryPhotos.value.push(dataUrl)
        const defaultExt = isVid ? (mimeType?.includes('webm') ? 'webm' : 'mp4') : 'jpg'
        const photoItem = reactive({
            id: 'quick_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            type: isVid ? 'video' : 'photo',
            isVideo: isVid,
            dataUrl: dataUrl,
            url: dataUrl,
            fullUrl: dataUrl,
            thumbnailUrl: dataUrl,
            videoUrl: videoUrl || null,
            blob: finalBlob,
            videoBlob: isVid ? finalBlob : null,
            fileName: fileName || `${guestCode}_${Date.now()}.${defaultExt}`,
            mimeType: mimeType || (isVid ? 'video/mp4' : 'image/jpeg'),
            duration: duration || null,
            uploadedAt: 'Uploading...',
            guest: guestName || 'You',
            likes: 0,
            isLiked: false,
            isNew: true,
            isUploading: true,
            uploadPercent: 8,
            showSuccessCheck: false,
        })
        uploadedQuickPhotos.value.unshift(photoItem)
        enqueueQuickUpload(photoItem)
    } else {
        const found = moments.value.find((m) => Number(m.id) == Number(currentMoment.id))
        if (found) {
            const isReplace = Boolean(found.captured || currentMoment?.isReplace)
            const oldPhotoId = found.photoId || null
            found.captured = true
            found.image = dataUrl
            found.fullImage = dataUrl
            found.isVideo = isVid
            found.videoUrl = videoUrl || null
            found.videoBlob = isVid ? finalBlob : null
            galleryPhotos.value = [dataUrl]
            uploadChecklistPhoto(found, finalBlob, dataUrl, {
                isVideo: isVid,
                videoUrl: videoUrl,
                fileName: fileName,
                mimeType: mimeType,
                isReplace: isReplace,
                oldPhotoId: oldPhotoId,
            })
        }
    }

    // In checklist mode / non-quick mode: record only one entry/video, then close camera viewfinder
    if (captureMode.value !== 'quick' && currentMoment && currentMoment.id !== 'quick') {
        setTimeout(() => {
            isCameraOpen.value = false
        }, 500)
    }
}

// Sequential Queue Uploading for Quick Snaps
const quickUploadQueue = []
let isProcessingQuickQueue = false

const enqueueQuickUpload = (photoItem) => {
    quickUploadQueue.push(photoItem)
    processQuickUploadQueue()
}

const processQuickUploadQueue = async () => {
    if (isProcessingQuickQueue) return
    isProcessingQuickQueue = true

    while (quickUploadQueue.length > 0) {
        const itemToUpload = quickUploadQueue[0]
        try {
            await performQuickUpload(itemToUpload)
        } catch (e) {
            console.error('[Vault] Error in queue upload:', e)
        } finally {
            quickUploadQueue.shift()
        }
    }

    isProcessingQuickQueue = false
}

const performQuickUpload = async (photoItem) => {
    let progressTimer = null
    let currentPct = 8

    photoItem.isUploading = true
    photoItem.uploadPercent = currentPct
    photoItem.showSuccessCheck = false

    // Smooth visual ticker so the running border is visibly running to the user
    progressTimer = setInterval(() => {
        if (currentPct < 90) {
            currentPct += Math.floor(Math.random() * 4) + 6
            if (currentPct > 90) currentPct = 90
            photoItem.uploadPercent = currentPct
        }
    }, 50)

    const eventCode = route.params.id || ''
    const guestCode = eventDetails.value?.guestCode || (typeof localStorage !== 'undefined' ? localStorage.getItem('guestCode') : '') || 'guest'
    const guestName = eventDetails.value?.guestName || (typeof localStorage !== 'undefined' ? localStorage.getItem('guestName') : '') || 'Guest'

    let blob = photoItem.blob || photoItem.videoBlob
    if (!blob && !photoItem.isVideo) {
        blob = await getBlobFromCapturedPhoto(photoItem.dataUrl)
    }

    const defaultExt = photoItem.isVideo ? (photoItem.mimeType?.includes('webm') ? 'webm' : 'mp4') : 'jpg'
    const fileName = photoItem.fileName || `${guestCode}_${Date.now()}.${defaultExt}`

    if (isDemo.value) {
        if (progressTimer) clearInterval(progressTimer)

        // Smoothly complete the remaining progress circle to 100%
        while (currentPct < 100) {
            currentPct = Math.min(100, currentPct + 20)
            photoItem.uploadPercent = currentPct
            await new Promise((r) => setTimeout(r, 35))
        }

        const savedPhoto = await saveDemoQuickPhoto({
            id: photoItem.id,
            dataUrl: photoItem.dataUrl,
            url: photoItem.dataUrl,
            fullUrl: photoItem.dataUrl,
            thumbnailUrl: photoItem.dataUrl,
            isVideo: photoItem.isVideo,
            videoUrl: photoItem.videoUrl || null,
            blob: blob,
            videoBlob: photoItem.isVideo ? blob : null,
            duration: photoItem.duration || null,
            fileName: fileName,
            uploadedBy: guestName || 'You',
            createdAt: new Date().toISOString(),
            likes: 0,
            isLiked: false,
        })

        await updateDemoGalleryCount()

        photoItem.id = savedPhoto.id
        eventVaultStore.addUploadedPhoto(savedPhoto, { isChecklist: false })

        photoItem.uploadedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        photoItem.showSuccessCheck = true

        // Center checkmark will disappear after exactly 1 second
        setTimeout(() => {
            photoItem.showSuccessCheck = false
            photoItem.isUploading = false
        }, 1000)

        return
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
    if (photoItem.isVideo && photoItem.dataUrl && photoItem.dataUrl.startsWith('data:')) {
        formData.append('thumbnailBase64', photoItem.dataUrl)
    }
    formData.append('file', blob, fileName)

    try {
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
                    const actualPct = Math.min(92, Math.round((progressEvent.loaded * 100) / progressEvent.total))
                    if (actualPct > currentPct) {
                        currentPct = actualPct
                        photoItem.uploadPercent = currentPct
                    }
                }
            },
        })

        if (progressTimer) clearInterval(progressTimer)

        // Smoothly complete the remaining progress to 100%
        while (currentPct < 100) {
            currentPct = Math.min(100, currentPct + 15)
            photoItem.uploadPercent = currentPct
            await new Promise((r) => setTimeout(r, 35))
        }

        const uploadedPhoto = response.data?.photo
        if (uploadedPhoto) {
            photoItem.id = uploadedPhoto.id
            photoItem.storageKey = uploadedPhoto.storageKey || uploadedPhoto.storage_key || null
            photoItem.storage_key = uploadedPhoto.storageKey || uploadedPhoto.storage_key || null
            const photoKey = photoItem.storageKey
            const fullUrl = resolveStorageUrl(uploadedPhoto.fullUrl || uploadedPhoto.url, photoKey)
            const thumbUrl = resolveStorageUrl(uploadedPhoto.thumbnailUrl || uploadedPhoto.url, photoKey) || fullUrl
            photoItem.fullUrl = fullUrl
            photoItem.thumbnailUrl = thumbUrl || fullUrl
            photoItem.url = photoItem.isVideo ? (thumbUrl || fullUrl) : (fullUrl || thumbUrl)
            photoItem.videoUrl = uploadedPhoto.url || photoItem.videoUrl
            photoItem.fileName = uploadedPhoto.fileName || fileName
            photoItem.guest = uploadedPhoto.uploadedBy || guestName
            eventVaultStore.addUploadedPhoto(uploadedPhoto, { isChecklist: false })
        }
        photoItem.uploadedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        photoItem.showSuccessCheck = true

        // Center checkmark will disappear after exactly 1 second
        setTimeout(() => {
            photoItem.showSuccessCheck = false
            photoItem.isUploading = false
        }, 1000)
    } catch (err) {
        if (progressTimer) clearInterval(progressTimer)
        console.error('[Vault] Failed to upload quick photo to R2:', err)
        photoItem.isUploading = false
        photoItem.showSuccessCheck = false
        photoItem.uploadPercent = 0
    }
}

// Upload captured checklist moment to backend with captureMode === 'checklist'
const uploadChecklistPhoto = async (momentItem, fileOrBlob, localPreviewUrl, extra = {}) => {
    if (!momentItem || !momentItem.id) return
    const checkListId = momentItem.id
    const isVideo = Boolean(extra.isVideo || momentItem.isVideo)
    const isReplace = Boolean(extra.isReplace || momentItem.isReplace)
    const oldPhotoId = extra.oldPhotoId || momentItem.photoId || null

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

        progressTimer = setInterval(() => {
            if (currentPct < 90) {
                currentPct += Math.floor(Math.random() * 4) + 6
                if (currentPct > 90) currentPct = 90
                found.uploadPercent = currentPct
            }
        }, 50)
    }

    const eventCode = route.params.id || ''
    const guestCode = eventDetails.value?.guestCode || (typeof localStorage !== 'undefined' ? localStorage.getItem('guestCode') : '') || 'guest'
    const guestName = eventDetails.value?.guestName || (typeof localStorage !== 'undefined' ? localStorage.getItem('guestName') : '') || 'Guest'

    let blob = fileOrBlob
    if (!blob && !isVideo) {
        blob = await getBlobFromCapturedPhoto(localPreviewUrl)
    }

    const defaultExt = isVideo ? (extra.mimeType?.includes('webm') ? 'webm' : 'mp4') : 'jpg'
    const fileName = extra.fileName || `${guestCode}_${Date.now()}.${defaultExt}`

    if (isDemo.value) {
        if (progressTimer) clearInterval(progressTimer)

        if (found) {
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

            const demoItemId = `demo_moment_${checkListId}`
            const demoItem = {
                checklistId: checkListId,
                id: demoItemId,
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
            found.photoId = demoItemId

            eventVaultStore.addUploadedPhoto(demoItem, {
                isChecklist: true,
                checklistId: checkListId,
                isReplace: isReplace,
                replacedPhotoId: oldPhotoId || demoItemId,
            })

            await updateDemoGalleryCount()

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
    if (isReplace) {
        formData.append('isReplace', 'true')
        if (oldPhotoId) {
            formData.append('replacePhotoId', String(oldPhotoId))
        }
    }
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
                'x-is-replace': isReplace ? 'true' : 'false',
                ...(oldPhotoId ? { 'x-replace-photo-id': String(oldPhotoId) } : {}),
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
        const replacedPhotoId = response.data?.replacedPhotoId || oldPhotoId || null
        const deletedPhotoIds = response.data?.deletedPhotoIds || []

        if (uploadedPhoto) {
            eventVaultStore.addUploadedPhoto(uploadedPhoto, {
                isChecklist: true,
                checklistId: checkListId,
                isReplace: isReplace,
                replacedPhotoId: replacedPhotoId,
                deletedPhotoIds: deletedPhotoIds,
            })
        }
        if (found) {
            while (currentPct < 100) {
                currentPct = Math.min(100, currentPct + 15)
                found.uploadPercent = currentPct
                await new Promise((r) => setTimeout(r, 35))
            }

            if (uploadedPhoto?.url || uploadedPhoto?.thumbnailUrl) {
                found.photoId = uploadedPhoto.id
                found.storageKey = uploadedPhoto.storageKey || uploadedPhoto.storage_key || null
                found.storage_key = uploadedPhoto.storageKey || uploadedPhoto.storage_key || null
                found.image = uploadedPhoto.thumbnailUrl || (isVideo ? localPreviewUrl : uploadedPhoto.url)
                found.fullImage = uploadedPhoto.fullUrl || uploadedPhoto.url
                found.videoUrl = uploadedPhoto.url
                found.isVideo = isVideo
                found.guest = uploadedPhoto.uploadedBy || 'You'
            }

            found.showSuccessCheck = true

            setTimeout(() => {
                found.showSuccessCheck = false
                found.isUploading = false
            }, 1000)
        }
    } catch (err) {
        if (progressTimer) clearInterval(progressTimer)
        console.error('[Vault] Failed to upload checklist photo to R2:', err)
        if (found) {
            found.isUploading = false
            found.showSuccessCheck = false
            found.uploadPercent = 0
        }
    }
}

const handleChecklistUpload = ({ moment, file, previewUrl, extra }) => {
    galleryPhotos.value.push(previewUrl)
    uploadChecklistPhoto(moment, file, previewUrl, extra)
}

const openGalleryPicker = () => {
    const isQuick = captureMode.value === 'quick' || !activeMoment.value || activeMoment.value?.id === 'quick'
    if (isQuick && !isUnlimited.value) {
        const remainingSlots = Math.max(0, quickPhotosLeft.value - uploadedQuickPhotos.value.length)
        if (remainingSlots <= 0) {
            alert('Photo limit reached. You cannot upload any more photos or videos.')
            return
        }
    }
    if (fileInput.value) {
        fileInput.value.removeAttribute('capture')
        fileInput.value.click()
    }
}
const toggleLightboxLike = async (item, event) => {
    if (event) event.stopPropagation()
    await eventVaultStore.toggleLike(item, event)
}
const openQuickPhotoLightbox = (index) => {
    isLightboxDeletable.value = true
    isLightboxDownloadable.value = false
    lightboxItems.value = uploadedQuickPhotos.value.map((p) => ({
        id: p.id,
        photoId: p.id,
        url: p.fullUrl || p.url,
        thumbnailUrl: p.thumbnailUrl || p.url,
        isVideo: Boolean(p.isVideo),
        videoUrl: p.videoUrl,
        guest: p.guest || 'You',
        uploadedBy: p.guest || 'You',
        likes: p.likes || 0,
        isLiked: Boolean(p.isLiked),
        createdAt: p.createdAt || new Date().toISOString(),
    }))
    lightboxIndex.value = index
    isLightboxOpen.value = true
}
const openMomentLightbox = (moment) => {
    isLightboxDeletable.value = true
    isLightboxDownloadable.value = false
    const capturedMoments = moments.value.filter((m) => m.captured)
    lightboxItems.value = capturedMoments.map((m) => ({
        id: m.photoId || m.id,
        photoId: m.photoId || m.id,
        checklistId: m.id,
        url: m.fullImage || m.image,
        thumbnailUrl: m.image,
        isVideo: Boolean(m.isVideo),
        videoUrl: m.videoUrl,
        guest: m.guest || 'You',
        title: m.title,
        likes: m.likes || 0,
        isLiked: Boolean(m.isLiked),
        createdAt: m.createdAt || new Date().toISOString(),
    }))
    const idx = capturedMoments.findIndex((m) => m.id === moment.id)
    lightboxIndex.value = idx >= 0 ? idx : 0
    isLightboxOpen.value = true
}
const openGalleryLightbox = ({ items, index }) => {
    isLightboxDeletable.value = false
    isLightboxDownloadable.value = tabModel.value === 'gallery'
    lightboxItems.value = items
    lightboxIndex.value = index
    isLightboxOpen.value = true
}
const handleDeletePhoto = async (item) => {
    if (!item) return
    const confirmed = window.confirm('Are you sure you want to delete this photo?')
    if (!confirmed) return

    try {
        const itemPhotoId = item.photoId || item.id
        const itemChecklistId = item.checklistId

        await eventVaultStore.deletePhoto(item)

        lightboxItems.value = lightboxItems.value.filter(
            (p) =>
                String(p.id) !== String(itemPhotoId) &&
                String(p.photoId) !== String(itemPhotoId) &&
                (!itemChecklistId || String(p.checklistId) !== String(itemChecklistId))
        )

        if (lightboxItems.value.length === 0) {
            isLightboxOpen.value = false
        } else if (lightboxIndex.value >= lightboxItems.value.length) {
            lightboxIndex.value = Math.max(0, lightboxItems.value.length - 1)
        }
    } catch (err) {
        console.error('[EventPage] Failed to delete photo:', err)
        alert('Failed to delete photo. Please try again.')
    }
}
const handleFileChange = async (e) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    const files = Array.from(fileList)
    e.target.value = ''

    const isQuick = captureMode.value === 'quick' || !activeMoment.value || activeMoment.value?.id === 'quick'

    if (isQuick) {
        const remainingSlots = isUnlimited.value
            ? Infinity
            : Math.max(0, quickPhotosLeft.value - uploadedQuickPhotos.value.length)

        if (remainingSlots <= 0) {
            alert('Photo limit reached. You cannot upload any more photos or videos.')
            return
        }

        let filesToProcess = files
        if (!isUnlimited.value && files.length > remainingSlots) {
            alert(`You can only upload up to ${remainingSlots} item${remainingSlots > 1 ? 's' : ''}. Only the first ${remainingSlots} will be uploaded.`)
            filesToProcess = files.slice(0, remainingSlots)
        }

        isCameraOpen.value = false

        for (const file of filesToProcess) {
            const isVid = isVideoFile(file)
            if (isVid) {
                const videoDetails = await getVideoDetails(file)
                if (!videoDetails.valid) {
                    alert(videoDetails.error || `Video "${file.name}" exceeds the 30-second limit. Videos must be 30 seconds or less.`)
                    continue
                }

                await handleCameraCapture({
                    dataUrl: videoDetails.thumbnailDataUrl || videoDetails.videoUrl,
                    blob: file,
                    moment: { id: 'quick' },
                    type: 'video',
                    isVideo: true,
                    videoUrl: videoDetails.videoUrl || null,
                    duration: Math.round(videoDetails.duration),
                    fileName: file.name,
                    mimeType: file.type || 'video/mp4',
                })
            } else {
                const dataUrl = await getImageDataUrl(file)
                if (!dataUrl) continue

                await handleCameraCapture({
                    dataUrl,
                    blob: file,
                    moment: { id: 'quick' },
                    type: 'photo',
                    isVideo: false,
                    videoUrl: null,
                    duration: null,
                    fileName: file.name,
                    mimeType: file.type || 'image/jpeg',
                })
            }
        }
    } else {
        const file = files[0]
        const isVid = isVideoFile(file)

        if (isVid) {
            const videoDetails = await getVideoDetails(file)
            if (!videoDetails.valid) {
                alert(videoDetails.error || `Video "${file.name}" exceeds the 30-second limit. Videos must be 30 seconds or less.`)
                return
            }

            const matched = moments.value.find(
                (m) => activeMoment.value && Number(m.id) === Number(activeMoment.value.id)
            )
            if (matched) {
                const isReplace = Boolean(matched.captured || activeMoment.value?.isReplace)
                const oldPhotoId = matched.photoId || null
                matched.captured = true
                matched.image = videoDetails.thumbnailDataUrl || videoDetails.videoUrl
                matched.fullImage = videoDetails.thumbnailDataUrl || videoDetails.videoUrl
                matched.isVideo = true
                matched.videoUrl = videoDetails.videoUrl
                matched.videoBlob = file
                galleryPhotos.value.push(videoDetails.thumbnailDataUrl || videoDetails.videoUrl)
                uploadChecklistPhoto(matched, file, videoDetails.thumbnailDataUrl || videoDetails.videoUrl, {
                    isReplace,
                    oldPhotoId,
                    isVideo: true,
                    videoUrl: videoDetails.videoUrl,
                    duration: Math.round(videoDetails.duration),
                    fileName: file.name,
                    mimeType: file.type || 'video/mp4',
                })
            }
        } else {
            const dataUrl = await getImageDataUrl(file)
            if (!dataUrl) return
            galleryPhotos.value.push(dataUrl)

            const matched = moments.value.find(
                (m) => activeMoment.value && Number(m.id) === Number(activeMoment.value.id)
            )
            if (matched) {
                const isReplace = Boolean(matched.captured || activeMoment.value?.isReplace)
                const oldPhotoId = matched.photoId || null
                matched.captured = true
                matched.image = dataUrl
                matched.fullImage = dataUrl
                matched.isVideo = false
                uploadChecklistPhoto(matched, file, dataUrl, {
                    isReplace,
                    oldPhotoId,
                    isVideo: false,
                    fileName: file.name,
                    mimeType: file.type || 'image/jpeg',
                })
            }
        }

        setTimeout(() => {
            isCameraOpen.value = false
        }, 500)
    }
}
onMounted(async () => {
    if (isDemo.value) {
        eventDetails.value = {
            id: 'demo-event',
            token: 'demo-event',
            name: `Jev & Jean`,
            eventDate: '04-20-2024',
            guestCode: 'demo-guest',
            guestName: 'You',
            eventCategory: 'Wedding',
            photos: [],
        }
        await eventVaultStore.fetchInitialGuestData('demo-event', 'demo-guest')
        await updateDemoGalleryCount()
        hasGuestAuth.value = false;
        alreadyLoaded.value = false;
        loading.value = false
        return
    }
    loading.value = true;
    let storedSessions = getStoredEventSession(route.params.id);
    if (storedSessions) {
        hasGuestAuth.value = true;
        eventDetails.value = storedSessions;
        if (new Date(eventDetails.value.photoExpiry) < new Date()) {
            notFound.value = true;
            return;
        }
        await eventVaultStore.fetchInitialGuestData(route.params.id, storedSessions.guestCode)
        loading.value = false;
        return;
    }
    alreadyLoaded.value = false;
    await getEventData(route.params.id);
    if (eventDetails.value) {
        await getUserDetails(route.params.id);
        if (eventDetails.value.guestCode) {
            await eventVaultStore.fetchInitialGuestData(route.params.id, eventDetails.value.guestCode)
        }
    }
    loading.value = false;
})
</script>
<template>
    <div class="event-vault-root">
        <template v-if="loading">
            <LoadingEvent />
        </template>
        <template v-else>
            <BaseError type="maxguest" v-if="maxGuest" :maxGuest="eventMaxGuest" @homepage="goToHomePage" />
            <BaseError type="notfound" v-else-if="notFound" @homepage="goToHomePage" />
            <BaseError type="notstarted" v-else-if="hasNotStartedYet" :days="daysToGo" @homepage="goToHomePage" />
            <BaseError type="error" v-else-if="eventError" @homepage="goToHomePage" />
            <template v-else>
                <div class="event-vault-root">
                    <main class="event-viewport" :class="{ 'has-guest-auth': hasGuestAuth }">
                        <!-- Atmospheric Editorial Overlays -->
                        <div class="event-hero-image" :style="{ backgroundImage: `url(${bannerImage})` }"
                            :class="{ active: hasGuestAuth }">

                            <Transition name="slide-down">
                                <template v-if="alreadyLoaded && hasGuestAuth">
                                    <div class="vault-hero__scrim-top"></div>
                                </template>
                            </Transition>
                            <Transition name="slide-down">
                                <template v-if="alreadyLoaded && hasGuestAuth">
                                    <div class="vault-hero__scrim-bottom"></div>
                                </template>
                            </Transition>
                            <Transition name="slide-down">
                                <template v-if="alreadyLoaded && hasGuestAuth">
                                    <div class="vault-hero__content">
                                        <div class="vault-hero__eyebrow" v-if="isCoupleEvent">
                                            <span class="vault-hero__eyebrow-dot"></span>
                                            <span class="vault-hero__eyebrow-text">The Wedding of</span>
                                            <span class="vault-hero__eyebrow-dot"></span>
                                        </div>
                                        <h1 class="vault-hero__title">{{ eventDetails?.name || 'Celebration' }}</h1>
                                    </div>
                                </template>
                            </Transition>
                        </div>
                        <Transition name="slide-down" v-if="!alreadyLoaded">
                            <div v-if="!hasGuestAuth" class="event-vignettes-wrap">
                                <div class="event-vignette-top"></div>
                                <div class="event-vignette-radial"></div>
                                <div class="event-vignette-scrim"></div>
                            </div>
                        </Transition>

                        <!-- Header Tier: Floating Atelier Brand & Date Badge -->
                        <Transition name="slide-up" v-if="!alreadyLoaded">
                            <header v-if="!hasGuestAuth" class="event-header">
                                <!-- Left: QRchive Atelier Emblem -->
                                <div class="event-brand-badge" role="button" tabindex="0"
                                    aria-label="Return to Homepage" @click="goToHomePage">
                                    <AppLogo :width="24" :height="24" color="#fff8f5" class="brand-logo" />
                                    <div class="event-brand-info">
                                        <span class="event-brand-title">QRchive</span>
                                        <span class="event-brand-subtitle">Celebration Vault</span>
                                    </div>
                                </div>
                            </header>
                        </Transition>
                        <EventWelcomePage v-if="eventDetails?.token && !hasGuestAuth" :eventDetails="eventDetails"
                            :isCoupleEvent="isCoupleEvent" :isPressed="isPressed" @homepage="goToHomePage"
                            @get-started="handleGetStarted" />
                        <template v-else-if="eventDetails?.token && hasGuestAuth">
                            <input id="photo-upload-input" ref="fileInput" accept="image/*,video/*" multiple
                                class="checklist-hidden-input" type="file" @change="handleFileChange">
                            <EventBoard v-if="tabModel == 'capture'" ref="eventBoardRef" :eventDetails="eventDetails"
                                v-model:captureMode="captureMode" :isDemo="isDemo" :isUnlimited="isUnlimited"
                                :uploadedQuickPhotos="uploadedQuickPhotos" :moments="moments"
                                :quickPhotosLeft="quickPhotosLeft" :capturedCount="capturedCount"
                                :totalCount="totalCount" :progressPercent="progressPercent" @reset-demo="resetDemo"
                                @open-camera="openCamera" @open-lightbox="openQuickPhotoLightbox"
                                @open-moment-lightbox="openMomentLightbox" @capture="handleCameraCapture"
                                @upload-moment="handleChecklistUpload" />
                            <LiveGallery :eventDetails="eventDetails" :isDemo="isDemo" v-if="tabModel == 'gallery'"
                                @open-lightbox="openGalleryLightbox" />
                            <EventTab v-model="tabModel" />
                        </template>
                    </main>
                </div>
            </template>
        </template>
        <GuestModal v-model="isGuestModalOpen" @enter="submitGuest" />
        <Camera v-model:isOpen="isCameraOpen" :active-moment="activeMoment" :eventDetails="eventDetails"
            :gallery-image="latestGalleryImage" :gallery-count="galleryCount" :capture-experience="captureMode"
            :quick-photos-left="quickPhotosLeft" :uploaded-quick-photos="uploadedQuickPhotos" :isUnlimited="isUnlimited"
            @close="handleCameraClose" @capture="handleCameraCapture" @open-gallery="openGalleryPicker" />
        <LightBox :is-open="isLightboxOpen" :items="lightboxItems" :initial-index="lightboxIndex"
            :can-delete="isLightboxDeletable" :can-download="isLightboxDownloadable" @close="isLightboxOpen = false"
            @like="toggleLightboxLike" @delete="handleDeletePhoto" />
    </div>
</template>
<route lang="yaml">
meta:
  layout: blank
  public: true
  keepAlive: true
</route>