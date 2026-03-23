import { useQuery } from '@tanstack/react-query';
import { fetchTripById } from '../services/api';
import { useAuthStore } from '../stores/authStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _g = globalThis as any;

async function fetchTripWithFallback(tripId: string) {
  // Local trip (Supabase insert failed, stored in sessionStorage)
  if (tripId.startsWith('local-')) {
    const stored: string | null = _g.sessionStorage?.getItem(`trip-${tripId}`) ?? null;
    if (stored) return JSON.parse(stored);
    throw new Error('Local trip not found');
  }
  return fetchTripById(tripId);
}

export function useTrip(tripId: string | undefined) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => fetchTripWithFallback(tripId!),
    enabled: /* !!user && */ !!tripId,
  });
}
