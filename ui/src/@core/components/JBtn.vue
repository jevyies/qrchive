<script setup>
import { computed } from 'vue'

const props = defineProps({
  color: {
    type: String,
    default: 'primary', // 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  },
  variant: {
    type: String,
    default: 'solid', // 'solid' | 'outlined' | 'tonal' | 'text' | 'ghost' | 'link'
  },
  size: {
    type: String,
    default: 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  },
  pill: {
    type: Boolean,
    default: false,
  },
  icon: {
    type: [Boolean, String],
    default: false,
  },
  block: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  prependIcon: {
    type: String,
    default: '',
  },
  appendIcon: {
    type: String,
    default: '',
  },
  to: {
    type: [String, Object],
    default: null,
  },
  href: {
    type: String,
    default: null,
  },
  tag: {
    type: String,
    default: null,
  },
  type: {
    type: String,
    default: 'button',
  },
  target: {
    type: String,
    default: null,
  },
  rel: {
    type: String,
    default: null,
  },
})

// Dynamic Tag Computation
const computedTag = computed(() => {
  if (props.tag) return props.tag
  if (props.to) return 'router-link'
  if (props.href) return 'a'
  return 'button'
})

// Dynamic Button Class Generator
const buttonClasses = computed(() => {
  const classes = ['btn']

  // 1. Size
  if (props.size && props.size !== 'md') {
    classes.push(`btn-${props.size}`)
  } else if (props.size === 'md') {
    classes.push('btn-md')
  }

  // 2. Pattern / Variant & Color
  const v = props.variant?.toLowerCase() || 'solid'
  const c = props.color?.toLowerCase() || 'primary'

  if (v === 'outlined' || v === 'outline') {
    classes.push(`btn-outlined-${c}`)
  } else if (v === 'tonal' || v === 'soft') {
    classes.push(`btn-tonal-${c}`)
  } else if (v === 'text' || v === 'ghost') {
    if (c === 'neutral' || c === 'ghost') {
      classes.push('btn-text')
    } else {
      classes.push(`btn-text-${c}`)
    }
  } else if (v === 'link') {
    classes.push(`btn-link-${c}`)
  } else {
    // Solid / Flat (Default)
    classes.push(`btn-${c}`)
  }

  // 3. Modifiers
  if (props.pill) classes.push('btn-pill')
  if (props.icon || typeof props.icon === 'string') classes.push('btn-icon')
  if (props.block) classes.push('w-full')
  if (props.loading) classes.push('is-loading')
  if (props.disabled) classes.push('is-disabled')

  return classes
})
</script>

<template>
  <component
    :is="computedTag"
    :class="buttonClasses"
    :disabled="disabled || loading ? true : undefined"
    :type="computedTag === 'button' ? type : undefined"
    :to="to || undefined"
    :href="href || undefined"
    :target="target || (href ? '_blank' : undefined)"
    :rel="rel || (href && target === '_blank' ? 'noopener noreferrer' : undefined)"
    :aria-disabled="disabled || loading"
    :aria-busy="loading"
  >
    <!-- Prepend Icon / Slot -->
    <slot name="prepend">
      <span v-if="prependIcon" class="btn-prepend-icon">{{ prependIcon }}</span>
    </slot>

    <!-- Main Content or String Icon -->
    <slot>
      <span v-if="typeof icon === 'string'">{{ icon }}</span>
    </slot>

    <!-- Append Icon / Slot -->
    <slot name="append">
      <span v-if="appendIcon" class="btn-append-icon">{{ appendIcon }}</span>
    </slot>
  </component>
</template>

<style scoped>
.btn-prepend-icon {
  display: inline-flex;
  align-items: center;
  margin-right: 0.35rem;
  line-height: 1;
}

.btn-append-icon {
  display: inline-flex;
  align-items: center;
  margin-left: 0.35rem;
  line-height: 1;
}
</style>
