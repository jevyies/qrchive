<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true,
  },
  modelValue: {
    type: [String, Number],
    default: null,
  },
  orientation: {
    type: String,
    default: 'horizontal', // 'horizontal' | 'vertical' | 'vertical-right'
    validator: (v) => ['horizontal', 'vertical', 'vertical-right'].includes(v),
  },
  variant: {
    type: String,
    default: 'line', // 'line' | 'pills' | 'tonal' | 'segmented' | 'boxed' | 'bordered' | 'card' | 'glass'
  },
  size: {
    type: String,
    default: 'md', // 'sm' | 'md' | 'lg'
  },
  grow: {
    type: Boolean,
    default: false,
  },
  center: {
    type: Boolean,
    default: false,
  },
  end: {
    type: Boolean,
    default: false,
  },
  card: {
    type: Boolean,
    default: false,
  },
  closable: {
    type: Boolean,
    default: false,
  },
  addable: {
    type: Boolean,
    default: false,
  },
  animated: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue', 'change', 'close', 'add'])

// Active tab ID tracking
const activeTab = ref(
  props.modelValue !== null && props.modelValue !== undefined
    ? props.modelValue
    : props.items[0]?.id || 0
)

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== null && newVal !== undefined) {
      activeTab.value = newVal
    }
  }
)

watch(
  () => props.items,
  (newItems) => {
    // If active tab was removed or doesn't exist, fallback to first item
    if (!newItems.some((item) => item.id === activeTab.value)) {
      if (newItems.length > 0) {
        selectTab(newItems[0])
      }
    }
  },
  { deep: true }
)

const selectTab = (item) => {
  if (item.disabled) return
  activeTab.value = item.id
  emit('update:modelValue', item.id)
  emit('change', item.id, item)
}

const handleCloseTab = (event, item) => {
  event.stopPropagation()
  emit('close', item.id, item)
}

const activeItem = computed(() => {
  return props.items.find((item) => item.id === activeTab.value) || props.items[0] || null
})

// CSS classes for container
const containerClasses = computed(() => {
  return [
    'tabs',
    `tabs-${props.orientation}`,
    `tabs-${props.variant}`,
    `tabs-${props.size}`,
    props.grow ? 'tabs-grow' : '',
  ]
})

// CSS classes for nav list
const navClasses = computed(() => {
  return [
    'tabs-nav',
    props.center ? 'tabs-center' : '',
    props.end ? 'tabs-end' : '',
  ]
})
</script>

<template>
  <div :class="containerClasses">
    <!-- Tab Navigation Bar -->
    <div :class="navClasses" role="tablist">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        role="tab"
        :class="[
          'tab-btn',
          activeTab === item.id ? 'active' : '',
          item.disabled ? 'disabled' : '',
        ]"
        :disabled="item.disabled"
        :aria-selected="activeTab === item.id"
        @click="selectTab(item)"
      >
        <!-- Custom Tab Header Slot: #tab-[id] or #tab="{ item, active }" -->
        <slot :name="`tab-${item.id}`" :item="item" :active="activeTab === item.id">
          <slot name="tab-header" :item="item" :active="activeTab === item.id">
            <!-- Icon -->
            <span v-if="item.icon" class="tab-icon">{{ item.icon }}</span>

            <!-- Label -->
            <span class="tab-label">{{ item.label || item.id }}</span>

            <!-- Badge -->
            <span
              v-if="item.badge"
              :class="['badge tab-badge', item.badgeClass || 'badge-tonal-primary']"
            >
              {{ item.badge }}
            </span>

            <!-- Closable Button -->
            <span
              v-if="closable || item.closable"
              class="tab-close"
              title="Close Tab"
              @click="handleCloseTab($event, item)"
            >
              ✕
            </span>
          </slot>
        </slot>
      </button>

      <!-- Add New Tab Button -->
      <button
        v-if="addable"
        type="button"
        class="tab-btn btn-add-tab"
        title="Add New Tab"
        style="padding: 0.35rem 0.65rem;"
        @click="$emit('add')"
      >
        <span class="tab-icon">➕</span>
      </button>

      <!-- Extra Toolbar Actions Slot -->
      <div v-if="$slots.extra" class="d-flex align-center ms-auto gap-2">
        <slot name="extra" />
      </div>
    </div>

    <!-- Tab Content Pane Container -->
    <div :class="['tabs-content', card ? 'tab-content-card' : '']">
      <Transition :name="animated ? 'tab-fade' : ''" mode="out-in">
        <div :key="activeTab" class="tab-pane active show" role="tabpanel">
          <!-- Dynamic Content Slot: #content-[id], #[id], or default -->
          <slot :name="`content-${activeTab}`" :item="activeItem">
            <slot :name="activeTab" :item="activeItem">
              <slot :activeTab="activeTab" :item="activeItem">
                <!-- Fallback content if item has content prop -->
                <div v-if="activeItem?.content" v-html="activeItem.content" />
              </slot>
            </slot>
          </slot>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.18s cubic-bezier(0.4, 0, 0.2, 1), transform 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
