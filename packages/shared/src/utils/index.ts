/**
 * @module utils
 * Barrel export for all shared utility functions.
 * Aggregates helpers from the individual util modules and exposes a small set
 * of top-level utilities (date formatting, image handling, trip hero image,
 * Fisher-Yates shuffle, fresh-pick, and the web API base URL).
 *
 * Import from `@travyl/shared` rather than referencing sub-modules directly.
 */

/**
 * Formats a date range as a short human-readable string.
 * @param start - ISO date string for the range start (e.g. "2024-06-01")
 * @param end - ISO date string for the range end (e.g. "2024-06-05")
 * @returns Formatted string like "Jun 1 – Jun 5, 2024"
 */
export function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(s)} – ${fmt(e)}, ${s.getFullYear()}`;
}

/**
 * Formats a numeric amount as a whole-number currency string (no decimals).
 * Uses the `en-US` locale with `Intl.NumberFormat`.
 *
 * @param amount - Numeric amount to format
 * @param currency - ISO 4217 currency code (default: "USD")
 * @returns Formatted string (e.g. "$1,234")
 * @example formatCurrency(1234.5, "USD") // → "$1,235"
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Upscales image URLs from Google Places / googleusercontent and Foursquare
 * to a larger resolution suitable for full-screen display.
 *
 * - Google: rewrites `=wNNN-hNNN` size tokens to the target dimensions.
 * - Foursquare: replaces size path segments with `"original"` for full resolution.
 * - Other URLs are returned unchanged.
 *
 * @param url - Image URL to upscale, or null/undefined
 * @param width - Target width in pixels (default: 1200)
 * @param height - Target height in pixels (default: 800)
 * @returns Upscaled URL, or null if the input is null/undefined/empty
 */
export function upscaleGoogleImage(url: string | null | undefined, width = 1200, height = 800): string | null {
  if (!url || url.length < 10) return null;
  // Google Places / googleusercontent thumbnails
  if (url.includes('googleusercontent.com')) {
    return url
      .replace(/=w\d+-h\d+[^&\s]*/, `=w${width}-h${height}-k-no`)
      .replace(/=s\d+-w\d+-h\d+[^&\s]*/, `=w${width}-h${height}-k-no`);
  }
  // Foursquare — replace size tokens with 'original' for full res
  if (url.includes('4sqi.net') || url.includes('foursquare.com') || url.includes('fsq.com')) {
    return url.replace(/\/(\d+x\d+|cap\d+|width\d+)\//, '/original/');
  }
  return url;
}

/**
 * Returns true if a URL looks like a valid, renderable image link.
 * Checks that the URL is non-empty and starts with "http".
 *
 * @param url - URL to validate
 * @returns `true` if the URL appears valid
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || url.length < 10) return false;
  // Must start with http
  if (!url.startsWith('http')) return false;
  return true;
}

/**
 * Gets the best available hero image URL for a trip.
 * Resolution order: `hero_image_url` → `hero_images[0]` → `destination_photo_url`.
 * Google-proxied URLs are automatically upscaled.
 * Returns null if no image is found — callers should fetch dynamically.
 *
 * @param trip - Trip object with optional `trip_context` JSON blob
 * @returns Hero image URL string, or null if none is available
 */
export function getTripHeroImage(trip: { destination?: string | null; trip_context?: any } | null): string | null {
  const ctx = trip?.trip_context;
  if (ctx?.hero_image_url) {
    const url = ctx.hero_image_url as string;
    return url.includes('googleusercontent.com')
      ? url.replace(/=w\d+-h\d+[^&\s]*/, '=w1200-h800-k-no').replace(/=s\d+-w\d+-h\d+[^&\s]*/, '=w1200-h800-k-no')
      : url;
  }
  if (ctx?.hero_images?.length && ctx.hero_images[0]) return ctx.hero_images[0];
  if (ctx?.destination_photo_url) return ctx.destination_photo_url;
  return null;
}

// ─── Permissions ───────────────────────────────────────────────

export {
  canEditTrip,
  canForkTrip,
  isTripOwner,
  canMakePublic,
  canViewTrip,
} from './permissions';

// ─── Fresh-pick utility ─────────────────────────────────────────

/**
 * Picks `count` random items from `pool`, excluding IDs already in `shownIds`.
 * When the available pool is exhausted, resets `shownIds` and uses the full pool.
 * Does NOT mutate the input array. Updates `shownIds` with newly picked IDs.
 *
 * @param pool - Array of items to pick from; each item must have an `id` field
 * @param count - Number of items to pick
 * @param shownIds - Mutable set of already-shown IDs (updated in place)
 * @returns Array of `count` freshly picked items (Fisher-Yates shuffled)
 * @example
 * const shown = new Set<string>()
 * const picks = pickFresh(allPlaces, 4, shown)
 */
export function pickFresh<T extends { id: string }>(
  pool: T[],
  count: number,
  shownIds: Set<string>,
): T[] {
  let available = pool.filter((item) => !shownIds.has(item.id));

  // Pool exhausted — reset and use full pool
  if (available.length < count) {
    shownIds.clear();
    available = [...pool];
  }

  // Fisher-Yates shuffle
  const shuffled = [...available];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const picked = shuffled.slice(0, count);
  for (const item of picked) shownIds.add(item.id);
  return picked;
}

/**
 * Returns a new array that is a Fisher-Yates shuffled copy of the input.
 * The original array is not mutated.
 *
 * @param items - Array to shuffle
 * @returns New shuffled array of the same type
 * @example shuffle([1, 2, 3, 4]) // → e.g. [3, 1, 4, 2]
 */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Returns the base URL for web API requests, selecting the correct origin
 * for the current runtime environment.
 *
 * - On web (Next.js): returns `""` (empty string) so requests use relative paths.
 * - On mobile (Expo): reads `EXPO_PUBLIC_WEB_API_URL` from the environment.
 *
 * All components should call this instead of defining their own WEB_API constants.
 *
 * @returns Base URL string (e.g. "https://www.travyl.com" on mobile, "" on web)
 */
export function getWebApiBase(): string {
  // Expo's Babel plugin only inlines direct `process.env.EXPO_PUBLIC_X` references.
  // Optional chaining (`process.env?.`) breaks the transform in Hermes/EAS builds.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const url = process.env.EXPO_PUBLIC_WEB_API_URL;
    if (url) return url;
  } catch {
    // process.env may not exist in some runtimes
  }
  return '';
}

// Session tracker — re-export for public barrel
export { getShownIds } from './sessionTracker';

// Activity mapper
export {
  parseTime, hourToTime, clampTime, hoursBetween, daysBetween, addDays,
  mapToDbType, toCalendarActivity, toActivityRow,
} from './activityMapper'
export type { ActivityRow } from './activityMapper'

export { computeOverlapLayout } from './overlapLayout'
export type { OverlapLayoutItem } from './overlapLayout'

// Budget utilities
export { mapActivityToBudgetCategory } from './budgetMapping'
export { convertToTripCurrency, formatBudgetAmount } from './currency'

// Packing utilities
export { computePackingProgress, clampPackedCount } from './packingUtils'

// Poll utilities
export { isVoteKey, userIdFromVoteKey, parseVotesFromYMap, resolveVotes } from './pollHelpers'

// Rescoper utilities
export { detectOperation, getConflictingActivities, computeNewTotalDays } from './rescoper'
export type { RescoperOperation } from './rescoper'

export { mergeSearchResults, deduplicateResults } from './entitySearch'
export type { SpotlightResult } from './entitySearch'

// Gap computation (calendar time gaps)
export { computeGaps as computeTimeGaps } from './gaps'
export type { TimeGap } from './gaps'

/**
 * Returns the straight-line distance in kilometres between two lat/lng points
 * using the Haversine formula. Assumes a spherical Earth (radius 6371 km).
 *
 * @param lat1 - Latitude of point 1 in decimal degrees
 * @param lng1 - Longitude of point 1 in decimal degrees
 * @param lat2 - Latitude of point 2 in decimal degrees
 * @param lng2 - Longitude of point 2 in decimal degrees
 * @returns Distance in kilometres
 * @example haversineKm(48.8566, 2.3522, 51.5074, -0.1278) // → ~341 km (Paris → London)
 */
/**
 * AsyncStorage key for the favorited-place IDs list, scoped to the current
 * signed-in user. The legacy global key (`travyl-favorites`) leaked saved
 * favorites between accounts on shared devices — every consumer now reads
 * and writes through this helper so each user has their own list.
 *
 * `:anon` is used while the user object hasn't resolved yet (cold start)
 * and for genuinely anonymous sessions.
 *
 * @param userId - The current Supabase auth user id, or null/undefined
 * @returns The per-user AsyncStorage key (e.g. `travyl-favorites:abc-123`)
 */
export function favoritesKeyFor(userId: string | null | undefined): string {
  return `travyl-favorites:${userId || 'anon'}`;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Booking matcher utilities
export { routeProvider, nameSimScore, proximityScore, calculateConfidence } from './bookingMatcher'

// Gap computation utility (day planner)
export { computeGaps } from './gapCompute'
export type { Gap } from './gapCompute'

export * from './places'

// Client-side search intent inference (Places page hint)
export { inferSearchCategory, inferSearchHint } from './searchIntent'
export type { InferredCategory } from './searchIntent'
