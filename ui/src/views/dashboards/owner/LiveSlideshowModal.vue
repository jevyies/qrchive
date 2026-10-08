<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import JModal from '@/@core/components/JModal.vue'
import JBtn from '@/@core/components/JBtn.vue'
import JSelect from '@/@core/components/JSelect.vue'
import { useEventSlideshow } from '@/composables/useEventSlideshow'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  eventCode: {
    type: String,
    default: '',
  },
  eventTitle: {
    type: String,
    default: 'Event Slideshow',
  },
})

const emit = defineEmits(['update:modelValue', 'action'])

const {
  slideshowPhotos,
  isLoadingSlideshow,
  fetchSlideshow,
  removePhotoFromSlideshow,
  preloadPhotos,
} = useEventSlideshow()

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// Slideshow settings
const slideIntervalSeconds = ref(5)
const isLoop = ref(true)
const isPlaying = ref(true)
const currentSlideIndex = ref(0)
const isFullscreen = ref(false)
const showControls = ref(true)
let slideTimer = null
let controlsTimeout = null

// Select dropdown options for JSelect
const paceOptions = [
  { value: 3, label: '3 Seconds (Fast)' },
  { value: 5, label: '5 Seconds (Balanced)' },
  { value: 8, label: '8 Seconds (Cinematic)' },
  { value: 10, label: '10 Seconds (Relaxed)' },
]

const loopOptions = [
  { value: true, label: 'Continuous Loop' },
  { value: false, label: 'Play Once (Stop at End)' },
]

const slideIntervalModel = computed({
  get: () => slideIntervalSeconds.value,
  set: (val) => {
    slideIntervalSeconds.value = Number(val) || 5
  },
})

const isLoopModel = computed({
  get: () => isLoop.value,
  set: (val) => {
    isLoop.value = val === true || val === 'true'
  },
})

// Preloading states
const isPreloading = ref(false)
const preloadProgress = ref(0)
const preloadCurrent = ref(0)
const preloadTotal = ref(0)
const isSlideshowActive = ref(false)

// Current slide photo
const currentSlide = computed(() => {
  if (!slideshowPhotos.value.length) return null
  return slideshowPhotos.value[currentSlideIndex.value] || slideshowPhotos.value[0]
})

// Remove single photo from slideshow collection
async function handleRemove(photo) {
  const id = photo.id || photo.photoId
  await removePhotoFromSlideshow(id, props.eventCode)
  emit('action', 'Photo removed from slideshow', 'info')
}

// Timer management
function stopTimer() {
  if (slideTimer) {
    clearInterval(slideTimer)
    slideTimer = null
  }
}

function startTimer() {
  stopTimer()
  if (!isPlaying.value) return
  slideTimer = setInterval(() => {
    nextSlide()
  }, slideIntervalSeconds.value * 1000)
}

function toggleLoop() {
  isLoop.value = !isLoop.value
}

function togglePlayPause() {
  if (!isPlaying.value) {
    isPlaying.value = true
    startTimer()
  } else {
    isPlaying.value = false
    stopTimer()
  }
}

function nextSlide() {
  if (!slideshowPhotos.value.length) return
  if (currentSlideIndex.value + 1 < slideshowPhotos.value.length) {
    currentSlideIndex.value += 1
    if (isPlaying.value) startTimer()
  } else {
    // Reached the end of the collection
    if (isLoop.value) {
      currentSlideIndex.value = 0
      if (isPlaying.value) startTimer()
    } else {
      // Finished single playback - close slideshow and exit modal
      stopSlideshow()
      isOpen.value = false
      currentSlideIndex.value = 0
      emit('action', 'Slideshow finished', 'info')
    }
  }
}

function prevSlide() {
  if (!slideshowPhotos.value.length) return
  if (currentSlideIndex.value > 0) {
    currentSlideIndex.value -= 1
  } else if (isLoop.value) {
    currentSlideIndex.value = slideshowPhotos.value.length - 1
  }
  if (isPlaying.value) startTimer()
}

function stopSlideshow() {
  stopTimer()
  isSlideshowActive.value = false
  if (typeof document !== 'undefined' && document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => { })
  }
  isFullscreen.value = false
}

