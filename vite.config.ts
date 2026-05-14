import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'steller-logo.png', 'offline.html'],
      manifest: {
        name: 'STELLER — Camera rental operations',
        short_name: 'STELLER',
        description: 'Camera rental operations, QR tracking, and maintenance.',
        theme_color: '#171717',
        background_color: '#171717',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/steller-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/steller-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/steller-logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        // SPA: serve the app shell on navigation. Using offline.html here breaks /products refresh on Vercel.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
      },
    }),
  ],
})
