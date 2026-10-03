<script setup>
const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false,
    },
    eventTitle: {
        type: String,
        default: 'J & J'
    }
})
const emit = defineEmits(['update:modelValue', 'enter'])
const isSubmitting = ref(false);
const guestName = ref('')
watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen && localStorage.getItem('guestName')) {
            guestName.value = localStorage.getItem('guestName');
        }
    }
)
const handleClose = () => {
    emit('update:modelValue', false)
}
const handleEnterCelebration = () => {
    emit('enter', guestName.value)
}
</script>
<template>
    <JModal :model-value="modelValue" :show-close="false" :backdrop-glass="true" position="center" animation="scale"
        max-width="340px" modal-class="guest-modal-root" dialog-class="guest-modal-dialog"
        content-class="guest-modal-card" body-class="guest-modal-body"
        @update:model-value="emit('update:modelValue', $event)" @close="handleClose">
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
                <span class="guest-modal-couple-name">QRCHIVE EVENTS</span>
                <div class="guest-modal-divider-line"></div>
            </div>

            <!-- Welcome Heading -->
            <h2 class="guest-modal-title">Welcome, Honored Guest</h2>

            <!-- Guest Name Input Form Group using JInput -->
            <div class="guest-modal-field">
                <JInput id="guestNameInput" v-model="guestName" label="Guest NAME" placeholder="Enter Your Name"
                    pattern="boxed" container-class="guest-input-container" label-class="guest-input-label"
                    input-class="guest-input-control" @keydown.enter.prevent="handleEnterCelebration"
                    autocomplete="off">
                    <template #append-inner>
                        <span class="material-symbols-outlined guest-input-icon">edit</span>
                    </template>
                </JInput>
            </div>

            <!-- Enter Celebration Action Button using JBtn -->
            <JBtn id="enterCelebrationBtn" type="button" class="guest-modal-action-btn" :loading="isSubmitting"
                @click="handleEnterCelebration">
                <span class="btn-text">{{ isSubmitting ? 'Entering Event...' : 'Enter Celebration' }}</span>
                <JIcon name="arrow-right" />
            </JBtn>
        </div>
    </JModal>
</template>