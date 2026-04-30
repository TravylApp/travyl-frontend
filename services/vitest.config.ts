import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    exclude: ['trips.test.ts', 'user.test.ts'], // These need sst dev environment
  },
})
