<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import JInput from './JInput.vue'

const props = defineProps({
  // v-model binding: String ('14:30', '02:30 PM') | Date | Object
  modelValue: {
    type: [String, Date, Object, Number],
    default: '',
  },
  // Time Format: '12h' (AM/PM) | '24h'
  timeFormat: {
    type: String,
    default: '12h',
    validator: (v) => ['12h', '24h'].includes(v),
  },
  // Seconds Toggle
  showSeconds: {
    type: Boolean,
    default: false,
  },
  // Step intervals
  minuteStep: {
    type: Number,
    default: 1,
  },
  secondStep: {
    type: Number,
    default: 1,
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
  // Presets & Shortcuts
  presets: {
    type: [Boolean, Array],
    default: true,
  },
  showPresets: {
    type: Boolean,
    default: null,
  },
  // Min & Max Time Bounds (e.g. '09:00', '18:00')
  minTime: {
    type: String,
    default: null,
  },
  maxTime: {
    type: String,
    default: null,
  },
  // Direct Input & Behavior
  allowInput: {
    type: Boolean,
    default: true,
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
  'focus',
  'blur',
  'open',
  'close',
])

// ============================================================================
// 1. STATE & REFERENCES
// ============================================================================

const jInputRef = ref(null)
const containerRef = ref(null)
const popoverRef = ref(null)
const isOpen = ref(false)
const isFocused = ref(false)
const popoverStyles = ref({})

// Internal Time State
const timeHours = ref(props.timeFormat === '12h' ? 12 : 0)
const timeMinutes = ref(0)
const timeSeconds = ref(0)
const timeAmPm = ref('AM')
const displayInputValue = ref('')
const activePickerTab = ref('dial') // 'dial' | 'columns'

// Selection shape resolver
const computedSelectionStyle = computed(() => {
  if (props.square) return 'square'
  if (props.squircle) return 'squircle'
  if (props.rounded) return 'rounded'
  const custom = props.selectionStyle || props.shape
  if (custom && ['rounded', 'square', 'squircle'].includes(custom.toLowerCase())) {
    return custom.toLowerCase()
  }
  return 'rounded'
})

// Auto placeholder
const computedPlaceholder = computed(() => {
  if (props.placeholder) return props.placeholder
  if (props.timeFormat === '12h') {
    return props.showSeconds ? 'hh:mm:ss AM/PM' : 'hh:mm AM/PM'
  }
  return props.showSeconds ? 'HH:mm:ss' : 'HH:mm'
})

// Presets visibility
const isShowingPresets = computed(() => {
  if (props.showPresets !== null) return props.showPresets
  return Boolean(props.presets)
})

// Default presets
const default12hPresets = [
  { label: '09:00 AM (Morning)', h: 9, m: 0, s: 0, a: 'AM' },
  { label: '12:00 PM (Noon)', h: 12, m: 0, s: 0, a: 'PM' },
  { label: '01:00 PM (Lunch)', h: 1, m: 0, s: 0, a: 'PM' },
  { label: '05:00 PM (Evening)', h: 5, m: 0, s: 0, a: 'PM' },
  { label: '08:00 PM (Night)', h: 8, m: 0, s: 0, a: 'PM' },
]

const default24hPresets = [
  { label: '09:00 (Morning)', h: 9, m: 0, s: 0, a: 'AM' },
  { label: '12:00 (Noon)', h: 12, m: 0, s: 0, a: 'PM' },
  { label: '13:00 (Lunch)', h: 13, m: 0, s: 0, a: 'PM' },
  { label: '17:00 (Evening)', h: 17, m: 0, s: 0, a: 'PM' },
  { label: '20:00 (Night)', h: 20, m: 0, s: 0, a: 'PM' },
]

const activePresets = computed(() => {
  if (Array.isArray(props.presets)) return props.presets
  return props.timeFormat === '12h' ? default12hPresets : default24hPresets
})

// Available options for columns
const availableHours = computed(() => {
  if (props.timeFormat === '12h') {
    return Array.from({ length: 12 }, (_, i) => i + 1)
  }
  return Array.from({ length: 24 }, (_, i) => i)
})

const availableMinutes = computed(() => {
  const step = Math.max(1, props.minuteStep || 1)
  const items = []
  for (let i = 0; i < 60; i += step) {
    items.push(i)
  }
  return items
})

const availableSeconds = computed(() => {
  const step = Math.max(1, props.secondStep || 1)
  const items = []
  for (let i = 0; i < 60; i += step) {
    items.push(i)
  }
  return items
})

// ============================================================================
// 2. PARSING & FORMATTING ENGINE
// ============================================================================

const padZero = (n) => String(n).padStart(2, '0')

const formatTimeString = (h, m, s, ampm) => {
  if (props.timeFormat === '12h') {
    const hh = padZero(h)
    const mm = padZero(m)
    const ap = ampm || 'AM'
    if (props.showSeconds) {
      return `${hh}:${mm}:${padZero(s)} ${ap}`
    }
    return `${hh}:${mm} ${ap}`
  } else {
    const hh = padZero(h)
    const mm = padZero(m)
    if (props.showSeconds) {
      return `${hh}:${mm}:${padZero(s)}`
    }
    return `${hh}:${mm}`
  }
}

const parseTimeString = (val) => {
  if (!val) return null

  if (val instanceof Date && !isNaN(val.getTime())) {
    const rawH = val.getHours()
    const m = val.getMinutes()
    const s = val.getSeconds()
    if (props.timeFormat === '12h') {
      const ap = rawH >= 12 ? 'PM' : 'AM'
      const h = rawH % 12 || 12
      return { h, m, s, ampm: ap }
    }
    return { h: rawH, m, s, ampm: rawH >= 12 ? 'PM' : 'AM' }
  }

  const str = String(val).trim()
  if (!str) return null

  // 12-hour regex: hh:mm(:ss)? (AM|PM)
  const match12 = str.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM|am|pm)$/i)
  if (match12) {
    let h = parseInt(match12[1], 10)
    let m = parseInt(match12[2], 10)
    let s = match12[3] ? parseInt(match12[3], 10) : 0
    let ampm = match12[4].toUpperCase()

    if (h >= 1 && h <= 12 && m >= 0 && m <= 59 && s >= 0 && s <= 59) {
      return { h, m, s, ampm }
    }
  }

  // 24-hour regex: HH:mm(:ss)?
  const match24 = str.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/)
  if (match24) {
    let rawH = parseInt(match24[1], 10)
    let m = parseInt(match24[2], 10)
    let s = match24[3] ? parseInt(match24[3], 10) : 0

    if (rawH >= 0 && rawH <= 23 && m >= 0 && m <= 59 && s >= 0 && s <= 59) {
      if (props.timeFormat === '12h') {
        const ap = rawH >= 12 ? 'PM' : 'AM'
        const h = rawH % 12 || 12
        return { h, m, s, ampm: ap }
      }
      return { h: rawH, m, s, ampm: rawH >= 12 ? 'PM' : 'AM' }
    }
  }

  return null
}

