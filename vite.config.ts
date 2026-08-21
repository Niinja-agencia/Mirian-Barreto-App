import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    inspectAttr(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mirian Barreto — App de Treinos',
        short_name: 'Mirian Barreto',
        description: 'Treinos para mulheres reais. Videoaulas e acompanhamento.',
        lang: 'pt-BR',
        theme_color: '#0A0A0A',
        background_color: '#0A0A0A',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // NUNCA cachear API/Storage do Supabase (auth, dados e vídeos sempre online)
        // /assets também fica de fora: pedido de módulo não é navegação, e
        // devolver index.html para um .js quebra o import da rota.
        navigateFallbackDenylist: [/^\/api/, /supabase\.co/, /^\/assets\//],
        // Some com o precache da versão anterior no lugar de deixar dois
        // conjuntos de arquivos convivendo — é dessa mistura que nascia o
        // pedido a um pedaço de JS que não existe mais.
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('supabase.co'),
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
