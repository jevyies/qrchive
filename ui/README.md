# QRchive — Vue 3 Web Application

A lightweight, enterprise-grade Vue 3 application and design system built from the ground up with **Vite**, **Vanilla SCSS**, and modern **Composition API**. Designed for maximum visual polish, dynamic responsiveness, high-contrast dark mode fidelity, and zero bloated external CSS frameworks.

---

## ⚡ Highlights

- **Pure Vue 3 & SCSS Architecture**: Zero Tailwind, zero Bootstrap, zero heavy UI runtime dependencies. Complete design tokens, utility classes, and glassmorphic surface mixins.
- **Enterprise Component Library (`@core`)**: Production-ready components including DataTables, Date/Time pickers, Form controls, Modals, Offcanvas Drawers, Tabs, Paginations, and Toasts.
- **Offcanvas Drawer System**: Authentic edge-docked sliding panels (`drawer="right"`, `drawer="left"`, `drawer="bottom"`, `drawer="top"`) with hardware-accelerated animations and full-height layouts.
- **Reactive Toast Notification Engine (`useToast()`)**: 9 viewport anchor coordinates, animated countdown progress bars, pause-on-hover, sticky alerts, and interactive undo action callbacks.
- **Deep Dark Mode & Multi-Theme Customizer**: Live real-time theme customization supporting accent colors, surface elevations, frosted glassmorphism, border radii, and font scaling.
- **Production-Ready Application Suites**:
  - 💬 **Team Chat & Messaging**: Direct messages, channels, resizable sidebar with drag divider handle, emoji reactions, and collapsible info drawer.
  - 📋 **Kanban Roadmap**: Drag-and-drop task tracking, progress metrics, column workflows, and task creation modals.
  - ✉️ **Email Client**: Multi-folder mailbox, message tagging, search, star/archive triage, and compose dialogs.
  - 📊 **Enterprise DataTables**: Multi-column sorting, search filters, pagination, batch export/delete, and row expansion.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`) |
| **Build Tool** | [Vite 8](https://vite.dev/) with fast HMR |
| **Styling** | Vanilla [SASS / SCSS](https://sass-lang.com/) Design System |
| **State Management** | [Pinia 3](https://pinia.vuejs.org/) |
| **Routing** | [Vue Router 5](https://router.vuejs.org/) + `vite-plugin-pages` (file-based routing) |
| **Utilities** | [@vueuse/core](https://vueuse.org/), Axios |
| **Code Quality** | ESLint, Prettier, Oxlint |

---

## 📂 Project Structure

```text
ui/
├── src/
│   ├── @core/
│   │   ├── components/            # Reusable UI component library
│   │   │   ├── JBtn.vue           # Buttons with variants (solid, tonal, outlined, glass, ghost)
│   │   │   ├── JCard.vue          # Elevated, bordered, and glassmorphic card containers
│   │   │   ├── JCheckbox.vue      # Custom check inputs with indeterminate state
│   │   │   ├── JDataTable.vue     # Enterprise table with sorting, search, pagination, selection
│   │   │   ├── JDatePicker.vue    # Full-featured interactive date picker
│   │   │   ├── JIcon.vue          # Vector mask icon component (solid & outlined variants)
│   │   │   ├── JInput.vue         # Text input with prepend/append icons, clearable & validation
│   │   │   ├── JModal.vue         # 9-point position dialogs & edge-docked offcanvas drawers
│   │   │   ├── JPagination.vue    # Sized pagination controllers with quick jump
│   │   │   ├── JRadio.vue         # Radio group controls
│   │   │   ├── JSelect.vue        # Dropdown selection input
│   │   │   ├── JSwitch.vue        # Toggle switch controls
│   │   │   ├── JTabs.vue          # Dynamic animated tab switchers
│   │   │   ├── JTextarea.vue      # Auto-expanding multiline text field
│   │   │   ├── JTimePicker.vue    # Time selection overlay
│   │   │   ├── JToast.vue         # Toast notification item component
│   │   │   └── JToastContainer.vue# Multi-anchor toast stack containers
│   │   └── composables/           # Shared reactive composables
│   │       ├── useDisplay.js      # Responsive breakpoints & viewport metrics
│   │       └── useToast.js        # Global toast notification dispatch system
│   ├── navigations/               # App shell headers and sidebars
│   ├── pages/                     # Application routes & showcase pages
│   │   ├── overview.vue           # Dashboard overview and metrics
│   │   ├── chat.vue               # Team messaging app with resizable sidebar
│   │   ├── kanban.vue             # Sprint roadmap with drag-and-drop cards
│   │   ├── email.vue              # Complete email triage client
│   │   ├── modals.vue             # Modal dialogs & offcanvas drawers showcase
│   │   ├── toasts.vue             # Notification engine & 9-position playground
│   │   ├── tables.vue             # Interactive DataTables and HTML5 tables
│   │   ├── forms.vue              # Form controls and validation matrix
│   │   ├── buttons.vue            # Button gallery, states, and sizes
│   │   ├── cards.vue              # Card surfaces and media layouts
│   │   ├── login.vue              # Modern authentication sign-in
│   │   ├── register.vue           # Account registration flow
│   │   ├── 404.vue / 500.vue      # Animated error handling pages
│   │   └── utilities.vue          # Spacing, flexbox, grid, and effects reference
│   ├── stores/                    # Pinia global stores (theme, layout)
│   └── styles/                    # Modular SCSS design system
│       ├── base/                  # Reset, typography, and root variables
│       ├── components/            # Component-specific SCSS modules
│       ├── themes/                # Light, dark, and custom brand theme definitions
│       └── utilities/             # Flex, grid, spacing, animations, effects
├── package.json
└── vite.config.js
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `^22.18.0` or `>=24.12.0`
- **Package Manager**: `npm` (or `pnpm` / `yarn`)

