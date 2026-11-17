<script setup>
import { ref, onMounted, defineAsyncComponent } from 'vue'
import { useDisplay } from '@/composables/useDisplay'
import stepsPhotoImg from '@/assets/images/landing/steps-photo.jpg'

const DemoEventDetails = defineAsyncComponent(() => import('@/views/DemoEventDetails.vue'))
const DemoEvent = defineAsyncComponent(() => import('@/views/DemoEvent.vue'))

const { mdAndDown } = useDisplay();
const isDemoMounted = ref(false)

onMounted(() => {
    // Defer heavy demo sub-tree mounting to idle time so initial landing page render is 100% fluid
    if (typeof window !== 'undefined') {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(() => {
                isDemoMounted.value = true
            }, { timeout: 250 })
        } else {
            setTimeout(() => {
                isDemoMounted.value = true
            }, 80)
        }
    }
})
</script>
<template>
    <section id="steps" class="steps-section">
        <div class="section-container">
            <!-- Section Heading -->
            <div class="d-flex justify-center mb-10">
                <div class="position-relative showcase-devices-wrapper"
                    :style="{ width: mdAndDown ? '340px' : '550px' }">
                    <!-- Left Floating Cards (3 pictures, desktop only) -->
                    <template v-if="!mdAndDown">
                        <div class="steps-floating-card-wrapper card-left-top">
                            <div class="steps-photo-card">
                                <img :src="stepsPhotoImg" alt="Celebration photo" class="steps-card-img"
                                    decoding="async" />
                                <div class="steps-card-heart">
                                    <JIcon name="heart" type="solid" :size="12" />
                                    <small>48</small>
                                </div>
                                <div class="steps-card-name">
                                    <small>Chloe T.</small>
                                </div>
                            </div>
                        </div>

                        <div class="steps-floating-card-wrapper card-left-mid">
                            <div class="steps-photo-card">
                                <img :src="stepsPhotoImg" alt="Celebration photo" class="steps-card-img"
                                    decoding="async" />
                                <div class="steps-card-heart">
                                    <JIcon name="heart" type="solid" :size="12" />
                                    <small>24</small>
                                </div>
                                <div class="steps-card-name">
                                    <small>Marcus D.</small>
                                </div>
                            </div>
                        </div>

                        <div class="steps-floating-card-wrapper card-left-bottom">
                            <div class="steps-photo-card">
                                <img :src="stepsPhotoImg" alt="Celebration photo" class="steps-card-img"
                                    decoding="async" />
                                <div class="steps-card-heart">
                                    <JIcon name="heart" type="solid" :size="12" />
                                    <small>53</small>
                                </div>
                                <div class="steps-card-name">
                                    <small>Sarah M.</small>
                                </div>
                            </div>
                        </div>
                    </template>

                    <!-- Center Showcase (iPad + iPhone) -->
                    <div :style="{ width: mdAndDown ? '300px' : '500px' }" class="position-relative overflow-hidden">
                        <img src="@/assets/images/blank-ipad.png" loading="lazy" decoding="async" alt="iPad Showcase" />
                        <div class="position-absolute ipad-screen"
                            :class="{ 'mobile': mdAndDown, 'desktop': !mdAndDown }">
                            <DemoEventDetails v-if="isDemoMounted" />
                            <div v-else class="preview-placeholder"></div>
                        </div>
                    </div>
                    <div :style="{ width: mdAndDown ? '90px' : '160px', right: 0, bottom: 0, zIndex: 5 }"
                        class="position-absolute">
                        <img src="@/assets/images/blank-phone-2.png" loading="lazy" decoding="async"
                            alt="Phone Showcase" />
                        <div class="position-absolute iphone-screen"
                            :class="{ 'desktop': !mdAndDown, 'mobile': mdAndDown }">
                            <div class="w-100 h-100 screen" :class="{ 'desktop': !mdAndDown, 'mobile': mdAndDown }">
                                <DemoEvent v-if="isDemoMounted" />
                                <div v-else class="preview-placeholder"></div>
                            </div>
                        </div>
                        <div class="position-absolute black-nudge"
                            :class="{ 'desktop': !mdAndDown, 'mobile': mdAndDown }"></div>
                    </div>

                    <!-- Right Floating Cards (3 pictures, desktop only) -->
                    <template v-if="!mdAndDown">
                        <div class="steps-floating-card-wrapper card-right-top">
                            <div class="steps-photo-card">
                                <img :src="stepsPhotoImg" alt="Celebration photo" class="steps-card-img"
                                    decoding="async" />
                                <div class="steps-card-heart">
                                    <JIcon name="heart" type="solid" :size="12" />
                                    <small>42</small>
                                </div>
                                <div class="steps-card-name">
                                    <small>Jevy A.</small>
                                </div>
                            </div>
                        </div>

                        <div class="steps-floating-card-wrapper card-right-mid">
                            <div class="steps-photo-card">
                                <img :src="stepsPhotoImg" alt="Celebration photo" class="steps-card-img"
                                    decoding="async" />
                                <div class="steps-card-heart">
                                    <JIcon name="heart" type="solid" :size="12" />
                                    <small>19</small>
                                </div>
                                <div class="steps-card-name">
                                    <small>Elena V.</small>
                                </div>
                            </div>
                        </div>

                        <div class="steps-floating-card-wrapper card-right-bottom">
                            <div class="steps-photo-card">
                                <img :src="stepsPhotoImg" alt="Celebration photo" class="steps-card-img"
                                    decoding="async" />
                                <div class="steps-card-heart">
                                    <JIcon name="heart" type="solid" :size="12" />
                                    <small>35</small>
                                </div>
                                <div class="steps-card-name">
                                    <small>David K.</small>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
            <div class="section-header text-center">
                <p class="section-category">EFFORTLESS GUEST EXPERIENCE</p>
                <h2 class="section-title">Capture Memories in 3 Simple Steps</h2>
                <p class="section-description">
                    Designed with intentional simplicity so grandparents and celebration guests alike can share
                    their
                    candid
                    viewpoint in mere seconds.
                </p>
            </div>

            <!-- 3 Steps Grid -->
            <div class="steps-grid">
                <!-- Step 01 -->
                <div class="step-card">
                    <div class="step-header">
                        <span class="step-number">01</span>
                        <span class="step-pill">Point &amp; Tap</span>
                    </div>
                    <div class="step-icon-wrap">
                        <span class="material-symbols-outlined text-[28px]">qr_code_scanner</span>
                    </div>
                    <h3 class="step-title">Scan the QR Code</h3>
                    <p class="step-text">
                        Guests point their phone camera at the refined table placard. The curated milestone portal
                        pops
                        open
                        immediately in native Safari or Chrome without any App Store hurdle.
                    </p>
                </div>

                <!-- Step 02 -->
                <div class="step-card">
                    <div class="step-header">
                        <span class="step-number">02</span>
                        <span class="step-pill">Batch Select</span>
                    </div>
                    <div class="step-icon-wrap">
                        <span class="material-symbols-outlined text-[28px]">photo_library</span>
                    </div>
                    <h3 class="step-title">Select Photos &amp; Candid Clips</h3>
                    <p class="step-text">
                        Select up to 100 raw celebration photos, 4K 30-second clips, or heartfelt notes in one tap,
                        preserving
                        pure native camera lens quality without heavy compression.
                    </p>
                </div>

                <!-- Step 03 -->
                <div class="step-card">
                    <div class="step-header">
                        <span class="step-number">03</span>
                        <span class="step-pill heart-pill">
                            <span>Instantly Cherished</span>
                            <span class="heart-icon">♥</span>
                        </span>
                    </div>
                    <div class="step-icon-wrap">
                        <span class="material-symbols-outlined text-[28px]">favorite</span>
                    </div>
                    <h3 class="step-title">Stream to Your Live Digital Keepsake</h3>
                    <p class="step-text">
                        Photos appear immediately inside your private milestone vault. Securely organized,
                        beautifully
                        cataloged, and treasured by the couple and family forever.
                    </p>
                </div>
            </div>
        </div>
    </section>
