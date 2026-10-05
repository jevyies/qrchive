<script setup>
import { ref, onMounted } from 'vue'
import { axiosInstance } from '@/plugins/axios'
import { useToast } from '@/composables/useToast'
import JBtn from '@/@core/components/JBtn.vue'
import JModal from '@/@core/components/JModal.vue'

const props = defineProps({
  eventCode: {
    type: String,
    required: true,
  },
  eventData: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['updated'])
const toast = useToast()

const checklists = ref([])
const isLoading = ref(false)

// Modal State (Add / Edit)
const isFormModalOpen = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const formName = ref('')
const formDescription = ref('')
const isSaving = ref(false)

// Delete Confirmation Modal State
const isDeleteModalOpen = ref(false)
const itemToDelete = ref(null)
const isDeleting = ref(false)

// Fetch Checklists from backend API
const fetchChecklists = async () => {
  isLoading.value = true
  try {
    const eventId = props.eventData?.id || props.eventCode
    const { data } = await axiosInstance.get(`/api/events/${eventId}/checklist`)
    checklists.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('[EventChecklistsSubtab] Fetch error:', err)
    toast.show({
      message: 'Failed to load checklists. Please try again.',
      color: 'danger',
    })
  } finally {
    isLoading.value = false
  }
}

// Open Add Modal
const openAddModal = () => {
  isEditing.value = false
  editingId.value = null
  formName.value = ''
  formDescription.value = ''
  isFormModalOpen.value = true
}

// Open Edit Modal
const openEditModal = (item) => {
  isEditing.value = true
  editingId.value = item.id
  formName.value = item.name || ''
  formDescription.value = item.description || ''
  isFormModalOpen.value = true
}

// Submit Form (Add or Edit)
const handleSaveItem = async () => {
  if (!formName.value.trim()) {
    toast.show({
      message: 'Please enter a checklist item name.',
      color: 'danger',
    })
    return
  }

  isSaving.value = true
  const eventId = props.eventData?.id || props.eventCode

  try {
    if (isEditing.value && editingId.value) {
      await axiosInstance.put(`/api/events/${eventId}/checklist/${editingId.value}`, {
        name: formName.value.trim(),
        description: formDescription.value.trim() || null,
      })
      toast.show({
        message: 'Checklist moment updated successfully!',
        color: 'success',
      })
    } else {
      await axiosInstance.post(`/api/events/${eventId}/checklist`, {
        name: formName.value.trim(),
        description: formDescription.value.trim() || null,
      })
      toast.show({
        message: 'Checklist moment added successfully!',
        color: 'success',
      })
    }

    isFormModalOpen.value = false
    await fetchChecklists()
    emit('updated')
  } catch (err) {
    console.error('[EventChecklistsSubtab] Save error:', err)
    toast.show({
      message: `Failed to save checklist: ${err?.response?.data?.message || err.message}`,
      color: 'danger',
    })
  } finally {
    isSaving.value = false
  }
}

// Open Delete Confirmation
const confirmDelete = (item) => {
  itemToDelete.value = item
  isDeleteModalOpen.value = true
}

// Execute Delete
const handleDelete = async () => {
  if (!itemToDelete.value) return
  isDeleting.value = true
  const eventId = props.eventData?.id || props.eventCode

  try {
    await axiosInstance.delete(`/api/events/${eventId}/checklist/${itemToDelete.value.id}`)
    toast.show({
      message: 'Checklist moment removed.',
      color: 'success',
    })
    isDeleteModalOpen.value = false
    itemToDelete.value = null
    await fetchChecklists()
    emit('updated')
  } catch (err) {
    console.error('[EventChecklistsSubtab] Delete error:', err)
    toast.show({
      message: `Failed to delete checklist: ${err?.response?.data?.message || err.message}`,
      color: 'danger',
    })
  } finally {
    isDeleting.value = false
  }
}

onMounted(() => {
  fetchChecklists()
})
</script>

<template>
  <div class="event-subtab-checklists">
    <!-- Header -->
    <div class="subtab-header">
      <div>
        <span class="subtab-badge">Guest Experience</span>
        <h2 class="subtab-title">Reception Checklists &amp; Moments</h2>
        <p class="subtab-desc">
          Curate the shot lists and celebration milestones that guide your guests during the event.
        </p>
      </div>

      <JBtn
        color="primary"
        size="sm"
        class="add-btn"
        @click="openAddModal"
      >
        <span class="material-symbols-outlined btn-icon">add_circle</span>
        <span>Add Checklist Moment</span>
      </JBtn>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <span class="material-symbols-outlined spinning">progress_activity</span>
      <span>Loading checklists...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="checklists.length === 0" class="empty-checklists">
      <span class="material-symbols-outlined empty-icon">checklist</span>
      <h3 class="empty-title">No Checklist Moments Yet</h3>
      <p class="empty-desc">
        Help your guests know what special moments to photograph—such as the first dance, cake cutting, or toasts.
      </p>
      <JBtn color="primary" size="sm" @click="openAddModal">
        Create First Moment
      </JBtn>
    </div>

    <!-- Checklists List -->
    <div v-else class="checklists-list">
      <div
        v-for="(item, idx) in checklists"
        :key="item.id"
        class="checklist-card"
      >
        <div class="checklist-card__left">
          <span class="checklist-card__index">{{ String(idx + 1).padStart(2, '0') }}</span>
          <div class="checklist-card__content">
            <h4 class="checklist-card__title">{{ item.name }}</h4>
            <p v-if="item.description" class="checklist-card__desc">{{ item.description }}</p>
            <p v-else class="checklist-card__desc checklist-card__desc--empty">No description provided</p>
          </div>
        </div>

        <div class="checklist-card__actions">
          <button
            type="button"
            class="action-icon-btn action-icon-btn--edit"
            title="Edit moment"
            @click="openEditModal(item)"
          >
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button
            type="button"
            class="action-icon-btn action-icon-btn--delete"
            title="Delete moment"
            @click="confirmDelete(item)"
          >
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Add / Edit Modal -->
    <JModal
      v-model="isFormModalOpen"
      :title="isEditing ? 'Edit Checklist Moment' : 'New Checklist Moment'"
      subtitle="Guiding guest photography with curated moments"
      size="md"
      variant="elevated"
    >
      <form class="modal-form" @submit.prevent="handleSaveItem">
        <div class="form-group">
          <label class="form-label" for="momentName">Moment Title *</label>
          <input
            id="momentName"
            v-model="formName"
            type="text"
            class="form-input"
            placeholder="e.g. Couple's Grand Entrance"
            required
            autofocus
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="momentDesc">Description (Optional)</label>
          <textarea
            id="momentDesc"
            v-model="formDescription"
            rows="3"
            class="form-input form-textarea"
            placeholder="e.g. Capture the grand applause and confetti as the newlyweds enter the ballroom"
          ></textarea>
        </div>

        <div class="modal-actions">
          <JBtn size="sm" variant="tonal" type="button" @click="isFormModalOpen = false">
            Cancel
          </JBtn>
          <JBtn size="sm" color="primary" type="submit" :loading="isSaving" :disabled="isSaving">
            {{ isEditing ? 'Update Moment' : 'Add Moment' }}
          </JBtn>
        </div>
      </form>
    </JModal>

    <!-- Delete Confirmation Modal -->
    <JModal
      v-model="isDeleteModalOpen"
      title="Delete Checklist Moment"
      size="sm"
      variant="elevated"
    >
      <div class="delete-confirm">
        <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6;">
          Are you sure you want to delete
          <strong>"{{ itemToDelete?.name }}"</strong>? This cannot be undone.
        </p>

        <div class="modal-actions" style="margin-top: 1.5rem;">
          <JBtn size="sm" variant="tonal" type="button" @click="isDeleteModalOpen = false">
            Cancel
          </JBtn>
          <JBtn
            size="sm"
            color="danger"
            type="button"
            :loading="isDeleting"
            :disabled="isDeleting"
            @click="handleDelete"
          >
            Delete
          </JBtn>
        </div>
      </div>
    </JModal>
  </div>
</template>

<style scoped lang="scss">
.event-subtab-checklists {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.subtab-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.15));
  padding-bottom: 1rem;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
  }
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

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
  flex-shrink: 0;

  .btn-icon {
    font-size: 1.15rem;
  }
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 3rem;
  color: var(--text-secondary, #4e4639);
  font-size: 0.875rem;
}

