import { useQuery } from '@tanstack/react-query';
import { fetchTrips } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export function useTrips() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
    enabled: !!user,
  });
}
