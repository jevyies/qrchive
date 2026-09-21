<route lang="yaml">
meta:
  layout: blank
</route>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useLayout } from '../composables/useLayout'
import AppLogo from '../@core/components/AppLogo.vue'

const router = useRouter()
const authStore = useAuthStore()
const { themes, currentTheme, selectTheme } = useLayout()

// Form state
const firstname = ref('')
const middlename = ref('')
const lastname = ref('')
const extname = ref('')
const email = ref('')
const username = ref('')
const password = ref('')
const rememberMe = ref(true)
const isLoading = ref(false)
const notification = ref(null)

// Two-step manual registration state
const currentStep = ref('form') // 'form' | 'verification'
const verificationCode = ref('')
const resendCountdown = ref(0)
const isSendingCode = ref(false)
let resendTimer = null
let sendCodePromise = null

// OAuth Pending Profile state (from Google / GitHub)
const oauthProfile = ref(null)
const isOAuth = computed(() => !!oauthProfile.value)

onMounted(() => {
  // Check authStore or sessionStorage for pending OAuth profile
  const pending = authStore.oauthPendingProfile || (
    typeof window !== 'undefined' && sessionStorage.getItem('wedding_oauth_pending')
      ? JSON.parse(sessionStorage.getItem('wedding_oauth_pending'))
      : null
  )

  if (pending) {
    oauthProfile.value = pending
    email.value = pending.email || ''
    firstname.value = pending.firstname || ''
    lastname.value = pending.lastname || ''
    notification.value = {
      type: 'info',
      message: `Complete your profile for ${pending.authProvider === 'github' ? 'GitHub' : 'Google'} account (${pending.email || 'OAuth'}).`,
    }
  }
})

// Cancel OAuth mode and switch to standard manual registration
const cancelOAuthMode = () => {
  authStore.clearOAuthPending()
  oauthProfile.value = null
  notification.value = null
  email.value = ''
  firstname.value = ''
  lastname.value = ''
}

// Start Resend Countdown
const startResendCountdown = (seconds = 60) => {
  resendCountdown.value = seconds
  if (resendTimer) clearInterval(resendTimer)
  resendTimer = setInterval(() => {
    if (resendCountdown.value > 0) {
      resendCountdown.value--
    } else {
      clearInterval(resendTimer)
      resendTimer = null
    }
  }, 1000)
}

// Send verification code in the background
const triggerSendVerificationCode = () => {
  isSendingCode.value = true
  sendCodePromise = authStore.sendVerificationCode({
    email: email.value.trim(),
    username: username.value.trim() || undefined,
    firstname: firstname.value.trim() || undefined,
    lastname: lastname.value.trim() || undefined,
  })

  sendCodePromise
    .then(() => {
      notification.value = {
        type: 'info',
        message: `We've sent a 6-digit verification code to ${email.value}. Please enter it below.`,
      }
    })
    .catch((err) => {
      // If sending fails (e.g. email or username already registered), return to form
      currentStep.value = 'form'
      notification.value = {
        type: 'danger',
        message: err.message || err.data?.message || 'Could not send verification code. Please check your information.',
      }
    })
    .finally(() => {
      isSendingCode.value = false
    })
}

// Resend verification code
const handleResendCode = async () => {
  if (resendCountdown.value > 0 || isSendingCode.value) return

  notification.value = {
    type: 'info',
    message: `Sending a new verification code to ${email.value}...`,
  }
  startResendCountdown(60)
  triggerSendVerificationCode()
}

// Go back to edit details from verification step
const backToDetails = () => {
  currentStep.value = 'form'
  notification.value = null
}

