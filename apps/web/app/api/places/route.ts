import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

// Instant lookup for popular destinations — avoids Nominatim rate limits
const KNOWN_CITIES: Record<string, { lat: string; lng: string }> = {
  'paris': { lat: '48.8566', lng: '2.3522' },
  'london': { lat: '51.5074', lng: '-0.1278' },
  'rome': { lat: '41.9028', lng: '12.4964' },
  'barcelona': { lat: '41.3874', lng: '2.1686' },
  'amsterdam': { lat: '52.3676', lng: '4.9041' },
  'prague': { lat: '50.0755', lng: '14.4378' },
  'lisbon': { lat: '38.7223', lng: '-9.1393' },
  'istanbul': { lat: '41.0082', lng: '28.9784' },
  'vienna': { lat: '48.2082', lng: '16.3738' },
  'berlin': { lat: '52.5200', lng: '13.4050' },
  'athens': { lat: '37.9838', lng: '23.7275' },
  'budapest': { lat: '47.4979', lng: '19.0402' },
  'dublin': { lat: '53.3498', lng: '-6.2603' },
  'edinburgh': { lat: '55.9533', lng: '-3.1883' },
  'florence': { lat: '43.7696', lng: '11.2558' },
  'santorini': { lat: '36.3932', lng: '25.4615' },
  'dubrovnik': { lat: '42.6507', lng: '18.0944' },
  'copenhagen': { lat: '55.6761', lng: '12.5683' },
  'stockholm': { lat: '59.3293', lng: '18.0686' },
  'reykjavik': { lat: '64.1466', lng: '-21.9426' },
  'tokyo': { lat: '35.6762', lng: '139.6503' },
  'bangkok': { lat: '13.7563', lng: '100.5018' },
  'bali': { lat: '-8.4095', lng: '115.1889' },
  'singapore': { lat: '1.3521', lng: '103.8198' },
  'seoul': { lat: '37.5665', lng: '126.9780' },
  'kyoto': { lat: '35.0116', lng: '135.7681' },
  'hong kong': { lat: '22.3193', lng: '114.1694' },
  'hanoi': { lat: '21.0278', lng: '105.8342' },
  'dubai': { lat: '25.2048', lng: '55.2708' },
  'jaipur': { lat: '26.9124', lng: '75.7873' },
  'kuala lumpur': { lat: '3.1390', lng: '101.6869' },
  'taipei': { lat: '25.0330', lng: '121.5654' },
  'new york': { lat: '40.7128', lng: '-74.0060' },
  'nyc': { lat: '40.7128', lng: '-74.0060' },
  'rio de janeiro': { lat: '-22.9068', lng: '-43.1729' },
  'rio': { lat: '-22.9068', lng: '-43.1729' },
  'mexico city': { lat: '19.4326', lng: '-99.1332' },
  'buenos aires': { lat: '-34.6037', lng: '-58.3816' },
  'havana': { lat: '23.1136', lng: '-82.3666' },
  'san francisco': { lat: '37.7749', lng: '-122.4194' },
  'los angeles': { lat: '34.0522', lng: '-118.2437' },
  'la': { lat: '34.0522', lng: '-118.2437' },
  'miami': { lat: '25.7617', lng: '-80.1918' },
  'cape town': { lat: '-33.9249', lng: '18.4241' },
  'marrakech': { lat: '31.6295', lng: '-7.9811' },
  'cairo': { lat: '30.0444', lng: '31.2357' },
  'sydney': { lat: '-33.8688', lng: '151.2093' },
  'melbourne': { lat: '-37.8136', lng: '144.9631' },
  'queenstown': { lat: '-45.0312', lng: '168.6626' },
  'auckland': { lat: '-36.8485', lng: '174.7633' },
  'nairobi': { lat: '-1.2921', lng: '36.8219' },
  'zanzibar': { lat: '-6.1659', lng: '39.1989' },
  'cartagena': { lat: '10.3910', lng: '-75.5364' },
  'cusco': { lat: '-13.5319', lng: '-71.9675' },
  'nashville': { lat: '36.1627', lng: '-86.7816' },
  'tulum': { lat: '20.2114', lng: '-87.4654' },
  'chicago': { lat: '41.8781', lng: '-87.6298' },
  'seattle': { lat: '47.6062', lng: '-122.3321' },
  'portland': { lat: '45.5152', lng: '-122.6784' },
  'denver': { lat: '39.7392', lng: '-104.9903' },
  'boston': { lat: '42.3601', lng: '-71.0589' },
  'washington dc': { lat: '38.9072', lng: '-77.0369' },
  'dc': { lat: '38.9072', lng: '-77.0369' },
  'toronto': { lat: '43.6532', lng: '-79.3832' },
  'vancouver': { lat: '49.2827', lng: '-123.1207' },
  'cancun': { lat: '21.1619', lng: '-86.8515' },
  'honolulu': { lat: '21.3069', lng: '-157.8583' },
  'hawaii': { lat: '21.3069', lng: '-157.8583' },
  'las vegas': { lat: '36.1699', lng: '-115.1398' },
  'vegas': { lat: '36.1699', lng: '-115.1398' },
  'osaka': { lat: '34.6937', lng: '135.5023' },
  'mumbai': { lat: '19.0760', lng: '72.8777' },
  'delhi': { lat: '28.7041', lng: '77.1025' },
  'new delhi': { lat: '28.7041', lng: '77.1025' },
  'beijing': { lat: '39.9042', lng: '116.4074' },
  'shanghai': { lat: '31.2304', lng: '121.4737' },
  'moscow': { lat: '55.7558', lng: '37.6173' },
  'madrid': { lat: '40.4168', lng: '-3.7038' },
  'milan': { lat: '45.4642', lng: '9.1900' },
  'munich': { lat: '48.1351', lng: '11.5820' },
  'zurich': { lat: '47.3769', lng: '8.5417' },
  'geneva': { lat: '46.2044', lng: '6.1432' },
  'nice': { lat: '43.7102', lng: '7.2620' },
  'venice': { lat: '45.4408', lng: '12.3155' },
  'seville': { lat: '37.3891', lng: '-5.9845' },
  'porto': { lat: '41.1579', lng: '-8.6291' },
  'bruges': { lat: '51.2093', lng: '3.2247' },
  'oslo': { lat: '59.9139', lng: '10.7522' },
  'helsinki': { lat: '60.1699', lng: '24.9384' },
  'phuket': { lat: '7.8804', lng: '98.3923' },
  'maldives': { lat: '3.2028', lng: '73.2207' },
  'petra': { lat: '30.3285', lng: '35.4444' },
}

