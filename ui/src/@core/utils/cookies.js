/**
 * ============================================================================
 * Cookie Utility for Client-side Token and Session Storage
 * Handles X-Access-Token and X-Refresh-Token cookies with SameSite & Path support.
 * ============================================================================
 */

export const getCookie = (name) => {
  if (typeof document === 'undefined') return null
  const nameEQ = encodeURIComponent(name) + '='
  const ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim()
    if (c.indexOf(nameEQ) === 0) {
      try {
        return decodeURIComponent(c.substring(nameEQ.length))
      } catch {
        return c.substring(nameEQ.length)
      }
    }
  }
  return null
}

export const setCookie = (name, value, days = 1, options = {}) => {
  if (typeof document === 'undefined') return
  let expires = ''
  if (days) {
    const date = new Date()
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
    expires = '; expires=' + date.toUTCString()
  }

  const path = options.path || '/'
  const sameSite = options.sameSite || 'Lax'
  const secure = options.secure ?? (typeof window !== 'undefined' && window.location.protocol === 'https:')

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value || '')}${expires}; path=${path}; SameSite=${sameSite}`
  if (secure) {
    cookieString += '; Secure'
  }
  document.cookie = cookieString
}

export const removeCookie = (name, options = {}) => {
  if (typeof document === 'undefined') return
  const path = options.path || '/'
  document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

export const getAuthToken = () => {
  return getCookie('X-Access-Token') || getCookie('accessToken') || getCookie('token')
}

export const getRefreshToken = () => {
  return getCookie('X-Refresh-Token') || getCookie('refreshToken')
}

export const setAuthCookies = (accessToken, refreshToken = null, rememberMe = false) => {
  const days = rememberMe ? 90 : 1
  if (accessToken) {
    setCookie('X-Access-Token', accessToken, days)
  }
  if (refreshToken) {
    setCookie('X-Refresh-Token', refreshToken, days)
  }
}

export const clearAuthCookies = () => {
  removeCookie('X-Access-Token')
  removeCookie('accessToken')
  removeCookie('token')
  removeCookie('X-Refresh-Token')
  removeCookie('refreshToken')

  if (typeof window !== 'undefined') {
    localStorage.removeItem('X-Access-Token')
    localStorage.removeItem('X-Refresh-Token')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('jui_auth_token')
    localStorage.removeItem('jui_user')
  }
}

export const hasAuthToken = () => {
  const token = getAuthToken()
  return typeof token === 'string' && token.trim().length > 0
}
