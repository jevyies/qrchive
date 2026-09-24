<route lang="yaml">
meta:
  layout: blank
  public: true
</route>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWebSocket } from '@vueuse/core'
import { axiosInstance, API_BASE_URL } from '@/plugins/axios'
import { UploadQueue } from '@/utils/uploadQueue.js'
import { getAllDemoPhotos, saveDemoQuickPhoto, saveDemoChecklistMoment } from '@/utils/demoDb'
import keannAndJennyBg from '@/assets/images/keann-and-jenny.jpg'
import LightBox from '@/views/LightBox.vue'

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

const isDemo = computed(() => {
    const id = String(route.params.id || '').toLowerCase().trim()
    return id === 'demo-event' || (route.path && route.path.includes('demo-event'))
})

// Sample demo categories used when route.params.id === 'demo-event'
const demoCategories = [
    { id: 'all', label: 'All' },
    { id: 'quick-capture', label: 'Quick Captures' },
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

// Helper: Read checklist items from localStorage ('currentCheckList' -> list)
function loadChecklistFromStorage() {
    if (typeof localStorage === 'undefined') return []
    try {
        const raw = localStorage.getItem('currentCheckList') || localStorage.getItem('currentChecklist')
        if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) return parsed
            if (parsed && Array.isArray(parsed.list)) {
                return parsed.list
            }
        }
    } catch (err) {
        console.warn('[LiveVault] Error reading checklist from localStorage:', err)
    }
    return []
}

// Dynamic checklist list loaded from localStorage or fetched from API
const dynamicChecklist = ref(loadChecklistFromStorage())