### Installation

```sh
# Clone repository
git clone https://github.com/jevyies/jui.git
cd jui

# Install project dependencies
npm install
```

### Development Server

Start Vite local development server with hot-module replacement (HMR):

```sh
npm run dev
```

The application will be accessible at `http://localhost:5173`.

### Production Build

Compile and optimize assets for deployment:

```sh
npm run build
```

Preview the production build locally:

```sh
npm run preview
```

### Code Quality & Formatting

```sh
# Run fast Oxlint & ESLint checks
npm run lint

# Format code with Prettier
npm run format

# Automatically sync newly added SVG icons into SCSS
npm run icons:sync
```

---

## 💡 Usage Examples

### 1. Buttons (`<JBtn />`)

```vue
<script setup>
import JBtn from '@core/components/JBtn.vue'
</script>

<template>
  <JBtn color="primary" variant="solid" size="md">Primary Solid</JBtn>
  <JBtn color="success" variant="tonal" size="sm" prepend-icon="✓">Approved</JBtn>
  <JBtn color="danger" variant="outlined" size="sm">Delete</JBtn>
  <JBtn color="neutral" variant="glass" size="md">Glassmorphic</JBtn>
</template>
```

### 2. Modals & Offcanvas Drawers (`<JModal />`)

```vue
<script setup>
import { ref } from 'vue'
import JModal from '@core/components/JModal.vue'
import JBtn from '@core/components/JBtn.vue'

const isModalOpen = ref(false)
const isDrawerOpen = ref(false)
</script>

<template>
  <!-- Centered Modal Dialog -->
  <JBtn color="primary" @click="isModalOpen = true">Open Modal</JBtn>
  <JModal
    v-model="isModalOpen"
    title="Subscription Plan"
    subtitle="Configure workspace seats"
    size="md"
    position="center"
  >
    <p>Modal body content...</p>
    <template #footer>
      <JBtn variant="tonal" color="neutral" size="sm" @click="isModalOpen = false">Cancel</JBtn>
      <JBtn color="primary" size="sm" @click="isModalOpen = false">Confirm</JBtn>
    </template>
  </JModal>

  <!-- Edge-Docked Right Offcanvas Drawer -->
  <JBtn color="secondary" @click="isDrawerOpen = true">Open Right Drawer</JBtn>
  <JModal
    v-model="isDrawerOpen"
    title="Shopping Cart"
    drawer="right"
    size="md"
  >
    <p>Full-height scrollable drawer panel docked flush to the right edge.</p>
    <template #footer>
      <JBtn color="primary" block @click="isDrawerOpen = false">Checkout</JBtn>
    </template>
  </JModal>
</template>
```

### 3. Floating Toasts (`useToast()`)

