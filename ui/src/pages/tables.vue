<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const tables = ref([
  { id: '1', name: 'Table 1 - VIP Head Table', capacity: 10, assigned: 8, location: 'Stage Center' },
  { id: '2', name: 'Table 2 - Rose Garden', capacity: 8, assigned: 8, location: 'East Wing' },
  { id: '3', name: 'Table 3 - Moonlight Terrace', capacity: 8, assigned: 6, location: 'West Patio' },
  { id: '4', name: 'Table 4 - Starlight Alcove', capacity: 8, assigned: 4, location: 'North Gallery' },
])
</script>

<template>
  <div class="d-flex flex-column gap-4">
    <!-- Header -->
    <div class="d-flex flex-column flex-md-row align-start align-md-center justify-between gap-3">
      <div>
        <div class="d-flex align-center gap-2 mb-1">
          <span style="font-size: 1.5rem;">🍽️</span>
          <h1 class="text-xl font-bold mb-0">Seating & Tables</h1>
          <span class="badge badge-xs badge-tonal-info font-mono text-uppercase">Ordinary Access</span>
        </div>
        <p class="text-xs text-muted mb-0">
          Manage reception table layouts, seat capacities, and guest placements.
        </p>
      </div>

      <div class="d-flex align-center gap-2">
        <button class="btn btn-sm btn-primary d-flex align-center gap-2">
          <span>+</span>
          <span>Add Table</span>
        </button>
      </div>
    </div>

    <!-- Tables Grid -->
    <div class="d-grid grid-cols-1 grid-cols-md-2 grid-cols-xl-4 gap-3">
      <JCard v-for="t in tables" :key="t.id" variant="bordered" body-class="p-4 d-flex flex-column justify-between gap-3">
        <div>
          <div class="d-flex align-center justify-between mb-2">
            <span class="badge badge-xs badge-tonal-primary font-mono">Capacity: {{ t.capacity }}</span>
            <span :class="['badge badge-xs', t.assigned >= t.capacity ? 'badge-tonal-danger' : 'badge-tonal-success']">
              {{ t.assigned >= t.capacity ? 'Full' : `${t.capacity - t.assigned} seats left` }}
            </span>
          </div>
          <h3 class="text-sm font-bold mb-1">{{ t.name }}</h3>
          <p class="text-xs text-secondary mb-0">📍 {{ t.location }}</p>
        </div>

        <div class="pt-3 border-top border-subtle d-flex align-center justify-between text-xs">
          <span class="font-semibold">{{ t.assigned }} / {{ t.capacity }} seated</span>
          <button class="btn btn-xs btn-tonal-neutral">Edit</button>
        </div>
      </JCard>
    </div>
  </div>
</template>
