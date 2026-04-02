'use client';

import { useQuery } from '@tanstack/react-query';

function getApiBase(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WEB_API_URL) {
    return process.env.EXPO_PUBLIC_WEB_API_URL;
  }
  return '';
}

interface EnrichResponse {
  photos: string[];
}

async function fetchPlaceEnrich(placeId: string, name: string): Promise<EnrichResponse> {
  const base = getApiBase();
  const params = new URLSearchParams({ placeId });
  if (name) params.set('name', name);
  const res = await fetch(`${base}/api/places/enrich?${params}`);
  if (!res.ok) return { photos: [] };
  return res.json() as Promise<EnrichResponse>;
}

export function usePlaceEnrich(placeId: string | undefined, name: string | undefined) {
  return useQuery({
    queryKey: ['place-enrich', placeId],
    queryFn: () => fetchPlaceEnrich(placeId!, name ?? ''),
    enabled: !!placeId,
    staleTime: 60 * 60 * 1000,
  });
}
