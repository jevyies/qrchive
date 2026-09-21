<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useNavSections, isSectionActive, hasActiveChild } from './index'

const route = useRoute()
const { navSections } = useNavSections()

// Dropdown state
const activeNavbarDropdown = ref(null)
const activeSubmenu = ref(null)

const toggleNavbarDropdown = (name) => {
  activeNavbarDropdown.value = activeNavbarDropdown.value === name ? null : name
  activeSubmenu.value = null
}

const toggleSubmenu = (name) => {
  activeSubmenu.value = activeSubmenu.value === name ? null : name
}

const closeAllDropdowns = () => {
  activeNavbarDropdown.value = null
  activeSubmenu.value = null
}

// Close dropdowns on route change
watch(() => route.path, () => {
  closeAllDropdowns()
})

const handleDocumentClick = (e) => {
  if (!e.target.closest('.navbar-dropdown') && !e.target.closest('.dropdown')) {
    closeAllDropdowns()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})

const checkSectionActive = (section) => {
  return isSectionActive(section, route.path)
}
</script>

<template>
  <template v-for="section in navSections" :key="section.id">
    <!-- Render flat items directly as horizontal nav links -->
    <template v-for="item in section.items" :key="item.id || item.path || item.name">
      <!-- 1. Flat Direct Link -->
      <RouterLink
        v-if="!item.children || item.children.length === 0"
        :to="item.path"
        class="navbar-link d-inline-flex align-center gap-2"
        active-class="active"
      >
        <span>{{ item.icon }}</span>
        <span>{{ item.name }}</span>
      </RouterLink>

      <!-- 2. Dropdown Menu for items with children -->
      <div v-else class="navbar-dropdown">
        <button :class="[
          'navbar-dropdown-toggle',
          {
            'is-open': activeNavbarDropdown === (item.id || item.name),
            'has-active': hasActiveChild(item, route.path)
          }
        ]" @click.stop="toggleNavbarDropdown(item.id || item.name)">
          <span>{{ item.icon }}</span>
          <span>{{ item.name }}</span>
          <span class="dropdown-arrow">▾</span>
        </button>

        <div :class="['dropdown-menu', { show: activeNavbarDropdown === (item.id || item.name) }]" style="min-width: 14.5rem;">
          <div class="dropdown-header">{{ item.name }}</div>
          <RouterLink
            v-for="sub in item.children"
            :key="sub.path"
            :to="sub.path"
            class="dropdown-item"
            active-class="active"
            @click="closeAllDropdowns"
          >
            <span>{{ sub.icon || '❖' }}</span>
            <span class="flex-1 text-truncate">{{ sub.name }}</span>
          </RouterLink>
        </div>
      </div>
    </template>
  </template>
</template>
