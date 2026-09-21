<script setup>
import { computed, ref } from 'vue'
import JInput from './JInput.vue'

const props = defineProps({
  // v-model binding
  modelValue: {
    type: [String, Number],
    default: '',
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

const jInputRef = ref(null)

const isAutogrow = computed(() => Boolean(props.autogrow || props.autoGrow))

defineExpose({
  focus: () => jInputRef.value?.focus(),
  blur: () => jInputRef.value?.blur(),
  select: () => jInputRef.value?.select(),
  clear: () => jInputRef.value?.clear(),
  adjustHeight: () => jInputRef.value?.adjustHeight?.(),
  jInputRef,
})
</script>

<template>
  <JInput
    ref="jInputRef"
    type="textarea"
    :model-value="modelValue"
    :rows="rows"
    :cols="cols"
    :autogrow="isAutogrow"
    :max-rows="maxRows"
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
    :autocomplete="autocomplete"
    :autofocus="autofocus"
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
    :input-class="inputClass"
    :container-class="containerClass"
    v-bind="$attrs"
    @update:model-value="emit('update:modelValue', $event)"
    @input="emit('input', $event)"
    @change="emit('change', $event)"
    @focus="emit('focus', $event)"
    @blur="emit('blur', $event)"
    @clear="emit('clear')"
    @keydown="emit('keydown', $event)"
    @keyup="emit('keyup', $event)"
    @enter="emit('enter', $event)"
  >
    <template v-for="(_, slot) in $slots" #[slot]="slotProps">
      <slot :name="slot" v-bind="slotProps || {}" />
    </template>
  </JInput>
</template>
