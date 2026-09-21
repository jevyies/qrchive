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
const rememberMe = ref(true)
const isLoading = ref(false)
const notification = ref(null)

// OAuth credentials from Vite environment
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '350271202549-smtv4oc290o1bspoqgfu5v9i8n8rep7b.apps.googleusercontent.com'
const githubClientId = import.meta.env.VITE_GITHUB_CLIENT_ID || 'Ov23liQCkoUWVHiQKF3C'

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
    notification.value = {
      type: 'success',
      message: `Welcome, ${res.user?.fullname || 'GitHub User'}! Redirecting to dashboard...`,
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

    // Polling fallback in case load event already fired before listener attached
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

  // Explicit user gesture: Directly open Google OAuth2 Token Client popup
  // This bypasses FedCM cooldown / One Tap suppression and ensures popup is not blocked by the browser
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
      // Direct synchronous call inside user gesture
      client.requestAccessToken({ prompt: 'select_account' })
      return
    } catch (fallbackErr) {
      console.error('Google OAuth popup initiation error:', fallbackErr)
    }
  }

  // Fallback if oauth2 client is not yet ready
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
  notification.value = { type: 'info', message: 'Verifying Google credentials with backend...' }

  try {
    const res = await authStore.loginWithGoogle({ credential: response.credential, rememberMe: rememberMe.value })

    if (res.registered === false) {
      notification.value = {
        type: 'info',
        message: 'No account found for this Google account. Redirecting to complete registration...',
      }
      setTimeout(() => {
        router.push('/register')
      }, 800)
      return
    }

    notification.value = {
      type: 'success',
      message: `Welcome, ${res.user?.fullname || 'Google User'}! Redirecting to dashboard...`,
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
        message: 'No account found for this Google account. Redirecting to complete registration...',
      }
      setTimeout(() => {
        router.push('/register')
      }, 800)
      return
    }

    notification.value = {
      type: 'success',
      message: `Welcome, ${res.user?.fullname || 'Google User'}! Redirecting to dashboard...`,
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
// 3. MANUAL CREDENTIAL LOGIN (/api/auth/login)
// ============================================================================
const handleManualLogin = async () => {
  if (!usernameOrEmail.value || !password.value) {
    notification.value = { type: 'danger', message: 'Please enter both username/email and password.' }
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

    notification.value = {
      type: 'success',
      message: `Login successful! Welcome, ${res.user?.fullname || res.user?.username}. Redirecting...`,
    }

    setTimeout(() => {
      const target = (route.query.redirect && typeof route.query.redirect === 'string') ? route.query.redirect : '/dashboard'
      router.push(target)
    }, 800)
  } catch (err) {
    notification.value = {
      type: 'danger',
      message: err.message || err.data?.message || 'Invalid credentials. Please check your username and password.',
    }
  } finally {
    isLoading.value = false
  }
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================
onMounted(() => {
  // If GitHub redirected back with code
  if (route.query.code) {
    processGitHubCallback(route.query.code)
  } else if (route.query.error) {
    notification.value = {
      type: 'danger',
      message: `OAuth Error: ${route.query.error_description || route.query.error}`,
    }
  }

  // Initialize Google Identity Services
  initGoogleSignIn()
})
</script>

<template>
  <div class="auth-page min-h-screen w-full d-flex flex-column justify-between p-4 p-md-6 position-relative">

    <!-- Background Ambient Glow -->
    <div class="auth-ambient-glow"></div>
    <div class="auth-ambient-glow glow-2"></div>

    <!-- Top Floating Bar: Brand & Theme Switcher -->
    <header class="d-flex align-center justify-between w-full max-w-4xl mx-auto position-relative z-10 mb-4">
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
    <main class="d-flex align-center justify-center flex-1 position-relative z-10 py-4">
      <JCard variant="glass" class="w-full max-w-md border border-subtle shadow-xl" body-class="p-5 p-sm-6">

        <!-- Header & Logo -->
        <div class="text-center mb-5">
          <div class="d-inline-flex align-center justify-center mb-3 p-3 rounded-2xl"
            style="background: var(--primary-tonal, rgba(99, 102, 241, 0.15)); border: 1px solid var(--border-color-subtle);">
            <AppLogo :width="44" :height="32" class="d-block" />
          </div>
          <h1 class="text-2xl font-black mb-1">Sign in to QRchive</h1>
          <p class="text-xs text-secondary mb-0 mt-2">via</p>
        </div>

        <!-- Social OAuth Quick Logins (Google & GitHub) -->
        <div class="d-grid grid-cols-2 gap-2 mb-2">
          <!-- Google Button -->
          <button type="button" class="btn btn-sm btn-tonal-neutral d-flex align-center justify-center gap-2"
            :disabled="isLoading" @click="handleGoogleOAuthClick" title="Sign in with Google">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z" />
              <path fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
              <path fill="#FBBC05"
                d="M5.3 14.7c-.2-.7-.4-1.4-.4-2.2s.2-1.5.4-2.2L1.6 7.4C.6 9.4 0 10.6 0 12.5s.6 3.1 1.6 5.1l3.7-2.9z" />
              <path fill="#34A853"
                d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 17c1.9 3.8 5.8 7 10.4 7z" />
            </svg>
            <span class="font-medium text-xs">Google</span>
          </button>

          <!-- GitHub Button -->
          <button type="button" class="btn btn-sm btn-tonal-neutral d-flex align-center justify-center gap-2"
            :disabled="isLoading" @click="handleGitHubOAuthClick" title="Sign in with GitHub">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span class="font-medium text-xs">GitHub</span>
          </button>
        </div>

        <!-- Hidden container for Google rendered button if used -->
        <div id="google-btn-rendered" class="d-none"></div>

        <!-- Form Divider -->
        <div class="d-flex align-center gap-3 my-4">
          <div class="flex-1 border-bottom border-subtle"></div>
          <span class="text-xs text-muted font-medium uppercase" style="letter-spacing: 0.05em;">or email /
            username</span>
          <div class="flex-1 border-bottom border-subtle"></div>
        </div>

        <!-- Alert / Notification -->
        <div v-if="notification"
          :class="['alert mb-4', notification.type === 'success' ? 'alert-success' : notification.type === 'info' ? 'alert-info' : 'alert-danger']">
          <div class="d-flex align-center gap-2">
            <span>{{ notification.type === 'success' ? '✓' : notification.type === 'info' ? 'ℹ️' : '⚠️' }}</span>
            <span class="text-xs font-medium">{{ notification.message }}</span>
          </div>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleManualLogin" class="d-flex flex-column gap-3">
          <JInput v-model="usernameOrEmail" type="text" label="Username or Email" required
            placeholder="username or email" autocomplete="username">
            <template #prepend>
              <span class="input-group-text">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </span>
            </template>
          </JInput>

          <!-- Password Input -->
          <JInput v-model="password" type="password" password-toggle required placeholder="Enter your password"
            autocomplete="current-password" container-class="login-password-field">
            <template #label>
              <span class="d-flex align-center justify-between w-full">
                <span>Password<span class="text-danger"> *</span></span>
              </span>
            </template>
            <template #prepend>
              <span class="input-group-text">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </span>
            </template>
          </JInput>

          <!-- Remember Me Checkbox -->
          <div class="d-flex align-center justify-between mt-1">
            <label class="form-check d-flex align-center gap-2 mb-0 cursor-pointer">
              <input type="checkbox" class="form-check-input" v-model="rememberMe" />
              <span class="form-check-label text-xs text-secondary">
                Remember me
              </span>
            </label>
          </div>

          <!-- Submit Button -->
          <button type="submit"
            class="btn btn-primary btn-md w-full font-semibold shadow-md mt-2 d-flex align-center justify-center gap-2"
            :disabled="isLoading">
            <span v-if="isLoading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true">⏳</span>
            <span>{{ isLoading ? 'Authenticating...' : 'Sign In to Account →' }}</span>
          </button>

          <!-- Link to Register -->
          <div class="text-center mt-3">
            <span class="text-xs text-secondary">Don't have an account? </span>
            <router-link to="/register" class="text-xs font-semibold text-primary hover-underline">
              Create an account
            </router-link>
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
</style>
