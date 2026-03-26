import { NextRequest, NextResponse } from 'next/server'

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY
const PEXELS_API_KEY = process.env.PEXELS_API_KEY
const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  const type = req.nextUrl.searchParams.get('type') // 'hero' | 'restaurant' | 'activity' | 'hotel'
  if (!query) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 })
  }

  // For hero/destination images: Unsplash → Pexels → Google Places → Wikipedia
  // For restaurants/activities: Pexels (food/activity context) → Unsplash → Google Places

  const isFood = type === 'restaurant'
  const isActivity = type === 'activity'
  const searchSuffix = isFood ? ' restaurant food' : isActivity ? ' travel activity' : ' landmark city'
  const perPage = Math.min(parseInt(req.nextUrl.searchParams.get('per_page') || '0', 10) || (isFood || isActivity ? 3 : 1), 10)

  // 1. Unsplash API — best for destinations, good for food too
  if (UNSPLASH_ACCESS_KEY) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + searchSuffix)}&per_page=${perPage}&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` }, next: { revalidate: 86400 } }
      )
      const data = await res.json()
      const photos = data.results
      if (photos?.length > 0) {
        return NextResponse.json({
          images: photos.map((p: any) => ({
            url: p.urls.regular,
            thumb: p.urls.small,
            credit: p.user.name,
          })),
          url: photos[0].urls.regular,
          thumb: photos[0].urls.small,
          credit: photos[0].user.name,
          creditUrl: photos[0].user.links?.html,
        })
      }
    } catch {}
  }

  // 2. Pexels API — great for food and activity imagery
  if (PEXELS_API_KEY) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query + searchSuffix)}&per_page=${isFood || isActivity ? 3 : 1}&orientation=landscape`,
        { headers: { Authorization: PEXELS_API_KEY }, next: { revalidate: 86400 } }
      )
      const data = await res.json()
      const photos = data.photos
      if (photos?.length > 0) {
        if (isFood || isActivity) {
          return NextResponse.json({
            images: photos.map((p: any) => ({
              url: p.src.large,
              thumb: p.src.medium,
              credit: p.photographer,
            })),
            url: photos[0].src.large,
          })
        }
        return NextResponse.json({
          url: photos[0].src.large2x || photos[0].src.large,
          thumb: photos[0].src.medium,
          credit: photos[0].photographer,
        })
      }
    } catch {}
  }

  // 3. Backend places API — Google Places photos (geo-tagged, best for real venues)
  if (API_URL && !isFood) {
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

  // 4. Wikipedia — always has location-specific images
  if (!isFood) {
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
  }

  // 5. Last resort — generic travel/food image
  const fallback = isFood
    ? 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&fit=crop&q=80'
  return NextResponse.json({ url: fallback })
}
