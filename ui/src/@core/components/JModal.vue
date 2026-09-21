<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { useThemeStore } from '../../stores/theme'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'fullscreen' | 'fullscreen-sm-down' | 'fullscreen-md-down'
  },
  position: {
    type: String,
    default: 'center', // 'center' | 'top' | 'top-left' | 'top-right' | 'left' | 'right' | 'bottom' | 'bottom-left' | 'bottom-right' | 'bottom-sheet'
  },
  variant: {
    type: String,
    default: null, // 'elevated' | 'glass' | 'bordered' | 'tonal' (defaults to active theme modal style)
  },
  animation: {
    type: String,
    default: null, // 'scale' | 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'bounce' (defaults to active theme modal animation)
  },
  drawer: {
    type: [Boolean, String],
    default: false, // false | true | 'right' | 'left' | 'bottom' | 'top'
  },
  backdrop: {
    type: Boolean,
    default: true,
  },
  backdropGlass: {
    type: Boolean,
    default: true,
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true,
  },
  closeOnEsc: {
    type: Boolean,
    default: true,
  },
  showClose: {
    type: Boolean,
    default: true,
  },
  scrollable: {
    type: Boolean,
    default: false,
  },
  headerClass: {
    type: String,
    default: '',
  },
  bodyClass: {
    type: String,
    default: '',
  },
  footerClass: {
    type: String,
    default: '',
  },
  bottomSheetOnMobile: {
    type: Boolean,
    default: false,
  },
  dialogClass: {
    type: [String, Array, Object],
    default: '',
  },
  contentClass: {
    type: [String, Array, Object],
    default: '',
  },
  modalClass: {
    type: [String, Array, Object],
    default: '',
  },
  maxWidth: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'close', 'open'])

const isMobile = useMediaQuery('(max-width: 640px)')

let themeStore = null
try {
  themeStore = useThemeStore()
} catch (e) {
  // pinia not active in isolation
}

const isBottomSheetActive = computed(() => {
  if (props.position === 'bottom-sheet') return true
  return Boolean(props.bottomSheetOnMobile && isMobile.value)
})

const computedVariant = computed(() => {
  if (props.variant) return props.variant
  return themeStore?.modalStyle || 'elevated'
})

const computedAnimation = computed(() => {
  if (props.animation) return props.animation
  return themeStore?.modalAnimation || 'slide-down'
})

// Drawer detection
const isDrawer = computed(() => {
  if (props.drawer) return true
  const p = props.position?.toLowerCase() || ''
  return p.startsWith('drawer') || p === 'bottom-sheet' || isBottomSheetActive.value
})

const drawerSide = computed(() => {
  if (isBottomSheetActive.value) return 'bottom'
  if (typeof props.drawer === 'string' && ['right', 'left', 'bottom', 'top'].includes(props.drawer.toLowerCase())) {
    return props.drawer.toLowerCase()
  }
  const p = props.position?.toLowerCase() || ''
  if (p.startsWith('drawer-')) return p.replace('drawer-', '')
  if (p === 'drawer') return 'right'
  if (p === 'bottom-sheet') return 'bottom'
  if (['right', 'left', 'bottom', 'top'].includes(p) && props.drawer) return p
  return 'right'
})

// Position class
const positionClass = computed(() => {
  if (isDrawer.value) {
    const base = `modal-drawer modal-drawer-${drawerSide.value}`
    if (isBottomSheetActive.value) {
      return `${base} modal-bottom-sheet-mobile modal-bottom-sheet`
    }
    return base
  }
  const p = props.position?.toLowerCase() || 'center'
  if (p === 'center' || p === 'centered') return 'modal-center'
  if (p === 'top') return 'modal-top'
  if (p === 'top-left') return 'modal-top-left'
  if (p === 'top-right') return 'modal-top-right'
  if (p === 'left') return 'modal-left'
  if (p === 'right') return 'modal-right'
  if (p === 'bottom') return 'modal-bottom'
  if (p === 'bottom-left') return 'modal-bottom-left'
  if (p === 'bottom-right') return 'modal-bottom-right'
  return `modal-${p}`
})

