import { useState, useCallback, useRef, useEffect } from 'react';
import { type PlaceItem, getWebApiBase, useTrendingDestinations } from '@travyl/shared';
import { filterAndUpscalePlaces } from '@/components/home/globalDedup';
import { cached, cacheGet, cacheSet } from './persistentCache';

const WEB_API = getWebApiBase();

// AsyncStorage-backed geocode cache — survives across app launches so we don't
// re-hit Nominatim every cold start. In-memory Map is the fast layer on top.
const geoMem = new Map<string, { lat: string; lng: string }>();
const GEO_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days — city coords don't move

async function geocodeCity(name: string): Promise<{ lat: string; lng: string } | null> {
  if (geoMem.has(name)) return geoMem.get(name)!;
  const persisted = await cacheGet<{ lat: string; lng: string }>(`geo:${name}`);
  if (persisted) {
    geoMem.set(name, persisted);
    return persisted;
  }
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'TravylApp/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length > 0) {
      const coords = { lat: data[0].lat, lng: data[0].lon };
      geoMem.set(name, coords);
      cacheSet(`geo:${name}`, coords, GEO_TTL).catch(() => {});
      return coords;
    }
  } catch {}
  return null;
}

const PLACES_TTL = 24 * 60 * 60 * 1000; // 24h — SerpAPI responses for inspiration

async function fetchPlaces(city: string | null, limit: number): Promise<PlaceItem[]> {
  if (!city) return [];
  // One persistent cache key per (city, limit). Saves SerpAPI cost on every
  // app launch — we only refetch after 24h.
  return cached(`places:${city}:${limit}`, PLACES_TTL, async () => {
    // Try ?q= first (works on www.gotravyl.com)
    try {
      const qRes = await fetch(`${WEB_API}/api/places?q=${encodeURIComponent(city)}&limit=${limit}`);
      if (qRes.ok) {
        const data = await qRes.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch {}

    // Fall back to geocode + lat/lng (works on dev.gotravyl.com)
    const coords = await geocodeCity(city);
    if (!coords) return [];
    try {
      const res = await fetch(
        `${WEB_API}/api/places?lat=${coords.lat}&lng=${coords.lng}&category=sightseeing&limit=${limit}`
      );
      if (res.ok) return await res.json();
    } catch {}

    return [];
  });
}

/**
 * Iconic destinations rotated through the home inspiration sections on mobile.
 * Curated for global appeal — used when caller doesn't pass a `cities` override.
 * Order is shuffled at consumer site if needed.
 */
export const ICONIC_DESTINATIONS = [
  'Santorini',
  'Tokyo',
  'Bali',
  'Barcelona',
  'Paris',
  'Kyoto',
  'Marrakech',
  'Cape Town',
];

interface UsePlacesBatchOptions {
  batchOffset?: number;
  limit?: number;
  /** Override the city rotation. If omitted, uses trending destinations from /api/trending-destinations. */
  cities?: string[];
}

/**
 * Shared batch-fetch logic for home page place sections.
 * Fetches places by trending city name, deduplicates globally, upscales images.
 * Tries ?q= first, falls back to geocode + lat/lng for servers without NLP search.
 */
export function usePlacesBatch({ batchOffset = 0, limit = 8, cities }: UsePlacesBatchOptions = {}) {
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  // Use a ref for the in-flight guard — `loading` state isn't updated until
  // the next render, so a rapid second call (e.g. another scroll event)
  // can pass the `if (loading)` check before setLoading(true) takes effect,
  // firing duplicate batches. The ref flips synchronously.
  const inFlight = useRef(false);
  const batchIndex = useRef(batchOffset);
  const hasMore = useRef(true);
  const { data: trending } = useTrendingDestinations();
  // Caller-supplied cities take precedence over /api/trending-destinations.
  // Trending is async (`null` = still loading); when caller passes a list,
  // we don't need to wait for trending at all.
  const cityList: string[] | null = cities ?? (trending ? trending.map(d => d.name) : null);

  const fetchBatch = useCallback(async () => {
    if (inFlight.current || !hasMore.current || cityList === null) return;
    inFlight.current = true;
    setLoading(true);

    try {
      const city = cityList.length > 0
        ? cityList[batchIndex.current % cityList.length]
        : null;

      const res = await fetchPlaces(city, limit);
      const fresh = filterAndUpscalePlaces(res);

      if (fresh.length === 0 && batchIndex.current > 20) {
        hasMore.current = false;
      }

      batchIndex.current++;
      setPlaces(prev => [...prev, ...fresh]);
    } catch {}
    inFlight.current = false;
    setLoading(false);
  }, [cityList, limit]);

  // Fetch first batch once city list is ready
  useEffect(() => {
    if (cityList !== null && places.length === 0 && !inFlight.current) {
      fetchBatch();
    }
  }, [cityList]);

  return { places, loading, hasMore: hasMore.current, fetchBatch };
}
