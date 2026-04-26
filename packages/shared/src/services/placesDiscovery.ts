/**
 * @module placesDiscovery
 * Unified places discovery service used by both web and mobile Places pages.
 * All content is dynamic — no hardcoded categories or query lists.
 * APIs handle natural language: just pass the destination name.
 */

import type { PlaceItem } from '../types';
import { getWebApiBase, haversineKm as distanceKm, shuffle, upscaleGoogleImage, mapCategory } from '../utils';

const BASE = () => getWebApiBase();

/** Max distance (km) for nearby places (~25 miles) */
const NEARBY_RADIUS_KM = 40;
/** Number of nearby pages before switching to trending destinations */
const NEARBY_PAGE_COUNT = 4;
/** Days ahead to search for events */
const EVENT_LOOKAHEAD_DAYS = 30;
/** Coordinate offset per page (in degrees, ~1.7km) to discover adjacent neighborhoods */
const PAGE_COORD_OFFSET = 0.015;
/** Default result limit for Foursquare */
const FOURSQUARE_LIMIT = 20;
/** Fallback distance for places with no coordinates (sorts them to the end) */
const NO_COORDS_DISTANCE = 99999;

// ─── Type inference from API response ────────────────────────

function inferType(apiType: string | undefined): PlaceItem['type'] {
  if (!apiType) return 'attraction';
  const t = apiType.toLowerCase();
  if (/restaurant|food|dining|cafe|coffee|donut|bakery|pizza|sushi|burger|taco|bar|pub|brewery|eatery/i.test(t)) return 'restaurant';
  if (/nightlife|club|lounge|karaoke|comedy|entertainment|escape|bowling|arcade|spa|gym/i.test(t)) return 'experience';
  if (/hotel|hostel|resort|motel|inn|accommodation/i.test(t)) return 'hotel';
  if (/event|concert|festival|show|performance/i.test(t)) return 'event';
  if (/city|country|state|geo|destination/i.test(t)) return 'destination';
  return 'attraction';
}

// ─── Mappers ─────────────────────────────────────────────────

/** Map a raw API place response to a PlaceItem */
export function mapApiPlace(p: any): PlaceItem {
  return {
    id: p.id,
    name: p.name,
    image: upscaleGoogleImage(p.image || p.photo_url) ?? '',
    images: p.images?.map((img: string) => upscaleGoogleImage(img) ?? img),
    type: p.type ? inferType(p.type) : inferType(p.category),
    rating: p.rating || 0,
    tagline: p.tagline || p.description?.split('.')[0] || p.category || '',
    category: mapCategory(p.category || ''),
    description: p.description || '',
    tags: p.tags || [p.category].filter(Boolean),
    latitude: p.latitude ?? p.lat,
    longitude: p.longitude ?? p.lng,
    address: p.address,
    reviewCount: p.reviewCount ?? p.review_count,
    website: p.website,
    priceLevel: p.priceLevel,
    hours: p.hours,
    duration: p.duration,
    phone: p.phone,
    bestTimeToVisit: p.bestTimeToVisit,
  };
}

function mapEvent(e: any, idPrefix: string, idx: number): PlaceItem {
  return {
    id: `${idPrefix}-event-${idx}`,
    name: e.name || e.title,
    image: e.photo_url || e.image || '',
    type: 'event',
    rating: e.venue_rating || 0,
    reviewCount: e.venue_reviews || undefined,
    tagline: [e.venue, e.date].filter(Boolean).join(' · '),
    category: 'Event',
    description: e.description || '',
    tags: ['Event', e.venue || e.category].filter(Boolean),
    latitude: e.lat,
    longitude: e.lng,
    address: e.address || e.venue || '',
    website: e.link || '',
  };
}

// ─── Dedup ───────────────────────────────────────────────────

/** Dedup places by normalized name + approximate coordinates */
export function dedupPlaces(places: PlaceItem[]): PlaceItem[] {
  const seen = new Set<string>();
  return places.filter((p) => {
    if (!p.name) return false;
    const normName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const locKey = p.latitude != null ? `${p.latitude.toFixed(3)}_${p.longitude?.toFixed(3)}` : '';
    const key = `${normName}_${locKey}`;
    if (seen.has(key)) return false;
    if (!locKey && seen.has(normName)) return false;
    seen.add(key);
    if (!locKey) seen.add(normName);
    return true;
  });
}

// ─── Distance helpers ────────────────────────────────────────

/** Format a distance in km as a human-readable label (ft/mi) */
export function distanceLabel(km: number): string {
  const mi = km * 0.621371;
  if (mi < 0.3) return `${Math.round(mi * 5280)} ft`;
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}

