import { useQuery } from '@tanstack/react-query';
import { fetchTrip } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export function useTrip(id: string) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['trip', id],
    queryFn: () => fetchTrip(id),
    enabled: !!user && !!id,
  });
}
