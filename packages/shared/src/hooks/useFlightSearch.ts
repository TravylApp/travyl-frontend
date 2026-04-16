'use client';

import { useQuery } from '@tanstack/react-query';

function getApiBase(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WEB_API_URL) {
    return process.env.EXPO_PUBLIC_WEB_API_URL;
  }
  return '';
}

export interface FlightSearchParams {
  origin?: string;
  destination?: string;
  departDate?: string;
  returnDate?: string;
  passengers?: number;
}

export function useFlightSearch(params: FlightSearchParams) {
  const base = getApiBase();
  const { origin, destination, departDate, returnDate, passengers } = params;
  const enabled = !!origin && !!destination && !!departDate;

  return useQuery({
    queryKey: ['flight-search', origin, destination, departDate, returnDate, passengers],
    queryFn: async () => {
      const qs = new URLSearchParams({
        origin: origin!,
        destination: destination!,
        depart_date: departDate!,
      });
      if (returnDate) qs.set('return_date', returnDate);
      if (passengers) qs.set('passengers', String(passengers));
      const res = await fetch(`${base}/api/flights/search?${qs}`);
      if (!res.ok) throw new Error('Flight search failed');
      return res.json();
    },
    enabled,
    staleTime: 15 * 60 * 1000,
  });
}
