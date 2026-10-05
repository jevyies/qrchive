<script setup>
const props = defineProps({
    isDemo: {
        type: Boolean,
        default: true
    },
    isUnlimited: {
        type: Boolean,
        default: false
    },
    uploadedQuickPhotos: {
        type: Array,
        default: () => []
    },
    quickPhotosLeft: {
        type: Number,
        default: 0
    }
})
const emit = defineEmits(['reset-demo', 'open-camera', 'open-lightbox'])
const isResettingDemo = ref(false);
const resetSuccess = ref(false);

const handleResetDemo = () => {
    if (isResettingDemo.value) return
    const confirmed = window.confirm('Reset all demo uploaded photos, videos, and guest profile data?')
    if (!confirmed) return;
    isResettingDemo.value = true;
    emit('reset-demo')
}
const isOpenCameraDisabled = computed(() => {
    if (props.isUnlimited) return false;
    return props.uploadedQuickPhotos.length >= props.quickPhotosLeft;
})
const handleOpenCamera = () => {
    if (props.quickPhotosLeft <= 0 && !props.isUnlimited) return
    emit('open-camera', {
        id: 'quick',
        number: '⚡',
        title: 'Quick Snapshot',
        description: 'Instant candid capture saved to vault',
    })
}
const handlePhotoClick = (index) => {
    emit('open-lightbox', index)
}
const isVideoUrl = (url) => {
    if (!url || typeof url !== 'string') return false
    const cleanUrl = url.split('?')[0].toLowerCase()
    return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.mov') || cleanUrl.includes('/video/')
}

const getPhotoThumbnail = (photo) => {
    if (!photo) return ''

    const urlIsVideo = isVideoUrl(photo.url)
    const isVid = Boolean(photo.isVideo || photo.type === 'video' || urlIsVideo)

    if (isVid) {
        // 1. If thumbnailUrl is available and not a video file, use it
        if (photo.thumbnailUrl && !isVideoUrl(photo.thumbnailUrl)) {
            return photo.thumbnailUrl
        }
        // 2. If dataUrl (camera canvas preview frame) is available and not a video file, use it
        if (photo.dataUrl && !isVideoUrl(photo.dataUrl)) {
            return photo.dataUrl
        }
        // 3. If image is available and not a video file, use it
        if (photo.image && !isVideoUrl(photo.image)) {
            return photo.image
        }
        // 4. Derive _thumb.jpg from url or fullUrl if it is a video file
        const targetUrl = photo.url || photo.fullUrl || ''
        if (targetUrl && isVideoUrl(targetUrl)) {
            return targetUrl.replace(/\.(mp4|webm|mov)($|\?)/i, '_thumb.jpg$2')
        }
    }

    if (photo.url && !isVideoUrl(photo.url)) {
        return photo.url
    }

    if (photo.thumbnailUrl && !isVideoUrl(photo.thumbnailUrl)) {
        return photo.thumbnailUrl
    }

    if (photo.dataUrl && !isVideoUrl(photo.dataUrl)) {
        return photo.dataUrl
    }

    return photo.url || photo.fullUrl || ''
}

