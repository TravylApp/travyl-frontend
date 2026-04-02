'use client';

import { useQuery } from '@tanstack/react-query';

function getApiBase(): string {
  // Web: relative path; Mobile: env var
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WEB_API_URL) {
    return process.env.EXPO_PUBLIC_WEB_API_URL;
  }
  return '';
}

async function fetchDestinationImage(destination: string): Promise<string | null> {
  const base = getApiBase();
  const res = await fetch(
    `${base}/api/images/destination?destination=${encodeURIComponent(destination)}`
  );
  if (!res.ok) return null;
  const data = await res.json() as { url?: string; image_url?: string };
  return data?.url ?? data?.image_url ?? null;
}

export function useDestinationImage(destination: string) {
  return useQuery({
    queryKey: ['destination-image', destination],
    queryFn: () => fetchDestinationImage(destination),
    enabled: !!destination,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}
