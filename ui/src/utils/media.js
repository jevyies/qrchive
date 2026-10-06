/**
 * Utility helpers for media handling, video duration validation, and thumbnail extraction
 */

export const isVideoFile = (file) => {
    if (!file) return false
    return Boolean(
        file.type?.startsWith('video/') ||
        /\.(mp4|webm|mov|m4v|3gp|mkv|avi)$/i.test(file.name || '')
    )
}

export const getImageDataUrl = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result || '')
        reader.onerror = () => resolve('')
        reader.readAsDataURL(file)
    })
}

export const getVideoDetails = (file) => {
    return new Promise((resolve) => {
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.playsInline = true
        video.muted = true
        const objectUrl = URL.createObjectURL(file)
        video.src = objectUrl

        let finished = false
        const done = (result) => {
            if (finished) return
            finished = true
            resolve(result)
        }

        const timeout = setTimeout(() => {
            URL.revokeObjectURL(objectUrl)
            done({
                valid: false,
                error: `Timed out reading video "${file.name}". Please ensure it is a valid video file.`,
            })
        }, 8000)

        video.onloadedmetadata = () => {
            const duration = video.duration
            if (!duration || isNaN(duration) || Math.round(duration) > 30) {
                clearTimeout(timeout)
                URL.revokeObjectURL(objectUrl)
                done({
                    valid: false,
                    duration: duration || 0,
                    error: `Video "${file.name}" is ${Math.round(duration || 0)} seconds long. Videos must be 30 seconds or less.`,
                })
                return
            }

            // Duration is within 30 seconds (<= 30s)
            let seekTimer = setTimeout(() => {
                clearTimeout(timeout)
                done({
                    valid: true,
                    duration,
                    thumbnailDataUrl: '',
                    videoUrl: objectUrl,
                })
            }, 2000)

            video.onseeked = () => {
                clearTimeout(seekTimer)
                clearTimeout(timeout)
                let thumbnailDataUrl = ''
                try {
                    const canvas = document.createElement('canvas')
                    const width = video.videoWidth || 720
                    const height = video.videoHeight || 1280
                    canvas.width = width
                    canvas.height = height
                    const ctx = canvas.getContext('2d')
                    ctx.drawImage(video, 0, 0, width, height)
                    thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.85)
                } catch (e) {
                    console.warn('[Media] Video thumbnail canvas failed:', e)
                }
                done({
                    valid: true,
                    duration,
                    thumbnailDataUrl,
                    videoUrl: objectUrl,
                })
            }

            try {
                video.currentTime = Math.min(0.2, Math.max(0.01, duration / 2))
            } catch {
                clearTimeout(seekTimer)
                clearTimeout(timeout)
                done({
                    valid: true,
                    duration,
                    thumbnailDataUrl: '',
                    videoUrl: objectUrl,
                })
            }
        }

        video.onerror = () => {
            clearTimeout(timeout)
            URL.revokeObjectURL(objectUrl)
            done({
                valid: false,
                error: `Failed to load video "${file.name}". Please ensure it is a supported video format.`,
            })
        }
    })
}
