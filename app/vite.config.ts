import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 5_000_000,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/img/') || url.pathname.startsWith('/pages/'),
            handler: 'CacheFirst',
            options: { cacheName: 'plato-media', expiration: { maxEntries: 400 } },
          },
        ],
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Plato — nuestro plan',
        short_name: 'Plato',
        description: 'El plan de la nutricionista, día a día, con macros.',
        lang: 'es',
        theme_color: '#123128',
        background_color: '#123128',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
