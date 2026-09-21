<route lang="yaml">
meta:
  layout: blank
</route>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLayout } from '../composables/useLayout'
import { hasAuthToken } from '../@core/utils/cookies'

const router = useRouter()
const { selectTheme, isDarkMode } = useLayout()

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
  <div class="landing-page font-sans">
    <!-- ======================================================================= -->
    <!-- 1. RESPONSIVE HEADER                                                    -->
    <!-- ======================================================================= -->
    <header class="header-nav">
      <div class="header-container">
        <!-- Logo & Brand -->
        <a href="#" class="brand-link" @click.prevent="scrollTo('top', 'explore')">
          <img
            src="https://lh3.googleusercontent.com/aida/AEtjO1WesVcF39F7C67McHbxlIR_guiV0RFjJYs_cpO4KMQ69abUJvGQWwuHJkCJFyxRy3sJwXeDUg2MLtdGxCDx_fMKK_zj7zdm3kodzkqeW4-bW_PDAhH3a0g_ukoYR_Vpts-QACTGgLOfrPEww-ZedhnWM9bemhIBy4EqRx3aFQxXurVVVf3cPllbaOhTo-39MbxvkBrt82kCArWPtRGJayXqeC0rtIpkvHs_TLbHEVaZ"
            alt="QRchive Logo" class="brand-logo" />
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
            <!-- Pill Category Badge -->
            <div class="pill-badge">
              <span class="heart-icon">♥</span>
              <span class="pill-text">SNAP &amp; SHARE • CELEBRATION MEMORY COLLECTOR</span>
              <span class="heart-icon">♥</span>
            </div>

            <!-- Main Title -->
            <h1 class="hero-title">
              Snap and Share Every <span class="hero-title-italic">Unforgettable</span> Milestone Moment.
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

              <button type="button" class="btn-secondary-tonal hero-cta-btn" @click="scrollTo('steps')">
                <span class="material-symbols-outlined text-accent text-[20px]">play_circle</span>
                <span>See Guest Demo</span>
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
              <h2 class="launch-title">Ready to launch your Event Snap &amp; Share?</h2>
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
              <img
                src="https://lh3.googleusercontent.com/aida/AEtjO1WesVcF39F7C67McHbxlIR_guiV0RFjJYs_cpO4KMQ69abUJvGQWwuHJkCJFyxRy3sJwXeDUg2MLtdGxCDx_fMKK_zj7zdm3kodzkqeW4-bW_PDAhH3a0g_ukoYR_Vpts-QACTGgLOfrPEww-ZedhnWM9bemhIBy4EqRx3aFQxXurVVVf3cPllbaOhTo-39MbxvkBrt82kCArWPtRGJayXqeC0rtIpkvHs_TLbHEVaZ"
                alt="QRchive Logo" class="brand-logo" />
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

<style scoped>
/* ==========================================================================
   LANDING PAGE SCOPED STYLES
   Tailored to warm champagne gold (#c5a059), bronze (#775a19), and ivory
   ========================================================================== */

