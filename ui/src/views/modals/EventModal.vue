<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import JModal from '@/@core/components/JModal.vue'
import JBtn from '@/@core/components/JBtn.vue'
import JInput from '@/@core/components/JInput.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  pricingGroups: {
    type: Object,
    default: () => ({}),
  },
  loading: {
    type: Boolean,
    default: false,
  },
  initialData: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:modelValue', 'close', 'submit'])

const authStore = useAuthStore()

// Wizard State (Step 1: Pricing, Step 2: Event Details)
const currentStep = ref(1)

// Pricing Selection State ('standard' | 'unlimited')
const selectedGroup = ref('unlimited')
const selectedStandardCap = ref('100') // '100' | '300' | 'plus'
const selectedUnlimitedCap = ref('100') // '100' | '300' | 'plus'

// Step 2 Form State (Only 'name' and 'event_date')
const eventName = ref('')
const eventDate = ref('')
const errorMessage = ref('')

// Fallback pricing configuration matching index.vue
const fallbackPricing = {
  standard: {
    '100': { id: 1, name: 'Standard Snap - Up to 100', maxGuest: 100, price: '500.00', formattedPrice: '₱500', label: 'Up to 100' },
    '300': { id: 2, name: 'Standard Snap - Up to 300', maxGuest: 300, price: '800.00', formattedPrice: '₱800', label: 'Up to 300' },
    'plus': { id: 3, name: 'Standard Snap - 300+ guests', maxGuest: null, price: '1000.00', formattedPrice: '₱1,000', label: '300+ guests' },
  },
  unlimited: {
    '100': { id: 4, name: 'Unlimited Snap - Up to 100', maxGuest: 100, price: '1000.00', formattedPrice: '₱1,000', label: 'Up to 100' },
    '300': { id: 5, name: 'Unlimited Snap - Up to 300', maxGuest: 300, price: '1500.00', formattedPrice: '₱1,500', label: 'Up to 300' },
    'plus': { id: 6, name: 'Unlimited Snap - 300+ guests', maxGuest: null, price: '2000.00', formattedPrice: '₱2,000', label: '300+ guests' },
  },
}

// Format price helper
const formatPrice = (val) => {
  if (!val) return '₱0'
  const num = typeof val === 'number' ? val : parseFloat(val)
  if (isNaN(num)) return `₱${val}`
  return `₱${num.toLocaleString()}`
}

// Dynamically resolved pricing dictionary merged with DB records if provided
const resolvedPricing = computed(() => {
  const result = {
    standard: { ...fallbackPricing.standard },
    unlimited: { ...fallbackPricing.unlimited },
  }

  if (props.pricingGroups && Object.keys(props.pricingGroups).length > 0) {
    for (const [groupKey, items] of Object.entries(props.pricingGroups)) {
      const g = groupKey.toLowerCase()
      if (!result[g]) result[g] = {}

      if (Array.isArray(items)) {
        items.forEach((item) => {
          let capKey = 'plus'
          const mg = item.maxGuest !== undefined ? item.maxGuest : item.max_guest
          if (mg === 100 || (item.name && item.name.includes('100'))) {
            capKey = '100'
          } else if (mg === 300 || (item.name && item.name.includes('300'))) {
            capKey = '300'
          }

          result[g][capKey] = {
            id: item.id,
            name: item.name,
            maxGuest: mg ?? (capKey === '100' ? 100 : capKey === '300' ? 300 : null),
            price: item.price ? String(item.price) : result[g][capKey]?.price || '0.00',
            formattedPrice: formatPrice(item.price),
            label: capKey === 'plus' ? '300+ guests' : `Up to ${capKey}`,
          }
        })
      }
    }
  }

  return result
})

// Current selected tier object
const currentSelectedTier = computed(() => {
  const cap = selectedGroup.value === 'standard' ? selectedStandardCap.value : selectedUnlimitedCap.value
  return resolvedPricing.value[selectedGroup.value]?.[cap] || null
})

