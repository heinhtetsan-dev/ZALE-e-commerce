/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In development the API is reached through this proxy, so the browser only
// ever talks to the Vite origin (localhost, 127.0.0.1, a LAN IP…) and CORS
// does not come into play. Production builds set VITE_API_URL instead.
const apiProxy = {
  '/api': { target: process.env.API_PROXY_TARGET ?? 'http://localhost:4000', changeOrigin: true },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
