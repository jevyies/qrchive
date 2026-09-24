<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { getDemoPhotosCount } from '@/utils/demoDb'

const props = defineProps({
    isOpen: {
        type: Boolean,
        default: false,
    },
    modelValue: {
        type: Boolean,
        default: false,
    },
    activeMoment: {
        type: Object,
        default: null,
    },
    wedding: {
        type: Object,
        default: () => ({
            initials: 'K & J',
            dateBadge: '24.10.26',
        }),
    },
    galleryImage: {
        type: String,
        default:
            'https://lh3.googleusercontent.com/aida-public/AB6AXuC_b45E9YjZPsE9FZqujCSRNTm6TpITBwM_TaJFgapEZqnACNNwtSVVLegXCWrGpfncDgbRxwks7l8wtobmCfqQkFQv34yOtgKuuNCrqjBvvgccMhT42aq0aHWZnTM-_kf98W7MIzPhbJg7cCIGS2Qy3CEH8ggjzWg0aUNB4Le6KuNEtqtn-DZAcxxNxm62OShpMnoE5uH6Kye6WAxV9WCfQwoP8bbVduYvD1BF5SQjqaIMfsDR8GxI',
    },
    galleryCount: {
        type: Number,
        default: null,
    },
    captureExperience: {
        type: String,
        default: 'quick',
    },
})

const emit = defineEmits([
    'update:isOpen',
    'update:modelValue',
    'close',
    'capture',
    'open-gallery',
])

const route = useRoute()
const localDemoCount = ref(0)

const fetchLocalDemoCount = async () => {
    const isDemo =
        String(route?.params?.id || '').toLowerCase().trim() === 'demo-event' ||
        (route?.path && route.path.includes('demo-event'))
    if (isDemo) {
        try {
            localDemoCount.value = await getDemoPhotosCount()
        } catch {
            localDemoCount.value = 0
        }
    }
}

const displayGalleryCount = computed(() => {
    if (typeof props.galleryCount === 'number') {
        return props.galleryCount
    }
    return localDemoCount.value
})

const isVisible = computed(() => Boolean(props.isOpen || props.modelValue))

const isQuickExperience = computed(() => {
    return String(props.captureExperience || '').toLowerCase().trim() === 'quick'
})

// Camera hardware state
const videoElement = ref(null)
const mediaStream = ref(null)
const hasCameraFeed = ref(false)
const cameraFacingMode = ref('environment') // 'environment' (back) or 'user' (selfie)

// Controls state
const flashModes = ['flash_auto', 'flash_on', 'flash_off']
const flashModeIndex = ref(0)
const flashMode = computed(() => flashModes[flashModeIndex.value])

const timerModes = [0, 3, 10]
const timerModeIndex = ref(0)
const currentTimer = computed(() => timerModes[timerModeIndex.value])
const countdownSeconds = ref(null)
let timerInterval = null

// Mode: PHOTO vs VIDEO
const activeCameraMode = ref('PHOTO')
const isFlashActive = ref(false)
const isViewfinderScaled = ref(false)

// Zoom state (0.5x, 1x, 2x + pinch zoom up to 3x)
const currentZoom = ref(1.0)
const selectedZoom = ref('1×')
const isPinching = ref(false)
let initialPinchDist = 0
let initialPinchZoom = 1.0

// Touch gestures for swipe left / right mode switching
let touchStartX = 0
let touchStartY = 0
let touchStartTime = 0

// Mouse drag fallback for desktop
let mouseStartX = 0
let isMouseDown = false

// Video recording state (Max 30s)
const MAX_RECORDING_SECONDS = 30
const isRecording = ref(false)
const recordingSeconds = ref(0)
let recordingTimer = null
let mediaRecorder = null
const recordedChunks = ref([])

// Wedding watermark computed
const weddingInitials = computed(() => props.wedding?.initials || 'K & J')
const weddingDate = computed(() => props.wedding?.dateBadge || '24.10.26')

