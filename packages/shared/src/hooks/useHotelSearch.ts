/**
 * @module useHotelSearch
 * Searches for available hotel rooms at a destination for given check-in/out dates.
 * Calls the /api/hotels/search endpoint and caches results for 15 minutes.
 * The query is held until destination, checkIn, and checkOut are all provided.
 * Used by the web and mobile hotel search UI.
 */

'use client';

import { getWebApiBase } from '../utils';
import { useQuery } from '@tanstack/react-query';
import { serpHotelSearchResponseSchema, safeParse } from '../schemas';


/**
 * Parameters for a hotel availability search.
 */
export interface HotelSearchParams {
  /** City or destination name to search for hotels in */
  destination?: string;
  /** Check-in date in YYYY-MM-DD format */
  checkIn?: string;
  /** Check-out date in YYYY-MM-DD format */
  checkOut?: string;
  /** Number of guests; defaults to 1 when omitted */
  guests?: number;
}

/**
 * Searches for available hotels matching the given parameters.
 * Results are cached for 15 minutes. The query is disabled until destination,
 * checkIn, and checkOut are all non-empty strings.
 * @param params - Hotel search criteria
 * @returns React Query result with hotel search results from the API
 * @example
 * ```tsx
 * const { data: hotels, isLoading } = useHotelSearch({
 *   destination: 'Paris', checkIn: '2025-06-01', checkOut: '2025-06-07', guests: 2,
 * });
 * ```
 */
export function useHotelSearch(params: HotelSearchParams) {
  const base = getWebApiBase();
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
      const validated = safeParse(serpHotelSearchResponseSchema, await res.json(), 'hotels/search');
      return validated ?? { total: 0, hotels: [] };
    },
    enabled,
    staleTime: 15 * 60 * 1000,
  });
}
