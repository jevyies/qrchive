<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { axiosInstance, API_BASE_URL } from '@/plugins/axios'
import JBtn from '@/@core/components/JBtn.vue'
import JModal from '@/@core/components/JModal.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

// Event code from route params
const eventCode = computed(() => {
  return route.params.id || 'keann-jenny'
})

// Event stats & details fetched from /api/events/token/:token/stats
const eventData = ref(null)
const isLoadingEvent = ref(false)
const isLoadingAlbums = ref(false)

// Dynamic Event Name
const eventTitle = computed(() => {
  if (eventData.value?.name) {
    return eventData.value.name
  }
  if (eventCode.value === 'keann-jenny') {
    return "Keann & Jenny's Wedding Celebration"
  }
  if (eventCode.value === 'mateo-isabella') {
    return "Mateo & Isabella's Intimate Nuptials"
  }
  if (eventCode.value === 'lucas-mia') {
    return "Lucas & Mia's Garden Gala"
  }
  if (eventCode.value === 'raphael-camille') {
    return "Raphael & Camille's Sunset Vows"
  }
  if (eventCode.value === 'gabriel-50th') {
    return "Gabriel's 50th Jubilee Banquet"
  }
  return String(eventCode.value)
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
})

// Formatted Event Date
const formattedEventDate = computed(() => {
  const dateStr = eventData.value?.event_date || eventData.value?.eventDate
  if (!dateStr) return 'October 26, 2024'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch {
    return String(dateStr)
  }
})

// Helper for remaining window formatting
const formatRemainingTime = (expiryDateStr) => {
  if (!expiryDateStr) return null
  try {
    const target = new Date(expiryDateStr)
    const now = new Date()
    const diffMs = target.getTime() - now.getTime()
    if (diffMs <= 0) return 'Expired'
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays > 30) {
      const months = Math.floor(diffDays / 30)
      return months === 1 ? '1 Month Remaining' : `${months} Months Remaining`
    }
    return `${diffDays} Day${diffDays === 1 ? '' : 's'} Remaining`
  } catch {
    return null
  }
}

// Upload window pill text
const uploadWindowText = computed(() => {
  const rem = formatRemainingTime(eventData.value?.upload_expiry || eventData.value?.uploadExpiry)
  return rem ? `Upload Window: ${rem}` : 'Upload Window: Active'
})

// Archive storage pill text
const storageWindowText = computed(() => {
  const rem = formatRemainingTime(eventData.value?.photo_expiry || eventData.value?.photoExpiry)
  return rem ? `Archive Storage: ${rem}` : 'Archive Storage: Active'
})

// Package pill text
const packageText = computed(() => {
  if (eventData.value?.isUnlimited) return 'Unlimited Shots Package'
  return 'Celebration Archival Package'
})

const isUnlimitedPackage = computed(() => Boolean(eventData.value?.isUnlimited))

// Total stats computed
const totalMediaCount = computed(() => {
  if (eventData.value) {
    return (eventData.value.totalPhotos || 0) + (eventData.value.totalVideos || 0)
  }
  return albums.value.reduce((sum, a) => sum + (a.totalItems || 0), 0) || 48
})

const totalActiveContributors = computed(() => {
  if (eventData.value?.totalUsers !== undefined && eventData.value?.totalUsers !== null) {
    return eventData.value.totalUsers
  }
  return 18
})

const totalMediaSizeDisplay = computed(() => {
  let bytes = 0
  if (eventData.value?.totalBytes !== undefined && eventData.value?.totalBytes !== null) {
    bytes = Number(eventData.value.totalBytes) || 0
  } else if (eventData.value?.totalGigabytes !== undefined && eventData.value?.totalGigabytes !== null) {
    bytes = Number(eventData.value.totalGigabytes) * 1024 * 1024 * 1024
  }

  if (!bytes || bytes <= 0) return ''

  const kb = 1024
  const mb = kb * 1024
  const gb = mb * 1024
  const tb = gb * 1024

  if (bytes < mb) {
    const val = (bytes / kb).toFixed(1).replace(/\.0$/, '')
    return `${val} KB`
  } else if (bytes < gb) {
    const val = (bytes / mb).toFixed(1).replace(/\.0$/, '')
    return `${val} MB`
  } else if (bytes < tb) {
    const val = (bytes / gb).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1')
    return `${val} GB`
  } else {
    const val = (bytes / tb).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1')
    return `${val} TB`
  }
})

// Alias for backwards compatibility
const totalGigabytesDisplay = totalMediaSizeDisplay

