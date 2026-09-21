<script setup>
import { computed, useAttrs } from 'vue'

const props = defineProps({
  name: {
    type: String,
    required: true,
    default: '',
  },
  type: {
    type: String,
    default: 'solid',
    validator: (val) => ['solid', 'outlined'].includes(val),
  },
  size: {
    type: [String, Number],
    default: undefined,
  },
  color: {
    type: String,
    default: undefined,
  },
  spin: {
    type: Boolean,
    default: false,
  },
})

const attrs = useAttrs()

// Standard sizing presets supported by JUI SCSS
const standardSizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl']
// Theme semantic color tokens supported by JUI
const themeColors = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark', 'muted']

const iconClasses = computed(() => {
  const classes = ['jui']

  if (props.name) {
    // If name already contains variant suffix (e.g. 'home-solid' or 'home-outlined')
    if (props.name.endsWith('-solid') || props.name.endsWith('-outlined')) {
      classes.push(`jui-${props.name}`)
    } else {
      classes.push(`jui-${props.name}-${props.type}`)
      classes.push(`jui-${props.name}`)
    }
  }

  // Predefined sizing class
  if (props.size && standardSizes.includes(String(props.size).toLowerCase())) {
    classes.push(`jui-${String(props.size).toLowerCase()}`)
  }

  // Theme semantic color class
  if (props.color && themeColors.includes(props.color)) {
    classes.push(`text-${props.color}`)
  }

  // Spinning animation
  if (props.spin) {
    classes.push('jui-spin')
  }

  return classes.join(' ')
})

const iconStyles = computed(() => {
  const styles = {}

  // Handle custom numeric or CSS dimension size (e.g., 28, '1.75rem', '32px')
  if (props.size && !standardSizes.includes(String(props.size).toLowerCase())) {
    const sizeVal = typeof props.size === 'number' || /^\d+$/.test(String(props.size))
      ? `${props.size}px`
      : String(props.size)
    styles.fontSize = sizeVal
    styles.width = sizeVal
    styles.height = sizeVal
  }

  // Handle custom non-token colors (e.g., '#ff6600', 'rgb(...)')
  if (props.color && !themeColors.includes(props.color)) {
    styles.color = props.color
  }

  return styles
})

const isAriaHidden = computed(() => {
  return !attrs['aria-label'] && !attrs['aria-labelledby']
})
</script>

<template>
  <i
    :class="iconClasses"
    :style="iconStyles"
    :role="attrs['aria-label'] || attrs['aria-labelledby'] ? 'img' : undefined"
    :aria-hidden="isAriaHidden ? 'true' : undefined"
  ></i>
</template>