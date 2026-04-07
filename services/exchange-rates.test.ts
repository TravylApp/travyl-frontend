import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './exchange-rates'

// Mock the auth module
vi.mock('./lib/auth', () => ({
  validateAuth: vi.fn().mockResolvedValue('test-user-id'),
}))

describe('exchange-rates handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('returns rates for USD base currency', async () => {
    const mockRates = {
      base_code: 'USD',
      rates: { EUR: 0.85, GBP: 0.73, JPY: 110 },
    }
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRates),
    })

    const event = {
      queryStringParameters: { base: 'USD' },
      headers: {},
    } as any

    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body!)
    expect(body.base).toBe('USD')
    expect(body.rates.EUR).toBe(0.85)
    expect(body.source).toBe('exchangerate-api.com')
  })

  it('converts specific amount between currencies', async () => {
    const mockRates = {
      base_code: 'USD',
      rates: { EUR: 0.85 },
    }
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRates),
    })

    const event = {
      queryStringParameters: { base: 'USD', target: 'EUR', amount: '100' },
      headers: {},
    } as any

    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body!)
    expect(body.base).toBe('USD')
    expect(body.target).toBe('EUR')
    expect(body.rate).toBe(0.85)
    expect(body.amount).toBe(100)
    expect(body.converted).toBe(85)
  })

  it('defaults to USD when base not provided', async () => {
    const mockRates = {
      base_code: 'USD',
      rates: { EUR: 0.85 },
    }
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRates),
    })

    const event = {
      queryStringParameters: {},
      headers: {},
    } as any

    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body!)
    expect(body.base).toBe('USD')
  })

  it('returns 400 for invalid currency code', async () => {
    const event = {
      queryStringParameters: { base: 'INVALID' },
      headers: {},
    } as any

    const result = await handler(event)

    expect(result.statusCode).toBe(400)
    const body = JSON.parse(result.body!)
    expect(body.error).toContain('Invalid base currency')
  })

  it('returns 400 for unsupported target currency', async () => {
    const mockRates = {
      base_code: 'USD',
      rates: { EUR: 0.85 },
    }
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRates),
    })

    const event = {
      queryStringParameters: { base: 'USD', target: 'XYZ' },
      headers: {},
    } as any

    const result = await handler(event)

    expect(result.statusCode).toBe(400)
    const body = JSON.parse(result.body!)
    expect(body.error).toContain('Currency XYZ not found')
  })

  it('allows anonymous access (no auth required)', async () => {
    const mockRates = {
      base_code: 'USD',
      rates: { EUR: 0.85 },
    }
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRates),
    })

    const event = {
      queryStringParameters: { base: 'USD' },
      headers: {}, // No authorization header
    } as any

    const result = await handler(event)

    expect(result.statusCode).toBe(200)
  })

  it('returns 503 when exchange rate API fails', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const event = {
      queryStringParameters: { base: 'USD' },
      headers: {},
    } as any

    const result = await handler(event)

    expect(result.statusCode).toBe(503)
    const body = JSON.parse(result.body!)
    expect(body.error).toContain('temporarily unavailable')
  })
})
