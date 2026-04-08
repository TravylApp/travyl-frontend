import { describe, it, expect } from 'vitest'
import { handler } from './timezone'

describe('GET /timezone/convert', () => {
  const mockEvent = (queryParams: Record<string, string>, authHeader = 'Bearer valid-token') => ({
    headers: { authorization: authHeader },
    queryStringParameters: queryParams,
  } as any)

  it('returns 400 when lat/lng missing', async () => {
    const result = await handler(mockEvent({ lat: '40.7' }), {} as any, () => {})
    expect(result.statusCode).toBe(400)
  })

  it('returns 400 for invalid latitude', async () => {
    const result = await handler(
      mockEvent({ lat: '100', lng: '0' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body).error).toContain('latitude')
  })

  it('returns 400 for invalid longitude', async () => {
    const result = await handler(
      mockEvent({ lat: '40.7', lng: '200' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body).error).toContain('longitude')
  })

  it('returns 401 with invalid auth', async () => {
    const result = await handler(
      mockEvent({ lat: '40.7', lng: '-74.0' }, 'Bearer invalid'),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(401)
  })
})