// Formatted timer for 30s recording (e.g. 00:14)
const formattedRecordingTime = computed(() => {
    const mins = Math.floor(recordingSeconds.value / 60)
    const secs = recordingSeconds.value % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

// Progress ring stroke offset for 30s SVG circle (circumference = 2 * PI * 36 ≈ 226.2)
const recordingProgressOffset = computed(() => {
    const circumference = 226.2
    const progress = Math.min(1, recordingSeconds.value / MAX_RECORDING_SECONDS)
    return circumference * (1 - progress)
})

// Dynamic CSS transform for viewfinder (combines zoom scale, flip for selfie, and shutter scale)
const viewfinderTransform = computed(() => {
    const zoomScale = currentZoom.value <= 0.5 ? 0.85 : currentZoom.value
    const scaleFactor = (isViewfinderScaled.value ? 1.02 : 1.0) * zoomScale
    const flipX = cameraFacingMode.value === 'user' ? -1 : 1
    return {
        transform: `scale(${scaleFactor}) scaleX(${flipX})`,
        transformOrigin: 'center center',
        transition: isPinching.value ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0, 0.2, 1)',
    }
})

const fallbackTransform = computed(() => {
    const zoomScale = currentZoom.value <= 0.5 ? 0.85 : currentZoom.value
    const scaleFactor = (isViewfinderScaled.value ? 1.02 : 1.0) * zoomScale
    return {
        transform: `scale(${scaleFactor})`,
        transformOrigin: 'center center',
        transition: isPinching.value ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0, 0.2, 1)',
    }
})

// Apply hardware zoom constraint if browser and device camera support it
const applyHardwareZoom = async (zoomValue) => {
    if (!mediaStream.value) return
    const track = mediaStream.value.getVideoTracks()?.[0]
    if (!track) return
    try {
        const capabilities = track.getCapabilities ? track.getCapabilities() : {}
        if ('zoom' in capabilities) {
            const min = capabilities.zoom.min || 1
            const max = capabilities.zoom.max || 3
            const clamped = Math.min(Math.max(zoomValue, min), max)
            await track.applyConstraints({
                advanced: [{ zoom: clamped }],
            })
        }
    } catch {
        // Hardware zoom unsupported or failed; CSS digital zoom remains active
    }
}

// Set zoom level (.5x, 1x, 2x or pinch)
const setZoom = (val) => {
    const num = Math.max(0.5, Math.min(3.0, Number(val)))
    currentZoom.value = Math.round(num * 10) / 10

    if (Math.abs(currentZoom.value - 0.5) < 0.2) {
        selectedZoom.value = '.5'
    } else if (Math.abs(currentZoom.value - 1.0) < 0.25) {
        selectedZoom.value = '1×'
    } else if (Math.abs(currentZoom.value - 2.0) < 0.3) {
        selectedZoom.value = '2'
    } else {
        selectedZoom.value = `${currentZoom.value.toFixed(1)}×`
    }

    applyHardwareZoom(currentZoom.value)
}

// Switch between PHOTO and VIDEO modes
const switchCameraMode = (mode) => {
    if (isRecording.value) return // Prevent switching mode mid-recording
    activeCameraMode.value = mode
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15)
    }
}

// Start camera stream (requests audio if in video mode for sound recording)
const startCameraStream = async () => {
    hasCameraFeed.value = false
    stopCameraStream()
    try {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
            let stream = null
            // Attempt video + audio if in VIDEO mode
            if (activeCameraMode.value === 'VIDEO') {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: cameraFacingMode.value,
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                        },
                        audio: true,
                    })
                } catch {
                    // Audio denied/unavailable; fallback to video only
                }
            }
            if (!stream) {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: cameraFacingMode.value,
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    },
                    audio: false,
                })
            }
            mediaStream.value = stream
            hasCameraFeed.value = true
            await nextTick()
            if (videoElement.value) {
                videoElement.value.srcObject = stream
                await videoElement.value.play().catch(() => { })
            }
            applyHardwareZoom(currentZoom.value)
        }
    } catch (err) {
        console.warn('[Camera] Live camera stream not available on current device (falling back to reception viewfinder):', err)
        hasCameraFeed.value = false
    }
}

// Stop camera video stream
const stopCameraStream = () => {
    if (mediaStream.value) {
        mediaStream.value.getTracks().forEach((track) => track.stop())
        mediaStream.value = null
    }
    hasCameraFeed.value = false
}

