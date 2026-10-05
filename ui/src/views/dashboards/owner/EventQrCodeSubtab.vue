<script setup>
const props = defineProps({
  eventCode: {
    type: String,
    required: true,
  },
  coupleNames: {
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
  qrSvg: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['download-qr', 'copy-url'])
</script>

<template>
  <div class="event-subtab-qrcode">
    <div class="event-qr-grid">
      <!-- Scannable Placard Mockup Card -->
      <div class="event-qr-mockup-wrap">
        <div class="event-qr-placard">
          <div class="event-qr-placard__inner">
            <span class="event-qr-placard__subheading">Welcome to the celebration of</span>
            <h3 class="event-qr-placard__couple">{{ coupleNames }}</h3>
            <p class="event-qr-placard__date">{{ formattedEventDate }}</p>

            <!-- Central QR Code -->
            <div class="event-qr-placard__svg-wrap">
              <div v-if="qrSvg" class="event-qr-code-display" v-html="qrSvg"></div>
              <div v-else class="event-qr-loading">
                <span class="material-symbols-outlined spinning">progress_activity</span>
              </div>
            </div>

            <p class="event-qr-placard__instruction">
              Scan with your camera to upload reception photos instantly — no app required.
            </p>
            <span class="event-qr-placard__link">{{ hostOrigin }}/event/{{ eventCode }}</span>
          </div>
        </div>
      </div>

      <!-- Download & Access Info -->
      <div class="event-qr-info">
        <div class="event-qr-info__header">
          <span class="event-qr-info__badge">Effortless Guest Participation</span>
          <h2 class="event-qr-info__title">Live Guest Access QR Pass</h2>
          <p class="event-qr-info__desc">
            Every guest can easily scan this QR code from their mobile cameras.
            Zero app download or account creation required for instant uploads.
          </p>
        </div>

        <!-- Action Button -->
        <div>
          <button
            type="button"
            class="event-detail__action-btn event-detail__action-btn--primary"
            @click="emit('download-qr')"
          >
            <span class="material-symbols-outlined" style="font-size: 1.05rem;">download</span>
            <span>Download QR Code</span>
          </button>
        </div>

        <!-- Direct URL Copy Box -->
        <div class="event-qr-direct-box">
          <div class="event-qr-direct-link">
            <span class="material-symbols-outlined link-icon">link</span>
            <span>{{ hostOrigin }}/event/{{ eventCode }}</span>
          </div>
          <button
            type="button"
            class="event-detail__action-btn event-detail__action-btn--tonal"
            @click="emit('copy-url')"
          >
            Copy Direct URL
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.event-subtab-qrcode {
  width: 100%;
}
</style>
