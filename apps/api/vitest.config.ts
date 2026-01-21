import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': '/home/jakhab/Apps/bmad-test/apps/api/src',
      '@shared': '/home/jakhab/Apps/bmad-test/packages/shared',
      '@config': '/home/jakhab/Apps/bmad-test/packages/config',
    },
  },
})