<script setup>
import EventTemplate from '@/views/EventTemplate.vue';

const storageURL = import.meta.env.VITE_STORAGE_URL;
const hasGuestAuth = ref(false);
const alreadyLoaded = ref(false);
const bannerImage = `${storageURL}/static/cover-photo.jpg`;
const captureMode = ref('quick')
const uploadedQuickPhotos = ref([])
const moments = ref([])
const capturedCount = ref(0);
const totalCount = ref(0);
const quickPhotosLeft = ref(0);
const progressPercent = ref(100);
const eventDetails = ref({
    id: 'demo-event',
    token: 'demo-event',
    name: `Jane & John`,
    eventDate: '04-20-2024',
    guestCode: 'demo-guest',
    guestName: 'You',
    eventCategory: 'Wedding',
    photos: [],
})
</script>

<template>
    <EventTemplate :hasGuestAuth="hasGuestAuth" :alreadyLoaded="alreadyLoaded" :eventDetails="eventDetails"
        :bannerImage="bannerImage" :isPressed="false" v-model:captureMode="captureMode" :isDemo="true"
        :isUnlimited="false" :uploadedQuickPhotos="uploadedQuickPhotos" :moments="moments"
        :capturedCount="capturedCount" :quickPhotosLeft="quickPhotosLeft" :totalCount="totalCount"
        :progressPercent="progressPercent" />
</template>