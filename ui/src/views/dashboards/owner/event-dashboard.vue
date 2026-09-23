<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import JCard from '@/@core/components/JCard.vue'
import JBtn from '@/@core/components/JBtn.vue'
import JModal from '@/@core/components/JModal.vue'

const router = useRouter()

const navigateToEvent = (code) => {
  router.push(`/dashboard/event/${code}`)
}

const props = defineProps({
  showHeader: {
    type: Boolean,
    default: false,
  },
  showFooter: {
    type: Boolean,
    default: true,
  },
})

const authStore = useAuthStore()
const toast = useToast()

// Dynamic display name
const displayName = computed(() => {
  return authStore.user?.firstname || authStore.user?.fullname || 'Keann'
})

// Tab Filtering
const activeFilter = ref('all') // 'all' | 'active' | 'completed'

// Modal State for Curate Celebration Vault
const isCreateModalOpen = ref(false)
const isSubmittingVault = ref(false)

const newEventForm = ref({
  title: '',
  date: '',
  guests: '',
  styleVariant: 'gilded', // 'gilded' | 'platinum'
})

const openCreateModal = () => {
  newEventForm.value = {
    title: '',
    date: '',
    guests: '',
    styleVariant: 'gilded',
  }
  isCreateModalOpen.value = true
}

const closeCreateModal = () => {
  isCreateModalOpen.value = false
}

// Live QR Preview Modal State
const isQrModalOpen = ref(false)
const selectedEventForQr = ref(null)

const openLiveQr = (event) => {
  selectedEventForQr.value = event
  isQrModalOpen.value = true
}

const copyGuestLink = async (eventName) => {
  try {
    const dummyUrl = `https://qrchive.app/vault/${encodeURIComponent(eventName.toLowerCase().replace(/\s+/g, '-'))}`
    await navigator.clipboard.writeText(dummyUrl)
    toast.show({
      message: 'Guest upload link copied to clipboard!',
      color: 'success',
      icon: 'content_copy',
    })
  } catch {
    toast.show({
      message: 'Guest link ready to share!',
      color: 'primary',
    })
  }
}

const handleActionNotice = (message, color = 'info') => {
  toast.show({
    message,
    color,
  })
}

// Interactive Event Creation
const handleCreateVault = () => {
  if (!newEventForm.value.title.trim()) {
    toast.show({
      message: 'Please enter a celebration title',
      color: 'warning',
    })
    return
  }

  isSubmittingVault.value = true
  setTimeout(() => {
    isSubmittingVault.value = false
    isCreateModalOpen.value = false
    toast.show({
      message: `Celebration Vault "${newEventForm.value.title}" successfully curated!`,
      color: 'success',
      icon: 'verified',
    })
  }, 600)
}
</script>