.landing-page {
  --lp-primary: var(--primary, #d7b465);
  --lp-primary-hover: #5d4201;
  --lp-accent: var(--accent, #c5a059);
  --lp-accent-light: rgba(197, 160, 89, 0.15);
  --lp-bg: var(--bg-body, #fff8f5);
  --lp-surface: var(--bg-surface, #ffffff);
  --lp-surface-low: var(--bg-surface-tonal, #fcf2ec);
  --lp-text-primary: var(--text-primary, #1f1b18);
  --lp-text-muted: var(--text-secondary, #4e4639);
  --lp-border: var(--border-color, #d1c5b4);
  --lp-border-subtle: rgba(197, 160, 89, 0.25);
  --lp-card-dark: #201b18;

  min-height: 100vh;
  background-color: var(--lp-bg);
  color: var(--lp-text-primary);
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow-x: hidden;
  position: relative;
  padding-bottom: 70px;
  /* Space for mobile bottom bar */
}

@media (min-width: 1024px) {
  .landing-page {
    padding-bottom: 0;
  }
}

/* ==========================================================================
   SHARED UTILITIES & CONTAINERS
   ========================================================================== */
.section-container {
  width: 100%;
  max-width: 1240px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1.25rem;
  padding-right: 1.25rem;
}

@media (min-width: 768px) {
  .section-container {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}

.text-center {
  text-align: center;
}

.text-accent {
  color: var(--lp-accent);
}

.flex-align-center {
  display: flex;
  align-items: center;
}

.gap-2 {
  gap: 0.5rem;
}

.w-full {
  width: 100%;
}

.mb-0 {
  margin-bottom: 0 !important;
}

.mb-3 {
  margin-bottom: 0.75rem;
}

/* Section Header Typography */
.section-header {
  max-width: 680px;
  margin: 0 auto 3rem auto;
}

.section-category {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--lp-primary);
  margin-bottom: 0.5rem;
}

.section-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.25;
  color: var(--lp-text-primary);
  margin-bottom: 0.75rem;
}

@media (min-width: 768px) {
  .section-title {
    font-size: 2.5rem;
  }
}

.section-description {
  font-size: 1rem;
  line-height: 1.6;
  color: var(--lp-text-muted);
}

/* ==========================================================================
   BUTTONS
   ========================================================================== */
.btn-primary-gradient {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.75rem;
  border-radius: 9999px;
  background: linear-gradient(135deg, #a8823b 0%, #c5a059 50%, #d6b245 100%);
  color: #ffffff;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid rgba(232, 200, 123, 0.4);
  box-shadow: 0 4px 18px rgba(197, 160, 89, 0.32);
  transition: all 0.25s ease;
  cursor: pointer;
  text-decoration: none;
}

.btn-primary-gradient:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(197, 160, 89, 0.45);
  filter: brightness(1.05);
}

.btn-primary-gradient:active {
  transform: scale(0.98);
}

.btn-secondary-tonal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.75rem;
  border-radius: 9999px;
  background: var(--lp-surface-low);
  color: var(--lp-text-primary);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid var(--lp-border-subtle);
  transition: all 0.25s ease;
  cursor: pointer;
  text-decoration: none;
}

.btn-secondary-tonal:hover {
  background: var(--lp-surface);
  border-color: var(--lp-accent);
  transform: translateY(-2px);
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--lp-surface-low);
  border: 1px solid var(--lp-border-subtle);
  color: var(--lp-text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.icon-btn:hover {
  background: var(--lp-surface);
  color: var(--lp-primary);
  border-color: var(--lp-primary);
}

/* ==========================================================================
   1. HEADER NAVIGATION
   ========================================================================== */
.header-nav {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 100;
  background: rgba(255, 248, 245, 0.88);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--lp-border-subtle);
  box-shadow: 0 2px 14px rgba(119, 90, 25, 0.04);
}

:global([data-theme="dark"]) .header-nav {
  background: rgba(22, 19, 17, 0.88);
}

.header-container {
  max-width: 1240px;
  height: 72px;
  margin: 0 auto;
  padding: 0 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
}

.brand-logo {
  height: 44px;
  width: auto;
  object-fit: contain;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.35rem;
  font-weight: 600;
  line-height: 1.1;
  color: var(--lp-text-primary);
  letter-spacing: -0.02em;
}

.brand-subtitle {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--lp-primary);
}

/* Desktop Links */
.desktop-nav {
  display: none;
  align-items: center;
  gap: 2rem;
}

@media (min-width: 1024px) {
  .desktop-nav {
    display: flex;
  }
}

.nav-link {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--lp-text-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: var(--lp-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.hidden-sm {
  display: none;
}

@media (min-width: 768px) {
  .hidden-sm {
    display: inline-flex;
  }
}

.mobile-hamburger {
  display: inline-flex;
}

@media (min-width: 1024px) {
  .mobile-hamburger {
    display: none;
  }
}

/* Mobile Dropdown Drawer */
.mobile-drawer {
  background: var(--lp-surface);
  border-bottom: 1px solid var(--lp-border-subtle);
  padding: 1.25rem 1.5rem 1.75rem 1.5rem;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mobile-nav-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mobile-nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  color: var(--lp-text-primary);
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
  background: var(--lp-surface-low);
  transition: all 0.2s ease;
}

.mobile-nav-link:hover {
  background: var(--lp-accent-light);
  color: var(--lp-primary);
}

/* ==========================================================================
   2. HERO SECTION
   ========================================================================== */
.hero-section {
  position: relative;
  padding-top: calc(72px + 2.5rem);
  padding-bottom: 3.5rem;
  overflow: hidden;
}

@media (min-width: 1024px) {
  .hero-section {
    padding-top: calc(72px + 4rem);
    padding-bottom: 5rem;
  }
}

.glow-blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  filter: blur(80px);
  opacity: 0.45;
}

.blob-top-left {
  top: 10%;
  left: 15%;
  width: 380px;
  height: 380px;
  background: radial-gradient(circle, #e9c176 0%, transparent 70%);
}

.blob-bottom-right {
  bottom: 5%;
  right: 5%;
  width: 440px;
  height: 440px;
  background: radial-gradient(circle, #c5a059 0%, transparent 70%);
}

.hero-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr;
  gap: 2.5rem;
  align-items: center;
}

@media (min-width: 1024px) {
  .hero-grid {
    grid-template-columns: 1.05fr 0.95fr;
    gap: 3.5rem;
  }
}

.hero-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 1rem;
  border-radius: 9999px;
  background: var(--lp-surface-low);
  border: 1px solid var(--lp-border-subtle);
  box-shadow: 0 2px 8px rgba(119, 90, 25, 0.05);
  margin-bottom: 1.25rem;
}

.heart-icon {
  color: var(--lp-primary);
  font-size: 0.8125rem;
}

.pill-text {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--lp-primary);
}

.hero-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 2.25rem;
  line-height: 1.18;
  letter-spacing: -0.02em;
  color: var(--lp-text-primary);
  margin-bottom: 1.25rem;
}

@media (min-width: 768px) {
  .hero-title {
    font-size: 3.25rem;
  }
}

.hero-title-italic {
  font-style: italic;
  color: var(--lp-primary);
}

.hero-subtitle {
  font-size: 1.0625rem;
  line-height: 1.68;
  color: var(--lp-text-muted);
  max-width: 540px;
  margin-bottom: 2rem;
}

.hero-cta-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  width: 100%;
  margin-bottom: 2rem;
}

.hero-cta-btn {
  width: 100%;
}

@media (min-width: 640px) {
  .hero-cta-btn {
    width: auto;
  }
}

.hero-trust-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--lp-border-subtle);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--lp-text-muted);
}

