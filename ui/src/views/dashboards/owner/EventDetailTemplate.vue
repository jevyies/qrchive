<script setup>
import EventPhotosTab from '@/views/dashboards/owner/EventPhotosTab.vue'
import EventManageTab from '@/views/dashboards/owner/EventManageTab.vue'
import EventPlacardsTab from '@/views/dashboards/owner/EventPlacardsTab.vue'

const props = defineProps({
    slideshowPhotos: {
        type: Array,
        default: () => []
    },
    eventData: {
        type: [Object, null],
        required: true
    },
    isDownloadingZip: {
        type: Boolean,
        default: false
    },
    eventTitle: {
        type: String,
        default: ''
    },
    desktopCroppedBackground: {
        type: String,
        default: ''
    },
    albums: {
        type: Array,
        default: () => []
    },
    hostOrigin: {
        type: String,
        default: ''
    },
    eventCode: {
        type: String,
        default: ''
    },
    qrSvg: {
        type: String,
        default: ''
    }
})
const emit = defineEmits([
    'goBackToDashboard',
    'fetchEventStatus',
    'fetchBackgrounds',
    'fetchChecklistPhotos',
    'downloadQrCode',
    'copyVaultUrl',
    'openSlideshowModal',
    'downloadAllFiles',
])
const activeTab = ref('tab1')
const storageURL = import.meta.env.VITE_STORAGE_URL;
const defaultHeroImg = storageURL + '/static/cover-photo.jpg'
const heroBackgroundUrl = computed(() => {
    return (
        props.desktopCroppedBackground ||
        props.eventData?.desktopCroppedUrl ||
        props.eventData?.backgrounds?.find((b) => b.type === 'desktop_cropped')?.url ||
        defaultHeroImg
    )
})
const formattedEventDate = computed(() => {
    const dateStr = props.eventData?.event_date || props.eventData?.eventDate
    if (!dateStr) return 'October 26, 2024'
    try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return String(dateStr)
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    } catch {
        return String(dateStr)
    }
})
const isUnlimitedPackage = computed(() => Boolean(props.eventData?.isUnlimited))

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
    const rem = formatRemainingTime(props.eventData?.photo_expiry || props.eventData?.photoExpiry)
    return rem ? `Archive Storage: ${rem}` : 'Archive Storage: Active'
})

// Package pill text
const packageText = computed(() => {
    if (props.eventData?.isUnlimited) return 'Unlimited Shots Package'
    return 'Celebration Archival Package'
})

// Total stats computed
const totalMediaCount = computed(() => {
    if (props.eventData) {
        return (props.eventData.totalPhotos || 0) + (props.eventData.totalVideos || 0)
    }
    return props.albums.reduce((sum, a) => sum + (a.totalItems || 0), 0) || 48
})

const totalActiveContributors = computed(() => {
    if (props.eventData?.totalUsers !== undefined && props.eventData?.totalUsers !== null) {
        return props.eventData.totalUsers
    }
    return 18
})


const totalMediaSizeDisplay = computed(() => {
    let bytes = 0
    if (props.eventData?.totalBytes !== undefined && props.eventData?.totalBytes !== null) {
        bytes = Number(props.eventData.totalBytes) || 0
    } else if (props.eventData?.totalGigabytes !== undefined && props.eventData?.totalGigabytes !== null) {
        bytes = Number(props.eventData.totalGigabytes) * 1024 * 1024 * 1024
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
// Couple names and initials for placards
const coupleNames = computed(() => {
    return String(props.eventTitle)
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
</script>
<template>
    <div class="event-detail">
        <nav class="event-detail__nav-bar">
            <div class="event-detail__nav-container">
                <div class="event-detail__nav-left">
                    <button type="button" class="event-detail__back-btn" @click="emit('goBackToDashboard')">
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
                        @click="emit('openSlideshowModal')">
                        <span class="material-symbols-outlined"
                            style="font-size: 1.1rem; color: var(--primary);">slideshow</span>
                        <span>Live Slideshow</span>
                        <span v-if="slideshowPhotos.length" class="slideshow-counter-badge">{{ slideshowPhotos.length
                        }}</span>
                    </button>
                    <button type="button" class="event-detail__action-btn event-detail__action-btn--primary"
                        :disabled="isDownloadingZip" :style="isDownloadingZip ? 'opacity: 0.85; cursor: wait;' : ''"
                        @click="emit('downloadAllFiles')">
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
                    <img class="event-detail__hero-img" :alt="eventTitle || 'Event Background'"
                        :src="heroBackgroundUrl" />
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
                            <span class="event-detail__hero-pill"
                                :class="{ 'event-detail__hero-pill--gold': isUnlimitedPackage }">
                                <span class="material-symbols-outlined pill-icon">all_inclusive</span>
                                <span>{{ packageText }}</span>
                            </span>
                            <span class="event-detail__hero-pill">
                                <span class="material-symbols-outlined pill-icon"
                                    style="color: var(--primary);">inventory_2</span>
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
                                {{ totalMediaSizeDisplay ? `Photos & Clips (${totalMediaSizeDisplay})` :
                                    'Photos & Clips' }}
                            </span>
                        </div>
                    </div>

                    <div class="event-detail__stat-col">
                        <span class="event-detail__stat-label">Active Contributors</span>
                        <div class="event-detail__stat-row">
                            <span class="event-detail__stat-value event-detail__stat-value--primary">{{
                                totalActiveContributors
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
                            <button type="button" class="event-detail__url-copy-btn" title="Copy Vault URL"
                                @click="emit('copyVaultUrl')">
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
            :couple-names="coupleNames" :formatted-event-date="formattedEventDate" :host-origin="hostOrigin"
            :qr-svg="qrSvg" @refresh-event="emit('fetchEventStats', $event)"
            @refresh-backgrounds="emit('fetchBackgrounds', $event)"
            @refresh-checklists="emit('fetchChecklistPhotos', $event)" @download-qr="emit('downloadQrCode', $event)"
            @copy-url="emit('copyVaultUrl', $event)" />

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