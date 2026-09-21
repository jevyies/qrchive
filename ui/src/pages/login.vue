<route lang="yaml">
meta:
  layout: blank
</route>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useLayout } from '../composables/useLayout'
import AppLogo from '../@core/components/AppLogo.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { themes, currentTheme, selectTheme } = useLayout()

// Form state
const usernameOrEmail = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(true)
const isLoading = ref(false)
const isSuccess = ref(false)
const notification = ref(null)

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

// OAuth credentials from Vite environment
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID;

// ============================================================================
// 1. GITHUB OAUTH HANDLER
// ============================================================================
const handleGitHubOAuthClick = () => {
  if (!githubClientId || githubClientId === 'your_github_client_id') {
    notification.value = {
      type: 'danger',
      message: 'GitHub Client ID not configured. Please set VITE_GITHUB_CLIENT_ID.',
    }
    return
  }

  const redirectUri = window.location.origin + '/login'
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
    githubClientId
  )}&scope=read:user%20user:email&redirect_uri=${encodeURIComponent(redirectUri)}`

  isLoading.value = true
  notification.value = { type: 'info', message: 'Redirecting to GitHub OAuth...' }
  window.location.href = githubAuthUrl
}

// Process GitHub Callback Code (?code=XYZ)
const processGitHubCallback = async (code) => {
  isLoading.value = true
  notification.value = { type: 'info', message: 'Authenticating with GitHub...' }

  try {
    const res = await authStore.loginWithGitHub(code, rememberMe.value)
    isSuccess.value = true
    notification.value = {
      type: 'success',
      message: `Welcome, ${res.user?.fullname || 'GitHub User'}! Redirecting to vault...`,
    }

    // Clean up URL query parameters
    window.history.replaceState({}, document.title, window.location.pathname)

    setTimeout(() => {
      const target = (route.query.redirect && typeof route.query.redirect === 'string') ? route.query.redirect : '/dashboard'
      router.push(target)
    }, 800)
  } catch (err) {
    notification.value = {
      type: 'danger',
      message: err.message || err.data?.message || 'GitHub OAuth verification failed.',
    }
  } finally {
    isLoading.value = false
  }
}

// ============================================================================
// 2. GOOGLE OAUTH HANDLER (Google Identity Services)
// ============================================================================
let isGoogleClientInitialized = false

const initGoogleSignIn = () => {
  if (typeof window === 'undefined') return

  if (window.google?.accounts?.id) {
    setupGoogleClient()
    return
  }

  // Check if Google GIS script is already loaded or in document (e.g. from index.html)
  const existingScript =
    document.getElementById('google-gis-script') ||
    document.querySelector('script[src*="accounts.google.com/gsi/client"]')

  if (existingScript) {
    existingScript.addEventListener('load', () => setupGoogleClient())

    let attempts = 0
    const checkInterval = setInterval(() => {
      attempts++
      if (window.google?.accounts?.id) {
        clearInterval(checkInterval)
        setupGoogleClient()
      } else if (attempts > 30) {
        clearInterval(checkInterval)
      }
    }, 100)
    return
  }

  // Fallback: inject script dynamically if not present
  const script = document.createElement('script')
  script.id = 'google-gis-script'
  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  script.defer = true
  script.onload = () => setupGoogleClient()
  document.head.appendChild(script)
}

const setupGoogleClient = () => {
  if (!window.google?.accounts?.id || !googleClientId || isGoogleClientInitialized) return

  try {
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
    })

    isGoogleClientInitialized = true

    const googleBtnContainer = document.getElementById('google-btn-rendered')
    if (googleBtnContainer) {
      window.google.accounts.id.renderButton(googleBtnContainer, {
        theme: 'outline',
        size: 'medium',
        width: 180,
        text: 'signin_with',
        shape: 'pill',
      })
    }

    // Trigger ambient Google One Tap prompt on page load conforming to FedCM guidelines
    window.google.accounts.id.prompt()
  } catch (err) {
    console.warn('Google Identity Services initialization notice:', err)
  }
}

const handleGoogleOAuthClick = () => {
  if (!googleClientId || googleClientId === 'your_google_client_id.apps.googleusercontent.com') {
    notification.value = {
      type: 'danger',
      message: 'Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID.',
    }
    return
  }

  if (window.google?.accounts?.oauth2) {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: 'openid email profile',
        callback: (tokenResponse) => {
          if (tokenResponse.access_token) {
            handleGoogleTokenResponse(tokenResponse.access_token)
          } else if (tokenResponse.error) {
            notification.value = {
              type: 'danger',
              message: `Google Sign-In failed: ${tokenResponse.error_description || tokenResponse.error}`,
            }
          }
        },
        error_callback: (err) => {
          console.warn('Google OAuth popup error:', err)
          notification.value = {
            type: 'danger',
            message: 'Google Sign-In was cancelled or the popup was closed.',
          }
        },
      })
      client.requestAccessToken({ prompt: 'select_account' })
      return
    } catch (fallbackErr) {
      console.error('Google OAuth popup initiation error:', fallbackErr)
    }
  }

  if (window.google?.accounts?.id) {
    window.google.accounts.id.prompt()
  } else {
    notification.value = {
      type: 'info',
      message: 'Google Sign-In is initializing. Please try again in a moment...',
    }
    initGoogleSignIn()
  }
}

const handleGoogleCredentialResponse = async (response) => {
  if (!response?.credential) return

  isLoading.value = true
  notification.value = { type: 'info', message: 'Verifying Google credentials with vault...' }

  try {
    const res = await authStore.loginWithGoogle({ credential: response.credential, rememberMe: rememberMe.value })

    if (res.registered === false) {
      notification.value = {
        type: 'info',
        message: 'No account found for this Google identity. Redirecting to registration...',
      }
      setTimeout(() => {
        router.push('/register')
      }, 800)
      return
    }

    isSuccess.value = true
    notification.value = {
      type: 'success',
      message: `Welcome, ${res.user?.fullname || 'Google User'}! Redirecting to vault...`,
    }

    setTimeout(() => {
      const target = (route.query.redirect && typeof route.query.redirect === 'string') ? route.query.redirect : '/dashboard'
      router.push(target)
    }, 800)
  } catch (err) {
    notification.value = {
      type: 'danger',
      message: err.message || err.data?.message || 'Google authentication failed.',
    }
  } finally {
    isLoading.value = false
  }
}

const handleGoogleTokenResponse = async (accessToken) => {
  isLoading.value = true
  notification.value = { type: 'info', message: 'Verifying Google access token...' }

  try {
    const res = await authStore.loginWithGoogle({ accessToken, rememberMe: rememberMe.value })

    if (res.registered === false) {
      notification.value = {
        type: 'info',
        message: 'No account found for this Google identity. Redirecting to registration...',
      }
      setTimeout(() => {
        router.push('/register')
      }, 800)
      return
    }

    isSuccess.value = true
    notification.value = {
      type: 'success',
      message: `Welcome, ${res.user?.fullname || 'Google User'}! Redirecting to vault...`,
    }

    setTimeout(() => {
      const target = (route.query.redirect && typeof route.query.redirect === 'string') ? route.query.redirect : '/dashboard'
      router.push(target)
    }, 800)
  } catch (err) {
    notification.value = {
      type: 'danger',
      message: err.message || err.data?.message || 'Google token authentication failed.',
    }
  } finally {
    isLoading.value = false
  }
}

// ============================================================================
// 3. MANUAL CREDENTIAL LOGIN
// ============================================================================
const handleManualLogin = async () => {
  if (!usernameOrEmail.value || !password.value) {
    notification.value = { type: 'danger', message: 'Please enter both your User Email and Password.' }
    return
  }

  isLoading.value = true
  notification.value = null

  try {
    const res = await authStore.login({
      username: usernameOrEmail.value.trim(),
      password: password.value,
      rememberMe: rememberMe.value,
    })

    isSuccess.value = true
    notification.value = {
      type: 'success',
      message: `Vault decrypted! Welcome, ${res.user?.fullname || res.user?.username || 'Curator'}. Redirecting...`,
    }

    setTimeout(() => {
      const target = (route.query.redirect && typeof route.query.redirect === 'string') ? route.query.redirect : '/dashboard'
      router.push(target)
    }, 900)
  } catch (err) {
    notification.value = {
      type: 'danger',
      message: err.message || err.data?.message || 'Invalid credentials. Please verify your email and Password.',
    }
  } finally {
    isLoading.value = false
  }
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================
onMounted(() => {
  if (route.query.code) {
    processGitHubCallback(route.query.code)
  } else if (route.query.error) {
    notification.value = {
      type: 'danger',
      message: `OAuth Error: ${route.query.error_description || route.query.error}`,
    }
  }

  initGoogleSignIn()
})
</script>

<template>
  <div class="vault-root" :data-theme="currentTheme" :class="['vault-root--' + currentTheme]">
    <!-- Refined Minimal Top Navigation -->
    <header class="vault-header">
      <div class="header-container">
        <!-- Brand Logo & Name -->
        <router-link to="/" class="brand-group">
          <div class="brand-crest">
            <AppLogo :width="20" :height="20" color="primary" />
          </div>
          <div class="brand-text">
            <span class="brand-title">QRchive</span>
            <span class="brand-subtitle">Celebration Vault</span>
          </div>
        </router-link>

        <!-- Right Navigation Actions -->
        <div class="header-actions">

          <!-- Elegant Theme Switcher Pills -->
          <div v-if="themes && themes.length" class="theme-switch-pill">
            <button v-for="t in themes" :key="t.id" type="button"
              :class="['theme-opt-btn', { 'theme-opt-btn--active': currentTheme === t.id }]" :title="t.desc"
              @click="selectTheme(t.id)">
              <span class="theme-icon">{{ t.icon }}</span>
              <span class="theme-name">{{ t.name.split(' ')[0] }}</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content: Refined Luxury Card -->
    <main class="vault-main">
      <div class="vault-card-outer">
        <div class="vault-card">
          <!-- Header / Crest -->
          <div class="card-crest-section">
            <div class="lock-crest-circle">
              <span class="material-symbols-outlined lock-icon">lock</span>
            </div>
            <p class="curator-badge">Curator Portal</p>
            <h1 class="portal-heading">Welcome Back</h1>
            <p class="portal-subheading">
              Enter your credentials to access your heirloom galleries and archival feeds.
            </p>
          </div>

          <!-- Dual Social Authentication -->
          <div class="social-grid">
            <!-- Google Button -->
            <button type="button" class="social-btn" :disabled="isLoading" @click="handleGoogleOAuthClick">
              <svg class="social-svg shrink-0" viewBox="0 0 24 24">
                <path
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  fill="#4285F4" />
                <path
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  fill="#34A853" />
                <path
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  fill="#FBBC05" />
                <path
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  fill="#EA4335" />
              </svg>
              <span>Google</span>
            </button>

            <!-- GitHub Button -->
            <button type="button" class="social-btn" :disabled="isLoading" @click="handleGitHubOAuthClick">
              <svg class="social-svg fill-current shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path clip-rule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  fill-rule="evenodd"
                  fill="currentColor" />
              </svg>
              <span>GitHub</span>
            </button>
          </div>

          <!-- Hidden container for Google rendered button fallback -->
          <div id="google-btn-rendered" class="sr-hidden"></div>

          <!-- Elegant Minimal Divider -->
          <div class="divider-container">
            <div class="divider-line"></div>
            <span class="divider-label">or continue with credentials</span>
          </div>

          <!-- Alert / Notification -->
          <transition name="vault-alert-anim">
            <div v-if="notification" :class="['notification-card', `notification-card--${notification.type}`]"
              role="alert">
              <div class="notification-content">
                <span class="notification-badge">
                  {{ notification.type === 'success' ? '✓' : notification.type === 'info' ? '✦' : '!' }}
                </span>
                <span class="notification-msg">{{ notification.message }}</span>
              </div>
            </div>
          </transition>

          <!-- Email & Password Form -->
          <form class="vault-form" @submit.prevent="handleManualLogin">
            <!-- Email / Username Input -->
            <div class="form-field">
              <label class="field-label" for="email">
                Email or Username
              </label>
              <div class="field-control">
                <input id="email" v-model="usernameOrEmail" class="field-input" placeholder="Enter email or username"
                  required type="text" autocomplete="username" :disabled="isLoading" />
              </div>
            </div>

            <!-- Password Input -->
            <div class="form-field">
              <div class="field-header">
                <label class="field-label" for="password">
                  Password
                </label>
                <button type="button" class="forgot-key-btn"
                  @click="notification = { type: 'info', message: 'To reset your Password, contact your vault administrator or concierge desk.' }">
                  Forgot password?
                </button>
              </div>
              <div class="field-control field-control--password">
                <input id="password" v-model="password" class="field-input field-input--password"
                  placeholder="••••••••••••" required :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password" :disabled="isLoading" />
                <button id="togglePassBtn" type="button" class="toggle-pass-btn"
                  :aria-label="showPassword ? 'Hide master key' : 'Show master key'" @click="togglePasswordVisibility">
                  <span id="eyeIcon" class="material-symbols-outlined eye-icon">
                    {{ showPassword ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Subtle Options Row -->
            <div class="options-row">
              <label class="remember-label">
                <input v-model="rememberMe" type="checkbox" class="remember-checkbox" />
                <span class="remember-text">Remember this device</span>
              </label>
              <div class="encrypted-badge">
                <span class="material-symbols-outlined badge-icon">verified_user</span>
                <span>Encrypted</span>
              </div>
            </div>

            <!-- Primary Submit CTA Button -->
            <div class="submit-row">
              <button id="submitBtn" type="submit" class="vault-submit-btn"
                :class="{ 'vault-submit-btn--unlocked': isSuccess }" :disabled="isLoading">
                <span v-if="isLoading" class="spinner-ring"></span>
                <span id="btnText" class="btn-text">
                  {{ isSuccess ? 'Signed in' : isLoading ? 'Please wait...' : 'Sign In' }}
                </span>
                <span v-if="!isLoading && !isSuccess" class="material-symbols-outlined arrow-icon">
                  arrow_forward
                </span>
                <span v-else-if="isSuccess" class="material-symbols-outlined arrow-icon">
                  lock_open
                </span>
              </button>
            </div>
          </form>

          <!-- Subdued Sign Up Link -->
          <div class="card-footer-action">
            <p class="signup-text">
              New to QRchive?
              <router-link to="/register" class="signup-link">
                Create an account
              </router-link>
            </p>
          </div>
        </div>
      </div>
    </main>

    <!-- Clean, Subdued Footer -->
    <footer class="vault-footer">
      <div class="footer-container">
        <div class="footer-brand-phrase">
          <span class="footer-brand-name">QRchive</span>
          <span class="footer-sep">—</span>
          <span class="footer-tagline">Bespoke Archival Celebrations</span>
        </div>
        <div class="footer-nav-links">
          <router-link to="/" class="footer-link">Privacy Policy</router-link>
          <span class="footer-dot">•</span>
          <router-link to="/" class="footer-link">Terms of Vault</router-link>
          <span class="footer-dot">•</span>
          <a href="mailto:concierge@qrchive.com" class="footer-link">Concierge Desk</a>
        </div>
        <p class="footer-copyright">© 2026 QRchive Vault. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ==========================================================================
   VAULT LUXURY DESIGN SYSTEM VARIABLES
   ========================================================================== */
.vault-root {
  --v-bg: #FAF6F0;
  --v-surface: #FFFFFF;
  --v-surface-subtle: #F9F6F0;
  --v-surface-variant: #F3EFEA;
  --v-border-delicate: #EAE3D9;
  --v-primary: #775A19;
  --v-primary-hover: #5D4201;
  --v-primary-light: #C5A059;
  --v-accent-gold: #C5A129;
  --v-text-main: #1C1917;
  --v-text-muted: #6E685F;
  --v-text-subtle: #9E9589;
  --v-dark-cta: #1E1A17;
  --v-dark-cta-hover: #000000;
  --v-input-bg: rgba(250, 248, 245, 0.65);
  --v-header-bg: rgba(255, 255, 255, 0.72);
  --v-footer-bg: rgba(255, 255, 255, 0.45);
  --v-card-shadow: 0 10px 35px -8px rgba(40, 30, 20, 0.06), 0 1px 3px rgba(0, 0, 0, 0.02);

  font-family: 'Manrope', system-ui, -apple-system, sans-serif;
  color: var(--v-text-main);
  background-color: var(--v-bg);
  background-image:
    radial-gradient(at 50% 0%, rgba(225, 205, 168, 0.22) 0px, transparent 65%),
    radial-gradient(at 100% 100%, rgba(235, 220, 195, 0.15) 0px, transparent 50%);
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Explicit Light Theme Variables */
.vault-root[data-theme='light'],
.vault-root.vault-root--light,
[data-theme='light'] .vault-root {
  --v-bg: #FAF6F0;
  --v-surface: #FFFFFF;
  --v-surface-subtle: #F9F6F0;
  --v-surface-variant: #F3EFEA;
  --v-border-delicate: #EAE3D9;
  --v-primary: #775A19;
  --v-primary-hover: #5D4201;
  --v-primary-light: #C5A059;
  --v-accent-gold: #C5A129;
  --v-text-main: #1C1917;
  --v-text-muted: #6E685F;
  --v-text-subtle: #9E9589;
  --v-dark-cta: #1E1A17;
  --v-dark-cta-hover: #000000;
  --v-input-bg: rgba(250, 248, 245, 0.65);
  --v-header-bg: rgba(255, 255, 255, 0.72);
  --v-footer-bg: rgba(255, 255, 255, 0.45);
  --v-card-shadow: 0 10px 35px -8px rgba(40, 30, 20, 0.06), 0 1px 3px rgba(0, 0, 0, 0.02);

  background-color: var(--v-bg);
  background-image:
    radial-gradient(at 50% 0%, rgba(225, 205, 168, 0.22) 0px, transparent 65%),
    radial-gradient(at 100% 100%, rgba(235, 220, 195, 0.15) 0px, transparent 50%);
}

/* Dark Theme Support (seamlessly adapts when dark mode is active) */
.vault-root[data-theme='dark'],
.vault-root.vault-root--dark,
[data-theme='dark'] .vault-root,
.theme-dark .vault-root,
.dark .vault-root {
  --v-bg: #110F0D;
  --v-surface: #1B1815;
  --v-surface-subtle: #24201C;
  --v-surface-variant: #2A2520;
  --v-border-delicate: #38322B;
  --v-primary: #D4AF37;
  --v-primary-hover: #F0C446;
  --v-primary-light: #E0C068;
  --v-accent-gold: #D4AF37;
  --v-text-main: #FAF7F2;
  --v-text-muted: #B4ACA1;
  --v-text-subtle: #8A8276;
  --v-dark-cta: #C5A059;
  --v-dark-cta-hover: #D4AF37;
  --v-input-bg: rgba(28, 24, 21, 0.7);
  --v-header-bg: rgba(27, 24, 21, 0.75);
  --v-footer-bg: rgba(27, 24, 21, 0.5);
  --v-card-shadow: 0 12px 40px -8px rgba(0, 0, 0, 0.55), 0 1px 3px rgba(0, 0, 0, 0.3);

  background-color: var(--v-bg);
  background-image:
    radial-gradient(at 50% 0%, rgba(197, 160, 89, 0.12) 0px, transparent 65%),
    radial-gradient(at 100% 100%, rgba(212, 175, 55, 0.08) 0px, transparent 50%);
}

.vault-root ::selection {
  background: #EEDDB8;
  color: #382705;
}

/* ==========================================================================
   HEADER NAVIGATION
   ========================================================================== */
.vault-header {
  width: 100%;
  border-bottom: 1px solid rgba(234, 227, 217, 0.65);
  background: var(--v-header-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 40;
}

.vault-root[data-theme='dark'] .vault-header,
[data-theme='dark'] .vault-header,
.theme-dark .vault-header {
  border-bottom-color: rgba(56, 50, 43, 0.65);
}

.header-container {
  max-width: 72rem;
  margin: 0 auto;
  padding: 0.875rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@media (min-width: 640px) {
  .header-container {
    padding: 1rem 1.5rem;
  }
}

.brand-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
  color: inherit;
  user-select: none;
}

.brand-crest {
  height: 2.25rem;
  width: 2.25rem;
  border-radius: 9999px;
  background-color: var(--v-surface-variant);
  border: 1px solid var(--v-border-delicate);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s ease, transform 0.2s ease;
  flex-shrink: 0;
}

.brand-group:hover .brand-crest {
  border-color: var(--v-primary-light);
  transform: scale(1.04);
}

.crest-letter {
  font-family: 'Playfair Display', Georgia, serif;
  font-style: italic;
  font-weight: 600;
  color: var(--v-primary);
  font-size: 1.125rem;
  line-height: 1;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.1875rem;
  letter-spacing: 0.02em;
  color: var(--v-text-main);
  font-weight: 500;
  line-height: 1.2;
}

.brand-subtitle {
  font-size: 0.5625rem;
  text-transform: uppercase;
  letter-spacing: 0.24em;
  color: var(--v-primary);
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

@media (min-width: 640px) {
  .header-actions {
    gap: 1.5rem;
  }
}

.action-link {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--v-text-muted);
  text-decoration: none;
  transition: color 0.2s ease;
  font-weight: 500;
}

.action-link:hover {
  color: var(--v-text-main);
}

.action-link--desktop {
  display: none;
}

@media (min-width: 640px) {
  .action-link--desktop {
    display: inline-block;
  }
}

.theme-switch-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border-radius: 9999px;
  background: var(--v-surface-variant);
  border: 1px solid var(--v-border-delicate);
  gap: 2px;
}

.theme-opt-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 9999px;
  border: none;
  background: transparent;
  color: var(--v-text-muted);
  font-size: 0.6875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.theme-opt-btn:hover {
  color: var(--v-text-main);
}

.theme-opt-btn--active {
  background: var(--v-surface);
  color: var(--v-primary);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.theme-name {
  display: none;
}

@media (min-width: 768px) {
  .theme-name {
    display: inline;
  }
}

/* ==========================================================================
   MAIN CONTENT & LUXURY CARD
   ========================================================================== */
.vault-main {
  flex: 1 1 0%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

@media (min-width: 640px) {
  .vault-main {
    padding: 3rem 1.5rem;
  }
}

@media (min-width: 768px) {
  .vault-main {
    padding: 4rem 1.5rem;
  }
}

.vault-card-outer {
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
}

.vault-card {
  background-color: var(--v-surface);
  border-radius: 1.25rem;
  padding: 1.75rem 1.25rem;
  box-shadow: var(--v-card-shadow);
  border: 1px solid var(--v-border-delicate);
  position: relative;
  transition: box-shadow 0.3s ease;
}

@media (min-width: 480px) {
  .vault-card {
    padding: 2.25rem 2rem;
  }
}

@media (min-width: 640px) {
  .vault-card {
    padding: 2.5rem;
    border-radius: 1.5rem;
  }
}

/* Card Crest Header */
.card-crest-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 1.75rem;
}

.lock-crest-circle {
  width: 3rem;
  height: 3rem;
  margin-bottom: 0.875rem;
  border-radius: 9999px;
  background-color: var(--v-surface-subtle);
  border: 1px solid var(--v-border-delicate);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--v-primary);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);
}

.lock-icon {
  font-size: 1.375rem;
  font-weight: 300;
}

.curator-badge {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.26em;
  color: var(--v-primary);
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.portal-heading {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.75rem;
  letter-spacing: -0.015em;
  font-weight: 400;
  color: var(--v-text-main);
  margin-bottom: 0.5rem;
  line-height: 1.2;
}

@media (min-width: 640px) {
  .portal-heading {
    font-size: 2rem;
  }
}

.portal-subheading {
  font-size: 0.8125rem;
  color: var(--v-text-muted);
  font-weight: 300;
  line-height: 1.6;
  max-width: 20rem;
  margin: 0 auto;
}

/* ==========================================================================
   SOCIAL BUTTONS
   ========================================================================== */
.social-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  padding: 0.6875rem 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid var(--v-border-delicate);
  background-color: var(--v-surface);
  color: var(--v-text-main);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.social-btn:hover:not(:disabled) {
  background-color: var(--v-surface-subtle);
  border-color: var(--v-text-muted);
  transform: translateY(-1px);
}

.social-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.social-svg {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  transition: fill 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.social-svg.fill-current,
.fill-current {
  fill: currentColor;
}

.sr-hidden {
  display: none !important;
}

/* ==========================================================================
   ELEGANT DIVIDER
   ========================================================================== */
.divider-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.divider-line {
  width: 100%;
  border-top: 1px solid var(--v-border-delicate);
}

.divider-label {
  position: absolute;
  background-color: var(--v-surface);
  padding: 0 0.75rem;
  font-size: 0.6875rem;
  color: var(--v-text-subtle);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 500;
  white-space: nowrap;
}

/* ==========================================================================
   NOTIFICATION CARD
   ========================================================================== */
.notification-card {
  margin-bottom: 1.25rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  line-height: 1.5;
  display: flex;
  align-items: center;
  animation: slideNotification 0.25s ease forwards;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.notification-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
  flex-shrink: 0;
}

.notification-card--success {
  background-color: #F6F9F2;
  border: 1px solid #D5E5C9;
  color: #2F5422;
}

.notification-card--success .notification-badge {
  background-color: #4B7A35;
  color: #FFFFFF;
}

.notification-card--info {
  background-color: #FAF7EF;
  border: 1px solid #EAE1CB;
  color: #775A19;
}

.notification-card--info .notification-badge {
  background-color: #775A19;
  color: #FFFFFF;
}

.notification-card--danger {
  background-color: #FDF4F4;
  border: 1px solid #F5C6C6;
  color: #8C2222;
}

.notification-card--danger .notification-badge {
  background-color: #B93838;
  color: #FFFFFF;
}

.vault-root[data-theme='dark'] .notification-card--success,
[data-theme='dark'] .notification-card--success {
  background-color: rgba(47, 84, 34, 0.25);
  border-color: rgba(213, 229, 201, 0.3);
  color: #B8E2A7;
}

.vault-root[data-theme='dark'] .notification-card--info,
[data-theme='dark'] .notification-card--info {
  background-color: rgba(119, 90, 25, 0.25);
  border-color: rgba(234, 225, 203, 0.3);
  color: #E2C785;
}

.vault-root[data-theme='dark'] .notification-card--danger,
[data-theme='dark'] .notification-card--danger {
  background-color: rgba(140, 34, 34, 0.25);
  border-color: rgba(245, 198, 198, 0.3);
  color: #F5A3A3;
}

/* ==========================================================================
   FORM & INPUTS
   ========================================================================== */
.vault-form {
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
}

.form-field {
  display: flex;
  flex-direction: column;
}

.field-label {
  display: block;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--v-text-muted);
  margin-bottom: 0.375rem;
}

.field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
}

.field-header .field-label {
  margin-bottom: 0;
}

.forgot-key-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.6875rem;
  color: var(--v-primary);
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s ease;
}

.forgot-key-btn:hover {
  color: var(--v-primary-hover);
  text-decoration: underline;
}

.field-control {
  position: relative;
  width: 100%;
}

.field-input {
  width: 100%;
  padding: 0.6875rem 0.875rem;
  border-radius: 0.75rem;
  border: 1px solid var(--v-border-delicate);
  background-color: var(--v-input-bg);
  color: var(--v-text-main);
  font-size: 0.875rem;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.field-input::placeholder {
  color: rgba(158, 149, 137, 0.65);
}

.field-input:focus {
  background-color: var(--v-surface);
  border-color: var(--v-primary);
  box-shadow: 0 0 0 3px rgba(197, 160, 89, 0.18);
}

.field-input--password {
  padding-right: 2.75rem;
}

.toggle-pass-btn {
  position: absolute;
  right: 0.625rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--v-text-subtle);
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  transition: color 0.2s ease;
}

.toggle-pass-btn:hover {
  color: var(--v-text-main);
}

.eye-icon {
  font-size: 1.125rem;
}

/* ==========================================================================
   OPTIONS ROW (Remember me + Encrypted badge)
   ========================================================================== */
.options-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.25rem;
  user-select: none;
}

.remember-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.remember-checkbox {
  width: 0.9375rem;
  height: 0.9375rem;
  border-radius: 0.25rem;
  border: 1px solid var(--v-border-delicate);
  accent-color: var(--v-primary);
  cursor: pointer;
}

.remember-text {
  font-size: 0.75rem;
  color: var(--v-text-muted);
}

.encrypted-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  color: var(--v-text-subtle);
}

.badge-icon {
  font-size: 0.8125rem;
  color: var(--v-primary-light);
}

/* ==========================================================================
   SUBMIT CTA BUTTON
   ========================================================================== */
.submit-row {
  padding-top: 0.5rem;
}

.vault-submit-btn {
  width: 100%;
  padding: 0.8125rem 1.25rem;
  border-radius: 0.75rem;
  background-color: var(--v-dark-cta);
  color: #FFFFFF;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(30, 26, 23, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.vault-root[data-theme='dark'] .vault-submit-btn,
[data-theme='dark'] .vault-submit-btn {
  color: #1A1714;
}

.vault-submit-btn:hover:not(:disabled) {
  background-color: var(--v-dark-cta-hover);
  box-shadow: 0 6px 20px rgba(30, 26, 23, 0.25);
  transform: translateY(-1px);
}

.vault-submit-btn:hover:not(:disabled) .arrow-icon {
  transform: translateX(3px);
}

.vault-submit-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.vault-submit-btn--unlocked {
  background-color: var(--v-primary) !important;
  color: #FFFFFF !important;
}

.arrow-icon {
  font-size: 1rem;
  transition: transform 0.2s ease;
}

.spinner-ring {
  width: 0.875rem;
  height: 0.875rem;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spinRing 0.8s linear infinite;
  display: inline-block;
}

.vault-root[data-theme='dark'] .spinner-ring,
[data-theme='dark'] .spinner-ring {
  border-color: rgba(26, 23, 20, 0.35);
  border-top-color: #1A1714;
}

@keyframes spinRing {
  to {
    transform: rotate(360deg);
  }
}

/* ==========================================================================
   SIGN UP ACTION LINK
   ========================================================================== */
.card-footer-action {
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(234, 227, 217, 0.6);
  text-align: center;
}

.vault-root[data-theme='dark'] .card-footer-action,
[data-theme='dark'] .card-footer-action {
  border-top-color: rgba(56, 50, 43, 0.6);
}

.signup-text {
  font-size: 0.75rem;
  color: var(--v-text-muted);
  margin: 0;
}

.signup-link {
  color: var(--v-text-main);
  font-weight: 600;
  text-decoration: none;
  margin-left: 0.25rem;
  transition: color 0.2s ease;
}

.signup-link:hover {
  color: var(--v-primary);
  text-decoration: underline;
  text-underline-offset: 4px;
}

/* ==========================================================================
   FOOTER
   ========================================================================== */
.vault-footer {
  width: 100%;
  border-top: 1px solid rgba(234, 227, 217, 0.5);
  padding: 1.25rem 1.25rem;
  background-color: var(--v-footer-bg);
}

.vault-root[data-theme='dark'] .vault-footer,
[data-theme='dark'] .vault-footer {
  border-top-color: rgba(56, 50, 43, 0.5);
}

.footer-container {
  max-width: 72rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 0.875rem;
  font-size: 0.75rem;
  color: var(--v-text-subtle);
  text-align: center;
}

@media (min-width: 768px) {
  .footer-container {
    flex-direction: row;
    gap: 1rem;
    text-align: left;
    padding: 0 0.5rem;
  }
}

.footer-brand-phrase {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  justify-content: center;
}

.footer-brand-name {
  font-family: 'Playfair Display', Georgia, serif;
  font-style: italic;
  font-weight: 500;
  color: var(--v-text-muted);
}

.footer-brand-sep {
  color: var(--v-border-delicate);
}

.footer-nav-links {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.footer-link {
  color: var(--v-text-subtle);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: var(--v-text-main);
}

.footer-dot {
  color: var(--v-border-delicate);
}

.footer-copyright {
  margin: 0;
}

/* Transitions */
.vault-alert-anim-enter-active,
.vault-alert-anim-leave-active {
  transition: all 0.25s ease;
}

.vault-alert-anim-enter-from,
.vault-alert-anim-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
