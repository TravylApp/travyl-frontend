'use client';

import { useQuery } from '@tanstack/react-query';
import type { PlaceDetailResponse } from '../types';

function getApiBase(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WEB_API_URL) {
    return process.env.EXPO_PUBLIC_WEB_API_URL;
  }
  return '';
}

async function fetchPlaceDetail(placeId: string): Promise<PlaceDetailResponse> {
  const base = getApiBase();
  const res = await fetch(
    `${base}/api/places/${encodeURIComponent(placeId)}`
  );
  if (!res.ok) throw new Error(`Place detail fetch failed: ${res.status}`);
  return res.json() as Promise<PlaceDetailResponse>;
}

export function usePlaceDetail(placeId: string | undefined) {
  return useQuery({
    queryKey: ['place-detail', placeId],
    queryFn: () => fetchPlaceDetail(placeId!),
    enabled: !!placeId,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
