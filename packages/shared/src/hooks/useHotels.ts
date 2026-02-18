import { useQuery } from '@tanstack/react-query';
import { fetchHotels } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export function useHotels(tripId: string) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['hotels', tripId],
    queryFn: () => fetchHotels(tripId),
    enabled: !!user && !!tripId,
  });
}
