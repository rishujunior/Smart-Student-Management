// Note: intentionally not wrapped in vite's `defineConfig()` — vitest 3.x still
// bundles its own internal vite copy, whose `Plugin` type does not structurally
// match this project's vite version, which breaks defineConfig's overload
// resolution under `verbatimModuleSyntax`. A plain object works identically at
// runtime for both `vite` (dev/build) and `vitest` (test), since both simply
// read the default export.
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
}
