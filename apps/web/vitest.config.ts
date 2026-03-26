import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Anchor to this package only — avoids picking up shared/node_modules tests
    include: [
      'lib/**/__tests__/**/*.test.ts',
      'hooks/**/__tests__/**/*.test.ts',
      'app/**/__tests__/**/*.test.ts',
    ],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