// Launch fullscreen slideshow
function launchSlideshow() {
  currentSlideIndex.value = 0
  isPlaying.value = true
  isSlideshowActive.value = true
  startTimer()

  // Try browser fullscreen
  try {
    const el = document.documentElement
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().then(() => {
        isFullscreen.value = true
      }).catch(() => { })
    }
  } catch {
    // Non-blocking
  }
}

// Start preloading and then start slideshow
async function startSlideshowFlow() {
  if (!slideshowPhotos.value.length) return

  isPreloading.value = true
  preloadProgress.value = 0
  preloadCurrent.value = 0
  preloadTotal.value = slideshowPhotos.value.length

  try {
    await preloadPhotos(slideshowPhotos.value, ({ current, total, percent }) => {
      preloadCurrent.value = current
      preloadTotal.value = total
      preloadProgress.value = percent
    })

    // Slight delay so user sees 100% completion
    setTimeout(() => {
      isPreloading.value = false
      launchSlideshow()
    }, 400)
  } catch (err) {
    console.warn('[LiveSlideshowModal] Preloading warning:', err)
    isPreloading.value = false
    launchSlideshow()
  }
}

// Mouse movement for control fadeout
function handleMouseMove() {
  showControls.value = true
  if (controlsTimeout) clearTimeout(controlsTimeout)
  controlsTimeout = setTimeout(() => {
    if (isSlideshowActive.value && isPlaying.value) {
      showControls.value = false
    }
  }, 3500)
}

// Keyboard shortcuts for slideshow
function handleKeyDown(e) {
  if (!isSlideshowActive.value) return

  if (e.key === 'ArrowRight' || e.key === 'PageDown') {
    e.preventDefault()
    nextSlide()
  } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    e.preventDefault()
    prevSlide()
  } else if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
    togglePlayPause()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    stopSlideshow()
  } else if (e.key === 'l' || e.key === 'L') {
    e.preventDefault()
    toggleLoop()
  }
}

// Watch modal opening to refresh slideshow photos
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      if (props.eventCode) {
        fetchSlideshow(props.eventCode)
      }
    } else {
      stopSlideshow()
    }
  }
)

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('mousemove', handleMouseMove)
  stopTimer()
})
</script>

