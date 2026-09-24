<route lang="yaml">
meta:
  layout: blank
  public: true
  keepAlive: true
</route>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useIntersectionObserver } from '@vueuse/core'
import { useEventVaultStore, extractPhotoCategoryKey } from '@/stores/eventVault'
import { getStoredEventSession, saveStoredEventSession } from '@/utils/device'
import LightBox from '@/views/LightBox.vue'

const route = useRoute()
const router = useRouter()
const eventVaultStore = useEventVaultStore()

// State from centralized store
const currentWedding = computed(() => eventVaultStore.currentWedding)
const isDemo = computed(() => eventVaultStore.isDemo)
const categories = computed(() => eventVaultStore.categories)
const totalMomentsCount = computed(() => eventVaultStore.totalMomentsCount)

// UI Filter & Sort
const selectedCategory = ref('all')
const sortBy = ref('recent') // 'recent' | 'loved'

// Filtered and sorted media stream from centralized store
const filteredMedia = computed(() => {
    let list = eventVaultStore.mediaItems

    if (selectedCategory.value !== 'all') {
        if (isDemo.value) {
            if (selectedCategory.value === 'quick-capture') {
                list = list.filter((item) => item.category === 'quick-capture' || item.category === 'quick-snaps')
            } else {
                list = list.filter((item) => item.category === selectedCategory.value)
            }
        } else if (selectedCategory.value === 'quick-capture') {
            list = list.filter((item) => {
                const seg = extractPhotoCategoryKey(item)
                return (
                    seg === 'quick-snaps' ||
                    (item.thumbnailUrl && item.thumbnailUrl.includes('quick-snaps')) ||
                    (item.fullUrl && item.fullUrl.includes('quick-snaps')) ||
                    (item.url && item.url.includes('quick-snaps'))
                )
            })
        } else {
            const targetId = String(selectedCategory.value)
            list = list.filter((item) => {
                const seg = extractPhotoCategoryKey(item)
                if (seg && String(seg) === targetId) return true
                if (item.checklistId !== null && item.checklistId !== undefined && String(item.checklistId) === targetId) {
                    return true
                }
                const inThumb = item.thumbnailUrl && item.thumbnailUrl.includes(`/${targetId}/`)
                const inFull = item.fullUrl && item.fullUrl.includes(`/${targetId}/`)
                const inUrl = item.url && item.url.includes(`/${targetId}/`)
                return inThumb || inFull || inUrl
            })
        }
    }

    if (sortBy.value === 'loved') {
        return [...list].sort((a, b) => b.likes - a.likes)
    }
    return list
})

// File Upload & Redis Batch Queue State (if used)
const fileInput = ref(null)
const uploadBatchState = ref({
    isActive: false,
    total: 0,
    completed: 0,
    failed: 0,
    percent: 0,
    activeWorkers: 0,
    currentFileName: '',
})

const toggleSort = () => {
    sortBy.value = sortBy.value === 'recent' ? 'loved' : 'recent'
}

// Fullscreen Lightbox State
const isLightboxOpen = ref(false)
const activeLightboxIndex = ref(0)

const openLightbox = (item) => {
    const idx = filteredMedia.value.findIndex((m) => m.id === item.id)
    activeLightboxIndex.value = idx !== -1 ? idx : 0
    isLightboxOpen.value = true
}

const closeLightbox = () => {
    isLightboxOpen.value = false
}

// Navigation helpers
const navigateToCapture = () => {
    const eventId = route.params.id || 'demo-event'
    router.push(`/event/${eventId}/quests`)
}

// -----------------------------------------------------------------------------
// Infinite Scroll Implementation (replaces 'Load More Moments' button)
// -----------------------------------------------------------------------------
const scrollSentinel = ref(null)

// Primary: IntersectionObserver with 350px anticipation
useIntersectionObserver(
    scrollSentinel,
    ([{ isIntersecting }]) => {
        if (
            isIntersecting &&
            eventVaultStore.hasMore &&
            !eventVaultStore.isLoadingMore &&
            !eventVaultStore.isLoadingPhotos
        ) {
            eventVaultStore.loadMorePhotos()
        }
    },
    { rootMargin: '350px' },
)

// Fallback: Window scroll listener for browsers / elastic bounces
const handleWindowScroll = () => {
    if (
        !eventVaultStore.hasMore ||
        eventVaultStore.isLoadingMore ||
        eventVaultStore.isLoadingPhotos ||
        eventVaultStore.isDemo
    ) {
        return
    }
    const scrollY = window.scrollY || document.documentElement.scrollTop
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight
    if (documentHeight - (scrollY + windowHeight) < 400) {
        eventVaultStore.loadMorePhotos()
    }
}