// Current selected capacity key
const currentSelectedCap = computed(() => {
  return selectedGroup.value === 'standard' ? selectedStandardCap.value : selectedUnlimitedCap.value
})

const resetForm = () => {
  currentStep.value = 1
  selectedGroup.value = 'unlimited'
  selectedStandardCap.value = '100'
  selectedUnlimitedCap.value = '100'
  eventName.value = props.initialData?.name || props.initialData?.title || ''
  eventDate.value = props.initialData?.event_date || props.initialData?.eventDate || props.initialData?.date || ''
  errorMessage.value = ''
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
    }
  },
  { immediate: true }
)

const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}

// Select a specific package tier
const handleSelectTier = (group, cap, autoAdvance = false) => {
  selectedGroup.value = group
  if (group === 'standard') {
    selectedStandardCap.value = cap
  } else {
    selectedUnlimitedCap.value = cap
  }
  errorMessage.value = ''

  if (autoAdvance) {
    handleStep1Next()
  }
}

// Step 1 -> Step 2
const handleStep1Next = () => {
  errorMessage.value = ''
  currentStep.value = 2
}

// Step 2 -> Back to Step 1
const handleStep2Back = () => {
  errorMessage.value = ''
  currentStep.value = 1
}

// Submit Wizard Form
const handleStep2Submit = () => {
  errorMessage.value = ''

  if (!eventName.value.trim()) {
    errorMessage.value = 'Please enter a celebration name.'
    return
  }

  if (!eventDate.value) {
    errorMessage.value = 'Please select a celebration date.'
    return
  }

  // Generate unique event token
  const generatedToken =
    'ev-' +
    Math.random().toString(36).substring(2, 8) +
    Date.now().toString(36).substring(4, 8)

  // Creator User ID from authStore
  const currentUserId = authStore.user?.id || null

  const tier = currentSelectedTier.value

  const payload = {
    name: eventName.value.trim(),
    event_date: eventDate.value,
    eventDate: eventDate.value,
    token: generatedToken,
    user_id: currentUserId,
    userId: currentUserId,
    max_guest: tier?.maxGuest ?? null,
    maxGuest: tier?.maxGuest ?? null,
    price: tier?.price ?? null,
    group: selectedGroup.value,
    pricing_id: tier?.id ?? null,
    pricingName: tier?.name ?? null,
  }

  emit('submit', payload)
}
</script>

