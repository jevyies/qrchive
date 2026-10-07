<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { axiosInstance } from '@/plugins/axios'
import JModal from '@/@core/components/JModal.vue'
import JBtn from '@/@core/components/JBtn.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  guest: {
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
const isLoading = ref(false)
const selectedChecklist = ref('all')
const isChecklistDropdownOpen = ref(false)
const checklistDropdownRef = ref(null)

// Lightbox state for enlarging photo
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

const closeChecklistDropdown = () => {
  isChecklistDropdownOpen.value = false
}

const handleDocumentClick = (e) => {
  if (checklistDropdownRef.value && !checklistDropdownRef.value.contains(e.target)) {
    isChecklistDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})

// Fetch guest uploaded photos when modal opens or guest changes
const fetchPhotos = async () => {
  if (!props.guest) return
  isLoading.value = true
  photos.value = []
  selectedChecklist.value = 'all'

  try {
    const targetCode = props.eventCode || props.eventId || 'demo-event'
    const guestIdentifier = props.guest.guestCode || props.guest.id

    // Try token route first, then eventId fallback
    let res = null
    try {
      res = await axiosInstance.get(`/api/photos/token/${targetCode}/guests/${guestIdentifier}`)
    } catch {
      res = await axiosInstance.get(`/api/photos/events/${targetCode}/guests/${guestIdentifier}`)
    }

    if (res?.data?.photos) {
      photos.value = res.data.photos
    } else if (Array.isArray(res?.data)) {
      photos.value = res.data
    }
  } catch (err) {
    console.warn('[GuestPhotosModal] Error fetching guest photos:', err?.message || err)
    // Fallback: if guest has a coverPhoto or preview, provide it as a fallback photo
    if (props.guest?.coverPhoto) {
      photos.value = [
        {
          id: 1,
          url: props.guest.coverPhoto,
          thumbnailUrl: props.guest.coverPhoto,
          uploadedBy: props.guest.name,
          createdAt: props.guest.firstUploadedAt || new Date().toISOString(),
          checklistName: 'Quick Captures',
          checklistId: null,
          likesCount: props.guest.totalLikes || 0,
          isVideo: false,
        },
      ]
    }
  } finally {
    isLoading.value = false
  }
}

watch(
  () => [props.modelValue, props.guest?.id],
  ([newOpen, newGuestId]) => {
    if (newOpen && newGuestId) {
      fetchPhotos()
    }
  },
  { immediate: true }
)

// Compute unique checklist groups for dropdown filter
const checklistOptions = computed(() => {
  const map = new Map()
  photos.value.forEach((p) => {
    const name = p.checklistName || (p.checklistId ? `Checklist #${p.checklistId}` : 'Quick Captures')
    const key = p.checklistId !== null && p.checklistId !== undefined ? String(p.checklistId) : name
    if (!map.has(key)) {
      map.set(key, { key, name, count: 0 })
    }
    map.get(key).count++
  })

  return Array.from(map.values())
})

// Active dropdown label
const selectedChecklistLabel = computed(() => {
  if (selectedChecklist.value === 'all') {
    return `All Checklists (${photos.value.length})`
  }
  const match = checklistOptions.value.find((opt) => opt.key === selectedChecklist.value)
  return match ? `${match.name} (${match.count})` : 'All Checklists'
})

// Filtered photos based on selected checklist dropdown
const filteredPhotos = computed(() => {
  if (selectedChecklist.value === 'all') return photos.value
  return photos.value.filter((p) => {
    const name = p.checklistName || (p.checklistId ? `Checklist #${p.checklistId}` : 'Quick Captures')
    const key = p.checklistId !== null && p.checklistId !== undefined ? String(p.checklistId) : name
    return key === selectedChecklist.value || p.checklistName === selectedChecklist.value
  })
})

// Format upload date
const formatUploadTime = (dateStr) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

// Download photo helper
const downloadPhoto = (photo) => {
  if (!photo?.url) return
  const link = document.createElement('a')
  link.href = photo.url
  link.download = photo.fileName || `guest-photo-${photo.id}.jpg`
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  emit('action', 'Photo downloaded successfully', 'success')
}