const syncFromModelValue = () => {
  const parsed = parseTimeString(props.modelValue)
  if (parsed) {
    timeHours.value = parsed.h
    timeMinutes.value = parsed.m
    timeSeconds.value = parsed.s
    timeAmPm.value = parsed.ampm
    if (!isFocused.value) {
      displayInputValue.value = formatTimeString(parsed.h, parsed.m, parsed.s, parsed.ampm)
    }
  } else if (!props.modelValue) {
    if (!isFocused.value) {
      displayInputValue.value = ''
    }
  }
}

watch(() => props.modelValue, syncFromModelValue, { immediate: true })
watch(() => props.timeFormat, () => {
  if (props.timeFormat === '12h') {
    if (timeHours.value > 12) {
      timeAmPm.value = 'PM'
      timeHours.value = timeHours.value % 12 || 12
    } else if (timeHours.value === 0) {
      timeHours.value = 12
      timeAmPm.value = 'AM'
    }
  }
  updateDisplayAndEmit(false)
})

// ============================================================================
// 3. STEPPERS & INTERACTIVE CONTROLS
// ============================================================================

const adjustHour = (delta) => {
  if (props.timeFormat === '12h') {
    let h = (Number(timeHours.value) || 12) + delta
    if (h > 12) h = 1
    if (h < 1) h = 12
    timeHours.value = h
  } else {
    let h = (Number(timeHours.value) || 0) + delta
    if (h > 23) h = 0
    if (h < 0) h = 23
    timeHours.value = h
  }
  updateDisplayAndEmit(true)
}

