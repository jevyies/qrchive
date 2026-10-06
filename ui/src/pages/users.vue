<script setup>
import { ref, onMounted, computed } from 'vue'
import { axiosInstance } from '../plugins/axios'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const users = ref([])
const loading = ref(true)
const error = ref(null)
const searchQuery = ref('')
const selectedRole = ref('all')
const selectedStatus = ref('all')

// Role & Status Editing Modal
const isEditModalOpen = ref(false)
const updatingUser = ref(false)
const selectedUser = ref(null)
const editForm = ref({
  authPosition: 'owner',
  status: 'active',
})

const fetchUsers = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await axiosInstance.get('/api/admin/users')
    if (res.data?.users) {
      users.value = res.data.users
    }
  } catch (err) {
    console.error('Failed to load users:', err)
    error.value = err.data?.message || err.message || 'Failed to retrieve user directory'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchUsers()
})

const filteredUsers = computed(() => {
  return users.value.filter((u) => {
    // Search query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const nameMatch = u.fullname?.toLowerCase().includes(q)
      const usernameMatch = u.username?.toLowerCase().includes(q)
      const emailMatch = u.email?.toLowerCase().includes(q)
      if (!nameMatch && !usernameMatch && !emailMatch) return false
    }

    // Role filter
    if (selectedRole.value !== 'all') {
      if (u.authPosition?.toLowerCase() !== selectedRole.value.toLowerCase()) return false
    }

    // Status filter
    if (selectedStatus.value !== 'all') {
      if (u.status?.toLowerCase() !== selectedStatus.value.toLowerCase()) return false
    }

    return true
  })
})

const stats = computed(() => {
  const total = users.value.length
  const admins = users.value.filter((u) => u.authPosition?.toLowerCase() === 'admin').length
  const owners = users.value.filter((u) => u.authPosition?.toLowerCase() === 'owner').length
  const ordinary = users.value.filter((u) => u.authPosition?.toLowerCase() === 'ordinary').length
  const pending = users.value.filter((u) => u.status?.toLowerCase() === 'pending').length
  return { total, admins, owners, ordinary, pending }
})

const openEditModal = (user) => {
  selectedUser.value = user
  editForm.value = {
    authPosition: user.authPosition || 'owner',
    status: user.status || 'active',
  }
  isEditModalOpen.value = true
}

const closeEditModal = () => {
  isEditModalOpen.value = false
  selectedUser.value = null
}