// Helper: Extract category key from photo URLs (e.g. 'quick-snaps' or checklist ID '5' from 55deea6d/2d837d1b/5/)
function extractPhotoCategoryKey(item) {
    if (!item) return null

    const urls = [item.thumbnailUrl, item.fullUrl, item.url].filter(Boolean)

    for (const rawUrl of urls) {
        if (typeof rawUrl !== 'string') continue

        // Quick snaps check (e.g. 55deea6d/2d837d1b/quick-snaps)
        if (rawUrl.includes('quick-snaps')) {
            return 'quick-snaps'
        }

        // Pattern 1: .../events/<eventCode>/<guestCode>/<folder>/...
        const eventsMatch = rawUrl.match(/events\/[^\/]+\/[^\/]+\/([^\/]+)\//)
        if (eventsMatch && eventsMatch[1]) {
            return eventsMatch[1]
        }

        // Pattern 2: .../<eventCode>/<guestCode>/<folder>/<fileName>
        const genericMatch = rawUrl.match(/\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\/([^\/]+)\/[^\/]+$/)
        if (genericMatch && genericMatch[3]) {
            return genericMatch[3]
        }

        // Pattern 3: direct slice <eventCode>/<guestCode>/<checklistId>/ (e.g. 55deea6d/2d837d1b/5/)
        const sliceMatch = rawUrl.match(/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\/([0-9]+)(\/|$)/)
        if (sliceMatch && sliceMatch[3]) {
            return sliceMatch[3]
        }
    }

    // Direct checklistId fallback if present from API
    if (item.checklistId !== null && item.checklistId !== undefined) {
        return String(item.checklistId)
    }

    return null
}

// Categories: demoCategories if demo-event; otherwise All, Quick Capture, and checklist items
const categories = computed(() => {
    if (isDemo.value) {
        return demoCategories
    }

    const tabs = [
        { id: 'all', label: 'All' },
        { id: 'quick-capture', label: 'Quick Capture' },
    ]

    if (Array.isArray(dynamicChecklist.value)) {
        dynamicChecklist.value.forEach((item) => {
            tabs.push({
                id: String(item.id),
                label: item.name || item.title || `Moment ${item.id}`,
                checklistId: item.id,
            })
        })
    }

    return tabs
})

const selectedCategory = ref('all')
const sortBy = ref('recent') // 'recent' | 'loved'

// Demo data used when route.params.id === 'demo-event'
const demoMediaItems = [
    {
        id: 1,
        type: 'video',
        duration: '0:45',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvH8vi6MylRh6RvDOssw2eo3Dtg8nfcWtM8YcE6GzUcdLhmtxC0BgsSiGv6jagPlKH49bmfL0ywklwhMUX8_FStwpgAo7In5Qhz5EUfcdl2g8uPH7MwzlO73eR7Up6ia0O6Ue_UCoLMwYrxrXGnkxkZYMlxPVVPIcgwUwPotYOXbNiHLmUbqthXtI9E5ButkD170XX13o0gMQhsr_t1j-st3C0QgwTQbrgLAWrFVkyHt5n4Ffuh_L8',
        thumbnailUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvH8vi6MylRh6RvDOssw2eo3Dtg8nfcWtM8YcE6GzUcdLhmtxC0BgsSiGv6jagPlKH49bmfL0ywklwhMUX8_FStwpgAo7In5Qhz5EUfcdl2g8uPH7MwzlO73eR7Up6ia0O6Ue_UCoLMwYrxrXGnkxkZYMlxPVVPIcgwUwPotYOXbNiHLmUbqthXtI9E5ButkD170XX13o0gMQhsr_t1j-st3C0QgwTQbrgLAWrFVkyHt5n4Ffuh_L8',
        fullUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvH8vi6MylRh6RvDOssw2eo3Dtg8nfcWtM8YcE6GzUcdLhmtxC0BgsSiGv6jagPlKH49bmfL0ywklwhMUX8_FStwpgAo7In5Qhz5EUfcdl2g8uPH7MwzlO73eR7Up6ia0O6Ue_UCoLMwYrxrXGnkxkZYMlxPVVPIcgwUwPotYOXbNiHLmUbqthXtI9E5ButkD170XX13o0gMQhsr_t1j-st3C0QgwTQbrgLAWrFVkyHt5n4Ffuh_L8',
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
        thumbnailUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXt6iEJ7zx1A92yJ8Z4cWy0VB_fpqJJTJfz9hlDaOsu2TvG_jv3ku3oFOKVrIpneZWhhO6B7uvw8cXnEsjoRxD9t1dmKg6C_-_rZZtJplFnul9SL9Ti7L81Q3jJdVByiR7FsZ9qFhXY8VgT1SXD-BSb6N54lxSULC9VZFAOQhd4u3YlyexajQjFwoAbQXrPWANmSknSxFtz4CpH9BRhr5yLQTuVpewyldWjw6chJy8FN1bNEeEsTlL',
        fullUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXt6iEJ7zx1A92yJ8Z4cWy0VB_fpqJJTJfz9hlDaOsu2TvG_jv3ku3oFOKVrIpneZWhhO6B7uvw8cXnEsjoRxD9t1dmKg6C_-_rZZtJplFnul9SL9Ti7L81Q3jJdVByiR7FsZ9qFhXY8VgT1SXD-BSb6N54lxSULC9VZFAOQhd4u3YlyexajQjFwoAbQXrPWANmSknSxFtz4CpH9BRhr5yLQTuVpewyldWjw6chJy8FN1bNEeEsTlL',
        guest: 'Marcus C.',
        category: 'guests-laughing',
        categoryLabel: 'Guests Laughing',
        title: 'Table 7 Toasting & Laughter',
        likes: 28,
        isLiked: false,
        time: '25m ago',
    },
    {
        id: 4,
        type: 'video',
        duration: '0:18',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuUbZaTZEcqUh00IvjbfPlZynuCpVetBp1d92wSL0R25w4K-78iqLE6bi8zHoWCrgoR78ENfFpTjT1uGMTpmeeWp9EGq3Qz8chEUVCBUT63DjJMPtm2q02RST9KT6LGmHcJeKzUAXFIOEKlqg3NGaAgYorHr6gqojzEeLun_scgguqs8aJI2Dn34ka_nIzCq9NzdAlKane_2Q673FyL-geAkvzUWP-oXpQVLQ0S00TIebtdxJfeZmU',
        thumbnailUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuUbZaTZEcqUh00IvjbfPlZynuCpVetBp1d92wSL0R25w4K-78iqLE6bi8zHoWCrgoR78ENfFpTjT1uGMTpmeeWp9EGq3Qz8chEUVCBUT63DjJMPtm2q02RST9KT6LGmHcJeKzUAXFIOEKlqg3NGaAgYorHr6gqojzEeLun_scgguqs8aJI2Dn34ka_nIzCq9NzdAlKane_2Q673FyL-geAkvzUWP-oXpQVLQ0S00TIebtdxJfeZmU',
        fullUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuUbZaTZEcqUh00IvjbfPlZynuCpVetBp1d92wSL0R25w4K-78iqLE6bi8zHoWCrgoR78ENfFpTjT1uGMTpmeeWp9EGq3Qz8chEUVCBUT63DjJMPtm2q02RST9KT6LGmHcJeKzUAXFIOEKlqg3NGaAgYorHr6gqojzEeLun_scgguqs8aJI2Dn34ka_nIzCq9NzdAlKane_2Q673FyL-geAkvzUWP-oXpQVLQ0S00TIebtdxJfeZmU',
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
        thumbnailUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_b45E9YjZPsE9FZqujCSRNTm6TpITBwM_TaJFgapEZqnACNNwtSVVLegXCWrGpfncDgbRxwks7l8wtobmCfqQkFQv34yOtgKuuNCrqjBvvgccMhT42aq0aHWZnTM-_kf98W7MIzPhbJg7cCIGS2Qy3CEH8ggjzWg0aUNB4Le6KuNEtqtn-DZAcxxNxm62OShpMnoE5uH6Kye6WAxV9WCfQwoP8bbVduYvD1BF5SQjqaIMfsDR8GxI',
        fullUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_b45E9YjZPsE9FZqujCSRNTm6TpITBwM_TaJFgapEZqnACNNwtSVVLegXCWrGpfncDgbRxwks7l8wtobmCfqQkFQv34yOtgKuuNCrqjBvvgccMhT42aq0aHWZnTM-_kf98W7MIzPhbJg7cCIGS2Qy3CEH8ggjzWg0aUNB4Le6KuNEtqtn-DZAcxxNxm62OShpMnoE5uH6Kye6WAxV9WCfQwoP8bbVduYvD1BF5SQjqaIMfsDR8GxI',
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
        thumbnailUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtugc2oDwyayarlJO8IfY0KvJE1t-Txs0OEHZIUXi0H29kBMKoVaHtrvXCg_u6ZTSk4htGJYBiWIv9oXQHWmHhBObhhwNp8IiGEZFLrWIjQAN6Dbjg4lq2CknxKewu2RidFIQaLD83ZtDjl8GOmewe9pBnqX_XoFRUNj0nEFWV3atRIeQroa2FQ44na1TzF-KDKTxmI_e-FdlJla9GpGDqzMj7G52Y8JjxXo1RK5-WSqdqhEhPAd7w',
        fullUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAtugc2oDwyayarlJO8IfY0KvJE1t-Txs0OEHZIUXi0H29kBMKoVaHtrvXCg_u6ZTSk4htGJYBiWIv9oXQHWmHhBObhhwNp8IiGEZFLrWIjQAN6Dbjg4lq2CknxKewu2RidFIQaLD83ZtDjl8GOmewe9pBnqX_XoFRUNj0nEFWV3atRIeQroa2FQ44na1TzF-KDKTxmI_e-FdlJla9GpGDqzMj7G52Y8JjxXo1RK5-WSqdqhEhPAd7w',
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
        thumbnailUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-EbfHxr0P6GL_iucEctw5mslqfrga9bIbAjvrYlYwBOFkBiHyF3G79f3rP3hPZ14Za8yR7ORgzGVH1-rH8hKNANpgBe0B_f6wTVwkC3rMXsMrciWu08_cZFAdCJcQSz-A_UgWcaqR-QYT5CetkjIIxOZstdE0fsfDrnaQnU6n_S0TnVpmSrApRCTJvyjK2M2bFkBeqFMhugW9d8ULHxxHe-Z3NBgKKypAgRK-MyDRMblqZDIgWr8i',
        fullUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-EbfHxr0P6GL_iucEctw5mslqfrga9bIbAjvrYlYwBOFkBiHyF3G79f3rP3hPZ14Za8yR7ORgzGVH1-rH8hKNANpgBe0B_f6wTVwkC3rMXsMrciWu08_cZFAdCJcQSz-A_UgWcaqR-QYT5CetkjIIxOZstdE0fsfDrnaQnU6n_S0TnVpmSrApRCTJvyjK2M2bFkBeqFMhugW9d8ULHxxHe-Z3NBgKKypAgRK-MyDRMblqZDIgWr8i',
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
        thumbnailUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXt6iEJ7zx1A92yJ8Z4cWy0VB_fpqJJTJfz9hlDaOsu2TvG_jv3ku3oFOKVrIpneZWhhO6B7uvw8cXnEsjoRxD9t1dmKg6C_-_rZZtJplFnul9SL9Ti7L81Q3jJdVByiR7FsZ9qFhXY8VgT1SXD-BSb6N54lxSULC9VZFAOQhd4u3YlyexajQjFwoAbQXrPWANmSknSxFtz4CpH9BRhr5yLQTuVpewyldWjw6chJy8FN1bNEeEsTlL',
        fullUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXt6iEJ7zx1A92yJ8Z4cWy0VB_fpqJJTJfz9hlDaOsu2TvG_jv3ku3oFOKVrIpneZWhhO6B7uvw8cXnEsjoRxD9t1dmKg6C_-_rZZtJplFnul9SL9Ti7L81Q3jJdVByiR7FsZ9qFhXY8VgT1SXD-BSb6N54lxSULC9VZFAOQhd4u3YlyexajQjFwoAbQXrPWANmSknSxFtz4CpH9BRhr5yLQTuVpewyldWjw6chJy8FN1bNEeEsTlL',
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
        thumbnailUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuUbZaTZEcqUh00IvjbfPlZynuCpVetBp1d92wSL0R25w4K-78iqLE6bi8zHoWCrgoR78ENfFpTjT1uGMTpmeeWp9EGq3Qz8chEUVCBUT63DjJMPtm2q02RST9KT6LGmHcJeKzUAXFIOEKlqg3NGaAgYorHr6gqojzEeLun_scgguqs8aJI2Dn34ka_nIzCq9NzdAlKane_2Q673FyL-geAkvzUWP-oXpQVLQ0S00TIebtdxJfeZmU',
        fullUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAuUbZaTZEcqUh00IvjbfPlZynuCpVetBp1d92wSL0R25w4K-78iqLE6bi8zHoWCrgoR78ENfFpTjT1uGMTpmeeWp9EGq3Qz8chEUVCBUT63DjJMPtm2q02RST9KT6LGmHcJeKzUAXFIOEKlqg3NGaAgYorHr6gqojzEeLun_scgguqs8aJI2Dn34ka_nIzCq9NzdAlKane_2Q673FyL-geAkvzUWP-oXpQVLQ0S00TIebtdxJfeZmU',
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
        thumbnailUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvH8vi6MylRh6RvDOssw2eo3Dtg8nfcWtM8YcE6GzUcdLhmtxC0BgsSiGv6jagPlKH49bmfL0ywklwhMUX8_FStwpgAo7In5Qhz5EUfcdl2g8uPH7MwzlO73eR7Up6ia0O6Ue_UCoLMwYrxrXGnkxkZYMlxPVVPIcgwUwPotYOXbNiHLmUbqthXtI9E5ButkD170XX13o0gMQhsr_t1j-st3C0QgwTQbrgLAWrFVkyHt5n4Ffuh_L8',
        fullUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvH8vi6MylRh6RvDOssw2eo3Dtg8nfcWtM8YcE6GzUcdLhmtxC0BgsSiGv6jagPlKH49bmfL0ywklwhMUX8_FStwpgAo7In5Qhz5EUfcdl2g8uPH7MwzlO73eR7Up6ia0O6Ue_UCoLMwYrxrXGnkxkZYMlxPVVPIcgwUwPotYOXbNiHLmUbqthXtI9E5ButkD170XX13o0gMQhsr_t1j-st3C0QgwTQbrgLAWrFVkyHt5n4Ffuh_L8',
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
        thumbnailUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_b45E9YjZPsE9FZqujCSRNTm6TpITBwM_TaJFgapEZqnACNNwtSVVLegXCWrGpfncDgbRxwks7l8wtobmCfqQkFQv34yOtgKuuNCrqjBvvgccMhT42aq0aHWZnTM-_kf98W7MIzPhbJg7cCIGS2Qy3CEH8ggjzWg0aUNB4Le6KuNEtqtn-DZAcxxNxm62OShpMnoE5uH6Kye6WAxV9WCfQwoP8bbVduYvD1BF5SQjqaIMfsDR8GxI',
        fullUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_b45E9YjZPsE9FZqujCSRNTm6TpITBwM_TaJFgapEZqnACNNwtSVVLegXCWrGpfncDgbRxwks7l8wtobmCfqQkFQv34yOtgKuuNCrqjBvvgccMhT42aq0aHWZnTM-_kf98W7MIzPhbJg7cCIGS2Qy3CEH8ggjzWg0aUNB4Le6KuNEtqtn-DZAcxxNxm62OShpMnoE5uH6Kye6WAxV9WCfQwoP8bbVduYvD1BF5SQjqaIMfsDR8GxI',
        guest: 'Jessica K.',
        category: 'couple-message',
        categoryLabel: "Couple's Message",
        title: 'Thank You Message to All Guests',
        likes: 44,
        isLiked: false,
        time: '2h 30m ago',
    },
]

const mediaItems = ref(isDemo.value ? [...demoMediaItems] : [])

// Pagination & Loading State
const currentPage = ref(1)
const totalPhotos = ref(0)
const hasMore = ref(false)
const isLoadingPhotos = ref(false)
const isLoadingMore = ref(false)

// Helper: Guest identifier for like tracking
function getGuestIdentifier() {
    if (typeof localStorage === 'undefined') return 'anonymous'
    const stored = localStorage.getItem('currentEvent')
    if (stored) {
        try {
            const parsed = JSON.parse(stored)
            if (parsed?.guestCode) return String(parsed.guestCode)
            if (parsed?.guestId) return String(parsed.guestId)
        } catch { }
    }
    const directCode = localStorage.getItem('qrchive_guest_code')
    if (directCode) return String(directCode)

    let deviceId = localStorage.getItem('qrchive_device_id')
    if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 12)
        localStorage.setItem('qrchive_device_id', deviceId)
    }
    return deviceId
}

