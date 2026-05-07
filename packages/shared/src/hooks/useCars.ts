'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchCars } from '../services/api';

export function useCars(tripId: string | undefined) {
  return useQuery({
    queryKey: ['cars', tripId],
    queryFn: () => fetchCars(tripId!),
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000,
  });
}
