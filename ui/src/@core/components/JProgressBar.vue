<script setup>
import { computed } from 'vue'
import { useProgressBar } from '@/composables/useProgressBar'

const props = defineProps({
  height: {
    type: String,
    default: '2.5px',
  },
  color: {
    type: String,
    default: '',
  },
  zIndex: {
    type: [Number, String],
    default: 999999,
  },
})

const { progress, isVisible, status } = useProgressBar()

const isError = computed(() => status.value === 'error')

const barStyle = computed(() => {
  const baseColor =
    props.color || (isError.value ? 'var(--danger, #f43f5e)' : 'var(--primary, #775a19)')
  return {
    width: `${progress.value}%`,
    height: props.height,
    backgroundColor: baseColor,
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="progress-fade">
      <div
        v-if="isVisible"
        class="j-progress-bar-container"
        :style="{ zIndex: props.zIndex, height: props.height }"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="progress"
        aria-label="Page navigation progress"
      >
        <div class="j-progress-bar-fill" :class="{ 'is-error': isError }" :style="barStyle">
          <div class="j-progress-bar-peg" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.j-progress-bar-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100vw;
  pointer-events: none;
  overflow: hidden;
}

.j-progress-bar-fill {
  height: 100%;
  position: relative;
  background: linear-gradient(
    90deg,
    var(--primary, #775a19) 0%,
    var(--accent, #9e7b28) 50%,
    var(--primary, #775a19) 100%
  );
  box-shadow:
    0 0 10px var(--primary-tonal, rgba(119, 90, 25, 0.4)),
    0 0 4px var(--primary, #775a19);
  transition:
    width 200ms cubic-bezier(0.1, 0.5, 0.1, 1),
    opacity 250ms ease;
  will-change: width, opacity;
  border-radius: 0 999px 999px 0;
}

.j-progress-bar-peg {
  display: block;
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 100px;
  opacity: 1;
  box-shadow:
    0 0 10px var(--primary, #775a19),
    0 0 5px var(--primary, #775a19);
  transform: rotate(3deg) translateY(-2px);
  pointer-events: none;
}

.j-progress-bar-fill.is-error {
  background: var(--danger, #f43f5e) !important;
  box-shadow:
    0 0 10px rgba(244, 63, 94, 0.8),
    0 0 4px rgba(244, 63, 94, 0.6) !important;
}

.j-progress-bar-fill.is-error .j-progress-bar-peg {
  box-shadow:
    0 0 10px var(--danger, #f43f5e),
    0 0 5px var(--danger, #f43f5e) !important;
}

.progress-fade-enter-active,
.progress-fade-leave-active {
  transition: opacity 250ms ease;
}

.progress-fade-enter-from,
.progress-fade-leave-to {
  opacity: 0;
}
</style>
