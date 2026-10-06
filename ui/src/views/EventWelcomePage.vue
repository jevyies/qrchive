<script setup>
const props = defineProps({
    eventDetails: Object,
    isPressed: Boolean,
    isCoupleEvent: Boolean
})
const emit = defineEmits(['homepage', 'get-started'])
const isHovered = ref(false);

const formatDate = (dateStr) => {
    if (!dateStr) return ''
    try {
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return dateStr
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
        return dateStr
    }
}

const displayDate = computed(() => {
    return formatDate(props.eventDetails?.eventDate)
})
</script>
<template>
    <div class="event-hero-card">
        <!-- Haute Editorial Moniker & Names -->
        <div class="vault-hero__eyebrow" v-if="isCoupleEvent">
            <span class="vault-hero__eyebrow-dot"></span>
            <span class="vault-hero__eyebrow-text">The Wedding of</span>
            <span class="vault-hero__eyebrow-dot"></span>
        </div>
        <h1 class="event-hero-title">
            {{ eventDetails.name }}
        </h1>

        <!-- Date Subtitle -->
        <div class="event-meta-info">
            <span v-if="eventDetails.eventDate" class="event-meta-text">{{ displayDate }}</span>
        </div>

        <!-- Narrative Copy -->
        <p class="event-hero-narrative">
            Snap & Share. Capture every moment.
        </p>

        <!-- Primary Action CTA Button -->
        <button id="enterVaultBtn" type="button" class="event-cta-btn" :class="{ 'is-pressed': isPressed }"
            @mouseenter="isHovered = true" @mouseleave="isHovered = false" @click="emit('get-started')">
            <span class="event-cta-text">
                Get Started
            </span>
            <JIcon name="arrow-right" :size="16" />
        </button>
        <template v-if="eventDetails.storeName">
            <p class="event-hero-narrative mt-3">
                Created by {{ eventDetails.storeName }}
            </p>
        </template>
    </div>
</template>