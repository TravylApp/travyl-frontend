import { useQuery } from '@tanstack/react-query';
import { fetchTrips } from '../services/api';

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchTripsWithAnonymous() {
  // On web, check localStorage for anonymous trip IDs
  let anonIds: string[] = [];
  try {
    const g = globalThis as any;
    const stored = g.localStorage?.getItem('my-trip-ids')
      || g.sessionStorage?.getItem('my-trip-ids');
    if (stored) anonIds = JSON.parse(stored);
  } catch {}

  // If we have anonymous IDs, fetch via our API route (web only)
  if (anonIds.length > 0 && typeof (globalThis as any).document !== 'undefined') {
    try {
      const res = await fetch(`/api/trips?ids=${anonIds.join(',')}`);
      if (res.ok) return res.json();
    } catch {}
  }

  // Default: use Supabase directly (works on both web and mobile for logged-in users)
  return fetchTrips();
}

export function useTrips() {
  return useQuery({
    queryKey: ['trips'],
    queryFn: fetchTripsWithAnonymous,
    enabled: true,
  });
}