// Flip camera facing mode
const flipCamera = async () => {
    if (isRecording.value) return
    cameraFacingMode.value = cameraFacingMode.value === 'environment' ? 'user' : 'environment'
    await startCameraStream()
}

// Toggle flash mode
const toggleFlash = () => {
    flashModeIndex.value = (flashModeIndex.value + 1) % flashModes.length
}

// Toggle timer mode
const toggleTimer = () => {
    if (isRecording.value) return
    timerModeIndex.value = (timerModeIndex.value + 1) % timerModes.length
}

// Execute single photo capture
const executeCapture = async () => {
    isFlashActive.value = true
    isViewfinderScaled.value = true

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 20, 50])
    }

    let capturedUrl =
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAtugc2oDwyayarlJO8IfY0KvJE1t-Txs0OEHZIUXi0H29kBMKoVaHtrvXCg_u6ZTSk4htGJYBiWIv9oXQHWmHhBObhhwNp8IiGEZFLrWIjQAN6Dbjg4lq2CknxKewu2RidFIQaLD83ZtDjl8GOmewe9pBnqX_XoFRUNj0nEFWV3atRIeQroa2FQ44na1TzF-KDKTxmI_e-FdlJla9GpGDqzMj7G52Y8JjxXo1RK5-WSqdqhEhPAd7w'

    let capturedBlob = null

    // Capture real frame from video element with digital zoom cropping if zoomed in
    if (hasCameraFeed.value && videoElement.value) {
        try {
            const canvas = document.createElement('canvas')
            const vWidth = videoElement.value.videoWidth || 1080
            const vHeight = videoElement.value.videoHeight || 1920
            canvas.width = vWidth
            canvas.height = vHeight
            const ctx = canvas.getContext('2d')

            if (cameraFacingMode.value === 'user') {
                ctx.translate(canvas.width, 0)
                ctx.scale(-1, 1)
            }

            // Apply digital zoom crop if zoom > 1
            if (currentZoom.value > 1.0) {
                const z = currentZoom.value
                const sWidth = vWidth / z
                const sHeight = vHeight / z
                const sx = (vWidth - sWidth) / 2
                const sy = (vHeight - sHeight) / 2
                ctx.drawImage(videoElement.value, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height)
            } else {
                ctx.drawImage(videoElement.value, 0, 0, canvas.width, canvas.height)
            }

            capturedUrl = canvas.toDataURL('image/jpeg', 0.85)
            capturedBlob = await new Promise((resolve) => {
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
            })
        } catch (err) {
            console.warn('[Camera] Failed to capture canvas frame:', err)
        }
    }

    setTimeout(() => {
        isFlashActive.value = false
        isViewfinderScaled.value = false
    }, 120)

    emit('capture', {
        type: 'photo',
        isVideo: false,
        dataUrl: capturedUrl,
        blob: capturedBlob,
        moment: props.activeMoment,
    })
}

// Fallback frame renderer if camera feed is not supported on environment
const drawFallbackFrame = (ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#0f172a')
    gradient.addColorStop(0.5, '#1e40af')
    gradient.addColorStop(1, '#1e3a8a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 50px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${weddingInitials.value} • ${weddingDate.value}`, width / 2, height / 2 - 40)
    ctx.font = '32px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.fillText('VIDEO CAPTURE • ' + new Date().toLocaleTimeString(), width / 2, height / 2 + 30)
}

// Fallback simulated video blob if MediaRecorder has no stream
const generateFallbackVideoBlob = async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 720
    canvas.height = 1280
    const ctx = canvas.getContext('2d')
    drawFallbackFrame(ctx, 720, 1280)

    if (typeof canvas.captureStream === 'function' && typeof MediaRecorder !== 'undefined') {
        try {
            const stream = canvas.captureStream(25)
            const chunks = []
            const recorder = new MediaRecorder(stream)
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunks.push(e.data)
            }
            recorder.start()
            for (let i = 0; i < 5; i++) {
                drawFallbackFrame(ctx, 720, 1280)
                await new Promise((r) => setTimeout(r, 60))
            }
            recorder.stop()
            await new Promise((r) => { recorder.onstop = r })
            return new Blob(chunks, { type: 'video/mp4' })
        } catch {
            // fallback below
        }
    }
    return new Blob(['fake_video_stream'], { type: 'video/mp4' })
}

