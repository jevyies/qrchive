<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDisplay } from '@/composables/useDisplay'
import AccountInfoModal from '@/views/modals/AccountInfoModal.vue'
import EventDashboard from './event-dashboard.vue'

const router = useRouter()
const authStore = useAuthStore()
const { isMobile } = useDisplay()

// Dynamic display name for user greeting
const displayName = computed(() => {
  return authStore.user?.fullname || authStore.userFullname || 'there'
})

// Account Info Profile Modal State
const isAccountInfoModalOpen = ref(false)
const isSavingProfile = ref(false)

const initialProfileData = computed(() => ({
  accountType: authStore.user?.accountType || 'personal',
  firstName: authStore.user?.firstname || '',
  middleName: authStore.user?.middlename || '',
  lastName: authStore.user?.lastname || '',
  suffix: authStore.user?.extname || authStore.user?.suffix || '',
  extName: authStore.user?.extname || authStore.user?.suffix || '',
  username: authStore.user?.username || '',
  email: authStore.user?.email || '',
}))

const openAccountInfoModal = () => {
  isAccountInfoModalOpen.value = true
}

const handleAccountInfoSubmit = async (payload) => {
  isSavingProfile.value = true
  try {
    if (authStore.user) {
      authStore.user.firstname = payload.firstname || payload.firstName
      authStore.user.middlename = payload.middlename || payload.middleName
      authStore.user.lastname = payload.lastname || payload.lastName
      authStore.user.extname = payload.extname || payload.extName || payload.suffix || null
      authStore.user.username = payload.username || authStore.user.username
      authStore.user.fullname = `${authStore.user.firstname} ${authStore.user.lastname}`.trim()
      authStore.user.accountType = payload.accountType
      // Finalize pending status to active
      authStore.setStatusOverride('active')
      authStore.user.status = 'active'
      if (typeof window !== 'undefined') {
        localStorage.setItem('qrchive_user', JSON.stringify(authStore.user))
      }
    } else {
      authStore.setStatusOverride('active')
    }

    isAccountInfoModalOpen.value = false
  } catch (err) {
    console.error('Failed to save profile:', err)
  } finally {
    isSavingProfile.value = false
  }
}

// Active owner mock statistics (displayed when owner status is active)
const activeStats = ref([
  { label: 'Active Weddings', value: '3', desc: 'In progress', icon: '💍', color: 'primary' },
  { label: 'Total Guests', value: '355', desc: 'Across all events', icon: '👥', color: 'success' },
  { label: 'Team Members', value: '8', desc: 'Assigned staff', icon: '💼', color: 'info' },
  { label: 'Inquiries', value: '12', desc: '4 pending response', icon: '💌', color: 'warning' },
])

// Active owner upcoming weddings list
const upcomingWeddings = ref([
  { id: '1', couple: 'Sophia & Alexander', date: 'Oct 24, 2026', guests: 120, venue: 'Grand Plaza Hall', status: 'Upcoming' },
  { id: '2', couple: 'Emily & James', date: 'Nov 15, 2026', guests: 85, venue: 'Rose Garden Estate', status: 'Planning' },
  { id: '3', couple: 'Olivia & Liam', date: 'Dec 04, 2026', guests: 150, venue: 'Seaside Grand Pavilion', status: 'Upcoming' },
])

const navigateTo = (path) => {
  router.push(path)
}
</script>

