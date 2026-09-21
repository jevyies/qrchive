<route lang="yaml">
meta:
  layout: blank
  public: true
</route>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import keannAndJennyBg from '@/assets/images/keann-and-jenny.jpg'

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
        const eventId = route.params.id || 'keann-and-jenny'
        router.push(`/event/${eventId}/quests`)
    }, 200)
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
        })
    }
})
</script>

<template>
    <div class="event-vault-root bg-surface font-body-md text-on-surface flex flex-col min-h-screen pt-safe pb-safe">
        <main class="flex-1 flex flex-col relative w-full bg-surface">
            <div class="flex flex-col w-full relative overflow-hidden select-none">
                <!-- Immersive Wedding Background Viewport Layer -->
                <div class="relative w-full min-h-[812px] flex flex-col justify-between overflow-hidden bg-cover bg-center"
                    :style="{ backgroundImage: `url(${keannAndJennyBg})` }">
                    <!-- Atmospheric Editorial Overlays: Soft ambient top vignette & warm espresso gradient scrim -->
                    <div
                        class="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/95">
                    </div>
                    <div
                        class="absolute inset-0 pointer-events-none bg-radial from-transparent via-black/20 to-black/70 mix-blend-multiply">
                    </div>
                    <div
                        class="absolute bottom-0 left-0 right-0 h-[68%] pointer-events-none bg-gradient-to-t from-[#1b1613] via-[#1b1613]/90 to-transparent">
                    </div>

                    <!-- Header Tier: Floating Atelier Brand & Date Badge -->
                    <header class="relative z-20 w-full px-5 pt-4 flex items-center justify-between">
                        <!-- Left: QRchive Atelier Emblem -->
                        <div
                            class="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-container-lowest/15 backdrop-blur-md shadow-sm">
                            <img alt="QRchive Logo" class="w-6 h-6 rounded-full object-cover shadow-inner"
                                src="https://lh3.googleusercontent.com/aida/AEtjO1XUa6mJN9JdZkbSaf4giXuA5Dt9CprqznZwqb78PfF5N5_Je0ZK_IWogao1hTViaBPomjIKmkhZEMxzHaTMSCrjJEO6h6xdG0oUPun2r9pvKc4RRoWdexBGQtgS7aqpAtWqbDS-EqNf5RVMc2SP9vy0fVD9dAqwBupF2ZQ4gGU6PFlP4mcg34qQruGfswnHwSEOq3fXVx27NYazCZo3zqridJto7xQ_bBJzfXx00Y2igDyXSnnki8sUxOw">
                            <div class="flex flex-col">
                                <span
                                    class="font-headline-sm text-[12px] tracking-[0.14em] text-surface font-semibold uppercase leading-none">QRchive</span>
                                <span
                                    class="font-label-sm text-[8px] tracking-[0.22em] text-primary-fixed uppercase leading-tight opacity-90">Celebration
                                    Vault</span>
                            </div>
                        </div>

                        <!-- Right: Destination Crest Pill -->
                        <div v-if="currentEvent.date"
                            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest/15 backdrop-blur-md shadow-sm">
                            <span class="material-symbols-outlined text-[13px] text-primary-fixed">event</span>
                            <span class="font-label-sm text-[9px] tracking-wider text-surface uppercase font-medium">{{
                                currentEvent.date }}</span>
                        </div>
                    </header>

                    <!-- Lower Section: Romantic Editorial Hero Card & Guest Actions -->
                    <div class="relative z-20 w-full px-6 pb-8 pt-4 flex flex-col items-center text-center">
                        <!-- Champagne Vault Eyebrow Badge -->

                        <!-- Haute Editorial Moniker & Names -->
                        <h1
                            class="font-headline-lg-mobile text-surface text-[32px] leading-[38px] tracking-tight mb-2 drop-shadow-md">
                            {{ currentEvent.title }}
                        </h1>

                        <!-- Sentimental Subtitle -->
                        <p
                            class="font-headline-sm italic text-[15px] leading-snug text-primary-fixed font-normal mb-2 max-w-[320px]">
                            {{ currentEvent.quote }}
                        </p>

                        <!-- Date & Venue Subtitle -->
                        <div class="flex items-center justify-center gap-2 mb-3 text-surface/85">
                            <span v-if="currentEvent.date" class="font-body-sm text-[12px] opacity-90">{{
                                currentEvent.date }}</span>
                            <span v-if="currentEvent.date && currentEvent.venue" class="opacity-40 text-[10px]">•</span>
                            <span v-if="currentEvent.venue" class="font-body-sm text-[12px] opacity-90">{{
                                currentEvent.venue }}</span>
                        </div>

                        <!-- Narrative Copy -->
                        <p
                            class="font-body-sm text-surface-container-highest/80 text-[13px] leading-[20px] max-w-[310px] mb-6">
                            Capture candid moments, share heartfelt wishes, and contribute directly to the couple’s
                            heirloom live archive.
                        </p>

                        <!-- Primary Action CTA Button -->
                        <button id="enterVaultBtn" type="button"
                            class="w-full max-w-[340px] py-4 px-6 rounded-full bg-gradient-to-r from-primary-fixed-dim via-primary-container to-primary-fixed shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform duration-150 cursor-pointer"
                            :class="{ 'opacity-90': isPressed }" @mouseenter="isHovered = true"
                            @mouseleave="isHovered = false" @click="handleGetStarted">
                            <span
                                class="font-label-lg text-[#261900] text-[13px] tracking-[0.16em] uppercase font-bold">
                                Get Started
                            </span>
                            <span id="btnArrow"
                                class="material-symbols-outlined text-[#261900] text-[18px] transition-transform duration-200"
                                :style="{ transform: isHovered ? 'translateX(4px)' : 'translateX(0px)' }">
                                arrow_forward
                            </span>
                        </button>

                        <!-- Frictionless Assurance Micro-copy -->
                        <div class="flex items-center justify-center gap-3 mt-4 text-surface-variant/70">
                            <div class="flex items-center gap-1">
                                <span class="material-symbols-outlined text-[13px] text-primary-fixed/80">lock</span>
                                <span class="font-label-sm text-[9px] tracking-wider text-surface/80">Live
                                    Archive</span>
                            </div>
                            <span class="opacity-30 text-[8px] text-surface/60">•</span>
                            <div class="flex items-center gap-1">
                                <span
                                    class="material-symbols-outlined text-[13px] text-primary-fixed/80">photo_library</span>
                                <span class="font-label-sm text-[9px] tracking-wider text-surface/80">Guest Vault</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

