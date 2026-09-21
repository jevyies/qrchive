<script setup>
import { computed, ref, useId } from 'vue'

const props = defineProps({
  // v-model binding
  modelValue: {
    type: [String, Number, Boolean, Object],
    default: null,
  },
  // Radio option value
  value: {
    type: [String, Number, Boolean, Object],
    default: null,
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
  id: {
    type: String,
    default: null,
  },
  name: {
    type: String,
    default: null,
  },
  // Theme Color: 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'warning' | 'info'
  color: {
    type: String,
    default: 'primary',
  },
  // Boolean Color Shortcuts
  primary: {
    type: Boolean,
    default: false,
  },
  secondary: {
    type: Boolean,
    default: false,
  },
  accent: {
    type: Boolean,
    default: false,
  },
  success: {
    type: Boolean,
    default: false,
  },
  danger: {
    type: Boolean,
    default: false,
  },
  warning: {
    type: Boolean,
    default: false,
  },
  info: {
    type: Boolean,
    default: false,
  },
  // Sizing: 'sm' | 'md' | 'lg'
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
  // States & Validation
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
  // Custom classes
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
  'change',
  'input',
  'focus',
  'blur',
])

const inputRef = ref(null)
const generatedId = useId ? useId() : `j-radio-${Math.random().toString(36).substring(2, 9)}`
const inputId = computed(() => props.id || generatedId)

// Resolve Sizing
const computedSize = computed(() => {
  if (props.sm) return 'sm'
  if (props.lg) return 'lg'
  return props.size || 'md'
})

// Resolve Color Theme
const computedColor = computed(() => {
  if (props.primary) return 'primary'
  if (props.secondary) return 'secondary'
  if (props.accent) return 'accent'
  if (props.success) return 'success'
  if (props.danger) return 'danger'
  if (props.warning) return 'warning'
  if (props.info) return 'info'
  return props.color || 'primary'
})

// Checked computation
const isChecked = computed(() => props.modelValue === props.value)

// Validation Computations
const isValid = computed(() => props.valid === true)
const isInvalid = computed(() => props.invalid === true || Boolean(props.error))

const invalidFeedbackText = computed(() => {
  if (typeof props.error === 'string' && props.error.length > 0) return props.error
  return props.invalidFeedback
})
const validFeedbackText = computed(() => props.validFeedback)
const hintText = computed(() => props.hint || props.helper || props.caption)

// Container Classes
const containerClasses = computed(() => {
  const classes = ['form-check', 'j-radio-root']
  const sz = computedSize.value
  const col = computedColor.value

  if (sz === 'sm') classes.push('form-check-sm')
  else if (sz === 'lg') classes.push('form-check-lg')

  if (col) {
    classes.push(`form-check-${col}`)
  }

  if (props.disabled) classes.push('disabled')
  if (props.containerClass) classes.push(props.containerClass)

  return classes
})

// Input Classes
const inputClasses = computed(() => {
  const classes = ['form-check-input', 'form-radio-input']
  const sz = computedSize.value

  if (sz === 'sm') classes.push('form-radio-input-sm')
  else if (sz === 'lg') classes.push('form-radio-input-lg')

  if (isValid.value) classes.push('is-valid')
  if (isInvalid.value) classes.push('is-invalid')

  if (props.inputClass) classes.push(props.inputClass)
  return classes
})

// Event Handlers
const handleChange = (event) => {
  if (props.readonly || props.disabled) return

  emit('update:modelValue', props.value)
  emit('change', props.value)
  emit('input', props.value)
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  inputRef,
})
</script>

<template>
  <div class="j-radio-wrapper">
    <label :class="containerClasses">
      <input
        :id="inputId"
        ref="inputRef"
        type="radio"
        :name="name"
        :value="value"
        :checked="isChecked"
        :disabled="disabled || readonly"
        :required="required"
        :class="inputClasses"
        v-bind="$attrs"
        @change="handleChange"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      />
      <span v-if="label || $slots.default || $slots.label" :class="['form-check-label', labelClass]">
        <slot name="label"><slot>{{ label }}</slot></slot>
      </span>
    </label>

    <!-- Hint Text -->
    <slot name="hint">
      <span v-if="hintText && !isInvalid && !isValid" class="form-hint d-block ml-6 text-xs text-muted">{{ hintText }}</span>
    </slot>

    <!-- Validation Feedback -->
    <slot name="invalid-feedback">
      <span v-if="isInvalid && invalidFeedbackText" class="invalid-feedback d-block ml-6">{{ invalidFeedbackText }}</span>
    </slot>

    <slot name="valid-feedback">
      <span v-if="isValid && validFeedbackText" class="valid-feedback d-block ml-6">{{ validFeedbackText }}</span>
    </slot>
  </div>
</template>

<style scoped>
.j-radio-wrapper {
  display: inline-flex;
  flex-direction: column;
}
.ml-6 {
  margin-left: 1.75rem;
}
</style>