// Start video recording
const startVideoRecording = async () => {
    if (isRecording.value) return
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 30, 40])
    }

    recordedChunks.value = []
    recordingSeconds.value = 0
    isRecording.value = true

    // Start 30s countdown / countup timer
    recordingTimer = setInterval(() => {
        recordingSeconds.value += 1
        if (recordingSeconds.value >= MAX_RECORDING_SECONDS) {
            stopVideoRecording()
        }
    }, 1000)

    // Setup MediaRecorder
    try {
        let streamToRecord = mediaStream.value
        if (!streamToRecord && videoElement.value && typeof videoElement.value.captureStream === 'function') {
            streamToRecord = videoElement.value.captureStream(30)
        }

        if (streamToRecord && typeof MediaRecorder !== 'undefined') {
            let mimeType = ''
            if (MediaRecorder.isTypeSupported('video/mp4')) {
                mimeType = 'video/mp4'
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
                mimeType = 'video/webm;codecs=vp8,opus'
            } else if (MediaRecorder.isTypeSupported('video/webm')) {
                mimeType = 'video/webm'
            }

            mediaRecorder = new MediaRecorder(streamToRecord, mimeType ? { mimeType } : undefined)
            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    recordedChunks.value.push(e.data)
                }
            }
            mediaRecorder.start(250)
        }
    } catch (err) {
        console.warn('[Camera] Failed to initialize MediaRecorder stream:', err)
    }
}

// Stop video recording (pauses/finishes and prepares upload payload)
const stopVideoRecording = async () => {
    if (!isRecording.value) return
    isRecording.value = false

    if (recordingTimer) {
        clearInterval(recordingTimer)
        recordingTimer = null
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(60)
    }

    // Capture thumbnail image from current video frame
    let thumbnailDataUrl = ''
    try {
        const canvas = document.createElement('canvas')
        const vWidth = videoElement.value?.videoWidth || 1080
        const vHeight = videoElement.value?.videoHeight || 1920
        canvas.width = vWidth
        canvas.height = vHeight
        const ctx = canvas.getContext('2d')
        if (hasCameraFeed.value && videoElement.value) {
            if (cameraFacingMode.value === 'user') {
                ctx.translate(canvas.width, 0)
                ctx.scale(-1, 1)
            }
            if (currentZoom.value > 1.0) {
                const z = currentZoom.value
                const sWidth = vWidth / z
                const sHeight = vHeight / z
                const sx = (vWidth - sWidth) / 2
                const sy = (vHeight - sHeight) / 2
                ctx.drawImage(videoElement.value, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height)
            } else {
                ctx.drawImage(videoElement.value, 0, 0, canvas.width, canvas.height)
            }
        } else {
            drawFallbackFrame(ctx, canvas.width, canvas.height)
        }
        thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.85)
    } catch (err) {
        console.warn('[Camera] Failed to generate video thumbnail frame:', err)
    }

    if (!thumbnailDataUrl) {
        try {
            const canvas = document.createElement('canvas')
            canvas.width = 720
            canvas.height = 1280
            const ctx = canvas.getContext('2d')
            drawFallbackFrame(ctx, 720, 1280)
            thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.85)
        } catch {
            // ignore
        }
    }

    const duration = Math.max(1, recordingSeconds.value)
    recordingSeconds.value = 0

    const finalizeAndEmit = (blob, mime) => {
        const safeMime = mime || 'video/mp4'
        const ext = safeMime.includes('webm') ? 'webm' : 'mp4'
        const fileName = `video_${Date.now()}.${ext}`
        const videoUrl = blob ? URL.createObjectURL(blob) : thumbnailDataUrl

        emit('capture', {
            type: 'video',
            isVideo: true,
            dataUrl: thumbnailDataUrl,
            videoUrl: videoUrl,
            blob: blob,
            duration: duration,
            moment: props.activeMoment,
            fileName: fileName,
            mimeType: safeMime,
        })
    }

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.onstop = () => {
            const mimeType = mediaRecorder.mimeType || 'video/webm'
            const blob = new Blob(recordedChunks.value, { type: mimeType })
            finalizeAndEmit(blob, mimeType)
        }
        try {
            mediaRecorder.stop()
        } catch {
            finalizeAndEmit(new Blob(recordedChunks.value, { type: 'video/webm' }), 'video/webm')
        }
    } else {
        const fallbackBlob = await generateFallbackVideoBlob()
        finalizeAndEmit(fallbackBlob, 'video/mp4')
    }
}