const handleUpdateUser = async () => {
  if (!selectedUser.value) return
  updatingUser.value = true
  try {
    await axiosInstance.patch(`/api/admin/users/${selectedUser.value.id}`, {
      authPosition: editForm.value.authPosition,
      status: editForm.value.status,
    })
    closeEditModal()
    await fetchUsers()
  } catch (err) {
    console.error('Failed to update user:', err)
    alert(err.data?.message || err.message || 'Failed to update user permissions.')
  } finally {
    updatingUser.value = false
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
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
</script>

<template>
  <div class="d-flex flex-column gap-4">
    <!-- Header -->
    <div class="d-flex flex-column flex-md-row align-start align-md-center justify-between gap-3">
      <div>
        <div class="d-flex align-center gap-2 mb-1 flex-wrap">
          <span style="font-size: 1.5rem;">👥</span>
          <h1 class="text-xl font-bold mb-0">Platform User Directory</h1>
          <span class="badge badge-xs badge-tonal-danger font-mono text-uppercase">Admin Only</span>
          <span class="badge badge-xs badge-tonal-neutral font-mono">Users Table</span>
        </div>
        <p class="text-xs text-muted mb-0">
          Comprehensive directory of all users who created an account on the QRchive platform, their assigned roles, and authentication status.
        </p>
      </div>

      <div class="d-flex align-center gap-2 flex-wrap">
        <button
          class="btn btn-sm btn-tonal-neutral d-flex align-center gap-1 font-medium"
          @click="fetchUsers"
          :disabled="loading"
        >
          <span>🔄</span>
          <span>Refresh Directory</span>
        </button>
      </div>
    </div>

    <!-- User Directory KPIs -->
    <div class="d-grid grid-cols-1 grid-cols-sm-2 grid-cols-lg-5 gap-3">
      <div class="p-3 rounded-xl border border-subtle d-flex align-center justify-between" style="background: var(--bg-surface-tonal);">
        <div>
          <span class="text-xs text-secondary d-block mb-1">Total Users</span>
          <div class="text-2xl font-black text-body">{{ stats.total }}</div>
        </div>
        <div class="text-2xl p-2 rounded-lg" style="background: var(--bg-surface);">👥</div>
      </div>

      <div class="p-3 rounded-xl border border-subtle d-flex align-center justify-between" style="background: var(--bg-surface-tonal);">
        <div>
          <span class="text-xs text-secondary d-block mb-1">Admins</span>
          <div class="text-2xl font-black text-danger">{{ stats.admins }}</div>
        </div>
        <div class="text-2xl p-2 rounded-lg" style="background: var(--bg-surface);">⚡</div>
      </div>

      <div class="p-3 rounded-xl border border-subtle d-flex align-center justify-between" style="background: var(--bg-surface-tonal);">
        <div>
          <span class="text-xs text-secondary d-block mb-1">Event Owners</span>
          <div class="text-2xl font-black text-primary">{{ stats.owners }}</div>
        </div>
        <div class="text-2xl p-2 rounded-lg" style="background: var(--bg-surface);">👑</div>
      </div>

      <div class="p-3 rounded-xl border border-subtle d-flex align-center justify-between" style="background: var(--bg-surface-tonal);">
        <div>
          <span class="text-xs text-secondary d-block mb-1">Ordinary Users</span>
          <div class="text-2xl font-black text-secondary">{{ stats.ordinary }}</div>
        </div>
        <div class="text-2xl p-2 rounded-lg" style="background: var(--bg-surface);">👤</div>
      </div>

      <div class="p-3 rounded-xl border border-subtle d-flex align-center justify-between" style="background: var(--bg-surface-tonal);">
        <div>
          <span class="text-xs text-secondary d-block mb-1">Pending Approval</span>
          <div class="text-2xl font-black text-warning">{{ stats.pending }}</div>
        </div>
        <div class="text-2xl p-2 rounded-lg" style="background: var(--bg-surface);">⏳</div>
      </div>
    </div>

    <!-- Error Notice -->
    <div v-if="error" class="p-3 rounded-lg border border-danger bg-danger-subtle text-danger d-flex align-center justify-between">
      <div class="d-flex align-center gap-2">
        <span>⚠️</span>
        <span class="text-sm">{{ error }}</span>
      </div>
      <button class="btn btn-xs btn-tonal-danger" @click="fetchUsers">Retry</button>
    </div>

    <!-- Users Table Card -->
    <JCard variant="bordered" body-class="p-4">
      <!-- Toolbar & Filters -->
      <div class="d-flex flex-column flex-lg-row align-start align-lg-center justify-between gap-3 mb-4">
        <div>
          <h2 class="text-base font-bold mb-0">Registered User Accounts ({{ filteredUsers.length }})</h2>
          <p class="text-xs text-muted mb-0">Select role position or status to filter users</p>
        </div>

        <div class="d-flex align-center gap-2 flex-wrap w-full w-lg-auto">
          <!-- Role Filter -->
          <select
            v-model="selectedRole"
            class="input input-sm border border-subtle rounded-lg px-2 py-1 text-xs"
            style="background: var(--bg-surface);"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
            <option value="ordinary">Ordinary</option>
          </select>

          <!-- Status Filter -->
          <select
            v-model="selectedStatus"
            class="input input-sm border border-subtle rounded-lg px-2 py-1 text-xs"
            style="background: var(--bg-surface);"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="banned">Banned</option>
          </select>

          <!-- Search Input -->
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search name, username, email..."
            class="input input-sm border border-subtle rounded-lg px-3 py-1 text-xs"
            style="min-width: 220px; background: var(--bg-surface);"
          />
        </div>
      </div>

      <div class="table-responsive">
        <table class="table w-full text-sm">
          <thead>
            <tr class="border-bottom border-subtle text-muted text-xs text-uppercase">
              <th class="py-2 text-start">User Profile</th>
              <th class="py-2 text-start">Username & Provider</th>
              <th class="py-2 text-center">authPosition</th>
              <th class="py-2 text-center">Status</th>
              <th class="py-2 text-center">Events</th>
              <th class="py-2 text-center">Registered Date</th>
              <th class="py-2 text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="py-4 text-center text-muted">Loading user accounts...</td>
            </tr>
            <tr v-else-if="filteredUsers.length === 0">
              <td colspan="7" class="py-4 text-center text-muted">
                No users found{{ searchQuery ? ' matching query' : '' }}.
              </td>
            </tr>
            <tr v-for="u in filteredUsers" :key="u.id" class="border-bottom border-subtle">
              <!-- Full Name & Avatar -->
              <td class="py-3">
                <div class="d-flex align-center gap-2">
                  <div
                    v-if="u.avatarUrl"
                    class="rounded-full overflow-hidden flex-shrink-0"
                    style="width: 2.25rem; height: 2.25rem;"
                  >
                    <img :src="u.avatarUrl" alt="avatar" class="w-full h-full object-cover" />
                  </div>
                  <div
                    v-else
                    class="avatar-circle rounded-full d-flex align-center justify-center font-bold text-xs flex-shrink-0"
                    style="width: 2.25rem; height: 2.25rem; background: var(--primary-tonal, rgba(99,102,241,0.15)); color: var(--primary);"
                  >
                    {{ (u.fullname || u.username || 'U').charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-semibold text-body text-xs">{{ u.fullname }}</div>
                    <div class="text-2xs text-muted">{{ u.email }}</div>
                  </div>
                </div>
              </td>

              <!-- Username & Auth Provider -->
              <td class="py-3 text-secondary text-xs">
                <div class="font-mono">@{{ u.username || 'N/A' }}</div>
                <div class="text-2xs text-muted mt-0.5">
                  Provider: <span class="badge badge-xs badge-tonal-neutral font-mono">{{ u.authProvider || 'local' }}</span>
                </div>
              </td>

              <!-- authPosition -->
              <td class="py-3 text-center">
                <span
                  :class="[
                    'badge badge-xs font-mono text-uppercase',
                    u.authPosition === 'admin'
                      ? 'badge-tonal-danger'
                      : u.authPosition === 'owner'
                      ? 'badge-tonal-primary'
                      : 'badge-tonal-neutral'
                  ]"
                >
                  {{ u.authPosition }}
                </span>
              </td>

              <!-- Status -->
              <td class="py-3 text-center">
                <span
                  :class="[
                    'badge badge-xs text-uppercase',
                    u.status === 'active'
                      ? 'badge-tonal-success'
                      : u.status === 'pending'
                      ? 'badge-tonal-warning'
                      : 'badge-tonal-danger'
                  ]"
                >
                  {{ u.status }}
                </span>
              </td>

              <!-- Events Count -->
              <td class="py-3 text-center">
                <span class="badge badge-xs badge-tonal-primary font-mono">{{ u.eventsCount }}</span>
              </td>

              <!-- Registered Date -->
              <td class="py-3 text-center font-mono text-xs text-secondary">
                {{ formatDate(u.createdAt) }}
              </td>

              <!-- Actions -->
              <td class="py-3 text-end">
                <button
                  class="btn btn-xs btn-tonal-neutral"
                  @click="openEditModal(u)"
                  title="Edit Role & Status"
                >
                  ⚙️ Manage
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </JCard>

    <!-- Role & Status Edit Modal -->
    <div
      v-if="isEditModalOpen && selectedUser"
      class="modal-backdrop-custom d-flex align-center justify-center p-3"
      style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999;"
      @click.self="closeEditModal"
    >
      <div
        class="modal-card rounded-2xl border border-subtle shadow-lg p-4 p-md-5 d-flex flex-column gap-3"
        style="width: 100%; max-width: 440px; background: var(--bg-surface);"
      >
        <div class="d-flex align-center justify-between border-bottom border-subtle pb-3">
          <div>
            <h3 class="text-base font-bold mb-0">Manage User Account</h3>
            <span class="text-xs text-muted">{{ selectedUser.fullname }} ({{ selectedUser.email }})</span>
          </div>
          <button class="btn btn-icon btn-xs btn-tonal-neutral" @click="closeEditModal">✕</button>
        </div>

        <form @submit.prevent="handleUpdateUser" class="d-flex flex-column gap-3">
          <div>
            <label class="text-xs font-semibold d-block mb-1">Auth Position (Role)</label>
            <select
              v-model="editForm.authPosition"
              class="input input-sm border border-subtle rounded-lg px-3 py-2 text-sm w-full"
              style="background: var(--bg-surface-tonal);"
            >
              <option value="admin">Admin (Full System Access)</option>
              <option value="owner">Owner (Store / Event Creator)</option>
              <option value="ordinary">Ordinary (Guest Access)</option>
            </select>
            <span class="text-2xs text-muted d-block mt-1">
              Controls workspace navigation and permissions.
            </span>
          </div>

          <div>
            <label class="text-xs font-semibold d-block mb-1">Account Status</label>
            <select
              v-model="editForm.status"
              class="input input-sm border border-subtle rounded-lg px-3 py-2 text-sm w-full"
              style="background: var(--bg-surface-tonal);"
            >
              <option value="active">Active (Full access permitted)</option>
              <option value="pending">Pending (Awaiting onboarding/verification)</option>
              <option value="banned">Banned (Access denied)</option>
            </select>
          </div>

          <div class="d-flex align-center justify-end gap-2 pt-3 border-top border-subtle">
            <button type="button" class="btn btn-sm btn-tonal-neutral" @click="closeEditModal">Cancel</button>
            <button type="submit" class="btn btn-sm btn-primary" :disabled="updatingUser">
              {{ updatingUser ? 'Saving...' : 'Update Account' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-2xs {
  font-size: 0.725rem;
}
</style>
