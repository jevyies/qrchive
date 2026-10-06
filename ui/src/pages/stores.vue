<script setup>
import { ref, onMounted, computed } from 'vue'
import { axiosInstance } from '../plugins/axios'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const stores = ref([])
const usersList = ref([])
const loading = ref(true)
const error = ref(null)
const searchQuery = ref('')

// Modal State
const isModalOpen = ref(false)
const modalMode = ref('create') // 'create' | 'edit'
const saving = ref(false)
const currentStore = ref({
  id: null,
  name: '',
  email: '',
  description: '',
  dateStarted: '',
  managerUserId: '',
})

// Delete State
const deletingStoreId = ref(null)

const fetchStores = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await axiosInstance.get('/api/admin/stores')
    if (res.data?.stores) {
      stores.value = res.data.stores
    }
  } catch (err) {
    console.error('Failed to load stores:', err)
    error.value = err.data?.message || err.message || 'Failed to retrieve stores'
  } finally {
    loading.value = false
  }
}

const fetchUsers = async () => {
  try {
    const res = await axiosInstance.get('/api/admin/users')
    if (res.data?.users) {
      usersList.value = res.data.users
    }
  } catch (err) {
    console.warn('Could not load users for dropdown:', err)
  }
}

onMounted(() => {
  fetchStores()
  fetchUsers()
})

const filteredStores = computed(() => {
  if (!searchQuery.value.trim()) return stores.value
  const q = searchQuery.value.toLowerCase()
  return stores.value.filter((s) => {
    const nameMatch = s.name?.toLowerCase().includes(q)
    const emailMatch = s.email?.toLowerCase().includes(q)
    const managerNameMatch = s.manager?.fullname?.toLowerCase().includes(q) || s.manager?.email?.toLowerCase().includes(q)
    return nameMatch || emailMatch || managerNameMatch
  })
})

const stats = computed(() => {
  const total = stores.value.length
  const assigned = stores.value.filter((s) => s.manager !== null).length
  const unassigned = total - assigned
  const totalEvents = stores.value.reduce((sum, s) => sum + (s.eventsCount || 0), 0)
  return { total, assigned, unassigned, totalEvents }
})

const openCreateModal = () => {
  modalMode.value = 'create'
  currentStore.value = {
    id: null,
    name: '',
    email: '',
    description: '',
    dateStarted: new Date().toISOString().split('T')[0],
    managerUserId: '',
  }
  isModalOpen.value = true
}

