<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
    /**
     * Explicit active tab: 'capture' (quests) or 'gallery' (live-vault).
     * If not provided, automatically inferred from current route path.
     */
    modelValue: {
        type: String,
        default: '',
    },
    activeTab: {
        type: String,
        default: '',
    },
    active: {
        type: String,
        default: '',
    },
    /**
     * Target event ID. If not provided, inferred from route params or fallback to demo-event.
     */
    eventId: {
        type: [String, Number],
        default: '',
    },
    captureLabel: {
        type: String,
        default: 'Capture',
    },
    galleryLabel: {
        type: String,
        default: 'Live Gallery',
    },
})

const emit = defineEmits([
    'update:modelValue',
    'capture',
    'click-capture',
    'click-gallery',
    'navigate',
])

const route = useRoute()
const router = useRouter()

// Resolve current active tab
const currentTab = computed(() => {
    const explicit = (props.modelValue || props.activeTab || props.active || '').trim().toLowerCase()
    if (explicit === 'gallery' || explicit === 'live-vault' || explicit === 'vault' || explicit === 'live-gallery') {
        return 'gallery'
    }
    if (explicit === 'capture' || explicit === 'quests') {
        return 'capture'
    }

    // Auto-detect based on route path
    if (route?.path) {
        if (route.path.includes('/live-vault')) {
            return 'gallery'
        }
        if (route.path.includes('/quests')) {
            return 'capture'
        }
    }

    return 'capture'
})

const isCaptureActive = computed(() => currentTab.value === 'capture')
const isGalleryActive = computed(() => currentTab.value === 'gallery')

// Resolve event ID
const resolvedEventId = computed(() => {
    if (props.eventId) return String(props.eventId)
    if (route?.params?.id) return String(route.params.id)
    if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('qrchive_current_event_id') || localStorage.getItem('qrchive_event_id')
        if (stored) return stored
    }
    return 'demo-event'
})

// Tab click handlers
const handleCaptureClick = (event) => {
    emit('update:modelValue', 'capture')
    emit('click-capture', event)
    emit('capture', event)

    if (!isCaptureActive.value) {
        const targetPath = `/event/${resolvedEventId.value}/quests`
        router.push(targetPath)
        emit('navigate', { tab: 'capture', path: targetPath })
    }
}

const handleGalleryClick = (event) => {
    emit('update:modelValue', 'gallery')
    emit('click-gallery', event)

    if (!isGalleryActive.value) {
        const targetPath = `/event/${resolvedEventId.value}/live-vault`
        router.push(targetPath)
        emit('navigate', { tab: 'gallery', path: targetPath })
    }
}
</script>

<template>
    <!-- Bottom Navigation Bar -->
    <nav class="vault-bottom-nav" data-active-classes="text-primary font-semibold" aria-label="Event navigation">
        <div class="vault-bottom-nav__inner">
            <!-- Capture Tab -->
            <a
                :aria-current="isCaptureActive ? 'page' : undefined"
                :aria-label="isCaptureActive ? 'Active page: Photo Checklist & Capture' : 'Navigate to Photo Checklist & Capture'"
                :class="['vault-bottom-nav__item', isCaptureActive ? 'is-active' : 'is-inactive']"
                href="#"
                @click.prevent="handleCaptureClick"
            >
                <span class="material-symbols-outlined vault-bottom-nav__icon">photo_camera</span>
                <span class="vault-bottom-nav__label">{{ captureLabel }}</span>
            </a>

            <!-- Live Vault / Gallery Tab -->
            <a
                :aria-current="isGalleryActive ? 'page' : undefined"
                :aria-label="isGalleryActive ? 'Active page: Live Vault' : 'Navigate to Live Vault'"
                :class="['vault-bottom-nav__item', isGalleryActive ? 'is-active' : 'is-inactive']"
                href="#"
                @click.prevent="handleGalleryClick"
            >
                <span class="material-symbols-outlined vault-bottom-nav__icon">photo_library</span>
                <span class="vault-bottom-nav__label">{{ galleryLabel }}</span>
            </a>
        </div>
    </nav>
</template>