// Handle Form Submission (Step 1: Send Code, Step 2: Verify & Register)
const handleRegister = async () => {
  notification.value = null

  // Basic client-side validation
  if (!firstname.value.trim() || !lastname.value.trim()) {
    notification.value = { type: 'danger', message: 'First name and last name are required.' }
    return
  }

  if (!email.value.trim()) {
    notification.value = { type: 'danger', message: 'Valid email address is required.' }
    return
  }

  if (!isOAuth.value) {
    if (!username.value.trim()) {
      notification.value = { type: 'danger', message: 'Username is required for standard registration.' }
      return
    }
    if (!password.value || password.value.length < 6) {
      notification.value = { type: 'danger', message: 'Password must be at least 6 characters.' }
      return
    }
  }

  // STEP 1 FOR MANUAL REGISTRATION: Proceed DIRECTLY to Step 2 immediately
  if (!isOAuth.value && currentStep.value === 'form') {
    currentStep.value = 'verification'
    startResendCountdown(60)
    notification.value = {
      type: 'info',
      message: `Sending verification code to ${email.value}... Please check your inbox.`,
    }

    triggerSendVerificationCode()
    return
  }

  // STEP 2 FOR MANUAL REGISTRATION OR DIRECT OAUTH: Complete registration
  if (!isOAuth.value && currentStep.value === 'verification') {
    if (!verificationCode.value || verificationCode.value.trim().length !== 6) {
      notification.value = {
        type: 'danger',
        message: 'Please enter the complete 6-digit verification code sent to your email.',
      }
      return
    }

    // If code sending is still in flight, await it before verifying
    if (isSendingCode.value && sendCodePromise) {
      isLoading.value = true
      try {
        await sendCodePromise
      } catch (err) {
        isLoading.value = false
        return
      }
    }
  }

  isLoading.value = true


  try {
    const payload = {
      firstname: firstname.value.trim(),
      middlename: middlename.value.trim() || null,
      lastname: lastname.value.trim(),
      extname: extname.value.trim() || null,
      email: email.value.trim() || null,
      rememberMe: rememberMe.value,
    }

    if (isOAuth.value) {
      payload.authProvider = oauthProfile.value.authProvider || 'local'
      payload.googleId = oauthProfile.value.googleId || null
      payload.githubId = oauthProfile.value.githubId || null
      payload.avatarUrl = oauthProfile.value.avatarUrl || null
      payload.username = email.value ? email.value.split('@')[0] : `${firstname.value.trim()}_${lastname.value.trim()}`
    } else {
      payload.authProvider = 'local'
      payload.username = username.value.trim()
      payload.password = password.value
      payload.code = verificationCode.value.trim()
    }

    const res = await authStore.register(payload)

    notification.value = {
      type: 'success',
      message: `Account created successfully! Welcome, ${res.user?.fullname || res.user?.firstname}. Redirecting to dashboard...`,
    }

    setTimeout(() => {
      router.push('/dashboard')
    }, 900)
  } catch (err) {
    notification.value = {
      type: 'danger',
      message: err.message || err.data?.message || 'Registration failed. Please review your information or verification code.',
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="auth-page min-h-screen w-full d-flex flex-column justify-between p-4 p-md-6 position-relative">

    <!-- Background Ambient Glow -->
    <div class="auth-ambient-glow"></div>
    <div class="auth-ambient-glow glow-2"></div>

    <!-- Top Floating Bar: Brand & Theme Switcher -->
    <header class="d-flex align-center justify-between w-full max-w-4xl mx-auto position-relative z-10 mb-3">
      <div class="d-flex align-center gap-2">
        <AppLogo :width="32" :height="24" />
        <span class="font-bold text-sm text-body">QRchive</span>
      </div>

      <!-- Theme Switcher Pills -->
      <div class="d-flex align-center p-1 rounded-full border border-subtle gap-1"
        style="background: var(--bg-surface-tonal);">
        <button v-for="t in themes" :key="t.id"
          :class="['btn btn-xs rounded-full', currentTheme === t.id ? 'btn-primary' : 'btn-text']"
          @click="selectTheme(t.id)" :title="t.desc">
          <span>{{ t.icon }}</span>
          <span class="d-none d-md-inline">{{ t.name.split(' ')[0] }}</span>
        </button>
      </div>
    </header>

    <!-- Center Card Container -->
    <main class="d-flex align-center justify-center flex-1 position-relative z-10 py-3">
      <JCard variant="glass" class="w-full max-w-lg border border-subtle shadow-xl rounded-2xl" body-class="p-5 p-sm-6">

        <!-- Header & Logo -->
        <div class="text-center mb-4">
          <div class="d-inline-flex align-center justify-center mb-2 p-3 rounded-2xl"
            style="background: var(--primary-tonal, rgba(99, 102, 241, 0.15)); border: 1px solid var(--border-color-subtle);">
            <AppLogo :width="44" :height="32" class="d-block" />
          </div>
          <h1 class="text-2xl font-black mb-1">
            {{
              currentStep === 'verification' ?
                'Verify Your Email' :
                (isOAuth ? 'Complete Your Registration' : 'Create an Account')
            }}
          </h1>
          <p class="text-xs text-secondary mb-0">
            {{
              currentStep === 'verification' ?
                `Enter the 6-digit code sent to ${email}` :
                (isOAuth ?
                  'Fill in your name details to finish setting up your account' :
                  'Sign up for QRchive to get started'
                )
            }}
          </p>
        </div>

        <!-- OAuth Connected Badge / Banner -->
        <div v-if="isOAuth && currentStep === 'form'"
          class="p-3 mb-4 rounded-xl border border-subtle d-flex align-center justify-between gap-2"
          style="background: var(--bg-surface-tonal, rgba(255, 255, 255, 0.05));">
          <div class="d-flex align-center gap-2 overflow-hidden">
            <!-- Provider Icon -->
            <span v-if="oauthProfile.authProvider === 'google'" class="d-flex align-center">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z" />
                <path fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05"
                  d="M5.3 14.7c-.2-.7-.4-1.4-.4-2.2s.2-1.5.4-2.2L1.6 7.4C.6 9.4 0 10.6 0 12.5s.6 3.1 1.6 5.1l3.7-2.9z" />
                <path fill="#34A853"
                  d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 17c1.9 3.8 5.8 7 10.4 7z" />
              </svg>
            </span>
            <span v-else class="d-flex align-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </span>
            <div class="text-truncate">
              <div class="text-xs font-semibold text-body">
                Signing up with {{ oauthProfile.authProvider === 'github' ? 'GitHub' : 'Google' }}
              </div>
              <div class="text-xs text-muted text-truncate">{{ oauthProfile.email || 'Verified Account' }}</div>
            </div>
          </div>
          <button type="button" class="btn btn-xs btn-text text-secondary hover-danger" @click="cancelOAuthMode"
            title="Cancel social signup and use standard form">
            ✕
          </button>
        </div>

        <!-- Notification / Alert -->
        <div v-if="notification"
          :class="['alert mb-4', notification.type === 'success' ? 'alert-success' : notification.type === 'info' ? 'alert-info' : 'alert-danger']">
          <div class="d-flex align-center gap-2">
            <span>{{ notification.type === 'success' ? '✓' : notification.type === 'info' ? 'ℹ️' : '⚠️' }}</span>
            <span class="text-xs font-medium">{{ notification.message }}</span>
          </div>
        </div>

        <!-- STEP 1: Registration Form Details -->
        <form v-if="currentStep === 'form'" @submit.prevent="handleRegister" class="d-flex flex-column gap-3">

          <!-- Name Fields (Row 1: Firstname & Middlename) -->
          <div class="d-grid grid-cols-1 grid-cols-sm-2 gap-3">
            <JInput v-model="firstname" type="text" label="First Name" required placeholder="First name"
              autocomplete="given-name">
            </JInput>

            <JInput v-model="middlename" type="text" label="Middle Name" placeholder="Optional"
              autocomplete="additional-name" />
          </div>

          <!-- Name Fields (Row 2: Lastname & Extname) -->
          <div class="d-grid grid-cols-1 grid-cols-sm-2 gap-3">
            <JInput v-model="lastname" type="text" label="Last Name" required placeholder="Last name"
              autocomplete="family-name" />

            <JInput v-model="extname" type="text" label="Extension Name" placeholder="e.g. Jr, III, Sr" />
          </div>

          <!-- Email Input: Always shown, but disabled/read-only when pre-filled from OAuth -->
          <div>
            <JInput v-model="email" type="email" label="Email Address" :required="true" :disabled="isOAuth"
              :placeholder="isOAuth ? 'Email from OAuth' : 'name@example.com'" autocomplete="email">
              <template #append v-if="isOAuth">
                <span class="input-group-text text-success" title="Verified by social provider">✓ Verified</span>
              </template>
            </JInput>
          </div>

          <!-- If NOT OAuth: Show Username & Password fields -->
          <template v-if="!isOAuth">
            <JInput v-model="username" type="text" label="Username" required placeholder="Choose a username"
              autocomplete="username">
            </JInput>

            <JInput v-model="password" type="password" password-toggle required placeholder="Create a secure password"
              autocomplete="new-password" label="Password (min 6 characters)">
            </JInput>
          </template>

          <!-- Remember Me Checkbox -->
          <div class="d-flex align-center justify-between mt-1">
            <label class="form-check d-flex align-center gap-2 mb-0 cursor-pointer">
              <input type="checkbox" class="form-check-input" v-model="rememberMe" />
              <span class="form-check-label text-xs text-secondary">
                Remember my device
              </span>
            </label>
          </div>

          <!-- Submit Button -->
          <button type="submit"
            class="btn btn-primary btn-md w-full font-semibold shadow-md mt-2 d-flex align-center justify-center gap-2"
            :disabled="isLoading">
            <span v-if="isLoading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true">⏳</span>
            <span>{{
              isLoading ?
                (isOAuth ? 'Creating Account...' : 'Sending Code...') :
                (isOAuth ? 'Complete Social Sign - Up →' : 'Continue & Verify Email →')
            }}</span>
          </button>

          <!-- Link to Login -->
          <div class="text-center mt-3">
            <span class="text-xs text-secondary">Already have an account? </span>
            <router-link to="/login" class="text-xs font-semibold text-primary hover-underline">
              Sign in
            </router-link>
          </div>
        </form>

        <!-- STEP 2: Email Verification Code Entry -->
        <form v-else-if="currentStep === 'verification'" @submit.prevent="handleRegister"
          class="d-flex flex-column gap-4 py-2">

          <!-- Verification Code Box -->
          <div class="text-center">
            <label class="form-label text-xs font-semibold text-body mb-2 d-block">
              Enter 6-Digit Verification Code
            </label>
            <div class="verification-code-wrapper mx-auto mb-2">
              <input v-model="verificationCode" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6"
                placeholder="••••••" class="form-control text-center verification-code-input"
                autocomplete="one-time-code" autofocus required
                @input="verificationCode = verificationCode.replace(/[^0-9]/g, '').slice(0, 6)" />
            </div>
            <p class="text-xs text-muted mb-0 d-flex align-center justify-center gap-1">
              <span v-if="isSendingCode" class="spinner-border spinner-border-sm text-primary" role="status"
                aria-hidden="true"></span>
              <span>
                {{ isSendingCode ? `Sending verification code to ${email}...` : `Check your inbox at ${email} and copy
                the
                6-digit code.` }}
              </span>
            </p>
          </div>

          <!-- Submit Button -->
          <button type="submit"
            class="btn btn-primary btn-md w-full font-semibold shadow-md d-flex align-center justify-center gap-2"
            :disabled="isLoading || verificationCode.length !== 6">
            <span v-if="isLoading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true">⏳</span>
            <span>{{ isLoading ? 'Verifying & Creating Account...' : 'Verify & Create Account →' }}</span>
          </button>

          <!-- Resend & Back Actions -->
          <div class="d-flex flex-column gap-2 text-center pt-1 border-top border-subtle">
            <div class="d-flex align-center justify-between gap-2">
              <button type="button" class="btn btn-xs btn-tonal-neutral"
                :disabled="resendCountdown > 0 || isLoading || isSendingCode" @click="handleResendCode">
                <span>{{ resendCountdown > 0 ? `Resend Code (${resendCountdown}s)` : '🔄 Resend Code' }}</span>
              </button>

              <button type="button" class="btn btn-xs btn-text text-secondary hover-primary" @click="backToDetails">
                ← Edit Details
              </button>
            </div>
          </div>

        </form>

      </JCard>
    </main>

    <!-- Bottom Mini Footer -->
    <footer class="text-center text-xs text-muted position-relative z-10 py-2">
      <span>© 2026 QRchive. All rights reserved.</span>
    </footer>

  </div>
</template>

<style scoped>
.auth-page {
  background-color: var(--bg-surface);
  min-height: 100vh;
  overflow: hidden;
}

.auth-ambient-glow {
  position: absolute;
  top: -10%;
  left: 20%;
  width: 450px;
  height: 450px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--primary, #6366f1) 0%, transparent 70%);
  opacity: 0.12;
  filter: blur(80px);
  pointer-events: none;
  animation: float-ambient 12s ease-in-out infinite alternate;
}

.auth-ambient-glow.glow-2 {
  top: auto;
  bottom: -10%;
  right: 15%;
  left: auto;
  background: radial-gradient(circle, var(--accent, #a855f7) 0%, transparent 70%);
  opacity: 0.1;
  animation: float-ambient 16s ease-in-out infinite alternate-reverse;
}

@keyframes float-ambient {
  0% {
    transform: translate(0, 0) scale(1);
  }

  100% {
    transform: translate(30px, -40px) scale(1.15);
  }
}

:deep(.login-password-field .form-label) {
  display: block;
  width: 100%;
}

:deep(.login-password-field .form-label)::after {
  display: none !important;
}

.verification-code-wrapper {
  max-width: 280px;
}

.verification-code-input {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace !important;
  font-size: 30px !important;
  font-weight: 800 !important;
  letter-spacing: 10px !important;
  padding: 12px 14px !important;
  border-radius: 12px !important;
  background-color: var(--bg-surface-tonal, rgba(255, 255, 255, 0.05)) !important;
  border: 2px solid var(--border-color-subtle, rgba(255, 255, 255, 0.15)) !important;
  color: var(--primary, #6366f1) !important;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.verification-code-input:focus {
  border-color: var(--primary, #6366f1) !important;
  box-shadow: 0 0 0 4px var(--primary-tonal, rgba(99, 102, 241, 0.25)) !important;
}
</style>
