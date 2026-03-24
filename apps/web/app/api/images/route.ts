import { NextRequest, NextResponse } from 'next/server'

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY
const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  if (!query) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 })
  }

  // 1. Unsplash API — best quality, needs API key
  if (UNSPLASH_ACCESS_KEY) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' landmark city')}&per_page=1&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
      )
      const data = await res.json()
      const photo = data.results?.[0]
      if (photo) {
        return NextResponse.json({
          url: photo.urls.regular,
          thumb: photo.urls.small,
          credit: photo.user.name,
          creditUrl: photo.user.links.html,
        })
      }
    } catch {}
  }

  // 2. Backend places API — Google Places photos (geo-tagged)
  if (API_URL) {
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const geoData = await geoRes.json()
      if (geoData.length > 0) {
        const { lat, lon } = geoData[0]
        const placesRes = await fetch(
          `${API_URL}/api/places/nearby?lat=${lat}&lng=${lon}&category=sightseeing&limit=1`,
          { headers: { Accept: 'application/json' } }
        )
        if (placesRes.ok) {
          const places = await placesRes.json()
          if (places[0]?.photo_url) {
            const url = places[0].photo_url.replace(/=w\d+-h\d+/, '=w1200-h800')
            return NextResponse.json({ url })
          }
        }
      }
    } catch {}
  }

  // 3. Wikipedia — always has location-specific images
  try {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
      { next: { revalidate: 3600 } }
    )
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json()
      const img = wikiData.originalimage?.source || wikiData.thumbnail?.source
      if (img) {
        return NextResponse.json({ url: img })
      }
    }
  } catch {}

  // 4. Last resort — generic travel image
  return NextResponse.json({
    url: `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&fit=crop&q=80`,
  })
}
