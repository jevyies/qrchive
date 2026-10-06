<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { axiosInstance } from '@/plugins/axios'
import { useToast } from '@/composables/useToast'
import JBtn from '@/@core/components/JBtn.vue'

const props = defineProps({
  eventCode: {
    type: String,
    required: true,
  },
  eventData: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['saved'])

const toast = useToast()

// Screen Mode: 'mobile' | 'desktop'
const activeScreen = ref('mobile')

// Change tracking - button is ONLY displayed when hasChanges === true
const hasChanges = ref(false)
const isSaving = ref(false)
const isLoading = ref(false)

// 1 Picture for all viewports (Single Original Picture State)
const fileInput = ref(null)
const originalUrl = ref('')
const originalDataUrl = ref('')
const fileName = ref('background.jpg')
const imgNatural = reactive({ width: 0, height: 0 })

// Mobile Screen Framing State (9:16)
const mobileCroppedUrl = ref('')
const mobilePos = reactive({
  x: 0,
  y: 0,
  scale: 1.0,
})

// Desktop Screen Framing State (16:9)
const desktopCroppedUrl = ref('')
const desktopPos = reactive({
  x: 0,
  y: 0,
  scale: 1.0,
})

// Viewport container dimensions (fixed CSS sizes for the interactive editor)
const MOBILE_VIEWPORT = { width: 320, height: 568 } // 9:16 aspect ratio
const DESKTOP_VIEWPORT = { width: 560, height: 315 } // 16:9 aspect ratio

// DOM Refs
const stageContainerRef = ref(null)
const viewportFrameRef = ref(null)
const stageScale = ref(1)

// Dragging & Resizing interaction state
const isDragging = ref(false)
const dragStart = reactive({ x: 0, y: 0 })
const startPos = reactive({ x: 0, y: 0 })

const isResizing = ref(false)
const resizeState = reactive({
  corner: '',
  startX: 0,
  startY: 0,
  startScale: 1.0,
  cx: 0,
  cy: 0,
  initialDist: 1,
})

// Touch pinch state
const pinchStart = reactive({
  dist: 0,
  scale: 1.0,
})

// Active screen helpers
const currentPos = computed(() => {
  return activeScreen.value === 'mobile' ? mobilePos : desktopPos
})

const currentOriginalImage = computed(() => {
  return originalDataUrl.value || originalUrl.value
})

const currentViewport = computed(() => {
  return activeScreen.value === 'mobile' ? MOBILE_VIEWPORT : DESKTOP_VIEWPORT
})

const currentNatural = computed(() => {
  return imgNatural
})

// Compute responsive stage scaling for narrow mobile phone screens
const updateStageScale = () => {
  if (!stageContainerRef.value) return
  const availableWidth = stageContainerRef.value.clientWidth - 24
  const targetWidth = currentViewport.value.width
  if (availableWidth < targetWidth && availableWidth > 0) {
    stageScale.value = Math.min(1, Number((availableWidth / targetWidth).toFixed(3)))
  } else {
    stageScale.value = 1
  }
}

watch(activeScreen, () => {
  setTimeout(updateStageScale, 50)
})

// Preload original image natural dimensions
const preloadImage = (url) => {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    imgNatural.width = img.naturalWidth
    imgNatural.height = img.naturalHeight
  }
  img.src = url
}

// Load existing backgrounds from backend
const fetchBackgrounds = async () => {
  isLoading.value = true
  const eventId = props.eventData?.id || props.eventCode

  try {
    const { data } = await axiosInstance.get(`/api/events/${eventId}/backgrounds`)
    const list = data?.backgrounds || []

    // 1. Original Picture (prefer 'original', fallback to legacy 'mobile_original' or 'desktop_original')
    const orig = list.find((b) => b.type === 'original')
      || list.find((b) => b.type === 'mobile_original')
      || list.find((b) => b.type === 'desktop_original')

    if (orig?.url) {
      originalUrl.value = orig.url
      originalDataUrl.value = ''
      fileName.value = orig.fileName || 'background.jpg'
      preloadImage(orig.url)
    }

    // 2. Mobile Cropped
    const mobCrop = list.find((b) => b.type === 'mobile_cropped')
    if (mobCrop?.url) {
      mobileCroppedUrl.value = mobCrop.url
    }
    if (mobCrop?.cropData && typeof mobCrop.cropData === 'object') {
      mobilePos.x = Number(mobCrop.cropData.x) || 0
      mobilePos.y = Number(mobCrop.cropData.y) || 0
      mobilePos.scale = Number(mobCrop.cropData.scale) || 1.0
    }

    // 3. Desktop Cropped
    const deskCrop = list.find((b) => b.type === 'desktop_cropped')
    if (deskCrop?.url) {
      desktopCroppedUrl.value = deskCrop.url
    }
    if (deskCrop?.cropData && typeof deskCrop.cropData === 'object') {
      desktopPos.x = Number(deskCrop.cropData.x) || 0
      desktopPos.y = Number(deskCrop.cropData.y) || 0
      desktopPos.scale = Number(deskCrop.cropData.scale) || 1.0
    }

    // Changes start at false
    hasChanges.value = false
  } catch (err) {
    console.warn('[EventBackgroundSubtab] Fetch error:', err)
  } finally {
    isLoading.value = false
  }
}

