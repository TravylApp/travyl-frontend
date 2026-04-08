import { describe, it, expect, vi } from 'vitest'
import { handler } from './transit'

describe('GET /transit/directions', () => {
  const mockEvent = (queryParams: Record<string, string>, authHeader = 'Bearer valid-token') => ({
    headers: { authorization: authHeader },
    queryStringParameters: queryParams,
  } as any)

  it('returns 400 when coordinates missing', async () => {
    const result = await handler(mockEvent({ originLat: '37.7' }), {} as any, () => {})
    expect(result.statusCode).toBe(400)
  })

  it('returns 400 for invalid coordinates', async () => {
    const result = await handler(
      mockEvent({ originLat: 'abc', originLng: '0', destLat: '0', destLng: '0' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body).error).toContain('Invalid')
  })

  it('returns 400 for invalid vehicle type', async () => {
    const result = await handler(
      mockEvent({
        originLat: '37.7749',
        originLng: '-122.4194',
        destLat: '37.7849',
        destLng: '-122.4094',
        vehicle: 'helicopter'
      }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body).error).toContain('car')
  })

  it('returns 401 with invalid auth', async () => {
    const result = await handler(
      mockEvent({ originLat: '37.7', originLng: '-122.4', destLat: '37.8', destLng: '-122.3' }, 'Bearer invalid'),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(401)
  })

  it('returns 503 when API key is placeholder', async () => {
    vi.mock('sst', () => ({
      Resource: {
        GraphhopperApiKey: { value: 'placeholder' }
      }
    }))

    const result = await handler(
      mockEvent({ originLat: '37.7', originLng: '-122.4', destLat: '37.8', destLng: '-122.3' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(503)
  })
})