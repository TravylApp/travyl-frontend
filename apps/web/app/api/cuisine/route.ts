import { NextRequest, NextResponse } from 'next/server'
import { getOptionalParam, CACHE_1H } from '@/lib/api-utils'

interface Meal {
  id: string
  name: string
  image: string
}

// TheMealDB uses cuisine style names (French, Italian, etc.)
// First try the country name directly — TheMealDB accepts many as-is (e.g. "Japanese", "Mexican")
// If that fails, try common demonym form
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

export async function GET(req: NextRequest) {
  // Accept either ?area=French or ?country=France
  const area = getOptionalParam(req, 'area', '')
  const country = getOptionalParam(req, 'country', '')

  if (!area && !country) {
    return NextResponse.json({ error: 'Missing area or country param' }, { status: 400 })
  }

  try {
    // If area is provided directly, use it
    if (area) {
      const meals = await fetchMeals(area)
      return NextResponse.json(meals)
    }

    // Try the country name as-is first (works for "Japanese", "Mexican", "Indian", etc.)
    let meals = await fetchMeals(country)

    // If no results, try common transformations:
    // "France" → "French", "Spain" → "Spanish", "Italy" → "Italian"
    if (meals.length === 0) {
      // Try adding common suffixes — TheMealDB demonym patterns
      const suffixes = ['n', 'ese', 'ish', 'ian', 'ch']
      for (const suffix of suffixes) {
        const attempt = country.replace(/[aeiou]?$/, '') + suffix
        meals = await fetchMeals(attempt)
        if (meals.length > 0) break
      }
    }

    return NextResponse.json(meals)
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
