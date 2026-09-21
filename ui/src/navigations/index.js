import { computed } from 'vue'
import { getRawToken, decodeToken } from '../plugins/constant.js'
import { useAuthStore } from '../stores/auth.js'

// ============================================================================
// ROLE MENUS CONFIGURATION (Based on authPosition from decodedToken)
// 1. admin:    Dashboard, Stores, Users, Settings
// 2. owner:    Dashboard, Weddings, Users, Settings
// 3. ordinary: Dashboard, Guests, Tables, Pictures
// ============================================================================

export const ROLE_MENUS = {
  admin: [
    { id: 'dashboard', path: '/dashboard', name: 'Dashboard', icon: '❖' },
    { id: 'stores', path: '/stores', name: 'Stores', icon: '🏬' },
    { id: 'users', path: '/users', name: 'Users', icon: '👥' },
    { id: 'settings', path: '/settings', name: 'Settings', icon: '⚙️' },
  ],
  owner: [
    { id: 'dashboard', path: '/dashboard', name: 'Dashboard', icon: '❖' },
    { id: 'weddings', path: '/weddings', name: 'Weddings', icon: '💍' },
    { id: 'users', path: '/users', name: 'Users', icon: '👥' },
    { id: 'settings', path: '/settings', name: 'Settings', icon: '⚙️' },
  ],
  ordinary: [
    { id: 'dashboard', path: '/dashboard', name: 'Dashboard', icon: '❖' },
    { id: 'guests', path: '/guests', name: 'Guests', icon: '📋' },
    { id: 'tables', path: '/tables', name: 'Tables', icon: '🍽️' },
    { id: 'pictures', path: '/pictures', name: 'Pictures', icon: '🖼️' },
  ],
}

/**
 * Extracts current authPosition from decoded token or user state
 * Supported roles: 'admin' | 'owner' | 'ordinary' (defaults to 'owner')
 */
export function getCurrentAuthPosition() {
  // 1. Check simulation/test override in sessionStorage
  if (typeof window !== 'undefined') {
    const override = sessionStorage.getItem('qrchive_auth_position_override')
    if (override && ROLE_MENUS[override.toLowerCase()]) {
      return override.toLowerCase()
    }
  }

  // 2. Check token claim via getToken('authPosition') or decodeToken(getRawToken())
  try {
    const rawToken = getRawToken()
    if (rawToken) {
      const decoded = decodeToken(rawToken)
      if (decoded?.authPosition && ROLE_MENUS[decoded.authPosition.toLowerCase()]) {
        return decoded.authPosition.toLowerCase()
      }
    }
  } catch (err) {
    console.warn('[navigation] Error reading authPosition from token:', err)
  }

  // 3. Fallback to localStorage stored user object
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('qrchive_user')
      if (stored) {
        const u = JSON.parse(stored)
        if (u?.authPosition && ROLE_MENUS[u.authPosition.toLowerCase()]) {
          return u.authPosition.toLowerCase()
        }
      }
    } catch { }
  }

  return 'owner'
}

/**
 * Extracts current status claim from decoded token, user profile, or session override
 * Supported values: 'pending' | 'active' (defaults to 'pending')
 */
export function getCurrentAuthStatus() {
  if (typeof window !== 'undefined') {
    const override = sessionStorage.getItem('qrchive_status_override')
    if (override) {
      return override.toLowerCase()
    }
  }

  try {
    const rawToken = getRawToken()
    if (rawToken) {
      const decoded = decodeToken(rawToken)
      if (decoded?.status) {
        return decoded.status.toLowerCase()
      }
    }
  } catch (err) {
    console.warn('[navigation] Error reading status from token:', err)
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('qrchive_user')
      if (stored) {
        const u = JSON.parse(stored)
        if (u?.status) {
          return u.status.toLowerCase()
        }
      }
    } catch { }
  }

  return 'pending'
}

/**
 * Returns the raw list of menu items for a specific role and status
 */
