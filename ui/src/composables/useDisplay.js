/**
 * ============================================================================
 * JUI REACTIVE DISPLAY & SCREEN BREAKPOINTS COMPOSABLE
 * Real-time window size and responsive breakpoint tracking for Vue 3.
 *
 * Tracks:
 * - Realtime width & height (updates instantly on window resize)
 * - Breakpoint flags: xs, sm, md, lg, xl, 2xl
 * - Directional flags: smAndUp, mdAndUp, lgAndUp, xlAndUp, 2xlAndUp
 * - Directional flags: xsAndDown, smAndDown, mdAndDown, lgAndDown, xlAndDown
 * - Device aliases: isMobile / isPhone, isTablet, isDesktop, isLargeDesktop
 * - Orientation & Touch: isPortrait, isLandscape, isTouch
 * ============================================================================
 */

import { ref, computed, readonly } from 'vue'

/**
 * Standard Design System Breakpoints (in pixels)
 * Fully aligned with SCSS $breakpoints in src/styles/_mixins.scss
 */
export const breakpoints = Object.freeze({
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  xxl: 1536,
})

// Shared Singleton State for optimal performance (single window resize listener)
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1200)
const windowHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 800)
const pixelRatio = ref(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1)
const isTouchDevice = ref(
  typeof window !== 'undefined'
    ? 'ontouchstart' in window || navigator.maxTouchPoints > 0
    : false
)

let listenerAttached = false
let rafId = null

const updateDimensions = () => {
  if (typeof window === 'undefined') return
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
  pixelRatio.value = window.devicePixelRatio || 1
}

const onWindowResize = () => {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    updateDimensions()
  })
}

const initResizeListener = () => {
  if (typeof window === 'undefined' || listenerAttached) return
  updateDimensions()
  window.addEventListener('resize', onWindowResize, { passive: true })
  window.addEventListener('orientationchange', onWindowResize, { passive: true })
  listenerAttached = true
}

// Auto-initialize if running in browser
if (typeof window !== 'undefined') {
  initResizeListener()
}

/**
 * Main Vue 3 Composable: useDisplay / useBreakpoints / useScreen
 */
