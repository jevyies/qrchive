<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLayout } from './composables/useLayout'
import { useDisplay } from './composables/useDisplay'
import AppSidebar from './navigations/sidebar.vue'
import AppNavbar from './navigations/navbar.vue'
import JToastContainer from './@core/components/JToastContainer.vue'

const route = useRoute()
const { themes, layoutMode, setLayoutMode, currentTheme, selectTheme, navbarMenuMode, setNavbarMenuMode } = useLayout()

// Sidebar internal state
const isSidebarCollapsed = ref(false)
const isMobileSidebarOpen = ref(false)
const { isMobile } = useDisplay();

// Determine if current route is a blank layout (no sidebar, no navbar)
const isBlankLayout = computed(() => {
  return (
    route.meta?.layout === 'blank' ||
    route.meta?.blank === true ||
    ['/', '/login', '/register', '/404', '/500'].includes(route.path) ||
    (typeof window !== 'undefined' && ['/', '/login', '/register', '/404', '/500'].includes(window.location.pathname))
  )
})

// Close drawers on route navigation
watch(() => route.path, () => {
  isMobileSidebarOpen.value = false
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('modal-open')
    document.body.classList.remove('modal-open')
  }
})

// Prevent background scroll when mobile sidebar drawer is open
watch(isMobileSidebarOpen, (isOpen) => {
  if (typeof document !== 'undefined') {
    if (isOpen) {
      document.documentElement.classList.add('modal-open')
      document.body.classList.add('modal-open')
    } else {
      document.documentElement.classList.remove('modal-open')
      document.body.classList.remove('modal-open')
    }
  }
})
</script>

<template>
  <div class="app-root">
    <!-- ======================================================================= -->
    <!-- BLANK LAYOUT (Auth & Error pages: No Sidebar, No Top Navbar)             -->
    <!-- ======================================================================= -->
    <div v-if="isBlankLayout" class="min-h-screen w-full d-flex flex-column"
      style="max-width: 100vw; overflow-x: hidden;">
      <RouterView />
    </div>

    <!-- ======================================================================= -->
    <!-- STANDARD LAYOUT (With Sidebar or Top Navbar)                            -->
    <!-- ======================================================================= -->
    <div v-else :class="['min-h-screen w-full', layoutMode === 'sidebar' ? 'd-flex' : 'd-flex flex-column']"
      style="max-width: 100vw; overflow-x: hidden;">

      <!-- ===================================================================== -->
      <!-- SIDEBAR NAVIGATION COMPONENT (Desktop Sticky / Mobile Drawer)          -->
      <!-- ===================================================================== -->
      <AppSidebar v-if="layoutMode === 'sidebar'" v-model:collapsed="isSidebarCollapsed"
        v-model:mobileOpen="isMobileSidebarOpen" />

      <!-- ===================================================================== -->
      <!-- MAIN CONTENT CONTAINER                                                -->
      <!-- ===================================================================== -->
      <div :class="[
        'main-wrapper flex-1 d-flex flex-column min-w-0 w-full',
        {
          'has-sidebar': layoutMode === 'sidebar',
          'has-sidebar-collapsed': layoutMode === 'sidebar' && isSidebarCollapsed,
          'has-menubar': layoutMode === 'navbar' && navbarMenuMode === 'menu-bar'
        }
      ]" style="max-width: 100%;">
        <!-- =================================================================== -->
        <!-- TOP NAVBAR COMPONENT                                                -->
        <!-- =================================================================== -->
        <AppNavbar :layout-mode="layoutMode" :navbar-menu-mode="navbarMenuMode" :current-theme="currentTheme"
          :themes="themes" v-model:mobile-sidebar-open="isMobileSidebarOpen" @set-layout-mode="setLayoutMode"
          @set-navbar-menu-mode="setNavbarMenuMode" @select-theme="selectTheme" />

        <!-- =================================================================== -->
        <!-- MAIN PAGE CONTENT (RouterView)                                      -->
        <!-- =================================================================== -->
        <main class="p-sm-4 p-md-6 flex-1 w-full" style="max-width: 100%; overflow-x: hidden;"
          :class="{ 'p-5': !isMobile }">
          <RouterView />
        </main>
      </div>
    </div>


    <!-- ===================================================================== -->
    <!-- GLOBAL TOAST NOTIFICATION VIEWPORT CONTAINER                         -->
    <!-- ===================================================================== -->
    <JToastContainer />
  </div>
</template>

<style scoped>
/* Layout styles managed via SCSS system */
</style>
