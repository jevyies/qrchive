<script setup>

const props = defineProps({
    modelValue: {
        type: String,
        default: 'capture',
    }
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
    <!-- Bottom Navigation Bar -->
    <nav class="vault-bottom-nav" data-active-classes="text-primary font-semibold" aria-label="Event navigation">
        <div class="vault-bottom-nav__inner">
            <!-- Capture Tab -->
            <a :class="['vault-bottom-nav__item', modelValue == 'capture' ? 'is-active' : 'is-inactive']" href="#"
                @click.prevent="emit('update:modelValue', 'capture')">
                <JIcon name="camera" size="25" />
                <span class="vault-bottom-nav__label">Capture</span>
            </a>

            <!-- Live Vault / Gallery Tab -->
            <a :class="['vault-bottom-nav__item', modelValue == 'gallery' ? 'is-active' : 'is-inactive']" href="#"
                @click.prevent="emit('update:modelValue', 'gallery')">
                <JIcon name="gallery" size="25" />
                <span class="vault-bottom-nav__label">Live Gallery</span>
            </a>
        </div>
    </nav>
</template>
