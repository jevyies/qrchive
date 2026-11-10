<script setup>
const emit = defineEmits(['scrollTo'])
</script>
<template>
    <section class="hero-section">
        <!-- Ambient Champagne Background Glow Blobs -->
        <div class="glow-blob blob-top-left"></div>
        <div class="glow-blob blob-bottom-right"></div>

        <div class="section-container hero-grid">
            <!-- Left Column: Editorial Headline & Copy -->
            <div class="hero-content">
                <!-- Main Title -->
                <h1 class="hero-title">
                    Snap and Share Every <span class="hero-title-italic">Unforgettable</span> Moment.
                </h1>

                <!-- Subtitle -->
                <p class="hero-subtitle">
                    With a simple QR scan, guests can snap photos and share candid 30-second clips—no app required.
                    After the
                    event, receive a download-ready link to all your memories.
                </p>

                <!-- Action Row -->
                <div class="hero-cta-group">
                    <button type="button" class="btn-primary-gradient hero-cta-btn"
                        @click="emit('scrollTo', 'launchVault')">
                        <span>Get Started</span>
                        <JIcon name="arrow-right" size="18" />
                    </button>

                    <button type="button" class="btn-secondary-tonal hero-cta-btn"
                        @click="router.push('/event/demo-event')">
                        <span class="material-symbols-outlined text-accent text-[20px]">play_circle</span>
                        <span>Try Our Guest Demo</span>
                    </button>
                </div>

                <!-- Micro-Trust Badges -->
                <div class="hero-trust-row">
                    <div class="trust-item">
                        <JIcon name="circle-check" />
                        <span>Zero app downloads required</span>
                    </div>
                    <span class="trust-dot">•</span>
                    <div class="trust-item">
                        <span class="material-symbols-outlined trust-icon">hd</span>
                        <span>Uncompressed Photos &amp; Videos</span>
                    </div>
                </div>
            </div>

            <!-- Right Column: Visual Showcase Card -->
            <div class="hero-visual">
                <div class="showcase-card-wrapper">
                    <img src="@/assets/images/blank-phone.png" />
                </div>
            </div>
        </div>
    </section>
</template>