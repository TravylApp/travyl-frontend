/**
 * @module useTrips
 * Fetches all trips for the current authenticated user from Supabase.
 * Includes both owned trips and collaborated trips.
 */

'use client';

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query';
import { fetchTrips, fetchCollaboratorTrips } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import type { Trip } from '../types';

/**
 * Fetches all trips for a given authenticated user by combining owned trips
 * and collaborated trips, deduplicating by trip ID.
 */
async function fetchTripsForUser(userId: string): Promise<Trip[]> {
  console.log('[useTrips] Fetching trips for user:', userId)

  // Fetch owned trips — this must succeed
  const owned = await fetchTrips(userId);
  console.log('[useTrips] Owned trips:', owned.length)

  // Collaborator trips — best effort, don't block owned trips if this fails
  let collaborated: Trip[] = [];
  try {
    console.log('[useTrips] Fetching collaborator trips for user:', userId)
    collaborated = await fetchCollaboratorTrips(userId);
    console.log('[useTrips] Collaborator trips fetched successfully:', collaborated.length)
  } catch (err: any) {
    const errorMessage = err?.message || err?.error || err?.toString() || 'Unknown error'
    const errorDetails = err?.details || err?.hint || ''
    const errorCode = err?.code || 'UNKNOWN'
    console.error('[useTrips] Failed to fetch collaborator trips:', {
      message: errorMessage,
      details: errorDetails,
      code: errorCode,
      fullError: err
    })
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

  console.log('[useTrips] Total merged trips:', merged.length)
  return merged;
}

/**
 * Fetches all trips the current user can access (owned + collaborated).
 * Requires authentication — returns empty array if not logged in.
 */
export function useTrips() {
  const user = useAuthStore((s) => s.user);

  const result = useQuery({
    queryKey: ['trips', user?.id],
    queryFn: () => fetchTripsForUser(user!.id),
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  // Debug logging
  useEffect(() => {
    console.log('[useTrips] Query state:', {
      isLoading: result.isLoading,
      isError: result.isError,
      data: result.data?.length,
      error: result.error,
      enabled: result.isEnabled
    })
  }, [result])

  return result
}
