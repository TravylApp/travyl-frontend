import { describe, it, expect, vi } from 'vitest'
import { handler, availabilityHandler } from './restaurants'

describe('GET /restaurants/search', () => {
  const mockEvent = (queryParams: Record<string, string>, authHeader = 'Bearer valid-token') => ({
    headers: { authorization: authHeader },
    queryStringParameters: queryParams,
  } as any)

  it('returns 400 when lat/lng missing', async () => {
    const result = await handler(mockEvent({}), {} as any, () => {})
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body).error).toContain('lat')
  })

  it('returns 401 with invalid auth', async () => {
    const result = await handler(
      mockEvent({ lat: '37.7749', lng: '-122.4194' }, 'Bearer invalid'),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(401)
  })

  it('returns 503 when API key is placeholder', async () => {
    vi.mock('sst', () => ({
      Resource: {
        OpenTableAffiliateKey: { value: 'placeholder' }
      }
    }))

    const result = await handler(
      mockEvent({ lat: '37.7749', lng: '-122.4194' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(503)
  })
})

describe('GET /restaurants/{id}/availability', () => {
  const mockAvailEvent = (id: string, queryParams: Record<string, string>, authHeader = 'Bearer valid-token') => ({
    headers: { authorization: authHeader },
    pathParameters: { id },
    queryStringParameters: queryParams,
  } as any)

  it('returns 400 when restaurant ID missing', async () => {
    const result = await availabilityHandler(
      mockAvailEvent('', { date: '2024-06-15' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
  })

  it('returns 400 for invalid date format', async () => {
    const result = await availabilityHandler(
      mockAvailEvent('123', { date: '06/15/2024' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
  })

  it('returns 400 for invalid party size', async () => {
    const result = await availabilityHandler(
      mockAvailEvent('123', { date: '2024-06-15', partySize: '25' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
  })
})