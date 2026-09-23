<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import JBtn from '@/@core/components/JBtn.vue'
import JModal from '@/@core/components/JModal.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()

// Event code from route params
const eventCode = computed(() => {
  return route.params.id || 'keann-jenny'
})

// Dynamic Event Name
const eventTitle = computed(() => {
  if (eventCode.value === 'keann-jenny') {
    return "Keann & Jenny's Wedding Celebration"
  }
  if (eventCode.value === 'mateo-isabella') {
    return "Mateo & Isabella's Intimate Nuptials"
  }
  if (eventCode.value === 'lucas-mia') {
    return "Lucas & Mia's Garden Gala"
  }
  if (eventCode.value === 'raphael-camille') {
    return "Raphael & Camille's Sunset Vows"
  }
  if (eventCode.value === 'gabriel-50th') {
    return "Gabriel's 50th Jubilee Banquet"
  }
  return String(eventCode.value)
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
})

// Primary tab: 'tab1' (Photos) | 'tab2' (QR Access) | 'tab3' (Placards)
const activeTab = ref('tab1')

// Album filter: 'all' | 'checklist' | 'candid'
const albumFilter = ref('all')

// Selected placard style: 'gold' | 'minimalist' | 'botanical' | 'romance'
const selectedPlacard = ref('gold')

// Album Preview Modal
const isAlbumModalOpen = ref(false)
const activeAlbum = ref(null)

const openAlbumModal = (album) => {
  activeAlbum.value = album
  isAlbumModalOpen.value = true
}

// Copy URL to clipboard
const copyVaultUrl = async () => {
  const url = `https://qrchive.com/v/${eventCode.value}`
  try {
    await navigator.clipboard.writeText(url)
    toast.show({
      message: 'Vault link copied to clipboard!',
      color: 'success',
      icon: 'content_copy',
    })
  } catch {
    toast.show({
      message: `Vault link: ${url}`,
      color: 'primary',
    })
  }
}

// Action notices
const handleAction = (message, color = 'info') => {
  toast.show({
    message,
    color,
  })
}

// Navigate back to owner dashboard
const goBackToDashboard = () => {
  router.push('/dashboard')
}

