<script setup>
import { ref, computed } from 'vue'
import JModal from '@/@core/components/JModal.vue'
import JBtn from '@/@core/components/JBtn.vue'
import gcashImg from '@/assets/images/payments/gcash.jpg'
import maribankImg from '@/assets/images/payments/maribank.jpg'
import mayaImg from '@/assets/images/payments/maya.jpg'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  event: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:modelValue', 'close'])

const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}

// Payment Channels Configuration
const paymentMethods = [
  {
    id: 'gcash',
    name: 'GCash',
    image: gcashImg,
    badge: 'E-Wallet',
    badgeClass: 'gcash-badge',
    accountName: 'JE*Y A.',
    accountNumber: '0965 470 ••••',
  },
  {
    id: 'maribank',
    name: 'MariBank',
    image: maribankImg,
    badge: 'Digital Bank',
    badgeClass: 'maribank-badge',
    accountName: 'JEVY ABABA',
    accountNumber: '••••9646',
  },
  {
    id: 'maya',
    name: 'Maya',
    image: mayaImg,
    badge: 'E-Wallet / Bank',
    badgeClass: 'maya-badge',
    accountName: 'Jevy Ababa',
    accountNumber: '+63 ••• ••• 6349',
  },
]

// Zoom Lightbox State
const activeZoomImage = ref(null)
const openZoom = (method) => {
  activeZoomImage.value = method
}
const closeZoom = () => {
  activeZoomImage.value = null
}

// Helpers
const eventName = computed(() => {
  return props.event?.name || props.event?.title || 'Celebration Vault'
})

