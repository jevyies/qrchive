import { getAuthToken, getCookie } from '../@core/utils/cookies.js'

/**
 * ============================================================================
 * CONSTANT & GLOBAL FUNCTIONS PLUGIN
 * Provides global helper functions (e.g. getToken) across all Vue components
 * and pages via Vue's provide/inject ('globalFunctions') and $globalFunctions.
 * ============================================================================
 */

/**
 * Safely decodes a JWT token payload without external libraries.
 * Handles standard Base64 and Base64URL encoding with Unicode character sets.
 *
 * @param {string} token - The raw JWT string
 * @returns {object|null} Decoded JSON payload or null if invalid
 */
export const decodeToken = (token) => {
  if (!token || typeof token !== 'string') return null

  try {
    const parts = token.trim().split('.')
    if (parts.length !== 3) return null

    // Base64URL to standard Base64
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')

    // UTF-8 decoding
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )

    return JSON.parse(jsonPayload)
  } catch (err) {
    console.warn('[constant.js] Error decoding JWT payload:', err)
    return null
  }
}

/**
 * Retrieves the raw access token string from cookies or browser web storage.
 *
 * @returns {string|null} Raw token or null
 */
export const getRawToken = () => {
  if (typeof window === 'undefined') return null

  return getAuthToken() || getCookie('X-Access-Token') || null
}

/**
 * Extracts the values and claims of the access token (such as id, status, authPosition, username, email).
 *
 * Usage:
 *   getToken()        -> Returns the full decoded token payload object with helper properties (e.g. { id, status, authPosition, ... })
 *   getToken('id')    -> Returns user ID extracted from accessToken
 *   getToken('status') -> Returns status extracted from accessToken (e.g. 'pending' / 'active')
 *   getToken('authPosition') -> Returns authPosition (e.g. 'owner')
 *   getToken('raw')   -> Returns raw JWT string
 *
 * @param {string} [key] - Optional specific claim to extract
 * @returns {object|string|number|null} Decoded token object or extracted property value
 */
export const getToken = (key) => {
  const rawToken = getRawToken()
  if (!rawToken) return null

  const decoded = decodeToken(rawToken)

  // If token cannot be decoded, fallback to returning raw token or null
  if (!decoded) {
    return key ? null : rawToken
  }

  // If specific field requested
  if (key && typeof key === 'string') {
    if (key === 'raw' || key === 'rawToken' || key === 'token') {
      return rawToken
    }
    return decoded[key] !== undefined ? decoded[key] : null
  }

  // Return decoded payload with convenient rawToken property and string coercion
  const tokenData = {
    ...decoded,
    token: rawToken,
  }

  Object.defineProperty(tokenData, 'toString', {
    value: () => rawToken,
    enumerable: false,
    writable: true,
  })

  Object.defineProperty(tokenData, 'valueOf', {
    value: () => rawToken,
    enumerable: false,
    writable: true,
  })

  return tokenData
}

/**
 * Global functions container exposed to injection and template properties
 */
export const globalFunctions = {
  getToken,
  getRawToken,
  decodeToken,
}
