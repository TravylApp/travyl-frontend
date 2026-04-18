/**
 * @module usePlaceImage
 * Fetches a representative image for a named place via the /api/images proxy (Unsplash).
 * Includes a module-level concurrency limiter (max 3 simultaneous requests) to avoid
 * rate-limiting. Provides both a single-image hook and a batch hook for lists of places.
 * Used throughout web and mobile place cards and detail views.
 */

'use client';

import { useQuery, useQueries } from '@tanstack/react-query';

// Use our own Next.js API proxy to avoid CORS issues
// (previously called API_URL directly which gets blocked by browser CORS)

/**
 * Shape of the image result returned by the /api/images proxy.
 */
interface PlaceImageResult {
  url: string;
  thumbnail: string;
  title: string;
  source: string;
  width: number;
  height: number;
}

// Simple concurrency limiter — max 3 in-flight at once
let inFlight = 0;
const queue: Array<() => void> = [];

/**
 * Drains the pending queue of image fetch resolvers while the in-flight count
 * is below the maximum of 3. Called both when a slot opens up and when a new
 * request is enqueued.
 */
function dequeue() {
  while (queue.length > 0 && inFlight < 3) {
    inFlight++;
    const next = queue.shift()!;
    next();
  }
}

/**
 * Fetches a single place image via the /api/images proxy.
 * Waits for a concurrency slot before making the network request.
 * Returns null when the name is empty or the fetch returns no usable URL.
 * @param name - Place or attraction name used as the search query
 * @param city - Optional city context appended to the query for better relevance
 * @returns Resolved image result or null if unavailable
 */
async function fetchPlaceImage(name: string, city?: string): Promise<PlaceImageResult | null> {
  if (!name) return null;

  // Wait for a slot
  await new Promise<void>((resolve) => {
    queue.push(resolve);
    dequeue();
  });

  try {
    // Route through our own API proxy to avoid CORS
    const q = city ? `${name} ${city}` : name;
    const res = await fetch(`/api/images?q=${encodeURIComponent(q)}`);
    if (!res.ok) return null;
    const data = await res.json() as { url?: string };
    if (!data?.url) return null;
    return { url: data.url, thumbnail: data.url, title: name, source: 'unsplash', width: 800, height: 600 };
  } finally {
    inFlight--;
    dequeue();
  }
}

/**
 * Fetches a representative image for a single named place.
 * Cached for 4 hours, persisted in gc cache for 24 hours.
 * The query is skipped when name is an empty string.
 * @param name - Place or attraction name
 * @param city - Optional city context to improve image relevance
 * @returns React Query result with a `PlaceImageResult` or null
 * @example
 * ```tsx
 * const { data: img } = usePlaceImage('Eiffel Tower', 'Paris');
 * if (img) return <Image source={{ uri: img.url }} />;
 * ```
 */
export function usePlaceImage(name: string, city?: string) {
  return useQuery({
    queryKey: ['place-image', name, city],
    queryFn: () => fetchPlaceImage(name, city),
    enabled: !!name,
    staleTime: 1000 * 60 * 60 * 4, // 4h
    gcTime: 1000 * 60 * 60 * 24, // 24h
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Fetches images for multiple named places in parallel, respecting the shared
 * concurrency limit of 3 simultaneous requests. Useful for rendering image grids
 * or lists where each card needs its own photo.
 * @param names - Array of place or attraction names to fetch images for
 * @returns Array of React Query results, one per entry in `names`
 * @example
 * ```tsx
 * const results = usePlaceImages(places.map(p => p.name));
 * results.forEach(({ data: img }, i) => console.log(places[i].name, img?.url));
 * ```
 */
export function usePlaceImages(names: string[]) {
  return useQueries({
    queries: names.map((name) => ({
      queryKey: ['place-image', name, undefined],
      queryFn: () => fetchPlaceImage(name),
      enabled: !!name,
      staleTime: 1000 * 60 * 60 * 4,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    })),
  });
}
