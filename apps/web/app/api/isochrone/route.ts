import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GRAPHHOPPER_API_KEY

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')
  const minutesParam = req.nextUrl.searchParams.get('minutes') ?? '15'
  const modeParam = req.nextUrl.searchParams.get('mode') ?? 'foot'

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng parameters' }, { status: 400 })
  }

  const minutes = Math.max(1, Math.min(120, Number(minutesParam) || 15))
  const vehicle = modeParam === 'car' ? 'car' : modeParam === 'bike' ? 'bike' : 'foot'
  const timeLimit = minutes * 60 // convert to seconds

  if (!API_KEY) {
    return NextResponse.json({ error: 'Isochrone API not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://graphhopper.com/api/1/isochrone?point=${lat},${lng}&time_limit=${timeLimit}&vehicle=${vehicle}&key=${API_KEY}`,
      { next: { revalidate: 86400 } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Isochrone fetch failed' }, { status: res.status })
    }

    const data = await res.json()
    const polygon = data.polygons?.[0]

    if (!polygon) {
      return NextResponse.json({ error: 'No isochrone polygon returned' }, { status: 404 })
    }

    return NextResponse.json({
      polygon: polygon.geometry?.coordinates ?? [],
      center: { lat: Number(lat), lng: Number(lng) },
      minutes,
      mode: vehicle,
    })
  } catch {
    return NextResponse.json({ error: 'Isochrone service unavailable' }, { status: 500 })
  }
}
