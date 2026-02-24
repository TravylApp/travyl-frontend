import { useQuery } from '@tanstack/react-query';
import { fetchActivities } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export function useActivities(tripId: string) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['activities', tripId],
    queryFn: () => fetchActivities(tripId),
    enabled: !!user && !!tripId,
  });
}
