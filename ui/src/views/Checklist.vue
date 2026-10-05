<script setup>
const props = defineProps({
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
const emit = defineEmits(['open-camera', 'open-lightbox'])

const openCamera = (item, isReplace = false) => {
    emit('open-camera', { ...item, isReplace: Boolean(isReplace || item.captured) })
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
                                <span class="material-symbols-outlined">play_arrow</span>
                            </div>

                            <!-- Check in the center of the image after successful upload, disappears after 1 second -->
                            <transition name="center-check-pop">
                                <div v-if="item.showSuccessCheck" class="moment-item__center-check">
                                    <span class="material-symbols-outlined check-icon">check</span>
                                </div>
                            </transition>

                            <!-- Regular corner badge when completed and not showing center check -->
                            <div v-if="item.captured && !item.isUploading && !item.showSuccessCheck"
                                class="moment-item__thumb-badge">
                                <span class="material-symbols-outlined"
                                    style="font-variation-settings: 'FILL' 1;">check</span>
                            </div>
                        </div>

                        <!-- Placeholder if pending -->
                        <div v-else class="moment-item__placeholder-wrap">
                            <span class="material-symbols-outlined">broken_image</span>
                        </div>
                    </div>

                    <!-- Moment Details -->
                    <div class="moment-item__details">
                        <div class="moment-item__meta">
                            <span v-if="item.captured" class="moment-item__status-verified">
                                <span class="material-symbols-outlined"
                                    style="font-variation-settings: 'FILL' 1;">verified</span>
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
                    @click="openCamera(item, true)">
                    <span class="material-symbols-outlined">sync</span>
                    <span>REPLACE ENTRY</span>
                </button>

                <button v-else class="moment-item__btn moment-item__btn--add" type="button" @click="openCamera(item, false)">
                    <span class="material-symbols-outlined"
                        style="font-variation-settings: 'FILL' 1;">photo_camera</span>
                    <span>ADD ENTRY</span>
                </button>
            </div>
        </div>
    </div>
</template>