// Size class
const sizeClass = computed(() => {
  const s = props.size?.toLowerCase() || 'md'
  if (s === 'fullscreen') return 'modal-fullscreen'
  return `modal-${s}`
})

// Content variant class
const contentVariantClass = computed(() => {
  const v = computedVariant.value?.toLowerCase() || 'elevated'
  if (v === 'glass') return 'modal-glass modal-style-glass'
  if (v === 'bordered') return 'modal-bordered modal-style-bordered'
  if (v === 'tonal') return 'modal-tonal modal-style-tonal'
  return 'modal-elevated modal-style-elevated'
})

// Animation class on dialog
const animationClass = computed(() => {
  if (isDrawer.value) {
    return `anim-drawer-${drawerSide.value}`
  }
  const a = computedAnimation.value?.toLowerCase() || 'slide-down'
  return `anim-${a}`
})

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    close()
  }
}

const handleKeyDown = (e) => {
  if (e.key === 'Escape' && props.modelValue && props.closeOnEsc) {
    close()
  }
}

// Scroll lock
watch(
  () => props.modelValue,
  (isOpen) => {
    if (typeof document !== 'undefined') {
      if (isOpen) {
        document.body.classList.add('modal-open')
        document.documentElement.classList.add('modal-open')
        emit('open')
      } else {
        document.body.classList.remove('modal-open')
        document.documentElement.classList.remove('modal-open')
      }
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown)
  }
  if (typeof document !== 'undefined') {
    document.body.classList.remove('modal-open')
    document.documentElement.classList.remove('modal-open')
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue">
      <!-- Backdrop -->
      <Transition name="fade">
        <div v-if="backdrop" :class="['modal-backdrop', backdropGlass ? 'backdrop-glass' : '']"
          @click="handleBackdropClick">
        </div>
      </Transition>

      <!-- Modal Container -->
      <div :class="['modal', positionClass, sizeClass, modalClass]" role="dialog" aria-modal="true"
        @click.self="handleBackdropClick">
        <div :class="['modal-dialog', animationClass, sizeClass, dialogClass]" :style="maxWidth ? { maxWidth } : null">
          <div :class="['modal-content', contentVariantClass, scrollable ? 'modal-scrollable' : '', contentClass]">
            <!-- Bottom Sheet Drag Handle Bar (when bottom sheet is active) -->
            <div v-if="isBottomSheetActive" class="modal-bottom-sheet-handle-bar">
              <div class="modal-bottom-sheet-handle"></div>
            </div>

            <!-- Header -->
            <div v-if="$slots.header || title || $slots.title" :class="['modal-header', headerClass]">
              <slot name="header">
                <div class="d-flex align-center gap-2">
                  <span v-if="icon" class="modal-icon" style="font-size: 1.25rem; line-height: 1;">{{ icon }}</span>
                  <div>
                    <slot name="title">
                      <h4 class="modal-title">{{ title }}</h4>
                    </slot>
                    <slot name="subtitle">
                      <p v-if="subtitle" class="modal-subtitle">{{ subtitle }}</p>
                    </slot>
                  </div>
                </div>

                <div class="d-flex align-center gap-2">
                  <slot name="header-actions" />
                  <button v-if="showClose" type="button" class="btn-close" title="Close" aria-label="Close"
                    style="background: transparent; border: none; font-size: 1rem; cursor: pointer; color: var(--text-secondary); padding: 0.25rem;"
                    @click="close">
                    ✕
                  </button>
                </div>
              </slot>
            </div>

            <!-- Body -->
            <div :class="['modal-body', bodyClass]">
              <slot></slot>
            </div>

            <!-- Footer -->
            <div v-if="$slots.footer || $slots.actions" :class="['modal-footer', footerClass]">
              <slot name="footer">
                <slot name="actions">
                  <button type="button" class="btn btn-sm btn-tonal-neutral" @click="close">
                    Close
                  </button>
                </slot>
              </slot>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
