<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
    isOpen: {
        type: Boolean,
        default: false,
    },
    modelValue: {
        type: Boolean,
        default: false,
    },
    items: {
        type: Array,
        default: () => [],
    },
    initialIndex: {
        type: Number,
        default: 0,
    },
    showLike: {
        type: Boolean,
        default: true,
    },
})

const emit = defineEmits([
    'update:isOpen',
    'update:modelValue',
    'close',
    'like',
    'change',
])

const isVisible = computed(() => Boolean(props.isOpen || props.modelValue))
const currentIndex = ref(props.initialIndex || 0)

watch(
    () => props.initialIndex,
    (newVal) => {
        currentIndex.value = Math.max(0, Math.min(newVal || 0, Math.max(0, props.items.length - 1)))
    }
)

watch(isVisible, (val) => {
    if (val) {
        currentIndex.value = Math.max(0, Math.min(props.initialIndex || 0, Math.max(0, props.items.length - 1)))
        dragOffset.value = 0
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', handleKeyDown)
        }
    } else {
        if (typeof window !== 'undefined') {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }
})

const activeLightbox = computed(() => {
    if (!isVisible.value || !props.items || props.items.length === 0) return null
    return props.items[currentIndex.value] || null
})

// Normalized item properties with robust fallbacks
const activeAuthor = computed(() => {
    if (!activeLightbox.value) return 'Guest'
    return activeLightbox.value.guest || activeLightbox.value.uploadedBy || 'Guest'
})

const activeTime = computed(() => {
    if (!activeLightbox.value) return 'Just now'
    return activeLightbox.value.time || activeLightbox.value.uploadedAt || 'Just now'
})

const activeTitle = computed(() => {
    if (!activeLightbox.value) return 'Captured Moment'
    return activeLightbox.value.title || activeLightbox.value.fileName || 'Captured Moment'
})

const activeCategory = computed(() => {
    if (!activeLightbox.value) return 'Reception'
    return activeLightbox.value.categoryLabel || activeLightbox.value.category || 'Reception'
})

const activeImageSrc = computed(() => {
    if (!activeLightbox.value) return ''
    return activeLightbox.value.fullUrl || activeLightbox.value.url || activeLightbox.value.image || ''
})

const isActiveVideo = computed(() => {
    if (!activeLightbox.value) return false
    if (activeLightbox.value.isVideo) return true
    const src = String(activeLightbox.value.url || activeLightbox.value.fullUrl || activeImageSrc.value || '').toLowerCase()
    return src.endsWith('.mp4') || src.endsWith('.webm') || (src.startsWith('blob:') && String(activeLightbox.value.mimeType || '').startsWith('video/'))
})

const activeVideoSrc = computed(() => {
    if (!activeLightbox.value) return ''
    return activeLightbox.value.videoUrl || activeLightbox.value.fullUrl || activeLightbox.value.url || activeImageSrc.value
})

const activeFallbackSrc = computed(() => {
    if (!activeLightbox.value) return ''
    return activeLightbox.value.url || activeLightbox.value.thumbnailUrl || activeLightbox.value.image || ''
})

const activeLikes = computed(() => {
    if (!activeLightbox.value) return 0
    return activeLightbox.value.likes ?? activeLightbox.value.likesCount ?? 0
})

const activeIsLiked = computed(() => {
    if (!activeLightbox.value) return false
    return Boolean(activeLightbox.value.isLiked)
})

// Navigation
const closeLightbox = () => {
    dragOffset.value = 0
    emit('update:isOpen', false)
    emit('update:modelValue', false)
    emit('close')
}

const nextPhoto = () => {
    if (!props.items || props.items.length <= 1) return
    currentIndex.value = (currentIndex.value + 1) % props.items.length
    dragOffset.value = 0
    emit('change', currentIndex.value, props.items[currentIndex.value])
}

const prevPhoto = () => {
    if (!props.items || props.items.length <= 1) return
    currentIndex.value = (currentIndex.value - 1 + props.items.length) % props.items.length
    dragOffset.value = 0
    emit('change', currentIndex.value, props.items[currentIndex.value])
}

const handleToggleLike = (event) => {
    if (event) event.stopPropagation()
    if (!activeLightbox.value) return
    emit('like', activeLightbox.value, event)
}

const onImageError = (e) => {
    if (activeFallbackSrc.value && e.target.src !== activeFallbackSrc.value) {
        e.target.src = activeFallbackSrc.value
    }
}

const videoHasError = ref(false)
watch(
    () => activeLightbox.value?.id,
    () => {
        videoHasError.value = false
    },
)

const onVideoError = (e) => {
    console.warn('[LightBox] Failed to play video source:', activeVideoSrc.value, e)
    videoHasError.value = true
}

// Touch swipe gesture handling
const dragOffset = ref(0)
const isDragging = ref(false)
let touchStartX = 0
let touchStartY = 0
let touchEndX = 0
let touchEndY = 0

const onTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
    touchEndX = touchStartX
    touchEndY = touchStartY
    isDragging.value = true
}

const onTouchMove = (e) => {
    if (!isDragging.value || !e.touches || e.touches.length === 0) return
    touchEndX = e.touches[0].clientX
    touchEndY = e.touches[0].clientY
    const deltaX = touchEndX - touchStartX
    const deltaY = touchEndY - touchStartY

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        dragOffset.value = Math.max(-120, Math.min(120, deltaX))
    }
}

const onTouchEnd = () => {
    if (!isDragging.value) return
    isDragging.value = false
    const deltaX = touchEndX - touchStartX
    const deltaY = touchEndY - touchStartY

    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) {
            nextPhoto()
        } else {
            prevPhoto()
        }
    } else {
        dragOffset.value = 0
    }
}

// Desktop mouse drag gesture handling
let mouseStartX = 0
let isMouseDown = false

const onMouseDown = (e) => {
    isMouseDown = true
    mouseStartX = e.clientX
}

const onMouseMove = (e) => {
    if (!isMouseDown) return
    const deltaX = e.clientX - mouseStartX
    dragOffset.value = Math.max(-120, Math.min(120, deltaX))
}

const onMouseUp = (e) => {
    if (!isMouseDown) return
    isMouseDown = false
    const deltaX = e.clientX - mouseStartX
    if (deltaX < -50) {
        nextPhoto()
    } else if (deltaX > 50) {
        prevPhoto()
    } else {
        dragOffset.value = 0
    }
}

// Keyboard navigation
const handleKeyDown = (e) => {
    if (!isVisible.value) return
    if (e.key === 'ArrowRight') {
        nextPhoto()
    } else if (e.key === 'ArrowLeft') {
        prevPhoto()
    } else if (e.key === 'Escape') {
        closeLightbox()
    }
}

onMounted(() => {
    if (isVisible.value && typeof window !== 'undefined') {
        window.addEventListener('keydown', handleKeyDown)
    }
})

onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown)
    }
})
</script>

<template>
    <teleport to="body">
        <div v-if="isVisible && activeLightbox" class="vault-lightbox" @click="closeLightbox">
            <!-- Lightbox Header -->
            <header class="vault-lightbox__header" @click.stop>
                <div class="vault-lightbox__user">
                    <span class="vault-lightbox__dot"></span>
                    <div>
                        <div class="vault-lightbox__author">Captured by {{ activeAuthor }}</div>
                        <div class="vault-lightbox__meta-row">
                            <span class="vault-lightbox__time">{{ activeTime }}</span>
                            <span v-if="items.length > 0" class="vault-lightbox__counter">
                                ({{ currentIndex + 1 }} of {{ items.length }})
                            </span>
                        </div>
                    </div>
                </div>
                <button aria-label="Close Lightbox" class="vault-lightbox__close" type="button" @click="closeLightbox">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </header>

            <!-- Lightbox Swipe Body -->
            <div class="vault-lightbox__body" @click.stop @mousedown="onMouseDown" @mousemove="onMouseMove"
                @mouseup="onMouseUp" @touchend="onTouchEnd" @touchmove="onTouchMove" @touchstart="onTouchStart">
                <!-- Media Element with swipe animation -->
                <div class="vault-lightbox__media-wrap" :style="{
                    transform: `translateX(${dragOffset}px)`,
                    opacity: `${1 - Math.abs(dragOffset) / 300}`,
                }">
                    <video v-if="isActiveVideo && !videoHasError" controls autoplay playsinline class="vault-lightbox__media" :src="activeVideoSrc" @error="onVideoError"></video>
                    <img v-else-if="isActiveVideo && videoHasError" :alt="activeTitle" class="vault-lightbox__media" :src="activeFallbackSrc || activeImageSrc">
                    <img v-else :alt="activeTitle" class="vault-lightbox__media" :src="activeImageSrc"
                        @error="onImageError">
                </div>

                <!-- Swipe guidance pill (only if multiple photos) -->
                <div v-if="items.length > 1" class="vault-lightbox__swipe-hint">
                    <span class="material-symbols-outlined">swipe</span>
                    <span>Swipe left or right</span>
                </div>
            </div>

            <!-- Lightbox Footer -->
            <footer class="vault-lightbox__footer" @click.stop>
                <div class="vault-lightbox__caption">
                    <span class="vault-lightbox__category">{{ activeCategory }}</span>
                    <h3 class="vault-lightbox__title">{{ activeTitle }}</h3>
                </div>

                <div v-if="showLike" class="vault-lightbox__actions">
                    <button class="vault-lightbox__like-btn" :class="{ 'is-liked': activeIsLiked }" type="button"
                        @click="handleToggleLike($event)">
                        <span class="material-symbols-outlined">favorite</span>
                        <span>{{ activeLikes }}</span>
                    </button>
                </div>
            </footer>
        </div>
    </teleport>
</template>
