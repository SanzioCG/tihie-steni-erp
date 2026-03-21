import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // .env faylidan o'zgaruvchilarni yuklash
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // Oflayn ishlashi uchun keshga olinadigan fayllar
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          name: 'Tihie Steni ERP',
          short_name: 'TS ERP',
          description: 'Professional ERP system for Tihie Steni Uzbekistan',
          theme_color: '#000000', // Logotip rangiga mos qora
          background_color: '#ffffff',
          display: 'standalone',
          scope: '/',
          start_url: '/',
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
              purpose: 'any maskable' // Android uchun moslashuvchan ikonka
            }
          ]
        },
        // Ishlab chiqish jarayonida ham PWA ni tekshirish uchun (ixtiyoriy)
        devOptions: {
          enabled: true
        }
      })
    ],
    define: {
      // Supabase va Gemini API kalitlarini global o'zgaruvchi sifatida e'lon qilish
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
    },
    resolve: {
      alias: {
        // @ belgisini loyiha ildiziga yo'naltirish
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR (Hot Module Replacement) sozlamasi
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});