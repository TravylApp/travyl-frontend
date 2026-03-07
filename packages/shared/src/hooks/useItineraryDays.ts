import { useQuery } from '@tanstack/react-query';
import { fetchItineraryDays } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export function useItineraryDays(tripId: string | undefined) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['itinerary-days', tripId],
    queryFn: () => fetchItineraryDays(tripId!),
    enabled: /* !!user && */ !!tripId,
    retry: false,
  });
}
