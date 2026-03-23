import { NextRequest, NextResponse } from 'next/server'

const SERPAPI_BASE = 'https://serpapi.com/search.json'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const placeId = searchParams.get('placeId')
  const name = searchParams.get('name') ?? ''

  if (!placeId) {
    return NextResponse.json({ error: 'placeId required' }, { status: 400 })
  }

  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'SERPAPI_KEY not configured' }, { status: 500 })
  }

  // Try google_maps_photos with the place_id from SerpAPI's google_local results
  const url = new URL(SERPAPI_BASE)
  url.searchParams.set('engine', 'google_maps_photos')
  url.searchParams.set('data_id', placeId)
  url.searchParams.set('api_key', apiKey)

  console.log('[enrich] fetching photos for place_id:', placeId, 'name:', name)

  try {
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[enrich] SerpAPI error:', res.status, body)
      return NextResponse.json({ photos: [] })
    }

    const data = await res.json()
    const photos: Array<{ thumbnail: string; fullsize: string; title?: string }> = []

    for (const photo of data.photos ?? []) {
      const fullsize = photo.image ?? photo.fullsize ?? photo.thumbnail ?? ''
      photos.push({
        thumbnail: photo.thumbnail ?? '',
        fullsize,
        title: photo.title ?? name,
      })
    }

    console.log('[enrich] got', photos.length, 'photos for', name)
    return NextResponse.json({ photos })
  } catch (err) {
    console.error('[enrich] error:', err)
    return NextResponse.json({ photos: [] })
  }
}
