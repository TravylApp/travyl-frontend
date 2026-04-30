/**
 * @module usePlaceDetail
 * Fetches detailed information about a specific place by ID.
 * Calls the /api/places/[id] endpoint which proxies to Foursquare.
 * Used by the web PlaceDetailClient and mobile PlaceDetailModal.
 */

'use client';

import { getWebApiBase } from '../utils';
import { useQuery } from '@tanstack/react-query';
import type { PlaceDetailResponse } from '../types';


/**
 * Fetches full place details from the /api/places/[id] endpoint.
 * @param placeId - Foursquare place ID or internal place ID to look up
 * @returns Detailed place data including photos, hours, ratings, and tips
 * @throws Error if the network response is not OK
 */
async function fetchPlaceDetail(placeId: string): Promise<PlaceDetailResponse> {
  const base = getWebApiBase();
  const res = await fetch(
    `${base}/api/places/${encodeURIComponent(placeId)}`
  );
  if (!res.ok) throw new Error(`Place detail fetch failed: ${res.status}`);
  return res.json() as Promise<PlaceDetailResponse>;
}

/**
 * Fetches place details including photos, hours, ratings, and tips.
 * Results are cached for 1 hour; the query is skipped when placeId is undefined.
 * @param placeId - Foursquare or internal place ID; pass undefined to skip the query
 * @returns React Query result with `PlaceDetailResponse` data
 * @example
 * ```tsx
 * const { data: place, isLoading } = usePlaceDetail(placeId);
 * if (place) console.log(place.name, place.rating);
 * ```
 */
export function usePlaceDetail(placeId: string | undefined) {
  return useQuery({
    queryKey: ['place-detail', placeId],
    queryFn: () => fetchPlaceDetail(placeId!),
    enabled: !!placeId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
