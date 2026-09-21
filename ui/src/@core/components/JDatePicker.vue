<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import JInput from './JInput.vue'

const props = defineProps({
  // v-model binding: String | Array | Date | Number
  modelValue: {
    type: [String, Array, Date, Number],
    default: '',
  },
  // Selection Mode
  range: {
    type: Boolean,
    default: false,
  },
  isRange: {
    type: Boolean,
    default: false,
  },
  // Time Picker Toggle
  showTime: {
    type: Boolean,
    default: false,
  },
  withTime: {
    type: Boolean,
    default: false,
  },
  enableTime: {
    type: Boolean,
    default: false,
  },
  // Selection Style Shape: 'rounded' | 'square' | 'squircle'
  selectionStyle: {
    type: String,
    default: 'rounded',
    validator: (v) => ['rounded', 'square', 'squircle'].includes(v),
  },
  shape: {
    type: String,
    default: null,
  },
  rounded: {
    type: Boolean,
    default: false,
  },
  square: {
    type: Boolean,
    default: false,
  },
  squircle: {
    type: Boolean,
    default: false,
  },
  // Time Options
  timeFormat: {
    type: String,
    default: '24h', // '24h' | '12h'
  },
  showSeconds: {
    type: Boolean,
    default: false,
  },
  // Formats
  format: {
    type: String,
    default: null,
  },
  rangeSeparator: {
    type: String,
    default: ' ~ ',
  },
  // Presets & Shortcuts
  shortcuts: {
    type: [Boolean, Array],
    default: true,
  },
  showPresets: {
    type: Boolean,
    default: null,
  },
  // Min & Max Dates
  minDate: {
    type: [String, Date, Number],
    default: null,
  },
  maxDate: {
    type: [String, Date, Number],
    default: null,
  },
  disabledDate: {
    type: Function,
    default: null,
  },
  startOfWeek: {
    type: Number,
    default: 0, // 0 = Sunday, 1 = Monday
  },
  // Direct Input & Behavior
  allowInput: {
    type: Boolean,
    default: true,
  },
  closeOnSelect: {
    type: Boolean,
    default: null,
  },
  // Teleport to body to prevent card/modal overflow cutoff
  teleport: {
    type: Boolean,
    default: true,
  },
  // Standard JUI Form Props (passed to JInput)
  pattern: {
    type: String,
    default: null,
  },
  variant: {
    type: String,
    default: null,
  },
  boxed: {
    type: Boolean,
    default: false,
  },
  underlined: {
    type: Boolean,
    default: false,
  },
  filled: {
    type: Boolean,
    default: false,
  },
  pill: {
    type: Boolean,
    default: false,
  },
  notch: {
    type: Boolean,
    default: false,
  },
  floating: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: 'md',
  },
  sm: {
    type: Boolean,
    default: false,
  },
  lg: {
    type: Boolean,
    default: false,
  },
  label: {
    type: String,
    default: '',
  },
  labelClass: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  hint: {
    type: String,
    default: '',
  },
  helper: {
    type: String,
    default: '',
  },
  caption: {
    type: String,
    default: '',
  },
  clearable: {
    type: Boolean,
    default: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  required: {
    type: Boolean,
    default: false,
  },
  valid: {
    type: Boolean,
    default: false,
  },
  invalid: {
    type: Boolean,
    default: false,
  },
  validFeedback: {
    type: String,
    default: '',
  },
  invalidFeedback: {
    type: String,
    default: '',
  },
  prependIcon: {
    type: String,
    default: '',
  },
  prependInnerIcon: {
    type: String,
    default: '',
  },
  appendIcon: {
    type: String,
    default: '',
  },
  appendInnerIcon: {
    type: String,
    default: '',
  },
  prependText: {
    type: String,
    default: '',
  },
  appendText: {
    type: String,
    default: '',
  },
  containerClass: {
    type: [String, Array, Object],
    default: '',
  },
  inputClass: {
    type: [String, Array, Object],
    default: '',
  },
  id: {
    type: String,
    default: null,
  },
  name: {
    type: String,
    default: null,
  },
})

const emit = defineEmits([
  'update:modelValue',
  'change',
  'input',
  'select',
  'clear',
  'open',
  'close',
  'focus',
  'blur',
])

// ============================================================================
// 1. DATE HELPERS & PARSING ENGINE
// ============================================================================

const padZero = (n) => String(n).padStart(2, '0')

const isWithTime = computed(() => Boolean(props.showTime || props.withTime || props.enableTime))
const isRangeMode = computed(() => Boolean(props.range || props.isRange))

// Resolved Selection Style
const computedSelectionStyle = computed(() => {
  if (props.square) return 'square'
  if (props.squircle) return 'squircle'
  if (props.rounded) return 'rounded'
  return props.shape || props.selectionStyle || 'rounded'
})

// Default formats
const defaultDateFormat = computed(() => {
  if (props.format) return props.format
  if (isWithTime.value) {
    if (props.timeFormat === '12h') {
      return props.showSeconds ? 'YYYY-MM-DD hh:mm:ss A' : 'YYYY-MM-DD hh:mm A'
    }
    return props.showSeconds ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD HH:mm'
  }
  return 'YYYY-MM-DD'
})