// Guest initials avatar
const guestInitials = computed(() => {
  const name = props.guest?.name || 'Guest'
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join('')
})
</script>

<template>
  <div>
    <!-- Main Guest Photos Modal -->
    <JModal
      v-model="isOpen"
      :title="guest?.name || 'Guest Photos'"
      subtitle="Guest Uploads &amp; Contributions"
      size="xl"
      variant="elevated"
      :scrollable="true"
    >
      <div v-if="guest" class="guest-photos-modal">
        <!-- Guest Profile Banner -->
        <div class="guest-banner">
          <div class="guest-avatar-wrap">
            <img
              v-if="guest.coverPhoto"
              :src="guest.coverPhoto"
              :alt="guest.name"
              class="guest-avatar-img"
            />
            <div v-else class="guest-avatar-fallback">
              {{ guestInitials }}
            </div>
          </div>

          <div class="guest-meta">
            <div class="guest-name-row">
              <h3 class="guest-name">{{ guest.name }}</h3>
              <span v-if="guest.deviceName" class="guest-device-pill">
                <span class="material-symbols-outlined pill-icon">smartphone</span>
                {{ guest.deviceName }}
              </span>
            </div>

            <div class="guest-stats-row">
              <span class="guest-stat-pill">
                <span class="material-symbols-outlined stat-icon">photo_library</span>
                <strong>{{ photos.length || guest.totalMedia || 0 }}</strong> uploads
              </span>
              <span class="guest-stat-pill guest-stat-pill--likes">
                <span class="material-symbols-outlined stat-icon">favorite</span>
                <strong>{{ guest.totalLikes || 0 }}</strong> total likes
              </span>
              <span v-if="guest.firstChecklistUploadedAt || guest.firstUploadedAt" class="guest-stat-pill">
                <span class="material-symbols-outlined stat-icon">schedule</span>
                First captured at {{ formatUploadTime(guest.firstChecklistUploadedAt || guest.firstUploadedAt) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Filter Controls Bar -->
        <div class="guest-filter-bar">
          <div class="filter-label-group">
            <span class="material-symbols-outlined filter-icon">tune</span>
            <span class="filter-title">Filter by Checklist:</span>
          </div>

          <!-- Checklist Dropdown with 'All' default -->
          <div ref="checklistDropdownRef" class="checklist-dropdown">
            <button
              type="button"
              class="checklist-dropdown__btn"
              :class="{ 'is-open': isChecklistDropdownOpen }"
              @click.stop="isChecklistDropdownOpen = !isChecklistDropdownOpen"
              aria-expanded="isChecklistDropdownOpen"
            >
              <span class="dropdown-selected-text">{{ selectedChecklistLabel }}</span>
              <span class="material-symbols-outlined dropdown-arrow">
                {{ isChecklistDropdownOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down' }}
              </span>
            </button>

            <!-- Dropdown Menu -->
            <div :class="['checklist-dropdown__menu', { 'is-active': isChecklistDropdownOpen }]">
              <button
                type="button"
                class="checklist-dropdown__item"
                :class="{ 'is-active': selectedChecklist === 'all' }"
                @click="selectedChecklist = 'all'; closeChecklistDropdown()"
              >
                <div class="item-left">
                  <span class="dot-indicator"></span>
                  <span>All Checklists</span>
                </div>
                <div class="item-right">
                  <span class="count-pill">{{ photos.length }}</span>
                  <span v-if="selectedChecklist === 'all'" class="material-symbols-outlined check-icon">check</span>
                </div>
              </button>

              <div v-if="checklistOptions.length" class="dropdown-divider"></div>

              <button
                v-for="opt in checklistOptions"
                :key="opt.key"
                type="button"
                class="checklist-dropdown__item"
                :class="{ 'is-active': selectedChecklist === opt.key }"
                @click="selectedChecklist = opt.key; closeChecklistDropdown()"
              >
                <div class="item-left">
                  <span class="dot-indicator"></span>
                  <span class="checklist-name-truncate">{{ opt.name }}</span>
                </div>
                <div class="item-right">
                  <span class="count-pill">{{ opt.count }}</span>
                  <span v-if="selectedChecklist === opt.key" class="material-symbols-outlined check-icon">check</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="guest-photos__loading">
          <div class="loading-spinner"></div>
          <p>Loading guest media...</p>
        </div>

        <!-- Photos Grid -->
        <div v-else-if="filteredPhotos.length" class="guest-photos-grid">
          <div
            v-for="photo in filteredPhotos"
            :key="photo.id"
            class="guest-photo-card"
            @click="openLightbox(photo)"
          >
            <div class="guest-photo-card__media">
              <video
                v-if="photo.isVideo"
                :src="photo.url"
                class="photo-card-img"
                muted
                playsinline
                preload="metadata"
              ></video>
              <img
                v-else
                :src="photo.thumbnailUrl || photo.url"
                :alt="photo.checklistName || 'Guest photo'"
                class="photo-card-img"
                loading="lazy"
              />

              <!-- Checklist Badge -->
              <span class="photo-card__badge-checklist">
                {{ photo.checklistName || (photo.checklistId ? `Checklist #${photo.checklistId}` : 'Quick Captures') }}
              </span>

              <!-- Likes Count Badge -->
              <span class="photo-card__badge-likes">
                <span class="material-symbols-outlined like-icon">favorite</span>
                <span>{{ photo.likesCount ?? photo.likes ?? 0 }}</span>
              </span>

              <!-- Video Icon Overlay if video -->
              <div v-if="photo.isVideo" class="video-overlay-badge">
                <span class="material-symbols-outlined">play_arrow</span>
              </div>
            </div>

            <div class="guest-photo-card__meta">
              <span class="upload-time">
                {{ formatUploadTime(photo.createdAt) }}
              </span>
              <button
                type="button"
                class="download-mini-btn"
                title="Download Photo"
                @click.stop="downloadPhoto(photo)"
              >
                <span class="material-symbols-outlined">download</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="guest-photos__empty">
          <span class="material-symbols-outlined empty-icon">photo_library</span>
          <h4>No Photos in This Checklist</h4>
          <p>This guest has not uploaded any photos under this specific category yet.</p>
          <JBtn size="sm" variant="tonal" color="primary" @click="selectedChecklist = 'all'">
            View All Uploads ({{ photos.length }})
          </JBtn>
        </div>
      </div>
    </JModal>

    <!-- Full Image Lightbox Preview -->
    <JModal
      v-model="isLightboxOpen"
      :title="activePreviewPhoto?.checklistName || 'Photo Preview'"
      :subtitle="`Uploaded by ${guest?.name || 'Guest'}`"
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
            :alt="activePreviewPhoto.checklistName || 'Photo preview'"
            class="lightbox-media"
          />
        </div>

        <div class="lightbox-footer">
          <div class="lightbox-info">
            <span class="lightbox-likes">
              <span class="material-symbols-outlined like-heart">favorite</span>
              <strong>{{ activePreviewPhoto.likesCount ?? activePreviewPhoto.likes ?? 0 }}</strong> likes
            </span>
            <span v-if="activePreviewPhoto.createdAt" class="lightbox-date">
              Captured at {{ formatUploadTime(activePreviewPhoto.createdAt) }}
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
.guest-photos-modal {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.guest-banner {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem;
  background: var(--bg-surface-tonal, rgba(197, 160, 89, 0.06));
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.18));
  border-radius: var(--radius-lg, 0.75rem);

  @media (max-width: 640px) {
    flex-direction: column;
    text-align: center;
  }
}

.guest-avatar-wrap {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid var(--primary, #c5a059);
  box-shadow: 0 4px 12px rgba(197, 160, 89, 0.2);
}

.guest-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.guest-avatar-fallback {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--primary, #c5a059), #9b7a38);
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.05em;
}

.guest-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.guest-name-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    justify-content: center;
  }
}

.guest-name {
  margin: 0;
  font-family: var(--font-heading, 'Playfair Display', Georgia, serif);
  font-size: 1.45rem;
  font-weight: 600;
  color: var(--text-primary, #1f1b18);
}

.guest-device-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  background: rgba(197, 160, 89, 0.12);
  color: var(--primary, #c5a059);
  font-size: 0.75rem;
  font-weight: 600;

  .pill-icon {
    font-size: 0.95rem;
  }
}

.guest-stats-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    justify-content: center;
  }
}

.guest-stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  color: var(--text-secondary, #665c4d);

  .stat-icon {
    font-size: 1.05rem;
    color: var(--primary, #c5a059);
  }

  &--likes .stat-icon {
    color: #e05252;
  }
}

// Filter Bar
.guest-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.75rem 1rem;
  background: var(--bg-surface-elevated, #fff);
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.16));
  border-radius: var(--radius-md, 0.5rem);
}

