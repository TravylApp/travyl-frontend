'use client';

import { useQuery, useQueries } from '@tanstack/react-query';

// Use our own Next.js API proxy to avoid CORS issues
// (previously called API_URL directly which gets blocked by browser CORS)

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

function dequeue() {
  while (queue.length > 0 && inFlight < 3) {
    inFlight++;
    const next = queue.shift()!;
    next();
  }
}

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
