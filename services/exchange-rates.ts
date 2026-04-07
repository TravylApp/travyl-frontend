import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { validateAuth } from './lib/auth'

interface ExchangeRateResponse {
  base: string
  rates: Record<string, number>
  timestamp: number
  source: string
}

// Free tier API: exchangerate-api.com (no key required for basic usage)
// Falls back to Open Exchange Rates if API key is available
const EXCHANGE_RATE_API_URL = 'https://api.exchangerate-api.com/v4/latest'

async function fetchExchangeRates(base: string): Promise<ExchangeRateResponse | null> {
  try {
    // Try free API first (no API key needed)
    const res = await fetch(`${EXCHANGE_RATE_API_URL}/${base}`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      console.error('[exchange-rates] Free API failed:', res.status)
      return null
    }

    const data = await res.json()
    return {
      base: data.base_code || base,
      rates: data.rates || {},
      timestamp: Date.now(),
      source: 'exchangerate-api.com',
    }
  } catch (err) {
    console.error('[exchange-rates] Free API error:', err)
    return null
  }
}

async function fetchWithOpenExchangeRates(appId: string, base: string): Promise<ExchangeRateResponse | null> {
  try {
    const url = `https://openexchangerates.org/api/latest.json?app_id=${appId}&base=${base}`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })

    if (!res.ok) {
      console.error('[exchange-rates] OpenExchangeRates failed:', res.status)
      return null
    }

    const data = await res.json()
    return {
      base: data.base,
      rates: data.rates,
      timestamp: data.timestamp * 1000,
      source: 'openexchangerates.org',
    }
  } catch (err) {
    console.error('[exchange-rates] OpenExchangeRates error:', err)
    return null
  }
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // Validate auth (optional for this endpoint - useful for both logged-in and anon users)
    let userId: string | null = null
    try {
      userId = await validateAuth(event.headers.authorization)
    } catch {
      // Allow anonymous access for currency conversion
    }

    const base = (event.queryStringParameters?.base || 'USD').toUpperCase()
    const target = event.queryStringParameters?.target?.toUpperCase()
    const amount = parseFloat(event.queryStringParameters?.amount || '1')

    // Validate base currency format (3-letter ISO code)
    if (!/^[A-Z]{3}$/.test(base)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid base currency. Use 3-letter ISO code (e.g., USD, EUR)' }),
      }
    }

    console.log('[exchange-rates] base:', base, 'target:', target, 'amount:', amount, 'userId:', userId || 'anon')

    // Try free API first
    let result = await fetchExchangeRates(base)

    // Fall back to Open Exchange Rates if configured and free API failed
    if (!result && Resource.OpenExchangeRatesAppId?.value) {
      result = await fetchWithOpenExchangeRates(Resource.OpenExchangeRatesAppId.value, base)
    }

    if (!result) {
      return {
        statusCode: 503,
        body: JSON.stringify({ error: 'Exchange rate service temporarily unavailable' }),
      }
    }

    // If target currency specified, return specific conversion
    if (target) {
      if (!/^[A-Z]{3}$/.test(target)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid target currency. Use 3-letter ISO code' }),
        }
      }

      const rate = result.rates[target]
      if (rate === undefined) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Currency ${target} not found` }),
        }
      }

      const converted = amount * rate

      return {
        statusCode: 200,
        body: JSON.stringify({
          base,
          target,
          rate,
          amount,
          converted: Math.round(converted * 100) / 100,
          timestamp: result.timestamp,
          source: result.source,
        }),
      }
    }

    // Return all rates
    return {
      statusCode: 200,
      body: JSON.stringify({
        base: result.base,
        rates: result.rates,
        timestamp: result.timestamp,
        source: result.source,
      }),
    }
  } catch (err: any) {
    console.error('[exchange-rates] Error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
