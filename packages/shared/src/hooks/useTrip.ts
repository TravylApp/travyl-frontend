/**
 * @module useTrip
 * Fetches a single trip by ID from the API, with a fallback for locally-stored
 * trips created while Supabase was unavailable.
 * Used by the web and mobile trip detail/overview screens.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import type { Trip } from '../types';
import { fetchTripById } from '../services/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _g = globalThis as any;

/**
 * Resolves a trip by ID, supporting both persisted Supabase trips and
 * temporary "local-" trips stored in `sessionStorage` when a Supabase insert failed.
 * @param tripId - Trip UUID, or a `local-*` prefixed string for session-only trips
 * @returns The matching Trip object
 * @throws Error if a `local-*` trip cannot be found in sessionStorage
 */
async function fetchTripWithFallback(tripId: string): Promise<Trip> {
  // Local trip (Supabase insert failed, stored in sessionStorage)
  if (tripId.startsWith('local-')) {
    const stored: string | null = _g.sessionStorage?.getItem(`trip-${tripId}`) ?? null;
    if (stored) return JSON.parse(stored);
    throw new Error('Local trip not found');
  }
  return fetchTripById(tripId);
}

/**
 * Fetches a single trip by ID.
 * The query is disabled until a `tripId` is provided. Supports local fallback
 * for trips that were created offline or when Supabase insertion failed.
 * @param tripId - Trip UUID to fetch, or `undefined` to keep the query idle
 * @returns React Query result with `data: Trip`, `isLoading`, and `error`
 * @example
 * ```tsx
 * const { data: trip, isLoading } = useTrip(tripId);
 * if (isLoading) return <Spinner />;
 * return <TripOverview trip={trip} />;
 * ```
 */
export function useTrip(tripId: string | undefined) {
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => fetchTripWithFallback(tripId!),
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev, // keep previous data visible during refetch
  });
}
