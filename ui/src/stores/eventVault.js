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

const storageDomain = (import.meta.env.VITE_STORAGE_URL || 'https://photos.qrchive-events.com').replace(/\/+$/, '')
const defaultImg = `${storageDomain}/static/cover-photo.jpg`

// Known wedding data dictionary
export const knownWeddings = {
    '1': {
        couple: 'Sophia & Alexander',
        title: 'Sophia & Alexander’s Wedding',
        initials: 'S & A',
        dateBadge: '24.10.26',
        heroImage: defaultImg,
    },
    '2': {
        couple: 'Emily & James',
        title: 'Emily & James’s Wedding',
        initials: 'E & J',
        dateBadge: '15.11.26',
        heroImage: defaultImg,
    },
    '3': {
        couple: 'Olivia & Liam',
        title: 'Olivia & Liam’s Wedding',
        initials: 'O & L',
        dateBadge: '10.08.26',
        heroImage: defaultImg,
    },
}

export function getWeddingData(id) {
    if (id && knownWeddings[id]) {
        return {
            ...knownWeddings[id],
            heroImage: knownWeddings[id].heroImage || defaultImg,
        }
    }
    return {
        couple: 'J & J',
        title: "J & J's Wedding",
        initials: 'J & J',
        dateBadge: '24.04.20',
        heroImage: defaultImg,
    }
}

// Sample demo categories used when route.params.id === 'demo-event'
export const demoCategories = [
    { id: 'all', label: 'All' },
    { id: 'quick-capture', label: 'Quick Captures' },
    { id: 'grand-entrance', label: `Couple's Grand Entrance` },
    { id: 'first-dance', label: `Couple's First Dance` },
    { id: 'dance-with-parents', label: `Dance with the Parents` },
    { id: 'guests-laughing', label: 'Guests Laughing' },
    { id: 'grooms-surprise', label: `Groom's Surprise Number` },
    { id: 'games', label: `Games` },
    { id: 'cake', label: 'The Cake' },
    { id: 'venue', label: 'The Venue' },
    { id: 'couples-message', label: "Couple's Message" },
]

