<script setup>
import { ref, computed, watch } from 'vue'
import { axiosInstance } from '@/plugins/axios'
import { useToast } from '@/composables/useToast'
import JBtn from '@/@core/components/JBtn.vue'
import JInput from '@/@core/components/JInput.vue'

const props = defineProps({
  eventData: {
    type: Object,
    default: () => ({}),
  },
  eventCode: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['saved'])
const toast = useToast()

const isSaving = ref(false)

// Editable Form Fields (all event details EXCEPT payment details)
const name = ref('')
const eventDate = ref('')
const brideFirstname = ref('')
const brideLastname = ref('')
const groomFirstname = ref('')
const groomLastname = ref('')
const invitationDeadline = ref('')
const uploadExpiry = ref('')
const photoExpiry = ref('')

// Initialize fields from props.eventData
const initFormData = () => {
  const d = props.eventData || {}
  name.value = d.name || ''

  // Format date strings to YYYY-MM-DD for date inputs
  const parseDateForInput = (val) => {
    if (!val) return ''
    try {
      const parsed = new Date(val)
      if (isNaN(parsed.getTime())) return ''
      return parsed.toISOString().split('T')[0]
    } catch {
      return ''
    }
  }

  eventDate.value = parseDateForInput(d.eventDate || d.event_date || d.weddingDate)
  brideFirstname.value = d.brideFirstname || d.bride_firstname || ''
  brideLastname.value = d.brideLastname || d.bride_lastname || ''
  groomFirstname.value = d.groomFirstname || d.groom_firstname || ''
  groomLastname.value = d.groomLastname || d.groom_lastname || ''
  invitationDeadline.value = parseDateForInput(d.invitationDeadline || d.invitation_deadline)
  uploadExpiry.value = parseDateForInput(d.uploadExpiry || d.upload_expiry)
  photoExpiry.value = parseDateForInput(d.photoExpiry || d.photo_expiry)
}

watch(
  () => props.eventData,
  () => {
    initFormData()
  },
  { immediate: true, deep: true }
)

// Non-editable Payment & Package Info
const packageLabel = computed(() => {
  if (props.eventData?.isUnlimited || props.eventData?.is_unlimited) {
    return 'Unlimited Snap Shots Package'
  }
  return 'Standard Curated Archival Package'
})

const maxGuestDisplay = computed(() => {
  const mg = props.eventData?.maxGuest ?? props.eventData?.max_guest
  if (!mg) return 'Unlimited / 300+ Guests'
  return `Up to ${mg} Guests`
})

const priceDisplay = computed(() => {
  const p = props.eventData?.price
  if (!p) return 'Complimentary / Included'
  const num = Number(p)
  return isNaN(num) ? `₱${p}` : `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
})

const handleSubmit = async () => {
  if (!name.value.trim()) {
    toast.show({
      message: 'Please enter a celebration name.',
      color: 'danger',
    })
    return
  }

  isSaving.value = true
  try {
    const payload = {
      name: name.value.trim(),
      eventDate: eventDate.value ? new Date(eventDate.value).toISOString() : null,
      weddingDate: eventDate.value ? new Date(eventDate.value).toISOString() : null,
      brideFirstname: brideFirstname.value.trim() || null,
      brideLastname: brideLastname.value.trim() || null,
      groomFirstname: groomFirstname.value.trim() || null,
      groomLastname: groomLastname.value.trim() || null,
      invitationDeadline: invitationDeadline.value ? new Date(invitationDeadline.value).toISOString() : null,
      uploadExpiry: uploadExpiry.value ? new Date(uploadExpiry.value).toISOString() : null,
      photoExpiry: photoExpiry.value ? new Date(photoExpiry.value).toISOString() : null,
    }

    const eventIdentifier = props.eventData?.id || props.eventCode
    await axiosInstance.put(`/api/events/${eventIdentifier}`, payload)

    toast.show({
      message: 'Event details updated successfully!',
      color: 'success',
    })

    emit('saved')
  } catch (err) {
    console.error('[EventDetailsSubtab] Update failed:', err)
    toast.show({
      message: `Failed to update event: ${err?.response?.data?.message || err.message}`,
      color: 'danger',
    })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="event-subtab-details">
    <div class="subtab-header">
      <div>
        <span class="subtab-badge">Event Settings</span>
        <h2 class="subtab-title">Celebration Information</h2>
        <p class="subtab-desc">
          Update primary celebration information, couple details, and timeline access deadlines.
        </p>
      </div>
    </div>

    <!-- Read-Only Payment & Package Info Banner -->
    <div class="payment-readonly-card">
      <div class="payment-readonly-icon">
        <span class="material-symbols-outlined">verified</span>
      </div>
      <div class="payment-readonly-body">
        <div class="payment-readonly-tags">
          <span class="readonly-pill">{{ packageLabel }}</span>
          <span class="readonly-pill readonly-pill--gold">{{ maxGuestDisplay }}</span>
          <span class="readonly-pill readonly-pill--price">{{ priceDisplay }}</span>
        </div>
        <p class="payment-readonly-note">
          <span class="material-symbols-outlined lock-icon">lock</span>
          <span>Package &amp; billing credentials are fixed to preserve tier service agreements.</span>
        </p>
      </div>
    </div>

    <!-- Details Form -->
    <form class="details-form" @submit.prevent="handleSubmit">
      <!-- Section 1: Main Event Info -->
      <div class="form-section">
        <h3 class="form-section-title">
          <span class="material-symbols-outlined section-icon">celebration</span>
          <span>Celebration Overview</span>
        </h3>

        <div class="form-grid">
          <div class="form-group form-group--full">
            <label class="form-label" for="eventName">Celebration / Event Name *</label>
            <input
              id="eventName"
              v-model="name"
              type="text"
              class="form-input"
              placeholder="e.g. Keann & Jenny's Wedding Celebration"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="eventDate">Celebration Date</label>
            <input
              id="eventDate"
              v-model="eventDate"
              type="date"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="invitationDeadline">RSVP / Invitation Deadline</label>
            <input
              id="invitationDeadline"
              v-model="invitationDeadline"
              type="date"
              class="form-input"
            />
          </div>
        </div>
      </div>

      <!-- Section 2: Couple / Celebrants -->
      <div class="form-section">
        <h3 class="form-section-title">
          <span class="material-symbols-outlined section-icon">favorite</span>
          <span>Celebrated Couple</span>
        </h3>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="brideFirstname">Bride / Partner 1 First Name</label>
            <input
              id="brideFirstname"
              v-model="brideFirstname"
              type="text"
              class="form-input"
              placeholder="First name"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="brideLastname">Bride / Partner 1 Last Name</label>
            <input
              id="brideLastname"
              v-model="brideLastname"
              type="text"
              class="form-input"
              placeholder="Last name"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="groomFirstname">Groom / Partner 2 First Name</label>
            <input
              id="groomFirstname"
              v-model="groomFirstname"
              type="text"
              class="form-input"
              placeholder="First name"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="groomLastname">Groom / Partner 2 Last Name</label>
            <input
              id="groomLastname"
              v-model="groomLastname"
              type="text"
              class="form-input"
              placeholder="Last name"
            />
          </div>
        </div>
      </div>

      <!-- Section 3: Archival Access Windows -->
      <div class="form-section">
        <h3 class="form-section-title">
          <span class="material-symbols-outlined section-icon">schedule</span>
          <span>Archival Timeline &amp; Windows</span>
        </h3>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="uploadExpiry">Upload Window Expiry</label>
            <input
              id="uploadExpiry"
              v-model="uploadExpiry"
              type="date"
              class="form-input"
            />
            <span class="form-hint">Date until guests can upload new media to the live vault</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="photoExpiry">Archive Storage Expiry</label>
            <input
              id="photoExpiry"
              v-model="photoExpiry"
              type="date"
              class="form-input"
            />
            <span class="form-hint">Date until the high-res gallery remains hosted for download</span>
          </div>
        </div>
      </div>

      <!-- Submit Row -->
      <div class="form-actions">
        <JBtn
          type="submit"
          color="primary"
          size="md"
          :loading="isSaving"
          :disabled="isSaving"
          class="save-btn"
        >
          <span class="material-symbols-outlined btn-icon">save</span>
          <span>Save Changes</span>
        </JBtn>
      </div>
    </form>
  </div>
</template>

<style scoped lang="scss">
.event-subtab-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.subtab-header {
  border-bottom: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.15));
  padding-bottom: 1rem;
}

.subtab-badge {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--primary, #c5a059);
  margin-bottom: 0.25rem;
}

.subtab-title {
  font-family: var(--font-heading, 'Playfair Display', Georgia, serif);
  font-size: 1.5rem;
  font-weight: 400;
  color: var(--text-primary, #1f1b18);
  margin: 0 0 0.35rem;
}

.subtab-desc {
  font-size: 0.8125rem;
  color: var(--text-secondary, #4e4639);
  margin: 0;
  line-height: 1.5;
}

.payment-readonly-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-lg, 0.5rem);
  background: var(--bg-surface-tonal, rgba(197, 160, 89, 0.06));
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.2));

  .payment-readonly-icon {
    color: var(--primary, #c5a059);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 0.15rem;

    .material-symbols-outlined {
      font-size: 1.5rem;
    }
  }

  .payment-readonly-body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
  }

  .payment-readonly-tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .readonly-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.65rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    background: var(--bg-surface, #ffffff);
    color: var(--text-primary, #1f1b18);
    border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.2));

    &--gold {
      color: var(--primary, #c5a059);
      background: var(--bg-surface-tonal, rgba(197, 160, 89, 0.12));
    }

    &--price {
      font-weight: 700;
      color: var(--primary, #c5a059);
    }
  }

  .payment-readonly-note {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-secondary, #4e4639);
    display: flex;
    align-items: center;
    gap: 0.35rem;

    .lock-icon {
      font-size: 0.95rem;
      opacity: 0.75;
    }
  }
}

.details-form {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--bg-surface-elevated, #ffffff);
  border-radius: var(--radius-lg, 0.5rem);
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.16));
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.04));
}

.form-section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--text-primary, #1f1b18);
  letter-spacing: 0.02em;

  .section-icon {
    font-size: 1.15rem;
    color: var(--primary, #c5a059);
  }
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  &--full {
    grid-column: 1 / -1;
  }
}

.form-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary, #4e4639);
}

.form-input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-md, 0.375rem);
  border: 1px solid var(--border-color, #d1c5b4);
  background: var(--bg-input, var(--bg-body, #fff8f5));
  color: var(--text-primary, #1f1b18);
  font-size: 0.875rem;
  font-family: inherit;
  color-scheme: inherit;
  transition: all 0.2s ease;
  outline: none;

  &::placeholder {
    color: var(--text-muted, #7f7667);
    opacity: 0.8;
  }

  &:focus {
    border-color: var(--border-color-focus, var(--primary, #c5a059));
    box-shadow: 0 0 0 3px var(--ring-color, rgba(197, 160, 89, 0.2));
  }
}

.form-hint {
  font-size: 0.6875rem;
  color: var(--text-muted, #7f7667);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
}

.save-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 1.1rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: var(--radius-md, 0.375rem);

  .btn-icon {
    font-size: 1.05rem;
  }
}
</style>
