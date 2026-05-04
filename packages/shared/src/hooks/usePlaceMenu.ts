/**
 * @module usePlaceMenu
 * Fetches menu/price data for a restaurant or food venue by name and optional city.
 * Calls the /api/places/menu endpoint which aggregates from external menu sources.
 * Used by restaurant detail views to surface sample menu items and price ranges.
 */

'use client';

import { getWebApiBase } from '../utils';
import { useQuery } from '@tanstack/react-query';
import type { MenuResponse } from '../types';


/**
 * Calls the /api/places/menu endpoint for a named venue.
 * @param name - Restaurant or venue name to look up
 * @param city - Optional city used to narrow the menu search
 * @returns Menu payload including items and price information
 * @throws Error if the network response is not OK
 */
async function fetchPlaceMenu(name: string, city?: string): Promise<MenuResponse> {
  const base = getWebApiBase();
  const params = new URLSearchParams({ name });
  if (city) params.set('city', city);
  const res = await fetch(`${base}/api/places/menu?${params}`);
  if (!res.ok) throw new Error(`Menu fetch failed: ${res.status}`);
  return res.json() as Promise<MenuResponse>;
}

/**
 * Fetches menu and price data for a restaurant or food venue.
 * Results are cached for 24 hours; the query is skipped when name is undefined.
 * @param name - Restaurant or venue name; pass undefined to skip the query
 * @param city - Optional city context to improve menu match accuracy
 * @returns React Query result with `MenuResponse` data
 * @example
 * ```tsx
 * const { data: menu, isLoading } = usePlaceMenu(restaurant.name, restaurant.city);
 * menu?.items.forEach(item => console.log(item.name, item.price));
 * ```
 */
export function usePlaceMenu(name: string | undefined, city?: string) {
  return useQuery({
    queryKey: ['place-menu', name, city],
    queryFn: () => fetchPlaceMenu(name!, city),
    enabled: !!name,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}