// Albums Data
const albums = ref([
  {
    id: 1,
    chapter: '01 • Reception',
    title: "Couple's Grand Entrance",
    photosCount: '8 Photos • 1 Video',
    author: 'Sophia M.',
    category: 'checklist',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCZMm6bFD2eExqEzNIHlYmDbij__APA1yNW3H9Bw5ZtYxUYJI1s0rOEebSdn2Zk62lSfk8BwmMqr_DZxJwm9sb4Lb4ZQKWduWr9X3j3jy6kQ981p5GLnO9eRG7UIp01hzc4l18ODCpwvL_wYPLPZRvgPXKpKe28AyZHRlG5L8hXCymCWp0WpUve456P2U7Urhvp-1qqAIT-ukne5tVYcWp8BNsqUanOk_dy33wan3dejp0ZRlTTm70R',
  },
  {
    id: 2,
    chapter: '02 • Reception',
    title: "Couple's First Dance",
    photosCount: '14 Photos',
    author: 'Marcus T.',
    category: 'checklist',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6VEOvPqHucDRds-ykrqcDM-lYkQG8Ez1PfnPpsHWZ64hqqdfdMEmHf9QIaUsBoIQpcco_ZkHxCZ5OF_zjPHhRNaZzZiR4qXlCOno7HcqVTxrA1ZWs8wBWLZKdL4l9Ewyyx2pCbABvX6goaEGA4VCzWkeOqoy5Skb9K68HsIis2rWdFyUOCdCRU3QvqsSh9mvZS2pwW08Wylxz0zy6Y7L9nHhtom3be48M2KLMbmhrKYNoePM4q25t',
  },
  {
    id: 3,
    chapter: '03 • Reception',
    title: 'Dance with Parents',
    photosCount: '6 Photos',
    author: 'Daniel K.',
    category: 'checklist',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzta3ueCwtLmHtrYWmpaLK8cAu70ZZJnQOiFkqOClJeh_0VTod8Lv6jEWQTMyuoN7G8919rIyp3VzW7AHIK__5zzFG-diW3DN5j6mtIYg-FiWzLTUjJRsmC1CJ17_T0-UJAhmG-Uy9Skf9F2yc78HPiVfHCxL6xkBRSpFnUn7ICTr8Sw0upiOqe40-fQ8PP7dnG2_o1RVyRU4kz-tnnMoAYnU3w6gcoNXdpgkgJ0d_qmJ9aHOg8RbO',
  },
  {
    id: 4,
    chapter: '04 • Reception',
    title: 'Guests Laughing & Cheering',
    photosCount: '12 Photos',
    author: 'Elena L.',
    category: 'checklist',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwo7G44oyLfgrxoWK8SpjqLPKbq19lZcOfUv4Ou_wh7OGUR0bnAnMo0p91T98Zx1NY0VII8_RSxLcuZ1mqANIrOnNr95rxTBEjEGBX7ORSSrIWvQ_cA36TyUEy8NUBcXsXPXASCv2ihxb_T2GYd5DSkp62DGnZHokDmAFyXDoGIyNRDaIA4N2CYNpkQFYIK_s3NjJPGdZ41ymsIOPERl4ZbSTXp6NMafp4I89gyv6A5CiOFUD_HQae',
  },
  {
    id: 5,
    chapter: '05 • Reception',
    title: "Couple's Cake Cutting",
    photosCount: '5 Photos',
    author: 'Adrian R.',
    category: 'checklist',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1_YjWEf9iTDMkIGxJK9Mgxb4HN1159ubQP5xS9OS76d3PWfYFZpq7RoKgoj9HP7n_D8_5x3EfLxi4re7jyUW-d67fA5dto5qJ0R7Y94vAgCSfHHo8e-BgclBXEbt6W0QzmzhdBRs2JrL9G8a33C_xVQRJ0XM5v176QmW1RKm3v6oXa4wsRxJWhUfzQQxJeV8H4XxeIxTUYlueenopggjlc_P6MvjEPx7pqxxWK-RwaFmp7RaqyCCP',
  },
  {
    id: 6,
    chapter: '06 • Reception',
    title: 'Welcome Remarks',
    photosCount: '3 Photos',
    author: 'Curator Host',
    category: 'checklist',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFjfo_y9CM_kBI1aLmVwdXD-iohi38UUesjP3cLgRdM0Aw-7CaAKfWdHk0kYh9TNkN64MaCB8lqop_9lZUDfTFDI-fSqyIE_hIwlko377Zlvu9H3TUl_cERvH6cW7Vfsb0c1ar8_mdPg-zrLUCySWQ100Cjs6sNmUgVWCDqQbJjDnaswSxW8bc5Fffiil_3H1sWUjIoDLX_g8vfWJwhuJKcZKcFkx-t65mBCQXUFytv1OvUzkYCPEo',
  },
  {
    id: 7,
    chapter: '07 • Reception',
    title: 'Maid of Honor & Best Man',
    photosCount: '5 Photos • 1 Video',
    author: 'Jessica C.',
    category: 'checklist',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDUFideTwFWS1oByKv2NIceI_QduxoSPWPTHWZitNWeqCBNDoY7rSduLE-a8cbRLl_OaSUwj0z0yKTkXOYQPVfREp3KRPP-ko6v6oqA0kajyduZq-qTqUJuQJQSFcx0Z0uYmwFX7zKo_5prCp98-RPtW_ZZBTHTSEjDAMBSye7fBuC8TXkVmctsZYOAz5iGv2QpPynVkDnFpqy-flRSLuBdAXq7YyIfNldhsV1Wbt9X0w9g2VpwwiIm',
  },
  {
    id: 8,
    chapter: '08 • Reception',
    title: 'Family Picture & Table Hopping',
    photosCount: '9 Photos',
    author: 'Claire W.',
    category: 'checklist',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBXgfqjHM-9QHEDfCTUr0NM-uSP9qREHYVsKEnQM_TC4-ezGghN5oBlju3nipr4SQPVqK1JKh7ICFZSnDmEIGA6NKeO6nIVoOae1mqtFT_aqqhq2Aw08_gn3k0ztbMEln8t4HjsciPScxs8kheS-n5P1Z9ymBQslH6vnNxigIgPWfJtbkFXdMzYqd4rbJnssDKT7EBeSa6zkDT-wI_P0SOY-0yMsGhDWdaR1ecVyUFG0NGQusvzdkTP',
  },
  {
    id: 9,
    chapter: '09 • Reception',
    title: 'Special Dance Performance',
    photosCount: '4 Photos • 2 Videos',
    author: 'Lucas P.',
    category: 'checklist',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDlLm0AJxj3xT_pjN7KAY8WFGBmlzCUAnM8CeroIAMJRxa6wYklmD09-3TPSLraIiEIz2wQQzZ2fHlVbTZV-bE4Zr-lzjxEF8hAbI5cu-aX7HfsPhzIPDaySpR5b77bLRCIUGkx5W2AUkfhX9d9lzAqoe8doqhBDcxrJjVAgA5eGqaJmlycAlK4GyVb6GlXhCQ7ydSSmI8vhqg7V-ldoqWSwIonxb0O_-5M1LNLOPjNJ_9LkOorY8fN',
  },
  {
    id: 10,
    chapter: '10 • Reception',
    title: "Couple's Thank You Speech",
    photosCount: '2 Photos • 1 Video',
    author: 'Jenny & Keann',
    category: 'checklist',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAYu5cFBqNwGXm1fwLxWqCzJ4_jJGSE06GlI2NgZDxuSDHtUIaEBF63dTai279Vci6osDaH6gPB0K-of8S38oIIV24Vv4psut6mVzu8KBxRGzlJ1CE6IJvg3b4aQiz9Eajeoi9A3VHu4UMx0PBYe38o9uYOMrQBWtCqAbu23sSw4oKVtghrOuWXjc14YTWnpILjEDY2FB2cbObid_Y5Vl7-wHSngnHx18wy_bn9CxGV1d_h-_MlxZa4',
  },
])

