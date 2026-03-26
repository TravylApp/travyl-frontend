import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.VISUAL_CROSSING_API_KEY

export async function GET(req: NextRequest) {
  const location = req.nextUrl.searchParams.get('location')
  const days = req.nextUrl.searchParams.get('days') ?? '7'

  if (!location) {
    return NextResponse.json({ error: 'Missing location parameter' }, { status: 400 })
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'Weather API not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}/next${days}days?unitGroup=metric&key=${API_KEY}&contentType=json&include=days,current`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Weather fetch failed' }, { status: res.status })
    }

    const data = await res.json()

    // Map to a clean format
    const current = data.currentConditions ? {
      temp: Math.round(data.currentConditions.temp),
      feelslike: Math.round(data.currentConditions.feelslike),
      conditions: data.currentConditions.conditions,
      icon: data.currentConditions.icon,
      humidity: data.currentConditions.humidity,
      windspeed: Math.round(data.currentConditions.windspeed),
    } : null

    const forecast = (data.days ?? []).slice(0, parseInt(days)).map((day: any) => ({
      date: day.datetime,
      high: Math.round(day.tempmax),
      low: Math.round(day.tempmin),
      conditions: day.conditions,
      icon: day.icon,
      description: day.description,
      precipprob: day.precipprob,
      sunrise: day.sunrise,
      sunset: day.sunset,
    }))

    return NextResponse.json({
      location: data.resolvedAddress,
      timezone: data.timezone,
      current,
      forecast,
    })
  } catch {
    return NextResponse.json({ error: 'Weather service unavailable' }, { status: 500 })
  }
}