// Couple names and initials for placards
const coupleNames = computed(() => {
  return String(eventTitle.value)
    .replace(/'s Wedding.*/i, '')
    .replace(/ Wedding.*/i, '')
    .replace(/ Celebration.*/i, '')
    .trim()
})

const coupleInitials = computed(() => {
  const parts = coupleNames.value.split('&')
  if (parts.length >= 2) {
    return `${parts[0].trim().charAt(0)} & ${parts[1].trim().charAt(0)}`
  }
  return 'K & J'
})

// Primary tab: 'tab1' (Photos) | 'tab2' (QR Access) | 'tab3' (Placards)
const activeTab = ref('tab1')

// Album filter: 'all' or specific checklistName
const albumFilter = ref('all')

// Selected placard style: 'gold' | 'minimalist' | 'botanical' | 'romance'
const selectedPlacard = ref('gold')

// Album Preview Modal
const isAlbumModalOpen = ref(false)
const activeAlbum = ref(null)

const openAlbumModal = (album) => {
  activeAlbum.value = album
  isAlbumModalOpen.value = true
}

// Dynamic host origin computed from window.location
const hostOrigin = computed(() => {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }
  return 'http://localhost:1500'
})

// Copy URL to clipboard
const copyVaultUrl = async () => {
  const url = `${hostOrigin.value}/event/${eventCode.value}`
  try {
    await navigator.clipboard.writeText(url)
    toast.show({
      message: 'Vault link copied to clipboard!',
      color: 'success',
    })
  } catch {
    toast.show({
      message: `Vault link: ${url}`,
      color: 'primary',
    })
  }
}

// Action notices
const handleAction = (message, color = 'info') => {
  toast.show({
    message,
    color,
  })
}

// Navigate back to owner dashboard
const goBackToDashboard = () => {
  router.push('/dashboard')
}

// Albums reactive state
const albums = ref([])

// Dropdown state for album filter
const isAlbumDropdownOpen = ref(false)
const albumDropdownRef = ref(null)

const toggleAlbumDropdown = () => {
  isAlbumDropdownOpen.value = !isAlbumDropdownOpen.value
}

const closeAlbumDropdown = () => {
  isAlbumDropdownOpen.value = false
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
    albums.value.find(
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
  return albums.value.filter((a) => !a.isCandid)
})

