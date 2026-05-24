import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        // Main SPA (game)
        main: resolve(__dirname, 'index.html'),
        // SEO landing pages (standalone static HTML)
        'how-to-play': resolve(__dirname, 'how-to-play.html'),
        'daily-rewards': resolve(__dirname, 'daily-rewards.html'),
        'leaderboard': resolve(__dirname, 'leaderboard.html'),
        'faq': resolve(__dirname, 'faq.html'),
        'reward-rules': resolve(__dirname, 'reward-rules.html'),
        'play-to-burn': resolve(__dirname, 'play-to-burn.html'),
        'free-browser-game': resolve(__dirname, 'free-browser-game.html'),
        'about': resolve(__dirname, 'about.html'),
        'press': resolve(__dirname, 'press.html'),
        'fair-play': resolve(__dirname, 'fair-play.html'),
        'terms': resolve(__dirname, 'terms.html'),
        'privacy': resolve(__dirname, 'privacy.html'),
        'install': resolve(__dirname, 'install.html'),
        'install-iphone': resolve(__dirname, 'install-iphone.html'),
        'install-android': resolve(__dirname, 'install-android.html'),
        'notifications': resolve(__dirname, 'notifications.html'),
      },
    },
  },
})
