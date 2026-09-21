<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const weddings = ref([
  { id: '1', couple: 'Sophia & Alexander', date: '2026-10-24', guests: 120, venue: 'Grand Plaza Hall', status: 'Upcoming' },
  { id: '2', couple: 'Emily & James', date: '2026-11-15', guests: 85, venue: 'Rose Garden Estate', status: 'Planning' },
  { id: '3', couple: 'Olivia & Liam', date: '2026-08-10', guests: 150, venue: 'Seaside Pavilion', status: 'Completed' },
])
</script>

<template>
  <div class="d-flex flex-column gap-4">
    <!-- Header -->
    <div class="d-flex flex-column flex-md-row align-start align-md-center justify-between gap-3">
      <div>
        <div class="d-flex align-center gap-2 mb-1">
          <span style="font-size: 1.5rem;">💍</span>
          <h1 class="text-xl font-bold mb-0">Weddings Overview</h1>
          <span class="badge badge-xs badge-tonal-primary font-mono text-uppercase">Owner Access</span>
        </div>
        <p class="text-xs text-muted mb-0">
          Track and orchestrate wedding ceremonies, guest tallies, schedules, and venue bookings.
        </p>
      </div>

      <div class="d-flex align-center gap-2">
        <button class="btn btn-sm btn-primary d-flex align-center gap-2">
          <span>+</span>
          <span>Create Wedding</span>
        </button>
      </div>
    </div>

    <!-- Weddings Grid -->
    <div class="d-grid grid-cols-1 grid-cols-md-3 gap-3">
      <JCard v-for="w in weddings" :key="w.id" variant="bordered" body-class="p-4 d-flex flex-column justify-between gap-3">
        <div>
          <div class="d-flex align-center justify-between mb-2">
            <span class="text-xs text-muted font-mono">{{ w.date }}</span>
            <span :class="['badge badge-xs', w.status === 'Upcoming' ? 'badge-tonal-primary' : w.status === 'Planning' ? 'badge-tonal-warning' : 'badge-tonal-success']">
              {{ w.status }}
            </span>
          </div>
          <h3 class="text-base font-bold mb-1">{{ w.couple }}</h3>
          <p class="text-xs text-secondary mb-0">📍 {{ w.venue }}</p>
        </div>

        <div class="pt-3 border-top border-subtle d-flex align-center justify-between text-xs">
          <span class="text-muted">👥 {{ w.guests }} Guests</span>
          <button class="btn btn-xs btn-tonal-neutral">View Details</button>
        </div>
      </JCard>
    </div>
  </div>
</template>