const formattedPrice = computed(() => {
  const p = props.event?.price
  if (!p) return null
  const num = typeof p === 'number' ? p : parseFloat(p)
  if (isNaN(num)) return `₱${p}`
  return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 0 })}`
})

const formattedEventDate = computed(() => {
  const dateStr = props.event?.eventDate || props.event?.event_date || props.event?.date
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
})
</script>

<template>
  <JModal :model-value="modelValue" :bottom-sheet-on-mobile="true" :show-close="false" max-width="860px"
    variant="elevated" modal-class="payment-modal-root" dialog-class="payment-modal-dialog"
    content-class="payment-modal-card" body-class="payment-modal-body p-0"
    @update:model-value="emit('update:modelValue', $event)" @close="handleClose">
    <div class="payment-modal-container" id="qrchive-payment-modal">
      <!-- Ambient Luxury Glow Highlights -->
      <div class="ambient-glow glow-top-right" aria-hidden="true"></div>
      <div class="ambient-glow glow-bottom-left" aria-hidden="true"></div>

      <!-- Floating Squircle Close Button -->
      <button type="button" id="close-payment-modal-btn" class="floating-close-squircle group" aria-label="Close dialog"
        @click="handleClose">
        <span class="material-symbols-outlined close-icon">close</span>
      </button>

      <!-- Header & Editorial Lead -->
      <div class="modal-header-section">
        <div class="archival-subbadge">
          <span class="material-symbols-outlined diamond-icon">payments</span>
          <span class="subbadge-text">Payment Settlement • QR Codes</span>
        </div>

        <h2 class="modal-headline">Scan to Complete Payment</h2>
        <p class="modal-editorial-lead">
          Scan any of the QR codes below using GCash, MariBank, or Maya to settle payment for your celebration vault.
        </p>
      </div>

      <!-- Event Particulars Summary Pill -->
      <div class="event-summary-banner">
        <div class="event-summary-info">
          <div class="event-summary-item">
            <span class="material-symbols-outlined summary-icon">celebration</span>
            <span class="summary-text">{{ eventName }}</span>
          </div>
          <div v-if="formattedEventDate" class="event-summary-divider">•</div>
          <div v-if="formattedEventDate" class="event-summary-item">
            <span class="material-symbols-outlined summary-icon">calendar_month</span>
            <span class="summary-text">{{ formattedEventDate }}</span>
          </div>
          <div v-if="formattedPrice" class="event-summary-divider">•</div>
          <div v-if="formattedPrice" class="event-summary-item">
            <span class="material-symbols-outlined summary-icon">receipt_long</span>
            <span class="summary-text amount-highlight">Amount: {{ formattedPrice }}</span>
          </div>
        </div>
        <div class="pending-pill">
          <span class="material-symbols-outlined pending-pill-icon">hourglass_top</span>
          <span>Pending Verification</span>
        </div>
      </div>

      <!-- 3 Payment QR Picture Cards Grid -->
      <div class="payment-channels-container">
        <div class="section-label-row">
          <span class="section-label">Available Payment Channels</span>
          <span class="section-hint">Tap any QR code to enlarge</span>
        </div>

        <div class="payment-grid">
          <div v-for="method in paymentMethods" :key="method.id" class="payment-channel-card"
            @click="openZoom(method)">
            <div class="payment-channel-header">
              <span class="payment-badge" :class="method.badgeClass">{{ method.name }}</span>
              <span class="payment-channel-type">{{ method.badge }}</span>
            </div>

            <div class="payment-img-frame">
              <img :src="method.image" :alt="`${method.name} Payment QR`" class="payment-img" />
              <div class="payment-img-zoom-hint">
                <span class="material-symbols-outlined">zoom_in</span>
                <span>Enlarge</span>
              </div>
            </div>

            <div class="payment-channel-info">
              <div class="payment-info-line">
                <span class="info-label">Account Name:</span>
                <span class="info-val">{{ method.accountName }}</span>
              </div>
              <div class="payment-info-line">
                <span class="info-label">Number / ID:</span>
                <span class="info-val font-mono">{{ method.accountNumber }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Verification Notice -->
      <div class="pending-notice-banner">
        <div class="pending-notice-icon-box">
          <span class="material-symbols-outlined pending-icon">verified_user</span>
        </div>
        <div class="pending-notice-body">
          <div class="pending-notice-title">Status: Pending Verification</div>
          <p class="pending-notice-desc">
            Your celebration vault is currently in <strong>pending</strong> status. Once your payment
            <template v-if="formattedPrice">of <strong>{{ formattedPrice }}</strong></template> is verified by our team, all vault and upload features will be unlocked immediately.
          </p>
        </div>
      </div>

      <!-- Full-Width Action Button -->
      <div class="modal-actions-row">
        <JBtn id="close-payment-qr-modal-btn" type="button" block class="submit-profile-btn width-full"
          @click="handleClose">
          <span class="material-symbols-outlined submit-arrow">check_circle</span>
          <span>I Have Sent Payment / Close</span>
        </JBtn>
      </div>

      <!-- Microcopy Footer -->
      <div class="modal-footer-microcopy">
        <span class="material-symbols-outlined lock-icon">shield</span>
        <span>Secure manual settlement verification for celebration archives.</span>
      </div>

      <!-- Lightbox Zoom for Payment QRs -->
      <Teleport to="body">
        <div v-if="activeZoomImage" class="qr-zoom-modal-overlay" @click="closeZoom">
          <div class="qr-zoom-modal-dialog" @click.stop>
            <button type="button" class="qr-zoom-close-btn" aria-label="Close Preview" @click="closeZoom">
              <span class="material-symbols-outlined">close</span>
            </button>
            <div class="qr-zoom-card">
              <div class="qr-zoom-title">{{ activeZoomImage.name }} QR Code</div>
              <div class="qr-zoom-img-wrapper">
                <img :src="activeZoomImage.image" :alt="`${activeZoomImage.name} QR Code`" class="qr-zoomed-img" />
              </div>
              <div class="qr-zoom-caption">
                <p class="qr-zoom-account-name">{{ activeZoomImage.accountName }}</p>
                <p class="qr-zoom-account-number">{{ activeZoomImage.accountNumber }}</p>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </JModal>
</template>

<style scoped lang="scss">
:deep(.payment-modal-card) {
  border-radius: 1.5rem !important;
  border: 1px solid var(--border-color, rgba(197, 160, 89, 0.25)) !important;
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.35), 0 0 32px rgba(119, 90, 25, 0.1) !important;
  background-color: var(--bg-surface, #ffffff) !important;
  color: var(--text-primary, #1f1b18) !important;
  position: relative;
  overflow: hidden;
  max-width: 860px;
  margin: 0 auto;

  @media (max-width: 640px) {
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
    border-top-left-radius: 1.5rem !important;
    border-top-right-radius: 1.5rem !important;
    max-width: 100vw !important;
  }
}

.payment-modal-container {
  position: relative;
  padding: 2rem 1.5rem;
  overflow: hidden;

  @media (min-width: 640px) {
    padding: 2.25rem 2.25rem;
  }
}

// ----------------------------------------------------------------------------
// AMBIENT GLOW
// ----------------------------------------------------------------------------
.ambient-glow {
  position: absolute;
  border-radius: 9999px;
  pointer-events: none;
  z-index: 0;

  &.glow-top-right {
    top: -6rem;
    right: -6rem;
    width: 18rem;
    height: 18rem;
    background: radial-gradient(circle, rgba(233, 193, 118, 0.28) 0%, rgba(233, 193, 118, 0) 70%);
    filter: blur(48px);
  }

  &.glow-bottom-left {
    bottom: -5rem;
    left: -5rem;
    width: 16rem;
    height: 16rem;
    background: radial-gradient(circle, rgba(197, 160, 89, 0.22) 0%, rgba(197, 160, 89, 0) 70%);
    filter: blur(40px);
  }
}

// ----------------------------------------------------------------------------
// FLOATING SQUIRCLE CLOSE BUTTON
// ----------------------------------------------------------------------------
.floating-close-squircle {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  width: 2.375rem;
  height: 2.375rem;
  border-radius: 12px;
  background-color: var(--bg-surface-tonal, #fcf2ec);
  border: 1px solid var(--border-color-subtle, #ebe0db);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #4e4639);
  cursor: pointer;
  outline: none;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 10;

  &:hover {
    background-color: var(--bg-hover, #f6ece7);
    color: var(--text-primary, #1f1b18);
    transform: scale(1.05);
  }

  .close-icon {
    font-size: 18px;
    line-height: 1;
    transition: transform 0.3s ease;
  }

  &:hover .close-icon {
    transform: rotate(90deg);
  }
}

// ----------------------------------------------------------------------------
// HEADER SECTION
// ----------------------------------------------------------------------------
.modal-header-section {
  position: relative;
  z-index: 1;
  text-align: center;
  margin-bottom: 1.25rem;
  padding: 0 0.5rem;
}

.archival-subbadge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background-color: var(--bg-surface-tonal, #fcf2ec);
  border: 1px solid var(--border-color-subtle, #ebe0db);
  margin-bottom: 0.6rem;

  .diamond-icon {
    font-size: 14px;
    color: var(--primary, #c5a059);
  }

  .subbadge-text {
    font-family: 'Manrope', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--primary, #c5a059);
  }
}

.modal-headline {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.625rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--text-primary, #1f1b18);
  margin: 0 0 0.4rem 0;

  @media (min-width: 640px) {
    font-size: 1.875rem;
  }
}

.modal-editorial-lead {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted, #7f7667);
  max-width: 560px;
  margin: 0 auto;
}

// ----------------------------------------------------------------------------
// EVENT SUMMARY BANNER
// ----------------------------------------------------------------------------
.event-summary-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.85rem 1.25rem;
  margin-bottom: 1.5rem;
  border-radius: 12px;
  background: rgba(197, 160, 89, 0.12);
  border: 1px solid rgba(197, 160, 89, 0.3);

  .event-summary-info {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .event-summary-item {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 12.5px;

    .summary-icon {
      font-size: 15px;
      color: var(--primary, #c5a059);
    }

    .summary-text {
      font-weight: 600;
      color: var(--text-primary, #1f1b18);

      &.amount-highlight {
        color: var(--primary, #c5a059);
        font-weight: 700;
      }
    }
  }

  .event-summary-divider {
    color: rgba(197, 160, 89, 0.5);
  }

  .pending-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.65rem;
    border-radius: 9999px;
    background-color: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.3);
    color: #b45309;
    font-size: 11px;
    font-weight: 700;

    .pending-pill-icon {
      font-size: 13px;
    }
  }
}

// ----------------------------------------------------------------------------
// PAYMENT CHANNELS & CARDS
// ----------------------------------------------------------------------------
.payment-channels-container {
  margin-bottom: 1.25rem;
}

.section-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color-subtle, #ebe0db);
  padding-bottom: 0.4rem;
  margin-bottom: 0.85rem;

  .section-label {
    font-family: 'Manrope', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-secondary, #4e4639);
  }

  .section-hint {
    font-size: 11px;
    color: var(--text-muted, #7f7667);
  }
}

.payment-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.payment-channel-card {
  background: var(--bg-surface-tonal, #faf6f0);
  border: 1.5px solid var(--border-color-subtle, #e8dfd5);
  border-radius: 16px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;

  &:hover {
    border-color: var(--primary, #c5a059);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(119, 90, 25, 0.12);

    .payment-img-zoom-hint {
      opacity: 1;
    }
  }
}

.payment-channel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.6rem;
}

.payment-badge {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  letter-spacing: 0.02em;

  &.gcash-badge {
    background: #007dfe;
    color: #ffffff;
  }

  &.maribank-badge {
    background: #ff5722;
    color: #ffffff;
  }

  &.maya-badge {
    background: #00b050;
    color: #ffffff;
  }
}

.payment-channel-type {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted, #7f7667);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.payment-img-frame {
  position: relative;
  width: 100%;
  height: 220px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid var(--border-color-subtle, #e8dfd5);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
  padding: 0.35rem;
}

.payment-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

.payment-img-zoom-hint {
  position: absolute;
  bottom: 0.45rem;
  right: 0.45rem;
  background: rgba(0, 0, 0, 0.7);
  color: #ffffff;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 10px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.2s ease;
  backdrop-filter: blur(4px);

  .material-symbols-outlined {
    font-size: 13px;
  }
}

.payment-channel-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 11px;
  border-top: 1px dashed var(--border-color-subtle, #e8dfd5);
  padding-top: 0.5rem;
}

.payment-info-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;

  .info-label {
    color: var(--text-muted, #7f7667);
    font-size: 10.5px;
  }

  .info-val {
    color: var(--text-primary, #1f1b18);
    font-weight: 600;
    text-align: right;
  }
}

// ----------------------------------------------------------------------------
// VERIFICATION NOTICE
// ----------------------------------------------------------------------------
.pending-notice-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background-color: rgba(197, 160, 89, 0.08);
  border: 1px solid rgba(197, 160, 89, 0.3);
  margin-bottom: 1.25rem;

  .pending-notice-icon-box {
    width: 2rem;
    height: 2rem;
    border-radius: 8px;
    background-color: rgba(197, 160, 89, 0.18);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .pending-icon {
      font-size: 17px;
      color: var(--primary, #c5a059);
    }
  }

  .pending-notice-body {
    flex: 1;

    .pending-notice-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--primary, #775a19);
      margin-bottom: 0.15rem;
    }

    .pending-notice-desc {
      font-size: 11.5px;
      line-height: 1.45;
      color: var(--text-secondary, #4e4639);
      margin: 0;
    }
  }
}

// ----------------------------------------------------------------------------
// MODAL ACTIONS
// ----------------------------------------------------------------------------
.modal-actions-row {
  margin-top: 1rem;
  width: 100%;
}

.submit-profile-btn {
  background: linear-gradient(135deg, var(--primary, #c5a059) 0%, var(--primary-hover, #a47608) 100%) !important;
  color: var(--primary-text, #ffffff) !important;
  border: none !important;
  border-radius: 10px !important;
  font-family: 'Manrope', sans-serif !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  letter-spacing: 0.02em !important;
  padding: 0.75rem 1.15rem !important;
  box-shadow: 0 4px 14px rgba(119, 90, 25, 0.28) !important;
  transition: all 0.25s ease !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0.45rem !important;

  &.width-full {
    width: 100% !important;
  }

  &:hover {
    background: linear-gradient(135deg, var(--primary-hover, #b58f48) 0%, var(--primary, #8e6605) 100%) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 18px rgba(119, 90, 25, 0.35) !important;
  }

  .submit-arrow {
    font-size: 18px;
    transition: transform 0.2s ease;
  }

  &:hover .submit-arrow {
    transform: scale(1.1);
  }
}

// ----------------------------------------------------------------------------
// LIGHTBOX MODAL FOR QR PREVIEW
// ----------------------------------------------------------------------------
.qr-zoom-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.qr-zoom-modal-dialog {
  position: relative;
  max-width: 440px;
  width: 100%;
}

.qr-zoom-close-btn {
  position: absolute;
  top: -2.75rem;
  right: 0;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.35);
    transform: scale(1.05);
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
}

.qr-zoom-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
  text-align: center;
}

.qr-zoom-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.35rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #1f1b18;
}

.qr-zoom-img-wrapper {
  max-height: 60vh;
  overflow: hidden;
  border-radius: 12px;
  margin-bottom: 1rem;
  background: #fbfbfb;
  border: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
}

.qr-zoomed-img {
  max-width: 100%;
  max-height: 55vh;
  object-fit: contain;
  display: block;
}

.qr-zoom-caption {
  font-size: 12px;
  color: #4e4639;

  .qr-zoom-account-name {
    font-weight: 700;
    margin: 0 0 0.2rem 0;
    color: #1f1b18;
    font-size: 13px;
  }

  .qr-zoom-account-number {
    margin: 0;
    color: #7f7667;
  }
}

// ----------------------------------------------------------------------------
// MICROCOPY FOOTER
// ----------------------------------------------------------------------------
.modal-footer-microcopy {
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-size: 11px;
  color: var(--text-muted, #7f7667);
  text-align: center;

  .lock-icon {
    font-size: 14px;
    color: var(--primary, #c5a059);
  }
}
</style>
