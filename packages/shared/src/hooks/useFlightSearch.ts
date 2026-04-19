/**
 * @module useFlightSearch
 * Searches for available flights between two airports for given dates and passenger count.
 * Calls the /api/flights/search endpoint and caches results for 15 minutes.
 * The query is held until origin, destination, and departDate are all provided.
 * Used by the web and mobile flight search UI.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

/**
 * Resolves the API base URL for the current runtime environment.
 * Returns EXPO_PUBLIC_WEB_API_URL when running in Expo (mobile),
 * or an empty string for relative paths on the web.
 * @returns The API base URL string (may be empty)
 */
function getApiBase(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WEB_API_URL) {
    return process.env.EXPO_PUBLIC_WEB_API_URL;
  }
  return '';
}

/**
 * Parameters for a flight availability search.
 */
export interface FlightSearchParams {
  /** IATA airport code for the departure airport (e.g. 'JFK') */
  origin?: string;
  /** IATA airport code for the arrival airport (e.g. 'CDG') */
  destination?: string;
  /** Outbound date in YYYY-MM-DD format */
  departDate?: string;
  /** Return date in YYYY-MM-DD format; omit for one-way searches */
  returnDate?: string;
  /** Number of passengers; defaults to 1 when omitted */
  passengers?: number;
}

/**
 * Searches for available flights matching the given parameters.
 * Results are cached for 15 minutes. The query is disabled until origin,
 * destination, and departDate are all non-empty strings.
 * @param params - Flight search criteria
 * @returns React Query result with flight search results from the API
 * @example
 * ```tsx
 * const { data: flights, isLoading } = useFlightSearch({
 *   origin: 'JFK', destination: 'CDG', departDate: '2025-06-01', passengers: 2,
 * });
 * ```
 */
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
        date: departDate!,
      });
      if (returnDate) qs.set('return', returnDate);
      if (passengers) qs.set('passengers', String(passengers));
      const res = await fetch(`${base}/api/flights/search?${qs}`);
      if (!res.ok) throw new Error('Flight search failed');
      return res.json();
    },
    enabled,
    staleTime: 15 * 60 * 1000,
  });
}
