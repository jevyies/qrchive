<script setup>
import { useNavSections } from './index'
import { useAuthStore } from '../stores/auth'
import AppLogo from '../@core/components/AppLogo.vue'
import SidebarNavItem from './SidebarNavItem.vue'

const authStore = useAuthStore()
const { navSections, currentRole, isPendingOwner, isOwner } = useNavSections()

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  },
  mobileOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:collapsed', 'update:mobileOpen'])

const toggleCollapse = () => {
  emit('update:collapsed', !props.collapsed)
}

const closeMobile = () => {
  emit('update:mobileOpen', false)
}

const handleCreateStoreClick = () => {
  closeMobile()
  authStore.openCreateStoreModal()
}
</script>

<template>
  <!-- Sidebar Container (Desktop Fixed / Mobile Drawer) -->
  <aside v-if="authStore.authPosition !== 'owner' && !isOwner" :class="[
    'sidebar',
    {
      'sidebar-collapsed': collapsed,
      'sidebar-mobile-open': mobileOpen
    }
  ]">
    <!-- Brand Header -->
    <div class="sidebar-header">
      <RouterLink to="/dashboard" class="sidebar-brand" @click="closeMobile" title="QRchive Dashboard">
        <AppLogo :width="30" :height="22" class="sidebar-brand-logo" />
        <span class="sidebar-brand-text">QRchive</span>
      </RouterLink>

      <!-- Desktop Collapse Arrow Button (>= 992px) -->
      <button class="btn btn-icon btn-xs btn-tonal-neutral d-none d-lg-flex" @click="toggleCollapse"
        :title="collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <polyline :points="collapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'"></polyline>
        </svg>
      </button>

      <!-- Mobile Drawer Close Button (< 992px) -->
      <button class="btn btn-icon btn-xs btn-tonal-neutral d-lg-none" @click="closeMobile" title="Close Sidebar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <!-- Navigation Menu (Scrollable inside Sidebar) -->
    <nav class="sidebar-nav">
      <!-- 1. Normal Active Mode: Render Menu Sections -->
      <template v-if="!isPendingOwner && !isOwner && authStore.authPosition !== 'owner'">
        <template v-for="section in navSections" :key="section.id">
          <div class="sidebar-nav-header">{{ section.title }}</div>
          <SidebarNavItem
            v-for="item in section.items"
            :key="item.id || item.path || item.name"
            :item="item"
            :level="1"
            :collapsed="collapsed"
            @close-mobile="closeMobile"
          />
        </template>
      </template>

      <!-- 2. Pending Owner Mode: Menus Removed, 'Create your own store' Card Displayed -->
      <div v-else class="p-3">
        <!-- Expanded View Card -->
        <JCard
          v-if="!collapsed"
          variant="tonal"
          class="border border-primary-subtle text-center shadow-sm"
          body-class="p-3 d-flex flex-column align-center gap-2"
        >
          <div
            class="d-flex justify-center align-center rounded-2xl"
            style="width: 2.75rem; height: 2.75rem; font-size: 1.35rem; background: var(--primary-tonal, rgba(99, 102, 241, 0.15)); border: 1px solid var(--border-color-subtle);"
          >
            🏬
          </div>
          <div class="d-flex flex-column gap-1 w-full text-center">
            <h4 class="text-sm font-bold mb-0 text-primary">Store Setup (80%)</h4>
            <p class="text-xs text-muted mb-2" style="line-height: 1.35;">
              You're almost there! Fill up some important info to unlock all owner features.
            </p>
            <JBtn
              color="primary"
              variant="solid"
              size="sm"
              block
              @click="handleCreateStoreClick"
            >
              <template #prepend>📝</template>
              Fill up form
            </JBtn>
          </div>
        </JCard>

        <!-- Collapsed Sidebar Trigger -->
        <div v-else class="d-flex flex-column align-center gap-1 py-2">
          <button
            type="button"
            class="btn btn-icon btn-sm btn-primary rounded-xl"
            title="Create your own store"
            @click="handleCreateStoreClick"
          >
            <span style="font-size: 1.1rem;">🏬</span>
          </button>
          <span class="text-primary font-bold text-center" style="font-size: 0.65rem; line-height: 1.1;">New Store</span>
        </div>
      </div>
    </nav>

    <!-- Sidebar Footer -->
    <div class="sidebar-footer">
      <div class="stat-icon d-flex justify-center align-center"
        style="width: 2.25rem; height: 2.25rem; font-size: 0.9rem; border-radius: 50%;">
        ⚡
      </div>
      <div class="sidebar-nav-text flex-1" style="min-width: 0;">
        <div class="font-semibold text-sm text-truncate">QRchive</div>
        <div class="text-xs text-muted text-truncate text-capitalize">
          {{ currentRole }} <span v-if="isPendingOwner" class="text-warning">(Pending)</span><span v-else>Workspace</span>
        </div>
      </div>
    </div>
  </aside>

  <!-- Floating Sidebar Drawer Backdrop on Mobile Screen -->
  <div v-if="authStore.authPosition !== 'owner' && !isOwner" :class="['sidebar-backdrop', { show: mobileOpen }]" @click="closeMobile"></div>
</template>