// Helper: Format relative timestamp
function formatRelativeTime(dateInput) {
    if (!dateInput) return 'Just now'
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) return 'Just now'
    const diffMs = Date.now() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 60) return 'Just now'
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
}

// Helper: Transform API / WebSocket photo to live vault media item
function mapPhotoToMediaItem(photo) {
    const rawThumb = photo.thumbnailUrl || photo.url || ''
    const rawFull = photo.fullUrl || photo.url || ''
    const likesCount = Number(photo.likesCount ?? photo.likes ?? 0)

    const catKey = extractPhotoCategoryKey({
        thumbnailUrl: rawThumb,
        fullUrl: rawFull,
        url: rawThumb || rawFull,
        checklistId: photo.checklistId ?? null,
    })

    let category = 'all'
    let categoryLabel = 'Reception'

    if (catKey === 'quick-snaps') {
        category = 'quick-capture'
        categoryLabel = 'Quick Capture'
    } else if (catKey) {
        category = String(catKey)
        const matched = dynamicChecklist.value.find((c) => String(c.id) === String(catKey))
        categoryLabel = matched?.name || `Quest ${catKey}`
    } else if (photo.checklistId) {
        category = String(photo.checklistId)
        const matched = dynamicChecklist.value.find((c) => String(c.id) === String(photo.checklistId))
        categoryLabel = matched?.name || `Quest ${photo.checklistId}`
    }

    return {
        id: photo.id,
        type: photo.mimeType?.startsWith('video/') ? 'video' : 'photo',
        thumbnailUrl: rawThumb,
        fullUrl: rawFull,
        url: rawThumb || rawFull,
        guest: photo.uploadedBy || 'Guest',
        checklistId: photo.checklistId ?? null,
        category,
        categoryLabel,
        title: photo.fileName ? `Photo: ${photo.fileName}` : `Moment by ${photo.uploadedBy || 'Guest'}`,
        likes: likesCount,
        likesCount: likesCount,
        isLiked: Boolean(photo.isLiked),
        time: formatRelativeTime(photo.createdAt),
        createdAt: photo.createdAt,
    }
}

