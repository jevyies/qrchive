import { createRouter, createWebHistory } from 'vue-router'
import routes from '~pages'
import { hasAuthToken } from '../@core/utils/cookies'
import { getCurrentAuthPosition, getCurrentAuthStatus, ROLE_MENUS, getMenusForRole } from '../navigations'

// ============================================================================
// ROLE-BASED ROUTE PERMISSIONS
// Defines which authPosition can access specific paths
// 1. admin:    /dashboard, /stores, /users, /settings
// 2. owner:    /dashboard, /weddings, /users, /settings
// 3. ordinary: /dashboard, /guests, /tables, /pictures
// ============================================================================

export const ROUTE_PERMISSIONS = {
  '/dashboard': ['admin', 'owner', 'ordinary'],
  '/stores': ['admin'],
  '/weddings': ['owner'],
  '/users': ['admin', 'owner'],
  '/settings': ['admin', 'owner'],
  '/guests': ['ordinary'],
  '/tables': ['ordinary'],
  '/pictures': ['ordinary'],
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...routes,
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/pages/dasboard/index.vue'),
    },
    {
      path: '/dashboard/event/:id',
      name: 'dashboard-event-detail',
      component: () => import('@/pages/dasboard/event/[id].vue'),
    },
    {
      path: '/dasboard',
      redirect: '/dashboard',
    },
    {
      path: '/dasboard/event/:id',
      redirect: (to) => `/dashboard/event/${to.params.id}`,
    },
    {
      path: '/quests',
      name: 'quests-shortcut',
      redirect: () => {
        let eventId = 'demo-event'
        if (typeof localStorage !== 'undefined') {
          const currentEventStr = localStorage.getItem('currentEvent')
          if (currentEventStr) {
            try {
              const parsed = JSON.parse(currentEventStr)
              if (parsed.eventCode) eventId = parsed.eventCode
            } catch (e) { }
          }
          if (eventId === 'demo-event') {
            eventId =
              localStorage.getItem('qrchive_current_event_id') ||
              localStorage.getItem('qrchive_event_id') ||
              'demo-event'
          }
        }
        return `/event/${eventId}/quests`
      },
    },
    {
      path: '/404',
      name: 'not-found',
      component: () => import('@/views/404.vue'),
      meta: {
        layout: 'blank',
        public: true,
      },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard',
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  },
})

// Authentication & Role-Based Route Guard:
// 1. If user visits public routes (/, /login, /register), allow access.
// 2. If token is saved in cookie and user navigates to /login or /register, route goes to /dashboard.
// 3. If there is no token saved in cookie and route is protected, route must go to /login.
// 4. If user is owner with status 'pending', they CANNOT access any menus aside from /dashboard.
// 5. If user navigates to a role-restricted route not allowed for their authPosition, route goes to /dashboard.
router.beforeEach((to) => {
  const authenticated = hasAuthToken()

  // Allow public landing page, auth pages, and guest event vault routes
  if (
    to.path === '/' ||
    to.path === '/login' ||
    to.path === '/register' ||
    to.path.startsWith('/event') ||
    to.path === '/quests' ||
    to.path === '/404' ||
    to.meta?.public
  ) {
    if (authenticated && (to.path === '/login' || to.path === '/register')) {
      return '/dashboard'
    }
    return true
  }

  if (!authenticated) {
    return {
      path: '/login',
      query: to.fullPath && to.fullPath !== '/' && to.fullPath !== '/dashboard' ? { redirect: to.fullPath } : undefined,
    }
  }

  const currentRole = getCurrentAuthPosition()
  const currentStatus = getCurrentAuthStatus()

  // Strict restriction: If owner has pending status, only /dashboard is accessible
  if (currentRole === 'owner' && currentStatus === 'pending') {
    if (to.path !== '/dashboard') {
      console.warn(`[RouteGuard] Owner status is pending. Access to '${to.path}' denied. Redirecting to /dashboard.`)
      return '/dashboard'
    }
    return true
  }

  // Role authorization check based on authPosition from decoded token
  const allowedRoles = ROUTE_PERMISSIONS[to.path]

  if (allowedRoles && !allowedRoles.includes(currentRole)) {
    console.warn(`[RouteGuard] Access denied to ${to.path} for role '${currentRole}'. Redirecting to /dashboard.`)
    return '/dashboard'
  }

  return true
})

export { ROLE_MENUS, getMenusForRole, getCurrentAuthPosition, getCurrentAuthStatus }
export default router