// Format a Date object to string
const formatDate = (d, fmt = defaultDateFormat.value) => {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return ''
  const YYYY = d.getFullYear()
  const YY = String(YYYY).slice(-2)
  const MM = padZero(d.getMonth() + 1)
  const M = d.getMonth() + 1
  const DD = padZero(d.getDate())
  const D = d.getDate()
  const hours24 = d.getHours()
  const hours12 = hours24 % 12 || 12
  const HH = padZero(hours24)
  const H = hours24
  const hh = padZero(hours12)
  const h = hours12
  const mm = padZero(d.getMinutes())
  const m = d.getMinutes()
  const ss = padZero(d.getSeconds())
  const s = d.getSeconds()
  const A = hours24 >= 12 ? 'PM' : 'AM'
  const a = hours24 >= 12 ? 'pm' : 'am'

  return fmt
    .replace('YYYY', YYYY)
    .replace('YY', YY)
    .replace('MM', MM)
    .replace(/\bM\b/, M)
    .replace('DD', DD)
    .replace(/\bD\b/, D)
    .replace('HH', HH)
    .replace(/\bH\b/, H)
    .replace('hh', hh)
    .replace(/\bh\b/, h)
    .replace('mm', mm)
    .replace(/\bm\b/, m)
    .replace('ss', ss)
    .replace(/\bs\b/, s)
    .replace('A', A)
    .replace('a', a)
}

// Strict Date Parser (handles ISO, YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, HH:mm, AM/PM, etc.)
const parseSingleDate = (val) => {
  if (!val) return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : new Date(val)
  if (typeof val === 'number') {
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof val !== 'string') return null

  const trimmed = val.trim()
  if (!trimmed) return null

  // 1. Strict YYYY-MM-DD (with optional time and optional AM/PM)
  const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM|am|pm))?)?$/)
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10)
    const m = parseInt(isoMatch[2], 10) - 1
    const d = parseInt(isoMatch[3], 10)
    let hh = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0
    const mm = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0
    const ss = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0
    const ampm = isoMatch[7] ? isoMatch[7].toUpperCase() : null

    if (ampm === 'PM' && hh < 12) hh += 12
    if (ampm === 'AM' && hh === 12) hh = 0

    if (m >= 0 && m <= 11 && d >= 1 && d <= 31 && hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59 && ss >= 0 && ss <= 59) {
      const res = new Date(y, m, d, hh, mm, ss)
      if (!isNaN(res.getTime()) && res.getMonth() === m) {
        return res
      }
    }
  }

  // 2. Strict MM/DD/YYYY or DD/MM/YYYY (with optional AM/PM)
  const slashMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM|am|pm))?)?$/)
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10)
    const p2 = parseInt(slashMatch[2], 10)
    const y = parseInt(slashMatch[3], 10)
    let hh = slashMatch[4] ? parseInt(slashMatch[4], 10) : 0
    const mm = slashMatch[5] ? parseInt(slashMatch[5], 10) : 0
    const ss = slashMatch[6] ? parseInt(slashMatch[6], 10) : 0
    const ampm = slashMatch[7] ? slashMatch[7].toUpperCase() : null

    if (ampm === 'PM' && hh < 12) hh += 12
    if (ampm === 'AM' && hh === 12) hh = 0

    if (p1 >= 1 && p1 <= 12 && p2 >= 1 && p2 <= 31) {
      const res = new Date(y, p1 - 1, p2, hh, mm, ss)
      if (!isNaN(res.getTime())) return res
    }
    if (p2 >= 1 && p2 <= 12 && p1 >= 1 && p1 <= 31) {
      const res = new Date(y, p2 - 1, p1, hh, mm, ss)
      if (!isNaN(res.getTime())) return res
    }
  }

  // 3. Full standard ISO string with 'T'
  if (trimmed.includes('T')) {
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) return d
  }

  return null
}

// Parse range values from String or Array
const parseRangeValue = (val) => {
  if (!val) return [null, null]
  if (Array.isArray(val)) {
    return [parseSingleDate(val[0]), parseSingleDate(val[1])]
  }
  if (typeof val === 'string') {
    const sep = props.rangeSeparator || '~'
    let parts = []
    if (val.includes(sep)) {
      parts = val.split(sep)
    } else if (val.includes(' ~ ')) {
      parts = val.split(' ~ ')
    } else if (val.includes(' to ')) {
      parts = val.split(' to ')
    } else if (val.includes(' - ') && !val.match(/^\d{4}-\d{2}-\d{2}$/)) {
      parts = val.split(' - ')
    } else if (val.includes(',')) {
      parts = val.split(',')
    } else {
      parts = [val]
    }
    return [parseSingleDate(parts[0]), parseSingleDate(parts[1])]
  }
  return [null, null]
}

// Helpers for date checks
const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

const isToday = (d) => isSameDay(d, new Date())

const isDateDisabled = (d) => {
  if (!d) return false
  if (props.disabledDate && typeof props.disabledDate === 'function') {
    if (props.disabledDate(d)) return true
  }
  if (props.minDate) {
    const min = parseSingleDate(props.minDate)
    if (min && d < new Date(min.getFullYear(), min.getMonth(), min.getDate())) return true
  }
  if (props.maxDate) {
    const max = parseSingleDate(props.maxDate)
    if (max && d > new Date(max.getFullYear(), max.getMonth(), max.getDate(), 23, 59, 59)) return true
  }
  return false
}

// ============================================================================
// 2. REACTIVE STATE
// ============================================================================

const isOpen = ref(false)
const popoverRef = ref(null)
const containerRef = ref(null)
const jInputRef = ref(null)
const isFocused = ref(false)

const currentView = ref('days') // 'days' | 'months' | 'years'
const now = new Date()
const viewYear = ref(now.getFullYear())
const viewMonth = ref(now.getMonth()) // 0 - 11

// Single Date State
const singleDate = ref(null)

// Range State
const rangeStart = ref(null)
const rangeEnd = ref(null)
const hoverDate = ref(null)

