<route lang="yaml">
meta:
  layout: blank
</route>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLayout } from '../composables/useLayout'
import { hasAuthToken } from '../@core/utils/cookies'
import AppLogo from '../@core/components/AppLogo.vue'

const router = useRouter()
const { currentTheme, selectTheme, isDarkMode } = useLayout()

const isAuthenticated = computed(() => {
  return typeof window !== 'undefined' && hasAuthToken()
})

// Mobile Menu Navigation State
const isMobileMenuOpen = ref(false)
const activeMobileTab = ref('explore')

// Dynamic Pricing Selector State
// 'standard': { '100': 500, '300': 800, 'plus': 1000 }
// 'unlimited': { '100': 1000, '300': 1500, 'plus': 2000 }
const selectedStandardCap = ref('100')
const selectedUnlimitedCap = ref('100')

const standardPrices = {
  '100': { price: '₱500', label: 'Up to 100 guests' },
  '300': { price: '₱800', label: 'Up to 300 guests' },
  'plus': { price: '₱1,000', label: '300+ guests' },
}

const unlimitedPrices = {
  '100': { price: '₱1,000', label: 'Up to 100 guests' },
  '300': { price: '₱1,500', label: 'Up to 300 guests' },
  'plus': { price: '₱2,000', label: '300+ guests' },
}

// Scavenger Hunt Checklist Interactive State
const huntChecklist = ref([
  { id: 1, title: 'Grand Entrance Cheers', checked: true },
  { id: 2, title: "Couple's First Dance Sway", checked: true },
  { id: 3, title: 'Heartfelt Family Toasts', checked: false },
  { id: 4, title: 'Celebration Cake Cutting', checked: false },
  { id: 5, title: 'Spontaneous Candid Laughter', checked: true },
  { id: 6, title: 'Golden Hour Portraits', checked: false },
])

const toggleChecklistItem = (item) => {
  item.checked = !item.checked
}

// Reservation / QR Creation Form State
const formData = ref({
  hosts: '',
  date: '',
  packageTier: 'unlimited-100',
  email: '',
})

const isFormSubmitted = ref(false)
const isSubmitting = ref(false)

const handleFormSubmit = () => {
  isSubmitting.value = true
  setTimeout(() => {
    isSubmitting.value = false
    isFormSubmitted.value = true
  }, 600)
}

