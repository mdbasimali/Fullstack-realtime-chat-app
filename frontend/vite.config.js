import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'ChatZone - Secure Messaging',
        short_name: 'ChatZone',
        description: 'Real-time Encrypted Chat App',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        start_url: '/',
        categories: ['communication', 'social', 'utilities'],
        shortcuts: [
          {
            name: 'New Chat',
            short_name: 'Chat',
            description: 'Start a new conversation',
            url: '/',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Settings',
            short_name: 'Settings',
            description: 'Open app settings',
            url: '/settings',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }]
          }
        ],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff}'],
        maximumFileSizeToCacheInBytes: 5000000,
      }
    })
  ],
})
