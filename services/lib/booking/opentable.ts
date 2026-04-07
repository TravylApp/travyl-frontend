import { Resource } from 'sst'
import type { BookingActivity, ProviderMatch } from './types'

const BASE_URL = 'https://platform.otgw.ot.tools/restaurants/v1'
const AFFILIATE_BASE = 'https://www.opentable.com'

interface OTRestaurant {
  restaurantId: number
  name: string
  latitude: number
  longitude: number
  profileLink: string
}

export async function searchOpenTable(
  activity: BookingActivity,
): Promise<ProviderMatch | null> {
  const apiKey = Resource.OpenTableAffiliateKey.value
  if (!apiKey || apiKey === 'placeholder') return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const params = new URLSearchParams({
      latitude: String(activity.latitude),
      longitude: String(activity.longitude),
      radius: '1',
      name: activity.title,
    })
    const res = await fetch(`${BASE_URL}?${params}`, {
      signal: controller.signal,
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    clearTimeout(timeout)

    if (!res.ok) return null
    const data = await res.json()
    const restaurant: OTRestaurant | undefined = data.restaurants?.[0]
    if (!restaurant) return null

    const bookingUrl = `${AFFILIATE_BASE}${restaurant.profileLink}`
    const affiliateUrl = `${bookingUrl}${bookingUrl.includes('?') ? '&' : '?'}ref=travyl`

    return {
      provider: 'opentable',
      matchedName: restaurant.name,
      bookingUrl,
      affiliateUrl,
      lat: restaurant.latitude,
      lng: restaurant.longitude,
    }
  } catch {
    clearTimeout(timeout)
    return null
  }
}
