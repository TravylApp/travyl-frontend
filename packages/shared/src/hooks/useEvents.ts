/**
 * @module useEvents
 * Fetches upcoming events (concerts, festivals, sports, etc.) for a city and country.
 * Calls the /api/events/search endpoint which proxies to webz.io for real-time event data.
 * Used by the trip overview page to surface "What's On" content during travel dates.
 */

'use client';

import { getWebApiBase } from '../utils';
import { useQuery } from '@tanstack/react-query';
import type { TravylEvent } from '../types';
import { travylEventsResponseSchema, safeParse } from '../schemas';


/**
 * Parameters for an event search query.
 */
interface UseEventsParams {
  /** City name to search for events in */
  city: string;
  /** Country name or code used to narrow the event search */
  country: string;
  /** Optional start date filter in YYYY-MM-DD format */
  startDate?: string;
  /** Optional end date filter in YYYY-MM-DD format */
  endDate?: string;
}

/**
 * Calls the /api/events/search endpoint with city, country, and optional date filters.
 * @param params - Event search criteria including city, country, and optional date range
 * @returns Array of `TravylEvent` objects matching the search
 * @throws Error if the network response is not OK
 */
async function fetchEvents(params: UseEventsParams): Promise<TravylEvent[]> {
  const base = getWebApiBase();
  const searchParams = new URLSearchParams({
    city: params.city,
    country: params.country,
  });
  if (params.startDate) searchParams.set('start_date', params.startDate);
  if (params.endDate) searchParams.set('end_date', params.endDate);

  const res = await fetch(`${base}/api/events/search?${searchParams.toString()}`);
  if (!res.ok) throw new Error(`Events fetch failed: ${res.status}`);
  return safeParse(travylEventsResponseSchema, await res.json(), 'events/search') ?? [];
}

/**
 * Fetches upcoming events for a city and country, optionally bounded by date range.
 * Results are cached for 1 hour; the query is skipped when city or country is empty.
 * @param params - City (required), country (required), and optional start/end dates
 * @returns React Query result with an array of `TravylEvent` objects
 * @example
 * ```tsx
 * const { data: events } = useEvents({ city: 'Tokyo', country: 'Japan', startDate: '2025-06-01' });
 * events?.map(e => <EventCard key={e.id} event={e} />);
 * ```
 */
export function useEvents(params: UseEventsParams) {
  const { city, country, startDate, endDate } = params;

  return useQuery({
    queryKey: ['events', city, country, startDate, endDate],
    queryFn: () => fetchEvents(params),
    enabled: !!city && !!country,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
