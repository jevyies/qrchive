import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { axiosInstance } from './plugins/axios'
import { globalFunctions } from './plugins/constant'
import { useThemeStore } from './stores/theme'
import './styles/main.scss'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Provide Axios instance globally
app.config.globalProperties.$axios = axiosInstance
app.config.globalProperties.$api = axiosInstance
app.provide('axios', axiosInstance)

// Provide Global Functions instance explicitly
app.provide('globalFunctions', globalFunctions)

// Initialize theme settings and system preference listener
const themeStore = useThemeStore()
themeStore.initTheme()

// Ensure router has resolved initial navigation and route guards before mounting to prevent layout flashes
router.isReady().then(() => {
  app.mount('#app')
})