// Dedicated Candid Album (Quick Captures)
const candidAlbum = computed(() => {
  return albums.value.find((a) => a.isCandid) || null
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

// 1. Fetch Event Stats & Details from /api/events/token/:token/stats
const fetchEventStats = async () => {
  try {
    isLoadingEvent.value = true
    const { data } = await axiosInstance.get(`/api/events/token/${eventCode.value}/stats`)
    if (data) {
      eventData.value = data
    }
  } catch (err) {
    console.warn('[DashboardEvent] Could not fetch event stats from backend:', err?.message || err)
  } finally {
    isLoadingEvent.value = false
  }
}

// 2. Fetch Checklist Photos from /api/photos/token/:token/checklist-photos
const fetchChecklistPhotos = async () => {
  try {
    isLoadingAlbums.value = true
    const { data } = await axiosInstance.get(`/api/photos/token/${eventCode.value}/checklist-photos`, {
      params: { includeEmpty: true },
    })

    const list = data?.checklists || (Array.isArray(data) ? data : [])
    if (list && list.length > 0) {
      let checklistNumber = 0
      albums.value = list.map((item, index) => {
        const isCandid = item.checklistId === null || item.checklistName === 'Quick Captures'

        let photosCountStr = ''
        if (item.totalPhotos > 0 && item.totalVideos > 0) {
          photosCountStr = `${item.totalPhotos} Photo${item.totalPhotos === 1 ? '' : 's'} • ${item.totalVideos} Video${item.totalVideos === 1 ? '' : 's'}`
        } else if (item.totalVideos > 0) {
          photosCountStr = `${item.totalVideos} Video${item.totalVideos === 1 ? '' : 's'}`
        } else if (item.totalPhotos > 0) {
          photosCountStr = `${item.totalPhotos} Photo${item.totalPhotos === 1 ? '' : 's'}`
        } else {
          photosCountStr = '0 Photos'
        }

        const chapterStr = isCandid
          ? 'Spontaneous Candids'
          : `${String(++checklistNumber).padStart(2, '0')} • Reception`

        const defaultCover = isCandid
          ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwVzmzMM6xU9rkTsqQiZe8VaAHh2ISv8yKhPGNDF7ojiILxaOmNjvgG_gn7Zeyl0PR11TV9kHiQImdM8r36vshi7OPKPn9faSEy3KIolexCGTe8W0EVb-um8xdwVqslHrJU9OetIDQYbPHKsrJwZGX9rVr3neO5pVkpnwquvwIdUyh2ugBXxWVolAWCUqw5TExtbqiuCpZRvFOqrglw56VpwZzC5K-IwmH-cvNwpYcx3_2FpH2D9JW'
          : 'https://lh3.googleusercontent.com/aida-public/AB6AXuCZMm6bFD2eExqEzNIHlYmDbij__APA1yNW3H9Bw5ZtYxUYJI1s0rOEebSdn2Zk62lSfk8BwmMqr_DZxJwm9sb4Lb4ZQKWduWr9X3j3jy6kQ981p5GLnO9eRG7UIp01hzc4l18ODCpwvL_wYPLPZRvgPXKpKe28AyZHRlG5L8hXCymCWp0WpUve456P2U7Urhvp-1qqAIT-ukne5tVYcWp8BNsqUanOk_dy33wan3dejp0ZRlTTm70R'

        const mediaUrl = item.photo?.fullUrl || item.photo?.url || item.url || ''
        const mimeType = item.photo?.mimeType || ''
        const isVideo = Boolean(
          item.isVideo ||
          item.type === 'video' ||
          item.photo?.isVideo ||
          item.photo?.type === 'video' ||
          mimeType.startsWith('video/') ||
          /\.(mp4|webm|mov|ogg)($|\?)/i.test(mediaUrl)
        )

        return {
          id: item.checklistId ?? `candid-${index}`,
          checklistId: item.checklistId,
          checklistName: item.checklistName || (isCandid ? 'Quick Captures' : `Checklist #${index + 1}`),
          title: item.checklistName || (isCandid ? 'Random Shots & Candids' : `Checklist #${index + 1}`),
          chapter: chapterStr,
          photosCount: photosCountStr,
          photosCountNum: item.totalItems || (item.totalPhotos + item.totalVideos) || 0,
          author: item.uploadedBy || item.photo?.uploadedBy || (isCandid ? 'Beloved Guests' : 'Awaiting Contributor'),
          category: isCandid ? 'candid' : 'checklist',
          isCandid,
          isVideo,
          description: item.description,
          img: mediaUrl || defaultCover,
          totalPhotos: item.totalPhotos || 0,
          totalVideos: item.totalVideos || 0,
          totalItems: item.totalItems || 0,
          likesCount: item.likesCount || 0,
        }
      })
    }
  } catch (err) {
    console.warn('[DashboardEvent] Could not fetch checklist photos from backend:', err?.message || err)
  } finally {
    isLoadingAlbums.value = false
  }
}

// Download all media as a ZIP package processed via Redis background queue
const isDownloadingZip = ref(false)
const zipProgressText = ref('')
let downloadPollTimer = null

const downloadAllFiles = async () => {
  if (isDownloadingZip.value) return

  if (downloadPollTimer) {
    clearInterval(downloadPollTimer)
    downloadPollTimer = null
  }

  try {
    isDownloadingZip.value = true
    zipProgressText.value = 'Preparing...'

    toast.show({
      message: 'Requesting ZIP archive generation in background queue...',
      color: 'info',
    })

    const { data } = await axiosInstance.post(`/api/photos/token/${eventCode.value}/download-zip`)
    const jobId = data?.jobId

    if (!jobId) {
      throw new Error(data?.message || 'Server did not return a valid download job ID')
    }

    zipProgressText.value = 'Queued...'
    let attempts = 0
    const maxAttempts = 150 // up to 5 minutes at ~2s intervals
    const pollInterval = 1800

    downloadPollTimer = setInterval(async () => {
      attempts++
      try {
        const { data: statusData } = await axiosInstance.get(`/api/photos/download-zip/${jobId}/status`)

        if (statusData?.status === 'processing') {
          const percent = statusData.progress?.percent || 0
          zipProgressText.value = percent > 0 ? `Zipping (${percent}%)...` : 'Archiving files...'
        } else if (statusData?.status === 'completed') {
          clearInterval(downloadPollTimer)
          downloadPollTimer = null
          isDownloadingZip.value = false
          zipProgressText.value = ''

          toast.show({
            message: 'All photos and videos packaged! Starting download...',
            color: 'success',
          })

          // Trigger browser file download via anchor element
          const downloadUrl = `${axiosInstance.defaults.baseURL || ''}/api/photos/download-zip/${jobId}/file`
          const link = document.createElement('a')
          link.href = downloadUrl
          link.setAttribute('download', statusData.result?.fileName || `${eventTitle.value}-photos.zip`)
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        } else if (statusData?.status === 'failed') {
          clearInterval(downloadPollTimer)
          downloadPollTimer = null
          isDownloadingZip.value = false
          zipProgressText.value = ''

          toast.show({
            message: `Failed to create ZIP: ${statusData.error || 'Processing error'}`,
            color: 'danger',
          })
        }
      } catch (pollErr) {
        console.warn('[downloadAllFiles] Poll check error:', pollErr)
      }

      if (attempts >= maxAttempts) {
        clearInterval(downloadPollTimer)
        downloadPollTimer = null
        isDownloadingZip.value = false
        zipProgressText.value = ''
        toast.show({
          message: 'ZIP download preparation timed out. Please try again.',
          color: 'danger',
        })
      }
    }, pollInterval)
  } catch (err) {
    isDownloadingZip.value = false
    zipProgressText.value = ''
    if (downloadPollTimer) {
      clearInterval(downloadPollTimer)
      downloadPollTimer = null
    }
    toast.show({
      message: `Could not start ZIP export: ${err?.response?.data?.message || err?.message || 'Server error'}`,
      color: 'danger',
    })
  }
}

onMounted(() => {
  fetchEventStats()
  fetchChecklistPhotos()
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  if (downloadPollTimer) {
    clearInterval(downloadPollTimer)
    downloadPollTimer = null
  }
})
</script>

<template>
  <div class="event-detail">
    <!-- Top Archival Navigation & Utility Bar -->
    <nav class="event-detail__nav-bar">
      <div class="event-detail__nav-container">
        <div class="event-detail__nav-left">
          <button type="button" class="event-detail__back-btn" @click="goBackToDashboard">
            <span class="material-symbols-outlined back-icon">arrow_back</span>
            <span>Back to Events</span>
          </button>
          <span class="event-detail__nav-divider">•</span>
          <div class="event-detail__status-pill">
            <span class="status-dot"></span>
            <span>Active • Live Vault Open</span>
          </div>
        </div>

        <div class="event-detail__nav-actions">
          <button type="button" class="event-detail__action-btn event-detail__action-btn--tonal"
            @click="handleAction('Opening Live Slideshow in full screen...')">
            <span class="material-symbols-outlined" style="font-size: 1.1rem; color: var(--primary);">slideshow</span>
            <span>Live Slideshow</span>
          </button>
          <button type="button" class="event-detail__action-btn event-detail__action-btn--primary"
            :disabled="isDownloadingZip"
            :style="isDownloadingZip ? 'opacity: 0.85; cursor: wait;' : ''"
            @click="downloadAllFiles">
            <span v-if="isDownloadingZip" class="material-symbols-outlined spinning" style="font-size: 1.1rem;">progress_activity</span>
            <span v-else class="material-symbols-outlined" style="font-size: 1.1rem;">cloud_download</span>
            <span>{{ isDownloadingZip ? zipProgressText : 'Download All (ZIP)' }}</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Event Header & Archival Hero Showcase -->
    <section class="event-detail__hero-section">
      <div class="event-detail__hero-card">
        <!-- Hero Cover Media -->
        <div class="event-detail__hero-media">
          <img class="event-detail__hero-img" alt="Opulent wedding reception couple dance"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3V3b53XiISyyoAl_u3W-G-INIpTniHYGyW5OT4V5pEh2IcNn5br0vuk1SwlXYwhvp3_hhQ8x1jOoBUhws7q-v6eh8z4qi_K3-Dej-j6NoHv3JbP_1ovJGScLp2yptN8rSl-dXBjpkfq4PfifYeQbWeVKhUpi58-15Q06-ZzcXSa04xNPO4zkis0YG9ZBavmZM8ni4FBDAUSTv6bCcyTJ7kAcmI5oSN9ebUzugVO8qVo7sSMVaGLya" />
          <div class="event-detail__hero-scrim-vertical"></div>
          <div class="event-detail__hero-scrim-horizontal"></div>

          <!-- Gold Foil Corner Accents -->
          <div class="event-detail__gold-corner event-detail__gold-corner--top-left"></div>
          <div class="event-detail__gold-corner event-detail__gold-corner--top-right"></div>

          <!-- Hero Content Overlay -->
          <div class="event-detail__hero-content">
            <span class="event-detail__hero-date">{{ formattedEventDate }}</span>
            <h1 class="event-detail__hero-title">{{ eventTitle }}</h1>

            <!-- Archival Package Metadata Row -->
            <div class="event-detail__hero-metadata">
              <span class="event-detail__hero-pill" :class="{ 'event-detail__hero-pill--gold': isUnlimitedPackage }">
                <span class="material-symbols-outlined pill-icon">all_inclusive</span>
                <span>{{ packageText }}</span>
              </span>
              <span class="event-detail__hero-pill">
                <span class="material-symbols-outlined pill-icon" style="color: var(--primary);">timer</span>
                <span>{{ uploadWindowText }}</span>
              </span>
              <span class="event-detail__hero-pill">
                <span class="material-symbols-outlined pill-icon" style="color: var(--primary);">inventory_2</span>
                <span>{{ storageWindowText }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Floating Stat Bar -->
        <div class="event-detail__stat-bar">
          <div class="event-detail__stat-col">
            <span class="event-detail__stat-label">Media Uploaded</span>
            <div class="event-detail__stat-row">
              <span class="event-detail__stat-value">{{ totalMediaCount }}</span>
              <span class="event-detail__stat-unit">
                {{ totalMediaSizeDisplay ? `Photos & Clips (${totalMediaSizeDisplay})` : 'Photos & Clips' }}
              </span>
            </div>
          </div>

          <div class="event-detail__stat-col">
            <span class="event-detail__stat-label">Active Contributors</span>
            <div class="event-detail__stat-row">
              <span class="event-detail__stat-value event-detail__stat-value--primary">{{ totalActiveContributors
              }}</span>
              <span class="event-detail__stat-unit">
                {{ totalActiveContributors === 1 ? 'Beloved Guest' : 'Beloved Guests' }}
              </span>
            </div>
          </div>

          <div class="event-detail__stat-col">
            <span class="event-detail__stat-label">Event Access URL</span>
            <div class="event-detail__url-box">
              <span class="event-detail__url-text">{{ hostOrigin }}/event/{{ eventCode }}</span>
              <button type="button" class="event-detail__url-copy-btn" title="Copy Vault URL" @click="copyVaultUrl">
                <span class="material-symbols-outlined copy-icon">content_copy</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Interactive Primary Tab Navigation -->
    <section class="event-detail__tabs-section">
      <div class="event-detail__tabs-list" role="tablist">
        <button type="button" class="event-detail__tab-btn" :class="{ 'is-active': activeTab === 'tab1' }"
          @click="activeTab = 'tab1'">
          <span class="material-symbols-outlined tab-icon">photo_library</span>
          <span>Guest Photos &amp; Checklists</span>
        </button>

        <button type="button" class="event-detail__tab-btn" :class="{ 'is-active': activeTab === 'tab2' }"
          @click="activeTab = 'tab2'">
          <span class="material-symbols-outlined tab-icon">qr_code_2</span>
          <span>Guest QR Code &amp; Access</span>
        </button>

        <button type="button" class="event-detail__tab-btn" :class="{ 'is-active': activeTab === 'tab3' }"
          @click="activeTab = 'tab3'">
          <span class="material-symbols-outlined tab-icon">style</span>
          <span>5×7" Table Placard Templates</span>
        </button>
      </div>
    </section>

    <!-- TAB 1: Guest Photos & Albums -->
    <div v-if="activeTab === 'tab1'" class="event-detail__tab-body">
      <div class="event-albums__header">
        <div class="event-albums__title-group">
          <span class="event-albums__subtitle">Curated Chapters</span>
          <h2 class="event-albums__title">Reception Program Moments</h2>
        </div>

        <div class="event-albums__filters" v-if="albums.length">
          <!-- All Albums Button -->
          <button type="button" class="event-albums__filter-pill" :class="{ 'is-active': albumFilter === 'all' }"
            @click="selectAllAlbums">
            All Checklists ({{ albums.length }})
          </button>

          <!-- Other Albums Dropdown -->
          <div ref="albumDropdownRef" class="event-albums__filter-dropdown">
            <button type="button" class="event-albums__filter-pill event-albums__filter-pill--dropdown"
              :class="{ 'is-active': albumFilter !== 'all' }" @click.stop="toggleAlbumDropdown"
              :aria-expanded="isAlbumDropdownOpen"
              :title="selectedAlbum ? `Filtered by ${selectedAlbum.title}` : 'Filter by other albums'">
              <span class="dropdown-pill-text">{{ dropdownButtonLabel }}</span>
              <span v-if="albumFilter !== 'all'" class="dropdown-pill-clear" title="Clear filter"
                @click.stop="selectAllAlbums">
                <span class="material-symbols-outlined clear-icon">close</span>
              </span>
              <span class="material-symbols-outlined dropdown-pill-arrow"
                :class="{ 'is-flipped': isAlbumDropdownOpen }">
                keyboard_arrow_down
              </span>
            </button>

            <!-- Dropdown Menu -->
            <div :class="['event-albums__dropdown-menu', { show: isAlbumDropdownOpen }]">
              <div class="event-albums__dropdown-header">Filter by Specific Album</div>

              <button type="button" :class="['event-albums__dropdown-item', { 'is-selected': albumFilter === 'all' }]"
                @click="selectAllAlbums">
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

              <button v-for="album in albums" :key="album.id" type="button"
                :class="['event-albums__dropdown-item', { 'is-selected': isAlbumSelected(album) }]"
                @click="selectAlbum(album)">
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
              <video v-if="isVideoMedia(album)" :src="album.img" class="event-album-card__img" muted playsinline
                autoplay preload="metadata" @timeupdate="handleVideoTimeUpdate"></video>
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
              <video v-if="isVideoMedia(candidAlbum)" :src="candidAlbum.img" class="event-album-card__img" muted
                playsinline autoplay preload="metadata" @timeupdate="handleVideoTimeUpdate"></video>
              <img v-else :src="candidAlbum.img" :alt="candidAlbum.title" class="event-album-card__img"
                loading="lazy" />
              <span class="event-album-card__badge-top event-album-card__badge-top--gold">Dedicated Candid Vault</span>
              <span class="event-album-card__badge-bottom">{{ candidAlbum.photosCount }}</span>
            </div>

            <div class="event-album-card__content-candid">
              <div>
                <div
                  style="display: inline-flex; align-items: center; gap: 0.25rem; color: var(--primary); margin-bottom: 0.35rem;">
                  <span class="material-symbols-outlined" style="font-size: 1.1rem;">auto_awesome</span>
                  <span
                    style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700;">Spontaneous
                    &amp; Real</span>
                </div>
                <h3 class="event-albums__title" style="font-size: 1.35rem;">{{ candidAlbum.title }}</h3>
                <p style="font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.6; margin-top: 0.5rem;">
                  {{
                    candidAlbum.description
                    ||
                    `Spontaneous guest selfies, table decor snaps, after-party dance floor joy, and intimate behind - the
                  - scenes moments not tied to specific checklist events.` }}
                </p>
                <p
                  style="font-size: 0.8125rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.35rem; margin-top: 0.75rem;">
                  <span class="material-symbols-outlined" style="font-size: 1rem; color: var(--primary);">group</span>
                  <span>Latest contributor: <strong>{{ candidAlbum.author }}</strong></span>
                </p>
              </div>

              <div style="padding-top: 1.25rem;">
                <button type="button" class="event-album-card__btn event-album-card__btn--primary"
                  @click="openAlbumModal(candidAlbum)">
                  <span>Explore All Candids</span>
                  <span class="material-symbols-outlined btn-arrow">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state when no albums exist -->
        <div v-if="albums.length === 0 && !isLoadingAlbums" class="event-albums__empty"
          style="grid-column: 1 / -1; padding: 4rem 1rem; text-align: center; border-radius: var(--radius-xl, 0.75rem); background: var(--bg-surface-elevated, #fff); border: 1px dashed var(--border-color-subtle, rgba(197, 160, 89, 0.2));">
          <span class="material-symbols-outlined"
            style="font-size: 3rem; color: var(--primary, #c5a059); opacity: 0.8;">photo_library</span>
          <h3 style="font-size: 1.25rem; font-weight: 600; margin: 0.75rem 0 0.5rem; color: var(--text-primary);">No
            Media Uploaded Yet</h3>
          <p
            style="font-size: 0.875rem; color: var(--text-secondary); max-width: 440px; margin: 0 auto; line-height: 1.6;">
            Guests have not uploaded photos or checklist moments for this event yet. Once photos are taken via the live
            vault, they will appear here organized by chapter.
          </p>
        </div>
      </div>
    </div>

    <!-- TAB 2: Guest QR Code & Access -->
    <div v-if="activeTab === 'tab2'" class="event-detail__tab-body">
      <div class="event-qr-grid">
        <!-- Scannable Placard Mockup Card -->
        <div class="event-qr-mockup-wrap">
          <div class="event-qr-placard">
            <div class="event-qr-placard__inner">
              <span class="event-qr-placard__subheading">Welcome to the celebration of</span>
              <h3 class="event-qr-placard__couple">{{ coupleNames }}</h3>
              <p class="event-qr-placard__date">{{ formattedEventDate }}</p>

              <!-- Central QR Code -->
              <div class="event-qr-placard__svg-wrap">
                <svg viewBox="0 0 100 100" fill="currentColor">
                  <!-- QR Finder Top Left -->
                  <rect x="10" y="10" width="24" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="4">
                  </rect>
                  <rect x="17" y="17" width="10" height="10" fill="currentColor"></rect>
                  <!-- QR Finder Top Right -->
                  <rect x="66" y="10" width="24" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="4">
                  </rect>
                  <rect x="73" y="17" width="10" height="10" fill="currentColor"></rect>
                  <!-- QR Finder Bottom Left -->
                  <rect x="10" y="66" width="24" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="4">
                  </rect>
                  <rect x="17" y="73" width="10" height="10" fill="currentColor"></rect>
                  <!-- Data Dots & Patterns -->
                  <rect x="42" y="12" width="6" height="6" fill="currentColor"></rect>
                  <rect x="52" y="12" width="6" height="6" fill="currentColor"></rect>
                  <rect x="42" y="24" width="6" height="6" fill="currentColor"></rect>
                  <rect x="48" y="30" width="6" height="6" fill="currentColor"></rect>
                  <rect x="12" y="42" width="6" height="6" fill="currentColor"></rect>
                  <rect x="22" y="48" width="6" height="6" fill="currentColor"></rect>
                  <rect x="30" y="42" width="6" height="6" fill="currentColor"></rect>
                  <rect x="42" y="42" width="16" height="16" rx="2" fill="#775a19"></rect>
                  <!-- Monogram Inside QR Center -->
                  <text x="50" y="54" fill="#ffffff" font-family="'Playfair Display', serif" font-size="10"
                    font-style="italic" text-anchor="middle">K&amp;J</text>
                  <rect x="64" y="42" width="6" height="6" fill="currentColor"></rect>
                  <rect x="74" y="48" width="6" height="6" fill="currentColor"></rect>
                  <rect x="82" y="42" width="6" height="6" fill="currentColor"></rect>
                  <rect x="42" y="66" width="6" height="6" fill="currentColor"></rect>
                  <rect x="52" y="74" width="6" height="6" fill="currentColor"></rect>
                  <rect x="66" y="66" width="6" height="6" fill="currentColor"></rect>
                  <rect x="76" y="72" width="6" height="6" fill="currentColor"></rect>
                  <rect x="66" y="82" width="6" height="6" fill="currentColor"></rect>
                  <rect x="82" y="82" width="6" height="6" fill="currentColor"></rect>
                  <rect x="50" y="84" width="6" height="6" fill="currentColor"></rect>
                </svg>
              </div>

              <p class="event-qr-placard__instruction">
                Scan with your camera to upload reception photos instantly — no app required.
              </p>
              <span class="event-qr-placard__link">{{ hostOrigin }}/event/{{ eventCode }}</span>
            </div>
          </div>
        </div>

        <!-- Download & Access Info -->
        <div class="event-qr-info">
          <div class="event-qr-info__header">
            <span class="event-qr-info__badge">Effortless Guest Participation</span>
            <h2 class="event-qr-info__title">Live Guest Access QR Pass</h2>
            <p class="event-qr-info__desc">
              Every guest can easily scan this QR code from their mobile cameras.
              Zero app download or account creation required for instant uploads.
            </p>
          </div>

          <!-- Action Button -->
          <div>
            <button type="button" class="event-detail__action-btn event-detail__action-btn--primary"
              style="padding: 0.75rem 1.5rem;" @click="handleAction('High-res SVG QR code downloaded', 'success')">
              <span class="material-symbols-outlined" style="font-size: 1.15rem;">download</span>
              <span>Download QR Code</span>
            </button>
          </div>

          <!-- Direct URL Copy Box -->
          <div class="event-qr-direct-box">
            <div class="event-qr-direct-link">
              <span class="material-symbols-outlined link-icon">link</span>
              <span>{{ hostOrigin }}/v/{{ eventCode }}</span>
            </div>
            <button type="button" class="event-detail__action-btn event-detail__action-btn--tonal"
              @click="copyVaultUrl">
              Copy Direct URL
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: 5x7" Table Placard Templates -->
    <div v-if="activeTab === 'tab3'" class="event-detail__tab-body">
      <div class="event-placards__header">
        <div class="event-placards__title-group">
          <span class="event-albums__subtitle">Atelier Print Studio</span>
          <h2 class="event-placards__title">5×7" Table Placard Templates</h2>
          <p class="event-placards__desc">
            Choose from our pre-formatted, print-ready 5×7 inch table placard designs. Pre-calculated with professional
            1/8"
            bleed margins for effortless home printing or luxury stationary ateliers.
          </p>
        </div>

        <button type="button" class="event-detail__action-btn event-detail__action-btn--primary"
          style="padding: 0.75rem 1.5rem; flex-shrink: 0;"
          @click="handleAction(`Generating print-ready PDF for ${selectedPlacard} style...`, 'success')">
          <span class="material-symbols-outlined" style="font-size: 1.15rem;">picture_as_pdf</span>
          <span>Download Selected 5×7" PDF</span>
        </button>
      </div>

      <!-- 4 Placard Designs Grid -->
      <div class="event-placards__grid">
        <!-- Style 1: Classic Gold Foil -->
        <div class="event-placard-card" :class="{ 'is-selected': selectedPlacard === 'gold' }"
          @click="selectedPlacard = 'gold'">
          <div class="event-placard-sheet event-placard-sheet--gold">
            <span class="event-placard-check">
              <span class="material-symbols-outlined check-icon">check_circle</span>
            </span>

            <div class="event-placard-top">
              <p class="event-placard-sub">Table Celebration</p>
              <h4 class="event-placard-name">{{ coupleNames }}</h4>
              <div class="event-placard-divider"></div>
              <p class="event-placard-tagline">Capture our night through your lens.</p>
            </div>

            <div class="event-placard-qr-box">
              <span class="material-symbols-outlined placard-qr-icon">qr_code</span>
            </div>

            <div class="event-placard-bottom">
              <p class="event-placard-scan-text">Scan to add your photos to our vault</p>
              <span class="event-placard-url-text">{{ hostOrigin }}/event/{{ eventCode }}</span>
            </div>
          </div>

          <div class="event-placard-caption">
            <h5 class="event-placard-label">Classic Gold Foil</h5>
            <p class="event-placard-status">{{ selectedPlacard === 'gold' ? 'Selected Design' : 'Print-ready layout' }}
            </p>
          </div>
        </div>

        <!-- Style 2: Minimalist Modern -->
        <div class="event-placard-card" :class="{ 'is-selected': selectedPlacard === 'minimalist' }"
          @click="selectedPlacard = 'minimalist'">
          <div class="event-placard-sheet event-placard-sheet--minimalist">
            <span class="event-placard-check">
              <span class="material-symbols-outlined check-icon">check_circle</span>
            </span>

            <div class="event-placard-top">
              <p class="event-placard-sub">Memory Archive</p>
              <h4 class="event-placard-name event-placard-name--dark">{{ coupleInitials }}</h4>
              <p class="event-placard-tagline" style="margin-top: 0.35rem;">{{ formattedEventDate }}</p>
            </div>

            <div class="event-placard-qr-box">
              <span class="material-symbols-outlined placard-qr-icon placard-qr-icon--dark">qr_code</span>
            </div>

            <div class="event-placard-bottom">
              <p class="event-placard-scan-text">Open Camera &amp; Scan</p>
            </div>
          </div>

          <div class="event-placard-caption">
            <h5 class="event-placard-label">Minimalist Modern</h5>
            <p class="event-placard-status">
              {{ selectedPlacard === 'minimalist' ?
                'Selected Design' : 'Clean typographic layout' }}
            </p>
          </div>
        </div>

        <!-- Style 3: Botanical Arch -->
        <div class="event-placard-card" :class="{ 'is-selected': selectedPlacard === 'botanical' }"
          @click="selectedPlacard = 'botanical'">
          <div class="event-placard-sheet event-placard-sheet--botanical">
            <span class="event-placard-check">
              <span class="material-symbols-outlined check-icon">check_circle</span>
            </span>

            <div class="botanical-arch-line"></div>

            <div class="event-placard-top">
              <p class="event-placard-sub">Celebrate With Us</p>
              <h4 class="event-placard-name event-placard-name--script">{{ coupleNames }}</h4>
            </div>

            <div class="event-placard-qr-box">
              <span class="material-symbols-outlined placard-qr-icon">qr_code</span>
            </div>

            <div class="event-placard-bottom">
              <p class="event-placard-tagline" style="font-size: 0.6875rem;">Share your favorite wedding snaps</p>
            </div>
          </div>

          <div class="event-placard-caption">
            <h5 class="event-placard-label">Botanical Arch</h5>
            <p class="event-placard-status">{{
              selectedPlacard === 'botanical' ? 'Selected Design' : 'Romantic arched foil detail' }}</p>
          </div>
        </div>

        <!-- Style 4: Romance Script -->
        <div class="event-placard-card" :class="{ 'is-selected': selectedPlacard === 'romance' }"
          @click="selectedPlacard = 'romance'">
          <div class="event-placard-sheet event-placard-sheet--romance">
            <span class="event-placard-check">
              <span class="material-symbols-outlined check-icon">check_circle</span>
            </span>

            <div class="event-placard-top">
              <h4 class="event-placard-name event-placard-name--script" style="font-size: 1.35rem;">Share the Love</h4>
              <p class="event-placard-sub" style="margin-top: 0.35rem;">{{ eventTitle }}</p>
            </div>

            <div class="event-placard-qr-box">
              <span class="material-symbols-outlined placard-qr-icon placard-qr-icon--dark">qr_code</span>
            </div>

            <div class="event-placard-bottom">
              <p class="event-placard-tagline" style="font-size: 0.6875rem;">Help us archive the evening</p>
            </div>
          </div>

          <div class="event-placard-caption">
            <h5 class="event-placard-label">Romance Script</h5>
            <p class="event-placard-status">{{
              selectedPlacard === 'romance' ?
                'Selected Design' : 'Editorial calligraphy focus' }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Interactive Album Preview Modal -->
    <JModal v-model="isAlbumModalOpen" :title="activeAlbum?.title || 'Album Viewer'"
      :subtitle="activeAlbum?.chapter || 'Chapter Album'" size="md" variant="elevated">
      <div v-if="activeAlbum" style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="width: 100%; height: 260px; border-radius: 0.75rem; overflow: hidden; background: #000;">
          <video v-if="isVideoMedia(activeAlbum)" :src="activeAlbum.img" controls autoplay playsinline
            style="width: 100%; height: 100%; object-fit: contain;"></video>
          <img v-else :src="activeAlbum.img" :alt="activeAlbum.title"
            style="width: 100%; height: 100%; object-fit: cover;" />
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
          <JBtn size="sm" color="primary"
            @click="handleAction(`Downloading photos for ${activeAlbum.title}...`, 'success')">
            Download Album
          </JBtn>
        </div>
      </div>
    </JModal>

    <!-- Footer -->
    <footer class="event-detail__footer">
      <div class="event-detail__footer-container">
        <div class="event-detail__footer-top">
          <div class="event-detail__footer-brand-wrap">
            <div class="event-detail__footer-brand-title">
              <span>QRchive</span>
              <span class="tagline-badge">Celebration Vault</span>
            </div>
            <p class="event-detail__footer-brand-desc">
              Timeless heirloom digital archiving and bespoke event memories crafted in quiet luxury.
            </p>
          </div>

          <div class="event-detail__footer-links">
            <a href="#" @click.prevent="activeTab = 'tab1'">Celebration</a>
            <a href="#" @click.prevent="activeTab = 'tab2'">Guestbook</a>
            <a href="#" @click.prevent="activeTab = 'tab3'">Keepsakes</a>
          </div>
        </div>

        <div class="event-detail__footer-bottom">
          <p style="margin: 0;">&copy; 2024 QRchive Celebration Vault. Handcrafted with bespoke intimacy.</p>
          <div class="event-detail__footer-sublinks">
            <a href="#" @click.prevent="handleAction('Concierge support contacted')">Concierge</a>
            <a href="#" @click.prevent="handleAction('Privacy archive documentation')">Privacy Archive</a>
            <a href="#" @click.prevent="handleAction('Curator terms of service')">Curator Terms</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style lang="scss">
@use '@/styles/pages/event-detail.scss';

.spinning {
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
