<route lang="yaml">
meta:
  layout: blank
  public: true
</route>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { axiosInstance } from '@/plugins/axios'
import keannAndJennyBg from '@/assets/images/keann-and-jenny.jpg'

const route = useRoute()
const router = useRouter()

// Known wedding data dictionary
const knownWeddings = {
    '1': {
        couple: 'Sophia & Alexander',
        title: 'Sophia & Alexander’s Wedding',
        initials: 'S & A',
        dateBadge: '24.10.26',
    },
    '2': {
        couple: 'Emily & James',
        title: 'Emily & James’s Wedding',
        initials: 'E & J',
        dateBadge: '15.11.26',
    },
    '3': {
        couple: 'Olivia & Liam',
        title: 'Olivia & Liam’s Wedding',
        initials: 'O & L',
        dateBadge: '10.08.26',
    },
}

const currentWedding = computed(() => {
    const id = route.params.id
    if (id && knownWeddings[id]) {
        return {
            ...knownWeddings[id],
            heroImage: knownWeddings[id].heroImage || keannAndJennyBg,
        }
    }
    return {
        couple: 'Keann & Jenny',
        title: "Keann & Jenny's Wedding",
        initials: 'K & J',
        dateBadge: '24.10.26',
        heroImage: keannAndJennyBg,
    }
})

const eventHeaderTitle = computed(() => {
    const couple = currentWedding.value?.couple || 'Keann & Jenny'
    return `${couple.toUpperCase()}'S WEDDING`
})

// Experience Switcher state: 'checklist' or 'quick'
const captureMode = ref('quick')

const switchExperience = (mode) => {
    captureMode.value = mode
}

// Quick Capture photo stacking & real upload queue state
const pendingQuickPhotos = ref([])
const uploadedQuickPhotos = ref([])
const isUploadingQuick = ref(false)
const uploadedStreamRef = ref(null)
const uploadEventId = computed(() => {
    const raw = Number(route.params.id)
    return isNaN(raw) || raw <= 0 ? 5 : raw
})

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
    ctx.fillText('QRCHIVE EVENT #5', 540, 680)
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

