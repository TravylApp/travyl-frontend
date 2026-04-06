/**
 * Generates packing suggestions based on trip context.
 *
 * Uses the PACKING_CATALOG as the source of truth and selects items
 * based on weather, duration, destination, and trip metadata.
 *
 * Returns items with a `reason` explaining why they're suggested.
 */

import type { CatalogItem, PackingSuggestion } from '../types'
import { PACKING_CATALOG } from '../config/packingCatalog'

interface TripContext {
  destination: string
  country?: string
  startDate?: string
  endDate?: string
  durationDays: number
  weather?: {
    current?: { temp_f?: number; conditions?: string }
    forecast?: Array<{ high?: number; low?: number; conditions?: string }>
  } | null
  travelers?: { adults?: number; children?: number }
  tripTheme?: string // e.g. "beach", "hiking", "business", "city", "adventure"
  cuisine?: string[]
  hotels?: Array<{ name?: string; stars?: number }>
}

type WeatherTag = 'hot' | 'cold' | 'mild' | 'rainy' | 'snowy' | 'beach' | 'winter' | 'summer'

function inferWeatherTags(ctx: TripContext): Set<WeatherTag> {
  const tags = new Set<WeatherTag>()
  const forecast = ctx.weather?.forecast
  const current = ctx.weather?.current

  // Use forecast if available, otherwise current
  const temps = forecast
    ? forecast.map((d) => d.high ?? d.low ?? 70)
    : current
      ? [current.temp_f ?? 70]
      : []

  const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 70

  if (avgTemp >= 85) tags.add('hot')
  if (avgTemp >= 75) tags.add('summer')
  if (avgTemp <= 40) tags.add('cold')
  if (avgTemp <= 32) tags.add('snowy')
  if (avgTemp <= 55) tags.add('winter')
  if (avgTemp > 55 && avgTemp < 75) tags.add('mild')

  // Check conditions
  const conditions = [
    ...(forecast?.map((d) => d.conditions ?? '') ?? []),
    current?.conditions ?? '',
  ].join(' ').toLowerCase()

  if (conditions.includes('rain') || conditions.includes('drizzle') || conditions.includes('shower')) {
    tags.add('rainy')
  }
  if (conditions.includes('snow') || conditions.includes('blizzard')) {
    tags.add('snowy')
  }

  // Destination-based tags
  const dest = ctx.destination.toLowerCase()
  const theme = ctx.tripTheme?.toLowerCase() ?? ''
  if (dest.includes('beach') || theme.includes('beach') || theme.includes('resort')) {
    tags.add('beach')
  }

  return tags
}

function inferTripType(ctx: TripContext): Set<string> {
  const types = new Set<string>()
  const dest = ctx.destination.toLowerCase()
  const theme = ctx.tripTheme?.toLowerCase() ?? ''

  if (dest.includes('beach') || theme.includes('beach') || theme.includes('resort') || theme.includes('tropical')) {
    types.add('beach')
  }
  if (dest.includes('hike') || dest.includes('mountain') || dest.includes('trek') || theme.includes('hiking') || theme.includes('adventure') || theme.includes('outdoor')) {
    types.add('outdoor')
  }
  if (theme.includes('business') || theme.includes('work') || (ctx.hotels?.some((h) => (h.stars ?? 0) >= 4))) {
    types.add('business')
  }
  if (dest.includes('city') || theme.includes('city') || theme.includes('urban') || theme.includes('cultural')) {
    types.add('city')
  }

  return types
}

/**
 * Determines if a catalog item should be suggested for this trip.
 * Returns a reason string or null if not suggested.
 */
