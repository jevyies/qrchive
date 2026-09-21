<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const userList = ref([
  { id: '1', username: 'admin_sys', fullname: 'Root Administrator', email: 'admin@weddingdrive.com', authPosition: 'admin', status: 'Active' },
  { id: '2', username: 'owner_venue', fullname: 'Michael Johnson', email: 'michael@grandplaza.com', authPosition: 'owner', status: 'Active' },
  { id: '3', username: 'guest_guest1', fullname: 'Sarah Williams', email: 'sarah.w@example.com', authPosition: 'ordinary', status: 'Active' },
  { id: '4', username: 'new_registered', fullname: 'David Miller', email: 'david.m@example.com', authPosition: 'ordinary', status: 'Pending' },
])
</script>

<template>
  <div class="d-flex flex-column gap-4">
    <!-- Header -->
    <div class="d-flex flex-column flex-md-row align-start align-md-center justify-between gap-3">
      <div>
        <div class="d-flex align-center gap-2 mb-1">
          <span style="font-size: 1.5rem;">👥</span>
          <h1 class="text-xl font-bold mb-0">User Directory</h1>
          <span class="badge badge-xs badge-tonal-primary font-mono text-uppercase">Admin & Owner Access</span>
        </div>
        <p class="text-xs text-muted mb-0">
          Directory of registered accounts, role positions (<code class="text-primary">admin</code>, <code class="text-primary">owner</code>, <code class="text-primary">ordinary</code>), and authentication statuses.
        </p>
      </div>

      <div class="d-flex align-center gap-2">
        <button class="btn btn-sm btn-primary d-flex align-center gap-2">
          <span>+</span>
          <span>Invite User</span>
        </button>
      </div>
    </div>

    <!-- Users Table Card -->
    <JCard variant="bordered" body-class="p-4">
      <div class="d-flex align-center justify-between mb-3">
        <h2 class="text-base font-bold mb-0">All Users ({{ userList.length }})</h2>
        <span class="badge badge-xs badge-tonal-neutral font-mono">Current Position: {{ authStore.authPosition }}</span>
      </div>

      <div class="table-responsive">
        <table class="table w-full text-sm">
          <thead>
            <tr class="border-bottom border-subtle text-muted text-xs text-uppercase">
              <th class="py-2 text-start">Full Name</th>
              <th class="py-2 text-start">Username / Email</th>
              <th class="py-2 text-center">authPosition</th>
              <th class="py-2 text-center">Status</th>
              <th class="py-2 text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in userList" :key="u.id" class="border-bottom border-subtle">
              <td class="py-3 font-semibold">{{ u.fullname }}</td>
              <td class="py-3 text-secondary">
                <div>{{ u.username }}</div>
                <div class="text-xs text-muted">{{ u.email }}</div>
              </td>
              <td class="py-3 text-center">
                <span :class="[
                  'badge badge-xs font-mono text-uppercase',
                  u.authPosition === 'admin' ? 'badge-tonal-danger' : u.authPosition === 'owner' ? 'badge-tonal-primary' : 'badge-tonal-neutral'
                ]">
                  {{ u.authPosition }}
                </span>
              </td>
              <td class="py-3 text-center">
                <span :class="['badge badge-xs', u.status === 'Active' ? 'badge-tonal-success' : 'badge-tonal-warning']">
                  {{ u.status }}
                </span>
              </td>
              <td class="py-3 text-end">
                <button class="btn btn-xs btn-tonal-neutral me-1">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </JCard>
  </div>
</template>