export function getMenusForRole(role, status) {
  const normalizedRole = (role || getCurrentAuthPosition() || 'owner').toLowerCase()
  const normalizedStatus = (status || getCurrentAuthStatus() || 'pending').toLowerCase()

  // When owner has pending status, remove all menus
  if (normalizedRole === 'owner' && normalizedStatus === 'pending') {
    return []
  }

  return ROLE_MENUS[normalizedRole] || ROLE_MENUS.owner
}

/**
 * Builds the hierarchical navigation sections for the given role and status
 */
export function getNavSections(role, status) {
  const normalizedRole = (role || getCurrentAuthPosition() || 'owner').toLowerCase()
  const normalizedStatus = (status || getCurrentAuthStatus() || 'pending').toLowerCase()

  // When owner and status is pending, remove all menus
  if (normalizedRole === 'owner' && normalizedStatus === 'pending') {
    return []
  }

  const items = ROLE_MENUS[normalizedRole] || ROLE_MENUS.owner
  const roleTitle = normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)

  return [
    {
      id: 'main',
      title: `${roleTitle} Workspace`,
      shortTitle: roleTitle,
      icon: '❖',
      items: [...items],
    },
  ]
}

/**
 * Composable providing reactive navSections, currentStatus, and isPendingOwner
 */
export function useNavSections() {
  let authStore = null
  try {
    authStore = useAuthStore()
  } catch { }

  const currentRole = computed(() => {
    return authStore?.authPosition || getCurrentAuthPosition()
  })

  const currentStatus = computed(() => {
    return authStore?.status || getCurrentAuthStatus()
  })

  const isPendingOwner = computed(() => {
    return currentRole.value?.toLowerCase() === 'owner' && currentStatus.value?.toLowerCase() === 'pending'
  })

  const navSections = computed(() => getNavSections(currentRole.value, currentStatus.value))

  return {
    currentRole,
    currentStatus,
    isPendingOwner,
    navSections,
    getNavSections,
    getMenusForRole,
  }
}

// Proxy wrapper for backward compatibility so direct imports of `navSections`
// automatically evaluate against current role in any execution context.
export const navSections = new Proxy([], {
  get(target, prop, receiver) {
    const sections = getNavSections()
    if (prop === 'value') return sections
    if (typeof sections[prop] === 'function') {
      return sections[prop].bind(sections)
    }
    return Reflect.get(sections, prop, receiver)
  },
  has(target, prop) {
    const sections = getNavSections()
    return prop in sections
  },
  ownKeys() {
    const sections = getNavSections()
    return Reflect.ownKeys(sections)
  },
  getOwnPropertyDescriptor(target, prop) {
    const sections = getNavSections()
    return Object.getOwnPropertyDescriptor(sections, prop)
  },
})

// ============================================================================
// HELPER UTILITIES FOR HIERARCHICAL NAVIGATION
// ============================================================================

/**
 * Checks if a specific item matches the current active route path
 */
export function isItemActive(item, currentPath) {
  if (!item || !currentPath) return false
  if (item.path) {
    if (item.path === currentPath) return true
    if (item.path === '/dashboard' && (currentPath === '/' || currentPath === '' || currentPath === '/overview')) return true
  }
  return false
}

/**
 * Recursively checks if an item or any of its descendants matches the current path
 */
export function hasActiveChild(item, currentPath) {
  if (!item || !item.children || !Array.isArray(item.children)) return false
  return item.children.some(child => {
    if (isItemActive(child, currentPath)) return true
    if (child.children && child.children.length > 0) {
      return hasActiveChild(child, currentPath)
    }
    return false
  })
}

/**
 * Checks if any item in a section is active
 */
export function isSectionActive(section, currentPath) {
  if (!section || !section.items) return false
  return section.items.some(item => {
    if (isItemActive(item, currentPath)) return true
    if (hasActiveChild(item, currentPath)) return true
    return false
  })
}

export default navSections
