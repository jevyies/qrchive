<route lang="yaml">
meta:
  layout: blank
  public: true
</route>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import keannAndJennyBg from '@/assets/images/keann-and-jenny.jpg'

const route = useRoute()
const router = useRouter()

// Known wedding data dictionary
const knownWeddings = {
    '1': {
        couple: 'Sophia & Alexander',
        title: 'Sophia & Alexander’s Wedding',
        initials: 'S & A',
        dateBadge: '24.10.26',
        heroImage: keannAndJennyBg,
    },
    '2': {
        couple: 'Emily & James',
        title: 'Emily & James’s Wedding',
        initials: 'E & J',
        dateBadge: '15.11.26',
        heroImage: keannAndJennyBg,
    },
    '3': {
        couple: 'Olivia & Liam',
        title: 'Olivia & Liam’s Wedding',
        initials: 'O & L',
        dateBadge: '10.08.26',
        heroImage: keannAndJennyBg,
    },
}

const currentWedding = computed(() => {
    const id = route.params.id
    if (id && knownWeddings[id]) {
        return knownWeddings[id]
    }
    return {
        couple: 'Keann & Jenny',
        title: "Keann & Jenny's Wedding",
        initials: 'K & J',
        dateBadge: '24.10.26',
        heroImage: keannAndJennyBg,
    }
})

// Categories with "All" as the very first tab
const categories = [
    { id: 'all', label: 'All' },
    { id: 'grand-entrance', label: 'Grand Entrance' },
    { id: 'first-dance', label: 'First Dance' },
    { id: 'dance-with-parents', label: 'Dance with Parents' },
    { id: 'guests-laughing', label: 'Guests Laughing' },
    { id: 'emcee', label: 'Emcee on Stage' },
    { id: 'grooms-surprise', label: "Groom's Surprise" },
    { id: 'brides-surprise', label: "Bride's Surprise" },
    { id: 'performances', label: 'Performances' },
    { id: 'cake-cutting', label: 'Cake Cutting' },
    { id: 'couple-message', label: "Couple's Message" },
]

const selectedCategory = ref('all')
const sortBy = ref('recent') // 'recent' | 'loved'