</template>
<style lang="scss">
.ipad-screen {
    z-index: -1;
    top: -10px;
    left: 50%;
    transform: translate(calc(-50% + 2px));
    height: calc(100% - 46px);
    width: calc(100% - 60px);
    border-radius: 60px;
    overflow: hidden;
    pointer-events: none;
    contain: strict;
    will-change: transform;
    background: var(--lp-surface, #ffffff);
    zoom: 0.4;

    &.mobile {
        top: -76px;
        height: calc(100% - -36px);
        width: calc(100% - 47px);
    }
}

.iphone-screen {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: calc(100% - 18px);
    height: calc(100% - 14px);
    border-radius: 18px;
    overflow: hidden;
    background-color: black;
    pointer-events: none;
    contain: strict;
    will-change: transform;

    &.desktop {

        width: calc(100% - 18px);
        height: calc(100% - 14px);
        border-radius: 18px;
    }

    &.mobile {
        width: calc(100% - 10px);
        height: calc(100% - 8px);
        border-radius: 12px;
    }

    .screen {
        &.desktop {
            zoom: 0.45;
        }

        &.mobile {
            zoom: 0.3;
        }
    }

    .event-vault-root {
        height: 100% !important;
        min-height: unset;

        .event-viewport {
            height: 100% !important;
            min-height: unset;
        }
    }
}

.preview-placeholder {
    width: 100%;
    height: 100%;
    background: var(--lp-surface-low, #fcf2ec);
    opacity: 0.5;
}

.black-nudge {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    background: black;
    z-index: 5;
    border-radius: 0 0 10px 10px;
    width: calc(100% - 80px);
    height: 15px;

    &.desktop {
        border-radius: 0 0 10px 10px;
        width: calc(100% - 80px);
        height: 15px;
    }

    &.mobile {
        border-radius: 0 0 5px 5px;
        width: calc(100% - 60px);
        height: 12px;
    }
}

/* ==========================================================================
   HOW IT WORKS - FLOATING PHOTO CARDS (Straight / Not Tilted)
   ========================================================================== */
.steps-floating-card-wrapper {
    position: absolute;
    cursor: pointer;
    transition: z-index 0.3s ease;
    will-change: transform;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    transform: translate3d(0, 0, 0);

    /* Left Side Cards */
    &.card-left-top {
        top: -55px;
        left: -170px;
        z-index: 6;
        animation: stepsFloatLT 4.6s ease-in-out infinite;
    }

    &.card-left-mid {
        top: calc(50% - 95px);
        left: -275px;
        z-index: 7;
        animation: stepsFloatLM 5.2s ease-in-out 0.8s infinite;
    }

    &.card-left-bottom {
        bottom: -55px;
        left: -165px;
        z-index: 6;
        animation: stepsFloatLB 4.8s ease-in-out 1.5s infinite;
    }

    /* Right Side Cards */
    &.card-right-top {
        top: -55px;
        right: -170px;
        z-index: 6;
        animation: stepsFloatRT 4.9s ease-in-out 0.4s infinite;
    }

    &.card-right-mid {
        top: calc(50% - 95px);
        right: -275px;
        z-index: 7;
        animation: stepsFloatRM 5.5s ease-in-out 1.1s infinite;
    }

    &.card-right-bottom {
        bottom: -55px;
        right: -165px;
        z-index: 8;
        animation: stepsFloatRB 4.7s ease-in-out 1.7s infinite;
    }

    &:hover {
        z-index: 50 !important;
        animation-play-state: paused;
    }
}

.steps-photo-card {
    position: relative;
    width: 140px;
    height: 190px;
    border-radius: 18px;
    overflow: hidden;
    background: var(--lp-surface, #ffffff);
    border: 3.5px solid #ffffff;
    box-shadow:
        0 20px 42px -8px rgba(0, 0, 0, 0.32),
        0 10px 20px -4px rgba(0, 0, 0, 0.18),
        0 0 0 1px rgba(197, 160, 89, 0.35);
    /* Straight / flat orientation - not tilted */
    transform: none;
    transform-style: flat;
    transition: transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1), box-shadow 0.35s ease, border-color 0.3s ease;
    will-change: transform;

    .steps-card-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center 55%;
        display: block;
        pointer-events: none;
        user-select: none;
        transition: transform 0.4s ease;
    }

    &:hover {
        transform: translateY(-5px) scale(1.03);
        box-shadow:
            0 32px 64px -10px rgba(0, 0, 0, 0.44),
            0 16px 30px -5px rgba(0, 0, 0, 0.25),
            0 0 0 1.5px var(--lp-primary, #d7b465);
        border-color: #ffffff;

        .steps-card-img {
            transform: scale(1.06);
        }

        .steps-card-heart,
        .steps-card-name {
            transform: scale(1.1);
            background: #ffffff;
        }

        .steps-card-heart {
            box-shadow: 0 6px 16px rgba(239, 68, 68, 0.32);
        }
    }
}

.steps-card-heart {
    position: absolute;
    bottom: 10px;
    left: 10px;
    z-index: 5;
    padding: 1px 5px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1.5px solid #ffffff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.25s ease, box-shadow 0.25s ease;

    .jui,
    i,
    svg {
        font-size: 16px;
        color: var(--danger, #ef4444);
    }

    small {
        margin-left: 1px;
        font-size: 10px;
        font-weight: 600;
        color: #1f2937;
    }
}

.steps-card-name {
    position: absolute;
    bottom: 10px;
    right: 10px;
    z-index: 5;
    padding: 1px 8px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1.5px solid #ffffff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.25s ease, box-shadow 0.25s ease;

    small {
        font-size: 10px;
        font-weight: 600;
        color: #1f2937;
    }
}

/* Dark Mode Tokens */
.landing-page[data-theme="dark"] .steps-photo-card,
[data-theme="dark"] .steps-photo-card,
.dark .steps-photo-card {
    background: #201b18;
    border-color: #2b241f;
    box-shadow:
        0 22px 48px -8px rgba(0, 0, 0, 0.8),
        0 10px 22px -4px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(215, 180, 101, 0.45);

    &:hover {
        border-color: #382f28;
        box-shadow:
            0 38px 80px -10px rgba(0, 0, 0, 0.95),
            0 18px 34px -5px rgba(0, 0, 0, 0.6),
            0 0 0 2px rgba(215, 180, 101, 0.7);
    }

    .steps-card-heart {
        background: rgba(32, 27, 24, 0.95);
        border-color: rgba(215, 180, 101, 0.4);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);

        small {
            color: #f3f4f6;
        }
    }

    .steps-card-name {
        background: rgba(32, 27, 24, 0.95);
        border-color: rgba(215, 180, 101, 0.4);
        color: var(--white, #ffffff);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);

        small {
            color: #f3f4f6;
        }
    }

    &:hover .steps-card-heart {
        background: #28221e;
        box-shadow: 0 6px 18px rgba(248, 113, 113, 0.4);
    }

    &:hover .steps-card-name {
        background: #28221e;
    }
}

/* Floating Animations */
@keyframes stepsFloatLT {

    0%,
    100% {
        transform: translate3d(0, 0, 0);
    }

    50% {
        transform: translate3d(0, -9px, 0);
    }
}

@keyframes stepsFloatLM {

    0%,
    100% {
        transform: translate3d(0, 0, 0);
    }

    50% {
        transform: translate3d(0, 10px, 0);
    }
}

@keyframes stepsFloatLB {

    0%,
    100% {
        transform: translate3d(0, 0, 0);
    }

    50% {
        transform: translate3d(0, -8px, 0);
    }
}

@keyframes stepsFloatRT {

    0%,
    100% {
        transform: translate3d(0, 0, 0);
    }

    50% {
        transform: translate3d(0, -10px, 0);
    }
}

@keyframes stepsFloatRM {

    0%,
    100% {
        transform: translate3d(0, 0, 0);
    }

    50% {
        transform: translate3d(0, 11px, 0);
    }
}

@keyframes stepsFloatRB {

    0%,
    100% {
        transform: translate3d(0, 0, 0);
    }

    50% {
        transform: translate3d(0, -9px, 0);
    }
}

/* Responsive Breakpoints - Hidden on Tablet & Mobile */
@media (max-width: 1023px) {
    .steps-floating-card-wrapper {
        display: none !important;
    }
}

@media (prefers-reduced-motion: reduce) {
    .steps-floating-card-wrapper {
        animation: none !important;
    }
}
</style>