const handleImageError = (photo, event) => {
    if (!photo || !event?.target) return
    const currentSrc = event.target.src || ''

    if (photo.thumbnailUrl && currentSrc !== photo.thumbnailUrl && !isVideoUrl(photo.thumbnailUrl)) {
        event.target.src = photo.thumbnailUrl
        return
    }

    if (photo.dataUrl && currentSrc !== photo.dataUrl && !isVideoUrl(photo.dataUrl)) {
        event.target.src = photo.dataUrl
        return
    }

    if (isVideoUrl(currentSrc)) {
        const derived = currentSrc.replace(/\.(mp4|webm|mov)($|\?)/i, '_thumb.jpg$2')
        if (derived !== currentSrc) {
            event.target.src = derived
            return
        }
    }

    if (photo.fullUrl && currentSrc !== photo.fullUrl && !isVideoUrl(photo.fullUrl)) {
        event.target.src = photo.fullUrl
        return
    }
}
const successResetDemo = () => {
    resetSuccess.value = true
    setTimeout(() => {
        resetSuccess.value = false
        isResettingDemo.value = false;
    }, 2200)
}
defineExpose({
    successResetDemo
})
</script>
<template>
    <div id="quick-capture-section" class="checklist-quick-section">
        <div class="checklist-quick-card__actions">
            <button class="checklist-quick-card__submit-btn" type="button" :disabled="isOpenCameraDisabled"
                @click="handleOpenCamera">
                <JIcon :name="isOpenCameraDisabled ? 'lock' : 'camera'" size="20" />
                <span>{{ isOpenCameraDisabled ? 'Photo Limit Reached' :
                    'Snap & Share Now' }}</span>
            </button>
        </div>
        <div id="quick-uploaded-stream-container" class="quick-uploaded-stream-container">
            <div class="quick-uploaded-stream-header">
                <div class="quick-uploaded-stream-title-group">
                    <span class="material-symbols-outlined quick-uploaded-stream-icon">cloud_done</span>
                    <span class="quick-uploaded-stream-title">Uploaded Quick Captures</span>
                </div>
                <span class="quick-uploaded-stream-badge">{{ uploadedQuickPhotos.length }}/{{
                    quickPhotosLeft }}</span>
            </div>
            <template v-if="uploadedQuickPhotos.length">
                <div class="quick-uploaded-stream">
                    <div v-for="(photo, index) in uploadedQuickPhotos" :key="photo.id || index"
                        class="quick-uploaded-item" :class="{
                            'is-newly-added': photo.isNew,
                            'is-uploading': photo.isUploading,
                            'is-success': photo.showSuccessCheck,
                        }" :style="{
                            '--count': `${photo.uploadPercent || 0}%`,
                            '--upload-pct': `${photo.uploadPercent || 0}%`,
                        }" @click="!photo.isUploading && handlePhotoClick(index)">
                        <div class="quick-uploaded-inner">
                            <!-- Fallback video frame if video has no image thumbnail -->
                            <video v-if="photo.isVideo && isVideoUrl(getPhotoThumbnail(photo))"
                                class="quick-uploaded-img" :src="photo.videoUrl || photo.fullUrl || photo.url" muted
                                playsinline preload="metadata">
                            </video>

                            <!-- Media Image Thumbnail -->
                            <img v-else :src="getPhotoThumbnail(photo)" alt="Uploaded moment" class="quick-uploaded-img"
                                @error="handleImageError(photo, $event)" />

                            <!-- Video Play Badge if Video -->
                            <div v-if="photo.isVideo && !photo.isUploading && !photo.showSuccessCheck"
                                class="quick-video-badge">
                                <span class="material-symbols-outlined">play_arrow</span>
                            </div>

                            <!-- Circular Progress Indicator in Center while uploading -->
                            <div v-if="photo.isUploading && !photo.showSuccessCheck"
                                class="quick-uploading-center-indicator">
                                <svg class="quick-progress-ring" viewBox="0 0 44 44">
                                    <circle class="quick-progress-ring__bg" cx="22" cy="22" r="18" />
                                    <circle class="quick-progress-ring__circle" cx="22" cy="22" r="18"
                                        :style="{ strokeDashoffset: `${113.1 - (113.1 * (photo.uploadPercent || 0)) / 100}` }" />
                                </svg>
                                <span class="quick-progress-pct">{{ photo.uploadPercent || 0 }}%</span>
                            </div>

                            <!-- Check in the center of the image after successful upload, disappears after 1 second -->
                            <transition name="center-check-pop">
                                <div v-if="photo.showSuccessCheck" class="moment-item__center-check">
                                    <span class="material-symbols-outlined check-icon">check</span>
                                </div>
                            </transition>

                            <div v-if="!photo.isUploading" class="quick-uploaded-overlay">
                                <span class="material-symbols-outlined quick-uploaded-check">check_circle</span>
                                <span class="quick-uploaded-time">{{ photo.uploadedAt || 'Just now' }}</span>
                            </div>
                            <div v-else class="quick-uploaded-overlay quick-uploading-overlay">
                                <span class="quick-uploading-label">Uploading...</span>
                                <span class="quick-uploading-pct">{{ photo.uploadPercent || 0 }}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
            <template v-else>
                <div class="py-10 text-center">
                    <p>Your photos will appear here.</p>
                    <a class="text-underlined" href="javascript:void(0);" @click="handleOpenCamera">Snap now!</a>
                </div>
            </template>
        </div>

        <!-- Reset Demo Button (Only if route.params.id === 'demo-event') -->
        <div v-if="isDemo" class="demo-reset-wrapper">
            <button class="demo-reset-btn" :class="{ 'is-success': resetSuccess }" type="button"
                :disabled="isResettingDemo" @click="handleResetDemo">
                <span class="material-symbols-outlined" :class="{ 'demo-spin': isResettingDemo && !resetSuccess }">
                    {{ resetSuccess ? 'check_circle' : (isResettingDemo ? 'sync' : 'restart_alt') }}
                </span>
                <span>{{ resetSuccess ? 'Demo Reset Complete' : (isResettingDemo ? 'Resetting...' :
                    'Reset Demo') }}</span>
            </button>
        </div>
    </div>
</template>