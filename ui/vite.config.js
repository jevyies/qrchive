import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Pages from 'vite-plugin-pages'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    Pages({
      dirs: ['./src/pages'],
      onRoutesGenerated: (routes) => [...routes],
    }),
    Components({
      dirs: ['src/@core/components'],
      dts: true,
    }),
    AutoImport({
      eslintrc: {
        enabled: true,
        filepath: './.eslintrc-auto-import.json',
      },
      imports: ['vue', 'vue-router', '@vueuse/core', '@vueuse/math', 'pinia'],
      dirs: ['./src/@core/utils/'],
      ignore: ['useCookies'],
      vueTemplate: true,
    }),
  ],
  server: {
    port: 1500,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/@core', import.meta.url)),
      'icons': fileURLToPath(new URL('./src/assets/icons', import.meta.url)),
      '@icons': fileURLToPath(new URL('./src/assets/icons', import.meta.url)),
    },
  },
})
