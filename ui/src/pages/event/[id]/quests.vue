<route lang="yaml">
meta:
  layout: blank
  public: true
</route>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLogo from '@core/components/AppLogo.vue'

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
        return knownWeddings[id]
    }
    return {
        couple: 'Keann & Jenny',
        title: "Keann & Jenny's Wedding",
        initials: 'K & J',
        dateBadge: '24.10.26',
    }
})

// File upload & Toast state
const fileInput = ref(null)
const currentTargetTitle = ref('')
const toast = ref({
    show: false,
    message: "Captured beautifully! Added to Jenny & Keann's vault.",
})
let toastTimeout = null

const showToast = (msg) => {
    toast.value = { show: true, message: msg }
    if (toastTimeout) clearTimeout(toastTimeout)
    toastTimeout = setTimeout(() => {
        toast.value.show = false
    }, 2800)
}

// Camera Live Feed & Modal State
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
    'https://lh3.googleusercontent.com/aida/AEtjO1Xu0uDxK1z98gU-U10I5dT1Pq6caa4kf71ryvUmVKXlDIRBG-ecdwCyyjoRNrFdGiri4IrBmUXmAP5maAAjrnPCQXFv3NjMtWop5h07MwQZ10RErhRVO5nBaVBnAlHkcO5_mDSAqS5mUe6DvBCdLyJ8InWakiDAzZsrJtJf5K8V14D3iLBA2aanJHLZL1pj-6aHJzu5bvQmKOG4_HH2uQqcCwg-7KxXbVhQbtZldFbxD0vIVPinj4EAzIA',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuC_b45E9YjZPsE9FZqujCSRNTm6TpITBwM_TaJFgapEZqnACNNwtSVVLegXCWrGpfncDgbRxwks7l8wtobmCfqQkFQv34yOtgKuuNCrqjBvvgccMhT42aq0aHWZnTM-_kf98W7MIzPhbJg7cCIGS2Qy3CEH8ggjzWg0aUNB4Le6KuNEtqtn-DZAcxxNxm62OShpMnoE5uH6Kye6WAxV9WCfQwoP8bbVduYvD1BF5SQjqaIMfsDR8GxI',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAtugc2oDwyayarlJO8IfY0KvJE1t-Txs0OEHZIUXi0H29kBMKoVaHtrvXCg_u6ZTSk4htGJYBiWIv9oXQHWmHhBObhhwNp8IiGEZFLrWIjQAN6Dbjg4lq2CknxKewu2RidFIQaLD83ZtDjl8GOmewe9pBnqX_XoFRUNj0nEFWV3atRIeQroa2FQ44na1TzF-KDKTxmI_e-FdlJla9GpGDqzMj7G52Y8JjxXo1RK5-WSqdqhEhPAd7w',
])
const galleryCount = ref(12)

const latestGalleryImage = computed(() => {
    if (galleryPhotos.value.length > 0) {
        return galleryPhotos.value[galleryPhotos.value.length - 1]
    }
    return 'https://lh3.googleusercontent.com/aida/AEtjO1Xu0uDxK1z98gU-U10I5dT1Pq6caa4kf71ryvUmVKXlDIRBG-ecdwCyyjoRNrFdGiri4IrBmUXmAP5maAAjrnPCQXFv3NjMtWop5h07MwQZ10RErhRVO5nBaVBnAlHkcO5_mDSAqS5mUe6DvBCdLyJ8InWakiDAzZsrJtJf5K8V14D3iLBA2aanJHLZL1pj-6aHJzu5bvQmKOG4_HH2uQqcCwg-7KxXbVhQbtZldFbxD0vIVPinj4EAzIA'
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
    activeMoment.value = moment || moments.value[2] // defaults to "Couple's First Dance" if none
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
    // Shutter flash effect
    isFlashActive.value = true
    isViewfinderScaled.value = true

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 20, 50])
    }

    // Try capturing real frame from video element to canvas
    if (hasCameraFeed.value && videoElement.value) {
        try {
            const canvas = document.createElement('canvas')
            canvas.width = videoElement.value.videoWidth || 1080
            canvas.height = videoElement.value.videoHeight || 1920
            const ctx = canvas.getContext('2d')
            ctx.drawImage(videoElement.value, 0, 0, canvas.width, canvas.height)
            const photoUrl = canvas.toDataURL('image/jpeg', 0.85)
            galleryPhotos.value.push(photoUrl)
        } catch {
            // fallback
        }
    }

    galleryCount.value += 1

    // Update active moment status
    if (activeMoment.value) {
        const found = moments.value.find((m) => m.id === activeMoment.value.id)
        if (found) {
            found.captured = true
            found.photosCount = (found.photosCount || 0) + 1
        }
    }

    setTimeout(() => {
        isFlashActive.value = false
        isViewfinderScaled.value = false
    }, 120)

    showToast(`Captured beautifully! Added to ${currentWedding.value.couple}'s vault.`)
}

// Gallery Picker in bottom-right corner
const openGalleryPicker = () => {
    if (fileInput.value) {
        fileInput.value.removeAttribute('capture')
        fileInput.value.click()
    }
}

const handleFileChange = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
        const title = currentTargetTitle.value || currentWedding.value.couple
        showToast(`Photo secured for: ${title}! Added to vault.`)

        // Add image url to gallery if possible
        const reader = new FileReader()
        reader.onload = (event) => {
            if (event.target && event.target.result) {
                galleryPhotos.value.push(event.target.result)
                galleryCount.value += files.length
            }
        }
        reader.readAsDataURL(files[0])

        // Mark item as captured if matched
        if (activeMoment.value) {
            const matched = moments.value.find((m) => m.id === activeMoment.value.id)
            if (matched) {
                matched.captured = true
                matched.photosCount = (matched.photosCount || 0) + files.length
            }
        }
        e.target.value = ''
    }
}

const triggerMultiUpload = () => {
    currentTargetTitle.value = 'Multi-Moment Batch'
    openGalleryPicker()
}

// Filter category state
const activeCategory = ref('all')

const filterCategory = (category) => {
    activeCategory.value = category
}

