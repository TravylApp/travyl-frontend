import { useState, useCallback, useRef, useEffect } from 'react';
import { type PlaceItem, getWebApiBase, useTrendingDestinations } from '@travyl/shared';
import { filterAndUpscalePlaces } from '@/components/home/globalDedup';

const WEB_API = getWebApiBase();

// Cache geocoded cities so we don't re-geocode on every batch
const geoCache = new Map<string, { lat: string; lng: string }>();

async function geocodeCity(name: string): Promise<{ lat: string; lng: string } | null> {
  if (geoCache.has(name)) return geoCache.get(name)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'TravylApp/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length > 0) {
      const coords = { lat: data[0].lat, lng: data[0].lon };
      geoCache.set(name, coords);
      return coords;
    }
  } catch {}
  return null;
}

async function fetchPlaces(city: string | null, limit: number): Promise<PlaceItem[]> {
  if (!city) return [];

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
}

interface UsePlacesBatchOptions {
  batchOffset?: number;
  limit?: number;
}

/**
 * Shared batch-fetch logic for home page place sections.
 * Fetches places by trending city name, deduplicates globally, upscales images.
 * Tries ?q= first, falls back to geocode + lat/lng for servers without NLP search.
 */
export function usePlacesBatch({ batchOffset = 0, limit = 8 }: UsePlacesBatchOptions = {}) {
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
  const trendingCities = trending ? trending.map(d => d.name) : null;

  const fetchBatch = useCallback(async () => {
    if (inFlight.current || !hasMore.current || trendingCities === null) return;
    inFlight.current = true;
    setLoading(true);

    try {
      const city = trendingCities.length > 0
        ? trendingCities[batchIndex.current % trendingCities.length]
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
  }, [trendingCities, limit]);

  // Fetch first batch once trending data is ready
  useEffect(() => {
    if (trendingCities !== null && places.length === 0 && !inFlight.current) {
      fetchBatch();
    }
  }, [trendingCities]);

  return { places, loading, hasMore: hasMore.current, fetchBatch };
}
