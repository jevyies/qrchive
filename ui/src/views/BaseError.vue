<script setup>
import { computed } from 'vue'
import AppLogo from '@core/components/AppLogo.vue'

const props = defineProps({
    type: {
        type: String,
        default: 'notfound',
    },
    days: {
        type: Number,
        default: 0,
    },
    maxGuest: {
        type: Number,
        default: 0,
    },
})

const emit = defineEmits(['homepage'])

const normalizedType = computed(() => {
    return (props.type || 'notfound').toLowerCase()
})
</script>

<template>
    <div class="base-error-viewport">
        <!-- Atmospheric Ambient Warm Overlays -->
        <div class="error-ambient-radial"></div>
        <div class="error-ambient-glow"></div>

        <!-- Header Tier: Floating Atelier Brand Emblem -->
        <header class="error-header">
            <div class="brand-badge" role="button" tabindex="0" aria-label="Return to Homepage"
                @click="emit('homepage')">
                <AppLogo :width="22" :height="22" color="#775a19" class="brand-logo" />
                <div class="brand-info">
                    <span class="brand-title">QRchive Events</span>
                    <span class="brand-subtitle">Celebration Vault</span>
                </div>
            </div>
        </header>

        <!-- Center Card Container -->
        <main class="error-card-container">
            <div class="error-card">
                <!-- ============================================== -->
                <!-- 1. MAX GUEST CAPACITY REACHED -->
                <!-- ============================================== -->
                <template v-if="normalizedType === 'maxguest'">
                    <div class="error-status-pill error-status-pill--gold">
                        <span class="material-symbols-outlined status-icon">groups</span>
                        <span class="status-text">Capacity Reached</span>
                    </div>

                    <div class="error-medallion error-medallion--gold">
                        <span class="material-symbols-outlined medallion-icon">lock_person</span>
                    </div>

                    <h1 class="error-title">Guest Limit Reached</h1>

                    <div v-if="maxGuest > 0" class="error-stat-badge">
                        <span class="material-symbols-outlined stat-icon">event_seat</span>
                        <span class="stat-text">Event Capacity: <strong>{{ maxGuest }} Guests</strong></span>
                    </div>

                    <p class="error-narrative">
                        This celebration vault has reached its maximum guest capacity. New guest registrations and photo
                        uploads are currently closed.
                    </p>

                    <div class="error-footnote">
                        <span class="material-symbols-outlined footnote-icon">help_outline</span>
                        <span>If you were invited or need entry, please ask the event host or coordinator.</span>
                    </div>

                    <button type="button" class="error-cta-btn" @click="emit('homepage')">
                        <span class="material-symbols-outlined cta-icon">home</span>
                        <span class="cta-text">Return to Homepage</span>
                    </button>
                </template>

                <!-- ============================================== -->
                <!-- 2. NOT FOUND (404) -->
                <!-- ============================================== -->
                <template v-else-if="normalizedType === 'notfound'">
                    <div class="error-status-pill error-status-pill--red">
                        <span class="material-symbols-outlined status-icon">search_off</span>
                        <span class="status-text">404 • Not Found</span>
                    </div>

                    <div class="error-code-display">404</div>

                    <h1 class="error-title">Celebration Not Found</h1>

                    <p class="error-narrative">
                        The event invitation link you are trying to access does not exist, has expired, or was removed.
                    </p>

                    <div class="error-footnote">
                        <span class="material-symbols-outlined footnote-icon">info</span>
                        <span>Please confirm the link or contact the event coordinator.</span>
                    </div>

                    <button type="button" class="error-cta-btn" @click="emit('homepage')">
                        <span class="material-symbols-outlined cta-icon">home</span>
                        <span class="cta-text">Return to Homepage</span>
                    </button>
                </template>

                <!-- ============================================== -->
                <!-- 3. NOT STARTED YET (COUNTDOWN) -->
                <!-- ============================================== -->
                <template v-else-if="normalizedType === 'notstarted'">
                    <div class="error-status-pill error-status-pill--gold">
                        <span class="material-symbols-outlined status-icon">hourglass_top</span>
                        <span class="status-text">Celebration Countdown</span>
                    </div>

                    <div class="error-countdown-medallion">
                        <span class="countdown-number">{{ days }}</span>
                        <span class="countdown-label">{{ days === 1 ? 'Day to Go' : 'Days to Go' }}</span>
                    </div>

                    <h1 class="error-title">Vault Opens Soon</h1>

                    <p class="error-narrative">
                        This celebration hasn't started yet. The vault will unlock on event day so you can capture and
                        share every special moment!
                    </p>

                    <div class="error-footnote">
                        <span class="material-symbols-outlined footnote-icon">celebration</span>
                        <span>Get ready to snap and preserve memories with the couple!</span>
                    </div>

                    <button type="button" class="error-cta-btn" @click="emit('homepage')">
                        <span class="material-symbols-outlined cta-icon">home</span>
                        <span class="cta-text">Return to Homepage</span>
                    </button>
                </template>

                <!-- ============================================== -->
                <!-- 4. SYSTEM / PROGRAM ERROR (500) -->
                <!-- ============================================== -->
                <template v-else>
                    <div class="error-status-pill error-status-pill--red">
                        <span class="material-symbols-outlined status-icon">error_outline</span>
                        <span class="status-text">500 • System Notice</span>
                    </div>

                    <div class="error-code-display error-code-display--subtle">500</div>

                    <h1 class="error-title">Something Went Wrong</h1>

                    <p class="error-narrative">
                        There was an unexpected issue loading the celebration details. Please try again or return
                        shortly.
                    </p>

                    <div class="error-footnote">
                        <span class="material-symbols-outlined footnote-icon">sync_problem</span>
                        <span>Check your connection or try returning to the homepage.</span>
                    </div>

                    <button type="button" class="error-cta-btn" @click="emit('homepage')">
                        <span class="material-symbols-outlined cta-icon">home</span>
                        <span class="cta-text">Return to Homepage</span>
                    </button>
                </template>
            </div>
        </main>
    </div>