.trust-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.trust-icon {
  color: var(--lp-primary);
  font-size: 1.125rem;
}

.trust-dot {
  color: var(--lp-border);
}

/* Visual Showcase Card */
.hero-visual {
  position: relative;
  width: 100%;
}

.showcase-card-wrapper {
  position: relative;
  border-radius: 24px;
  padding: 0.5rem;
  background: linear-gradient(135deg, rgba(197, 160, 89, 0.35) 0%, var(--lp-surface-low) 50%, rgba(119, 90, 25, 0.15) 100%);
  box-shadow: 0 24px 64px -12px rgba(119, 90, 25, 0.2);
}

.showcase-card {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  aspect-ratio: 4 / 3;
  background: #24201d;
}

.showcase-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.showcase-card:hover .showcase-img {
  transform: scale(1.04);
}

.showcase-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(31, 27, 24, 0.85) 0%, rgba(0, 0, 0, 0.15) 40%, transparent 100%);
  pointer-events: none;
}

.floating-badge {
  position: absolute;
  top: 1rem;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(255, 248, 245, 0.92);
  color: #1f1b18;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  border: 1px solid rgba(197, 160, 89, 0.35);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

:global([data-theme="dark"]) .floating-badge {
  background: rgba(32, 27, 24, 0.92);
  color: #fdfbf7;
}

.badge-top-left {
  left: 1rem;
}

.badge-top-right {
  right: 1rem;
}

.showcase-bottom-caption {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.live-status-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #34d399;
  box-shadow: 0 0 10px #34d399;
  animation: pulse-dot 1.8s infinite;
}

@keyframes pulse-dot {

  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.4);
    opacity: 0.6;
  }
}

.caption-quote {
  font-family: 'Playfair Display', Georgia, serif;
  font-style: italic;
  font-size: 1.0625rem;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.live-counter-badge {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #ffdea5;
  background: rgba(31, 27, 24, 0.6);
  backdrop-filter: blur(6px);
  padding: 0.3rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 222, 165, 0.25);
}