// Moments Checklist Data
const moments = ref([
    {
        id: 1,
        number: '01',
        title: "Bride's Grand Entrance",
        category: 'ceremony',
        categoryLabel: 'Ceremony',
        description: "Catch Jenny walking down the aisle towards Keann in her radiant gown.",
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_b45E9YjZPsE9FZqujCSRNTm6TpITBwM_TaJFgapEZqnACNNwtSVVLegXCWrGpfncDgbRxwks7l8wtobmCfqQkFQv34yOtgKuuNCrqjBvvgccMhT42aq0aHWZnTM-_kf98W7MIzPhbJg7cCIGS2Qy3CEH8ggjzWg0aUNB4Le6KuNEtqtn-DZAcxxNxm62OShpMnoE5uH6Kye6WAxV9WCfQwoP8bbVduYvD1BF5SQjqaIMfsDR8GxI',
        captured: true,
        photosCount: 2,
        statusText: 'Your photos in vault',
    },
    {
        id: 2,
        number: '02',
        title: 'The First Kiss as Newlyweds',
        category: 'ceremony',
        categoryLabel: 'Ceremony',
        description: 'The magical pronouncement moment at the altar.',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtugc2oDwyayarlJO8IfY0KvJE1t-Txs0OEHZIUXi0H29kBMKoVaHtrvXCg_u6ZTSk4htGJYBiWIv9oXQHWmHhBObhhwNp8IiGEZFLrWIjQAN6Dbjg4lq2CknxKewu2RidFIQaLD83ZtDjl8GOmewe9pBnqX_XoFRUNj0nEFWV3atRIeQroa2FQ44na1TzF-KDKTxmI_e-FdlJla9GpGDqzMj7G52Y8JjxXo1RK5-WSqdqhEhPAd7w',
        captured: true,
        photosCount: 1,
        statusText: 'Archived in Gallery',
    },
    {
        id: 3,
        number: '03',
        title: "Couple's First Dance",
        category: 'reception',
        categoryLabel: 'Reception',
        badge: 'Up Next at Reception',
        description: 'Their romantic first spin under the grand chandeliers with the bridal party encircling the wooden floor.',
        tip: 'Tip: Capture from the mezzanine',
        captured: false,
        isUpNext: true,
    },
    {
        id: 4,
        number: '04',
        title: 'The Wedding Cake Cutting',
        category: 'reception',
        categoryLabel: 'Reception • Milestone',
        icon: 'cake',
        description: 'Sweet smiles, shared laughter, and the ceremonial first slice together at the marble table.',
        statusText: '0 / 3 photos uploaded',
        captured: false,
    },
    {
        id: 5,
        number: '05',
        title: 'Toast & Champagne Cheers',
        category: 'reception',
        categoryLabel: 'Reception • Speeches',
        icon: 'wine_bar',
        description: 'Crystal glasses raised during the heartfelt maid-of-honor and best man speeches.',
        statusText: 'Waiting for toasts',
        captured: false,
    },
    {
        id: 6,
        number: '06',
        title: 'Guests Laughing at Table',
        category: 'candid',
        categoryLabel: 'Candid & Fun',
        icon: 'sentiment_very_satisfied',
        description: 'Unposed joyful smiles, clinking flutes, and friends sharing warm memories across dining tables.',
        statusText: 'Show us your tablemates!',
        captured: false,
    },
    {
        id: 7,
        number: '07',
        title: 'Bouquet Toss or Florals',
        category: 'ceremony',
        categoryLabel: 'Details & Decor',
        icon: 'local_florist',
        description: 'The bridal garden rose arrangement or the mid-air toss excitement with friends.',
        statusText: 'Aesthetic close-ups',
        captured: false,
    },
    {
        id: 8,
        number: '08',
        title: 'Evening Sparkler Send-Off',
        category: 'candid',
        categoryLabel: 'Evening Send-Off',
        icon: 'auto_awesome',
        description: 'Luminous golden glow as friends and family wave long sparklers outside the villa steps.',
        statusText: 'Late night milestone',
        captured: false,
    },
])

// Progress calculations
const capturedCount = computed(() => moments.value.filter((m) => m.captured).length)
const totalCount = 10
const progressPercent = computed(() => Math.round((capturedCount.value / totalCount) * 100))

// Navigation helpers
const navigateToWelcome = () => {
    const eventId = route.params.id || 'keann-and-jenny'
    router.push(`/event/${eventId}`)
}

onMounted(() => {
    window.triggerUpload = openCamera
    window.triggerMultiUpload = triggerMultiUpload
})

onBeforeUnmount(() => {
    stopCameraStream()
})
</script>

