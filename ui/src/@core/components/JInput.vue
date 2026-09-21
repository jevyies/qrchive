<script setup>
import { ref, computed, useId, useSlots, watch, nextTick, onMounted } from 'vue'
import { themeConfig } from '../../theme.config'

const props = defineProps({
  // v-model binding
  modelValue: {
    type: [String, Number, Boolean, Array, Object],
    default: '',
  },
  // Element type: 'text' | 'password' | 'email' | 'number' | 'search' | 'tel' | 'url' | 'date' | 'select' | 'textarea' | etc.
  type: {
    type: String,
    default: 'text',
  },
  // Direct element shortcuts
  select: {
    type: Boolean,
    default: false,
  },
  textarea: {
    type: Boolean,
    default: false,
  },
  // Options for select dropdowns
  options: {
    type: Array,
    default: () => [],
  },
  optionsLabelKey: {
    type: String,
    default: 'label',
  },
  optionsValueKey: {
    type: String,
    default: 'value',
  },
  optionsDisabledKey: {
    type: String,
    default: 'disabled',
  },
  // Design Pattern: 'boxed' | 'underlined' | 'filled' | 'pill' | 'notch' | 'floating'
  pattern: {
    type: String,
    default: null,
  },
  variant: {
    type: String,
    default: null,
  },
  // Boolean pattern shortcuts
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
  rounded: {
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
  // Sizing: 'sm' | 'md' | 'lg' | 'xs' | 'xl'
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
  // Labels & Information
  label: {
    type: String,
    default: '',
  },
  labelClass: {
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
  placeholder: {
    type: String,
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
  autocomplete: {
    type: String,
    default: null,
  },
  autofocus: {
    type: Boolean,
    default: false,
  },
  // Textarea specific
  rows: {
    type: [Number, String],
    default: 3,
  },
  cols: {
    type: [Number, String],
    default: null,
  },
  autogrow: {
    type: Boolean,
    default: false,
  },
  autoGrow: {
    type: Boolean,
    default: false,
  },
  maxRows: {
    type: [Number, String],
    default: null,
  },
  // States & Validation
  required: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  readonly: {
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
  error: {
    type: [Boolean, String],
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
  // Input Groups / Addons & Icons
  prepend: {
    type: String,
    default: '',
  },
  prependText: {
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
  append: {
    type: String,
    default: '',
  },
  appendText: {
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

  // Interactive utilities
  clearable: {
    type: Boolean,
    default: false,
  },
  passwordToggle: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  // Classes
  inputClass: {
    type: [String, Array, Object],
    default: '',
  },
  containerClass: {
    type: [String, Array, Object],
    default: '',
  },
})

const emit = defineEmits([
  'update:modelValue',
  'input',
  'change',
  'focus',
  'blur',
  'clear',
  'keydown',
  'keyup',
  'enter',
])

const slots = useSlots()
const generatedId = useId ? useId() : `j-input-${Math.random().toString(36).substring(2, 9)}`
const inputId = computed(() => props.id || generatedId)
const inputRef = ref(null)

// Password reveal state
const showPassword = ref(false)

// Computed resolved element type ('input' | 'select' | 'textarea')
const elementType = computed(() => {
  if (props.select || props.type === 'select') return 'select'
  if (props.textarea || props.type === 'textarea') return 'textarea'
  return 'input'
})

// Resolved input HTML type
const computedInputType = computed(() => {
  if (props.type === 'password' && showPassword.value) return 'text'
  return props.type || 'text'
})

// Resolve Sizing
const computedSize = computed(() => {
  if (props.sm) return 'sm'
  if (props.lg) return 'lg'
  return props.size || 'md'
})

// Resolve Design Pattern
const computedPattern = computed(() => {
  if (props.notch) return 'notch'
  if (props.floating) return 'floating'
  if (props.underlined) return 'underlined'
  if (props.filled) return 'filled'
  if (props.pill || props.rounded) return 'pill'
  if (props.boxed) return 'boxed'

  const custom = props.pattern || props.variant
  if (custom) {
    const c = custom.toLowerCase()
    if (c === 'rounded') return 'pill'
    if (c === 'inset') return 'notch'
    return c
  }

  return themeConfig.defaultInputPattern || 'boxed'
})

// Validation Computations
const isValid = computed(() => props.valid === true)
const isInvalid = computed(() => props.invalid === true || Boolean(props.error))

const invalidFeedbackText = computed(() => {
  if (typeof props.error === 'string' && props.error.length > 0) {
    return props.error
  }
  return props.invalidFeedback
})

const validFeedbackText = computed(() => props.validFeedback)
const hintText = computed(() => props.hint || props.helper || props.caption)

// Prepend / Append presence checks for external input-group addons
const hasPrepend = computed(() => {
  return Boolean(
    props.prepend ||
    props.prependText ||
    props.prependIcon ||
    slots.prepend ||
    slots['prepend-text'] ||
    slots['prepend-icon']
  )
})

const hasAppend = computed(() => {
  return Boolean(
    props.append ||
    props.appendText ||
    props.appendIcon ||
    slots.append ||
    slots['append-text'] ||
    slots['append-icon']
  )
})

const isInputGroup = computed(() => hasPrepend.value || hasAppend.value)

// Internal Leading Actions (Inner Prefix Icon)
const hasLeadingActions = computed(() => {
  return Boolean(props.prependInnerIcon || slots['prepend-inner'])
})

// Internal Trailing Actions (Clearable, Password Toggle, Loading, Append Inner)
const isClearVisible = computed(() => {
  return Boolean(
    props.clearable &&
    props.modelValue !== null &&
    props.modelValue !== undefined &&
    String(props.modelValue).length > 0 &&
    !props.disabled &&
    !props.readonly
  )
})

const isPasswordToggleVisible = computed(() => {
  return Boolean(props.type === 'password' && props.passwordToggle && !props.disabled)
})

const hasTrailingActions = computed(() => {
  return isClearVisible.value || isPasswordToggleVisible.value || props.loading || Boolean(props.appendInnerIcon || slots['append-inner'])
})

// Dynamic trailing actions count for padding calculation
const trailingActionsCount = computed(() => {
  let count = 0
  if (isClearVisible.value) count++
  if (isPasswordToggleVisible.value) count++
  if (props.loading) count++
  if (props.appendInnerIcon || slots['append-inner']) count++
  return count
})

// Dynamic Input Control Classes
const controlClasses = computed(() => {
  const classes = []

  // 1. Base Class
  if (elementType.value === 'select') {
    classes.push('form-select')
  } else if (elementType.value === 'textarea') {
    classes.push('form-control', 'form-textarea')
    if (isAutogrow.value) {
      classes.push('form-textarea-autogrow')
    }
  } else {
    classes.push('form-control')
  }

  // 2. Pattern modifier classes
  const p = computedPattern.value
  if (p === 'underlined') {
    classes.push('form-control-underlined')
  } else if (p === 'filled') {
    classes.push('form-control-filled')
  } else if (p === 'pill') {
    classes.push('form-control-rounded')
  }

  // 3. Size classes
  const sz = computedSize.value
  if (sz === 'sm') {
    classes.push(elementType.value === 'select' ? 'form-select-sm' : 'form-control-sm')
  } else if (sz === 'lg') {
    classes.push(elementType.value === 'select' ? 'form-select-lg' : 'form-control-lg')
  }

  // 4. Validation state classes
  if (isValid.value) classes.push('is-valid')
  if (isInvalid.value) classes.push('is-invalid')

  if (props.inputClass) {
    classes.push(props.inputClass)
  }

  return classes
})

// Dynamic Control Inline Style (for right/left padding when actions exist)
const controlInlineStyle = computed(() => {
  if (!hasTrailingActions.value && !hasLeadingActions.value) return null
  const count = trailingActionsCount.value
  const isSelect = elementType.value === 'select'
  const isPill = computedPattern.value === 'pill'
  const isSm = computedSize.value === 'sm'
  const isLg = computedSize.value === 'lg'
  const styles = {}

  if (hasTrailingActions.value) {
    let pad = 2.4
    if (slots['append-inner'] || count >= 2) pad = 3.8
    if (count >= 3) pad = 5.2

    if (isSelect) pad += 1.6
    if (isPill) pad += 0.85
    if (isSm) pad -= 0.2
    if (isLg) pad += 0.3
    styles.paddingRight = `${pad}rem`
  }

  if (hasLeadingActions.value) {
    let padLeft = 2.25
    if (isPill) padLeft += 0.65
    if (isSm) padLeft -= 0.3
    if (isLg) padLeft += 0.3
    styles.paddingLeft = `${padLeft}rem`
  }

  return styles
})


// Dynamic Group Container Classes
const inputGroupClasses = computed(() => {
  const classes = ['input-group']
  const p = computedPattern.value
  const sz = computedSize.value

  if (p === 'underlined') classes.push('input-group-underlined')
  else if (p === 'filled') classes.push('input-group-filled')
  else if (p === 'pill') classes.push('input-group-pill')
  else if (p === 'notch') classes.push('input-group-notch')

  if (sz === 'sm') classes.push('input-group-sm')
  else if (sz === 'lg') classes.push('input-group-lg')

  return classes
})

// Dynamic Notch Container Classes
const notchContainerClasses = computed(() => {
  const classes = ['form-notch', 'position-relative']
  const sz = computedSize.value
  if (sz === 'sm') classes.push('form-notch-sm')
  else if (sz === 'lg') classes.push('form-notch-lg')
  return classes
})

// Dynamic Floating Container Classes
const floatingContainerClasses = computed(() => {
  const classes = ['form-floating', 'position-relative']
  const sz = computedSize.value
  if (sz === 'sm') classes.push('form-floating-sm')
  else if (sz === 'lg') classes.push('form-floating-lg')
  return classes
})

// Normalized Select Options
const normalizedOptions = computed(() => {
  if (!Array.isArray(props.options)) return []
  return props.options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { label: String(opt), value: opt, disabled: false }
    }
    if (typeof opt === 'object' && opt !== null) {
      return {
        label: String(opt[props.optionsLabelKey] || opt.label || opt.text || opt.title || opt.name || opt.value || ''),
        value: opt[props.optionsValueKey] !== undefined ? opt[props.optionsValueKey] : (opt.value !== undefined ? opt.value : opt),
        disabled: Boolean(opt[props.optionsDisabledKey] || opt.disabled),
      }
    }
    return { label: String(opt), value: opt, disabled: false }
  })
})

// Autogrow textarea height adjustment
const isAutogrow = computed(() => (props.autogrow || props.autoGrow) && elementType.value === 'textarea')

const adjustHeight = () => {
  if (!isAutogrow.value || !inputRef.value) return
  const el = inputRef.value
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

watch(
  () => props.modelValue,
  () => {
    if (isAutogrow.value && elementType.value === 'textarea') {
      nextTick(adjustHeight)
    }
  }
)

onMounted(() => {
  if (isAutogrow.value && elementType.value === 'textarea') {
    nextTick(adjustHeight)
  }
})

// Value & Event Handlers
const handleInput = (event) => {
  const val = event.target.value
  emit('update:modelValue', val)
  emit('input', event)
  if (isAutogrow.value && elementType.value === 'textarea') {
    adjustHeight()
  }
}

const handleChange = (event) => {
  const val = event.target.value
  emit('update:modelValue', val)
  emit('change', event)
}

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
  if (inputRef.value) {
    inputRef.value.focus()
    if (isAutogrow.value && elementType.value === 'textarea') {
      nextTick(adjustHeight)
    }
  }
}

const handleKeydown = (event) => {
  emit('keydown', event)
  if (event.key === 'Enter') {
    emit('enter', event)
  }
}

// Expose public API
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  select: () => inputRef.value?.select(),
  clear: handleClear,
  adjustHeight,
  inputRef,
})
</script>

<template>
  <div :class="['j-input-root', containerClass]">
    <!-- ===================================================================== -->
    <!-- 1. PATTERN: NOTCH (INSET TOP-LEFT BORDER LABEL)                       -->
    <!-- ===================================================================== -->
    <template v-if="computedPattern === 'notch'">
      <div v-if="isInputGroup" :class="inputGroupClasses">
        <!-- Prepend slot/text -->
        <slot name="prepend">
          <span v-if="prependText || prepend || prependIcon || $slots['prepend-text'] || $slots['prepend-icon']" class="input-group-text">
            <slot name="prepend-icon"><span v-if="prependIcon" class="j-icon mr-1">{{ prependIcon }}</span></slot>
            <slot name="prepend-text">{{ prependText || prepend }}</slot>
          </span>
        </slot>

        <!-- Notch Container Inside Group -->
        <div :class="notchContainerClasses">
          <!-- Leading Actions Inside Notch Input (Left-Center) -->
          <div v-if="hasLeadingActions" :class="['j-input-leading-actions', { 'is-pill': computedPattern === 'pill', 'is-textarea': elementType === 'textarea' }]">
            <slot name="prepend-inner">
              <span v-if="prependInnerIcon" class="j-icon">{{ prependInnerIcon }}</span>
            </slot>
          </div>

          <!-- Select -->
          <select
            v-if="elementType === 'select'"
            :id="inputId"
            ref="inputRef"
            :class="controlClasses"
            :style="controlInlineStyle"
            :value="modelValue"
            :disabled="disabled"
            :required="required"
            :name="name"
            v-bind="$attrs"
            @change="handleChange"
            @focus="emit('focus', $event)"
            @blur="emit('blur', $event)"
          >
            <slot>
              <option
                v-for="(opt, idx) in normalizedOptions"
                :key="idx"
                :value="opt.value"
                :disabled="opt.disabled"
              >
                {{ opt.label }}
              </option>
            </slot>
          </select>

          <!-- Textarea -->
          <textarea
            v-else-if="elementType === 'textarea'"
            :id="inputId"
            ref="inputRef"
            :class="controlClasses"
            :style="controlInlineStyle"
            :value="modelValue"
            :placeholder="placeholder || ' '"
            :disabled="disabled"
            :readonly="readonly"
            :required="required"
            :rows="rows"
            :cols="cols"
            :name="name"
            v-bind="$attrs"
            @input="handleInput"
            @change="handleChange"
            @focus="emit('focus', $event)"
            @blur="emit('blur', $event)"
            @keydown="handleKeydown"
            @keyup="emit('keyup', $event)"
          ></textarea>

          <!-- Input -->
          <input
            v-else
            :id="inputId"
            ref="inputRef"
            :type="computedInputType"
            :class="controlClasses"
            :style="controlInlineStyle"
            :value="modelValue"
            :placeholder="placeholder || ' '"
            :disabled="disabled"
            :readonly="readonly"
            :required="required"
            :name="name"
            :autocomplete="autocomplete"
            :autofocus="autofocus"
            v-bind="$attrs"
            @input="handleInput"
            @change="handleChange"
            @focus="emit('focus', $event)"
            @blur="emit('blur', $event)"
            @keydown="handleKeydown"
            @keyup="emit('keyup', $event)"
          />

          <!-- Notch Label (Must follow input/select for CSS sibling selectors) -->
          <label :for="inputId" :class="['form-notch-label', { required }, labelClass]">
            <slot name="label">{{ label }}</slot>
          </label>

          <!-- Trailing Actions Inside Notch Input (Right-Center) -->
          <div v-if="hasTrailingActions" :class="['j-input-trailing-actions', { 'is-pill': computedPattern === 'pill', 'is-textarea': elementType === 'textarea', 'is-select': elementType === 'select' }]">
            <slot name="append-inner">
              <span v-if="appendInnerIcon" class="j-icon">{{ appendInnerIcon }}</span>
            </slot>

            <button
              v-if="isClearVisible"
              type="button"
              class="j-clear-btn"
              tabindex="-1"
              title="Clear text"
              aria-label="Clear text"
              @click.stop.prevent="handleClear"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <button
              v-if="isPasswordToggleVisible"
              type="button"
              class="j-password-toggle-btn"
              tabindex="-1"
              :title="showPassword ? 'Hide password' : 'Show password'"
              aria-label="Toggle password visibility"
              @click.stop.prevent="showPassword = !showPassword"
            >
              <svg v-if="showPassword" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </button>

            <span v-if="loading" class="j-spinner"></span>
          </div>
        </div>

        <!-- Append slot/text -->
        <slot name="append">
          <span v-if="appendText || append || appendIcon || $slots['append-text'] || $slots['append-icon']" class="input-group-text">
            <slot name="append-text">{{ appendText || append }}</slot>
            <slot name="append-icon"><span v-if="appendIcon" class="j-icon ml-1">{{ appendIcon }}</span></slot>
          </span>
        </slot>
      </div>

      <!-- Notch Standalone (No Input Group) -->
      <div v-else :class="notchContainerClasses">
        <!-- Leading Actions Inside Notch Input (Left-Center) -->
        <div v-if="hasLeadingActions" :class="['j-input-leading-actions', { 'is-pill': computedPattern === 'pill', 'is-textarea': elementType === 'textarea' }]">
          <slot name="prepend-inner">
            <span v-if="prependInnerIcon" class="j-icon">{{ prependInnerIcon }}</span>
          </slot>
        </div>

        <!-- Select -->
        <select
          v-if="elementType === 'select'"
          :id="inputId"
          ref="inputRef"
          :class="controlClasses"
          :style="controlInlineStyle"
          :value="modelValue"
          :disabled="disabled"
          :required="required"
          :name="name"
          v-bind="$attrs"
          @change="handleChange"
          @focus="emit('focus', $event)"
          @blur="emit('blur', $event)"
        >
          <slot>
            <option
              v-for="(opt, idx) in normalizedOptions"
              :key="idx"
              :value="opt.value"
              :disabled="opt.disabled"
            >
              {{ opt.label }}
            </option>
          </slot>
        </select>

        <!-- Textarea -->
        <textarea
          v-else-if="elementType === 'textarea'"
          :id="inputId"
          ref="inputRef"
          :class="controlClasses"
          :style="controlInlineStyle"
          :value="modelValue"
          :placeholder="placeholder || ' '"
          :disabled="disabled"
          :readonly="readonly"
          :required="required"
          :rows="rows"
          :cols="cols"
          :name="name"
          v-bind="$attrs"
          @input="handleInput"
          @change="handleChange"
          @focus="emit('focus', $event)"
          @blur="emit('blur', $event)"
          @keydown="handleKeydown"
          @keyup="emit('keyup', $event)"
        ></textarea>

        <!-- Input -->
        <input
          v-else
          :id="inputId"
          ref="inputRef"
          :type="computedInputType"
          :class="controlClasses"
          :style="controlInlineStyle"
          :value="modelValue"
          :placeholder="placeholder || ' '"
          :disabled="disabled"
          :readonly="readonly"
          :required="required"
          :name="name"
          :autocomplete="autocomplete"
          :autofocus="autofocus"
          v-bind="$attrs"
          @input="handleInput"
          @change="handleChange"
          @focus="emit('focus', $event)"
          @blur="emit('blur', $event)"
          @keydown="handleKeydown"
          @keyup="emit('keyup', $event)"
        />

        <!-- Notch Label -->
        <label :for="inputId" :class="['form-notch-label', { required }, labelClass]">
          <slot name="label">{{ label }}</slot>
        </label>

        <!-- Trailing Actions Inside Notch Input (Right-Center) -->
        <div v-if="hasTrailingActions" :class="['j-input-trailing-actions', { 'is-pill': computedPattern === 'pill', 'is-textarea': elementType === 'textarea', 'is-select': elementType === 'select' }]">
          <slot name="append-inner">
            <span v-if="appendInnerIcon" class="j-icon">{{ appendInnerIcon }}</span>
          </slot>

          <button
            v-if="isClearVisible"
            type="button"
            class="j-clear-btn"
            tabindex="-1"
            title="Clear text"
            aria-label="Clear text"
            @click.stop.prevent="handleClear"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <button
            v-if="isPasswordToggleVisible"
            type="button"
            class="j-password-toggle-btn"
            tabindex="-1"
            :title="showPassword ? 'Hide password' : 'Show password'"
            aria-label="Toggle password visibility"
            @click.stop.prevent="showPassword = !showPassword"
          >
            <svg v-if="showPassword" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
          </button>

          <span v-if="loading" class="j-spinner"></span>
        </div>
      </div>
    </template>

    <!-- ===================================================================== -->
    <!-- 2. PATTERN: FLOATING LABEL                                            -->
    <!-- ===================================================================== -->
    <template v-else-if="computedPattern === 'floating'">
      <div v-if="isInputGroup" :class="inputGroupClasses">
        <slot name="prepend">
          <span v-if="prependText || prepend || prependIcon || $slots['prepend-text'] || $slots['prepend-icon']" class="input-group-text">
            <slot name="prepend-icon"><span v-if="prependIcon" class="j-icon mr-1">{{ prependIcon }}</span></slot>
            <slot name="prepend-text">{{ prependText || prepend }}</slot>
          </span>
        </slot>

        <div :class="floatingContainerClasses">
          <!-- Leading Actions Inside Floating Input (Left-Center) -->
          <div v-if="hasLeadingActions" :class="['j-input-leading-actions', { 'is-pill': computedPattern === 'pill', 'is-textarea': elementType === 'textarea' }]">
            <slot name="prepend-inner">
              <span v-if="prependInnerIcon" class="j-icon">{{ prependInnerIcon }}</span>
            </slot>
          </div>

          <!-- Select -->
          <select
            v-if="elementType === 'select'"
            :id="inputId"
            ref="inputRef"
            :class="controlClasses"
            :style="controlInlineStyle"
            :value="modelValue"
            :disabled="disabled"
            :required="required"
            :name="name"
            v-bind="$attrs"
            @change="handleChange"
            @focus="emit('focus', $event)"
            @blur="emit('blur', $event)"
          >
            <slot>
              <option
                v-for="(opt, idx) in normalizedOptions"
                :key="idx"
                :value="opt.value"
                :disabled="opt.disabled"
              >
                {{ opt.label }}
              </option>
            </slot>
          </select>

          <!-- Textarea -->
          <textarea
            v-else-if="elementType === 'textarea'"
            :id="inputId"
            ref="inputRef"
            :class="controlClasses"
            :style="controlInlineStyle"
            :value="modelValue"
            :placeholder="placeholder || label || ' '"
            :disabled="disabled"
            :readonly="readonly"
            :required="required"
            :rows="rows"
            :cols="cols"
            :name="name"
            v-bind="$attrs"
            @input="handleInput"
            @change="handleChange"
            @focus="emit('focus', $event)"
            @blur="emit('blur', $event)"
            @keydown="handleKeydown"
            @keyup="emit('keyup', $event)"
          ></textarea>

          <!-- Input -->
          <input
            v-else
            :id="inputId"
            ref="inputRef"
            :type="computedInputType"
            :class="controlClasses"
            :style="controlInlineStyle"
            :value="modelValue"
            :placeholder="placeholder || label || ' '"
            :disabled="disabled"
            :readonly="readonly"
            :required="required"
            :name="name"
            :autocomplete="autocomplete"
            :autofocus="autofocus"
            v-bind="$attrs"
            @input="handleInput"
            @change="handleChange"
            @focus="emit('focus', $event)"
            @blur="emit('blur', $event)"
            @keydown="handleKeydown"
            @keyup="emit('keyup', $event)"
          />

          <label :for="inputId" :class="[{ required }, labelClass]">
            <slot name="label">{{ label }}</slot>
          </label>

          <!-- Trailing Actions Inside Floating Input (Right-Center) -->
          <div v-if="hasTrailingActions" :class="['j-input-trailing-actions', { 'is-pill': computedPattern === 'pill', 'is-textarea': elementType === 'textarea', 'is-select': elementType === 'select' }]">
            <slot name="append-inner">
              <span v-if="appendInnerIcon" class="j-icon">{{ appendInnerIcon }}</span>
            </slot>

            <button
              v-if="isClearVisible"
              type="button"
              class="j-clear-btn"
              tabindex="-1"
              title="Clear text"
              aria-label="Clear text"
              @click.stop.prevent="handleClear"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <button
              v-if="isPasswordToggleVisible"
              type="button"
              class="j-password-toggle-btn"
              tabindex="-1"
              :title="showPassword ? 'Hide password' : 'Show password'"
              aria-label="Toggle password visibility"
              @click.stop.prevent="showPassword = !showPassword"
            >
              <svg v-if="showPassword" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </button>

            <span v-if="loading" class="j-spinner"></span>
          </div>
        </div>

        <slot name="append">
          <span v-if="appendText || append || appendIcon || $slots['append-text'] || $slots['append-icon']" class="input-group-text">
            <slot name="append-text">{{ appendText || append }}</slot>
            <slot name="append-icon"><span v-if="appendIcon" class="j-icon ml-1">{{ appendIcon }}</span></slot>
          </span>
        </slot>
      </div>

      <!-- Floating Standalone (No Input Group) -->
      <div v-else :class="floatingContainerClasses">
        <!-- Leading Actions Inside Floating Input (Left-Center) -->
        <div v-if="hasLeadingActions" :class="['j-input-leading-actions', { 'is-pill': computedPattern === 'pill', 'is-textarea': elementType === 'textarea' }]">
          <slot name="prepend-inner">
            <span v-if="prependInnerIcon" class="j-icon">{{ prependInnerIcon }}</span>
          </slot>
        </div>

        <!-- Select -->
        <select
          v-if="elementType === 'select'"
          :id="inputId"
          ref="inputRef"
          :class="controlClasses"
          :style="controlInlineStyle"
          :value="modelValue"
          :disabled="disabled"
          :required="required"
          :name="name"
          v-bind="$attrs"
          @change="handleChange"
          @focus="emit('focus', $event)"
          @blur="emit('blur', $event)"
        >
          <slot>
            <option
              v-for="(opt, idx) in normalizedOptions"
              :key="idx"
              :value="opt.value"
              :disabled="opt.disabled"
            >
              {{ opt.label }}
            </option>
          </slot>
        </select>

        <!-- Textarea -->
        <textarea
          v-else-if="elementType === 'textarea'"
          :id="inputId"
          ref="inputRef"
          :class="controlClasses"
          :style="controlInlineStyle"
          :value="modelValue"
          :placeholder="placeholder || label || ' '"
          :disabled="disabled"
          :readonly="readonly"
          :required="required"
          :rows="rows"
          :cols="cols"
          :name="name"
          v-bind="$attrs"
          @input="handleInput"
          @change="handleChange"
          @focus="emit('focus', $event)"
          @blur="emit('blur', $event)"
          @keydown="handleKeydown"
          @keyup="emit('keyup', $event)"
        ></textarea>

        <!-- Input -->
        <input
          v-else
          :id="inputId"
          ref="inputRef"
          :type="computedInputType"
          :class="controlClasses"
          :style="controlInlineStyle"
          :value="modelValue"
          :placeholder="placeholder || label || ' '"
          :disabled="disabled"
          :readonly="readonly"
          :required="required"
          :name="name"
          :autocomplete="autocomplete"
          :autofocus="autofocus"
          v-bind="$attrs"
          @input="handleInput"
          @change="handleChange"
          @focus="emit('focus', $event)"
          @blur="emit('blur', $event)"
          @keydown="handleKeydown"
          @keyup="emit('keyup', $event)"
        />

        <label :for="inputId" :class="[{ required }, labelClass]">
          <slot name="label">{{ label }}</slot>
        </label>

        <!-- Trailing Actions Inside Floating Input (Right-Center) -->
        <div v-if="hasTrailingActions" :class="['j-input-trailing-actions', { 'is-pill': computedPattern === 'pill', 'is-textarea': elementType === 'textarea', 'is-select': elementType === 'select' }]">
          <slot name="append-inner">
            <span v-if="appendInnerIcon" class="j-icon">{{ appendInnerIcon }}</span>
          </slot>

          <button
            v-if="isClearVisible"
            type="button"
            class="j-clear-btn"
            tabindex="-1"
            title="Clear text"
            aria-label="Clear text"
            @click.stop.prevent="handleClear"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <button
            v-if="isPasswordToggleVisible"
            type="button"
            class="j-password-toggle-btn"
            tabindex="-1"
            :title="showPassword ? 'Hide password' : 'Show password'"
            aria-label="Toggle password visibility"
            @click.stop.prevent="showPassword = !showPassword"
          >
            <svg v-if="showPassword" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
          </button>

          <span v-if="loading" class="j-spinner"></span>
        </div>
      </div>
    </template>

    <!-- ===================================================================== -->
    <!-- 3. STANDARD PATTERNS (BOXED, UNDERLINED, FILLED, PILL)                -->
    <!-- ===================================================================== -->
    <template v-else>
      <!-- Top Label -->
      <label
        v-if="label || $slots.label"
        :for="inputId"
        :class="['form-label', { required }, labelClass]"
      >
        <slot name="label">{{ label }}</slot>
      </label>

      <!-- Input Group Container -->
      <div v-if="isInputGroup" :class="inputGroupClasses">
        <!-- Prepend Slot / Text / Icon -->
        <slot name="prepend">
          <span
            v-if="prependText || prepend || prependIcon || $slots['prepend-text'] || $slots['prepend-icon']"
            class="input-group-text"
          >
            <slot name="prepend-icon"><span v-if="prependIcon" class="j-icon mr-1">{{ prependIcon }}</span></slot>
            <slot name="prepend-text">{{ prependText || prepend }}</slot>
          </span>
        </slot>

        <!-- Inner Control Wrapper inside Input Group -->
        <div class="j-input-inner-wrapper">
          <!-- Leading Actions Inside Standard Input (Left-Center) -->
          <div v-if="hasLeadingActions" :class="['j-input-leading-actions', { 'is-pill': computedPattern === 'pill', 'is-textarea': elementType === 'textarea' }]">
            <slot name="prepend-inner">
              <span v-if="prependInnerIcon" class="j-icon">{{ prependInnerIcon }}</span>
            </slot>
          </div>

          <!-- Select Element -->
          <select
            v-if="elementType === 'select'"
            :id="inputId"
            ref="inputRef"
            :class="controlClasses"
            :style="controlInlineStyle"
            :value="modelValue"
            :disabled="disabled"
            :required="required"
            :name="name"
            v-bind="$attrs"
            @change="handleChange"
            @focus="emit('focus', $event)"
            @blur="emit('blur', $event)"
          >
            <slot>
              <option
                v-for="(opt, idx) in normalizedOptions"
                :key="idx"
                :value="opt.value"
                :disabled="opt.disabled"
              >
                {{ opt.label }}
              </option>
            </slot>
          </select>

          <!-- Textarea Element -->
          <textarea
            v-else-if="elementType === 'textarea'"
            :id="inputId"
            ref="inputRef"
            :class="controlClasses"
            :style="controlInlineStyle"
            :value="modelValue"
            :placeholder="placeholder"
            :disabled="disabled"
            :readonly="readonly"
            :required="required"
            :rows="rows"
            :cols="cols"
            :name="name"
            v-bind="$attrs"
            @input="handleInput"
            @change="handleChange"
            @focus="emit('focus', $event)"
            @blur="emit('blur', $event)"
            @keydown="handleKeydown"
            @keyup="emit('keyup', $event)"
          ></textarea>

          <!-- Input Element -->
          <input
            v-else
            :id="inputId"
            ref="inputRef"
            :type="computedInputType"
            :class="controlClasses"
            :style="controlInlineStyle"
            :value="modelValue"
            :placeholder="placeholder"
            :disabled="disabled"
            :readonly="readonly"
            :required="required"
            :name="name"
            :autocomplete="autocomplete"
            :autofocus="autofocus"
            v-bind="$attrs"
            @input="handleInput"
            @change="handleChange"
            @focus="emit('focus', $event)"
            @blur="emit('blur', $event)"
            @keydown="handleKeydown"
            @keyup="emit('keyup', $event)"
          />

          <!-- Trailing Actions Inside Input Field (Right-Center) -->
          <div v-if="hasTrailingActions" :class="['j-input-trailing-actions', { 'is-pill': computedPattern === 'pill', 'is-textarea': elementType === 'textarea', 'is-select': elementType === 'select' }]">
            <slot name="append-inner">
              <span v-if="appendInnerIcon" class="j-icon">{{ appendInnerIcon }}</span>
            </slot>

            <button
              v-if="isClearVisible"
              type="button"
              class="j-clear-btn"
              tabindex="-1"
              title="Clear text"
              aria-label="Clear text"
              @click.stop.prevent="handleClear"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <button
              v-if="isPasswordToggleVisible"
              type="button"
              class="j-password-toggle-btn"
              tabindex="-1"
              :title="showPassword ? 'Hide password' : 'Show password'"
              aria-label="Toggle password visibility"
              @click.stop.prevent="showPassword = !showPassword"
            >
              <svg v-if="showPassword" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </button>

            <span v-if="loading" class="j-spinner"></span>
          </div>
        </div>

        <!-- Append Slot / Text / Icon -->
        <slot name="append">
          <span
            v-if="appendText || append || appendIcon || $slots['append-text'] || $slots['append-icon']"
            class="input-group-text"
          >
            <slot name="append-text">{{ appendText || append }}</slot>
            <slot name="append-icon"><span v-if="appendIcon" class="j-icon ml-1">{{ appendIcon }}</span></slot>
          </span>
        </slot>
      </div>

      <!-- Single Control (No Group) -->
      <div v-else class="j-input-inner-wrapper">
        <!-- Leading Actions Inside Standard Input (Left-Center) -->
        <div v-if="hasLeadingActions" :class="['j-input-leading-actions', { 'is-pill': computedPattern === 'pill', 'is-textarea': elementType === 'textarea' }]">
          <slot name="prepend-inner">
            <span v-if="prependInnerIcon" class="j-icon">{{ prependInnerIcon }}</span>
          </slot>
        </div>

        <!-- Select Element -->
        <select
          v-if="elementType === 'select'"
          :id="inputId"
          ref="inputRef"
          :class="controlClasses"
          :style="controlInlineStyle"
          :value="modelValue"
          :disabled="disabled"
          :required="required"
          :name="name"
          v-bind="$attrs"
          @change="handleChange"
          @focus="emit('focus', $event)"
          @blur="emit('blur', $event)"
        >
          <slot>
            <option
              v-for="(opt, idx) in normalizedOptions"
              :key="idx"
              :value="opt.value"
              :disabled="opt.disabled"
            >
              {{ opt.label }}
            </option>
          </slot>
        </select>

        <!-- Textarea Element -->
        <textarea
          v-else-if="elementType === 'textarea'"
          :id="inputId"
          ref="inputRef"
          :class="controlClasses"
          :style="controlInlineStyle"
          :value="modelValue"
          :placeholder="placeholder"
          :disabled="disabled"
          :readonly="readonly"
          :required="required"
          :rows="rows"
          :cols="cols"
          :name="name"
          v-bind="$attrs"
          @input="handleInput"
          @change="handleChange"
          @focus="emit('focus', $event)"
          @blur="emit('blur', $event)"
          @keydown="handleKeydown"
          @keyup="emit('keyup', $event)"
        ></textarea>

        <!-- Input Element -->
        <input
          v-else
          :id="inputId"
          ref="inputRef"
          :type="computedInputType"
          :class="controlClasses"
          :style="controlInlineStyle"
          :value="modelValue"
          :placeholder="placeholder"
          :disabled="disabled"
          :readonly="readonly"
          :required="required"
          :name="name"
          :autocomplete="autocomplete"
          :autofocus="autofocus"
          v-bind="$attrs"
          @input="handleInput"
          @change="handleChange"
          @focus="emit('focus', $event)"
          @blur="emit('blur', $event)"
          @keydown="handleKeydown"
          @keyup="emit('keyup', $event)"
        />

        <!-- Trailing Actions Inside Input Field (Right-Center) -->
        <div v-if="hasTrailingActions" :class="['j-input-trailing-actions', { 'is-pill': computedPattern === 'pill', 'is-textarea': elementType === 'textarea', 'is-select': elementType === 'select' }]">
          <slot name="append-inner">
            <span v-if="appendInnerIcon" class="j-icon">{{ appendInnerIcon }}</span>
          </slot>

          <button
            v-if="isClearVisible"
            type="button"
            class="j-clear-btn"
            tabindex="-1"
            title="Clear text"
            aria-label="Clear text"
            @click.stop.prevent="handleClear"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <button
            v-if="isPasswordToggleVisible"
            type="button"
            class="j-password-toggle-btn"
            tabindex="-1"
            :title="showPassword ? 'Hide password' : 'Show password'"
            aria-label="Toggle password visibility"
            @click.stop.prevent="showPassword = !showPassword"
          >
            <svg v-if="showPassword" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
          </button>

          <span v-if="loading" class="j-spinner"></span>
        </div>
      </div>
    </template>

    <!-- ===================================================================== -->
    <!-- 4. HELPER HINT & VALIDATION FEEDBACK                                  -->
    <!-- ===================================================================== -->
    <slot name="hint">
      <span v-if="hintText && !isInvalid && !isValid" class="form-hint">{{ hintText }}</span>
    </slot>

    <!-- Validation Feedback -->
    <slot name="invalid-feedback">
      <span v-if="isInvalid && invalidFeedbackText" class="invalid-feedback">{{ invalidFeedbackText }}</span>
    </slot>

    <slot name="valid-feedback">
      <span v-if="isValid && validFeedbackText" class="valid-feedback">{{ validFeedbackText }}</span>
    </slot>
  </div>
</template>

<style scoped>
.j-input-root {
  display: block;
  width: 100%;
}

.j-input-inner-wrapper {
  position: relative;
  width: 100%;
  display: flex;
  flex: 1 1 auto;
}

.input-group > .j-input-inner-wrapper {
  flex: 1 1 auto;
  width: 1%;
  min-width: 0;
}

.input-group > .j-input-inner-wrapper:first-child > .form-control,
.input-group > .j-input-inner-wrapper:first-child > .form-select {
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}

.input-group > .j-input-inner-wrapper:last-child > .form-control,
.input-group > .j-input-inner-wrapper:last-child > .form-select {
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
}

.input-group > .j-input-inner-wrapper:not(:first-child):not(:last-child) > .form-control,
.input-group > .j-input-inner-wrapper:not(:first-child):not(:last-child) > .form-select {
  border-radius: 0 !important;
}

.input-group > .j-input-inner-wrapper:not(:first-child) {
  margin-left: -1px;
}

/* Leading Actions (Placed inside the left center of the input field) */
.j-input-leading-actions {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
  color: var(--text-muted, #94a3b8);
  pointer-events: auto;
}

.j-input-leading-actions.is-pill {
  left: 1.25rem;
}

.j-input-leading-actions.is-textarea {
  top: 0.85rem;
  transform: none;
}

/* Offset floating label when leading actions exist */
.form-floating > .j-input-leading-actions ~ label {
  padding-left: 2.25rem;
}

.form-floating > .j-input-leading-actions.is-pill ~ label {
  padding-left: 2.85rem;
}

/* Trailing Actions (Placed inside the right center of the input field) */
.j-input-trailing-actions {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  z-index: 4;
  pointer-events: auto;
}

/* For Select dropdowns: shift clearable icon to the left of the dropdown chevron arrow */
.j-input-trailing-actions.is-select {
  right: 2.15rem;
}

/* Move inside for pill pattern so it is not pushed against the rounded curve */
.j-input-trailing-actions.is-pill {
  right: 1.5rem;
}

/* For Pill Select: shift before the chevron in rounded capsule */
.j-input-trailing-actions.is-select.is-pill {
  right: 2.85rem;
}

.j-input-trailing-actions.is-textarea {
  top: 0.85rem;
  transform: none;
}

/* Clear Button - Simple, no fancy css, no hover effect, just pure icon */
.j-clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-muted, #94a3b8);
  padding: 0;
  cursor: pointer;
  line-height: 1;
  user-select: none;
  outline: none;
}

/* Password Toggle Button */
.j-password-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--text-muted, #94a3b8);
  padding: 0;
  cursor: pointer;
  line-height: 1;
  user-select: none;
  outline: none;
}

.j-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(99, 102, 241, 0.3);
  border-top-color: var(--accent, #6366f1);
  border-radius: 50%;
  animation: j-spin 0.6s linear infinite;
  display: inline-block;
}

@keyframes j-spin {
  to {
    transform: rotate(360deg);
  }
}

.form-textarea-autogrow {
  resize: none !important;
  overflow-y: hidden;
  box-sizing: border-box;
  transition: height 0.1s ease-out;
}
</style>
