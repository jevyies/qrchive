/**
 * Local IndexedDB database for demo-event photo storage.
 * Stores captured quick snaps and checklist moments locally without backend calls,
 * avoiding localStorage 5MB quota limitations for high-resolution images.
 */

const DB_NAME = 'qrchive_demo_db'
const DB_VERSION = 1
const STORE_QUICK = 'quick_photos'
const STORE_CHECKLIST = 'checklist_moments'

// In-memory fallback if IndexedDB is unavailable
const memoryFallback = {
    quick: [],
    checklist: {},
}

function openDB() {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            return reject(new Error('IndexedDB not supported'))
        }
        const request = window.indexedDB.open(DB_NAME, DB_VERSION)

        request.onupgradeneeded = (event) => {
            const db = event.target.result
            if (!db.objectStoreNames.contains(STORE_QUICK)) {
                db.createObjectStore(STORE_QUICK, { keyPath: 'id' })
            }
            if (!db.objectStoreNames.contains(STORE_CHECKLIST)) {
                db.createObjectStore(STORE_CHECKLIST, { keyPath: 'checklistId' })
            }
        }

        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

/**
 * Save a quick drop snapshot to local database
 */
export async function saveDemoQuickPhoto(photo) {
    const record = {
        ...photo,
        id: photo.id || `demo_quick_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        category: 'quick-capture',
        categoryLabel: 'Quick Capture',
        createdAt: photo.createdAt || new Date().toISOString(),
    }

    try {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_QUICK], 'readwrite')
            const store = tx.objectStore(STORE_QUICK)
            const req = store.put(record)
            req.onsuccess = () => resolve(record)
            req.onerror = () => reject(req.error)
        })
    } catch (err) {
        console.warn('[demoDb] Fallback saving quick photo to memory:', err)
        const idx = memoryFallback.quick.findIndex((p) => p.id === record.id)
        if (idx >= 0) {
            memoryFallback.quick[idx] = record
        } else {
            memoryFallback.quick.unshift(record)
        }
        return record
    }
}

/**
 * Get all saved quick snaps, ordered newest first
 */
export async function getDemoQuickPhotos() {
    try {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_QUICK], 'readonly')
            const store = tx.objectStore(STORE_QUICK)
            const req = store.getAll()
            req.onsuccess = () => {
                const list = req.result || []
                list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                resolve(list)
            }
            req.onerror = () => reject(req.error)
        })
    } catch (err) {
        console.warn('[demoDb] Fallback loading quick photos from memory:', err)
        return [...memoryFallback.quick]
    }
}

/**
 * Save a checklist moment capture to local database
 */
export async function saveDemoChecklistMoment(moment) {
    const checklistId = Number(moment.checklistId ?? moment.id)
    const record = {
        ...moment,
        checklistId,
        id: moment.id || `demo_quest_${checklistId}_${Date.now()}`,
        category: moment.category || 'all',
        categoryLabel: moment.categoryLabel || 'Checklist Moment',
        url: moment.url || moment.image,
        fullUrl: moment.fullUrl || moment.fullImage || moment.image,
        thumbnailUrl: moment.thumbnailUrl || moment.image,
        image: moment.image,
        fullImage: moment.fullImage || moment.image,
        captured: true,
        createdAt: moment.createdAt || new Date().toISOString(),
    }

    try {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_CHECKLIST], 'readwrite')
            const store = tx.objectStore(STORE_CHECKLIST)
            const req = store.put(record)
            req.onsuccess = () => resolve(record)
            req.onerror = () => reject(req.error)
        })
    } catch (err) {
        console.warn('[demoDb] Fallback saving checklist moment to memory:', err)
        memoryFallback.checklist[checklistId] = record
        return record
    }
}

/**
 * Get all saved checklist moments
 */
export async function getDemoChecklistMoments() {
    try {
        const db = await openDB()
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_CHECKLIST], 'readonly')
            const store = tx.objectStore(STORE_CHECKLIST)
            const req = store.getAll()
            req.onsuccess = () => {
                const list = req.result || []
                list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                resolve(list)
            }
            req.onerror = () => reject(req.error)
        })
    } catch (err) {
        console.warn('[demoDb] Fallback loading checklist moments from memory:', err)
        return Object.values(memoryFallback.checklist)
    }
}

/**
 * Get all demo photos (both quick snaps and checklist captures) for live-vault feed
 */
export async function getAllDemoPhotos() {
    const [quicks, moments] = await Promise.all([
        getDemoQuickPhotos(),
        getDemoChecklistMoments(),
    ])

    const combined = [...quicks, ...moments]
    combined.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    return combined
}

/**
 * Get total count of saved demo photos in local database (quick snaps + checklist moments)
 */
export async function getDemoPhotosCount() {
    try {
        const db = await openDB()
        return new Promise((resolve) => {
            const tx = db.transaction([STORE_QUICK, STORE_CHECKLIST], 'readonly')
            const reqQuick = tx.objectStore(STORE_QUICK).count()
            const reqChecklist = tx.objectStore(STORE_CHECKLIST).count()
            let qCount = 0
            let cCount = 0

            reqQuick.onsuccess = () => {
                qCount = reqQuick.result || 0
            }
            reqChecklist.onsuccess = () => {
                cCount = reqChecklist.result || 0
            }

            tx.oncomplete = () => {
                resolve(qCount + cCount)
            }
            tx.onerror = () => {
                resolve(memoryFallback.quick.length + Object.keys(memoryFallback.checklist).length)
            }
        })
    } catch (err) {
        console.warn('[demoDb] Fallback getting demo photos count from memory:', err)
        return memoryFallback.quick.length + Object.keys(memoryFallback.checklist).length
    }
}

/**
 * Clear all demo photos from local database
 */
export async function clearDemoData() {
    try {
        const db = await openDB()
        await Promise.all([
            new Promise((resolve, reject) => {
                const tx = db.transaction([STORE_QUICK], 'readwrite')
                const req = tx.objectStore(STORE_QUICK).clear()
                req.onsuccess = () => resolve()
                req.onerror = () => reject(req.error)
            }),
            new Promise((resolve, reject) => {
                const tx = db.transaction([STORE_CHECKLIST], 'readwrite')
                const req = tx.objectStore(STORE_CHECKLIST).clear()
                req.onsuccess = () => resolve()
                req.onerror = () => reject(req.error)
            }),
        ])
    } catch (err) {
        console.warn('[demoDb] Error clearing IndexedDB:', err)
    }
    memoryFallback.quick = []
    memoryFallback.checklist = {}
}
