import { useQuery } from '@tanstack/react-query';

async function fetchTripsWithAnonymous() {
  let ids: string[] = [];
  try {
    const stored = (typeof localStorage !== 'undefined' ? localStorage.getItem('my-trip-ids') : null)
      || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('my-trip-ids') : null);
    if (stored) ids = JSON.parse(stored);
  } catch {}
  const url = ids.length > 0 ? `/api/trips?ids=${ids.join(',')}` : '/api/trips';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch trips');
  return res.json() as Promise<any[]>;
}

export function useTrips() {
  return useQuery({
    queryKey: ['trips'],
    queryFn: fetchTripsWithAnonymous,
    enabled: true,
  });
}
