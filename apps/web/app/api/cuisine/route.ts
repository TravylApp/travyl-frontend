import { NextRequest, NextResponse } from 'next/server'
import { getRequiredParams, errorResponse, CACHE_1H } from '@/lib/api-utils'

interface Meal {
  id: string
  name: string
  image: string
}

export async function GET(req: NextRequest) {
  const params = getRequiredParams(req, 'area')
  if (params instanceof NextResponse) return params

  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(params.area)}`,
      CACHE_1H,
    )

    if (!res.ok) return errorResponse('TheMealDB fetch failed', res.status)

    const data = await res.json()
    const meals: Meal[] = (data?.meals ?? []).map(
      (meal: { idMeal: string; strMeal: string; strMealThumb: string }) => ({
        id: meal.idMeal,
        name: meal.strMeal,
        image: meal.strMealThumb,
      }),
    )

    return NextResponse.json(meals)
  } catch {
    return errorResponse('Cuisine service unavailable', 500)
  }
}
