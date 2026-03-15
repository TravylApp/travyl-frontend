import { useMemo } from 'react';
import type { PlaceItem } from '../types';

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Pure function: returns up to `limit` similar places, prioritized by:
 * 1. Same type + same category
 * 2. Same type + different category
 * 3. Nearby by coordinates (< 50 km)
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

/** React hook wrapper around getSimilarPlaces */
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