// Handle File Selection: 1 picture for all viewports
const handleFileSelect = (e) => {
  const file = e.target?.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    const dataUrl = event.target.result

    const img = new Image()
    img.onload = () => {
      originalDataUrl.value = dataUrl
      fileName.value = file.name
      imgNatural.width = img.naturalWidth
      imgNatural.height = img.naturalHeight

      // Reset positions for both viewports for the new image
      mobilePos.x = 0
      mobilePos.y = 0
      mobilePos.scale = 1.0

      desktopPos.x = 0
      desktopPos.y = 0
      desktopPos.scale = 1.0

      hasChanges.value = true
    }
    img.src = dataUrl
  }
  reader.readAsDataURL(file)
}

// Trigger single file input
const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

// Drag & Pan handlers
const onMouseDown = (e) => {
  if (!currentOriginalImage.value) return
  if (isResizing.value) return
  isDragging.value = true
  dragStart.x = e.clientX
  dragStart.y = e.clientY
  startPos.x = currentPos.value.x
  startPos.y = currentPos.value.y
}

// Touch support for mobile devices
const onTouchStart = (e) => {
  if (!currentOriginalImage.value) return
  if (isResizing.value) return

  if (e.touches.length === 2) {
    // 2-finger pinch gesture to resize
    isDragging.value = false
    pinchStart.dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    )
    pinchStart.scale = currentPos.value.scale
  } else if (e.touches.length === 1) {
    isDragging.value = true
    dragStart.x = e.touches[0].clientX
    dragStart.y = e.touches[0].clientY
    startPos.x = currentPos.value.x
    startPos.y = currentPos.value.y
  }
}

// Corner Resize Handlers
const onCornerMouseDown = (e, corner) => {
  e.preventDefault()
  e.stopPropagation()
  isResizing.value = true
  resizeState.corner = corner
  resizeState.startX = e.clientX
  resizeState.startY = e.clientY
  resizeState.startScale = currentPos.value.scale

  const viewport = currentViewport.value
  resizeState.cx = viewport.width / 2 + currentPos.value.x
  resizeState.cy = viewport.height / 2 + currentPos.value.y

  const frameRect = viewportFrameRef.value?.getBoundingClientRect()
  if (frameRect) {
    const scaleFactor = stageScale.value || 1
    const centerScreenX = frameRect.left + resizeState.cx * scaleFactor
    const centerScreenY = frameRect.top + resizeState.cy * scaleFactor
    resizeState.initialDist = Math.hypot(e.clientX - centerScreenX, e.clientY - centerScreenY) || 1
  }
}

const onCornerTouchStart = (e, corner) => {
  if (!e.touches[0]) return
  e.stopPropagation()
  isResizing.value = true
  resizeState.corner = corner
  resizeState.startX = e.touches[0].clientX
  resizeState.startY = e.touches[0].clientY
  resizeState.startScale = currentPos.value.scale

  const viewport = currentViewport.value
  resizeState.cx = viewport.width / 2 + currentPos.value.x
  resizeState.cy = viewport.height / 2 + currentPos.value.y

  const frameRect = viewportFrameRef.value?.getBoundingClientRect()
  if (frameRect) {
    const scaleFactor = stageScale.value || 1
    const centerScreenX = frameRect.left + resizeState.cx * scaleFactor
    const centerScreenY = frameRect.top + resizeState.cy * scaleFactor
    resizeState.initialDist = Math.hypot(e.touches[0].clientX - centerScreenX, e.touches[0].clientY - centerScreenY) || 1
  }
}

const handleResizeMove = (clientX, clientY) => {
  if (!isResizing.value) return
  const frameRect = viewportFrameRef.value?.getBoundingClientRect()
  if (!frameRect) return

  const scaleFactor = stageScale.value || 1
  const centerScreenX = frameRect.left + resizeState.cx * scaleFactor
  const centerScreenY = frameRect.top + resizeState.cy * scaleFactor
  const currentDist = Math.hypot(clientX - centerScreenX, clientY - centerScreenY)
  const ratio = currentDist / (resizeState.initialDist || 1)
  const newScale = Math.min(Math.max(resizeState.startScale * ratio, 0.1), 4.0)
  currentPos.value.scale = Number(newScale.toFixed(2))
  hasChanges.value = true
}

// Global Mouse & Touch Listeners for smooth continuous dragging & resizing
const onGlobalMouseMove = (e) => {
  if (isResizing.value) {
    handleResizeMove(e.clientX, e.clientY)
  } else if (isDragging.value) {
    const scaleFactor = stageScale.value || 1
    const dx = (e.clientX - dragStart.x) / scaleFactor
    const dy = (e.clientY - dragStart.y) / scaleFactor
    currentPos.value.x = startPos.x + dx
    currentPos.value.y = startPos.y + dy
    hasChanges.value = true
  }
}