// Fetch photos from backend with 10 photos per page descending by createdAt
const fetchPhotos = async (page = 1, append = false) => {
    if (isDemo.value) return

    if (append) {
        isLoadingMore.value = true
    } else {
        isLoadingPhotos.value = true
    }

    try {
        const eventId = route.params.id
        const userIdentifier = getGuestIdentifier()
        const { data } = await axiosInstance.get(`/api/photos/events/${eventId}`, {
            params: {
                page,
                limit: 10,
                userIdentifier,
            },
        })

        const photosList = Array.isArray(data) ? data : data?.photos || []
        const mapped = photosList.map(mapPhotoToMediaItem)

        if (append) {
            const existingIds = new Set(mediaItems.value.map((m) => m.id))
            const newOnes = mapped.filter((m) => !existingIds.has(m.id))
            mediaItems.value.push(...newOnes)
        } else {
            mediaItems.value = mapped
        }

        currentPage.value = page
        totalPhotos.value = data?.total ?? mediaItems.value.length
        hasMore.value = Boolean(data?.hasMore ?? (currentPage.value * 10 < totalPhotos.value))
    } catch (err) {
        console.error('[LiveVault] Failed to fetch event photos:', err)
    } finally {
        isLoadingPhotos.value = false
        isLoadingMore.value = false
    }
}

