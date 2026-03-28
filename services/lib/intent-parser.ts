export type SearchIntent =
  | 'discover'
  | 'entity-search'
  | 'create-trip'
  | 'route'
  | 'unknown'

export interface ParsedIntent {
  intent: SearchIntent
  location?: string
  entityType?: 'restaurant' | 'hotel' | 'activity' | 'flight'
  rawQuery: string
}

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

  // Pattern 3.5: "[places/where] to [synonym] in [city]"
  const placesToIn = q.match(/^(?:places?\s+to|where\s+to)\s+(\w+)\s+in\s+(.+)$/)
  if (placesToIn) {
    const entityType = ENTITY_SYNONYMS[placesToIn[1]]
    if (entityType) return { intent: 'entity-search', entityType, location: toTitleCase(placesToIn[2].trim()), rawQuery }
  }

  // Pattern 4: "things to do in [city]"
  const thingsToDo = q.match(/^things?\s+to\s+do\s+in\s+(.+)$/)
  if (thingsToDo) return { intent: 'entity-search', entityType: 'activity', location: toTitleCase(thingsToDo[1].trim()), rawQuery }

  // Pattern 5: "[city] [entity]"
  const cityEntity = matchCityEntity(q)
  if (cityEntity) return { intent: 'entity-search', ...cityEntity, rawQuery }

  // Pattern 6: "X to Y" (generic route)
  const route = q.match(/^(.+?)\s+to\s+(.+)$/)
  if (route) {
    const dest = route[2].trim()
    if (!/\s+(?:in|to)\s+/.test(dest)) {
      return { intent: 'route', location: toTitleCase(dest), rawQuery }
    }
  }

  // Pattern 7 (Lambda variant): bare single word → entity-search (searches user data first)
  if (!q.includes(' ')) return { intent: 'entity-search', location: toTitleCase(q), entityType: undefined, rawQuery }

  // No match
  return null
}
