<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { axiosInstance } from '@/plugins/axios'
import JCard from '@/@core/components/JCard.vue'
import JBtn from '@/@core/components/JBtn.vue'
import JModal from '@/@core/components/JModal.vue'
import EventModal from '@/views/modals/EventModal.vue'
import PaymentQrModal from '@/views/modals/PaymentQrModal.vue'

const router = useRouter()

const isPaymentPending = (event) => {
  const status = (event?.paymentStatus || event?.payment_status || 'pending').toLowerCase()
  return status === 'pending'
}

const handlePendingNotice = () => {
  toast.show({
    message: 'Payment is pending. Please complete payment to access and manage this celebration vault.',
    color: 'warning',
    icon: 'triangle-exclamation',
  })
}

const navigateToEvent = (eventOrCode) => {
  if (typeof eventOrCode === 'object' && eventOrCode !== null) {
    if (isPaymentPending(eventOrCode)) {
      openPaymentQrModal(eventOrCode)
      return
    }
    const token = eventOrCode.token || eventOrCode.id
    if (token) {
      router.push(`/dashboard/event/${token}`)
    }
    return
  }

  const matched = allEvents.value.find(e => e.token === eventOrCode || String(e.id) === String(eventOrCode))
  if (matched && isPaymentPending(matched)) {
    openPaymentQrModal(matched)
    return
  }

  router.push(`/dashboard/event/${eventOrCode}`)
}