// Rich Media items stream
const mediaItems = ref([
    {
        id: 1,
        type: 'video',
        duration: '0:45',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvH8vi6MylRh6RvDOssw2eo3Dtg8nfcWtM8YcE6GzUcdLhmtxC0BgsSiGv6jagPlKH49bmfL0ywklwhMUX8_FStwpgAo7In5Qhz5EUfcdl2g8uPH7MwzlO73eR7Up6ia0O6Ue_UCoLMwYrxrXGnkxkZYMlxPVVPIcgwUwPotYOXbNiHLmUbqthXtI9E5ButkD170XX13o0gMQhsr_t1j-st3C0QgwTQbrgLAWrFVkyHt5n4Ffuh_L8',
        guest: 'Sophia M.',
        category: 'first-dance',
        categoryLabel: 'First Dance',
        title: 'Magical First Dance Under Chandeliers',
        likes: 42,
        isLiked: false,
        time: '12m ago',
    },
    {
        id: 2,
        type: 'photo',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXt6iEJ7zx1A92yJ8Z4cWy0VB_fpqJJTJfz9hlDaOsu2TvG_jv3ku3oFOKVrIpneZWhhO6B7uvw8cXnEsjoRxD9t1dmKg6C_-_rZZtJplFnul9SL9Ti7L81Q3jJdVByiR7FsZ9qFhXY8VgT1SXD-BSb6N54lxSULC9VZFAOQhd4u3YlyexajQjFwoAbQXrPWANmSknSxFtz4CpH9BRhr5yLQTuVpewyldWjw6chJy8FN1bNEeEsTlL',
        guest: 'Marcus C.',
        category: 'guests-laughing',
        categoryLabel: 'Guests Laughing',
        title: 'Table 7 Toasting & Laughter',
        likes: 28,
        isLiked: false,
        time: '25m ago',
    },
    {
        id: 3,
        type: 'photo',
        url: 'https://lh3.googleusercontent.com/aida/AEtjO1WDrVhkgnfANJvIL99oaHrPSt-Q0nwBX5VS4o4LWRmOlh2g5nasMz5hTT7RvRFgKN0819Z9J6uk7ToQDtKioIPHXvFmFeIUEMf2TALjhcrDeCkZDGEuUflWqD350D46EEVZlp19qK_xIz8sg9k3wSpEkhcDspZ7FEzudz6qJRmuZQE1IbnpX3JwH2qkzMqy7qx_GzWiih0Ir71E0J6B3AihtLF0-mvdydJFT_mEBNK-qprkjMTpw8dr6l4',
        guest: 'Chloe T.',
        category: 'all',
        categoryLabel: 'Reception Decor',
        title: 'Table Signage & Tuscan Florals',
        likes: 19,
        isLiked: false,
        time: '34m ago',
    },
    {
        id: 4,
        type: 'video',
        duration: '0:18',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuUbZaTZEcqUh00IvjbfPlZynuCpVetBp1d92wSL0R25w4K-78iqLE6bi8zHoWCrgoR78ENfFpTjT1uGMTpmeeWp9EGq3Qz8chEUVCBUT63DjJMPtm2q02RST9KT6LGmHcJeKzUAXFIOEKlqg3NGaAgYorHr6gqojzEeLun_scgguqs8aJI2Dn34ka_nIzCq9NzdAlKane_2Q673FyL-geAkvzUWP-oXpQVLQ0S00TIebtdxJfeZmU',
        guest: 'Uncle Dave',
        category: 'emcee',
        categoryLabel: 'Emcee on Stage',
        title: 'Best Man Opening Toast',
        likes: 35,
        isLiked: false,
        time: '45m ago',
    },
    {
        id: 5,
        type: 'photo',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_b45E9YjZPsE9FZqujCSRNTm6TpITBwM_TaJFgapEZqnACNNwtSVVLegXCWrGpfncDgbRxwks7l8wtobmCfqQkFQv34yOtgKuuNCrqjBvvgccMhT42aq0aHWZnTM-_kf98W7MIzPhbJg7cCIGS2Qy3CEH8ggjzWg0aUNB4Le6KuNEtqtn-DZAcxxNxm62OShpMnoE5uH6Kye6WAxV9WCfQwoP8bbVduYvD1BF5SQjqaIMfsDR8GxI',
        guest: 'Elena R.',
        category: 'grand-entrance',
        categoryLabel: 'Grand Entrance',
        title: 'Couple Entering Ballroom with Sparklers',
        likes: 56,
        isLiked: false,
        time: '1h ago',
    },
    {
        id: 6,
        type: 'photo',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtugc2oDwyayarlJO8IfY0KvJE1t-Txs0OEHZIUXi0H29kBMKoVaHtrvXCg_u6ZTSk4htGJYBiWIv9oXQHWmHhBObhhwNp8IiGEZFLrWIjQAN6Dbjg4lq2CknxKewu2RidFIQaLD83ZtDjl8GOmewe9pBnqX_XoFRUNj0nEFWV3atRIeQroa2FQ44na1TzF-KDKTxmI_e-FdlJla9GpGDqzMj7G52Y8JjxXo1RK5-WSqdqhEhPAd7w',
        guest: 'Groomsman Dan',
        category: 'dance-with-parents',
        categoryLabel: 'Dance with Parents',
        title: 'Emotional Father-Daughter Waltz',
        likes: 47,
        isLiked: false,
        time: '1h 10m ago',
    },
    {
        id: 7,
        type: 'video',
        duration: '1:05',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-EbfHxr0P6GL_iucEctw5mslqfrga9bIbAjvrYlYwBOFkBiHyF3G79f3rP3hPZ14Za8yR7ORgzGVH1-rH8hKNANpgBe0B_f6wTVwkC3rMXsMrciWu08_cZFAdCJcQSz-A_UgWcaqR-QYT5CetkjIIxOZstdE0fsfDrnaQnU6n_S0TnVpmSrApRCTJvyjK2M2bFkBeqFMhugW9d8ULHxxHe-Z3NBgKKypAgRK-MyDRMblqZDIgWr8i',
        guest: 'Leo P.',
        category: 'grooms-surprise',
        categoryLabel: "Groom's Surprise",
        title: 'Acoustic Serenade for Jenny',
        likes: 62,
        isLiked: false,
        time: '1h 30m ago',
    },
    {
        id: 8,
        type: 'photo',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXt6iEJ7zx1A92yJ8Z4cWy0VB_fpqJJTJfz9hlDaOsu2TvG_jv3ku3oFOKVrIpneZWhhO6B7uvw8cXnEsjoRxD9t1dmKg6C_-_rZZtJplFnul9SL9Ti7L81Q3jJdVByiR7FsZ9qFhXY8VgT1SXD-BSb6N54lxSULC9VZFAOQhd4u3YlyexajQjFwoAbQXrPWANmSknSxFtz4CpH9BRhr5yLQTuVpewyldWjw6chJy8FN1bNEeEsTlL',
        guest: 'Auntie Mei',
        category: 'cake-cutting',
        categoryLabel: 'Cake Cutting',
        title: 'First Ceremonial Slice & Champagne Toast',
        likes: 38,
        isLiked: false,
        time: '1h 45m ago',
    },
    {
        id: 9,
        type: 'video',
        duration: '0:38',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuUbZaTZEcqUh00IvjbfPlZynuCpVetBp1d92wSL0R25w4K-78iqLE6bi8zHoWCrgoR78ENfFpTjT1uGMTpmeeWp9EGq3Qz8chEUVCBUT63DjJMPtm2q02RST9KT6LGmHcJeKzUAXFIOEKlqg3NGaAgYorHr6gqojzEeLun_scgguqs8aJI2Dn34ka_nIzCq9NzdAlKane_2Q673FyL-geAkvzUWP-oXpQVLQ0S00TIebtdxJfeZmU',
        guest: 'Maid of Honor Liv',
        category: 'brides-surprise',
        categoryLabel: "Bride's Surprise",
        title: 'Jenny & Bridesmaids Flash Dance',
        likes: 51,
        isLiked: false,
        time: '2h ago',
    },
    {
        id: 10,
        type: 'photo',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvH8vi6MylRh6RvDOssw2eo3Dtg8nfcWtM8YcE6GzUcdLhmtxC0BgsSiGv6jagPlKH49bmfL0ywklwhMUX8_FStwpgAo7In5Qhz5EUfcdl2g8uPH7MwzlO73eR7Up6ia0O6Ue_UCoLMwYrxrXGnkxkZYMlxPVVPIcgwUwPotYOXbNiHLmUbqthXtI9E5ButkD170XX13o0gMQhsr_t1j-st3C0QgwTQbrgLAWrFVkyHt5n4Ffuh_L8',
        guest: 'Cousin Nick',
        category: 'performances',
        categoryLabel: 'Performances',
        title: 'Live Brass Band Reception Finale',
        likes: 33,
        isLiked: false,
        time: '2h 15m ago',
    },
    {
        id: 11,
        type: 'photo',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_b45E9YjZPsE9FZqujCSRNTm6TpITBwM_TaJFgapEZqnACNNwtSVVLegXCWrGpfncDgbRxwks7l8wtobmCfqQkFQv34yOtgKuuNCrqjBvvgccMhT42aq0aHWZnTM-_kf98W7MIzPhbJg7cCIGS2Qy3CEH8ggjzWg0aUNB4Le6KuNEtqtn-DZAcxxNxm62OShpMnoE5uH6Kye6WAxV9WCfQwoP8bbVduYvD1BF5SQjqaIMfsDR8GxI',
        guest: 'Jessica K.',
        category: 'couple-message',
        categoryLabel: "Couple's Message",
        title: 'Thank You Message to All Guests',
        likes: 44,
        isLiked: false,
        time: '2h 30m ago',
    },
])

