<script setup>
import { isVideoFile, getImageDataUrl, getVideoDetails } from '@/utils/media'

const props = defineProps({
    eventDetails: {
        type: Object,
        default: () => ({})
    },
    eventDate: {
        type: String,
        default: ''
    },
    capturedCount: {
        type: Number,
        default: 0
    },
    totalCount: {
        type: Number,
        default: 0
    },
    progressPercent: {
        type: Number,
        default: 0
    },
    moments: {
        type: Array,
        default: () => []
    }
})
const emit = defineEmits(['open-camera', 'open-lightbox', 'upload-moment'])

const checklistFileInput = ref(null)
const activeUploadMoment = ref(null)

const isPastEvent = computed(() => {
    const rawDate = props.eventDetails?.eventDate || props.eventDetails?.event_date || props.eventDetails?.weddingDate || props.eventDate
    if (!rawDate) return false
    const eventDate = new Date(rawDate)
    if (isNaN(eventDate.getTime())) return false

    const now = new Date()

    // 1. Calendar day difference
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const eventMidnight = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()).getTime()
    const calendarDiffDays = Math.floor((nowMidnight - eventMidnight) / (1000 * 60 * 60 * 24))

    // 2. 24 hours elapsed difference
    const elapsedMs = now.getTime() - eventDate.getTime()
    const isAtLeast24Hours = elapsedMs >= 24 * 60 * 60 * 1000

    return calendarDiffDays >= 1 || isAtLeast24Hours
})

const handleAction = (item, isReplace = false) => {
    if (item.isUploading) return
    if (isPastEvent.value) {
        activeUploadMoment.value = { item, isReplace: Boolean(isReplace || item.captured) }
        if (checklistFileInput.value) {
            checklistFileInput.value.click()
        }
    } else {
        openCamera(item, isReplace)
    }
}

const openCamera = (item, isReplace = false) => {
    emit('open-camera', { ...item, isReplace: Boolean(isReplace || item.captured) })
}

const handleFileSelected = async (event) => {
    const file = event.target?.files?.[0]
    event.target.value = ''
    if (!file || !activeUploadMoment.value?.item) return

    const { item, isReplace } = activeUploadMoment.value
    activeUploadMoment.value = null

    const isVid = isVideoFile(file)
    if (isVid) {
        const videoDetails = await getVideoDetails(file)
        if (!videoDetails.valid) {
            alert(videoDetails.error || `Video "${file.name}" exceeds the 30-second limit. Videos must be 30 seconds or less.`)
            return
        }

        emit('upload-moment', {
            moment: item,
            file: file,
            previewUrl: videoDetails.thumbnailDataUrl || videoDetails.videoUrl,
            extra: {
                isReplace,
                oldPhotoId: item.photoId || null,
                isVideo: true,
                videoUrl: videoDetails.videoUrl,
                duration: Math.round(videoDetails.duration),
                fileName: file.name,
                mimeType: file.type || 'video/mp4',
            }
        })
    } else {
        const dataUrl = await getImageDataUrl(file)
        if (!dataUrl) return

        emit('upload-moment', {
            moment: item,
            file: file,
            previewUrl: dataUrl,
            extra: {
                isReplace,
                oldPhotoId: item.photoId || null,
                isVideo: false,
                fileName: file.name,
                mimeType: file.type || 'image/jpeg',
            }
        })
    }
}

