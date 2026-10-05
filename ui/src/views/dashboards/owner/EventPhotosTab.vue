<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import JBtn from '@/@core/components/JBtn.vue'
import JModal from '@/@core/components/JModal.vue'

const props = defineProps({
  albums: {
    type: Array,
    default: () => [],
  },
  isLoadingAlbums: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['action'])

// Album filter: 'all' or specific checklistName
const albumFilter = ref('all')

// Dropdown state for album filter
const isAlbumDropdownOpen = ref(false)
const albumDropdownRef = ref(null)

const toggleAlbumDropdown = () => {
  isAlbumDropdownOpen.value = !isAlbumDropdownOpen.value
}

const selectAllAlbums = () => {
  albumFilter.value = 'all'
  isAlbumDropdownOpen.value = false
}

const selectAlbum = (album) => {
  if (albumFilter.value === album.checklistName) {
    albumFilter.value = 'all'
  } else {
    albumFilter.value = album.checklistName
  }
  isAlbumDropdownOpen.value = false
}

const isAlbumSelected = (album) => {
  return albumFilter.value === album.checklistName || albumFilter.value === album.id
}

const selectedAlbum = computed(() => {
  if (albumFilter.value === 'all') return null
  return (
    props.albums.find(
      (a) => a.checklistName === albumFilter.value || a.id === albumFilter.value
    ) || null
  )
})

const dropdownButtonLabel = computed(() => {
  if (selectedAlbum.value) {
    const count = selectedAlbum.value.photosCountNum ?? selectedAlbum.value.totalItems ?? 0
    return `${selectedAlbum.value.title} (${count})`
  }
  return 'Other Checklists'
})

const handleDocumentClick = (e) => {
  if (albumDropdownRef.value && !albumDropdownRef.value.contains(e.target)) {
    isAlbumDropdownOpen.value = false
  }
}

// Regular checklist albums
const regularAlbums = computed(() => {
  return props.albums.filter((a) => !a.isCandid)
})

// Dedicated Candid Album (Quick Captures)
const candidAlbum = computed(() => {
  return props.albums.find((a) => a.isCandid) || null
})

// Filtered regular albums
const regularFilteredAlbums = computed(() => {
  if (albumFilter.value === 'all') return regularAlbums.value
  if (albumFilter.value === 'candid' || (candidAlbum.value && albumFilter.value === candidAlbum.value.checklistName)) {
    return []
  }
  return regularAlbums.value.filter((a) => a.checklistName === albumFilter.value)
})

// Whether candid card is visible under current filter
const isCandidVisible = computed(() => {
  if (!candidAlbum.value) return false
  if (albumFilter.value === 'all' || albumFilter.value === 'candid') return true
  return albumFilter.value === candidAlbum.value.checklistName
})

// Helper to determine if an album cover media is a video
const isVideoMedia = (album) => {
  if (!album) return false
  if (album.isVideo) return true
  const url = album.img || album.url || ''
  if (typeof url === 'string') {
    return /\.(mp4|webm|mov|ogg)($|\?)/i.test(url)
  }
  return false
}

// Stop card preview video at 5 seconds without looping
const handleVideoTimeUpdate = (event) => {
  const video = event?.target
  if (video && video.currentTime >= 5) {
    video.pause()
  }
}

// Album Preview Modal
const isAlbumModalOpen = ref(false)
const activeAlbum = ref(null)

const openAlbumModal = (album) => {
  activeAlbum.value = album
  isAlbumModalOpen.value = true
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div class="event-detail__tab-body">
    <div class="event-albums__header">
      <div class="event-albums__title-group">
        <span class="event-albums__subtitle">Curated Chapters</span>
        <h2 class="event-albums__title">Reception Program Moments</h2>
      </div>

      <div class="event-albums__filters" v-if="albums.length">
        <!-- All Albums Button -->
        <button
          type="button"
          class="event-albums__filter-pill"
          :class="{ 'is-active': albumFilter === 'all' }"
          @click="selectAllAlbums"
        >
          All Checklists ({{ albums.length }})
        </button>

        <!-- Other Albums Dropdown -->
        <div ref="albumDropdownRef" class="event-albums__filter-dropdown">
          <button
            type="button"
            class="event-albums__filter-pill event-albums__filter-pill--dropdown"
            :class="{ 'is-active': albumFilter !== 'all' }"
            @click.stop="toggleAlbumDropdown"
            :aria-expanded="isAlbumDropdownOpen"
            :title="selectedAlbum ? `Filtered by ${selectedAlbum.title}` : 'Filter by other albums'"
          >
            <span class="dropdown-pill-text">{{ dropdownButtonLabel }}</span>
            <span
              v-if="albumFilter !== 'all'"
              class="dropdown-pill-clear"
              title="Clear filter"
              @click.stop="selectAllAlbums"
            >
              <span class="material-symbols-outlined clear-icon">close</span>
            </span>
            <span
              class="material-symbols-outlined dropdown-pill-arrow"
              :class="{ 'is-flipped': isAlbumDropdownOpen }"
            >
              keyboard_arrow_down
            </span>
          </button>

          <!-- Dropdown Menu -->
          <div :class="['event-albums__dropdown-menu', { show: isAlbumDropdownOpen }]">
            <div class="event-albums__dropdown-header">Filter by Specific Album</div>

            <button
              type="button"
              :class="['event-albums__dropdown-item', { 'is-selected': albumFilter === 'all' }]"
              @click="selectAllAlbums"
            >
              <div class="dropdown-item-left">
                <span class="album-dot"></span>
                <span class="album-title">All Albums</span>
              </div>
              <div class="dropdown-item-right">
                <span class="album-badge">{{ albums.length }}</span>
                <span v-if="albumFilter === 'all'" class="material-symbols-outlined check-icon">check</span>
              </div>
            </button>

            <div class="event-albums__dropdown-divider"></div>

            <button
              v-for="album in albums"
              :key="album.id"
              type="button"
              :class="['event-albums__dropdown-item', { 'is-selected': isAlbumSelected(album) }]"
              @click="selectAlbum(album)"
            >
              <div class="dropdown-item-left">
                <span class="album-dot" :class="{ 'album-dot--candid': album.isCandid }"></span>
                <span class="album-title">{{ album.title }}</span>
              </div>
              <div class="dropdown-item-right">
                <span class="album-badge">{{ album.photosCountNum ?? album.totalItems ?? 0 }}</span>
                <span v-if="isAlbumSelected(album)" class="material-symbols-outlined check-icon">check</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Albums Grid -->
    <div class="event-albums__grid">
      <!-- Checklist Albums -->
      <div v-for="album in regularFilteredAlbums" :key="album.id" class="event-album-card">
        <div>
          <div class="event-album-card__media">
            <video
              v-if="isVideoMedia(album)"
              :src="album.img"
              class="event-album-card__img"
              muted
              playsinline
              autoplay
              preload="metadata"
              @timeupdate="handleVideoTimeUpdate"
            ></video>
            <img v-else :src="album.img" :alt="album.title" class="event-album-card__img" loading="lazy" />
            <span class="event-album-card__badge-top">{{ album.chapter }}</span>
            <span class="event-album-card__badge-bottom">{{ album.photosCount }}</span>
          </div>
          <div class="event-album-card__body">
            <h3 class="event-album-card__title">{{ album.title }}</h3>
            <p class="event-album-card__author">
              <span class="material-symbols-outlined author-icon">person_pin</span>
              <span>Latest by <strong>{{ album.author }}</strong></span>
            </p>
          </div>
        </div>

        <div class="event-album-card__footer">
          <button type="button" class="event-album-card__btn" @click="openAlbumModal(album)">
            <span>View Album</span>
            <span class="material-symbols-outlined btn-arrow">arrow_forward</span>
          </button>
        </div>
      </div>

      <!-- Dedicated Candids Card (Quick Captures) -->
      <div v-if="isCandidVisible && candidAlbum" class="event-album-card event-album-card--candid">
        <div class="event-album-card__layout">
          <div class="event-album-card__media">
            <video
              v-if="isVideoMedia(candidAlbum)"
              :src="candidAlbum.img"
              class="event-album-card__img"
              muted
              playsinline
              autoplay
              preload="metadata"
              @timeupdate="handleVideoTimeUpdate"
            ></video>
            <img v-else :src="candidAlbum.img" :alt="candidAlbum.title" class="event-album-card__img" loading="lazy" />
            <span class="event-album-card__badge-top event-album-card__badge-top--gold">Dedicated Candid Vault</span>
            <span class="event-album-card__badge-bottom">{{ candidAlbum.photosCount }}</span>
          </div>

          <div class="event-album-card__content-candid">
            <div>
              <div
                style="display: inline-flex; align-items: center; gap: 0.25rem; color: var(--primary); margin-bottom: 0.35rem;"
              >
                <span class="material-symbols-outlined" style="font-size: 1.1rem;">auto_awesome</span>
                <span
                  style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700;"
                >
                  Spontaneous &amp; Real
                </span>
              </div>
              <h3 class="event-albums__title" style="font-size: 1.35rem;">{{ candidAlbum.title }}</h3>
              <p style="font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.6; margin-top: 0.5rem;">
                {{
                  candidAlbum.description ||
                  `Spontaneous guest selfies, table decor snaps, after-party dance floor joy, and intimate behind-the-scenes moments not tied to specific checklist events.`
                }}
              </p>
              <p
                style="font-size: 0.8125rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.35rem; margin-top: 0.75rem;"
              >
                <span class="material-symbols-outlined" style="font-size: 1rem; color: var(--primary);">group</span>
                <span>Latest contributor: <strong>{{ candidAlbum.author }}</strong></span>
              </p>
            </div>

            <div style="padding-top: 1.25rem;">
              <button
                type="button"
                class="event-album-card__btn event-album-card__btn--primary"
                @click="openAlbumModal(candidAlbum)"
              >
                <span>Explore All Candids</span>
                <span class="material-symbols-outlined btn-arrow">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state when no albums exist -->
      <div
        v-if="albums.length === 0 && !isLoadingAlbums"
        class="event-albums__empty"
        style="grid-column: 1 / -1; padding: 4rem 1rem; text-align: center; border-radius: var(--radius-xl, 0.75rem); background: var(--bg-surface-elevated, #fff); border: 1px dashed var(--border-color-subtle, rgba(197, 160, 89, 0.2));"
      >
        <span
          class="material-symbols-outlined"
          style="font-size: 3rem; color: var(--primary, #c5a059); opacity: 0.8;"
        >
          photo_library
        </span>
        <h3 style="font-size: 1.25rem; font-weight: 600; margin: 0.75rem 0 0.5rem; color: var(--text-primary);">
          No Media Uploaded Yet
        </h3>
        <p
          style="font-size: 0.875rem; color: var(--text-secondary); max-width: 440px; margin: 0 auto; line-height: 1.6;"
        >
          Guests have not uploaded photos or checklist moments for this event yet. Once photos are taken via the live vault, they will appear here organized by chapter.
        </p>
      </div>
    </div>

    <!-- Interactive Album Preview Modal -->
    <JModal
      v-model="isAlbumModalOpen"
      :title="activeAlbum?.title || 'Album Viewer'"
      :subtitle="activeAlbum?.chapter || 'Chapter Album'"
      size="md"
      variant="elevated"
    >
      <div v-if="activeAlbum" style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="width: 100%; height: 260px; border-radius: 0.75rem; overflow: hidden; background: #000;">
          <video
            v-if="isVideoMedia(activeAlbum)"
            :src="activeAlbum.img"
            controls
            autoplay
            playsinline
            style="width: 100%; height: 100%; object-fit: contain;"
          ></video>
          <img
            v-else
            :src="activeAlbum.img"
            :alt="activeAlbum.title"
            style="width: 100%; height: 100%; object-fit: cover;"
          />
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.8125rem; color: var(--text-secondary);">
            {{ activeAlbum.photosCount }}
          </span>
          <span style="font-size: 0.8125rem; color: var(--text-secondary);">
            Latest contributor: <strong>{{ activeAlbum.author }}</strong>
          </span>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem;">
          <JBtn size="sm" variant="tonal" @click="isAlbumModalOpen = false">
            Close
          </JBtn>
          <JBtn
            size="sm"
            color="primary"
            @click="emit('action', `Downloading photos for ${activeAlbum.title}...`, 'success')"
          >
            Download Album
          </JBtn>
        </div>
      </div>
    </JModal>
  </div>
</template>