// Total moments count calculation
const totalMomentsCount = computed(() => {
    return 137 + mediaItems.value.length
})

// Filtered and sorted media stream
const filteredMedia = computed(() => {
    let list = mediaItems.value
    if (selectedCategory.value !== 'all') {
        list = list.filter((item) => item.category === selectedCategory.value)
    }
    if (sortBy.value === 'loved') {
        return [...list].sort((a, b) => b.likes - a.likes)
    }
    return list
})

// File Upload & Toast state
const fileInput = ref(null)
const isUploading = ref(false)

const toggleLike = (item, event) => {
    if (event) event.stopPropagation()
    item.isLiked = !item.isLiked
    if (item.isLiked) {
        item.likes += 1
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(20)
        }
    } else {
        item.likes = Math.max(0, item.likes - 1)
    }
}

const toggleSort = () => {
    sortBy.value = sortBy.value === 'recent' ? 'loved' : 'recent'
}

const triggerFileUpload = () => {
    if (fileInput.value) {
        fileInput.value.click()
    }
}

const handleFileUpload = (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    isUploading.value = true
    const fileCount = files.length

    setTimeout(() => {
        for (let i = 0; i < fileCount; i++) {
            const file = files[i]
            const isVideo = file.type.startsWith('video')
            const fakeUrl = URL.createObjectURL(file)

            mediaItems.value.unshift({
                id: Date.now() + i,
                type: isVideo ? 'video' : 'photo',
                duration: isVideo ? '0:20' : null,
                url: fakeUrl,
                guest: 'You',
                category: selectedCategory.value !== 'all' ? selectedCategory.value : 'guests-laughing',
                categoryLabel: selectedCategory.value !== 'all'
                    ? (categories.find((c) => c.id === selectedCategory.value)?.label || 'Candid')
                    : 'Live Candid',
                title: 'Fresh Moment from Reception',
                likes: 1,
                isLiked: true,
                time: 'Just now',
            })
        }
        isUploading.value = false
        e.target.value = ''
    }, 1300)
}

