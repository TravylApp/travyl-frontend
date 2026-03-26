import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GRAPHHOPPER_API_KEY

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from') // "lat,lng"
  const to = req.nextUrl.searchParams.get('to')     // "lat,lng"
  const mode = req.nextUrl.searchParams.get('mode') ?? 'car' // car, foot, bike

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from/to parameters (lat,lng)' }, { status: 400 })
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'Directions API not configured' }, { status: 500 })
  }

  try {
    const vehicle = mode === 'walk' || mode === 'foot' ? 'foot' : mode === 'bike' ? 'bike' : 'car'

    const res = await fetch(
      `https://graphhopper.com/api/1/route?point=${from}&point=${to}&vehicle=${vehicle}&locale=en&calc_points=true&points_encoded=false&key=${API_KEY}`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Directions fetch failed' }, { status: res.status })
    }

    const data = await res.json()
    const path = data.paths?.[0]

    if (!path) {
      return NextResponse.json({ error: 'No route found' }, { status: 404 })
    }

    return NextResponse.json({
      distance: Math.round(path.distance), // meters
      duration: Math.round(path.time / 1000), // seconds
      durationText: formatDuration(path.time),
      distanceText: formatDistance(path.distance),
      points: path.points?.coordinates?.map((c: number[]) => [c[1], c[0]]) ?? [], // [lat, lng] pairs
      instructions: (path.instructions ?? []).map((i: any) => ({
        text: i.text,
        distance: Math.round(i.distance),
        time: Math.round(i.time / 1000),
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Directions service unavailable' }, { status: 500 })
  }
}

function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins} min`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}
