import { useQuery } from '@tanstack/react-query';
import type { Trip } from '../types';
import { fetchTripById } from '../services/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _g = globalThis as any;

async function fetchTripWithFallback(tripId: string): Promise<Trip> {
  // Local trip (Supabase insert failed, stored in sessionStorage)
  if (tripId.startsWith('local-')) {
    const stored: string | null = _g.sessionStorage?.getItem(`trip-${tripId}`) ?? null;
    if (stored) return JSON.parse(stored);
    throw new Error('Local trip not found');
  }
  return fetchTripById(tripId);
}

export function useTrip(tripId: string | undefined) {
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => fetchTripWithFallback(tripId!),
    enabled: !!tripId,
  });
}
