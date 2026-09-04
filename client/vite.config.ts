import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // We removed the tailwindcss() plugin here
  ],
  build: {
    cssMinify: false,
  },
  server: {
    proxy: {
      // every server prefix - anything not listed here is a client route
      ...Object.fromEntries(
        ['/auth', '/game', '/games', '/api', '/stats', '/leaderboard', '/ghosts', '/users', '/daily', '/og',
          '/progression', '/seasons', '/social', '/feed', '/stories', '/arcade', '/campaign', '/push', '/notify', '/tournaments', '/ratings', '/health']
          .map(prefix => [prefix, { target: 'http://localhost:3000', changeOrigin: true, secure: false }]),
      ),
      '/socket.io': { target: 'http://localhost:3000', changeOrigin: true, secure: false, ws: true },
    },
  },
})