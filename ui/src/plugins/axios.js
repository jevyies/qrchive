import axios from 'axios'
import { ref } from 'vue'
import { getAuthToken, getRefreshToken, setAuthCookies, clearAuthCookies } from '../@core/utils/cookies.js'

/**
 * ============================================================================
 * AXIOS HTTP CLIENT PLUGIN
 * Configured with backend baseURL, credentials, X-Access-Token and X-Refresh-Token
 * request headers, latency profiling, and auto-refresh on 401.
 * ============================================================================
 */

export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) ||
  'http://localhost:3001'

// Primary Axios instance
export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: Date.now() }

    // Read tokens from cookies
    const accessToken = getAuthToken()
    const refreshToken = getRefreshToken()

    // Do not attach stale authentication tokens to public authentication entrypoints
    const isPublicAuthUrl = config.url?.includes('/api/auth/login') ||
      config.url?.includes('/api/auth/register') ||
      config.url?.includes('/api/auth/google') ||
      config.url?.includes('/api/auth/github')

    if (accessToken && !isPublicAuthUrl) {
      config.headers['Authorization'] = `Bearer ${accessToken}`
      config.headers['X-Access-Token'] = accessToken
    }

    if (refreshToken && !isPublicAuthUrl) {
      config.headers['X-Refresh-Token'] = refreshToken
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor
let isRefreshing = false
let refreshSubscribers = []

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb)
}

const onRefreshed = (newToken) => {
  refreshSubscribers.forEach((cb) => cb(newToken))
  refreshSubscribers = []
}

axiosInstance.interceptors.response.use(
  (response) => {
    if (response.config?.metadata) {
      response.config.metadata.endTime = Date.now()
      response.duration = response.config.metadata.endTime - response.config.metadata.startTime
    }

    // Sync any newly returned tokens from response data
    if (response.data?.accessToken) {
      setAuthCookies(response.data.accessToken, response.data.refreshToken || null)
    }

    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (originalRequest?.metadata) {
      originalRequest.metadata.endTime = Date.now()
      error.duration = originalRequest.metadata.endTime - originalRequest.metadata.startTime
    }

    const status = error.response ? error.response.status : null
    const message = error.response?.data?.message || error.message || 'An unexpected network error occurred'

    // Handle 401 Unauthorized with token refresh (skip authentication endpoints)
    const isAuthEndpoint = originalRequest?.url?.includes('/api/auth/login') ||
      originalRequest?.url?.includes('/api/auth/refresh') ||
      originalRequest?.url?.includes('/api/auth/register') ||
      originalRequest?.url?.includes('/api/auth/google') ||
      originalRequest?.url?.includes('/api/auth/github')

    if (status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`
            originalRequest.headers['X-Access-Token'] = newToken
            resolve(axiosInstance(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshRes = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        )

        const newAccessToken = refreshRes.data?.accessToken
        if (newAccessToken) {
          setAuthCookies(newAccessToken)
          onRefreshed(newAccessToken)
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`
          originalRequest.headers['X-Access-Token'] = newAccessToken
          return axiosInstance(originalRequest)
        }
      } catch (refreshErr) {
        clearAuthCookies()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:expired'))
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        }
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject({
      status,
      message,
      data: error.response?.data,
      originalError: error,
      duration: error.duration || 0,
    })
  }
)

/**
 * Composable for easy HTTP API calls
 */
export function useApi() {
  const loading = ref(false)
  const error = ref(null)
  const data = ref(null)

  const request = async (apiCall) => {
    loading.value = true
    error.value = null
    try {
      const response = await apiCall()
      data.value = response.data
      return response
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    data,
    request,
    client: axiosInstance,
    baseURL: API_BASE_URL,
  }
}

export default axiosInstance
