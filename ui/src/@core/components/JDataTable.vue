<script setup>
import { ref, computed, watch } from 'vue'
import { themeConfig } from '../../theme.config'
import JPagination from './JPagination.vue'

const props = defineProps({
  columns: {
    type: Array,
    required: true,
  },
  items: {
    type: Array,
    required: true,
  },
  itemKey: {
    type: String,
    default: 'id',
  },
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  searchable: {
    type: Boolean,
    default: true,
  },
  searchPlaceholder: {
    type: String,
    default: 'Search records...',
  },
  selectable: {
    type: Boolean,
    default: false,
  },
  expandable: {
    type: Boolean,
    default: false,
  },
  paginated: {
    type: Boolean,
    default: true,
  },
  page: {
    type: Number,
    default: 1,
  },
  pageSize: {
    type: Number,
    default: () => themeConfig.pagination?.pageSize || 10,
  },
  pageSizes: {
    type: Array,
    default: () => themeConfig.pagination?.pageSizes || [5, 10, 20, 50],
  },
  paginationVariant: {
    type: String,
    default: () => themeConfig.pagination?.variant || 'tonal',
  },
  paginationColor: {
    type: String,
    default: () => themeConfig.pagination?.color || 'primary',
  },
  paginationSize: {
    type: String,
    default: () => themeConfig.pagination?.size || 'sm',
  },
  paginationShape: {
    type: String,
    default: () => themeConfig.pagination?.shape || 'rounded',
  },
  paginationSimple: {
    type: Boolean,
    default: () => themeConfig.pagination?.simple ?? false,
  },
  paginationAttached: {
    type: Boolean,
    default: () => themeConfig.pagination?.attached ?? false,
  },
  paginationLayout: {
    type: [String, Array],
    default: () => themeConfig.pagination?.layout || 'pageSize, total, pager',
  },
  showTotal: {
    type: [Boolean, Function],
    default: () => themeConfig.pagination?.showTotal ?? true,
  },
  showPageSize: {
    type: Boolean,
    default: () => themeConfig.pagination?.showPageSize ?? true,
  },
  showQuickJumper: {
    type: Boolean,
    default: () => themeConfig.pagination?.showQuickJumper ?? false,
  },
  showFirstLast: {
    type: Boolean,
    default: () => themeConfig.pagination?.showFirstLast ?? false,
  },
  paginationProps: {
    type: Object,
    default: () => ({}),
  },
  density: {
    type: String,
    default: 'comfortable', // 'compact' | 'comfortable' | 'spacious'
  },
  striped: {
    type: Boolean,
    default: false,
  },
  hoverable: {
    type: Boolean,
    default: true,
  },
  bordered: {
    type: Boolean,
    default: false,
  },
  glass: {
    type: Boolean,
    default: false,
  },
  stickyHeader: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'update:selected',
  'click:row',
  'delete:batch',
  'export:batch',
  'update:page',
  'update:pageSize',
  'page-change',
  'pageChange',
  'page-size-change',
  'pageSizeChange',
])

// Internal State
const searchQuery = ref('')
const sortColumn = ref(null)
const sortDirection = ref('asc') // 'asc' | 'desc'
const currentPage = ref(1)
const perPage = ref(props.pageSize)
const selectedKeys = ref(new Set())
const expandedKeys = ref(new Set())
const activeDensity = ref(props.density)
const columnVisibility = ref({})

// Initialize Column Visibility
watch(
  () => props.columns,
  (cols) => {
    cols.forEach((col) => {
      if (columnVisibility.value[col.key] === undefined) {
        columnVisibility.value[col.key] = col.hidden !== true
      }
    })
  },
  { immediate: true, deep: true }
)

// Visible Columns
const visibleColumns = computed(() => {
  return props.columns.filter((col) => columnVisibility.value[col.key] !== false)
})

// Search Filtering
const filteredItems = computed(() => {
  let list = [...props.items]

  if (props.searchable && searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter((item) => {
      return Object.entries(item).some(([k, val]) => {
        if (val === null || val === undefined) return false
        return String(val).toLowerCase().includes(q)
      })
    })
  }

  // Column Sorting
  if (sortColumn.value) {
    const colKey = sortColumn.value
    list.sort((a, b) => {
      const valA = a[colKey]
      const valB = b[colKey]

      if (valA === valB) return 0
      if (valA === null || valA === undefined) return 1
      if (valB === null || valB === undefined) return -1

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection.value === 'asc' ? valA - valB : valB - valA
      }

      return sortDirection.value === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
    })
  }

  return list
})

