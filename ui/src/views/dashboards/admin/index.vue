<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { axiosInstance } from '@/plugins/axios'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const refreshing = ref(false)
const error = ref(null)

const stats = ref({
  events: { total: 0, approved: 0, pending: 0, declined: 0 },
  users: { total: 0, admins: 0, owners: 0, ordinary: 0, active: 0, pending: 0, banned: 0 },
  photos: { total: 0, eventPhotosCount: 0, snapPhotosCount: 0 },
  storage: {
    totalBytes: 0,
    totalFormatted: '0 B',
    eventPhotosBytes: 0,
    eventPhotosFormatted: '0 B',
    snapPhotosBytes: 0,
    snapPhotosFormatted: '0 B',
  },
  prices: { total: 0, approved: 0, pending: 0, declined: 0 },
  stores: { total: 0 },
})

const recentEvents = ref([])
const recentEventsLoading = ref(false)

const formatCurrency = (val) => {
  const num = Number(val || 0)
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(num)
}

const fetchAdminStats = async (isManual = false) => {
  if (isManual) refreshing.value = true
  else loading.value = true
  error.value = null

  try {
    const res = await axiosInstance.get('/api/admin/stats')
    if (res.data?.stats) {
      stats.value = res.data.stats
    }
  } catch (err) {
    console.error('Failed to load admin stats:', err)
    error.value = err.data?.message || err.message || 'Failed to load platform statistics'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const fetchRecentEvents = async () => {
  recentEventsLoading.value = true
  try {
    const res = await axiosInstance.get('/api/admin/events')
    if (res.data?.events) {
      recentEvents.value = res.data.events.slice(0, 5)
    }
  } catch (err) {
    console.warn('Could not load recent events:', err)
  } finally {
    recentEventsLoading.value = false
  }
}

const updatePaymentStatus = async (eventId, newStatus) => {
  try {
    await axiosInstance.patch(`/api/admin/events/${eventId}/payment-status`, {
      paymentStatus: newStatus,
    })
    // Refresh stats and events
    await Promise.all([fetchAdminStats(true), fetchRecentEvents()])
  } catch (err) {
    console.error('Failed to update event payment status:', err)
  }
}

onMounted(() => {
  fetchAdminStats()
  fetchRecentEvents()
})

const navigateTo = (path) => {
  router.push(path)
}

// Storage breakdown percentages
const storagePercentages = computed(() => {
  const total = stats.value.storage.totalBytes || 0
  if (total === 0) return { event: 0, snap: 0 }
  const eventPct = Math.round((stats.value.storage.eventPhotosBytes / total) * 100)
  const snapPct = 100 - eventPct
  return { event: eventPct, snap: snapPct }
})

// Price distribution percentage
const pricePaidPct = computed(() => {
  const total = stats.value.prices.total || 0
  if (total === 0) return 0
  return Math.round((stats.value.prices.approved / total) * 100)
})
</script>

<template>
  <div class="admin-dashboard d-flex flex-column gap-4">
    <!-- Top Admin Hero Banner -->
    <JCard variant="bordered" class="admin-hero shadow-sm" body-class="p-4 p-md-5">
      <div class="d-flex flex-column flex-lg-row align-start align-lg-center justify-between gap-4">
        <div class="d-flex align-center gap-3">
          <div
            class="stat-icon d-flex justify-center align-center rounded-2xl flex-shrink-0"
            style="width: 3.5rem; height: 3.5rem; font-size: 1.75rem; background: var(--primary-tonal, rgba(99,102,241,0.15)); border: 1px solid var(--primary);"
          >
            ⚡
          </div>
          <div>
            <div class="d-flex align-center gap-2 mb-1 flex-wrap">
              <h1 class="text-xl font-bold mb-0">Platform Administration Console</h1>
              <span class="badge badge-xs badge-tonal-danger font-mono text-uppercase">Admin Access</span>
              <span class="badge badge-xs badge-tonal-success font-mono">Live Telemetry</span>
            </div>
            <p class="text-xs text-secondary mb-0">
              Welcome back, <strong class="text-body">{{ authStore.userFullname || 'Administrator' }}</strong>.
              Real-time overview of events, registered users, photo storage, and financial totals.
            </p>
          </div>
        </div>

        <!-- Quick Admin Action Navigation Buttons -->
        <div class="d-flex align-center gap-2 flex-wrap">
          <button
            class="btn btn-sm btn-tonal-neutral d-flex align-center gap-1 font-medium"
            :disabled="refreshing"
            @click="fetchAdminStats(true)"
            title="Refresh statistics"
          >
            <span :class="{ 'spin-animation': refreshing }">🔄</span>
            <span>{{ refreshing ? 'Refreshing...' : 'Refresh' }}</span>
          </button>
          <button
            class="btn btn-sm btn-primary d-flex align-center gap-1 font-semibold"
            @click="navigateTo('/events')"
          >
            <span>📅</span>
            <span>Manage Events</span>
          </button>
          <button
            class="btn btn-sm btn-tonal-primary d-flex align-center gap-1 font-semibold"
            @click="navigateTo('/stores')"
          >
            <span>🏬</span>
            <span>Manage Stores</span>
          </button>
          <button
            class="btn btn-sm btn-tonal-neutral d-flex align-center gap-1 font-medium"
            @click="navigateTo('/users')"
          >
            <span>👥</span>
            <span>Manage Users</span>
          </button>
        </div>
      </div>
    </JCard>

    <!-- Error notice if API call fails -->
    <div v-if="error" class="p-3 rounded-lg border border-danger bg-danger-subtle text-danger d-flex align-center justify-between">
      <div class="d-flex align-center gap-2">
        <span>⚠️</span>
        <span class="text-sm">{{ error }}</span>
      </div>
      <button class="btn btn-xs btn-tonal-danger" @click="fetchAdminStats(true)">Retry</button>
    </div>

    <!-- Loading State Skeleton -->
    <div v-if="loading" class="d-grid grid-cols-1 grid-cols-sm-2 grid-cols-lg-4 gap-3">
      <div v-for="i in 4" :key="i" class="p-4 rounded-xl border border-subtle skeleton-card" style="min-height: 120px;">
        <div class="skeleton-shimmer h-4 w-1-2 mb-2"></div>
        <div class="skeleton-shimmer h-8 w-1-3 mb-2"></div>
        <div class="skeleton-shimmer h-3 w-3-4"></div>
      </div>
    </div>

    <!-- MAIN KPI STATS GRID (All Events, All Users, All Photos, Storage Capacity) -->
    <div v-else class="d-grid grid-cols-1 grid-cols-sm-2 grid-cols-xl-4 gap-3">
      <!-- 1. ALL EVENTS -->
      <JCard
        variant="bordered"
        body-class="p-4 d-flex flex-column justify-between gap-3 h-full cursor-pointer hover-card"
        @click="navigateTo('/events')"
      >
        <div class="d-flex align-center justify-between">
          <div>
            <span class="text-xs text-secondary font-medium text-uppercase tracking-wider">All Events</span>
            <div class="text-3xl font-black text-body mt-1">{{ stats.events.total }}</div>
          </div>
          <div
            class="d-flex justify-center align-center rounded-xl"
            style="width: 3rem; height: 3rem; font-size: 1.5rem; background: var(--primary-tonal, rgba(99,102,241,0.12));"
          >
            📅
          </div>
        </div>

        <div class="d-flex flex-column gap-2 pt-2 border-top border-subtle text-xs">
          <div class="d-flex align-center justify-between">
            <span class="text-muted d-flex align-center gap-1">
              <span class="status-dot bg-success"></span> Approved / Paid
            </span>
            <span class="badge badge-xs badge-tonal-success font-mono font-semibold">{{ stats.events.approved }}</span>
          </div>
          <div class="d-flex align-center justify-between">
            <span class="text-muted d-flex align-center gap-1">
              <span class="status-dot bg-warning"></span> Pending Approval
            </span>
            <span class="badge badge-xs badge-tonal-warning font-mono font-semibold">{{ stats.events.pending }}</span>
          </div>
          <div class="d-flex align-center justify-between">
            <span class="text-muted d-flex align-center gap-1">
              <span class="status-dot bg-danger"></span> Declined / Cancelled
            </span>
            <span class="badge badge-xs badge-tonal-danger font-mono font-semibold">{{ stats.events.declined }}</span>
          </div>
        </div>

        <div class="pt-1 text-2xs text-primary font-semibold text-end">
          View all events →
        </div>
      </JCard>

      <!-- 2. ALL USERS -->
      <JCard
        variant="bordered"
        body-class="p-4 d-flex flex-column justify-between gap-3 h-full cursor-pointer hover-card"
        @click="navigateTo('/users')"
      >
        <div class="d-flex align-center justify-between">
          <div>
            <span class="text-xs text-secondary font-medium text-uppercase tracking-wider">All Users</span>
            <div class="text-3xl font-black text-body mt-1">{{ stats.users.total }}</div>
          </div>
          <div
            class="d-flex justify-center align-center rounded-xl"
            style="width: 3rem; height: 3rem; font-size: 1.5rem; background: rgba(59, 130, 246, 0.12);"
          >
            👥
          </div>
        </div>

        <div class="d-flex flex-column gap-2 pt-2 border-top border-subtle text-xs">
          <div class="d-flex align-center justify-between">
            <span class="text-muted">Admins</span>
            <span class="badge badge-xs badge-tonal-danger font-mono">{{ stats.users.admins }}</span>
          </div>
          <div class="d-flex align-center justify-between">
            <span class="text-muted">Event Owners</span>
            <span class="badge badge-xs badge-tonal-primary font-mono">{{ stats.users.owners }}</span>
          </div>
          <div class="d-flex align-center justify-between">
            <span class="text-muted">Guests / Ordinary</span>
            <span class="badge badge-xs badge-tonal-neutral font-mono">{{ stats.users.ordinary }}</span>
          </div>
        </div>

        <div class="pt-1 text-2xs text-primary font-semibold text-end">
          Manage user directory →
        </div>
      </JCard>

      <!-- 3. ALL PHOTOS -->
      <JCard
        variant="bordered"
        body-class="p-4 d-flex flex-column justify-between gap-3 h-full"
      >
        <div class="d-flex align-center justify-between">
          <div>
            <span class="text-xs text-secondary font-medium text-uppercase tracking-wider">All Photos</span>
            <div class="text-3xl font-black text-body mt-1">{{ stats.photos.total }}</div>
          </div>
          <div
            class="d-flex justify-center align-center rounded-xl"
            style="width: 3rem; height: 3rem; font-size: 1.5rem; background: rgba(168, 85, 247, 0.12);"
          >
            📸
          </div>
        </div>

        <div class="d-flex flex-column gap-2 pt-2 border-top border-subtle text-xs">
          <div class="d-flex align-center justify-between">
            <span class="text-muted d-flex align-center gap-1">
              <span>🖼️</span> Event Photos
            </span>
            <span class="badge badge-xs badge-tonal-primary font-mono">{{ stats.photos.eventPhotosCount }}</span>
          </div>
          <div class="d-flex align-center justify-between">
            <span class="text-muted d-flex align-center gap-1">
              <span>📷</span> Snap Photos
            </span>
            <span class="badge badge-xs badge-tonal-success font-mono">{{ stats.photos.snapPhotosCount }}</span>
          </div>
          <div class="d-flex align-center justify-between">
            <span class="text-muted">Managed Stores</span>
            <span class="badge badge-xs badge-tonal-neutral font-mono">{{ stats.stores.total }}</span>
          </div>
        </div>

        <div class="pt-1 text-2xs text-secondary font-medium text-end">
          Across {{ stats.events.total }} total events
        </div>
      </JCard>

      <!-- 4. MEMORY CAPACITY USED -->
      <JCard
        variant="bordered"
        body-class="p-4 d-flex flex-column justify-between gap-3 h-full"
      >
        <div class="d-flex align-center justify-between">
          <div>
            <span class="text-xs text-secondary font-medium text-uppercase tracking-wider">Storage Capacity Used</span>
            <div class="text-3xl font-black text-primary mt-1">{{ stats.storage.totalFormatted }}</div>
          </div>
          <div
            class="d-flex justify-center align-center rounded-xl"
            style="width: 3rem; height: 3rem; font-size: 1.5rem; background: rgba(245, 158, 11, 0.12);"
          >
            💾
          </div>
        </div>

        <div class="d-flex flex-column gap-2 pt-2 border-top border-subtle text-xs">
          <div class="d-flex align-center justify-between">
            <span class="text-muted">Event Photos ({{ storagePercentages.event }}%)</span>
            <span class="font-mono font-semibold">{{ stats.storage.eventPhotosFormatted }}</span>
          </div>
          <div class="d-flex align-center justify-between">
            <span class="text-muted">Snap Photos ({{ storagePercentages.snap }}%)</span>
            <span class="font-mono font-semibold">{{ stats.storage.snapPhotosFormatted }}</span>
          </div>
          <!-- Storage Bar Meter -->
          <div class="storage-meter rounded-full overflow-hidden mt-1" style="height: 6px; background: var(--bg-surface-tonal); display: flex;">
            <div
              class="bg-primary"
              :style="{ width: `${storagePercentages.event}%` }"
              title="Event Photos"
            ></div>
            <div
              class="bg-success"
              :style="{ width: `${storagePercentages.snap}%` }"
              title="Snap Photos"
            ></div>
          </div>
        </div>

        <div class="pt-1 text-2xs text-secondary font-medium text-end">
          Cloudflare R2 Object Storage
        </div>
      </JCard>
    </div>

    <!-- PRICES TOTALED UP DASHBOARD SECTION -->
    <JCard variant="bordered" class="financial-card shadow-sm" body-class="p-4 p-md-5">
      <div class="d-flex flex-column flex-md-row align-start align-md-center justify-between gap-3 mb-4">
        <div>
          <div class="d-flex align-center gap-2 mb-1">
            <span style="font-size: 1.35rem;">💰</span>
            <h2 class="text-lg font-bold mb-0">Financial Dashboard · Prices Totaled Up</h2>
            <span class="badge badge-xs badge-tonal-success font-mono">Live Currency</span>
          </div>
          <p class="text-xs text-muted mb-0">
            Total pricing aggregated across all events created on the platform, categorized by payment status.
          </p>
        </div>

        <div class="text-start text-md-end">
          <span class="text-xs text-secondary d-block font-medium">Grand Total Value</span>
          <div class="text-2xl font-black text-primary">{{ formatCurrency(stats.prices.total) }}</div>
        </div>
      </div>

      <!-- Financial KPI Cards Row -->
      <div class="d-grid grid-cols-1 grid-cols-sm-3 gap-3">
        <!-- Approved / Collected Revenue -->
        <div class="p-3 p-md-4 rounded-xl border border-subtle d-flex flex-column justify-between gap-2" style="background: var(--bg-surface-tonal);">
          <div class="d-flex align-center justify-between">
            <span class="text-xs font-semibold text-success d-flex align-center gap-1">
              <span class="status-dot bg-success"></span> Approved / Paid Total
            </span>
            <span class="badge badge-xs badge-tonal-success font-mono">{{ pricePaidPct }}% of total</span>
          </div>
          <div class="text-2xl font-black text-body">
            {{ formatCurrency(stats.prices.approved) }}
          </div>
          <div class="text-2xs text-muted">
            From {{ stats.events.approved }} approved event(s)
          </div>
        </div>

        <!-- Pending Payments Value -->
        <div class="p-3 p-md-4 rounded-xl border border-subtle d-flex flex-column justify-between gap-2" style="background: var(--bg-surface-tonal);">
          <div class="d-flex align-center justify-between">
            <span class="text-xs font-semibold text-warning d-flex align-center gap-1">
              <span class="status-dot bg-warning"></span> Pending Payments
            </span>
            <span class="badge badge-xs badge-tonal-warning font-mono">{{ stats.events.pending }} event(s)</span>
          </div>
          <div class="text-2xl font-black text-body">
            {{ formatCurrency(stats.prices.pending) }}
          </div>
          <div class="text-2xs text-muted">
            Awaiting administrator approval or settlement
          </div>
        </div>

        <!-- Declined / Cancelled Value -->
        <div class="p-3 p-md-4 rounded-xl border border-subtle d-flex flex-column justify-between gap-2" style="background: var(--bg-surface-tonal);">
          <div class="d-flex align-center justify-between">
            <span class="text-xs font-semibold text-danger d-flex align-center gap-1">
              <span class="status-dot bg-danger"></span> Declined / Cancelled
            </span>
            <span class="badge badge-xs badge-tonal-danger font-mono">{{ stats.events.declined }} event(s)</span>
          </div>
          <div class="text-2xl font-black text-body">
            {{ formatCurrency(stats.prices.declined) }}
          </div>
          <div class="text-2xs text-muted">
            Cancelled or declined event packages
          </div>
        </div>
      </div>
    </JCard>

    <!-- RECENT EVENTS WITH FAST PAYMENT STATUS ACTIONS -->
    <JCard variant="bordered" body-class="p-4">
      <div class="d-flex align-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h2 class="text-base font-bold mb-0 d-flex align-center gap-2">
            <span>📅</span>
            <span>Recent Events & Payment Review</span>
          </h2>
          <p class="text-xs text-muted mb-0">Directly review payment statuses and approve or decline incoming bookings</p>
        </div>
        <button class="btn btn-xs btn-tonal-primary" @click="navigateTo('/events')">
          View All Events →
        </button>
      </div>

      <div class="table-responsive">
        <table class="table w-full text-sm">
          <thead>
            <tr class="border-bottom border-subtle text-muted text-xs text-uppercase">
              <th class="py-2 text-start">Event Name</th>
              <th class="py-2 text-start">Creator / Owner</th>
              <th class="py-2 text-center">Category</th>
              <th class="py-2 text-end">Price</th>
              <th class="py-2 text-center">Payment Status</th>
              <th class="py-2 text-end">Quick Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="recentEventsLoading">
              <td colspan="6" class="py-4 text-center text-muted">Loading events...</td>
            </tr>
            <tr v-else-if="recentEvents.length === 0">
              <td colspan="6" class="py-4 text-center text-muted">No events recorded yet.</td>
            </tr>
            <tr v-for="e in recentEvents" :key="e.id" class="border-bottom border-subtle">
              <td class="py-3">
                <div class="font-semibold">{{ e.name }}</div>
                <div class="text-2xs text-muted font-mono">Token: {{ e.token || 'N/A' }}</div>
              </td>
              <td class="py-3 text-secondary text-xs">
                <div>{{ e.user?.fullname || e.user?.email || 'Unknown' }}</div>
                <div class="text-2xs text-muted">{{ e.user?.email }}</div>
              </td>
              <td class="py-3 text-center">
                <span class="badge badge-xs badge-tonal-neutral font-mono">{{ e.eventCategory || 'Wedding' }}</span>
              </td>
              <td class="py-3 text-end font-mono font-semibold">
                {{ formatCurrency(e.price) }}
              </td>
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
              <td class="py-3 text-end">
                <div class="d-inline-flex align-center gap-1">
                  <button
                    v-if="e.paymentStatus !== 'approved' && e.paymentStatus !== 'paid'"
                    class="btn btn-xs btn-tonal-success"
                    title="Approve Payment"
                    @click="updatePaymentStatus(e.id, 'approved')"
                  >
                    ✓ Approve
                  </button>
                  <button
                    v-if="e.paymentStatus !== 'declined'"
                    class="btn btn-xs btn-tonal-danger"
                    title="Decline Payment"
                    @click="updatePaymentStatus(e.id, 'declined')"
                  >
                    ✕ Decline
                  </button>
                  <button
                    v-if="e.paymentStatus !== 'pending'"
                    class="btn btn-xs btn-tonal-neutral"
                    title="Reset to Pending"
                    @click="updatePaymentStatus(e.id, 'pending')"
                  >
                    ↺ Reset
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </JCard>
  </div>
</template>

<style scoped>
.admin-dashboard {
  width: 100%;
}

.text-2xs {
  font-size: 0.725rem;
}

.hover-card {
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.hover-card:hover {
  transform: translateY(-2px);
  border-color: var(--primary) !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.spin-animation {
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.skeleton-shimmer {
  background: var(--bg-surface-tonal);
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}
</style>
