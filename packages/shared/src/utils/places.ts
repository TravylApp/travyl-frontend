/**
 * @module places
 * Place data mapping and formatting utilities.
 * Transforms raw backend place API responses into the `PlaceItem` shape used
 * throughout the UI. Handles type inference, category labels, tag generation,
 * price-level normalization, image upscaling, and opening-hours formatting.
 *
 * The canonical entry point is {@link mapBackendToPlaceItem}, which composes
 * all the individual helpers below.
 */

import { upscaleGoogleImage, isValidImageUrl } from './index';
import type { PlaceItem } from '../types';

// ─── Backend response shape ─────────────────────────────────

/**
 * Raw place object returned by the Travyl backend `/api/places` endpoint.
 * This is the source format before mapping to the UI's `PlaceItem`.
 */
export interface BackendPlace {
  /** Backend-assigned place identifier */
  id: string;
  /** Display name of the place */
  name: string;
  /** WGS-84 latitude */
  lat: number;
  /** WGS-84 longitude */
  lng: number;
  /** Primary category (e.g. "restaurant", "museum", "park") */
  category: string;
  /** Optional subcategory for finer classification (e.g. "cafe" within "restaurant") */
  subcategory?: string;
  /** Average user rating (typically 0–5) */
  rating: number;
  /** Total number of user reviews */
  review_count?: number;
  /** Price level: a "$" string, a 1–4 numeric string, or a 1–4 integer */
  price_level?: string | number | null;
  /** Short description or tagline */
  description?: string | null;
  /** Photo URL (may be a Google-proxied thumbnail) */
  photo_url?: string | null;
  /** Official website URL */
  website?: string | null;
  /** Street address */
  address?: string | null;
  /** Map from day name (lowercase) to hours string (e.g. "9:00 AM – 5:00 PM") */
  opening_hours?: Record<string, string>;
  /** Estimated visit duration in minutes */
  visit_duration_min?: number | null;
  /** Cuisine type for food/restaurant places */
  cuisine?: string | null;
  /** Additional searchable tags */
  tags?: string[];
}

// ─── Formatting functions ───────────────────────────────────

/**
 * Converts a snake_case or space-separated string to Title Case.
 * @param s - Input string (e.g. "arts_and_culture" or "open air")
 * @returns Title-cased string (e.g. "Arts And Culture" or "Open Air")
 * @example titleCase("sea_food") // → "Sea Food"
 */
export function titleCase(s: string): string {
  return s.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

/**
 * Formats opening hours for display. Prefers today's hours if available,
 * otherwise returns the first day's hours in the map.
 *
 * @param hours - Map from day name (lowercase) to hours string, or undefined
 * @returns A display string (e.g. "Today: 9:00 AM – 5:00 PM"), or undefined if no data
 */
export function formatHours(hours?: Record<string, string>): string | undefined {
  if (!hours) return undefined;
  const days = Object.entries(hours);
  if (days.length === 0) return undefined;
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayNames[new Date().getDay()];
  if (hours[today]) return `Today: ${hours[today]}`;
  return days[0][1];
}

/**
 * Formats a visit duration in minutes into a human-readable string.
 * @param minutes - Visit duration in minutes, or null/undefined
 * @returns Formatted string (e.g. "45 min", "1h 30m", "2 hours"), or undefined if no data
 * @example formatDuration(90) // → "1h 30m"
 * @example formatDuration(120) // → "2 hours"
 */
export function formatDuration(minutes?: number | null): string | undefined {
  if (!minutes) return undefined;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? 's' : ''}`;
}

// ─── Mapping functions ──────────────────────────────────────

/**
 * Infers the UI `PlaceItem.type` from the backend category and optional
 * requested category. The requested category is used as a tie-breaker
 * when the backend returns a generic type like "museum" for a food search.
 *
 * @param backendCat - Primary category from the backend (e.g. "restaurant", "museum")
 * @param requestedCat - The category the user searched for (e.g. "nightlife")
 * @returns UI place type: "restaurant" | "attraction" | "experience" | "event" | "destination"
 */
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

/**
 * Maps a backend category (and optional subcategory) to a human-readable
 * display category label shown on place cards and filter pills.
 *
 * @param cat - Primary backend category (e.g. "restaurant", "museum")
 * @param sub - Optional subcategory — takes precedence over `cat` if provided
 * @returns Display label (e.g. "Culinary", "Museum", "Landmark", "Nature")
 */
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

/**
 * Generates a tag array for a place from its category, backend tags, and cuisine.
 * Tags are title-cased and deduplicated.
 *
 * @param cat - Primary backend category (drives auto-tags like "Food", "Nature")
 * @param backendTags - Additional tags returned by the backend
 * @param cuisine - Cuisine string for restaurant places (e.g. "italian")
 * @returns Deduplicated array of title-cased tag strings
 * @example mapTags("restaurant", ["outdoor seating"], "italian") // → ["Outdoor Seating", "Food", "Italian"]
 */
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

/**
 * Normalizes a backend price level value (string, number, or null) to a
 * 1–4 integer scale used by the `PlaceItem` UI. Returns undefined for
 * out-of-range or unrecognizable values.
 *
 * @param level - Raw price level (e.g. "$$", 2, "3", null)
 * @returns Normalized price level (1 | 2 | 3 | 4), or undefined
 * @example mapPrice("$$")  // → 2
 * @example mapPrice(3)     // → 3
 * @example mapPrice(null)  // → undefined
 */
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

/**
 * Empty array — there are no fallback photos.
 * Cards without real images show a clean icon + gradient placeholder via the UI.
 */
// No fallback photos — cards without real images show a clean placeholder via the UI
export const FALLBACK_PHOTOS: string[] = [];

/**
 * Returns an empty string — image fallback is handled by the UI layer (PinCard, etc.)
 * using an icon + gradient placeholder rather than a stock image.
 *
 * @param _name - Place name (unused)
 * @param _idx - Index (unused)
 * @returns Empty string
 */
export function getFallbackImage(_name: string, _idx: number): string {
  // Return empty — the UI (PinCard, etc.) handles missing images with icon + gradient
  return '';
}

// ─── Canonical mapper ───────────────────────────────────────

/**
 * Transforms a raw `BackendPlace` API response into a `PlaceItem` ready for
 * use in the UI. Applies image upscaling, type inference, category mapping,
 * tag generation, and price normalization.
 *
 * @param p - Raw place object from the backend API
 * @param _idx - Index within the results array (unused; kept for array.map compatibility)
 * @param requestedCategory - The category the user searched for, used to improve type inference
 * @returns Normalized `PlaceItem` for the UI
 */
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