.filter-label-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary, #1f1b18);

  .filter-icon {
    font-size: 1.15rem;
    color: var(--primary, #c5a059);
  }
}

// Checklist Dropdown
.checklist-dropdown {
  position: relative;
  display: inline-block;
}

.checklist-dropdown__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 1rem;
  border-radius: 9999px;
  background: var(--bg-surface-tonal, rgba(197, 160, 89, 0.08));
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.25));
  font-size: 0.78125rem;
  font-weight: 600;
  color: var(--text-primary, #1f1b18);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover,
  &.is-open {
    border-color: var(--primary, #c5a059);
    background: rgba(197, 160, 89, 0.14);
  }

  .dropdown-arrow {
    font-size: 1.15rem;
    color: var(--primary, #c5a059);
  }
}

.checklist-dropdown__menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 100;
  min-width: 240px;
  max-width: 320px;
  max-height: 280px;
  overflow-y: auto;
  background: var(--bg-surface-elevated, #ffffff);
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.22));
  border-radius: var(--radius-md, 0.5rem);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
  padding: 0.35rem 0;
  display: none;

  &.is-active {
    display: block;
    animation: fadeInDown 0.15s ease-out;
  }
}

.checklist-dropdown__item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.85rem;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 0.8125rem;
  color: var(--text-primary, #1f1b18);
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(197, 160, 89, 0.08);
  }

  &.is-active {
    background: rgba(197, 160, 89, 0.14);
    font-weight: 600;
    color: var(--primary, #c5a059);
  }

  .item-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    overflow: hidden;
  }

  .dot-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--primary, #c5a059);
    flex-shrink: 0;
  }

  .checklist-name-truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 170px;
  }

  .item-right {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .count-pill {
    padding: 0.1rem 0.45rem;
    border-radius: 9999px;
    background: rgba(197, 160, 89, 0.12);
    font-size: 0.6875rem;
    color: var(--text-secondary, #665c4d);
  }

  .check-icon {
    font-size: 1rem;
    color: var(--primary, #c5a059);
  }
}

.dropdown-divider {
  height: 1px;
  margin: 0.25rem 0;
  background: var(--border-color-subtle, rgba(197, 160, 89, 0.15));
}

// Photos Grid
.guest-photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 1rem;
  max-height: 520px;
  overflow-y: auto;
  padding: 0.25rem;
}

.guest-photo-card {
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

.guest-photo-card__media {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background: #000;
  overflow: hidden;
}

.photo-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;

  .guest-photo-card:hover & {
    transform: scale(1.03);
  }
}

.photo-card__badge-checklist {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
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
}

.photo-card__badge-likes {
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

  .like-icon {
    font-size: 0.9rem;
    color: #e05252;
  }
}

.video-overlay-badge {
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

.guest-photo-card__meta {
  padding: 0.6rem 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.12));
}

.upload-time {
  font-size: 0.75rem;
  color: var(--text-secondary, #665c4d);
}

.download-mini-btn {
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
.guest-photos__loading,
.guest-photos__empty {
  text-align: center;
  padding: 3rem 1.5rem;
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
}

.empty-icon {
  font-size: 2.75rem;
  color: var(--primary, #c5a059);
  opacity: 0.7;
}

// Lightbox
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

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
