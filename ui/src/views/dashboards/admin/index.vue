<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { API_BASE_URL } from '@/plugins/axios'

const router = useRouter()
const authStore = useAuthStore()

// Admin KPI statistics
const platformStats = ref([
  { label: 'Registered Stores', value: '28', change: '+4 this month', icon: '🏬', color: 'primary' },
  { label: 'Active Weddings', value: '142', change: '+18% vs last month', icon: '💍', color: 'success' },
  { label: 'Platform Users', value: '1,280', change: '+92 new accounts', icon: '👥', color: 'info' },
  { label: 'Cloud Storage', value: '38.4 GB', change: '62% capacity', icon: '☁️', color: 'warning' },
])

// Recent store registrations for admin review
const recentStores = ref([
  { id: '1', name: 'Downtown Bridal Studio', owner: 'Michael Johnson', location: 'New York, NY', weddings: 14, status: 'Active' },
  { id: '2', name: 'West Coast Wedding Hub', owner: 'Elena Rostova', location: 'San Francisco, CA', weddings: 9, status: 'Active' },
  { id: '3', name: 'Southern Elegance Events', owner: 'David Miller', location: 'Austin, TX', weddings: 6, status: 'Pending' },
  { id: '4', name: 'Seaside Grand Pavilion', owner: 'Clara Oswald', location: 'Miami, FL', weddings: 18, status: 'Active' },
])

// System health indicators
const systemHealth = ref([
  { service: 'PostgreSQL Database', status: 'Healthy', latency: '4ms', load: '12%' },
  { service: 'Fastify Auth Engine', status: 'Operational', latency: '12ms', load: '18%' },
  { service: 'Media Storage CDN', status: 'Optimal', latency: '22ms', load: '34%' },
  { service: 'OAuth Token Service', status: 'Verified', latency: '8ms', load: '9%' },
])

const navigateTo = (path) => {
  router.push(path)
}
</script>