export function useDisplay() {
  // Ensure listener is active
  initResizeListener()

  // 1. Current Active Breakpoint Name
  const current = computed(() => {
    const w = windowWidth.value
    if (w < breakpoints.sm) return 'xs'
    if (w < breakpoints.md) return 'sm'
    if (w < breakpoints.lg) return 'md'
    if (w < breakpoints.xl) return 'lg'
    if (w < breakpoints['2xl']) return 'xl'
    return '2xl'
  })

  // 2. Exact Breakpoint Matches (Single Interval)
  const xs = computed(() => windowWidth.value < breakpoints.sm)
  const sm = computed(() => windowWidth.value >= breakpoints.sm && windowWidth.value < breakpoints.md)
  const md = computed(() => windowWidth.value >= breakpoints.md && windowWidth.value < breakpoints.lg)
  const lg = computed(() => windowWidth.value >= breakpoints.lg && windowWidth.value < breakpoints.xl)
  const xl = computed(() => windowWidth.value >= breakpoints.xl && windowWidth.value < breakpoints['2xl'])
  const xxl = computed(() => windowWidth.value >= breakpoints['2xl'])
  const twoXl = xxl

  const xsOnly = xs
  const smOnly = sm
  const mdOnly = md
  const lgOnly = lg
  const xlOnly = xl
  const xxlOnly = xxl

  // 3. Directional AndUp Flags (>= breakpoint)
  const xsAndUp = computed(() => true)
  const smAndUp = computed(() => windowWidth.value >= breakpoints.sm)
  const mdAndUp = computed(() => windowWidth.value >= breakpoints.md)
  const lgAndUp = computed(() => windowWidth.value >= breakpoints.lg)
  const xlAndUp = computed(() => windowWidth.value >= breakpoints.xl)
  const xxlAndUp = computed(() => windowWidth.value >= breakpoints['2xl'])
  const twoXlAndUp = xxlAndUp

  // 4. Directional AndDown Flags (< next breakpoint upper bound)
  const xsAndDown = computed(() => windowWidth.value < breakpoints.sm)
  const smAndDown = computed(() => windowWidth.value < breakpoints.md)
  const mdAndDown = computed(() => windowWidth.value < breakpoints.lg)
  const lgAndDown = computed(() => windowWidth.value < breakpoints.xl)
  const xlAndDown = computed(() => windowWidth.value < breakpoints['2xl'])
  const xxlAndDown = computed(() => true)
  const twoXlAndDown = xxlAndDown

  // 5. Semantic Device Categories
  const isPhone = computed(() => windowWidth.value < breakpoints.md)
  const isMobile = isPhone
  const isTablet = computed(() => windowWidth.value >= breakpoints.md && windowWidth.value < breakpoints.lg)
  const isDesktop = computed(() => windowWidth.value >= breakpoints.lg)
  const isLargeDesktop = computed(() => windowWidth.value >= breakpoints.xl)
  const isUltraWide = computed(() => windowWidth.value >= breakpoints['2xl'])

  // 6. Orientation & Screen Aspect
  const isPortrait = computed(() => windowHeight.value >= windowWidth.value)
  const isLandscape = computed(() => windowWidth.value > windowHeight.value)
  const orientation = computed(() => (isLandscape.value ? 'landscape' : 'portrait'))

  // 7. Comparison Helpers
  const greaterThan = (bp) => {
    const min = typeof bp === 'number' ? bp : breakpoints[bp] || 0
    return windowWidth.value >= min
  }

  const smallerThan = (bp) => {
    const max = typeof bp === 'number' ? bp : breakpoints[bp] || 0
    return windowWidth.value < max
  }

  const between = (minBp, maxBp) => {
    const min = typeof minBp === 'number' ? minBp : breakpoints[minBp] || 0
    const max = typeof maxBp === 'number' ? maxBp : breakpoints[maxBp] || Infinity
    return windowWidth.value >= min && windowWidth.value < max
  }

  // Reactive State Object Map
  const state = computed(() => ({
    width: windowWidth.value,
    height: windowHeight.value,
    current: current.value,
    pixelRatio: pixelRatio.value,
    orientation: orientation.value,

    // Exact
    xs: xs.value,
    sm: sm.value,
    md: md.value,
    lg: lg.value,
    xl: xl.value,
    '2xl': xxl.value,
    xxl: xxl.value,

    // AndUp
    xsAndUp: xsAndUp.value,
    smAndUp: smAndUp.value,
    mdAndUp: mdAndUp.value,
    lgAndUp: lgAndUp.value,
    xlAndUp: xlAndUp.value,
    '2xlAndUp': xxlAndUp.value,
    xxlAndUp: xxlAndUp.value,

    // AndDown
    xsAndDown: xsAndDown.value,
    smAndDown: smAndDown.value,
    mdAndDown: mdAndDown.value,
    lgAndDown: lgAndDown.value,
    xlAndDown: xlAndDown.value,
    '2xlAndDown': xxlAndDown.value,
    xxlAndDown: xxlAndDown.value,

    // Devices
    isMobile: isMobile.value,
    isPhone: isPhone.value,
    isTablet: isTablet.value,
    isDesktop: isDesktop.value,
    isLargeDesktop: isLargeDesktop.value,
    isUltraWide: isUltraWide.value,
    isTouch: isTouchDevice.value,
    isPortrait: isPortrait.value,
    isLandscape: isLandscape.value,
  }))

  return {
    // Realtime Dimensions
    width: readonly(windowWidth),
    height: readonly(windowHeight),
    pixelRatio: readonly(pixelRatio),

    // Active Breakpoint
    name: current,
    current,

    // Exact Matches
    xs,
    sm,
    md,
    lg,
    xl,
    xxl,
    '2xl': twoXl,
    xsOnly,
    smOnly,
    mdOnly,
    lgOnly,
    xlOnly,
    xxlOnly,

    // AndUp Directional (>= breakpoint)
    xsAndUp,
    smAndUp,
    mdAndUp,
    lgAndUp,
    xlAndUp,
    xxlAndUp,
    '2xlAndUp': twoXlAndUp,

    // AndDown Directional (< next breakpoint upper bound)
    xsAndDown,
    smAndDown,
    mdAndDown,
    lgAndDown,
    xlAndDown,
    xxlAndDown,
    '2xlAndDown': twoXlAndDown,

    // Devices & Form Factors
    isMobile,
    isPhone,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isUltraWide,
    isTouch: readonly(isTouchDevice),

    // Orientation
    isPortrait,
    isLandscape,
    orientation,

    // Methods
    greaterThan,
    smallerThan,
    between,

    // Full reactive state map
    state,
    breakpoints,
  }
}

// Aliases for convenience
export const useBreakpoints = useDisplay
export const useScreen = useDisplay

export default useDisplay