// Trigger shutter button:
// - PHOTO mode: triggers photo shutter
// - VIDEO mode: starts recording if idle; if recording, pauses/stops recording and uploads!
const triggerShutter = () => {
    if (activeCameraMode.value === 'PHOTO') {
        if (countdownSeconds.value !== null) return

        if (currentTimer.value > 0) {
            countdownSeconds.value = currentTimer.value
            timerInterval = setInterval(() => {
                if (countdownSeconds.value > 1) {
                    countdownSeconds.value -= 1
                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                        navigator.vibrate(20)
                    }
                } else {
                    clearInterval(timerInterval)
                    timerInterval = null
                    countdownSeconds.value = null
                    executeCapture()
                }
            }, 1000)
        } else {
            executeCapture()
        }
    } else {
        // VIDEO MODE
        if (isRecording.value) {
            // "when 30 seconds not hit and the user press the capture button, it will pause the recording and it will also upload"
            stopVideoRecording()
        } else {
            if (currentTimer.value > 0 && countdownSeconds.value === null) {
                countdownSeconds.value = currentTimer.value
                timerInterval = setInterval(() => {
                    if (countdownSeconds.value > 1) {
                        countdownSeconds.value -= 1
                        if (typeof navigator !== 'undefined' && navigator.vibrate) {
                            navigator.vibrate(20)
                        }
                    } else {
                        clearInterval(timerInterval)
                        timerInterval = null
                        countdownSeconds.value = null
                        startVideoRecording()
                    }
                }, 1000)
            } else {
                startVideoRecording()
            }
        }
    }
}

// Open gallery picker
const openGallery = () => {
    if (!isRecording.value) {
        emit('open-gallery')
    }
}

// Close camera
const handleClose = () => {
    if (isRecording.value) {
        stopVideoRecording()
    }
    if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
    }
    countdownSeconds.value = null
    stopCameraStream()
    emit('update:isOpen', false)
    emit('update:modelValue', false)
    emit('close')
}

// ============================================================================
// TOUCH GESTURES: Pinch to Zoom & Swipe between PHOTO and VIDEO modes
// ============================================================================
const onTouchStart = (e) => {
    if (e.touches.length === 2) {
        // 2 fingers = Pinch to zoom
        isPinching.value = true
        initialPinchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
        )
        initialPinchZoom = currentZoom.value
    } else if (e.touches.length === 1) {
        // 1 finger = Horizontal swipe to switch modes
        touchStartX = e.touches[0].clientX
        touchStartY = e.touches[0].clientY
        touchStartTime = Date.now()
    }
}

const onTouchMove = (e) => {
    if (isPinching.value && e.touches.length === 2) {
        const currentDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
        )
        if (initialPinchDist > 0) {
            const scale = currentDist / initialPinchDist
            const targetZoom = initialPinchZoom * scale
            setZoom(targetZoom)
        }
    }
}

const onTouchEnd = (e) => {
    if (isPinching.value) {
        if (e.touches.length < 2) {
            isPinching.value = false
        }
        return
    }

    if (isRecording.value) return // Don't switch mode while recording

    if (!e.changedTouches || e.changedTouches.length === 0) return
    const deltaX = e.changedTouches[0].clientX - touchStartX
    const deltaY = e.changedTouches[0].clientY - touchStartY
    const elapsed = Date.now() - touchStartTime

    // Horizontal swipe threshold (> 40px horizontal, distinctly horizontal, under 800ms)
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && elapsed < 800) {
        if (deltaX < 0) {
            // Swipe Left -> Switch to VIDEO mode
            if (activeCameraMode.value === 'PHOTO') {
                switchCameraMode('VIDEO')
            }
        } else {
            // Swipe Right -> Switch to PHOTO mode
            if (activeCameraMode.value === 'VIDEO') {
                switchCameraMode('PHOTO')
            }
        }
    }
}