export const demoCategoryMap = [
    { id: 1, category: 'grand-entrance', label: 'Grand Entrance', keywords: ['entrance'] },
    { id: 2, category: 'first-dance', label: 'First Dance', keywords: ['first dance'] },
    { id: 3, category: 'dance-with-parents', label: 'Dance with Parents', keywords: ['parent', 'parents'] },
    { id: 4, category: 'guests-laughing', label: 'Guests Laughing', keywords: ['laughing', 'guests'] },
    { id: 5, category: 'grooms-surprise', label: "Groom's Surprise", keywords: ['groom'] },
    { id: 6, category: 'games', label: 'Games', keywords: ['games'] },
    { id: 7, category: 'cake', label: 'The Cake', keywords: ['cake'] },
    { id: 8, category: 'venue', label: 'The Venue', keywords: ['venue'] },
    { id: 9, category: 'couples-message', label: "Couple's Message", keywords: ['message'] },
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
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/quick-capture-1.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/quick-capture-1.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/quick-capture-1.jpg`,
        guest: 'Sophia M.',
        category: 'quick-capture',
        categoryLabel: 'Quick Capture',
        title: 'First photo of my gf',
        likes: 42,
        isLiked: false,
        time: '12m ago',
    },
    {
        id: 2,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/quick-capture-2.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/quick-capture-2.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/quick-capture-2.jpg`,
        guest: 'Sophia M.',
        category: 'quick-capture',
        categoryLabel: 'Quick Capture',
        title: 'First photo of my gf',
        likes: 10,
        isLiked: false,
        time: '10m ago',
    },
    {
        id: 3,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/quick-capture-3.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/quick-capture-3.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/quick-capture-3.jpg`,
        guest: 'Sophia M.',
        category: 'quick-capture',
        categoryLabel: 'Quick Capture',
        title: 'First photo of my gf',
        likes: 5,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 4,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/quick-capture-4.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/quick-capture-4.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/quick-capture-4.jpg`,
        guest: 'Sophia M.',
        category: 'quick-capture',
        categoryLabel: 'Quick Capture',
        title: 'First photo of my gf',
        likes: 12,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 5,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/quick-capture-5.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/quick-capture-5.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/quick-capture-5.jpg`,
        guest: 'Sophia M.',
        category: 'quick-capture',
        categoryLabel: 'Quick Capture',
        title: 'First photo of my gf',
        likes: 4,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 6,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/quick-capture-6.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/quick-capture-6.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/quick-capture-6.jpg`,
        guest: 'Sophia M.',
        category: 'quick-capture',
        categoryLabel: 'Quick Capture',
        title: 'First photo of my gf',
        likes: 6,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 7,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/quick-capture-7.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/quick-capture-7.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/quick-capture-7.jpg`,
        guest: 'Sophia M.',
        category: 'quick-capture',
        categoryLabel: 'Quick Capture',
        title: 'First photo of my gf',
        likes: 34,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 8,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/quick-capture-8.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/quick-capture-8.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/quick-capture-8.jpg`,
        guest: 'Sophia M.',
        category: 'quick-capture',
        categoryLabel: 'Quick Capture',
        title: 'First photo of my gf',
        likes: 3,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 9,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/quick-capture-9.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/quick-capture-9.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/quick-capture-9.jpg`,
        guest: 'Sophia M.',
        category: 'quick-capture',
        categoryLabel: 'Quick Capture',
        title: 'First photo of my gf',
        likes: 19,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 10,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/quick-capture-10.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/quick-capture-10.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/quick-capture-10.jpg`,
        guest: 'Sophia M.',
        category: 'quick-capture',
        categoryLabel: 'Quick Capture',
        title: 'First photo of my gf',
        likes: 38,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 11,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/couple-grand-entrance.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/couple-grand-entrance.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/couple-grand-entrance.jpg`,
        guest: 'Sophia M.',
        category: 'grand-entrance',
        categoryLabel: 'Grand Entrance',
        title: 'First photo of my gf',
        likes: 38,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 12,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/the-couples-first-dance-1.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/the-couples-first-dance-1.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/the-couples-first-dance-1.jpg`,
        guest: 'Sophia M.',
        category: 'first-dance',
        categoryLabel: 'First Dance',
        title: 'First photo of my gf',
        likes: 38,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 13,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/the-couples-first-dance-2.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/the-couples-first-dance-2.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/the-couples-first-dance-2.jpg`,
        guest: 'Sophia M.',
        category: 'first-dance',
        categoryLabel: 'First Dance',
        title: 'First photo of my gf',
        likes: 38,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 14,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/dance-with-the-parents-1.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/dance-with-the-parents-1.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/dance-with-the-parents-1.jpg`,
        guest: 'Sophia M.',
        category: 'dance-with-parents',
        categoryLabel: 'Dance with Parents',
        title: 'First photo of my gf',
        likes: 38,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 15,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/dance-with-the-parents-2.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/dance-with-the-parents-2.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/dance-with-the-parents-2.jpg`,
        guest: 'Sophia M.',
        category: 'dance-with-parents',
        categoryLabel: 'Dance with Parents',
        title: 'First photo of my gf',
        likes: 38,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 16,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/dance-with-the-parents-3.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/dance-with-the-parents-3.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/dance-with-the-parents-3.jpg`,
        guest: 'Sophia M.',
        category: 'dance-with-parents',
        categoryLabel: 'Dance with Parents',
        title: 'First photo of my gf',
        likes: 38,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 17,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/guests-laughing.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/guests-laughing.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/guests-laughing.jpg`,
        guest: 'Sophia M.',
        category: 'guests-laughing',
        categoryLabel: 'Guests Laughing',
        title: 'First photo of my gf',
        likes: 38,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 18,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/groom-surprise-number-1.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/groom-surprise-number-1.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/groom-surprise-number-1.jpg`,
        guest: 'Sophia M.',
        category: 'grooms-surprise',
        categoryLabel: 'Grooms Surprise',
        title: 'First photo of my gf',
        likes: 38,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 19,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/groom-surprise-number-2.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/groom-surprise-number-2.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/groom-surprise-number-2.jpg`,
        guest: 'Sophia M.',
        category: 'grooms-surprise',
        categoryLabel: 'Grooms Surprise',
        title: 'First photo of my gf',
        likes: 38,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 20,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/games-1.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/games-1.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/games-1.jpg`,
        guest: 'Sophia M.',
        category: 'games',
        categoryLabel: 'Games',
        title: 'First photo of my gf',
        likes: 38,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 21,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/games-2.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/games-2.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/games-2.jpg`,
        guest: 'Sophia M.',
        category: 'games',
        categoryLabel: 'Games',
        title: 'First photo of my gf',
        likes: 38,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 22,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/the-wedding-cake.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/the-wedding-cake.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/the-wedding-cake.jpg`,
        guest: 'Sophia M.',
        category: 'cake',
        categoryLabel: 'The Wedding Cake',
        title: 'First photo of my gf',
        likes: 38,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 23,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/the-venue.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/the-venue.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/the-venue.jpg`,
        guest: 'Sophia M.',
        category: 'venue',
        categoryLabel: 'The Venue',
        title: 'First photo of my gf',
        likes: 38,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 24,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/the-gifts.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/the-gifts.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/the-gifts.jpg`,
        guest: 'Sophia M.',
        category: 'the-gifts',
        categoryLabel: 'The Gifts',
        title: 'The Gifts',
        likes: 38,
        isLiked: false,
        time: '8m ago',
    },
    {
        id: 25,
        type: 'photo',
        url: `${storageDomain}/static/demo-photos/the-couple-message.jpg`,
        thumbnailUrl: `${storageDomain}/static/demo-photos/the-couple-message.jpg`,
        fullUrl: `${storageDomain}/static/demo-photos/the-couple-message.jpg`,
        guest: 'Sophia M.',
        category: 'couples-message',
        categoryLabel: 'Couples Message',
        title: 'Couples Message',
        likes: 38,
        isLiked: false,
        time: '8m ago',
    },
]