<template>
    <div class="quests-page-root bg-surface font-body-md text-body-md text-on-surface flex flex-col min-h-screen">
        <!-- Header -->
        <header
            class="fixed top-0 w-full z-40 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_12px_rgba(43,38,35,0.04)] header-border">
            <div class="h-16 px-gutter flex items-center justify-between gap-space-sm">
                <div class="flex items-center gap-space-sm min-w-0 flex-1 cursor-pointer" @click="navigateToWelcome">
                    <AppLogo :width="28" :height="28" color="primary" class="shrink-0" />
                    <div class="flex flex-col min-w-0">
                        <span class="font-label-sm text-label-sm uppercase tracking-widest text-primary truncate">
                            {{ currentWedding.title }}
                        </span>
                        <span class="font-headline-sm text-headline-sm text-on-surface truncate">
                            Checklist
                        </span>
                    </div>
                </div>
                <div class="flex items-center justify-end shrink-0 pl-space-xs">
                    <button
                        class="w-8 h-8 rounded-full bg-primary flex items-center justify-center border-0 cursor-pointer"
                        title="Guest Profile">
                        <span class="material-symbols-outlined text-on-primary text-[18px]">person</span>
                    </button>
                </div>
            </div>
        </header>

        <!-- Main Body -->
        <main class="flex-1 flex flex-col relative w-full pt-16 pb-20 bg-surface">
            <div class="flex flex-col w-full px-margin pb-space-xl">
                <!-- Interactive Hidden File Input for Native Camera / Gallery Upload Feel -->
                <input id="photo-upload-input" ref="fileInput" accept="image/*" class="hidden" type="file"
                    @change="handleFileChange">

                <!-- Toast Notification Container for Delight Moment -->
                <div id="toast-delight"
                    class="fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none w-[90%] max-w-sm"
                    :class="toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[-10px]'">
                    <div
                        class="bg-inverse-surface text-inverse-on-surface px-space-md py-space-sm rounded-xl shadow-xl flex items-center gap-space-sm">
                        <span class="material-symbols-outlined text-primary-fixed"
                            style="font-variation-settings: 'FILL' 1;">verified</span>
                        <span id="toast-message" class="font-body-sm text-body-sm text-inverse-on-surface font-medium">
                            {{ toast.message }}
                        </span>
                    </div>
                </div>

                <!-- Hero Header Progress Card -->
                <div
                    class="w-full mt-space-md mb-space-lg rounded-xl bg-surface-container-lowest p-space-lg shadow-sm relative overflow-hidden">
                    <div
                        class="absolute -right-10 -bottom-10 w-36 h-36 rounded-full bg-primary-fixed/30 blur-2xl pointer-events-none">
                    </div>
                    <div class="flex flex-col gap-space-xs relative z-10">
                        <div class="flex items-center gap-space-xs">
                            <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                            <span
                                class="font-label-sm text-label-sm uppercase tracking-widest text-primary font-semibold">
                                Guest Photo Quest • {{ capturedCount }} of {{ totalCount }} Captured
                            </span>
                        </div>
                        <h1 class="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mt-space-xs">
                            Moments to Capture
                        </h1>
                        <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                            Help {{ currentWedding.couple }} preserve every cherished perspective of their day. Snap
                            photos directly or choose from your camera roll.
                        </p>

                        <!-- Progress Section -->
                        <div class="mt-space-md pt-space-sm flex flex-col gap-space-xs">
                            <div class="flex justify-between items-baseline">
                                <span
                                    class="font-label-md text-label-md uppercase tracking-wider text-primary font-semibold">
                                    Your Quest Progress
                                </span>
                                <span
                                    class="font-label-md text-label-md tracking-wider text-on-surface-variant font-bold">
                                    {{ capturedCount }} / {{ totalCount }} Moments ({{ progressPercent }}%)
                                </span>
                            </div>
                            <div class="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                                <div class="h-full bg-primary rounded-full transition-all duration-700"
                                    :style="{ width: `${progressPercent}%` }"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Category Filter Chips (Horizontal Scroll) -->
                <div class="w-full flex items-center gap-space-sm overflow-x-auto pb-space-sm mb-space-md no-scrollbar">
                    <button
                        class="filter-chip shrink-0 px-space-md py-space-xs rounded-full font-label-md text-label-md uppercase tracking-wider transition-all cursor-pointer border-0"
                        :class="activeCategory === 'all' ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'"
                        @click="filterCategory('all')">
                        All Moments (10)
                    </button>
                    <button
                        class="filter-chip shrink-0 px-space-md py-space-xs rounded-full font-label-md text-label-md uppercase tracking-wider transition-all cursor-pointer border-0"
                        :class="activeCategory === 'ceremony' ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'"
                        @click="filterCategory('ceremony')">
                        Ceremony (4)
                    </button>
                    <button
                        class="filter-chip shrink-0 px-space-md py-space-xs rounded-full font-label-md text-label-md uppercase tracking-wider transition-all cursor-pointer border-0"
                        :class="activeCategory === 'reception' ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'"
                        @click="filterCategory('reception')">
                        Reception (4)
                    </button>
                    <button
                        class="filter-chip shrink-0 px-space-md py-space-xs rounded-full font-label-md text-label-md uppercase tracking-wider transition-all cursor-pointer border-0"
                        :class="activeCategory === 'candid' ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'"
                        @click="filterCategory('candid')">
                        Candid &amp; Fun (2)
                    </button>
                </div>

                <!-- Checklist Stream -->
                <div id="moments-list" class="flex flex-col gap-space-md">
                    <template v-for="item in moments" :key="item.id">
                        <!-- Up Next Highlighted Card (Item 3) -->
                        <div v-if="item.isUpNext" v-show="activeCategory === 'all' || activeCategory === item.category"
                            class="moment-item w-full rounded-xl bg-surface-container-low p-space-md shadow-md relative overflow-hidden"
                            :data-category="item.category">
                            <div
                                class="absolute top-0 right-0 w-24 h-24 bg-primary-fixed/20 rounded-full blur-xl pointer-events-none">
                            </div>
                            <div class="flex flex-col gap-space-sm">
                                <div class="flex items-center justify-between">
                                    <span
                                        class="px-space-xs py-[2px] rounded-md bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold tracking-wider uppercase flex items-center gap-1">
                                        <span class="material-symbols-outlined text-[14px]">stars</span>
                                        {{ item.badge }}
                                    </span>
                                    <span class="font-label-sm text-label-sm text-primary font-bold">Unclaimed
                                        Perspective</span>
                                </div>
                                <div>
                                    <h2 class="font-headline-sm text-headline-sm text-on-surface leading-tight">
                                        {{ item.title }}
                                    </h2>
                                    <p class="font-body-sm text-body-sm text-on-surface-variant mt-[3px]">
                                        {{ item.description }}
                                    </p>
                                </div>
                                <div class="pt-space-xs flex items-center justify-between">
                                    <div class="flex items-center gap-space-xs text-on-surface-variant">
                                        <span class="material-symbols-outlined text-[18px]">motion_photos_on</span>
                                        <span class="font-body-sm text-body-sm">{{ item.tip }}</span>
                                    </div>
                                    <button
                                        class="px-space-md py-space-sm rounded-lg bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider flex items-center gap-space-xs shadow-md active:scale-95 transition-transform cursor-pointer border-0"
                                        @click="openCamera(item)">
                                        <span class="material-symbols-outlined text-[18px]"
                                            style="font-variation-settings: 'FILL' 1;">photo_camera</span>
                                        Add Photo
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Captured Card with Thumbnail (Items 1 & 2) -->
                        <div v-else-if="item.captured && item.image"
                            v-show="activeCategory === 'all' || activeCategory === item.category"
                            class="moment-item w-full rounded-xl bg-surface-container-lowest p-space-md shadow-sm transition-all duration-200"
                            :data-category="item.category">
                            <div class="flex items-start gap-space-md">
                                <div
                                    class="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-surface-container relative">
                                    <img class="w-full h-full object-cover" :src="item.image" :alt="item.title">
                                    <div
                                        class="absolute bottom-1 right-1 bg-primary text-on-primary w-5 h-5 rounded-full flex items-center justify-center shadow">
                                        <span class="material-symbols-outlined text-[13px]"
                                            style="font-variation-settings: 'FILL' 1;">check</span>
                                    </div>
                                </div>
                                <div class="flex flex-col flex-1 min-w-0">
                                    <div class="flex items-center gap-space-xs">
                                        <span
                                            class="px-space-xs py-[2px] rounded-md bg-secondary-container text-on-secondary-container font-label-sm text-label-sm tracking-wide">
                                            {{ item.categoryLabel }}
                                        </span>
                                        <span
                                            class="font-label-sm text-label-sm text-primary font-semibold flex items-center gap-[2px]">
                                            <span class="material-symbols-outlined text-[14px]"
                                                style="font-variation-settings: 'FILL' 1;">verified</span>
                                            Captured • {{ item.photosCount }} photo{{ item.photosCount > 1 ? 's' : '' }}
                                        </span>
                                    </div>
                                    <h2
                                        class="font-headline-sm text-headline-sm text-on-surface mt-space-xs leading-snug">
                                        {{ item.title }}
                                    </h2>
                                    <p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-[2px]">
                                        {{ item.description }}
                                    </p>
                                    <div class="mt-space-sm flex items-center justify-between">
                                        <span class="font-label-sm text-label-sm text-on-surface-variant">
                                            {{ item.statusText }}
                                        </span>
                                        <button
                                            class="px-space-sm py-space-xs rounded-lg bg-surface-container text-on-surface font-label-md text-label-md uppercase tracking-wider flex items-center gap-space-xs hover:bg-surface-container-high transition-colors cursor-pointer border-0"
                                            @click="openCamera(item)">
                                            <span class="material-symbols-outlined text-[16px]">add_a_photo</span>
                                            + Add More
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Standard Pending Card with Icon (Items 4-8) -->
                        <div v-else v-show="activeCategory === 'all' || activeCategory === item.category"
                            class="moment-item w-full rounded-xl bg-surface-container-lowest p-space-md shadow-sm transition-all"
                            :data-category="item.category">
                            <div class="flex items-start justify-between gap-space-sm">
                                <div class="flex flex-col flex-1 min-w-0">
                                    <span
                                        class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                                        {{ item.categoryLabel }}
                                    </span>
                                    <h2 class="font-headline-sm text-headline-sm text-on-surface mt-[2px] leading-snug">
                                        {{ item.title }}
                                    </h2>
                                    <p class="font-body-sm text-body-sm text-on-surface-variant mt-[3px]">
                                        {{ item.description }}
                                    </p>
                                </div>
                                <div
                                    class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                                    <span class="material-symbols-outlined text-primary text-[24px]">{{ item.icon
                                        }}</span>
                                </div>
                            </div>
                            <div class="mt-space-sm pt-space-xs flex items-center justify-between">
                                <span class="font-label-sm text-label-sm text-outline">
                                    {{ item.statusText }}
                                </span>
                                <button
                                    class="px-space-md py-space-xs rounded-lg bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider flex items-center gap-space-xs active:scale-95 transition-transform shadow-sm cursor-pointer border-0"
                                    @click="openCamera(item)">
                                    <span class="material-symbols-outlined text-[16px]">photo_camera</span>
                                    Add Photo
                                </button>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </main>

        <!-- Fixed Bottom Navigation Bar -->
        <nav
            class="fixed bottom-0 w-full z-40 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-4px_24px_rgba(43,38,35,0.05)] border-t border-subtle">
            <div class="h-16 px-gutter flex items-center justify-around">
                <button class="flex flex-col items-center gap-1 text-primary border-0 bg-transparent cursor-pointer">
                    <span class="material-symbols-outlined text-[22px]"
                        style="font-variation-settings: 'FILL' 1;">checklist</span>
                    <span class="font-label-sm text-[10px] tracking-wider uppercase font-bold">Checklist</span>
                </button>
                <button
                    class="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary border-0 bg-transparent cursor-pointer"
                    @click="openCamera(null)">
                    <div
                        class="w-10 h-10 -mt-5 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                        <span class="material-symbols-outlined text-[22px]">add_a_photo</span>
                    </div>
                    <span class="font-label-sm text-[10px] tracking-wider uppercase font-semibold">Camera</span>
                </button>
                <button
                    class="flex flex-col items-center gap-1 text-on-surface-variant hover:text-primary border-0 bg-transparent cursor-pointer"
                    @click="navigateToWelcome">
                    <span class="material-symbols-outlined text-[22px]">celebration</span>
                    <span class="font-label-sm text-[10px] tracking-wider uppercase font-semibold">Welcome</span>
                </button>
            </div>
        </nav>

        <!-- ========================================================================= -->
        <!-- FULL SCREEN CAMERA VIEWFINDER MODAL                                       -->
        <!-- ========================================================================= -->
        <teleport to="body">
            <div v-if="isCameraOpen"
                class="fixed inset-0 z-50 bg-inverse-surface text-surface font-body-md flex flex-col justify-between overflow-hidden select-none camera-modal-container">

                <!-- Live Camera Viewfinder Layer -->
                <div class="relative w-full h-full flex-1 overflow-hidden flex flex-col justify-between">
                    <!-- Real HTML5 Video Camera Stream Layer -->
                    <video v-show="hasCameraFeed" ref="videoElement" autoplay playsinline muted
                        class="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-700"
                        :class="[isViewfinderScaled ? 'scale-[1.02]' : 'scale-100', cameraFacingMode === 'user' ? 'scale-x-[-1]' : '']">
                    </video>

                    <!-- Background Frame Fallback: Wedding Reception Viewfinder -->
                    <div v-show="!hasCameraFeed" id="cameraFeed"
                        class="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700"
                        :class="isViewfinderScaled ? 'scale-[1.02]' : 'scale-100'"
                        style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuA-EbfHxr0P6GL_iucEctw5mslqfrga9bIbAjvrYlYwBOFkBiHyF3G79f3rP3hPZ14Za8yR7ORgzGVH1-rH8hKNANpgBe0B_f6wTVwkC3rMXsMrciWu08_cZFAdCJcQSz-A_UgWcaqR-QYT5CetkjIIxOZstdE0fsfDrnaQnU6n_S0TnVpmSrApRCTJvyjK2M2bFkBeqFMhugW9d8ULHxxHe-Z3NBgKKypAgRK-MyDRMblqZDIgWr8i');">
                        <!-- Vignette and Dark Scrim Gradients -->
                        <div
                            class="absolute inset-0 bg-gradient-to-b from-inverse-surface/80 via-transparent to-inverse-surface/90 pointer-events-none">
                        </div>
                        <div
                            class="absolute inset-0 bg-radial from-transparent via-transparent to-inverse-surface/50 pointer-events-none">
                        </div>
                    </div>

                    <!-- Live Golden Flash Ripple Overlay (Micro-interaction) -->
                    <div id="shutterFlash"
                        class="absolute inset-0 bg-surface-container-lowest pointer-events-none z-50 transition-opacity duration-150"
                        :class="isFlashActive ? 'opacity-85' : 'opacity-0'">
                    </div>

                    <!-- TOP HUD BAR: Minimalist Luxury Glass -->
                    <header class="relative z-30 w-full pt-4 px-4 flex flex-col gap-3 pt-safe">
                        <!-- Topmost System & Camera Setting Controls -->
                        <div class="flex items-center justify-between w-full">
                            <!-- Close / Return Pill -->
                            <button aria-label="Return to Wedding Checklist"
                                class="flex items-center justify-center w-10 h-10 rounded-full bg-inverse-surface/60 backdrop-blur-md text-surface active:scale-90 transition-transform border-0 cursor-pointer"
                                type="button" @click="closeCamera">
                                <span class="material-symbols-outlined text-[20px]">close</span>
                            </button>

                            <!-- Flash Mode Pill -->
                            <button aria-label="Toggle Flash Mode"
                                class="flex items-center justify-center w-10 h-10 rounded-full bg-inverse-surface/60 backdrop-blur-md text-surface active:scale-90 transition-transform border-0 cursor-pointer"
                                type="button" @click="toggleFlash">
                                <span class="material-symbols-outlined text-[19px]">{{ flashMode }}</span>
                            </button>

                            <!-- Timer / Settings Toggle -->
                            <div class="flex items-center gap-2">
                                <button aria-label="Toggle Camera Timer"
                                    class="flex items-center justify-center w-10 h-10 rounded-full bg-inverse-surface/60 backdrop-blur-md text-surface active:scale-90 transition-transform border-0 cursor-pointer"
                                    type="button" @click="toggleTimer">
                                    <span class="material-symbols-outlined text-[20px]">
                                        {{ currentTimer === 3 ? 'timer_3' : currentTimer === 10 ? 'timer_10' :
                                            'timer_off' }}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <!-- Haute Editorial Moment Banner (QRchive Guided Mission) -->
                        <div class="mx-auto w-full max-w-xs flex flex-col items-center">
                            <div
                                class="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-inverse-surface/70 backdrop-blur-lg shadow-lg">
                                <!-- Live Blinking Gilded Indicator -->
                                <span class="relative flex h-2 w-2">
                                    <span
                                        class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
                                    <span class="relative inline-flex rounded-full h-2 w-2 bg-primary-container"></span>
                                </span>
                                <h1 class="font-label-md text-label-md tracking-widest text-primary-fixed uppercase">
                                    MOMENT {{ activeMoment ? activeMoment.number || '03' : '03' }} • {{ activeMoment ?
                                        activeMoment.title : "COUPLE'S FIRST DANCE" }}
                                </h1>
                            </div>
                            <p
                                class="font-body-sm text-body-sm text-surface-bright/85 mt-1 tracking-wide text-center drop-shadow-md">
                                {{ activeMoment ?
                                    activeMoment.description : 'Capture their magical spin under chandeliers' }}
                            </p>
                        </div>
                    </header>

                    <!-- CENTER RETICLE & VIEWPORT HUD -->
                    <div class="relative z-20 flex-1 flex items-center justify-center pointer-events-none px-6">
                        <!-- Classical Golden Focus Brackets (Letterpress Gold Aesthetic) -->
                        <div class="relative w-52 h-52 flex items-center justify-center animate-pulse duration-1000">
                            <!-- Top Left Corner -->
                            <div
                                class="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-primary-container/80 rounded-tl-sm">
                            </div>
                            <!-- Top Right Corner -->
                            <div
                                class="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-primary-container/80 rounded-tr-sm">
                            </div>
                            <!-- Bottom Left Corner -->
                            <div
                                class="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-primary-container/80 rounded-bl-sm">
                            </div>
                            <!-- Bottom Right Corner -->
                            <div
                                class="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-primary-container/80 rounded-br-sm">
                            </div>
                            <!-- Center Micro Cipher / Crosshair Point -->
                            <div class="w-1.5 h-1.5 rounded-full bg-primary-container/90"></div>
                            <!-- Exposure Sun Calibration Notch (Simulated iOS control) -->
                            <div class="absolute -right-7 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5">
                                <div class="w-0.5 h-6 bg-primary-container/40 rounded-full"></div>
                                <span
                                    class="material-symbols-outlined text-primary-container text-[16px]">wb_sunny</span>
                                <div class="w-0.5 h-6 bg-primary-container/40 rounded-full"></div>
                            </div>
                            <!-- Subtle Watermark Monogram Seal -->
                            <div
                                class="absolute -bottom-8 flex items-center justify-center gap-1.5 bg-inverse-surface/40 backdrop-blur-sm px-2.5 py-0.5 rounded-full">
                                <span class="font-headline-sm text-[11px] text-primary-fixed tracking-widest italic">
                                    {{ currentWedding.initials }}
                                </span>
                                <span class="font-label-sm text-label-sm text-surface-dim uppercase">• {{
                                    currentWedding.dateBadge }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- BOTTOM CAMERA COCKPIT: iOS Tactile Layout -->
                    <footer
                        class="relative z-30 w-full flex flex-col pb-4 bg-gradient-to-t from-inverse-surface via-inverse-surface/85 to-transparent pt-6 pb-safe">
                        <!-- Lens Zoom Switcher (iOS 0.5x, 1x, 2x) -->
                        <div class="flex items-center justify-center gap-3 mb-4">
                            <button
                                class="w-7 h-7 rounded-full bg-inverse-surface/70 backdrop-blur-md flex items-center justify-center text-surface-dim font-label-md text-label-md transition-transform active:scale-90 border-0 cursor-pointer"
                                :class="{ 'text-primary-fixed ring-1 ring-primary-container/60': selectedZoom === '.5' }"
                                type="button" @click="selectedZoom = '.5'">
                                .5
                            </button>
                            <button
                                class="w-8 h-8 rounded-full bg-primary-container/30 backdrop-blur-md flex items-center justify-center text-primary-fixed font-label-md text-label-md ring-1 ring-primary-container/60 shadow-md border-0 cursor-pointer"
                                :class="{ 'bg-primary-container text-on-primary-container': selectedZoom === '1×' }"
                                type="button" @click="selectedZoom = '1×'">
                                1×
                            </button>
                            <button
                                class="w-7 h-7 rounded-full bg-inverse-surface/70 backdrop-blur-md flex items-center justify-center text-surface-dim font-label-md text-label-md transition-transform active:scale-90 border-0 cursor-pointer"
                                :class="{ 'text-primary-fixed ring-1 ring-primary-container/60': selectedZoom === '2' }"
                                type="button" @click="selectedZoom = '2'">
                                2
                            </button>
                        </div>

                        <!-- iOS Horizontal Mode Dial -->
                        <div
                            class="w-full overflow-x-auto no-scrollbar flex items-center justify-center gap-6 px-8 mb-5 scroll-smooth">
                            <span
                                class="font-label-md text-label-md tracking-wider uppercase whitespace-nowrap cursor-pointer transition-colors"
                                :class="activeCameraMode === 'VIDEO' ? 'text-primary-container font-bold relative flex flex-col items-center' : 'text-surface-dim/70 hover:text-surface'"
                                @click="activeCameraMode = 'VIDEO'">
                                VIDEO
                                <span v-if="activeCameraMode === 'VIDEO'"
                                    class="w-1 h-1 rounded-full bg-primary-container mt-0.5"></span>
                            </span>
                        </div>

                        <!-- Shutter Row & Primary Triggers -->
                        <div class="w-full px-8 flex items-center justify-between">
                            <!-- Lens Flip / Selfie Toggle Button -->
                            <button aria-label="Switch Camera Lens"
                                class="flex items-center justify-center w-12 h-12 rounded-full bg-inverse-surface/60 backdrop-blur-xl text-surface active:rotate-180 transition-all duration-300 shadow-md border-0 cursor-pointer"
                                id="lensFlipBtn" type="button" @click="flipCamera">
                                <span class="material-symbols-outlined text-[24px]">flip_camera_ios</span>
                            </button>

                            <!-- Signature iOS Circular Shutter -->
                            <button aria-label="Take Wedding Photo"
                                class="relative group flex items-center justify-center shadow-2xl active:scale-95 transition-all cursor-pointer border-0 p-0"
                                id="shutterBtn"
                                style="width: 72px; height: 72px; min-width: 72px; min-height: 72px; border: 4px solid #ffffff; border-radius: 50% !important; aspect-ratio: 1 / 1;"
                                type="button" @click="takePhoto">
                                <span
                                    class="group-active:scale-90 group-active:bg-primary-fixed transition-all duration-100 flex items-center justify-center pointer-events-none"
                                    style="width: 58px; height: 58px; background-color: #ffffff; border-radius: 50% !important; aspect-ratio: 1 / 1;">
                                    <span class="pointer-events-none"
                                        style="width: 48px; height: 48px; border-radius: 50% !important; border: 1px solid rgba(197, 160, 89, 0.3);"></span>
                                </span>
                            </button>

                            <!-- Event Gallery & Recent Shot Preview Square -->
                            <button aria-label="View QRchive Reception Gallery"
                                class="relative flex flex-col items-center group active:scale-95 transition-transform border-0 bg-transparent cursor-pointer"
                                @click="openGalleryPicker">
                                <div
                                    class="relative w-12 h-12 rounded-lg overflow-hidden bg-surface-variant p-0.5 shadow-md">
                                    <img alt="Recent candid guest moment" class="w-full h-full object-cover rounded-md"
                                        :src="latestGalleryImage">
                                    <!-- Live Counter Chip Badge -->
                                    <div
                                        class="absolute -top-1.5 -right-1.5 bg-primary-container text-on-primary-container text-[9px] font-label-sm font-bold px-1.5 py-0.2 rounded-full shadow-sm">
                                        {{ galleryCount }}
                                    </div>
                                </div>
                                <span
                                    class="font-label-sm text-[9px] text-surface-bright/80 uppercase tracking-widest mt-1">Gallery</span>
                            </button>
                        </div>

                        <!-- Home Indicator Safe Area Pill -->
                        <div class="w-full flex justify-center mt-4">
                            <div class="w-32 h-1 rounded-full bg-surface/30"></div>
                        </div>
                    </footer>
                </div>
            </div>
        </teleport>
    </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

/* Root Container & Base Reset */
.quests-page-root {
    width: 100%;
    min-height: 100vh;
    margin: 0;
    padding: 0;
    background-color: #fff8f5;
    color: #1f1b18;
    font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overscroll-behavior-y: none;
    -webkit-tap-highlight-color: transparent;
}

.camera-modal-container {
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    margin: 0;
    padding: 0;
    background-color: #1f1b18;
    color: #fff8f5;
    overscroll-behavior: none;
}

.pb-safe {
    padding-bottom: env(safe-area-inset-bottom, 0px);
}

.pt-safe {
    padding-top: env(safe-area-inset-top, 0px);
}

/* Header border subtle */
.header-border {
    border-bottom: 1px solid rgba(127, 118, 103, 0.12);
}

.border-subtle {
    border-color: rgba(127, 118, 103, 0.12);
}

/* Fixed & Spacing */
.fixed {
    position: fixed;
}

.inset-0 {
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
}

.top-0 {
    top: 0;
}

.top-20 {
    top: 5rem;
}

.bottom-0 {
    bottom: 0;
}

.left-0 {
    left: 0;
}

.right-0 {
    right: 0;
}

.w-full {
    width: 100%;
}

.h-full {
    height: 100%;
}

.z-50 {
    z-index: 50;
}

.z-40 {
    z-index: 40;
}

.z-30 {
    z-index: 30;
}

.z-20 {
    z-index: 20;
}

.z-10 {
    z-index: 10;
}

.z-0 {
    z-index: 0;
}

.relative {
    position: relative;
}

.absolute {
    position: absolute;
}

.flex {
    display: flex;
}

.flex-col {
    flex-direction: column;
}

.flex-1 {
    flex: 1 1 0%;
}

.min-w-0 {
    min-width: 0;
}

.items-center {
    align-items: center;
}

.items-start {
    align-items: flex-start;
}

.items-baseline {
    align-items: baseline;
}

.justify-between {
    justify-content: space-between;
}

.justify-center {
    justify-content: center;
}

.justify-end {
    justify-content: flex-end;
}

.justify-around {
    justify-content: space-around;
}

.shrink-0 {
    flex-shrink: 0;
}

.truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* Heights & Widths */
.h-16 {
    height: 4rem;
}

.h-8 {
    height: 2rem;
}

.w-8 {
    width: 2rem;
}

.w-10 {
    width: 2.5rem;
}

.h-10 {
    height: 2.5rem;
}

.w-7 {
    width: 1.75rem;
}

.h-7 {
    height: 1.75rem;
}

.h-2 {
    height: 0.5rem;
}

.w-2 {
    width: 0.5rem;
}

.w-1 {
    width: 0.25rem;
}

.h-1 {
    height: 0.25rem;
}

.w-1\.5 {
    width: 0.375rem;
}

.h-1\.5 {
    height: 0.375rem;
}

.w-0\.5 {
    width: 2px;
}

.h-6 {
    height: 1.5rem;
}

.w-20 {
    width: 5rem;
}

.h-20 {
    height: 5rem;
}

.w-12 {
    width: 3rem;
}

.h-12 {
    height: 3rem;
}

.w-5 {
    width: 1.25rem;
}

.h-5 {
    height: 1.25rem;
}

.w-24 {
    width: 6rem;
}

.h-24 {
    height: 6rem;
}

.w-32 {
    width: 8rem;
}

.w-36 {
    width: 9rem;
}

.h-36 {
    height: 9rem;
}

.w-52 {
    width: 13rem;
}

.h-52 {
    height: 13rem;
}

.max-w-sm {
    max-width: 24rem;
}

.max-w-xs {
    max-width: 20rem;
}

.w-\[90\%\] {
    width: 90%;
}

/* Backgrounds & Colors */
.bg-surface {
    background-color: #fff8f5;
}

.bg-surface\/85 {
    background-color: rgba(255, 248, 245, 0.85);
}

.bg-surface\/90 {
    background-color: rgba(255, 248, 245, 0.9);
}

.bg-surface\/30 {
    background-color: rgba(255, 248, 245, 0.3);
}

.bg-primary {
    background-color: #775a19;
}

.bg-primary-container {
    background-color: #c5a059;
}

.bg-primary-container\/90 {
    background-color: rgba(197, 160, 89, 0.9);
}

.bg-primary-container\/40 {
    background-color: rgba(197, 160, 89, 0.4);
}

.bg-primary-container\/30 {
    background-color: rgba(197, 160, 89, 0.3);
}

.bg-primary-fixed {
    background-color: #ffdea5;
}

.bg-primary-fixed\/20 {
    background-color: rgba(255, 222, 165, 0.2);
}

.bg-primary-fixed\/30 {
    background-color: rgba(255, 222, 165, 0.3);
}

.bg-surface-container-lowest {
    background-color: #ffffff;
}

.bg-surface-container-low {
    background-color: #fcf2ec;
}

.bg-surface-container {
    background-color: #f6ece7;
}

.bg-surface-container-high {
    background-color: #f0e6e1;
}

.bg-surface-variant {
    background-color: #ebe0db;
}

.bg-secondary-container {
    background-color: #d2e1f7;
}

.bg-inverse-surface {
    background-color: #352f2c;
}

.bg-inverse-surface\/80 {
    background-color: rgba(53, 47, 44, 0.8);
}

.bg-inverse-surface\/85 {
    background-color: rgba(53, 47, 44, 0.85);
}

.bg-inverse-surface\/90 {
    background-color: rgba(53, 47, 44, 0.9);
}

.bg-inverse-surface\/70 {
    background-color: rgba(53, 47, 44, 0.7);
}

.bg-inverse-surface\/60 {
    background-color: rgba(53, 47, 44, 0.6);
}

.bg-inverse-surface\/50 {
    background-color: rgba(53, 47, 44, 0.5);
}

.bg-inverse-surface\/40 {
    background-color: rgba(53, 47, 44, 0.4);
}

.text-surface {
    color: #fff8f5;
}

.text-surface-bright\/85 {
    color: rgba(255, 248, 245, 0.85);
}

.text-surface-bright\/80 {
    color: rgba(255, 248, 245, 0.8);
}

.text-surface-dim {
    color: #e2d8d3;
}

.text-surface-dim\/70 {
    color: rgba(226, 216, 211, 0.7);
}

.text-on-surface {
    color: #1f1b18;
}

.text-on-surface-variant {
    color: #4e4639;
}

.text-primary {
    color: #775a19;
}

.text-primary-container {
    color: #c5a059;
}

.text-on-primary-container {
    color: #4e3700;
}

.text-on-primary {
    color: #ffffff;
}

.text-on-primary-fixed {
    color: #261900;
}

.text-on-secondary-container {
    color: #556477;
}

.text-primary-fixed {
    color: #ffdea5;
}

.text-inverse-on-surface {
    color: #f9efea;
}

.text-outline {
    color: #7f7667;
}

/* Gradients */
.bg-gradient-to-b {
    background: linear-gradient(to bottom, rgba(53, 47, 44, 0.8) 0%, transparent 40%, rgba(53, 47, 44, 0.9) 100%);
}

.bg-gradient-to-t {
    background: linear-gradient(to top, #352f2c 0%, rgba(53, 47, 44, 0.85) 50%, transparent 100%);
}

.bg-radial {
    background: radial-gradient(circle at center, transparent 0%, transparent 50%, rgba(53, 47, 44, 0.5) 100%);
}

/* Paddings & Margins */
.px-gutter {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
}

.px-margin {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
}

.px-4 {
    padding-left: 1rem;
    padding-right: 1rem;
}

.px-6 {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
}

.px-8 {
    padding-left: 2rem;
    padding-right: 2rem;
}

.px-3\.5 {
    padding-left: 0.875rem;
    padding-right: 0.875rem;
}

.px-2\.5 {
    padding-left: 0.625rem;
    padding-right: 0.625rem;
}

.px-1\.5 {
    padding-left: 0.375rem;
    padding-right: 0.375rem;
}

.pt-4 {
    padding-top: 1rem;
}

.pt-6 {
    padding-top: 1.5rem;
}

.pb-4 {
    padding-bottom: 1rem;
}

.py-1\.5 {
    padding-top: 0.375rem;
    padding-bottom: 0.375rem;
}

.py-0\.5 {
    padding-top: 0.125rem;
    padding-bottom: 0.125rem;
}

.gap-space-xs {
    gap: 0.25rem;
}

.gap-space-sm {
    gap: 0.5rem;
}

.gap-space-md {
    gap: 1rem;
}

.gap-1 {
    gap: 0.25rem;
}

.gap-1\.5 {
    gap: 0.375rem;
}

.gap-2 {
    gap: 0.5rem;
}

.gap-3 {
    gap: 0.75rem;
}

.gap-6 {
    gap: 1.5rem;
}

.p-space-md {
    padding: 1rem;
}

.p-space-lg {
    padding: 1.75rem;
}

.px-space-xs {
    padding-left: 0.25rem;
    padding-right: 0.25rem;
}

.px-space-sm {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
}

.px-space-md {
    padding-left: 1rem;
    padding-right: 1rem;
}

.py-space-xs {
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
}

.py-space-sm {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
}

.pl-space-xs {
    padding-left: 0.25rem;
}

.pb-space-sm {
    padding-bottom: 0.5rem;
}

.pb-space-xl {
    padding-bottom: 3rem;
}

.pt-16 {
    padding-top: 4rem;
}

.pb-20 {
    padding-bottom: 5rem;
}

.mt-space-xs {
    margin-top: 0.25rem;
}

.mt-space-sm {
    margin-top: 0.5rem;
}

.mt-space-md {
    margin-top: 1rem;
}

.mb-space-md {
    margin-bottom: 1rem;
}

.mb-space-lg {
    margin-bottom: 1.75rem;
}

.mb-4 {
    margin-bottom: 1rem;
}

.mb-5 {
    margin-bottom: 1.25rem;
}

.mt-1 {
    margin-top: 0.25rem;
}

.mt-4 {
    margin-top: 1rem;
}

.mt-0\.5 {
    margin-top: 0.125rem;
}

.-right-10 {
    right: -2.5rem;
}

.-bottom-10 {
    bottom: -2.5rem;
}

.-bottom-8 {
    bottom: -2rem;
}

.-right-7 {
    right: -1.75rem;
}

.-mt-5 {
    margin-top: -1.25rem;
}

.-top-1\.5 {
    top: -0.375rem;
}

.-right-1\.5 {
    right: -0.375rem;
}

/* Borders & Radii */
.rounded-xl {
    border-radius: 0.75rem;
}

.rounded-lg {
    border-radius: 0.5rem;
}

.rounded-md {
    border-radius: 0.25rem;
}

.rounded-sm {
    border-radius: 0.125rem;
}

.rounded-tl-sm {
    border-top-left-radius: 0.125rem;
}

.rounded-tr-sm {
    border-top-right-radius: 0.125rem;
}

.rounded-bl-sm {
    border-bottom-left-radius: 0.125rem;
}

.rounded-br-sm {
    border-bottom-right-radius: 0.125rem;
}

.rounded-full {
    border-radius: 9999px;
}

.border-t-2 {
    border-top-width: 2px;
    border-top-style: solid;
}

.border-l-2 {
    border-left-width: 2px;
    border-left-style: solid;
}

.border-r-2 {
    border-right-width: 2px;
    border-right-style: solid;
}

.border-b-2 {
    border-bottom-width: 2px;
    border-bottom-style: solid;
}

.border-primary-container\/80 {
    border-color: rgba(197, 160, 89, 0.8);
}

.ring-1 {
    box-shadow: 0 0 0 1px rgba(197, 160, 89, 0.6);
}

.overflow-hidden {
    overflow: hidden;
}

.overflow-x-auto {
    overflow-x: auto;
}

/* Shadows & Blurs */
.backdrop-blur-xl {
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
}

.backdrop-blur-lg {
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
}

.backdrop-blur-md {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
}

.backdrop-blur-sm {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}

.shadow-sm {
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.shadow-md {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
}

.shadow-xl {
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
}

.shadow-2xl {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
}

.shadow-lg {
    box-shadow: 0 10px 15px -3px rgba(119, 90, 25, 0.3), 0 4px 6px -4px rgba(119, 90, 25, 0.2);
}

.blur-2xl {
    filter: blur(40px);
}

.blur-xl {
    filter: blur(24px);
}

/* Typography tokens */
.font-headline-sm {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 22px;
    line-height: 30px;
    font-weight: 600;
}

.font-headline-lg-mobile {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 30px;
    line-height: 38px;
    font-weight: 400;
}

.font-label-sm {
    font-family: 'Manrope', sans-serif;
    font-size: 10px;
    line-height: 14px;
    letter-spacing: 0.22em;
    font-weight: 600;
}

.font-label-md {
    font-family: 'Manrope', sans-serif;
    font-size: 11px;
    line-height: 16px;
    letter-spacing: 0.18em;
    font-weight: 600;
}

.font-body-sm {
    font-family: 'Manrope', sans-serif;
    font-size: 13px;
    line-height: 20px;
    font-weight: 400;
}

.font-body-md {
    font-family: 'Manrope', sans-serif;
    font-size: 15px;
    line-height: 26px;
    letter-spacing: 0.01em;
    font-weight: 400;
}

.text-\[11px\] {
    font-size: 11px;
}

.text-\[9px\] {
    font-size: 9px;
}

.tracking-widest {
    letter-spacing: 0.15em;
}

.tracking-wider {
    letter-spacing: 0.05em;
}

.tracking-wide {
    letter-spacing: 0.025em;
}

.uppercase {
    text-transform: uppercase;
}

.italic {
    font-style: italic;
}

.font-semibold {
    font-weight: 600;
}

.font-bold {
    font-weight: 700;
}

.font-medium {
    font-weight: 500;
}

.leading-snug {
    line-height: 1.375;
}

.leading-tight {
    line-height: 1.25;
}

.leading-relaxed {
    line-height: 1.625;
}

.whitespace-nowrap {
    white-space: nowrap;
}

/* Icons */
.material-symbols-outlined {
    font-family: 'Material Symbols Outlined';
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
}

/* Animations & Transitions */
.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-ping {
    animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes ping {

    75%,
    100% {
        transform: scale(2);
        opacity: 0;
    }
}

@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}

.transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms;
}

.transition-transform {
    transition-property: transform;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
}

.transition-colors {
    transition-property: background-color, border-color, color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
}

.transition-opacity {
    transition-property: opacity;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.duration-150 {
    transition-duration: 150ms;
}

.duration-300 {
    transition-duration: 300ms;
}

.duration-700 {
    transition-duration: 700ms;
}

.duration-1000 {
    animation-duration: 1000ms;
}

.scale-100 {
    transform: scale(1);
}

.scale-\[1\.02\] {
    transform: scale(1.02);
}

.scale-x-\[-1\] {
    transform: scaleX(-1);
}

.active\:scale-95:active {
    transform: scale(0.95);
}

.active\:scale-90:active {
    transform: scale(0.9);
}

.active\:rotate-180:active {
    transform: rotate(180deg);
}

/* Transform utilities */
.-translate-x-1\/2 {
    transform: translateX(-50%);
}

.-translate-y-1\/2 {
    transform: translateY(-50%);
}

.left-1\/2 {
    left: 50%;
}

.top-1\/2 {
    top: 50%;
}

.translate-y-0 {
    transform: translateX(-50%) translateY(0);
}

.translate-y-\[-10px\] {
    transform: translateX(-50%) translateY(-10px);
}

.opacity-0 {
    opacity: 0;
}

.opacity-75 {
    opacity: 0.75;
}

.opacity-85 {
    opacity: 0.85;
}

.opacity-100 {
    opacity: 1;
}

.pointer-events-none {
    pointer-events: none;
}

.cursor-pointer {
    cursor: pointer;
}

.object-cover {
    object-fit: cover;
}

.object-contain {
    object-fit: contain;
}

.bg-cover {
    background-size: cover;
}

.bg-center {
    background-position: center;
}

.hidden {
    display: none;
}

.select-none {
    user-select: none;
    -webkit-user-select: none;
}

/* Scrollbar hiding */
.no-scrollbar::-webkit-scrollbar,
::-webkit-scrollbar {
    display: none;
}

.no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>