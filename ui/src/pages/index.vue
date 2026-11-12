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
          </div>
        </a>

        <!-- Desktop Navigation Links (Hidden on mobile) -->
        <nav class="desktop-nav">
          <a href="#steps" class="nav-link" @click.prevent="scrollTo('steps')">How It Works</a>
          <a href="#pricing" class="nav-link" @click.prevent="scrollTo('pricing')">Pricing</a>
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
          <a href="#pricing" class="mobile-nav-link" @click="scrollTo('pricing', 'pricing')">
            <span class="material-symbols-outlined">payments</span>
            <span>Pricing Packages</span>
          </a>
        </nav>
        <div class="mobile-drawer-footer">
          <button type="button" class="btn-primary-gradient w-full" @click="scrollTo('launch-vault')">
            <span>Get Started</span>
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

      <!-- 2.4 PRICING COMPARISON -->
      <PricingSection />
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
          </div>
        </div>

        <!-- Bottom Copyright Row -->
        <div class="footer-bottom-row">
          <p>© 2026 ABABA ONLINE STORE. All rights reserved.</p>
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