// Time Picker State (12h format: hours strictly 1-12, 24h format: hours 0-23)
const timeAmPm = ref(now.getHours() >= 12 ? 'PM' : 'AM')
const timeHours = ref(props.timeFormat === '12h' ? (now.getHours() % 12 || 12) : now.getHours())
const timeMinutes = ref(now.getMinutes())
const timeSeconds = ref(0)

// Display String in Input
const displayInputValue = ref('')

// Teleport floating position styles
const popoverStyles = ref({})

// Helper to set internal time state from a Date object
const setTimeFromDate = (d) => {
  if (!d) return
  const rawH = d.getHours()
  if (props.timeFormat === '12h') {
    timeAmPm.value = rawH >= 12 ? 'PM' : 'AM'
    timeHours.value = rawH % 12 || 12
  } else {
    timeHours.value = rawH
  }
  timeMinutes.value = d.getMinutes()
  timeSeconds.value = d.getSeconds()
}

// ============================================================================
// 3. SYNC WITH MODELVALUE
// ============================================================================

const syncFromModelValue = () => {
  if (isRangeMode.value) {
    const [start, end] = parseRangeValue(props.modelValue)
    rangeStart.value = start
    rangeEnd.value = end
    if (start) {
      viewYear.value = start.getFullYear()
      viewMonth.value = start.getMonth()
      setTimeFromDate(start)
    }
    if (!isFocused.value) {
      updateDisplayValue()
    }
  } else {
    const parsed = parseSingleDate(props.modelValue)
    singleDate.value = parsed
    if (parsed) {
      viewYear.value = parsed.getFullYear()
      viewMonth.value = parsed.getMonth()
      setTimeFromDate(parsed)
    }
    if (!isFocused.value) {
      updateDisplayValue()
    }
  }
}

const updateDisplayValue = () => {
  if (isRangeMode.value) {
    if (rangeStart.value && rangeEnd.value) {
      displayInputValue.value = `${formatDate(rangeStart.value)}${props.rangeSeparator}${formatDate(rangeEnd.value)}`
    } else if (rangeStart.value) {
      displayInputValue.value = `${formatDate(rangeStart.value)}${props.rangeSeparator}`
    } else {
      displayInputValue.value = ''
    }
  } else {
    displayInputValue.value = singleDate.value ? formatDate(singleDate.value) : ''
  }
}

watch(() => props.modelValue, syncFromModelValue, { immediate: true })

// ============================================================================
// 4. FLOATING POPOVER POSITIONING (TELEPORT SAFE)
// ============================================================================

const updatePopoverPosition = () => {
  if (!containerRef.value || !isOpen.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const popoverWidth = isShowingPresets.value ? (isRangeMode.value ? 460 : 440) : (isWithTime.value ? 350 : 320)
  const popoverHeight = isWithTime.value ? 470 : 380

  let top = rect.bottom + 6
  let left = rect.left

  // Flip up if bottom of viewport overflows and top has room
  if (top + popoverHeight > window.innerHeight && rect.top > popoverHeight + 10) {
    top = Math.max(10, rect.top - popoverHeight - 6)
  }

  // Shift left if right of viewport overflows
  if (left + popoverWidth > window.innerWidth - 10) {
    left = Math.max(10, window.innerWidth - popoverWidth - 10)
  }

  popoverStyles.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 1080,
  }
}

// Global click outside listener to handle teleported popover
const handleGlobalClick = (event) => {
  if (!isOpen.value) return
  const target = event.target
  if (
    containerRef.value?.contains(target) ||
    popoverRef.value?.contains(target)
  ) {
    return
  }
  closePopover()
}

onMounted(() => {
  window.addEventListener('scroll', updatePopoverPosition, true)
  window.addEventListener('resize', updatePopoverPosition)
  document.addEventListener('pointerdown', handleGlobalClick)
})

onUnmounted(() => {
  window.removeEventListener('scroll', updatePopoverPosition, true)
  window.removeEventListener('resize', updatePopoverPosition)
  document.removeEventListener('pointerdown', handleGlobalClick)
})

// ============================================================================
// 5. CALENDAR GRID COMPUTATION
// ============================================================================

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const monthShortNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const weekdays = computed(() => {
  const base = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  if (props.startOfWeek === 1) {
    return ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
  }
  return base
})

const yearDecadeStart = computed(() => {
  return Math.floor(viewYear.value / 12) * 12
})

const decadeYears = computed(() => {
  const start = yearDecadeStart.value
  const years = []
  for (let i = 0; i < 12; i++) {
    years.push(start + i)
  }
  return years
})

// 42-day calendar matrix (6 weeks)
const calendarDays = computed(() => {
  const year = viewYear.value
  const month = viewMonth.value

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  let firstDayIndex = firstDayOfMonth.getDay()
  if (props.startOfWeek === 1) {
    firstDayIndex = (firstDayIndex + 6) % 7
  }

  const days = []
  const prevMonthLastDay = new Date(year, month, 0).getDate()

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i)
    days.push({
      date: d,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isOtherMonth: true,
      isDisabled: isDateDisabled(d),
      isToday: isToday(d),
    })
  }

  // Current month days
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    const d = new Date(year, month, i)
    days.push({
      date: d,
      dayNumber: i,
      isCurrentMonth: true,
      isOtherMonth: false,
      isDisabled: isDateDisabled(d),
      isToday: isToday(d),
    })
  }

  // Next month leading days to fill 42 cells (6 rows × 7 cols)
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    days.push({
      date: d,
      dayNumber: i,
      isCurrentMonth: false,
      isOtherMonth: true,
      isDisabled: isDateDisabled(d),
      isToday: isToday(d),
    })
  }

  return days
})

// ============================================================================
// 6. SELECTION & RANGE LOGIC
// ============================================================================

