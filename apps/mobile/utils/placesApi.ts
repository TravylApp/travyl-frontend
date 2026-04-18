import { mapBackendToPlaceItem, getWebApiBase, type PlaceItem } from '@travyl/shared';

export { mapBackendToPlaceItem };

const WEB_API = getWebApiBase();

/** Fetch places from the backend /api/places/nearby endpoint and return PlaceItems */
export async function fetchPlacesNearby(
  lat: string,
  lng: string,
  category: string,
  limit: number,
): Promise<PlaceItem[]> {
  const res = await fetch(
    `${WEB_API}/api/places/nearby?lat=${lat}&lng=${lng}&category=${encodeURIComponent(category)}&limit=${limit}`,
  );
  if (!res.ok) return [];
  const data: any[] = await res.json();
  return Array.isArray(data) ? data.map((p, idx) => mapBackendToPlaceItem(p, idx)) : [];
}
