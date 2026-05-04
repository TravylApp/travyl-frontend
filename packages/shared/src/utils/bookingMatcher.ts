/**
 * @module bookingMatcher
 * Utilities for matching calendar activities to external booking providers.
 * Provides provider routing, name similarity scoring (normalized Levenshtein),
 * proximity scoring (Haversine), and a combined confidence metric used by
 * the booking-link enrichment pipeline.
 */

// ─── Provider routing ─────────────────────────────────────────

/**
 * Maps canonical activity type strings to their booking provider names.
 * Dining is intentionally excluded (no integrated provider yet).
 */
const PROVIDER_MAP: Record<string, string> = {
  // dining: 'opentable',
  event: 'ticketmaster',
  concert: 'ticketmaster',
  show: 'ticketmaster',
  nightlife: 'ticketmaster',
  entertainment: 'ticketmaster',
}

/**
 * Returns the booking provider name for a given activity type.
 * @param activityType - Activity category string (e.g. "event", "concert")
 * @returns Provider name (e.g. "ticketmaster"), or null if no provider is available
 * @example routeProvider("concert") // → "ticketmaster"
 * @example routeProvider("hotel")   // → null
 */
export function routeProvider(activityType: string): string | null {
  return PROVIDER_MAP[activityType.toLowerCase()] ?? null
}

// ─── Name similarity (normalized Levenshtein) ─────────────────

/**
 * Computes the Levenshtein edit distance between two strings.
 * Uses a standard DP table. O(m*n) time and space.
 * @param a - First string
 * @param b - Second string
 * @returns Integer edit distance
 */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/**
 * Computes a normalized name similarity score between two strings.
 * Score is 1.0 for identical strings, 0.0 for completely different strings.
 * Comparison is case-insensitive and trims leading/trailing whitespace.
 *
 * @param a - First name string
 * @param b - Second name string
 * @returns Similarity score in [0, 1]
 * @example nameSimScore("Eiffel Tower", "eiffel tower") // → 1
 * @example nameSimScore("Eiffel Tower", "Louvre Museum") // → (low score)
 */
export function nameSimScore(a: string, b: string): number {
  const na = a.toLowerCase().trim()
  const nb = b.toLowerCase().trim()
  if (na === nb) return 1
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(na, nb) / maxLen
}

// ─── Proximity scoring ────────────────────────────────────────

/** Minimum distance (metres) at which proximity score is 1.0 */
const MIN_DISTANCE_M = 100
/** Maximum distance (metres) at which proximity score drops to 0.0 */
const MAX_DISTANCE_M = 500

/**
 * Calculates the great-circle distance in metres between two lat/lng points
 * using the Haversine formula.
 * @param lat1 - Latitude of point 1 in decimal degrees
 * @param lon1 - Longitude of point 1 in decimal degrees
 * @param lat2 - Latitude of point 2 in decimal degrees
 * @param lon2 - Longitude of point 2 in decimal degrees
 * @returns Distance in metres
 */
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Returns a proximity score in [0, 1] based on the distance between two coordinates.
 * - Score = 1.0 when distance ≤ 100 m
 * - Score = 0.0 when distance ≥ 500 m
 * - Linear interpolation between those thresholds
 *
 * @param lat1 - Latitude of point 1 in decimal degrees
 * @param lon1 - Longitude of point 1 in decimal degrees
 * @param lat2 - Latitude of point 2 in decimal degrees
 * @param lon2 - Longitude of point 2 in decimal degrees
 * @returns Proximity score in [0, 1]
 */
export function proximityScore(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const d = haversineMeters(lat1, lon1, lat2, lon2)
  if (d <= MIN_DISTANCE_M) return 1
  if (d >= MAX_DISTANCE_M) return 0
  return 1 - (d - MIN_DISTANCE_M) / (MAX_DISTANCE_M - MIN_DISTANCE_M)
}

// ─── Combined confidence ─────────────────────────────────────

/**
 * Combines a name similarity score and a proximity score into a single
 * booking-match confidence value.
 * Weights: 70% name similarity, 30% proximity.
 *
 * @param nameSim - Name similarity score in [0, 1] from {@link nameSimScore}
 * @param proxScore - Proximity score in [0, 1] from {@link proximityScore}
 * @returns Combined confidence score in [0, 1]
 * @example calculateConfidence(0.9, 0.8) // → 0.87
 */
export function calculateConfidence(nameSim: number, proxScore: number): number {
  return 0.7 * nameSim + 0.3 * proxScore
}
