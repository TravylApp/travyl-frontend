export function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(s)} – ${fmt(e)}, ${s.getFullYear()}`;
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Upscale Google Places proxy image URLs from tiny thumbnails to usable sizes */
export function upscaleGoogleImage(url: string | null | undefined, width = 600, height = 400): string | null {
  if (!url) return null;
  if (url.includes('googleusercontent.com')) {
    return url
      .replace(/=w\d+-h\d+[^&\s]*/, `=w${width}-h${height}-k-no`)
      .replace(/=s\d+-w\d+-h\d+[^&\s]*/, `=w${width}-h${height}-k-no`);
  }
  return url;
}

/**
 * Get the best available hero image for a trip.
 * Tries: hero_image_url → hero_images[0] → destination_photo_url.
 * Returns null if none found — caller should fetch dynamically.
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
 * When the available pool is exhausted, resets and starts fresh.
 * Does NOT mutate the input array.
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
 * Shuffles an array in place using Fisher-Yates. Returns a new array.
 */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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

// Gap computation
export { computeGaps } from './gaps'
export type { TimeGap } from './gaps'

/** Returns distance in km between two lat/lng points (Haversine formula) */
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
