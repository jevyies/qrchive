<script setup>
import { computed } from 'vue'
import { useToast, TOAST_POSITIONS } from '@/composables/useToast'
import JToast from './JToast.vue'

const { toasts, dismiss, pause, resume } = useToast()

// Group toasts by position
const toastsByPosition = computed(() => {
  const groups = {}
  for (const pos of TOAST_POSITIONS) {
    groups[pos] = toasts.value.filter((t) => t.position === pos)
  }
  return groups
})
</script>

<template>
  <Teleport to="body">
    <template v-for="pos in TOAST_POSITIONS" :key="pos">
      <!-- Only render viewport container if position has active toasts -->
      <div
        v-if="toastsByPosition[pos] && toastsByPosition[pos].length > 0"
        :class="['toast-viewport', `toast-pos-${pos}`]"
      >
        <TransitionGroup name="toast-anim">
          <JToast
            v-for="toast in toastsByPosition[pos]"
            :key="toast.id"
            :toast="toast"
            @dismiss="dismiss(toast.id)"
            @pause="pause(toast.id)"
            @resume="resume(toast.id)"
          />
        </TransitionGroup>
      </div>
    </template>
  </Teleport>
</template>
