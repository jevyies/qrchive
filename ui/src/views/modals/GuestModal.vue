<script setup>
import { ref, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { axiosInstance } from '@/plugins/axios'

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

import { getDeviceSerial, getDeviceName, saveStoredEventSession } from '@/utils/device'

const guestName = ref('')
const isSubmitting = ref(false)

// Initialize guest name from localStorage whenever modal opens & auto-focus input
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      if (typeof localStorage !== 'undefined') {
        const storedCurrentEvent = localStorage.getItem('currentEvent')
        if (storedCurrentEvent) {
          try {
            const parsed = JSON.parse(storedCurrentEvent)
            if (parsed.guestName) {
              guestName.value = parsed.guestName
            }
          } catch (e) { }
        }
        if (!guestName.value) {
          guestName.value = localStorage.getItem('guestName') || ''
        }
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

const handleEnterCelebration = async () => {
  const enteredName = guestName.value.trim() || 'Honored Guest'
  const activeEventToken = props.eventId || route.params.id || 'demo-event'

  isSubmitting.value = true

  // If route.params.id or eventId is 'demo-event', put random data in localStorage currentEvent directly
  if (activeEventToken === 'demo-event') {
    const randomId = Math.floor(Math.random() * 90000) + 10000
    const randomGuestCode = Math.random().toString(36).substring(2, 10)

    const currentEventData = {
      id: randomId,
      guestCode: randomGuestCode,
      eventCode: 'demo-event',
      guestName: enteredName,
    }

    if (typeof localStorage !== 'undefined') {
      saveStoredEventSession('demo-event', currentEventData)
      localStorage.setItem('guestName', enteredName)
      localStorage.setItem('qrchive_current_event_id', 'demo-event')
      localStorage.setItem('qrchive_guest_id', String(randomId))
      localStorage.setItem('qrchive_guest_code', randomGuestCode)
    }

    emit('submit', { id: randomId, guestCode: randomGuestCode, name: enteredName })
    emit('update:modelValue', false)
    emit('close')

    const targetPath = props.destination || '/quests'
    router.push(targetPath)
    isSubmitting.value = false
    return
  }

  try {
    const deviceSerial = getDeviceSerial()
    const deviceName = getDeviceName()

    // Requirement 4: Call backend endpoint to create snap_guest with Redis queueing
    const response = await axiosInstance.post('/api/guests/snap', {
      name: enteredName,
      eventToken: activeEventToken,
      eventId: activeEventToken,
      deviceSerial,
      deviceName,
    })

    const guestData = response.data
    const guestId = guestData?.id
    const guestCode = guestData?.guest_code || guestData?.guestCode

    // Requirement 4: Save to localStorage using 'currentEvent' key and multi-event session storage:
    // { id: guest.id, guestCode: guestCode, eventCode: route.params.id, guestName: guestName }
    if (typeof localStorage !== 'undefined') {
      const currentEventData = {
        id: guestId,
        guestCode: guestCode,
        eventCode: route.params.id || activeEventToken,
        guestName: enteredName,
      }
      saveStoredEventSession(route.params.id || activeEventToken, currentEventData)

      // Keep legacy keys for backward compatibility
      localStorage.setItem('guestName', enteredName)
      localStorage.setItem('qrchive_current_event_id', route.params.id || activeEventToken)
      if (guestId) localStorage.setItem('qrchive_guest_id', String(guestId))
      if (guestCode) localStorage.setItem('qrchive_guest_code', String(guestCode))
    }

    emit('submit', { id: guestId, guestCode, name: enteredName })
    emit('update:modelValue', false)
    emit('close')

    // Forward to route /quests
    const targetPath = props.destination || '/quests'
    router.push(targetPath)
  } catch (err) {
    console.error('[GuestModal] Failed to register snap guest:', err)

    // Fallback save so user can proceed even if offline or transient server error
    if (typeof localStorage !== 'undefined') {
      const fallbackData = {
        id: null,
        guestCode: null,
        eventCode: route.params.id || activeEventToken,
        guestName: enteredName,
      }
      saveStoredEventSession(route.params.id || activeEventToken, fallbackData)
      localStorage.setItem('guestName', enteredName)
      localStorage.setItem('qrchive_current_event_id', route.params.id || activeEventToken)
    }

    emit('submit', enteredName)
    emit('update:modelValue', false)
    emit('close')

    const targetPath = props.destination || '/quests'
    router.push(targetPath)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <JModal :model-value="modelValue" :show-close="false" :backdrop-glass="true" position="center" animation="scale"
    max-width="340px" modal-class="guest-modal-root" dialog-class="guest-modal-dialog" content-class="guest-modal-card"
    body-class="guest-modal-body" @update:model-value="emit('update:modelValue', $event)" @close="handleClose">
    <div id="guestModalCard" class="guest-modal-inner">
      <!-- Close Button (Properly inset at top: 1rem, right: 1rem) -->
      <button aria-label="Close modal" class="guest-modal-close-btn" type="button" @click="handleClose">
        <!-- <span class="material-symbols-outlined">close</span> -->
        <JIcon name="close" size="20" />
      </button>

      <!-- Sparkle Emblem Badge -->
      <div class="guest-modal-badge">
        <JIcon name="sparkles" size="20" />
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
          @keydown.enter.prevent="handleEnterCelebration" autocomplete="off">
          <template #append-inner>
            <span class="material-symbols-outlined guest-input-icon">edit</span>
          </template>
        </JInput>
      </div>

      <!-- Enter Celebration Action Button using JBtn -->
      <JBtn id="enterCelebrationBtn" type="button" class="guest-modal-action-btn" :loading="isSubmitting"
        :disabled="isSubmitting" @click="handleEnterCelebration">
        <span class="btn-text">{{ isSubmitting ? 'Entering Vault...' : 'Enter Celebration' }}</span>
        <span v-if="!isSubmitting" class="material-symbols-outlined btn-arrow">arrow_forward</span>
      </JBtn>
    </div>
  </JModal>
</template>
