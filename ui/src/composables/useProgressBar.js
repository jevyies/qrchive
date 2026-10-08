import { ref } from 'vue'

const progress = ref(0)
const isVisible = ref(false)
const status = ref(null) // 'loading' | 'success' | 'error' | null

let trickleTimer = null
let finishTimer = null
let resetTimer = null

export function useProgressBar() {
  const clearTimers = () => {
    if (trickleTimer) {
      clearInterval(trickleTimer)
      trickleTimer = null
    }
    if (finishTimer) {
      clearTimeout(finishTimer)
      finishTimer = null
    }
    if (resetTimer) {
      clearTimeout(resetTimer)
      resetTimer = null
    }
  }

  const start = () => {
    clearTimers()

    isVisible.value = true
    status.value = 'loading'

    // If starting fresh or nearly zero, jump to 20%
    if (progress.value < 20) {
      progress.value = 20
    }

    // Trickle engine
    trickleTimer = setInterval(() => {
      if (progress.value < 50) {
        progress.value += Math.random() * 10 + 6 // +6% to +16%
      } else if (progress.value < 75) {
        progress.value += Math.random() * 6 + 3 // +3% to +9%
      } else if (progress.value < 88) {
        progress.value += Math.random() * 3 + 1 // +1% to +4%
      } else if (progress.value < 95) {
        progress.value += Math.random() * 0.8 + 0.3 // +0.3% to +1.1%
      }

      if (progress.value > 95) {
        progress.value = 95
      }
    }, 200)
  }

  const set = (val) => {
    progress.value = Math.min(100, Math.max(0, val))
  }

  const finish = () => {
    if (trickleTimer) {
      clearInterval(trickleTimer)
      trickleTimer = null
    }

    if (!isVisible.value && progress.value === 0) {
      return
    }

    status.value = 'success'
    progress.value = 100

    finishTimer = setTimeout(() => {
      isVisible.value = false
      resetTimer = setTimeout(() => {
        progress.value = 0
        status.value = null
      }, 300) // matches fade-out transition duration
    }, 220) // wait for width transition to reach 100%
  }

  const fail = () => {
    if (trickleTimer) {
      clearInterval(trickleTimer)
      trickleTimer = null
    }

    status.value = 'error'
    progress.value = 100

    finishTimer = setTimeout(() => {
      isVisible.value = false
      resetTimer = setTimeout(() => {
        progress.value = 0
        status.value = null
      }, 300)
    }, 400)
  }

  return {
    progress,
    isVisible,
    status,
    start,
    set,
    finish,
    fail,
  }
}
