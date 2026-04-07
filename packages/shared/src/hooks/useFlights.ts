'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchFlights } from '../services/api';

export function useFlights(tripId: string | undefined) {
  return useQuery({
    queryKey: ['flights', tripId],
    queryFn: () => fetchFlights(tripId!),
    enabled: !!tripId,
  });
}
