import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.TRIPADVISOR_API_KEY
const BASE = 'https://api.content.tripadvisor.com/api/v1'

interface TALocation {
  location_id: string
  name: string
  address_obj?: { street1?: string; city?: string; country?: string; address_string?: string }
  latitude?: string
  longitude?: string
  cuisine?: { name: string }[]
  price_level?: string
  rating?: string
  num_reviews?: string
  phone?: string
  website?: string
  web_url?: string
  photo?: { images?: { large?: { url: string }; medium?: { url: string } } }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')
  const category = req.nextUrl.searchParams.get('category') || 'restaurants'
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '8')

  if (!API_KEY) {
    return NextResponse.json({ error: 'TripAdvisor not configured' }, { status: 500 })
  }

  if (!query && !lat) {
    return NextResponse.json({ error: 'Missing q or lat/lng' }, { status: 400 })
  }

  try {
    // Step 1: Search for locations
    const searchParams = new URLSearchParams({
      key: API_KEY,
      language: 'en',
      category,
    })
    if (query) searchParams.set('searchQuery', query)
    if (lat && lng) {
      searchParams.set('latLong', `${lat},${lng}`)
      searchParams.set('radius', '10')
      searchParams.set('radiusUnit', 'km')
    }

    const searchRes = await fetch(`${BASE}/location/search?${searchParams}`, {
      next: { revalidate: 86400 },
    })
    if (!searchRes.ok) {
      return NextResponse.json({ error: 'TripAdvisor search failed' }, { status: searchRes.status })
    }

    const searchData = await searchRes.json()
    const locations: TALocation[] = (searchData.data ?? []).slice(0, limit)

    if (locations.length === 0) {
      return NextResponse.json([])
    }

    // Step 2: Fetch details + photos for each location in parallel
    const results = await Promise.all(
      locations.map(async (loc) => {
        const id = loc.location_id

        // Fetch details and photos in parallel
        const [detailRes, photoRes] = await Promise.all([
          fetch(`${BASE}/location/${id}/details?key=${API_KEY}&language=en&currency=USD`, {
            next: { revalidate: 86400 },
          }).catch(() => null),
          fetch(`${BASE}/location/${id}/photos?key=${API_KEY}&language=en&limit=3`, {
            next: { revalidate: 86400 },
          }).catch(() => null),
        ])

        let details: any = loc
        if (detailRes?.ok) {
          details = await detailRes.json()
        }

        let photos: string[] = []
        if (photoRes?.ok) {
          const photoData = await photoRes.json()
          photos = (photoData.data ?? [])
            .map((p: any) => p.images?.large?.url || p.images?.medium?.url)
            .filter(Boolean)
        }

        const cuisines = (details.cuisine ?? []).map((c: any) => c.name || c.localized_name).filter(Boolean)
        const mainPhoto = photos[0] || details.photo?.images?.large?.url || details.photo?.images?.medium?.url

        return {
          id,
          name: details.name || loc.name,
          lat: parseFloat(details.latitude || loc.latitude || '0'),
          lng: parseFloat(details.longitude || loc.longitude || '0'),
          address: details.address_obj?.address_string || details.address_obj?.street1 || '',
          category: cuisines[0] || category,
          cuisines,
          rating: parseFloat(details.rating || '0'),
          reviewCount: parseInt(details.num_reviews || '0'),
          priceLevel: details.price_level || '',
          phone: details.phone || '',
          website: details.website || '',
          tripAdvisorUrl: details.web_url || '',
          image: mainPhoto || null,
          images: photos,
          tip: details.ranking_data?.ranking_string || '',
          source: 'tripadvisor',
        }
      })
    )

    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: 'TripAdvisor service unavailable' }, { status: 500 })
  }
}