</template>

<style scoped>
.base-error-viewport {
    position: relative;
    width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow-x: clip;
    background-color: #fff8f5;
    color: #1f1b18;
    font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Atmospheric Ambient Glow Overlays (Warm Light) */
.error-ambient-radial {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 25%, rgba(233, 193, 118, 0.22) 0%, rgba(255, 248, 245, 0.6) 55%, #fff8f5 100%);
    pointer-events: none;
    z-index: 1;
}

.error-ambient-glow {
    position: absolute;
    top: -120px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 420px;
    background: radial-gradient(circle, rgba(233, 193, 118, 0.28) 0%, rgba(255, 248, 245, 0) 70%);
    pointer-events: none;
    z-index: 1;
    filter: blur(55px);
}

/* Header Tier: Atelier Brand Emblem */
.error-header {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1.5rem 0.5rem;
    width: 100%;
}

.brand-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.5rem 1.15rem 0.5rem 0.85rem;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(209, 197, 180, 0.55);
    box-shadow: 0 4px 14px rgba(119, 90, 25, 0.06);
    cursor: pointer;
    transition: all 0.25s ease;
}

.brand-badge:hover {
    background: #ffffff;
    border-color: rgba(197, 160, 89, 0.6);
    box-shadow: 0 6px 18px rgba(119, 90, 25, 0.1);
    transform: translateY(-1px);
}

.brand-logo {
    flex-shrink: 0;
}

.brand-info {
    display: flex;
    flex-direction: column;
}

.brand-title {
    font-size: 0.92rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #1f1b18;
    line-height: 1.1;
}

.brand-subtitle {
    font-size: 0.65rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #8a6114;
    font-weight: 600;
}

/* Card Container */
.error-card-container {
    position: relative;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1.25rem 3rem;
    flex: 1;
    width: 100%;
}

.error-card {
    max-width: 440px;
    width: 100%;
    padding: 2.5rem 2rem;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border: 1px solid rgba(209, 197, 180, 0.5);
    border-radius: 1.5rem;
    box-shadow: 0 20px 48px -10px rgba(119, 90, 25, 0.12), 0 2px 10px rgba(0, 0, 0, 0.03);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    animation: errorFadeIn 0.45s ease-out;
}

@keyframes errorFadeIn {
    from {
        opacity: 0;
        transform: translateY(14px) scale(0.98);
    }

    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* Status Pill */
.error-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.35rem 0.95rem;
    border-radius: 9999px;
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    margin-bottom: 1.25rem;
}