```vue
<script setup>
import { useToast } from '@/composables/useToast'
import JBtn from '@core/components/JBtn.vue'

const toast = useToast()

const notify = () => {
  // Quick semantic helper
  toast.success('Project deployed successfully!')

  // Custom configured toast with interactive undo
  toast.show({
    title: 'Item Archived',
    message: 'Record #4928 was moved to cold storage.',
    position: 'bottom-right',
    color: 'warning',
    variant: 'tonal',
    size: 'md',
    timeout: 5000,
    showProgress: true,
    action: {
      label: 'Undo',
      onClick: (t) => {
        toast.dismiss(t.id)
        toast.info('Action reverted.')
      },
    },
  })
}
</script>

<template>
  <JBtn color="primary" @click="notify">Show Notification</JBtn>
</template>
```

### 4. Enterprise DataTable (`<JDataTable />`)

```vue
<script setup>
import { ref } from 'vue'
import JDataTable from '@core/components/JDataTable.vue'

const columns = [
  { key: 'name', label: 'User Name', sortable: true },
  { key: 'role', label: 'Access Role', sortable: true },
  { key: 'status', label: 'Account Status', sortable: true },
  { key: 'billing', label: 'Monthly Billing', sortable: true },
]

const items = ref([
  { id: 1, name: 'Alexandre Vance', role: 'Enterprise Admin', status: 'Active', billing: 14200 },
  { id: 2, name: 'Elena Rostova', role: 'Security Engineer', status: 'Active', billing: 9450 },
])
</script>

<template>
  <JDataTable
    :columns="columns"
    :items="items"
    title="User Management"
    subtitle="Active accounts and authorization tiers"
    :selectable="true"
    :paginated="true"
    :pageSize="10"
  />
</template>
```

### 5. Vector Icons (`<JIcon />`) & Adding New Icons

JUI features a native vector icon system powered by CSS `mask-image`. Icons inherit their color from `currentColor`, scale proportionally with font sizes (`1em`), and support both `solid` and `outlined` styles.

#### Component Usage

```vue
<script setup>
import JIcon from '@core/components/JIcon.vue'
</script>

<template>
  <!-- Solid variant (default) -->
  <JIcon name="home" />

  <!-- Outlined variant -->
  <JIcon name="truck" type="outlined" />

  <!-- Preset sizes and theme colors -->
  <JIcon name="bell" size="lg" color="primary" />
  <JIcon name="circle-check" size="2xl" color="success" />

  <!-- Continuous spin animation -->
  <JIcon name="spinner" spin />
</template>
```

#### Adding & Syncing New Icons (Automatic 1-Command Sync)

When you download or create new `.svg` icons, sync them automatically with a single command:

1. **Place your SVG files** in the appropriate variant folders:
   - Solid: `src/assets/icons/solid/[icon-name].svg`
   - Outlined: `src/assets/icons/outlined/[icon-name].svg`

2. **Run the sync command**:
   ```sh
   npm run icons:sync
   ```
   *This automatically scans both folders, registers all icons in `src/styles/components/_icons.scss`, and sets up root fallbacks.*

3. **Use the new icon immediately** in your templates:
   ```html
   <JIcon name="[icon-name]" />
   <JIcon name="[icon-name]" type="outlined" />
   ```

---

## 🧭 Navigation & Layout Architecture

JUI supports flexible navigation layouts switchable at runtime with state persisted to `localStorage`:

- **Fixed Sidebar Mode (`sidebar`)**: Traditional enterprise left navigation bar with 3-tier hierarchical accordion menus and collapsing support.
- **Top Navbar Mode (`navbar`)**: Horizontal header navigation with two sub-styles:
  - **Inline Navbar (`inline`, Default)**: All navigation menus and dropdowns are cleanly embedded inside the primary top header.
  - **Menu-Bar (`menu-bar`)**: The menu is moved out of the top header into a dedicated sub-navbar directly below the top header, while the top header displays the logo, breadcrumb hierarchy, and global utility controls.

---

## 🎨 Theme System & Design Tokens

JUI features a token-driven SCSS engine with CSS variable roots. The entire system supports dynamic mode toggling:

- **Surface Tokens**: `--bg-surface`, `--bg-surface-elevated`, `--bg-surface-tonal`, `--bg-glass`
- **Color Palettes**: Primary (Indigo), Secondary (Slate), Success (Emerald), Warning (Amber), Danger (Rose), Info (Sky), Neutral (Zinc)
- **Border & Shadow Scales**: Configurable radii (`$radius-sm` to `$radius-full`) and elevation shadows (`$shadow-sm` to `$shadow-xl`).
- **Glassmorphic Effects**: Automated backdrop filter blur with translucent luminous borders.

---

## 📄 License

Private & Proprietary © JUI Team. All rights reserved.
