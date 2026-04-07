import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { validateAuth } from './lib/auth'
import { getCachedGaps, setCachedGaps, type GapSuggestion } from './lib/cache'
import { searchPlaces } from './lib/serpapi'
import { computeGaps } from '@travyl/shared'

interface FillGapsRequestBody {
  tripId: string
  date: string
  destination: string
  activities: Array<{
    id: string
    title: string
    type: string
    startHour: number
    duration: number
    latitude?: number
    longitude?: number
  }>
}

// Activity types to cycle through for variety
const CATEGORY_ROTATION = [
  'sightseeing', 'dining', 'cultural', 'outdoor', 'shopping', 'tour',
] as const

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    console.log('[fill-gaps] userId:', userId)

    const body = JSON.parse(event.body ?? '{}') as FillGapsRequestBody
    const { tripId, date, destination, activities = [] } = body

    if (!tripId || !date || !destination) {
      return { statusCode: 400, body: JSON.stringify({ error: 'tripId, date, and destination required' }) }
    }

    // Check cache
    const cached = await getCachedGaps(tripId, date)
    if (cached) {
      console.log('[fill-gaps] cache hit, returning', cached.length, 'suggestions')
      return { statusCode: 200, body: JSON.stringify({ suggestions: cached }) }
    }

    // Compute free time slots
    const gaps = computeGaps(
      activities.map((a) => ({ startHour: a.startHour, duration: a.duration })),
    )
    console.log('[fill-gaps] computed', gaps.length, 'gaps for', destination)

    if (gaps.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ suggestions: [] }) }
    }

    // Collect already-scheduled types to avoid repeating
    const scheduledTypes = new Set(activities.map((a) => a.type.toLowerCase()))

    // Pick a category for each gap, prioritising types not yet scheduled
    const suggestions: GapSuggestion[] = []

    for (const gap of gaps.slice(0, 3)) {
      const unusedCategory = CATEGORY_ROTATION.find((c) => !scheduledTypes.has(c))
      const category = unusedCategory ?? 'sightseeing'

      const places = await searchPlaces(destination, category, { limit: 5 })
      if (places.length === 0) continue

      // Deduplicate against already-scheduled activity titles (case-insensitive)
      const scheduledTitles = activities.map((a) => a.title.toLowerCase())
      const place = places.find(
        (p) => !scheduledTitles.some((t) => t.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(t)),
      ) ?? places[0]

      // Clamp duration to fit the gap, max 2.5h
      const duration = Math.min(gap.durationHours, 2.5)

      suggestions.push({
        title: place.name,
        type: category,
        startHour: gap.startHour,
        duration,
        latitude: place.latitude || undefined,
        longitude: place.longitude || undefined,
        address: place.location || undefined,
        rating: place.rating ?? undefined,
        price: place.price ?? null,
        image: place.imageUrl || undefined,
        description: place.description || undefined,
      })

      scheduledTypes.add(category)
    }

    console.log('[fill-gaps] returning', suggestions.length, 'suggestions')

    if (suggestions.length > 0) {
      await setCachedGaps(tripId, date, suggestions)
    }

    return { statusCode: 200, body: JSON.stringify({ suggestions }) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[fill-gaps] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