const loadMorePhotos = () => {
    if (!hasMore.value || isLoadingMore.value) return
    fetchPhotos(currentPage.value + 1, true)
}

// WebSocket Connection (Only active when route.params.id !== 'demo-event' and only in this page)
const wsUrl = computed(() => {
    if (isDemo.value) return ''
    const base = API_BASE_URL.replace(/^http/, 'ws')
    return `${base}/api/photos/ws/${route.params.id}`
})

const { status: wsStatus, open: openWs, close: closeWs } = useWebSocket(wsUrl, {
    immediate: false,
    autoReconnect: {
        retries: 5,
        delay: 2000,
    },
    onMessage: (ws, event) => {
        handleWebSocketMessage(event.data)
    },
})

function handleWebSocketMessage(raw) {
    try {
        const message = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!message) return

        if (message.type === 'new_photo' && message.photo) {
            const newPhoto = message.photo
            const exists = mediaItems.value.some((item) => item.id === newPhoto.id)
            if (!exists) {
                const mapped = mapPhotoToMediaItem(newPhoto)
                mediaItems.value.unshift(mapped)
                totalPhotos.value += 1
            }
        } else if (message.type === 'photo_liked' && message.data) {
            const { photoId, likesCount } = message.data
            const item = mediaItems.value.find((m) => m.id === photoId)
            if (item) {
                item.likes = likesCount
                item.likesCount = likesCount
            }
        }
    } catch (err) {
        console.warn('[LiveVault] Error processing WebSocket message:', err)
    }
}