interface BackendPlace {
  id: string
  name: string
  lat: number
  lng: number
  category: string
  subcategory?: string
  rating: number
  review_count?: number
  price_level?: string | number | null
  description?: string | null
  photo_url?: string | null
  website?: string | null
  address?: string | null
  opening_hours?: Record<string, string>
  visit_duration_min?: number | null
  cuisine?: string | null
  tags?: string[]
}

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat') ?? ''
  const lng = req.nextUrl.searchParams.get('lng') ?? ''
  const category = req.nextUrl.searchParams.get('category') ?? 'sightseeing'
  const limit = req.nextUrl.searchParams.get('limit') ?? '20'
  const q = req.nextUrl.searchParams.get('q')

  if (!API_URL) {
    return NextResponse.json([])
  }

  try {
    let searchLat = lat
    let searchLng = lng

    // Natural language search — use SerpAPI google_local directly
    const SERPAPI_KEY = process.env.SERPAPI_KEY
    if (q && SERPAPI_KEY) {
      // Try SerpAPI local search first (handles "best tacos in Oaxaca" etc.)
      const serpQuery = category === 'sightseeing' ? q : `${category} ${q}`
      const serpParams = new URLSearchParams({
        engine: 'google_local',
        q: serpQuery,
        api_key: SERPAPI_KEY,
      })
      // If it looks like a city name (short, no spaces beyond one), also check known cities
      const knownCity = KNOWN_CITIES[q.toLowerCase()]
      if (knownCity) {
        serpParams.set('ll', `@${knownCity.lat},${knownCity.lng},14z`)
      }

      try {
        const serpRes = await fetch(`https://serpapi.com/search.json?${serpParams}`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
          next: { revalidate: 3600 } as any,
        })
        if (serpRes.ok) {
          const serpData = await serpRes.json()
          const localResults = serpData.local_results ?? []
          if (localResults.length > 0) {
            const sliced = localResults.slice(0, parseInt(limit))

            // Fetch high-res images for top 5 results only (balance speed vs quality)
            const imageResults = await Promise.all(
              sliced.slice(0, 5).map(async (place: any) => {
                try {
                  const imgRes = await fetch(
                    `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(place.title + ' ' + (place.address?.split(',')[0] || ''))}&num=4&api_key=${SERPAPI_KEY}`,
                    { signal: AbortSignal.timeout(4000) }
                  )
                  if (!imgRes.ok) return []
                  const imgData = await imgRes.json()
                  return (imgData.images_results ?? [])
                    .slice(0, 4)
                    .map((img: any) => img.original ?? '')
                    .filter((u: string) => !!u && !u.includes('encrypted-tbn'))
                } catch { return [] }
              })
            )

            const places = sliced.map((place: any, idx: number) => {
              const extraImages = imageResults[idx] ?? []
              const mainImage = extraImages[0] || upscaleGoogleImage(place.thumbnail) || getFallbackImage(place.title, idx)
              return {
                id: `serp_${place.place_id ?? idx}`,
                name: place.title,
                image: mainImage,
                images: extraImages.length > 1 ? extraImages : undefined,
                type: mapType(place.type, category),
                rating: place.rating ?? 0,
                tagline: place.description?.split('.')[0] ?? place.type ?? category,
                category: mapCategory(place.type, undefined),
                description: place.description ?? '',
                latitude: place.gps_coordinates?.latitude ?? 0,
                longitude: place.gps_coordinates?.longitude ?? 0,
                reviewCount: place.reviews,
                address: place.address,
                website: place.website,
                hours: place.hours ? (typeof place.hours === 'string' ? place.hours : place.hours[0]) : undefined,
                tags: mapTags(place.type, [], undefined),
              }
            })

            const res_out = NextResponse.json(places)
            res_out.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
            return res_out
          }
        }
      } catch (serpErr) {
        console.warn('[places] SerpAPI local search failed, falling back to backend:', serpErr)
      }
    }

    // Fallback: geocode + backend nearby search
    if (q) {
      const knownCity = KNOWN_CITIES[q.toLowerCase()]
      if (knownCity) {
        searchLat = knownCity.lat
        searchLng = knownCity.lng
      } else {
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
            {
              headers: { 'Accept-Language': 'en', 'User-Agent': 'Travyl/1.0' },
              signal: AbortSignal.timeout(5000),
            }
          )
          const geoData = await geoRes.json()
          if (geoData.length > 0) {
            searchLat = geoData[0].lat
            searchLng = geoData[0].lon
          }
        } catch {}
      }
    }

    const res = await fetch(
      `${API_URL}/api/places/nearby?lat=${searchLat}&lng=${searchLng}&category=${category}&limit=${limit}`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return NextResponse.json([])

    const data: BackendPlace[] = await res.json()

    // Map to PlaceItem format (categories must match PLACE_COLLECTIONS in shared)
    const requestedCat = category
    const places = data.map((p, idx) => ({
      id: p.id,
      name: p.name,
      image: upscaleGoogleImage(p.photo_url) ?? getFallbackImage(p.name, idx),
      type: mapType(p.category, requestedCat),
      rating: p.rating ?? 0,
      tagline: p.description?.split('.')[0] ?? p.category,
      category: mapCategory(p.category, p.subcategory),
      description: p.description ?? '',
      latitude: p.lat,
      longitude: p.lng,
      reviewCount: p.review_count,
      address: p.address,
      website: p.website,
      priceLevel: mapPrice(p.price_level),
      hours: formatHours(p.opening_hours),
      duration: formatDuration(p.visit_duration_min),
      tags: mapTags(p.category, p.tags, p.cuisine),
    }))

    const res_out = NextResponse.json(places)
    // Cache for 1 hour, revalidate in background for 24h
    res_out.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res_out
  } catch (err) {
    console.error('[places] Route error:', err)
    return NextResponse.json([])
  }
}

