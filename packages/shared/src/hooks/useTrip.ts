import { useQuery } from '@tanstack/react-query';
import { fetchTripById } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export function useTrip(tripId: string | undefined) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => fetchTripById(tripId!),
    enabled: /* !!user && */ !!tripId,
  });
}
