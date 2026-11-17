<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useLayout } from '../composables/useLayout'
import { hasAuthToken } from '../@core/utils/cookies'
import AppLogo from '../@core/components/AppLogo.vue'
import PricingSection from "@/views/landing/pricing.vue"
import HeroSection from "@/views/landing/hero.vue"
import HowItWorks from "@/views/landing/how-it-works.vue"

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

// ---------------------------------------------------------------------------
// Intersection Observer: Section Transitions & Active Navigation Tracking
// ---------------------------------------------------------------------------
const visibleSections = ref(new Set(['hero']))
const activeSection = ref('hero')

const isSectionVisible = (sectionId) => visibleSections.value.has(sectionId)

const revealSection = (sectionId) => {
  if (sectionId) {
    visibleSections.value.add(sectionId)
  }
}

// Template element references
const heroSectionRef = ref(null)
const stepsSectionRef = ref(null)
const pricingSectionRef = ref(null)
const footerSectionRef = ref(null)

let revealObserver = null
let activeObserver = null

// Smooth scroll helper
const scrollTo = (elementId, tabName = '') => {
  if (tabName) activeMobileTab.value = tabName
  isMobileMenuOpen.value = false

  let targetId = elementId
  if (targetId === 'launch-vault' || targetId === 'launchVault') {
    targetId = 'pricing'
  }

  // Pre-reveal target section so the transition starts smoothly during scroll
  if (targetId === 'top' || targetId === 'hero') {
    revealSection('hero')
    activeSection.value = 'hero'
  } else if (targetId === 'steps') {
    revealSection('steps')
    activeSection.value = 'steps'
  } else if (targetId === 'pricing') {
    revealSection('pricing')
    activeSection.value = 'pricing'
  }

  const el = document.getElementById(targetId)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Handle window scroll near top to snap active section to hero
const handleScroll = () => {
  if (typeof window !== 'undefined' && window.scrollY < 80) {
    activeSection.value = 'hero'
  }
}

onMounted(() => {
  // Graceful fallback for environments lacking IntersectionObserver
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    visibleSections.value = new Set(['hero', 'steps', 'pricing', 'footer'])
    return
  }

  // Ensure hero section transitions in smoothly on initial mount
  requestAnimationFrame(() => {
    revealSection('hero')
  })

  // Check URL hash if user landed directly on a specific section anchor
  if (window.location.hash) {
    const hash = window.location.hash.replace('#', '')
    if (hash === 'steps' || hash === 'pricing') {
      revealSection(hash)
      activeSection.value = hash
    }
  }

  // 1. Reveal Observer: triggers entrance transition when section nears viewport
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.dataset.section
          if (sectionId) {
            revealSection(sectionId)
            revealObserver.unobserve(entry.target)
          }
        }
      })
    },
    {
      root: null,
      threshold: 0.12,
      rootMargin: '0px 0px -50px 0px',
    }
  )

  // 2. Active Section Observer: tracks which section is in focus as user scrolls
  activeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.dataset.section
          if (sectionId && sectionId !== 'footer') {
            activeSection.value = sectionId
          }
        }
      })
    },
    {
      root: null,
      threshold: 0.35,
      rootMargin: '-72px 0px -25% 0px',
    }
  )

  // Register section elements to observe
  const sectionEntries = [
    { id: 'hero', el: heroSectionRef.value },
    { id: 'steps', el: stepsSectionRef.value },
    { id: 'pricing', el: pricingSectionRef.value },
    { id: 'footer', el: footerSectionRef.value },
  ]

  sectionEntries.forEach(({ id, el }) => {
    if (el) {
      el.dataset.section = id
      revealObserver.observe(el)
      if (id !== 'footer') {
        activeObserver.observe(el)
      }
    }
  })

  window.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
  if (revealObserver) {
    revealObserver.disconnect()
    revealObserver = null
  }
  if (activeObserver) {
    activeObserver.disconnect()
    activeObserver = null
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', handleScroll)
  }
})

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

        <!-- Desktop Navigation Links (Hidden on mobile) with dynamic active section highlights -->
        <nav class="desktop-nav">
          <a href="#steps" class="nav-link" :class="{ 'nav-link--active': activeSection === 'steps' }"
            @click.prevent="scrollTo('steps')">
            How It Works
          </a>
          <a href="#pricing" class="nav-link" :class="{ 'nav-link--active': activeSection === 'pricing' }"
            @click.prevent="scrollTo('pricing')">
            Pricing
          </a>
        </nav>

        <!-- Right Actions: Theme Switcher, Create QR, User Profile, Mobile Hamburger -->
        <div class="header-actions">
          <!-- User Profile / Auth Icon -->
          <a href="javascript:void(0);" class="login-link" @click="handleUserClick">
            Log in
          </a>

          <!-- Desktop CTA Button -->
          <button type="button" class="btn-primary-gradient hidden-sm" @click="router.push('/register')">
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
          <a href="#steps" class="mobile-nav-link" :class="{ 'mobile-nav-link--active': activeSection === 'steps' }"
            @click="scrollTo('steps')">
            <span class="material-symbols-outlined">auto_stories</span>
            <span>How It Works</span>
          </a>
          <a href="#pricing" class="mobile-nav-link" :class="{ 'mobile-nav-link--active': activeSection === 'pricing' }"
            @click="scrollTo('pricing', 'pricing')">
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
      <div ref="heroSectionRef" class="landing-section-wrapper landing-section--hero"
        :class="{ 'is-visible': isSectionVisible('hero') }">
        <HeroSection @scrollTo="scrollTo($event)" />
      </div>

      <!-- 2.2 HOW IT WORKS (3 SIMPLE STEPS) -->
      <div ref="stepsSectionRef" class="landing-section-wrapper landing-section--steps"
        :class="{ 'is-visible': isSectionVisible('steps') }">
        <div class="section-divider-beam"></div>
        <HowItWorks />
      </div>

      <!-- 2.4 PRICING COMPARISON -->
      <div ref="pricingSectionRef" class="landing-section-wrapper landing-section--pricing"
        :class="{ 'is-visible': isSectionVisible('pricing') }">
        <div class="section-divider-beam"></div>
        <PricingSection />
      </div>
    </main>

    <!-- ======================================================================= -->
    <!-- 3. FOOTER                                                               -->
    <!-- ======================================================================= -->
    <div ref="footerSectionRef" class="landing-section-wrapper landing-section--footer"
      :class="{ 'is-visible': isSectionVisible('footer') }">
      <div class="section-divider-beam"></div>
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
    </div>
  </div>
</template>
<route lang="yaml">
meta:
  layout: blank
</route>
