<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { axiosInstance } from '../plugins/axios'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const eventsList = ref([])
const loading = ref(true)
const error = ref(null)
const searchQuery = ref('')
const selectedPaymentStatus = ref('all')
const selectedCategory = ref('all')

// Status update loading state map
const updatingStatusMap = ref({})
const successNotice = ref(null)

// Detail Modal
const selectedEvent = ref(null)
const isDetailModalOpen = ref(false)

const formatCurrency = (val) => {
  const num = Number(val || 0)
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(num)
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'Not set'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const fetchEvents = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await axiosInstance.get('/api/admin/events')
    if (res.data?.events) {
      eventsList.value = res.data.events
    }
  } catch (err) {
    console.error('Failed to load events:', err)
    error.value = err.data?.message || err.message || 'Failed to retrieve events'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchEvents()
})

const filteredEvents = computed(() => {
  return eventsList.value.filter((e) => {
    // Search query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const nameMatch = e.name?.toLowerCase().includes(q)
      const tokenMatch = e.token?.toLowerCase().includes(q)
      const brideMatch = (e.brideFirstname + ' ' + e.brideLastname).toLowerCase().includes(q)
      const groomMatch = (e.groomFirstname + ' ' + e.groomLastname).toLowerCase().includes(q)
      const userMatch = e.user?.fullname?.toLowerCase().includes(q) || e.user?.email?.toLowerCase().includes(q)
      if (!nameMatch && !tokenMatch && !brideMatch && !groomMatch && !userMatch) return false
    }

    // Payment Status filter
    if (selectedPaymentStatus.value !== 'all') {
      const s = selectedPaymentStatus.value.toLowerCase()
      const current = (e.paymentStatus || 'pending').toLowerCase()
      if (s === 'approved' || s === 'paid') {
        if (current !== 'approved' && current !== 'paid') return false
      } else if (s === 'declined' || s === 'cancelled') {
        if (current !== 'declined' && current !== 'cancelled') return false
      } else if (s === 'pending') {
        if (current !== 'pending') return false
      }
    }

    // Category filter
    if (selectedCategory.value !== 'all') {
      if (e.eventCategory?.toLowerCase() !== selectedCategory.value.toLowerCase()) return false
    }

    return true
  })
})

const stats = computed(() => {
  const total = eventsList.value.length
  const approved = eventsList.value.filter(
    (e) => e.paymentStatus === 'approved' || e.paymentStatus === 'paid'
  ).length
  const pending = eventsList.value.filter(
    (e) => e.paymentStatus === 'pending' || !e.paymentStatus
  ).length
  const declined = eventsList.value.filter(
    (e) => e.paymentStatus === 'declined' || e.paymentStatus === 'cancelled'
  ).length
  const totalPrice = eventsList.value.reduce((sum, e) => sum + Number(e.price || 0), 0)
  return { total, approved, pending, declined, totalPrice }
})

const handleUpdatePaymentStatus = async (eventId, newStatus) => {
  updatingStatusMap.value[eventId] = true
  successNotice.value = null
  try {
    const res = await axiosInstance.patch(`/api/admin/events/${eventId}/payment-status`, {
      paymentStatus: newStatus,
    })

    // Update in local array immediately
    const found = eventsList.value.find((e) => e.id === eventId)
    if (found) {
      found.paymentStatus = res.data?.event?.paymentStatus || newStatus
    }

    successNotice.value = `Payment status updated to '${newStatus}' for event #${eventId}.`
    setTimeout(() => {
      successNotice.value = null
    }, 4000)
  } catch (err) {
    console.error('Failed to update payment status:', err)
    alert(err.data?.message || err.message || 'Failed to update payment status.')
  } finally {
    updatingStatusMap.value[eventId] = false
  }
}

const openDetailModal = (event) => {
  selectedEvent.value = event
  isDetailModalOpen.value = true
}

const closeDetailModal = () => {
  isDetailModalOpen.value = false
  selectedEvent.value = null
}
</script>

