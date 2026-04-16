import { upscaleGoogleImage, isValidImageUrl } from './index';
import type { PlaceItem } from '../types';

// ─── Backend response shape ─────────────────────────────────

export interface BackendPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  subcategory?: string;
  rating: number;
  review_count?: number;
  price_level?: string | number | null;
  description?: string | null;
  photo_url?: string | null;
  website?: string | null;
  address?: string | null;
  opening_hours?: Record<string, string>;
  visit_duration_min?: number | null;
  cuisine?: string | null;
  tags?: string[];
}

// ─── Formatting functions ───────────────────────────────────

export function titleCase(s: string): string {
  return s.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export function formatHours(hours?: Record<string, string>): string | undefined {
  if (!hours) return undefined;
  const days = Object.entries(hours);
  if (days.length === 0) return undefined;
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayNames[new Date().getDay()];
  if (hours[today]) return `Today: ${hours[today]}`;
  return days[0][1];
}

export function formatDuration(minutes?: number | null): string | undefined {
  if (!minutes) return undefined;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? 's' : ''}`;
}

// ─── Mapping functions ──────────────────────────────────────

export function mapType(backendCat: string, requestedCat?: string): PlaceItem['type'] {
  const cat = backendCat.toLowerCase();
  const req = requestedCat?.toLowerCase();
  if (['restaurant', 'cafe', 'bar', 'dining'].includes(cat)) return 'restaurant';
  if (['museum', 'attraction', 'landmark', 'monument'].includes(cat)) {
    if (req && ['restaurant', 'cafe', 'bar', 'dining', 'nightlife'].includes(req)) return 'restaurant';
    if (req && ['park', 'garden', 'beach'].includes(req)) return 'experience';
    return 'attraction';
  }
  if (['park', 'garden', 'outdoor', 'beach'].includes(cat)) return 'experience';
  if (['event', 'festival', 'concert'].includes(cat)) return 'event';
  if (req) {
    if (['restaurant', 'cafe', 'bar', 'dining', 'nightlife'].includes(req)) return 'restaurant';
    if (['museum', 'landmark', 'sightseeing'].includes(req)) return 'attraction';
    if (['park', 'garden', 'beach'].includes(req)) return 'experience';
    if (['shopping', 'market'].includes(req)) return 'destination';
  }
  return 'destination';
}

export function mapCategory(cat: string, sub?: string): string {
  const c = (sub ?? cat).toLowerCase();
  if (['restaurant', 'dining'].includes(c)) return 'Culinary';
  if (c === 'cafe') return 'Culinary';
  if (c === 'bar' || c === 'nightlife' || c === 'club') return 'Nightlife';
  if (c === 'museum' || c === 'gallery') return 'Museum';
  if (c === 'cultural' || c === 'culture') return 'Arts & Culture';
  if (['attraction', 'landmark', 'monument', 'sightseeing'].includes(c)) return 'Landmark';
  if (['park', 'garden', 'outdoor'].includes(c)) return 'Nature';
  if (c === 'beach') return 'Coastal';
  if (c === 'shopping' || c === 'market') return 'Shopping';
  if (c === 'entertainment' || c === 'theater' || c === 'show') return 'Entertainment';
  if (c === 'tour' || c === 'experience') return 'Tours';
  return 'Attraction';
}

export function mapTags(cat: string, backendTags?: string[], cuisine?: string | null): string[] {
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

export function mapPrice(level: string | number | null | undefined): 1 | 2 | 3 | 4 | undefined {
  if (level == null) return undefined;
  if (typeof level === 'number') {
    return level >= 1 && level <= 4 ? (level as 1 | 2 | 3 | 4) : undefined;
  }
  const len = level.replace(/[^$]/g, '').length;
  if (len >= 1 && len <= 4) return len as 1 | 2 | 3 | 4;
  const num = parseInt(level, 10);
  if (num >= 1 && num <= 4) return num as 1 | 2 | 3 | 4;
  return undefined;
}

// ─── Fallback images ────────────────────────────────────────

// No fallback photos — cards without real images show a clean placeholder via the UI
export const FALLBACK_PHOTOS: string[] = [];

export function getFallbackImage(_name: string, _idx: number): string {
  // Return empty — the UI (PinCard, etc.) handles missing images with icon + gradient
  return '';
}

// ─── Canonical mapper ───────────────────────────────────────

export function mapBackendToPlaceItem(p: BackendPlace, _idx = 0, requestedCategory?: string): PlaceItem {
  const img = upscaleGoogleImage(p.photo_url);
  return {
    id: p.id,
    name: p.name,
    image: isValidImageUrl(img) ? img! : '',
    type: mapType(p.category, requestedCategory),
    rating: p.rating ?? 0,
    tagline: p.description?.split('.')[0] ?? p.category,
    category: mapCategory(p.category, p.subcategory),
    description: p.description ?? '',
    latitude: p.lat,
    longitude: p.lng,
    reviewCount: p.review_count,
    address: p.address ?? undefined,
    website: p.website ?? undefined,
    priceLevel: mapPrice(p.price_level),
    hours: formatHours(p.opening_hours),
    duration: formatDuration(p.visit_duration_min),
    tags: mapTags(p.category, p.tags, p.cuisine),
  };
}
