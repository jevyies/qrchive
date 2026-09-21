import { storeToRefs } from 'pinia'
import { useThemeStore, themes, THEME_BACKGROUNDS } from '../stores/theme'
import { themeConfig } from '../theme.config'

import { useDisplay, useBreakpoints, useScreen, breakpoints } from './useDisplay'

export { themes, THEME_BACKGROUNDS, themeConfig, useDisplay, useBreakpoints, useScreen, breakpoints }

export function getSystemTheme() {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useLayout() {
  const store = useThemeStore()
  const {
    currentTheme,
    layoutMode,
    navbarMenuMode,
    themeMode,
    colors,
    inputPattern,
    buttonPattern,
    buttonSize,
    listDensity,
    dropdownDensity,
    modalStyleConfig,
    modalStyle,
    modalAnimation,
    modalPosition,
    modalSize,
    modalBackdrop,
    pagination,
    isDarkMode,
    isLightMode,
    isSystemTheme,
    isNavbarMode,
    isSidebarMode,
    isNavbarInlineMode,
    isNavbarMenuBarMode,
  } = storeToRefs(store)

  return {
    themeConfig,
    themes,
    currentTheme,
    layoutMode,
    navbarMenuMode,
    themeMode,
    colors,
    inputPattern,
    buttonPattern,
    buttonSize,
    listDensity,
    dropdownDensity,
    modalStyleConfig,
    modalStyle,
    modalAnimation,
    modalPosition,
    modalSize,
    modalBackdrop,
    pagination,
    isDarkMode,
    isLightMode,
    isSystemTheme,
    isNavbarMode,
    isSidebarMode,
    isNavbarInlineMode,
    isNavbarMenuBarMode,
    setLayoutMode: store.setLayoutMode,
    setNavbarMenuMode: store.setNavbarMenuMode,
    selectTheme: store.selectTheme,
    setColor: store.setColor,
    resetColors: store.resetColors,
    setInputPattern: store.setInputPattern,
    setButtonPattern: store.setButtonPattern,
    setButtonSize: store.setButtonSize,
    setListDensity: store.setListDensity,
    setDropdownDensity: store.setDropdownDensity,
    setModalStyle: store.setModalStyle,
    resetModalStyle: store.resetModalStyle,
    getModalStyleForTheme: store.getModalStyleForTheme,
    setModalAnimation: store.setModalAnimation,
    setModalPosition: store.setModalPosition,
    setModalSize: store.setModalSize,
    setModalBackdrop: store.setModalBackdrop,
    setPagination: store.setPagination,
    resetAllDefaults: store.resetAllDefaults,
    applyThemeConfig: store.applyThemeConfig,
    THEME_BACKGROUNDS,
    getThemeBackground: store.getThemeBackground,
    getSystemTheme: store.getSystemTheme,
  }
}