<template>
  <div class="d-flex flex-column gap-4">
    <!-- Header -->
    <div class="d-flex flex-column flex-md-row align-start align-md-center justify-between gap-3">
      <div>
        <div class="d-flex align-center gap-2 mb-1 flex-wrap">
          <span style="font-size: 1.5rem;">📅</span>
          <h1 class="text-xl font-bold mb-0">Platform Events & Payment Review</h1>
          <span class="badge badge-xs badge-tonal-danger font-mono text-uppercase">Admin Only</span>
          <span class="badge badge-xs badge-tonal-neutral font-mono">Events Table</span>
        </div>
        <p class="text-xs text-muted mb-0">
          Review all platform events, verify incoming payments, approve or decline transactions, or reset payments to pending.
        </p>
      </div>

      <div class="d-flex align-center gap-2 flex-wrap">
        <button
          class="btn btn-sm btn-tonal-neutral d-flex align-center gap-1 font-medium"
          @click="fetchEvents"
          :disabled="loading"
        >
          <span>🔄</span>
          <span>Refresh Events</span>
        </button>
      </div>
    </div>

    <!-- Success Toast Notification -->
    <div
      v-if="successNotice"
      class="p-3 rounded-xl border border-success bg-success-subtle text-success d-flex align-center justify-between shadow-sm"
    >
      <div class="d-flex align-center gap-2">
        <span>✓</span>
        <span class="text-sm font-semibold">{{ successNotice }}</span>
      </div>
      <button class="btn btn-icon btn-xs btn-tonal-success" @click="successNotice = null">✕</button>
    </div>

    <!-- Events Summary KPIs -->
    <div class="d-grid grid-cols-1 grid-cols-sm-2 grid-cols-lg-5 gap-3">
      <div class="p-3 rounded-xl border border-subtle d-flex align-center justify-between" style="background: var(--bg-surface-tonal);">
        <div>
          <span class="text-xs text-secondary d-block mb-1">Total Events</span>
          <div class="text-2xl font-black text-body">{{ stats.total }}</div>
        </div>
        <div class="text-2xl p-2 rounded-lg" style="background: var(--bg-surface);">📅</div>
      </div>

      <div class="p-3 rounded-xl border border-subtle d-flex align-center justify-between" style="background: var(--bg-surface-tonal);">
        <div>
          <span class="text-xs text-secondary d-block mb-1">Approved / Paid</span>
          <div class="text-2xl font-black text-success">{{ stats.approved }}</div>
        </div>
        <div class="text-2xl p-2 rounded-lg" style="background: var(--bg-surface);">✅</div>
      </div>

      <div class="p-3 rounded-xl border border-subtle d-flex align-center justify-between" style="background: var(--bg-surface-tonal);">
        <div>
          <span class="text-xs text-secondary d-block mb-1">Pending Review</span>
          <div class="text-2xl font-black text-warning">{{ stats.pending }}</div>
        </div>
        <div class="text-2xl p-2 rounded-lg" style="background: var(--bg-surface);">⏳</div>
      </div>

      <div class="p-3 rounded-xl border border-subtle d-flex align-center justify-between" style="background: var(--bg-surface-tonal);">
        <div>
          <span class="text-xs text-secondary d-block mb-1">Declined</span>
          <div class="text-2xl font-black text-danger">{{ stats.declined }}</div>
        </div>
        <div class="text-2xl p-2 rounded-lg" style="background: var(--bg-surface);">❌</div>
      </div>

      <div class="p-3 rounded-xl border border-subtle d-flex align-center justify-between" style="background: var(--bg-surface-tonal);">
        <div>
          <span class="text-xs text-secondary d-block mb-1">Total Booking Value</span>
          <div class="text-xl font-black text-primary">{{ formatCurrency(stats.totalPrice) }}</div>
        </div>
        <div class="text-2xl p-2 rounded-lg" style="background: var(--bg-surface);">💰</div>
      </div>
    </div>

    <!-- Error Notice -->
    <div v-if="error" class="p-3 rounded-lg border border-danger bg-danger-subtle text-danger d-flex align-center justify-between">
      <div class="d-flex align-center gap-2">
        <span>⚠️</span>
        <span class="text-sm">{{ error }}</span>
      </div>
      <button class="btn btn-xs btn-tonal-danger" @click="fetchEvents">Retry</button>
    </div>

    <!-- Events Table Card -->
    <JCard variant="bordered" body-class="p-4">
      <!-- Toolbar & Filters -->
      <div class="d-flex flex-column flex-lg-row align-start align-lg-center justify-between gap-3 mb-4">
        <div>
          <h2 class="text-base font-bold mb-0">All Events ({{ filteredEvents.length }})</h2>
          <p class="text-xs text-muted mb-0">Filter by payment review status or category</p>
        </div>

        <div class="d-flex align-center gap-2 flex-wrap w-full w-lg-auto">
          <!-- Payment Status Filter -->
          <select
            v-model="selectedPaymentStatus"
            class="input input-sm border border-subtle rounded-lg px-2 py-1 text-xs"
            style="background: var(--bg-surface);"
          >
            <option value="all">All Payment Statuses</option>
            <option value="pending">Pending Only</option>
            <option value="approved">Approved / Paid Only</option>
            <option value="declined">Declined / Cancelled Only</option>
          </select>

          <!-- Category Filter -->
          <select
            v-model="selectedCategory"
            class="input input-sm border border-subtle rounded-lg px-2 py-1 text-xs"
            style="background: var(--bg-surface);"
          >
            <option value="all">All Categories</option>
            <option value="Wedding">Wedding</option>
            <option value="Anniversary">Anniversary</option>
            <option value="Others">Others</option>
          </select>

          <!-- Search Input -->
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search event name, couple, token..."
            class="input input-sm border border-subtle rounded-lg px-3 py-1 text-xs"
            style="min-width: 240px; background: var(--bg-surface);"
          />
        </div>
      </div>

      <div class="table-responsive">
        <table class="table w-full text-sm">
          <thead>
            <tr class="border-bottom border-subtle text-muted text-xs text-uppercase">
              <th class="py-2 text-start">Event Details</th>
              <th class="py-2 text-start">Creator / Owner</th>
              <th class="py-2 text-start">Couple / Celebrants</th>
              <th class="py-2 text-center">Event Date</th>
              <th class="py-2 text-end">Price</th>
              <th class="py-2 text-center">Payment Status</th>
              <th class="py-2 text-end">Update Payment</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="py-4 text-center text-muted">Loading events from database...</td>
            </tr>
            <tr v-else-if="filteredEvents.length === 0">
              <td colspan="7" class="py-4 text-center text-muted">
                No events found{{ searchQuery ? ' matching query' : '' }}.
              </td>
            </tr>
            <tr v-for="e in filteredEvents" :key="e.id" class="border-bottom border-subtle">
              <!-- Event Name & Token -->
              <td class="py-3">
                <div class="font-semibold text-body cursor-pointer hover-text-primary" @click="openDetailModal(e)">
                  {{ e.name }}
                </div>
                <div class="d-flex align-center gap-1 mt-0.5">
                  <span class="badge badge-xs badge-tonal-neutral font-mono">{{ e.eventCategory || 'Wedding' }}</span>
                  <span class="text-2xs text-muted font-mono">Token: {{ e.token || 'N/A' }}</span>
                </div>
              </td>

              <!-- Creator User -->
              <td class="py-3 text-secondary text-xs">
                <div v-if="e.user">
                  <div class="font-semibold text-body">{{ e.user.fullname }}</div>
                  <div class="text-2xs text-muted">{{ e.user.email }}</div>
                </div>
                <div v-else class="text-muted">Owner #{{ e.userId }}</div>
              </td>

              <!-- Couple -->
              <td class="py-3 text-secondary text-xs">
                <div v-if="e.brideFirstname || e.groomFirstname">
                  <span>👰 {{ e.brideFirstname }} {{ e.brideLastname }}</span>
                  <br />
                  <span>🤵 {{ e.groomFirstname }} {{ e.groomLastname }}</span>
                </div>
                <div v-else class="text-muted">N/A</div>
              </td>

              <!-- Event Date -->
              <td class="py-3 text-center text-xs font-mono text-secondary">
                {{ formatDate(e.eventDate) }}
              </td>

              <!-- Price -->
              <td class="py-3 text-end font-mono font-semibold text-body">
                {{ formatCurrency(e.price) }}
              </td>

              <!-- Payment Status Badge -->
              <td class="py-3 text-center">
                <span
                  :class="[
                    'badge badge-xs font-mono text-uppercase',
                    e.paymentStatus === 'approved' || e.paymentStatus === 'paid'
                      ? 'badge-tonal-success'
                      : e.paymentStatus === 'declined' || e.paymentStatus === 'cancelled'
                      ? 'badge-tonal-danger'
                      : 'badge-tonal-warning'
                  ]"
                >
                  {{ e.paymentStatus }}
                </span>
              </td>

              <!-- Action to update payment status: Approve, Decline, or Reset to Pending -->
              <td class="py-3 text-end">
                <div class="d-inline-flex align-center gap-1">
                  <!-- Approve Button -->
                  <button
                    class="btn btn-xs btn-tonal-success"
                    :disabled="updatingStatusMap[e.id] || e.paymentStatus === 'approved' || e.paymentStatus === 'paid'"
                    title="Approve payment status"
                    @click="handleUpdatePaymentStatus(e.id, 'approved')"
                  >
                    ✓ Approve
                  </button>

                  <!-- Decline Button -->
                  <button
                    class="btn btn-xs btn-tonal-danger"
                    :disabled="updatingStatusMap[e.id] || e.paymentStatus === 'declined'"
                    title="Decline payment status"
                    @click="handleUpdatePaymentStatus(e.id, 'declined')"
                  >
                    ✕ Decline
                  </button>

                  <!-- Reset to Pending Button -->
                  <button
                    class="btn btn-xs btn-tonal-neutral"
                    :disabled="updatingStatusMap[e.id] || e.paymentStatus === 'pending'"
                    title="Reset payment status to pending"
                    @click="handleUpdatePaymentStatus(e.id, 'pending')"
                  >
                    ↺ Reset
                  </button>

                  <!-- More Details -->
                  <button
                    class="btn btn-xs btn-icon btn-tonal-neutral"
                    title="View Event Details"
                    @click="openDetailModal(e)"
                  >
                    ℹ️
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </JCard>

    <!-- Event Detail Modal -->
    <div
      v-if="isDetailModalOpen && selectedEvent"
      class="modal-backdrop-custom d-flex align-center justify-center p-3"
      style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999;"
      @click.self="closeDetailModal"
    >
      <div
        class="modal-card rounded-2xl border border-subtle shadow-lg p-4 p-md-5 d-flex flex-column gap-3"
        style="width: 100%; max-width: 540px; background: var(--bg-surface);"
      >
        <div class="d-flex align-center justify-between border-bottom border-subtle pb-3">
          <div>
            <h3 class="text-base font-bold mb-0">{{ selectedEvent.name }}</h3>
            <span class="text-xs text-muted font-mono">Token: {{ selectedEvent.token }}</span>
          </div>
          <button class="btn btn-icon btn-xs btn-tonal-neutral" @click="closeDetailModal">✕</button>
        </div>

        <div class="d-flex flex-column gap-3 text-sm">
          <div class="p-3 rounded-xl border border-subtle d-flex align-center justify-between" style="background: var(--bg-surface-tonal);">
            <div>
              <span class="text-xs text-secondary d-block">Package Price</span>
              <div class="text-xl font-black text-primary">{{ formatCurrency(selectedEvent.price) }}</div>
            </div>
            <div>
              <span class="text-xs text-secondary d-block text-end">Current Status</span>
              <span
                :class="[
                  'badge badge-xs font-mono text-uppercase',
                  selectedEvent.paymentStatus === 'approved' || selectedEvent.paymentStatus === 'paid'
                    ? 'badge-tonal-success'
                    : selectedEvent.paymentStatus === 'declined'
                    ? 'badge-tonal-danger'
                    : 'badge-tonal-warning'
                ]"
              >
                {{ selectedEvent.paymentStatus }}
              </span>
            </div>
          </div>

          <div class="d-grid grid-cols-2 gap-3 text-xs">
            <div>
              <span class="text-muted d-block">Category:</span>
              <strong class="text-body">{{ selectedEvent.eventCategory }}</strong>
            </div>
            <div>
              <span class="text-muted d-block">Max Guests:</span>
              <strong class="text-body">{{ selectedEvent.maxGuest || 'Unlimited' }}</strong>
            </div>
            <div>
              <span class="text-muted d-block">Guests Registered:</span>
              <strong class="text-body">{{ selectedEvent.guestCount }}</strong>
            </div>
            <div>
              <span class="text-muted d-block">Photos Uploaded:</span>
              <strong class="text-body">{{ selectedEvent.photoCount }} ({{ selectedEvent.storageFormatted }})</strong>
            </div>
            <div>
              <span class="text-muted d-block">Event Date:</span>
              <strong class="text-body">{{ formatDate(selectedEvent.eventDate) }}</strong>
            </div>
            <div>
              <span class="text-muted d-block">Created At:</span>
              <strong class="text-body">{{ formatDate(selectedEvent.createdAt) }}</strong>
            </div>
          </div>

          <div class="border-top border-subtle pt-3">
            <span class="text-xs font-semibold d-block mb-2">Change Payment Status:</span>
            <div class="d-flex align-center gap-2">
              <button
                class="btn btn-sm btn-tonal-success flex-1"
                :disabled="selectedEvent.paymentStatus === 'approved'"
                @click="handleUpdatePaymentStatus(selectedEvent.id, 'approved')"
              >
                ✓ Approve Payment
              </button>
              <button
                class="btn btn-sm btn-tonal-danger flex-1"
                :disabled="selectedEvent.paymentStatus === 'declined'"
                @click="handleUpdatePaymentStatus(selectedEvent.id, 'declined')"
              >
                ✕ Decline Payment
              </button>
              <button
                class="btn btn-sm btn-tonal-neutral flex-1"
                :disabled="selectedEvent.paymentStatus === 'pending'"
                @click="handleUpdatePaymentStatus(selectedEvent.id, 'pending')"
              >
                ↺ Reset to Pending
              </button>
            </div>
          </div>
        </div>

        <div class="d-flex align-center justify-end pt-3 border-top border-subtle">
          <button class="btn btn-sm btn-primary" @click="closeDetailModal">Done</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-2xs {
  font-size: 0.725rem;
}

.hover-text-primary:hover {
  color: var(--primary);
}
</style>