<template>
  <div>
    <!-- 1. Selection & Management Modal -->
    <JModal v-if="!isSlideshowActive" v-model="isOpen" title="Live Slideshow Collection"
      :subtitle="`${slideshowPhotos.length} photo${slideshowPhotos.length === 1 ? '' : 's'} queued for big-screen presentation`"
      size="xl" variant="elevated" :scrollable="false">
      <div class="slideshow-mgr">
        <!-- Top Control Bar -->
        <div class="slideshow-mgr__topbar">
          <div class="topbar-left">
            <span class="material-symbols-outlined topbar-icon">slideshow</span>
            <div>
              <h4 class="topbar-title">{{ eventTitle }}</h4>
              <p class="topbar-desc">
                Photos with a gold circular checkmark are included in this live slideshow.
              </p>
            </div>
          </div>

          <div class="topbar-right">
            <div class="setting-item">
              <span class="setting-label">Slide Pace:</span>
              <JSelect
                v-model="slideIntervalModel"
                :options="paceOptions"
                size="sm"
                container-class="setting-jselect"
              />
            </div>

            <div class="setting-item">
              <span class="setting-label">Playback:</span>
              <JSelect
                v-model="isLoopModel"
                :options="loopOptions"
                size="sm"
                container-class="setting-jselect"
              />
            </div>
          </div>
        </div>

        <!-- Scrollable Photo Grid of Selected Photos -->
        <div class="slideshow-mgr__body">
          <div v-if="isLoadingSlideshow" class="slideshow-mgr__loading">
            <div class="loading-spinner"></div>
            <p>Loading slideshow queue...</p>
          </div>

          <div v-else-if="slideshowPhotos.length" class="slideshow-mgr__grid">
            <div v-for="(photo, index) in slideshowPhotos" :key="photo.id || index" class="slideshow-card">
              <div class="slideshow-card__media">
                <video v-if="photo.isVideo" :src="photo.fullUrl || photo.url" class="slideshow-card__img" muted
                  preload="metadata"></video>
                <img v-else :src="photo.thumbnailUrl || photo.fullUrl || photo.url"
                  :alt="photo.checklistName || 'Slideshow photo'" class="slideshow-card__img" loading="lazy" />

                <!-- Slide Index Number -->
                <span class="slideshow-card__index">#{{ index + 1 }}</span>

                <!-- Remove Button (Top Right) -->
                <button type="button" class="slideshow-card__remove-btn" title="Remove from slideshow"
                  @click.stop="handleRemove(photo)">
                  <span class="material-symbols-outlined remove-icon">close</span>
                </button>

                <!-- Contributor Tag (Bottom Left) -->
                <span class="slideshow-card__contributor">
                  <span class="material-symbols-outlined mini-icon">person</span>
                  <span>{{ photo.uploadedBy || 'Guest' }}</span>
                </span>

                <!-- Likes Tag (Bottom Right) -->
                <span v-if="photo.likesCount || photo.likes" class="slideshow-card__likes">
                  <span class="material-symbols-outlined mini-icon heart">favorite</span>
                  <span>{{ photo.likesCount || photo.likes }}</span>
                </span>
              </div>

              <div class="slideshow-card__footer">
                <span class="checklist-name-tag">
                  {{ photo.checklistName || 'Live Moment' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="slideshow-mgr__empty">
            <div class="empty-icon-halo">
              <span class="material-symbols-outlined empty-icon">photo_library</span>
            </div>
            <h3 class="empty-title">No Photos Selected Yet</h3>
            <p class="empty-text">
              Select photos from <strong>Chapter Albums</strong> or <strong>Guest Uploads</strong> by clicking the
              circular checkbox on the top right of any photo to build your live slideshow presentation.
            </p>
          </div>
        </div>

        <!-- Bottom Action Bar -->
        <div class="slideshow-mgr__footer">
          <div class="footer-stats">
            <span class="material-symbols-outlined footer-icon">auto_awesome</span>
            <span>
              <strong>{{ slideshowPhotos.length }}</strong> photo{{ slideshowPhotos.length === 1 ? '' : 's' }} ready
              • {{ isLoop ? 'Loop cycle' : 'Single run' }}: <strong>{{ Math.round((slideshowPhotos.length *
                slideIntervalSeconds) / 60 * 10) / 10 }}m</strong>
              • Mode: <strong>{{ isLoop ? 'Continuous Loop' : 'Play Once' }}</strong>
            </span>
          </div>

          <div class="footer-actions">
            <JBtn variant="tonal" color="secondary" @click="isOpen = false">
              Close
            </JBtn>

            <button type="button" class="start-slideshow-btn" :disabled="slideshowPhotos.length === 0 || isPreloading"
              @click="startSlideshowFlow">
              <span class="material-symbols-outlined btn-icon">play_arrow</span>
              <span>Start Slideshow</span>
            </button>
          </div>
        </div>
      </div>
    </JModal>

    <!-- 2. Preloading Overlay Modal -->
    <div v-if="isPreloading" class="preloading-overlay">
      <div class="preloading-card">
        <div class="preloading-spinner"></div>
        <h3 class="preloading-title">Preloading Slideshow Photos</h3>
        <p class="preloading-subtitle">
          Caching high-resolution moments into memory for uninterrupted, seamless playback.
        </p>

        <div class="preloading-bar-wrap">
          <div class="preloading-bar-fill" :style="{ width: `${preloadProgress}%` }"></div>
        </div>

        <div class="preloading-meta">
          <span>{{ preloadCurrent }} of {{ preloadTotal }} photos ready</span>
          <span><strong>{{ preloadProgress }}%</strong></span>
        </div>
      </div>
    </div>

    <!-- 3. Fullscreen Live Slideshow Player -->
    <teleport to="body">
      <div v-if="isSlideshowActive && currentSlide" class="live-slideshow-player"
        :class="{ 'hide-cursor': !showControls }" @click="togglePlayPause">
        <!-- Background Ambient Blur Halo -->
        <div class="slideshow-backdrop-blur"
          :style="{ backgroundImage: `url(${currentSlide.fullUrl || currentSlide.url})` }"></div>

        <!-- Main Slide Media Container -->
        <div class="slide-media-stage" @click.stop>
          <video v-if="currentSlide.isVideo" :src="currentSlide.fullUrl || currentSlide.url" class="slide-media-element"
            autoplay muted playsinline loop></video>
          <img v-else :src="currentSlide.fullUrl || currentSlide.url" :alt="currentSlide.checklistName || 'Live Slide'"
            class="slide-media-element kenburns-effect" />
        </div>

        <!-- Top Floating Overlay Header -->
        <div class="slideshow-hud-top" :class="{ 'hud-visible': showControls }" @click.stop>
          <div class="hud-left">
            <span class="live-pill">
              <span class="pulse-dot"></span>
              <span>LIVE SLIDESHOW</span>
            </span>
            <h2 class="hud-event-title">{{ eventTitle }}</h2>
          </div>

          <div class="hud-right">
            <span class="slide-counter-badge">
              {{ currentSlideIndex + 1 }} / {{ slideshowPhotos.length }}
              <span class="hud-loop-pill" :class="{ 'is-loop': isLoop }">
                {{ isLoop ? 'LOOP' : '1X' }}
              </span>
            </span>
            <button type="button" class="hud-btn hud-btn--close" title="Exit Slideshow (Esc)" @click="stopSlideshow">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <!-- Bottom Floating Overlay Footer & Controls -->
        <div class="slideshow-hud-bottom" :class="{ 'hud-visible': showControls }" @click.stop>
          <!-- Contributor & Moment Info -->
          <div class="hud-slide-info">
            <div class="hud-contributor">
              <span class="material-symbols-outlined">face</span>
              <span>Captured by <strong>{{ currentSlide.uploadedBy || 'Beloved Guest' }}</strong></span>
            </div>
            <div class="hud-moment">
              <span class="material-symbols-outlined">photo_camera</span>
              <span>{{ currentSlide.checklistName || 'Candid Vault' }}</span>
              <span v-if="currentSlide.likesCount" class="hud-likes">
                • <span class="material-symbols-outlined likes-icon">favorite</span> {{ currentSlide.likesCount }}
              </span>
            </div>
          </div>

          <!-- Playback Controls -->
          <div class="hud-controls-center">
            <button type="button" class="hud-control-btn" title="Previous Slide (Left Arrow)" @click="prevSlide">
              <span class="material-symbols-outlined">skip_previous</span>
            </button>

            <button type="button" class="hud-control-btn hud-control-btn--play"
              :title="isPlaying ? 'Pause Slideshow (Space)' : 'Play Slideshow (Space)'" @click="togglePlayPause">
              <span class="material-symbols-outlined">
                {{ isPlaying ? 'pause' : 'play_arrow' }}
              </span>
            </button>

            <button type="button" class="hud-control-btn" title="Next Slide (Right Arrow)" @click="nextSlide">
              <span class="material-symbols-outlined">skip_next</span>
            </button>

            <button type="button" class="hud-control-btn" :class="{ 'hud-control-btn--active': isLoop }"
              :title="isLoop ? 'Loop Enabled: Continuous (Press L to toggle)' : 'Loop Disabled: Single Play (Press L to toggle)'"
              @click="toggleLoop">
              <span class="material-symbols-outlined">
                {{ isLoop ? 'repeat' : 'repeat_one' }}
              </span>
            </button>
          </div>

          <!-- Timing Progress Pill -->
          <div class="hud-progress-wrap">
            <div v-if="isPlaying" class="slide-progress-bar" :style="{ animationDuration: `${slideIntervalSeconds}s` }"
              :key="currentSlideIndex"></div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
/* ========================================================================== */
/* 1. SELECTION & MANAGEMENT MODAL STYLES                                     */
/* ========================================================================== */
.slideshow-mgr {
  display: flex;
  flex-direction: column;
  height: 75vh;
  max-height: 800px;
  background: var(--bg-card, #ffffff);
  border-radius: 16px;
  overflow: hidden;
}

.slideshow-mgr__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.75rem;
  background: var(--bg-surface, #faf8f5);
  border-bottom: 1px solid var(--border-color, #e8e2d9);
  gap: 1rem;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.topbar-icon {
  font-size: 2rem;
  color: var(--primary, #c5a059);
  background: rgba(197, 160, 89, 0.12);
  padding: 0.5rem;
  border-radius: 12px;
}

.topbar-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary, #1f1b18);
}

.topbar-desc {
  margin: 0.2rem 0 0;
  font-size: 0.8125rem;
  color: var(--text-secondary, #736b63);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.setting-item,
.speed-selector {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 175px;
}

.setting-jselect {
  width: 100%;
}

.setting-label,
.speed-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary, #736b63);
  white-space: nowrap;
}

.setting-select,
.speed-select {
  padding: 0.45rem 0.85rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary, #1f1b18);
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #dcd5ca);
  border-radius: 8px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s ease;
}

.setting-select:focus,
.speed-select:focus {
  border-color: var(--primary, #c5a059);
}

.slideshow-mgr__body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 1.75rem;
  background: var(--bg-body, #fdfbf9);
}

.slideshow-mgr__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  color: var(--text-secondary, #736b63);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(197, 160, 89, 0.2);
  border-top-color: var(--primary, #c5a059);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Grid of Selected Photos */
.slideshow-mgr__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.25rem;
}

.slideshow-card {
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #ebe4d8);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
}

.slideshow-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.slideshow-card__media {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #1a1614;
  overflow: hidden;
}

.slideshow-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.slideshow-card__index {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.65);
  color: #ffffff;
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  backdrop-filter: blur(4px);
}

.slideshow-card__remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.slideshow-card__remove-btn:hover {
  background: #dc2626;
  border-color: #ef4444;
  transform: scale(1.1);
}

.remove-icon {
  font-size: 1rem;
}

.slideshow-card__contributor {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(0, 0, 0, 0.65);
  color: #ffffff;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
  backdrop-filter: blur(4px);
}

.slideshow-card__likes {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(0, 0, 0, 0.65);
  color: #ffffff;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
  backdrop-filter: blur(4px);
}

.mini-icon {
  font-size: 0.85rem;
}

.mini-icon.heart {
  color: #f43f5e;
}

.slideshow-card__footer {
  padding: 0.65rem 0.85rem;
}

.checklist-name-tag {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary, #1f1b18);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

/* Empty State */
.slideshow-mgr__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 1.5rem;
  height: 100%;
}

.empty-icon-halo {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(197, 160, 89, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.25rem;
}

.empty-icon {
  font-size: 2.5rem;
  color: var(--primary, #c5a059);
}

.empty-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #1f1b18);
}

.empty-text {
  margin: 0.5rem auto 0;
  font-size: 0.875rem;
  color: var(--text-secondary, #736b63);
  max-width: 480px;
  line-height: 1.6;
}

/* Footer Bottom Bar */
.slideshow-mgr__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.15rem 1.75rem;
  background: var(--bg-surface, #faf8f5);
  border-top: 1px solid var(--border-color, #e8e2d9);
  gap: 1rem;
}

.footer-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary, #736b63);
}

.footer-icon {
  font-size: 1.2rem;
  color: var(--primary, #c5a059);
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.start-slideshow-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.65rem 1.45rem;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #1a1614;
  background: linear-gradient(135deg, #e3c578, #c5a059);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 9999px;
  box-shadow: 0 4px 14px rgba(197, 160, 89, 0.35);
  cursor: pointer;
  transition: all 0.2s ease;
}

.start-slideshow-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(197, 160, 89, 0.5);
  filter: brightness(1.04);
}

.start-slideshow-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-icon {
  font-size: 1.2rem;
}

/* ========================================================================== */
/* 2. PRELOADING OVERLAY                                                      */
/* ========================================================================== */
.preloading-overlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  background: rgba(12, 10, 9, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.preloading-card {
  width: 100%;
  max-width: 440px;
  background: #1c1815;
  border: 1px solid rgba(197, 160, 89, 0.3);
  border-radius: 20px;
  padding: 2.25rem 2rem;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  color: #ffffff;
}

.preloading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(197, 160, 89, 0.2);
  border-top-color: #c5a059;
  border-radius: 50%;
  margin: 0 auto 1.25rem;
  animation: spin 0.8s linear infinite;
}

.preloading-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffffff;
}

.preloading-subtitle {
  margin: 0.5rem 0 1.5rem;
  font-size: 0.8125rem;
  color: #a89f91;
  line-height: 1.5;
}

.preloading-bar-wrap {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 0.85rem;
}

.preloading-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #c5a059, #f3d483);
  border-radius: 9999px;
  transition: width 0.2s ease-out;
}

.preloading-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #a89f91;
}

/* ========================================================================== */
/* 3. FULLSCREEN LIVE SLIDESHOW PLAYER                                        */
/* ========================================================================== */
.live-slideshow-player {
  position: fixed;
  inset: 0;
  z-index: 999999;
  background: #080706;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  user-select: none;
}

.live-slideshow-player.hide-cursor {
  cursor: none;
}

/* Ambient Backdrop Glow */
.slideshow-backdrop-blur {
  position: absolute;
  inset: -40px;
  background-size: cover;
  background-position: center;
  filter: blur(50px) brightness(0.25);
  opacity: 0.8;
  transform: scale(1.1);
  pointer-events: none;
}

/* Main Slide Stage */
.slide-media-stage {
  position: relative;
  z-index: 10;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.slide-media-element {
  max-width: 96vw;
  max-height: 92vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
  transition: opacity 0.5s ease-in-out;
}

/* Ken Burns Subtle Motion */
.kenburns-effect {
  animation: kenburns 12s ease-in-out infinite alternate;
}

@keyframes kenburns {
  0% {
    transform: scale(1);
  }

  100% {
    transform: scale(1.03);
  }
}

/* HUD Overlay: Top */
.slideshow-hud-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  background: linear-gradient(to bottom, rgba(8, 7, 6, 0.85), transparent);
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: none;
}

.slideshow-hud-top.hud-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.hud-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(220, 38, 38, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #f87171;
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
}

.pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 8px #ef4444;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.4;
    transform: scale(0.8);
  }
}

.hud-event-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}

.hud-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.slide-counter-badge {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 700;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.hud-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
}

.hud-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.08);
}

/* HUD Overlay: Bottom */
.slideshow-hud-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2.5rem 2rem;
  background: linear-gradient(to top, rgba(8, 7, 6, 0.9), transparent);
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  pointer-events: none;
}

.slideshow-hud-bottom.hud-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.hud-slide-info {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
}

.hud-contributor {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.9375rem;
  color: #f5f2eb;
}

.hud-moment {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.8125rem;
  color: #c5a059;
}

.hud-likes {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: #f43f5e;
}

.likes-icon {
  font-size: 0.95rem;
}

.hud-controls-center {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.hud-control-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
}

.hud-control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.hud-control-btn--play {
  width: 54px;
  height: 54px;
  background: linear-gradient(135deg, #e3c578, #c5a059);
  color: #1a1614;
  border: none;
  box-shadow: 0 4px 16px rgba(197, 160, 89, 0.4);
}

.hud-control-btn--play:hover {
  transform: scale(1.12);
  box-shadow: 0 6px 22px rgba(197, 160, 89, 0.6);
}

/* Timing Progress Line */
.hud-progress-wrap {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
}

.slide-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #c5a059, #f3d483);
  animation: slideTimerProgress linear forwards;
}

@keyframes slideTimerProgress {
  from {
    width: 0%;
  }

  to {
    width: 100%;
  }
}

.hud-control-btn--active {
  background: rgba(197, 160, 89, 0.35);
  border-color: #e3c578;
  color: #fcebbb;
  box-shadow: 0 0 14px rgba(197, 160, 89, 0.4);
}

.hud-loop-pill {
  display: inline-block;
  margin-left: 0.45rem;
  padding: 0.15rem 0.45rem;
  font-size: 0.6875rem;
  font-weight: 700;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.18);
  color: #d1c7b8;
  letter-spacing: 0.04em;
  vertical-align: middle;
}

.hud-loop-pill.is-loop {
  background: rgba(197, 160, 89, 0.35);
  color: #ffd875;
}
</style>
