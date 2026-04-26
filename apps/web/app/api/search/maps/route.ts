import { NextRequest, NextResponse } from 'next/server'
import { getOptionalParam, CACHE_1H } from '@/lib/api-utils'

const SERPAPI_KEY = process.env.SERPAPI_KEY || ''

/** Google Maps local search via SerpAPI. */
export async function GET(req: NextRequest) {
  const query = getOptionalParam(req, 'q', '')
  if (!query) return NextResponse.json([])

  if (!SERPAPI_KEY) {
    return NextResponse.json({ error: 'SerpAPI key not configured' }, { status: 503 })
  }

  try {
    const url = new URL('https://serpapi.com/search.json')
    url.searchParams.set('engine', 'google_maps')
    url.searchParams.set('q', query)
    url.searchParams.set('api_key', SERPAPI_KEY)

    const res = await fetch(url.toString(), CACHE_1H)
    if (!res.ok) return NextResponse.json([])

    const data = await res.json()
    const results: any[] = []

    // Collect all results first
    if (data.place_results) {
      results.push(mapPlace(data.place_results, 0))
    }
    if (data.local_results) {
      for (const [i, p] of data.local_results.entries()) {
        results.push(mapPlace(p, i + 1))
      }
    }

    // Fetch hi-res images for all results in parallel via Google Images
    const imageFetches = results.map(async (mapped) => {
      try {
        const imgUrl = new URL('https://serpapi.com/search.json')
        imgUrl.searchParams.set('engine', 'google_images')
        imgUrl.searchParams.set('q', `${mapped.name} ${mapped.address}`)
        imgUrl.searchParams.set('num', '5')
        imgUrl.searchParams.set('api_key', SERPAPI_KEY)
        const imgRes = await fetch(imgUrl.toString(), CACHE_1H)
        if (!imgRes.ok) return
        const imgData = await imgRes.json()
        const imgs = (imgData.images_results ?? [])
          .filter((r: any) => r.original && !r.original.includes('encrypted-tbn'))
          .slice(0, 5)
        if (imgs.length > 0) {
          mapped.image = imgs[0].original
          mapped.images = imgs.map((r: any) => r.original)
        }
      } catch {}
    })
    await Promise.allSettled(imageFetches)

    return NextResponse.json(results.slice(0, 20))
  } catch (err) {
    return NextResponse.json([])
  }
}

function mapPlace(p: any, idx: number) {
  // Extract hours as a string
  let hoursStr = ''
  if (Array.isArray(p.hours)) {
    const today = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()]
    const todayEntry = p.hours.find((h: any) => h[today])
    hoursStr = todayEntry ? `Today: ${todayEntry[today]}` : ''
  } else if (typeof p.hours === 'string') {
    hoursStr = p.hours
  }

  // Use SerpAPI-hosted thumbnail (Google Maps gps-cs-s URLs are CORS-blocked)
  const image = p.serpapi_thumbnail || p.thumbnail || (p.images?.[0]?.image) || ''

  // Type → PlaceItem type mapping (handles both string and array formats)
  const types = Array.isArray(p.types) ? p.types : Array.isArray(p.type) ? p.type : typeof p.type === 'string' ? [p.type] : []
  const typeLower = types.join(' ').toLowerCase()
  let placeType = 'attraction'
  if (/restaurant|food|dining|cafe|coffee|donut|bakery|pizza|sushi|taco|burger|japanese|italian|mexican|chinese|thai|indian|french|korean|vietnamese|mediterranean|seafood|steak|bbq|ramen|deli/i.test(typeLower)) placeType = 'restaurant'
  else if (/bar|pub|nightlife|club|lounge|brewery|cocktail|wine/i.test(typeLower)) placeType = 'experience'
  else if (/hotel|hostel|resort|motel|inn|lodge/i.test(typeLower)) placeType = 'hotel'

  return {
    id: `gmap_${idx}_${(p.place_id || '').slice(0, 12)}`,
    name: p.title || '',
    image,
    images: (p.images || []).slice(0, 5).map((img: any) => img.image).filter(Boolean),
    type: placeType,
    rating: p.rating || 0,
    reviewCount: p.reviews || 0,
    tagline: types.slice(0, 2).join(' · ') || '',
    category: types[0] || '',
    description: p.description || p.snippet || '',
    tags: types.slice(0, 3),
    latitude: p.gps_coordinates?.latitude || null,
    longitude: p.gps_coordinates?.longitude || null,
    address: p.address || '',
    phone: p.phone || '',
    website: p.website || '',
    hours: hoursStr,
    priceLevel: p.price ? Math.min(p.price.replace(/[^$]/g, '').length || 1, 4) : null,
  }
}
