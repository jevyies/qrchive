<script setup>
import Checklist from './Checklist.vue'
import QuickCapture from './QuickCapture.vue'

const props = defineProps({
    eventDetails: {
        type: Object,
        required: true
    },
    isDemo: {
        type: Boolean,
        default: true
    },
    uploadedQuickPhotos: {
        type: Array,
        default: () => []
    },
    moments: {
        type: Array,
        default: () => []
    },
    capturedCount: {
        type: Number,
        default: 0
    },
    totalCount: {
        type: Number,
        default: 0
    },
    quickPhotosLeft: {
        type: Number,
        default: 0
    },
    progressPercent: {
        type: Number,
        default: 0
    },
    captureMode: {
        type: String,
        default: 'quick'
    },
    isUnlimited: {
        type: Boolean,
        default: false
    }
})
const emit = defineEmits(['reset-demo', 'open-camera', 'update:captureMode', 'open-lightbox', 'open-moment-lightbox', 'capture', 'upload-moment'])
const quickCaptureRef = ref();

const switchExperience = (mode) => {
    emit('update:captureMode', mode)
}
const resetDemo = () => {
    emit('reset-demo')
}
const openCamera = (moment) => {
    emit('open-camera', moment)
}
const handleCapture = (payload) => {
    emit('capture', payload)
}
const handleUploadMoment = (payload) => {
    emit('upload-moment', payload)
}
const handleOpenLightbox = (index) => {
    emit('open-lightbox', index)
}
const handleOpenMomentLightbox = (moment) => {
    emit('open-moment-lightbox', moment)
}
const successDemoReset = () => {
    return quickCaptureRef.value?.successResetDemo()
}
defineExpose({
    successDemoReset
})
</script>
<template>
    <div class="checklist-content">
        <div class="checklist-container">
            <!-- Hero Header Progress Card: Experience Switcher -->
            <div class="checklist-experience-switcher">
                <div class="checklist-experience-switcher__header">
                    <span class="checklist-experience-switcher__label">Select Capture Experience</span>
                    <span class="checklist-experience-switcher__badge">
                        <span class="material-symbols-outlined">tune</span>
                        Switch anytime
                    </span>
                </div>

                <div class="checklist-experience-switcher__grid">
                    <!-- Quick Capture Button -->
                    <button id="btn-quick-capture" class="checklist-experience-card"
                        :class="{ 'is-active': captureMode === 'quick' }" type="button"
                        @click="switchExperience('quick')">
                        <div class="checklist-experience-card__top">
                            <div class="checklist-experience-card__icon-wrap">
                                <span class="material-symbols-outlined">shutter_speed</span>
                            </div>
                            <span class="checklist-experience-card__check-indicator">
                                <span v-if="captureMode === 'quick'" class="material-symbols-outlined">check</span>
                                <span v-else class="checklist-experience-card__check-dot"></span>
                            </span>
                        </div>
                        <div class="checklist-experience-card__title-row">
                            <span class="checklist-experience-card__title">Quick Capture</span>
                        </div>
                        <span class="checklist-experience-card__desc">Snap or upload freely as moments
                            happen</span>
                    </button>

                    <!-- Photo Checklist Button -->
                    <button id="btn-checklist-capture" class="checklist-experience-card"
                        :class="{ 'is-active': captureMode === 'checklist' }" type="button"
                        @click="switchExperience('checklist')">
                        <div class="checklist-experience-card__top">
                            <div class="checklist-experience-card__icon-wrap">
                                <span class="material-symbols-outlined">checklist</span>
                            </div>
                            <span class="checklist-experience-card__check-indicator">
                                <span v-if="captureMode === 'checklist'" class="material-symbols-outlined">check</span>
                                <span v-else class="checklist-experience-card__check-dot"></span>
                            </span>
                        </div>
                        <div class="checklist-experience-card__title-row">
                            <span class="checklist-experience-card__title">Photo Checklist</span>
                        </div>
                        <span class="checklist-experience-card__desc">Follow guided moments to capture &amp;
                            earn
                            memories</span>
                    </button>
                </div>
            </div>
            <QuickCapture v-show="captureMode === 'quick'" ref="quickCaptureRef" :isDemo="isDemo"
                :eventDetails="eventDetails" :isUnlimited="isUnlimited" :uploadedQuickPhotos="uploadedQuickPhotos"
                :quickPhotosLeft="quickPhotosLeft" @reset-demo="resetDemo" @open-camera="openCamera"
                @open-lightbox="handleOpenLightbox" @capture="handleCapture" />
            <Checklist v-show="captureMode === 'checklist'" :isDemo="isDemo" :isUnlimited="isUnlimited"
                :eventDetails="eventDetails" :capturedCount="capturedCount" :totalCount="totalCount"
                :progressPercent="progressPercent" :moments="moments" @open-camera="openCamera"
                @open-lightbox="handleOpenMomentLightbox" @upload-moment="handleUploadMoment" />
        </div>
    </div>
</template>