<script setup>
import { ref, computed, watch } from 'vue'
import { themeConfig } from '../../theme.config'

const props = defineProps({
  // Active Page (v-model)
  modelValue: {
    type: Number,
    default: 1,
  },
  // Total Items Count
  total: {
    type: Number,
    default: 0,
  },
  // Items per page
  pageSize: {
    type: Number,
    default: () => themeConfig.pagination?.pageSize || 10,
  },
  // Explicit Total Pages count (if total items not specified)
  length: {
    type: Number,
    default: null,
  },
  totalPages: {
    type: Number,
    default: null,
  },
  // Sizing: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  size: {
    type: String,
    default: () => themeConfig.pagination?.size || 'md',
    validator: (v) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(v),
  },
  // Shape: 'rounded' | 'pill' | 'circle' | 'square'
  shape: {
    type: String,
    default: () => themeConfig.pagination?.shape || 'rounded',
    validator: (v) => ['rounded', 'pill', 'circle', 'square'].includes(v),
  },
  // Boolean shape shortcuts
  rounded: {
    type: [Boolean, String],
    default: true,
  },
  pill: {
    type: Boolean,
    default: false,
  },
  circle: {
    type: Boolean,
    default: false,
  },
  square: {
    type: Boolean,
    default: false,
  },
  // Pattern / Variant: 'solid' | 'tonal' | 'outlined' | 'ghost' | 'glass'
  variant: {
    type: String,
    default: () => themeConfig.pagination?.variant || 'solid',
    validator: (v) => ['solid', 'tonal', 'soft', 'outlined', 'bordered', 'ghost', 'text', 'glass'].includes(v),
  },
  // Color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  color: {
    type: String,
    default: () => themeConfig.pagination?.color || 'primary',
  },
  // Attached / Connected Toolbar Style
  attached: {
    type: Boolean,
    default: () => themeConfig.pagination?.attached ?? false,
  },
  // Simple / Minimal Compact Mode (< 3 / 10 >)
  simple: {
    type: Boolean,
    default: () => themeConfig.pagination?.simple ?? false,
  },
  // Navigation button controls
  showPrevNext: {
    type: Boolean,
    default: true,
  },
  showFirstLast: {
    type: Boolean,
    default: () => themeConfig.pagination?.showFirstLast ?? false,
  },
  prevText: {
    type: String,
    default: null,
  },
  nextText: {
    type: String,
    default: null,
  },
  firstText: {
    type: String,
    default: null,
  },
  lastText: {
    type: String,
    default: null,
  },
  // Sibling visible page count before ellipsis
  siblingCount: {
    type: Number,
    default: 1,
  },
  // Total info display
  showTotal: {
    type: [Boolean, Function],
    default: () => themeConfig.pagination?.showTotal ?? false,
  },
  // Quick Jumper input
  showQuickJumper: {
    type: Boolean,
    default: () => themeConfig.pagination?.showQuickJumper ?? false,
  },
  // Page size selector
  showPageSize: {
    type: Boolean,
    default: () => themeConfig.pagination?.showPageSize ?? false,
  },
  pageSizes: {
    type: Array,
    default: () => themeConfig.pagination?.pageSizes || [10, 20, 50, 100],
  },
  // Alignment: 'start' | 'center' | 'end' | 'between'
  align: {
    type: String,
    default: 'start',
    validator: (v) => ['start', 'center', 'end', 'between', 'left', 'right'].includes(v),
  },
  // Layout arrangement order: e.g. 'total, pageSize, pager, jumper' or 'pageSize, total, pager'
  layout: {
    type: [String, Array],
    default: () => themeConfig.pagination?.layout || 'total, pageSize, pager, jumper',
  },
  // Disabled state
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'update:modelValue',
  'change',
  'update:pageSize',
  'pageSizeChange',
  'prev',
  'next',
  'first',
  'last',
])

// Computed Total Pages
const computedTotalPages = computed(() => {
  if (props.totalPages !== null && props.totalPages > 0) return props.totalPages
  if (props.length !== null && props.length > 0) return props.length
  if (props.total > 0 && props.pageSize > 0) {
    return Math.max(1, Math.ceil(props.total / props.pageSize))
  }
  return 1
})

// Current Page Safe Clamp
const currentPage = computed(() => {
  const page = props.modelValue || 1
  return Math.max(1, Math.min(page, computedTotalPages.value))
})

// Quick Jumper input state
const jumperValue = ref('')