const getPaymentStatusText = (event) => {
  const raw = event?.paymentStatus || event?.payment_status || 'pending'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

const getPaymentBadgeClass = (event) => {
  const status = (event?.paymentStatus || event?.payment_status || 'pending').toLowerCase()
  if (status === 'paid' || status === 'completed' || status === 'approved') return 'payment-badge--paid'
  if (status === 'cancelled' || status === 'refunded') return 'payment-badge--cancelled'
  return 'payment-badge--pending'
}

const getPaymentBadgeIcon = (event) => {
  const status = (event?.paymentStatus || event?.payment_status || 'pending').toLowerCase()
  if (status === 'paid' || status === 'completed' || status === 'approved') return 'check_circle'
  if (status === 'cancelled' || status === 'refunded') return 'cancel'
  return 'hourglass_top'
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

// =============================================
// My Events State (fetched from /api/events/my)
// =============================================
const allEvents = ref([])
const totalCount = ref(0)
const activeCount = ref(0)
const completedCount = ref(0)
const isEventsLoading = ref(false)

const activeEvents = computed(() => allEvents.value.filter(e => e.status === 'active'))
const completedEvents = computed(() => allEvents.value.filter(e => e.status === 'completed'))

const fetchMyEvents = async () => {
  isEventsLoading.value = true
  try {
    const { data } = await axiosInstance.get('/api/events/my')
    allEvents.value = data.events || []
    totalCount.value = data.total || 0
    activeCount.value = data.activeCount || 0
    completedCount.value = data.completedCount || 0
  } catch (err) {
    console.error('[EventDashboard] Failed to fetch my events:', err?.message)
    toast.show({
      message: 'Failed to load your events. Please refresh.',
      color: 'danger',
      icon: 'error',
    })
  } finally {
    isEventsLoading.value = false
  }
}

// Pricing State from Database
const pricingGroups = ref({})
const isPricingLoading = ref(false)

const fetchPricing = async () => {
  isPricingLoading.value = true
  try {
    const { data } = await axiosInstance.get('/api/pricing')
    const list = Array.isArray(data) ? data : (data.pricing || [])
    const grouped = {}
    list.forEach((item) => {
      const grp = (item.group || 'standard').toLowerCase()
      if (!grouped[grp]) grouped[grp] = []
      grouped[grp].push(item)
    })
    pricingGroups.value = grouped
  } catch (err) {
    console.warn('[EventDashboard] Failed to fetch pricing from DB, using defaults:', err.message)
  } finally {
    isPricingLoading.value = false
  }
}

onMounted(() => {
  fetchMyEvents()
  fetchPricing()
})

// Modal State for Curate Celebration Vault (EventModal.vue)
const isCreateModalOpen = ref(false)
const isSubmittingVault = ref(false)

const openCreateModal = () => {
  isCreateModalOpen.value = true
}

const closeCreateModal = () => {
  isCreateModalOpen.value = false
}

// Dedicated Payment QR Modal State (displays only Step 3 QR codes)
const isPaymentQrModalOpen = ref(false)
const selectedEventForPaymentQr = ref(null)

const openPaymentQrModal = (event) => {
  selectedEventForPaymentQr.value = event || null
  isPaymentQrModalOpen.value = true
}

const closePaymentQrModal = () => {
  isPaymentQrModalOpen.value = false
  selectedEventForPaymentQr.value = null
}

// Live QR Preview Modal State
const isQrModalOpen = ref(false)
const selectedEventForQr = ref(null)

const openLiveQr = (event) => {
  selectedEventForQr.value = event
  isQrModalOpen.value = true
}

const copyGuestLink = async (eventToken) => {
  try {
    const guestUrl = `${window.location.origin}/vault/${eventToken}`
    await navigator.clipboard.writeText(guestUrl)
    toast.show({
      message: 'Guest upload link copied to clipboard!',
      color: 'success',
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

// Interactive Event Creation Handler
const handleCreateVault = async (payload) => {
  isSubmittingVault.value = true
  try {
    await axiosInstance.post('/api/events', {
      name: payload.name,
      eventCategory: payload.eventCategory || payload.event_category || 'Wedding',
      eventDate: payload.event_date || payload.eventDate,
      token: payload.token,
      userId: payload.user_id || payload.userId || authStore.user?.id,
      maxGuest: payload.max_guest ?? payload.maxGuest,
      price: payload.price,
      isUnlimited: payload.isUnlimited ?? payload.is_unlimited ?? false,
      brideFirstname: payload.brideFirstname ?? payload.bride_firstname ?? null,
      brideLastname: payload.brideLastname ?? payload.bride_lastname ?? null,
      groomFirstname: payload.groomFirstname ?? payload.groom_firstname ?? null,
      groomLastname: payload.groomLastname ?? payload.groom_lastname ?? null,
      paymentStatus: 'pending',
      payment_status: 'pending',
    })

    toast.show({
      message: `Celebration Vault "${payload.name}" successfully curated!`,
      color: 'success',
      icon: 'verified',
    })
    isCreateModalOpen.value = false
    await fetchMyEvents() // Refresh list after creation
  } catch (err) {
    console.error('Failed to create celebration vault:', err)
    toast.show({
      message: `Failed to create celebration vault: ${err?.response?.data?.message || err.message}`,
      color: 'danger',
    })
  } finally {
    isSubmittingVault.value = false
  }
}

// Format event date for display
const formatDate = (dateStr) => {
  if (!dateStr) return 'Date TBD'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>


<template>
  <div class="event-dashboard">
    <!-- Standalone Header (Shown only when showHeader prop is enabled) -->
    <header v-if="showHeader" class="event-dashboard__top-header">
      <div class="event-dashboard__top-inner">
        <div class="event-dashboard__brand-block">
          <img alt="QRchive brand logo mark" class="event-dashboard__brand-img"
            src="https://lh3.googleusercontent.com/aida/AEtjO1XUa6mJN9JdZkbSaf4giXuA5Dt9CprqznZwqb78PfF5N5_Je0ZK_IWogao1hTViaBPomjIKmkhZEMxzHaTMSCrjJEO6h6xdG0oUPun2r9pvKc4RRoWdexBGQtgS7aqpAtWqbDS-EqNf5RVMc2SP9vy0fVD9dAqwBupF2ZQ4gGU6PFlP4mcg34qQruGfswnHwSEOq3fXVx27NYazCZo3zqridJto7xQ_bBJzfXx00Y2igDyXSnnki8sUxOw" />
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
        <button id="quickCreateBtn" type="button" class="event-dashboard__create-btn" @click="openCreateModal">
          <span class="material-symbols-outlined" style="font-size: 1.125rem;">add</span>
          <span>Create An Event</span>
        </button>
      </div>
    </div>

    <!-- Filter Navigation Bar -->
    <div class="event-dashboard__filter-bar">
      <div class="event-dashboard__tabs" role="tablist">
        <button id="tabAll" type="button" class="event-dashboard__tab-btn"
          :class="{ 'is-active': activeFilter === 'all' }" @click="activeFilter = 'all'">
          All Events ({{ totalCount }})
        </button>
        <button id="tabActive" type="button" class="event-dashboard__tab-btn"
          :class="{ 'is-active': activeFilter === 'active' }" @click="activeFilter = 'active'">
          Active ({{ activeCount }})
        </button>
        <button id="tabCompleted" type="button" class="event-dashboard__tab-btn"
          :class="{ 'is-active': activeFilter === 'completed' }" @click="activeFilter = 'completed'">
          Completed ({{ completedCount }})
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isEventsLoading" class="event-dashboard__loading">
      <span class="material-symbols-outlined"
        style="font-size: 2rem; color: var(--primary); animation: spin 1s linear infinite;">progress_activity</span>
      <span style="color: var(--text-secondary); font-size: 0.9rem;">Loading your events...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="!isEventsLoading && totalCount === 0" class="event-dashboard__empty">
      <span class="material-symbols-outlined" style="font-size: 3rem; color: var(--text-secondary);">event_busy</span>
      <p style="color: var(--text-secondary); margin: 0.5rem 0 0;">No events yet. Create your first Celebration Vault!
      </p>
    </div>

    <!-- Active Events Section -->
    <section v-if="!isEventsLoading && (activeFilter === 'all' || activeFilter === 'active') && activeEvents.length > 0"
      id="activeEventsSection" class="event-section">
      <div class="event-section__header">
        <div class="event-section__title-group">
          <h2 class="event-section__title">Active Events</h2>
          <span class="event-section__badge event-section__badge--live">{{ activeCount }} Live</span>
        </div>
      </div>

      <div class="event-grid--active">
        <JCard v-for="event in activeEvents" :key="event.id" variant="custom" no-body
          class="event-card event-card--clickable" :class="{ 'event-card--pending-payment': isPaymentPending(event) }"
          @click="navigateToEvent(event)">
          <div class="event-card__main">
            <div class="event-card__top">
              <div class="event-card__header-info">
                <div class="event-card__status-indicator">
                  <span class="event-card__pulse-dot"
                    :class="isPaymentPending(event) ? 'event-card__pulse-dot--amber' : 'event-card__pulse-dot--emerald'"></span>
                  <span class="event-card__status-text"
                    :class="isPaymentPending(event) ? 'event-card__status-text--amber' : 'event-card__status-text--emerald'">
                    {{ isPaymentPending(event) ? 'Pending Activation' : 'Active • Live Vault Open' }}
                  </span>
                  <!-- Payment Status Badge -->
                  <span class="payment-badge" :class="getPaymentBadgeClass(event)">
                    <span class="material-symbols-outlined payment-badge-icon">
                      {{ getPaymentBadgeIcon(event) }}
                    </span>
                    <span>{{ getPaymentStatusText(event) }}</span>
                  </span>
                </div>
                <h3 class="event-card__title">{{ event.name }}</h3>
                <p class="event-card__date">
                  <span class="material-symbols-outlined date-icon">calendar_month</span>
                  {{ formatDate(event.eventDate) }}
                </p>
              </div>
              <div class="event-card__icon-box">
                <span class="material-symbols-outlined box-icon">
                  {{ isPaymentPending(event) ? 'lock' : 'photo_library' }}
                </span>
              </div>
            </div>

            <!-- Name details if wedding -->
            <div v-if="event.brideFirstname || event.groomFirstname" class="event-card__feature-list">
              <div class="event-card__feature-item">
                <span class="material-symbols-outlined feature-icon">favorite</span>
                <span>
                  {{ [event.brideFirstname, event.brideLastname].filter(Boolean).join(' ') }}
                  <template v-if="event.brideFirstname && event.groomFirstname"> &amp; </template>
                  {{ [event.groomFirstname, event.groomLastname].filter(Boolean).join(' ') }}
                </span>
              </div>
            </div>
          </div>

          <!-- Card Footer -->
          <div class="event-card__footer" :class="{ 'event-card__footer--full': isPaymentPending(event) }">
            <template v-if="isPaymentPending(event)">
              <button type="button"
                class="event-card__action-btn event-card__action-btn--pending event-card__action-btn--full"
                title="View Payment QR Codes" @click.stop="openPaymentQrModal(event)">
                <span class="material-symbols-outlined" style="font-size: 1rem;">payments</span>
                <span>View Payment QR's</span>
              </button>
            </template>
            <template v-else>
              <button type="button" class="event-card__action-btn event-card__action-btn--primary"
                @click.stop="navigateToEvent(event)">
                <span class="material-symbols-outlined" style="font-size: 1rem;">tune</span>
                <span>Manage Vault & Placards</span>
              </button>
              <div class="event-card__quick-actions">
                <button type="button" class="event-card__text-btn" title="View Live QR"
                  @click.stop="openLiveQr(event.name)">
                  <span class="material-symbols-outlined btn-icon">qr_code_2</span>
                  <span>Live QR</span>
                </button>
                <button type="button" class="event-card__text-btn" title="Copy Guest Link"
                  @click.stop="copyGuestLink(event.token || event.id)">
                  <span class="material-symbols-outlined btn-icon">content_copy</span>
                  <span>Copy Link</span>
                </button>
              </div>
            </template>
          </div>
        </JCard>
      </div>
    </section>

    <!-- Completed Events Section -->
    <section
      v-if="!isEventsLoading && (activeFilter === 'all' || activeFilter === 'completed') && completedEvents.length > 0"
      id="completedEventsSection" class="event-section">
      <div class="event-section__header">
        <div class="event-section__title-group">
          <h2 class="event-section__title">Completed Events</h2>
          <span class="event-section__badge event-section__badge--archived">{{ completedCount }} Archived</span>
        </div>
      </div>

      <div class="event-grid--completed">
        <JCard v-for="event in completedEvents" :key="event.id" variant="custom" no-body
          class="event-card event-card--completed event-card--clickable"
          :class="{ 'event-card--pending-payment': isPaymentPending(event) }" @click="navigateToEvent(event)">
          <div class="event-card__main">
            <div class="event-card__status-indicator" style="justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                <span class="event-card__status-text event-card__status-text--secondary">
                  Completed • Archived
                </span>
                <!-- Payment Status Badge -->
                <span class="payment-badge" :class="getPaymentBadgeClass(event)">
                  <span class="material-symbols-outlined payment-badge-icon">
                    {{ getPaymentBadgeIcon(event) }}
                  </span>
                  <span>{{ getPaymentStatusText(event) }}</span>
                </span>
              </div>
              <span class="material-symbols-outlined" style="font-size: 1.125rem; color: var(--secondary);">
                archive
              </span>
            </div>

            <div class="event-card__header-info">
              <h4 class="event-card__title">{{ event.name }}</h4>
              <p class="event-card__date">{{ formatDate(event.eventDate) }}</p>
            </div>

            <div class="event-card__completed-stats">
              <span class="stats-primary-line">{{ event.photoCount }} photos captured</span>
              <span>{{ event.guestCount }} guest contributors</span>
              <div v-if="event.brideFirstname || event.groomFirstname"
                class="event-card__notice event-card__notice--primary">
                <span class="material-symbols-outlined notice-icon">favorite</span>
                <span>
                  {{ [event.brideFirstname, event.brideLastname].filter(Boolean).join(' ') }}
                  <template v-if="event.brideFirstname && event.groomFirstname"> &amp; </template>
                  {{ [event.groomFirstname, event.groomLastname].filter(Boolean).join(' ') }}
                </span>
              </div>
            </div>
          </div>

          <!-- Card Footer (Shown when paymentStatus = pending) -->
          <div v-if="isPaymentPending(event)" class="event-card__footer event-card__footer--full">
            <JBtn type="button" block title="View Payment QR Codes" @click.stop="openPaymentQrModal(event)">
              <JIcon name="banknote" size="20" /> <span>View Payment QR Codes</span>
            </JBtn>
          </div>
        </JCard>
      </div>
    </section>

    <!-- Interactive Modal: Curate Celebration Vault (Relocated to EventModal.vue) -->
    <EventModal v-model="isCreateModalOpen" :pricing-groups="pricingGroups" :loading="isSubmittingVault"
      @submit="handleCreateVault" @close="closeCreateModal" />

    <!-- Dedicated Payment QR Modal (Displays ONLY Step 3 payment QR codes) -->
    <PaymentQrModal v-model="isPaymentQrModalOpen" :event="selectedEventForPaymentQr" @close="closePaymentQrModal" />

    <!-- Quick Live QR Preview Modal -->
    <JModal v-model="isQrModalOpen" :title="selectedEventForQr || 'Live Celebration Vault QR'"
      subtitle="Instant Guest Upload Access" size="sm" variant="elevated">
      <div
        style="display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 1rem 0; text-align: center;">
        <div
          style="padding: 1rem; background: #ffffff; border-radius: 0.75rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid rgba(197, 160, 89, 0.3);">
          <!-- QR Icon Display -->
          <span class="material-symbols-outlined" style="font-size: 9rem; color: #1f1b18; display: block;">
            qr_code_2
          </span>
        </div>
        <p style="margin: 0; font-size: 0.8125rem; color: var(--text-secondary);">
          Guests can scan this placard from their mobile cameras to immediately upload photos and videos directly into
          the celebration vault.
        </p>
        <div style="display: flex; gap: 0.5rem; width: 100%; justify-content: center; margin-top: 0.5rem;">
          <JBtn size="sm" color="primary" @click="copyGuestLink(selectedEventForQr || 'Vault')">
            <span class="material-symbols-outlined"
              style="font-size: 0.95rem; margin-right: 0.25rem;">content_copy</span>
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
        <span>QRchive Events</span>
      </div>
      <span class="event-dashboard__footer-copyright">
        &copy; 2026 QRchive Events. All rights reserved.
      </span>
    </footer>
  </div>
</template>

<style lang="scss">
@use '@/styles/pages/event-dashboard.scss';

.payment-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.55rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  line-height: 1.2;

  .payment-badge-icon {
    font-size: 0.8rem;
  }

  &--pending {
    background-color: rgba(245, 158, 11, 0.12);
    color: #b45309;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  &--paid,
  &--completed {
    background-color: rgba(16, 185, 129, 0.12);
    color: #047857;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  &--cancelled,
  &--refunded {
    background-color: rgba(244, 63, 94, 0.12);
    color: #be123c;
    border: 1px solid rgba(244, 63, 94, 0.3);
  }
}

.event-card__action-btn--pending {
  background-color: rgba(245, 158, 11, 0.12) !important;
  color: #b45309 !important;
  border: 1px solid rgba(245, 158, 11, 0.35) !important;
  cursor: pointer;

  &:hover {
    background-color: rgba(245, 158, 11, 0.22) !important;
    color: #92400e !important;
  }
}

.event-card--pending-payment {
  border-color: rgba(245, 158, 11, 0.35) !important;

  &:hover {
    border-color: rgba(245, 158, 11, 0.6) !important;
  }
}
</style>
