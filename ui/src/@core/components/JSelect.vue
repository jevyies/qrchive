<script setup>
import { computed, ref } from 'vue'
import JInput from './JInput.vue'

const props = defineProps({
  // v-model binding
  modelValue: {
    type: [String, Number, Boolean, Array, Object],
    default: '',
  },
  // Options for dropdown
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
  // Key mapping aliases
  itemTitle: {
    type: String,
    default: null,
  },
  itemValue: {
    type: String,
    default: null,
  },
  itemDisabled: {
    type: String,
    default: null,
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
  clearable: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  multiple: {
    type: Boolean,
    default: false,
  },
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
  'clear',
])

const jInputRef = ref(null)

const resolvedLabelKey = computed(() => props.itemTitle || props.optionsLabelKey)
const resolvedValueKey = computed(() => props.itemValue || props.optionsValueKey)
const resolvedDisabledKey = computed(() => props.itemDisabled || props.optionsDisabledKey)

defineExpose({
  focus: () => jInputRef.value?.focus(),
  blur: () => jInputRef.value?.blur(),
  clear: () => jInputRef.value?.clear(),
  jInputRef,
})
</script>

<template>
  <JInput
    ref="jInputRef"
    type="select"
    :model-value="modelValue"
    :options="options"
    :options-label-key="resolvedLabelKey"
    :options-value-key="resolvedValueKey"
    :options-disabled-key="resolvedDisabledKey"
    :pattern="pattern"
    :variant="variant"
    :boxed="boxed"
    :underlined="underlined"
    :filled="filled"
    :pill="pill"
    :rounded="rounded"
    :notch="notch"
    :floating="floating"
    :size="size"
    :sm="sm"
    :lg="lg"
    :label="label"
    :label-class="labelClass"
    :hint="hint"
    :helper="helper"
    :caption="caption"
    :placeholder="placeholder"
    :id="id"
    :name="name"
    :required="required"
    :disabled="disabled"
    :readonly="readonly"
    :valid="valid"
    :invalid="invalid"
    :error="error"
    :valid-feedback="validFeedback"
    :invalid-feedback="invalidFeedback"
    :prepend="prepend"
    :prepend-text="prependText"
    :prepend-icon="prependIcon"
    :append="append"
    :append-text="appendText"
    :append-icon="appendIcon"
    :clearable="clearable"
    :loading="loading"
    :multiple="multiple"
    :input-class="inputClass"
    :container-class="containerClass"
    v-bind="$attrs"
    @update:model-value="emit('update:modelValue', $event)"
    @change="emit('change', $event)"
    @input="emit('input', $event)"
    @focus="emit('focus', $event)"
    @blur="emit('blur', $event)"
    @clear="emit('clear')"
  >
    <template v-for="(_, slot) in $slots" #[slot]="slotProps">
      <slot :name="slot" v-bind="slotProps || {}" />
    </template>
  </JInput>
</template>
