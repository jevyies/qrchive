<script setup>
import { ref, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  coupleName: {
    type: String,
    default: 'Keann & Jenny',
  },
  eventId: {
    type: String,
    default: '',
  },
  destination: {
    type: String,
    default: '/quests',
  },
})

const emit = defineEmits(['update:modelValue', 'close', 'submit'])

const router = useRouter()
const route = useRoute()

const guestName = ref('')

// Initialize guest name from localStorage whenever modal opens & auto-focus input
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      if (typeof localStorage !== 'undefined') {
        guestName.value =
          localStorage.getItem('qrchive_guest_name') ||
          localStorage.getItem('guest_name') ||
          localStorage.getItem('guestName') ||
          ''
      }
      nextTick(() => {
        const inputEl = document.getElementById('guestNameInput')
        if (inputEl) {
          inputEl.focus()
          if (inputEl.select && guestName.value) {
            inputEl.select()
          }
        }
      })
    }
  },
  { immediate: true }
)

const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleEnterCelebration = () => {
  const enteredName = guestName.value.trim() || 'Honored Guest'
  const activeEventId = props.eventId || route.params.id || 'keann-and-jenny'

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('qrchive_guest_name', enteredName)
    localStorage.setItem('guest_name', enteredName)
    localStorage.setItem('guestName', enteredName)
    localStorage.setItem('qrchive_current_event_id', activeEventId)
  }

  emit('submit', enteredName)
  emit('update:modelValue', false)
  emit('close')

  const targetPath = props.destination || '/quests'
  router.push(targetPath)
}
</script>

<template>
  <JModal :model-value="modelValue" :show-close="false" :backdrop-glass="true" position="center" animation="scale"
    max-width="340px" modal-class="guest-modal-root" dialog-class="guest-modal-dialog" content-class="guest-modal-card"
    body-class="guest-modal-body" @update:model-value="emit('update:modelValue', $event)" @close="handleClose">
    <div id="guestModalCard" class="guest-modal-inner">
      <!-- Close Button (Properly inset at top: 1rem, right: 1rem) -->
      <button aria-label="Close modal" class="guest-modal-close-btn" type="button" @click="handleClose">
        <span class="material-symbols-outlined">close</span>
      </button>

      <!-- Sparkle Emblem Badge -->
      <div class="guest-modal-badge">
        <span class="material-symbols-outlined">auto_awesome</span>
      </div>

      <!-- Couple Ribbon Header -->
      <div class="guest-modal-couple-row">
        <div class="guest-modal-divider-line"></div>
        <span class="guest-modal-couple-name">{{ coupleName || 'Keann & Jenny' }}</span>
        <div class="guest-modal-divider-line"></div>
      </div>

      <!-- Welcome Heading -->
      <h2 class="guest-modal-title">Welcome, Honored Guest</h2>

      <!-- Guest Name Input Form Group using JInput -->
      <div class="guest-modal-field">
        <JInput id="guestNameInput" v-model="guestName" label="Guest NAME" placeholder="Enter Your Name" pattern="boxed"
          container-class="guest-input-container" label-class="guest-input-label" input-class="guest-input-control"
          @keydown.enter.prevent="handleEnterCelebration">
          <template #append-inner>
            <span class="material-symbols-outlined guest-input-icon">edit</span>
          </template>
        </JInput>
      </div>

      <!-- Enter Celebration Action Button using JBtn -->
      <JBtn id="enterCelebrationBtn" type="button" class="guest-modal-action-btn" @click="handleEnterCelebration">
        <span class="btn-text">Enter Celebration</span>
        <span class="material-symbols-outlined btn-arrow">arrow_forward</span>
      </JBtn>
    </div>
  </JModal>
</template>

