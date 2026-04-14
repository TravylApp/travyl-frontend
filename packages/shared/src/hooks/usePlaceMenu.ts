'use client';

import { useQuery } from '@tanstack/react-query';
import type { MenuResponse } from '../types';

function getApiBase(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WEB_API_URL) {
    return process.env.EXPO_PUBLIC_WEB_API_URL;
  }
  return '';
}

async function fetchPlaceMenu(name: string, city?: string): Promise<MenuResponse> {
  const base = getApiBase();
  const params = new URLSearchParams({ name });
  if (city) params.set('city', city);
  const res = await fetch(`${base}/api/places/menu?${params}`);
  if (!res.ok) throw new Error(`Menu fetch failed: ${res.status}`);
  return res.json() as Promise<MenuResponse>;
}

export function usePlaceMenu(name: string | undefined, city?: string) {
  return useQuery({
    queryKey: ['place-menu', name, city],
    queryFn: () => fetchPlaceMenu(name!, city),
    enabled: !!name,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}
