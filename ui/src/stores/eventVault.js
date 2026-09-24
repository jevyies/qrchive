import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { axiosInstance, API_BASE_URL } from '@/plugins/axios'
import {
    getAllDemoPhotos,
    saveDemoQuickPhoto,
    saveDemoChecklistMoment,
    getDemoPhotosCount,
    getDemoQuickPhotos,
    getDemoChecklistMoments,
    clearDemoData,
} from '@/utils/demoDb'
import keannAndJennyBg from '@/assets/images/keann-and-jenny.jpg'

// Known wedding data dictionary
export const knownWeddings = {
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

export function getWeddingData(id) {
    if (id && knownWeddings[id]) {
        return {
            ...knownWeddings[id],
            heroImage: knownWeddings[id].heroImage || keannAndJennyBg,
        }
    }
    return {
        couple: 'Keann & Jenny',
        title: "Keann & Jenny's Wedding",
        initials: 'K & J',
        dateBadge: '24.10.26',
        heroImage: keannAndJennyBg,
    }
}

// Sample demo categories used when route.params.id === 'demo-event'
export const demoCategories = [
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

export const demoCategoryMap = [
    { id: 1, category: 'grand-entrance', label: 'Grand Entrance', keywords: ['entrance'] },
    { id: 2, category: 'first-dance', label: 'First Dance', keywords: ['first dance'] },
    { id: 3, category: 'dance-with-parents', label: 'Dance with Parents', keywords: ['parent', 'parents'] },
    { id: 4, category: 'guests-laughing', label: 'Guests Laughing', keywords: ['laughing', 'guests'] },
    { id: 5, category: 'emcee', label: 'Emcee on Stage', keywords: ['emcee', 'mc'] },
    { id: 6, category: 'grooms-surprise', label: "Groom's Surprise", keywords: ['groom'] },
    { id: 7, category: 'brides-surprise', label: "Bride's Surprise", keywords: ['bride'] },
    { id: 8, category: 'cake-cutting', label: 'Cake Cutting', keywords: ['cake'] },
    { id: 9, category: 'performances', label: 'Performances', keywords: ['performance', 'band'] },
    { id: 10, category: 'couple-message', label: "Couple's Message", keywords: ['message'] },
]

export function getDemoCategoryForItem(item, index) {
    if (!item) return { category: 'reception', label: 'Reception' }
    const titleLower = (item.name || item.title || '').toLowerCase()
    const byId = demoCategoryMap.find((m) => Number(m.id) === Number(item.id))
    if (byId) return { category: byId.category, label: byId.label }

    const byKeyword = demoCategoryMap.find((m) => m.keywords.some((k) => titleLower.includes(k)))
    if (byKeyword) return { category: byKeyword.category, label: byKeyword.label }

    const byIndex = demoCategoryMap[index]
    if (byIndex) return { category: byIndex.category, label: byIndex.label }

    return { category: 'reception', label: 'Reception' }
}

export const defaultDemoChecklist = [
    { id: 1, name: "Couple's Grand Entrance", description: "Capture the high-energy moment the newlyweds enter the reception hall." },
    { id: 2, name: "Couple's First Dance", description: "The romantic, intimate spotlight dance beneath the chandeliers." },
    { id: 3, name: "Dance with Parents", description: "Tender, emotional waltz with mother and father." },
    { id: 4, name: "Guests Laughing", description: "Candid smiles, clinking glasses, and genuine banquet reactions." },
    { id: 5, name: "The Emcee on Stage", description: "Master of Ceremonies keeping the reception lively and fun." },
    { id: 6, name: "Groom's Surprise Number", description: "Special choreographed serenade or musical performance." },
]

export const demoMediaItems = [
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

// Helper: Guest identifier for like tracking
export function getGuestIdentifier() {
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
export function formatRelativeTime(dateInput) {
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

// Helper: Extract category key from photo URLs
export function extractPhotoCategoryKey(item) {
    if (!item) return null

    const urls = [item.thumbnailUrl, item.fullUrl, item.url].filter(Boolean)

    for (const rawUrl of urls) {
        if (typeof rawUrl !== 'string') continue

        if (rawUrl.includes('quick-snaps')) {
            return 'quick-snaps'
        }

        const eventsMatch = rawUrl.match(/events\/[^\/]+\/[^\/]+\/([^\/]+)\//)
        if (eventsMatch && eventsMatch[1]) {
            return eventsMatch[1]
        }

        const genericMatch = rawUrl.match(/\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\/([^\/]+)\/[^\/]+$/)
        if (genericMatch && genericMatch[3]) {
            return genericMatch[3]
        }

        const sliceMatch = rawUrl.match(/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\/([0-9]+)(\/|$)/)
        if (sliceMatch && sliceMatch[3]) {
            return sliceMatch[3]
        }
    }

    if (item.checklistId !== null && item.checklistId !== undefined) {
        return String(item.checklistId)
    }

    return null
}

// Helper: Transform API / WebSocket photo to media item
export function mapPhotoToMediaItem(photo, checklistList = []) {
    const rawThumb = photo.thumbnailUrl || photo.url || ''
    const rawFull = photo.fullUrl || photo.url || ''
    const likesCount = Number(photo.likesCount ?? photo.likes ?? 0)

    const isVideo = Boolean(
        photo.isVideo ||
        photo.type === 'video' ||
        photo.mimeType?.startsWith('video/') ||
        photo.fileName?.endsWith('.mp4') ||
        photo.fileName?.endsWith('.webm') ||
        rawFull.endsWith('.mp4') ||
        rawFull.endsWith('.webm'),
    )

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
        const matched = checklistList.find((c) => String(c.id) === String(catKey))
        categoryLabel = matched?.name || `Quest ${catKey}`
    } else if (photo.checklistId) {
        category = String(photo.checklistId)
        const matched = checklistList.find((c) => String(c.id) === String(photo.checklistId))
        categoryLabel = matched?.name || `Quest ${photo.checklistId}`
    }

    return {
        id: photo.id,
        type: isVideo ? 'video' : 'photo',
        isVideo: isVideo,
        thumbnailUrl: rawThumb,
        fullUrl: rawFull,
        url: rawThumb || rawFull,
        videoUrl: isVideo ? (photo.videoUrl || rawFull) : null,
        videoBlob: photo.videoBlob || photo.blob || null,
        duration: photo.duration || (isVideo ? '0:30' : undefined),
        guest: photo.uploadedBy || 'Guest',
        checklistId: photo.checklistId ?? null,
        category,
        categoryLabel,
        title: photo.fileName
            ? `${isVideo ? 'Video' : 'Photo'}: ${photo.fileName}`
            : `Moment by ${photo.uploadedBy || 'Guest'}`,
        likes: likesCount,
        likesCount: likesCount,
        isLiked: Boolean(photo.isLiked),
        time: formatRelativeTime(photo.createdAt),
        createdAt: photo.createdAt,
    }
}

export const useEventVaultStore = defineStore('eventVault', () => {
    // Current Active Event
    const currentEventId = ref(null)

    // Live Vault Media Feed & Pagination
    const mediaItems = ref([])
    const currentPage = ref(1)
    const totalPhotos = ref(0)
    const hasMore = ref(false)
    const isLoadingPhotos = ref(false)
    const isLoadingMore = ref(false)
    const isInitialLoaded = ref(false)

    // Quests Checklist & Quick Drop
    const dynamicChecklist = ref([])
    const moments = ref([])
    const isChecklistLoaded = ref(false)
    const uploadedQuickPhotos = ref([])
    const demoDbCount = ref(0)

    // WebSocket state
    let activeWs = null
    let wsReconnectTimeout = null

    // Computeds
    const isDemo = computed(() => {
        const id = String(currentEventId.value || '').toLowerCase().trim()
        return id === 'demo-event'
    })

    const currentWedding = computed(() => getWeddingData(currentEventId.value))

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

    const capturedCount = computed(() => (moments.value || []).filter((m) => m.captured).length)
    const totalCount = computed(() => (moments.value || []).length)
    const progressPercent = computed(() =>
        totalCount.value > 0 ? Math.round((capturedCount.value / totalCount.value) * 100) : 0,
    )

    const galleryCount = computed(() => {
        if (isDemo.value) {
            return demoDbCount.value || 0
        }
        const quickCount = uploadedQuickPhotos.value?.length || 0
        const checklistCount = (moments.value || []).filter((m) => Boolean(m.captured)).length
        return quickCount + checklistCount
    })

    const latestGalleryImage = computed(() => {
        if (uploadedQuickPhotos.value && uploadedQuickPhotos.value.length > 0) {
            const first = uploadedQuickPhotos.value[0]
            if (first) {
                return first.thumbnailUrl || first.url || first.fullUrl || ''
            }
        }
        if (moments.value && moments.value.length > 0) {
            const capturedMoment = moments.value.find((m) => m.captured && (m.image || m.fullImage))
            if (capturedMoment) {
                return capturedMoment.image || capturedMoment.fullImage
            }
        }
        return 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_b45E9YjZPsE9FZqujCSRNTm6TpITBwM_TaJFgapEZqnACNNwtSVVLegXCWrGpfncDgbRxwks7l8wtobmCfqQkFQv34yOtgKuuNCrqjBvvgccMhT42aq0aHWZnTM-_kf98W7MIzPhbJg7cCIGS2Qy3CEH8ggjzWg0aUNB4Le6KuNEtqtn-DZAcxxNxm62OShpMnoE5uH6Kye6WAxV9WCfQwoP8bbVduYvD1BF5SQjqaIMfsDR8GxI'
    })

    const totalMomentsCount = computed(() => {
        if (isDemo.value) {
            return 137 + (mediaItems.value?.length || 0)
        }
        return totalPhotos.value || mediaItems.value?.length || 0
    })

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------

    // Switch/initialize event
    const setEventId = (eventId) => {
        const strId = String(eventId || 'demo-event')
        if (currentEventId.value !== strId) {
            currentEventId.value = strId
            isInitialLoaded.value = false
            isChecklistLoaded.value = false
            mediaItems.value = strId === 'demo-event' ? [...demoMediaItems] : []
            uploadedQuickPhotos.value = []
            moments.value = []
            dynamicChecklist.value = []
            currentPage.value = 1
            totalPhotos.value = 0
            hasMore.value = false
            closeWebSocket()
        }
    }

    // Populate checklist moments
    const populateMoments = (list) => {
        if (!Array.isArray(list)) return
        const isDemoEvent = currentEventId.value === 'demo-event'
        moments.value = list.map((item, index) => {
            const existing = moments.value.find((m) => Number(m.id) === Number(item.id))
            const demoCat = isDemoEvent ? getDemoCategoryForItem(item, index) : null
            return {
                id: item.id,
                number: String(index + 1).padStart(2, '0'),
                title: item.name,
                name: item.name,
                description: item.description,
                category: demoCat ? demoCat.category : 'reception',
                categoryLabel: demoCat ? demoCat.label : 'Reception',
                captured: existing ? existing.captured : false,
                image: existing ? existing.image : null,
                fullImage: existing ? existing.fullImage : null,
                isVideo: existing ? existing.isVideo : false,
                videoUrl: existing ? existing.videoUrl : null,
                guest: existing ? existing.guest : null,
                isUploading: false,
                uploadPercent: 0,
                showSuccessCheck: false,
            }
        })
    }

    // Fetch checklist from backend or localStorage
    const fetchChecklist = async (eventId) => {
        const targetId = eventId || currentEventId.value || 'demo-event'
        setEventId(targetId)

        if (isChecklistLoaded.value && moments.value.length > 0) {
            return
        }

        if (String(targetId) === 'demo-event') {
            dynamicChecklist.value = defaultDemoChecklist
            populateMoments(defaultDemoChecklist)
            isChecklistLoaded.value = true
            return
        }

        // Try reading cached checklist from localStorage
        if (typeof localStorage !== 'undefined') {
            try {
                const raw = localStorage.getItem('currentCheckList')
                if (raw) {
                    const parsed = JSON.parse(raw)
                    if (parsed && String(parsed.eventCode) === String(targetId) && Array.isArray(parsed.list) && parsed.list.length > 0) {
                        dynamicChecklist.value = parsed.list
                        populateMoments(parsed.list)
                        isChecklistLoaded.value = true
                        return
                    }
                }
            } catch (e) {
                console.warn('[EventVaultStore] Error reading currentCheckList:', e)
            }
        }

        try {
            const response = await axiosInstance.get(`/api/events/${targetId}/checklist`)
            const list = response.data || []
            dynamicChecklist.value = list
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(
                    'currentCheckList',
                    JSON.stringify({ eventCode: targetId, list }),
                )
            }
            populateMoments(list)
            isChecklistLoaded.value = true
        } catch (err) {
            console.error('[EventVaultStore] Error fetching checklist:', err)
            if (String(targetId) === 'demo-event') {
                dynamicChecklist.value = defaultDemoChecklist
                populateMoments(defaultDemoChecklist)
                isChecklistLoaded.value = true
            }
        }
    }

    // Update demo gallery photos count
    const updateDemoGalleryCount = async () => {
        try {
            demoDbCount.value = await getDemoPhotosCount()
        } catch {
            demoDbCount.value = 0
        }
    }

    // Fetch demo photos from IndexedDB
    const fetchDemoPhotos = async () => {
        try {
            const [savedQuick, savedMoments, localAll] = await Promise.all([
                getDemoQuickPhotos(),
                getDemoChecklistMoments(),
                getAllDemoPhotos(),
            ])

            if (savedQuick && savedQuick.length > 0) {
                uploadedQuickPhotos.value = savedQuick.map((p) => {
                    let vUrl = p.videoUrl
                    const blob = p.videoBlob || p.blob
                    if (p.isVideo && blob instanceof Blob) {
                        vUrl = URL.createObjectURL(blob)
                    }
                    return {
                        id: p.id,
                        url: p.thumbnailUrl || p.url,
                        fullUrl: p.fullUrl || p.url,
                        thumbnailUrl: p.thumbnailUrl,
                        isVideo: Boolean(p.isVideo),
                        videoUrl: vUrl || null,
                        videoBlob: blob || null,
                        fileName: p.fileName || (p.isVideo ? 'Video Clip' : 'Snapshot'),
                        uploadedAt: p.createdAt
                            ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Earlier',
                        guest: p.uploadedBy || 'You',
                        likes: p.likes || 0,
                        isLiked: Boolean(p.isLiked),
                        isNew: false,
                    }
                })
            }

            if (savedMoments && savedMoments.length > 0) {
                savedMoments.forEach((m) => {
                    const matched = moments.value.find((item) => Number(item.id) === Number(m.checklistId ?? m.id))
                    if (matched) {
                        let vUrl = m.videoUrl
                        const blob = m.videoBlob || m.blob
                        if (m.isVideo && blob instanceof Blob) {
                            vUrl = URL.createObjectURL(blob)
                        }
                        matched.captured = true
                        matched.image = m.thumbnailUrl || m.image || m.url
                        matched.fullImage = m.fullUrl || m.fullImage || m.image || m.url
                        matched.isVideo = Boolean(m.isVideo)
                        matched.videoUrl = vUrl || null
                        matched.videoBlob = blob || null
                        matched.guest = m.uploadedBy || 'You'
                        matched.category = m.category || matched.category
                        matched.categoryLabel = m.categoryLabel || matched.categoryLabel
                    }
                })
            }

            if (localAll && localAll.length > 0) {
                const mappedDemo = localAll.map((photo) => {
                    const rawThumb = photo.thumbnailUrl || photo.image || photo.url || ''
                    const rawFull = photo.fullUrl || photo.fullImage || photo.url || ''
                    let vUrl = photo.videoUrl
                    const blob = photo.videoBlob || photo.blob
                    if (photo.isVideo && blob instanceof Blob) {
                        vUrl = URL.createObjectURL(blob)
                    }
                    return {
                        id: photo.id,
                        type: photo.isVideo ? 'video' : 'photo',
                        isVideo: Boolean(photo.isVideo),
                        thumbnailUrl: rawThumb,
                        fullUrl: rawFull,
                        url: rawThumb || rawFull,
                        videoUrl: vUrl || null,
                        videoBlob: blob || null,
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

                const existingIds = new Set(mediaItems.value.map((m) => m.id))
                const newOnes = mappedDemo.filter((p) => !existingIds.has(p.id))
                mediaItems.value.unshift(...newOnes)
            }

            await updateDemoGalleryCount()
            isInitialLoaded.value = true
        } catch (err) {
            console.warn('[EventVaultStore] Failed to restore demo photos from demoDb:', err)
        }
    }

    // Sync photos into moments and uploadedQuickPhotos
    const syncPhotosToQuests = (photosList) => {
        if (!Array.isArray(photosList)) return

        // 1. Restore checklist moments
        photosList.forEach((p) => {
            if (p.checklistId) {
                const matched = moments.value.find((m) => Number(m.id) === Number(p.checklistId))
                if (matched) {
                    const isVid = Boolean(
                        p.isVideo ||
                        p.type === 'video' ||
                        p.mimeType?.startsWith('video/') ||
                        p.fileName?.endsWith('.mp4') ||
                        p.fileName?.endsWith('.webm') ||
                        p.url?.endsWith('.mp4') ||
                        p.url?.endsWith('.webm'),
                    )
                    matched.captured = true
                    matched.image = p.thumbnailUrl || p.url
                    matched.fullImage = p.fullUrl || p.url
                    matched.isVideo = isVid
                    matched.videoUrl = isVid ? (p.fullUrl || p.url) : null
                    matched.guest = p.uploadedBy || 'You'
                    matched.time = p.uploadedAt || p.createdAt
                        ? new Date(p.uploadedAt || p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Earlier'
                    matched.likes = p.likesCount || p.likes || 0
                    matched.isLiked = Boolean(p.isLiked)
                }
            }
        })

        // 2. Restore quick drop stream
        const quickList = photosList
            .filter((p) => !p.checklistId)
            .map((p) => {
                const isVid = Boolean(
                    p.isVideo ||
                    p.type === 'video' ||
                    p.mimeType?.startsWith('video/') ||
                    p.fileName?.endsWith('.mp4') ||
                    p.fileName?.endsWith('.webm') ||
                    p.url?.endsWith('.mp4') ||
                    p.url?.endsWith('.webm'),
                )
                return {
                    id: p.id,
                    url: p.thumbnailUrl || p.url,
                    fullUrl: p.fullUrl || p.url,
                    thumbnailUrl: p.thumbnailUrl,
                    isVideo: isVid,
                    videoUrl: isVid ? (p.fullUrl || p.url) : null,
                    fileName: p.fileName || (isVid ? 'Video Clip' : 'Snapshot'),
                    uploadedAt: p.uploadedAt || p.createdAt
                        ? new Date(p.uploadedAt || p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Earlier',
                    guest: p.uploadedBy || 'You',
                    likes: p.likesCount || p.likes || 0,
                    isLiked: Boolean(p.isLiked),
                    isNew: false,
                }
            })

        const existingQuickIds = new Set(uploadedQuickPhotos.value.map((q) => q.id))
        const newQuickOnes = quickList.filter((q) => !existingQuickIds.has(q.id))
        uploadedQuickPhotos.value.push(...newQuickOnes)
    }

    // Fetch photos from backend
    const fetchPhotos = async ({ page = 1, append = false, force = false, limit = 10, eventId } = {}) => {
        const targetId = eventId || currentEventId.value || 'demo-event'
        setEventId(targetId)

        if (isDemo.value) {
            if (!isInitialLoaded.value || force) {
                await fetchDemoPhotos()
            }
            return
        }

        // If not force, not append, and already loaded for this event, REUSE CACHE (saves mobile data!)
        if (!force && !append && isInitialLoaded.value && mediaItems.value.length > 0) {
            return
        }

        if (append) {
            isLoadingMore.value = true
        } else {
            isLoadingPhotos.value = true
        }

        try {
            const userIdentifier = getGuestIdentifier()
            const { data } = await axiosInstance.get(`/api/photos/events/${targetId}`, {
                params: {
                    page,
                    limit,
                    userIdentifier,
                },
            })

            const photosList = Array.isArray(data) ? data : data?.photos || []
            const mapped = photosList.map((p) => mapPhotoToMediaItem(p, dynamicChecklist.value))

            if (append) {
                const existingIds = new Set(mediaItems.value.map((m) => m.id))
                const newOnes = mapped.filter((m) => !existingIds.has(m.id))
                mediaItems.value.push(...newOnes)
            } else {
                mediaItems.value = mapped
            }

            // Sync with quests checklist and uploaded snaps
            syncPhotosToQuests(photosList)

            currentPage.value = page
            totalPhotos.value = data?.total ?? mediaItems.value.length
            hasMore.value = Boolean(data?.hasMore ?? (currentPage.value * limit < totalPhotos.value))
            isInitialLoaded.value = true
        } catch (err) {
            console.error('[EventVaultStore] Failed to fetch event photos:', err)
        } finally {
            isLoadingPhotos.value = false
            isLoadingMore.value = false
        }
    }

    // Load next page automatically on scroll
    const loadMorePhotos = async () => {
        if (!hasMore.value || isLoadingMore.value || isLoadingPhotos.value || isDemo.value) return
        await fetchPhotos({ page: currentPage.value + 1, append: true, limit: 10, eventId: currentEventId.value })
    }

    // Initialize full event data once
    const fetchInitialData = async (eventId) => {
        const targetId = eventId || currentEventId.value || 'demo-event'
        const isChanged = currentEventId.value !== String(targetId)
        setEventId(targetId)

        if (!isChecklistLoaded.value || isChanged) {
            await fetchChecklist(targetId)
        }

        if (!isInitialLoaded.value || isChanged) {
            await fetchPhotos({ page: 1, append: false, limit: 10, eventId: targetId })
        }

        // Connect WebSocket if real event
        if (!isDemo.value) {
            connectWebSocket(targetId)
        }
    }

    // Add newly uploaded photo immediately to store
    const addUploadedPhoto = (photo, { isChecklist = false, checklistId = null } = {}) => {
        if (!photo) return

        const isVid = Boolean(
            photo.isVideo ||
            photo.type === 'video' ||
            photo.mimeType?.startsWith('video/') ||
            photo.fileName?.endsWith('.mp4') ||
            photo.fileName?.endsWith('.webm') ||
            photo.url?.endsWith('.mp4') ||
            photo.url?.endsWith('.webm'),
        )

        const mappedMedia = mapPhotoToMediaItem(photo, dynamicChecklist.value)
        if (checklistId) {
            mappedMedia.checklistId = checklistId
            const matchedChecklist = dynamicChecklist.value.find((c) => Number(c.id) === Number(checklistId))
            if (matchedChecklist) {
                mappedMedia.category = String(checklistId)
                mappedMedia.categoryLabel = matchedChecklist.name
            }
        }

        // Prepend to mediaItems for Live Vault
        const existsInMedia = mediaItems.value.some((m) => m.id === photo.id)
        if (!existsInMedia) {
            mediaItems.value.unshift(mappedMedia)
            totalPhotos.value += 1
        }

        // If quick capture, prepend to uploadedQuickPhotos
        if (!isChecklist && !checklistId) {
            const existsInQuick = uploadedQuickPhotos.value.some((q) => q.id === photo.id)
            if (!existsInQuick) {
                uploadedQuickPhotos.value.unshift({
                    id: photo.id,
                    url: photo.thumbnailUrl || photo.url,
                    fullUrl: photo.fullUrl || photo.url,
                    thumbnailUrl: photo.thumbnailUrl,
                    isVideo: isVid,
                    videoUrl: isVid ? (photo.videoUrl || photo.fullUrl || photo.url) : null,
                    videoBlob: photo.videoBlob || photo.blob || null,
                    fileName: photo.fileName || (isVid ? 'Video Clip' : 'Snapshot'),
                    uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    guest: photo.uploadedBy || 'You',
                    likes: 0,
                    isLiked: false,
                    isNew: true,
                })
            }
        }

        // If checklist, update moment
        if (isChecklist || checklistId) {
            const cId = checklistId || photo.checklistId
            const foundMoment = moments.value.find((m) => Number(m.id) === Number(cId))
            if (foundMoment) {
                foundMoment.captured = true
                foundMoment.image = photo.thumbnailUrl || photo.url
                foundMoment.fullImage = photo.fullUrl || photo.url
                foundMoment.isVideo = isVid
                foundMoment.videoUrl = photo.videoUrl || (isVid ? (photo.fullUrl || photo.url) : null)
                foundMoment.videoBlob = photo.videoBlob || photo.blob || null
                foundMoment.guest = photo.uploadedBy || 'You'
            }
        }
    }

    // Toggle photo like
    const toggleLike = async (item, event) => {
        if (event && event.stopPropagation) event.stopPropagation()
        if (!item) return

        const isDemoEvent =
            isDemo.value ||
            String(currentEventId.value || '').toLowerCase().trim() === 'demo-event' ||
            Boolean(item.isLocalDemo) ||
            String(item.id).startsWith('demo_')

        if (isDemoEvent) {
            item.isLiked = !item.isLiked
            const currentLikes = Number(item.likes ?? item.likesCount ?? 0)
            item.likes = item.isLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1)
            item.likesCount = item.likes

            // Sync like across mediaItems, uploadedQuickPhotos, moments
            syncLikeState(item.id, item.likes, item.isLiked)

            if (item.isLiked && typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(20)
            }

            if (item.isLocalDemo || String(item.id).startsWith('demo_')) {
                try {
                    if (item.checklistId !== null && item.checklistId !== undefined) {
                        await saveDemoChecklistMoment({ ...item })
                    } else {
                        await saveDemoQuickPhoto({ ...item })
                    }
                } catch (err) {
                    console.warn('[EventVaultStore] Failed to persist demo like to demoDb:', err)
                }
            }
            return
        }

        // Optimistic UI update
        const prevLiked = item.isLiked
        const prevLikes = item.likes
        item.isLiked = !item.isLiked
        item.likes = item.isLiked ? item.likes + 1 : Math.max(0, item.likes - 1)
        item.likesCount = item.likes

        syncLikeState(item.id, item.likes, item.isLiked)

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
                syncLikeState(item.id, data.likesCount, data.isLiked)
            }
        } catch (err) {
            console.error('[EventVaultStore] Failed to toggle like on photo:', err)
            item.isLiked = prevLiked
            item.likes = prevLikes
            item.likesCount = prevLikes
            syncLikeState(item.id, prevLikes, prevLiked)
        }
    }

    const syncLikeState = (photoId, likes, isLiked) => {
        // Sync in mediaItems
        const inMedia = mediaItems.value.find((m) => m.id === photoId)
        if (inMedia) {
            inMedia.likes = likes
            inMedia.likesCount = likes
            inMedia.isLiked = isLiked
        }

        // Sync in uploadedQuickPhotos
        const inQuick = uploadedQuickPhotos.value.find((q) => q.id === photoId)
        if (inQuick) {
            inQuick.likes = likes
            inQuick.isLiked = isLiked
        }

        // Sync in moments
        const inMoment = moments.value.find((m) => m.id === photoId || m.photoId === photoId)
        if (inMoment) {
            inMoment.likes = likes
            inMoment.isLiked = isLiked
        }
    }

    // Real-time WebSocket management
    const handleWebSocketMessage = (raw) => {
        try {
            const message = typeof raw === 'string' ? JSON.parse(raw) : raw
            if (!message) return

            if (message.type === 'new_photo' && message.photo) {
                addUploadedPhoto(message.photo, {
                    isChecklist: Boolean(message.photo.checklistId),
                    checklistId: message.photo.checklistId,
                })
            } else if (message.type === 'photo_liked' && message.data) {
                const { photoId, likesCount } = message.data
                syncLikeState(photoId, likesCount, undefined)
            }
        } catch (err) {
            console.warn('[EventVaultStore] Error handling WS message:', err)
        }
    }

    const connectWebSocket = (eventId) => {
        if (isDemo.value || !eventId || eventId === 'demo-event') return
        if (activeWs && activeWs.readyState === WebSocket.OPEN) return

        try {
            const base = API_BASE_URL.replace(/^http/, 'ws')
            const wsUrl = `${base}/api/photos/ws/${eventId}`
            activeWs = new WebSocket(wsUrl)

            activeWs.onmessage = (event) => {
                handleWebSocketMessage(event.data)
            }

            activeWs.onclose = () => {
                activeWs = null
                if (!isDemo.value && currentEventId.value === String(eventId)) {
                    clearTimeout(wsReconnectTimeout)
                    wsReconnectTimeout = setTimeout(() => {
                        connectWebSocket(eventId)
                    }, 3000)
                }
            }

            activeWs.onerror = () => {
                if (activeWs) activeWs.close()
            }
        } catch (err) {
            console.warn('[EventVaultStore] WebSocket connection failed:', err)
        }
    }

    const closeWebSocket = () => {
        clearTimeout(wsReconnectTimeout)
        if (activeWs) {
            try {
                activeWs.close()
            } catch { }
            activeWs = null
        }
    }

    // Reset demo state completely
    const resetDemoStore = async () => {
        try {
            await clearDemoData()
        } catch (err) {
            console.warn('[EventVaultStore] Error clearing demo db:', err)
        }
        uploadedQuickPhotos.value = []
        mediaItems.value = [...demoMediaItems]
        totalPhotos.value = demoMediaItems.length
        demoDbCount.value = 0

        // Reset all moments back to initial uncaptured state
        if (Array.isArray(moments.value)) {
            moments.value.forEach((m) => {
                m.captured = false
                m.image = null
                m.fullImage = null
                m.isVideo = false
                m.videoUrl = null
                m.videoBlob = null
                m.guest = null
                m.isUploading = false
                m.uploadPercent = 0
                m.showSuccessCheck = false
                m.likes = 0
                m.isLiked = false
            })
        }
    }

    return {
        // State
        currentEventId,
        mediaItems,
        currentPage,
        totalPhotos,
        hasMore,
        isLoadingPhotos,
        isLoadingMore,
        isInitialLoaded,
        dynamicChecklist,
        moments,
        isChecklistLoaded,
        uploadedQuickPhotos,
        demoDbCount,

        // Computeds
        isDemo,
        currentWedding,
        categories,
        capturedCount,
        totalCount,
        progressPercent,
        galleryCount,
        latestGalleryImage,
        totalMomentsCount,

        // Actions
        setEventId,
        populateMoments,
        fetchChecklist,
        updateDemoGalleryCount,
        fetchDemoPhotos,
        fetchPhotos,
        loadMorePhotos,
        fetchInitialData,
        addUploadedPhoto,
        toggleLike,
        syncLikeState,
        handleWebSocketMessage,
        connectWebSocket,
        closeWebSocket,
        resetDemoStore,
    }
})