<template>
  <div class="admin-dashboard d-flex flex-column gap-4">
    <!-- Admin Header Banner -->
    <JCard variant="bordered" class="admin-hero" body-class="p-4 p-md-5">
      <div class="d-flex flex-column flex-lg-row align-start align-lg-center justify-between gap-4">
        <div class="d-flex align-center gap-3">
          <div class="stat-icon d-flex justify-center align-center rounded-2xl flex-shrink-0"
            style="width: 3.5rem; height: 3.5rem; font-size: 1.75rem; background: var(--primary-tonal, rgba(99,102,241,0.15)); border: 1px solid var(--primary);">
            ⚡
          </div>
          <div>
            <div class="d-flex align-center gap-2 mb-1 flex-wrap">
              <h1 class="text-xl font-bold mb-0">Platform Administration Console</h1>
              <span class="badge badge-xs badge-tonal-danger font-mono text-uppercase">Admin Access</span>
              <span class="badge badge-xs badge-success font-mono">System Live</span>
            </div>
            <p class="text-xs text-secondary mb-0">
              Welcome, <strong class="text-body">{{ authStore.userFullname }}</strong>. Multi-tenant orchestration, store approvals, system diagnostics, and user directory control.
            </p>
          </div>
        </div>

        <!-- Quick Admin Actions -->
        <div class="d-flex align-center gap-2 flex-wrap">
          <button class="btn btn-sm btn-primary d-flex align-center gap-1 font-semibold" @click="navigateTo('/stores')">
            <span>+</span>
            <span>Add Store</span>
          </button>
          <button class="btn btn-sm btn-tonal-neutral d-flex align-center gap-1 font-medium" @click="navigateTo('/users')">
            <span>👥</span>
            <span>Manage Users</span>
          </button>
          <button class="btn btn-sm btn-tonal-neutral d-flex align-center gap-1 font-medium" @click="navigateTo('/settings')">
            <span>⚙️</span>
            <span>Settings</span>
          </button>
        </div>
      </div>

      <!-- Platform KPI Grid -->
      <div class="d-grid grid-cols-1 grid-cols-sm-2 grid-cols-lg-4 gap-3 mt-4 pt-3 border-top border-subtle">
        <div v-for="(stat, idx) in platformStats" :key="idx"
          class="p-3 rounded-xl border border-subtle d-flex align-center justify-between"
          style="background: var(--bg-surface-tonal);">
          <div>
            <span class="text-xs text-secondary d-block mb-1">{{ stat.label }}</span>
            <div class="text-2xl font-black text-body mb-1">{{ stat.value }}</div>
            <span class="badge badge-xs badge-tonal-success font-mono">{{ stat.change }}</span>
          </div>
          <div class="text-2xl p-2 rounded-lg" style="background: var(--bg-surface);">
            {{ stat.icon }}
          </div>
        </div>
      </div>
    </JCard>

    <!-- Main Content: Store Oversight & System Health -->
    <div class="d-grid grid-cols-1 grid-cols-xl-3 gap-4">
      <!-- Store Approvals & Management (2 Columns) -->
      <div class="grid-col-1 grid-col-xl-2 d-flex flex-column gap-4">
        <JCard variant="bordered" body-class="p-4">
          <div class="d-flex align-center justify-between mb-3">
            <div>
              <h2 class="text-base font-bold mb-1 d-flex align-center gap-2">
                <span>🏬</span>
                <span>Store Management & Status</span>
              </h2>
              <p class="text-xs text-muted mb-0">Partner studios and wedding venue tenants</p>
            </div>
            <button class="btn btn-xs btn-tonal-primary" @click="navigateTo('/stores')">
              View All Stores →
            </button>
          </div>

          <div class="table-responsive">
            <table class="table w-full text-sm">
              <thead>
                <tr class="border-bottom border-subtle text-muted text-xs text-uppercase">
                  <th class="py-2 text-start">Store Name</th>
                  <th class="py-2 text-start">Owner</th>
                  <th class="py-2 text-center">Weddings</th>
                  <th class="py-2 text-center">Status</th>
                  <th class="py-2 text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in recentStores" :key="s.id" class="border-bottom border-subtle">
                  <td class="py-3 font-semibold">
                    <div>{{ s.name }}</div>
                    <div class="text-xs text-muted">📍 {{ s.location }}</div>
                  </td>
                  <td class="py-3 text-secondary text-xs">{{ s.owner }}</td>
                  <td class="py-3 text-center">
                    <span class="badge badge-xs badge-tonal-primary font-mono">{{ s.weddings }}</span>
                  </td>
                  <td class="py-3 text-center">
                    <span :class="['badge badge-xs', s.status === 'Active' ? 'badge-tonal-success' : 'badge-tonal-warning']">
                      {{ s.status }}
                    </span>
                  </td>
                  <td class="py-3 text-end">
                    <button class="btn btn-xs btn-tonal-neutral" @click="navigateTo('/stores')">Review</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </JCard>
      </div>

      <!-- Infrastructure Health & Security Status (1 Column) -->
      <div class="d-flex flex-column gap-4">
        <JCard variant="bordered" body-class="p-4 d-flex flex-column gap-3">
          <div class="d-flex align-center justify-between">
            <h2 class="text-base font-bold mb-0 d-flex align-center gap-2">
              <span>🩺</span>
              <span>System Telemetry</span>
            </h2>
            <span class="badge badge-xs badge-tonal-success font-mono">100% Online</span>
          </div>

          <p class="text-xs text-muted mb-0">
            Real-time infrastructure health and latency monitoring.
          </p>

          <div class="d-flex flex-column gap-2 mt-1">
            <div v-for="(svc, idx) in systemHealth" :key="idx"
              class="p-2 rounded-lg border border-subtle d-flex align-center justify-between text-xs"
              style="background: var(--bg-surface-tonal);">
              <div>
                <span class="font-semibold d-block">{{ svc.service }}</span>
                <span class="text-muted font-mono text-2xs">{{ svc.latency }} · Load: {{ svc.load }}</span>
              </div>
              <span class="badge badge-xs badge-tonal-success font-mono">{{ svc.status }}</span>
            </div>
          </div>

          <div class="p-3 rounded-lg border border-subtle mt-2" style="background: var(--bg-surface);">
            <div class="d-flex align-center justify-between text-xs text-muted mb-1">
              <span>Server Environment:</span>
              <span class="font-mono font-semibold text-primary">Node.js + Fastify</span>
            </div>
            <div class="d-flex align-center justify-between text-xs text-muted mb-1">
              <span>API Base URL:</span>
              <code class="font-mono text-2xs text-secondary">{{ API_BASE_URL }}</code>
            </div>
            <div class="d-flex align-center justify-between text-xs text-muted">
              <span>Tenant Isolation:</span>
              <span class="badge badge-xs badge-tonal-info font-mono">Strict / Schema</span>
            </div>
          </div>
        </JCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-dashboard {
  width: 100%;
}
.text-2xs {
  font-size: 0.7rem;
}
</style>
