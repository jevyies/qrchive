<script setup>
import { ref, computed, onMounted, onUnmounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useLayout } from '../composables/useLayout'
import { useThemeStore } from '../stores/theme'
import { axiosInstance, API_BASE_URL } from '../plugins/axios'
import { getCookie, getAuthToken, getRefreshToken } from '../@core/utils/cookies'

import AdminDashboard from '../views/dashboards/admin/index.vue'
import OwnerDashboard from '../views/dashboards/owner/index.vue'
import OrdinaryDashboard from '../views/dashboards/ordinary/index.vue'

const router = useRouter()
const authStore = useAuthStore()
const layout = useLayout()
const themeStore = useThemeStore()

// Example: Inject globalFunctions and extract accessToken value
const globalFunctions = inject('globalFunctions')
console.log(globalFunctions.getToken())

// Extracted Token Claims (status, authPosition, id) from accessToken via globalFunctions.getToken()
const tokenClaims = computed(() => {
  return globalFunctions.getToken()
})

// State for Token Inspection
const activeAccessToken = ref('')
const activeRefreshToken = ref('')
const copySuccess = ref(false)

// State for Live API Tester
const apiMethod = ref('GET')
const apiEndpoint = ref('/api/auth/me')
const apiLoading = ref(false)
const apiResponse = ref(null)
const apiStatus = ref(null)
const apiDuration = ref(null)
const apiError = ref(null)
const showFullResponse = ref(false)

// Token Refresh State
const isRefreshingToken = ref(false)
const refreshNotice = ref(null)

// Synchronize cookies on mount and periodic interval
const refreshCookieDisplay = () => {
  activeAccessToken.value = getCookie('X-Access-Token') || getAuthToken() || ''
  activeRefreshToken.value = getCookie('X-Refresh-Token') || getRefreshToken() || 'HTTP-only Session'
}

let intervalId = null
onMounted(async () => {
  refreshCookieDisplay()
  intervalId = setInterval(refreshCookieDisplay, 2000)

  // Fetch current user from /api/auth/me if not loaded
  if (!authStore.user) {
    try {
      await authStore.fetchCurrentUser()
    } catch (e) {
      console.warn('Could not fetch user profile:', e)
    }
  }

  // Run initial test call to /api/auth/me
  runApiRequest('GET', '/api/auth/me')
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})

// Truncated token display helper
const maskedToken = computed(() => {
  if (!activeAccessToken.value) return 'No active token'
  if (activeAccessToken.value.length < 24) return activeAccessToken.value
  return `${activeAccessToken.value.substring(0, 14)}...${activeAccessToken.value.substring(activeAccessToken.value.length - 8)}`
})

// Copy Token to clipboard
const copyToken = async () => {
  if (!activeAccessToken.value) return
  try {
    await navigator.clipboard.writeText(activeAccessToken.value)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy token:', err)
  }
}

// Manual Token Refresh Action
const handleManualRefresh = async () => {
  isRefreshingToken.value = true
  refreshNotice.value = null
  try {
    const res = await authStore.refreshToken()
    refreshCookieDisplay()
    refreshNotice.value = {
      type: 'success',
      message: 'Access token renewed successfully! New 5-minute lifespan active.',
    }
    apiStatus.value = 200
    apiResponse.value = res
  } catch (err) {
    refreshNotice.value = {
      type: 'danger',
      message: err.message || 'Failed to refresh token. Session may have expired.',
    }
  } finally {
    isRefreshingToken.value = false
  }
}

// Interactive API Request Runner
const runApiRequest = async (method = 'GET', endpoint = '/api/auth/me') => {
  apiMethod.value = method
  apiEndpoint.value = endpoint
  apiLoading.value = true
  apiError.value = null
  apiResponse.value = null
  const startTime = Date.now()

  try {
    let result
    if (method === 'GET') {
      result = await axiosInstance.get(endpoint)
    } else if (method === 'POST') {
      result = await axiosInstance.post(endpoint)
    }

    apiStatus.value = result.status || 200
    apiDuration.value = result.duration || (Date.now() - startTime)
    apiResponse.value = result.data
  } catch (err) {
    apiStatus.value = err.status || 500
    apiDuration.value = Date.now() - startTime
    apiError.value = err.message || 'API request failed'
    apiResponse.value = err.data || { error: err.message }
  } finally {
    apiLoading.value = false
    refreshCookieDisplay()
  }
}

// Logout Action
const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="dashboard-container d-flex flex-column gap-4 gap-md-5 w-full">
    <AdminDashboard v-if="authStore.authPosition === 'admin'" />
    <OwnerDashboard v-else-if="authStore.authPosition === 'owner'" />
    <OrdinaryDashboard v-else />
  </div>
</template>

<style scoped>
.dashboard-container {
  max-width: 100%;
}

.user-status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--success, #10b981);
  border: 2px solid var(--bg-surface, #ffffff);
}

.ov-hero {
  background: var(--bg-surface);
  position: relative;
  overflow: hidden;
}

.ov-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

@media (min-width: 768px) {
  .ov-stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.ov-stat-item {
  padding: 0.85rem 1rem;
  border-radius: var(--radius-lg, 0.75rem);
  text-align: center;
}

.ov-stat-value {
  font-size: 1.45rem;
  font-weight: 800;
  line-height: 1.2;
}

.ov-stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.2rem;
}

.ov-mode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  border-radius: var(--radius-lg, 0.75rem);
  border: 1px solid var(--border-color-subtle);
  background: var(--bg-surface-tonal);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.ov-mode-card:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
}

.ov-mode-card--active {
  border-color: var(--primary) !important;
  background: var(--primary-tonal, rgba(99, 102, 241, 0.1)) !important;
}

.ov-mode-icon {
  font-size: 1.3rem;
  margin-bottom: 0.25rem;
}
</style>
