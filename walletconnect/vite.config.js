import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Adds a dev proxy so frontend can call the AI agent backend (running on :3000) via /api/* without CORS issues.
// In production you can serve both behind the same origin or configure an API gateway.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        ws: false,
      },
    },
  },
})
