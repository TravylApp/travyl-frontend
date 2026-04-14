'use client';

import { useQuery } from '@tanstack/react-query';

function getApiBase(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WEB_API_URL) {
    return process.env.EXPO_PUBLIC_WEB_API_URL;
  }
  return '';
}

export interface HotelSearchParams {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}

export function useHotelSearch(params: HotelSearchParams) {
  const base = getApiBase();
  const { destination, checkIn, checkOut, guests } = params;
  const enabled = !!destination && !!checkIn && !!checkOut;

  return useQuery({
    queryKey: ['hotel-search', destination, checkIn, checkOut, guests],
    queryFn: async () => {
      const qs = new URLSearchParams({
        destination: destination!,
        check_in: checkIn!,
        check_out: checkOut!,
      });
      if (guests) qs.set('guests', String(guests));
      const res = await fetch(`${base}/api/hotels/search?${qs}`);
      if (!res.ok) throw new Error('Hotel search failed');
      return res.json();
    },
    enabled,
    staleTime: 15 * 60 * 1000,
  });
}