<style lang="scss">
// Global modal styling overrides for teleported guest modal container
.guest-modal-root {
  overflow-x: hidden !important;

  .modal-dialog.guest-modal-dialog {
    max-width: 340px !important;
    width: calc(100% - 2rem) !important;
    margin: 1.25rem auto !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    overflow-x: hidden !important;
    box-sizing: border-box !important;
  }

  .modal-content.guest-modal-card {
    width: 100% !important;
    max-width: 340px !important;
    background-color: #fffbf7 !important;
    border: 1px solid rgba(233, 193, 118, 0.6) !important;
    border-radius: 1rem !important;
    padding: 0 !important;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35) !important;
    position: relative !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    overflow: hidden !important;
    overflow-x: hidden !important;
    box-sizing: border-box !important;
  }

  .modal-body.guest-modal-body {
    width: 100% !important;
    padding: 0 !important;
    overflow: hidden !important;
    overflow-x: hidden !important;
    overflow-y: visible !important;
    box-sizing: border-box !important;
  }

  .guest-modal-inner {
    width: 100% !important;
    max-width: 100% !important;
    padding: 1.75rem !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    text-align: center !important;
    position: relative !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
    overflow-x: hidden !important;
  }

  .guest-modal-close-btn {
    position: absolute !important;
    top: 1rem !important;
    right: 1rem !important;
    background: transparent !important;
    border: none !important;
    padding: 0.25rem !important;
    color: #7f7667 !important;
    cursor: pointer !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: color 0.15s ease, transform 0.15s ease !important;
    z-index: 10 !important;
    line-height: 1 !important;

    &:hover {
      color: #1f1b18 !important;
      transform: scale(1.08);
    }

    &:active {
      transform: scale(0.92);
    }

    .material-symbols-outlined {
      font-size: 20px !important;
      line-height: 1 !important;
    }
  }

  .guest-modal-badge {
    width: 3rem;
    height: 3rem;
    margin-bottom: 0.75rem;
    border-radius: 9999px;
    background: linear-gradient(135deg, rgba(255, 224, 136, 0.3) 0%, rgba(197, 160, 89, 0.2) 50%, rgba(233, 193, 118, 0.4) 100%);
    border: 1px solid rgba(197, 160, 89, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
    flex-shrink: 0;

    .material-symbols-outlined {
      color: #775a19;
      font-size: 24px;
      line-height: 1;
    }
  }

  .guest-modal-couple-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
    width: 100%;
    max-width: 100%;

    .guest-modal-divider-line {
      height: 1px;
      width: 1.5rem;
      background-color: #d1c5b4;
      flex-shrink: 0;
    }

    .guest-modal-couple-name {
      font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10px;
      line-height: 14px;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      font-weight: 700;
      color: #775a19;
      white-space: nowrap;
    }
  }

  .guest-modal-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 24px;
    line-height: 32px;
    font-weight: 500;
    letter-spacing: -0.015em;
    color: #1f1b18;
    margin: 0 0 0.5rem 0;
    max-width: 100%;
  }

  .guest-modal-field {
    width: 100% !important;
    max-width: 100% !important;
    text-align: left !important;
    margin-bottom: 1rem !important;
    box-sizing: border-box !important;

    .guest-input-container {
      width: 100% !important;
      max-width: 100% !important;
      margin-bottom: 0 !important;
      box-sizing: border-box !important;

      .form-label,
      .guest-input-label {
        font-family: 'Manrope', sans-serif !important;
        font-size: 11px !important;
        line-height: 16px !important;
        letter-spacing: 0.16em !important;
        text-transform: uppercase !important;
        font-weight: 600 !important;
        color: #775a19 !important;
        margin-bottom: 0.375rem !important;
        display: block !important;
      }

      .j-input-inner-wrapper {
        position: relative !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      .guest-input-control {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        padding: 0.75rem 2.5rem 0.75rem 1rem !important;
        background-color: #fff8f5 !important;
        border: 1px solid #d1c5b4 !important;
        border-radius: 0.75rem !important;
        font-size: 14px !important;
        color: #1f1b18 !important;
        font-family: 'Manrope', sans-serif !important;
        outline: none !important;
        transition: border-color 0.15s ease, box-shadow 0.15s ease !important;

        &:focus {
          border-color: #c5a059 !important;
          box-shadow: 0 0 0 1px #c5a059 !important;
        }

        &::placeholder {
          color: rgba(127, 118, 103, 0.6) !important;
        }
      }

      .j-input-trailing-actions {
        right: 0.75rem !important;
      }

      .guest-input-icon {
        color: #c5a059 !important;
        font-size: 18px !important;
        line-height: 1 !important;
        pointer-events: none !important;
      }
    }
  }

  .guest-modal-action-btn {
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    padding: 0.875rem 1.25rem !important;
    border-radius: 9999px !important;
    border: none !important;
    outline: none !important;
    background: linear-gradient(to right, #e9c176 0%, #c5a059 50%, #ffdea5 100%) !important;
    color: #261900 !important;
    font-family: 'Manrope', sans-serif !important;
    font-size: 12px !important;
    font-weight: 700 !important;
    letter-spacing: 0.16em !important;
    text-transform: uppercase !important;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -4px rgba(0, 0, 0, 0.08) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 0.5rem !important;
    cursor: pointer !important;
    transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease !important;

    &:hover {
      box-shadow: 0 14px 20px -3px rgba(119, 90, 25, 0.25) !important;

      .btn-arrow {
        transform: translateX(3px);
      }
    }

    &:active {
      transform: scale(0.98) !important;
      opacity: 0.95 !important;
    }

    .btn-text {
      line-height: 1;
    }

    .btn-arrow {
      font-size: 18px !important;
      color: #261900 !important;
      line-height: 1 !important;
      transition: transform 0.2s ease;
    }
  }
}
</style>
