import { NextRequest, NextResponse } from 'next/server'
import { getOptionalParam, CACHE_1H } from '@/lib/api-utils'

interface Meal {
  id: string
  name: string
  image: string
}

async function fetchMeals(area: string): Promise<Meal[]> {
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

// Cache the area list so we don't re-fetch every request
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

/**
 * Match a country name to a TheMealDB area.
 * e.g. "Spain" → "Spanish", "France" → "French", "Japan" → "Japanese"
 */
async function resolveArea(country: string): Promise<string | null> {
  const areas = await getAvailableAreas()
  const lower = country.toLowerCase()

  // Exact match (e.g. "Mexican" passed directly)
  const exact = areas.find(a => a.toLowerCase() === lower)
  if (exact) return exact

  // Score each area by how many leading characters match the country name
  // "France" vs "French" → both start with "Fr" (score 2)
  // "Spain" vs "Spanish" → both start with "Sp" (score 2)
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

  // Fallback: check if first 3 chars of country appear in any area
  const prefix = lower.slice(0, 3)
  const containsMatch = areas.find(a => a.toLowerCase().startsWith(prefix))
  if (containsMatch) return containsMatch

  return null
}

export async function GET(req: NextRequest) {
  const area = getOptionalParam(req, 'area', '')
  const country = getOptionalParam(req, 'country', '')

  if (!area && !country) {
    return NextResponse.json({ error: 'Missing area or country param' }, { status: 400 })
  }

  try {
    if (area) {
      return NextResponse.json(await fetchMeals(area))
    }

    // Resolve country name to TheMealDB area
    const resolved = await resolveArea(country)
    if (!resolved) return NextResponse.json([])

    return NextResponse.json(await fetchMeals(resolved))
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
