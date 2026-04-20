import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

const coreStub = resolve(__dirname, 'src/core-stub')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@chataigram/core/internals': `${coreStub}/internals.ts`,
      '@chataigram/core': `${coreStub}/index.ts`,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['src/test-utils/vitest-setup.ts'],
  },
})