// Sequential upload processor with live percentage blue border signal and float animation
const startQuickUploads = async () => {
    if (isUploadingQuick.value || pendingQuickPhotos.value.length === 0) return
    isUploadingQuick.value = true

    while (pendingQuickPhotos.value.length > 0) {
        const currentItem = pendingQuickPhotos.value[0]
        currentItem.status = 'uploading'
        currentItem.uploadPercent = 5

        try {
            if (!currentItem.blob) {
                currentItem.blob = await getBlobFromCapturedPhoto(currentItem.dataUrl)
            }

            const formData = new FormData()
            formData.append('eventId', '5')
            formData.append('uploadedBy', 'Guest')
            formData.append(
                'deviceName',
                typeof navigator !== 'undefined' && navigator.userAgent.includes('Mobile')
                    ? 'Mobile Device'
                    : 'Desktop Browser',
            )
            const fileName = `quick_drop_event5_${Date.now()}.jpg`
            formData.append('file', currentItem.blob, fileName)

            const response = await axiosInstance.post('/api/photos/upload/direct', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-event-id': '5',
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

            // Prepend newly uploaded photo to the beginning of the stream at line 482
            const uploadedPhoto = response.data?.photo
            uploadedQuickPhotos.value.unshift({
                id: uploadedPhoto?.id || currentItem.id,
                url: uploadedPhoto?.url || currentItem.dataUrl,
                fileName: uploadedPhoto?.fileName || fileName,
                uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isNew: true,
            })

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

// Fetch existing uploaded photos for event 5
const fetchExistingPhotos = async () => {
    try {
        const { data } = await axiosInstance.get('/api/photos/events/5?limit=20')
        if (data && data.photos && data.photos.length > 0) {
            uploadedQuickPhotos.value = data.photos.map((p) => ({
                id: p.id,
                url: p.url,
                fileName: p.fileName || 'Snapshot',
                uploadedAt: p.uploadedAt
                    ? new Date(p.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Earlier',
                isNew: false,
            }))
        }
    } catch {
        // graceful offline fallback
    }
}

// File upload & Toast notification state
const fileInput = ref(null)
const currentTargetTitle = ref('')
// Camera Live Feed & Viewfinder Modal State
const isCameraOpen = ref(false)
const activeMoment = ref(null)
const videoElement = ref(null)
const mediaStream = ref(null)
const hasCameraFeed = ref(false)
const cameraFacingMode = ref('environment') // 'environment' (back) or 'user' (selfie)
const flashModes = ['flash_auto', 'flash_on', 'flash_off']
const flashModeIndex = ref(0)
const flashMode = computed(() => flashModes[flashModeIndex.value])
const timerModes = [0, 3, 10]
const timerModeIndex = ref(0)
const currentTimer = computed(() => timerModes[timerModeIndex.value])
const timerCountdown = ref(null)
const selectedZoom = ref('1×')
const activeCameraMode = ref('PHOTO')
const isFlashActive = ref(false)
const isViewfinderScaled = ref(false)

// Gallery storage
const galleryPhotos = ref([
    'https://lh3.googleusercontent.com/aida-public/AB6AXuC_b45E9YjZPsE9FZqujCSRNTm6TpITBwM_TaJFgapEZqnACNNwtSVVLegXCWrGpfncDgbRxwks7l8wtobmCfqQkFQv34yOtgKuuNCrqjBvvgccMhT42aq0aHWZnTM-_kf98W7MIzPhbJg7cCIGS2Qy3CEH8ggjzWg0aUNB4Le6KuNEtqtn-DZAcxxNxm62OShpMnoE5uH6Kye6WAxV9WCfQwoP8bbVduYvD1BF5SQjqaIMfsDR8GxI',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAtugc2oDwyayarlJO8IfY0KvJE1t-Txs0OEHZIUXi0H29kBMKoVaHtrvXCg_u6ZTSk4htGJYBiWIv9oXQHWmHhBObhhwNp8IiGEZFLrWIjQAN6Dbjg4lq2CknxKewu2RidFIQaLD83ZtDjl8GOmewe9pBnqX_XoFRUNj0nEFWV3atRIeQroa2FQ44na1TzF-KDKTxmI_e-FdlJla9GpGDqzMj7G52Y8JjxXo1RK5-WSqdqhEhPAd7w',
])
const galleryCount = ref(12)

const latestGalleryImage = computed(() => {
    if (galleryPhotos.value.length > 0) {
        return galleryPhotos.value[galleryPhotos.value.length - 1]
    }
    return 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_b45E9YjZPsE9FZqujCSRNTm6TpITBwM_TaJFgapEZqnACNNwtSVVLegXCWrGpfncDgbRxwks7l8wtobmCfqQkFQv34yOtgKuuNCrqjBvvgccMhT42aq0aHWZnTM-_kf98W7MIzPhbJg7cCIGS2Qy3CEH8ggjzWg0aUNB4Le6KuNEtqtn-DZAcxxNxm62OShpMnoE5uH6Kye6WAxV9WCfQwoP8bbVduYvD1BF5SQjqaIMfsDR8GxI'
})

// Camera Stream Control
const startCameraStream = async () => {
    hasCameraFeed.value = false
    stopCameraStream()
    try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: cameraFacingMode.value,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            })
            mediaStream.value = stream
            hasCameraFeed.value = true
            await nextTick()
            if (videoElement.value) {
                videoElement.value.srcObject = stream
                await videoElement.value.play().catch(() => { })
            }
        }
    } catch (err) {
        console.warn('Live camera stream not available on current device (falling back to reception viewfinder):', err)
        hasCameraFeed.value = false
    }
}

const stopCameraStream = () => {
    if (mediaStream.value) {
        mediaStream.value.getTracks().forEach((track) => track.stop())
        mediaStream.value = null
    }
    hasCameraFeed.value = false
}

const openCamera = (moment) => {
    activeMoment.value = moment || {
        id: 'quick',
        number: '⚡',
        title: 'Quick Snapshot',
        description: 'Instant candid capture saved to vault',
    }
    currentTargetTitle.value = activeMoment.value ? activeMoment.value.title : ''
    isCameraOpen.value = true
    nextTick(() => {
        startCameraStream()
    })
}

const closeCamera = () => {
    isCameraOpen.value = false
    stopCameraStream()
    if (timerCountdown.value) {
        clearInterval(timerCountdown.value)
        timerCountdown.value = null
    }

    // Trigger uploading when user closes camera in quick mode
    if (captureMode.value === 'quick' && pendingQuickPhotos.value.length > 0 && !isUploadingQuick.value) {
        startQuickUploads()
    }
}

const flipCamera = async () => {
    cameraFacingMode.value = cameraFacingMode.value === 'environment' ? 'user' : 'environment'
    await startCameraStream()
}

const toggleFlash = () => {
    flashModeIndex.value = (flashModeIndex.value + 1) % flashModes.length
}

const toggleTimer = () => {
    timerModeIndex.value = (timerModeIndex.value + 1) % timerModes.length
}

// Shutter Capture
const takePhoto = () => {
    isFlashActive.value = true
    isViewfinderScaled.value = true

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 20, 50])
    }

    let capturedUrl =
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAtugc2oDwyayarlJO8IfY0KvJE1t-Txs0OEHZIUXi0H29kBMKoVaHtrvXCg_u6ZTSk4htGJYBiWIv9oXQHWmHhBObhhwNp8IiGEZFLrWIjQAN6Dbjg4lq2CknxKewu2RidFIQaLD83ZtDjl8GOmewe9pBnqX_XoFRUNj0nEFWV3atRIeQroa2FQ44na1TzF-KDKTxmI_e-FdlJla9GpGDqzMj7G52Y8JjxXo1RK5-WSqdqhEhPAd7w'

    // Capture real frame from video element
    if (hasCameraFeed.value && videoElement.value) {
        try {
            const canvas = document.createElement('canvas')
            canvas.width = videoElement.value.videoWidth || 1080
            canvas.height = videoElement.value.videoHeight || 1920
            const ctx = canvas.getContext('2d')
            if (cameraFacingMode.value === 'user') {
                ctx.translate(canvas.width, 0)
                ctx.scale(-1, 1)
            }
            ctx.drawImage(videoElement.value, 0, 0, canvas.width, canvas.height)
            capturedUrl = canvas.toDataURL('image/jpeg', 0.85)
        } catch {
            // fallback
        }
    }

    galleryPhotos.value.push(capturedUrl)
    galleryCount.value += 1

    // If quick capture mode, push into pending stack
    if (captureMode.value === 'quick') {
        const pendingItem = {
            id: 'quick_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            dataUrl: capturedUrl,
            blob: null,
            status: 'pending',
            uploadPercent: 0,
            isFloating: false,
        }
        getBlobFromCapturedPhoto(capturedUrl).then((blob) => {
            pendingItem.blob = blob
        })
        pendingQuickPhotos.value.push(pendingItem)
    }

    // Update active moment status
    if (activeMoment.value) {
        const cleanTitle = activeMoment.value.title.replace(' (Replace Entry)', '')
        const found = moments.value.find(
            (m) => m.id === activeMoment.value.id || m.title === cleanTitle || m.title === activeMoment.value.title,
        )
        if (found) {
            found.captured = true
            found.image = capturedUrl
        }
    }

    setTimeout(() => {
        isFlashActive.value = false
        isViewfinderScaled.value = false
    }, 120)

    if (captureMode.value !== 'quick') {
        setTimeout(() => {
            closeCamera()
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
                galleryPhotos.value.push(event.target.result)
                galleryCount.value += files.length

                if (currentTargetTitle.value) {
                    const cleanTitle = currentTargetTitle.value.replace(' (Replace Entry)', '')
                    const matched = moments.value.find((m) => m.title === cleanTitle)
                    if (matched) {
                        matched.captured = true
                        matched.image = event.target.result
                    }
                }
            }
        }
        reader.readAsDataURL(files[0])
        e.target.value = ''
    }
}

