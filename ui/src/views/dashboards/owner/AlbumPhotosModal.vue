<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { axiosInstance } from '@/plugins/axios'
import JModal from '@/@core/components/JModal.vue'
import JBtn from '@/@core/components/JBtn.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  album: {
    type: Object,
    default: null,
  },
  eventCode: {
    type: String,
    default: '',
  },
  eventId: {
    type: [String, Number],
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'action'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const photos = ref([])
const page = ref(1)
const limit = 10
const totalPhotos = ref(0)
const hasMore = ref(true)
const isLoading = ref(false)
const isLoadingMore = ref(false)
const scrollContainerRef = ref(null)

// Lightbox state
const activePreviewPhoto = ref(null)
const isLightboxOpen = ref(false)

const openLightbox = (photo) => {
  activePreviewPhoto.value = photo
  isLightboxOpen.value = true
}

const closeLightbox = () => {
  isLightboxOpen.value = false
  activePreviewPhoto.value = null
}

// Fetch photos for the album with pagination (limit 10, descending)
const fetchAlbumPhotos = async (isLoadMore = false) => {
  if (!props.album) return
  if (isLoadMore) {
    if (isLoadingMore.value || !hasMore.value) return
    isLoadingMore.value = true
  } else {
    isLoading.value = true
    photos.value = []
    page.value = 1
    hasMore.value = true
  }

  const targetCode = props.eventCode || props.eventId || 'demo-event'
  const isCandid = Boolean(props.album.isCandid || props.album.checklistName === 'Quick Captures' || props.album.checklistId === null)
  const checklistParam = isCandid ? 'candid' : (props.album.checklistId ?? props.album.id)

  const currentPage = isLoadMore ? page.value + 1 : 1

  try {
    let res = null
    const queryParams = {
      page: currentPage,
      limit,
      checklistId: checklistParam,
    }

    try {
      res = await axiosInstance.get(`/api/photos/token/${targetCode}/photos`, { params: queryParams })
    } catch {
      res = await axiosInstance.get(`/api/photos/events/${targetCode}`, { params: queryParams })
    }

    const fetchedList = res?.data?.photos || (Array.isArray(res?.data) ? res.data : [])
    totalPhotos.value = res?.data?.total ?? (isLoadMore ? photos.value.length + fetchedList.length : fetchedList.length)

    if (isLoadMore) {
      photos.value.push(...fetchedList)
      page.value = currentPage
    } else {
      photos.value = fetchedList
      page.value = 1
    }

    // Check if more photos exist
    if (res?.data?.hasMore !== undefined) {
      hasMore.value = Boolean(res.data.hasMore)
    } else {
      hasMore.value = fetchedList.length === limit
    }
  } catch (err) {
    console.warn('[AlbumPhotosModal] Error fetching photos:', err?.message || err)
    // Fallback: if album has a cover image and photos array is empty on initial load
    if (!isLoadMore && photos.value.length === 0 && props.album?.img) {
      photos.value = [
        {
          id: props.album.id || 1,
          url: props.album.img,
          thumbnailUrl: props.album.img,
          uploadedBy: props.album.author || 'Beloved Guest',
          createdAt: new Date().toISOString(),
          checklistName: props.album.title,
          likesCount: props.album.likesCount || 0,
          isVideo: props.album.isVideo,
        },
      ]
      hasMore.value = false
    }
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

// Watch modal open and active album to trigger fetch
watch(
  () => [props.modelValue, props.album?.id],
  ([newOpen, newAlbumId]) => {
    if (newOpen && newAlbumId) {
      fetchAlbumPhotos(false)
    }
  },
  { immediate: true }
)

// Infinite scroll listener
const handleScroll = (event) => {
  const el = event.target || scrollContainerRef.value
  if (!el || isLoading.value || isLoadingMore.value || !hasMore.value) return

  const scrollTop = el.scrollTop
  const scrollHeight = el.scrollHeight
  const clientHeight = el.clientHeight

  // Trigger when within 140px of bottom
  if (scrollTop + clientHeight >= scrollHeight - 140) {
    fetchAlbumPhotos(true)
  }
}

// Format upload date
const formatUploadTime = (dateStr) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

// Download single photo
const downloadPhoto = (photo) => {
  if (!photo?.url) return
  const link = document.createElement('a')
  link.href = photo.url
  link.download = photo.fileName || `album-photo-${photo.id}.jpg`
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  emit('action', 'Photo downloaded successfully', 'success')
}

// Download entire album
const handleDownloadAlbum = () => {
  emit('action', `Preparing download for ${props.album?.title || 'Album'}...`, 'success')
}
</script>

<template>
  <div>
    <!-- Main Album Photos Modal -->
    <JModal
      v-model="isOpen"
      :title="album?.title || 'Chapter Album'"
      :subtitle="album?.chapter || 'Curated Moments'"
      size="xl"
      variant="elevated"
      :scrollable="false"
    >
      <div v-if="album" class="album-photos-modal">
        <!-- Album Header Bar -->
        <div class="album-header-bar">
          <div class="album-info-left">
            <span class="album-chapter-tag">{{ album.chapter }}</span>
            <span class="album-count-tag">
              {{ totalPhotos || photos.length }} {{ (totalPhotos || photos.length) === 1 ? 'item' : 'items' }} captured
            </span>
          </div>

          <div class="album-actions-right">
            <JBtn size="sm" color="primary" @click="handleDownloadAlbum">
              <span class="material-symbols-outlined" style="font-size: 1.1rem; margin-right: 0.35rem;">download</span>
              Download Album
            </JBtn>
          </div>
        </div>

        <!-- Scrollable Photo Grid Container -->
        <div
          ref="scrollContainerRef"
          class="album-photos-scroll-container"
          @scroll="handleScroll"
        >
          <!-- Initial Loading State -->
          <div v-if="isLoading" class="album-photos__loading">
            <div class="loading-spinner"></div>
            <p>Loading chapter moments...</p>
          </div>

          <!-- Photos Grid (Descending Order) -->
          <div v-else-if="photos.length" class="album-photos-grid">
            <div
              v-for="photo in photos"
              :key="photo.id"
              class="album-photo-card"
              @click="openLightbox(photo)"
            >
              <div class="album-photo-card__media">
                <video
                  v-if="photo.isVideo"
                  :src="photo.url"
                  class="album-photo-card__img"
                  muted
                  playsinline
                  preload="metadata"
                ></video>
                <img
                  v-else
                  :src="photo.thumbnailUrl || photo.url"
                  :alt="album.title"
                  class="album-photo-card__img"
                  loading="lazy"
                />

                <!-- Contributor Badge -->
                <span class="card-contributor-badge">
                  <span class="material-symbols-outlined badge-icon">person</span>
                  <span>{{ photo.uploadedBy || 'Guest' }}</span>
                </span>

                <!-- Likes Count Badge -->
                <span class="card-likes-badge">
                  <span class="material-symbols-outlined heart-icon">favorite</span>
                  <span>{{ photo.likesCount ?? photo.likes ?? 0 }}</span>
                </span>

                <!-- Play Icon for Video -->
                <div v-if="photo.isVideo" class="video-play-overlay">
                  <span class="material-symbols-outlined">play_arrow</span>
                </div>
              </div>

              <!-- Footer with timestamp & download -->
              <div class="album-photo-card__footer">
                <span class="photo-timestamp">
                  {{ formatUploadTime(photo.createdAt) }}
                </span>
                <button
                  type="button"
                  class="download-photo-btn"
                  title="Download Photo"
                  @click.stop="downloadPhoto(photo)"
                >
                  <span class="material-symbols-outlined">download</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="album-photos__empty">
            <span class="material-symbols-outlined empty-icon">photo_library</span>
            <h4>No Photos in This Album Yet</h4>
            <p>Guests haven't uploaded photos for this checklist moment yet. Once captured, they will appear here in chronological order.</p>
          </div>

          <!-- Infinite Scroll Loading More Indicator -->
          <div v-if="isLoadingMore" class="loading-more-bar">
            <div class="loading-spinner loading-spinner--sm"></div>
            <span>Fetching more photos...</span>
          </div>

          <!-- All Photos Loaded Message -->
          <div v-else-if="photos.length >= 10 && !hasMore" class="all-loaded-message">
            <span class="material-symbols-outlined check-circle-icon">check_circle</span>
            <span>You've reached the end of this chapter</span>
          </div>
        </div>
      </div>
    </JModal>

    <!-- Full Image / Video Lightbox Modal -->
    <JModal
      v-model="isLightboxOpen"
      :title="album?.title || 'Photo Preview'"
      :subtitle="activePreviewPhoto?.uploadedBy ? `Uploaded by ${activePreviewPhoto.uploadedBy}` : 'Chapter Moment'"
      size="lg"
      variant="elevated"
    >
      <div v-if="activePreviewPhoto" class="lightbox-content">
        <div class="lightbox-media-wrap">
          <video
            v-if="activePreviewPhoto.isVideo"
            :src="activePreviewPhoto.url"
            controls
            autoplay
            playsinline
            class="lightbox-media"
          ></video>
          <img
            v-else
            :src="activePreviewPhoto.url"
            :alt="album?.title || 'Preview'"
            class="lightbox-media"
          />
        </div>

        <div class="lightbox-footer">
          <div class="lightbox-info">
            <span class="lightbox-likes">
              <span class="material-symbols-outlined like-heart">favorite</span>
              <strong>{{ activePreviewPhoto.likesCount ?? activePreviewPhoto.likes ?? 0 }}</strong> likes
            </span>
            <span v-if="activePreviewPhoto.uploadedBy" class="lightbox-author">
              By <strong>{{ activePreviewPhoto.uploadedBy }}</strong>
            </span>
            <span v-if="activePreviewPhoto.createdAt" class="lightbox-date">
              {{ formatUploadTime(activePreviewPhoto.createdAt) }}
            </span>
          </div>

          <div class="lightbox-actions">
            <JBtn size="sm" variant="tonal" @click="closeLightbox">Close</JBtn>
            <JBtn size="sm" color="primary" @click="downloadPhoto(activePreviewPhoto)">
              <span class="material-symbols-outlined" style="font-size: 1.1rem; margin-right: 0.35rem;">download</span>
              Download
            </JBtn>
          </div>
        </div>
      </div>
    </JModal>
  </div>
</template>

<style scoped lang="scss">
.album-photos-modal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.album-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  background: var(--bg-surface-tonal, rgba(197, 160, 89, 0.06));
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.18));
  border-radius: var(--radius-lg, 0.75rem);
  flex-wrap: wrap;
}