const isSelectedDate = (d) => {
  if (!d) return false
  if (isRangeMode.value) {
    if (rangeStart.value && isSameDay(d, rangeStart.value)) return true
    if (rangeEnd.value && isSameDay(d, rangeEnd.value)) return true
    return false
  }
  return singleDate.value && isSameDay(d, singleDate.value)
}

const isDateInRange = (d) => {
  if (!isRangeMode.value || !rangeStart.value) return false
  const time = d.getTime()
  const startDay = new Date(rangeStart.value.getFullYear(), rangeStart.value.getMonth(), rangeStart.value.getDate()).getTime()

  if (rangeEnd.value) {
    const endDay = new Date(rangeEnd.value.getFullYear(), rangeEnd.value.getMonth(), rangeEnd.value.getDate()).getTime()
    return time > startDay && time < endDay
  }

  if (hoverDate.value) {
    const hoverDay = new Date(hoverDate.value.getFullYear(), hoverDate.value.getMonth(), hoverDate.value.getDate()).getTime()
    if (hoverDay > startDay) {
      return time > startDay && time < hoverDay
    } else if (hoverDay < startDay) {
      return time > hoverDay && time < startDay
    }
  }
  return false
}

const isRangeStart = (d) => {
  if (!isRangeMode.value || !rangeStart.value) return false
  if (rangeEnd.value && rangeEnd.value < rangeStart.value) {
    return isSameDay(d, rangeEnd.value)
  }
  return isSameDay(d, rangeStart.value)
}

const isRangeEnd = (d) => {
  if (!isRangeMode.value) return false
  if (rangeEnd.value) {
    if (rangeEnd.value < rangeStart.value) {
      return isSameDay(d, rangeStart.value)
    }
    return isSameDay(d, rangeEnd.value)
  }
  if (hoverDate.value && rangeStart.value) {
    return isSameDay(d, hoverDate.value)
  }
  return false
}

const isHoverInRange = (d) => {
  if (!isRangeMode.value || !rangeStart.value || rangeEnd.value || !hoverDate.value) return false
  const time = d.getTime()
  const start = new Date(rangeStart.value.getFullYear(), rangeStart.value.getMonth(), rangeStart.value.getDate()).getTime()
  const hover = new Date(hoverDate.value.getFullYear(), hoverDate.value.getMonth(), hoverDate.value.getDate()).getTime()

  if (hover > start) {
    return time > start && time < hover
  } else if (hover < start) {
    return time > hover && time < start
  }
  return false
}

// Click Day handler
const selectDay = (dayObj) => {
  if (dayObj.isDisabled) return

  const targetDate = new Date(dayObj.date)

  if (isWithTime.value) {
    targetDate.setHours(getCalculatedHours(), timeMinutes.value, timeSeconds.value)
  }

  if (isRangeMode.value) {
    if (!rangeStart.value || (rangeStart.value && rangeEnd.value)) {
      // First click in range
      rangeStart.value = targetDate
      rangeEnd.value = null
      updateDisplayValue()
      emit('select', { start: targetDate, end: null })
    } else {
      // Second click in range
      let start = rangeStart.value
      let end = targetDate
      if (end < start) {
        const temp = start
        start = end
        end = temp
      }
      rangeStart.value = start
      rangeEnd.value = end
      updateDisplayValue()
      emitRangeValue()

      if (!isWithTime.value) {
        const shouldClose = props.closeOnSelect !== false
        if (shouldClose) closePopover()
      }
    }
  } else {
    // Single Date Mode
    singleDate.value = targetDate
    updateDisplayValue()
    emitSingleValue()

    if (!isWithTime.value) {
      const shouldClose = props.closeOnSelect !== false
      if (shouldClose) closePopover()
    }
  }
}

const handleDayMouseEnter = (dayObj) => {
  if (!isRangeMode.value || !rangeStart.value || rangeEnd.value) return
  hoverDate.value = dayObj.date
}

// ============================================================================
// 7. TIME PICKER CONTROLS (12H / 24H)
// ============================================================================

const getCalculatedHours = () => {
  let h = Number(timeHours.value) || 0
  if (props.timeFormat === '12h') {
    if (h > 12) h = h % 12 || 12
    if (h < 1) h = 12
    if (timeAmPm.value === 'PM') {
      return h === 12 ? 12 : h + 12
    } else {
      return h === 12 ? 0 : h
    }
  }
  return h
}

const adjustHour = (delta) => {
  if (props.timeFormat === '12h') {
    let h = Number(timeHours.value) || 12
    if (h > 12) h = h % 12 || 12
    if (h < 1) h = 12
    h += delta
    if (h > 12) h = 1
    if (h < 1) h = 12
    timeHours.value = h
  } else {
    let h = (Number(timeHours.value) || 0) + delta
    if (h > 23) h = 0
    if (h < 0) h = 23
    timeHours.value = h
  }
  applyTimeChange()
}

const handleHourInput = (event) => {
  let val = parseInt(event.target.value, 10)
  if (isNaN(val)) return
  if (props.timeFormat === '12h') {
    if (val > 12) val = 12
    if (val < 1) val = 1
  } else {
    if (val > 23) val = 23
    if (val < 0) val = 0
  }
  timeHours.value = val
  applyTimeChange()
}

const handleHourBlur = () => {
  let val = parseInt(timeHours.value, 10)
  if (isNaN(val)) {
    timeHours.value = props.timeFormat === '12h' ? 12 : 0
  } else if (props.timeFormat === '12h') {
    if (val > 12) val = 12
    if (val < 1) val = 12
    timeHours.value = val
  } else {
    if (val > 23) val = 23
    if (val < 0) val = 0
    timeHours.value = val
  }
  applyTimeChange()
}

