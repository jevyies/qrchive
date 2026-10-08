import { ref, computed } from 'vue'
import { axiosInstance } from '@/plugins/axios'

// Module-level reactive singleton state for the active event's slideshow
const slideshowPhotos = ref([])
const isLoadingSlideshow = ref(false)
const currentEventCode = ref('')

export function useEventSlideshow() {
  const slideshowPhotoIds = computed(() => {
    return new Set(slideshowPhotos.value.map((p) => Number(p.id || p.photoId)))
  })

  const isPhotoInSlideshow = (photoId) => {
    if (!photoId) return false
    return slideshowPhotoIds.value.has(Number(photoId))
  }

  // Fetch all selected slideshow photos for this event
  const fetchSlideshow = async (eventCode) => {
    if (!eventCode) return
    currentEventCode.value = eventCode
    isLoadingSlideshow.value = true
    try {
      let res = null
      try {
        res = await axiosInstance.get(`/api/photos/token/${eventCode}/slideshow`)
      } catch {
        res = await axiosInstance.get(`/api/photos/events/${eventCode}/slideshow`)
      }

      if (res?.data?.photos) {
        slideshowPhotos.value = res.data.photos
      } else if (Array.isArray(res?.data)) {
        slideshowPhotos.value = res.data
      }
    } catch (err) {
      console.warn('[useEventSlideshow] Error fetching slideshow photos:', err?.message || err)
    } finally {
      isLoadingSlideshow.value = false
    }
  }

  // Toggle selection of a photo in the event slideshow
  const togglePhotoInSlideshow = async (photo, eventCode) => {
    if (!photo || !photo.id) return false
    const code = eventCode || currentEventCode.value || 'demo-event'
    const photoId = Number(photo.id)
    const wasSelected = isPhotoInSlideshow(photoId)

    // Optimistic UI update
    if (wasSelected) {
      slideshowPhotos.value = slideshowPhotos.value.filter(
        (p) => Number(p.id || p.photoId) !== photoId
      )
    } else {
      slideshowPhotos.value = [
        {
          id: photoId,
          photoId,
          url: photo.fullUrl || photo.url,
          fullUrl: photo.fullUrl || photo.url,
          thumbnailUrl: photo.thumbnailUrl || photo.fullUrl || photo.url,
          uploadedBy: photo.uploadedBy || 'Guest',
          checklistName: photo.checklistName || 'Curated Moment',
          likesCount: photo.likesCount ?? photo.likes ?? 0,
          isVideo: Boolean(photo.isVideo),
          createdAt: photo.createdAt || new Date().toISOString(),
          inSlideshow: true,
        },
        ...slideshowPhotos.value,
      ]
    }

    try {
      let res = null
      try {
        res = await axiosInstance.post(`/api/photos/token/${code}/slideshow/toggle`, {
          photoId,
          selected: !wasSelected,
        })
      } catch {
        res = await axiosInstance.post(`/api/photos/events/${code}/slideshow/toggle`, {
          photoId,
          selected: !wasSelected,
        })
      }
      return Boolean(res?.data?.inSlideshow ?? !wasSelected)
    } catch (err) {
      console.warn('[useEventSlideshow] Error toggling photo in slideshow:', err?.message || err)
      // Rollback on failure
      if (wasSelected) {
        slideshowPhotos.value.push(photo)
      } else {
        slideshowPhotos.value = slideshowPhotos.value.filter(
          (p) => Number(p.id || p.photoId) !== photoId
        )
      }
      return wasSelected
    }
  }

  // Remove a photo from the slideshow
  const removePhotoFromSlideshow = async (photoId, eventCode) => {
    if (!photoId) return
    const code = eventCode || currentEventCode.value || 'demo-event'
    const idNum = Number(photoId)

    const prevList = [...slideshowPhotos.value]
    slideshowPhotos.value = slideshowPhotos.value.filter(
      (p) => Number(p.id || p.photoId) !== idNum
    )

    try {
      try {
        await axiosInstance.delete(`/api/photos/token/${code}/slideshow/${idNum}`)
      } catch {
        await axiosInstance.delete(`/api/photos/events/${code}/slideshow/${idNum}`)
      }
    } catch (err) {
      console.warn('[useEventSlideshow] Error removing photo from slideshow:', err?.message || err)
      // Rollback
      slideshowPhotos.value = prevList
    }
  }

  // Preload all photos into memory before slideshow begins
  const preloadPhotos = async (photoList, onProgress) => {
    if (!photoList || photoList.length === 0) return true

    let loadedCount = 0
    const total = photoList.length

    const preloadSingle = (photo) => {
      return new Promise((resolve) => {
        const mediaUrl = photo.fullUrl || photo.url
        if (!mediaUrl) {
          loadedCount++
          if (onProgress) {
            onProgress({
              current: loadedCount,
              total,
              percent: Math.round((loadedCount / total) * 100),
            })
          }
          return resolve(true)
        }

        if (photo.isVideo) {
          const video = document.createElement('video')
          video.preload = 'auto'
          video.onloadeddata = () => {
            loadedCount++
            if (onProgress) {
              onProgress({
                current: loadedCount,
                total,
                percent: Math.round((loadedCount / total) * 100),
              })
            }
            resolve(true)
          }
          video.onerror = () => {
            loadedCount++
            if (onProgress) {
              onProgress({
                current: loadedCount,
                total,
                percent: Math.round((loadedCount / total) * 100),
              })
            }
            resolve(false)
          }
          video.src = mediaUrl
        } else {
          const img = new Image()
          img.onload = () => {
            loadedCount++
            if (onProgress) {
              onProgress({
                current: loadedCount,
                total,
                percent: Math.round((loadedCount / total) * 100),
              })
            }
            resolve(true)
          }
          img.onerror = () => {
            loadedCount++
            if (onProgress) {
              onProgress({
                current: loadedCount,
                total,
                percent: Math.round((loadedCount / total) * 100),
              })
            }
            resolve(false)
          }
          img.src = mediaUrl
        }
      })
    }

    await Promise.all(photoList.map(preloadSingle))
    return true
  }

  return {
    slideshowPhotos,
    slideshowPhotoIds,
    isLoadingSlideshow,
    isPhotoInSlideshow,
    fetchSlideshow,
    togglePhotoInSlideshow,
    removePhotoFromSlideshow,
    preloadPhotos,
  }
}