// Desktop mouse swipe simulation
const onMouseDown = (e) => {
    isMouseDown = true
    mouseStartX = e.clientX
}

const onMouseUp = (e) => {
    if (!isMouseDown) return
    isMouseDown = false
    if (isRecording.value) return
    const deltaX = e.clientX - mouseStartX
    if (deltaX < -50) {
        if (activeCameraMode.value === 'PHOTO') switchCameraMode('VIDEO')
    } else if (deltaX > 50) {
        if (activeCameraMode.value === 'VIDEO') switchCameraMode('PHOTO')
    }
}

// Watch visibility
watch(
    isVisible,
    (val) => {
        if (val) {
            fetchLocalDemoCount()
            nextTick(() => {
                startCameraStream()
            })
        } else {
            if (isRecording.value) {
                stopVideoRecording()
            }
            stopCameraStream()
            if (timerInterval) {
                clearInterval(timerInterval)
                timerInterval = null
            }
            countdownSeconds.value = null
        }
    },
    { immediate: true },
)

onBeforeUnmount(() => {
    if (isRecording.value) {
        stopVideoRecording()
    }
    stopCameraStream()
    if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
    }
})
</script>

<template>
    <teleport to="body">
        <div v-if="isVisible" class="camera-modal">
            <!-- Live Camera Viewfinder Layer with touch swipe & pinch handlers -->
            <div class="camera-viewfinder-layer"
                @touchstart="onTouchStart"
                @touchmove="onTouchMove"
                @touchend="onTouchEnd"
                @touchcancel="onTouchEnd"
                @mousedown="onMouseDown"
                @mouseup="onMouseUp">

                <!-- Real HTML5 Video Camera Stream Layer -->
                <video v-show="hasCameraFeed" ref="videoElement" autoplay playsinline muted class="camera-stream-video"
                    :style="viewfinderTransform"></video>

                <!-- Background Frame Fallback: Wedding Reception Viewfinder -->
                <div v-show="!hasCameraFeed" id="cameraFeed" class="camera-stream-fallback"
                    :style="fallbackTransform"
                    style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuA-EbfHxr0P6GL_iucEctw5mslqfrga9bIbAjvrYlYwBOFkBiHyF3G79f3rP3hPZ14Za8yR7ORgzGVH1-rH8hKNANpgBe0B_f6wTVwkC3rMXsMrciWu08_cZFAdCJcQSz-A_UgWcaqR-QYT5CetkjIIxOZstdE0fsfDrnaQnU6n_S0TnVpmSrApRCTJvyjK2M2bFkBeqFMhugW9d8ULHxxHe-Z3NBgKKypAgRK-MyDRMblqZDIgWr8i');">
                    <div class="camera-vignette-scrim"></div>
                    <div class="camera-radial-scrim"></div>
                </div>

                <!-- Live Golden Flash Ripple Overlay -->
                <div id="shutterFlash" class="camera-shutter-flash"
                    :class="isFlashActive ? 'is-active' : 'is-inactive'"></div>

                <!-- Timer Countdown Overlay -->
                <div v-if="countdownSeconds !== null" class="camera-timer-countdown">
                    <span>{{ countdownSeconds }}</span>
                </div>

                <!-- TOP HUD BAR -->
                <header class="camera-top-hud">
                    <div class="camera-top-controls">
                        <!-- Close Pill -->
                        <button aria-label="Return to Wedding Checklist" class="camera-hud-btn" type="button"
                            @click="handleClose">
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
                                {{
                                    currentTimer === 3
                                        ? 'timer_3'
                                        : currentTimer === 10
                                            ? 'timer_10'
                                            : 'timer_off'
                                }}
                            </span>
                        </button>
                    </div>

                    <!-- Live Video Recording HUD Pill with Blinking Dot and Max 30s Counter -->
                    <div v-if="isRecording" class="camera-recording-hud">
                        <span class="camera-recording-dot"></span>
                        <span class="camera-recording-time">REC {{ formattedRecordingTime }} / 00:30</span>
                    </div>

                    <!-- Moment Mission Banner -->
                    <div class="camera-mission-banner">
                        <div class="camera-mission-pill">
                            <span class="camera-pulse-beacon">
                                <span class="camera-pulse-ring"></span>
                                <span class="camera-pulse-core"></span>
                            </span>
                            <h1 class="camera-mission-title">
                                {{
                                    activeMoment
                                        ? (activeMoment.number ? `MOMENT ${activeMoment.number} • ` : '') +
                                        (activeMoment.title || '').toUpperCase()
                                        : (activeCameraMode === 'VIDEO' ? 'CINEMATIC VIDEO' : "COUPLE'S FIRST DANCE")
                                }}
                            </h1>
                        </div>
                        <p class="camera-mission-desc">
                            {{
                                isRecording
                                    ? 'Recording (Max 30s) • Tap capture or stop to finish'
                                    : (activeMoment
                                        ? activeMoment.description
                                        : (activeCameraMode === 'VIDEO'
                                            ? 'Record up to 30s video moment for the wedding vault'
                                            : 'Capture their magical spin under chandeliers'))
                            }}
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
                            <span class="camera-seal-initials">{{ weddingInitials }}</span>
                            <span class="camera-seal-date">• {{ weddingDate }}</span>
                        </div>
                    </div>
                </div>

                <!-- BOTTOM CAMERA COCKPIT -->
                <footer class="camera-bottom-cockpit">
                    <!-- Lens Zoom Switcher: .5x, 1x, 2x (plus Pinch-to-Zoom feedback) -->
                    <div class="camera-zoom-row">
                        <button class="camera-zoom-btn" :class="{ 'is-active': selectedZoom === '.5' || currentZoom === 0.5 }" type="button"
                            @click="setZoom(0.5)">
                            .5x
                        </button>
                        <button class="camera-zoom-btn" :class="{ 'is-active': selectedZoom === '1×' || currentZoom === 1.0 }" type="button"
                            @click="setZoom(1.0)">
                            1x
                        </button>
                        <button class="camera-zoom-btn" :class="{ 'is-active': selectedZoom === '2' || currentZoom === 2.0 }" type="button"
                            @click="setZoom(2.0)">
                            2x
                        </button>
                    </div>

                    <!-- Mode Dial (PHOTO / VIDEO with swipe support) -->
                    <div class="camera-mode-dial">
                        <span class="camera-mode-item"
                            :class="activeCameraMode === 'PHOTO' ? 'is-active' : 'is-inactive'"
                            @click="switchCameraMode('PHOTO')">
                            PHOTO
                            <span v-if="activeCameraMode === 'PHOTO'" class="camera-mode-dot"></span>
                        </span>
                        <span class="camera-mode-item"
                            :class="activeCameraMode === 'VIDEO' ? 'is-active' : 'is-inactive'"
                            @click="switchCameraMode('VIDEO')">
                            VIDEO
                            <span v-if="activeCameraMode === 'VIDEO'" class="camera-mode-dot"></span>
                        </span>
                    </div>

                    <!-- Shutter Row & Triggers -->
                    <div class="camera-controls-row">
                        <!-- Flip Camera -->
                        <button id="lensFlipBtn" aria-label="Switch Camera Lens" class="camera-flip-btn" type="button"
                            :disabled="isRecording"
                            @click="flipCamera">
                            <span class="material-symbols-outlined">flip_camera_ios</span>
                        </button>

                        <!-- Circular Shutter Button Wrapper -->
                        <div class="camera-shutter-wrap">
                            <!-- Circular SVG progress ring from snippet when capturing video -->
                            <svg v-if="activeCameraMode === 'VIDEO' && isRecording"
                                class="video-recording-svg"
                                height="86"
                                viewBox="0 0 100 100"
                                width="86">
                                <circle cx="50" cy="50" fill="none" r="42" stroke="rgba(255, 255, 255, 0.2)" stroke-width="4" />
                                <circle class="video-recording-ring" cx="50" cy="50" fill="none" r="42" stroke="#ef4444" stroke-linecap="round" stroke-width="4" />
                            </svg>

                            <button id="shutterBtn"
                                :aria-label="activeCameraMode === 'VIDEO' ? (isRecording ? 'Stop Recording' : 'Start Video Recording') : 'Take Wedding Photo'"
                                class="camera-shutter-btn"
                                :class="{
                                    'is-video-mode': activeCameraMode === 'VIDEO',
                                    'is-recording': isRecording,
                                }"
                                type="button"
                                @click="triggerShutter">
                                <span class="camera-shutter-core" :class="{
                                    'core-video': activeCameraMode === 'VIDEO' && !isRecording,
                                    'core-recording': isRecording,
                                }">
                                    <span v-if="!isRecording" class="camera-shutter-ring"></span>
                                </span>
                            </button>
                        </div>

                        <!-- Gallery Picker Preview (Hidden when recording, and hidden when captureExperience === 'quick') -->
                        <button v-if="!isRecording && !isQuickExperience" aria-label="View QRchive Reception Gallery" class="camera-gallery-btn" type="button"
                            @click="openGallery">
                            <div class="camera-gallery-frame">
                                <img alt="Recent candid guest moment" class="camera-gallery-img" :src="galleryImage" />
                                <div class="camera-gallery-badge">
                                    {{ displayGalleryCount }}
                                </div>
                            </div>
                            <span class="camera-gallery-label">Gallery</span>
                        </button>

                        <!-- Stop Button (Replaces Gallery button when recording) -->
                        <button v-else-if="isRecording" aria-label="Stop Video Recording" class="camera-stop-btn" type="button"
                            @click="stopVideoRecording">
                            <div class="camera-stop-frame">
                                <span class="material-symbols-outlined camera-stop-icon">stop</span>
                            </div>
                            <span class="camera-stop-label">Stop</span>
                        </button>

                        <!-- Invisible spacer when gallery button is hidden to keep shutter button centered -->
                        <div v-else class="camera-gallery-spacer" aria-hidden="true"></div>
                    </div>

                    <!-- Home Indicator Safe Area Pill -->
                    <div class="camera-home-indicator"></div>
                </footer>
            </div>
        </div>
    </teleport>