// Smooth scroll helper
const scrollTo = (elementId, tabName = '') => {
  if (tabName) activeMobileTab.value = tabName
  isMobileMenuOpen.value = false
  const el = document.getElementById(elementId)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Toggle Theme helper
const toggleTheme = () => {
  selectTheme(isDarkMode.value ? 'light' : 'dark')
}

// Handle User Icon navigation
const handleUserClick = () => {
  if (isAuthenticated.value) {
    router.push('/dashboard')
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <div class="landing-page font-sans" :data-theme="currentTheme" :class="['landing-page--' + currentTheme]">
    <!-- ======================================================================= -->
    <!-- 1. RESPONSIVE HEADER                                                    -->
    <!-- ======================================================================= -->
    <header class="header-nav">
      <div class="header-container">
        <!-- Logo & Brand -->
        <a href="#" class="brand-link" @click.prevent="scrollTo('top', 'explore')">
          <AppLogo :width="38" :height="38" color="primary" class="brand-logo" />
          <div class="brand-text">
            <span class="brand-title">QRchive</span>
            <span class="brand-subtitle">Celebration Vault</span>
          </div>
        </a>

        <!-- Desktop Navigation Links (Hidden on mobile) -->
        <nav class="desktop-nav">
          <a href="#steps" class="nav-link" @click.prevent="scrollTo('steps')">How It Works</a>
          <a href="#features" class="nav-link" @click.prevent="scrollTo('features')">Features</a>
          <a href="#scavenger-hunt" class="nav-link" @click.prevent="scrollTo('scavenger-hunt')">Checklist Hunt</a>
          <a href="#pricing" class="nav-link" @click.prevent="scrollTo('pricing')">Pricing</a>
          <a href="#launch-vault" class="nav-link" @click.prevent="scrollTo('launch-vault')">Guest Demo</a>
        </nav>

        <!-- Right Actions: Theme Switcher, Create QR, User Profile, Mobile Hamburger -->
        <div class="header-actions">
          <!-- Theme Switcher Toggle -->
          <button type="button" class="icon-btn theme-toggle-btn"
            :title="isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'" @click="toggleTheme">
            <span class="material-symbols-outlined text-[20px]">
              {{ isDarkMode ? 'light_mode' : 'dark_mode' }}
            </span>
          </button>

          <!-- Desktop CTA Button -->
          <button type="button" class="btn-primary-gradient hidden-sm" @click="scrollTo('launch-vault')">
            <span>Create Event QR</span>
          </button>

          <!-- User Profile / Auth Icon -->
          <button type="button" class="icon-btn user-avatar-btn"
            :title="isAuthenticated ? 'Go to Dashboard' : 'Sign In'" @click="handleUserClick">
            <span class="material-symbols-outlined text-[19px]">person</span>
          </button>

          <!-- Mobile Hamburger Toggle Button -->
          <button type="button" class="icon-btn mobile-hamburger" aria-label="Navigation Menu"
            @click="isMobileMenuOpen = !isMobileMenuOpen">
            <span class="material-symbols-outlined text-[26px]">
              {{ isMobileMenuOpen ? 'close' : 'menu' }}
            </span>
          </button>
        </div>
      </div>

      <!-- Mobile Dropdown Drawer -->
      <div v-show="isMobileMenuOpen" class="mobile-drawer">
        <nav class="mobile-nav-list">
          <a href="#steps" class="mobile-nav-link" @click="scrollTo('steps')">
            <span class="material-symbols-outlined">auto_stories</span>
            <span>How It Works</span>
          </a>
          <a href="#features" class="mobile-nav-link" @click="scrollTo('features')">
            <span class="material-symbols-outlined">stars</span>
            <span>Features Suite</span>
          </a>
          <a href="#scavenger-hunt" class="mobile-nav-link" @click="scrollTo('scavenger-hunt')">
            <span class="material-symbols-outlined">checklist</span>
            <span>Photo Scavenger Hunt</span>
          </a>
          <a href="#pricing" class="mobile-nav-link" @click="scrollTo('pricing', 'pricing')">
            <span class="material-symbols-outlined">payments</span>
            <span>Pricing Packages</span>
          </a>
          <a href="#launch-vault" class="mobile-nav-link" @click="scrollTo('launch-vault')">
            <span class="material-symbols-outlined">qr_code_2</span>
            <span>Create Event QR</span>
          </a>
        </nav>
        <div class="mobile-drawer-footer">
          <button type="button" class="btn-primary-gradient w-full" @click="scrollTo('launch-vault')">
            <span>Launch Your Celebration QR</span>
            <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </header>

    <!-- ======================================================================= -->
    <!-- 2. MAIN CONTENT                                                         -->
    <!-- ======================================================================= -->
    <main id="top" class="main-content">
      <!-- 2.1 HERO SECTION -->
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
              Instant QR guest capture with your bespoke milestone cover motif, uncompressed original photos, 30-second
              candid video clips, and seamless cloud archive export.
            </p>

            <!-- Action Row -->
            <div class="hero-cta-group">
              <button type="button" class="btn-primary-gradient hero-cta-btn" @click="scrollTo('launch-vault')">
                <span>Create Your QR Now</span>
                <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>

              <button type="button" class="btn-secondary-tonal hero-cta-btn" @click="router.push('/event/demo-event')">
                <span class="material-symbols-outlined text-accent text-[20px]">play_circle</span>
                <span>Try Our Guest Demo</span>
              </button>
            </div>

            <!-- Micro-Trust Badges -->
            <div class="hero-trust-row">
              <div class="trust-item">
                <span class="material-symbols-outlined trust-icon">check_circle</span>
                <span>Zero app downloads required</span>
              </div>
              <span class="trust-dot">•</span>
              <div class="trust-item">
                <span class="material-symbols-outlined trust-icon">bolt</span>
                <span>High-speed QR scanning</span>
              </div>
              <span class="trust-dot">•</span>
              <div class="trust-item">
                <span class="material-symbols-outlined trust-icon">hd</span>
                <span>Uncompressed RAW &amp; 4K</span>
              </div>
            </div>
          </div>

          <!-- Right Column: Visual Showcase Card -->
          <div class="hero-visual">
            <div class="showcase-card-wrapper">
              <div class="showcase-card">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDKXg7CpHgujwBDhLd66UL5k_R88IhlrJ5zAvsOtS3KOZJQlyvmUXNKNScVs4h5x-P71KWQyAqFb4QqmnruZULsw9x5UMPFSifwVpzO9ao05LinjIzzN56co9g2zSShIOadWGPkntrG3Bl7rvqnNAv5TgdfiYqzHA3CU3fzRIgz1ruFRtlxLiuO3wbv44LYv1cBhWPr7GQu2dqtFJE0xFAaapaw8iqTzmCIUEndoNesCNupkSo3ZMUN"
                  alt="Candid luxury milestone celebration dinner banquet where guests take photos with smartphones"
                  class="showcase-img" />
                <div class="showcase-scrim"></div>

                <!-- Floating Glass Badge: Instant Upload -->
                <div class="floating-badge badge-top-left">
                  <span class="text-accent">✨</span>
                  <span>Instant Upload (Zero App Needed)</span>
                </div>

                <!-- Floating Glass Badge: RAW & 4K -->
                <div class="floating-badge badge-top-right">
                  <span class="text-accent">📸</span>
                  <span>RAW &amp; 4K Original</span>
                </div>

                <!-- Bottom Floating Caption -->
                <div class="showcase-bottom-caption">
                  <div class="live-status-pill">
                    <span class="status-pulse-dot"></span>
                    <span class="caption-quote">“Moments Captured Live”</span>
                  </div>
                  <span class="live-counter-badge">
                    482 Uploads Live
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 2.2 HOW IT WORKS (3 SIMPLE STEPS) -->
      <section id="steps" class="steps-section">
        <div class="section-container">
          <!-- Section Heading -->
          <div class="section-header text-center">
            <p class="section-category">EFFORTLESS GUEST EXPERIENCE</p>
            <h2 class="section-title">Capture Memories in 3 Simple Steps</h2>
            <p class="section-description">
              Designed with intentional simplicity so grandparents and celebration guests alike can share their candid
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
                Guests point their phone camera at the refined table placard. The curated milestone portal pops open
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
                Select up to 100 raw celebration photos, 4K 30-second clips, or heartfelt notes in one tap, preserving
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
                Photos appear immediately inside your private milestone vault. Securely organized, beautifully
                cataloged, and treasured by the couple and family forever.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 2.3 FEATURES SUITE BENTO GRID -->
      <section id="features" class="features-section">
        <div class="section-container">
          <!-- Section Heading -->
          <div class="section-header text-center">
            <p class="section-category">SNAP AND SHARE SUITE</p>
            <h2 class="section-title">Features for Every Celebration</h2>
            <p class="section-description">
              Curated tools engineered for seamless guest participation and effortless preservation of your
              once-in-a-lifetime gathering.
            </p>
          </div>

          <!-- Feature Bento Grid -->
          <div class="features-bento-grid">
            <!-- Feature 1: Multi-Event Management -->
            <div class="feature-card col-4">
              <div class="feature-header">
                <div class="feature-icon-badge">
                  <span class="material-symbols-outlined text-[24px]">calendar_view_week</span>
                </div>
                <span class="feature-tag">Unlimited Celebrations</span>
              </div>
              <h3 class="feature-title">Multi-Event Management</h3>
              <p class="feature-text">
                Coordinate rehearsal toasts, main celebration dinner, and morning brunch under a single master event
                dashboard with individual sub-vaults.
              </p>
            </div>

            <!-- Feature 2: Custom Celebration Styling & Cover Photo -->
            <div class="feature-card col-4">
              <div class="feature-header">
                <div class="feature-icon-badge">
                  <span class="material-symbols-outlined text-[24px]">palette</span>
                </div>
                <span class="feature-tag">Motif &amp; Typography</span>
              </div>
              <h3 class="feature-title">Custom Celebration Styling &amp; Cover</h3>
              <p class="feature-text">
                Incorporate your bespoke portrait cover photo, signature fonts, and warm champagne color palettes for an
                immersive luxury brand feel.
              </p>
            </div>

            <!-- Feature 3: Guest Video & Photo Capture -->
            <div class="feature-card col-4">
              <div class="feature-header">
                <div class="feature-icon-badge">
                  <span class="material-symbols-outlined text-[24px]">videocam</span>
                </div>
                <span class="feature-tag">30s Video Limit</span>
              </div>
              <h3 class="feature-title">Guest Video &amp; Photo Capture</h3>
              <p class="feature-text">
                Preserve candid toast speeches, lively dance moments, and ambient acoustic laughter with uncompressed
                30-second live video recordings.
              </p>
            </div>

            <!-- Feature 4: Instant QR & 5x7 Table Templates -->
            <div class="feature-card col-6">
              <div class="feature-header">
                <div class="feature-icon-badge">
                  <span class="material-symbols-outlined text-[24px]">print</span>
                </div>
                <span class="feature-tag">Ready-to-Print</span>
              </div>
              <h3 class="feature-title">Instant QR &amp; 5x7 Table Templates</h3>
              <p class="feature-text">
                Instantly export downloadable high-resolution 5x7 printable card designs tailored for elegant brushed
                gold, acrylic, or vintage standing wood frames on guest reception tables.
              </p>
              <div class="feature-sublabel">
                <span class="material-symbols-outlined text-[16px]">file_download</span>
                <span>Print-ready PDF &amp; PNG format included</span>
              </div>
            </div>

            <!-- Feature 5: Full Archive & Cloud Export -->
            <div class="feature-card col-6">
              <div class="feature-header">
                <div class="feature-icon-badge">
                  <span class="material-symbols-outlined text-[24px]">cloud_download</span>
                </div>
                <span class="feature-tag">1-Click Export</span>
              </div>
              <h3 class="feature-title">Full Archive &amp; Cloud Export</h3>
              <p class="feature-text">
                Never worry about losing a single memory. Download a full chronologically organized ZIP archive or
                trigger an instant synchronization directly to your private Google Drive folder.
              </p>
              <div class="feature-sublabel">
                <span class="material-symbols-outlined text-[16px]">verified_user</span>
                <span>Direct Google Drive Shareable Link</span>
              </div>
            </div>

            <!-- Feature 6: Photo Scavenger Hunt & Capture Checklist (PROMINENT HIGHLIGHT) -->
            <div id="scavenger-hunt" class="feature-card col-8 featured-highlight-card">
              <div class="feature-header flex-wrap">
                <div class="flex-align-center gap-2">
                  <div class="feature-icon-badge">
                    <span class="material-symbols-outlined text-[26px]">checklist</span>
                  </div>
                  <h3 class="feature-title mb-0">Interactive Photo Scavenger Hunt</h3>
                </div>
                <span class="feature-tag gold-tag">Interactive Hunt</span>
              </div>
              <p class="feature-text">
                Turn your milestone into an engaging, collaborative memory game. Guests receive a curated checklist of
                meaningful moments to look out for and capture throughout the gathering:
              </p>

              <!-- Interactive Checklist Items Grid -->
              <div class="checklist-grid">
                <div v-for="item in huntChecklist" :key="item.id" class="checklist-item"
                  :class="{ 'is-checked': item.checked }" @click="toggleChecklistItem(item)">
                  <span class="material-symbols-outlined checklist-icon">
                    {{ item.checked ? 'check_circle' : 'radio_button_unchecked' }}
                  </span>
                  <span class="checklist-label">{{ item.title }}</span>
                  <span class="checklist-heart" :class="{ 'heart-active': item.checked }">♥</span>
                </div>
              </div>
            </div>

            <!-- Feature 7: Storage Timeline & Deadlines -->
            <div class="feature-card col-4">
              <div class="feature-header">
                <div class="feature-icon-badge">
                  <span class="material-symbols-outlined text-[24px]">schedule</span>
                </div>
                <span class="feature-tag">Timeline Details</span>
              </div>
              <h3 class="feature-title">Storage Timeline &amp; Deadlines</h3>
              <div class="timeline-items">
                <div class="timeline-item">
                  <span class="material-symbols-outlined timeline-icon">event_available</span>
                  <div>
                    <strong class="timeline-title">1-Month Uploading Window:</strong>
                    <p class="timeline-desc">Guests can deposit photos and clips up to 30 days post-celebration.</p>
                  </div>
                </div>
                <div class="timeline-item">
                  <span class="material-symbols-outlined timeline-icon">lock_clock</span>
                  <div>
                    <strong class="timeline-title">2-Month Vault Storage:</strong>
                    <p class="timeline-desc">Full-fidelity access and gallery browsing for 60 complete days.</p>
                  </div>
                </div>
                <div class="timeline-item">
                  <span class="material-symbols-outlined timeline-icon">more_time</span>
                  <div>
                    <strong class="timeline-title">Flexible Extension:</strong>
                    <p class="timeline-desc">Need extra time? Extend vault access anytime for only +₱200/month.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 2.4 PRICING COMPARISON -->
      <section id="pricing" class="pricing-section">
        <div class="section-container">
          <!-- Section Heading -->
          <div class="section-header text-center">
            <p class="section-category">TRANSPARENT PER-EVENT RATES</p>
            <h2 class="section-title">Choose Your Event Package</h2>
            <p class="section-description">
              Simple per-celebration flat pricing tailored to your guest size with zero surprise fees.
            </p>
          </div>

          <!-- Dual Tier Comparison Cards -->
          <div class="pricing-grid">
            <!-- TIER 1: Standard Snap -->
            <div class="pricing-card">
              <div class="pricing-card-top">
                <div class="pricing-title-row">
                  <h3 class="pricing-title">Standard Snap</h3>
                  <span class="pricing-badge">Max 30 shots / guest</span>
                </div>
                <p class="pricing-desc">
                  Ideal for intimate anniversary gatherings, milestone banquets, and minimalist celebrations.
                </p>

                <!-- Capacity Selector -->
                <div class="capacity-selector-block">
                  <label class="capacity-label">Select Guest Size</label>
                  <div class="capacity-buttons">
                    <button type="button" class="cap-btn" :class="{ active: selectedStandardCap === '100' }"
                      @click="selectedStandardCap = '100'">
                      <span class="cap-name">Up to 100</span>
                      <span class="cap-price">₱500</span>
                    </button>
                    <button type="button" class="cap-btn" :class="{ active: selectedStandardCap === '300' }"
                      @click="selectedStandardCap = '300'">
                      <span class="cap-name">Up to 300</span>
                      <span class="cap-price">₱800</span>
                    </button>
                    <button type="button" class="cap-btn" :class="{ active: selectedStandardCap === 'plus' }"
                      @click="selectedStandardCap = 'plus'">
                      <span class="cap-name">300+ guests</span>
                      <span class="cap-price">₱1,000</span>
                    </button>
                  </div>
                </div>

                <!-- Perks List -->
                <ul class="perks-list">
                  <li class="perk-item">
                    <span class="material-symbols-outlined perk-icon">check_circle</span>
                    <span>Max 30 original photos per guest</span>
                  </li>
                  <li class="perk-item">
                    <span class="material-symbols-outlined perk-icon">check_circle</span>
                    <span>Short video clips up to 30s</span>
                  </li>
                  <li class="perk-item">
                    <span class="material-symbols-outlined perk-icon">check_circle</span>
                    <span>Instant QR &amp; 5x7 printable table placard template</span>
                  </li>
                  <li class="perk-item">
                    <span class="material-symbols-outlined perk-icon">check_circle</span>
                    <span>1-month post-event upload deadline</span>
                  </li>
                  <li class="perk-item">
                    <span class="material-symbols-outlined perk-icon">check_circle</span>
                    <span>2-month cloud gallery storage &amp; full ZIP download</span>
                  </li>
                </ul>
              </div>

              <button type="button" class="btn-secondary-tonal w-full" @click="scrollTo('launch-vault')">
                <span>Select Standard Snap ({{ standardPrices[selectedStandardCap].price }})</span>
              </button>
            </div>

            <!-- TIER 2: Unlimited Snap (Most Cherished Choice) -->
            <div class="pricing-card featured-pricing-card">
              <!-- Top Gold Floating Badge -->
              <div class="cherished-badge">
                <span>♥</span>
                <span>Most Cherished Choice</span>
                <span>♥</span>
              </div>

              <div class="pricing-card-top">
                <div class="pricing-title-row pt-2">
                  <h3 class="pricing-title">Unlimited Snap</h3>
                  <span class="pricing-badge gold-badge">Unconstrained Vault</span>
                </div>
                <p class="pricing-desc">
                  Designed for full-scale milestone galas where you never want to miss a single candid angle.
                </p>

                <!-- Capacity Selector -->
                <div class="capacity-selector-block">
                  <label class="capacity-label">Select Guest Size</label>
                  <div class="capacity-buttons">
                    <button type="button" class="cap-btn" :class="{ active: selectedUnlimitedCap === '100' }"
                      @click="selectedUnlimitedCap = '100'">
                      <span class="cap-name">Up to 100</span>
                      <span class="cap-price">₱1,000</span>
                    </button>
                    <button type="button" class="cap-btn" :class="{ active: selectedUnlimitedCap === '300' }"
                      @click="selectedUnlimitedCap = '300'">
                      <span class="cap-name">Up to 300</span>
                      <span class="cap-price">₱1,500</span>
                    </button>
                    <button type="button" class="cap-btn" :class="{ active: selectedUnlimitedCap === 'plus' }"
                      @click="selectedUnlimitedCap = 'plus'">
                      <span class="cap-name">300+ guests</span>
                      <span class="cap-price">₱2,000</span>
                    </button>
                  </div>
                </div>

                <!-- Perks List -->
                <ul class="perks-list">
                  <li class="perk-item">
                    <span class="material-symbols-outlined perk-icon text-accent">verified</span>
                    <span><strong>Unlimited</strong> candid photo uploads from every guest</span>
                  </li>
                  <li class="perk-item">
                    <span class="material-symbols-outlined perk-icon text-accent">verified</span>
                    <span>Short video clips up to 30s in 4K resolution</span>
                  </li>
                  <li class="perk-item">
                    <span class="material-symbols-outlined perk-icon text-accent">verified</span>
                    <span>Custom event cover photo displayed on scan &amp; upload</span>
                  </li>
                  <li class="perk-item">
                    <span class="material-symbols-outlined perk-icon text-accent">verified</span>
                    <span>Romantic font &amp; motif styling customization</span>
                  </li>
                  <li class="perk-item">
                    <span class="material-symbols-outlined perk-icon text-accent">verified</span>
                    <span>Instant 5x7 printable table placards (Chic gold styling)</span>
                  </li>
                  <li class="perk-item">
                    <span class="material-symbols-outlined perk-icon text-accent">verified</span>
                    <span>Interactive Photo Scavenger Hunt &amp; Capture Checklist</span>
                  </li>
                  <li class="perk-item">
                    <span class="material-symbols-outlined perk-icon text-accent">verified</span>
                    <span>Google Drive shareable export link &amp; 1-click ZIP archive</span>
                  </li>
                </ul>
              </div>

              <button type="button" class="btn-primary-gradient w-full" @click="scrollTo('launch-vault')">
                <span>Get Unlimited Snap ({{ unlimitedPrices[selectedUnlimitedCap].price }})</span>
                <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>

          <!-- Storage Extension Banner -->
          <div class="extension-banner">
            <div class="extension-tag">
              <span>♥</span>
              <span>+₱200 / MONTH</span>
            </div>
            <span class="extension-dot">•</span>
            <p class="extension-text">
              Need more time? Extend uploading deadline or cloud photo storage anytime for only
              <strong>+₱200/month</strong>.
            </p>
          </div>
        </div>
      </section>

      <!-- 2.5 FINAL LAUNCH & RESERVATION SECTION -->
      <section id="launch-vault" class="launch-section">
        <div class="section-container">
          <!-- Deep Charcoal / Espresso Card -->
          <div class="launch-card">
            <!-- Glow Accents -->
            <div class="launch-glow top-right"></div>
            <div class="launch-glow bottom-left"></div>

            <div class="launch-card-header text-center">
              <div class="crest-icon-badge">
                <span>♥</span>
              </div>
              <h2 class="launch-title">Ready to launch your Event?</h2>
              <p class="launch-subtitle">
                Choose your tier, customize your 5x7 table placards, and let your guests capture every angle candidly.
              </p>
            </div>

            <!-- Interactive Registration Form -->
            <form class="launch-form" @submit.prevent="handleFormSubmit">
              <div class="form-grid">
                <!-- Input 1: Couple Names / Hosts -->
                <div class="form-group">
                  <label class="form-label">Couple Names / Hosts</label>
                  <input v-model="formData.hosts" type="text" required class="form-input"
                    placeholder="e.g., Sarah &amp; James" />
                </div>

                <!-- Input 2: Event Date -->
                <div class="form-group">
                  <label class="form-label">Celebration Date</label>
                  <input v-model="formData.date" type="date" required class="form-input" />
                </div>

                <!-- Input 3: Select Package Tier -->
                <div class="form-group">
                  <label class="form-label">Select Package Tier</label>
                  <select v-model="formData.packageTier" class="form-input form-select">
                    <option value="unlimited-100">Unlimited Snap — Up to 100 Guests (₱1,000)</option>
                    <option value="unlimited-300">Unlimited Snap — Up to 300 Guests (₱1,500)</option>
                    <option value="unlimited-plus">Unlimited Snap — 300+ Guests (₱2,000)</option>
                    <option value="standard-100">Standard Snap — Up to 100 Guests (₱500)</option>
                    <option value="standard-300">Standard Snap — Up to 300 Guests (₱800)</option>
                    <option value="standard-plus">Standard Snap — 300+ Guests (₱1,000)</option>
                  </select>
                </div>

                <!-- Input 4: Contact Email -->
                <div class="form-group">
                  <label class="form-label">Your Contact Email</label>
                  <input v-model="formData.email" type="email" required class="form-input"
                    placeholder="you@domain.com" />
                </div>
              </div>

              <!-- Submit Button -->
              <div class="form-actions text-center">
                <button type="submit" class="btn-primary-gradient submit-btn" :disabled="isSubmitting">
                  <span class="material-symbols-outlined text-[20px]">qr_code_2</span>
                  <span>{{ isSubmitting ? 'Configuring Vault...' : 'Create Event Snap & Share QR' }}</span>
                </button>

                <!-- Confirmation Alert Message -->
                <div v-if="isFormSubmitted" class="submit-success-msg">
                  ✨ Vault Configured! Your customized 5x7 printable template is being dispatched to {{ formData.email ||
                    'your email' }}!
                </div>
              </div>
            </form>

            <!-- Reassurance Trust Badges -->
            <div class="launch-trust-footer">
              <span>1-Mo Upload &amp; 2-Mo Storage</span>
              <span class="text-accent">•</span>
              <span>+₱200/mo Extension</span>
              <span class="text-accent">•</span>
              <span>Google Drive Export</span>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- ======================================================================= -->
    <!-- 3. FOOTER                                                               -->
    <!-- ======================================================================= -->
    <footer class="landing-footer">
      <div class="section-container">
        <div class="footer-grid">
          <!-- Col 1: Brand & Philosophy -->
          <div class="footer-col col-brand">
            <div class="brand-link mb-3">
              <AppLogo :width="36" :height="36" color="primary" class="brand-logo" />
              <span class="brand-title">QRchive</span>
            </div>
            <p class="footer-desc">
              The couture digital archive designed for luxury weddings and milestones. Guests simply scan to deposit
              raw, uncompressed visual heirlooms effortlessly.
            </p>
            <p class="footer-quote">
              “Preserving raw, candid milestone memories in uncompressed perfection.”
            </p>
          </div>

          <!-- Col 2: Celebrations -->
          <div class="footer-col">
            <h4 class="footer-col-title">Celebrations</h4>
            <ul class="footer-nav-list">
              <li><a href="#top" @click.prevent="scrollTo('top')">Weddings</a></li>
              <li><a href="#top" @click.prevent="scrollTo('top')">Gala &amp; Soirées</a></li>
              <li><a href="#top" @click.prevent="scrollTo('top')">Anniversaries</a></li>
              <li><a href="#top" @click.prevent="scrollTo('top')">Curated Receptions</a></li>
            </ul>
          </div>

          <!-- Col 3: Features -->
          <div class="footer-col">
            <h4 class="footer-col-title">Features</h4>
            <ul class="footer-nav-list">
              <li><a href="#steps" @click.prevent="scrollTo('steps')">Live Vault Stream</a></li>
              <li><a href="#scavenger-hunt" @click.prevent="scrollTo('scavenger-hunt')">Photo Scavenger Hunt</a></li>
              <li><a href="#features" @click.prevent="scrollTo('features')">Audio Guestbook</a></li>
              <li><a href="#features" @click.prevent="scrollTo('features')">Bespoke Print Cards</a></li>
            </ul>
          </div>

          <!-- Col 4: Atelier Support -->
          <div class="footer-col">
            <h4 class="footer-col-title">Atelier Support</h4>
            <ul class="footer-nav-list mb-3">
              <li><a href="#pricing" @click.prevent="scrollTo('pricing')">Pricing &amp; Packages</a></li>
              <li><a href="#steps" @click.prevent="scrollTo('steps')">Frequently Asked Questions</a></li>
              <li><a href="#launch-vault" @click.prevent="scrollTo('launch-vault')">Concierge Setup</a></li>
            </ul>
            <div class="atelier-status">
              <span class="status-dot"></span>
              <span>Atelier Status: Operating Seamlessly</span>
            </div>
          </div>
        </div>

        <!-- Bottom Copyright Row -->
        <div class="footer-bottom-row">
          <p>© 2026 QRchive Atelier Inc. All rights reserved.</p>
          <div class="footer-legal-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Heirloom Service</a>
            <a href="#">Security Standards</a>
          </div>
        </div>
      </div>
    </footer>

    <!-- ======================================================================= -->
    <!-- 4. MOBILE BOTTOM NATIVE TAB BAR (VISIBLE ON MOBILE ONLY)                -->
    <!-- ======================================================================= -->
    <nav class="mobile-bottom-bar">
      <div class="mobile-bottom-bar-inner">
        <a href="#top" class="mobile-tab-btn" :class="{ active: activeMobileTab === 'explore' }"
          @click.prevent="scrollTo('top', 'explore')">
          <span class="material-symbols-outlined text-[22px]">favorite</span>
          <span class="tab-label">Explore</span>
        </a>

        <a href="#steps" class="mobile-tab-btn" :class="{ active: activeMobileTab === 'demo' }"
          @click.prevent="scrollTo('steps', 'demo')">
          <span class="material-symbols-outlined text-[22px]">photo_library</span>
          <span class="tab-label">Demo</span>
        </a>

        <a href="#features" class="mobile-tab-btn" :class="{ active: activeMobileTab === 'cards' }"
          @click.prevent="scrollTo('features', 'cards')">
          <span class="material-symbols-outlined text-[22px]">qr_code_2</span>
          <span class="tab-label">Cards</span>
        </a>

        <a href="#pricing" class="mobile-tab-btn" :class="{ active: activeMobileTab === 'pricing' }"
          @click.prevent="scrollTo('pricing', 'pricing')">
          <span class="material-symbols-outlined text-[22px]">loyalty</span>
          <span class="tab-label">Pricing</span>
        </a>
      </div>
    </nav>
  </div>
</template>