<template>
  <JModal
    :model-value="modelValue"
    :bottom-sheet-on-mobile="true"
    :show-close="false"
    max-width="860px"
    variant="elevated"
    modal-class="event-vault-modal-root"
    dialog-class="event-vault-dialog"
    content-class="event-vault-modal-card"
    body-class="event-vault-modal-body p-0"
    @update:model-value="emit('update:modelValue', $event)"
    @close="handleClose"
  >
    <div class="event-vault-container" id="qrchive-event-modal">
      <!-- Subtle Decorative Golden Ray Ambient Highlights -->
      <div class="ambient-glow glow-top-right" aria-hidden="true"></div>
      <div class="ambient-glow glow-bottom-left" aria-hidden="true"></div>

      <!-- Floating Squircle Close Button (Upper Right) -->
      <button
        type="button"
        id="close-event-modal-btn"
        class="floating-close-squircle group"
        aria-label="Close dialog"
        @click="handleClose"
      >
        <span class="material-symbols-outlined close-icon">close</span>
      </button>

      <!-- Archival Stepper Progress Bar -->
      <div class="stepper-progress-wrapper" aria-label="Vault Creation Progress">
        <div class="stepper-progress-track">
          <!-- Step 1 Indicator -->
          <div
            class="stepper-node"
            :class="{ active: currentStep === 1, completed: currentStep > 1 }"
            @click="currentStep > 1 && (currentStep = 1)"
          >
            <div class="stepper-circle">
              <span v-if="currentStep > 1" class="material-symbols-outlined check-icon">check</span>
              <span v-else>1</span>
            </div>
            <span class="stepper-label">Pricing Tier</span>
          </div>

          <!-- Connector Line 1-2 -->
          <div class="stepper-line" :class="{ filled: currentStep >= 2 }"></div>

          <!-- Step 2 Indicator -->
          <div
            class="stepper-node"
            :class="{ active: currentStep === 2 }"
          >
            <div class="stepper-circle">
              <span>2</span>
            </div>
            <span class="stepper-label">Event Details</span>
          </div>
        </div>
      </div>

      <!-- Header & Brand Accent Hierarchy -->
      <div class="modal-header-section">
        <!-- Archival Sub-badge -->
        <div class="archival-subbadge">
          <span class="material-symbols-outlined diamond-icon">diamond</span>
          <span class="subbadge-text">
            Curate Celebration • Step {{ currentStep }} of 2
          </span>
        </div>

        <!-- Dynamic Headline & Editorial Lead per Step -->
        <h2 class="modal-headline">
          <template v-if="currentStep === 1">Choose Your Celebration Package</template>
          <template v-else>Celebration Particulars</template>
        </h2>
        <p class="modal-editorial-lead">
          <template v-if="currentStep === 1">
            Simple per-celebration flat pricing tailored to your guest size with zero surprise fees. Grouped by tier category.
          </template>
          <template v-else>
            Enter your celebration name and celebration date to curate your unique archival vault register.
          </template>
        </p>
      </div>

      <!-- Error Alert Message -->
      <div v-if="errorMessage" class="profile-error-alert" role="alert">
        <span class="material-symbols-outlined alert-icon">error</span>
        <span>{{ errorMessage }}</span>
      </div>

      <!-- =================================================================== -->
      <!-- STEP 1: PRICING (UI matching index.vue:L529-L671)                    -->
      <!-- =================================================================== -->
      <div v-if="currentStep === 1" class="wizard-step step-1">
        <div class="pricing-grid">
          <!-- TIER 1: Standard Snap (group: 'standard') -->
          <div
            class="pricing-card"
            :class="{ 'is-selected-card': selectedGroup === 'standard' }"
            @click="selectedGroup = 'standard'"
          >
            <div class="pricing-card-top">
              <div class="pricing-title-row">
                <h3 class="pricing-title">Standard Snap</h3>
                <span class="pricing-badge">Max 30 shots / guest</span>
              </div>
              <p class="pricing-desc">
                Ideal for intimate anniversary gatherings, milestone banquets, and minimalist celebrations.
              </p>

              <!-- Capacity Selector -->
              <div class="capacity-selector-block">
                <label class="capacity-label">Select Guest Size</label>
                <div class="capacity-buttons">
                  <button
                    type="button"
                    class="cap-btn"
                    :class="{ active: selectedGroup === 'standard' && selectedStandardCap === '100' }"
                    @click.stop="handleSelectTier('standard', '100')"
                  >
                    <span class="cap-name">Up to 100</span>
                    <span class="cap-price">{{ resolvedPricing.standard['100']?.formattedPrice || '₱500' }}</span>
                  </button>
                  <button
                    type="button"
                    class="cap-btn"
                    :class="{ active: selectedGroup === 'standard' && selectedStandardCap === '300' }"
                    @click.stop="handleSelectTier('standard', '300')"
                  >
                    <span class="cap-name">Up to 300</span>
                    <span class="cap-price">{{ resolvedPricing.standard['300']?.formattedPrice || '₱800' }}</span>
                  </button>
                  <button
                    type="button"
                    class="cap-btn"
                    :class="{ active: selectedGroup === 'standard' && selectedStandardCap === 'plus' }"
                    @click.stop="handleSelectTier('standard', 'plus')"
                  >
                    <span class="cap-name">300+ guests</span>
                    <span class="cap-price">{{ resolvedPricing.standard['plus']?.formattedPrice || '₱1,000' }}</span>
                  </button>
                </div>
              </div>

              <!-- Perks List -->
              <ul class="perks-list">
                <li class="perk-item">
                  <span class="material-symbols-outlined perk-icon">check_circle</span>
                  <span>Max 30 original photos per guest</span>
                </li>
                <li class="perk-item">
                  <span class="material-symbols-outlined perk-icon">check_circle</span>
                  <span>Short video clips up to 30s</span>
                </li>
                <li class="perk-item">
                  <span class="material-symbols-outlined perk-icon">check_circle</span>
                  <span>Instant QR &amp; 5x7 printable table placard template</span>
                </li>
                <li class="perk-item">
                  <span class="material-symbols-outlined perk-icon">check_circle</span>
                  <span>1-month post-event upload deadline</span>
                </li>
                <li class="perk-item">
                  <span class="material-symbols-outlined perk-icon">check_circle</span>
                  <span>2-month cloud gallery storage &amp; full ZIP download</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              class="btn-tier-select"
              :class="selectedGroup === 'standard' ? 'btn-tier-selected' : 'btn-tier-ghost'"
              @click.stop="handleSelectTier('standard', selectedStandardCap, true)"
            >
              <span v-if="selectedGroup === 'standard'">
                Selected • {{ resolvedPricing.standard[selectedStandardCap]?.formattedPrice }}
              </span>
              <span v-else>
                Select Standard Snap ({{ resolvedPricing.standard[selectedStandardCap]?.formattedPrice }})
              </span>
            </button>
          </div>

          <!-- TIER 2: Unlimited Snap (group: 'unlimited') -->
          <div
            class="pricing-card featured-pricing-card"
            :class="{ 'is-selected-card': selectedGroup === 'unlimited' }"
            @click="selectedGroup = 'unlimited'"
          >
            <!-- Top Gold Floating Badge -->
            <div class="cherished-badge">
              <span>♥</span>
              <span>Most Cherished Choice</span>
              <span>♥</span>
            </div>

            <div class="pricing-card-top">
              <div class="pricing-title-row pt-2">
                <h3 class="pricing-title">Unlimited Snap</h3>
                <span class="pricing-badge gold-badge">Unconstrained Vault</span>
              </div>
              <p class="pricing-desc">
                Designed for full-scale milestone galas where you never want to miss a single candid angle.
              </p>

              <!-- Capacity Selector -->
              <div class="capacity-selector-block">
                <label class="capacity-label">Select Guest Size</label>
                <div class="capacity-buttons">
                  <button
                    type="button"
                    class="cap-btn"
                    :class="{ active: selectedGroup === 'unlimited' && selectedUnlimitedCap === '100' }"
                    @click.stop="handleSelectTier('unlimited', '100')"
                  >
                    <span class="cap-name">Up to 100</span>
                    <span class="cap-price">{{ resolvedPricing.unlimited['100']?.formattedPrice || '₱1,000' }}</span>
                  </button>
                  <button
                    type="button"
                    class="cap-btn"
                    :class="{ active: selectedGroup === 'unlimited' && selectedUnlimitedCap === '300' }"
                    @click.stop="handleSelectTier('unlimited', '300')"
                  >
                    <span class="cap-name">Up to 300</span>
                    <span class="cap-price">{{ resolvedPricing.unlimited['300']?.formattedPrice || '₱1,500' }}</span>
                  </button>
                  <button
                    type="button"
                    class="cap-btn"
                    :class="{ active: selectedGroup === 'unlimited' && selectedUnlimitedCap === 'plus' }"
                    @click.stop="handleSelectTier('unlimited', 'plus')"
                  >
                    <span class="cap-name">300+ guests</span>
                    <span class="cap-price">{{ resolvedPricing.unlimited['plus']?.formattedPrice || '₱2,000' }}</span>
                  </button>
                </div>
              </div>

              <!-- Perks List -->
              <ul class="perks-list">
                <li class="perk-item">
                  <span class="material-symbols-outlined perk-icon text-accent">verified</span>
                  <span><strong>Unlimited</strong> candid photo uploads from every guest</span>
                </li>
                <li class="perk-item">
                  <span class="material-symbols-outlined perk-icon text-accent">verified</span>
                  <span>Short video clips up to 30s in 4K resolution</span>
                </li>
                <li class="perk-item">
                  <span class="material-symbols-outlined perk-icon text-accent">verified</span>
                  <span>Custom event cover photo displayed on scan &amp; upload</span>
                </li>
                <li class="perk-item">
                  <span class="material-symbols-outlined perk-icon text-accent">verified</span>
                  <span>Romantic font &amp; motif styling customization</span>
                </li>
                <li class="perk-item">
                  <span class="material-symbols-outlined perk-icon text-accent">verified</span>
                  <span>Instant 5x7 printable table placards (Chic gold styling)</span>
                </li>
                <li class="perk-item">
                  <span class="material-symbols-outlined perk-icon text-accent">verified</span>
                  <span>Interactive Photo Scavenger Hunt &amp; Checklist</span>
                </li>
                <li class="perk-item">
                  <span class="material-symbols-outlined perk-icon text-accent">verified</span>
                  <span>Google Drive shareable export link &amp; 1-click ZIP archive</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              class="btn-tier-select btn-tier-primary"
              @click.stop="handleSelectTier('unlimited', selectedUnlimitedCap, true)"
            >
              <span v-if="selectedGroup === 'unlimited'">
                Selected • {{ resolvedPricing.unlimited[selectedUnlimitedCap]?.formattedPrice }}
              </span>
              <span v-else>
                Get Unlimited Snap ({{ resolvedPricing.unlimited[selectedUnlimitedCap]?.formattedPrice }})
              </span>
              <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>

        <!-- Navigation Actions -->
        <div class="step-actions-row single-action mt-6">
          <JBtn
            id="step1-next-btn"
            type="button"
            block
            class="submit-profile-btn"
            @click="handleStep1Next"
          >
            <span>Continue to Event Details ({{ currentSelectedTier?.formattedPrice || 'Select Tier' }})</span>
            <span class="material-symbols-outlined submit-arrow">arrow_forward</span>
          </JBtn>
        </div>
      </div>

      <!-- =================================================================== -->
      <!-- STEP 2: EVENT DETAILS (Only 'name', 'event_date')                   -->
      <!-- =================================================================== -->
      <div v-else-if="currentStep === 2" class="wizard-step step-2">
        <form id="step2-form" class="profile-form" @submit.prevent="handleStep2Submit">
          <!-- Selected Tier Summary Pill -->
          <div class="tier-summary-banner">
            <div class="tier-summary-info">
              <span class="tier-summary-tag">
                <span class="material-symbols-outlined text-[15px]">verified</span>
                <span>{{ selectedGroup === 'unlimited' ? 'Unlimited Snap' : 'Standard Snap' }}</span>
              </span>
              <span class="tier-summary-detail">
                {{ currentSelectedTier?.label }} • <strong>{{ currentSelectedTier?.formattedPrice }}</strong>
              </span>
            </div>
            <button type="button" class="tier-change-btn" @click="handleStep2Back">
              Change Tier
            </button>
          </div>

          <div class="form-section">
            <div class="section-label-row">
              <span class="section-label">Archival Register Particulars</span>
              <span class="section-step-indicator">Step 2 of 2</span>
            </div>

            <!-- Input 1: name -->
            <div class="field-item">
              <JInput
                id="event-name"
                v-model="eventName"
                label="Celebration Title"
                placeholder="e.g., Charlotte & Alexander Matrimony"
                required
                autocomplete="off"
                container-class="profile-input-container"
                input-class="profile-input-control"
                label-class="profile-field-label"
              >
                <template #label>
                  <span class="label-with-req">Celebration Title <span class="required-star">*</span></span>
                </template>
                <template #append-inner>
                  <span class="material-symbols-outlined trailing-glyph">celebration</span>
                </template>
              </JInput>
            </div>

            <!-- Input 2: event_date -->
            <div class="field-item">
              <JInput
                id="event-date"
                v-model="eventDate"
                type="date"
                label="Celebration Date"
                required
                container-class="profile-input-container"
                input-class="profile-input-control"
                label-class="profile-field-label"
              >
                <template #label>
                  <span class="label-with-req">Celebration Date <span class="required-star">*</span></span>
                </template>
              </JInput>
            </div>
          </div>

          <!-- Navigation Actions -->
          <div class="step-actions-row dual-action">
            <button
              type="button"
              id="step2-back-btn"
              class="back-step-btn"
              :disabled="loading"
              @click="handleStep2Back"
            >
              <span class="material-symbols-outlined">arrow_back</span>
              <span>Back to Pricing</span>
            </button>

            <JBtn
              id="submit-event-btn"
              type="submit"
              class="submit-profile-btn flex-grow"
              :loading="loading"
            >
              <span>Generate QR Vault</span>
              <span class="material-symbols-outlined submit-arrow">qr_code_2</span>
            </JBtn>
          </div>
        </form>
      </div>

      <!-- Microcopy Footer -->
      <div class="modal-footer-microcopy">
        <span class="material-symbols-outlined lock-icon">verified_user</span>
        <span>Each event generates a unique encrypted upload token and printable table placards.</span>
      </div>
    </div>
  </JModal>
