<script setup>
import { ref } from 'vue'
import EventDetailsSubtab from './EventDetailsSubtab.vue'
import EventChecklistsSubtab from './EventChecklistsSubtab.vue'
import EventBackgroundSubtab from './EventBackgroundSubtab.vue'
import EventQrCodeSubtab from './EventQrCodeSubtab.vue'

const props = defineProps({
  eventCode: {
    type: String,
    required: true,
  },
  eventData: {
    type: Object,
    default: () => ({}),
  },
  coupleNames: {
    type: String,
    default: '',
  },
  formattedEventDate: {
    type: String,
    default: '',
  },
  hostOrigin: {
    type: String,
    default: '',
  },
  qrSvg: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['refresh-event', 'refresh-checklists', 'refresh-backgrounds', 'download-qr', 'copy-url'])

// Default tab: 'details' as requested
const activeSubtab = ref('details')

const verticalNavItems = [
  {
    id: 'details',
    label: 'Event Details',
    desc: 'Celebration info & RSVP deadlines',
    icon: 'tune',
  },
  {
    id: 'checklists',
    label: 'Event Checklists',
    desc: 'Curated moments & shot lists',
    icon: 'checklist',
  },
  {
    id: 'background',
    label: 'Event Background',
    desc: 'Mobile & desktop viewports',
    icon: 'wallpaper',
  },
  {
    id: 'qrcode',
    label: 'Event QR Code',
    desc: 'Guest access pass & placard',
    icon: 'qr_code_2',
  },
]
</script>

<template>
  <div class="event-detail__tab-body event-manage-tab">
    <div class="vtabs-container">
      <!-- Left Side: Vertical Tabs Navigation -->
      <aside class="vtabs-sidebar">
        <div class="vtabs-sidebar__header">
          <span class="vtabs-sidebar__badge">Settings &amp; Access</span>
          <h3 class="vtabs-sidebar__title">Event Management</h3>
        </div>

        <nav class="vtabs-nav" role="tablist">
          <button
            v-for="item in verticalNavItems"
            :key="item.id"
            type="button"
            class="vtab-btn"
            :class="{ 'is-active': activeSubtab === item.id }"
            role="tab"
            :aria-selected="activeSubtab === item.id"
            @click="activeSubtab = item.id"
          >
            <div class="vtab-btn__icon-box">
              <span class="material-symbols-outlined vtab-icon">{{ item.icon }}</span>
            </div>

            <div class="vtab-btn__text">
              <span class="vtab-btn__title">{{ item.label }}</span>
              <span class="vtab-btn__desc">{{ item.desc }}</span>
            </div>

            <span class="material-symbols-outlined vtab-btn__arrow">chevron_right</span>
          </button>
        </nav>
      </aside>

      <!-- Right Side: Active Subtab Content -->
      <main class="vtabs-main">
        <EventDetailsSubtab
          v-if="activeSubtab === 'details'"
          :event-data="eventData"
          :event-code="eventCode"
          @saved="emit('refresh-event')"
        />

        <EventChecklistsSubtab
          v-else-if="activeSubtab === 'checklists'"
          :event-code="eventCode"
          :event-data="eventData"
          @updated="emit('refresh-checklists')"
        />

        <EventBackgroundSubtab
          v-else-if="activeSubtab === 'background'"
          :event-code="eventCode"
          :event-data="eventData"
          @saved="emit('refresh-backgrounds')"
        />

        <EventQrCodeSubtab
          v-else-if="activeSubtab === 'qrcode'"
          :event-code="eventCode"
          :couple-names="coupleNames"
          :formatted-event-date="formattedEventDate"
          :host-origin="hostOrigin"
          :qr-svg="qrSvg"
          @download-qr="emit('download-qr')"
          @copy-url="emit('copy-url')"
        />
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.event-manage-tab {
  width: 100%;
}

.vtabs-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: var(--bg-surface-elevated, #ffffff);
  border: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.2));
  border-radius: var(--radius-xl, 0.75rem);
  padding: 1.25rem;
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));

  @media (min-width: 992px) {
    flex-direction: row;
    align-items: flex-start;
    padding: 1.75rem;
    gap: 2rem;
  }
}

.vtabs-sidebar {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex-shrink: 0;

  @media (min-width: 992px) {
    width: 280px;
    border-right: 1px solid var(--border-color-subtle, rgba(197, 160, 89, 0.15));
    padding-right: 1.5rem;
  }

  &__header {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  &__badge {
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--primary, #c5a059);
  }

  &__title {
    font-family: var(--font-heading, 'Playfair Display', Georgia, serif);
    font-size: 1.25rem;
    font-weight: 400;
    margin: 0;
    color: var(--text-primary, #1f1b18);
  }
}

.vtabs-nav {
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  gap: 0.5rem;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (min-width: 992px) {
    flex-direction: column;
    overflow-x: visible;
  }
}

.vtab-btn {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0.75rem;
  border-radius: var(--radius-md, 0.375rem);
  border: 1px solid transparent;
  background: transparent;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  color: var(--text-secondary, #4e4639);

  @media (min-width: 992px) {
    white-space: normal;
    width: 100%;
  }

  &:hover {
    background: var(--bg-hover, rgba(197, 160, 89, 0.08));
    color: var(--text-primary, #1f1b18);
  }

  &.is-active {
    background: var(--bg-surface-tonal, rgba(197, 160, 89, 0.12));
    border-color: var(--border-color-subtle, rgba(197, 160, 89, 0.3));
    color: var(--primary, #c5a059);

    .vtab-btn__icon-box {
      background: var(--primary, #c5a059);
      color: var(--primary-text, #ffffff);
    }

    .vtab-btn__title {
      color: var(--primary, #c5a059);
      font-weight: 700;
    }

    .vtab-btn__desc {
      color: var(--text-secondary, #4e4639);
    }

    .vtab-btn__arrow {
      opacity: 1;
      transform: translateX(2px);
      color: var(--primary, #c5a059);
    }
  }

  &__icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.85rem;
    height: 1.85rem;
    border-radius: var(--radius-sm, 0.25rem);
    background: var(--bg-surface-tonal, rgba(197, 160, 89, 0.08));
    color: var(--primary, #c5a059);
    flex-shrink: 0;
    transition: all 0.2s ease;

    .vtab-icon {
      font-size: 1.1rem;
    }
  }

  &__text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }

  &__title {
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.25;
  }

  &__desc {
    display: none;
    font-size: 0.65rem;
    color: var(--text-muted, #7f7667);
    line-height: 1.3;
    margin-top: 0.1rem;

    @media (min-width: 992px) {
      display: block;
    }
  }

  &__arrow {
    font-size: 1.15rem;
    opacity: 0;
    transition: all 0.2s ease;
    display: none;

    @media (min-width: 992px) {
      display: inline-block;
    }
  }
}

.vtabs-main {
  flex: 1;
  min-width: 0;
}
</style>