/** Attach distance tagline and sort by proximity */
function withDistanceSort(places: PlaceItem[], userLoc: { lat: number; lng: number }): PlaceItem[] {
  return places
    .filter(p => p.latitude != null && p.longitude != null &&
      distanceKm(userLoc.lat, userLoc.lng, p.latitude!, p.longitude!) <= NEARBY_RADIUS_KM)
    .map(p => {
      const dist = distanceKm(userLoc.lat, userLoc.lng, p.latitude!, p.longitude!);
      return { ...p, tagline: `${distanceLabel(dist)} away · ${p.category || p.type || ''}` };
    })
    .sort((a, b) => {
      const dA = distanceKm(userLoc.lat, userLoc.lng, a.latitude!, a.longitude!);
      const dB = distanceKm(userLoc.lat, userLoc.lng, b.latitude!, b.longitude!);
      return dA - dB;
    });
}

// ─── Geocoding ───────────────────────────────────────────────

/** Fill in missing coordinates for places that don't have them (e.g. TripAdvisor results) */
async function enrichWithCoords(places: PlaceItem[]): Promise<PlaceItem[]> {
  const missing = places.filter(p => p.latitude == null || p.longitude == null);
  if (missing.length === 0) return places;

  // Geocode missing places in parallel (Nominatim is free, no key needed)
  const geocoded = await Promise.all(
    missing.map(async (p) => {
      const query = p.address ? `${p.name}, ${p.address}` : p.name;
      const coords = await resolveCoords(query);
      if (coords) {
        return { ...p, latitude: parseFloat(coords.lat), longitude: parseFloat(coords.lng) };
      }
      return p;
    })
  );

  // Merge geocoded places back into the original list
  const geocodedMap = new Map(geocoded.map(p => [p.id, p]));
  return places.map(p => geocodedMap.get(p.id) || p);
}

async function resolveCoords(query: string): Promise<{ lat: string; lng: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'Travyl/1.0' } }
    );
    const data = await res.json() as any[];
    if (data.length > 0) return { lat: data[0].lat, lng: data[0].lon };
  } catch {}
  return null;
}

let _nearbyCityCache: string | null = null;

async function getNearbyCityName(lat: number, lng: number): Promise<string | null> {
  if (_nearbyCityCache) return _nearbyCityCache;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      { headers: { 'User-Agent': 'Travyl/1.0' } }
    );
    const data = await res.json() as any;
    _nearbyCityCache = data.address?.city || data.address?.town || data.address?.county || null;
  } catch {}
  return _nearbyCityCache;
}

// ─── Trending destinations (dynamic from API) ────────────────

type TrendingItem = { name: string; country: string; thumbnail: string };
let _trendingCache: TrendingItem[] | null = null;
let _trendingPromise: Promise<TrendingItem[]> | null = null;

async function getTrending(): Promise<TrendingItem[]> {
  if (_trendingCache) return _trendingCache;
  if (_trendingPromise) return _trendingPromise;
  _trendingPromise = fetch(`${BASE()}/api/trending-destinations`)
    .then(r => r.ok ? r.json() as Promise<any[]> : [])
    .then((data) => {
      _trendingCache = Array.isArray(data) ? shuffle(data) : [];
      _trendingPromise = null;
      return _trendingCache;
    })
    .catch(() => { _trendingPromise = null; return [] as TrendingItem[]; });
  return _trendingPromise;
}

// ─── Fetch with timeout ──────────────────────────────────────

const FETCH_TIMEOUT_MS = 15000;

function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ─── Core fetch helpers (all take natural language) ──────────

async function fetchMapsSearch(query: string): Promise<PlaceItem[]> {
  return fetchWithTimeout(`${BASE()}/api/search/maps?q=${encodeURIComponent(query)}`)
    .then(r => r.ok ? r.json() as Promise<any[]> : [])
    .then((data) => (Array.isArray(data) ? data : []).map(p => mapApiPlace(p)))
    .catch(() => []);
}

async function fetchTripAdvisor(query: string, ssrc = 'a'): Promise<PlaceItem[]> {
  return fetchWithTimeout(`${BASE()}/api/search/tripadvisor?q=${encodeURIComponent(query)}&ssrc=${ssrc}`)
    .then(r => r.ok ? r.json() as Promise<any[]> : [])
    .then((data) => (Array.isArray(data) ? data : []).map(p => mapApiPlace(p)))
    .catch(() => []);
}

async function fetchEvents(city: string, idPrefix: string): Promise<PlaceItem[]> {
  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + EVENT_LOOKAHEAD_DAYS * 86400000).toISOString().split('T')[0];
  return fetchWithTimeout(`${BASE()}/api/events/search?city=${encodeURIComponent(city)}&start=${today}&end=${nextMonth}`)
    .then(r => r.ok ? r.json() as Promise<any[]> : [])
    .then((events) => (Array.isArray(events) ? events : []).map((e, i) => mapEvent(e, idPrefix, i)))
    .catch(() => []);
}

