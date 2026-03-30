"use client"
import { useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { shuffle } from '../utils';
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

function getApiBase(): string {
  // Web: relative path; Mobile: env var
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WEB_API_URL) {
    return process.env.EXPO_PUBLIC_WEB_API_URL;
  }
  return '';
}

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
