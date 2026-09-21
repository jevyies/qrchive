<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  initialData: {
    type: Object,
    default: () => ({}),
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue', 'close', 'submit'])

// Form State
const accountType = ref(props.initialData?.accountType || 'personal') // 'personal' | 'business'
const firstName = ref(props.initialData?.firstName || '')
const middleName = ref(props.initialData?.middleName || '')
const lastName = ref(props.initialData?.lastName || '')
const suffix = ref(props.initialData?.suffix || '')
const internalLoading = ref(false)
const errorMessage = ref('')

const isSubmitting = computed(() => props.loading || internalLoading.value)

// Sync when modal opens or initialData changes
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      accountType.value = props.initialData?.accountType || 'personal'
      firstName.value = props.initialData?.firstName || ''
      middleName.value = props.initialData?.middleName || ''
      lastName.value = props.initialData?.lastName || ''
      suffix.value = props.initialData?.suffix || ''
      errorMessage.value = ''
    }
  }
)

const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}

const selectAccountType = (type) => {
  accountType.value = type
}

const handleSubmit = () => {
  errorMessage.value = ''

  if (!firstName.value.trim()) {
    errorMessage.value = 'Please enter your first name.'
    return
  }

  if (!lastName.value.trim()) {
    errorMessage.value = 'Please enter your last name.'
    return
  }

  const payload = {
    accountType: accountType.value,
    firstName: firstName.value.trim(),
    middleName: middleName.value.trim(),
    lastName: lastName.value.trim(),
    suffix: suffix.value.trim(),
  }

  emit('submit', payload)
}
</script>

