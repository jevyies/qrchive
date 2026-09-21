<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// Guest specific stats
const guestStats = ref([
  { label: 'Event Date', value: 'Oct 24, 2026', desc: '36 Days to Ceremony', icon: '📅' },
  { label: 'My Table', value: 'Table 1', desc: 'VIP Head Table', icon: '🍽️' },
  { label: 'RSVP Status', value: 'Confirmed', desc: 'Attending (+1 Guest)', icon: '✅' },
  { label: 'Photos Uploaded', value: '14 Photos', desc: 'In Reception Album', icon: '📸' },
])

// Day Timeline
const timeline = ref([
  { time: '3:00 PM', title: 'Ceremony Exchange', location: 'Rose Garden Gazebo', icon: '💍' },
  { time: '4:30 PM', title: 'Cocktail Hour', location: 'West Moonlight Terrace', icon: '🥂' },
  { time: '6:00 PM', title: 'Grand Banquet Dinner', location: 'Grand Ballroom', icon: '🍽️' },
  { time: '8:00 PM', title: 'First Dance & Cake Cutting', location: 'Ballroom Center Stage', icon: '🎂' },
  { time: '10:00 PM', title: 'Sparkler Farewell', location: 'Courtyard Pavilion', icon: '✨' },
])

// Recent shared memories
const photoMemories = ref([
  { id: '1', title: 'Ceremony Ring Exchange', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop', likes: 42 },
  { id: '2', title: 'First Dance', url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&auto=format&fit=crop', likes: 58 },
  { id: '3', title: 'Champagne Toast', url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=400&auto=format&fit=crop', likes: 35 },
])

const navigateTo = (path) => {
  router.push(path)
}
</script>

<template>
  <div class="ordinary-dashboard d-flex flex-column gap-4">
    <!-- Guest Hero Welcome Banner -->
    <JCard variant="bordered" class="guest-hero" body-class="p-4 p-md-5">
      <div class="d-flex flex-column flex-lg-row align-start align-lg-center justify-between gap-4">
        <div class="d-flex align-center gap-3">
          <div class="stat-icon d-flex justify-center align-center rounded-2xl flex-shrink-0"
            style="width: 3.5rem; height: 3.5rem; font-size: 1.75rem; background: var(--primary-tonal, rgba(99,102,241,0.15)); border: 1px solid var(--primary);">
            🎉
          </div>
          <div>
            <div class="d-flex align-center gap-2 mb-1 flex-wrap">
              <h1 class="text-xl font-bold mb-0">Sophia & Alexander's Wedding</h1>
              <span class="badge badge-xs badge-tonal-info font-mono text-uppercase">Guest Portal</span>
              <span class="badge badge-xs badge-tonal-success font-mono">RSVP Confirmed</span>
            </div>
            <p class="text-xs text-secondary mb-0">
              Welcome, <strong class="text-body">{{ authStore.userFullname }}</strong>! Here is your personal wedding day guide, table placement, schedule, and live photo memories.
            </p>
          </div>
        </div>

        <!-- Guest Quick Actions -->
        <div class="d-flex align-center gap-2 flex-wrap">
          <button class="btn btn-sm btn-primary d-flex align-center gap-1 font-semibold" @click="navigateTo('/pictures')">
            <span>📸</span>
            <span>Upload Photos</span>
          </button>
          <button class="btn btn-sm btn-tonal-neutral d-flex align-center gap-1 font-medium" @click="navigateTo('/tables')">
            <span>🍽️</span>
            <span>View My Table</span>
          </button>
          <button class="btn btn-sm btn-tonal-neutral d-flex align-center gap-1 font-medium" @click="navigateTo('/guests')">
            <span>📋</span>
            <span>Guest List</span>
          </button>
        </div>
      </div>

      <!-- Guest KPI / Info Ribbon -->
      <div class="d-grid grid-cols-1 grid-cols-sm-2 grid-cols-lg-4 gap-3 mt-4 pt-3 border-top border-subtle">
        <div v-for="(stat, idx) in guestStats" :key="idx"
          class="p-3 rounded-xl border border-subtle d-flex align-center justify-between"
          style="background: var(--bg-surface-tonal);">
          <div>
            <span class="text-xs text-secondary d-block mb-1">{{ stat.label }}</span>
            <div class="text-lg font-bold text-body mb-1">{{ stat.value }}</div>
            <span class="text-xs text-muted">{{ stat.desc }}</span>
          </div>
          <div class="text-2xl p-2 rounded-lg" style="background: var(--bg-surface);">
            {{ stat.icon }}
          </div>
        </div>
      </div>
    </JCard>

    <!-- Main Content: Wedding Schedule & Photo Highlights -->
    <div class="d-grid grid-cols-1 grid-cols-xl-3 gap-4">
      <!-- Wedding Day Schedule (2 Columns) -->
      <div class="grid-col-1 grid-col-xl-2 d-flex flex-column gap-4">
        <JCard variant="bordered" body-class="p-4">
          <div class="d-flex align-center justify-between mb-3">
            <div>
              <h2 class="text-base font-bold mb-1 d-flex align-center gap-2">
                <span>🗓️</span>
                <span>Wedding Itinerary & Timeline</span>
              </h2>
              <p class="text-xs text-muted mb-0">Saturday, October 24, 2026 · Grand Plaza Ballroom</p>
            </div>
            <span class="badge badge-xs badge-tonal-primary font-mono">Formal Attire</span>
          </div>

          <div class="timeline-list d-flex flex-column gap-3 mt-2">
            <div v-for="(item, idx) in timeline" :key="idx"
              class="p-3 rounded-xl border border-subtle d-flex align-center justify-between gap-3"
              style="background: var(--bg-surface-tonal);">
              <div class="d-flex align-center gap-3">
                <span class="text-xl p-2 rounded-lg bg-surface">{{ item.icon }}</span>
                <div>
                  <h3 class="text-sm font-bold mb-0 text-body">{{ item.title }}</h3>
                  <span class="text-xs text-secondary">📍 {{ item.location }}</span>
                </div>
              </div>
              <span class="badge badge-sm badge-tonal-neutral font-mono font-bold">{{ item.time }}</span>
            </div>
          </div>
        </JCard>

        <!-- Seating & Dining Information Card -->
        <JCard variant="bordered" body-class="p-4">
          <div class="d-flex align-center justify-between mb-3">
            <h2 class="text-base font-bold mb-0 d-flex align-center gap-2">
              <span>🍽️</span>
              <span>Your Seating & Dining Placement</span>
            </h2>
            <button class="btn btn-xs btn-tonal-primary" @click="navigateTo('/tables')">
              Open Seating Plan →
            </button>
          </div>

          <div class="p-3 rounded-xl border border-subtle d-flex flex-column flex-sm-row align-start align-sm-center justify-between gap-3"
            style="background: var(--bg-surface-tonal);">
            <div>
              <div class="text-base font-bold text-primary mb-1">Table 1 - VIP Head Table</div>
              <div class="text-xs text-secondary mb-1">📍 Stage Center · East Wing Promenade</div>
              <div class="text-xs text-muted">Table mates: Marcus Brody, Clara Oswald, Eleanor Vance</div>
            </div>
            <div class="d-flex flex-column align-end gap-1">
              <span class="badge badge-xs badge-tonal-success font-mono">Dietary: Vegetarian</span>
              <span class="badge badge-xs badge-tonal-neutral font-mono">Seat Assigned</span>
            </div>
          </div>
        </JCard>
      </div>

      <!-- Photo Memories & Upload (1 Column) -->
      <div class="d-flex flex-column gap-4">
        <JCard variant="bordered" body-class="p-4 d-flex flex-column gap-3">
          <div class="d-flex align-center justify-between">
            <h2 class="text-base font-bold mb-0 d-flex align-center gap-2">
              <span>📸</span>
              <span>Shared Memories</span>
            </h2>
            <button class="btn btn-xs btn-tonal-primary" @click="navigateTo('/pictures')">
              View All →
            </button>
          </div>

          <p class="text-xs text-muted mb-0">
            Snapshots and moments captured by wedding guests and photographers.
          </p>

          <div class="d-grid grid-cols-1 gap-2 mt-1">
            <div v-for="p in photoMemories" :key="p.id"
              class="rounded-xl overflow-hidden border border-subtle position-relative">
              <img :src="p.url" :alt="p.title" style="width: 100%; height: 110px; object-fit: cover;" />
              <div class="p-2 d-flex align-center justify-between text-xs bg-surface border-top border-subtle">
                <span class="font-semibold text-truncate">{{ p.title }}</span>
                <span class="badge badge-xs badge-tonal-primary font-mono">❤️ {{ p.likes }}</span>
              </div>
            </div>
          </div>

          <div class="mt-2 pt-2 border-top border-subtle">
            <button class="btn btn-sm btn-primary w-full d-flex align-center justify-center gap-2"
              @click="navigateTo('/pictures')">
              <span>📤</span>
              <span>Upload Your Wedding Photos</span>
            </button>
          </div>
        </JCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ordinary-dashboard {
  width: 100%;
}
</style>
