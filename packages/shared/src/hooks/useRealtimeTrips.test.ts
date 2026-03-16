import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks must be declared before imports
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn((selector: (s: { user: null }) => unknown) =>
    selector({ user: null })
  ),
}));

vi.mock('../services/api', () => ({
  fetchTrips: vi.fn().mockResolvedValue([]),
}));

vi.mock('yjs', () => ({
  Doc: vi.fn().mockImplementation(() => ({
    getMap: vi.fn().mockReturnValue({
      set: vi.fn(),
      observe: vi.fn(),
      unobserve: vi.fn(),
      forEach: vi.fn(),
    }),
    destroy: vi.fn(),
    transact: vi.fn((fn: () => void) => fn()),
  })),
  Map: vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    get: vi.fn(),
  })),
}));

vi.mock('y-supabase', () => ({
  // y-supabase uses a default export
  default: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
  })),
}));

import { renderHook, waitFor } from '@testing-library/react';
import { useRealtimeTrips } from './useRealtimeTrips';

describe('useRealtimeTrips', () => {
  it('returns empty trips and isLoading=false when not authenticated', async () => {
    const { result } = renderHook(() => useRealtimeTrips());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.trips).toEqual([]);
    expect(result.current.isError).toBe(false);
  });
});
