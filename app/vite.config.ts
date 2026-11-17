import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// En GitHub Pages la app vive en /NutriPlan/ (cámbialo con BASE_PATH si se publica en otro sitio)
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? (process.env.BASE_PATH ?? '/NutriPlan/') : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 5_000_000,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/img/') || url.pathname.includes('/pages/'),
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
        theme_color: '#2b1531',
        background_color: '#2b1531',
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
}))