// Total moments count calculation
const totalMomentsCount = computed(() => {
    if (isDemo.value) {
        return 137 + mediaItems.value.length
    }
    return totalPhotos.value || mediaItems.value.length
})

// Fetch checklist from backend if not yet in localStorage
const fetchEventChecklist = async () => {
    if (isDemo.value) return
    try {
        const eventId = route.params.id
        const { data } = await axiosInstance.get(`/api/events/${eventId}/checklist`)
        if (Array.isArray(data) && data.length > 0) {
            dynamicChecklist.value = data
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(
                    'currentCheckList',
                    JSON.stringify({ eventCode: route.params.id, list: data }),
                )
            }
        }
    } catch (err) {
        console.warn('[LiveVault] Failed to fetch event checklist for categories:', err)
    }
}

watch(
    dynamicChecklist,
    (newList) => {
        if (!Array.isArray(newList)) return
        mediaItems.value.forEach((item) => {
            const catKey = extractPhotoCategoryKey(item)
            if (catKey === 'quick-snaps') {
                item.category = 'quick-capture'
                item.categoryLabel = 'Quick Capture'
            } else if (catKey) {
                item.category = String(catKey)
                const matched = newList.find((c) => String(c.id) === String(catKey))
                if (matched && matched.name) {
                    item.categoryLabel = matched.name
                }
            }
        })
    },
    { deep: true },
)

// Filtered and sorted media stream
const filteredMedia = computed(() => {
    let list = mediaItems.value

    if (selectedCategory.value !== 'all') {
        if (isDemo.value) {
            if (selectedCategory.value === 'quick-capture') {
                list = list.filter((item) => item.category === 'quick-capture' || item.category === 'quick-snaps')
            } else {
                list = list.filter((item) => item.category === selectedCategory.value)
            }
        } else if (selectedCategory.value === 'quick-capture') {
            list = list.filter((item) => {
                const seg = extractPhotoCategoryKey(item)
                return (
                    seg === 'quick-snaps' ||
                    (item.thumbnailUrl && item.thumbnailUrl.includes('quick-snaps')) ||
                    (item.fullUrl && item.fullUrl.includes('quick-snaps')) ||
                    (item.url && item.url.includes('quick-snaps'))
                )
            })
        } else {
            const targetId = String(selectedCategory.value)
            list = list.filter((item) => {
                const seg = extractPhotoCategoryKey(item)
                if (seg && String(seg) === targetId) return true
                if (item.checklistId !== null && item.checklistId !== undefined && String(item.checklistId) === targetId) {
                    return true
                }
                const inThumb = item.thumbnailUrl && item.thumbnailUrl.includes(`/${targetId}/`)
                const inFull = item.fullUrl && item.fullUrl.includes(`/${targetId}/`)
                const inUrl = item.url && item.url.includes(`/${targetId}/`)
                return inThumb || inFull || inUrl
            })
        }
    }

    if (sortBy.value === 'loved') {
        return [...list].sort((a, b) => b.likes - a.likes)
    }
    return list
})

