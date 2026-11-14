<script setup>
import { useDisplay } from '@/composables/useDisplay'
import DemoEventDetails from '@/views/DemoEventDetails.vue'
import DemoEvent from '@/views/DemoEvent.vue';

const { mdAndDown } = useDisplay();
</script>
<template>
    <section id="steps" class="steps-section">
        <div class="section-container">
            <!-- Section Heading -->
            <div class="d-flex justify-center mb-10">
                <div class="position-relative" :style="{ width: mdAndDown ? '340px' : '550px' }">
                    <div :style="{ width: mdAndDown ? '300px' : '500px' }" class="position-relative">
                        <img src="@/assets/images/blank-ipad.png" />
                        <div class="position-absolute ipad-screen">
                            <DemoEventDetails />
                        </div>
                    </div>
                    <div :style="{ width: mdAndDown ? '90px' : '160px', right: 0, bottom: 0, zIndex: 5 }"
                        class="position-absolute">
                        <img src="@/assets/images/blank-phone-2.png" />
                        <div class="position-absolute iphone-screen"
                            :class="{ 'desktop': !mdAndDown, 'mobile': mdAndDown }">
                            <div class="w-100 h-100 screen" :class="{ 'desktop': !mdAndDown, 'mobile': mdAndDown }">
                                <DemoEvent />
                            </div>
                        </div>
                        <div class="position-absolute black-nudge"
                            :class="{ 'desktop': !mdAndDown, 'mobile': mdAndDown }"></div>
                    </div>
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
    top: 50%;
    left: 50%;
    transform: translate(calc(-50% + 2px), -50%);
    height: calc(100% - 60px);
    width: calc(100% - 60px);
    border-radius: 60px;
    overflow: hidden;
    zoom: 0.4;
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
            zoom: 0.45
        }

        &.mobile {
            zoom: 0.3
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
</style>