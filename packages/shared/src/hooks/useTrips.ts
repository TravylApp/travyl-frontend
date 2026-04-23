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
  // Fetch owned trips — this must succeed
  const owned = await fetchTrips(userId);

  // Collaborator trips — best effort, don't block owned trips if this fails
  let collaborated: Trip[] = [];
  try {
    collaborated = await fetchCollaboratorTrips(userId);
  } catch {
    // RLS or join error on trip_collaborators — non-fatal
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