// Filtered albums list
const filteredAlbums = computed(() => {
  if (albumFilter.value === 'all') return albums.value
  return albums.value.filter((a) => a.category === albumFilter.value)
})
</script>

<template>
  <div class="event-detail">
    <!-- Top Archival Navigation & Utility Bar -->
    <nav class="event-detail__nav-bar">
      <div class="event-detail__nav-container">
        <div class="event-detail__nav-left">
          <button
            type="button"
            class="event-detail__back-btn"
            @click="goBackToDashboard"
          >
            <span class="material-symbols-outlined back-icon">arrow_back</span>
            <span>Back to Events</span>
          </button>
          <span class="event-detail__nav-divider">•</span>
          <div class="event-detail__status-pill">
            <span class="status-dot"></span>
            <span>Active • Live Vault Open</span>
          </div>
        </div>

        <div class="event-detail__nav-actions">
          <button
            type="button"
            class="event-detail__action-btn event-detail__action-btn--tonal"
            @click="handleAction('Opening Live Slideshow in full screen...')"
          >
            <span class="material-symbols-outlined" style="font-size: 1.1rem; color: var(--primary);">slideshow</span>
            <span>Live Slideshow</span>
          </button>
          <button
            type="button"
            class="event-detail__action-btn event-detail__action-btn--primary"
            @click="handleAction('Preparing all high-res photos ZIP download...', 'success')"
          >
            <span class="material-symbols-outlined" style="font-size: 1.1rem;">cloud_download</span>
            <span>Download All High-Res (ZIP)</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Event Header & Archival Hero Showcase -->
    <section class="event-detail__hero-section">
      <div class="event-detail__hero-card">
        <!-- Hero Cover Media -->
        <div class="event-detail__hero-media">
          <img
            class="event-detail__hero-img"
            alt="Opulent wedding reception couple dance"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3V3b53XiISyyoAl_u3W-G-INIpTniHYGyW5OT4V5pEh2IcNn5br0vuk1SwlXYwhvp3_hhQ8x1jOoBUhws7q-v6eh8z4qi_K3-Dej-j6NoHv3JbP_1ovJGScLp2yptN8rSl-dXBjpkfq4PfifYeQbWeVKhUpi58-15Q06-ZzcXSa04xNPO4zkis0YG9ZBavmZM8ni4FBDAUSTv6bCcyTJ7kAcmI5oSN9ebUzugVO8qVo7sSMVaGLya"
          />
          <div class="event-detail__hero-scrim-vertical"></div>
          <div class="event-detail__hero-scrim-horizontal"></div>

          <!-- Gold Foil Corner Accents -->
          <div class="event-detail__gold-corner event-detail__gold-corner--top-left"></div>
          <div class="event-detail__gold-corner event-detail__gold-corner--top-right"></div>

          <!-- Hero Content Overlay -->
          <div class="event-detail__hero-content">
            <span class="event-detail__hero-date">October 26, 2024</span>
            <h1 class="event-detail__hero-title">{{ eventTitle }}</h1>

            <!-- Archival Package Metadata Row -->
            <div class="event-detail__hero-metadata">
              <span class="event-detail__hero-pill event-detail__hero-pill--gold">
                <span class="material-symbols-outlined pill-icon">all_inclusive</span>
                <span>Unlimited Shots Package</span>
              </span>
              <span class="event-detail__hero-pill">
                <span class="material-symbols-outlined pill-icon" style="color: var(--primary);">timer</span>
                <span>Upload Window: 1 Month Remaining</span>
              </span>
              <span class="event-detail__hero-pill">
                <span class="material-symbols-outlined pill-icon" style="color: var(--primary);">inventory_2</span>
                <span>Archive Storage: 2 Months Remaining</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Floating Stat Bar -->
        <div class="event-detail__stat-bar">
          <div class="event-detail__stat-col">
            <span class="event-detail__stat-label">Media Uploaded</span>
            <div class="event-detail__stat-row">
              <span class="event-detail__stat-value">48</span>
              <span class="event-detail__stat-unit">Photos &amp; Clips</span>
            </div>
          </div>

          <div class="event-detail__stat-col">
            <span class="event-detail__stat-label">Active Contributors</span>
            <div class="event-detail__stat-row">
              <span class="event-detail__stat-value event-detail__stat-value--primary">18</span>
              <span class="event-detail__stat-unit">Beloved Guests</span>
            </div>
          </div>

          <div class="event-detail__stat-col">
            <span class="event-detail__stat-label">Event Access URL</span>
            <div class="event-detail__url-box">
              <span class="event-detail__url-text">qrchive.com/v/{{ eventCode }}</span>
              <button
                type="button"
                class="event-detail__url-copy-btn"
                title="Copy Vault URL"
                @click="copyVaultUrl"
              >
                <span class="material-symbols-outlined copy-icon">content_copy</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Interactive Primary Tab Navigation -->
    <section class="event-detail__tabs-section">
      <div class="event-detail__tabs-list" role="tablist">
        <button
          type="button"
          class="event-detail__tab-btn"
          :class="{ 'is-active': activeTab === 'tab1' }"
          @click="activeTab = 'tab1'"
        >
          <span class="material-symbols-outlined tab-icon">photo_library</span>
          <span>Guest Photos &amp; Albums</span>
          <span class="event-detail__tab-badge">48</span>
        </button>

        <button
          type="button"
          class="event-detail__tab-btn"
          :class="{ 'is-active': activeTab === 'tab2' }"
          @click="activeTab = 'tab2'"
        >
          <span class="material-symbols-outlined tab-icon">qr_code_2</span>
          <span>Guest QR Code &amp; Access</span>
        </button>

        <button
          type="button"
          class="event-detail__tab-btn"
          :class="{ 'is-active': activeTab === 'tab3' }"
          @click="activeTab = 'tab3'"
        >
          <span class="material-symbols-outlined tab-icon">style</span>
          <span>5×7" Table Placard Templates</span>
        </button>
      </div>
    </section>

    <!-- TAB 1: Guest Photos & Albums -->
    <div v-if="activeTab === 'tab1'" class="event-detail__tab-body">
      <div class="event-albums__header">
        <div class="event-albums__title-group">
          <span class="event-albums__subtitle">Curated Chapters</span>
          <h2 class="event-albums__title">Reception Program Moments</h2>
        </div>

        <div class="event-albums__filters">
          <button
            type="button"
            class="event-albums__filter-pill"
            :class="{ 'is-active': albumFilter === 'all' }"
            @click="albumFilter = 'all'"
          >
            All Albums (11)
          </button>
          <button
            type="button"
            class="event-albums__filter-pill"
            :class="{ 'is-active': albumFilter === 'checklist' }"
            @click="albumFilter = 'checklist'"
          >
            Reception Checklist (10)
          </button>
          <button
            type="button"
            class="event-albums__filter-pill"
            :class="{ 'is-active': albumFilter === 'candid' }"
            @click="albumFilter = 'candid'"
          >
            Random Shots &amp; Candids (1)
          </button>
        </div>
      </div>

      <!-- Albums Grid -->
      <div class="event-albums__grid">
        <!-- Checklist Albums -->
        <template v-if="albumFilter === 'all' || albumFilter === 'checklist'">
          <div
            v-for="album in filteredAlbums"
            :key="album.id"
            class="event-album-card"
          >
            <div>
              <div class="event-album-card__media">
                <img :src="album.img" :alt="album.title" class="event-album-card__img" />
                <span class="event-album-card__badge-top">{{ album.chapter }}</span>
                <span class="event-album-card__badge-bottom">{{ album.photosCount }}</span>
              </div>
              <div class="event-album-card__body">
                <h3 class="event-album-card__title">{{ album.title }}</h3>
                <p class="event-album-card__author">
                  <span class="material-symbols-outlined author-icon">person_pin</span>
                  <span>Latest by <strong>{{ album.author }}</strong></span>
                </p>
              </div>
            </div>

            <div class="event-album-card__footer">
              <button
                type="button"
                class="event-album-card__btn"
                @click="openAlbumModal(album)"
              >
                <span>View Album</span>
                <span class="material-symbols-outlined btn-arrow">arrow_forward</span>
              </button>
            </div>
          </div>
        </template>

        <!-- Dedicated Candids Card (Card 11) -->
        <div
          v-if="albumFilter === 'all' || albumFilter === 'candid'"
          class="event-album-card event-album-card--candid"
        >
          <div class="event-album-card__layout">
            <div class="event-album-card__media">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwVzmzMM6xU9rkTsqQiZe8VaAHh2ISv8yKhPGNDF7ojiILxaOmNjvgG_gn7Zeyl0PR11TV9kHiQImdM8r36vshi7OPKPn9faSEy3KIolexCGTe8W0EVb-um8xdwVqslHrJU9OetIDQYbPHKsrJwZGX9rVr3neO5pVkpnwquvwIdUyh2ugBXxWVolAWCUqw5TExtbqiuCpZRvFOqrglw56VpwZzC5K-IwmH-cvNwpYcx3_2FpH2D9JW"
                alt="Collage of spontaneous candid moments"
                class="event-album-card__img"
              />
              <span class="event-album-card__badge-top event-album-card__badge-top--gold">Dedicated Candid Vault</span>
              <span class="event-album-card__badge-bottom">15 Photos</span>
            </div>

            <div class="event-album-card__content-candid">
              <div>
                <div style="display: inline-flex; align-items: center; gap: 0.25rem; color: var(--primary); margin-bottom: 0.35rem;">
                  <span class="material-symbols-outlined" style="font-size: 1.1rem;">auto_awesome</span>
                  <span style="font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700;">Spontaneous &amp; Real</span>
                </div>
                <h3 class="event-albums__title" style="font-size: 1.35rem;">Random Shots &amp; Candids</h3>
                <p style="font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.6; margin-top: 0.5rem;">
                  Spontaneous guest selfies, table decor snaps, after-party dance floor joy, and intimate behind-the-scenes moments not tied to specific checklist events.
                </p>
                <p style="font-size: 0.8125rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.35rem; margin-top: 0.75rem;">
                  <span class="material-symbols-outlined" style="font-size: 1rem; color: var(--primary);">group</span>
                  <span>Contributed by <strong>9 Guests</strong></span>
                </p>
              </div>

              <div style="padding-top: 1.25rem;">
                <button
                  type="button"
                  class="event-album-card__btn event-album-card__btn--primary"
                  @click="handleAction('Exploring all candid photos...')"
                >
                  <span>Explore All Candids</span>
                  <span class="material-symbols-outlined btn-arrow">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: Guest QR Code & Access -->
    <div v-if="activeTab === 'tab2'" class="event-detail__tab-body">
      <div class="event-qr-grid">
        <!-- Scannable Placard Mockup Card -->
        <div class="event-qr-mockup-wrap">
          <div class="event-qr-placard">
            <div class="event-qr-placard__inner">
              <span class="event-qr-placard__subheading">Welcome to the celebration of</span>
              <h3 class="event-qr-placard__couple">Keann &amp; Jenny</h3>
              <p class="event-qr-placard__date">October 26, 2024</p>

              <!-- Central QR Code -->
              <div class="event-qr-placard__svg-wrap">
                <svg viewBox="0 0 100 100" fill="currentColor">
                  <!-- QR Finder Top Left -->
                  <rect x="10" y="10" width="24" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="4"></rect>
                  <rect x="17" y="17" width="10" height="10" fill="currentColor"></rect>
                  <!-- QR Finder Top Right -->
                  <rect x="66" y="10" width="24" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="4"></rect>
                  <rect x="73" y="17" width="10" height="10" fill="currentColor"></rect>
                  <!-- QR Finder Bottom Left -->
                  <rect x="10" y="66" width="24" height="24" rx="2" fill="none" stroke="currentColor" stroke-width="4"></rect>
                  <rect x="17" y="73" width="10" height="10" fill="currentColor"></rect>
                  <!-- Data Dots & Patterns -->
                  <rect x="42" y="12" width="6" height="6" fill="currentColor"></rect>
                  <rect x="52" y="12" width="6" height="6" fill="currentColor"></rect>
                  <rect x="42" y="24" width="6" height="6" fill="currentColor"></rect>
                  <rect x="48" y="30" width="6" height="6" fill="currentColor"></rect>
                  <rect x="12" y="42" width="6" height="6" fill="currentColor"></rect>
                  <rect x="22" y="48" width="6" height="6" fill="currentColor"></rect>
                  <rect x="30" y="42" width="6" height="6" fill="currentColor"></rect>
                  <rect x="42" y="42" width="16" height="16" rx="2" fill="#775a19"></rect>
                  <!-- Monogram Inside QR Center -->
                  <text x="50" y="54" fill="#ffffff" font-family="'Playfair Display', serif" font-size="10" font-style="italic" text-anchor="middle">K&amp;J</text>
                  <rect x="64" y="42" width="6" height="6" fill="currentColor"></rect>
                  <rect x="74" y="48" width="6" height="6" fill="currentColor"></rect>
                  <rect x="82" y="42" width="6" height="6" fill="currentColor"></rect>
                  <rect x="42" y="66" width="6" height="6" fill="currentColor"></rect>
                  <rect x="52" y="74" width="6" height="6" fill="currentColor"></rect>
                  <rect x="66" y="66" width="6" height="6" fill="currentColor"></rect>
                  <rect x="76" y="72" width="6" height="6" fill="currentColor"></rect>
                  <rect x="66" y="82" width="6" height="6" fill="currentColor"></rect>
                  <rect x="82" y="82" width="6" height="6" fill="currentColor"></rect>
                  <rect x="50" y="84" width="6" height="6" fill="currentColor"></rect>
                </svg>
              </div>

              <p class="event-qr-placard__instruction">
                Scan with your camera to upload reception photos instantly — no app required.
              </p>
              <span class="event-qr-placard__link">qrchive.com/v/{{ eventCode }}</span>
            </div>
          </div>
        </div>

        <!-- Download & Access Info -->
        <div class="event-qr-info">
          <div class="event-qr-info__header">
            <span class="event-qr-info__badge">Effortless Guest Participation</span>
            <h2 class="event-qr-info__title">Live Guest Access QR Pass</h2>
            <p class="event-qr-info__desc">
              Every guest can easily scan this QR code from their mobile cameras.
              Zero app download or account creation required for instant uploads.
            </p>
          </div>

          <!-- Action Button -->
          <div>
            <button
              type="button"
              class="event-detail__action-btn event-detail__action-btn--primary"
              style="padding: 0.75rem 1.5rem;"
              @click="handleAction('High-res SVG QR code downloaded', 'success')"
            >
              <span class="material-symbols-outlined" style="font-size: 1.15rem;">download</span>
              <span>Download QR Code</span>
            </button>
          </div>

          <!-- Direct URL Copy Box -->
          <div class="event-qr-direct-box">
            <div class="event-qr-direct-link">
              <span class="material-symbols-outlined link-icon">link</span>
              <span>https://qrchive.com/v/{{ eventCode }}</span>
            </div>
            <button
              type="button"
              class="event-detail__action-btn event-detail__action-btn--tonal"
              @click="copyVaultUrl"
            >
              Copy Direct URL
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: 5x7" Table Placard Templates -->
    <div v-if="activeTab === 'tab3'" class="event-detail__tab-body">
      <div class="event-placards__header">
        <div class="event-placards__title-group">
          <span class="event-albums__subtitle">Atelier Print Studio</span>
          <h2 class="event-placards__title">5×7" Table Placard Templates</h2>
          <p class="event-placards__desc">
            Choose from our pre-formatted, print-ready 5×7 inch table placard designs. Pre-calculated with professional 1/8" bleed margins for effortless home printing or luxury stationary ateliers.
          </p>
        </div>

        <button
          type="button"
          class="event-detail__action-btn event-detail__action-btn--primary"
          style="padding: 0.75rem 1.5rem; flex-shrink: 0;"
          @click="handleAction(`Generating print-ready PDF for ${selectedPlacard} style...`, 'success')"
        >
          <span class="material-symbols-outlined" style="font-size: 1.15rem;">picture_as_pdf</span>
          <span>Download Selected 5×7" PDF</span>
        </button>
      </div>

      <!-- 4 Placard Designs Grid -->
      <div class="event-placards__grid">
        <!-- Style 1: Classic Gold Foil -->
        <div
          class="event-placard-card"
          :class="{ 'is-selected': selectedPlacard === 'gold' }"
          @click="selectedPlacard = 'gold'"
        >
          <div class="event-placard-sheet event-placard-sheet--gold">
            <span class="event-placard-check">
              <span class="material-symbols-outlined check-icon">check_circle</span>
            </span>

            <div class="event-placard-top">
              <p class="event-placard-sub">Table Celebration</p>
              <h4 class="event-placard-name">Keann &amp; Jenny</h4>
              <div class="event-placard-divider"></div>
              <p class="event-placard-tagline">Capture our night through your lens.</p>
            </div>

            <div class="event-placard-qr-box">
              <span class="material-symbols-outlined placard-qr-icon">qr_code</span>
            </div>

            <div class="event-placard-bottom">
              <p class="event-placard-scan-text">Scan to add your photos to our vault</p>
              <span class="event-placard-url-text">qrchive.com/v/{{ eventCode }}</span>
            </div>
          </div>

          <div class="event-placard-caption">
            <h5 class="event-placard-label">Classic Gold Foil</h5>
            <p class="event-placard-status">{{ selectedPlacard === 'gold' ? 'Selected Design' : 'Print-ready layout' }}</p>
          </div>
        </div>

        <!-- Style 2: Minimalist Modern -->
        <div
          class="event-placard-card"
          :class="{ 'is-selected': selectedPlacard === 'minimalist' }"
          @click="selectedPlacard = 'minimalist'"
        >
          <div class="event-placard-sheet event-placard-sheet--minimalist">
            <span class="event-placard-check">
              <span class="material-symbols-outlined check-icon">check_circle</span>
            </span>

            <div class="event-placard-top">
              <p class="event-placard-sub">Memory Archive</p>
              <h4 class="event-placard-name event-placard-name--dark">K &amp; J</h4>
              <p class="event-placard-tagline" style="margin-top: 0.35rem;">10.26.2024</p>
            </div>

            <div class="event-placard-qr-box">
              <span class="material-symbols-outlined placard-qr-icon placard-qr-icon--dark">qr_code</span>
            </div>

            <div class="event-placard-bottom">
              <p class="event-placard-scan-text">Open Camera &amp; Scan</p>
            </div>
          </div>

          <div class="event-placard-caption">
            <h5 class="event-placard-label">Minimalist Modern</h5>
            <p class="event-placard-status">{{ selectedPlacard === 'minimalist' ? 'Selected Design' : 'Clean typographic layout' }}</p>
          </div>
        </div>

        <!-- Style 3: Botanical Arch -->
        <div
          class="event-placard-card"
          :class="{ 'is-selected': selectedPlacard === 'botanical' }"
          @click="selectedPlacard = 'botanical'"
        >
          <div class="event-placard-sheet event-placard-sheet--botanical">
            <span class="event-placard-check">
              <span class="material-symbols-outlined check-icon">check_circle</span>
            </span>

            <div class="botanical-arch-line"></div>

            <div class="event-placard-top">
              <p class="event-placard-sub">Celebrate With Us</p>
              <h4 class="event-placard-name event-placard-name--script">Jenny &amp; Keann</h4>
            </div>

            <div class="event-placard-qr-box">
              <span class="material-symbols-outlined placard-qr-icon">qr_code</span>
            </div>

            <div class="event-placard-bottom">
              <p class="event-placard-tagline" style="font-size: 0.6875rem;">Share your favorite wedding snaps</p>
            </div>
          </div>

          <div class="event-placard-caption">
            <h5 class="event-placard-label">Botanical Arch</h5>
            <p class="event-placard-status">{{ selectedPlacard === 'botanical' ? 'Selected Design' : 'Romantic arched foil detail' }}</p>
          </div>
        </div>

        <!-- Style 4: Romance Script -->
        <div
          class="event-placard-card"
          :class="{ 'is-selected': selectedPlacard === 'romance' }"
          @click="selectedPlacard = 'romance'"
        >
          <div class="event-placard-sheet event-placard-sheet--romance">
            <span class="event-placard-check">
              <span class="material-symbols-outlined check-icon">check_circle</span>
            </span>

            <div class="event-placard-top">
              <h4 class="event-placard-name event-placard-name--script" style="font-size: 1.35rem;">Share the Love</h4>
              <p class="event-placard-sub" style="margin-top: 0.35rem;">Keann &amp; Jenny's Guestbook</p>
            </div>

            <div class="event-placard-qr-box">
              <span class="material-symbols-outlined placard-qr-icon placard-qr-icon--dark">qr_code</span>
            </div>

            <div class="event-placard-bottom">
              <p class="event-placard-tagline" style="font-size: 0.6875rem;">Help us archive the evening</p>
            </div>
          </div>

          <div class="event-placard-caption">
            <h5 class="event-placard-label">Romance Script</h5>
            <p class="event-placard-status">{{ selectedPlacard === 'romance' ? 'Selected Design' : 'Editorial calligraphy focus' }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Interactive Album Preview Modal -->
    <JModal
      v-model="isAlbumModalOpen"
      :title="activeAlbum?.title || 'Album Viewer'"
      :subtitle="activeAlbum?.chapter || 'Chapter Album'"
      size="md"
      variant="elevated"
    >
      <div v-if="activeAlbum" style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="width: 100%; height: 260px; border-radius: 0.75rem; overflow: hidden;">
          <img :src="activeAlbum.img" :alt="activeAlbum.title" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.8125rem; color: var(--text-secondary);">
            {{ activeAlbum.photosCount }}
          </span>
          <span style="font-size: 0.8125rem; color: var(--text-secondary);">
            Latest contributor: <strong>{{ activeAlbum.author }}</strong>
          </span>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem;">
          <JBtn size="sm" variant="tonal" @click="isAlbumModalOpen = false">
            Close
          </JBtn>
          <JBtn size="sm" color="primary" @click="handleAction(`Downloading photos for ${activeAlbum.title}...`, 'success')">
            Download Album
          </JBtn>
        </div>
      </div>
    </JModal>

    <!-- Footer -->
    <footer class="event-detail__footer">
      <div class="event-detail__footer-container">
        <div class="event-detail__footer-top">
          <div class="event-detail__footer-brand-wrap">
            <div class="event-detail__footer-brand-title">
              <span>QRchive</span>
              <span class="tagline-badge">Celebration Vault</span>
            </div>
            <p class="event-detail__footer-brand-desc">
              Timeless heirloom digital archiving and bespoke event memories crafted in quiet luxury.
            </p>
          </div>

          <div class="event-detail__footer-links">
            <a href="#" @click.prevent="activeTab = 'tab1'">Celebration</a>
            <a href="#" @click.prevent="activeTab = 'tab2'">Guestbook</a>
            <a href="#" @click.prevent="activeTab = 'tab3'">Keepsakes</a>
          </div>
        </div>

        <div class="event-detail__footer-bottom">
          <p style="margin: 0;">&copy; 2024 QRchive Celebration Vault. Handcrafted with bespoke intimacy.</p>
          <div class="event-detail__footer-sublinks">
            <a href="#" @click.prevent="handleAction('Concierge support contacted')">Concierge</a>
            <a href="#" @click.prevent="handleAction('Privacy archive documentation')">Privacy Archive</a>
            <a href="#" @click.prevent="handleAction('Curator terms of service')">Curator Terms</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style lang="scss">
@use '@/styles/pages/event-detail.scss';
</style>
