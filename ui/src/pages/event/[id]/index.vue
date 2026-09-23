<route lang="yaml">
meta:
  layout: blank
  public: true
</route>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { axiosInstance } from '@/plugins/axios'
import keannAndJennyBg from '@/assets/images/keann-and-jenny.jpg'
import AppLogo from '@core/components/AppLogo.vue'
import GuestModal from '@/views/modals/GuestModal.vue'

const route = useRoute()
const router = useRouter()

// Current event data based on route param id or defaults
const currentEvent = ref({
    couple: 'Keann & Jenny',
    title: (route.query && route.query.title) || 'Welcome to Keann & Jenny’s Wedding',
    date: (route.query && route.query.date) || '',
    storeName: (route.query && route.query.storeName) || null,
})

const isLoading = ref(true)

// Helper to format date nicely while preserving raw eventDate on currentEvent.date
const formatDate = (dateStr) => {
    if (!dateStr) return ''
    try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return dateStr
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
        return dateStr
    }
}

const displayDate = computed(() => {
    return formatDate(currentEvent.value.date) || currentEvent.value.date
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

const fetchEventData = async () => {
    const token = route.params.id
    if (!token) {
        router.replace('/404')
        return
    }

    // If demo-event, do not fetchEventData
    if (token === 'demo-event') {
        currentEvent.value = {
            couple: 'Keann & Jenny',
            title: "Welcome to Keann & Jenny's Wedding",
            quote: '“A celebration of enduring love & shared memories”',
            date: 'Dec 28, 2026',
            storeName: 'QRchive Demo Experience',
        }
        isLoading.value = false
        return
    }

    try {
        isLoading.value = true
        const response = await axiosInstance.get(`/api/events/token/${token}`)
        const event = response.data

        if (event) {
            // Requirement 3: replace currentEvent.title = event.name, currentEvent.date = event.eventDate
            currentEvent.value.title = event.name
            currentEvent.value.date = event.eventDate

            // Store storeName from stores table
            if (event.storeName) {
                currentEvent.value.storeName = event.storeName
            }

            if (event.name) {
                currentEvent.value.couple = event.name
                    .replace(/'s Wedding.*/i, '')
                    .replace(/ Wedding.*/i, '')
                    .trim()
            }
        }
    } catch (err) {
        // Requirement 2: when the endpoint returns 404, it will route to 404
        if (err.response?.status === 404 || err.status === 404) {
            router.replace('/404')
            return
        }
        console.error('[EventPage] Failed to fetch event by token:', err)
    } finally {
        isLoading.value = false
    }
}

onMounted(() => {
    // Check if user already entered this celebration
    if (route.params.id === 'demo-event') {
        currentEvent.value = {
            couple: 'Keann & Jenny',
            title: "Welcome to Keann & Jenny's Wedding",
            quote: '“A celebration of enduring love & shared memories”',
            date: 'Dec 28, 2026',
            storeName: 'QRchive Demo Experience',
        }
        isLoading.value = false
        return;
    }
    if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('currentEvent')
        if (stored) {
            try {
                const parsed = JSON.parse(stored)
                if (parsed && String(parsed.eventCode) === String(route.params.id)) {
                    router.replace('/quests')
                    return
                }
            } catch (err) {
                console.error('[EventPage] Error reading currentEvent from localStorage:', err)
            }
        }
    }
    fetchEventData()
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
            </header>

            <!-- Lower Section: Romantic Editorial Hero Card & Guest Actions -->
            <div class="event-hero-card">
                <!-- Haute Editorial Moniker & Names -->
                <h1 class="event-hero-title">
                    {{ currentEvent.title }}
                </h1>

                <!-- Date Subtitle -->
                <div class="event-meta-info">
                    <span v-if="currentEvent.date" class="event-meta-text">{{ displayDate || currentEvent.date }}</span>
                </div>

                <!-- Narrative Copy -->
                <p class="event-hero-narrative">
                    Snap & Share. Capture every moment.
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
                <template v-if="currentEvent.storeName">
                    <p class="event-hero-narrative mt-3">
                        Created by {{ currentEvent.storeName }}
                    </p>
                </template>
            </div>
        </main>

        <!-- Guest Entry Modal -->
        <GuestModal v-model="isGuestModalOpen" :couple-name="currentEvent.couple || currentEvent.title"
            :event-id="route.params.id" destination="/quests" />
    </div>
</template>

<style scoped>
/* Preserve existing styles */
</style>