const adjustMinute = (delta) => {
  let m = (Number(timeMinutes.value) || 0) + delta
  if (m > 59) m = 0
  if (m < 0) m = 59
  timeMinutes.value = m
  applyTimeChange()
}

const handleMinuteInput = (event) => {
  let val = parseInt(event.target.value, 10)
  if (isNaN(val)) return
  if (val > 59) val = 59
  if (val < 0) val = 0
  timeMinutes.value = val
  applyTimeChange()
}

const adjustSecond = (delta) => {
  let s = (Number(timeSeconds.value) || 0) + delta
  if (s > 59) s = 0
  if (s < 0) s = 59
  timeSeconds.value = s
  applyTimeChange()
}

const handleSecondInput = (event) => {
  let val = parseInt(event.target.value, 10)
  if (isNaN(val)) return
  if (val > 59) val = 59
  if (val < 0) val = 0
  timeSeconds.value = val
  applyTimeChange()
}

const toggleAmPm = (val) => {
  timeAmPm.value = val
  if (props.timeFormat === '12h') {
    let h = Number(timeHours.value) || 12
    if (h > 12) h = h % 12 || 12
    if (h < 1) h = 12
    timeHours.value = h
  }
  applyTimeChange()
}

const setTimePreset = (h, m) => {
  timeMinutes.value = m
  timeSeconds.value = 0
  if (props.timeFormat === '12h') {
    timeAmPm.value = h >= 12 ? 'PM' : 'AM'
    timeHours.value = h % 12 || 12
  } else {
    timeHours.value = h
  }
  applyTimeChange()
}

const setTimeToNow = () => {
  const cur = new Date()
  setTimeFromDate(cur)
  applyTimeChange()
}

const applyTimeChange = () => {
  const h = getCalculatedHours()
  const m = Number(timeMinutes.value) || 0
  const s = Number(timeSeconds.value) || 0

  if (!isRangeMode.value && singleDate.value) {
    singleDate.value = new Date(
      singleDate.value.getFullYear(),
      singleDate.value.getMonth(),
      singleDate.value.getDate(),
      h, m, s
    )
    updateDisplayValue()
    emitSingleValue()
  } else if (isRangeMode.value && rangeStart.value) {
    rangeStart.value = new Date(
      rangeStart.value.getFullYear(),
      rangeStart.value.getMonth(),
      rangeStart.value.getDate(),
      h, m, s
    )
    updateDisplayValue()
    if (rangeEnd.value) emitRangeValue()
  }
}

// ============================================================================
// 8. EMIT UPDATES & SYNC
// ============================================================================

const emitSingleValue = () => {
  if (!singleDate.value) {
    emit('update:modelValue', '')
    emit('change', '')
    return
  }
  const formatted = formatDate(singleDate.value)
  emit('update:modelValue', formatted)
  emit('change', formatted)
  emit('select', singleDate.value)
}

const emitRangeValue = () => {
  if (!rangeStart.value || !rangeEnd.value) return
  const fStart = formatDate(rangeStart.value)
  const fEnd = formatDate(rangeEnd.value)

  if (Array.isArray(props.modelValue)) {
    emit('update:modelValue', [fStart, fEnd])
    emit('change', [fStart, fEnd])
  } else {
    const formatted = `${fStart}${props.rangeSeparator}${fEnd}`
    emit('update:modelValue', formatted)
    emit('change', formatted)
  }
  emit('select', { start: rangeStart.value, end: rangeEnd.value })
}

// ============================================================================
// 9. DIRECT USER KEYBOARD INPUT / TYPING ENGINE
// ============================================================================

const handleDirectInput = (event) => {
  const val = event.target ? event.target.value : event
  displayInputValue.value = val
  emit('input', val)

  if (props.allowInput && val) {
    if (isRangeMode.value) {
      const [start, end] = parseRangeValue(val)
      if (start && end) {
        rangeStart.value = start
        rangeEnd.value = end
        viewYear.value = start.getFullYear()
        viewMonth.value = start.getMonth()
        emitRangeValue()
      } else if (start && !end) {
        rangeStart.value = start
        viewYear.value = start.getFullYear()
        viewMonth.value = start.getMonth()
      }
    } else {
      const parsed = parseSingleDate(val)
      if (parsed) {
        singleDate.value = parsed
        viewYear.value = parsed.getFullYear()
        viewMonth.value = parsed.getMonth()
        setTimeFromDate(parsed)
        emitSingleValue()
      }
    }
  }
}

const handleFocus = (event) => {
  isFocused.value = true
  openPopover()
  emit('focus', event)
}

const handleInputBlur = (event) => {
  isFocused.value = false
  emit('blur', event)

  if (props.allowInput && displayInputValue.value) {
    if (isRangeMode.value) {
      const [start, end] = parseRangeValue(displayInputValue.value)
      if (start && end) {
        rangeStart.value = start
        rangeEnd.value = end
        emitRangeValue()
      }
    } else {
      const parsed = parseSingleDate(displayInputValue.value)
      if (parsed) {
        singleDate.value = parsed
        setTimeFromDate(parsed)
        emitSingleValue()
      }
    }
  }
  updateDisplayValue()
}

const handleInputEnter = () => {
  handleInputBlur()
  closePopover()
}

// Clear
const handleClear = () => {
  singleDate.value = null
  rangeStart.value = null
  rangeEnd.value = null
  hoverDate.value = null
  displayInputValue.value = ''
  emit('update:modelValue', isRangeMode.value ? (Array.isArray(props.modelValue) ? [] : '') : '')
  emit('clear')
  emit('change', '')
}

// ============================================================================
// 10. PRESET SHORTCUTS
// ============================================================================

