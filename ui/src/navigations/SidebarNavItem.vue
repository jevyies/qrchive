<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { isItemActive, hasActiveChild } from './index'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  level: {
    type: Number,
    default: 1
  },
  collapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['closeMobile'])

const route = useRoute()

// Check if this item is a parent group with children
const hasChildren = computed(() => {
  return Array.isArray(props.item.children) && props.item.children.length > 0
})

// Check if any descendant is active
const isChildActive = computed(() => {
  return hasChildren.value && hasActiveChild(props.item, route.path)
})

// Check if this item itself is active
const isSelfActive = computed(() => {
  return isItemActive(props.item, route.path)
})

// Open/close accordion state
const isOpen = ref(false)

const toggleGroup = () => {
  isOpen.value = !isOpen.value
}

// Auto-expand accordion if child route is active
const checkAutoExpand = () => {
  if (isChildActive.value) {
    isOpen.value = true
  }
}

onMounted(() => {
  checkAutoExpand()
})

watch(() => route.path, () => {
  checkAutoExpand()
})
</script>

<template>
  <!-- GROUP WITH CHILDREN (Level 1 or Level 2 Parent) -->
  <div v-if="hasChildren" :class="[
    'sidebar-nav-group',
    `sidebar-nav-group-level-${level}`,
    {
      'has-active-child': isChildActive,
      'is-open': isOpen
    }
  ]">
    <button type="button" :class="[
      'sidebar-nav-group-toggle',
      `sidebar-nav-level-${level}`,
      {
        'is-open': isOpen,
        'active': isChildActive
      }
    ]" :title="item.name" @click="toggleGroup">
      <!-- Icon / Dot based on level -->
      <span v-if="item.icon" class="sidebar-icon">{{ item.icon }}</span>
      <span v-else-if="level === 3" class="sidebar-dot"></span>
      <span v-else class="sidebar-icon">📁</span>

      <!-- Title text -->
      <span class="sidebar-nav-text flex-1 text-truncate">{{ item.name }}</span>

      <!-- Badge (if any) -->
      <span v-if="item.badge" :class="['badge badge-xs sidebar-badge', item.badgeClass || 'badge-tonal-primary']">
        {{ item.badge }}
      </span>

      <!-- Chevron Arrow -->
      <span class="sidebar-chevron">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </span>
    </button>

    <!-- Sub-menu Items (Level 2 or Level 3) -->
    <transition name="accordion">
      <div v-if="isOpen && !collapsed" class="sidebar-nav-group-menu sidebar-tree-guide">
        <SidebarNavItem v-for="child in item.children" :key="child.id || child.path || child.name" :item="child"
          :level="level + 1" :collapsed="collapsed" @close-mobile="emit('closeMobile')" />
      </div>
    </transition>
  </div>

  <!-- DIRECT ROUTE LINK (Leaf item at Level 1, 2, or 3) -->
  <div v-else class="sidebar-nav-item">
    <RouterLink :to="item.path" :class="[
      'sidebar-nav-link',
      `sidebar-nav-level-${level}`,
      {
        'active': isSelfActive
      }
    ]" :title="item.name" @click="emit('closeMobile')">
      <!-- Level 3 Bullet Dot vs Level 1/2 Icon -->
      <span v-if="level >= 3 && !item.icon" class="sidebar-dot"></span>
      <span v-else class="sidebar-icon">{{ item.icon || '❖' }}</span>

      <span class="sidebar-nav-text flex-1 text-truncate">{{ item.name }}</span>

      <span v-if="item.badge" :class="['badge badge-xs sidebar-badge', item.badgeClass || 'badge-tonal-primary']">
        {{ item.badge }}
      </span>
    </RouterLink>
  </div>
</template>

<style scoped>
.accordion-enter-active,
.accordion-leave-active {
  transition: opacity 200ms ease, max-height 250ms cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 500px;
  overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}
</style>
