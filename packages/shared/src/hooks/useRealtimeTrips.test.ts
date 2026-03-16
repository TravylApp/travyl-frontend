import { describe, it, expect, vi } from 'vitest';

// Mocks must be declared before imports
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn((selector: (s: { user: null }) => unknown) =>
    selector({ user: null })
  ),
}));

vi.mock('../services/api', () => ({
  fetchTrips: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/supabase', () => ({
  supabase: {
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  },
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