const openMomentLightbox = (item) => {
    emit('open-lightbox', item)
}
</script>
<template>
    <div id="checklist-section-wrapper" class="checklist-section">
        <!-- Progress Card -->
        <div id="checklist-progress-card" class="checklist-progress-card">
            <div class="checklist-progress-card__header">
                <span id="checklist-counter" class="checklist-progress-card__counter">
                    {{ capturedCount }} of {{ totalCount }} Captured
                </span>
            </div>
            <h1 class="checklist-progress-card__title">Photo Checklist</h1>
            <p class="checklist-progress-card__desc">
                Help capture celebrant's special moments.
                <strong>1 photo or video per moment.</strong> You can replace your entry anytime.
            </p>
            <div class="checklist-progress-card__bar-wrap">
                <div class="checklist-progress-card__track">
                    <div class="checklist-progress-card__fill" :style="{ width: `${progressPercent}%` }">
                    </div>
                </div>
            </div>
        </div>

        <!-- Checklist Stream -->
        <div id="checklist-items-container" class="checklist-stream">
            <div v-for="item in moments" :key="item.id" class="moment-item" :data-category="item.category">
                <div class="moment-item__content">
                    <!-- Border Style Progress Frame copying .quick-stack-border-frame -->
                    <div class="moment-item__thumb-frame" :class="{
                        'is-uploading': item.isUploading,
                        'is-success': item.showSuccessCheck,
                    }" :style="{
                        '--count': `${item.uploadPercent || 0}%`,
                        '--upload-pct': `${item.uploadPercent || 0}%`,
                    }">
                        <!-- Thumbnail if uploaded or currently uploading preview -->
                        <div v-if="(item.captured || item.isUploading) && item.image" class="moment-item__thumb-wrap"
                            @click="item.captured && openMomentLightbox(item)">
                            <img :alt="item.title" class="moment-item__thumb-img" :src="item.image"
                                @error="(e) => { if (item.fullImage && e.target.src !== item.fullImage) e.target.src = item.fullImage }">

                            <!-- Video Play Badge if Video -->
                            <div v-if="item.isVideo && item.captured && !item.isUploading && !item.showSuccessCheck"
                                class="moment-item__video-badge">
                                <JIcon name="player-play" />
                            </div>

                            <!-- Check in the center of the image after successful upload, disappears after 1 second -->
                            <transition name="center-check-pop">
                                <div v-if="item.showSuccessCheck" class="moment-item__center-check">
                                    <JIcon name="check" />
                                </div>
                            </transition>

                            <!-- Regular corner badge when completed and not showing center check -->
                            <div v-if="item.captured && !item.isUploading && !item.showSuccessCheck"
                                class="moment-item__thumb-badge">
                                <JIcon name="check" />
                            </div>
                        </div>

                        <!-- Placeholder if pending -->
                        <div v-else class="moment-item__placeholder-wrap">
                            <JIcon name="photo-question" size="30" />
                        </div>
                    </div>

                    <!-- Moment Details -->
                    <div class="moment-item__details">
                        <div class="moment-item__meta">
                            <span v-if="item.captured" class="moment-item__status-verified">
                                <JIcon name="verified" size="18" />
                                1/1 Uploaded
                            </span>
                            <span v-else class="moment-item__category-label">
                                {{ item.categoryLabel || 'Reception' }}
                            </span>
                        </div>
                        <h2 class="moment-item__title">{{ item.title }}</h2>
                        <span class="moment-item__subtitle">{{ item.description }}</span>
                    </div>
                </div>

                <!-- Button Actions -->
                <button v-if="item.captured" class="moment-item__btn moment-item__btn--replace" type="button"
                    :disabled="item.isUploading" @click="handleAction(item, true)">
                    <JIcon name="spinner" size="20" />
                    <span>REPLACE ENTRY</span>
                </button>

                <button v-else class="moment-item__btn moment-item__btn--add" type="button" :disabled="item.isUploading"
                    @click="handleAction(item, false)">
                    <JIcon :name="isPastEvent ? 'cloud-upload' : 'camera-up'" size="20" />
                    <span>{{ isPastEvent ? 'UPLOAD ENTRY' : 'ADD ENTRY' }}</span>
                </button>
            </div>
        </div>

        <input ref="checklistFileInput" type="file" accept="image/*,video/*" class="checklist-hidden-input"
            @change="handleFileSelected" />
    </div>
</template>