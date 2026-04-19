/**
 * @module useSimilarPlaces
 * Computes similar places from an in-memory list without any network requests.
 * Similarity is ranked by shared type+category, shared type, proximity (< 50 km),
 * then everything else. Exposes both a pure utility function and a memoized React hook.
 * Used by place detail views to render "You might also like" sections.
 */

'use client';

import { useMemo } from 'react';
import type { PlaceItem } from '../types';
import { haversineKm } from '../utils';

/**
 * Pure function: returns up to `limit` similar places, prioritized by:
 * 1. Same type + same category
 * 2. Same type + different category
 * 3. Nearby by coordinates (< 50 km)
 * @param place - The reference place to find similarities for
 * @param allPlaces - Full list of candidate places (the reference place is excluded automatically)
 * @param limit - Maximum number of results to return; defaults to 12
 * @returns Sorted array of similar places up to `limit` entries
 */
export function getSimilarPlaces(
  place: PlaceItem,
  allPlaces: PlaceItem[],
  limit = 12,
): PlaceItem[] {
  const others = allPlaces.filter((p) => p.id !== place.id);

  const sameTypeCategory: PlaceItem[] = [];
  const sameType: PlaceItem[] = [];
  const nearby: PlaceItem[] = [];
  const rest: PlaceItem[] = [];

  for (const p of others) {
    if (p.type === place.type && p.category === place.category) {
      sameTypeCategory.push(p);
    } else if (p.type === place.type) {
      sameType.push(p);
    } else if (
      place.latitude != null &&
      place.longitude != null &&
      p.latitude != null &&
      p.longitude != null &&
      haversineKm(place.latitude, place.longitude, p.latitude, p.longitude) < 50
    ) {
      nearby.push(p);
    } else {
      rest.push(p);
    }
  }

  return [...sameTypeCategory, ...sameType, ...nearby, ...rest].slice(0, limit);
}

/**
 * Memoized React hook wrapper around `getSimilarPlaces`.
 * Re-computes only when `place.id`, `allPlaces`, or `limit` changes.
 * Returns an empty array when `place` is null.
 * @param place - The reference place, or null to skip computation
 * @param allPlaces - Full list of candidate places
 * @param limit - Maximum number of results to return; defaults to 12
 * @returns Memoized array of similar places
 * @example
 * ```tsx
 * const similar = useSimilarPlaces(selectedPlace, trip.places, 6);
 * similar.map(p => <PlaceCard key={p.id} place={p} />);
 * ```
 */
export function useSimilarPlaces(
  place: PlaceItem | null,
  allPlaces: PlaceItem[],
  limit = 12,
): PlaceItem[] {
  return useMemo(() => {
    if (!place) return [];
    return getSimilarPlaces(place, allPlaces, limit);
  }, [place?.id, allPlaces, limit]);
}
