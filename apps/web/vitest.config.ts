import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    root: __dirname,
    // Anchor to this package only — avoids picking up shared/node_modules tests
    include: [
      'lib/**/__tests__/**/*.test.ts',
      'hooks/**/__tests__/**/*.test.ts',
      'app/**/__tests__/**/*.test.ts',
      'components/**/__tests__/**/*.test.{ts,tsx}',
    ],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