/* ==========================================================================
   3. HOW IT WORKS (3 STEPS)
   ========================================================================== */
.steps-section {
  padding: 4.5rem 0;
  background: var(--lp-surface-low);
  border-top: 1px solid var(--lp-border-subtle);
  border-bottom: 1px solid var(--lp-border-subtle);
}

.steps-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .steps-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.step-card {
  background: var(--lp-surface);
  border-radius: 20px;
  padding: 1.75rem;
  border: 1px solid var(--lp-border-subtle);
  box-shadow: 0 4px 16px rgba(119, 90, 25, 0.04);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.step-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(119, 90, 25, 0.09);
  border-color: var(--lp-accent);
}

.step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.step-number {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 2.5rem;
  line-height: 1;
  color: rgba(197, 160, 89, 0.4);
}

.step-pill {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--lp-primary);
  background: var(--lp-surface-low);
  border: 1px solid var(--lp-border-subtle);
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
}

.heart-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.step-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--lp-accent-light);
  color: var(--lp-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.25rem;
  transition: all 0.25s ease;
}

.step-card:hover .step-icon-wrap {
  background: var(--lp-primary);
  color: #ffffff;
}

.step-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.35rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--lp-text-primary);
  margin-bottom: 0.75rem;
}

.step-text {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--lp-text-muted);
}

/* ==========================================================================
   4. FEATURES BENTO GRID
   ========================================================================== */
.features-section {
  padding: 4.5rem 0;
  background: var(--lp-bg);
}

.features-bento-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .features-bento-grid {
    grid-template-columns: repeat(12, 1fr);
  }

  .col-4 {
    grid-column: span 6;
  }

  .col-6 {
    grid-column: span 6;
  }

  .col-8 {
    grid-column: span 12;
  }
}

@media (min-width: 1024px) {
  .col-4 {
    grid-column: span 4;
  }

  .col-6 {
    grid-column: span 6;
  }

  .col-8 {
    grid-column: span 8;
  }
}

.feature-card {
  background: var(--lp-surface-low);
  border-radius: 20px;
  padding: 1.75rem;
  border: 1px solid var(--lp-border-subtle);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.25s ease;
}

.feature-card:hover {
  border-color: var(--lp-accent);
}

.feature-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.feature-icon-badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--lp-surface);
  border: 1px solid var(--lp-border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--lp-primary);
}

.feature-tag {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--lp-text-muted);
  background: var(--lp-surface);
  border: 1px solid var(--lp-border-subtle);
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
}

.gold-tag {
  background: var(--lp-accent);
  color: #1f1b18;
  font-weight: 700;
  border: none;
}

.feature-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--lp-text-primary);
  margin-bottom: 0.65rem;
}

.feature-text {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--lp-text-muted);
}

.feature-sublabel {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  color: var(--lp-primary);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Featured Scavenger Hunt Card */
.featured-highlight-card {
  background: linear-gradient(135deg, var(--lp-surface-low) 0%, var(--lp-surface) 100%);
  border: 1.5px solid var(--lp-accent);
  box-shadow: 0 10px 30px rgba(197, 160, 89, 0.12);
}

.checklist-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.65rem;
  margin-top: 1.25rem;
}

@media (min-width: 640px) {
  .checklist-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  background: var(--lp-surface);
  border: 1px solid var(--lp-border-subtle);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.checklist-item:hover {
  border-color: var(--lp-accent);
  background: var(--lp-surface-low);
}

.checklist-item.is-checked {
  border-color: var(--lp-accent);
  background: var(--lp-accent-light);
}

.checklist-icon {
  font-size: 1.125rem;
  color: var(--lp-primary);
}

.checklist-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--lp-text-primary);
  flex: 1;
}

.checklist-heart {
  color: var(--lp-border);
  font-size: 0.875rem;
  transition: color 0.2s ease;
}

.heart-active {
  color: var(--lp-primary);
}

/* Timeline Feature Items */
.timeline-items {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: 0.75rem;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
}

.timeline-icon {
  color: var(--lp-primary);
  font-size: 1.125rem;
  margin-top: 0.15rem;
}

