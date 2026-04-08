// ─── Provider routing ─────────────────────────────────────────

const PROVIDER_MAP: Record<string, string> = {
  // dining: 'opentable',
  event: 'ticketmaster',
  concert: 'ticketmaster',
  show: 'ticketmaster',
  nightlife: 'ticketmaster',
  entertainment: 'ticketmaster',
}

/** Returns the booking provider name for a given activity type, or null if no provider available. */
export function routeProvider(activityType: string): string | null {
  return PROVIDER_MAP[activityType.toLowerCase()] ?? null
}

// ─── Name similarity (normalized Levenshtein) ─────────────────

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

/** Normalized name similarity score 0–1 (case-insensitive). */
export function nameSimScore(a: string, b: string): number {
  const na = a.toLowerCase().trim()
  const nb = b.toLowerCase().trim()
  if (na === nb) return 1
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(na, nb) / maxLen
}

// ─── Proximity scoring ────────────────────────────────────────

const MIN_DISTANCE_M = 100
const MAX_DISTANCE_M = 500

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

/** Proximity score 0–1. 1.0 if ≤100m, 0.0 if ≥500m, linear between. */
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

/** Combined confidence = 0.7 × nameSim + 0.3 × proximity */
export function calculateConfidence(nameSim: number, proxScore: number): number {
  return 0.7 * nameSim + 0.3 * proxScore
}
