import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { validateAuth } from './lib/auth'
import { validateQueryParams } from './lib/validation'

const OER_URL = 'https://open.er-api.com/v6/latest'

interface CurrencyResponse {
  from: string
  to: string
  amount: number
  converted: number
  rate: number
  lastUpdated: string
}

// Cache rates for 1 hour
let cachedRates: Record<string, number> | null = null
let cacheTime: number = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

async function getRates(): Promise<Record<string, number> | null> {
  const now = Date.now()
  if (cachedRates && now - cacheTime < CACHE_TTL) {
    return cachedRates
  }

  const apiKey = Resource.OpenExchangeRatesAppId.value
  const url = apiKey && apiKey !== 'placeholder'
    ? `https://openexchangerates.org/api/latest.json?app_id=${apiKey}`
    : `${OER_URL}/USD` // free fallback

  const res = await fetch(url, {
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) {
    console.error('[currency] fetch error:', res.status)
    return null
  }

  const data = await res.json()
  cachedRates = data.rates
  cacheTime = now
  return cachedRates
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const { from, to, amount = '1' } = event.queryStringParameters ?? {}

    const paramsValid = validateQueryParams({ from, to }, ['from', 'to'])
    if (!paramsValid.success) {
      return paramsValid.error
    }

    const fromCurrency = from!.toUpperCase()
    const toCurrency = to!.toUpperCase()
    const amt = parseFloat(amount)

    if (isNaN(amt) || amt <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Amount must be a positive number' }) }
    }

    // Validate 3-letter currency codes
    const currencyRegex = /^[A-Z]{3}$/
    if (!currencyRegex.test(fromCurrency) || !currencyRegex.test(toCurrency)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Currency codes must be 3 letters (e.g., USD, EUR)' }) }
    }

    const rates = await getRates()
    if (!rates) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Currency rates unavailable' }) }
    }

    const fromRate = rates[fromCurrency]
    const toRate = rates[toCurrency]

    if (!fromRate || !toRate) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid currency code' }) }
    }

    // Convert via USD base
    const rate = toRate / fromRate
    const converted = amt * rate

    const response: CurrencyResponse = {
      from: fromCurrency,
      to: toCurrency,
      amount: amt,
      converted: Math.round(converted * 100) / 100,
      rate: Math.round(rate * 1000000) / 1000000,
      lastUpdated: new Date(cacheTime).toISOString(),
    }

    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    if (err instanceof Error && err.name === 'AbortError') {
      return { statusCode: 504, body: JSON.stringify({ error: 'Currency lookup timeout' }) }
    }
    console.error('[currency] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}