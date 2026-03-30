import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'
import { upscaleGoogleImage } from '@travyl/shared'

const SERPAPI_KEY = process.env.SERPAPI_KEY

export async function GET(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'hotels', 10, 60_000)
  if (blocked) return blocked

  const destination = req.nextUrl.searchParams.get('destination') // "Tokyo, Japan"
  const checkIn = req.nextUrl.searchParams.get('check_in')       // YYYY-MM-DD
  const checkOut = req.nextUrl.searchParams.get('check_out')      // YYYY-MM-DD
  const guests = req.nextUrl.searchParams.get('guests') ?? '2'
  const sort = req.nextUrl.searchParams.get('sort') ?? '3'       // 3 = lowest price

  if (!destination) {
    return NextResponse.json({ error: 'Missing destination' }, { status: 400 })
  }

  if (!SERPAPI_KEY) {
    return NextResponse.json({ total: 0, hotels: [] })
  }

  try {
    const params = new URLSearchParams({
      engine: 'google_hotels',
      q: destination,
      api_key: SERPAPI_KEY,
      adults: guests,
      sort_by: sort,
      gl: 'us',
      hl: 'en',
      currency: 'USD',
    })

    if (checkIn) params.set('check_in_date', checkIn)
    if (checkOut) params.set('check_out_date', checkOut)

    const res = await fetch(`https://serpapi.com/search.json?${params}`, {
      headers: { Accept: 'application/json' },
    })

    if (!res.ok) {
      return NextResponse.json({ total: 0, hotels: [] })
    }

    const data = await res.json()
    const properties = data.properties ?? []

    const hotels = properties.slice(0, 20).map((p: any, i: number) => ({
      id: `serp-hotel-${i}`,
      name: p.name,
      stars: p.hotel_class ?? 0,
      rating: p.overall_rating ?? 0,
      reviews: p.reviews ?? 0,
      price: p.rate_per_night?.lowest ? parseFloat(p.rate_per_night.lowest.replace(/[^0-9.]/g, '')) : null,
      currency: 'USD',
      address: p.location ?? '',
      neighborhood: p.neighborhood ?? '',
      lat: p.gps_coordinates?.latitude ?? 0,
      lng: p.gps_coordinates?.longitude ?? 0,
      images: [
        upscaleGoogleImage(p.images?.[0]?.thumbnail) ?? p.images?.[0]?.thumbnail ?? upscaleGoogleImage(p.images?.[0]?.original_image) ?? p.images?.[0]?.original_image ?? '',
        ...(p.images?.slice(1, 4).map((img: any) => upscaleGoogleImage(img.thumbnail) ?? img.thumbnail ?? upscaleGoogleImage(img.original_image) ?? img.original_image ?? '') ?? []),
      ].filter(Boolean),
      amenities: p.amenities ?? [],
      checkIn: p.check_in_time ?? '3:00 PM',
      checkOut: p.check_out_time ?? '11:00 AM',
      description: p.description ?? '',
      link: p.link ?? '',
      source: 'serpapi',
    }))

    return NextResponse.json({
      total: properties.length,
      hotels,
    })
  } catch {
    return NextResponse.json({ total: 0, hotels: [] })
  }
}
