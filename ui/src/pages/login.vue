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
            <div class="brand-crest">
              <AppLogo :width="40" :height="40" color="primary" />
            </div>
            <h1 class="portal-heading">QRchive</h1>
          </div>
          <div class="divider-container">
            <div class="divider-line"></div>
            <span class="divider-label">login via</span>
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
                  fill-rule="evenodd" fill="currentColor" />
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