.timeline-title {
  display: block;
  font-size: 0.875rem;
  color: var(--lp-text-primary);
  margin-bottom: 0.15rem;
}

.timeline-desc {
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--lp-text-muted);
}

/* ==========================================================================
   5. PRICING SECTION
   ========================================================================== */
.pricing-section {
  padding: 4.5rem 0;
  background: var(--lp-surface-low);
  border-top: 1px solid var(--lp-border-subtle);
}

.pricing-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  align-items: stretch;
}

@media (min-width: 1024px) {
  .pricing-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.pricing-card {
  position: relative;
  background: var(--lp-surface);
  border-radius: 24px;
  padding: 2rem;
  border: 1px solid var(--lp-border-subtle);
  box-shadow: 0 4px 20px rgba(119, 90, 25, 0.05);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.featured-pricing-card {
  border: 2px solid var(--lp-accent);
  box-shadow: 0 16px 48px -8px rgba(197, 160, 89, 0.24);
}

.cherished-badge {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--lp-primary);
  color: #ffffff;
  padding: 0.35rem 1rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  box-shadow: 0 4px 12px rgba(119, 90, 25, 0.25);
  white-space: nowrap;
}

.pricing-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.pricing-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--lp-text-primary);
}

.pricing-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--lp-text-muted);
  background: var(--lp-surface-low);
  padding: 0.25rem 0.65rem;
  border-radius: 9999px;
}

.gold-badge {
  background: var(--lp-accent-light);
  color: var(--lp-primary);
  font-weight: 700;
}

.pricing-desc {
  font-size: 0.9375rem;
  line-height: 1.55;
  color: var(--lp-text-muted);
  margin-bottom: 1.5rem;
}

/* 3-Column Capacity Selector */
.capacity-selector-block {
  margin-bottom: 1.75rem;
}

.capacity-label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--lp-text-muted);
  margin-bottom: 0.5rem;
}

.capacity-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.cap-btn {
  padding: 0.65rem 0.5rem;
  border-radius: 12px;
  border: 1px solid var(--lp-border-subtle);
  background: var(--lp-surface-low);
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cap-btn:hover {
  border-color: var(--lp-accent);
}

.cap-btn.active {
  border-color: var(--lp-primary);
  background: var(--lp-accent-light);
}

.cap-name {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--lp-text-primary);
}

.cap-price {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--lp-primary);
  margin-top: 0.25rem;
}

/* Perks List */
.perks-list {
  list-style: none;
  padding: 0;
  margin: 0 0 2rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.perk-item {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  font-size: 0.875rem;
  color: var(--lp-text-primary);
  line-height: 1.45;
}

.perk-icon {
  font-size: 1.125rem;
  color: var(--lp-primary);
  margin-top: 0.1rem;
}

/* Extension Banner */
.extension-banner {
  max-width: 720px;
  margin: 2.5rem auto 0 auto;
  border-radius: 14px;
  padding: 1rem 1.5rem;
  background: var(--lp-surface);
  border: 1px solid var(--lp-border-subtle);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  text-align: center;
}

@media (min-width: 640px) {
  .extension-banner {
    flex-direction: row;
  }
}

.extension-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--lp-primary);
}

.extension-dot {
  display: none;
  color: var(--lp-border);
}

@media (min-width: 640px) {
  .extension-dot {
    display: inline;
  }
}

.extension-text {
  font-size: 0.875rem;
  color: var(--lp-text-muted);
}

/* ==========================================================================
   6. FINAL LAUNCH & RESERVATION SECTION
   ========================================================================== */
.launch-section {
  padding: 5rem 0;
  background: var(--lp-bg);
}

.launch-card {
  position: relative;
  border-radius: 28px;
  background: #1f1b18;
  color: #fdfbf7;
  padding: 2.5rem 1.5rem;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(197, 160, 89, 0.35);
}

@media (min-width: 768px) {
  .launch-card {
    padding: 3.5rem 3rem;
  }
}

.launch-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(80px);
  opacity: 0.3;
}

.launch-glow.top-right {
  top: -80px;
  right: -80px;
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, #c5a059 0%, transparent 70%);
}

.launch-glow.bottom-left {
  bottom: -80px;
  left: -80px;
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, #775a19 0%, transparent 70%);
}

