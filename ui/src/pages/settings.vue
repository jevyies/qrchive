<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const emailNotifications = ref(true)
const rsvpAlerts = ref(true)
const tokenExpiryWarning = ref(true)
const themeMode = ref('dark')
</script>

<template>
  <div class="d-flex flex-column gap-4">
    <!-- Header -->
    <div class="d-flex flex-column flex-md-row align-start align-md-center justify-between gap-3">
      <div>
        <div class="d-flex align-center gap-2 mb-1">
          <span style="font-size: 1.5rem;">⚙️</span>
          <h1 class="text-xl font-bold mb-0">Platform Settings</h1>
          <span class="badge badge-xs badge-tonal-primary font-mono text-uppercase">Admin & Owner Access</span>
        </div>
        <p class="text-xs text-muted mb-0">
          Configure application preferences, security alerts, and system-wide options.
        </p>
      </div>

      <div class="d-flex align-center gap-2">
        <button class="btn btn-sm btn-primary">Save Changes</button>
      </div>
    </div>

    <!-- Settings Cards -->
    <div class="d-grid grid-cols-1 grid-cols-md-2 gap-4">
      <!-- General Preferences -->
      <JCard variant="bordered" body-class="p-4 d-flex flex-column gap-3">
        <h2 class="text-base font-bold mb-1">General Preferences</h2>
        <div class="d-flex align-center justify-between py-2 border-bottom border-subtle">
          <div>
            <div class="text-sm font-semibold">Email Notifications</div>
            <div class="text-xs text-muted">Receive updates about wedding status and new RSVPs</div>
          </div>
          <input type="checkbox" v-model="emailNotifications" class="form-check-input" />
        </div>

        <div class="d-flex align-center justify-between py-2 border-bottom border-subtle">
          <div>
            <div class="text-sm font-semibold">Live RSVP Alerts</div>
            <div class="text-xs text-muted">Toast alert when a guest submits a confirmation</div>
          </div>
          <input type="checkbox" v-model="rsvpAlerts" class="form-check-input" />
        </div>

        <div class="d-flex align-center justify-between py-2">
          <div>
            <div class="text-sm font-semibold">Token Expiry Reminder</div>
            <div class="text-xs text-muted">Visual notification 1 minute before token refresh cycle</div>
          </div>
          <input type="checkbox" v-model="tokenExpiryWarning" class="form-check-input" />
        </div>
      </JCard>

      <!-- Security & Role Info -->
      <JCard variant="bordered" body-class="p-4 d-flex flex-column gap-3">
        <h2 class="text-base font-bold mb-1">Security & Session</h2>
        <div class="p-3 rounded border border-subtle bg-surface d-flex flex-column gap-2">
          <div class="d-flex align-center justify-between text-xs">
            <span class="text-muted">Active Role Claim (authPosition):</span>
            <span class="badge badge-xs badge-tonal-primary font-mono text-uppercase">{{ authStore.authPosition }}</span>
          </div>
          <div class="d-flex align-center justify-between text-xs">
            <span class="text-muted">Current Account:</span>
            <span class="font-semibold">{{ authStore.userFullname }}</span>
          </div>
          <div class="d-flex align-center justify-between text-xs">
            <span class="text-muted">Auth Provider:</span>
            <span class="badge badge-xs badge-tonal-neutral font-mono text-uppercase">{{ authStore.user?.authProvider || 'manual' }}</span>
          </div>
        </div>
      </JCard>
    </div>
  </div>
</template>
