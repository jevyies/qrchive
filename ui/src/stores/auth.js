import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { axiosInstance } from '../plugins/axios.js'
import { getAuthToken, setAuthCookies, clearAuthCookies } from '../@core/utils/cookies.js'
import { decodeToken } from '../plugins/constant.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(
    typeof window !== 'undefined' && localStorage.getItem('qrchive_user') ? JSON.parse(localStorage.getItem('qrchive_user')) : null
  )

  const token = ref(getAuthToken() || null)
  const isLoading = ref(false)
  const error = ref(null)

  // Optional manual override for role simulation/testing (stored in sessionStorage)
  const overrideAuthPosition = ref(
    typeof window !== 'undefined' && (sessionStorage.getItem('qrchive_auth_position_override') || sessionStorage.getItem('qrchive_auth_position_override'))
      ? (sessionStorage.getItem('qrchive_auth_position_override') || sessionStorage.getItem('qrchive_auth_position_override'))
      : null
  )

  // Optional manual override for status simulation/testing (stored in sessionStorage)
  const overrideStatus = ref(
    typeof window !== 'undefined' && sessionStorage.getItem('qrchive_status_override') ? sessionStorage.getItem('qrchive_status_override') : null
  )

  const isAuthenticated = computed(() => !!token.value)
  const userRole = computed(() => user.value?.role || 'User')
  const userFullname = computed(() => user.value?.fullname || user.value?.username || 'Authenticated User')

  // Reactive authPosition derived from token claim, user profile, or simulation override
  const authPosition = computed(() => {
    if (overrideAuthPosition.value) {
      return overrideAuthPosition.value.toLowerCase()
    }
    if (user.value?.authPosition) {
      return user.value.authPosition.toLowerCase()
    }
    if (token.value) {
      const decoded = decodeToken(token.value)
      if (decoded?.authPosition) {
        return decoded.authPosition.toLowerCase()
      }
    }
    return 'owner'
  })

  // Reactive status derived from token claim, user profile, or simulation override
  const status = computed(() => {
    if (overrideStatus.value) {
      return overrideStatus.value.toLowerCase()
    }
    if (token.value) {
      const decoded = decodeToken(token.value)
      if (decoded?.status) {
        return decoded.status.toLowerCase()
      }
    }
    if (user.value?.status) {
      return user.value.status.toLowerCase()
    }
    return 'pending'
  })

  // True if user is an owner with pending status
  const isPendingOwner = computed(() => {
    return authPosition.value?.toLowerCase() === 'owner' && status.value?.toLowerCase() === 'pending'
  })

  const setAuthPositionOverride = (pos) => {
    overrideAuthPosition.value = pos
    if (typeof window !== 'undefined') {
      if (pos) {
        sessionStorage.setItem('qrchive_auth_position_override', pos)
        sessionStorage.setItem('qrchive_auth_position_override', pos)
      } else {
        sessionStorage.removeItem('qrchive_auth_position_override')
        sessionStorage.removeItem('qrchive_auth_position_override')
      }
    }
  }

  const setStatusOverride = (s) => {
    overrideStatus.value = s
    if (typeof window !== 'undefined') {
      if (s) {
        sessionStorage.setItem('qrchive_status_override', s)
      } else {
        sessionStorage.removeItem('qrchive_status_override')
      }
    }
  }

  // State for "Create Your Own Store" modal
  const isCreateStoreModalOpen = ref(false)
  const openCreateStoreModal = () => {
    isCreateStoreModalOpen.value = true
  }
  const closeCreateStoreModal = () => {
    isCreateStoreModalOpen.value = false
  }

  const setAuthData = (userData, accessToken, refreshToken = null, rememberMe = false) => {
    user.value = userData
    token.value = accessToken
    setAuthCookies(accessToken, refreshToken, rememberMe)
    if (typeof window !== 'undefined' && userData) {
      localStorage.setItem('qrchive_user', JSON.stringify(userData))
    }
  }

  const oauthPendingProfile = ref(
    typeof window !== 'undefined' && (sessionStorage.getItem('qrchive_oauth_pending') || sessionStorage.getItem('wedding_oauth_pending'))
      ? JSON.parse(sessionStorage.getItem('qrchive_oauth_pending') || sessionStorage.getItem('wedding_oauth_pending'))
      : null
  )

  const setOAuthPendingProfile = (profile) => {
    oauthPendingProfile.value = profile
    if (typeof window !== 'undefined') {
      if (profile) {
        sessionStorage.setItem('wedding_oauth_pending', JSON.stringify(profile))
      } else {
        sessionStorage.removeItem('wedding_oauth_pending')
      }
    }
  }

  const clearOAuthPending = () => {
    setOAuthPendingProfile(null)
  }

  // 1. Manual Login (/api/auth/login)
  const login = async (credentials) => {
    isLoading.value = true
    error.value = null

    try {
      const res = await axiosInstance.post('/api/auth/login', {
        username: credentials.username || credentials.email,
        password: credentials.password,
        rememberMe: credentials.rememberMe ?? false,
      })

      setAuthData(res.data.user, res.data.accessToken, null, credentials.rememberMe)
      clearOAuthPending()
      return res.data
    } catch (err) {
      error.value = err.message || err.data?.message || 'Login failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 2. Google OAuth (/api/auth/google)
  const loginWithGoogle = async (credentialOrAccessToken, rememberMe = false) => {
    isLoading.value = true
    error.value = null

    try {
      let payload = {}

      if (typeof credentialOrAccessToken === 'object' && credentialOrAccessToken !== null) {
        payload = { ...credentialOrAccessToken }
        if (payload.rememberMe === undefined) {
          payload.rememberMe = rememberMe
        }
      } else if (typeof credentialOrAccessToken === 'string') {
        const trimmed = credentialOrAccessToken.trim()
        // A Google ID Token is a signed JWT starting with 'ey' and containing 3 dot-separated segments
        if (trimmed.startsWith('ey') && trimmed.split('.').length === 3) {
          payload = { credential: trimmed, rememberMe }
        } else {
          // OAuth2 access token (e.g. 'ya29...')
          payload = { accessToken: trimmed, rememberMe }
        }
      }

      const res = await axiosInstance.post('/api/auth/google', payload)
      if (res.data.registered === false) {
        setOAuthPendingProfile(res.data.profile)
        return res.data
      }

      setAuthData(res.data.user, res.data.accessToken, null, payload.rememberMe ?? rememberMe)
      clearOAuthPending()
      return res.data
    } catch (err) {
      error.value = err.message || err.data?.message || 'Google authentication failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 3. GitHub OAuth (/api/auth/github)
  const loginWithGitHub = async (codeOrToken, rememberMe = false) => {
    isLoading.value = true
    error.value = null

    try {
      const payload = {
        code: codeOrToken,
        rememberMe,
      }

      const res = await axiosInstance.post('/api/auth/github', payload)
      if (res.data.registered === false) {
        setOAuthPendingProfile(res.data.profile)
        return res.data
      }

      setAuthData(res.data.user, res.data.accessToken, null, rememberMe)
      clearOAuthPending()
      return res.data
    } catch (err) {
      error.value = err.message || err.data?.message || 'GitHub authentication failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 3.5 Send Email Verification Code (/api/auth/send-verification-code)
  const sendVerificationCode = async (data) => {
    isLoading.value = true
    error.value = null

    try {
      const res = await axiosInstance.post('/api/auth/send-verification-code', data)
      return res.data
    } catch (err) {
      error.value = err.message || err.data?.message || 'Failed to send verification code'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 4. Register (/api/auth/register)
  const register = async (registrationData) => {
    isLoading.value = true
    error.value = null

    try {
      const res = await axiosInstance.post('/api/auth/register', registrationData)
      if (res.data?.accessToken && res.data?.user) {
        setAuthData(res.data.user, res.data.accessToken, null, registrationData.rememberMe ?? false)
        clearOAuthPending()
      }
      return res.data
    } catch (err) {
      error.value = err.message || err.data?.message || 'Registration failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // 5. Fetch Current User Profile (/api/auth/me)
  const fetchCurrentUser = async () => {
    try {
      const res = await axiosInstance.get('/api/auth/me')
      if (res.data?.user) {
        user.value = res.data.user
        if (typeof window !== 'undefined') {
          localStorage.setItem('qrchive_user', JSON.stringify(res.data.user))
        }
      }
      return res.data
    } catch (err) {
      console.warn('Failed to fetch user profile:', err)
      throw err
    }
  }

  // 6. Refresh Access Token (/api/auth/refresh)
  const refreshToken = async () => {
    try {
      const res = await axiosInstance.post('/api/auth/refresh')
      if (res.data?.accessToken) {
        token.value = res.data.accessToken
        setAuthCookies(res.data.accessToken)
      }
      if (res.data?.user) {
        user.value = res.data.user
      }
      return res.data
    } catch (err) {
      clearAuthCookies()
      token.value = null
      user.value = null
      throw err
    }
  }

  // 7. Logout (/api/auth/logout)
  const logout = async () => {
    try {
      await axiosInstance.post('/api/auth/logout')
    } catch (err) {
      console.warn('Server logout error (proceeding with local cleanup):', err)
    } finally {
      clearAuthCookies()
      clearOAuthPending()
      token.value = null
      user.value = null
      if (typeof window !== 'undefined') {
        localStorage.removeItem('qrchive_user')
      }
    }
  }

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    userRole,
    userFullname,
    authPosition,
    overrideAuthPosition,
    setAuthPositionOverride,
    status,
    overrideStatus,
    setStatusOverride,
    isPendingOwner,
    isCreateStoreModalOpen,
    openCreateStoreModal,
    closeCreateStoreModal,
    oauthPendingProfile,
    setOAuthPendingProfile,
    clearOAuthPending,
    login,
    loginWithGoogle,
    loginWithGitHub,
    sendVerificationCode,
    register,
    fetchCurrentUser,
    refreshToken,
    logout,
  }
})
