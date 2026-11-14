<script setup>
import EventDetailTemplate from '@/views/dashboards/owner/EventDetailTemplate.vue'
const slideshowPhotos = ref([])
const eventData = ref({
    id: 1500, event_type: ' Anniversary',
    event_code: 'EVT00001500',
    event_title: 'The Millers\' Golden Anniversary',
    event_date: '2026-05-10',
    event_time: '16:00',
    occasion: 'wedding-anniversary',
    event_description: 'Join us as we celebrate 50 years of love, laughter, and cherished memories. A milestone to honor a remarkable journey together.',
    couple_names: 'John & Mary Miller',
    host_name: 'John Miller',
    bucket_name: 'qrchive-demo-1500',
    event_path: 'demo-1500',
    bucket_url: 'https://qrchive-demo-1500.s3.ap-southeast-1.amazonaws.com/demo-1500',
    event_status: 'active',
    total_files: 5,
    photos_count: 4,
    total_videos: 0,
    videos_count: 0,
    total_notes: 1,
    notes_count: 1,
    total_downloads: 0,
    is_password_protected: false,
    last_update_at: '2026-11-14 18:55:05'
})
const eventTitle = ref(`Jane and John's Wedding`)
const hostOrigin = computed(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
        return window.location.origin
    }
    return 'http://localhost:1500'
})
const eventCode = ref('xftGye')
const desktopCroppedBackground = ref('')
const albums = ref([])
const qrSvg = ref('')
</script>
<template>
    <EventDetailTemplate :slideshowPhotos="slideshowPhotos" :eventData="eventData" :eventTitle="eventTitle"
        :desktopCroppedBackground="desktopCroppedBackground" :albums="albums" :hostOrigin="hostOrigin"
        :eventCode="eventCode" :qrSvg="qrSvg" />
</template>