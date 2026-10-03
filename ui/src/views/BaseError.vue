<script setup>

const props = defineProps({
    type: {
        type: String,
        default: 'notfound',
    },
    days: {
        type: Number,
        default: 0,
    },
})
const emit = defineEmits(['homepage'])
</script>
<template>
    <div class="base-error-root">
        <template v-if="type == 'notfound'">
            <h1 class="hero-title event-error-title"> 404</h1>
            <p class="text-center">
                The event invitation link you are trying to access does not exist, has expired, or was removed.
            </p>
            <div class="mt-5 w-100">
                <button class="checklist-quick-card__submit-btn" type="button" @click="emit('homepage')"><span>
                        <JIcon name="home" class="me-1" size="md" />Return to
                        Homepage
                    </span></button>
                <p class="py-5 text-center">or try to ask the event coordinator.</p>
            </div>
        </template>
        <template v-else-if="type == 'error'">
            <h1 class="hero-title event-error-title"> 500</h1>
            <p class="text-center mb-0">
                Program Error
            </p>
            <p class="text-center">
                There was an error getting the event details.
            </p>
            <div class="mt-5 w-100">
                <button class="checklist-quick-card__submit-btn" type="button" @click="emit('homepage')"><span>
                        <JIcon name="home" class="me-1" size="md" />Return to
                        Homepage
                    </span></button>
            </div>
        </template>
        <template v-else-if="type == 'notstarted'">
            <p class="text-center">
                The event has not started yet.
            </p>
            <h1 class="hero-title event-error-title"> {{ days }} </h1>
            <p class="text-center">
                days to go.
            </p>
            <div class="mt-5 w-100">
                <button class="checklist-quick-card__submit-btn" type="button" @click="emit('homepage')"><span>
                        <JIcon name="home" class="me-1" size="md" />Return to
                        Homepage
                    </span></button>
            </div>
        </template>
    </div>
</template>