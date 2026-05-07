import { describe, it, expect } from 'vitest'
import { mapSerpHotelToHotelData, type SerpHotel } from '../hotelSearch'

const baseSerp: SerpHotel = {
  id: 'serp-hotel-0',
  name: 'Park Hyatt Tokyo',
  stars: 5,
  rating: 4.6,
  reviews: 1234,
  price: 480,
  currency: 'USD',
  address: '3-7-1-2 Nishi-Shinjuku, Shinjuku-ku',
  neighborhood: 'Shinjuku',
  lat: 35.6859,
  lng: 139.6915,
  images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
  amenities: ['Wi-Fi', 'Pool'],
  checkIn: '3:00 PM',
  checkOut: '11:00 AM',
  description: 'Luxury hotel',
  link: 'https://google.com/hotel/abc',
  source: 'serpapi',
}

describe('mapSerpHotelToHotelData', () => {
  it('maps a 3-night stay with full data', () => {
    const data = mapSerpHotelToHotelData(baseSerp, {
      check_in: '2026-06-01',
      check_out: '2026-06-04',
      guests: 2,
    })
    expect(data.name).toBe('Park Hyatt Tokyo')
    expect(data.address).toBe('3-7-1-2 Nishi-Shinjuku, Shinjuku-ku')
    expect(data.latitude).toBe(35.6859)
    expect(data.longitude).toBe(139.6915)
    expect(data.check_in).toBe('2026-06-01')
    expect(data.check_out).toBe('2026-06-04')
    expect(data.price_per_night).toBe(480)
    expect(data.total_price).toBe(1440)
    expect(data.currency).toBe('USD')
    expect(data.rating).toBe(4.6)
    expect(data.star_rating).toBe(5)
    expect(data.image_url).toBe('https://example.com/img1.jpg')
    expect(data.booking_ref).toBeNull()
    expect(data.offer_id).toBe('serp-hotel-0')
  })

  it('handles a 1-night stay correctly', () => {
    const data = mapSerpHotelToHotelData(baseSerp, {
      check_in: '2026-06-01',
      check_out: '2026-06-02',
      guests: 2,
    })
    expect(data.total_price).toBe(480)
  })

  it('treats same-day or invalid dates as 1 night minimum', () => {
    const data = mapSerpHotelToHotelData(baseSerp, {
      check_in: '2026-06-01',
      check_out: '2026-06-01',
      guests: 2,
    })
    expect(data.total_price).toBe(480)
  })

  it('keeps total_price null when price is null', () => {
    const data = mapSerpHotelToHotelData({ ...baseSerp, price: null as unknown as number }, {
      check_in: '2026-06-01',
      check_out: '2026-06-04',
      guests: 2,
    })
    expect(data.price_per_night).toBeNull()
    expect(data.total_price).toBeNull()
    expect(data.currency).toBeNull()
  })

  it('handles missing image gracefully', () => {
    const data = mapSerpHotelToHotelData({ ...baseSerp, images: [] }, {
      check_in: '2026-06-01',
      check_out: '2026-06-04',
      guests: 2,
    })
    expect(data.image_url).toBeNull()
  })

  it('handles 0 stars / 0 rating as null, not 0', () => {
    const data = mapSerpHotelToHotelData({ ...baseSerp, stars: 0, rating: 0 }, {
      check_in: '2026-06-01',
      check_out: '2026-06-04',
      guests: 2,
    })
    expect(data.star_rating).toBeNull()
    expect(data.rating).toBeNull()
  })
})