const selectHour = (h) => {
  timeHours.value = h
  updateDisplayAndEmit(true)
}

const adjustMinute = (delta) => {
  const step = Math.max(1, props.minuteStep || 1)
  let m = (Number(timeMinutes.value) || 0) + delta * step
  if (m > 59) m = 0
  if (m < 0) m = 59 - (59 % step)
  timeMinutes.value = m
  updateDisplayAndEmit(true)
}

const selectMinute = (m) => {
  timeMinutes.value = m
  updateDisplayAndEmit(true)
}

const adjustSecond = (delta) => {
  const step = Math.max(1, props.secondStep || 1)
  let s = (Number(timeSeconds.value) || 0) + delta * step
  if (s > 59) s = 0
  if (s < 0) s = 59 - (59 % step)
  timeSeconds.value = s
  updateDisplayAndEmit(true)
}

const selectSecond = (s) => {
  timeSeconds.value = s
  updateDisplayAndEmit(true)
}

const toggleAmPm = (val) => {
  timeAmPm.value = val
  updateDisplayAndEmit(true)
}

const setTimeToNow = () => {
  const now = new Date()
  const rawH = now.getHours()
  const m = now.getMinutes()
  const s = now.getSeconds()

  if (props.timeFormat === '12h') {
    timeAmPm.value = rawH >= 12 ? 'PM' : 'AM'
    timeHours.value = rawH % 12 || 12
  } else {
    timeHours.value = rawH
  }
  timeMinutes.value = m
  timeSeconds.value = s
  updateDisplayAndEmit(true)
}

const applyPreset = (preset) => {
  timeHours.value = preset.h
  timeMinutes.value = preset.m
  timeSeconds.value = preset.s || 0
  if (preset.a) timeAmPm.value = preset.a
  updateDisplayAndEmit(true)
}

const updateDisplayAndEmit = (shouldEmit = true) => {
  const str = formatTimeString(timeHours.value, timeMinutes.value, timeSeconds.value, timeAmPm.value)
  displayInputValue.value = str
  if (shouldEmit) {
    emit('update:modelValue', str)
    emit('change', str)
    emit('select', {
      formatted: str,
      hours: timeHours.value,
      minutes: timeMinutes.value,
      seconds: timeSeconds.value,
      ampm: timeAmPm.value,
    })
  }
}

// ============================================================================
// 4. DIRECT USER KEYBOARD INPUT
// ============================================================================