.launch-card-header {
  position: relative;
  z-index: 1;
  max-width: 600px;
  margin: 0 auto 2rem auto;
}

.crest-icon-badge {
  width: 44px;
  height: 44px;
  margin: 0 auto 1rem auto;
  border-radius: 50%;
  border: 1px solid rgba(197, 160, 89, 0.4);
  background: rgba(31, 27, 24, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffdea5;
  font-size: 1.125rem;
}

.launch-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.85rem;
  line-height: 1.25;
  color: #ffffff;
  margin-bottom: 0.5rem;
}

@media (min-width: 768px) {
  .launch-title {
    font-size: 2.25rem;
  }
}

.launch-subtitle {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: rgba(253, 251, 247, 0.75);
}

.launch-form {
  position: relative;
  z-index: 1;
  max-width: 780px;
  margin: 0 auto;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 768px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #ffdea5;
  margin-bottom: 0.4rem;
}

.form-input {
  width: 100%;
  height: 48px;
  padding: 0 1rem;
  border-radius: 12px;
  background: #ffffff;
  color: #1f1b18;
  font-size: 0.9375rem;
  border: 1px solid rgba(197, 160, 89, 0.4);
  outline: none;
  transition: all 0.2s ease;
}

.form-input:focus {
  border-color: #c5a059;
  box-shadow: 0 0 0 3px rgba(197, 160, 89, 0.25);
}

.form-select {
  appearance: auto;
  cursor: pointer;
}

.submit-btn {
  min-width: 280px;
  padding: 0.85rem 2rem;
  font-size: 0.875rem;
}

.submit-success-msg {
  margin-top: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6ee7b7;
  letter-spacing: 0.02em;
}

.launch-trust-footer {
  position: relative;
  z-index: 1;
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(253, 251, 247, 0.65);
}

/* ==========================================================================
   7. FOOTER
   ========================================================================== */
.landing-footer {
  background: var(--lp-surface-low);
  border-top: 1px solid var(--lp-border-subtle);
  padding: 4rem 0 2rem 0;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2.5rem;
  padding-bottom: 2.5rem;
  border-bottom: 1px solid var(--lp-border-subtle);
}

@media (min-width: 768px) {
  .footer-grid {
    grid-template-columns: 1.8fr 1fr 1fr 1.2fr;
    gap: 2rem;
  }
}

.col-brand {
  display: flex;
  flex-direction: column;
}

.footer-desc {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--lp-text-muted);
  margin-bottom: 1rem;
  max-width: 320px;
}

.footer-quote {
  font-family: 'Playfair Display', Georgia, serif;
  font-style: italic;
  font-size: 0.9375rem;
  color: var(--lp-primary);
  line-height: 1.5;
}

.footer-col-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--lp-primary);
  margin-bottom: 1rem;
}

.footer-nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.footer-nav-list a {
  font-size: 0.875rem;
  color: var(--lp-text-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-nav-list a:hover {
  color: var(--lp-primary);
}

.atelier-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--lp-text-muted);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--lp-primary);
}

.footer-bottom-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1.5rem;
  font-size: 0.8125rem;
  color: var(--lp-text-muted);
}

@media (min-width: 768px) {
  .footer-bottom-row {
    flex-direction: row;
  }
}

.footer-legal-links {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.footer-legal-links a {
  color: var(--lp-text-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-legal-links a:hover {
  color: var(--lp-primary);
}

/* ==========================================================================
   8. MOBILE NATIVE-FEEL BOTTOM TAB BAR
   ========================================================================== */
.mobile-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 100;
  background: rgba(255, 248, 245, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid var(--lp-border-subtle);
  box-shadow: 0 -4px 20px rgba(119, 90, 25, 0.08);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

:global([data-theme="dark"]) .mobile-bottom-bar {
  background: rgba(22, 19, 17, 0.92);
}

@media (min-width: 1024px) {
  .mobile-bottom-bar {
    display: none;
  }
}

.mobile-bottom-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 60px;
  padding: 0 0.5rem;
}

.mobile-tab-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  min-width: 56px;
  color: var(--lp-text-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}

.mobile-tab-btn:hover,
.mobile-tab-btn.active {
  color: var(--lp-primary);
}

.tab-label {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}
</style>
