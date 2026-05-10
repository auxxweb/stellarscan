import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Same deployment as `DEFAULT_APPS_SCRIPT_URL` in src/services/sheetApi.ts — used only for dev CORS proxy. */
const APPS_SCRIPT_MACRO_PATH =
  '/macros/s/AKfycbxfYRTBY0mORYkffCx3qPUdecy7qvpBz2fyQbbQi3hD_wbiwJbdY8fzgakVP5HBaunLpQ/exec'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      // Browser calls same-origin URL; Vite forwards to Google (avoids CORS during `npm run dev`).
      '/apps-script-proxy': {
        target: 'https://script.google.com',
        changeOrigin: true,
        rewrite: () => APPS_SCRIPT_MACRO_PATH,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'offline.html'],
      manifest: {
        name: 'Stellar Camera Rentals',
        short_name: 'Stellar',
        description: 'Premium camera rental operations for Stellar Camera Rentals.',
        theme_color: '#0b1220',
        background_color: '#0b1220',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
      },
    }),
  ],
})