// Computed shape class
const computedShapeClass = computed(() => {
  if (props.square) return 'pagination-square'
  if (props.pill || props.circle) return 'pagination-pill'
  if (typeof props.rounded === 'string') {
    if (props.rounded === 'pill' || props.rounded === 'circle') return 'pagination-pill'
    if (props.rounded === 'square') return 'pagination-square'
  }
  if (props.shape === 'pill' || props.shape === 'circle') return 'pagination-pill'
  if (props.shape === 'square') return 'pagination-square'
  return 'pagination-rounded'
})

// Computed variant class
const computedVariantClass = computed(() => {
  const v = props.variant?.toLowerCase() || 'solid'
  if (v === 'tonal' || v === 'soft') return 'pagination-tonal'
  if (v === 'outlined' || v === 'bordered') return 'pagination-outlined'
  if (v === 'ghost' || v === 'text') return 'pagination-ghost'
  if (v === 'glass') return 'pagination-glass'
  return 'pagination-solid'
})

// Computed color class
const computedColorClass = computed(() => {
  return `pagination-${props.color || 'primary'}`
})

// Computed align class
const computedAlignClass = computed(() => {
  if (props.align === 'center') return 'align-center'
  if (props.align === 'end' || props.align === 'right') return 'align-end'
  if (props.align === 'between') return 'align-between'
  return 'align-start'
})

// Smart Page Items Generation with Ellipsis
const paginationItems = computed(() => {
  const total = computedTotalPages.value
  const current = currentPage.value
  const siblings = Math.max(1, props.siblingCount)

  // If total pages is small, show all pages directly
  if (total <= 5 + siblings * 2) {
    return Array.from({ length: total }, (_, i) => ({
      type: 'page',
      page: i + 1,
      active: i + 1 === current,
    }))
  }

  const leftSiblingIndex = Math.max(current - siblings, 1)
  const rightSiblingIndex = Math.min(current + siblings, total)

  const shouldShowLeftDots = leftSiblingIndex > 2
  const shouldShowRightDots = rightSiblingIndex < total - 2

  const items = []

  // Always show first page
  items.push({
    type: 'page',
    page: 1,
    active: current === 1,
  })

  // Left Ellipsis
  if (shouldShowLeftDots) {
    items.push({
      type: 'ellipsis',
      key: 'left-ellipsis',
      jumpTarget: Math.max(1, current - 5),
      direction: 'backward',
    })
  } else {
    for (let i = 2; i < leftSiblingIndex; i++) {
      items.push({
        type: 'page',
        page: i,
        active: current === i,
      })
    }
  }

  // Middle sibling pages
  for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
    if (i !== 1 && i !== total) {
      items.push({
        type: 'page',
        page: i,
        active: current === i,
      })
    }
  }

  // Right Ellipsis
  if (shouldShowRightDots) {
    items.push({
      type: 'ellipsis',
      key: 'right-ellipsis',
      jumpTarget: Math.min(total, current + 5),
      direction: 'forward',
    })
  } else {
    for (let i = rightSiblingIndex + 1; i < total; i++) {
      items.push({
        type: 'page',
        page: i,
        active: current === i,
      })
    }
  }

  // Always show last page
  if (total > 1) {
    items.push({
      type: 'page',
      page: total,
      active: current === total,
    })
  }

  return items
})

// Entry range info
const startEntry = computed(() => {
  if (props.total === 0) return 0
  return (currentPage.value - 1) * props.pageSize + 1
})

const endEntry = computed(() => {
  if (props.total === 0) return 0
  return Math.min(currentPage.value * props.pageSize, props.total)
})

// Navigation methods
const selectPage = (page) => {
  if (props.disabled) return
  const safePage = Math.max(1, Math.min(page, computedTotalPages.value))
  if (safePage === currentPage.value) return

  emit('update:modelValue', safePage)
  emit('change', safePage)
}

const handlePrev = () => {
  if (currentPage.value > 1 && !props.disabled) {
    const prevPage = currentPage.value - 1
    selectPage(prevPage)
    emit('prev', prevPage)
  }
}

const handleNext = () => {
  if (currentPage.value < computedTotalPages.value && !props.disabled) {
    const nextPage = currentPage.value + 1
    selectPage(nextPage)
    emit('next', nextPage)
  }
}

const handleFirst = () => {
  if (currentPage.value > 1 && !props.disabled) {
    selectPage(1)
    emit('first', 1)
  }
}

const handleLast = () => {
  if (currentPage.value < computedTotalPages.value && !props.disabled) {
    selectPage(computedTotalPages.value)
    emit('last', computedTotalPages.value)
  }
}

const handleJumper = () => {
  if (props.disabled) return
  const parsed = parseInt(jumperValue.value, 10)
  if (!isNaN(parsed) && parsed >= 1 && parsed <= computedTotalPages.value) {
    selectPage(parsed)
  }
  jumperValue.value = ''
}

