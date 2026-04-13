import { NextRequest, NextResponse } from 'next/server'
import { getOptionalParam, CACHE_1H } from '@/lib/api-utils'
import { upscaleGoogleImage } from '@travyl/shared'

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

// ─── SerpAPI: find real restaurants (1 credit) ─────────────────────────

interface CuisineResult {
  id: string
  name: string
  image: string
  restaurant?: string
  rating?: number
  address?: string
  priceLevel?: string
}

async function fetchLocalRestaurants(city: string): Promise<any[]> {
  if (!SERPAPI_KEY || !city) return []

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
    return data.local_results ?? []
  } catch {
    return []
  }
}

function mapRestaurant(restaurant: any, i: number, dishName?: string): CuisineResult {
  const rawPhoto = restaurant?.thumbnail ?? ''
  const photo = upscaleGoogleImage(rawPhoto) || rawPhoto

  return {
    id: `cuisine-${i}`,
    name: dishName || restaurant?.title || restaurant?.name || 'Local Dish',
    image: photo,
    restaurant: restaurant?.title ?? restaurant?.name,
    rating: restaurant?.rating,
    address: restaurant?.address,
    priceLevel: restaurant?.price,
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

    // Step 2: Fetch real restaurants from Google Maps
    const restaurants = city ? await fetchLocalRestaurants(city) : []

    // Step 3: Merge — dish names from TheMealDB + restaurant data from Google Maps
    if (restaurants.length > 0) {
      if (dishes.length > 0) {
        // Have both: use dish names + TheMealDB food photos + restaurant info
        return NextResponse.json(dishes.slice(0, 6).map((dish, i) => {
          const r = restaurants[i % restaurants.length]
          const mapped = mapRestaurant(r, i, dish.name)
          return { ...mapped, image: dish.image || mapped.image }
        }))
      }
      // No TheMealDB data: use restaurants directly as "must-try" spots
      return NextResponse.json(restaurants.slice(0, 6).map((r: any, i: number) => {
        const mapped = mapRestaurant(r, i)
        mapped.name = r.description?.split('·')[0]?.trim() || r.title || 'Local Spot'
        return mapped
      }))
    }

    // Fallback: TheMealDB only
    if (dishes.length > 0) {
      return NextResponse.json(dishes.slice(0, 6))
    }

    return NextResponse.json([])
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
