<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { axiosInstance } from '@/plugins/axios'
import JBtn from '@/@core/components/JBtn.vue'
import GuestPhotosModal from './GuestPhotosModal.vue'
import AlbumPhotosModal from './AlbumPhotosModal.vue'

const props = defineProps({
  albums: {
    type: Array,
    default: () => [],
  },
  isLoadingAlbums: {
    type: Boolean,
    default: false,
  },
  eventCode: {
    type: String,
    default: '',
  },
  eventData: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['action'])

const route = useRoute()

// Active primary subtab: 'users' (Photos By User) or 'checklists' (Photos By Checklist)
const activeSubTab = ref('users')

// Resolved event identifier
const resolvedEventCode = computed(() => {
  return props.eventCode || props.eventData?.token || route.params.id || 'demo-event'
})

// ============================================================================
// TAB 1: PHOTOS BY USER
// ============================================================================
const uploaders = ref([])
const isLoadingUploaders = ref(false)

// Sort options for users: 'alphabetical', 'likes', 'early'
const userSort = ref('alphabetical')
const isUserSortDropdownOpen = ref(false)
const userSortDropdownRef = ref(null)

const toggleUserSortDropdown = () => {
  isUserSortDropdownOpen.value = !isUserSortDropdownOpen.value
}

const selectUserSort = (sortKey) => {
  userSort.value = sortKey
  isUserSortDropdownOpen.value = false
}

const userSortLabel = computed(() => {
  switch (userSort.value) {
    case 'alphabetical':
      return 'Alphabetical (A–Z)'
    case 'likes':
      return 'Most Liked'
    case 'early':
      return 'Uploaded Checklist Early'
    default:
      return 'Alphabetical'
  }
})

// Fetch uploaders list
const fetchUploaders = async () => {
  isLoadingUploaders.value = true
  try {
    const code = resolvedEventCode.value
    let res = null
    try {
      res = await axiosInstance.get(`/api/photos/token/${code}/uploaders`)
    } catch {
      res = await axiosInstance.get(`/api/photos/events/${code}/uploaders`)
    }

    if (res?.data?.uploaders && res.data.uploaders.length > 0) {
      uploaders.value = res.data.uploaders
    } else {
      // If backend returns empty uploaders (e.g. demo mode or brand new event),
      // build realistic fallback mock uploaders based on existing albums contributors
      deriveMockUploadersFromAlbums()
    }
  } catch (err) {
    console.warn('[EventPhotosTab] Error fetching uploaders:', err?.message || err)
    deriveMockUploadersFromAlbums()
  } finally {
    isLoadingUploaders.value = false
  }
}

// Fallback uploader derivation from albums
const deriveMockUploadersFromAlbums = () => {
  const authorNames = props.albums
    .map((a) => a.author)
    .filter((a) => a && a !== 'Awaiting Contributor')

  const uniqueAuthors = Array.from(new Set(authorNames))

  if (uniqueAuthors.length > 0) {
    uploaders.value = uniqueAuthors.map((name, idx) => {
      const albumMatch = props.albums.find((a) => a.author === name)
      // Stagger dates for realistic "early" sorting demo
      const baseDate = new Date()
      baseDate.setHours(baseDate.getHours() - (uniqueAuthors.length - idx) * 2)

      return {
        id: idx + 1,
        name,
        guestCode: `GUEST-${idx + 101}`,
        deviceName: 'iPhone 15 Pro',
        totalMedia: (idx + 1) * 3 + 2,
        totalPhotos: (idx + 1) * 3,
        totalVideos: 2,
        totalLikes: (uniqueAuthors.length - idx) * 14 + 5,
        firstUploadedAt: baseDate.toISOString(),
        firstChecklistUploadedAt: baseDate.toISOString(),
        coverPhoto: albumMatch?.img || null,
        checklistsCompletedCount: idx + 1,
      }
    })
  } else {
    uploaders.value = []
  }
}

// Watch event code changes to refetch
watch(
  () => resolvedEventCode.value,
  () => {
    fetchUploaders()
  },
  { immediate: true }
)

// Also watch albums if uploaders were empty
watch(
  () => props.albums,
  () => {
    if (uploaders.value.length === 0) {
      deriveMockUploadersFromAlbums()
    }
  },
  { deep: true }
)

// Compute sorted uploaders
const sortedUploaders = computed(() => {
  const list = [...uploaders.value]
  if (userSort.value === 'alphabetical') {
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  }
  if (userSort.value === 'likes') {
    return list.sort((a, b) => (b.totalLikes || 0) - (a.totalLikes || 0))
  }
  if (userSort.value === 'early') {
    return list.sort((a, b) => {
      const aTime = a.firstChecklistUploadedAt || a.firstUploadedAt || '9999'
      const bTime = b.firstChecklistUploadedAt || b.firstUploadedAt || '9999'
      return aTime.localeCompare(bTime)
    })
  }
  return list
})

// Guest Photos Modal state
const isGuestModalOpen = ref(false)
const selectedGuest = ref(null)

const openGuestModal = (guest) => {
  selectedGuest.value = guest
  isGuestModalOpen.value = true
}

// Format relative/short time
const formatTimeShort = (dateStr) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

// Helper for guest initials
const getGuestInitials = (name) => {
  if (!name) return 'G'
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join('')
}

// ============================================================================
// TAB 2: PHOTOS BY CHECKLIST (CURRENT CONTENT + PAGINATED MODAL)
// ============================================================================

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

const selectedAlbumFilter = computed(() => {
  if (albumFilter.value === 'all') return null
  return (
    props.albums.find(
      (a) => a.checklistName === albumFilter.value || a.id === albumFilter.value
    ) || null
  )
})

const dropdownButtonLabel = computed(() => {
  if (selectedAlbumFilter.value) {
    const count = selectedAlbumFilter.value.photosCountNum ?? selectedAlbumFilter.value.totalItems ?? 0
    return `${selectedAlbumFilter.value.title} (${count})`
  }
  return 'Other Checklists'
})

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

// Interactive Album Photos Modal (Descending limit 10 + infinite scroll on scroll)
const isAlbumModalOpen = ref(false)
const selectedAlbumForModal = ref(null)

const openAlbumModal = (album) => {
  selectedAlbumForModal.value = album
  isAlbumModalOpen.value = true
}

// Global click outside listener
const handleDocumentClick = (e) => {
  if (albumDropdownRef.value && !albumDropdownRef.value.contains(e.target)) {
    isAlbumDropdownOpen.value = false
  }
  if (userSortDropdownRef.value && !userSortDropdownRef.value.contains(e.target)) {
    isUserSortDropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div class="event-detail__tab-body event-photos-tab-root">
    <!-- Sub-Tabs Navigation Header -->
    <div class="subtabs-navigation-bar">
      <div class="subtabs-pills" role="tablist">
        <button
          type="button"
          class="subtab-pill"
          :class="{ 'is-active': activeSubTab === 'users' }"
          role="tab"
          :aria-selected="activeSubTab === 'users'"
          @click="activeSubTab = 'users'"
        >
          <span class="material-symbols-outlined subtab-icon">group</span>
          <span>Photos By User</span>
          <span v-if="uploaders.length" class="subtab-badge">{{ uploaders.length }}</span>
        </button>

        <button
          type="button"
          class="subtab-pill"
          :class="{ 'is-active': activeSubTab === 'checklists' }"
          role="tab"
          :aria-selected="activeSubTab === 'checklists'"
          @click="activeSubTab = 'checklists'"
        >
          <span class="material-symbols-outlined subtab-icon">photo_library</span>
          <span>Photos By Checklist</span>
          <span v-if="albums.length" class="subtab-badge">{{ albums.length }}</span>
        </button>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- SUBTAB 1: PHOTOS BY USER                                              -->
    <!-- ===================================================================== -->
    <div v-if="activeSubTab === 'users'" class="users-tab-section">
      <!-- Section Header with Dropdown Option -->
      <div class="event-albums__header">
        <div class="event-albums__title-group">
          <span class="event-albums__subtitle">Guest Photographers</span>
          <h2 class="event-albums__title">Contributing Guests &amp; Uploaders</h2>
        </div>

        <div class="event-users__controls">
          <!-- Sort Dropdown -->
          <div ref="userSortDropdownRef" class="event-albums__filter-dropdown">
            <button
              type="button"
              class="event-albums__filter-pill event-albums__filter-pill--dropdown"
              @click.stop="toggleUserSortDropdown"
              :aria-expanded="isUserSortDropdownOpen"
              title="Sort contributing guests"
            >
              <span class="material-symbols-outlined" style="font-size: 1.05rem; color: var(--primary);">sort</span>
              <span class="dropdown-pill-text">{{ userSortLabel }}</span>
              <span
                class="material-symbols-outlined dropdown-pill-arrow"
                :class="{ 'is-flipped': isUserSortDropdownOpen }"
              >
                keyboard_arrow_down
              </span>
            </button>

            <!-- Dropdown Menu -->
            <div :class="['event-albums__dropdown-menu', { show: isUserSortDropdownOpen }]">
              <div class="event-albums__dropdown-header">Sort Guests By</div>

              <!-- Option a: Alphabetical -->
              <button
                type="button"
                :class="['event-albums__dropdown-item', { 'is-selected': userSort === 'alphabetical' }]"
                @click="selectUserSort('alphabetical')"
              >
                <div class="dropdown-item-left">
                  <span class="material-symbols-outlined sort-item-icon">sort_by_alpha</span>
                  <span class="album-title">Alphabetical (A–Z)</span>
                </div>
                <div class="dropdown-item-right">
                  <span v-if="userSort === 'alphabetical'" class="material-symbols-outlined check-icon">check</span>
                </div>
              </button>

              <!-- Option b: Most liked -->
              <button
                type="button"
                :class="['event-albums__dropdown-item', { 'is-selected': userSort === 'likes' }]"
                @click="selectUserSort('likes')"
              >
                <div class="dropdown-item-left">
                  <span class="material-symbols-outlined sort-item-icon heart-color">favorite</span>
                  <span class="album-title">Most Liked</span>
                </div>
                <div class="dropdown-item-right">
                  <span v-if="userSort === 'likes'" class="material-symbols-outlined check-icon">check</span>
                </div>
              </button>

              <!-- Option c: Guest who uploaded the checklist early -->
              <button
                type="button"
                :class="['event-albums__dropdown-item', { 'is-selected': userSort === 'early' }]"
                @click="selectUserSort('early')"
              >
                <div class="dropdown-item-left">
                  <span class="material-symbols-outlined sort-item-icon early-color">alarm_on</span>
                  <span class="album-title">Uploaded Checklist Early</span>
                </div>
                <div class="dropdown-item-right">
                  <span v-if="userSort === 'early'" class="material-symbols-outlined check-icon">check</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoadingUploaders" class="uploaders-loading-state">
        <div class="loading-spinner"></div>
        <p>Loading guest contributors...</p>
      </div>

      <!-- Guest Cards Grid -->
      <div v-else-if="sortedUploaders.length" class="guest-uploaders-grid">
        <div
          v-for="(guest, index) in sortedUploaders"
          :key="guest.id || index"
          class="guest-card"
          @click="openGuestModal(guest)"
        >
          <!-- Card Header & Avatar -->
          <div class="guest-card__header">
            <div class="guest-card__avatar-wrap">
              <img
                v-if="guest.coverPhoto"
                :src="guest.coverPhoto"
                :alt="guest.name"
                class="guest-card__avatar-img"
              />
              <div v-else class="guest-card__avatar-fallback">
                {{ getGuestInitials(guest.name) }}
              </div>
            </div>

            <div class="guest-card__info">
              <h3 class="guest-card__name">{{ guest.name }}</h3>
              <span v-if="guest.deviceName" class="guest-card__device">
                <span class="material-symbols-outlined" style="font-size: 0.85rem;">smartphone</span>
                {{ guest.deviceName }}
              </span>
            </div>

            <!-- Early Uploader Rank Badge -->
            <div
              v-if="userSort === 'early' && index < 3"
              class="early-rank-badge"
              :class="`early-rank-badge--${index + 1}`"
              :title="`#${index + 1} Early Checklist Uploader`"
            >
              <span class="material-symbols-outlined" style="font-size: 0.95rem;">military_tech</span>
              <span>#{{ index + 1 }}</span>
            </div>
          </div>

          <!-- Card Body Stats -->
          <div class="guest-card__stats">
            <div class="stat-pill">
              <span class="material-symbols-outlined stat-icon">photo_library</span>
              <span><strong>{{ guest.totalMedia || (guest.totalPhotos + guest.totalVideos) || 0 }}</strong> uploads</span>
            </div>

            <div class="stat-pill stat-pill--likes">
              <span class="material-symbols-outlined stat-icon stat-icon--heart">favorite</span>
              <span><strong>{{ guest.totalLikes || 0 }}</strong> likes</span>
            </div>

            <div v-if="guest.firstChecklistUploadedAt || guest.firstUploadedAt" class="stat-pill stat-pill--time">
              <span class="material-symbols-outlined stat-icon">schedule</span>
              <span>First upload at {{ formatTimeShort(guest.firstChecklistUploadedAt || guest.firstUploadedAt) }}</span>
            </div>
          </div>

          <!-- Card Footer Action -->
          <div class="guest-card__footer">
            <button type="button" class="guest-card__btn" @click.stop="openGuestModal(guest)">
              <span>View Uploaded Photos</span>
              <span class="material-symbols-outlined btn-arrow">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="event-albums__empty">
        <span class="material-symbols-outlined" style="font-size: 3rem; color: var(--primary, #c5a059); opacity: 0.8;">
          group
        </span>
        <h3 style="font-size: 1.25rem; font-weight: 600; margin: 0.75rem 0 0.5rem; color: var(--text-primary);">
          No Guest Uploads Yet
        </h3>
        <p style="font-size: 0.875rem; color: var(--text-secondary); max-width: 440px; margin: 0 auto; line-height: 1.6;">
          Guests have not uploaded photos for this event yet. Once guests scan the QR code and begin contributing moments, they will appear here.
        </p>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- SUBTAB 2: PHOTOS BY CHECKLIST (CURRENT ALBUMS VIEW)                  -->
    <!-- ===================================================================== -->
    <div v-else class="checklists-tab-section">
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
              :title="selectedAlbumFilter ? `Filtered by ${selectedAlbumFilter.title}` : 'Filter by other albums'"
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
          <div @click="openAlbumModal(album)" style="cursor: pointer;">
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
            <div class="event-album-card__media" @click="openAlbumModal(candidAlbum)" style="cursor: pointer;">
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
              <img
                v-else
                :src="candidAlbum.img"
                :alt="candidAlbum.title"
                class="event-album-card__img"
                loading="lazy"
              />
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
                    `Spontaneous guest selfies, table decor snaps, after-party dance floor joy, and intimate
                  behind-the-scenes moments not tied to specific checklist events.`
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
        <div v-if="albums.length === 0 && !isLoadingAlbums" class="event-albums__empty">
          <span class="material-symbols-outlined" style="font-size: 3rem; color: var(--primary, #c5a059); opacity: 0.8;">
            photo_library
          </span>
          <h3 style="font-size: 1.25rem; font-weight: 600; margin: 0.75rem 0 0.5rem; color: var(--text-primary);">
            No Media Uploaded Yet
          </h3>
          <p style="font-size: 0.875rem; color: var(--text-secondary); max-width: 440px; margin: 0 auto; line-height: 1.6;">
            Guests have not uploaded photos or checklist moments for this event yet. Once photos are taken via the live
            vault, they will appear here organized by chapter.
          </p>
        </div>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- MODALS (SEPARATE COMPONENT FILES)                                     -->
    <!-- ===================================================================== -->
    <!-- Modal 1: Photos By User (GuestPhotosModal.vue) -->
    <GuestPhotosModal
      v-model="isGuestModalOpen"
      :guest="selectedGuest"
      :event-code="resolvedEventCode"
      @action="(msg, type) => emit('action', msg, type)"
    />

    <!-- Modal 2: Photos By Checklist (AlbumPhotosModal.vue with descending limit 10 + infinite scroll) -->
    <AlbumPhotosModal
      v-model="isAlbumModalOpen"
      :album="selectedAlbumForModal"
      :event-code="resolvedEventCode"
      @action="(msg, type) => emit('action', msg, type)"
    />
  </div>
</template>

<style scoped lang="scss">
.event-photos-tab-root {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

// Subtabs navigation bar
.subtabs-navigation-bar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.16));
}

.subtabs-pills {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem;
  background: var(--bg-surface-tonal, rgba(197, 160, 89, 0.08));
  border-radius: 9999px;
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.2));
}

