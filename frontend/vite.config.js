import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In dev, forward API + health calls to the Express backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
    },
  },
})
