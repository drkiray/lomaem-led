import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/lomaem-led/',
  define: { __APP_BUILD__: JSON.stringify(new Date().toISOString()) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Ломаем Лёд',
        short_name: 'Ломаем Лёд',
        description: 'Патигеймы для вечеринок и дней рождения',
        lang: 'ru',
        id: '/lomaem-led/app',
        start_url: '/lomaem-led/',
        scope: '/lomaem-led/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#050a14',
        theme_color: '#050a14',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,mp3}'],
        // ~9 MB of game tracks: cached on first play instead of on install
        globIgnores: ['music/game-*.mp3'],
        runtimeCaching: [
          { urlPattern: /\/music\/game-\d\.mp3$/, handler: 'CacheFirst', options: { cacheName: 'game-music', expiration: { maxEntries: 8 } } },
        ],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
