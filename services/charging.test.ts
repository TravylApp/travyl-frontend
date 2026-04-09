import { describe, it, expect, vi } from 'vitest'
vi.mock('./lib/auth', () => ({ validateAuth: vi.fn((auth: string) => { if (auth?.includes('invalid')) throw new Error('Invalid token'); return 'user-123' }) }))
vi.mock('./lib/validation', () => ({ 
  validateQueryParams: vi.fn((params, required) => {
    const missing = required.filter((r: string) => !params[r])
    if (missing.length > 0) return { success: false, error: { statusCode: 400, body: JSON.stringify({ error: `Missing: ${missing.join(', ')}` }) } }
    return { success: true }
  }), 
  isValidDate: vi.fn(() => true) 
}))
import { handler } from './charging'

describe('GET /charging/stations', () => {
  const mockEvent = (queryParams: Record<string, string>, authHeader = 'Bearer valid-token') => ({
    headers: { authorization: authHeader },
    queryStringParameters: queryParams,
  } as any)

  it('returns 400 when lat/lng missing', async () => {
    const result = await handler(mockEvent({}), {} as any, () => {})
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

  it('returns 400 for invalid radius', async () => {
    const result = await handler(
      mockEvent({ lat: '40.7', lng: '-74.0', radius: '200' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body).error).toContain('1-100')
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