// Pagination Calculations
const totalEntries = computed(() => filteredItems.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalEntries.value / perPage.value)))

const paginatedItems = computed(() => {
  if (!props.paginated) return filteredItems.value
  const start = (currentPage.value - 1) * perPage.value
  return filteredItems.value.slice(start, start + perPage.value)
})

const paginationStart = computed(() => {
  if (totalEntries.value === 0) return 0
  return (currentPage.value - 1) * perPage.value + 1
})

const paginationEnd = computed(() => {
  return Math.min(currentPage.value * perPage.value, totalEntries.value)
})

// Handle Sorting
const toggleSort = (column) => {
  if (column.sortable === false) return

  if (sortColumn.value === column.key) {
    if (sortDirection.value === 'asc') {
      sortDirection.value = 'desc'
    } else {
      sortColumn.value = null
      sortDirection.value = 'asc'
    }
  } else {
    sortColumn.value = column.key
    sortDirection.value = 'asc'
  }
}

// Multi-Selection Logic
const isAllSelected = computed(() => {
  if (paginatedItems.value.length === 0) return false
  return paginatedItems.value.every((item) => selectedKeys.value.has(item[props.itemKey]))
})

const isSomeSelected = computed(() => {
  if (isAllSelected.value) return false
  return paginatedItems.value.some((item) => selectedKeys.value.has(item[props.itemKey]))
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    paginatedItems.value.forEach((item) => selectedKeys.value.delete(item[props.itemKey]))
  } else {
    paginatedItems.value.forEach((item) => selectedKeys.value.add(item[props.itemKey]))
  }
  emitSelected()
}

const toggleSelectItem = (item) => {
  const key = item[props.itemKey]
  if (selectedKeys.value.has(key)) {
    selectedKeys.value.delete(key)
  } else {
    selectedKeys.value.add(key)
  }
  emitSelected()
}

const isItemSelected = (item) => {
  return selectedKeys.value.has(item[props.itemKey])
}

const emitSelected = () => {
  const selectedList = props.items.filter((item) => selectedKeys.value.has(item[props.itemKey]))
  emit('update:selected', selectedList)
}

const clearSelection = () => {
  selectedKeys.value.clear()
  emitSelected()
}

// Row Expansion
const toggleExpand = (item) => {
  if (!props.expandable) return
  const key = item[props.itemKey]
  if (expandedKeys.value.has(key)) {
    expandedKeys.value.delete(key)
  } else {
    expandedKeys.value.add(key)
  }
}

const isExpanded = (item) => {
  return expandedKeys.value.has(item[props.itemKey])
}

// Sync with prop changes
watch(
  () => props.page,
  (newPage) => {
    if (newPage !== undefined && newPage !== null && newPage !== currentPage.value) {
      currentPage.value = newPage
    }
  }
)

watch(
  () => props.pageSize,
  (newSize) => {
    if (newSize !== undefined && newSize !== null && newSize !== perPage.value) {
      perPage.value = newSize
    }
  }
)

// Emit updates on internal state changes
watch(currentPage, (page) => {
  emit('update:page', page)
  emit('page-change', page)
  emit('pageChange', page)
})

watch(perPage, (size) => {
  emit('update:pageSize', size)
  emit('page-size-change', size)
  emit('pageSizeChange', size)
  const maxPage = Math.max(1, Math.ceil(totalEntries.value / (size || 1)))
  if (currentPage.value > maxPage) {
    currentPage.value = maxPage
  }
})

// Reset page on search
watch(searchQuery, () => {
  currentPage.value = 1
})

watch(totalPages, (pages) => {
  if (currentPage.value > pages) {
    currentPage.value = Math.max(1, pages)
  }
})

const goToPage = (page) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}
</script>

