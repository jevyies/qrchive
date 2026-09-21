<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const stores = ref([
  { id: '1', name: 'Downtown Bridal Studio', location: 'New York, NY', weddingsCount: 14, status: 'Active' },
  { id: '2', name: 'West Coast Wedding Hub', location: 'San Francisco, CA', weddingsCount: 9, status: 'Active' },
  { id: '3', name: 'Southern Elegance Events', location: 'Austin, TX', weddingsCount: 6, status: 'Pending' },
])
</script>

<template>
  <div class="d-flex flex-column gap-4">
    <!-- Header -->
    <div class="d-flex flex-column flex-md-row align-start align-md-center justify-between gap-3">
      <div>
        <div class="d-flex align-center gap-2 mb-1">
          <span style="font-size: 1.5rem;">🏬</span>
          <h1 class="text-xl font-bold mb-0">Store Management</h1>
          <span class="badge badge-xs badge-tonal-danger font-mono text-uppercase">Admin Only</span>
        </div>
        <p class="text-xs text-muted mb-0">
          Manage branches, venues, and partner stores associated with the QRchive platform.
        </p>
      </div>

      <div class="d-flex align-center gap-2">
        <button class="btn btn-sm btn-primary d-flex align-center gap-2">
          <span>+</span>
          <span>Add New Store</span>
        </button>
      </div>
    </div>

    <!-- Stores Table Card -->
    <JCard variant="bordered" body-class="p-4">
      <div class="d-flex align-center justify-between mb-3">
        <h2 class="text-base font-bold mb-0">Registered Stores ({{ stores.length }})</h2>
        <span class="badge badge-xs badge-tonal-neutral font-mono">Role: {{ authStore.authPosition }}</span>
      </div>

      <div class="table-responsive">
        <table class="table w-full text-sm">
          <thead>
            <tr class="border-bottom border-subtle text-muted text-xs text-uppercase">
              <th class="py-2 text-start">Store Name</th>
              <th class="py-2 text-start">Location</th>
              <th class="py-2 text-center">Active Weddings</th>
              <th class="py-2 text-center">Status</th>
              <th class="py-2 text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="store in stores" :key="store.id" class="border-bottom border-subtle">
              <td class="py-3 font-semibold">{{ store.name }}</td>
              <td class="py-3 text-secondary">{{ store.location }}</td>
              <td class="py-3 text-center">
                <span class="badge badge-xs badge-tonal-primary font-mono">{{ store.weddingsCount }}</span>
              </td>
              <td class="py-3 text-center">
                <span :class="['badge badge-xs', store.status === 'Active' ? 'badge-tonal-success' : 'badge-tonal-warning']">
                  {{ store.status }}
                </span>
              </td>
              <td class="py-3 text-end">
                <button class="btn btn-xs btn-tonal-neutral me-1">Edit</button>
                <button class="btn btn-xs btn-tonal-danger">Remove</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </JCard>
  </div>
</template>
