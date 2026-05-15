import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          globPatterns: ['assets/**/*.{js,css,html,ico,png,svg}', 'index.html'],
          globIgnores: [
            '**/node_modules/**/*',
            'android/**/*',
            'release/**/*',
            'dist/**/*',
            'build/**/*',
            'win-unpacked/**/*',
            'dist_electron/**/*'
          ],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
          skipWaiting: true,
          clientsClaim: true
        },
        devOptions: {
          enabled: false
        },
        manifest: {
          name: 'LukasFe3D Hub',
          short_name: 'LukasFe3D',
          description: 'Sistema de gestão de vendas e estoque',
          theme_color: '#18181b',
          background_color: '#18181b',
          display: 'standalone',
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
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      rollupOptions: {
        external: ['electron'],
      },
    },
    optimizeDeps: {
      entries: ['index.html', 'src/**/*.{ts,tsx}'],
      exclude: ['electron'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      watch: {
        ignored: [
          '**/android/**',
          '**/release/**',
          '**/dist/**',
          '**/build/**',
          '**/win-unpacked/**',
          '**/dist_electron/**',
          '**/node_modules/**'
        ]
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: false,
    },
  };
});