const handleDirectInput = (event) => {
  const val = event?.target ? event.target.value : event
  displayInputValue.value = val
  emit('input', val)

  if (props.allowInput && val) {
    const parsed = parseTimeString(val)
    if (parsed) {
      timeHours.value = parsed.h
      timeMinutes.value = parsed.m
      timeSeconds.value = parsed.s
      timeAmPm.value = parsed.ampm
      emit('update:modelValue', val)
      emit('change', val)
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
    const parsed = parseTimeString(displayInputValue.value)
    if (parsed) {
      timeHours.value = parsed.h
      timeMinutes.value = parsed.m
      timeSeconds.value = parsed.s
      timeAmPm.value = parsed.ampm
      updateDisplayAndEmit(true)
    } else {
      syncFromModelValue()
    }
  } else if (!displayInputValue.value) {
    handleClear()
  }
}

const handleInputEnter = () => {
  handleInputBlur()
  closePopover()
}

const handleClear = () => {
  displayInputValue.value = ''
  emit('update:modelValue', '')
  emit('clear')
  emit('change', '')
}

// ============================================================================
// 5. FLOATING POPOVER & POSITIONING
// ============================================================================

const updatePopoverPosition = () => {
  if (!containerRef.value || !isOpen.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const popoverWidth = isShowingPresets.value ? 410 : 310
  const popoverHeight = 360

  let top = rect.bottom + 6
  let left = rect.left

  if (top + popoverHeight > window.innerHeight && rect.top > popoverHeight + 10) {
    top = Math.max(10, rect.top - popoverHeight - 6)
  }

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

const openPopover = () => {
  if (props.disabled || props.readonly) return
  isOpen.value = true
  nextTick(updatePopoverPosition)
  emit('open')
}

const closePopover = () => {
  if (!isOpen.value) return
  isOpen.value = false
  emit('close')
}

const togglePopover = () => {
  if (props.disabled || props.readonly) return
  if (isOpen.value) closePopover()
  else openPopover()
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

defineExpose({
  open: openPopover,
  close: closePopover,
  clear: handleClear,
  focus: () => jInputRef.value?.focus(),
  blur: () => jInputRef.value?.blur(),
})
</script>

<template>
  <div ref="containerRef" :class="['j-timepicker', `j-timepicker--${computedSelectionStyle}`, containerClass]">
    <!-- ===================================================================== -->
    <!-- 1. ANCHOR INPUT (JINPUT INTEGRATION)                                  -->
    <!-- ===================================================================== -->
    <div class="j-timepicker-input-wrapper">
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
            <span v-if="prependInnerIcon" class="j-timepicker-inner-icon-start">
              {{ prependInnerIcon }}
            </span>
          </slot>
        </template>

        <!-- Append Inner Slot (Inside Input on the Right: Clear Button & Clock Icon) -->
        <template #append-inner>
          <slot name="append-inner">
            <div class="j-timepicker-inner-actions">
              <!-- Clear Action (if clearable and has value) -->
              <button
                v-if="clearable && displayInputValue && !disabled && !readonly"
                type="button"
                class="j-timepicker-clear-btn"
                title="Clear time"
                aria-label="Clear time"
                @click.stop="handleClear"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              <!-- Clock Dropdown Toggle Button -->
              <button
                type="button"
                class="j-timepicker-clock-btn"
                :title="isOpen ? 'Close Time Picker' : 'Open Time Picker'"
                aria-label="Toggle Time Picker"
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
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </slot>
              </button>
            </div>
          </slot>
        </template>

        <!-- Optional External Prepend / Append Slots -->
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
    <!-- 2. FLOATING TIMEPICKER POPOVER                                       -->
    <!-- ===================================================================== -->
    <Teleport to="body" :disabled="!teleport">
      <div
        v-if="isOpen"
        ref="popoverRef"
        :style="teleport ? popoverStyles : {}"
        :class="[
          'j-timepicker-popover',
          `selection-${computedSelectionStyle}`,
          { 'has-presets': isShowingPresets },
        ]"
        role="dialog"
        aria-modal="true"
      >
        <div :class="['j-timepicker-layout', { 'has-sidebar': isShowingPresets }]">
          <!-- Presets Sidebar -->
          <div v-if="isShowingPresets" class="j-timepicker-presets">
            <div class="presets-title">Quick Times</div>
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
          <div class="j-timepicker-body">
            <!-- Digital Clock Display Header -->
            <div class="j-timepicker-display-header">
              <div class="display-time">
                <span class="time-digit">{{ padZero(timeHours) }}</span>
                <span class="time-colon">:</span>
                <span class="time-digit">{{ padZero(timeMinutes) }}</span>
                <template v-if="showSeconds">
                  <span class="time-colon">:</span>
                  <span class="time-digit">{{ padZero(timeSeconds) }}</span>
                </template>
                <span v-if="timeFormat === '12h'" class="time-ampm-badge">{{ timeAmPm }}</span>
              </div>

              <!-- View Switcher Tabs -->
              <div class="j-timepicker-mode-switch">
                <button
                  type="button"
                  :class="['mode-tab', { active: activePickerTab === 'dial' }]"
                  @click="activePickerTab = 'dial'"
                >
                  Steppers
                </button>
                <button
                  type="button"
                  :class="['mode-tab', { active: activePickerTab === 'columns' }]"
                  @click="activePickerTab = 'columns'"
                >
                  Columns
                </button>
              </div>
            </div>

            <!-- VIEW 1: STEPPER SPINNERS -->
            <div v-if="activePickerTab === 'dial'" class="j-timepicker-steppers">
              <!-- Hours Stepper -->
              <div class="stepper-col">
                <div class="stepper-label">Hours</div>
                <button type="button" class="stepper-btn stepper-up" @click="adjustHour(1)" title="Add Hour">▲</button>
                <div class="stepper-value">{{ padZero(timeHours) }}</div>
                <button type="button" class="stepper-btn stepper-down" @click="adjustHour(-1)" title="Minus Hour">▼</button>
              </div>

              <div class="stepper-separator">:</div>

              <!-- Minutes Stepper -->
              <div class="stepper-col">
                <div class="stepper-label">Minutes</div>
                <button type="button" class="stepper-btn stepper-up" @click="adjustMinute(1)" title="Add Minute">▲</button>
                <div class="stepper-value">{{ padZero(timeMinutes) }}</div>
                <button type="button" class="stepper-btn stepper-down" @click="adjustMinute(-1)" title="Minus Minute">▼</button>
              </div>

              <!-- Seconds Stepper -->
              <template v-if="showSeconds">
                <div class="stepper-separator">:</div>
                <div class="stepper-col">
                  <div class="stepper-label">Seconds</div>
                  <button type="button" class="stepper-btn stepper-up" @click="adjustSecond(1)" title="Add Second">▲</button>
                  <div class="stepper-value">{{ padZero(timeSeconds) }}</div>
                  <button type="button" class="stepper-btn stepper-down" @click="adjustSecond(-1)" title="Minus Second">▼</button>
                </div>
              </template>

              <!-- AM/PM Toggle (12h) -->
              <div v-if="timeFormat === '12h'" class="stepper-col ampm-col">
                <div class="stepper-label">Period</div>
                <div class="ampm-switch-pill">
                  <button
                    type="button"
                    :class="['ampm-btn', { active: timeAmPm === 'AM' }]"
                    @click="toggleAmPm('AM')"
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    :class="['ampm-btn', { active: timeAmPm === 'PM' }]"
                    @click="toggleAmPm('PM')"
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            <!-- VIEW 2: SCROLLABLE COLUMNS -->
            <div v-else class="j-timepicker-columns">
              <!-- Hours List -->
              <div class="column-wrapper">
                <div class="column-header">Hour</div>
                <div class="column-scroll">
                  <button
                    v-for="h in availableHours"
                    :key="h"
                    type="button"
                    :class="['col-item-btn', { active: timeHours === h }]"
                    @click="selectHour(h)"
                  >
                    {{ padZero(h) }}
                  </button>
                </div>
              </div>

              <!-- Minutes List -->
              <div class="column-wrapper">
                <div class="column-header">Min</div>
                <div class="column-scroll">
                  <button
                    v-for="m in availableMinutes"
                    :key="m"
                    type="button"
                    :class="['col-item-btn', { active: timeMinutes === m }]"
                    @click="selectMinute(m)"
                  >
                    {{ padZero(m) }}
                  </button>
                </div>
              </div>

              <!-- Seconds List -->
              <div v-if="showSeconds" class="column-wrapper">
                <div class="column-header">Sec</div>
                <div class="column-scroll">
                  <button
                    v-for="s in availableSeconds"
                    :key="s"
                    type="button"
                    :class="['col-item-btn', { active: timeSeconds === s }]"
                    @click="selectSecond(s)"
                  >
                    {{ padZero(s) }}
                  </button>
                </div>
              </div>

              <!-- Period List -->
              <div v-if="timeFormat === '12h'" class="column-wrapper period-column">
                <div class="column-header">Period</div>
                <div class="column-scroll">
                  <button
                    type="button"
                    :class="['col-item-btn', { active: timeAmPm === 'AM' }]"
                    @click="toggleAmPm('AM')"
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    :class="['col-item-btn', { active: timeAmPm === 'PM' }]"
                    @click="toggleAmPm('PM')"
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            <!-- Footer Action Toolbar -->
            <div class="j-timepicker-footer">
              <button type="button" class="footer-action-btn" @click="setTimeToNow">
                Now
              </button>
              <div class="footer-spacer"></div>
              <button
                v-if="clearable && displayInputValue"
                type="button"
                class="footer-action-btn text-muted"
                @click="handleClear"
              >
                Clear
              </button>
              <button type="button" class="footer-ok-btn" @click="closePopover">
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
