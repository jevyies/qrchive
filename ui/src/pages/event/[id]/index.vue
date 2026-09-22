<route lang="yaml">
meta:
  layout: blank
  public: true
</route>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import keannAndJennyBg from '@/assets/images/keann-and-jenny.jpg'
import AppLogo from '@core/components/AppLogo.vue'
import GuestModal from '@/views/modals/GuestModal.vue'

const route = useRoute()
const router = useRouter()

// Known wedding data dictionary for dynamic loading by ID
const knownWeddings = {
    '1': {
        couple: 'Sophia & Alexander',
        title: 'Welcome to Sophia & Alexander’s Wedding',
        quote: '“A celebration of enduring love & shared memories”',
        date: 'Oct 24, 2026',
        venue: 'Grand Plaza Hall',
    },
    '2': {
        couple: 'Emily & James',
        title: 'Welcome to Emily & James’s Wedding',
        quote: '“Two lives, two hearts, joined together in friendship united forever in love”',
        date: 'Nov 15, 2026',
        venue: 'Rose Garden Estate',
    },
    '3': {
        couple: 'Olivia & Liam',
        title: 'Welcome to Olivia & Liam’s Wedding',
        quote: '“Every love story is beautiful, but ours is our favorite”',
        date: 'Aug 10, 2026',
        venue: 'Seaside Pavilion',
    },
}

// Current event data based on route param id or defaults
const currentEvent = computed(() => {
    const id = route.params.id
    if (id && knownWeddings[id]) {
        return knownWeddings[id]
    }
    return {
        couple: 'Keann & Jenny',
        title: (route.query && route.query.title) || 'Welcome to Keann & Jenny’s Wedding',
        quote: (route.query && route.query.quote) || '“A celebration of enduring love & shared memories”',
        date: (route.query && route.query.date) || '',
        venue: (route.query && route.query.venue) || '',
    }
})

// Guest entry modal state
const isGuestModalOpen = ref(false)

// Interactive button states
const isHovered = ref(false)
const isPressed = ref(false)

const handleGetStarted = () => {
    isPressed.value = true
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15)
    }
    setTimeout(() => {
        isPressed.value = false
        isGuestModalOpen.value = true
    }, 150)
}

onMounted(() => {
    // Direct DOM listeners fallback for template compatibility
    const btn = document.getElementById('enterVaultBtn')
    const arrow = document.getElementById('btnArrow')
    if (btn && arrow) {
        btn.addEventListener('mouseenter', () => {
            arrow.style.transform = 'translateX(4px)'
        })
        btn.addEventListener('mouseleave', () => {
            arrow.style.transform = 'translateX(0px)'
        })
        btn.addEventListener('click', () => {
            btn.classList.add('opacity-90')
            setTimeout(() => {
                btn.classList.remove('opacity-90')
            }, 200)
            isGuestModalOpen.value = true
        })
    }
})
</script>

<template>
    <div class="event-vault-root">
        <main class="event-viewport" :style="{ backgroundImage: `url(${keannAndJennyBg})` }">
            <!-- Atmospheric Editorial Overlays -->
            <div class="event-vignette-top"></div>
            <div class="event-vignette-radial"></div>
            <div class="event-vignette-scrim"></div>

            <!-- Header Tier: Floating Atelier Brand & Date Badge -->
            <header class="event-header">
                <!-- Left: QRchive Atelier Emblem -->
                <div class="event-brand-badge" role="button" tabindex="0" aria-label="Return to Homepage"
                    @click="router.push('/')">
                    <AppLogo :width="24" :height="24" color="#fff8f5" class="brand-logo" />
                    <div class="event-brand-info">
                        <span class="event-brand-title">QRchive</span>
                        <span class="event-brand-subtitle">Celebration Vault</span>
                    </div>
                </div>

                <!-- Right: Destination Crest Pill -->
                <div v-if="currentEvent.date" class="event-date-badge">
                    <span class="material-symbols-outlined event-date-icon">event</span>
                    <span class="event-date-text">{{ currentEvent.date }}</span>
                </div>
            </header>

            <!-- Lower Section: Romantic Editorial Hero Card & Guest Actions -->
            <div class="event-hero-card">
                <!-- Haute Editorial Moniker & Names -->
                <h1 class="event-hero-title">
                    {{ currentEvent.title }}
                </h1>

                <!-- Sentimental Subtitle -->
                <p class="event-hero-quote">
                    {{ currentEvent.quote }}
                </p>

                <!-- Date & Venue Subtitle -->
                <div class="event-meta-info">
                    <span v-if="currentEvent.date" class="event-meta-text">{{ currentEvent.date }}</span>
                    <span v-if="currentEvent.date && currentEvent.venue" class="event-meta-dot">•</span>
                    <span v-if="currentEvent.venue" class="event-meta-text">{{ currentEvent.venue }}</span>
                </div>

                <!-- Narrative Copy -->
                <p class="event-hero-narrative">
                    Capture candid moments, share heartfelt wishes, and contribute directly to the couple’s
                    heirloom live archive.
                </p>

                <!-- Primary Action CTA Button -->
                <button id="enterVaultBtn" type="button" class="event-cta-btn" :class="{ 'is-pressed': isPressed }"
                    @mouseenter="isHovered = true" @mouseleave="isHovered = false" @click="handleGetStarted">
                    <span class="event-cta-text">
                        Get Started
                    </span>
                    <span id="btnArrow" class="material-symbols-outlined event-cta-icon"
                        :style="{ transform: isHovered ? 'translateX(4px)' : 'translateX(0px)' }">
                        arrow_forward
                    </span>
                </button>

                <!-- Frictionless Assurance Micro-copy -->
                <div class="event-trust-row">
                    <div class="event-trust-item">
                        <span class="material-symbols-outlined event-trust-icon">lock</span>
                        <span class="event-trust-label">Live Archive</span>
                    </div>
                    <span class="event-trust-sep">•</span>
                    <div class="event-trust-item">
                        <span class="material-symbols-outlined event-trust-icon">photo_library</span>
                        <span class="event-trust-label">Guest Vault</span>
                    </div>
                </div>
            </div>
        </main>

        <!-- Guest Entry Modal -->
        <GuestModal
            v-model="isGuestModalOpen"
            :couple-name="currentEvent.couple"
            :event-id="route.params.id"
            destination="/quests"
        />
    </div>
</template>