onMounted(() => {
    const eventId = route.params.id
    if (!isDemo.value) {
        let isAuthorized = false
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('currentEvent')
            if (stored) {
                try {
                    const parsed = JSON.parse(stored)
                    if (parsed && String(parsed.eventCode) === String(eventId)) {
                        isAuthorized = true
                    }
                } catch (err) {
                    console.error('[LiveVault] Error reading currentEvent from localStorage:', err)
                }
            }

            if (!isAuthorized) {
                const session = getStoredEventSession(eventId)
                if (session) {
                    saveStoredEventSession(eventId, session)
                    isAuthorized = true
                }
            }
        }
        if (!isAuthorized) {
            router.replace(`/event/${eventId}`)
            return
        }
    }

    // Initialize or load event data via centralized store
    // (If already loaded, this does NOT refetch or wipe loaded photos!)
    eventVaultStore.fetchInitialData(eventId)

    if (typeof window !== 'undefined') {
        window.addEventListener('scroll', handleWindowScroll, { passive: true })
    }
})

onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', handleWindowScroll)
    }
})
</script>

<template>
    <div class="vault-page-root">

        <!-- Floating Redis Batch Upload Progress Banner -->
        <transition name="fade-slide">
            <div v-if="uploadBatchState.isActive" class="floating-upload-banner">
                <div class="floating-upload-banner__inner">
                    <div class="floating-upload-banner__header">
                        <div class="floating-upload-banner__title">
                            <span class="upload-pulse-dot"></span>
                            <span>Uploading {{ uploadBatchState.completed }} of {{ uploadBatchState.total }}
                                Moments</span>
                        </div>
                        <span class="floating-upload-banner__pct">{{ uploadBatchState.percent }}%</span>
                    </div>

                    <!-- Animated Progress Bar -->
                    <div class="floating-upload-banner__track">
                        <div class="floating-upload-banner__bar" :style="{ width: `${uploadBatchState.percent}%` }">
                        </div>
                    </div>

                    <div class="floating-upload-banner__footer">
                        <span class="floating-upload-banner__sub">
                            {{ uploadBatchState.activeWorkers }} active • Redis batch queue active
                        </span>
                        <span v-if="uploadBatchState.failed > 0" class="floating-upload-banner__failed">
                            {{ uploadBatchState.failed }} failed
                        </span>
                    </div>
                </div>
            </div>
        </transition>

        <!-- Main Content Area: Zero top padding, hero flush to top -->
        <main class="vault-main">
            <!-- Hero Cover Banner & Couple Header -->
            <section class="vault-hero">
                <div class="vault-hero__banner">
                    <div class="vault-hero__bg"
                        :style="{ backgroundImage: `url(${currentWedding.heroImage})`, backgroundPosition: `0 -90px` }">
                    </div>

                    <!-- Soft Gradients Scrim -->
                    <div class="vault-hero__scrim-top"></div>
                    <div class="vault-hero__scrim-bottom"></div>

                    <!-- Banner Content Overlay -->
                    <div class="vault-hero__content">
                        <div class="vault-hero__eyebrow">
                            <span class="vault-hero__eyebrow-dot"></span>
                            <span class="vault-hero__eyebrow-text">The Wedding of</span>
                            <span class="vault-hero__eyebrow-dot"></span>
                        </div>
                        <h1 class="vault-hero__title">{{ currentWedding.couple }}</h1>
                    </div>
                </div>
            </section>

            <!-- Content Sheet Overlay (Slides over sticky hero) -->
            <div class="vault-content">
                <!-- Filter & Sort Navigation with "All" as first tab -->
                <section class="vault-filter-section">
                    <div class="vault-filter-header">
                        <span class="vault-filter-count">
                        </span>
                        <button id="sortToggleBtn" class="vault-sort-toggle" type="button" @click="toggleSort">
                            <span class="material-symbols-outlined">sort</span>
                            <span>{{ sortBy === 'recent' ? 'Recent' : 'Most Loved' }}</span>
                        </button>
                    </div>

                    <div class="vault-filter-scroll">
                        <button v-for="cat in categories" :key="cat.id" class="vault-filter-chip"
                            :class="selectedCategory === cat.id ? 'vault-filter-chip--active' : 'vault-filter-chip--inactive'"
                            type="button" @click="selectedCategory = cat.id">
                            {{ cat.id === 'all' ? `All (${totalMomentsCount})` : cat.label }}
                        </button>
                    </div>
                </section>

                <!-- Guest Media Feed Grid -->
                <section class="vault-feed-section">
                    <div v-if="filteredMedia.length > 0" class="vault-grid">
                        <div v-for="item in filteredMedia" :key="item.id" class="vault-card"
                            @click="openLightbox(item)">
                            <!-- Fallback video frame if video has no image thumbnail or thumbnail is a video URL -->
                            <video v-if="item.type === 'video' && (!item.thumbnailUrl || item.thumbnailUrl.endsWith('.mp4') || item.thumbnailUrl.endsWith('.webm'))"
                                class="vault-card__image vault-card__video-preview"
                                :src="item.videoUrl || item.fullUrl"
                                muted
                                playsinline
                                preload="metadata">
                            </video>

                            <!-- Media Image Thumbnail (100% full bleed, zero padding) -->
                            <img v-else :alt="item.title" class="vault-card__image" loading="lazy"
                                :src="item.thumbnailUrl || item.url"
                                @error="(e) => { if (item.fullUrl && !item.fullUrl.endsWith('.mp4') && e.target.src !== item.fullUrl) e.target.src = item.fullUrl }">

                            <!-- Gradient Scrim -->
                            <div class="vault-card__scrim"></div>

                            <!-- Video Duration / Play Badge -->
                            <div v-if="item.type === 'video'" class="vault-card__video-badge">
                                <span class="material-symbols-outlined">play_arrow</span>
                                <span class="vault-card__video-duration">{{ item.duration || '0:30' }}</span>
                            </div>

                            <!-- Like Button -->
                            <button aria-label="Like moment" class="vault-card__like-btn"
                                :class="{ 'is-liked': item.isLiked }" type="button"
                                @click.stop="eventVaultStore.toggleLike(item, $event)">
                                <span class="material-symbols-outlined vault-card__like-icon">favorite</span>
                                <span class="vault-card__like-count">{{ item.likes }}</span>
                            </button>

                            <!-- Guest Name Overlay Badge -->
                            <div class="vault-card__guest-badge">
                                <span class="vault-card__guest-dot"></span>
                                <span class="vault-card__guest-name">{{ item.guest }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Empty State if no moments match filter -->
                    <div v-else class="vault-empty">
                        <span class="material-symbols-outlined vault-empty__icon">photo_library</span>
                        <h2 class="vault-empty__title">No moments in this category yet</h2>
                    </div>

                    <!-- Infinite Scroll Loading Indicator (shown only when actively loading) -->
                    <div v-if="eventVaultStore.isLoadingMore" class="vault-loading-container">
                        <div class="vault-loading-indicator">
                            <span class="material-symbols-outlined vault-spinner">progress_activity</span>
                            <span>Loading more moments...</span>
                        </div>
                    </div>

                    <!-- Invisible Scroll Sentinel for IntersectionObserver (zero height when idle) -->
                    <div v-if="!isDemo" ref="scrollSentinel" class="vault-scroll-sentinel" aria-hidden="true"></div>
                </section>
            </div>
        </main>

        <!-- Bottom Navigation Bar -->
        <nav class="vault-bottom-nav" data-active-classes="text-primary font-semibold">
            <div class="vault-bottom-nav__inner">
                <!-- Capture Tab: Inactive (routes to quests) -->
                <a aria-label="Navigate to Photo Checklist & Capture" class="vault-bottom-nav__item is-inactive"
                    href="#" @click.prevent="navigateToCapture">
                    <span class="material-symbols-outlined vault-bottom-nav__icon">photo_camera</span>
                    <span class="vault-bottom-nav__label">Capture</span>
                </a>

                <!-- Live Vault Tab: Active -->
                <a aria-current="page" aria-label="Active page: Live Vault" class="vault-bottom-nav__item is-active"
                    href="#" @click.prevent>
                    <span class="material-symbols-outlined vault-bottom-nav__icon">photo_library</span>
                    <span class="vault-bottom-nav__label">Live Vault</span>
                </a>
            </div>
        </nav>

        <!-- Fullscreen Lightbox Modal Component -->
        <LightBox :is-open="isLightboxOpen" :items="filteredMedia" :initial-index="activeLightboxIndex"
            @close="closeLightbox" @like="eventVaultStore.toggleLike" />
    </div>
</template>
