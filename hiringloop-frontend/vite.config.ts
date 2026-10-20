import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    // Keep jsdom test files isolated without exhausting memory on developer machines.
    maxWorkers: 1,
    testTimeout: 15_000,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
