<script setup>
import { ref, computed, watchEffect, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QRCode from 'qrcode'
import { useToast } from '@/composables/useToast'
import { axiosInstance, API_BASE_URL } from '@/plugins/axios'
import JBtn from '@/@core/components/JBtn.vue'
import JModal from '@/@core/components/JModal.vue'
import EventPhotosTab from '@/views/dashboards/owner/EventPhotosTab.vue'
import EventManageTab from '@/views/dashboards/owner/EventManageTab.vue'
import EventPlacardsTab from '@/views/dashboards/owner/EventPlacardsTab.vue'

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

// Primary tab: 'tab1' (Photos) | 'tab2' (Event Management) | 'tab3' (Placards)
const activeTab = ref('tab1')

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

// Scannable live QR Code SVG with "QRchive Events" center badge
const qrSvg = ref('')
const qrCodeUrl = computed(() => `${hostOrigin.value}/event/${eventCode.value}`)

const generateQrSvg = async () => {
  const url = qrCodeUrl.value
  if (!url) return
  try {
    const rawSvg = await QRCode.toString(url, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2,
      color: {
        dark: '#1f1b18',
        light: '#ffffff',
      },
    })

    const match = rawSvg.match(/viewBox="0 0 (\d+) (\d+)"/)
    if (match) {
      const w = parseInt(match[1], 10)
      const h = parseInt(match[2], 10)
      const cx = w / 2
      const cy = h / 2
      const bw = Math.round(w * 0.36)
      const bh = Math.round(bw * 0.48)
      const bx = (w - bw) / 2
      const by = (h - bh) / 2
      const rx = 1.4

      const badge = `
        <g class="qr-center-badge">
          <!-- White outer halo for crisp separation from QR modules -->
          <rect x="${(bx - 0.45).toFixed(2)}" y="${(by - 0.45).toFixed(2)}" width="${(bw + 0.9).toFixed(2)}" height="${(bh + 0.9).toFixed(2)}" rx="${(rx + 0.3).toFixed(2)}" fill="#ffffff" />
          <!-- Luxury badge background with brand gold border -->
          <rect x="${bx.toFixed(2)}" y="${by.toFixed(2)}" width="${bw.toFixed(2)}" height="${bh.toFixed(2)}" rx="${rx.toFixed(2)}" fill="#1f1b18" stroke="#c5a059" stroke-width="0.4" />
          <!-- QRchive brand typography -->
          <text x="${cx.toFixed(2)}" y="${(cy - 0.65).toFixed(2)}" fill="#ffffff" font-family="'Playfair Display', Georgia, serif" font-size="${(bw * 0.17).toFixed(2)}" font-weight="700" letter-spacing="0.05" text-anchor="middle" dominant-baseline="central">QRchive</text>
          <!-- Events sub-label -->
          <text x="${cx.toFixed(2)}" y="${(cy + 1.45).toFixed(2)}" fill="#c5a059" font-family="'Inter', -apple-system, sans-serif" font-size="${(bw * 0.095).toFixed(2)}" font-weight="700" letter-spacing="0.25" text-anchor="middle" dominant-baseline="central">EVENTS</text>
        </g>
      `
      qrSvg.value = rawSvg.replace('</svg>', `${badge}</svg>`)
    } else {
      qrSvg.value = rawSvg
    }
  } catch (err) {
    console.error('Failed to generate QR code SVG:', err)
  }
}

watchEffect(() => {
  if (hostOrigin.value && eventCode.value) {
    generateQrSvg()
  }
})