// Moments Checklist Data
const moments = ref([
    {
        id: 1,
        number: '01',
        title: "Couple's Grand Entrance",
        category: 'reception',
        categoryLabel: 'Reception',
        description: 'Grand applause walking into the hall',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuC_b45E9YjZPsE9FZqujCSRNTm6TpITBwM_TaJFgapEZqnACNNwtSVVLegXCWrGpfncDgbRxwks7l8wtobmCfqQkFQv34yOtgKuuNCrqjBvvgccMhT42aq0aHWZnTM-_kf98W7MIzPhbJg7cCIGS2Qy3CEH8ggjzWg0aUNB4Le6KuNEtqtn-DZAcxxNxm62OShpMnoE5uH6Kye6WAxV9WCfQwoP8bbVduYvD1BF5SQjqaIMfsDR8GxI',
        captured: true,
    },
    {
        id: 2,
        number: '02',
        title: "Couple's First Dance",
        category: 'reception',
        categoryLabel: 'Reception',
        description: 'Under the romantic ballroom lights',
        image:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuAtugc2oDwyayarlJO8IfY0KvJE1t-Txs0OEHZIUXi0H29kBMKoVaHtrvXCg_u6ZTSk4htGJYBiWIv9oXQHWmHhBObhhwNp8IiGEZFLrWIjQAN6Dbjg4lq2CknxKewu2RidFIQaLD83ZtDjl8GOmewe9pBnqX_XoFRUNj0nEFWV3atRIeQroa2FQ44na1TzF-KDKTxmI_e-FdlJla9GpGDqzMj7G52Y8JjxXo1RK5-WSqdqhEhPAd7w',
        captured: true,
    },
    {
        id: 3,
        number: '03',
        title: 'Dance with Parents',
        category: 'reception',
        categoryLabel: 'Reception',
        description: 'Tender father-daughter & mother-son dance',
        captured: false,
    },
    {
        id: 4,
        number: '04',
        title: 'Guests Laughing',
        category: 'reception',
        categoryLabel: 'Reception',
        description: 'Hearty laughs and cheerful table toasts',
        captured: false,
    },
    {
        id: 5,
        number: '05',
        title: 'The Emcee on Stage',
        category: 'reception',
        categoryLabel: 'Reception',
        description: 'Lively hosting and games introduction',
        captured: false,
    },
    {
        id: 6,
        number: '06',
        title: "Groom's Surprise Number",
        category: 'reception',
        categoryLabel: 'Reception',
        description: 'Keann\'s secret performance for Jenny',
        captured: false,
    },
    {
        id: 7,
        number: '07',
        title: "Bride's Surprise Number",
        category: 'reception',
        categoryLabel: 'Reception',
        description: 'Jenny\'s unforgettable serenade or dance',
        captured: false,
    },
    {
        id: 8,
        number: '08',
        title: 'Any Performance',
        category: 'reception',
        categoryLabel: 'Reception',
        description: 'Bridal party acts, band, or special music',
        captured: false,
    },
    {
        id: 9,
        number: '09',
        title: "Couple's Cake Cutting",
        category: 'reception',
        categoryLabel: 'Reception',
        description: 'First ceremonial slice together',
        captured: false,
    },
    {
        id: 10,
        number: '10',
        title: "Couple's Thank You Message",
        category: 'reception',
        categoryLabel: 'Reception',
        description: 'Heartfelt words of gratitude to all guests',
        captured: false,
    },
])

