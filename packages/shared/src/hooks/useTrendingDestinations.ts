'use client';

import { useQuery } from '@tanstack/react-query';
import { getWebApiBase } from '../utils';

export interface TrendingDestination {
  name: string;
  country: string;
  thumbnail: string | null;
}

/**
 * Single cached fetch for trending destinations.
 * All home page sections should use this instead of fetching independently.
 * Returns city names ready to pass to /api/places?q={city}.
 */
export function useTrendingDestinations() {
  return useQuery({
    queryKey: ['trending-destinations'],
    queryFn: async (): Promise<TrendingDestination[]> => {
      const base = getWebApiBase();
      const res = await fetch(`${base}/api/trending-destinations`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30 * 60 * 1000, // 30 min — trending doesn't change often
  });
}
