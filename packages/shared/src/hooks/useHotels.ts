import { useQuery } from '@tanstack/react-query';
import { fetchHotels } from '../services/api';

export function useHotels(tripId: string | undefined) {
  return useQuery({
    queryKey: ['hotels', tripId],
    queryFn: () => fetchHotels(tripId!),
    enabled: !!tripId,
  });
}
