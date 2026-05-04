/**
 * @module useExploreData
 * Fetches place rows for the Explore section by sampling a random selection of
 * curated cities and categories from the `/api/places` endpoint.
 * Items within each row are shuffled once per mount and the result is cached for
 * 10 minutes to avoid redundant requests.
 * Used by `useExploreRows` and ultimately by the web ExplorePage and mobile ExploreTab.
 */

'use client';

import { useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { shuffle, getWebApiBase } from '../utils';
import type { ExplorePlaceRow, PlaceItem } from '../types';

const EXPLORE_CITIES = [
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'New York', lat: 40.7128, lng: -74.006 },
  { name: 'Barcelona', lat: 41.3874, lng: 2.1686 },
  { name: 'Bali', lat: -8.4095, lng: 115.1889 },
  { name: 'Rome', lat: 41.9028, lng: 12.4964 },
];

const CATEGORIES = [
  { key: 'sightseeing', label: 'Top Attractions' },
  { key: 'restaurant', label: 'Restaurants & Cafes' },
  { key: 'nightlife', label: 'Nightlife' },
];

const getApiBase = getWebApiBase;

/**
 * Samples 3 random cities from `EXPLORE_CITIES`, then fetches up to 6 places
 * per city using a rotating category (sightseeing → restaurants → nightlife).
 * Failed or empty fetches are silently skipped so partial results are still returned.
 * @returns Array of `ExplorePlaceRow` objects (city + category label paired with place items)
 */
async function fetchExploreFromApi(): Promise<ExplorePlaceRow[]> {
  const base = getApiBase();
  // Pick 3 random cities each session for variety
  const cities = shuffle([...EXPLORE_CITIES]).slice(0, 3);

  const rows: ExplorePlaceRow[] = [];

  for (const city of cities) {
    // Fetch one category per city for a varied explore feed
    const cat = CATEGORIES[rows.length % CATEGORIES.length];
    try {
      const res = await fetch(
        `${base}/api/places?lat=${city.lat}&lng=${city.lng}&category=${cat.key}&limit=6`
      );
      if (!res.ok) continue;
      const places = (await res.json()) as PlaceItem[];
      if (places.length > 0) {
        rows.push({ title: `${city.name} · ${cat.label}`, items: places });
      }
    } catch {
      // Skip failed fetches
    }
  }

  return rows;
}

/**
 * Fetches and returns place rows for the Explore section.
 * Items within each row are shuffled once per component mount using a ref-stable
 * cache so that row order stays consistent across re-renders while the underlying
 * query data is valid.
 * Data is considered fresh for 10 minutes (`staleTime`).
 * @returns React Query result with `data: ExplorePlaceRow[]`, `isLoading`, and `error`.
 *   Each `ExplorePlaceRow` has a `title` string and an `items` array of `PlaceItem`.
 * @example
 * ```tsx
 * const { data: rows, isLoading } = useExploreData();
 * rows?.forEach(row => console.log(row.title, row.items.length));
 * ```
 */
export function useExploreData() {
  const shuffledRef = useRef<ExplorePlaceRow[] | null>(null);

  const query = useQuery({
    queryKey: ['explore-rows'],
    queryFn: fetchExploreFromApi,
    staleTime: 10 * 60 * 1000, // 10 min
  });

  const data = useMemo(() => {
    if (!query.data?.length) return query.data;

    if (!shuffledRef.current) {
      shuffledRef.current = query.data.map((row) => ({
        ...row,
        items: shuffle([...row.items]),
      }));
    }
    return shuffledRef.current;
  }, [query.data]);

  return { ...query, data };
}
