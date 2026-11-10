<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLayout } from '../composables/useLayout'
import { hasAuthToken } from '../@core/utils/cookies'
import AppLogo from '../@core/components/AppLogo.vue'
import PricingSection from "@/views/landing/pricing.vue"
import HeroSection from "@/views/landing/hero.vue"

const router = useRouter()
const { currentTheme, selectTheme, isDarkMode } = useLayout()

const isAuthenticated = computed(() => {
  return typeof window !== 'undefined' && hasAuthToken()
})

// Mobile Menu Navigation State
const isMobileMenuOpen = ref(false)
const activeMobileTab = ref('explore')

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
            <span class="brand-title">QRchive Events</span>
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


          <!-- User Profile / Auth Icon -->
          <a href="javascript:void(0);" class="login-link" @click="handleUserClick">
            Log in
          </a>

          <!-- Desktop CTA Button -->
          <button type="button" class="btn-primary-gradient hidden-sm" @click="scrollTo('launch-vault')">
            <span>Get Started</span>
            <JIcon name="arrow-right" size="18" />
          </button>

          <!-- Mobile Hamburger Toggle Button -->
          <button type="button" class="icon-btn mobile-hamburger" aria-label="Navigation Menu"
            @click="isMobileMenuOpen = !isMobileMenuOpen">
            <span class="material-symbols-outlined">
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
      <HeroSection @scrollTo="scrollTo($event)" />

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
              <h3 class="feature-title">Full Archive &amp; Dedicated Download Link</h3>
              <p class="feature-text">
                Never worry about losing a single memory. Download a full chronologically organized ZIP archive through
                QRchive's built-in system — a dedicated secure download link is generated for every event.
              </p>
              <div class="feature-sublabel">
                <span class="material-symbols-outlined text-[16px]">verified_user</span>
                <span>System-Generated Dedicated Download Link</span>
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
      <PricingSection />

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

            <!-- Reassurance Trust Badges -->
            <div class="launch-trust-footer">
              <span>1-Mo Upload &amp; 2-Mo Storage</span>
              <span class="text-accent">•</span>
              <span>+₱200/mo Extension</span>
              <span class="text-accent">•</span>
              <span>Dedicated Download Link</span>
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
            <a href="/privacy-policy" @click.prevent="router.push('/privacy-policy')">Privacy Policy</a>
            <a href="/terms-of-service" @click.prevent="router.push('/terms-of-service')">Terms of Service</a>
            <a href="/security-standards" @click.prevent="router.push('/security-standards')">Security Standards</a>
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
<route lang="yaml">
meta:
  layout: blank
</route>