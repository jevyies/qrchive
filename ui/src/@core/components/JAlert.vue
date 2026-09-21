<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: true,
  },
  color: {
    type: String,
    default: 'primary', // 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  },
  variant: {
    type: String,
    default: 'tonal', // 'tonal' | 'outlined'
  },
  title: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
  icon: {
    type: [String, Boolean],
    default: true,
  },
  dismissible: {
    type: Boolean,
    default: false,
  },
  closeLabel: {
    type: String,
    default: 'Dismiss',
  },
  iconClass: {
    type: String,
    default: '',
  },
  contentClass: {
    type: String,
    default: '',
  },
  titleClass: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue', 'close'])

const isVisible = ref(props.modelValue)

watch(
  () => props.modelValue,
  (val) => {
    isVisible.value = val
  }
)

const resolvedIcon = computed(() => {
  if (props.icon === false || props.icon === '') return ''
  if (typeof props.icon === 'string' && props.icon !== 'true') return props.icon

  const defaultIcons = {
    primary: '✦',
    secondary: '◈',
    success: '✓',
    warning: '⚠️',
    danger: '✕',
    info: 'ℹ',
    neutral: '🔔',
  }
  return defaultIcons[props.color] || '✦'
})

const alertClasses = computed(() => {
  const classes = ['alert']
  const c = props.color?.toLowerCase() || 'primary'
  const v = props.variant?.toLowerCase() || 'tonal'

  if (v === 'outlined') {
    classes.push(`alert-outlined-${c}`)
  } else if (v === 'solid') {
    classes.push(`alert-solid-${c}`)
  } else if (v === 'glass') {
    classes.push('alert-glass', `alert-${c}`)
  } else {
    classes.push(`alert-${c}`)
  }

  return classes
})

const handleClose = () => {
  isVisible.value = false
  emit('update:modelValue', false)
  emit('close')
}
</script>

<template>
  <Transition name="alert-fade">
    <div
      v-if="isVisible"
      :class="alertClasses"
      role="alert"
    >
      <!-- Icon slot / default icon -->
      <slot name="icon">
        <div v-if="resolvedIcon" :class="['alert-icon', iconClass]">
          {{ resolvedIcon }}
        </div>
      </slot>

      <!-- Content body -->
      <div :class="['alert-content', contentClass]">
        <slot name="title">
          <div v-if="title" :class="['alert-title', titleClass]">
            {{ title }}
          </div>
        </slot>

        <slot>
          <p v-if="message" class="mb-0 text-sm">
            {{ message }}
          </p>
        </slot>

        <!-- Optional action buttons -->
        <div v-if="$slots.actions" class="alert-actions">
          <slot name="actions" />
        </div>
      </div>

      <!-- Dismiss close button -->
      <slot name="close" :close="handleClose">
        <button
          v-if="dismissible"
          type="button"
          class="alert-close"
          :title="closeLabel"
          :aria-label="closeLabel"
          @click="handleClose"
        >
          ✕
        </button>
      </slot>
    </div>
  </Transition>
</template>
