import { useQuery } from '@tanstack/react-query';
import { fetchTrips } from '../services/api';
import { supabase } from '../services/supabase';
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require('@react-native-async-storage/async-storage')?.default;
    if (AsyncStorage) await AsyncStorage.setItem('my-trip-ids', json);
  } catch {}
}

async function fetchTripsWithAnonymous(): Promise<Trip[]> {
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

  // Default: use Supabase directly (RLS filters for logged-in users)
  return fetchTrips();
}

export function useTrips() {
  return useQuery({
    queryKey: ['trips'],
    queryFn: fetchTripsWithAnonymous,
    enabled: true,
  });
}
