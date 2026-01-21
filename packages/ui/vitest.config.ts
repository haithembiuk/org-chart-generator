import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@shared': '/home/jakhab/Apps/bmad-test/packages/shared',
      '@ui': '/home/jakhab/Apps/bmad-test/packages/ui',
      '@config': '/home/jakhab/Apps/bmad-test/packages/config',
    },
  },
})