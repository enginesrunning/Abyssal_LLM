import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The proxy forwards any request starting with /api to the FastAPI backend,
// so the frontend can just call fetch('/api/...') with no CORS headaches.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  resolve: { dedupe: ['three'] },
})