// Download high-resolution vector SVG with embedded logo
const downloadQrCode = () => {
  if (!qrSvg.value) {
    handleAction('QR Code is still generating...', 'info')
    return
  }
  const blob = new Blob([qrSvg.value], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `qrchive-${eventCode.value}-qr.svg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  handleAction('High-res SVG QR code downloaded', 'success')
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

const storageURL = import.meta.env.VITE_STORAGE_URL;

// Default fallback hero image if no custom desktop_cropped background is set
const defaultHeroImg = storageURL + '/static/cover-photo.jpg'

const desktopCroppedBackground = ref('')

const heroBackgroundUrl = computed(() => {
  return (
    desktopCroppedBackground.value ||
    eventData.value?.desktopCroppedUrl ||
    eventData.value?.backgrounds?.find((b) => b.type === 'desktop_cropped')?.url ||
    defaultHeroImg
  )
})

// Fetch Event Backgrounds from /api/events/:id/backgrounds (event_photos table)
const fetchBackgrounds = async () => {
  try {
    const eventId = eventData.value?.id || eventCode.value
    const { data } = await axiosInstance.get(`/api/events/${eventId}/backgrounds`)
    const list = data?.backgrounds || []
    const deskCrop = list.find((b) => b.type === 'desktop_cropped')
    if (deskCrop?.url) {
      desktopCroppedBackground.value = deskCrop.url
    }
  } catch (err) {
    console.warn('[DashboardEvent] Could not fetch event backgrounds:', err?.message || err)
  }
}

// 1. Fetch Event Stats & Details from /api/events/token/:token/stats
const fetchEventStats = async () => {
  try {
    isLoadingEvent.value = true
    const { data } = await axiosInstance.get(`/api/events/token/${eventCode.value}/stats`)
    if (data) {
      eventData.value = data
      if (data.desktopCroppedUrl) {
        desktopCroppedBackground.value = data.desktopCroppedUrl
      }
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
  fetchBackgrounds()
})

onUnmounted(() => {
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
            :disabled="isDownloadingZip" :style="isDownloadingZip ? 'opacity: 0.85; cursor: wait;' : ''"
            @click="downloadAllFiles">
            <span v-if="isDownloadingZip" class="material-symbols-outlined spinning"
              style="font-size: 1.1rem;">progress_activity</span>
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
          <img class="event-detail__hero-img" :alt="eventTitle || 'Event Background'" :src="heroBackgroundUrl" />
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
          <span class="material-symbols-outlined tab-icon">settings_suggest</span>
          <span>Event Management &amp; QR Pass</span>
        </button>

        <button type="button" class="event-detail__tab-btn" :class="{ 'is-active': activeTab === 'tab2' }"
          @click="activeTab = 'tab2'">
          <span class="material-symbols-outlined tab-icon">photo_library</span>
          <span>Guest Photos</span>
        </button>

        <button type="button" class="event-detail__tab-btn" :class="{ 'is-active': activeTab === 'tab3' }"
          @click="activeTab = 'tab3'">
          <span class="material-symbols-outlined tab-icon">style</span>
          <span>5×7" Table Placard Templates</span>
        </button>
      </div>
    </section>

    <!-- TAB 1: Event Management (Vertical Tabs: Event Details, Event Checklists, Event Background, Event QR Code) -->
    <EventManageTab v-if="activeTab === 'tab1'" :event-code="eventCode" :event-data="eventData"
      :couple-names="coupleNames" :formatted-event-date="formattedEventDate" :host-origin="hostOrigin" :qr-svg="qrSvg"
      @refresh-event="fetchEventStats" @refresh-backgrounds="fetchBackgrounds"
      @refresh-checklists="fetchChecklistPhotos" @download-qr="downloadQrCode" @copy-url="copyVaultUrl" />

    <!-- TAB 2: Guest Photos & Albums -->
    <EventPhotosTab v-else-if="activeTab === 'tab2'" :albums="albums" :is-loading-albums="isLoadingAlbums"
      :event-code="eventCode" :event-data="eventData" @action="handleAction" />


    <!-- TAB 3: 5x7" Table Placard Templates -->
    <EventPlacardsTab v-else-if="activeTab === 'tab3'" :event-code="eventCode" :event-title="eventTitle"
      :couple-names="coupleNames" :couple-initials="coupleInitials" :formatted-event-date="formattedEventDate"
      :host-origin="hostOrigin" @action="handleAction" />

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
          <p style="margin: 0;">&copy; 2026 QRchive Event. Powered by Ababa Online Store.</p>
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
