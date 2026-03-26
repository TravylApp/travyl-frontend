import { useQuery } from '@tanstack/react-query';
import { fetchItineraryDays } from '../services/api';

export function useItineraryDays(tripId: string | undefined) {
  return useQuery({
    queryKey: ['itinerary-days', tripId],
    queryFn: () => fetchItineraryDays(tripId!),
    enabled: !!tripId,
  });
}