const isShowingPresets = computed(() => {
  if (props.showPresets !== null) return props.showPresets
  return Boolean(props.shortcuts)
})

const defaultSinglePresets = [
  { label: 'Today', getValue: () => new Date() },
  { label: 'Yesterday', getValue: () => new Date(Date.now() - 86400000) },
  { label: 'Tomorrow', getValue: () => new Date(Date.now() + 86400000) },
  { label: '+7 Days', getValue: () => new Date(Date.now() + 7 * 86400000) },
]

const defaultRangePresets = [
  {
    label: 'Today',
    getValue: () => [new Date(), new Date()],
  },
  {
    label: 'Yesterday',
    getValue: () => [new Date(Date.now() - 86400000), new Date(Date.now() - 86400000)],
  },
  {
    label: 'Last 7 Days',
    getValue: () => [new Date(Date.now() - 6 * 86400000), new Date()],
  },
  {
    label: 'Last 30 Days',
    getValue: () => [new Date(Date.now() - 29 * 86400000), new Date()],
  },
  {
    label: 'This Month',
    getValue: () => {
      const n = new Date()
      return [new Date(n.getFullYear(), n.getMonth(), 1), new Date(n.getFullYear(), n.getMonth() + 1, 0)]
    },
  },
  {
    label: 'Last Month',
    getValue: () => {
      const n = new Date()
      return [new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth(), 0)]
    },
  },
]

const activePresets = computed(() => {
  if (Array.isArray(props.shortcuts)) return props.shortcuts
  return isRangeMode.value ? defaultRangePresets : defaultSinglePresets
})

const applyPreset = (preset) => {
  const val = preset.getValue()
  if (isRangeMode.value && Array.isArray(val)) {
    rangeStart.value = val[0]
    rangeEnd.value = val[1]
    if (val[0]) {
      viewYear.value = val[0].getFullYear()
      viewMonth.value = val[0].getMonth()
      setTimeFromDate(val[0])
    }
    updateDisplayValue()
    emitRangeValue()
  } else if (!isRangeMode.value && val instanceof Date) {
    singleDate.value = val
    viewYear.value = val.getFullYear()
    viewMonth.value = val.getMonth()
    setTimeFromDate(val)
    updateDisplayValue()
    emitSingleValue()
  }
  if (!isWithTime.value) {
    closePopover()
  }
}

// ============================================================================
// 11. POPOVER CONTROLS & NAVIGATION JUMPERS
// ============================================================================

const togglePopover = () => {
  if (props.disabled || props.readonly) return
  if (isOpen.value) {
    closePopover()
  } else {
    openPopover()
  }
}

const openPopover = () => {
  if (props.disabled || props.readonly) return
  isOpen.value = true
  currentView.value = 'days'
  nextTick(updatePopoverPosition)
  emit('open')
}

const closePopover = () => {
  if (!isOpen.value) return
  isOpen.value = false
  currentView.value = 'days'
  hoverDate.value = null
  emit('close')
}

