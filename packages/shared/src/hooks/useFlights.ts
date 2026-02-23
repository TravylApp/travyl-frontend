import { useQuery } from '@tanstack/react-query';
import { fetchFlights } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export function useFlights(tripId: string) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['flights', tripId],
    queryFn: () => fetchFlights(tripId),
    enabled: !!user && !!tripId,
  });
}