/** Artist tour dates — searches for concerts/shows and maps them to PlaceItems */
async function fetchArtistTour(query: string): Promise<PlaceItem[]> {
  return fetchWithTimeout(`${BASE()}/api/events/artist?q=${encodeURIComponent(query)}`)
    .then(r => r.ok ? r.json() as Promise<any> : { events: [] })
    .then((data) => {
      const events = (data as any).events ?? [];
      return events.map((e: any, i: number): PlaceItem => ({
        id: `tour-${i}-${(e.name || '').slice(0, 8).replace(/\s/g, '')}`,
        name: e.name || query,
        image: e.image || '',
        type: 'event',
        rating: 0,
        tagline: [e.venue, e.date].filter(Boolean).join(' · '),
        category: 'Concert',
        description: e.description || '',
        tags: ['Concert', 'Tour', e.venue].filter(Boolean),
        latitude: e.lat,
        longitude: e.lng,
        address: e.address || e.venue || '',
        website: e.link || e.ticket_links?.[0]?.url || '',
      }));
    })
    .catch(() => []);
}

async function fetchFoursquare(lat: string, lng: string, limit = FOURSQUARE_LIMIT): Promise<PlaceItem[]> {
  // No category — let Foursquare return whatever is nearby
  return fetchWithTimeout(`${BASE()}/api/places?lat=${lat}&lng=${lng}&limit=${limit}`)
    .then(r => r.ok ? r.json() as Promise<any[]> : [])
    .then((data) => (Array.isArray(data) ? data : []).map(p => mapApiPlace(p)))
    .catch(() => []);
}

// ─── Public API ──────────────────────────────────────────────

export interface DiscoverPageResult {
  items: PlaceItem[];
  hasMore: boolean;
  nextPage: number | null;
}

/**
 * Fetch a page of the discover feed.
 * All queries are natural language — no hardcoded categories.
 * Pages 0–3 use user location (nearby), pages 4+ cycle through trending cities.
 */
export async function fetchDiscoverPage(
  page: number,
  userLoc?: { lat: number; lng: number } | null,
): Promise<DiscoverPageResult> {
  try {
    const trending = await getTrending();
    if (trending.length === 0 && !userLoc) {
      return { items: [], hasMore: false, nextPage: null };
    }

    const useNearby = !!(userLoc && page < NEARBY_PAGE_COUNT);

    let destination: string;
    let coords: { lat: string; lng: string } | null;

    if (useNearby) {
      const cityName = await getNearbyCityName(userLoc!.lat, userLoc!.lng);
      destination = cityName || 'nearby';
      coords = { lat: String(userLoc!.lat), lng: String(userLoc!.lng) };
    } else {
      destination = trending.length > 0 ? trending[page % trending.length].name : 'Popular';
      coords = await resolveCoords(destination);
    }

    const slug = useNearby ? 'nearby' : destination.toLowerCase().replace(/\s/g, '-');

    // All queries are just the destination name — let the APIs decide what to show
    const [mapsResults, taResults, events, nearbyResults] = await Promise.all([
      // Google Maps: "best of {destination}" — returns diverse mix
      fetchMapsSearch(`best places in ${destination}`),
      // TripAdvisor: top things to do — returns 30 attractions/restaurants
      fetchTripAdvisor(`${destination}`),
      // Events happening in the destination
      fetchEvents(destination, `${slug}-p${page}`),
      // Foursquare: whatever is near the coordinates
      coords ? fetchFoursquare(coords.lat, coords.lng) : Promise.resolve([]),
    ]);

    // Geocode any places missing coordinates so distance always works
    let allPlaces = await enrichWithCoords([...mapsResults, ...taResults, ...nearbyResults]);

    // Destination cards from trending API
    let destCards: PlaceItem[] = [];
    if (page === 0) {
      destCards = trending.map((d, i) => ({
        id: `dest-trending-${i}`,
        name: d.name,
        image: d.thumbnail || '',
        type: 'destination' as const,
        rating: 0,
        tagline: d.country || `Explore ${d.name}`,
        category: 'Destination',
        description: `Discover things to do in ${d.name}`,
        tags: ['Destination', d.country].filter(Boolean),
        address: d.country ? `${d.name}, ${d.country}` : d.name,
      }));
    } else if (!useNearby) {
      const match = trending.find(d => d.name === destination);
      destCards = [{
        id: `${slug}-dest-${page}`,
        name: destination,
        image: match?.thumbnail || '',
        type: 'destination' as const,
        rating: 0,
        tagline: match?.country || `Explore ${destination}`,
        category: 'Destination',
        description: `Discover things to do in ${destination}`,
        tags: ['Destination'],
        address: destination,
      }];
    }

    // Distance filter + sort for nearby pages
    if (useNearby && userLoc) {
      allPlaces = withDistanceSort(allPlaces, userLoc);
    }

    const items = useNearby
      ? [...allPlaces, ...events, ...destCards]
      : shuffle([...destCards, ...allPlaces, ...events]);

    return { items, hasMore: true, nextPage: page + 1 };
  } catch {
    return { items: [], hasMore: true, nextPage: page + 1 };
  }
}