<template>
  <JModal
    :model-value="modelValue"
    :bottom-sheet-on-mobile="true"
    :show-close="false"
    max-width="620px"
    variant="elevated"
    modal-class="account-profile-modal-root"
    dialog-class="account-profile-dialog"
    content-class="account-profile-modal-card"
    body-class="account-profile-modal-body p-0"
    @update:model-value="emit('update:modelValue', $event)"
    @close="handleClose"
  >
    <div class="account-profile-container" id="qrchive-profile-modal">
      <!-- Subtle Decorative Golden Ray Ambient Highlights -->
      <div class="ambient-glow glow-top-right" aria-hidden="true"></div>
      <div class="ambient-glow glow-bottom-left" aria-hidden="true"></div>

      <!-- Floating Squircle Close Button (Upper Right) -->
      <button
        type="button"
        id="close-modal-btn"
        class="floating-close-squircle group"
        aria-label="Close dialog"
        @click="handleClose"
      >
        <span class="material-symbols-outlined close-icon">close</span>
      </button>

      <!-- Header & Brand Accent Hierarchy -->
      <div class="modal-header-section">
        <!-- Archival Sub-badge -->
        <div class="archival-subbadge">
          <span class="material-symbols-outlined diamond-icon">diamond</span>
          <span class="subbadge-text">Account Creation • Archivist Profile</span>
        </div>

        <!-- Headline & Editorial Lead -->
        <h2 class="modal-headline">
          Complete Your Profile
        </h2>
        <p class="modal-editorial-lead">
          Select your archive account type and enter your legal name to begin curating celebration vaults.
        </p>
      </div>

      <!-- Main Form Body -->
      <form id="profile-form" class="profile-form" @submit.prevent="handleSubmit">
        <!-- Error alert if validation fails -->
        <div v-if="errorMessage" class="profile-error-alert" role="alert">
          <span class="material-symbols-outlined alert-icon">error</span>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Field Section: Account Archetype -->
        <div class="form-section">
          <div class="section-label-row">
            <span class="section-label">Account Archetype</span>
            <span class="section-step-indicator">Step 1 of 2</span>
          </div>

          <!-- Radio Selection Grid: Personal vs Business -->
          <div
            class="archetype-grid"
            role="radiogroup"
            aria-label="Account Type Selection"
          >
            <!-- Personal Option Card -->
            <div
              id="card-personal"
              :class="['archetype-card', { active: accountType === 'personal' }]"
              role="radio"
              :aria-checked="accountType === 'personal'"
              tabindex="0"
              @click="selectAccountType('personal')"
              @keydown.space.prevent="selectAccountType('personal')"
              @keydown.enter.prevent="selectAccountType('personal')"
            >
              <div class="card-top-row">
                <div class="archetype-icon-box personal-icon-box">
                  <span class="material-symbols-outlined">person</span>
                </div>

                <!-- Custom Gilded Radio Circle -->
                <div
                  id="indicator-personal"
                  :class="['gilded-radio-indicator', { checked: accountType === 'personal' }]"
                >
                  <div class="radio-inner-dot"></div>
                </div>
              </div>

              <span class="archetype-title">Personal</span>
              <span class="archetype-description">
                For couples, families, and private milestone celebrations
              </span>
            </div>

            <!-- Business Option Card -->
            <div
              id="card-business"
              :class="['archetype-card', { active: accountType === 'business' }]"
              role="radio"
              :aria-checked="accountType === 'business'"
              tabindex="0"
              @click="selectAccountType('business')"
              @keydown.space.prevent="selectAccountType('business')"
              @keydown.enter.prevent="selectAccountType('business')"
            >
              <div class="card-top-row">
                <div class="archetype-icon-box business-icon-box">
                  <span class="material-symbols-outlined">corporate_fare</span>
                </div>

                <!-- Custom Gilded Radio Circle -->
                <div
                  id="indicator-business"
                  :class="['gilded-radio-indicator', { checked: accountType === 'business' }]"
                >
                  <div class="radio-inner-dot"></div>
                </div>
              </div>

              <span class="archetype-title">Business</span>
              <span class="archetype-description">
                For wedding planners, event photographers, and venues
              </span>
            </div>
          </div>
        </div>

        <!-- Hairline Divider with Gilded Monogram Accent -->
        <div class="hairline-divider-wrapper" aria-hidden="true">
          <div class="divider-hairline"></div>
          <span class="divider-badge">
            Identity Ledger
          </span>
        </div>

        <!-- Field Section: Full Name Details -->
        <div class="form-section">
          <div class="section-label-row">
            <span class="section-label">Full Name Details</span>
            <span class="section-secondary-tag">Official Registry</span>
          </div>

          <!-- Row 1: First Name & Middle Name -->
          <div class="name-grid-row-1">
            <!-- First Name Field -->
            <div class="field-item">
              <JInput
                id="first-name"
                v-model="firstName"
                label="First Name"
                placeholder="e.g., Mia"
                required
                autocomplete="given-name"
                container-class="profile-input-container"
                input-class="profile-input-control"
                label-class="profile-field-label"
              >
                <template #label>
                  <span class="label-with-req">First Name <span class="required-star">*</span></span>
                </template>
                <template #append-inner>
                  <span class="material-symbols-outlined trailing-glyph">signature</span>
                </template>
              </JInput>
            </div>

            <!-- Middle Name Field -->
            <div class="field-item">
              <JInput
                id="middle-name"
                v-model="middleName"
                label="Middle Name"
                placeholder="e.g., Rose"
                autocomplete="additional-name"
                container-class="profile-input-container"
                input-class="profile-input-control"
                label-class="profile-field-label"
              >
                <template #label>
                  <span class="label-with-optional">Middle Name <span class="opt-hint">(optional)</span></span>
                </template>
              </JInput>
            </div>
          </div>

          <!-- Row 2: Last Name (70%) & Suffix/Ext (30%) -->
          <div class="name-grid-row-2">
            <!-- Last Name Field -->
            <div class="field-item col-last-name">
              <JInput
                id="last-name"
                v-model="lastName"
                label="Last Name"
                placeholder="e.g., Alvarez"
                required
                autocomplete="family-name"
                container-class="profile-input-container"
                input-class="profile-input-control"
                label-class="profile-field-label"
              >
                <template #label>
                  <span class="label-with-req">Last Name <span class="required-star">*</span></span>
                </template>
                <template #append-inner>
                  <span class="material-symbols-outlined trailing-glyph">badge</span>
                </template>
              </JInput>
            </div>

            <!-- Extension / Suffix Field -->
            <div class="field-item col-suffix">
              <JInput
                id="suffix"
                v-model="suffix"
                label="Ext."
                placeholder="Jr., III, PhD"
                container-class="profile-input-container"
                input-class="profile-input-control"
                label-class="profile-field-label"
              >
                <template #label>
                  <span class="label-with-optional">Ext. <span class="opt-hint">(optional)</span></span>
                </template>
              </JInput>
            </div>
          </div>
        </div>

        <!-- Submission Section & Microcopy -->
        <div class="submit-section">
          <JBtn
            id="submit-profile-btn"
            type="submit"
            block
            class="submit-profile-btn"
            :loading="isSubmitting"
          >
            <span>Save &amp; Continue to Vault Setup</span>
            <span class="material-symbols-outlined submit-arrow">arrow_forward</span>
          </JBtn>

          <p class="vault-settings-microcopy">
            <span class="material-symbols-outlined lock-icon">lock_reset</span>
            <span>You can adjust identity preferences anytime in Vault Settings.</span>
          </p>
        </div>
      </form>
    </div>
  </JModal>
</template>

