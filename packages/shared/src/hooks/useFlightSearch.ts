/**
 * @module useFlightSearch
 * Searches for available flights between two airports for given dates and passenger count.
 * Calls the /api/flights/search endpoint and caches results for 15 minutes.
 * The query is held until origin, destination, and departDate are all provided.
 * Used by the web and mobile flight search UI.
 */

'use client';

import { getWebApiBase } from '../utils';
import { useQuery } from '@tanstack/react-query';


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
  const base = getWebApiBase();
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
      const url = `${base}/api/flights/search?${qs}`;
      // eslint-disable-next-line no-console
      (globalThis as any).console?.log?.('[useFlightSearch] GET', url);
      const res = await (globalThis as any).fetch(url);
      const text = await res.text();
      let body: any = {};
      try { body = JSON.parse(text); } catch {}
      // Don't throw on !ok — surface the error message + empty flights so
      // the caller can render a useful empty state instead of a silent
      // "no results" with no explanation.
      if (!res.ok) {
        // eslint-disable-next-line no-console
        (globalThis as any).console?.warn?.('[useFlightSearch] non-OK', res.status, body?.error || text.slice(0, 200));
        return { flights: [], error: body?.error || `HTTP ${res.status}`, status: res.status };
      }
      return body;
    },
    enabled,
    staleTime: 15 * 60 * 1000,
    retry: false,
  });
}