/**
 * Fetch nearby places (used as the "Near You" section).
 * No categories — just returns whatever is near the user.
 */
export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
): Promise<PlaceItem[]> {
  const [foursquare, maps] = await Promise.all([
    fetchFoursquare(String(lat), String(lng), 30),
    fetchMapsSearch(`things to do near ${lat},${lng}`),
  ]);
  return withDistanceSort(dedupPlaces([...foursquare, ...maps]), { lat, lng });
}

/**
 * Search for places by free-text query — paginated for endless scroll.
 * Works with anything: "beaches", "Nobu", "malls", "Drake", "big library".
 * Each page pulls from different sources/offsets for continuous discovery.
 */
export async function searchPlaces(
  query: string,
  page = 0,
  userLoc?: { lat: number; lng: number } | null,
): Promise<DiscoverPageResult> {
  try {
    // Location-aware Maps query
    const mapsQuery = userLoc
      ? `${query} near ${userLoc.lat},${userLoc.lng}`
      : query;

    // Vary sources per page for fresh results each scroll
    const fetches: Promise<PlaceItem[]>[] = [];

    // Google Maps — every page, but vary the query slightly
    if (page === 0) {
      fetches.push(fetchMapsSearch(mapsQuery));
    } else {
      // Subsequent pages: search nearby cities or add context
      const trending = await getTrending();
      const city = trending.length > 0 ? trending[page % trending.length].name : '';
      fetches.push(fetchMapsSearch(city ? `${query} in ${city}` : mapsQuery));
    }

    // TripAdvisor — paginate with offset (30 per page)
    fetches.push(fetchTripAdvisor(query, 'a'));

    // Events — only on first page and every 3rd page
    if (page % 3 === 0) {
      fetches.push(fetchEvents(query, `search-p${page}`));
    }

    // Artist tour — only on first page
    if (page === 0) {
      fetches.push(fetchArtistTour(query));
    }

    // Suggest — only on first page
    if (page === 0) {
      fetches.push(
        fetch(`${BASE()}/api/places/suggest?destination=${encodeURIComponent(query)}&limit=10`)
          .then(r => r.ok ? r.json() as Promise<any> : { suggestions: [] })
          .then((data) => ((data as any).suggestions ?? []).map((s: any) => mapApiPlace({
            id: `suggest-${s.id || s.name}`,
            name: s.name,
            category: s.category,
            image: s.imageUrl || s.image,
            images: s.imageUrls,
            rating: s.rating,
            description: s.description,
            address: s.location,
            latitude: s.latitude,
            longitude: s.longitude,
          })))
          .catch(() => [] as PlaceItem[]),
      );
    }

    const results = await Promise.all(fetches);
    let items = await enrichWithCoords(results.flat());

    // Add distance labels if user has location
    if (userLoc) {
      items = items.map(p => {
        if (p.latitude != null && p.longitude != null) {
          const dist = distanceKm(userLoc.lat, userLoc.lng, p.latitude!, p.longitude!);
          return { ...p, tagline: `${distanceLabel(dist)} away · ${p.tagline || p.category || ''}` };
        }
        return p;
      }).sort((a, b) => {
        const dA = a.latitude != null ? distanceKm(userLoc.lat, userLoc.lng, a.latitude!, a.longitude!) : NO_COORDS_DISTANCE;
        const dB = b.latitude != null ? distanceKm(userLoc.lat, userLoc.lng, b.latitude!, b.longitude!) : NO_COORDS_DISTANCE;
        return dA - dB;
      });
    }

    return { items, hasMore: true, nextPage: page + 1 };
  } catch {
    return { items: [], hasMore: true, nextPage: page + 1 };
  }
}

/**
 * Fetch a page of nearby places for infinite scroll.
 * No hardcoded categories — Foursquare + Google Maps return whatever is near.
 */
export async function fetchNearbyPage(
  lat: number,
  lng: number,
  page: number,
): Promise<PlaceItem[]> {
  // Slight coord offset per page for variety
  const offsetLat = lat + (page % 3) * PAGE_COORD_OFFSET;
  const offsetLng = lng + (page % 2) * PAGE_COORD_OFFSET;

  return fetchFoursquare(String(offsetLat), String(offsetLng), 20);
}