// Progress calculations
const capturedCount = computed(() => moments.value.filter((m) => m.captured).length)
const totalCount = computed(() => moments.value.length)
const progressPercent = computed(() =>
    totalCount.value > 0 ? Math.round((capturedCount.value / totalCount.value) * 100) : 0,
)

const navigateToLiveVault = () => {
    const eventId = route.params.id || 'demo-event'
    router.push(`/event/${eventId}/live-vault`)
}

onMounted(() => {
    // If not demo-event, verify currentEvent matches route.params.id
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
        }
        if (!isAuthorized) {
            router.replace(`/event/${eventId}`)
            return
        }
    }

    window.triggerUpload = openCamera
    window.switchExperience = switchExperience
    fetchExistingPhotos()
})

onBeforeUnmount(() => {
    stopCameraStream()
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
                                    <span class="quick-uploaded-stream-title">Uploaded Moments</span>
                                    <span class="quick-uploaded-stream-badge">{{ uploadedQuickPhotos.length }}</span>
                                </div>
                                <span class="quick-uploaded-stream-sub">Event #5 Vault</span>
                            </div>
                            <div ref="uploadedStreamRef" class="quick-uploaded-stream">
                                <div v-for="(photo, index) in uploadedQuickPhotos" :key="photo.id || index"
                                    class="quick-uploaded-item" :class="{ 'is-newly-added': photo.isNew }">
                                    <img :src="photo.url" alt="Uploaded moment" class="quick-uploaded-img" />
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
                                            '--upload-pct': `${photo.uploadPercent || 0}%`,
                                            '--card-index': index,
                                        }">
                                        <!-- Blue Progress Border Frame -->
                                        <div class="quick-stack-border-frame">
                                            <div class="quick-stack-img-wrap">
                                                <img :src="photo.dataUrl" alt="Stacked capture"
                                                    class="quick-stack-img" />
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
                                    <!-- Thumbnail if uploaded -->
                                    <div v-if="item.captured && item.image" class="moment-item__thumb-wrap">
                                        <img :alt="item.title" class="moment-item__thumb-img" :src="item.image">
                                        <div class="moment-item__thumb-badge">
                                            <span class="material-symbols-outlined"
                                                style="font-variation-settings: 'FILL' 1;">check</span>
                                        </div>
                                    </div>

                                    <!-- Placeholder if pending -->
                                    <div v-else class="moment-item__placeholder-wrap">
                                        <span class="material-symbols-outlined">broken_image</span>
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

        <!-- FULL SCREEN CAMERA VIEWFINDER MODAL -->
        <teleport to="body">
            <div v-if="isCameraOpen" class="camera-modal">
                <!-- Live Camera Viewfinder Layer -->
                <div class="camera-viewfinder-layer">
                    <!-- Real HTML5 Video Camera Stream Layer -->
                    <video v-show="hasCameraFeed" ref="videoElement" autoplay playsinline muted
                        class="camera-stream-video"
                        :class="[isViewfinderScaled ? 'is-scaled' : '', cameraFacingMode === 'user' ? 'is-flipped' : '']"></video>

                    <!-- Background Frame Fallback: Wedding Reception Viewfinder -->
                    <div v-show="!hasCameraFeed" id="cameraFeed" class="camera-stream-fallback"
                        :class="isViewfinderScaled ? 'is-scaled' : ''"
                        style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuA-EbfHxr0P6GL_iucEctw5mslqfrga9bIbAjvrYlYwBOFkBiHyF3G79f3rP3hPZ14Za8yR7ORgzGVH1-rH8hKNANpgBe0B_f6wTVwkC3rMXsMrciWu08_cZFAdCJcQSz-A_UgWcaqR-QYT5CetkjIIxOZstdE0fsfDrnaQnU6n_S0TnVpmSrApRCTJvyjK2M2bFkBeqFMhugW9d8ULHxxHe-Z3NBgKKypAgRK-MyDRMblqZDIgWr8i');">
                        <div class="camera-vignette-scrim"></div>
                        <div class="camera-radial-scrim"></div>
                    </div>

                    <!-- Live Golden Flash Ripple Overlay -->
                    <div id="shutterFlash" class="camera-shutter-flash"
                        :class="isFlashActive ? 'is-active' : 'is-inactive'">
                    </div>

                    <!-- TOP HUD BAR -->
                    <header class="camera-top-hud">
                        <div class="camera-top-controls">
                            <!-- Close Pill -->
                            <button aria-label="Return to Wedding Checklist" class="camera-hud-btn" type="button"
                                @click="closeCamera">
                                <span class="material-symbols-outlined">close</span>
                            </button>

                            <!-- Flash Mode Pill -->
                            <button aria-label="Toggle Flash Mode" class="camera-hud-btn" type="button"
                                @click="toggleFlash">
                                <span class="material-symbols-outlined">{{ flashMode }}</span>
                            </button>

                            <!-- Timer Toggle -->
                            <button aria-label="Toggle Camera Timer" class="camera-hud-btn" type="button"
                                @click="toggleTimer">
                                <span class="material-symbols-outlined">
                                    {{ currentTimer === 3 ? 'timer_3' : currentTimer === 10 ? 'timer_10' : 'timer_off'
                                    }}
                                </span>
                            </button>
                        </div>

                        <!-- Moment Mission Banner -->
                        <div class="camera-mission-banner">
                            <div class="camera-mission-pill">
                                <span class="camera-pulse-beacon">
                                    <span class="camera-pulse-ring"></span>
                                    <span class="camera-pulse-core"></span>
                                </span>
                                <h1 class="camera-mission-title">
                                    {{ activeMoment ? (activeMoment.number ? `MOMENT ${activeMoment.number} • ` : '') +
                                        activeMoment.title.toUpperCase() : "COUPLE'S FIRST DANCE" }}
                                </h1>
                            </div>
                            <p class="camera-mission-desc">
                                {{ activeMoment ? activeMoment.description :
                                    'Capture their magical spin under chandeliers' }}
                            </p>
                        </div>
                    </header>

                    <!-- CENTER RETICLE & VIEWPORT HUD -->
                    <div class="camera-reticle-container">
                        <div class="camera-reticle-box">
                            <div class="camera-reticle-corner camera-reticle-corner--tl"></div>
                            <div class="camera-reticle-corner camera-reticle-corner--tr"></div>
                            <div class="camera-reticle-corner camera-reticle-corner--bl"></div>
                            <div class="camera-reticle-corner camera-reticle-corner--br"></div>
                            <div class="camera-reticle-center"></div>
                            <div class="camera-exposure-sun">
                                <div class="camera-sun-track"></div>
                                <span class="material-symbols-outlined">wb_sunny</span>
                                <div class="camera-sun-track"></div>
                            </div>
                            <div class="camera-watermark-seal">
                                <span class="camera-seal-initials">{{ currentWedding.initials }}</span>
                                <span class="camera-seal-date">• {{ currentWedding.dateBadge }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- BOTTOM CAMERA COCKPIT -->
                    <footer class="camera-bottom-cockpit">
                        <!-- Lens Zoom Switcher -->
                        <div class="camera-zoom-row">
                            <button class="camera-zoom-btn" :class="{ 'is-active': selectedZoom === '.5' }"
                                type="button" @click="selectedZoom = '.5'">
                                .5
                            </button>
                            <button class="camera-zoom-btn" :class="{ 'is-active': selectedZoom === '1×' }"
                                type="button" @click="selectedZoom = '1×'">
                                1×
                            </button>
                            <button class="camera-zoom-btn" :class="{ 'is-active': selectedZoom === '2' }" type="button"
                                @click="selectedZoom = '2'">
                                2
                            </button>
                        </div>

                        <!-- Mode Dial -->
                        <div class="camera-mode-dial">
                            <span class="camera-mode-item"
                                :class="activeCameraMode === 'PHOTO' ? 'is-active' : 'is-inactive'"
                                @click="activeCameraMode = 'PHOTO'">
                                PHOTO
                                <span v-if="activeCameraMode === 'PHOTO'" class="camera-mode-dot"></span>
                            </span>
                            <span class="camera-mode-item"
                                :class="activeCameraMode === 'VIDEO' ? 'is-active' : 'is-inactive'"
                                @click="activeCameraMode = 'VIDEO'">
                                VIDEO
                                <span v-if="activeCameraMode === 'VIDEO'" class="camera-mode-dot"></span>
                            </span>
                        </div>

                        <!-- Shutter Row & Triggers -->
                        <div class="camera-controls-row">
                            <!-- Flip Camera -->
                            <button id="lensFlipBtn" aria-label="Switch Camera Lens" class="camera-flip-btn"
                                type="button" @click="flipCamera">
                                <span class="material-symbols-outlined">flip_camera_ios</span>
                            </button>

                            <!-- Circular Shutter Button -->
                            <button id="shutterBtn" aria-label="Take Wedding Photo" class="camera-shutter-btn"
                                type="button" @click="takePhoto">
                                <span class="camera-shutter-core">
                                    <span class="camera-shutter-ring"></span>
                                </span>
                            </button>

                            <!-- Gallery Picker Preview -->
                            <button aria-label="View QRchive Reception Gallery" class="camera-gallery-btn" type="button"
                                @click="openGalleryPicker">
                                <div class="camera-gallery-frame">
                                    <img alt="Recent candid guest moment" class="camera-gallery-img"
                                        :src="latestGalleryImage">
                                    <div class="camera-gallery-badge">
                                        {{ galleryCount }}
                                    </div>
                                </div>
                                <span class="camera-gallery-label">Gallery</span>
                            </button>
                        </div>

                        <!-- Home Indicator Safe Area Pill -->
                        <div class="camera-home-indicator"></div>
                    </footer>
                </div>
            </div>
        </teleport>
    </div>
</template>