const onGlobalMouseUp = () => {
  isDragging.value = false
  isResizing.value = false
}

const onGlobalTouchMove = (e) => {
  if (e.touches.length === 2 && pinchStart.dist > 0) {
    const currentDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    )
    const factor = currentDist / pinchStart.dist
    const newScale = Math.min(Math.max(pinchStart.scale * factor, 0.1), 4.0)
    currentPos.value.scale = Number(newScale.toFixed(2))
    hasChanges.value = true
    if (e.cancelable) e.preventDefault()
  } else if (e.touches.length === 1) {
    if (isResizing.value) {
      handleResizeMove(e.touches[0].clientX, e.touches[0].clientY)
      if (e.cancelable) e.preventDefault()
    } else if (isDragging.value) {
      const scaleFactor = stageScale.value || 1
      const dx = (e.touches[0].clientX - dragStart.x) / scaleFactor
      const dy = (e.touches[0].clientY - dragStart.y) / scaleFactor
      currentPos.value.x = startPos.x + dx
      currentPos.value.y = startPos.y + dy
      hasChanges.value = true
      if (e.cancelable) e.preventDefault()
    }
  }
}

const onGlobalTouchEnd = () => {
  isDragging.value = false
  isResizing.value = false
  pinchStart.dist = 0
}

// Wheel zoom
const onWheel = (e) => {
  if (!currentOriginalImage.value) return
  const delta = e.deltaY < 0 ? 0.05 : -0.05
  const newScale = Math.min(Math.max(currentPos.value.scale + delta, 0.1), 4.0)
  currentPos.value.scale = Number(newScale.toFixed(2))
  hasChanges.value = true
}

// Zoom controls
const updateZoom = (val) => {
  currentPos.value.scale = Number(val)
  hasChanges.value = true
}

const stepZoom = (delta) => {
  const newScale = Math.min(Math.max(currentPos.value.scale + delta, 0.1), 4.0)
  currentPos.value.scale = Number(newScale.toFixed(2))
  hasChanges.value = true
}

// Preset Sizing Controls
const setFit = () => {
  currentPos.value.scale = 1.0
  currentPos.value.x = 0
  currentPos.value.y = 0
  hasChanges.value = true
}

const setFill = () => {
  const natural = currentNatural.value
  const viewport = currentViewport.value
  if (!natural.width || !natural.height) return

  const fitScale = Math.min(viewport.width / natural.width, viewport.height / natural.height)
  const baseW = natural.width * fitScale
  const baseH = natural.height * fitScale

  const coverScale = Math.max(viewport.width / baseW, viewport.height / baseH)
  currentPos.value.x = 0
  currentPos.value.y = 0
  currentPos.value.scale = Number(coverScale.toFixed(2))
  hasChanges.value = true
}

const setOriginal = () => {
  const natural = currentNatural.value
  const viewport = currentViewport.value
  if (!natural.width || !natural.height) return

  const fitScale = Math.min(viewport.width / natural.width, viewport.height / natural.height)
  const oneToOneScale = 1 / fitScale
  currentPos.value.x = 0
  currentPos.value.y = 0
  currentPos.value.scale = Number(Math.min(Math.max(oneToOneScale, 0.1), 4.0).toFixed(2))
  hasChanges.value = true
}

const resetPosition = () => {
  currentPos.value.x = 0
  currentPos.value.y = 0
  currentPos.value.scale = 1.0
  hasChanges.value = true
}

// Compute image render dimensions inside container preserving natural aspect ratio
const getImageStyle = (screen) => {
  const pos = screen === 'mobile' ? mobilePos : desktopPos
  const natural = imgNatural
  const viewport = screen === 'mobile' ? MOBILE_VIEWPORT : DESKTOP_VIEWPORT

  if (!natural.width || !natural.height) {
    return {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${pos.scale})`,
      transformOrigin: 'center center',
      maxWidth: 'none !important',
      maxHeight: 'none !important',
      objectFit: 'contain',
      cursor: isDragging.value ? 'grabbing' : 'grab',
    }
  }

  // Exact natural aspect ratio fit: fits entire image without any stretching or cropping
  const fitScale = Math.min(viewport.width / natural.width, viewport.height / natural.height)
  const baseW = natural.width * fitScale
  const baseH = natural.height * fitScale

  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: `${baseW}px`,
    height: `${baseH}px`,
    maxWidth: 'none !important',
    maxHeight: 'none !important',
    objectFit: 'contain',
    transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${pos.scale})`,
    transformOrigin: 'center center',
    cursor: isDragging.value ? 'grabbing' : 'grab',
  }
}