</template>

<style scoped lang="scss">
// ----------------------------------------------------------------------------
// EVENT VAULT CREATION MODAL / ATELIER STYLES
// Replicates the luxury design aesthetic of AccountInfoModal.vue
// ----------------------------------------------------------------------------

:deep(.event-vault-modal-card) {
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

.event-vault-container {
  position: relative;
  padding: 2rem 1.5rem;
  overflow: hidden;

  @media (min-width: 640px) {
    padding: 2.25rem 2.25rem;
  }
}

// ----------------------------------------------------------------------------
// AMBIENT GLOW HIGHLIGHTS
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

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--primary, #775a19);
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
// ARCHIVAL STEPPER PROGRESS BAR
// ----------------------------------------------------------------------------
.stepper-progress-wrapper {
  position: relative;
  z-index: 1;
  margin-bottom: 1.5rem;
  padding: 0 1rem;
}

.stepper-progress-track {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 320px;
  margin: 0 auto;
  position: relative;
}

.stepper-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  cursor: default;
  transition: all 0.25s ease;

  &.completed {
    cursor: pointer;
  }

  .stepper-circle {
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    background-color: var(--bg-surface-tonal, #fcf2ec);
    border: 1.5px solid var(--border-color, #d1c5b4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Manrope', sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-muted, #7f7667);
    transition: all 0.25s ease;
  }

  .check-icon {
    font-size: 14px;
    font-weight: 700;
  }

  .stepper-label {
    font-family: 'Manrope', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--text-muted, #7f7667);
    transition: color 0.25s ease;
    white-space: nowrap;
  }

  &.active {
    .stepper-circle {
      background-color: var(--primary, #775a19);
      border-color: var(--primary, #775a19);
      color: #ffffff;
      box-shadow: 0 0 0 4px rgba(119, 90, 25, 0.18);
    }
    .stepper-label {
      color: var(--primary, #775a19);
      font-weight: 700;
    }
  }

  &.completed {
    .stepper-circle {
      background-color: var(--primary, #775a19);
      border-color: var(--primary, #775a19);
      color: #ffffff;
    }
    .stepper-label {
      color: var(--text-primary, #1f1b18);
    }
  }
}

.stepper-line {
  flex: 1;
  height: 2px;
  background-color: var(--border-color-subtle, #ebe0db);
  margin: 0 0.75rem -1rem 0.75rem;
  transition: background-color 0.3s ease;

  &.filled {
    background-color: var(--primary, #775a19);
  }
}

// ----------------------------------------------------------------------------
// HEADER SECTION
// ----------------------------------------------------------------------------
.modal-header-section {
  position: relative;
  z-index: 1;
  text-align: center;
  margin-bottom: 1.5rem;
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
    font-size: 13px;
    color: var(--primary, #775a19);
  }

  .subbadge-text {
    font-family: 'Manrope', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--primary, #775a19);
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
  max-width: 540px;
  margin: 0 auto;
}

// ----------------------------------------------------------------------------
// ERROR ALERT
// ----------------------------------------------------------------------------
.profile-error-alert {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
  border-radius: 10px;
  background-color: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.25);
  color: #b91c1c;
  font-size: 12px;
  font-weight: 600;

  .alert-icon {
    font-size: 18px;
    flex-shrink: 0;
  }
}

// ----------------------------------------------------------------------------
// STEP 1: PRICING GRID & CARDS (Exact UX from index.vue)
// ----------------------------------------------------------------------------
.pricing-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  align-items: stretch;
  position: relative;
  z-index: 1;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.pricing-card {
  position: relative;
  background: var(--bg-surface-tonal, #faf6f0);
  border-radius: 20px;
  padding: 1.5rem;
  border: 1.5px solid var(--border-color-subtle, #e8dfd5);
  box-shadow: 0 4px 20px rgba(119, 90, 25, 0.05);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.25s ease;

  &:hover {
    border-color: var(--primary, #775a19);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(119, 90, 25, 0.12);
  }

  &.is-selected-card {
    border-color: var(--primary, #775a19);
    box-shadow: 0 0 0 3px rgba(119, 90, 25, 0.25), 0 8px 24px rgba(119, 90, 25, 0.12);
    background: var(--bg-surface, #ffffff);
  }
}

.featured-pricing-card {
  border: 2px solid #c5a059;
  background: var(--bg-surface, #ffffff);
  box-shadow: 0 12px 36px -8px rgba(197, 160, 89, 0.25);

  &.is-selected-card {
    border-color: var(--primary, #775a19);
    box-shadow: 0 0 0 3px rgba(119, 90, 25, 0.3), 0 12px 36px -8px rgba(197, 160, 89, 0.35);
  }
}

.cherished-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--primary, #775a19);
  color: #ffffff;
  padding: 0.25rem 0.85rem;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  box-shadow: 0 4px 12px rgba(119, 90, 25, 0.25);
  white-space: nowrap;
}

.pricing-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.pricing-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--text-primary, #1f1b18);
  margin: 0;
}

.pricing-badge {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted, #7f7667);
  background: var(--bg-surface-tonal, #f2e9e2);
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  white-space: nowrap;
}

.gold-badge {
  background: rgba(197, 160, 89, 0.2);
  color: var(--primary, #775a19);
  font-weight: 700;
}

.pricing-desc {
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--text-muted, #7f7667);
  margin: 0 0 1rem 0;
}

/* 3-Column Capacity Selector */
.capacity-selector-block {
  margin-bottom: 1.25rem;
}

.capacity-label {
  display: block;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted, #7f7667);
  margin-bottom: 0.4rem;
}

.capacity-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
}

.cap-btn {
  padding: 0.5rem 0.35rem;
  border-radius: 10px;
  border: 1px solid var(--border-color-subtle, #ebe0db);
  background: var(--bg-surface, #ffffff);
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;

  &:hover {
    border-color: var(--primary, #775a19);
  }

  &.active {
    border-color: var(--primary, #775a19);
    background: rgba(197, 160, 89, 0.18);
    box-shadow: 0 0 0 1px var(--primary, #775a19);
  }
}

.cap-name {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--text-primary, #1f1b18);
}

.cap-price {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--primary, #775a19);
  margin-top: 0.2rem;
}

/* Perks List */
.perks-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1.25rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.perk-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-primary, #1f1b18);
  line-height: 1.4;
}

.perk-icon {
  font-size: 0.9375rem;
  color: var(--primary, #775a19);
  margin-top: 0.05rem;
  flex-shrink: 0;

  &.text-accent {
    color: #b8860b;
  }
}

/* Tier Selection Buttons */
.btn-tier-select {
  width: 100%;
  padding: 0.65rem 1rem;
  border-radius: 12px;
  font-family: 'Manrope', sans-serif;
  font-size: 0.8125rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  border: none;
}

.btn-tier-ghost {
  background: var(--bg-surface-tonal, #f0e6dc);
  color: var(--text-primary, #1f1b18);
  border: 1px solid var(--border-color-subtle, #e0d5cb);

  &:hover {
    background: var(--primary, #775a19);
    color: #ffffff;
    border-color: var(--primary, #775a19);
  }
}

.btn-tier-selected {
  background: var(--primary, #775a19);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(119, 90, 25, 0.25);
}

.btn-tier-primary {
  background: linear-gradient(135deg, #8a6a24 0%, #b8860b 100%);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(184, 134, 11, 0.28);

  &:hover {
    background: linear-gradient(135deg, #775a19 0%, #a47608 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(184, 134, 11, 0.35);
  }
}

// ----------------------------------------------------------------------------
// STEP 2: EVENT DETAILS & FORMS
// ----------------------------------------------------------------------------
.tier-summary-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.25rem;
  margin-bottom: 1.5rem;
  border-radius: 12px;
  background: rgba(197, 160, 89, 0.12);
  border: 1px solid rgba(197, 160, 89, 0.3);

  .tier-summary-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .tier-summary-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--primary, #775a19);
    background: rgba(197, 160, 89, 0.2);
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
  }

  .tier-summary-detail {
    font-size: 13px;
    color: var(--text-primary, #1f1b18);
  }

  .tier-change-btn {
    font-size: 11px;
    font-weight: 700;
    color: var(--primary, #775a19);
    background: none;
    border: none;
    text-decoration: underline;
    cursor: pointer;
    padding: 0.2rem 0.5rem;

    &:hover {
      color: #996515;
    }
  }
}

.profile-form {
  position: relative;
  z-index: 1;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 1.75rem;
}

.section-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color-subtle, #ebe0db);
  padding-bottom: 0.4rem;

  .section-label {
    font-family: 'Manrope', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-secondary, #4e4639);
  }

  .section-step-indicator {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted, #7f7667);
  }
}

.field-item {
  width: 100%;
}

.label-with-req {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 600;
  font-size: 13px;

  .required-star {
    color: #dc2626;
  }
}

:deep(.profile-input-control) {
  border-radius: 12px !important;
  font-size: 14px !important;
  transition: all 0.2s ease !important;
}

:deep(.profile-field-label) {
  font-size: 13px !important;
  margin-bottom: 0.35rem !important;
}

.trailing-glyph {
  font-size: 18px;
  color: var(--text-muted, #7f7667);
}

// ----------------------------------------------------------------------------
// ACTIONS ROW
// ----------------------------------------------------------------------------
.step-actions-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  &.single-action {
    width: 100%;
  }

  &.dual-action {
    justify-content: space-between;
  }
}

.back-step-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  background-color: var(--bg-surface-tonal, #fcf2ec);
  border: 1px solid var(--border-color-subtle, #ebe0db);
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, #4e4639);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: var(--bg-hover, #f6ece7);
    color: var(--text-primary, #1f1b18);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.submit-profile-btn {
  background: linear-gradient(135deg, #775a19 0%, #a47608 100%) !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 12px !important;
  font-family: 'Manrope', sans-serif !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  letter-spacing: 0.02em !important;
  padding: 0.8rem 1.5rem !important;
  box-shadow: 0 4px 14px rgba(119, 90, 25, 0.28) !important;
  transition: all 0.25s ease !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0.5rem !important;

  &:hover {
    background: linear-gradient(135deg, #644a13 0%, #8e6605 100%) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 18px rgba(119, 90, 25, 0.35) !important;
  }

  .submit-arrow {
    font-size: 18px;
    transition: transform 0.2s ease;
  }

  &:hover .submit-arrow {
    transform: translateX(3px);
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
    color: var(--primary, #775a19);
  }
}
</style>