const openEditModal = (store) => {
  modalMode.value = 'edit'
  currentStore.value = {
    id: store.id,
    name: store.name || '',
    email: store.email || '',
    description: store.description || '',
    dateStarted: store.dateStarted || '',
    managerUserId: store.manager?.id || '',
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const handleSaveStore = async () => {
  if (!currentStore.value.name || !currentStore.value.email) {
    alert('Please enter both store name and email address.')
    return
  }

  saving.value = true
  try {
    const payload = {
      name: currentStore.value.name,
      email: currentStore.value.email,
      description: currentStore.value.description,
      dateStarted: currentStore.value.dateStarted,
      managerUserId: currentStore.value.managerUserId ? Number(currentStore.value.managerUserId) : null,
    }

    if (modalMode.value === 'create') {
      await axiosInstance.post('/api/admin/stores', payload)
    } else {
      await axiosInstance.put(`/api/admin/stores/${currentStore.value.id}`, payload)
    }

    closeModal()
    await fetchStores()
  } catch (err) {
    console.error('Error saving store:', err)
    alert(err.data?.message || err.message || 'Failed to save store.')
  } finally {
    saving.value = false
  }
}

const handleDeleteStore = async (store) => {
  if (!confirm(`Are you sure you want to delete store "${store.name}"? This action cannot be undone.`)) {
    return
  }

  deletingStoreId.value = store.id
  try {
    await axiosInstance.delete(`/api/admin/stores/${store.id}`)
    await fetchStores()
  } catch (err) {
    console.error('Failed to delete store:', err)
    alert(err.data?.message || err.message || 'Failed to delete store.')
  } finally {
    deletingStoreId.value = null
  }
}
</script>

<template>
  <div class="d-flex flex-column gap-4">
    <!-- Header -->
    <div class="d-flex flex-column flex-md-row align-start align-md-center justify-between gap-3">
      <div>
        <div class="d-flex align-center gap-2 mb-1 flex-wrap">
          <span style="font-size: 1.5rem;">🏬</span>
          <h1 class="text-xl font-bold mb-0">Store Management</h1>
          <span class="badge badge-xs badge-tonal-danger font-mono text-uppercase">Admin Only</span>
          <span class="badge badge-xs badge-tonal-neutral font-mono">Stores Table</span>
        </div>
        <p class="text-xs text-muted mb-0">
          Directory of registered stores, venue branches, and the user accounts assigned to manage each store.
        </p>
      </div>

      <div class="d-flex align-center gap-2 flex-wrap">
        <button
          class="btn btn-sm btn-tonal-neutral d-flex align-center gap-1 font-medium"
          @click="fetchStores"
          :disabled="loading"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
        <button class="btn btn-sm btn-primary d-flex align-center gap-2 font-semibold" @click="openCreateModal">
          <span>+</span>
          <span>Add New Store</span>
        </button>
      </div>
    </div>

    <!-- Store Summary KPIs -->
    <div class="d-grid grid-cols-1 grid-cols-sm-2 grid-cols-lg-4 gap-3">
      <div class="p-3 rounded-xl border border-subtle d-flex align-center justify-between" style="background: var(--bg-surface-tonal);">
        <div>
          <span class="text-xs text-secondary d-block mb-1">Total Stores</span>
          <div class="text-2xl font-black text-body">{{ stats.total }}</div>
        </div>
        <div class="text-2xl p-2 rounded-lg" style="background: var(--bg-surface);">🏬</div>
      </div>

      <div class="p-3 rounded-xl border border-subtle d-flex align-center justify-between" style="background: var(--bg-surface-tonal);">
        <div>
          <span class="text-xs text-secondary d-block mb-1">Managed Stores</span>
          <div class="text-2xl font-black text-success">{{ stats.assigned }}</div>
        </div>
        <div class="text-2xl p-2 rounded-lg" style="background: var(--bg-surface);">👤</div>
      </div>

      <div class="p-3 rounded-xl border border-subtle d-flex align-center justify-between" style="background: var(--bg-surface-tonal);">
        <div>
          <span class="text-xs text-secondary d-block mb-1">Unassigned Stores</span>
          <div class="text-2xl font-black text-warning">{{ stats.unassigned }}</div>
        </div>
        <div class="text-2xl p-2 rounded-lg" style="background: var(--bg-surface);">⚠️</div>
      </div>

      <div class="p-3 rounded-xl border border-subtle d-flex align-center justify-between" style="background: var(--bg-surface-tonal);">
        <div>
          <span class="text-xs text-secondary d-block mb-1">Associated Events</span>
          <div class="text-2xl font-black text-primary">{{ stats.totalEvents }}</div>
        </div>
        <div class="text-2xl p-2 rounded-lg" style="background: var(--bg-surface);">📅</div>
      </div>
    </div>

    <!-- Error Notice -->
    <div v-if="error" class="p-3 rounded-lg border border-danger bg-danger-subtle text-danger d-flex align-center justify-between">
      <div class="d-flex align-center gap-2">
        <span>⚠️</span>
        <span class="text-sm">{{ error }}</span>
      </div>
      <button class="btn btn-xs btn-tonal-danger" @click="fetchStores">Retry</button>
    </div>

    <!-- Stores Table Card -->
    <JCard variant="bordered" body-class="p-4">
      <!-- Search and Header Toolbar -->
      <div class="d-flex flex-column flex-md-row align-start align-md-center justify-between gap-3 mb-3">
        <div>
          <h2 class="text-base font-bold mb-0">Registered Stores ({{ filteredStores.length }})</h2>
          <p class="text-xs text-muted mb-0">Listing of all stores and the user managing them</p>
        </div>

        <div class="d-flex align-center gap-2 w-full w-md-auto">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search stores or managers..."
            class="input input-sm border border-subtle rounded-lg px-3 py-1 text-xs w-full"
            style="min-width: 240px; background: var(--bg-surface);"
          />
        </div>
      </div>

      <div class="table-responsive">
        <table class="table w-full text-sm">
          <thead>
            <tr class="border-bottom border-subtle text-muted text-xs text-uppercase">
              <th class="py-2 text-start">Store Details</th>
              <th class="py-2 text-start">Managing User (Manager)</th>
              <th class="py-2 text-center">User Role</th>
              <th class="py-2 text-center">Date Started</th>
              <th class="py-2 text-center">Events</th>
              <th class="py-2 text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="py-4 text-center text-muted">Loading stores from database...</td>
            </tr>
            <tr v-else-if="filteredStores.length === 0">
              <td colspan="6" class="py-4 text-center text-muted">
                No stores found{{ searchQuery ? ' matching your search' : '' }}.
              </td>
            </tr>
            <tr v-for="store in filteredStores" :key="store.id" class="border-bottom border-subtle">
              <!-- Store Details -->
              <td class="py-3">
                <div class="font-semibold text-body">{{ store.name }}</div>
                <div class="text-2xs text-muted">{{ store.email }}</div>
                <div v-if="store.description" class="text-2xs text-secondary mt-1">{{ store.description }}</div>
              </td>

              <!-- Managing User (The user who manages it) -->
              <td class="py-3">
                <div v-if="store.manager" class="d-flex align-center gap-2">
                  <div
                    class="avatar-circle rounded-full d-flex align-center justify-center font-bold text-xs"
                    style="width: 2rem; height: 2rem; background: var(--primary-tonal, rgba(99,102,241,0.15)); color: var(--primary);"
                  >
                    {{ (store.manager.fullname || store.manager.username || 'U').charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-semibold text-xs">{{ store.manager.fullname }}</div>
                    <div class="text-2xs text-muted">{{ store.manager.email }}</div>
                    <div class="text-2xs text-secondary font-mono">@{{ store.manager.username }}</div>
                  </div>
                </div>
                <div v-else>
                  <span class="badge badge-xs badge-tonal-warning font-mono">No Manager Assigned</span>
                </div>
              </td>

              <!-- User Role & Status -->
              <td class="py-3 text-center">
                <div v-if="store.manager" class="d-flex flex-column align-center gap-1">
                  <span
                    :class="[
                      'badge badge-xs font-mono text-uppercase',
                      store.manager.authPosition === 'admin'
                        ? 'badge-tonal-danger'
                        : store.manager.authPosition === 'owner'
                        ? 'badge-tonal-primary'
                        : 'badge-tonal-neutral'
                    ]"
                  >
                    {{ store.manager.authPosition }}
                  </span>
                  <span
                    :class="[
                      'badge badge-xs',
                      store.manager.status === 'active' ? 'badge-tonal-success' : 'badge-tonal-warning'
                    ]"
                  >
                    {{ store.manager.status }}
                  </span>
                </div>
                <div v-else class="text-muted text-xs">—</div>
              </td>

              <!-- Date Started -->
              <td class="py-3 text-center font-mono text-xs text-secondary">
                {{ store.dateStarted || 'N/A' }}
              </td>

              <!-- Events Count -->
              <td class="py-3 text-center">
                <span class="badge badge-xs badge-tonal-primary font-mono">{{ store.eventsCount }}</span>
              </td>

              <!-- Actions -->
              <td class="py-3 text-end">
                <button
                  class="btn btn-xs btn-tonal-neutral me-1"
                  @click="openEditModal(store)"
                  title="Edit Store"
                >
                  Edit
                </button>
                <button
                  class="btn btn-xs btn-tonal-danger"
                  :disabled="deletingStoreId === store.id"
                  @click="handleDeleteStore(store)"
                  title="Delete Store"
                >
                  {{ deletingStoreId === store.id ? 'Deleting...' : 'Delete' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </JCard>

    <!-- Create / Edit Store Modal -->
    <div
      v-if="isModalOpen"
      class="modal-backdrop-custom d-flex align-center justify-center p-3"
      style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999;"
      @click.self="closeModal"
    >
      <div
        class="modal-card rounded-2xl border border-subtle shadow-lg p-4 p-md-5 d-flex flex-column gap-3"
        style="width: 100%; max-width: 500px; background: var(--bg-surface);"
      >
        <div class="d-flex align-center justify-between border-bottom border-subtle pb-3">
          <h3 class="text-base font-bold mb-0">
            {{ modalMode === 'create' ? '🏬 Add New Store' : '✏️ Edit Store' }}
          </h3>
          <button class="btn btn-icon btn-xs btn-tonal-neutral" @click="closeModal">✕</button>
        </div>

        <form @submit.prevent="handleSaveStore" class="d-flex flex-column gap-3">
          <div>
            <label class="text-xs font-semibold d-block mb-1">Store Name *</label>
            <input
              v-model="currentStore.name"
              type="text"
              required
              class="input input-sm border border-subtle rounded-lg px-3 py-2 text-sm w-full"
              placeholder="e.g. Downtown Bridal Studio"
              style="background: var(--bg-surface-tonal);"
            />
          </div>

          <div>
            <label class="text-xs font-semibold d-block mb-1">Store Email *</label>
            <input
              v-model="currentStore.email"
              type="email"
              required
              class="input input-sm border border-subtle rounded-lg px-3 py-2 text-sm w-full"
              placeholder="e.g. store@qrchive.com"
              style="background: var(--bg-surface-tonal);"
            />
          </div>

          <div>
            <label class="text-xs font-semibold d-block mb-1">Description</label>
            <textarea
              v-model="currentStore.description"
              rows="2"
              class="input input-sm border border-subtle rounded-lg px-3 py-2 text-sm w-full"
              placeholder="Optional notes or address details"
              style="background: var(--bg-surface-tonal);"
            ></textarea>
          </div>

          <div class="d-grid grid-cols-1 grid-cols-sm-2 gap-3">
            <div>
              <label class="text-xs font-semibold d-block mb-1">Date Started</label>
              <input
                v-model="currentStore.dateStarted"
                type="date"
                class="input input-sm border border-subtle rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--bg-surface-tonal);"
              />
            </div>

            <div>
              <label class="text-xs font-semibold d-block mb-1">Managing User</label>
              <select
                v-model="currentStore.managerUserId"
                class="input input-sm border border-subtle rounded-lg px-3 py-2 text-sm w-full"
                style="background: var(--bg-surface-tonal);"
              >
                <option value="">-- No Manager Assigned --</option>
                <option v-for="u in usersList" :key="u.id" :value="u.id">
                  {{ u.fullname }} ({{ u.email }}) [{{ u.authPosition }}]
                </option>
              </select>
            </div>
          </div>

          <div class="d-flex align-center justify-end gap-2 pt-3 border-top border-subtle">
            <button type="button" class="btn btn-sm btn-tonal-neutral" @click="closeModal">Cancel</button>
            <button type="submit" class="btn btn-sm btn-primary" :disabled="saving">
              {{ saving ? 'Saving...' : modalMode === 'create' ? 'Create Store' : 'Save Changes' }}
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
