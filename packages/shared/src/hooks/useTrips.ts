/**
 * @module useTrips
 * Fetches all trips accessible to the current user from Supabase.
 * Handles both authenticated users (owned trips + collaborated trips) and
 * anonymous users (trips stored by ID in localStorage/AsyncStorage).
 * Used by the web TripsPage and mobile TripsTab.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTrips, fetchCollaboratorTrips } from '../services/api';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Trip } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Retrieves stored anonymous trip IDs from localStorage (web) or AsyncStorage (mobile).
 * Tries localStorage/sessionStorage first, then falls back to React Native AsyncStorage.
 * @returns Array of trip UUID strings saved locally for anonymous users
 */
async function getAnonTripIds(): Promise<string[]> {
  try {
    const g = globalThis as any;
    // Web: localStorage/sessionStorage
    const stored = g.localStorage?.getItem('my-trip-ids')
      ?? g.sessionStorage?.getItem('my-trip-ids');
    if (stored) return JSON.parse(stored);
  } catch {}

  // Mobile: AsyncStorage
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage')?.default;
    if (AsyncStorage) {
      const stored = await AsyncStorage.getItem('my-trip-ids');
      if (stored) return JSON.parse(stored);
    }
  } catch {}

  return [];
}

/**
 * Persists a trip ID for an anonymous (unauthenticated) user so it can be
 * retrieved across page refreshes. Writes to localStorage on web and to
 * AsyncStorage on React Native. Deduplicates before saving.
 * @param tripId - UUID of the trip to save locally
 * @returns Promise that resolves once the ID has been written to all available stores
 * @example
 * ```ts
 * await saveAnonTripId(newTrip.id);
 * ```
 */
export async function saveAnonTripId(tripId: string): Promise<void> {
  const ids = await getAnonTripIds();
  if (!ids.includes(tripId)) ids.push(tripId);
  const json = JSON.stringify(ids);

  try {
    const g = globalThis as any;
    g.localStorage?.setItem('my-trip-ids', json);
  } catch {}

  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage')?.default;
    if (AsyncStorage) await AsyncStorage.setItem('my-trip-ids', json);
  } catch {}
}

/**
 * Fetches all trips for a given authenticated user by combining owned trips
 * and collaborated trips, deduplicating by trip ID.
 * @param userId - Supabase auth UUID of the logged-in user
 * @returns Merged, deduplicated array of Trip objects
 */
async function fetchTripsForUser(userId: string): Promise<Trip[]> {
  const [owned, collaborated] = await Promise.all([
    fetchTrips(userId),
    fetchCollaboratorTrips(userId),
  ]);

  // Merge and deduplicate by id
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
 * Resolves the correct trip list depending on whether the user is authenticated.
 * - Anonymous: reads stored trip IDs and fetches via `/api/trips` (web) or
 *   directly from Supabase (mobile/fallback).
 * - Authenticated: delegates to {@link fetchTripsForUser} for owned + collaborated trips.
 * @param userId - Supabase auth UUID, or `null` for anonymous users
 * @returns Array of Trip objects the current session can access
 */
async function fetchTripsWithAnonymous(userId: string | null): Promise<Trip[]> {
  // Anonymous users: fetch by stored trip IDs via API route (service key)
  if (!userId) {
    const anonIds = await getAnonTripIds();

    // Web: use API route for anonymous trips
    if (anonIds.length > 0 && typeof (globalThis as any).document !== 'undefined') {
      try {
        const res = await fetch(`/api/trips?ids=${anonIds.join(',')}`);
        if (res.ok) return res.json() as Promise<Trip[]>;
      } catch {}
    }

    // Mobile/fallback: fetch specific trip IDs directly from Supabase
    if (anonIds.length > 0) {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .in('id', anonIds)
          .order('created_at', { ascending: false });
        if (!error && data?.length) return data as Trip[];
      } catch {}
    }

    return [];
  }

  // Logged-in users: only show their own + collaborated trips
  return fetchTripsForUser(userId);
}

/**
 * Fetches all trips the current user can access (owned, collaborated, or anonymous).
 * The query key is scoped to the user ID (or `'anon'`) so it refetches automatically
 * when the auth state changes.
 * @returns React Query result with `data: Trip[]`, `isLoading`, and `error`
 * @example
 * ```tsx
 * const { data: trips, isLoading } = useTrips();
 * if (isLoading) return <Spinner />;
 * return trips?.map(t => <TripCard key={t.id} trip={t} />);
 * ```
 */
export function useTrips() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['trips', user?.id ?? 'anon'],
    queryFn: () => fetchTripsWithAnonymous(user?.id ?? null),
    enabled: true,
  });
}
