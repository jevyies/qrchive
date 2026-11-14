<script setup>
import EventWelcomePage from '@/views/EventWelcomePage.vue'
import EventBoard from '@/views/EventBoard.vue'
import AppLogo from '@core/components/AppLogo.vue'
import LiveGallery from '@/views/LiveGallery.vue';
import EventTab from '@/views/EventTab.vue'

const props = defineProps({
    hasGuestAuth: Boolean,
    alreadyLoaded: Boolean,
    isPressed: Boolean,
    isDemo: Boolean,
    isUnlimited: Boolean,
    bannerImage: {
        type: String,
        default: ''
    },
    eventDetails: {
        type: [Object, null],
        default: null,
    },
    captureMode: {
        type: String,
        default: 'quick'
    },
    moments: {
        type: Array,
        default: () => []
    },
    uploadedQuickPhotos: {
        type: Array,
        default: () => []
    },
    capturedCount: Number,
    quickPhotosLeft: Number,
    totalCount: Number,
    progressPercent: Number
})
const emit = defineEmits([
    'goToHomePage',
    'handleGetStarted',
    'resetDemo',
    'openCamera',
    'openQuickPhotoLightbox',
    'openMomentLightbox',
    'handleCameraCapture',
    'handleChecklistUpload',
    'openGalleryLightbox',
    'update:captureMode'

])
const tabModel = ref('capture')
const tempCaptureMode = ref(props.captureMode);

const isCoupleEvent = computed(() => {
    const category = props.eventDetails?.eventCategory?.toLowerCase();
    if (category && (category.includes('wedding') || category.includes('anniversary'))) {
        return true;
    }
    return false;
})
const openGalleryLightbox = ($event) => {
    emit('openGalleryLightbox', { ...$event, isLightboxDownloadable: tabModel.value === 'gallery' })
}
watch(tempCaptureMode, (value) => {
    emit('update:captureMode', value)
})
</script>
<template>
    <div class="event-vault-root">
        <main class="event-viewport" :class="{ 'has-guest-auth': hasGuestAuth }">
            <!-- Atmospheric Editorial Overlays -->
            <div class="event-hero-image" :style="{ backgroundImage: `url(${bannerImage})` }"
                :class="{ active: hasGuestAuth }">

                <Transition name="slide-down">
                    <template v-if="alreadyLoaded && hasGuestAuth">
                        <div class="vault-hero__scrim-top"></div>
                    </template>
                </Transition>
                <Transition name="slide-down">
                    <template v-if="alreadyLoaded && hasGuestAuth">
                        <div class="vault-hero__scrim-bottom"></div>
                    </template>
                </Transition>
                <Transition name="slide-down">
                    <template v-if="alreadyLoaded && hasGuestAuth">
                        <div class="vault-hero__content">
                            <div class="vault-hero__eyebrow" v-if="isCoupleEvent">
                                <span class="vault-hero__eyebrow-dot"></span>
                                <span class="vault-hero__eyebrow-text">The Wedding of</span>
                                <span class="vault-hero__eyebrow-dot"></span>
                            </div>
                            <h1 class="vault-hero__title">{{ eventDetails?.name || 'Celebration' }}</h1>
                        </div>
                    </template>
                </Transition>
            </div>
            <Transition name="slide-down" v-if="!alreadyLoaded">
                <div v-if="!hasGuestAuth" class="event-vignettes-wrap">
                    <div class="event-vignette-top"></div>
                    <div class="event-vignette-radial"></div>
                    <div class="event-vignette-scrim"></div>
                </div>
            </Transition>

            <!-- Header Tier: Floating Atelier Brand & Date Badge -->
            <Transition name="slide-up" v-if="!alreadyLoaded">
                <header v-if="!hasGuestAuth" class="event-header">
                    <!-- Left: QRchive Atelier Emblem -->
                    <div class="event-brand-badge" role="button" tabindex="0" aria-label="Return to Homepage"
                        @click="goToHomePage">
                        <AppLogo :width="24" :height="24" color="#fff8f5" class="brand-logo" />
                        <div class="event-brand-info">
                            <span class="event-brand-title">QRchive</span>
                            <span class="event-brand-subtitle">Celebration Vault</span>
                        </div>
                    </div>
                </header>
            </Transition>
            <EventWelcomePage v-if="eventDetails?.token && !hasGuestAuth" :eventDetails="eventDetails"
                :isCoupleEvent="isCoupleEvent" :isPressed="isPressed" @homepage="emit('goToHomePage')"
                @get-started="emit('handleGetStarted')" />
            <template v-else-if="eventDetails?.token && hasGuestAuth">
                <input id="photo-upload-input" ref="fileInput" accept="image/*,video/*" multiple
                    class="checklist-hidden-input" type="file" @change="handleFileChange">
                <EventBoard v-if="tabModel == 'capture'" ref="eventBoardRef" :eventDetails="eventDetails"
                    v-model:captureMode="tempCaptureMode" :isDemo="isDemo" :isUnlimited="isUnlimited"
                    :uploadedQuickPhotos="uploadedQuickPhotos" :moments="moments" :quickPhotosLeft="quickPhotosLeft"
                    :capturedCount="capturedCount" :totalCount="totalCount" :progressPercent="progressPercent"
                    @reset-demo="emit('resetDemo')" @open-camera="emit('openCamera')"
                    @open-lightbox="emit('openQuickPhotoLightbox')" @open-moment-lightbox="emit('openMomentLightbox')"
                    @capture="emit('handleCameraCapture')" @upload-moment="emit('handleChecklistUpload')" />
                <LiveGallery :eventDetails="eventDetails" :isDemo="isDemo" v-if="tabModel == 'gallery'"
                    @open-lightbox="openGalleryLightbox" />
                <EventTab v-model="tabModel" />
            </template>
        </main>
    </div>
</template>