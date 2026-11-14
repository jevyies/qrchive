<script setup>
import QRCode from 'qrcode'
import LiveSlideshowModal from '@/views/dashboards/owner/LiveSlideshowModal.vue'
import EventDetailTemplate from '@/views/dashboards/owner/EventDetailTemplate.vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { axiosInstance } from '@/plugins/axios'
import { useEventSlideshow } from '@/composables/useEventSlideshow'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const { slideshowPhotos, fetchSlideshow } = useEventSlideshow()
const isSlideshowModalOpen = ref(false)

const openSlideshowModal = () => {
  const code = eventData.value?.token || eventData.value?.id || eventCode.value
  fetchSlideshow(code)
  isSlideshowModalOpen.value = true
}

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


// Default fallback hero image if no custom desktop_cropped background is set

const desktopCroppedBackground = ref('')



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
  fetchSlideshow(eventCode.value)
})

onUnmounted(() => {
  if (downloadPollTimer) {
    clearInterval(downloadPollTimer)
    downloadPollTimer = null
  }
})
</script>

<template>
  <section>
    <EventDetailTemplate :slideshowPhotos="slideshowPhotos" :eventData="eventData" :isDownloadingZip="isDownloadingZip"
      :eventTitle="eventTitle" :desktopCroppedBackground="desktopCroppedBackground" :albums="albums"
      :hostOrigin="hostOrigin" :eventCode="eventCode" :qrSvg="qrSvg" @goBackToDashboard="goBackToDashboard"
      @fetchEventStatus="fetchEventStats" @fetchBackgrounds="fetchBackgrounds"
      @fetchChecklistPhotos="fetchChecklistPhotos" @downloadQrCode="downloadQrCode" @copyVaultUrl="copyVaultUrl"
      @downloadAllFiles="downloadAllFiles" @openSlideshowModal="openSlideshowModal" />
    <Teleport to="body">
      <LiveSlideshowModal v-model="isSlideshowModalOpen" :event-code="eventData?.token || eventData?.id || eventCode"
        :event-title="eventTitle" @action="handleAction" />
    </Teleport>
  </section>
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

.slideshow-counter-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 0.6875rem;
  font-weight: 700;
  color: #1a1614;
  background: linear-gradient(135deg, #e3c578, #c5a059);
  border-radius: 9999px;
  margin-left: 0.25rem;
}
</style>