.album-info-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.album-chapter-tag {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--primary, #c5a059);
  padding: 0.2rem 0.6rem;
  background: rgba(197, 160, 89, 0.12);
  border-radius: 9999px;
}

.album-count-tag {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary, #665c4d);
}

// Scroll Container for Infinite Scrolling
.album-photos-scroll-container {
  max-height: 580px;
  overflow-y: auto;
  padding: 0.35rem;
  scroll-behavior: smooth;
}

// Photos Grid
.album-photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.album-photo-card {
  border-radius: var(--radius-md, 0.5rem);
  overflow: hidden;
  background: var(--bg-surface-elevated, #fff);
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.18));
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
    border-color: var(--primary, #c5a059);
  }
}

.album-photo-card__media {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background: #000;
  overflow: hidden;
}

.album-photo-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;

  .album-photo-card:hover & {
    transform: scale(1.03);
  }
}

.card-contributor-badge {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 0.6875rem;
  font-weight: 600;
  max-width: 75%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .badge-icon {
    font-size: 0.85rem;
    color: var(--primary, #c5a059);
  }
}

.card-likes-badge {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;

  .heart-icon {
    font-size: 0.9rem;
    color: #e05252;
  }
}

.video-play-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;

  span {
    font-size: 1.5rem;
  }
}

