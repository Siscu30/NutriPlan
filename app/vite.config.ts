import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// Versión visible en Ajustes: commit publicado (GitHub Actions) y fecha de compilación
const VERSION = `${(process.env.GITHUB_SHA ?? 'local').slice(0, 7)} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`

// En GitHub Pages la app vive en /NutriPlan/ (cámbialo con BASE_PATH si se publica en otro sitio)
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? (process.env.BASE_PATH ?? '/NutriPlan/') : '/',
  define: { __APP_VERSION__: JSON.stringify(VERSION) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // La app decide cuándo actualizar (sola si no hay nada abierto; si no, con aviso): ver components/UpdatePrompt.tsx
      registerType: 'prompt',
      injectRegister: false,
      workbox: {
        maximumFileSizeToCacheInBytes: 5_000_000,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/storage/v1/object/sign/plato-media/'),
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
