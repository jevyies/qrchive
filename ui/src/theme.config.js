/**
 * ============================================================================
 * JUI THEME & SYSTEM CONFIGURATION
 * Single source of truth for all global defaults.
 * 
 * Edit this file to customize:
 * 1. Default Navigation Arrangement (sidebar vs navbar)
 * 2. Default Active Theme (dark, light, system)
 * 3. Color Palette Overrides (primary, secondary, success, warning, danger, info)
 * 4. Default Form / Input Pattern (boxed, underlined, filled, floating, pill)
 * 5. Default Button Pattern & Size (solid, outlined, tonal, text, link)
 * 6. Default List & Dropdown Density (compact, comfortable, convenient)
 * 7. Default Modal Style, Animation, Size, Position & Backdrop
 * 8. Default Pagination & DataTable Settings (pageSize, layout, variant, shape, color)
 * ============================================================================
 */

export const themeConfig = {
  // --------------------------------------------------------------------------
  // 1. DEFAULT NAVIGATION ARRANGEMENT
  // Options:
  // - 'sidebar' : Vertical fixed sidebar on desktop, floating drawer on mobile
  // - 'navbar'  : Horizontal top glass navbar with categorized dropdown menus
  // --------------------------------------------------------------------------
  layoutMode: 'sidebar',

  // --------------------------------------------------------------------------
  // 1b. TOP NAVBAR MENU ARRANGEMENT (When layoutMode is 'navbar')
  // Options:
  // - 'inline'   : Menu embedded inside top navbar (Default)
  // - 'menu-bar' : Dedicated horizontal menu bar under the top navbar
  // --------------------------------------------------------------------------
  navbarMenuMode: 'inline',

  // --------------------------------------------------------------------------
  // 2. DEFAULT ACTIVE THEME
  // Options:
  // - 'system'    : Automatically match user's device/OS light or dark theme
  // - 'dark'      : Deep espresso noir & champagne gold
  // - 'light'     : Warm ivory & champagne bronze
  // --------------------------------------------------------------------------
  defaultTheme: 'system',

  // --------------------------------------------------------------------------
  // 3. COLOR PALETTE OVERRIDES
  // Default system colors. Modify any hex code below to change the app's palette.
  // --------------------------------------------------------------------------
  colors: {
    primary: '#d7b465',    // Warm Bronze / Antique Gold
    secondary: '#516072',  // Slate / Charcoal
    accent: '#c5a059',     // Champagne Gold
    success: '#10b981',    // Emerald Green
    warning: '#f59e0b',    // Amber Yellow
    danger: '#f43f5e',     // Rose Red
    info: '#38bdf8',       // Sky Blue
  },

  // --------------------------------------------------------------------------
  // 4. DEFAULT FORM / INPUT PATTERN
  // Options:
  // - 'boxed'       : Standard border container (default)
  // - 'underlined'  : Minimal bottom-border only
  // - 'filled'      : Surface tonal container background
  // - 'floating'    : Material-style floating animation label
  // - 'pill'        : Fully rounded corners (50px radius)
  // --------------------------------------------------------------------------
  defaultInputPattern: 'boxed',

  // --------------------------------------------------------------------------
  // 5. DEFAULT BUTTON PATTERN & SIZE
  // Pattern Options: 'solid' | 'outlined' | 'tonal' | 'text' | 'link'
  // Size Options   : 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  // --------------------------------------------------------------------------
  defaultButtonPattern: 'solid',
  defaultButtonSize: 'md',

  // --------------------------------------------------------------------------
  // 6. DEFAULT LIST DENSITY
  // Options:
  // - 'compact'     : 0.375rem 0.75rem (6px 12px) - dense row spacing
  // - 'comfortable' : 0.75rem 1.0rem (12px 16px)  - balanced standard
  // - 'convenient'  : 1.125rem 1.25rem (18px 20px) - spacious / touch-friendly
  // --------------------------------------------------------------------------
  defaultListDensity: 'comfortable',

  // --------------------------------------------------------------------------
  // 7. DEFAULT DROPDOWN MENU DENSITY
  // Options:
  // - 'compact'     : 0.5rem 0.6rem (8px 10px, 12px font) - mini popovers
  // - 'comfortable' : 0.55rem 0.9rem (9px 14px, 14px font) - standard menus
  // - 'convenient'  : 0.95rem 1.35rem (15px 22px, 17px font) - spacious menus
  // --------------------------------------------------------------------------
  defaultDropdownDensity: 'comfortable',

  // --------------------------------------------------------------------------
  // 8. DEFAULT MODAL SETUP
  // Style Options    : 'elevated' | 'glass' | 'bordered' | 'tonal'
  //
  // Dual / Per-Theme Configuration:
  // You can specify different modal styles for dark mode and light mode using an object:
  //   defaultModalStyle: {
  //     dark: 'glass',      // Modal style for dark mode
  //     light: 'elevated',  // Modal style for light mode
  //   },
  // Or a single string to use the same modal style for all themes:
  //   defaultModalStyle: 'glass',
  //
  // Animation Options: 'scale' | 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'bounce'
  // Position Options : 'center' | 'top' | 'bottom' | 'top-right' | 'bottom-right'
  // Size Options     : 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'
  // Backdrop Options : 'blur' | 'glass' | 'dim'
  // --------------------------------------------------------------------------
  defaultModalStyle: {
    dark: 'glass',
    light: 'elevated',
  },
  defaultModalAnimation: 'slide-down',
  defaultModalPosition: 'center',
  defaultModalSize: 'md',
  defaultModalBackdrop: 'glass',

  // --------------------------------------------------------------------------
  // 9. DEFAULT PAGINATION & DATA TABLE SETTINGS
  //
  // Sizing Options    : 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  // Variant Options   : 'solid' | 'tonal' | 'outlined' | 'ghost' | 'glass'
  // Shape Options     : 'rounded' | 'pill' | 'circle' | 'square'
  // Color Options     : 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  // Layout Arrangement: 'pageSize, total, pager' | 'total, pageSize, pager, jumper' | etc.
  // --------------------------------------------------------------------------
  pagination: {
    pageSize: 10,
    pageSizes: [5, 10, 20, 50],
    size: 'sm',
    variant: 'tonal',
    color: 'primary',
    shape: 'rounded',
    attached: false,
    simple: false,
    showTotal: true,
    showPageSize: true,
    showQuickJumper: false,
    showFirstLast: false,
    layout: 'pageSize, total, pager',
  },
}

export default themeConfig
