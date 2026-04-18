/**
 * @module useDestinationImage
 * Fetches hero image(s) for a travel destination from the `/api/images/destination`
 * endpoint. Results are cached for 24 hours since destination images rarely change.
 * Used by trip overview screens on both web and mobile to display a destination hero photo.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

/**
 * Returns the base URL for API requests.
 * On web the path is relative (`''`); on Expo it is read from
 * `EXPO_PUBLIC_WEB_API_URL` so the mobile app can reach the Next.js backend.
 * @returns Base URL string (may be empty for web relative paths)
 */
function getApiBase(): string {
  // Web: relative path; Mobile: env var
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_WEB_API_URL) {
    return process.env.EXPO_PUBLIC_WEB_API_URL;
  }
  return '';
}

/**
 * Shape of the data returned by `useDestinationImage`.
 */
interface DestinationImageResult {
  /** Primary image URL, or `null` if none was found. */
  url: string | null;
  /** All available image URLs for the destination (may include `url`). */
  images: string[];
}

/**
 * Calls the destination image API and normalises the response into a
 * `DestinationImageResult`. Handles both `url` and `image_url` response
 * field names for backwards compatibility.
 * @param destination - Human-readable destination name (e.g. `"Tokyo, Japan"`)
 * @returns Normalised image result with a primary `url` and full `images` array
 */
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

/**
 * Fetches hero image(s) for the given travel destination.
 * The query is disabled while `destination` is an empty string.
 * Results are treated as fresh for 24 hours to avoid redundant API calls.
 * @param destination - Human-readable destination name to look up (e.g. `"Paris, France"`)
 * @returns React Query result with `data: DestinationImageResult`, `isLoading`, and `error`
 * @example
 * ```tsx
 * const { data } = useDestinationImage(trip.destination);
 * return <HeroImage src={data?.url} />;
 * ```
 */
export function useDestinationImage(destination: string) {
  return useQuery({
    queryKey: ['destination-image', destination],
    queryFn: () => fetchDestinationImage(destination),
    enabled: !!destination,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}