// File Upload & Redis Batch Queue State
const fileInput = ref(null)
const isUploading = ref(false)
const uploadBatchState = ref({
    isActive: false,
    total: 0,
    completed: 0,
    failed: 0,
    percent: 0,
    activeWorkers: 0,
    currentFileName: '',
})

const toggleLike = async (item, event) => {
    if (event) event.stopPropagation()
    if (!item) return

    // Explicitly check demo-event mode: do NOT send any like request to the backend
    const isDemoEvent =
        isDemo.value ||
        String(route.params.id || '').toLowerCase().trim() === 'demo-event' ||
        (route.path && route.path.includes('demo-event')) ||
        Boolean(item.isLocalDemo) ||
        String(item.id).startsWith('demo_')

    if (isDemoEvent) {
        item.isLiked = !item.isLiked
        const currentLikes = Number(item.likes ?? item.likesCount ?? 0)
        item.likes = item.isLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1)
        item.likesCount = item.likes

        if (item.isLiked && typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(20)
        }

        // Persist like state locally in IndexedDB if it's a locally stored demo capture
        if (item.isLocalDemo || String(item.id).startsWith('demo_')) {
            try {
                if (item.checklistId !== null && item.checklistId !== undefined) {
                    await saveDemoChecklistMoment({ ...item })
                } else {
                    await saveDemoQuickPhoto({ ...item })
                }
            } catch (err) {
                console.warn('[LiveVault] Failed to persist demo like to demoDb:', err)
            }
        }
        return
    }

    // Optimistic UI update
    const previousIsLiked = item.isLiked
    const previousLikes = item.likes
    item.isLiked = !item.isLiked
    item.likes = item.isLiked ? item.likes + 1 : Math.max(0, item.likes - 1)

    if (item.isLiked && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20)
    }

    try {
        const userIdentifier = getGuestIdentifier()
        const { data } = await axiosInstance.post(`/api/photos/${item.id}/like`, {
            userIdentifier,
        })
        if (data && typeof data.likesCount === 'number') {
            item.likes = data.likesCount
            item.likesCount = data.likesCount
            item.isLiked = data.isLiked
        }
    } catch (err) {
        console.error('[LiveVault] Failed to toggle like on photo:', err)
        // Rollback optimistic update
        item.isLiked = previousIsLiked
        item.likes = previousLikes
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

// Fullscreen Lightbox State
const isLightboxOpen = ref(false)
const activeLightboxIndex = ref(0)

const openLightbox = (item) => {
    const idx = filteredMedia.value.findIndex((m) => m.id === item.id)
    activeLightboxIndex.value = idx !== -1 ? idx : 0
    isLightboxOpen.value = true
}

const closeLightbox = () => {
    isLightboxOpen.value = false
}

// Fetch locally saved demo photos (quick snaps + checklist moments) from IndexedDB
const fetchDemoPhotos = async () => {
    try {
        const localPhotos = await getAllDemoPhotos()
        if (localPhotos && localPhotos.length > 0) {
            const mappedDemo = localPhotos.map((photo) => {
                const rawThumb = photo.thumbnailUrl || photo.image || photo.url || ''
                const rawFull = photo.fullUrl || photo.fullImage || photo.url || ''
                return {
                    id: photo.id,
                    type: 'photo',
                    thumbnailUrl: rawThumb,
                    fullUrl: rawFull,
                    url: rawThumb || rawFull,
                    guest: photo.uploadedBy || 'You',
                    checklistId: photo.checklistId ?? null,
                    category: photo.category || (photo.checklistId ? `moment-${photo.checklistId}` : 'quick-capture'),
                    categoryLabel: photo.categoryLabel || (photo.checklistId ? 'Checklist Moment' : 'Quick Capture'),
                    title: photo.title || photo.name || photo.fileName || 'Demo Capture',
                    likes: Number(photo.likes || 0),
                    likesCount: Number(photo.likes || 0),
                    isLiked: Boolean(photo.isLiked),
                    time: formatRelativeTime(photo.createdAt),
                    createdAt: photo.createdAt,
                    isLocalDemo: true,
                }
            })

            // Prepend saved demo photos so newly taken photos appear at the top
            const existingIds = new Set(mediaItems.value.map((m) => m.id))
            const newOnes = mappedDemo.filter((p) => !existingIds.has(p.id))
            mediaItems.value.unshift(...newOnes)
        }
    } catch (err) {
        console.warn('[LiveVault] Failed to load local demo photos from demoDb:', err)
    }
}

onMounted(() => {
    // If not demo-event, verify currentEvent matches route.params.id, load photos, and connect WebSocket
    const eventId = route.params.id
    if (!isDemo.value) {
        let isAuthorized = false
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('currentEvent')
            if (stored) {
                try {
                    const parsed = JSON.parse(stored)
                    if (parsed && String(parsed.eventCode) === String(eventId)) {
                        isAuthorized = true
                    }
                } catch (err) {
                    console.error('[LiveVault] Error reading currentEvent from localStorage:', err)
                }
            }
        }
        if (!isAuthorized) {
            router.replace(`/event/${eventId}`)
            return
        }

        // Load checklist for categories if needed
        if (dynamicChecklist.value.length === 0) {
            const stored = loadChecklistFromStorage()
            if (stored.length > 0) {
                dynamicChecklist.value = stored
            } else {
                fetchEventChecklist()
            }
        }

        // Fetch first 10 photos
        fetchPhotos(1, false)

        // Open WebSocket connection for this live vault session
        openWs()
    } else {
        fetchDemoPhotos()
    }
})