<template>
  <div class="d-flex flex-column gap-3 w-full">
    <!-- Batch Action Floating / Sticky Notification Bar -->
    <Transition name="fade">
      <div v-if="selectedKeys.size > 0" class="table-batch-bar shadow-md">
        <div class="d-flex align-center gap-2">
          <span class="badge badge-pill badge-primary font-bold">{{ selectedKeys.size }}</span>
          <span class="text-sm font-semibold">items selected</span>
        </div>
        <div class="d-flex align-center gap-2">
          <slot name="batch-actions" :selected="Array.from(selectedKeys)">
            <button class="btn btn-xs btn-tonal-primary" @click="$emit('export:batch', Array.from(selectedKeys))">
              <span>📥</span> Export Selected
            </button>
            <button class="btn btn-xs btn-tonal-danger" @click="$emit('delete:batch', Array.from(selectedKeys))">
              <span>🗑️</span> Delete Selected
            </button>
          </slot>
          <button class="btn btn-xs btn-ghost" @click="clearSelection">Clear</button>
        </div>
      </div>
    </Transition>

    <!-- Main Container Card -->
    <div
      :class="[
        'table-responsive',
        bordered ? 'table-bordered' : '',
        glass ? 'table-glass' : '',
        stickyHeader ? 'table-sticky-header' : '',
      ]"
    >
      <!-- Table Header & Toolbar -->
      <div class="table-toolbar">
        <div>
          <h4 v-if="title" class="mb-0 font-bold text-base">{{ title }}</h4>
          <p v-if="subtitle" class="text-xs text-muted mb-0 mt-0.5">{{ subtitle }}</p>
        </div>

        <div class="d-flex flex-wrap align-center gap-2">
          <!-- Search Input -->
          <div v-if="searchable" class="position-relative" style="min-width: 180px; max-width: 260px;">
            <input
              v-model="searchQuery"
              type="text"
              class="form-control form-control-sm pe-4"
              :placeholder="searchPlaceholder"
            />
            <button
              v-if="searchQuery"
              class="btn btn-xs btn-ghost position-absolute top-50 translate-middle-y end-0 me-1"
              style="padding: 0 4px; font-size: 0.65rem;"
              @click="searchQuery = ''"
            >
              ✕
            </button>
          </div>

          <!-- Density Controls -->
          <div class="d-flex bg-surface-tonal rounded-md p-0.5 border border-subtle">
            <button
              class="btn btn-xs"
              :class="activeDensity === 'compact' ? 'btn-primary' : 'btn-ghost'"
              style="padding: 0.2rem 0.4rem; font-size: 0.7rem;"
              title="Compact Density"
              @click="activeDensity = 'compact'"
            >
              Compact
            </button>
            <button
              class="btn btn-xs"
              :class="activeDensity === 'comfortable' ? 'btn-primary' : 'btn-ghost'"
              style="padding: 0.2rem 0.4rem; font-size: 0.7rem;"
              title="Comfortable Density"
              @click="activeDensity = 'comfortable'"
            >
              Comfortable
            </button>
            <button
              class="btn btn-xs"
              :class="activeDensity === 'spacious' ? 'btn-primary' : 'btn-ghost'"
              style="padding: 0.2rem 0.4rem; font-size: 0.7rem;"
              title="Spacious Density"
              @click="activeDensity = 'spacious'"
            >
              Spacious
            </button>
          </div>

          <!-- Slot for Additional Custom Actions (e.g. Add Item, Filter Menu) -->
          <slot name="toolbar-actions" />
        </div>
      </div>

      <!-- Core Table Markup -->
      <table
        :class="[
          'table',
          striped ? 'table-striped' : '',
          hoverable ? 'table-hover' : '',
          `table-${activeDensity}`,
        ]"
      >
        <thead>
          <tr>
            <!-- Select All Checkbox Column -->
            <th v-if="selectable" style="width: 2.5rem; text-align: center;">
              <input
                type="checkbox"
                class="form-check-input"
                :checked="isAllSelected"
                :indeterminate.prop="isSomeSelected"
                @change="toggleSelectAll"
              />
            </th>

            <!-- Expand Accordion Toggle Column -->
            <th v-if="expandable" style="width: 2rem; text-align: center;"></th>

            <!-- Dynamic Columns -->
            <th
              v-for="col in visibleColumns"
              :key="col.key"
              :class="[col.sortable !== false ? 'sortable' : '', col.align ? `text-${col.align}` : '']"
              :style="{ width: col.width || 'auto' }"
              @click="toggleSort(col)"
            >
              <div class="d-inline-flex align-center">
                <span>{{ col.label || col.key }}</span>
                <span
                  v-if="col.sortable !== false"
                  class="sort-icon"
                  :class="{ active: sortColumn === col.key }"
                >
                  <span v-if="sortColumn === col.key && sortDirection === 'asc'">▲</span>
                  <span v-else-if="sortColumn === col.key && sortDirection === 'desc'">▼</span>
                  <span v-else>⇅</span>
                </span>
              </div>
            </th>

            <!-- Actions Header Column if slot exists -->
            <th v-if="$slots.actions" class="text-end" style="width: 6rem;">Actions</th>
          </tr>
        </thead>

        <tbody>
          <!-- Loading State Simulation -->
          <template v-if="loading">
            <tr v-for="n in 5" :key="n">
              <td :colspan="visibleColumns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0) + ($slots.actions ? 1 : 0)" class="p-3">
                <div class="skeleton" style="height: 1.25rem; width: 100%;"></div>
              </td>
            </tr>
          </template>

          <!-- Empty State -->
          <template v-else-if="paginatedItems.length === 0">
            <tr>
              <td :colspan="visibleColumns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0) + ($slots.actions ? 1 : 0)">
                <div class="table-empty-state">
                  <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
                  <div class="font-bold text-sm text-primary">No Matching Records Found</div>
                  <p class="text-xs text-muted mb-0">Try adjusting your search filters or clear queries.</p>
                </div>
              </td>
            </tr>
          </template>

          <!-- Render Rows -->
          <template v-else v-for="(item, index) in paginatedItems" :key="item[itemKey] || index">
            <tr
              :class="[
                isItemSelected(item) ? 'table-row-selected' : '',
                expandable ? 'table-expandable-row' : '',
              ]"
              @click="$emit('click:row', item)"
            >
              <!-- Row Select Checkbox -->
              <td v-if="selectable" style="text-align: center;" @click.stop>
                <input
                  type="checkbox"
                  class="form-check-input"
                  :checked="isItemSelected(item)"
                  @change="toggleSelectItem(item)"
                />
              </td>

              <!-- Expand Row Toggle Button -->
              <td v-if="expandable" style="text-align: center;" @click.stop="toggleExpand(item)">
                <span class="expand-icon" :class="{ expanded: isExpanded(item) }">▶</span>
              </td>

              <!-- Data Cells -->
              <td
                v-for="col in visibleColumns"
                :key="col.key"
                :class="[col.align ? `text-${col.align}` : '']"
              >
                <!-- Custom Slot for Cell (Supports #cell-key and #key) -->
                <slot :name="`cell-${col.key}`" :item="item" :value="item[col.key]" :index="index">
                  <slot :name="col.key" :item="item" :value="item[col.key]" :index="index">
                    {{ item[col.key] }}
                  </slot>
                </slot>
              </td>

              <!-- Row Action Dropdown / Buttons -->
              <td v-if="$slots.actions" class="text-end" @click.stop>
                <slot name="actions" :item="item" :index="index" />
              </td>
            </tr>

            <!-- Expanded Sub-Row Content -->
            <tr v-if="expandable && isExpanded(item)" :key="`expanded-${item[itemKey]}`">
              <td
                :colspan="visibleColumns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0) + ($slots.actions ? 1 : 0)"
                class="table-expanded-content"
              >
                <slot name="expanded" :item="item" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <!-- Table Pagination Footer powered by JPagination -->
      <div v-if="paginated && totalEntries > 0" class="table-pagination">
        <slot
          name="pagination"
          :current-page="currentPage"
          :per-page="perPage"
          :total-entries="totalEntries"
          :total-pages="totalPages"
          :start="paginationStart"
          :end="paginationEnd"
        >
          <JPagination
            v-model="currentPage"
            v-model:page-size="perPage"
            :total="totalEntries"
            :page-sizes="pageSizes"
            :show-total="showTotal"
            :show-page-size="showPageSize"
            :show-quick-jumper="showQuickJumper"
            :show-first-last="showFirstLast"
            :variant="paginationVariant"
            :color="paginationColor"
            :size="paginationSize"
            :shape="paginationShape"
            :simple="paginationSimple"
            :attached="paginationAttached"
            :layout="paginationLayout"
            align="between"
            v-bind="paginationProps"
          >
            <!-- Forward custom pagination slots if provided -->
            <template v-if="$slots['pagination-total']" #total="slotProps">
              <slot name="pagination-total" v-bind="slotProps" />
            </template>
            <template v-if="$slots['pagination-page-size']" #pageSize="slotProps">
              <slot name="pagination-page-size" v-bind="slotProps" />
            </template>
            <template v-if="$slots['pagination-prev']" #prev="slotProps">
              <slot name="pagination-prev" v-bind="slotProps" />
            </template>
            <template v-if="$slots['pagination-next']" #next="slotProps">
              <slot name="pagination-next" v-bind="slotProps" />
            </template>
            <template v-if="$slots['pagination-first']" #first="slotProps">
              <slot name="pagination-first" v-bind="slotProps" />
            </template>
            <template v-if="$slots['pagination-last']" #last="slotProps">
              <slot name="pagination-last" v-bind="slotProps" />
            </template>
          </JPagination>
        </slot>
      </div>
    </div>
  </div>
</template>