.empty-checklists {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3.5rem 1.5rem;
  background: var(--bg-surface-elevated, #ffffff);
  border: 1px dashed var(--border-color-subtle, rgba(197, 160, 89, 0.25));
  border-radius: var(--radius-xl, 0.75rem);

  .empty-icon {
    font-size: 3rem;
    color: var(--primary, #c5a059);
    opacity: 0.75;
    margin-bottom: 0.5rem;
  }

  .empty-title {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
    color: var(--text-primary, #1f1b18);
  }

  .empty-desc {
    font-size: 0.8125rem;
    color: var(--text-secondary, #4e4639);
    max-width: 420px;
    margin: 0 0 1.25rem;
    line-height: 1.6;
  }
}

.checklists-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checklist-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--bg-surface-elevated, #ffffff);
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.18));
  border-radius: var(--radius-lg, 0.5rem);
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.04));

  &:hover {
    border-color: var(--primary, #c5a059);
    box-shadow: var(--shadow-md, 0 4px 12px rgba(197, 160, 89, 0.08));
  }

  &__left {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: 0;
  }

  &__index {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--primary, #c5a059);
    background: var(--bg-surface-tonal, rgba(197, 160, 89, 0.1));
    padding: 0.35rem 0.65rem;
    border-radius: var(--radius-md, 0.375rem);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  &__content {
    min-width: 0;
  }

  &__title {
    margin: 0 0 0.2rem;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-primary, #1f1b18);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__desc {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--text-secondary, #4e4639);
    line-height: 1.4;

    &--empty {
      font-style: italic;
      opacity: 0.65;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-shrink: 0;
  }
}

.action-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem;
  border-radius: var(--radius-md, 0.375rem);
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;

  .material-symbols-outlined {
    font-size: 1.15rem;
  }

  &--edit {
    color: var(--text-secondary, #4e4639);

    &:hover {
      background: var(--bg-hover, rgba(197, 160, 89, 0.12));
      color: var(--primary, #c5a059);
    }
  }

  &--delete {
    color: var(--text-secondary, #4e4639);

    &:hover {
      background: var(--danger-tonal, rgba(244, 63, 94, 0.12));
      color: var(--danger, #f43f5e);
    }
  }
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
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
  outline: none;
  transition: all 0.2s ease;

  &::placeholder {
    color: var(--text-muted, #7f7667);
    opacity: 0.8;
  }

  &:focus {
    border-color: var(--border-color-focus, var(--primary, #c5a059));
    box-shadow: 0 0 0 3px var(--ring-color, rgba(197, 160, 89, 0.2));
  }
}

.form-textarea {
  resize: vertical;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
</style>
