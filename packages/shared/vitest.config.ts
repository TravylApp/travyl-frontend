import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // y-supabase package.json points main to src/y-supabase.js which isn't
      // shipped; redirect to the actual dist entry for Vite resolution.
      'y-supabase': path.resolve(__dirname, '../../node_modules/y-supabase/dist/index.js'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