// Bounding box for visual framing and corner resize handles
const boundingBoxStyle = computed(() => {
  const pos = currentPos.value
  const natural = currentNatural.value
  const viewport = currentViewport.value

  if (!natural.width || !natural.height) {
    return { display: 'none' }
  }

  const fitScale = Math.min(viewport.width / natural.width, viewport.height / natural.height)
  const baseW = natural.width * fitScale
  const baseH = natural.height * fitScale
  const w = baseW * pos.scale
  const h = baseH * pos.scale

  const left = viewport.width / 2 + pos.x - w / 2
  const top = viewport.height / 2 + pos.y - h / 2

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${w}px`,
    height: `${h}px`,
  }
})

// Render cropped canvas dataUrl matching exact natural coordinates
const generateCroppedDataUrl = async (imgSrc, pos, viewport, targetW, targetH) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = targetW
      canvas.height = targetH
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        return reject(new Error('Canvas 2D context not available'))
      }

      // Fill background
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, targetW, targetH)

      const factorX = targetW / viewport.width
      const factorY = targetH / viewport.height

      // Match natural proportion fit scale
      const fitScale = Math.min(viewport.width / img.naturalWidth, viewport.height / img.naturalHeight)
      const baseW = img.naturalWidth * fitScale
      const baseH = img.naturalHeight * fitScale

      ctx.save()
      // Scale canvas to match target high-res dimensions
      ctx.scale(factorX, factorY)
      // Center transform origin matching DOM translate
      ctx.translate(viewport.width / 2 + pos.x, viewport.height / 2 + pos.y)
      ctx.scale(pos.scale, pos.scale)
      ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH)
      ctx.restore()

      resolve(canvas.toDataURL('image/jpeg', 0.88))
    }
    img.onerror = (err) => reject(err)
    img.src = imgSrc
  })
}

// Save Changes: Saves only 3 images into event_photos table:
// a - original uploaded picture
// b - mobile_cropped
// c - desktop_cropped
const saveBackgroundChanges = async () => {
  isSaving.value = true
  const eventId = props.eventData?.id || props.eventCode

  try {
    const imgSrc = originalDataUrl.value || originalUrl.value
    if (!imgSrc) {
      toast.show({
        message: 'Please upload a background picture first.',
        color: 'warning',
      })
      isSaving.value = false
      return
    }

    const payloadItems = []

    // a - Original uploaded picture
    payloadItems.push({
      type: 'original',
      dataUrl: originalDataUrl.value || undefined,
      url: !originalDataUrl.value ? originalUrl.value : undefined,
      fileName: fileName.value,
    })

    // b - Mobile Cropped (1080x1920)
    const mobCroppedDataUrl = await generateCroppedDataUrl(
      imgSrc,
      mobilePos,
      MOBILE_VIEWPORT,
      1080,
      1920
    )
    payloadItems.push({
      type: 'mobile_cropped',
      dataUrl: mobCroppedDataUrl,
      fileName: `mobile_cropped_${fileName.value}`,
      cropData: {
        x: mobilePos.x,
        y: mobilePos.y,
        scale: mobilePos.scale,
        viewportWidth: MOBILE_VIEWPORT.width,
        viewportHeight: MOBILE_VIEWPORT.height,
      },
    })

    // c - Desktop Cropped (1920x1080)
    const deskCroppedDataUrl = await generateCroppedDataUrl(
      imgSrc,
      desktopPos,
      DESKTOP_VIEWPORT,
      1920,
      1080
    )
    payloadItems.push({
      type: 'desktop_cropped',
      dataUrl: deskCroppedDataUrl,
      fileName: `desktop_cropped_${fileName.value}`,
      cropData: {
        x: desktopPos.x,
        y: desktopPos.y,
        scale: desktopPos.scale,
        viewportWidth: DESKTOP_VIEWPORT.width,
        viewportHeight: DESKTOP_VIEWPORT.height,
      },
    })

    const { data: queueRes } = await axiosInstance.post(
      `/api/events/${eventId}/backgrounds`,
      {
        items: payloadItems,
      },
      {
        timeout: 120000, // Allow up to 2 minutes for multi-image high-res upload to R2
      }
    )

    // Poll BullMQ queue status if job was enqueued
    if (queueRes?.jobId && queueRes?.status !== 'completed') {
      let isDone = false
      let attempts = 0
      while (!isDone && attempts < 100) {
        attempts++
        await new Promise((r) => setTimeout(r, 600))
        try {
          const { data: statusData } = await axiosInstance.get(
            `/api/events/${eventId}/backgrounds/status/${queueRes.jobId}`
          )
          if (statusData?.status === 'completed') {
            isDone = true
          } else if (statusData?.status === 'failed') {
            throw new Error(statusData?.error || 'Background processing failed in queue')
          }
        } catch (pollErr) {
          if (pollErr.message?.includes('failed')) throw pollErr
          // Transient network hiccup, retry next tick
        }
      }
    }

    toast.show({
      message: 'Event background pictures and crop positions saved successfully!',
      color: 'success',
    })

    // Reset dirty tracking so button hides
    hasChanges.value = false
    await fetchBackgrounds()
    emit('saved')
  } catch (err) {
    console.error('[EventBackgroundSubtab] Save error:', err)
    toast.show({
      message: `Failed to save background: ${err?.response?.data?.message || err.message}`,
      color: 'danger',
    })
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  fetchBackgrounds()
  window.addEventListener('mousemove', onGlobalMouseMove)
  window.addEventListener('mouseup', onGlobalMouseUp)
  window.addEventListener('touchmove', onGlobalTouchMove, { passive: false })
  window.addEventListener('touchend', onGlobalTouchEnd)
  window.addEventListener('resize', updateStageScale)
  setTimeout(updateStageScale, 100)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onGlobalMouseMove)
  window.removeEventListener('mouseup', onGlobalMouseUp)
  window.removeEventListener('touchmove', onGlobalTouchMove)
  window.removeEventListener('touchend', onGlobalTouchEnd)
  window.removeEventListener('resize', updateStageScale)
})
</script>

<template>
  <div class="event-subtab-background">
    <!-- Header -->
    <div class="subtab-header">
      <div>
        <span class="subtab-badge">Visual Atmosphere</span>
        <h2 class="subtab-title">Event Backgrounds &amp; Viewports</h2>
        <p class="subtab-desc">
          Upload 1 picture for all viewports, then position and freely resize to frame each screen ratio.
        </p>
      </div>

      <!-- Screen Mode Selector Pill -->
      <div class="screen-selector">
        <button type="button" class="screen-btn" :class="{ 'is-active': activeScreen === 'mobile' }"
          @click="activeScreen = 'mobile'">
          <span class="material-symbols-outlined">smartphone</span>
          <span>Mobile View (9:16)</span>
        </button>
        <button type="button" class="screen-btn" :class="{ 'is-active': activeScreen === 'desktop' }"
          @click="activeScreen = 'desktop'">
          <span class="material-symbols-outlined">desktop_windows</span>
          <span>Desktop View (16:9)</span>
        </button>
      </div>
    </div>

    <!-- Hidden File Input (1 picture for all viewports) -->
    <input ref="fileInput" type="file" accept="image/*" style="display: none;"
      @change="handleFileSelect" />

    <!-- Editor Workspace Area -->
    <div class="cropper-workspace">
      <!-- Top Action Toolbar -->
      <div class="cropper-toolbar">
        <div class="cropper-toolbar__left">
          <span class="status-indicator">
            <span class="material-symbols-outlined indicator-icon">
              {{ activeScreen === 'mobile' ? 'smartphone' : 'desktop_windows' }}
            </span>
            <span class="indicator-text">
              {{ activeScreen === 'mobile' ?
                'Mobile Portrait (9:16 / 1080×1920)' : 'Desktop Landscape (16:9 / 1920×1080)' }}
            </span>
          </span>
          <span v-if="fileName && currentOriginalImage" class="active-filename-badge">
            <span class="material-symbols-outlined filename-icon">image</span>
            <span class="filename-text">{{ fileName }}</span>
          </span>
        </div>

        <div class="cropper-toolbar__right">
          <JBtn size="sm" variant="tonal" @click="triggerFileInput">
            <span class="material-symbols-outlined" style="font-size: 1rem;">cloud_upload</span>
            <span>{{ currentOriginalImage ? 'Change Picture' : 'Upload Picture' }}</span>
          </JBtn>
          <JBtn v-if="currentOriginalImage" size="sm" variant="tonal" title="Reset position and zoom"
            @click="resetPosition">
            <span class="material-symbols-outlined" style="font-size: 1rem;">filter_center_focus</span>
            <span>Center</span>
          </JBtn>
        </div>
      </div>

      <!-- Viewport Stage with Responsive Mobile Scaling -->
      <div ref="stageContainerRef" class="stage-container">
        <div class="stage-scaler" :style="{
          transform: stageScale < 1 ? `scale(${stageScale})` : undefined,
          transformOrigin: 'center center',
        }">
          <!-- Interactive Viewport Canvas -->
          <div ref="viewportFrameRef" class="viewport-frame" :class="`viewport-frame--${activeScreen}`" :style="{
            width: `${currentViewport.width}px`,
            height: `${currentViewport.height}px`,
          }" @mousedown="onMouseDown" @touchstart="onTouchStart" @wheel.prevent="onWheel">
            <!-- Loaded Image (Unstretched, Natural Aspect Ratio Preserved) -->
            <img v-if="currentOriginalImage" :src="currentOriginalImage" alt="Event Background" class="viewport-img"
              :style="getImageStyle(activeScreen)" draggable="false" />

            <!-- Empty Placeholder / Drop Zone -->
            <div v-else class="viewport-empty" @click="triggerFileInput">
              <span class="material-symbols-outlined empty-icon">add_photo_alternate</span>
              <p class="empty-text">Click to upload background picture</p>
              <span class="empty-hint">1 picture for all viewports (Mobile & Desktop) • High-resolution JPG, PNG or WebP</span>
            </div>

            <!-- Composition Rule of Thirds Grid Overlay -->
            <div v-if="currentOriginalImage" class="composition-grid">
              <div class="grid-line grid-line--v1"></div>
              <div class="grid-line grid-line--v2"></div>
              <div class="grid-line grid-line--h1"></div>
              <div class="grid-line grid-line--h2"></div>
            </div>

            <!-- Resizable Bounding Box with 4 Corner Handles -->
            <div
              v-if="currentOriginalImage && imgNatural.width"
              class="image-bounding-box" :style="boundingBoxStyle">
              <div class="corner-handle corner-handle--tl" title="Drag corner to resize"
                @mousedown.stop="onCornerMouseDown($event, 'tl')" @touchstart.stop="onCornerTouchStart($event, 'tl')">
              </div>
              <div class="corner-handle corner-handle--tr" title="Drag corner to resize"
                @mousedown.stop="onCornerMouseDown($event, 'tr')" @touchstart.stop="onCornerTouchStart($event, 'tr')">
              </div>
              <div class="corner-handle corner-handle--bl" title="Drag corner to resize"
                @mousedown.stop="onCornerMouseDown($event, 'bl')" @touchstart.stop="onCornerTouchStart($event, 'bl')">
              </div>
              <div class="corner-handle corner-handle--br" title="Drag corner to resize"
                @mousedown.stop="onCornerMouseDown($event, 'br')" @touchstart.stop="onCornerTouchStart($event, 'br')">
              </div>
            </div>

            <!-- Dragging Instruction Hint -->
            <div v-if="currentOriginalImage" class="drag-hint">
              <span class="material-symbols-outlined" style="font-size: 0.85rem;">drag_pan</span>
              <span>Drag to move • Drag corners, pinch or use slider to resize</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Zoom & Scale Controls (Visible when image is loaded) -->
      <div v-if="currentOriginalImage" class="cropper-controls">
        <div class="zoom-group">
          <button type="button" class="zoom-step-btn" title="Zoom out 10%" @click="stepZoom(-0.1)">
            <span class="material-symbols-outlined">zoom_out</span>
          </button>

          <input type="range" min="0.1" max="4.0" step="0.05" :value="currentPos.scale" class="zoom-slider"
            @input="(e) => updateZoom(e.target.value)" />

          <button type="button" class="zoom-step-btn" title="Zoom in 10%" @click="stepZoom(0.1)">
            <span class="material-symbols-outlined">zoom_in</span>
          </button>

          <span class="zoom-value">{{ Math.round(currentPos.scale * 100) }}%</span>
        </div>

        <!-- Quick Aspect Presets -->
        <div class="preset-group">
          <button type="button" class="preset-btn" title="Fit entire original image without cropping" @click="setFit">
            <span class="material-symbols-outlined preset-icon">fit_screen</span>
            <span>Fit</span>
          </button>

          <button type="button" class="preset-btn" title="Scale image to completely cover viewport" @click="setFill">
            <span class="material-symbols-outlined preset-icon">crop_free</span>
            <span>Fill</span>
          </button>

          <button type="button" class="preset-btn" title="100% natural pixel scale" @click="setOriginal">
            <span class="material-symbols-outlined preset-icon">aspect_ratio</span>
            <span>1:1</span>
          </button>

          <button type="button" class="preset-btn" title="Center position" @click="resetPosition">
            <span class="material-symbols-outlined preset-icon">filter_center_focus</span>
            <span>Center</span>
          </button>
        </div>

        <div class="position-stats">
          <span class="stat-pill">X: {{ Math.round(currentPos.x) }}px</span>
          <span class="stat-pill">Y: {{ Math.round(currentPos.y) }}px</span>
        </div>
      </div>
    </div>

    <!-- Summary of Both Viewports Saved Status -->
    <div class="viewports-summary">
      <!-- Mobile Status Card -->
      <div class="viewport-status-card"
        :class="{ 'is-active': activeScreen === 'mobile', 'is-configured': Boolean(currentOriginalImage) }"
        @click="activeScreen = 'mobile'">
        <div class="card-left">
          <span class="material-symbols-outlined card-icon">smartphone</span>
          <div>
            <h4 class="card-title">Mobile Viewport (9:16)</h4>
            <p class="card-desc">
              {{ currentOriginalImage ? (hasChanges ? 'Changes pending save' : 'Framed & Configured') : 'Upload picture to configure' }}
            </p>
          </div>
        </div>
        <span class="material-symbols-outlined status-dot-icon"
          :style="{ color: currentOriginalImage ? 'var(--primary, #c5a059)' : '#9ca3af' }">
          {{ currentOriginalImage ? 'check_circle' : 'radio_button_unchecked' }}
        </span>
      </div>

      <!-- Desktop Status Card -->
      <div class="viewport-status-card"
        :class="{ 'is-active': activeScreen === 'desktop', 'is-configured': Boolean(currentOriginalImage) }"
        @click="activeScreen = 'desktop'">
        <div class="card-left">
          <span class="material-symbols-outlined card-icon">desktop_windows</span>
          <div>
            <h4 class="card-title">Desktop Viewport (16:9)</h4>
            <p class="card-desc">
              {{ currentOriginalImage ? (hasChanges ? 'Changes pending save' : 'Framed & Configured') : 'Upload picture to configure' }}
            </p>
          </div>
        </div>
        <span class="material-symbols-outlined status-dot-icon"
          :style="{ color: currentOriginalImage ? 'var(--primary, #c5a059)' : '#9ca3af' }">
          {{ currentOriginalImage ? 'check_circle' : 'radio_button_unchecked' }}
        </span>
      </div>
    </div>

    <!-- SAVE CHANGES BUTTON: ONLY DISPLAYED ONCE A CHANGE HAPPENED -->
    <transition name="fade-slide">
      <div v-if="hasChanges" class="save-changes-bar">
        <div class="save-changes-info">
          <span class="material-symbols-outlined info-icon">edit_notifications</span>
          <span>You have unsaved background adjustments. Save to update guest viewports.</span>
        </div>

        <JBtn color="primary" size="sm" :loading="isSaving" :disabled="isSaving" class="save-btn"
          @click="saveBackgroundChanges">
          <span class="material-symbols-outlined" style="font-size: 1.05rem;">save</span>
          <span>Save Changes</span>
        </JBtn>
      </div>
    </transition>
  </div>
</template>

<style scoped lang="scss">
.event-subtab-background {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.subtab-header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.15));
  padding-bottom: 0.75rem;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
  }
}

.subtab-badge {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--primary, #c5a059);
  margin-bottom: 0.2rem;
}

.subtab-title {
  font-family: var(--font-heading, 'Playfair Display', Georgia, serif);
  font-size: 1.35rem;
  font-weight: 400;
  color: var(--text-primary, #1f1b18);
  margin: 0 0 0.25rem;
}

.subtab-desc {
  font-size: 0.8125rem;
  color: var(--text-secondary, #4e4639);
  margin: 0;
  line-height: 1.45;
}

.screen-selector {
  display: inline-flex;
  padding: 0.2rem;
  background: var(--bg-surface-elevated, #ffffff);
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.2));
  border-radius: 9999px;
  gap: 0.2rem;
}

.screen-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  border: none;
  background: transparent;
  color: var(--text-secondary, #4e4639);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  .material-symbols-outlined {
    font-size: 1rem;
  }

  &:hover {
    background: var(--bg-hover, rgba(197, 160, 89, 0.08));
    color: var(--text-primary, #1f1b18);
  }

  &.is-active {
    background: var(--primary, #c5a059);
    color: var(--primary-text, #ffffff);
    box-shadow: 0 2px 6px rgba(197, 160, 89, 0.25);
  }
}

.cropper-workspace {
  background: var(--bg-surface-elevated, #ffffff);
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.18));
  border-radius: var(--radius-xl, 0.75rem);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.04));

  @media (min-width: 640px) {
    padding: 1.25rem;
    gap: 1.25rem;
  }
}

.cropper-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.12));
  padding-bottom: 0.65rem;

  &__left {
    display: flex;
    align-items: center;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary, #1f1b18);

  .indicator-icon {
    font-size: 1rem;
    color: var(--primary, #c5a059);
  }
}

.active-filename-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  color: var(--text-secondary, #4e4639);
  background: var(--bg-surface-tonal, rgba(197, 160, 89, 0.08));
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.2));
  margin-left: 0.5rem;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  .filename-icon {
    font-size: 0.85rem;
    color: var(--primary, #c5a059);
    flex-shrink: 0;
  }

  .filename-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.stage-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 380px;
  background: #110e0c;
  border-radius: var(--radius-lg, 0.5rem);
  padding: 1rem;
  position: relative;
  overflow: hidden;

  @media (min-width: 640px) {
    padding: 2rem;
    min-height: 420px;
  }
}

.stage-scaler {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.viewport-frame {
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(197, 160, 89, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1c1815;
  user-select: none;
  touch-action: none;

  &--mobile {
    border-radius: 1.5rem;
  }

  &--desktop {
    border-radius: 0.75rem;
  }
}

.viewport-img {
  position: absolute;
  pointer-events: auto;
  user-select: none;
  -webkit-user-drag: none;
  max-width: none !important;
  max-height: none !important;
  display: block;
}

.image-bounding-box {
  position: absolute;
  border: 1.5px dashed rgba(197, 160, 89, 0.75);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);
  z-index: 10;
  pointer-events: none;
}

.corner-handle {
  position: absolute;
  width: 14px;
  height: 14px;
  background: #ffffff;
  border: 2px solid var(--primary, #c5a059);
  border-radius: 50%;
  pointer-events: auto;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
  transition: transform 0.15s ease, background-color 0.15s ease;
  z-index: 20;

  &:hover {
    transform: scale(1.3);
    background: var(--primary, #c5a059);
  }

  &--tl {
    top: -7px;
    left: -7px;
    cursor: nwse-resize;
  }

  &--tr {
    top: -7px;
    right: -7px;
    cursor: nesw-resize;
  }

  &--bl {
    bottom: -7px;
    left: -7px;
    cursor: nesw-resize;
  }

  &--br {
    bottom: -7px;
    right: -7px;
    cursor: nwse-resize;
  }
}

.viewport-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s ease;

  &:hover {
    color: var(--primary, #c5a059);
    transform: scale(1.02);
  }

  .empty-icon {
    font-size: 2.75rem;
    margin-bottom: 0.4rem;
  }

  .empty-text {
    margin: 0 0 0.2rem;
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .empty-hint {
    font-size: 0.6875rem;
    opacity: 0.6;
  }
}

.composition-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;

  .grid-line {
    position: absolute;
    background: rgba(255, 255, 255, 0.15);

    &--v1 {
      top: 0;
      bottom: 0;
      left: 33.33%;
      width: 1px;
    }

    &--v2 {
      top: 0;
      bottom: 0;
      left: 66.66%;
      width: 1px;
    }

    &--h1 {
      left: 0;
      right: 0;
      top: 33.33%;
      height: 1px;
    }

    &--h2 {
      left: 0;
      right: 0;
      top: 66.66%;
      height: 1px;
    }
  }
}

.drag-hint {
  position: absolute;
  bottom: 0.65rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  color: #ffffff;
  font-size: 0.6875rem;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  pointer-events: none;
  white-space: nowrap;
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cropper-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  background: var(--bg-surface-tonal, rgba(197, 160, 89, 0.05));
  border-radius: var(--radius-md, 0.375rem);
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.15));
}

.zoom-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 200px;
  max-width: 320px;

  .zoom-slider {
    flex: 1;
    accent-color: var(--primary, #c5a059);
    cursor: pointer;
  }

  .zoom-value {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--primary, #c5a059);
    min-width: 38px;
    text-align: right;
  }
}

.zoom-step-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--radius-sm, 0.25rem);
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.2));
  background: var(--bg-surface, #ffffff);
  color: var(--text-secondary, #4e4639);
  cursor: pointer;
  transition: all 0.2s ease;

  .material-symbols-outlined {
    font-size: 1.05rem;
  }

  &:hover {
    background: var(--bg-hover, rgba(197, 160, 89, 0.12));
    color: var(--primary, #c5a059);
  }
}

.preset-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.preset-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.55rem;
  border-radius: var(--radius-sm, 0.25rem);
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.25));
  background: var(--bg-surface, #ffffff);
  color: var(--text-secondary, #4e4639);
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  .preset-icon {
    font-size: 0.95rem;
    color: var(--primary, #c5a059);
  }

  &:hover {
    background: var(--bg-hover, rgba(197, 160, 89, 0.12));
    color: var(--text-primary, #1f1b18);
    border-color: var(--primary, #c5a059);
  }
}

.position-stats {
  display: flex;
  align-items: center;
  gap: 0.4rem;

  .stat-pill {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--text-secondary, #4e4639);
    background: var(--bg-surface, #ffffff);
    padding: 0.15rem 0.45rem;
    border-radius: var(--radius-sm, 0.25rem);
    border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.2));
  }
}

.viewports-summary {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.viewport-status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.15rem;
  border-radius: var(--radius-lg, 0.5rem);
  background: var(--bg-surface-elevated, #ffffff);
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.2));
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.04));

  &:hover {
    border-color: var(--primary, #c5a059);
    box-shadow: var(--shadow-md, 0 4px 12px rgba(197, 160, 89, 0.08));
  }

  &.is-configured {
    border-left: 4px solid var(--primary, #c5a059);
  }

  &.is-active {
    border-color: var(--primary, #c5a059);
    box-shadow: 0 0 0 1px var(--primary, #c5a059), var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.04));
  }

  .card-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .card-icon {
    font-size: 1.4rem;
    color: var(--primary, #c5a059);
  }

  .card-title {
    margin: 0 0 0.15rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-primary, #1f1b18);
  }

  .card-desc {
    margin: 0;
    font-size: 0.72rem;
    color: var(--text-secondary, #4e4639);
  }

  .status-dot-icon {
    font-size: 1.25rem;
  }
}

/* Save changes bar - strictly displayed when hasChanges is true */
.save-changes-bar {
  position: sticky;
  bottom: 1.25rem;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 1.15rem;
  background: var(--bg-surface-elevated, #2a2420);
  color: var(--text-primary, #ffffff);
  border-radius: var(--radius-lg, 0.5rem);
  border: 1px solid var(--primary, #c5a059);
  box-shadow: var(--shadow-xl, 0 10px 30px rgba(0, 0, 0, 0.25));
}

.save-changes-info {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.78125rem;
  font-weight: 500;
  color: var(--text-primary, #ffffff);

  .info-icon {
    font-size: 1.15rem;
    color: var(--primary, #c5a059);
  }
}

.save-btn {
  white-space: nowrap;
  padding: 0.42rem 1.05rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: var(--radius-md, 0.375rem);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(15px);
}
</style>
