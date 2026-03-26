// apps/web/lib/parseQueryIntent.ts

export type SearchIntent =
  | 'discover'
  | 'entity-search'
  | 'create-trip'
  | 'route'
  | 'unknown'

export interface ParsedIntent {
  intent: SearchIntent
  /** Title-cased place name, e.g. "Bakersfield". Normalized at parse time. */
  location?: string
  entityType?: 'restaurant' | 'hotel' | 'activity' | 'flight'
  rawQuery: string
}

// ---------------------------------------------------------------------------
// Synonym map
// ---------------------------------------------------------------------------

const ENTITY_SYNONYMS: Record<string, ParsedIntent['entityType']> = {
  restaurant: 'restaurant', restaurants: 'restaurant',
  food: 'restaurant', dining: 'restaurant', eat: 'restaurant',
  eats: 'restaurant', cafe: 'restaurant', cafes: 'restaurant',
  bar: 'restaurant', bars: 'restaurant', brunch: 'restaurant',
  lunch: 'restaurant', dinner: 'restaurant',
  hotel: 'hotel', hotels: 'hotel', stay: 'hotel',
  lodging: 'hotel', accommodation: 'hotel', accommodations: 'hotel',
  hostel: 'hotel', hostels: 'hotel', motel: 'hotel', motels: 'hotel',
  airbnb: 'hotel', resort: 'hotel', resorts: 'hotel',
  activity: 'activity', activities: 'activity',
  attraction: 'activity', attractions: 'activity',
  sights: 'activity', sightseeing: 'activity',
  tour: 'activity', tours: 'activity',
  museum: 'activity', museums: 'activity', park: 'activity', parks: 'activity',
  flight: 'flight', flights: 'flight', fly: 'flight',
  airline: 'flight', airlines: 'flight',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchEntityInCity(q: string): { entityType: ParsedIntent['entityType']; location: string } | null {
  for (const [synonym, entityType] of Object.entries(ENTITY_SYNONYMS)) {
    const re = new RegExp(`^${escapeRegex(synonym)}\\s+in\\s+(.+)$`)
    const m = q.match(re)
    if (m) return { entityType, location: toTitleCase(m[1].trim()) }
  }
  return null
}

function matchCityEntity(q: string): { entityType: ParsedIntent['entityType']; location: string } | null {
  for (const [synonym, entityType] of Object.entries(ENTITY_SYNONYMS)) {
    const re = new RegExp(`^(.+?)\\s+${escapeRegex(synonym)}$`)
    const m = q.match(re)
    if (m) return { entityType, location: toTitleCase(m[1].trim()) }
  }
  return null
}

// ---------------------------------------------------------------------------
// Phase 1: synchronous regex parser (exported for unit testing)
// ---------------------------------------------------------------------------

export function parseQueryIntentSync(rawQuery: string): ParsedIntent | null {
  const q = rawQuery.trim().toLowerCase()

  // Pattern 1: "trip to [destination]"
  const tripTo = q.match(/^trip\s+to\s+(.+)$/)
  if (tripTo) return { intent: 'create-trip', location: toTitleCase(tripTo[1].trim()), rawQuery }

  // Pattern 2: "new trip" / "create trip"
  if (/^(?:new|create)\s+trip$/.test(q)) return { intent: 'create-trip', rawQuery }

  // Pattern 3: "[entity] in [city]"
  const entityInCity = matchEntityInCity(q)
  if (entityInCity) return { intent: 'entity-search', ...entityInCity, rawQuery }

  // Pattern 4: "things to do in [city]" — must come before generic "X to Y"
  const thingsToDo = q.match(/^things?\s+to\s+do\s+in\s+(.+)$/)
  if (thingsToDo) return { intent: 'entity-search', entityType: 'activity', location: toTitleCase(thingsToDo[1].trim()), rawQuery }

  // Pattern 5: "[city] [entity]"
  const cityEntity = matchCityEntity(q)
  if (cityEntity) return { intent: 'entity-search', ...cityEntity, rawQuery }

  // Pattern 6: "X to Y" (generic route)
  // Exclude matches where the destination part contains " in " or " to " —
  // those are more complex phrases that should fall through to Phase 2 (null).
  const route = q.match(/^(.+?)\s+to\s+(.+)$/)
  if (route) {
    const dest = route[2].trim()
    if (!/\s+(?:in|to)\s+/.test(dest)) {
      return { intent: 'route', location: toTitleCase(dest), rawQuery }
    }
  }

  // Pattern 7: bare single word — treat as destination discovery
  // Multi-word queries that don't match any pattern above go to Phase 2 (LLM).
  if (!q.includes(' ')) return { intent: 'discover', location: toTitleCase(q), rawQuery }

  // No match — caller falls back to Phase 2 (LLM)
  return null
}

// ---------------------------------------------------------------------------
// Phase 2: LLM fallback via /api/parse-intent (client-side, session-cached)
// ---------------------------------------------------------------------------

const CACHE_KEY = (q: string) => `parse-intent:${q.toLowerCase().trim()}`

async function parseViaLLM(query: string, token: string): Promise<ParsedIntent> {
  const cacheKey = CACHE_KEY(query)

  try {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) return JSON.parse(cached) as ParsedIntent
  } catch { /* SSR / unavailable */ }

  try {
    const res = await fetch(`/api/parse-intent?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json() as ParsedIntent
    try { sessionStorage.setItem(cacheKey, JSON.stringify(data)) } catch { /* ignore */ }
    return data
  } catch {
    return { intent: 'unknown', rawQuery: query }
  }
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

export async function parseQueryIntent(query: string, token: string): Promise<ParsedIntent> {
  const syncResult = parseQueryIntentSync(query)
  if (syncResult) return syncResult
  return parseViaLLM(query, token)
}
