import { useQuery, useQueries } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL;

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
  if (!API_URL || !name) return null;

  // Wait for a slot
  await new Promise<void>((resolve) => {
    queue.push(resolve);
    dequeue();
  });

  try {
    const params = new URLSearchParams({ name });
    if (city) params.set('city', city);
    const res = await fetch(`${API_URL}/api/trips/places/image?${params}`);
    if (!res.ok) return null;
    return await res.json() as PlaceImageResult;
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
