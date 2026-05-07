/**
 * @module useDayImages
 * Fetches a bank of N varied images for a destination, suitable for showing
 * a different photo per day in a multi-day itinerary slide. Backed by the
 * `/api/images` endpoint (Pexels search proxy), cached for 24h.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { getWebApiBase } from '../utils';

interface DayImagesResult {
  images: string[];
}

async function fetchDayImages(destination: string, count: number): Promise<DayImagesResult> {
  const base = getWebApiBase();
  // /api/places returns real attractions + their photos (SerpAPI-backed),
  // which gives a richer, more relevant image bank than a generic stock
  // search. Each result represents a distinct landmark / venue.
  const res = await fetch(
    `${base}/api/places?q=${encodeURIComponent(destination)}&limit=${count}`,
  );
  if (!res.ok) return { images: [] };
  const data = (await res.json()) as Array<{ image?: string | null }> | null;
  if (!Array.isArray(data)) return { images: [] };

  const seen = new Set<string>();
  const list: string[] = [];
  for (const entry of data) {
    const url = entry?.image;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    list.push(url);
  }
  return { images: list };
}

/**
 * Returns a varied set of destination images suitable for per-day banners.
 * Disabled while `destination` is empty.
 *
 * @param destination - Human-readable destination (e.g. `"Cancun"`, `"Tokyo, Japan"`)
 * @param count - How many images to request (clamped to at least 3)
 */
export function useDayImages(destination: string, count: number) {
  const safeCount = Math.max(3, Math.min(count, 30));
  return useQuery({
    queryKey: ['day-images', destination, safeCount],
    queryFn: () => fetchDayImages(destination, safeCount),
    enabled: !!destination,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
