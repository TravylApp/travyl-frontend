'use client';

import { useQuery } from '@tanstack/react-query';
import type { SuggestResponse } from '../types';

function getApiBase(): string {
  // Web: relative path; Mobile: env var
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WEB_API_URL) {
    return process.env.EXPO_PUBLIC_WEB_API_URL;
  }
  return '';
}

interface UsePlaceSuggestParams {
  destination: string;
  category?: string;
  page?: number;
}

async function fetchPlaceSuggest(params: UsePlaceSuggestParams): Promise<SuggestResponse> {
  const base = getApiBase();
  const searchParams = new URLSearchParams({
    destination: params.destination,
    category: params.category ?? 'all',
    page: String(params.page ?? 0),
  });

  const res = await fetch(`${base}/api/places/suggest?${searchParams.toString()}`);
  if (!res.ok) throw new Error(`Place suggest fetch failed: ${res.status}`);
  return res.json() as Promise<SuggestResponse>;
}

export function usePlaceSuggest(params: UsePlaceSuggestParams) {
  const { destination, category = 'all', page = 0 } = params;

  return useQuery({
    queryKey: ['place-suggest', destination, category, page],
    queryFn: () => fetchPlaceSuggest(params),
    enabled: !!destination,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