function upscaleGoogleImage(url: string | null | undefined): string | null {
  if (!url) return null
  // Google Places thumbnails use =wNNN-hNNN or =wNNN-hNNN-k-no format — 600x400 is plenty for cards
  return url.replace(/=w\d+-h\d+(-k-no)?/, '=w600-h400-k-no')
}

// Varied Unsplash fallbacks by category hash so each place gets a unique photo
const FALLBACK_PHOTOS = [
  'photo-1488646953014-85cb44e25828', 'photo-1507525428034-b723cf961d3e',
  'photo-1476514525535-07fb3b4ae5f1', 'photo-1469854523086-cc02fe5d8800',
  'photo-1530789253388-582c481c54b0', 'photo-1502602898657-3e91760cbb34',
  'photo-1493976040374-85c8e12f0c0e', 'photo-1504150558240-0b4fd8946624',
  'photo-1528127269322-539801943592', 'photo-1558642452-9d2a7deb7f62',
  'photo-1506929562872-bb421503ef21', 'photo-1501785888041-af3ef285b470',
  'photo-1523906834658-6e24ef2386f9', 'photo-1504598318550-17eba1008a68',
  'photo-1516483638261-f4dbaf036963', 'photo-1526129318478-62ed807ebdf9',
]

function getFallbackImage(name: string, idx: number): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0
  const photoIdx = (Math.abs(hash) + idx) % FALLBACK_PHOTOS.length
  return `https://images.unsplash.com/${FALLBACK_PHOTOS[photoIdx]}?w=500&fit=crop&q=75`
}

