import { Resource } from 'sst'
import type { BookingActivity, ProviderMatch } from './types'

const BASE_URL = 'https://api.viator.com/partner'
const AFFILIATE_BASE = 'https://www.viator.com'

interface ViatorProduct {
  productCode: string
  title: string
  webURL: string
  destinations?: Array<{ ref: string }>
}

export async function searchViator(
  activity: BookingActivity,
): Promise<ProviderMatch | null> {
  const apiKey = Resource.ViatorAffiliateKey.value
  if (!apiKey || apiKey === 'placeholder') return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(`${BASE_URL}/products/search`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'exp-api-key': apiKey,
        'Accept-Language': 'en-US',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filtering: {
          destination: '',
          searchTerm: activity.title,
          lowestPrice: 0,
          highestPrice: 999999,
          startDate: '',
          endDate: '',
          includeAutomaticTranslations: false,
          confirmationType: 'ALL',
          durationInMinutes: { from: 0, to: 99999 },
          rating: { from: 0, to: 5 },
        },
        sorting: { sort: 'RELEVANCE', order: 'DESCENDING' },
        pagination: { start: 1, count: 1 },
        currency: 'USD',
      }),
    })
    clearTimeout(timeout)

    if (!res.ok) return null
    const data = await res.json()
    const product: ViatorProduct | undefined = data.products?.[0]
    if (!product) return null

    const affiliateUrl = `${AFFILIATE_BASE}${product.webURL}${product.webURL.includes('?') ? '&' : '?'}mcid=${apiKey}`

    // Viator doesn't return lat/lng in search — use activity coords for proximity (same city assumed)
    return {
      provider: 'viator',
      matchedName: product.title,
      bookingUrl: `${AFFILIATE_BASE}${product.webURL}`,
      affiliateUrl,
      lat: activity.latitude,
      lng: activity.longitude,
    }
  } catch {
    clearTimeout(timeout)
    return null
  }
}
