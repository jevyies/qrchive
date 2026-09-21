<script setup>
import { computed } from 'vue'

const props = defineProps({
  toast: {
    type: Object,
    default: null,
  },
  // Standalone prop fallbacks
  title: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
  color: {
    type: String,
    default: 'primary', // 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  },
  variant: {
    type: String,
    default: 'tonal', // 'tonal' | 'solid' | 'outlined' | 'glass'
  },
  size: {
    type: String,
    default: 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  },
  icon: {
    type: [String, Boolean],
    default: true,
  },
  dismissible: {
    type: Boolean,
    default: true,
  },
  timeout: {
    type: Number,
    default: 4000,
  },
  showProgress: {
    type: Boolean,
    default: true,
  },
  pauseOnHover: {
    type: Boolean,
    default: true,
  },
  action: {
    type: Object,
    default: null, // { label: string, onClick: Function }
  },
})

const emit = defineEmits(['dismiss', 'pause', 'resume'])

// Resolve configuration from either props.toast object or direct props
const title = computed(() => props.toast?.title ?? props.title)
const message = computed(() => props.toast?.message ?? props.toast?.text ?? props.message)
const color = computed(() => props.toast?.color ?? props.color ?? 'primary')
const variant = computed(() => props.toast?.variant ?? props.variant ?? 'tonal')
const size = computed(() => props.toast?.size ?? props.size ?? 'md')
const dismissible = computed(() => props.toast?.dismissible ?? props.dismissible)
const showProgress = computed(() => props.toast?.showProgress ?? props.showProgress)
const pauseOnHover = computed(() => props.toast?.pauseOnHover ?? props.pauseOnHover)
const timeout = computed(() => props.toast?.timeout ?? props.timeout)
const isPaused = computed(() => props.toast?.isPaused ?? false)
const action = computed(() => props.toast?.action ?? props.action)

const icon = computed(() => {
  const customIcon = props.toast?.icon ?? props.icon
  if (customIcon === false || customIcon === '') return ''
  if (typeof customIcon === 'string' && customIcon !== '') return customIcon

  const defaultIcons = {
    primary: '✦',
    secondary: '◈',
    success: '✓',
    warning: '⚠',
    danger: '✕',
    info: 'ℹ',
    neutral: '🔔',
  }
  return defaultIcons[color.value] || '✦'
})

const toastClasses = computed(() => [
  'j-toast',
  `toast-color-${color.value}`,
  `toast-variant-${variant.value}`,
  `toast-size-${size.value}`,
])

const handleMouseEnter = () => {
  if (pauseOnHover.value) {
    emit('pause')
  }
}

const handleMouseLeave = () => {
  if (pauseOnHover.value) {
    emit('resume')
  }
}

const handleDismiss = () => {
  emit('dismiss')
}

const handleAction = () => {
  if (action.value?.onClick) {
    action.value.onClick(props.toast)
  }
}
</script>

<template>
  <div
    :class="toastClasses"
    role="alert"
    aria-live="polite"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="toast-content-wrapper">
      <!-- Toast Leading Icon -->
      <div v-if="icon" class="toast-icon-wrapper" aria-hidden="true">
        <span>{{ icon }}</span>
      </div>

      <!-- Toast Body -->
      <div class="toast-body">
        <div v-if="title" class="toast-title">{{ title }}</div>
        <div v-if="message" class="toast-message">{{ message }}</div>

        <!-- Optional Action Slot / Button -->
        <div v-if="action || $slots.action" class="toast-actions">
          <slot name="action">
            <button
              v-if="action"
              type="button"
              class="btn btn-xs"
              :class="variant === 'solid' ? 'btn-tonal-neutral' : `btn-${color}`"
              @click.stop="handleAction"
            >
              {{ action.label }}
            </button>
          </slot>
        </div>
      </div>

      <!-- Dismiss Button -->
      <button
        v-if="dismissible"
        type="button"
        class="toast-dismiss-btn"
        aria-label="Close notification"
        @click.stop="handleDismiss"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>

    <!-- Countdown Progress Bar -->
    <div
      v-if="showProgress && timeout > 0"
      class="toast-progress-bar animating"
      :class="{ 'is-paused': isPaused }"
      :style="{ animationDuration: `${timeout}ms` }"
    />
  </div>
</template>
