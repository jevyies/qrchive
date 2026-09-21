<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const guestList = ref([
  { id: '1', name: 'Eleanor Vance', table: 'Table 1 - Head Table', rsvp: 'Attending', diet: 'Vegetarian' },
  { id: '2', name: 'Marcus Brody', table: 'Table 2 - Rose Garden', rsvp: 'Attending', diet: 'Standard' },
  { id: '3', name: 'Clara Oswald', table: 'Table 2 - Rose Garden', rsvp: 'Declined', diet: 'None' },
  { id: '4', name: 'Rory Williams', table: 'Table 3 - Moonlight', rsvp: 'Attending', diet: 'Gluten-Free' },
])
</script>

<template>
  <div class="d-flex flex-column gap-4">
    <!-- Header -->
    <div class="d-flex flex-column flex-md-row align-start align-md-center justify-between gap-3">
      <div>
        <div class="d-flex align-center gap-2 mb-1">
          <span style="font-size: 1.5rem;">📋</span>
          <h1 class="text-xl font-bold mb-0">Guest List & RSVPs</h1>
          <span class="badge badge-xs badge-tonal-info font-mono text-uppercase">Ordinary Access</span>
        </div>
        <p class="text-xs text-muted mb-0">
          View guest attendance, seating reservations, meal preferences, and invitation statuses.
        </p>
      </div>

      <div class="d-flex align-center gap-2">
        <button class="btn btn-sm btn-primary d-flex align-center gap-2">
          <span>+</span>
          <span>Add Guest</span>
        </button>
      </div>
    </div>

    <!-- Guests Table Card -->
    <JCard variant="bordered" body-class="p-4">
      <div class="d-flex align-center justify-between mb-3">
        <h2 class="text-base font-bold mb-0">Confirmed Guests ({{ guestList.length }})</h2>
        <span class="badge badge-xs badge-tonal-neutral font-mono">Role: {{ authStore.authPosition }}</span>
      </div>

      <div class="table-responsive">
        <table class="table w-full text-sm">
          <thead>
            <tr class="border-bottom border-subtle text-muted text-xs text-uppercase">
              <th class="py-2 text-start">Guest Name</th>
              <th class="py-2 text-start">Assigned Table</th>
              <th class="py-2 text-center">RSVP Status</th>
              <th class="py-2 text-center">Dietary Preference</th>
              <th class="py-2 text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in guestList" :key="g.id" class="border-bottom border-subtle">
              <td class="py-3 font-semibold">{{ g.name }}</td>
              <td class="py-3 text-secondary">{{ g.table }}</td>
              <td class="py-3 text-center">
                <span :class="['badge badge-xs', g.rsvp === 'Attending' ? 'badge-tonal-success' : 'badge-tonal-danger']">
                  {{ g.rsvp }}
                </span>
              </td>
              <td class="py-3 text-center">
                <span class="badge badge-xs badge-tonal-neutral">{{ g.diet }}</span>
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
