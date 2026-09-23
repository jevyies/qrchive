<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

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

const authStore = useAuthStore()

// Wizard Navigation State
const currentStep = ref(1)

// Step 1: Account Type ('personal' | 'business')
const accountType = ref('personal')

// Step 2: Account Details
const firstName = ref('')
const middleName = ref('')
const lastName = ref('')
const extName = ref('')
const username = ref('')
const password = ref('')

// Step 3: Business Details (Business only)
const businessName = ref('')
const businessDescription = ref('')
const businessEmail = ref('')
const dateStarted = ref('')

const internalLoading = ref(false)
const errorMessage = ref('')

const isSubmitting = computed(() => props.loading || internalLoading.value)
const totalSteps = computed(() => (accountType.value === 'business' ? 3 : 2))

const todayDateString = () => new Date().toISOString().split('T')[0]

// Initialize / Sync form data when modal opens
const resetForm = () => {
  currentStep.value = 1
  accountType.value = props.initialData?.accountType || 'personal'
  firstName.value = props.initialData?.firstName || props.initialData?.firstname || authStore.user?.firstname || ''
  middleName.value = props.initialData?.middleName || props.initialData?.middlename || authStore.user?.middlename || ''
  lastName.value = props.initialData?.lastName || props.initialData?.lastname || authStore.user?.lastname || ''
  extName.value = props.initialData?.extName || props.initialData?.extname || props.initialData?.suffix || authStore.user?.extname || ''
  username.value = props.initialData?.username || authStore.user?.username || ''
  password.value = ''

  const defaultEmail = props.initialData?.email || authStore.user?.email || ''
  businessName.value = props.initialData?.businessname || ''
  businessDescription.value = props.initialData?.description || ''
  businessEmail.value = props.initialData?.businessEmail || defaultEmail
  dateStarted.value = props.initialData?.dateStarted || todayDateString()

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

const selectAccountType = (type) => {
  accountType.value = type
  errorMessage.value = ''
}

// Step 1 -> Step 2
const handleStep1Next = () => {
  errorMessage.value = ''
  currentStep.value = 2
}

// Step 2 -> Step 3 or Direct Submit (Personal)
const handleStep2Next = () => {
  errorMessage.value = ''

  if (!firstName.value.trim()) {
    errorMessage.value = 'Please enter your first name.'
    return
  }

  if (!lastName.value.trim()) {
    errorMessage.value = 'Please enter your last name.'
    return
  }

  if (!username.value.trim()) {
    errorMessage.value = 'Please enter a username.'
    return
  }

  if (username.value.trim().length < 3) {
    errorMessage.value = 'Username must be at least 3 characters.'
    return
  }

  if (!password.value.trim()) {
    errorMessage.value = 'Please enter your password.'
    return
  }

  if (password.value.trim().length < 6) {
    errorMessage.value = 'Password must be at least 6 characters.'
    return
  }

  if (accountType.value === 'business') {
    // If business email not filled, default to user's login email
    if (!businessEmail.value.trim()) {
      businessEmail.value = props.initialData?.email || authStore.user?.email || ''
    }
    if (!dateStarted.value) {
      dateStarted.value = todayDateString()
    }
    currentStep.value = 3
  } else {
    // Personal account skips step 3 and submits directly with default business data
    handleSubmit()
  }
}

// Step 3 -> Submit (Business)
const handleStep3Submit = () => {
  errorMessage.value = ''

  if (!businessName.value.trim()) {
    errorMessage.value = 'Please enter your business name.'
    return
  }

  if (!businessEmail.value.trim()) {
    errorMessage.value = 'Please enter your business email.'
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(businessEmail.value.trim())) {
    errorMessage.value = 'Please enter a valid business email address.'
    return
  }

  if (!dateStarted.value) {
    errorMessage.value = 'Please select the date your business started.'
    return
  }

  handleSubmit()
}

const goToPreviousStep = () => {
  errorMessage.value = ''
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const handleSubmit = async () => {
  errorMessage.value = ''

  const loginEmail = (props.initialData?.email || authStore.user?.email || '').trim().toLowerCase()
  const isPersonal = accountType.value === 'personal'

  const resolvedBusinessName = isPersonal
    ? `${firstName.value.trim()} ${lastName.value.trim()} Personal`
    : businessName.value.trim()

  const resolvedDescription = isPersonal
    ? null
    : (businessDescription.value.trim() || null)

  const resolvedBusinessEmail = isPersonal
    ? loginEmail
    : businessEmail.value.trim().toLowerCase()

  const resolvedDateStarted = isPersonal
    ? todayDateString()
    : (dateStarted.value || todayDateString())

  const payload = {
    accountType: accountType.value,
    email: loginEmail,
    firstname: firstName.value.trim(),
    middlename: middleName.value.trim() || null,
    lastname: lastName.value.trim(),
    extname: extName.value.trim() || null,
    username: username.value.trim(),
    password: password.value.trim(),
    businessname: resolvedBusinessName,
    description: resolvedDescription,
    businessEmail: resolvedBusinessEmail,
    dateStarted: resolvedDateStarted,
  }

  internalLoading.value = true
  try {
    const res = await authStore.completeProfile(payload)
    emit('submit', { ...payload, response: res })
    handleClose()
  } catch (err) {
    errorMessage.value =
      err.response?.data?.message || err.message || 'Failed to complete profile and store setup.'
  } finally {
    internalLoading.value = false
  }
}
</script>

<template>
  <JModal
    :model-value="modelValue"
    :bottom-sheet-on-mobile="true"
    :show-close="false"
    max-width="640px"
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

      <!-- Archival Stepper Progress Bar -->
      <div class="stepper-progress-wrapper" aria-label="Registration Progress">
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
            <span class="stepper-label">Account Type</span>
          </div>

          <!-- Connector Line 1-2 -->
          <div class="stepper-line" :class="{ filled: currentStep >= 2 }"></div>

          <!-- Step 2 Indicator -->
          <div
            class="stepper-node"
            :class="{ active: currentStep === 2, completed: currentStep > 2 }"
            @click="currentStep > 2 && (currentStep = 2)"
          >
            <div class="stepper-circle">
              <span v-if="currentStep > 2" class="material-symbols-outlined check-icon">check</span>
              <span v-else>2</span>
            </div>
            <span class="stepper-label">Account Details</span>
          </div>

          <!-- Connector Line 2-3 (Only visible when Business is selected) -->
          <template v-if="accountType === 'business'">
            <div class="stepper-line" :class="{ filled: currentStep >= 3 }"></div>

            <!-- Step 3 Indicator -->
            <div class="stepper-node" :class="{ active: currentStep === 3 }">
              <div class="stepper-circle">
                <span>3</span>
              </div>
              <span class="stepper-label">Business Details</span>
            </div>
          </template>
        </div>
      </div>

      <!-- Header & Brand Accent Hierarchy -->
      <div class="modal-header-section">
        <!-- Archival Sub-badge -->
        <div class="archival-subbadge">
          <span class="material-symbols-outlined diamond-icon">diamond</span>
          <span class="subbadge-text">
            Onboarding • Step {{ currentStep }} of {{ totalSteps }}
          </span>
        </div>

        <!-- Dynamic Headline & Editorial Lead per Step -->
        <h2 class="modal-headline">
          <template v-if="currentStep === 1">Choose Account Tier</template>
          <template v-else-if="currentStep === 2">Archivist Credentials</template>
          <template v-else>Business Specifications</template>
        </h2>
        <p class="modal-editorial-lead">
          <template v-if="currentStep === 1">
            Select your archive account archetype to determine store features and celebratory access.
          </template>
          <template v-else-if="currentStep === 2">
            Provide your legal identity and credential credentials to authenticate your archival seat.
          </template>
          <template v-else>
            Enter your brand identity and official commercial details to initiate your business store vault.
          </template>
        </p>
      </div>

      <!-- Error Alert Message -->
      <div v-if="errorMessage" class="profile-error-alert" role="alert">
        <span class="material-symbols-outlined alert-icon">error</span>
        <span>{{ errorMessage }}</span>
      </div>

      <!-- =================================================================== -->
      <!-- STEP 1: ACCOUNT TYPE (Personal vs Business)                        -->
      <!-- =================================================================== -->
      <div v-if="currentStep === 1" class="wizard-step step-1">
        <div class="form-section">
          <div class="section-label-row">
            <span class="section-label">Select Account Archetype</span>
            <span class="section-step-indicator">Step 1 of {{ totalSteps }}</span>
          </div>

          <!-- Radio Selection Grid: Personal vs Business -->
          <div class="archetype-grid" role="radiogroup" aria-label="Account Type Selection">
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
                For couples, celebrants, families, and private milestone celebration vaults
              </span>
              <span class="archetype-hint">
                <span class="material-symbols-outlined hint-icon">flash_on</span>
                Automated personal vault setup (no extra business steps)
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
                For wedding planners, studios, photographers, venues, and agencies
              </span>
              <span class="archetype-hint">
                <span class="material-symbols-outlined hint-icon">storefront</span>
                Custom store branding, staff management &amp; corporate ledger
              </span>
            </div>
          </div>
        </div>

        <!-- Navigation Actions -->
        <div class="step-actions-row single-action">
          <JBtn
            id="step1-next-btn"
            type="button"
            block
            class="submit-profile-btn"
            @click="handleStep1Next"
          >
            <span>Continue to Account Details</span>
            <span class="material-symbols-outlined submit-arrow">arrow_forward</span>
          </JBtn>
        </div>
      </div>

      <!-- =================================================================== -->
      <!-- STEP 2: ACCOUNT DETAILS (Firstname, Middlename, Lastname, etc.)   -->
      <!-- =================================================================== -->
      <div v-else-if="currentStep === 2" class="wizard-step step-2">
        <form id="step2-form" class="profile-form" @submit.prevent="handleStep2Next">
          <!-- Full Name Details Section -->
          <div class="form-section">
            <div class="section-label-row">
              <span class="section-label">Curator Identity Ledger</span>
              <span class="section-step-indicator">Step 2 of {{ totalSteps }}</span>
            </div>

            <!-- Row 1: First Name & Middle Name -->
            <div class="name-grid-row-1">
              <div class="field-item">
                <JInput
                  id="first-name"
                  v-model="firstName"
                  label="First Name"
                  placeholder="e.g., Alexander"
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

              <div class="field-item">
                <JInput
                  id="middle-name"
                  v-model="middleName"
                  label="Middle Name"
                  placeholder="e.g., Graham"
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
              <div class="field-item col-last-name">
                <JInput
                  id="last-name"
                  v-model="lastName"
                  label="Last Name"
                  placeholder="e.g., Bell"
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

              <div class="field-item col-suffix">
                <JInput
                  id="suffix"
                  v-model="extName"
                  label="Ext."
                  placeholder="Jr., III"
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

            <!-- Row 3: Username & Password -->
            <div class="name-grid-row-1">
              <div class="field-item">
                <JInput
                  id="username"
                  v-model="username"
                  label="Username"
                  placeholder="e.g., agbell"
                  required
                  autocomplete="username"
                  container-class="profile-input-container"
                  input-class="profile-input-control"
                  label-class="profile-field-label"
                >
                  <template #label>
                    <span class="label-with-req">Username <span class="required-star">*</span></span>
                  </template>
                  <template #append-inner>
                    <span class="material-symbols-outlined trailing-glyph">alternate_email</span>
                  </template>
                </JInput>
              </div>

              <div class="field-item">
                <JInput
                  id="password"
                  v-model="password"
                  type="password"
                  :password-toggle="true"
                  label="Password"
                  placeholder="••••••••"
                  required
                  autocomplete="new-password"
                  container-class="profile-input-container"
                  input-class="profile-input-control"
                  label-class="profile-field-label"
                >
                  <template #label>
                    <span class="label-with-req">Password <span class="required-star">*</span></span>
                  </template>
                </JInput>
              </div>
            </div>
          </div>

          <!-- Navigation Actions -->
          <div class="step-actions-row dual-action">
            <button
              type="button"
              id="step2-back-btn"
              class="back-step-btn"
              :disabled="isSubmitting"
              @click="goToPreviousStep"
            >
              <span class="material-symbols-outlined">arrow_back</span>
              <span>Back</span>
            </button>

            <JBtn
              id="step2-next-btn"
              type="submit"
              class="submit-profile-btn flex-grow"
              :loading="isSubmitting"
            >
              <template v-if="accountType === 'business'">
                <span>Next: Business Details</span>
                <span class="material-symbols-outlined submit-arrow">arrow_forward</span>
              </template>
              <template v-else>
                <span>Save &amp; Launch Personal Vault</span>
                <span class="material-symbols-outlined submit-arrow">verified</span>
              </template>
            </JBtn>
          </div>
        </form>
      </div>

      <!-- =================================================================== -->
      <!-- STEP 3: BUSINESS DETAILS (Business Account Only)                    -->
      <!-- =================================================================== -->
      <div v-else-if="currentStep === 3 && accountType === 'business'" class="wizard-step step-3">
        <form id="step3-form" class="profile-form" @submit.prevent="handleStep3Submit">
          <div class="form-section">
            <div class="section-label-row">
              <span class="section-label">Enterprise Information</span>
              <span class="section-step-indicator">Step 3 of 3</span>
            </div>

            <!-- Business Name -->
            <div class="field-item">
              <JInput
                id="business-name"
                v-model="businessName"
                label="Business Name"
                placeholder="e.g., Bella Vita Events &amp; Atelier"
                required
                container-class="profile-input-container"
                input-class="profile-input-control"
                label-class="profile-field-label"
              >
                <template #label>
                  <span class="label-with-req">Business Name <span class="required-star">*</span></span>
                </template>
                <template #append-inner>
                  <span class="material-symbols-outlined trailing-glyph">storefront</span>
                </template>
              </JInput>
            </div>

            <!-- Business Description -->
            <div class="field-item">
              <JInput
                id="business-description"
                v-model="businessDescription"
                label="Business Description"
                placeholder="Describe your studio, services, or specialty (optional)..."
                :textarea="true"
                rows="2"
                container-class="profile-input-container"
                input-class="profile-input-control"
                label-class="profile-field-label"
              >
                <template #label>
                  <span class="label-with-optional">Business Description <span class="opt-hint">(optional)</span></span>
                </template>
              </JInput>
            </div>

            <!-- Business Email & Date Started -->
            <div class="name-grid-row-1">
              <div class="field-item">
                <JInput
                  id="business-email"
                  v-model="businessEmail"
                  type="email"
                  label="Business Email"
                  placeholder="e.g., studio@bellavita.com"
                  required
                  container-class="profile-input-container"
                  input-class="profile-input-control"
                  label-class="profile-field-label"
                >
                  <template #label>
                    <span class="label-with-req">Business Email <span class="required-star">*</span></span>
                  </template>
                  <template #append-inner>
                    <span class="material-symbols-outlined trailing-glyph">mail</span>
                  </template>
                </JInput>
              </div>

              <div class="field-item">
                <JInput
                  id="date-started"
                  v-model="dateStarted"
                  type="date"
                  label="Date Started"
                  required
                  container-class="profile-input-container"
                  input-class="profile-input-control"
                  label-class="profile-field-label"
                >
                  <template #label>
                    <span class="label-with-req">Date Started <span class="required-star">*</span></span>
                  </template>
                </JInput>
              </div>
            </div>
          </div>

          <!-- Navigation Actions -->
          <div class="step-actions-row dual-action">
            <button
              type="button"
              id="step3-back-btn"
              class="back-step-btn"
              :disabled="isSubmitting"
              @click="goToPreviousStep"
            >
              <span class="material-symbols-outlined">arrow_back</span>
              <span>Back</span>
            </button>

            <JBtn
              id="submit-profile-btn"
              type="submit"
              class="submit-profile-btn flex-grow"
              :loading="isSubmitting"
            >
              <span>Complete &amp; Launch Business Store</span>
              <span class="material-symbols-outlined submit-arrow">verified</span>
            </JBtn>
          </div>
        </form>
      </div>

      <!-- Microcopy Footer -->
      <div class="modal-footer-microcopy">
        <span class="material-symbols-outlined lock-icon">lock_reset</span>
        <span>Account credentials and store settings can be adjusted anytime in Vault Settings.</span>
      </div>
    </div>
  </JModal>
</template>

<style scoped lang="scss">
// ----------------------------------------------------------------------------
// ACCOUNT INFO MODAL / PROFILE CREATION ATELIER STYLES
// ----------------------------------------------------------------------------

:deep(.account-profile-modal-card) {
  border-radius: 1.25rem !important;
  border: 1px solid var(--border-color, rgba(197, 160, 89, 0.25)) !important;
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.35), 0 0 32px rgba(119, 90, 25, 0.1) !important;
  background-color: var(--bg-surface, #ffffff) !important;
  color: var(--text-primary, #1f1b18) !important;
  position: relative;
  overflow: hidden;
  max-width: 640px;
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
    padding: 2.25rem 2.5rem;
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
    width: 16rem;
    height: 16rem;
    background: radial-gradient(circle, rgba(233, 193, 118, 0.28) 0%, rgba(233, 193, 118, 0) 70%);
    filter: blur(48px);
  }

  &.glow-bottom-left {
    bottom: -5rem;
    left: -5rem;
    width: 14rem;
    height: 14rem;
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
  padding: 0 0.5rem;
}

.stepper-progress-track {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  margin: 0 0.5rem -1rem 0.5rem;
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
  display: flex;
  flex-direction: column;
  padding-right: 2rem;
  margin-bottom: 1.25rem;
}

.archival-subbadge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;

  .diamond-icon {
    font-size: 15px;
    line-height: 1;
    color: var(--primary, #775a19);
    font-variation-settings: 'FILL' 1;
  }

  .subbadge-text {
    font-family: 'Manrope', sans-serif;
    font-size: 10px;
    font-weight: 700;
    line-height: 14px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--primary, #775a19);
  }
}

.modal-headline {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 26px;
  line-height: 34px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--text-primary, #1f1b18);
  margin: 0 0 0.35rem 0;

  @media (min-width: 640px) {
    font-size: 32px;
    line-height: 40px;
  }
}

.modal-editorial-lead {
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  line-height: 22px;
  letter-spacing: 0.01em;
  color: var(--text-secondary, #4e4639);
  margin: 0;
  max-width: 500px;
}

// ----------------------------------------------------------------------------
// ERROR ALERT
// ----------------------------------------------------------------------------
.profile-error-alert {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  background-color: rgba(244, 63, 94, 0.1);
  border: 1px solid rgba(244, 63, 94, 0.3);
  border-radius: 0.5rem;
  color: var(--danger, #f43f5e);
  font-size: 13px;
  font-weight: 500;

  .alert-icon {
    font-size: 18px;
    flex-shrink: 0;
  }
}

// ----------------------------------------------------------------------------
// WIZARD STEPS
// ----------------------------------------------------------------------------
.wizard-step {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
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
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--text-secondary, #4e4639);
}

.section-step-indicator {
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  line-height: 16px;
  font-style: italic;
  color: var(--primary, #775a19);
}

// ----------------------------------------------------------------------------
// STEP 1: ARCHETYPE RADIO CARDS
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
  padding: 1.125rem;
  border-radius: 0.875rem;
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
    box-shadow: 0 6px 18px rgba(119, 90, 25, 0.12);
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
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-surface-tonal, #fcf2ec);
  border: 1px solid var(--border-color-subtle, #ebe0db);

  .material-symbols-outlined {
    font-size: 19px;
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
  font-size: 17px;
  line-height: 1.25;
  font-weight: 600;
  color: var(--text-primary, #1f1b18);
  margin-bottom: 0.35rem;
}

.archetype-description {
  font-family: 'Manrope', sans-serif;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--text-secondary, #4e4639);
  margin-bottom: 0.65rem;
}

.archetype-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-family: 'Manrope', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--primary, #775a19);
  margin-top: auto;

  .hint-icon {
    font-size: 14px;
  }
}

// ----------------------------------------------------------------------------
// FORM GRIDS (STEP 2 & 3)
// ----------------------------------------------------------------------------
.profile-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

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
  font-weight: 700 !important;
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
// ACTIONS ROW (NEXT, BACK, SUBMIT)
// ----------------------------------------------------------------------------
.step-actions-row {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  margin-top: 0.75rem;

  &.single-action {
    width: 100%;
  }

  &.dual-action {
    width: 100%;
  }
}

.back-step-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.85rem 1.25rem;
  border-radius: 0.5rem;
  background-color: var(--bg-surface-tonal, #fcf2ec);
  border: 1px solid var(--border-color, #d1c5b4);
  color: var(--text-primary, #1f1b18);
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: var(--bg-hover, #f6ece7);
    border-color: var(--primary, #775a19);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .material-symbols-outlined {
    font-size: 18px;
  }
}

.flex-grow {
  flex: 1;
}

:deep(.submit-profile-btn) {
  padding: 0.85rem 1.5rem !important;
  border-radius: 0.5rem !important;
  background-color: var(--text-primary, #1f1b18) !important;
  color: #ffffff !important;
  border: none !important;
  font-family: 'Manrope', sans-serif !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  letter-spacing: 0.08em !important;
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

// ----------------------------------------------------------------------------
// MODAL FOOTER MICROCOPY
// ----------------------------------------------------------------------------
.modal-footer-microcopy {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  line-height: 18px;
  color: var(--text-muted, #7f7667);
  text-align: center;
  margin-top: 1.25rem;

  .lock-icon {
    font-size: 15px;
    color: var(--text-muted, #7f7667);
  }
}
</style>