// Month / Year Jumpers
const prevMonth = () => {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

const nextMonth = () => {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

const prevYear = () => {
  if (currentView.value === 'years') {
    viewYear.value -= 12
  } else {
    viewYear.value--
  }
}

const nextYear = () => {
  if (currentView.value === 'years') {
    viewYear.value += 12
  } else {
    viewYear.value++
  }
}

const selectMonth = (idx) => {
  viewMonth.value = idx
  currentView.value = 'days'
}

const selectYear = (yr) => {
  viewYear.value = yr
  currentView.value = 'months'
}

const goToToday = () => {
  const d = new Date()
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
  currentView.value = 'days'
  if (!isRangeMode.value) {
    selectDay({ date: d, isDisabled: isDateDisabled(d) })
  }
}

// Auto placeholder
const computedPlaceholder = computed(() => {
  if (props.placeholder) return props.placeholder
  if (isRangeMode.value) {
    return isWithTime.value ? 'Start Date & Time ~ End Date & Time' : 'Start Date ~ End Date'
  }
  if (isWithTime.value) {
    return props.timeFormat === '12h' ? 'YYYY-MM-DD hh:mm AM/PM' : 'YYYY-MM-DD HH:mm'
  }
  return 'YYYY-MM-DD'
})

// Expose public methods
defineExpose({
  open: openPopover,
  close: closePopover,
  clear: handleClear,
  focus: () => jInputRef.value?.focus(),
  blur: () => jInputRef.value?.blur(),
})
</script>

<template>
  <div ref="containerRef" :class="['j-datepicker', `j-datepicker--${computedSelectionStyle}`, containerClass]">
    <!-- ===================================================================== -->
    <!-- 1. ANCHOR INPUT (JINPUT INTEGRATION)                                  -->
    <!-- ===================================================================== -->
    <div class="j-datepicker-input-wrapper">
      <JInput
        ref="jInputRef"
        :id="id"
        :name="name"
        :model-value="displayInputValue"
        :pattern="pattern"
        :variant="variant"
        :boxed="boxed"
        :underlined="underlined"
        :filled="filled"
        :pill="pill"
        :notch="notch"
        :floating="floating"
        :size="size"
        :sm="sm"
        :lg="lg"
        :label="label"
        :label-class="labelClass"
        :placeholder="computedPlaceholder"
        :hint="hint"
        :helper="helper"
        :caption="caption"
        :disabled="disabled"
        :readonly="readonly || !allowInput"
        :required="required"
        :valid="valid"
        :invalid="invalid"
        :valid-feedback="validFeedback"
        :invalid-feedback="invalidFeedback"
        :prepend-icon="prependIcon"
        :prepend-text="prependText"
        :append-text="appendText"
        :input-class="inputClass"
        :clearable="false"
        @focus="handleFocus"
        @input="handleDirectInput"
        @blur="handleInputBlur"
        @enter="handleInputEnter"
        @keydown.esc="closePopover"
      >
        <!-- Prepend Inner Slot (Inside Input on the Left) -->
        <template v-if="prependInnerIcon || $slots['prepend-inner']" #prepend-inner>
          <slot name="prepend-inner">
            <span v-if="prependInnerIcon" class="j-datepicker-inner-icon-start">
              {{ prependInnerIcon }}
            </span>
          </slot>
        </template>

        <!-- Append Inner Slot (Inside Input on the Right: Clear Button & Calendar Icon Button) -->
        <template #append-inner>
          <slot name="append-inner">
            <div class="j-datepicker-inner-actions">
              <!-- Clear Action (if clearable and has value) -->
              <button
                v-if="clearable && displayInputValue && !disabled && !readonly"
                type="button"
                class="j-datepicker-clear-btn"
                title="Clear date"
                aria-label="Clear date"
                @click.stop="handleClear"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              <!-- Dropdown Trigger Toggle Button with Calendar Icon -->
              <button
                type="button"
                class="j-datepicker-calendar-btn"
                :title="isOpen ? 'Close Calendar' : 'Open Calendar'"
                aria-label="Toggle Calendar"
                :disabled="disabled"
                @click.stop="togglePopover"
              >
                <slot name="icon">
                  <span v-if="appendInnerIcon">{{ appendInnerIcon }}</span>
                  <svg
                    v-else
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </slot>
              </button>
            </div>
          </slot>
        </template>

        <!-- External Prepend / Append Slots (Optional for custom input group addons) -->
        <template v-if="$slots.prepend" #prepend>
          <slot name="prepend" />
        </template>

        <template v-if="$slots.append || appendIcon" #append>
          <slot name="append">
            <span v-if="appendIcon" class="input-group-text">{{ appendIcon }}</span>
          </slot>
        </template>
      </JInput>
    </div>

    <!-- ===================================================================== -->
    <!-- 2. FLOATING CALENDAR POPOVER (TELEPORTED TO BODY)                     -->
    <!-- ===================================================================== -->
    <Teleport to="body" :disabled="!teleport">
      <div
        v-if="isOpen"
        ref="popoverRef"
        :style="teleport ? popoverStyles : {}"
        :class="[
          'j-datepicker-popover',
          `selection-${computedSelectionStyle}`,
          {
            'has-presets': isShowingPresets,
            'has-time': isWithTime,
            'is-range': isRangeMode,
          },
        ]"
        role="dialog"
        aria-modal="true"
      >
        <div :class="['j-datepicker-layout', { 'has-sidebar': isShowingPresets }]">
          <!-- Presets Sidebar -->
          <div v-if="isShowingPresets" class="j-datepicker-presets">
            <button
              v-for="(pst, idx) in activePresets"
              :key="idx"
              type="button"
              class="preset-btn"
              @click="applyPreset(pst)"
            >
              {{ pst.label }}
            </button>
          </div>

          <!-- Main Body -->
          <div class="j-datepicker-body">
            <!-- Calendar Header -->
            <div class="j-datepicker-header">
              <!-- Prev Year Button -->
              <button
                type="button"
                class="nav-btn"
                title="Previous Year / Decade"
                @click="prevYear"
              >
                «
              </button>

              <!-- Prev Month Button -->
              <button
                v-if="currentView === 'days'"
                type="button"
                class="nav-btn"
                title="Previous Month"
                @click="prevMonth"
              >
                ‹
              </button>

              <!-- Month & Year Title Switchers -->
              <div class="title-group">
                <button
                  type="button"
                  class="title-btn"
                  @click="currentView = currentView === 'months' ? 'days' : 'months'"
                >
                  {{ monthNames[viewMonth] }}
                </button>
                <button
                  type="button"
                  class="title-btn"
                  @click="currentView = currentView === 'years' ? 'days' : 'years'"
                >
                  <span v-if="currentView === 'years'">{{ yearDecadeStart }} - {{ yearDecadeStart + 11 }}</span>
                  <span v-else>{{ viewYear }}</span>
                </button>
              </div>

              <!-- Next Month Button -->
              <button
                v-if="currentView === 'days'"
                type="button"
                class="nav-btn"
                title="Next Month"
                @click="nextMonth"
              >
                ›
              </button>

              <!-- Next Year Button -->
              <button
                type="button"
                class="nav-btn"
                title="Next Year / Decade"
                @click="nextYear"
              >
                »
              </button>
            </div>

            <!-- Range Info Display (if Range Mode) -->
            <div v-if="isRangeMode" class="j-datepicker-range-info">
              <span class="range-badge">
                {{ rangeStart ? formatDate(rangeStart) : 'Select Start' }}
              </span>
              <span class="range-arrow">➔</span>
              <span class="range-badge">
                {{ rangeEnd ? formatDate(rangeEnd) : (rangeStart ? 'Select End' : '...') }}
              </span>
            </div>

            <!-- =============================================================== -->
            <!-- VIEW 1: DAYS MATRIX                                             -->
            <!-- =============================================================== -->
            <template v-if="currentView === 'days'">
              <!-- Weekdays Header -->
              <div class="j-datepicker-weekdays">
                <div
                  v-for="wk in weekdays"
                  :key="wk"
                  class="weekday-cell"
                >
                  {{ wk }}
                </div>
              </div>

              <!-- 42-day Matrix -->
              <div class="j-datepicker-grid">
                <div
                  v-for="(dayObj, idx) in calendarDays"
                  :key="idx"
                  :class="[
                    'day-cell-wrapper',
                    {
                      'in-range': isDateInRange(dayObj.date),
                      'range-start': isRangeStart(dayObj.date),
                      'range-end': isRangeEnd(dayObj.date),
                      'hover-in-range': isHoverInRange(dayObj.date),
                    },
                  ]"
                >
                  <button
                    type="button"
                    :class="[
                      'day-btn',
                      {
                        'is-other-month': dayObj.isOtherMonth,
                        'is-today': dayObj.isToday,
                        'is-selected': isSelectedDate(dayObj.date),
                      },
                    ]"
                    :disabled="dayObj.isDisabled"
                    @click="selectDay(dayObj)"
                    @mouseenter="handleDayMouseEnter(dayObj)"
                  >
                    {{ dayObj.dayNumber }}
                  </button>
                </div>
              </div>
            </template>

            <!-- =============================================================== -->
            <!-- VIEW 2: FAST MONTHS GRID                                        -->
            <!-- =============================================================== -->
            <div v-else-if="currentView === 'months'" class="j-datepicker-month-grid">
              <button
                v-for="(mName, idx) in monthShortNames"
                :key="mName"
                type="button"
                :class="[
                  'month-btn',
                  {
                    'is-selected': idx === viewMonth,
                    'is-current': idx === now.getMonth() && viewYear === now.getFullYear(),
                  },
                ]"
                @click="selectMonth(idx)"
              >
                {{ mName }}
              </button>
            </div>

            <!-- =============================================================== -->
            <!-- VIEW 3: FAST YEARS GRID                                         -->
            <!-- =============================================================== -->
            <div v-else-if="currentView === 'years'" class="j-datepicker-year-grid">
              <button
                v-for="yr in decadeYears"
                :key="yr"
                type="button"
                :class="[
                  'year-btn',
                  {
                    'is-selected': yr === viewYear,
                    'is-current': yr === now.getFullYear(),
                  },
                ]"
                @click="selectYear(yr)"
              >
                {{ yr }}
              </button>
            </div>
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- TIME PICKER PANEL (IF SHOWTIME)                                   -->
        <!-- ================================================================= -->
        <div v-if="isWithTime" class="j-datepicker-time-panel">
          <div class="time-header">
            <span class="time-title">🕒 Time Selection</span>
            <!-- Quick Presets -->
            <div class="time-quick-presets">
              <button type="button" class="time-preset-pill" @click="setTimePreset(0, 0)">00:00</button>
              <button type="button" class="time-preset-pill" @click="setTimePreset(9, 0)">09:00</button>
              <button type="button" class="time-preset-pill" @click="setTimePreset(12, 0)">12:00</button>
              <button type="button" class="time-preset-pill" @click="setTimePreset(18, 0)">18:00</button>
              <button type="button" class="time-preset-pill" @click="setTimeToNow">Now</button>
            </div>
          </div>

          <div class="time-controls">
            <!-- Hours Stepper -->
            <div class="time-stepper">
              <button type="button" class="time-stepper-btn" @click="adjustHour(1)">▲</button>
              <input
                :value="padZero(timeHours)"
                type="text"
                class="time-input"
                maxlength="2"
                @input="handleHourInput"
                @blur="handleHourBlur"
                @keydown.enter="applyTimeChange"
              />
              <button type="button" class="time-stepper-btn" @click="adjustHour(-1)">▼</button>
            </div>

            <span class="time-separator">:</span>

            <!-- Minutes Stepper -->
            <div class="time-stepper">
              <button type="button" class="time-stepper-btn" @click="adjustMinute(1)">▲</button>
              <input
                :value="padZero(timeMinutes)"
                type="text"
                class="time-input"
                maxlength="2"
                @input="handleMinuteInput"
                @blur="applyTimeChange"
                @keydown.enter="applyTimeChange"
              />
              <button type="button" class="time-stepper-btn" @click="adjustMinute(-1)">▼</button>
            </div>

            <!-- Seconds Stepper (Optional) -->
            <template v-if="showSeconds">
              <span class="time-separator">:</span>
              <div class="time-stepper">
                <button type="button" class="time-stepper-btn" @click="adjustSecond(1)">▲</button>
                <input
                  :value="padZero(timeSeconds)"
                  type="text"
                  class="time-input"
                  maxlength="2"
                  @input="handleSecondInput"
                  @blur="applyTimeChange"
                  @keydown.enter="applyTimeChange"
                />
                <button type="button" class="time-stepper-btn" @click="adjustSecond(-1)">▼</button>
              </div>
            </template>

            <!-- 12h AM/PM Switcher -->
            <div v-if="timeFormat === '12h'" class="time-ampm-toggle">
              <button
                type="button"
                :class="['ampm-btn', { 'is-active': timeAmPm === 'AM' }]"
                @click="toggleAmPm('AM')"
              >
                AM
              </button>
              <button
                type="button"
                :class="['ampm-btn', { 'is-active': timeAmPm === 'PM' }]"
                @click="toggleAmPm('PM')"
              >
                PM
              </button>
            </div>
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- POPOVER FOOTER ACTIONS                                            -->
        <!-- ================================================================= -->
        <div class="j-datepicker-footer">
          <div class="footer-left">
            <button
              type="button"
              class="btn btn-xs btn-tonal-neutral"
              @click="goToToday"
            >
              Today
            </button>
            <button
              v-if="clearable"
              type="button"
              class="btn btn-xs btn-ghost text-muted"
              @click="handleClear"
            >
              Clear
            </button>
          </div>

          <div class="footer-right">
            <button
              type="button"
              class="btn btn-xs btn-primary"
              @click="closePopover"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
