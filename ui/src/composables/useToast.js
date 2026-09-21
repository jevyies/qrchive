import { ref } from 'vue'

// Normalized position map to support aliases like 'right-top', 'center-bottom', etc.
export const TOAST_POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

export const TOAST_SIZES = ['xs', 'sm', 'md', 'lg', 'xl']

export const TOAST_COLORS = [
  'primary',
  'secondary',
  'success',
  'warning',
  'danger',
  'info',
  'neutral',
]

export const TOAST_VARIANTS = ['tonal', 'solid', 'outlined', 'glass']

const DEFAULT_ICONS = {
  primary: '✦',
  secondary: '◈',
  success: '✓',
  warning: '⚠',
  danger: '✕',
  info: 'ℹ',
  neutral: '🔔',
}

function normalizePosition(pos) {
  if (!pos) return 'top-right'
  const p = String(pos).toLowerCase().trim()
  if (p === 'center' || p === 'middle') return 'center'
  if (p === 'top' || p === 'top-center' || p === 'center-top') return 'top-center'
  if (p === 'bottom' || p === 'bottom-center' || p === 'center-bottom') return 'bottom-center'
  if (p === 'left' || p === 'left-center' || p === 'center-left') return 'center-left'
  if (p === 'right' || p === 'right-center' || p === 'center-right') return 'center-right'
  if (p === 'right-top' || p === 'top-right') return 'top-right'
  if (p === 'left-top' || p === 'top-left') return 'top-left'
  if (p === 'right-bottom' || p === 'bottom-right') return 'bottom-right'
  if (p === 'left-bottom' || p === 'bottom-left') return 'bottom-left'
  return TOAST_POSITIONS.includes(p) ? p : 'top-right'
}

let counter = 0
const toasts = ref([])

export function useToast() {
  const dismiss = (id) => {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      const [removed] = toasts.value.splice(index, 1)
      if (removed.timerId) clearTimeout(removed.timerId)
      if (removed.onClose) removed.onClose(removed)
    }
  }

  const pause = (id) => {
    const toast = toasts.value.find((t) => t.id === id)
    if (!toast || !toast.timeout || toast.timeout <= 0) return
    if (toast.isPaused) return

    toast.isPaused = true
    if (toast.timerId) {
      clearTimeout(toast.timerId)
      toast.timerId = null
    }
    const elapsed = Date.now() - toast.startTime
    toast.remaining = Math.max(0, toast.remaining - elapsed)
  }

  const resume = (id) => {
    const toast = toasts.value.find((t) => t.id === id)
    if (!toast || !toast.timeout || toast.timeout <= 0) return
    if (!toast.isPaused || toast.remaining <= 0) return

    toast.isPaused = false
    toast.startTime = Date.now()
    toast.timerId = setTimeout(() => {
      dismiss(id)
    }, toast.remaining)
  }

  const show = (options = {}) => {
    if (typeof options === 'string') {
      options = { message: options }
    }

    const id = `toast_${Date.now()}_${++counter}`
    const color = TOAST_COLORS.includes(options.color) ? options.color : 'primary'
    const position = normalizePosition(options.position)
    const size = TOAST_SIZES.includes(options.size) ? options.size : 'md'
    const variant = TOAST_VARIANTS.includes(options.variant) ? options.variant : 'tonal'
    const timeout = typeof options.timeout === 'number' ? options.timeout : 4000
    const showProgress = options.showProgress !== false && timeout > 0
    const pauseOnHover = options.pauseOnHover !== false
    const dismissible = options.dismissible !== false

    let icon = options.icon
    if (icon === undefined || icon === true) {
      icon = DEFAULT_ICONS[color] || '✦'
    } else if (icon === false) {
      icon = ''
    }

    const toastItem = {
      id,
      title: options.title || '',
      message: options.message || options.text || '',
      color,
      position,
      size,
      variant,
      timeout,
      remaining: timeout,
      startTime: Date.now(),
      showProgress,
      pauseOnHover,
      dismissible,
      icon,
      action: options.action || null,
      onClose: options.onClose || null,
      isPaused: false,
      timerId: null,
      createdAt: Date.now(),
    }

    if (timeout > 0) {
      toastItem.timerId = setTimeout(() => {
        dismiss(id)
      }, timeout)
    }

    // Insert to reactive toasts list
    toasts.value.push(toastItem)
    return id
  }

  const clear = (position = null) => {
    if (position) {
      const normalized = normalizePosition(position)
      const toRemove = toasts.value.filter((t) => t.position === normalized)
      toRemove.forEach((t) => {
        if (t.timerId) clearTimeout(t.timerId)
        if (t.onClose) t.onClose(t)
      })
      toasts.value = toasts.value.filter((t) => t.position !== normalized)
    } else {
      toasts.value.forEach((t) => {
        if (t.timerId) clearTimeout(t.timerId)
        if (t.onClose) t.onClose(t)
      })
      toasts.value = []
    }
  }

  // Convenience helper methods
  const createHelper = (color) => (msgOrOpts, opts = {}) => {
    const config = typeof msgOrOpts === 'string' ? { message: msgOrOpts, ...opts } : { ...msgOrOpts }
    return show({ ...config, color })
  }

  return {
    toasts,
    show,
    dismiss,
    pause,
    resume,
    clear,
    primary: createHelper('primary'),
    secondary: createHelper('secondary'),
    success: createHelper('success'),
    warning: createHelper('warning'),
    danger: createHelper('danger'),
    error: createHelper('danger'),
    info: createHelper('info'),
    neutral: createHelper('neutral'),
    positions: TOAST_POSITIONS,
    sizes: TOAST_SIZES,
    colors: TOAST_COLORS,
    variants: TOAST_VARIANTS,
  }
}
