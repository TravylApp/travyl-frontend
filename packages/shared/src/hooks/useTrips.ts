'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTrips, fetchCollaboratorTrips } from '../services/api';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Trip } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */

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

  // Logged-in users: fetch own + collaborated trips
  return fetchTripsForUser(userId);
}

export function useTrips() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['trips', user?.id ?? 'anon'],
    queryFn: () => fetchTripsWithAnonymous(user?.id ?? null),
    enabled: true,
  });
}
