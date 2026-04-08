import { describe, it, expect, vi } from 'vitest'
import { handler } from './flights'

describe('GET /flights/search', () => {
  const mockEvent = (queryParams: Record<string, string>, authHeader = 'Bearer valid-token') => ({
    headers: { authorization: authHeader },
    queryStringParameters: queryParams,
  } as any)

  it('returns 400 when origin/destination/date missing', async () => {
    const result = await handler(mockEvent({ origin: 'JFK' }), {} as any, () => {})
    expect(result.statusCode).toBe(400)
  })

  it('returns 400 for invalid IATA codes', async () => {
    const result = await handler(
      mockEvent({ origin: 'NEWYORK', destination: 'LON', date: '2024-06-15' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body).error).toContain('IATA')
  })

  it('returns 400 for invalid date format', async () => {
    const result = await handler(
      mockEvent({ origin: 'JFK', destination: 'LHR', date: '06/15/2024' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body).error).toContain('YYYY-MM-DD')
  })

  it('returns 400 for invalid cabin class', async () => {
    const result = await handler(
      mockEvent({ origin: 'JFK', destination: 'LHR', date: '2024-06-15', cabin: 'luxury' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body).error).toContain('economy')
  })

  it('returns 401 with invalid auth', async () => {
    const result = await handler(
      mockEvent({ origin: 'JFK', destination: 'LHR', date: '2024-06-15' }, 'Bearer invalid'),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(401)
  })

  it('returns 503 when API key is placeholder', async () => {
    vi.mock('sst', () => ({
      Resource: {
        DuffelApiToken: { value: 'placeholder' }
      }
    }))

    const result = await handler(
      mockEvent({ origin: 'JFK', destination: 'LHR', date: '2024-06-15' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(503)
  })
})