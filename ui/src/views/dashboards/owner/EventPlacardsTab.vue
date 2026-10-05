<script setup>
import { ref } from 'vue'

const props = defineProps({
  eventCode: {
    type: String,
    required: true,
  },
  eventTitle: {
    type: String,
    default: '',
  },
  coupleNames: {
    type: String,
    default: '',
  },
  coupleInitials: {
    type: String,
    default: '',
  },
  formattedEventDate: {
    type: String,
    default: '',
  },
  hostOrigin: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['action'])

// Selected placard style: 'gold' | 'minimalist' | 'botanical' | 'romance'
const selectedPlacard = ref('gold')
</script>

<template>
  <div class="event-detail__tab-body">
    <div class="event-placards__header">
      <div class="event-placards__title-group">
        <span class="event-albums__subtitle">Atelier Print Studio</span>
        <h2 class="event-placards__title">5×7" Table Placard Templates</h2>
        <p class="event-placards__desc">
          Choose from our pre-formatted, print-ready 5×7 inch table placard designs. Pre-calculated with professional 1/8" bleed margins for effortless home printing or luxury stationary ateliers.
        </p>
      </div>

      <button
        type="button"
        class="event-detail__action-btn event-detail__action-btn--primary"
        style="flex-shrink: 0;"
        @click="emit('action', `Generating print-ready PDF for ${selectedPlacard} style...`, 'success')"
      >
        <span class="material-symbols-outlined" style="font-size: 1.05rem;">picture_as_pdf</span>
        <span>Download Selected 5×7" PDF</span>
      </button>
    </div>

    <!-- 4 Placard Designs Grid -->
    <div class="event-placards__grid">
      <!-- Style 1: Classic Gold Foil -->
      <div
        class="event-placard-card"
        :class="{ 'is-selected': selectedPlacard === 'gold' }"
        @click="selectedPlacard = 'gold'"
      >
        <div class="event-placard-sheet event-placard-sheet--gold">
          <span class="event-placard-check">
            <span class="material-symbols-outlined check-icon">check_circle</span>
          </span>

          <div class="event-placard-top">
            <p class="event-placard-sub">Table Celebration</p>
            <h4 class="event-placard-name">{{ coupleNames }}</h4>
            <div class="event-placard-divider"></div>
            <p class="event-placard-tagline">Capture our night through your lens.</p>
          </div>

          <div class="event-placard-qr-box">
            <span class="material-symbols-outlined placard-qr-icon">qr_code</span>
          </div>

          <div class="event-placard-bottom">
            <p class="event-placard-scan-text">Scan to add your photos to our vault</p>
            <span class="event-placard-url-text">{{ hostOrigin }}/event/{{ eventCode }}</span>
          </div>
        </div>

        <div class="event-placard-caption">
          <h5 class="event-placard-label">Classic Gold Foil</h5>
          <p class="event-placard-status">{{ selectedPlacard === 'gold' ? 'Selected Design' : 'Print-ready layout' }}</p>
        </div>
      </div>

      <!-- Style 2: Minimalist Modern -->
      <div
        class="event-placard-card"
        :class="{ 'is-selected': selectedPlacard === 'minimalist' }"
        @click="selectedPlacard = 'minimalist'"
      >
        <div class="event-placard-sheet event-placard-sheet--minimalist">
          <span class="event-placard-check">
            <span class="material-symbols-outlined check-icon">check_circle</span>
          </span>

          <div class="event-placard-top">
            <p class="event-placard-sub">Memory Archive</p>
            <h4 class="event-placard-name event-placard-name--dark">{{ coupleInitials }}</h4>
            <p class="event-placard-tagline" style="margin-top: 0.35rem;">{{ formattedEventDate }}</p>
          </div>

          <div class="event-placard-qr-box">
            <span class="material-symbols-outlined placard-qr-icon placard-qr-icon--dark">qr_code</span>
          </div>

          <div class="event-placard-bottom">
            <p class="event-placard-scan-text">Open Camera &amp; Scan</p>
          </div>
        </div>

        <div class="event-placard-caption">
          <h5 class="event-placard-label">Minimalist Modern</h5>
          <p class="event-placard-status">
            {{ selectedPlacard === 'minimalist' ? 'Selected Design' : 'Clean typographic layout' }}
          </p>
        </div>
      </div>

      <!-- Style 3: Botanical Arch -->
      <div
        class="event-placard-card"
        :class="{ 'is-selected': selectedPlacard === 'botanical' }"
        @click="selectedPlacard = 'botanical'"
      >
        <div class="event-placard-sheet event-placard-sheet--botanical">
          <span class="event-placard-check">
            <span class="material-symbols-outlined check-icon">check_circle</span>
          </span>

          <div class="botanical-arch-line"></div>

          <div class="event-placard-top">
            <p class="event-placard-sub">Celebrate With Us</p>
            <h4 class="event-placard-name event-placard-name--script">{{ coupleNames }}</h4>
          </div>

          <div class="event-placard-qr-box">
            <span class="material-symbols-outlined placard-qr-icon">qr_code</span>
          </div>

          <div class="event-placard-bottom">
            <p class="event-placard-tagline" style="font-size: 0.6875rem;">Share your favorite wedding snaps</p>
          </div>
        </div>

        <div class="event-placard-caption">
          <h5 class="event-placard-label">Botanical Arch</h5>
          <p class="event-placard-status">{{ selectedPlacard === 'botanical' ? 'Selected Design' : 'Romantic arched foil detail' }}</p>
        </div>
      </div>

      <!-- Style 4: Romance Script -->
      <div
        class="event-placard-card"
        :class="{ 'is-selected': selectedPlacard === 'romance' }"
        @click="selectedPlacard = 'romance'"
      >
        <div class="event-placard-sheet event-placard-sheet--romance">
          <span class="event-placard-check">
            <span class="material-symbols-outlined check-icon">check_circle</span>
          </span>

          <div class="event-placard-top">
            <h4 class="event-placard-name event-placard-name--script" style="font-size: 1.35rem;">Share the Love</h4>
            <p class="event-placard-sub" style="margin-top: 0.35rem;">{{ eventTitle }}</p>
          </div>

          <div class="event-placard-qr-box">
            <span class="material-symbols-outlined placard-qr-icon placard-qr-icon--dark">qr_code</span>
          </div>

          <div class="event-placard-bottom">
            <p class="event-placard-tagline" style="font-size: 0.6875rem;">Help us archive the evening</p>
          </div>
        </div>

        <div class="event-placard-caption">
          <h5 class="event-placard-label">Romance Script</h5>
          <p class="event-placard-status">
            {{ selectedPlacard === 'romance' ? 'Selected Design' : 'Editorial calligraphy focus' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
