/**
 * @module useTrips
 * Fetches all trips for the current authenticated user from Supabase.
 * Includes both owned trips and collaborated trips.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTrips, fetchCollaboratorTrips } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import type { Trip } from '../types';

/**
 * Fetches all trips for a given authenticated user by combining owned trips
 * and collaborated trips, deduplicating by trip ID.
 */
async function fetchTripsForUser(userId: string): Promise<Trip[]> {
  // Owned trips must succeed; collaborator trips are best-effort.
  const owned = await fetchTrips(userId);

  let collaborated: Trip[] = [];
  try {
    collaborated = await fetchCollaboratorTrips(userId);
    // eslint-disable-next-line no-console
    (globalThis as any).console?.log?.(
      `[useTrips] owned=${owned.length} collaborated=${collaborated.length}`,
    );
  } catch (e: any) {
    // Surface the error so we can diagnose missing-shared-trip cases
    // (RLS, missing RPC, etc.) instead of silently empty.
    // eslint-disable-next-line no-console
    (globalThis as any).console?.warn?.(
      '[useTrips] fetchCollaboratorTrips failed —',
      e?.message ?? e,
    );
  }

  const seen = new Set<string>();
  const merged: Trip[] = [];
  for (const trip of [...owned, ...collaborated]) {
    if (!seen.has(trip.id)) {
      seen.add(trip.id);
      merged.push(trip);
    }
  }
  return merged;
}

/**
 * Fetches all trips the current user can access (owned + collaborated).
 * Requires authentication — returns empty array if not logged in.
 */
export function useTrips() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['trips', user?.id],
    queryFn: () => fetchTripsForUser(user!.id),
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });
}