// Fullscreen Lightbox & Swipe Carousel State
const isLightboxOpen = ref(false)
const activeLightboxIndex = ref(0)
const dragOffset = ref(0)
const isDragging = ref(false)

const activeLightbox = computed(() => {
    if (!isLightboxOpen.value || filteredMedia.value.length === 0) return null
    return filteredMedia.value[activeLightboxIndex.value] || null
})

const openLightbox = (item) => {
    const idx = filteredMedia.value.findIndex((m) => m.id === item.id)
    activeLightboxIndex.value = idx !== -1 ? idx : 0
    dragOffset.value = 0
    isLightboxOpen.value = true
}

const closeLightbox = () => {
    isLightboxOpen.value = false
    dragOffset.value = 0
}

const nextPhoto = () => {
    if (filteredMedia.value.length === 0) return
    activeLightboxIndex.value = (activeLightboxIndex.value + 1) % filteredMedia.value.length
    dragOffset.value = 0
}

const prevPhoto = () => {
    if (filteredMedia.value.length === 0) return
    activeLightboxIndex.value =
        (activeLightboxIndex.value - 1 + filteredMedia.value.length) % filteredMedia.value.length
    dragOffset.value = 0
}

// Touch swipe gesture handling
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

    // If moving horizontally more than vertically, track drag
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
            nextPhoto() // Swiped left -> Next
        } else {
            prevPhoto() // Swiped right -> Previous
        }
    } else {
        dragOffset.value = 0
    }
}

// Mouse drag swipe support for desktop
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
    if (!isLightboxOpen.value) return
    if (e.key === 'ArrowRight') {
        nextPhoto()
    } else if (e.key === 'ArrowLeft') {
        prevPhoto()
    } else if (e.key === 'Escape') {
        closeLightbox()
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown)
})

// Navigation helpers
const navigateToCapture = () => {
    const eventId = route.params.id || 'keann-and-jenny'
    router.push(`/event/${eventId}/quests`)
}

