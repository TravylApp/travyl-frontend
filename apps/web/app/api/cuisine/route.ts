import { NextRequest, NextResponse } from 'next/server'
import { getOptionalParam, CACHE_1H } from '@/lib/api-utils'

const SERPAPI_KEY = process.env.SERPAPI_KEY

// ─── TheMealDB: get dish names by nationality ─────────────────────────

interface MealDBDish {
  id: string
  name: string
  image: string
}

async function fetchMealNames(area: string): Promise<MealDBDish[]> {
  const res = await fetch(
    `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(area)}`,
    CACHE_1H,
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data?.meals ?? []).map(
    (meal: { idMeal: string; strMeal: string; strMealThumb: string }) => ({
      id: meal.idMeal,
      name: meal.strMeal,
      image: meal.strMealThumb,
    }),
  )
}

let cachedAreas: string[] | null = null
let cachedAt = 0

async function getAvailableAreas(): Promise<string[]> {
  if (cachedAreas && Date.now() - cachedAt < 24 * 60 * 60 * 1000) return cachedAreas
  try {
    const res = await fetch('https://www.themealdb.com/api/json/v1/1/list.php?a=list')
    if (!res.ok) return cachedAreas ?? []
    const data = await res.json()
    cachedAreas = (data?.meals ?? []).map((m: { strArea: string }) => m.strArea)
    cachedAt = Date.now()
    return cachedAreas!
  } catch {
    return cachedAreas ?? []
  }
}

async function resolveArea(country: string): Promise<string | null> {
  const areas = await getAvailableAreas()
  const lower = country.toLowerCase()
  const exact = areas.find(a => a.toLowerCase() === lower)
  if (exact) return exact

  let bestMatch: string | null = null
  let bestScore = 0
  for (const area of areas) {
    const aLower = area.toLowerCase()
    let score = 0
    for (let i = 0; i < Math.min(lower.length, aLower.length); i++) {
      if (lower[i] === aLower[i]) score++
      else break
    }
    if (score > bestScore && score >= 2) {
      bestScore = score
      bestMatch = area
    }
  }
  if (bestMatch) return bestMatch

  const prefix = lower.slice(0, 3)
  const containsMatch = areas.find(a => a.toLowerCase().startsWith(prefix))
  if (containsMatch) return containsMatch

  return null
}

// ─── SerpAPI: find real restaurants for dishes (1 credit) ──────────────

interface CuisineResult {
  id: string
  name: string        // dish name
  image: string       // real restaurant/food photo
  restaurant?: string // real restaurant name
  rating?: number
  address?: string
  priceLevel?: string
}

async function enrichWithRealRestaurants(
  dishNames: string[],
  city: string,
): Promise<CuisineResult[]> {
  if (!SERPAPI_KEY || !city) return []

  // One SerpAPI call: search for top local food in the city
  const params = new URLSearchParams({
    engine: 'google_maps',
    q: `best traditional local food restaurant ${city}`,
    api_key: SERPAPI_KEY,
    hl: 'en',
    type: 'search',
  })

  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []

    const data = await res.json()
    const results = data.local_results ?? []
    if (!Array.isArray(results) || results.length === 0) return []

    // Map each dish to a real restaurant result
    return dishNames.slice(0, 6).map((dishName, i) => {
      const restaurant = results[i % results.length]
      const photo = restaurant?.thumbnail ??
        (restaurant?.photos ?? restaurant?.images ?? [])[0]?.image ??
        (restaurant?.photos ?? restaurant?.images ?? [])[0]?.thumbnail ?? ''

      return {
        id: `cuisine-${i}`,
        name: dishName,
        image: photo,
        restaurant: restaurant?.title ?? restaurant?.name,
        rating: restaurant?.rating,
        address: restaurant?.address,
        priceLevel: restaurant?.price,
      }
    })
  } catch {
    return []
  }
}

// ─── Route handler ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const area = getOptionalParam(req, 'area', '')
  const country = getOptionalParam(req, 'country', '')
  const city = getOptionalParam(req, 'city', '')

  if (!area && !country) {
    return NextResponse.json({ error: 'Missing area or country param' }, { status: 400 })
  }

  try {
    // Step 1: Get dish names from TheMealDB
    let dishes: MealDBDish[] = []
    if (area) {
      dishes = await fetchMealNames(area)
    } else {
      const resolved = await resolveArea(country)
      if (resolved) dishes = await fetchMealNames(resolved)
    }

    // Step 2: If we have a city + SerpAPI key, enrich with real restaurants
    if (city && SERPAPI_KEY && dishes.length > 0) {
      const enriched = await enrichWithRealRestaurants(
        dishes.slice(0, 6).map(d => d.name),
        city,
      )
      if (enriched.length > 0) {
        // Merge: use real restaurant photo if available, fall back to MealDB
        return NextResponse.json(enriched.map((e, i) => ({
          ...e,
          image: e.image || dishes[i]?.image || '',
        })))
      }
    }

    // Fallback: return TheMealDB data as before
    return NextResponse.json(dishes.slice(0, 6))
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