<style scoped lang="scss">
// ----------------------------------------------------------------------------
// ACCOUNT INFO MODAL / PROFILE CREATION ATELIER STYLES
// ----------------------------------------------------------------------------

:deep(.account-profile-modal-card) {
  border-radius: 1rem !important;
  border: 1px solid var(--border-color, rgba(197, 160, 89, 0.25)) !important;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.35), 0 0 30px rgba(119, 90, 25, 0.08) !important;
  background-color: var(--bg-surface, #ffffff) !important;
  color: var(--text-primary, #1f1b18) !important;
  position: relative;
  overflow: hidden;
  max-width: 620px;
  margin: 0 auto;

  @media (max-width: 640px) {
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
    border-top-left-radius: 1.5rem !important;
    border-top-right-radius: 1.5rem !important;
    max-width: 100vw !important;
  }
}

.account-profile-container {
  position: relative;
  padding: 2rem 1.75rem;
  overflow: hidden;

  @media (min-width: 640px) {
    padding: 2.5rem;
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
    width: 15rem;
    height: 15rem;
    background: radial-gradient(circle, rgba(233, 193, 118, 0.25) 0%, rgba(233, 193, 118, 0) 70%);
    filter: blur(48px);
  }

  &.glow-bottom-left {
    bottom: -5rem;
    left: -5rem;
    width: 12rem;
    height: 12rem;
    background: radial-gradient(circle, rgba(197, 160, 89, 0.2) 0%, rgba(197, 160, 89, 0) 70%);
    filter: blur(40px);
  }
}

// ----------------------------------------------------------------------------
// FLOATING SQUIRCLE CLOSE BUTTON
// ----------------------------------------------------------------------------
.floating-close-squircle {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 14px;
  background-color: var(--bg-surface-tonal, #fcf2ec);
  border: 1px solid var(--border-color-subtle, #ebe0db);
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
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
    transform: scale(1.04);
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
// HEADER SECTION
// ----------------------------------------------------------------------------
.modal-header-section {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  padding-right: 2.5rem;
}

.archival-subbadge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;

  .diamond-icon {
    font-size: 15px;
    line-height: 1;
    color: var(--primary, #775a19);
    font-variation-settings: 'FILL' 1;
  }

  .subbadge-text {
    font-family: 'Manrope', sans-serif;
    font-size: 10px;
    font-weight: 600;
    line-height: 14px;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: var(--primary, #775a19);
  }
}

.modal-headline {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 30px;
  line-height: 38px;
  font-weight: 500;
  letter-spacing: -0.015em;
  color: var(--text-primary, #1f1b18);
  margin: 0 0 0.5rem 0;

  @media (min-width: 640px) {
    font-size: 38px;
    line-height: 46px;
  }
}

.modal-editorial-lead {
  font-family: 'Manrope', sans-serif;
  font-size: 15px;
  line-height: 24px;
  letter-spacing: 0.01em;
  color: var(--text-secondary, #4e4639);
  margin: 0;
  max-width: 480px;
}

// ----------------------------------------------------------------------------
// FORM BODY & SECTIONS
// ----------------------------------------------------------------------------
.profile-form {
  position: relative;
  z-index: 1;
  margin-top: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-error-alert {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: rgba(244, 63, 94, 0.1);
  border: 1px solid rgba(244, 63, 94, 0.3);
  border-radius: 0.5rem;
  color: var(--danger, #f43f5e);
  font-size: 13px;
  font-weight: 500;

  .alert-icon {
    font-size: 18px;
  }
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-label {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  line-height: 16px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--text-secondary, #4e4639);
}

.section-step-indicator {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  line-height: 16px;
  font-style: italic;
  color: var(--primary, #775a19);
}

.section-secondary-tag {
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  line-height: 14px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted, #7f7667);
}

// ----------------------------------------------------------------------------
// ACCOUNT ARCHETYPE RADIO CARDS
// ----------------------------------------------------------------------------
.archetype-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.875rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.archetype-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-radius: 0.75rem;
  background-color: var(--bg-surface-elevated, #ffffff);
  border: 1.5px solid var(--border-color-subtle, #ebe0db);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  outline: none;

  &:hover {
    border-color: var(--primary, #775a19);
    background-color: var(--bg-hover, #f6ece7);
    transform: translateY(-1px);
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--primary, #775a19);
  }

  &.active {
    background-color: var(--bg-surface-elevated, #ffffff);
    border-color: var(--primary, #775a19);
    box-shadow: 0 4px 14px rgba(119, 90, 25, 0.12);
  }
}

.card-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 0.625rem;
}

.archetype-icon-box {
  width: 2.125rem;
  height: 2.125rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-surface-tonal, #fcf2ec);
  border: 1px solid var(--border-color-subtle, #ebe0db);

  .material-symbols-outlined {
    font-size: 18px;
    line-height: 1;
  }

  &.personal-icon-box {
    color: var(--primary, #775a19);
  }

  &.business-icon-box {
    color: var(--secondary, #516072);
  }
}

.gilded-radio-indicator {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-surface-tonal, #fcf2ec);
  border: 1.5px solid var(--border-color, #d1c5b4);
  transition: all 0.2s ease;

  .radio-inner-dot {
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 9999px;
    background-color: transparent;
    transition: all 0.2s ease;
  }

  &.checked {
    background-color: var(--primary, #775a19);
    border-color: var(--primary, #775a19);

    .radio-inner-dot {
      background-color: #ffffff;
    }
  }
}

.archetype-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 16px;
  line-height: 1.25;
  font-weight: 600;
  color: var(--text-primary, #1f1b18);
  margin-bottom: 0.25rem;
}

.archetype-description {
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-secondary, #4e4639);
}

// ----------------------------------------------------------------------------
// HAIRLINE DIVIDER WITH GILDED ACCENT
// ----------------------------------------------------------------------------
.hairline-divider-wrapper {
  position: relative;
  padding: 0.5rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.divider-hairline {
  width: 100%;
  height: 1px;
  background-color: var(--border-color-subtle, #ebe0db);
}

.divider-badge {
  position: absolute;
  padding: 0 0.85rem;
  background-color: var(--bg-surface, #ffffff);
  color: var(--primary, #775a19);
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

// ----------------------------------------------------------------------------
// NAME FIELDS GRIDS
// ----------------------------------------------------------------------------
.name-grid-row-1 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.875rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.name-grid-row-2 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.875rem;

  @media (min-width: 640px) {
    grid-template-columns: 7fr 3fr;
  }
}

.field-item {
  display: flex;
  flex-direction: column;
}

// ----------------------------------------------------------------------------
// JINPUT STYLING OVERRIDES FOR ACCOUNT MODAL
// ----------------------------------------------------------------------------
:deep(.profile-field-label) {
  font-family: 'Manrope', sans-serif !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  letter-spacing: 0.12em !important;
  text-transform: uppercase !important;
  color: var(--text-primary, #1f1b18) !important;
  margin-bottom: 0.35rem !important;

  .required-star {
    color: var(--primary, #775a19);
    font-weight: bold;
    margin-left: 2px;
  }

  .opt-hint {
    color: var(--text-muted, #7f7667);
    font-size: 11px;
    font-weight: normal;
    text-transform: lowercase;
  }
}

:deep(.profile-input-control) {
  font-family: 'Manrope', sans-serif !important;
  font-size: 14px !important;
  border-radius: 0.5rem !important;
  background-color: var(--bg-surface-elevated, #ffffff) !important;
  border: 1px solid var(--border-color, #d1c5b4) !important;
  color: var(--text-primary, #1f1b18) !important;
  padding: 0.65rem 0.875rem !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03) !important;
  transition: all 0.2s ease !important;

  &::placeholder {
    color: var(--text-muted, #7f7667) !important;
    opacity: 0.65;
  }

  &:focus {
    border-color: var(--primary, #775a19) !important;
    box-shadow: 0 0 0 2px rgba(119, 90, 25, 0.15) !important;
    background-color: var(--bg-surface, #ffffff) !important;
  }
}

.trailing-glyph {
  font-size: 18px;
  color: var(--text-muted, #7f7667);
  pointer-events: none;
}

// ----------------------------------------------------------------------------
// SUBMISSION & MICROCOPY
// ----------------------------------------------------------------------------
.submit-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

:deep(.submit-profile-btn) {
  width: 100% !important;
  padding: 0.85rem 1.5rem !important;
  border-radius: 0.5rem !important;
  background-color: var(--text-primary, #1f1b18) !important;
  color: #ffffff !important;
  border: none !important;
  font-family: 'Manrope', sans-serif !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  letter-spacing: 0.12em !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0.75rem !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  cursor: pointer !important;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;

  &:hover {
    background-color: var(--primary, #775a19) !important;
    box-shadow: 0 6px 18px rgba(119, 90, 25, 0.28) !important;
    transform: translateY(-1px);

    .submit-arrow {
      transform: translateX(4px);
    }
  }

  .submit-arrow {
    font-size: 18px;
    line-height: 1;
    transition: transform 0.22s ease;
  }
}

.vault-settings-microcopy {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  line-height: 20px;
  color: var(--text-secondary, #4e4639);
  text-align: center;
  margin: 0;

  .lock-icon {
    font-size: 16px;
    color: var(--text-muted, #7f7667);
  }
}
</style>
