<script setup>
import heroCoupleImg1 from '@/assets/images/landing/landing-1.png'
import heroCoupleImg2 from '@/assets/images/landing/landing-2.png'
import heroCoupleImg3 from '@/assets/images/landing/landing-3.png'
import screenShot from '@/assets/images/screen-1.png'
import { useRouter } from 'vue-router';
import { useDisplay } from '@/composables/useDisplay'

const emit = defineEmits(['scrollTo'])
const router = useRouter();
const { mdAndDown } = useDisplay();
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
                        <JIcon name="calendar" />
                        <span>Up to 1 month of file access</span>
                    </div>
                </div>
            </div>

            <!-- Right Column: Visual Showcase Card -->
            <div class="hero-visual">
                <div class="showcase-card-wrapper">
                    <div class="showcase-phone-container">
                        <img src="@/assets/images/blank-phone.png" class="showcase-phone-img"
                            alt="Mobile celebration view" />
                        <div class="showcase-phone-screen">
                            <img :src="screenShot" class="showcase-screen-img" alt="Mobile celebration view" />
                        </div>
                        <div class="hero-floating-card-wrapper card-top-right">
                            <div class="hero-photo-card">
                                <img :src="heroCoupleImg2" alt="Celebration photo" class="hero-card-img" />
                                <div class="hero-card-heart">
                                    <JIcon name="heart" type="solid" :size="mdAndDown ? 11 : 16" />
                                    <small>42</small>
                                </div>
                                <div class="hero-card-name">
                                    <small>Jevy A.</small>
                                </div>
                            </div>
                        </div>
                        <div class="hero-floating-card-wrapper card-center-left">
                            <div class="hero-photo-card" :style="{ backgroundImage: `url(${heroCoupleImg3})` }">
                                <img :src="heroCoupleImg3" alt="Celebration photo" class="hero-card-img" />
                                <div class="hero-card-heart">
                                    <JIcon name="heart" type="solid" :size="mdAndDown ? 11 : 16" />
                                    <small>11</small>
                                </div>
                                <div class="hero-card-name">
                                    <small>Jean A.</small>
                                </div>
                            </div>
                        </div>
                        <div class="hero-floating-card-wrapper card-bottom-right">
                            <div class="hero-photo-card">
                                <img :src="heroCoupleImg1" alt="Celebration photo" class="hero-card-img" />
                                <div class="hero-card-heart">
                                    <JIcon name="heart" type="solid" :size="mdAndDown ? 11 : 16" />
                                    <small>20</small>
                                </div>
                                <div class="hero-card-name">
                                    <small>Alex B.</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>