.error-status-pill--gold {
    background: #fdf5ea;
    border: 1px solid #f2ce93;
    color: #8a6114;
}

.error-status-pill--red {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #b91c1c;
}

.status-icon {
    font-size: 1rem;
}

/* Medallion */
.error-medallion {
    width: 74px;
    height: 74px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.25rem;
}

.error-medallion--gold {
    background: radial-gradient(circle, #fff3dc 0%, #fae6c2 100%);
    border: 1px solid #ecc98f;
    box-shadow: 0 6px 20px rgba(197, 160, 89, 0.22);
}

.medallion-icon {
    font-size: 2.2rem;
    color: #8a6114;
}

/* Big Code Display (404 / 500) */
.error-code-display {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 4.2rem;
    line-height: 1;
    font-weight: 700;
    color: #8a6114;
    text-shadow: 0 2px 14px rgba(138, 97, 20, 0.15);
    margin-bottom: 0.5rem;
    letter-spacing: -0.02em;
}

.error-code-display--subtle {
    color: #dc2626;
    text-shadow: 0 2px 14px rgba(220, 38, 38, 0.15);
}

/* Countdown Medallion */
.error-countdown-medallion {
    padding: 0.85rem 1.75rem;
    border-radius: 1.15rem;
    background: radial-gradient(circle, #fff3dc 0%, #fae6c2 100%);
    border: 1px solid #ecc98f;
    box-shadow: 0 6px 20px rgba(197, 160, 89, 0.2);
    margin-bottom: 1.25rem;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.countdown-number {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 3.2rem;
    line-height: 1;
    font-weight: 700;
    color: #8a6114;
}

.countdown-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #634b15;
    margin-top: 0.25rem;
    font-weight: 700;
}

/* Title */
.error-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 1.75rem;
    font-weight: 600;
    line-height: 1.25;
    color: #1f1b18;
    margin: 0 0 0.85rem;
    letter-spacing: -0.01em;
}

/* Capacity Stat Badge */
.error-stat-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 1rem;
    border-radius: 9999px;
    background: #fdf6ec;
    border: 1px dashed #dcb37f;
    color: #573e04;
    font-size: 0.84rem;
    margin-bottom: 1rem;
}

.stat-icon {
    font-size: 1.1rem;
    color: #8a6114;
}

.stat-text strong {
    color: #8a6114;
    font-weight: 700;
}

/* Narrative */
.error-narrative {
    font-size: 0.92rem;
    line-height: 1.6;
    color: #5c5346;
    margin: 0 0 1.25rem;
    max-width: 350px;
}

/* Footnote */
.error-footnote {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.65rem 0.95rem;
    border-radius: 0.75rem;
    background: #fcf6f0;
    border: 1px solid #eedcd1;
    color: #6e6255;
    font-size: 0.78rem;
    line-height: 1.4;
    margin-bottom: 1.6rem;
    width: 100%;
}

.footnote-icon {
    font-size: 1.1rem;
    color: #8a6114;
    flex-shrink: 0;
}

/* Primary CTA Button */
.error-cta-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.65rem;
    width: 100%;
    padding: 0.95rem 1.75rem;
    border-radius: 9999px;
    background: linear-gradient(135deg, #e9c176 0%, #c5a059 50%, #e0b462 100%);
    color: #261900;
    font-family: 'Manrope', sans-serif;
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border: none;
    cursor: pointer;
    box-shadow: 0 10px 24px -4px rgba(197, 160, 89, 0.38);
    transition: all 0.2s ease;
}

.error-cta-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px -4px rgba(197, 160, 89, 0.5);
    filter: brightness(1.03);
}

.error-cta-btn:active {
    transform: translateY(0) scale(0.98);
}

.cta-icon {
    font-size: 1.15rem;
    color: #261900;
}

.cta-text {
    color: #261900;
}

@media (max-width: 480px) {
    .error-card {
        padding: 2rem 1.25rem;
    }

    .error-title {
        font-size: 1.55rem;
    }

    .error-code-display {
        font-size: 3.5rem;
    }

    .countdown-number {
        font-size: 2.75rem;
    }
}
</style>