const navigateToWelcome = () => {
    const eventId = route.params.id || 'keann-and-jenny'
    router.push(`/event/${eventId}`)
}
</script>

<template>
    <div class="vault-page-root">
        <!-- Toast Notification -->
        <div class="vault-toast" :class="{ 'is-visible': toast.show }">
            <div class="vault-toast__inner">
                <span class="material-symbols-outlined vault-toast__icon"
                    style="font-variation-settings: 'FILL' 1;">sparkles</span>
                <span class="vault-toast__text">{{ toast.message }}</span>
            </div>
        </div>

        <!-- Hidden Native File Upload Input -->
        <input id="fileUploadInput" ref="fileInput" accept="image/*,video/*" multiple style="display: none;" type="file"
            @change="handleFileUpload">

        <!-- Main Content Area: Zero top padding, hero flush to top -->
        <main class="vault-main">
            <!-- Hero Cover Banner & Couple Header -->
            <section class="vault-hero">
                <div class="vault-hero__banner">
                    <div class="vault-hero__bg"
                        :style="{ backgroundImage: `url(${currentWedding.heroImage})`, backgroundPosition: `0 -90px` }">
                    </div>

                    <!-- Soft Gradients Scrim -->
                    <div class="vault-hero__scrim-top"></div>
                    <div class="vault-hero__scrim-bottom"></div>

                    <!-- Banner Content Overlay -->
                    <div class="vault-hero__content">
                        <div class="vault-hero__eyebrow">
                            <span class="vault-hero__eyebrow-dot"></span>
                            <span class="vault-hero__eyebrow-text">The Wedding of</span>
                            <span class="vault-hero__eyebrow-dot"></span>
                        </div>
                        <h1 class="vault-hero__title">{{ currentWedding.couple }}</h1>
                    </div>
                </div>
            </section>

            <!-- Content Sheet Overlay (Slides over sticky hero) -->
            <div class="vault-content">
                <!-- Filter & Sort Navigation with "All" as first tab -->
                <section class="vault-filter-section">
                    <div class="vault-filter-header">
                        <span class="vault-filter-count">
                        </span>
                        <button id="sortToggleBtn" class="vault-sort-toggle" type="button" @click="toggleSort">
                            <span class="material-symbols-outlined">sort</span>
                            <span>{{ sortBy === 'recent' ? 'Recent' : 'Most Loved' }}</span>
                        </button>
                    </div>

                    <div class="vault-filter-scroll">
                        <button v-for="cat in categories" :key="cat.id" class="vault-filter-chip"
                            :class="selectedCategory === cat.id ? 'vault-filter-chip--active' : 'vault-filter-chip--inactive'"
                            type="button" @click="selectedCategory = cat.id">
                            {{ cat.id === 'all' ? `All (${totalMomentsCount})` : cat.label }}
                        </button>
                    </div>
                </section>

                <!-- Guest Media Feed Grid -->
                <section class="vault-feed-section">
                    <div v-if="filteredMedia.length > 0" class="vault-grid">
                        <div v-for="item in filteredMedia" :key="item.id" class="vault-card"
                            @click="openLightbox(item)">
                            <!-- Media Image (100% full bleed, zero padding) -->
                            <img :alt="item.title" class="vault-card__image" loading="lazy" :src="item.url">

                            <!-- Gradient Scrim -->
                            <div class="vault-card__scrim"></div>

                            <!-- Video Duration / Play Badge -->
                            <div v-if="item.type === 'video'" class="vault-card__video-badge">
                                <span class="material-symbols-outlined">play_arrow</span>
                                <span class="vault-card__video-duration">{{ item.duration }}</span>
                            </div>

                            <!-- Like Button -->
                            <button aria-label="Like moment" class="vault-card__like-btn"
                                :class="{ 'is-liked': item.isLiked }" type="button"
                                @click.stop="toggleLike(item, $event)">
                                <span class="material-symbols-outlined vault-card__like-icon">favorite</span>
                                <span class="vault-card__like-count">{{ item.likes }}</span>
                            </button>

                            <!-- Guest Name Overlay Badge -->
                            <div class="vault-card__guest-badge">
                                <span class="vault-card__guest-dot"></span>
                                <span class="vault-card__guest-name">{{ item.guest }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Empty State if no moments match filter -->
                    <div v-else class="vault-empty">
                        <span class="material-symbols-outlined vault-empty__icon">photo_library</span>
                        <h2 class="vault-empty__title">No moments in this category yet</h2>
                        <p class="vault-empty__desc">
                            Be the first guest to drop a candid photo or video for this moment!
                        </p>
                        <button class="vault-empty__btn" type="button" @click="triggerFileUpload">
                            <span class="material-symbols-outlined">add_a_photo</span>
                            <span>Drop First Photo</span>
                        </button>
                    </div>
                </section>
            </div>
        </main>

        <!-- Bottom Navigation Bar -->
        <nav class="vault-bottom-nav" data-active-classes="text-primary font-semibold">
            <div class="vault-bottom-nav__inner">
                <!-- Capture Tab: Inactive (routes to quests) -->
                <a aria-label="Navigate to Photo Checklist & Capture" class="vault-bottom-nav__item is-inactive"
                    href="#" @click.prevent="navigateToCapture">
                    <span class="material-symbols-outlined vault-bottom-nav__icon">photo_camera</span>
                    <span class="vault-bottom-nav__label">Capture</span>
                </a>

                <!-- Live Vault Tab: Active -->
                <a aria-current="page" aria-label="Active page: Live Vault" class="vault-bottom-nav__item is-active"
                    href="#" @click.prevent>
                    <span class="material-symbols-outlined vault-bottom-nav__icon">photo_library</span>
                    <span class="vault-bottom-nav__label">Live Vault</span>
                </a>
            </div>
        </nav>

        <!-- Fullscreen Lightbox Modal with Touch Swipe & Drag Carousel -->
        <teleport to="body">
            <div v-if="isLightboxOpen && activeLightbox" class="vault-lightbox" @click="closeLightbox">
                <!-- Lightbox Header -->
                <header class="vault-lightbox__header" @click.stop>
                    <div class="vault-lightbox__user">
                        <span class="vault-lightbox__dot"></span>
                        <div>
                            <div class="vault-lightbox__author">Captured by {{ activeLightbox.guest }}</div>
                            <div class="vault-lightbox__meta-row">
                                <span class="vault-lightbox__time">{{ activeLightbox.time }}</span>
                                <span class="vault-lightbox__counter">
                                    ({{ activeLightboxIndex + 1 }} of {{ filteredMedia.length }})
                                </span>
                            </div>
                        </div>
                    </div>
                    <button aria-label="Close Lightbox" class="vault-lightbox__close" type="button"
                        @click="closeLightbox">
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
                        <img :alt="activeLightbox.title" class="vault-lightbox__media" :src="activeLightbox.url">
                    </div>

                    <!-- Swipe guidance pill -->
                    <div class="vault-lightbox__swipe-hint">
                        <span class="material-symbols-outlined">swipe</span>
                        <span>Swipe left or right</span>
                    </div>
                </div>

                <!-- Lightbox Footer -->
                <footer class="vault-lightbox__footer" @click.stop>
                    <div class="vault-lightbox__caption">
                        <span class="vault-lightbox__category">{{ activeLightbox.categoryLabel }}</span>
                        <h3 class="vault-lightbox__title">{{ activeLightbox.title }}</h3>
                    </div>

                    <div class="vault-lightbox__actions">
                        <button class="vault-lightbox__like-btn" :class="{ 'is-liked': activeLightbox.isLiked }"
                            type="button" @click="toggleLike(activeLightbox, $event)">
                            <span class="material-symbols-outlined">favorite</span>
                            <span>{{ activeLightbox.likes }}</span>
                        </button>
                    </div>
                </footer>
            </div>
        </teleport>
    </div>
</template>
