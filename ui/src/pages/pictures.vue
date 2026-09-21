<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const photos = ref([
  { id: '1', title: 'Ceremony Ring Exchange', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop', likes: 42 },
  { id: '2', title: 'First Dance', url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&auto=format&fit=crop', likes: 58 },
  { id: '3', title: 'Champagne Toast', url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=600&auto=format&fit=crop', likes: 35 },
  { id: '4', title: 'Wedding Cake Cutting', url: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=600&auto=format&fit=crop', likes: 64 },
])
</script>

<template>
  <div class="d-flex flex-column gap-4">
    <!-- Header -->
    <div class="d-flex flex-column flex-md-row align-start align-md-center justify-between gap-3">
      <div>
        <div class="d-flex align-center gap-2 mb-1">
          <span style="font-size: 1.5rem;">🖼️</span>
          <h1 class="text-xl font-bold mb-0">Wedding Photo Gallery</h1>
          <span class="badge badge-xs badge-tonal-info font-mono text-uppercase">Ordinary Access</span>
        </div>
        <p class="text-xs text-muted mb-0">
          Explore uploaded wedding snapshots, ceremony memories, and reception albums.
        </p>
      </div>

      <div class="d-flex align-center gap-2">
        <button class="btn btn-sm btn-primary d-flex align-center gap-2">
          <span>+</span>
          <span>Upload Pictures</span>
        </button>
      </div>
    </div>

    <!-- Photo Gallery Grid -->
    <div class="d-grid grid-cols-1 grid-cols-sm-2 grid-cols-lg-4 gap-3">
      <JCard v-for="p in photos" :key="p.id" variant="bordered" class="overflow-hidden" body-class="p-0 d-flex flex-column">
        <div style="height: 180px; overflow: hidden;">
          <img
            :src="p.url"
            :alt="p.title"
            style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s ease;"
            class="hover-scale"
          />
        </div>
        <div class="p-3 d-flex align-center justify-between">
          <span class="font-semibold text-xs text-truncate">{{ p.title }}</span>
          <span class="badge badge-xs badge-tonal-primary font-mono">❤️ {{ p.likes }}</span>
        </div>
      </JCard>
    </div>
  </div>
</template>