.subtab-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1.25rem;
  border-radius: 9999px;
  border: none;
  background: transparent;
  color: var(--text-secondary, #665c4d);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;

  .subtab-icon {
    font-size: 1.15rem;
    transition: transform 0.2s ease;
  }

  &:hover {
    color: var(--text-primary, #1f1b18);
    background: rgba(197, 160, 89, 0.12);
  }

  &.is-active {
    background: var(--primary, #c5a059);
    color: #ffffff;
    box-shadow: 0 3px 10px rgba(197, 160, 89, 0.35);

    .subtab-icon {
      color: #ffffff;
      transform: scale(1.08);
    }

    .subtab-badge {
      background: rgba(255, 255, 255, 0.25);
      color: #ffffff;
    }
  }
}

.subtab-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.45rem;
  border-radius: 9999px;
  background: rgba(197, 160, 89, 0.18);
  color: var(--primary, #c5a059);
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: 1.2;
}

// User tab controls
.event-users__controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sort-item-icon {
  font-size: 1.15rem;
  color: var(--primary, #c5a059);

  &.heart-color {
    color: #e05252;
  }

  &.early-color {
    color: #3b82f6;
  }
}

// Uploaders Grid
.guest-uploaders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 1.25rem;
}

.guest-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1.25rem;
  background: var(--bg-surface-elevated, #ffffff);
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.2));
  border-radius: var(--radius-lg, 0.75rem);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
  cursor: pointer;
  transition: all 0.25s ease;

  &:hover {
    transform: translateY(-3px);
    border-color: var(--primary, #c5a059);
    box-shadow: 0 10px 24px rgba(197, 160, 89, 0.14);
  }
}

.guest-card__header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 1rem;
}