const handlePageSizeChange = (event) => {
  const newSize = parseInt(event.target.value, 10)
  emit('update:pageSize', newSize)
  emit('pageSizeChange', newSize)

  // Readjust current page if it now exceeds total pages
  const newTotalPages = Math.max(1, Math.ceil(props.total / newSize))
  if (currentPage.value > newTotalPages) {
    selectPage(newTotalPages)
  }
}
// Computed Layout items
const computedLayout = computed(() => {
  let items = []
  if (Array.isArray(props.layout)) {
    items = props.layout.map((k) => String(k).trim())
  } else if (typeof props.layout === 'string') {
    items = props.layout.split(',').map((k) => k.trim()).filter(Boolean)
  } else {
    items = ['total', 'pageSize', 'pager', 'jumper']
  }
  return items.map((item) => {
    const lower = item.toLowerCase()
    if (lower === 'pagesize' || lower === 'sizes' || lower === 'size' || lower === 'perpage') return 'pageSize'
    if (lower === 'total' || lower === 'info') return 'total'
    if (lower === 'pager' || lower === 'pages' || lower === 'page' || lower === 'simple') return 'pager'
    if (lower === 'jumper' || lower === 'quickjumper' || lower === 'goto') return 'jumper'
    return item
  })
})
</script>

<template>
  <nav
    :class="[
      'pagination-container',
      'j-pagination',
      `j-pagination-${size}`,
      computedAlignClass,
      { 'is-disabled': disabled }
    ]"
    role="navigation"
    aria-label="Pagination Navigation"
  >
    <template v-for="item in computedLayout" :key="item">
      <!-- Total Summary Info -->
      <div v-if="item === 'total' && showTotal" class="pagination-info">
        <slot
          name="total"
          :total="total"
          :start="startEntry"
          :end="endEntry"
          :current-page="currentPage"
          :total-pages="computedTotalPages"
        >
          <template v-if="typeof showTotal === 'function'">
            {{ showTotal(total, [startEntry, endEntry]) }}
          </template>
          <template v-else-if="total > 0">
            Showing <b>{{ startEntry }}</b> to <b>{{ endEntry }}</b> of <b>{{ total }}</b> entries
          </template>
          <template v-else>
            Page <b>{{ currentPage }}</b> of <b>{{ computedTotalPages }}</b>
          </template>
        </slot>
      </div>

      <!-- Page Size Selector -->
      <div v-else-if="item === 'pageSize' && showPageSize" class="pagination-size-select">
        <slot
          name="pageSize"
          :page-size="pageSize"
          :page-sizes="pageSizes"
          :set-page-size="(size) => emit('update:pageSize', size)"
        >
          <span class="text-xs text-muted">Rows:</span>
          <select
            :value="pageSize"
            :disabled="disabled"
            class="pagination-select-control"
            @change="handlePageSizeChange"
          >
            <option v-for="sizeOpt in pageSizes" :key="sizeOpt" :value="sizeOpt">
              {{ sizeOpt }} / page
            </option>
          </select>
        </slot>
      </div>

      <!-- Pager Controls -->
      <template v-else-if="item === 'pager'">
        <!-- Simple / Compact Mode (< 3 / 10 >) -->
        <div
          v-if="simple"
          :class="[
            'pagination-simple',
            `pagination-${size}`,
            computedColorClass
          ]"
        >
          <button
            type="button"
            class="pagination-btn pagination-nav-btn"
            :disabled="currentPage <= 1 || disabled"
            aria-label="Previous Page"
            @click="handlePrev"
          >
            <slot name="prev" :disabled="currentPage <= 1 || disabled" :select="handlePrev">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </slot>
          </button>

          <span class="pagination-simple-text">
            {{ currentPage }} / {{ computedTotalPages }}
          </span>

          <button
            type="button"
            class="pagination-btn pagination-nav-btn"
            :disabled="currentPage >= computedTotalPages || disabled"
            aria-label="Next Page"
            @click="handleNext"
          >
            <slot name="next" :disabled="currentPage >= computedTotalPages || disabled" :select="handleNext">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </slot>
          </button>
        </div>

        <!-- Standard Full Pagination Buttons List -->
        <ul
          v-else
          :class="[
            'pagination',
            `pagination-${size}`,
            computedShapeClass,
            computedVariantClass,
            computedColorClass,
            { 'pagination-attached': attached }
          ]"
        >
          <!-- First Page Button (optional) -->
          <li v-if="showFirstLast" class="pagination-item">
            <button
              type="button"
              :class="['pagination-btn', 'pagination-nav-btn', 'pagination-first']"
              :disabled="currentPage <= 1 || disabled"
              aria-label="First Page"
              @click="handleFirst"
            >
              <slot name="first" :disabled="currentPage <= 1 || disabled" :select="handleFirst">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="11 17 6 12 11 7" />
                  <polyline points="18 17 13 12 18 7" />
                </svg>
                <span v-if="firstText">{{ firstText }}</span>
              </slot>
            </button>
          </li>

          <!-- Prev Page Button -->
          <li v-if="showPrevNext" class="pagination-item">
            <button
              type="button"
              :class="['pagination-btn', 'pagination-nav-btn', 'pagination-prev']"
              :disabled="currentPage <= 1 || disabled"
              aria-label="Previous Page"
              @click="handlePrev"
            >
              <slot name="prev" :disabled="currentPage <= 1 || disabled" :select="handlePrev">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span v-if="prevText">{{ prevText }}</span>
              </slot>
            </button>
          </li>

          <!-- Page Numbers & Ellipsis -->
          <template v-for="(pageItem, idx) in paginationItems" :key="pageItem.type === 'page' ? `p-${pageItem.page}` : `e-${idx}`">
            <!-- Numbered Page Button -->
            <li v-if="pageItem.type === 'page'" class="pagination-item">
              <slot
                name="item"
                :page="pageItem.page"
                :active="pageItem.active"
                :disabled="disabled"
                :select="() => selectPage(pageItem.page)"
              >
                <button
                  type="button"
                  :class="['pagination-btn', { 'is-active active': pageItem.active }]"
                  :disabled="disabled"
                  :aria-current="pageItem.active ? 'page' : undefined"
                  :aria-label="`Page ${pageItem.page}`"
                  @click="selectPage(pageItem.page)"
                >
                  {{ pageItem.page }}
                </button>
              </slot>
            </li>

            <!-- Ellipsis (Interactive fast jump on click) -->
            <li v-else-if="pageItem.type === 'ellipsis'" class="pagination-item">
              <slot
                name="ellipsis"
                :jump="() => selectPage(pageItem.jumpTarget)"
                :direction="pageItem.direction"
              >
                <button
                  type="button"
                  class="pagination-ellipsis is-interactive"
                  :title="pageItem.direction === 'backward' ? 'Jump 5 pages backward' : 'Jump 5 pages forward'"
                  :disabled="disabled"
                  aria-label="Jump pages"
                  @click="selectPage(pageItem.jumpTarget)"
                >
                  <span class="ellipsis-dots">•••</span>
                  <span class="ellipsis-jump">
                    {{ pageItem.direction === 'backward' ? '««' : '»»' }}
                  </span>
                </button>
              </slot>
            </li>
          </template>

          <!-- Next Page Button -->
          <li v-if="showPrevNext" class="pagination-item">
            <button
              type="button"
              :class="['pagination-btn', 'pagination-nav-btn', 'pagination-next']"
              :disabled="currentPage >= computedTotalPages || disabled"
              aria-label="Next Page"
              @click="handleNext"
            >
              <slot name="next" :disabled="currentPage >= computedTotalPages || disabled" :select="handleNext">
                <span v-if="nextText">{{ nextText }}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </slot>
            </button>
          </li>

          <!-- Last Page Button (optional) -->
          <li v-if="showFirstLast" class="pagination-item">
            <button
              type="button"
              :class="['pagination-btn', 'pagination-nav-btn', 'pagination-last']"
              :disabled="currentPage >= computedTotalPages || disabled"
              aria-label="Last Page"
              @click="handleLast"
            >
              <slot name="last" :disabled="currentPage >= computedTotalPages || disabled" :select="handleLast">
                <span v-if="lastText">{{ lastText }}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="13 17 18 12 13 7" />
                  <polyline points="6 17 11 12 6 7" />
                </svg>
              </slot>
            </button>
          </li>
        </ul>
      </template>

      <!-- Quick Jumper -->
      <div v-else-if="item === 'jumper' && showQuickJumper" class="pagination-jumper">
        <slot
          name="jumper"
          :current-page="currentPage"
          :total-pages="computedTotalPages"
          :jump="selectPage"
        >
          <span>Go to:</span>
          <input
            v-model="jumperValue"
            type="number"
            min="1"
            :max="computedTotalPages"
            :disabled="disabled"
            class="pagination-jumper-input"
            :placeholder="`${currentPage}`"
            @keydown.enter="handleJumper"
            @blur="handleJumper"
          />
          <span>Page</span>
        </slot>
      </div>
    </template>
  </nav>
</template>
