import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    host: true,
  },
  envDir: '..',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'maskable-512x512.png'],
      devOptions: {
        enabled: true,
      },
      manifest: {
        id: '/?v=1.1',
        name: 'Ortaq Maliyyə v1.1',
        short_name: 'Ortaq',
        description: 'İki istifadəçi üçün ortaq maliyyə izləmə PWA tətbiqi.',
        lang: 'az',
        theme_color: '#f4f2ef',
        background_color: '#f4f2ef',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        prefer_related_applications: false,
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['finance', 'productivity'],
        shortcuts: [
          {
            name: 'Yeni xərc',
            short_name: 'Xərc',
            url: '/transactions/new/expense',
            description: 'Yeni xərc əlavə et'
          },
          {
            name: 'Yeni gəlir',
            short_name: 'Gəlir',
            url: '/transactions/new/income',
            description: 'Yeni gəlir əlavə et'
          }
        ],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('../shared/src', import.meta.url))
    }
  }
});