/* Reset & Safe Areas */
.event-vault-root {
    width: 100vw;
    min-height: 100vh;
    min-height: 100dvh;
    margin: 0;
    padding: 0;
    background-color: #fff8f5;
    color: #1f1b18;
    font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overscroll-behavior: none;
    display: flex;
    flex-direction: column;
}

.pt-safe {
    padding-top: env(safe-area-inset-top, 0px);
}

.pb-safe {
    padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Base Layout & Utility Classes */
.bg-surface {
    background-color: #fff8f5;
}

.font-body-md {
    font-family: 'Manrope', sans-serif;
    font-size: 15px;
    line-height: 26px;
    letter-spacing: 0.01em;
    font-weight: 400;
}

.text-on-surface {
    color: #1f1b18;
}

.flex {
    display: flex;
}

.flex-col {
    flex-direction: column;
}

.flex-1 {
    flex: 1 1 0%;
}

.min-h-screen {
    min-height: 100vh;
    min-height: 100dvh;
}

.relative {
    position: relative;
}

.absolute {
    position: absolute;
}

.inset-0 {
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
}

.bottom-0 {
    bottom: 0;
}

.left-0 {
    left: 0;
}

.right-0 {
    right: 0;
}

.w-full {
    width: 100%;
}

.overflow-hidden {
    overflow: hidden;
}

.select-none {
    user-select: none;
    -webkit-user-select: none;
}

.min-h-\[812px\] {
    min-height: 812px;
    min-height: 100dvh;
}

.justify-between {
    justify-content: space-between;
}

.items-center {
    align-items: center;
}

.justify-center {
    justify-content: center;
}

.text-center {
    text-align: center;
}

.bg-cover {
    background-size: cover;
}

.bg-center {
    background-position: center;
}

.pointer-events-none {
    pointer-events: none;
}

/* Atmospheric Overlays */
.bg-gradient-to-b {
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.4) 0%, transparent 40%, rgba(0, 0, 0, 0.95) 100%);
}

.bg-radial {
    background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.2) 60%, rgba(0, 0, 0, 0.7) 100%);
}

.mix-blend-multiply {
    mix-blend-mode: multiply;
}

.h-\[68\%\] {
    height: 68%;
}

.bg-gradient-to-t {
    background: linear-gradient(to top, #1b1613 0%, rgba(27, 22, 19, 0.9) 60%, transparent 100%);
}

.z-20 {
    z-index: 20;
}

.z-10 {
    z-index: 10;
}

/* Padding & Spacing */
.px-5 {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
}

.pt-4 {
    padding-top: 1rem;
}

.px-6 {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
}

.pb-8 {
    padding-bottom: 2rem;
}

.gap-2\.5 {
    gap: 0.625rem;
}

.gap-2 {
    gap: 0.5rem;
}

.gap-3 {
    gap: 0.75rem;
}

.gap-1\.5 {
    gap: 0.375rem;
}

.gap-1 {
    gap: 0.25rem;
}

.px-3 {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
}

.py-1\.5 {
    padding-top: 0.375rem;
    padding-bottom: 0.375rem;
}

.py-4 {
    padding-top: 1rem;
    padding-bottom: 1rem;
}

.rounded-full {
    border-radius: 9999px;
}

/* Glassmorphism & Colors */
.bg-surface-container-lowest\/15 {
    background-color: rgba(255, 255, 255, 0.15);
}

.bg-surface-container-lowest\/10 {
    background-color: rgba(255, 255, 255, 0.1);
}

.backdrop-blur-md {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
}

.backdrop-blur-sm {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}

.shadow-sm {
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.shadow-lg {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2);
}

.shadow-xl {
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.35), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
}