</template>

<style scoped>
.camera-timer-countdown {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 6rem;
    font-weight: 800;
    color: #ffffff;
    text-shadow: 0 4px 24px rgba(0, 0, 0, 0.75);
    z-index: 25;
    pointer-events: none;
    animation: countdownPulse 1s ease-in-out infinite;
}

@keyframes countdownPulse {
    0% {
        transform: translate(-50%, -50%) scale(1.2);
        opacity: 1;
    }

    50% {
        transform: translate(-50%, -50%) scale(0.95);
        opacity: 0.85;
    }

    100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
    }
}

/* Shutter Container and Video Recording Ring */
.camera-shutter-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 86px;
    height: 86px;
    flex-shrink: 0;
}

@keyframes videoProgress {
    from {
        stroke-dashoffset: 264;
    }
    to {
        stroke-dashoffset: 0;
    }
}

.video-recording-svg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 10;
    width: 86px;
    height: 86px;
}

.video-recording-ring {
    stroke-dasharray: 264;
    stroke-dashoffset: 264;
    animation: videoProgress 30s linear infinite;
    transform: rotate(-90deg);
    transform-origin: 50% 50%;
}

.camera-shutter-btn.is-recording {
    position: relative;
    z-index: 20;
    width: 68px !important;
    height: 68px !important;
    min-width: 68px !important;
    min-height: 68px !important;
    border: 3.5px solid rgba(255, 255, 255, 0.95) !important;
    border-radius: 50% !important;
    aspect-ratio: 1 / 1;
    padding: 0 !important;
    background: rgba(0, 0, 0, 0.3) !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
    transition: all 0.2s ease;
    animation: none !important;
}

.camera-shutter-btn.is-recording:active {
    transform: scale(0.95);
}

.camera-shutter-btn.is-recording .camera-shutter-core.core-recording {
    width: 32px !important;
    height: 32px !important;
    background-color: #ef4444 !important;
    border-radius: 6px !important;
    box-shadow: none !important;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    transition: transform 0.2s ease;
}

.camera-shutter-btn.is-recording:active .camera-shutter-core.core-recording {
    transform: scale(0.9);
}

.camera-gallery-spacer {
    width: 3rem;
    height: 3rem;
    visibility: hidden;
    pointer-events: none;
}
</style>
