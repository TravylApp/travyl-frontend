/**
 * @module usePlaceSuggest
 * Fetches paginated place suggestions for a destination, optionally filtered by category.
 * Calls the /api/places/suggest endpoint which queries Foursquare with destination context.
 * Used by the Explore page and the mobile Discovery Feed to populate category grids.
 */

'use client';

import { getWebApiBase } from '../utils';
import { useQuery } from '@tanstack/react-query';
import type { SuggestResponse } from '../types';


/**
 * Parameters accepted by the place-suggest query.
 */
interface UsePlaceSuggestParams {
  /** City or destination name to search within */
  destination: string;
  /** Place category filter (e.g. 'restaurants', 'attractions'); defaults to 'all' */
  category?: string;
  /** Zero-based page index for pagination; defaults to 0 */
  page?: number;
}

/**
 * Calls the /api/places/suggest endpoint with destination, category, and page params.
 * @param params - Destination, optional category filter, and optional page index
 * @returns Paginated suggestion response with place items and total count
 * @throws Error if the network response is not OK
 */
async function fetchPlaceSuggest(params: UsePlaceSuggestParams): Promise<SuggestResponse> {
  const base = getWebApiBase();
  const searchParams = new URLSearchParams({
    destination: params.destination,
    category: params.category ?? 'all',
    page: String(params.page ?? 0),
  });

  const res = await fetch(`${base}/api/places/suggest?${searchParams.toString()}`);
  if (!res.ok) throw new Error(`Place suggest fetch failed: ${res.status}`);
  return res.json() as Promise<SuggestResponse>;
}

/**
 * Fetches paginated place suggestions for a given destination.
 * Results are cached for 1 hour; the query is skipped when destination is empty.
 * @param params - Destination (required), category, and page number
 * @returns React Query result with `SuggestResponse` data
 * @example
 * ```tsx
 * const { data } = usePlaceSuggest({ destination: 'Tokyo', category: 'restaurants', page: 0 });
 * data?.places.forEach(p => console.log(p.name));
 * ```
 */
export function usePlaceSuggest(params: UsePlaceSuggestParams) {
  const { destination, category = 'all', page = 0 } = params;

  return useQuery({
    queryKey: ['place-suggest', destination, category, page],
    queryFn: () => fetchPlaceSuggest(params),
    enabled: !!destination,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