// Helper: Guest identifier resolved from qrchive_event_sessions -> event -> guestCode
export function getGuestIdentifier(eventId = null) {
    if (typeof localStorage === 'undefined') return 'guest'

    // Clean up any deprecated qrchive_device_id
    try {
        localStorage.removeItem('qrchive_device_id')
    } catch { }

    // 1. Resolve from qrchive_event_sessions -> event -> guestCode
    try {
        const rawSessions = localStorage.getItem('qrchive_event_sessions')
        if (rawSessions) {
            const sessions = JSON.parse(rawSessions)
            if (sessions && typeof sessions === 'object') {
                // If specific eventId is provided, look it up directly
                if (eventId && sessions[String(eventId)]) {
                    const sess = sessions[String(eventId)]
                    const code = sess?.guestCode || sess?.guest_code
                    if (code) return String(typeof code === 'object' ? code?.guestCode || code : code)
                }

                // Check eventId/token from currentEvent in localStorage
                const storedCurrent = localStorage.getItem('currentEvent')
                if (storedCurrent) {
                    try {
                        const parsed = JSON.parse(storedCurrent)
                        const evKey = parsed?.id || parsed?.eventId || parsed?.eventCode || parsed?.token
                        if (evKey && sessions[String(evKey)]) {
                            const sess = sessions[String(evKey)]
                            const code = sess?.guestCode || sess?.guest_code
                            if (code) return String(typeof code === 'object' ? code?.guestCode || code : code)
                        }
                    } catch { }
                }

                // Check URL path for event ID or token
                if (typeof window !== 'undefined' && window.location?.pathname) {
                    const match = window.location.pathname.match(/\/(?:event|vaultsss|dashboard\/event)\/([^/]+)/)
                    if (match && match[1] && sessions[match[1]]) {
                        const sess = sessions[match[1]]
                        const code = sess?.guestCode || sess?.guest_code
                        if (code) return String(typeof code === 'object' ? code?.guestCode || code : code)
                    }
                }

                // Fallback: Check all sessions in qrchive_event_sessions
                const sessionValues = Object.values(sessions)
                for (let i = sessionValues.length - 1; i >= 0; i--) {
                    const sess = sessionValues[i]
                    const code = sess?.guestCode || sess?.guest_code
                    if (code) return String(typeof code === 'object' ? code?.guestCode || code : code)
                }
            }
        }
    } catch { }

    // 2. Check currentEvent directly
    const stored = localStorage.getItem('currentEvent')
    if (stored) {
        try {
            const parsed = JSON.parse(stored)
            if (parsed?.guestCode) return String(parsed.guestCode)
            if (parsed?.guestId) return String(parsed.guestId)
        } catch { }
    }

    // 3. Check direct guest code storage
    const directCode = localStorage.getItem('qrchive_guest_code') || localStorage.getItem('guestCode')
    if (directCode) return String(directCode)

    return 'guest'
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

    const urls = [item.storageKey, item.storage_key, item.thumbnailUrl, item.fullUrl, item.url].filter(Boolean)

    for (const rawUrl of urls) {
        if (typeof rawUrl !== 'string') continue

        if (rawUrl.includes('quick-snaps')) {
            return 'quick-snaps'
        }

        const eventsMatch = rawUrl.match(/events\/[^/]+\/[^/]+\/([^/]+)\//)
        if (eventsMatch && eventsMatch[1]) {
            return eventsMatch[1]
        }

        const genericMatch = rawUrl.match(/\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)\/([^/]+)\/[^/]+$/)
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

// Helper: Resolve any image URL or key directly to the R2 public domain: PUBLIC_DOMAIN + '/' + storage_key
export function resolveStorageUrl(urlOrKey, explicitStorageKey = null) {
    if (!urlOrKey && !explicitStorageKey) return ''
    const storageDomain = (import.meta.env.VITE_STORAGE_URL || 'https://photos.qrchive-events.com').replace(/\/+$/, '')

    let candidateKey = explicitStorageKey
    let rawUrl = ''
    if (typeof urlOrKey === 'object' && urlOrKey !== null) {
        candidateKey = candidateKey || urlOrKey.storageKey || urlOrKey.storage_key || null
        rawUrl = urlOrKey.fullUrl || urlOrKey.thumbnailUrl || urlOrKey.url || ''
    } else if (typeof urlOrKey === 'string') {
        rawUrl = urlOrKey.trim()
    }

    // 1. If candidate storageKey is available and valid, ALWAYS use PUBLIC_DOMAIN + '/' + storage_key
    if (candidateKey && typeof candidateKey === 'string') {
        let cleanCandidate = candidateKey.trim()
        if (!cleanCandidate.includes('/api/photos/') && !cleanCandidate.startsWith('api/photos/')) {
            cleanCandidate = cleanCandidate.replace(/^\/+/, '')
            if (cleanCandidate.startsWith('http://') || cleanCandidate.startsWith('https://')) {
                return cleanCandidate
            }
            return `${storageDomain}/${cleanCandidate}`
        }
    }

    if (!rawUrl) return ''

    // 2. Keep local blobs and data URIs untouched
    if (rawUrl.startsWith('blob:') || rawUrl.startsWith('data:')) {
        return rawUrl
    }

    let clean = rawUrl

    // 3. Remove backend legacy proxy routes like /api/photos/view/<key>
    if (clean.includes('/api/photos/view/')) {
        clean = clean.split('/api/photos/view/')[1] || clean
    } else if (clean.includes('api/photos/view/')) {
        clean = clean.split('api/photos/view/')[1] || clean
    }

    // 4. Remove /cdn-cgi/image/<options>/ prefix if present
    if (clean.includes('/cdn-cgi/image/')) {
        const match = clean.match(/\/cdn-cgi\/image\/[^/]+\/(.+)$/)
        if (match && match[1]) {
            clean = match[1]
            if (clean.includes('/api/photos/view/')) {
                clean = clean.split('/api/photos/view/')[1] || clean
            }
        }
    }

    // 5. If it's a full URL
    if (/^https?:\/\//i.test(clean)) {
        // If it was mistakenly prefixed to storageDomain with an API route (e.g. https://photos.qrchive-events.com/api/photos/208/file)
        if (clean.includes('/api/photos/') && (clean.includes('photos.qrchive-events.com') || clean.includes(storageDomain))) {
            const apiBase = (import.meta.env.VITE_API_BASE_URL || API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '')
            try {
                const parsed = new URL(clean)
                return `${apiBase}${parsed.pathname}`
            } catch {
                return clean
            }
        }

        if (clean.includes('r2.cloudflarestorage.com') || clean.includes('localhost:') || clean.includes('127.0.0.1:')) {
            try {
                const parsed = new URL(clean)
                clean = parsed.pathname
                if (clean.includes('/api/photos/view/')) {
                    clean = clean.split('/api/photos/view/')[1] || clean
                } else if (clean.includes('/api/photos/') && clean.endsWith('/file')) {
                    const apiBase = (import.meta.env.VITE_API_BASE_URL || API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '')
                    return `${apiBase}${clean}`
                }
            } catch {
                // Ignore
            }
        } else {
            return clean
        }
    }

    // 6. If clean is an api/photos route without view, DO NOT prepend storageDomain!
    if (clean.startsWith('/api/photos/') || clean.startsWith('api/photos/')) {
        const apiBase = (import.meta.env.VITE_API_BASE_URL || API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '')
        const normalized = clean.startsWith('/') ? clean : `/${clean}`
        return `${apiBase}${normalized}`
    }

    clean = clean.replace(/^\/+/, '')
    return clean ? `${storageDomain}/${clean}` : ''
}

// Helper: Construct Cloudflare Image Resizing URL (/cdn-cgi/image/width=600,quality=80/<storage_key>)
export function getResizedStorageUrl(urlOrKey, explicitStorageKey = null, { width = 600, quality = 80 } = {}) {
    if (!urlOrKey && !explicitStorageKey) return ''
    const storageDomain = (import.meta.env.VITE_STORAGE_URL || 'https://photos.qrchive-events.com').replace(/\/+$/, '')

    let candidateKey = explicitStorageKey
    if (!candidateKey && typeof urlOrKey === 'object' && urlOrKey !== null) {
        candidateKey = urlOrKey.storageKey || urlOrKey.storage_key || null
    }

    if (typeof urlOrKey === 'string' && (urlOrKey.startsWith('blob:') || urlOrKey.startsWith('data:'))) {
        return urlOrKey
    }

    const fullUrl = resolveStorageUrl(urlOrKey, candidateKey)
    if (!candidateKey && typeof fullUrl === 'string' && fullUrl.startsWith(storageDomain)) {
        candidateKey = fullUrl.replace(storageDomain, '').replace(/^\/+/, '')
    }

    if (candidateKey && typeof candidateKey === 'string') {
        let clean = candidateKey.trim()
        if (!clean.includes('/api/photos/') && !clean.startsWith('api/photos/')) {
            clean = clean.replace(/^\/+/, '').replace(/^cdn-cgi\/image\/[^/]+\//, '')
            return `${storageDomain}/cdn-cgi/image/width=${width},quality=${quality}/${clean}`
        }
    }

    return fullUrl
}

// Helper: Transform API / WebSocket photo to media item
export function mapPhotoToMediaItem(photo, checklistList = []) {
    const photoKey = photo?.storageKey || photo?.storage_key || null
    const rawThumb = resolveStorageUrl(photo.thumbnailUrl || photo.url || '', photoKey)
    const rawFull = resolveStorageUrl(photo.fullUrl || photo.url || '', photoKey)
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

    let finalThumb = rawThumb
    if (isVideo && photoKey && (!finalThumb || finalThumb.endsWith('.mp4') || finalThumb.endsWith('.webm'))) {
        const thumbKey = photoKey.replace(/\.[^.]+$/, '_thumb.jpg')
        finalThumb = `${storageDomain}/${thumbKey}`
    }

    const catKey = extractPhotoCategoryKey({
        storageKey: photoKey,
        storage_key: photoKey,
        thumbnailUrl: finalThumb,
        fullUrl: rawFull,
        url: finalThumb || rawFull,
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
        thumbnailUrl: finalThumb,
        fullUrl: rawFull,
        url: finalThumb || rawFull,
        storageKey: photoKey,
        storage_key: photoKey,
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
    const isGuestInitialLoaded = ref(false)
    const currentGuestCode = ref('')
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
            isGuestInitialLoaded.value = false
            currentGuestCode.value = ''
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
                        matched.photoId = m.id
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
                    const pKey = p.storageKey || p.storage_key || null
                    matched.photoId = p.id
                    matched.storageKey = pKey
                    matched.storage_key = pKey
                    matched.captured = true
                    matched.image = resolveStorageUrl(p.thumbnailUrl || p.url, pKey)
                    matched.fullImage = resolveStorageUrl(p.fullUrl || p.url, pKey)
                    matched.isVideo = isVid
                    matched.videoUrl = isVid ? resolveStorageUrl(p.fullUrl || p.url, pKey) : null
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
                const pKey = p.storageKey || p.storage_key || null
                const resolvedFull = resolveStorageUrl(p.fullUrl || p.url, pKey)
                const resolvedThumb = resolveStorageUrl(p.thumbnailUrl || p.url, pKey) || resolvedFull
                return {
                    id: p.id,
                    url: isVid ? (resolvedThumb || resolvedFull) : (resolvedFull || resolvedThumb),
                    fullUrl: resolvedFull || resolvedThumb,
                    thumbnailUrl: resolvedThumb || resolvedFull,
                    storageKey: pKey,
                    storage_key: pKey,
                    isVideo: isVid,
                    videoUrl: isVid ? (p.videoUrl || resolvedFull) : null,
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
            const { data } = await axiosInstance.get(`/api/photos/events/${targetId}`, {
                params: {
                    page,
                    limit,
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

    // Fetch photos for a specific guest from backend (/api/photos/events/:eventId/guests/:guestCode)
    const fetchGuestPhotos = async ({ eventId, guestCode, force = false } = {}) => {
        const targetId = eventId || currentEventId.value || 'demo-event'
        setEventId(targetId)

        const targetGuestCode = guestCode || getGuestIdentifier(targetId) || 'guest'
        const isGuestChanged = currentGuestCode.value !== String(targetGuestCode)
        currentGuestCode.value = String(targetGuestCode)

        const isTargetDemo = String(targetId).toLowerCase().trim() === 'demo-event' || isDemo.value

        if (isTargetDemo) {
            if (!isGuestInitialLoaded.value || force || isGuestChanged) {
                await fetchDemoPhotos()
                isGuestInitialLoaded.value = true
            }
            return
        }

        // If not force, not changed, and already loaded for this guest, reuse cache
        if (!force && !isGuestChanged && isGuestInitialLoaded.value) {
            return
        }

        isLoadingPhotos.value = true
        try {
            const { data } = await axiosInstance.get(`/api/photos/events/${targetId}/guests/${targetGuestCode}`)

            const photosList = Array.isArray(data) ? data : data?.photos || []
            const mapped = photosList.map((p) => mapPhotoToMediaItem(p, dynamicChecklist.value))

            if (!mediaItems.value || mediaItems.value.length === 0) {
                mediaItems.value = mapped
            }

            // Sync with quests checklist and uploaded snaps
            syncPhotosToQuests(photosList)

            isGuestInitialLoaded.value = true
        } catch (err) {
            console.error('[EventVaultStore] Failed to fetch guest photos:', err)
            // Mark loaded so app doesn't continuously hang on network errors
            isGuestInitialLoaded.value = true
        } finally {
            isLoadingPhotos.value = false
        }
    }

    // Initialize full event data for a specific guest using /api/photos/events/:eventId/guests/:guestCode
    const fetchInitialGuestData = async (eventId, guestCode) => {
        const targetId = eventId || currentEventId.value || 'demo-event'
        const isChanged = currentEventId.value !== String(targetId)
        setEventId(targetId)

        if (!isChecklistLoaded.value || isChanged) {
            await fetchChecklist(targetId)
        }

        const effectiveGuestCode = guestCode || getGuestIdentifier(targetId) || 'guest'
        const isGuestChanged = currentGuestCode.value !== String(effectiveGuestCode)

        if (!isGuestInitialLoaded.value || isChanged || isGuestChanged) {
            await fetchGuestPhotos({ eventId: targetId, guestCode: effectiveGuestCode })
        }

        // Connect WebSocket if real event
        if (!isDemo.value) {
            connectWebSocket(targetId)
        }
    }

    const fetchGuestInitialData = fetchInitialGuestData
    const fetchInitialDataByGuest = fetchInitialGuestData

    const isCurrentGuestPhoto = (photo) => {
        if (!photo) return false
        const currentName = (typeof localStorage !== 'undefined' ? localStorage.getItem('guestName') : '') || ''
        let storedSessionName = ''
        let storedSessionCode = ''
        if (typeof localStorage !== 'undefined') {
            try {
                const ev = JSON.parse(localStorage.getItem('currentEvent') || '{}')
                storedSessionName = ev?.guestName || ''
                storedSessionCode = ev?.guestCode || ''
            } catch { }
        }
        const myCode = currentGuestCode.value || storedSessionCode || getGuestIdentifier(currentEventId.value) || (typeof localStorage !== 'undefined' ? (localStorage.getItem('guestCode') || localStorage.getItem('qrchive_guest_code')) : '')

        if (photo.guestCode && myCode && String(photo.guestCode) === String(myCode)) return true
        const uploader = photo.uploadedBy || photo.guest
        if (uploader === 'You') return true
        if (currentName && uploader === currentName) return true
        if (storedSessionName && uploader === storedSessionName) return true
        return false
    }

    // Remove a photo from mediaItems and local store by id
    const removePhotoById = (photoId) => {
        if (!photoId) return
        const idStr = String(photoId)

        // Remove from mediaItems (which feeds LiveGallery)
        const mediaIdx = mediaItems.value.findIndex((m) => String(m.id) === idStr)
        if (mediaIdx !== -1) {
            mediaItems.value.splice(mediaIdx, 1)
            totalPhotos.value = Math.max(0, totalPhotos.value - 1)
        }

        // Remove from uploadedQuickPhotos if present
        const quickIdx = uploadedQuickPhotos.value.findIndex((q) => String(q.id) === idStr)
        if (quickIdx !== -1) {
            uploadedQuickPhotos.value.splice(quickIdx, 1)
        }
    }

    // Add newly uploaded photo immediately to store
    const addUploadedPhoto = (photo, { isChecklist = false, checklistId = null, isReplace = false, replacedPhotoId = null, deletedPhotoIds = [] } = {}) => {
        if (!photo) return

        // 1. Remove any explicitly deleted or replaced photos
        if (Array.isArray(deletedPhotoIds)) {
            deletedPhotoIds.forEach((id) => removePhotoById(id))
        }
        if (replacedPhotoId) {
            removePhotoById(replacedPhotoId)
        }

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
        const cId = checklistId || photo.checklistId
        if (cId) {
            mappedMedia.checklistId = cId
            const matchedChecklist = dynamicChecklist.value.find((c) => Number(c.id) === Number(cId))
            if (matchedChecklist) {
                mappedMedia.category = String(cId)
                mappedMedia.categoryLabel = matchedChecklist.name
            }

            // If this is a checklist moment, remove any PREVIOUS media item for this same checklist moment by this guest
            const prevIndex = mediaItems.value.findIndex(
                (m) =>
                    String(m.id) !== String(photo.id) &&
                    Number(m.checklistId) === Number(cId) &&
                    isCurrentGuestPhoto(m)
            )
            if (prevIndex !== -1) {
                mediaItems.value.splice(prevIndex, 1)
                totalPhotos.value = Math.max(0, totalPhotos.value - 1)
            }
        }

        // Prepend to mediaItems for Live Vault
        const existsInMedia = mediaItems.value.some((m) => String(m.id) === String(photo.id))
        if (!existsInMedia) {
            mediaItems.value.unshift(mappedMedia)
            totalPhotos.value += 1
        }

        // If quick capture, prepend or update in uploadedQuickPhotos
        if (!isChecklist && !checklistId) {
            const existingIndex = uploadedQuickPhotos.value.findIndex(
                (q) =>
                    (photo.id && (q.id === photo.id || String(q.id) === String(photo.id))) ||
                    (photo.fileName && q.fileName && q.fileName === photo.fileName) ||
                    (photo.url && (q.url === photo.url || q.fullUrl === photo.url || q.dataUrl === photo.url))
            )
            const photoKey = photo.storageKey || photo.storage_key || null
            const resolvedFull = resolveStorageUrl(photo.fullUrl || photo.url, photoKey)
            const resolvedThumb = resolveStorageUrl(photo.thumbnailUrl || photo.url, photoKey) || resolvedFull
            if (existingIndex !== -1) {
                const existing = uploadedQuickPhotos.value[existingIndex]
                existing.id = photo.id
                existing.thumbnailUrl = resolvedThumb
                existing.url = isVid ? (resolvedThumb || resolvedFull) : (resolvedFull || resolvedThumb)
                existing.fullUrl = resolvedFull || resolvedThumb
                if (photo.uploadedBy) existing.guest = photo.uploadedBy
                if (photo.fileName) existing.fileName = photo.fileName
                existing.storageKey = photoKey
                existing.storage_key = photoKey
            } else if (isCurrentGuestPhoto(photo)) {
                uploadedQuickPhotos.value.unshift({
                    id: photo.id,
                    url: isVid ? (resolvedThumb || resolvedFull) : (resolvedFull || resolvedThumb),
                    fullUrl: resolvedFull || resolvedThumb,
                    thumbnailUrl: resolvedThumb || resolvedFull,
                    storageKey: photoKey,
                    storage_key: photoKey,
                    isVideo: isVid,
                    videoUrl: isVid ? (photo.videoUrl || resolvedFull) : null,
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
            const foundMoment = moments.value.find((m) => Number(m.id) === Number(cId))
            if (foundMoment && isCurrentGuestPhoto(photo)) {
                const photoKey = photo.storageKey || photo.storage_key || null
                const resolvedThumb = resolveStorageUrl(photo.thumbnailUrl || photo.url, photoKey)
                const resolvedFull = resolveStorageUrl(photo.fullUrl || photo.url, photoKey)
                foundMoment.photoId = photo.id
                foundMoment.captured = true
                foundMoment.image = resolvedThumb
                foundMoment.fullImage = resolvedFull
                foundMoment.storageKey = photoKey
                foundMoment.storage_key = photoKey
                foundMoment.isVideo = isVid
                foundMoment.videoUrl = photo.videoUrl || (isVid ? resolvedFull : null)
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
            const userIdentifier = getGuestIdentifier(item.eventId || currentEventId.value)
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
            } else if ((message.type === 'photo_deleted' || message.type === 'delete_photo') && message.data) {
                const pid = message.data.photoId || message.data.id
                if (pid) {
                    removePhotoById(pid)
                }
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
        isGuestInitialLoaded,
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
        fetchGuestPhotos,
        fetchInitialGuestData,
        fetchGuestInitialData,
        fetchInitialDataByGuest,
        addUploadedPhoto,
        removePhotoById,
        toggleLike,
        syncLikeState,
        handleWebSocketMessage,
        connectWebSocket,
        closeWebSocket,
        resetDemoStore,
    }
})