.album-photo-card__footer {
  padding: 0.6rem 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.12));
}

.photo-timestamp {
  font-size: 0.75rem;
  color: var(--text-secondary, #665c4d);
}

.download-photo-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #665c4d);
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  span {
    font-size: 1.1rem;
  }

  &:hover {
    color: var(--primary, #c5a059);
    background: rgba(197, 160, 89, 0.12);
  }
}

// Loading & Empty States
.album-photos__loading,
.album-photos__empty {
  text-align: center;
  padding: 3.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-secondary, #665c4d);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(197, 160, 89, 0.2);
  border-top-color: var(--primary, #c5a059);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  &--sm {
    width: 20px;
    height: 20px;
    border-width: 2px;
  }
}

.empty-icon {
  font-size: 2.75rem;
  color: var(--primary, #c5a059);
  opacity: 0.7;
}

// Loading More Bar
.loading-more-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 1.25rem 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary, #665c4d);
}

.all-loaded-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 1.5rem 0 0.5rem;
  font-size: 0.8125rem;
  color: var(--text-secondary, #8c8273);

  .check-circle-icon {
    font-size: 1.1rem;
    color: var(--primary, #c5a059);
  }
}

// Lightbox Styles
.lightbox-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.lightbox-media-wrap {
  width: 100%;
  max-height: 520px;
  border-radius: var(--radius-md, 0.5rem);
  overflow: hidden;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-media {
  max-width: 100%;
  max-height: 520px;
  object-fit: contain;
}

.lightbox-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.lightbox-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary, #665c4d);
  flex-wrap: wrap;
}

.lightbox-likes {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;

  .like-heart {
    font-size: 1.1rem;
    color: #e05252;
  }
}

.lightbox-author {
  font-size: 0.8125rem;
}

.lightbox-date {
  font-size: 0.75rem;
  color: var(--text-secondary, #8c8273);
}

.lightbox-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