<template>
  <div class="event-dashboard">
    <!-- Standalone Header (Shown only when showHeader prop is enabled) -->
    <header v-if="showHeader" class="event-dashboard__top-header">
      <div class="event-dashboard__top-inner">
        <div class="event-dashboard__brand-block">
          <img
            alt="QRchive brand logo mark"
            class="event-dashboard__brand-img"
            src="https://lh3.googleusercontent.com/aida/AEtjO1XUa6mJN9JdZkbSaf4giXuA5Dt9CprqznZwqb78PfF5N5_Je0ZK_IWogao1hTViaBPomjIKmkhZEMxzHaTMSCrjJEO6h6xdG0oUPun2r9pvKc4RRoWdexBGQtgS7aqpAtWqbDS-EqNf5RVMc2SP9vy0fVD9dAqwBupF2ZQ4gGU6PFlP4mcg34qQruGfswnHwSEOq3fXVx27NYazCZo3zqridJto7xQ_bBJzfXx00Y2igDyXSnnki8sUxOw"
          />
          <div class="event-dashboard__brand-titles">
            <span class="event-dashboard__brand-name">QRchive</span>
            <span class="event-dashboard__brand-tagline">Celebration Vault</span>
          </div>
        </div>
        <div class="event-dashboard__user-avatar">
          <span class="material-symbols-outlined avatar-icon">person</span>
        </div>
      </div>
    </header>

    <!-- Top Welcome Header Bar -->
    <div class="event-dashboard__welcome-bar">
      <div class="event-dashboard__welcome-text">
        <h1 class="event-dashboard__welcome-title">
          Welcome back, <span class="title-highlight">{{ displayName }}</span>
        </h1>
      </div>
      <div class="event-dashboard__welcome-actions">
        <button
          id="quickCreateBtn"
          type="button"
          class="event-dashboard__create-btn"
          @click="openCreateModal"
        >
          <span class="material-symbols-outlined" style="font-size: 1.125rem;">add</span>
          <span>Create An Event</span>
        </button>
      </div>
    </div>

    <!-- Filter Navigation Bar -->
    <div class="event-dashboard__filter-bar">
      <div class="event-dashboard__tabs" role="tablist">
        <button
          id="tabAll"
          type="button"
          class="event-dashboard__tab-btn"
          :class="{ 'is-active': activeFilter === 'all' }"
          @click="activeFilter = 'all'"
        >
          All Events (5)
        </button>
        <button
          id="tabActive"
          type="button"
          class="event-dashboard__tab-btn"
          :class="{ 'is-active': activeFilter === 'active' }"
          @click="activeFilter = 'active'"
        >
          Active (2)
        </button>
        <button
          id="tabCompleted"
          type="button"
          class="event-dashboard__tab-btn"
          :class="{ 'is-active': activeFilter === 'completed' }"
          @click="activeFilter = 'completed'"
        >
          Completed (3)
        </button>
      </div>
    </div>

    <!-- Active Events Section -->
    <section
      v-if="activeFilter === 'all' || activeFilter === 'active'"
      id="activeEventsSection"
      class="event-section"
    >
      <div class="event-section__header">
        <div class="event-section__title-group">
          <h2 class="event-section__title">Active Events</h2>
          <span class="event-section__badge event-section__badge--live">2 Live</span>
        </div>
      </div>

      <div class="event-grid--active">
        <!-- Active Card 1: Keann & Jenny's Wedding Celebration -->
        <JCard
          variant="custom"
          no-body
          class="event-card event-card--clickable"
          @click="navigateToEvent('keann-jenny')"
        >
          <div class="event-card__main">
            <div class="event-card__top">
              <div class="event-card__header-info">
                <div class="event-card__status-indicator">
                  <span class="event-card__pulse-dot event-card__pulse-dot--emerald"></span>
                  <span class="event-card__status-text event-card__status-text--emerald">
                    Active • Live Vault Open
                  </span>
                </div>
                <h3 class="event-card__title">Keann &amp; Jenny's Wedding Celebration</h3>
                <p class="event-card__date">
                  <span class="material-symbols-outlined date-icon">calendar_month</span>
                  October 26, 2024
                </p>
              </div>
              <div class="event-card__icon-box">
                <span class="material-symbols-outlined box-icon">photo_library</span>
              </div>
            </div>

            <!-- Metrics Strip -->
            <div class="event-card__metrics-strip">
              <div class="event-card__metric-col">
                <span class="event-card__metric-label">Uploads</span>
                <span class="event-card__metric-value">48 Photos &amp; Clips</span>
              </div>
              <div class="event-card__metric-col">
                <span class="event-card__metric-label">Contributors</span>
                <span class="event-card__metric-value">18 Guests</span>
              </div>
            </div>

            <!-- Features -->
            <div class="event-card__feature-list">
              <div class="event-card__feature-item">
                <span class="material-symbols-outlined feature-icon">all_inclusive</span>
                <span>Unlimited Shots • Up to 300 guests</span>
              </div>
              <div class="event-card__feature-item">
                <span class="material-symbols-outlined feature-icon">schedule</span>
                <span>1 Month remaining upload window • 2 Months storage</span>
              </div>
            </div>
          </div>

          <!-- Card Footer -->
          <div class="event-card__footer">
            <button
              type="button"
              class="event-card__action-btn event-card__action-btn--primary"
              @click.stop="navigateToEvent('keann-jenny')"
            >
              <span class="material-symbols-outlined" style="font-size: 1rem;">tune</span>
              <span>Manage Vault &amp; Placards</span>
            </button>
            <div class="event-card__quick-actions">
              <button
                type="button"
                class="event-card__text-btn"
                title="View Live QR"
                @click.stop="openLiveQr('Keann & Jenny\'s Wedding Celebration')"
              >
                <span class="material-symbols-outlined btn-icon">qr_code_2</span>
                <span>Live QR</span>
              </button>
              <button
                type="button"
                class="event-card__text-btn"
                title="Copy Guest Link"
                @click.stop="copyGuestLink('Keann & Jenny\'s Wedding Celebration')"
              >
                <span class="material-symbols-outlined btn-icon">content_copy</span>
                <span>Copy Link</span>
              </button>
            </div>
          </div>
        </JCard>

        <!-- Active Card 2: Mateo & Isabella's Intimate Nuptials -->
        <JCard
          variant="custom"
          no-body
          class="event-card event-card--clickable"
          @click="navigateToEvent('mateo-isabella')"
        >
          <div class="event-card__main">
            <div class="event-card__top">
              <div class="event-card__header-info">
                <div class="event-card__status-indicator">
                  <span class="event-card__pulse-dot event-card__pulse-dot--amber"></span>
                  <span class="event-card__status-text event-card__status-text--amber">
                    Upcoming / Active
                  </span>
                </div>
                <h3 class="event-card__title">Mateo &amp; Isabella's Intimate Nuptials</h3>
                <p class="event-card__date">
                  <span class="material-symbols-outlined date-icon">calendar_month</span>
                  November 15, 2024
                </p>
              </div>
              <div class="event-card__icon-box">
                <span class="material-symbols-outlined box-icon">qr_code_scanner</span>
              </div>
            </div>

            <!-- Metrics Strip -->
            <div class="event-card__metrics-strip">
              <div class="event-card__metric-col">
                <span class="event-card__metric-label">Placards</span>
                <span class="event-card__metric-value">5x7 PDF Ready</span>
              </div>
              <div class="event-card__metric-col">
                <span class="event-card__metric-label">Capacity</span>
                <span class="event-card__metric-value">100 Guests</span>
              </div>
            </div>

            <!-- Features -->
            <div class="event-card__feature-list">
              <div class="event-card__feature-item">
                <span class="material-symbols-outlined feature-icon">camera_indoor</span>
                <span>Limited (30 shots/guest • Up to 100 guests)</span>
              </div>
              <div class="event-card__feature-item">
                <span class="material-symbols-outlined feature-icon">event_upcoming</span>
                <span>Upload window opens on event day • 0 photos yet</span>
              </div>
            </div>
          </div>

          <!-- Card Footer -->
          <div class="event-card__footer">
            <button
              type="button"
              class="event-card__action-btn event-card__action-btn--primary"
              @click.stop="navigateToEvent('mateo-isabella')"
            >
              <span class="material-symbols-outlined" style="font-size: 1rem;">tune</span>
              <span>Manage Vault &amp; Placards</span>
            </button>
            <button
              type="button"
              class="event-card__action-btn event-card__action-btn--tonal"
              @click.stop="handleActionNotice('Generating 5x7 Placards PDF...', 'success')"
            >
              <span class="material-symbols-outlined" style="font-size: 1rem; color: var(--primary);">picture_as_pdf</span>
              <span>Download Placards PDF</span>
            </button>
          </div>
        </JCard>
      </div>
    </section>

    <!-- Completed Events Section -->
    <section
      v-if="activeFilter === 'all' || activeFilter === 'completed'"
      id="completedEventsSection"
      class="event-section"
    >
      <div class="event-section__header">
        <div class="event-section__title-group">
          <h2 class="event-section__title">Completed Events</h2>
          <span class="event-section__badge event-section__badge--archived">3 Archived</span>
        </div>
      </div>

      <div class="event-grid--completed">
        <!-- Completed Card 1: Lucas & Mia's Garden Gala -->
        <JCard
          variant="custom"
          no-body
          class="event-card event-card--completed event-card--clickable"
          @click="navigateToEvent('lucas-mia')"
        >
          <div class="event-card__main">
            <div class="event-card__status-indicator" style="justify-content: space-between;">
              <span class="event-card__status-text event-card__status-text--secondary">
                Completed • Archived
              </span>
              <span class="material-symbols-outlined" style="font-size: 1.125rem; color: var(--secondary);">
                archive
              </span>
            </div>

            <div class="event-card__header-info">
              <h4 class="event-card__title">Lucas &amp; Mia's Garden Gala</h4>
              <p class="event-card__date">August 14, 2024</p>
            </div>

            <div class="event-card__completed-stats">
              <span class="stats-primary-line">242 photos &amp; 18 clips captured</span>
              <span>94 guest contributors</span>
              <div class="event-card__notice event-card__notice--danger">
                <span class="material-symbols-outlined notice-icon">hourglass_bottom</span>
                <span>Storage expires in 12 days</span>
              </div>
            </div>
          </div>

          <div class="event-card__footer">
            <div class="event-card__completed-actions">
              <button
                type="button"
                class="event-card__action-btn event-card__action-btn--tonal"
                style="justify-content: center; width: 100%;"
                @click.stop="handleActionNotice('Preparing ZIP archive download...', 'info')"
              >
                <span class="material-symbols-outlined" style="font-size: 0.95rem; color: var(--primary);">
                  folder_zip
                </span>
                <span>Download Archive (ZIP)</span>
              </button>
              <button
                type="button"
                class="event-card__action-btn event-card__action-btn--outlined"
                style="justify-content: center; width: 100%;"
                @click.stop="handleActionNotice('Storage extension invoice created', 'primary')"
              >
                <span class="material-symbols-outlined" style="font-size: 0.95rem;">add_circle</span>
                <span>Extend Storage (+₱200/mo)</span>
              </button>
            </div>
          </div>
        </JCard>

        <!-- Completed Card 2: Raphael & Camille's Sunset Vows -->
        <JCard
          variant="custom"
          no-body
          class="event-card event-card--completed event-card--clickable"
          @click="navigateToEvent('raphael-camille')"
        >
          <div class="event-card__main">
            <div class="event-card__status-indicator" style="justify-content: space-between;">
              <span class="event-card__status-text event-card__status-text--secondary">
                Completed • Read-Only
              </span>
              <span class="material-symbols-outlined" style="font-size: 1.125rem; color: var(--secondary);">
                lock_clock
              </span>
            </div>

            <div class="event-card__header-info">
              <h4 class="event-card__title">Raphael &amp; Camille's Sunset Vows</h4>
              <p class="event-card__date">June 22, 2024</p>
            </div>

            <div class="event-card__completed-stats">
              <span class="stats-primary-line">310 photos captured</span>
              <span>120 guest contributors</span>
              <div class="event-card__notice event-card__notice--primary">
                <span class="material-symbols-outlined notice-icon">verified</span>
                <span>Master vault downloaded</span>
              </div>
            </div>
          </div>

          <div class="event-card__footer">
            <div class="event-card__completed-actions">
              <button
                type="button"
                class="event-card__action-btn event-card__action-btn--tonal"
                style="justify-content: center; width: 100%;"
                @click.stop="handleActionNotice('Viewing archived vault', 'info')"
              >
                <span class="material-symbols-outlined" style="font-size: 0.95rem; color: var(--primary);">
                  visibility
                </span>
                <span>View Archive</span>
              </button>
              <button
                type="button"
                class="event-card__action-btn event-card__action-btn--tonal"
                style="justify-content: center; width: 100%;"
                @click.stop="handleActionNotice('Downloading photo bundle...', 'info')"
              >
                <span class="material-symbols-outlined" style="font-size: 0.95rem;">download</span>
                <span>Download Photos</span>
              </button>
            </div>
          </div>
        </JCard>

        <!-- Completed Card 3: Gabriel's 50th Jubilee Banquet -->
        <JCard
          variant="custom"
          no-body
          class="event-card event-card--completed event-card--clickable"
          @click="navigateToEvent('gabriel-50th')"
        >
          <div class="event-card__main">
            <div class="event-card__status-indicator" style="justify-content: space-between;">
              <span class="event-card__status-text event-card__status-text--error">
                Expired • Vault Purged
              </span>
              <span class="material-symbols-outlined" style="font-size: 1.125rem; color: var(--danger);">
                delete_forever
              </span>
            </div>

            <div class="event-card__header-info">
              <h4 class="event-card__title">Gabriel's 50th Jubilee Banquet</h4>
              <p class="event-card__date">April 5, 2024</p>
            </div>

            <div class="event-card__completed-stats">
              <span class="stats-primary-line" style="color: var(--danger);">0 photos accessible (Purged)</span>
              <span>65 guest contributors</span>
              <div class="event-card__notice event-card__notice--danger">
                <span class="material-symbols-outlined notice-icon">event_busy</span>
                <span>Storage expired • Photos permanently deleted</span>
              </div>
            </div>
          </div>

          <div class="event-card__footer">
            <div class="event-card__completed-actions">
              <button
                type="button"
                disabled
                class="event-card__action-btn event-card__action-btn--disabled"
                style="justify-content: center; width: 100%;"
                @click.stop
              >
                <span class="material-symbols-outlined" style="font-size: 0.95rem;">block</span>
                <span>Vault Purged / Expired</span>
              </button>
            </div>
          </div>
        </JCard>
      </div>
    </section>

    <!-- Interactive Modal: Curate Celebration Vault -->
    <JModal
      v-model="isCreateModalOpen"
      title="Curate Celebration Vault"
      subtitle="New Archival Register"
      size="md"
      variant="elevated"
      :show-close="true"
    >
      <form class="event-form" @submit.prevent="handleCreateVault">
        <div class="event-form__field">
          <label class="event-form__label">Celebration Title</label>
          <input
            v-model="newEventForm.title"
            class="event-form__input"
            type="text"
            placeholder="e.g., Charlotte &amp; Alexander Matrimony"
            required
          />
        </div>

        <div class="event-form__row">
          <div class="event-form__field">
            <label class="event-form__label">Celebration Date</label>
            <input
              v-model="newEventForm.date"
              class="event-form__input"
              type="date"
            />
          </div>

          <div class="event-form__field">
            <label class="event-form__label">Expected Guests</label>
            <input
              v-model="newEventForm.guests"
              class="event-form__input"
              type="number"
              placeholder="120"
            />
          </div>
        </div>

        <div class="event-form__field">
          <label class="event-form__label">Atelier Style Variant</label>
          <div class="event-style-picker">
            <div
              class="event-style-card"
              :class="{ 'is-selected': newEventForm.styleVariant === 'gilded' }"
              @click="newEventForm.styleVariant = 'gilded'"
            >
              <span class="event-style-swatch event-style-swatch--gold"></span>
              <span class="event-style-name">Gilded Silk &amp; Ivory</span>
            </div>

            <div
              class="event-style-card"
              :class="{ 'is-selected': newEventForm.styleVariant === 'platinum' }"
              @click="newEventForm.styleVariant = 'platinum'"
            >
              <span class="event-style-swatch event-style-swatch--platinum"></span>
              <span class="event-style-name">Platinum Minimalist</span>
            </div>
          </div>
        </div>

        <div class="event-modal-actions">
          <JBtn variant="text" @click="closeCreateModal">
            Cancel
          </JBtn>
          <JBtn
            color="primary"
            type="submit"
            :loading="isSubmittingVault"
          >
            Generate QR Vault
          </JBtn>
        </div>
      </form>
    </JModal>

    <!-- Quick Live QR Preview Modal -->
    <JModal
      v-model="isQrModalOpen"
      :title="selectedEventForQr || 'Live Celebration Vault QR'"
      subtitle="Instant Guest Upload Access"
      size="sm"
      variant="elevated"
    >
      <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 1rem 0; text-align: center;">
        <div style="padding: 1rem; background: #ffffff; border-radius: 0.75rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid rgba(197, 160, 89, 0.3);">
          <!-- QR Icon Display -->
          <span class="material-symbols-outlined" style="font-size: 9rem; color: #1f1b18; display: block;">
            qr_code_2
          </span>
        </div>
        <p style="margin: 0; font-size: 0.8125rem; color: var(--text-secondary);">
          Guests can scan this placard from their mobile cameras to immediately upload photos and videos directly into the celebration vault.
        </p>
        <div style="display: flex; gap: 0.5rem; width: 100%; justify-content: center; margin-top: 0.5rem;">
          <JBtn size="sm" color="primary" @click="copyGuestLink(selectedEventForQr || 'Vault')">
            <span class="material-symbols-outlined" style="font-size: 0.95rem; margin-right: 0.25rem;">content_copy</span>
            Copy Guest Link
          </JBtn>
          <JBtn size="sm" variant="tonal" @click="isQrModalOpen = false">
            Done
          </JBtn>
        </div>
      </div>
    </JModal>

    <!-- Footer -->
    <footer v-if="showFooter" class="event-dashboard__footer">
      <div class="event-dashboard__footer-brand">
        <span>QRchive</span>
        <span class="brand-subtext">— Celebration Vault</span>
      </div>
      <span class="event-dashboard__footer-copyright">
        &copy; 2024 QRchive. All rights reserved.
      </span>
    </footer>
  </div>
</template>

<style lang="scss">
@use '@/styles/pages/event-dashboard.scss';
</style>
