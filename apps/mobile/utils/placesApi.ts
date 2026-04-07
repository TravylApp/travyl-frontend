import type { PlaceItem } from '@travyl/shared';

const WEB_API = process.env.EXPO_PUBLIC_RECOMMENDATION_API_URL || 'https://api.dev.gotravyl.com';

/** Upscale Google Places thumbnails from ~120×92 to 600×400 */
export function upscaleImage(url: string | null | undefined): string {
  if (!url) return '';
  return url.replace(/=w\d+-h\d+(-k-no)?/, '=w600-h400-k-no');
}

/** Map raw backend category to PLACE_COLLECTIONS-compatible category */
function mapCategory(cat: string, sub?: string): string {
  const c = (sub ?? cat).toLowerCase();
  if (['restaurant', 'dining'].includes(c)) return 'Culinary';
  if (c === 'cafe') return 'Culinary';
  if (c === 'bar' || c === 'nightlife') return 'Music Festival';
  if (c === 'museum') return 'Historical';
  if (['attraction', 'landmark', 'monument', 'sightseeing'].includes(c)) return 'Landmark';
  if (['park', 'garden'].includes(c)) return 'Nature';
  if (c === 'beach') return 'Coastal';
  if (c === 'shopping') return 'Market';
  return 'Cultural';
}

function titleCase(s: string): string {
  return s.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

/** Map raw backend tags + category to PLACE_COLLECTIONS-compatible tags */
function mapTags(cat: string, backendTags?: string[], cuisine?: string | null): string[] {
  const tags: string[] = (backendTags ?? []).map(titleCase);
  const c = cat.toLowerCase();
  if (c === 'restaurant' || c === 'cafe' || c === 'dining') tags.push('Food');
  if (c === 'museum' || c === 'attraction' || c === 'sightseeing') tags.push('Culture', 'Landmark');
  if (c === 'park' || c === 'garden') tags.push('Nature');
  if (c === 'bar' || c === 'nightlife') tags.push('Nightlife', 'Bar');
  if (c === 'beach') tags.push('Beach', 'Coast');
  if (c === 'shopping') tags.push('Markets');
  if (cuisine) tags.push(titleCase(cuisine));
  return [...new Set(tags)];
}

/** Map a raw backend /api/places/nearby item to a PlaceItem */
export function mapBackendToPlaceItem(p: any): PlaceItem {
  const cat = (p.category || '').toLowerCase();
  return {
    id: p.id,
    name: p.name,
    image: upscaleImage(p.photo_url),
    type: /restaurant|cafe|bar|dining/.test(cat)
      ? 'restaurant'
      : /park|garden|beach/.test(cat)
        ? 'experience'
        : 'attraction',
    rating: p.rating || 0,
    tagline: p.description?.split('.')[0] || p.category || '',
    category: mapCategory(p.category, p.subcategory),
    description: p.description || '',
    tags: mapTags(p.category, p.tags, p.cuisine),
    latitude: p.lat,
    longitude: p.lng,
    address: p.address,
    reviewCount: p.review_count,
  };
}

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
  return Array.isArray(data) ? data.map(mapBackendToPlaceItem) : [];
}
