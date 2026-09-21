/**
 * JUI - Anti-FOUC Theme & Background Initializer
 * Runs synchronously in <head> to immediately apply stored theme and background color
 * from localStorage before initial page render, preventing white flash on reload.
 */
(function () {
  try {
    var THEME_BACKGROUNDS = {
      dark: '#161311',
      light: '#fff8f5',
    }

    var storedTheme = localStorage.getItem('jui_theme')
    var storedBg = localStorage.getItem('jui_theme_bg') || localStorage.getItem('jui_bg_color')
    var isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches

    var activeTheme = storedTheme
    if (!activeTheme || activeTheme === 'system' || (activeTheme !== 'dark' && activeTheme !== 'light')) {
      activeTheme = isDark ? 'dark' : 'light'
    }

    var bg = storedBg || THEME_BACKGROUNDS[activeTheme] || '#161311'

    // Persist if not already stored
    if (!storedBg) {
      localStorage.setItem('jui_theme_bg', bg)
      localStorage.setItem('jui_bg_color', bg)
    }

    // Immediately apply to HTML root
    var root = document.documentElement
    root.setAttribute('data-theme', activeTheme)
    root.style.backgroundColor = bg
    root.style.setProperty('--bg-body', bg)
    root.style.colorScheme = activeTheme === 'light' ? 'light' : 'dark'

    // Immediate fallback styles to eliminate white flash on reload
    var style = document.createElement('style')
    style.id = 'jui-theme-fallback'
    style.textContent =
      'html { background-color: ' + bg + ' !important; } ' +
      'html[data-theme="light"] { background-color: #fff8f5 !important; } ' +
      'html[data-theme="dark"] { background-color: #161311 !important; } ' +
      'body { margin: 0; background-color: inherit; }'
    document.head.appendChild(style)
  } catch (e) {
    console.error('Failed to initialize theme background', e)
  }
})()
