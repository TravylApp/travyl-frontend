import type { HotelData } from '@travyl/shared'

export interface SerpHotel {
  id: string
  name: string
  stars: number
  rating: number
  reviews: number
  price: number | null
  currency: string
  address: string
  neighborhood: string
  lat: number
  lng: number
  images: string[]
  amenities: string[]
  checkIn: string
  checkOut: string
  description: string
  link: string
  source: string
}

export interface SerpHotelSearchResponse {
  total: number
  hotels: SerpHotel[]
  error?: string
}

export interface HotelSearchInput {
  destination: string
  check_in: string
  check_out: string
  guests: number
  sort?: '3' | '8'  // 3 = lowest price, 8 = highest rating
}

export interface MapHotelInputs {
  check_in: string
  check_out: string
  guests: number
}

export async function searchHotels(input: HotelSearchInput): Promise<SerpHotelSearchResponse> {
  const params = new URLSearchParams({
    destination: input.destination,
    guests: String(input.guests),
    sort: input.sort ?? '3',
  })
  if (input.check_in) params.set('check_in', input.check_in)
  if (input.check_out) params.set('check_out', input.check_out)

  const res = await fetch(`/api/hotels/search?${params}`)
  if (!res.ok) {
    return { total: 0, hotels: [], error: `Search failed (${res.status})` }
  }
  return res.json()
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + 'T00:00:00Z').getTime()
  const b = new Date(checkOut + 'T00:00:00Z').getTime()
  if (!isFinite(a) || !isFinite(b)) return 1
  const diff = Math.round((b - a) / 86_400_000)
  return Math.max(1, diff)
}

export function mapSerpHotelToHotelData(serp: SerpHotel, inputs: MapHotelInputs): HotelData {
  const nights = nightsBetween(inputs.check_in, inputs.check_out)
  const price = serp.price ?? null
  const totalPrice = price != null ? price * nights : null
  return {
    name: serp.name,
    address: serp.address || null,
    latitude: serp.lat || null,
    longitude: serp.lng || null,
    check_in: inputs.check_in,
    check_out: inputs.check_out,
    price_per_night: price,
    total_price: totalPrice,
    currency: price != null ? serp.currency : null,
    rating: serp.rating > 0 ? serp.rating : null,
    star_rating: serp.stars > 0 ? serp.stars : null,
    image_url: serp.images[0] || null,
    booking_ref: null,
    offer_id: serp.id,
  }
}
