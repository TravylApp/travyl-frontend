import { NextRequest, NextResponse } from 'next/server'
import { checkOrigin, rateLimit } from '@/lib/api-utils'
import { upscaleGoogleImage, z } from '@travyl/shared'
import { parseQuery } from '@/lib/zod-helpers'
import { withCache } from '@/lib/searchCache'

const SERPAPI_KEY = process.env.SERPAPI_KEY

// Hotel inventory shifts more slowly than flights — 2h server cache,
// 30 min browser cache. Same trip viewed by collaborator should hit cache.
const HOTEL_TTL_SECONDS = 2 * 60 * 60
const HOTEL_BROWSER_MAX_AGE = 30 * 60

const hotelsQuerySchema = z.object({
  destination: z.string().min(1).max(200),
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  guests: z.string().regex(/^\d+$/).default('2'),
  sort: z.enum(['3', '8']).default('3'),
})

export async function GET(req: NextRequest) {
  const blocked = checkOrigin(req) || rateLimit(req, 'hotels', 10, 60_000)
  if (blocked) return blocked

  const parsed = parseQuery(req, hotelsQuerySchema)
  if (!parsed.ok) return parsed.response
  const { destination, check_in: checkIn = null, check_out: checkOut = null, guests, sort } = parsed.data

  if (!SERPAPI_KEY) {
    return NextResponse.json({ total: 0, hotels: [], error: 'unavailable' }, { status: 503 })
  }

  const cacheKey = `hotels:${destination}:${checkIn ?? ''}:${checkOut ?? ''}:${guests}:${sort}`

  try {
    const { data: payload, cacheHit } = await withCache(
      cacheKey,
      HOTEL_TTL_SECONDS,
      () => fetchAndNormalizeHotels({ destination, checkIn, checkOut, guests, sort }),
      // Don't cache empty/error responses — let the next caller actually retry.
      (v) => !v.error && (v.hotels?.length ?? 0) > 0,
    )

    const out = NextResponse.json(payload)
    out.headers.set('Cache-Control', `private, max-age=${HOTEL_BROWSER_MAX_AGE}`)
    out.headers.set('X-Cache', cacheHit ? 'HIT' : 'MISS')
    return out
  } catch {
    return NextResponse.json({ total: 0, hotels: [] })
  }
}

interface HotelsCachePayload {
  total: number
  hotels: unknown[]
  error?: string
  upstream_status?: number
}

async function fetchAndNormalizeHotels(opts: {
  destination: string
  checkIn: string | null
  checkOut: string | null
  guests: string
  sort: string
}): Promise<HotelsCachePayload> {
  const { destination, checkIn, checkOut, guests, sort } = opts

  const params = new URLSearchParams({
    engine: 'google_hotels',
    q: destination,
    api_key: SERPAPI_KEY!,
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
  const rawText = await res.text()
  let data: any = {}
  try { data = JSON.parse(rawText) } catch {}

  if (!res.ok || data.error) {
    console.error('[hotels/search] SerpAPI error', {
      status: res.status,
      error: data.error || rawText.slice(0, 300),
    })
    return {
      error: data.error || 'Hotel search failed',
      upstream_status: res.status,
      total: 0,
      hotels: [],
    }
  }

  const properties = data.properties ?? []
  if (properties.length === 0) {
    console.warn('[hotels/search] No properties returned', {
      destination, check_in: checkIn, check_out: checkOut,
      keys: Object.keys(data).slice(0, 12),
    })
  }

  const slug = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
  const hotels = properties.slice(0, 40).map((p: any) => {
    // hotel_class comes as "3-star hotel" — extract just the number
    const starClass = typeof p.hotel_class === 'string'
      ? parseInt(p.hotel_class, 10) || 0
      : (p.hotel_class as number) ?? 0

    // SerpAPI exposes property type as p.type (e.g., "Hotel", "Apartment", "Resort")
    const propertyType = typeof p.type === 'string' ? p.type : null

    // Up to 10 images for a richer carousel. Prefer original_image (full
    // resolution from the source CDN) over thumbnail (SerpAPI-hosted, low-res).
    const images: string[] = (p.images ?? [])
      .slice(0, 10)
      .map((img: any) =>
        img.original_image ||
        upscaleGoogleImage(img.thumbnail) ||
        img.thumbnail ||
        ''
      )
      .filter(Boolean)

    // Nearby landmarks with transportation hints — SerpAPI returns an
    // array like [{ name, transportations: [{ type, duration }] }].
    const nearbyPlaces = Array.isArray(p.nearby_places)
      ? p.nearby_places.slice(0, 8).map((np: any) => ({
          name: typeof np.name === 'string' ? np.name : '',
          transportations: Array.isArray(np.transportations)
            ? np.transportations.slice(0, 3).map((t: any) => ({
                type: typeof t.type === 'string' ? t.type : '',
                duration: typeof t.duration === 'string' ? t.duration : '',
              }))
            : [],
        })).filter((np: any) => np.name)
      : []

    return {
      // Content-derived stable ID so the same property keeps the same offer_id across re-searches.
      id: `serp:${slug(p.name)}:${p.gps_coordinates?.latitude ?? 0}:${p.gps_coordinates?.longitude ?? 0}`,
      name: p.name,
      stars: starClass,
      rating: p.overall_rating ?? 0,
      reviews: p.reviews ?? 0,
      // Use extracted_lowest (number) if available
      price: p.rate_per_night?.extracted_lowest ?? null,
      currency: 'USD',
      // Total for the whole stay (taxes/fees included when extracted)
      totalRate: p.total_rate?.extracted_lowest ?? null,
      address: p.location ?? p.address ?? '',
      neighborhood: p.neighborhood ?? '',
      lat: p.gps_coordinates?.latitude ?? 0,
      lng: p.gps_coordinates?.longitude ?? 0,
      images,
      amenities: p.amenities ?? [],
      excludedAmenities: Array.isArray(p.excluded_amenities) ? p.excluded_amenities.slice(0, 8) : [],
      checkIn: p.check_in_time ?? '3:00 PM',
      checkOut: p.check_out_time ?? '11:00 AM',
      description: p.description ?? '',
      link: p.link ?? '',
      source: 'serpapi',
      propertyType,
      ecoCertified: !!p.eco_certified,
      nearbyPlaces,
      deal: typeof p.deal === 'string' ? p.deal : null,
      dealDescription: typeof p.deal_description === 'string' ? p.deal_description : null,
    }
  })

  return {
    total: properties.length,
    hotels,
  }
}
