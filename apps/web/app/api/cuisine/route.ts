import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const area = req.nextUrl.searchParams.get('area')

  if (!area) {
    return NextResponse.json(
      { error: 'Missing area parameter (e.g. "Japanese", "Italian", "Spanish")' },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(area)}`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: 'TheMealDB fetch failed' },
        { status: res.status }
      )
    }

    const data = await res.json()

    const meals = (data?.meals ?? []).map((meal: any) => ({
      id: meal.idMeal,
      name: meal.strMeal,
      image: meal.strMealThumb,
    }))

    return NextResponse.json(meals)
  } catch {
    return NextResponse.json(
      { error: 'Cuisine service unavailable' },
      { status: 500 }
    )
  }
}
