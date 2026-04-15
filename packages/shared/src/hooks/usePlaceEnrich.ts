/**
 * @module usePlaceEnrich
 * Fetches enrichment data (extra photos, website, phone) for a known place.
 * Calls /api/places/enrich which aggregates from Foursquare and Google.
 * Used by place detail views when the core place data lacks media or contact info.
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
 * Shape of the enrichment payload returned by /api/places/enrich.
 */
interface EnrichResponse {
  photos: string[];
  website?: string;
  phone?: string;
}

/**
 * Calls the /api/places/enrich endpoint for a given place.
 * Returns an empty photos array on any non-OK response instead of throwing,
 * so callers degrade gracefully when enrichment is unavailable.
 * @param placeId - Foursquare or internal place ID
 * @param name - Human-readable place name used as a supplemental search hint
 * @returns Enrichment payload with photos array and optional contact fields
 */
async function fetchPlaceEnrich(placeId: string, name: string): Promise<EnrichResponse> {
  const base = getApiBase();
  const params = new URLSearchParams({ placeId });
  if (name) params.set('name', name);
  const res = await fetch(`${base}/api/places/enrich?${params}`);
  if (!res.ok) return { photos: [] };
  return res.json() as Promise<EnrichResponse>;
}

/**
 * Fetches enrichment data (extra photos, website, phone) for a place.
 * Results are cached for 1 hour; the query is skipped when placeId is undefined.
 * @param placeId - Foursquare or internal place ID; pass undefined to skip the query
 * @param name - Human-readable place name forwarded to the enrichment endpoint
 * @returns React Query result with `EnrichResponse` data
 * @example
 * ```tsx
 * const { data } = usePlaceEnrich(place.id, place.name);
 * const heroPhoto = data?.photos[0];
 * ```
 */
export function usePlaceEnrich(placeId: string | undefined, name: string | undefined) {
  return useQuery({
    queryKey: ['place-enrich', placeId],
    queryFn: () => fetchPlaceEnrich(placeId!, name ?? ''),
    enabled: !!placeId,
    staleTime: 60 * 60 * 1000,
  });
}
