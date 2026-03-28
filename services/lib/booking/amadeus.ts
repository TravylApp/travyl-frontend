import { Resource } from 'sst'
import { nameSimScore } from '@travyl/shared'
import type { BookingActivity, ProviderMatch } from './types'

const AUTH_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token'
const BASE_URL = 'https://test.api.amadeus.com/v1'

interface AmadeusActivity {
  name: string
  bookingLink?: string
  geoCode?: { latitude: number; longitude: number }
}

async function getAmadeusToken(): Promise<string | null> {
  const id = Resource.AmadeusApiKey.value
  const secret = Resource.AmadeusApiSecret.value
  if (!id || id === 'placeholder') return null

  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${id}&client_secret=${secret}`,
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token ?? null
}

export async function searchAmadeus(
  activity: BookingActivity,
): Promise<ProviderMatch | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const token = await getAmadeusToken()
    if (!token) return null

    const params = new URLSearchParams({
      latitude: String(activity.latitude),
      longitude: String(activity.longitude),
      radius: '1',
    })
    const res = await fetch(`${BASE_URL}/shopping/activities?${params}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
    clearTimeout(timeout)

    if (!res.ok) return null
    const data = await res.json()
    const items: AmadeusActivity[] = data.data ?? []

    // Find best name match from first 5 results
    const scored = items.slice(0, 5).map((item) => ({
      item,
      sim: nameSimScore(activity.title, item.name),
    }))
    const best = scored.sort((a, b) => b.sim - a.sim)[0]
    if (!best || !best.item.bookingLink) return null

    const affiliateUrl = `${best.item.bookingLink}${best.item.bookingLink.includes('?') ? '&' : '?'}utm_source=travyl`

    return {
      provider: 'amadeus',
      matchedName: best.item.name,
      bookingUrl: best.item.bookingLink,
      affiliateUrl,
      lat: best.item.geoCode?.latitude ?? activity.latitude,
      lng: best.item.geoCode?.longitude ?? activity.longitude,
    }
  } catch {
    clearTimeout(timeout)
    return null
  }
}
