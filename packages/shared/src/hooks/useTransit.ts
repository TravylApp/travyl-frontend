'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTransit } from '../services/transitApi';

export function useTransit(tripId: string | undefined) {
  return useQuery({
    queryKey: ['transit', tripId],
    queryFn: () => fetchTransit(tripId!),
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000,
  });
}
