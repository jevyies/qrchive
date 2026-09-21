<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  variant: {
    type: String,
    default: 'bordered', // 'bordered' | 'elevated' | 'tonal' | 'glass' | 'flat' | 'custom' | 'none'
  },
  size: {
    type: String,
    default: 'md', // 'sm' | 'md' | 'lg'
  },
  hoverable: {
    type: Boolean,
    default: false,
  },
  imgTop: {
    type: String,
    default: '',
  },
  imgAlt: {
    type: String,
    default: 'Card media',
  },
  headerClass: {
    type: String,
    default: '',
  },
  bodyClass: {
    type: String,
    default: '',
  },
  footerClass: {
    type: String,
    default: '',
  },
  noBody: {
    type: Boolean,
    default: false,
  },
})

const cardClasses = computed(() => {
  const v = props.variant?.toLowerCase() || 'bordered'
  const classes = ['card']

  if (v === 'elevated') classes.push('card-elevated')
  else if (v === 'tonal') classes.push('card-tonal')
  else if (v === 'glass') classes.push('card-glass')
  else if (v === 'flat') classes.push('card-flat')
  else if (v === 'custom' || v === 'none' || v === 'plain') classes.push('card-custom')
  else classes.push('card-bordered')

  if (props.hoverable) classes.push('card-hoverable')
  if (props.size && props.size !== 'md') classes.push(`card-${props.size}`)

  return classes
})
</script>

<template>
  <div :class="cardClasses">
    <!-- Optional Card Top Media -->
    <slot name="img-top">
      <img v-if="imgTop" :src="imgTop" :alt="imgAlt" class="card-img-top" />
    </slot>

    <!-- Card Header -->
    <div
      v-if="$slots.header || $slots.title || title || $slots.actions"
      :class="['card-header', headerClass]"
    >
      <slot name="header">
        <div>
          <slot name="title">
            <h4 v-if="title" class="card-title">{{ title }}</h4>
          </slot>
          <slot name="subtitle">
            <p v-if="subtitle" class="card-subtitle">{{ subtitle }}</p>
          </slot>
        </div>

        <div v-if="$slots.actions" class="card-actions">
          <slot name="actions" />
        </div>
      </slot>
    </div>

    <!-- Card Body -->
    <div v-if="!noBody" :class="['card-body', bodyClass]">
      <slot />
    </div>
    <slot v-else />

    <!-- Card Footer -->
    <div v-if="$slots.footer || $slots['footer-actions']" :class="['card-footer', footerClass]">
      <slot name="footer" />
      <div v-if="$slots['footer-actions']" class="card-actions">
        <slot name="footer-actions" />
      </div>
    </div>
  </div>
</template>
