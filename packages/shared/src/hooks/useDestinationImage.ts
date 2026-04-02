'use client';

import { useQuery } from '@tanstack/react-query';

function getApiBase(): string {
  // Web: relative path; Mobile: env var
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WEB_API_URL) {
    return process.env.EXPO_PUBLIC_WEB_API_URL;
  }
  return '';
}

interface DestinationImageResult {
  url: string | null;
  images: string[];
}

async function fetchDestinationImage(destination: string): Promise<DestinationImageResult> {
  const base = getApiBase();
  const res = await fetch(
    `${base}/api/images/destination?destination=${encodeURIComponent(destination)}`
  );
  if (!res.ok) return { url: null, images: [] };
  const data = await res.json() as { url?: string; image_url?: string; images?: string[] };
  const url = data?.url ?? data?.image_url ?? null;
  const images = data?.images ?? (url ? [url] : []);
  return { url, images };
}

export function useDestinationImage(destination: string) {
  return useQuery({
    queryKey: ['destination-image', destination],
    queryFn: () => fetchDestinationImage(destination),
    enabled: !!destination,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}