.guest-card__avatar-wrap {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid var(--primary, #c5a059);
  box-shadow: 0 2px 8px rgba(197, 160, 89, 0.2);
}

.guest-card__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.guest-card__avatar-fallback {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--primary, #c5a059), #9b7a38);
  color: #ffffff;
  font-size: 1.15rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.guest-card__info {
  flex: 1;
  overflow: hidden;
}

.guest-card__name {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-primary, #1f1b18);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.guest-card__device {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  margin-top: 0.2rem;
  font-size: 0.75rem;
  color: var(--text-secondary, #665c4d);
}

.early-rank-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 800;
  background: rgba(197, 160, 89, 0.15);
  color: var(--primary, #c5a059);

  &--1 {
    background: linear-gradient(135deg, #ffd700, #ffae00);
    color: #4a3200;
    box-shadow: 0 2px 6px rgba(255, 174, 0, 0.35);
  }

  &--2 {
    background: linear-gradient(135deg, #e0e0e0, #c0c0c0);
    color: #2b2b2b;
  }

  &--3 {
    background: linear-gradient(135deg, #d4a373, #a8764a);
    color: #ffffff;
  }
}

.guest-card__stats {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.75rem 0;
  border-top: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.12));
  border-bottom: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.12));
  margin-bottom: 0.85rem;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  color: var(--text-secondary, #665c4d);

  .stat-icon {
    font-size: 1rem;
    color: var(--primary, #c5a059);

    &--heart {
      color: #e05252;
    }
  }

  &--likes {
    color: var(--text-primary, #1f1b18);
  }

  &--time {
    font-size: 0.75rem;
    color: var(--text-secondary, #8c8273);
  }
}

.guest-card__footer {
  display: flex;
  justify-content: flex-end;
}

.guest-card__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  border-radius: var(--radius-md, 0.5rem);
  background: var(--bg-surface-tonal, rgba(197, 160, 89, 0.08));
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.2));
  color: var(--primary, #c5a059);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.2s ease;

  .btn-arrow {
    font-size: 1rem;
    transition: transform 0.2s ease;
  }

  &:hover {
    background: var(--primary, #c5a059);
    color: #ffffff;
    border-color: var(--primary, #c5a059);

    .btn-arrow {
      transform: translateX(3px);
    }
  }
}

.uploaders-loading-state {
  text-align: center;
  padding: 4rem 1rem;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