onBeforeUnmount(() => {
    closeWs()
})

onUnmounted(() => {
    closeWs()
})

// Navigation helpers
const navigateToCapture = () => {
    const eventId = route.params.id || 'demo-event'
    router.push(`/event/${eventId}/quests`)
}
</script>

<template>
    <div class="vault-page-root">

        <!-- Floating Redis Batch Upload Progress Banner -->
        <transition name="fade-slide">
            <div v-if="uploadBatchState.isActive" class="floating-upload-banner">
                <div class="floating-upload-banner__inner">
                    <div class="floating-upload-banner__header">
                        <div class="floating-upload-banner__title">
                            <span class="upload-pulse-dot"></span>
                            <span>Uploading {{ uploadBatchState.completed }} of {{ uploadBatchState.total }}
                                Moments</span>
                        </div>
                        <span class="floating-upload-banner__pct">{{ uploadBatchState.percent }}%</span>
                    </div>

                    <!-- Animated Progress Bar -->
                    <div class="floating-upload-banner__track">
                        <div class="floating-upload-banner__bar" :style="{ width: `${uploadBatchState.percent}%` }">
                        </div>
                    </div>

                    <div class="floating-upload-banner__footer">
                        <span class="floating-upload-banner__sub">
                            {{ uploadBatchState.activeWorkers }} active • Redis batch queue active
                        </span>
                        <span v-if="uploadBatchState.failed > 0" class="floating-upload-banner__failed">
                            {{ uploadBatchState.failed }} failed
                        </span>
                    </div>
                </div>
            </div>
        </transition>

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
                            <img :alt="item.title" class="vault-card__image" loading="lazy"
                                :src="item.thumbnailUrl || item.url"
                                @error="(e) => { if (item.fullUrl && e.target.src !== item.fullUrl) e.target.src = item.fullUrl }">

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
                    </div>

                    <!-- Load More Moments Button -->
                    <div v-if="hasMore && !isDemo" class="vault-load-more">
                        <button class="vault-load-more__btn" :disabled="isLoadingMore" type="button"
                            @click="loadMorePhotos">
                            <span v-if="isLoadingMore"
                                class="material-symbols-outlined vault-spinner">progress_activity</span>
                            <span v-else class="material-symbols-outlined">expand_more</span>
                            <span>{{ isLoadingMore ? 'Loading moments...' : 'Load More Moments' }}</span>
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

        <!-- Fullscreen Lightbox Modal Component -->
        <LightBox :is-open="isLightboxOpen" :items="filteredMedia" :initial-index="activeLightboxIndex"
            @close="closeLightbox" @like="toggleLike" />
    </div>
</template>
