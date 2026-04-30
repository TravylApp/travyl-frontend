/**
 * @module useHeroConfig
 * Fetches the hero section configuration (background image, headline copy, etc.)
 * from the backend API.
 * Used by the web HomePage hero banner and the mobile HomeTab hero component.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchHeroConfig } from '../services/api';

/**
 * Fetches the hero section configuration from the API.
 * The result is cached by React Query under the `['hero-config']` key.
 * No arguments are required; the endpoint always returns the globally
 * configured hero settings.
 * @returns React Query result with `data: HeroConfig`, `isLoading`, and `error`
 * @example
 * ```tsx
 * const { data: hero, isLoading } = useHeroConfig();
 * if (isLoading) return <HeroSkeleton />;
 * return <HeroBanner image={hero?.image_url} headline={hero?.headline} />;
 * ```
 */
export function useHeroConfig() {
  return useQuery({
    queryKey: ['hero-config'],
    queryFn: fetchHeroConfig,
  });
}