<template>
  <div class="owner-dashboard d-flex flex-column gap-4">

    <!-- ============================================================ -->
    <!-- PENDING OWNER ONBOARDING CARD                               -->
    <!-- Displayed when owner status === 'pending'                    -->
    <!-- ============================================================ -->
    <JCard v-if="authStore.isPendingOwner" variant="custom" no-body
      class="bg-surface-container-lowest p-space-lg shadow-sm border border-primary-fixed ring-1 ring-primary/10 relative overflow-hidden flex flex-col gap-space-md"
      :class="{ 'rounded-2xl': !isMobile }">
      <div class="pointer-events-none absolute -right-16 -top-16 w-48 h-48 rounded-full bg-primary-fixed/30 blur-2xl">
      </div>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div class="inline-flex items-center gap-2 px-space-sm py-1 rounded-full bg-primary-fixed/40 w-fit">
          <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span class="font-label-sm text-label-sm uppercase tracking-widest text-primary font-semibold">Event Setup
            Status • 80% Complete</span>
        </div>
        <span class="font-label-sm text-label-sm uppercase tracking-wider text-outline">1 Step Remaining</span>
      </div>
      <div class="flex flex-col gap-1">
        <h2 class="font-headline-md text-headline-md text-on-surface font-normal">You're almost there</h2>
        <p class="font-body-md text-body-md text-on-surface-variant">Fill up the necessary information below to finalize
          your archive and generate your bespoke celebration QR suite.</p>
      </div>
      <div class="flex flex-col gap-1.5">
        <div class="flex justify-between items-center font-label-sm text-label-sm uppercase tracking-wider">
          <span class="text-primary font-semibold">Overall Progress</span>
          <span class="text-on-surface font-semibold">80% Completed</span>
        </div>
        <div class="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
          <div class="h-full rounded-full bg-gradient-to-r from-primary-container via-primary to-primary-fixed"
            style="width: 80%;"></div>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-space-xs pt-1">
        <span
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">
          <span class="material-symbols-outlined text-[13px] text-primary"
            style="font-variation-settings: 'FILL' 1;">check_circle</span> Couple &amp; Event Identity
        </span>
        <span
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">
          <span class="material-symbols-outlined text-[13px] text-primary"
            style="font-variation-settings: 'FILL' 1;">check_circle</span> Styling &amp; Palette Motif
        </span>
        <span
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm">
          <span class="material-symbols-outlined text-[13px] text-primary"
            style="font-variation-settings: 'FILL' 1;">check_circle</span> Scavenger Hunt Checklist
        </span>
        <span
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-fixed/30 text-on-primary-fixed font-label-sm text-label-sm ring-1 ring-primary/20">
          <span class="w-1.5 h-1.5 rounded-full bg-primary"></span> Remaining: Select Vault Archival Tier &amp; Delivery
          Details
        </span>
      </div>
      <div class="pt-1 flex justify-end">
        <button type="button"
          class="inline-flex items-center justify-center gap-1.5 px-space-md py-2.5 rounded-xl bg-gradient-to-r from-primary-container via-primary to-primary text-on-primary font-label-md text-label-md uppercase tracking-widest font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border-none"
          @click="openAccountInfoModal">
          <span class="">Complete Final Step</span>
          <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </JCard>

    <!-- ============================================================ -->
    <!-- ACTIVE OWNER DASHBOARD                                      -->
    <!-- Displayed when owner status !== 'pending'                    -->
    <!-- ============================================================ -->
    <div v-else class="d-flex flex-column gap-4">
      <EventDashboard />
    </div>

    <!-- Complete Profile Account Info Modal -->
    <AccountInfoModal v-model="isAccountInfoModalOpen" :initial-data="initialProfileData" :loading="isSavingProfile"
      @submit="handleAccountInfoSubmit" />
  </div>
</template>

<style scoped>
.owner-dashboard {
  width: 100%;
}

/* ==========================================================================
   Onboarding Setup Card (M3 Design Tokens & Utility Classes)
   ========================================================================== */

.rounded-2xl {
  border-radius: 1rem !important;
}

.bg-surface-container-lowest {
  background-color: var(--bg-surface, #201b18) !important;
}

.p-space-lg {
  padding: 1.5rem !important;

  @media (min-width: 640px) {
    padding: 1.75rem !important;
  }
}

.gap-space-md {
  gap: 1.25rem !important;
}

.gap-space-sm {
  gap: 0.75rem !important;
}

.gap-space-xs {
  gap: 0.5rem !important;
}

.px-space-md {
  padding-left: 1.25rem !important;
  padding-right: 1.25rem !important;
}

.px-space-sm {
  padding-left: 0.75rem !important;
  padding-right: 0.75rem !important;
}

.border-primary-fixed {
  border-color: rgba(197, 160, 89, 0.3) !important;
}

.ring-1 {
  box-shadow: 0 0 0 1px rgba(197, 160, 89, 0.15) !important;
}

.shadow-sm {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.12), 0 1px 2px -1px rgba(0, 0, 0, 0.08) !important;
}

[class*="-right-16"],
.-right-16 {
  right: -4rem !important;
}

[class*="-top-16"],
.-top-16 {
  top: -4rem !important;
}

.w-48 {
  width: 12rem !important;
}

.h-48 {
  height: 12rem !important;
}

[class*="bg-primary-fixed/30"],
.bg-primary-fixed\/30 {
  background-color: rgba(197, 160, 89, 0.22) !important;
}

[class*="bg-primary-fixed/40"],
.bg-primary-fixed\/40 {
  background-color: rgba(197, 160, 89, 0.15) !important;
}

.blur-2xl {
  filter: blur(40px) !important;
}

.w-2 {
  width: 0.5rem !important;
}

.h-2 {
  height: 0.5rem !important;
}

[class*="w-1.5"],
.w-1\.5 {
  width: 0.375rem !important;
}

[class*="h-1.5"],
.h-1\.5 {
  height: 0.375rem !important;
}

.bg-primary {
  background-color: var(--primary, #c5a059) !important;
}

.animate-pulse {
  animation: m3-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
}

@keyframes m3-pulse {

  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.45;
    transform: scale(1.15);
  }
}

