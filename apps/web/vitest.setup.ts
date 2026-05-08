import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Auto-cleanup the DOM between tests so successive renders don't leak.
afterEach(() => {
  cleanup();
});