.shadow-inner {
    box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.15);
}

/* Sizes */
.w-6 {
    width: 1.5rem;
}

.h-6 {
    height: 1.5rem;
}

.w-12 {
    width: 3rem;
}

.h-12 {
    height: 3rem;
}

.object-cover {
    object-fit: cover;
}

/* Typography Tokens */
.font-headline-sm {
    font-family: 'Playfair Display', Georgia, serif;
}

.text-\[12px\] {
    font-size: 12px;
}

.text-\[9px\] {
    font-size: 9px;
}

.tracking-\[0\.14em\] {
    letter-spacing: 0.14em;
}

.text-surface {
    color: #fff8f5;
}

.font-semibold {
    font-weight: 600;
}

.uppercase {
    text-transform: uppercase;
}

.leading-none {
    line-height: 1;
}

.font-label-sm {
    font-family: 'Manrope', sans-serif;
    font-size: 10px;
    line-height: 14px;
    letter-spacing: 0.22em;
    font-weight: 600;
}

.text-\[8px\] {
    font-size: 8px;
}

.tracking-\[0\.22em\] {
    letter-spacing: 0.22em;
}

.tracking-wider {
    letter-spacing: 0.05em;
}

.text-primary-fixed {
    color: #ffdea5;
}

.leading-tight {
    line-height: 1.25;
}

.opacity-90 {
    opacity: 0.9;
}

.transform {
    transform: translateZ(0);
}

.-translate-y-4 {
    transform: translateY(-1rem);
}

.material-symbols-outlined {
    font-family: 'Material Symbols Outlined';
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-feature-settings: 'liga';
    font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
}

.text-\[22px\] {
    font-size: 22px;
}

.text-\[13px\] {
    font-size: 13px;
}

.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {

    0%,
    100% {
        opacity: 1;
        transform: scale(1);
    }

    50% {
        opacity: 0.5;
        transform: scale(0.92);
    }
}

.font-headline-lg-mobile {
    font-family: 'Playfair Display', Georgia, serif;
}

.text-\[32px\] {
    font-size: 32px;
}

.leading-\[38px\] {
    line-height: 38px;
}

.tracking-tight {
    letter-spacing: -0.015em;
}

.mb-2 {
    margin-bottom: 0.5rem;
}

.drop-shadow-md {
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.45));
}

.italic {
    font-style: italic;
}

.text-\[15px\] {
    font-size: 15px;
}

.leading-snug {
    line-height: 1.375;
}

.font-normal {
    font-weight: 400;
}

.max-w-\[320px\] {
    max-width: 320px;
}

.mb-3 {
    margin-bottom: 0.75rem;
}

.text-surface\/85 {
    color: rgba(255, 248, 245, 0.85);
}

.font-body-sm {
    font-family: 'Manrope', sans-serif;
    font-size: 13px;
    line-height: 20px;
    font-weight: 400;
}

.text-surface-container-highest\/80 {
    color: rgba(235, 224, 219, 0.8);
}

.leading-\[20px\] {
    line-height: 20px;
}

.max-w-\[310px\] {
    max-width: 310px;
}

.mb-6 {
    margin-bottom: 1.5rem;
}

.max-w-\[340px\] {
    max-width: 340px;
}

.bg-gradient-to-r {
    background: linear-gradient(135deg, #e9c176 0%, #c5a059 50%, #ffdea5 100%);
}

.active\:scale-\[0\.98\]:active {
    transform: scale(0.98);
}

.transition-transform {
    transition-property: transform;
}

.duration-150 {
    transition-duration: 150ms;
}

.duration-200 {
    transition-duration: 200ms;
}

.cursor-pointer {
    cursor: pointer;
}

.font-label-lg {
    font-family: 'Manrope', sans-serif;
    font-size: 13px;
    line-height: 18px;
    letter-spacing: 0.16em;
    font-weight: 700;
}

.text-\[\#261900\] {
    color: #261900;
}

.tracking-\[0\.16em\] {
    letter-spacing: 0.16em;
}

.font-bold {
    font-weight: 700;
}

.text-\[18px\] {
    font-size: 18px;
}

.mt-4 {
    margin-top: 1rem;
}

.text-surface-variant\/70 {
    color: rgba(235, 224, 219, 0.7);
}

button {
    border: none;
    outline: none;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
    display: none;
}
</style>
