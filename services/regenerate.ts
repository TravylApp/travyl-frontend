import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { validateAuth } from './lib/auth'
import { searchPlaces } from './lib/serpapi'
import { safeParseBody } from './lib/validation'
import type { SuggestionCard } from './lib/types'

// ─── Variety modifiers — randomized on each call so regeneration
//     doesn't return the same results every time ───────────────

const VARIETY_MODIFIERS = [
  'popular', 'top rated', 'hidden gems', 'best', 'must see',
  'unique', 'famous', 'off the beaten path', 'highly recommended',
  'trending', 'local favorites', 'award winning', 'instagrammable',
  'historic', 'scenic',
]

function randomModifier(): string {
  return VARIETY_MODIFIERS[Math.floor(Math.random() * VARIETY_MODIFIERS.length)]
}

// ─── Fisher-Yates shuffle — guarantees different results on each
//     regeneration even when SerpAPI returns the same pool ─────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── POST /regenerate/activity ───────────────────────────────

interface RegenerateActivityBody {
  destination: string
  excludeNames: string[]
  category: string
  count?: number
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const parsed = safeParseBody<RegenerateActivityBody>(event)
    if (!parsed.success) return parsed.error

    const { destination, excludeNames = [], category, count = 4 } = parsed.data

    if (!destination) {
      return { statusCode: 400, body: JSON.stringify({ error: 'destination is required' }) }
    }

    // Fetch a broad pool with random query modifier for variety.
    // Retry up to 3 times with different modifiers if we get nothing.
    let pool: SuggestionCard[] = []
    for (let attempt = 0; attempt < 3 && pool.length === 0; attempt++) {
      pool = await searchPlaces(destination, category, {
        limit: Math.max(count, 4) * 3,
        queryModifier: randomModifier(),
      })
    }

    // Shuffle first so every regeneration call returns different results
    const excludeLower = excludeNames.map((n) => n.toLowerCase())
    const filtered = shuffle(pool).filter(
      (place) => !excludeLower.some((ex) => place.name.toLowerCase().includes(ex) || ex.includes(place.name.toLowerCase())),
    )

    const alternatives = filtered.slice(0, count)

    return { statusCode: 200, body: JSON.stringify({ alternatives }) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[regenerate/activity] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}

// ─── POST /regenerate/day ────────────────────────────────────

interface DayActivitySlot {
  id: string
  title: string
  type: string
  startHour: number
  duration: number
}

interface RegenerateDayBody {
  destination: string
  activities: DayActivitySlot[]
}

interface DaySlotAlternatives {
  activityId: string
  startHour: number
  duration: number
  originalType: string
  alternatives: SuggestionCard[]
}

export const dayHandler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const parsed = safeParseBody<RegenerateDayBody>(event)
    if (!parsed.success) return parsed.error

    const { destination, activities = [] } = parsed.data

    if (!destination) {
      return { statusCode: 400, body: JSON.stringify({ error: 'destination is required' }) }
    }

    if (activities.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ slots: [] }) }
    }

    const slots: DaySlotAlternatives[] = await Promise.all(
      activities.map(async (activity) => {
        // Retry up to 3 times with different modifiers if we get nothing.
        // A single bad modifier (e.g. "instagrammable parks") can return zero
        // results — retrying with a different one fills the gap.
        let pool: SuggestionCard[] = []
        for (let attempt = 0; attempt < 3 && pool.length === 0; attempt++) {
          pool = await searchPlaces(destination, activity.type, {
            limit: 8,
            queryModifier: randomModifier(),
          })
        }

        // Shuffle first for variety, then filter duplicates
        const titleLower = activity.title.toLowerCase()
        const filtered = shuffle(pool).filter(
          (place) =>
            !place.name.toLowerCase().includes(titleLower) &&
            !titleLower.includes(place.name.toLowerCase()),
        )

        return {
          activityId: activity.id,
          startHour: activity.startHour,
          duration: activity.duration,
          originalType: activity.type,
          alternatives: filtered.slice(0, 4),
        }
      }),
    )

    return { statusCode: 200, body: JSON.stringify({ slots }) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[regenerate/day] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