.font-label-sm,
.text-label-sm {
  font-size: 0.6875rem !important;
  line-height: 1rem !important;
}

.font-label-md,
.text-label-md {
  font-size: 0.75rem !important;
  line-height: 1rem !important;
}

.font-headline-md,
.text-headline-md {
  font-size: 1.5rem !important;
  line-height: 2rem !important;
  font-family: var(--font-heading, 'Playfair Display', serif) !important;
}

.font-body-md,
.text-body-md {
  font-size: 0.875rem !important;
  line-height: 1.375rem !important;
}

.text-on-surface {
  color: var(--text-primary, #fdfbf7) !important;
}

.text-on-surface-variant {
  color: var(--text-secondary, #d9cfc4) !important;
}

.text-outline {
  color: var(--text-muted, #9c9285) !important;
}

.text-primary {
  color: var(--primary, #c5a059) !important;
}

.text-on-primary-fixed {
  color: var(--primary-active, #d7b465) !important;
}

.text-on-primary {
  color: #ffffff !important;
}

.bg-surface-container-high {
  background-color: rgba(197, 160, 89, 0.12) !important;
}

.bg-surface-container-low {
  background-color: var(--bg-surface-tonal, rgba(197, 160, 89, 0.08)) !important;
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.15)) !important;
}

.bg-gradient-to-r {
  background-image: linear-gradient(90deg, #b08d48 0%, var(--primary, #c5a059) 60%, #d8b46d 100%) !important;
}

[class*="ring-primary/20"],
.ring-primary\/20 {
  box-shadow: 0 0 0 1px rgba(197, 160, 89, 0.3) !important;
}

[class*="ring-primary/10"],
.ring-primary\/10 {
  box-shadow: 0 0 0 1px rgba(197, 160, 89, 0.15) !important;
}

[class*="text-[13px]"],
.text-\[13px\] {
  font-size: 13px !important;
}

[class*="text-[18px]"],
.text-\[18px\] {
  font-size: 18px !important;
}

.tracking-widest {
  letter-spacing: 0.1em !important;
}

.gap-1 {
  gap: 0.25rem !important;
}

[class*="gap-1.5"],
.gap-1\.5 {
  gap: 0.375rem !important;
}

.py-1 {
  padding-top: 0.25rem !important;
  padding-bottom: 0.25rem !important;
}

.py-2\.5 {
  padding-top: 0.625rem !important;
  padding-bottom: 0.625rem !important;
}

.px-2\.5 {
  padding-left: 0.625rem !important;
  padding-right: 0.625rem !important;
}

.pt-1 {
  padding-top: 0.25rem !important;
}

.rounded-xl {
  border-radius: 0.75rem !important;
}

.rounded-full {
  border-radius: 9999px !important;
}

.w-fit {
  width: fit-content !important;
}

.w-full {
  width: 100% !important;
}

.h-full {
  height: 100% !important;
}

.flex {
  display: flex !important;
}

.inline-flex {
  display: inline-flex !important;
}

.flex-col {
  flex-direction: column !important;
}

.flex-wrap {
  flex-wrap: wrap !important;
}

.items-center {
  align-items: center !important;
}

.justify-between {
  justify-content: space-between !important;
}

.justify-end {
  justify-content: flex-end !important;
}

.relative {
  position: relative !important;
}

.absolute {
  position: absolute !important;
}

.overflow-hidden {
  overflow: hidden !important;
}

.pointer-events-none {
  pointer-events: none !important;
}

.font-normal {
  font-weight: 400 !important;
}

.font-semibold {
  font-weight: 600 !important;
}

.uppercase {
  text-transform: uppercase !important;
}

.transition-all {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.15) !important;
}

[class*="hover:shadow-lg"]:hover,
.hover\:shadow-lg:hover {
  box-shadow: 0 10px 15px -3px rgba(197, 160, 89, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.2) !important;
}

[class*="hover:scale-[1.01]"]:hover,
.hover\:scale-\[1\.01\]:hover {
  transform: scale(1.01);
}

[class*="active:scale-[0.99]"]:active,
.active\:scale-\[0\.99\]:active {
  transform: scale(0.99);
}

@media (min-width: 640px) {

  [class*="sm:flex-row"],
  .sm\:flex-row {
    flex-direction: row !important;
  }

  [class*="sm:items-center"],
  .sm\:items-center {
    align-items: center !important;
  }
}

.stat-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-md, 0.5rem);
  font-size: 1rem;
}

.text-2xs {
  font-size: 0.7rem;
}

.badge-2xs {
  font-size: 0.65rem;
  padding: 0.15rem 0.4rem;
}

.tracking-wider {
  letter-spacing: 0.05em;
}
</style>
