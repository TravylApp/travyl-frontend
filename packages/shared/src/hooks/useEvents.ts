'use client';

import { useQuery } from '@tanstack/react-query';
import type { TravylEvent } from '../types';

function getApiBase(): string {
  // Web: relative path; Mobile: env var
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WEB_API_URL) {
    return process.env.EXPO_PUBLIC_WEB_API_URL;
  }
  return '';
}

interface UseEventsParams {
  city: string;
  country: string;
  startDate?: string;
  endDate?: string;
}

async function fetchEvents(params: UseEventsParams): Promise<TravylEvent[]> {
  const base = getApiBase();
  const searchParams = new URLSearchParams({
    city: params.city,
    country: params.country,
  });
  if (params.startDate) searchParams.set('start_date', params.startDate);
  if (params.endDate) searchParams.set('end_date', params.endDate);

  const res = await fetch(`${base}/api/events/search?${searchParams.toString()}`);
  if (!res.ok) throw new Error(`Events fetch failed: ${res.status}`);
  return res.json() as Promise<TravylEvent[]>;
}

export function useEvents(params: UseEventsParams) {
  const { city, country, startDate, endDate } = params;

  return useQuery({
    queryKey: ['events', city, country, startDate, endDate],
    queryFn: () => fetchEvents(params),
    enabled: !!city && !!country,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