function formatHours(hours?: Record<string, string>): string | undefined {
  if (!hours) return undefined
  const days = Object.entries(hours)
  if (days.length === 0) return undefined
  // Find today's hours
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const today = dayNames[new Date().getDay()]
  if (hours[today]) return `Today: ${hours[today]}`
  // Fall back to first available
  return days[0][1]
}

function formatDuration(minutes?: number | null): string | undefined {
  if (!minutes) return undefined
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? 's' : ''}`
}

function mapType(backendCat: string, requestedCat?: string): string {
  // Use the requested category as a hint when the backend returns a generic type
  const cat = backendCat.toLowerCase()
  const req = requestedCat?.toLowerCase()

  if (['restaurant', 'cafe', 'bar', 'dining'].includes(cat)) return 'restaurant'
  if (['museum', 'attraction', 'landmark', 'monument'].includes(cat)) {
    // Backend often returns generic 'attraction' — trust the requested category instead
    if (req && ['restaurant', 'cafe', 'bar', 'dining', 'nightlife'].includes(req)) return 'restaurant'
    if (req && ['park', 'garden', 'beach'].includes(req)) return 'experience'
    return 'attraction'
  }
  if (['park', 'garden', 'outdoor', 'beach'].includes(cat)) return 'experience'
  if (['event', 'festival', 'concert'].includes(cat)) return 'event'

  // Fallback: use requested category as hint
  if (req) {
    if (['restaurant', 'cafe', 'bar', 'dining', 'nightlife'].includes(req)) return 'restaurant'
    if (['museum', 'landmark', 'sightseeing'].includes(req)) return 'attraction'
    if (['park', 'garden', 'beach'].includes(req)) return 'experience'
    if (['shopping', 'market'].includes(req)) return 'destination'
  }
  return 'destination'
}

// Map backend categories to PLACE_COLLECTIONS-compatible categories
function mapCategory(cat: string, sub?: string): string {
  const c = (sub ?? cat).toLowerCase()
  if (['restaurant', 'dining'].includes(c)) return 'Culinary'
  if (c === 'cafe') return 'Culinary'
  if (c === 'bar' || c === 'nightlife') return 'Music Festival'
  if (c === 'museum') return 'Historical'
  if (['attraction', 'landmark', 'monument', 'sightseeing'].includes(c)) return 'Landmark'
  if (['park', 'garden'].includes(c)) return 'Nature'
  if (c === 'beach') return 'Coastal'
  if (c === 'shopping') return 'Market'
  return 'Cultural'
}

// Generate tags that match PLACE_COLLECTIONS match criteria
function titleCase(s: string): string {
  return s.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

function mapTags(cat: string, backendTags?: string[], cuisine?: string | null): string[] {
  const tags: string[] = (backendTags ?? []).map(titleCase)
  const c = cat.toLowerCase()
  if (c === 'restaurant' || c === 'cafe' || c === 'dining') tags.push('Food')
  if (c === 'museum' || c === 'attraction' || c === 'sightseeing') tags.push('Culture', 'Landmark')
  if (c === 'park' || c === 'garden') tags.push('Nature')
  if (c === 'bar' || c === 'nightlife') tags.push('Nightlife', 'Bar')
  if (c === 'beach') tags.push('Beach', 'Coast')
  if (c === 'shopping') tags.push('Markets')
  if (cuisine) tags.push(titleCase(cuisine))
  return [...new Set(tags)]
}

function mapPrice(level: string | number | null | undefined): 1 | 2 | 3 | 4 | undefined {
  if (level == null) return undefined
  // Backend sends either a number (1-4) or a string like "$$"
  if (typeof level === 'number') {
    return level >= 1 && level <= 4 ? (level as 1 | 2 | 3 | 4) : undefined
  }
  const len = level.replace(/[^$]/g, '').length
  if (len >= 1 && len <= 4) return len as 1 | 2 | 3 | 4
  // Try parsing as number
  const num = parseInt(level, 10)
  if (num >= 1 && num <= 4) return num as 1 | 2 | 3 | 4
  return undefined
}