function shouldSuggest(item: CatalogItem, weatherTags: Set<WeatherTag>, tripTypes: Set<string>, durationDays: number): string | null {
  const tags = new Set(item.tags.map((t) => t.toLowerCase()))
  const name = item.name.toLowerCase()
  const category = item.category.toLowerCase()

  // ── Always suggest these ──
  if (category === 'essentials') return 'Essential for any trip'
  if (category === 'documents' && ['passport', 'credit cards', 'cash', 'copies of documents', 'emergency contacts'].some((d) => name.includes(d))) {
    return 'Important travel documents'
  }

  // ── Toiletries: always suggest basics ──
  if (category === 'toiletries') {
    const basics = ['toothbrush', 'toothpaste', 'deodorant', 'medications', 'pain reliever', 'band-aids']
    if (basics.some((b) => name.includes(b))) return 'Toiletry essentials'
  }

  // ── Weather-based clothing ──
  if (category === 'clothing' || category === 'accessories') {
    // Hot/summer
    if (weatherTags.has('hot') || weatherTags.has('summer')) {
      if (tags.has('warm') || tags.has('thermal') || tags.has('fleece') || tags.has('cold') || tags.has('winter')) return null
      if (tags.has('swim') || tags.has('beach')) return `Hot weather in ${weatherTags.has('hot') ? 'your destination' : 'summer'}`
      if (tags.has('shorts') || tags.has('summer')) return 'Light clothing for warm weather'
    }

    // Cold/winter
    if (weatherTags.has('cold') || weatherTags.has('winter') || weatherTags.has('snowy')) {
      if (tags.has('shorts') || tags.has('swim') || tags.has('bathing') || tags.has('beach')) return null
      if (tags.has('warm') || tags.has('thermal') || tags.has('cold') || tags.has('winter') || tags.has('fleece') || tags.has('hat') || tags.has('scarf') || tags.has('gloves')) {
        return 'Warm layers for cold weather'
      }
      if (tags.has('jacket') || tags.has('coat') || tags.has('outerwear')) return 'Warm outerwear needed'
    }

    // Rainy
    if (weatherTags.has('rainy')) {
      if (tags.has('rain') || tags.has('waterproof') || tags.has('umbrella')) {
        return 'Rain expected at your destination'
      }
    }

    // Beach
    if (weatherTags.has('beach') || tripTypes.has('beach')) {
      if (tags.has('swim') || tags.has('beach') || tags.has('sandals') || tags.has('sun') || tags.has('sunscreen')) {
        return 'Beach trip essentials'
      }
    }

    // Outdoor/hiking
    if (tripTypes.has('outdoor')) {
      if (tags.has('hiking') || tags.has('trail') || tags.has('outdoor') || tags.has('trekking')) {
        return 'Great for outdoor activities'
      }
    }
  }

  // ── Electronics ──
  if (category === 'electronics') {
    const always = ['phone charger', 'power adapter', 'portable battery', 'headphones']
    if (always.some((a) => name.includes(a))) return 'Essential electronics'
    // Camera for longer trips or outdoor trips
    if (durationDays >= 5 || tripTypes.has('outdoor')) {
      if (tags.has('camera') || tags.has('photo')) return 'Capture memories on your trip'
    }
  }

  // ── Toiletries: weather-specific ──
  if (category === 'toiletries') {
    if ((weatherTags.has('hot') || weatherTags.has('summer') || weatherTags.has('beach')) && tags.has('sun') && tags.has('spf')) {
      return 'Sun protection needed'
    }
    if ((weatherTags.has('cold') || weatherTags.has('winter')) && tags.has('lip')) {
      return 'Protect from cold/dry air'
    }
    if (tripTypes.has('outdoor') && (tags.has('bug') || tags.has('insect'))) {
      return 'Bug protection for outdoor activities'
    }
    if (tags.has('motion') || tags.has('nausea') || tags.has('travel')) {
      return 'Useful for travel'
    }
  }

  // ── Business trip extras ──
  if (tripTypes.has('business')) {
    if (category === 'clothing' && (tags.has('formal') || tags.has('dress') || tags.has('loafer'))) {
      return 'Business-appropriate attire'
    }
    if (category === 'electronics' && (tags.has('laptop') || tags.has('computer'))) {
      return 'Work essentials'
    }
  }

  // ── Duration-based ──
  if (durationDays >= 5) {
    if (tags.has('laundry') || tags.has('wash')) return 'Useful for longer trips'
    if (category === 'toiletries' && tags.has('hair')) return 'Hair care for extended stay'
  }

  // ── Accessories: always suggest a few ──
  if (category === 'accessories') {
    if (tags.has('sun') && (weatherTags.has('hot') || weatherTags.has('summer'))) {
      return 'Sun protection'
    }
    if (tags.has('water bottle') || tags.has('hydration')) return 'Stay hydrated while traveling'
  }

  return null
}

/**
 * Generate packing suggestions for a trip.
 *
 * @param ctx - Trip context (destination, weather, dates, etc.)
 * @param userId - User ID for the suggestions
 * @returns Array of PackingSuggestion objects
 */
export function generatePackingSuggestions(
  ctx: TripContext,
  userId: string,
): Omit<PackingSuggestion, 'id' | 'created_at'>[] {
  const weatherTags = inferWeatherTags(ctx)
  const tripTypes = inferTripType(ctx)
  const suggestions: Omit<PackingSuggestion, 'id' | 'created_at'>[] = []

  for (const item of PACKING_CATALOG) {
    const reason = shouldSuggest(item, weatherTags, tripTypes, ctx.durationDays)
    if (reason) {
      suggestions.push({
        trip_id: '', // caller fills in
        user_id: userId,
        name: item.name,
        category: item.category,
        reason,
        status: 'pending',
      })
    }
  }

  // Sort by category order, then by name
  const categoryOrder: Record<string, number> = {
    essentials: 0, documents: 1, clothing: 2, toiletries: 3,
    electronics: 4, accessories: 5,
  }
  suggestions.sort((a, b) => {
    const catDiff = (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99)
    if (catDiff !== 0) return catDiff
    return a.name.localeCompare(b.name)
  })

  return suggestions
}
