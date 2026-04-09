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
import { handler, detailsHandler } from './events'

describe('GET /events', () => {
  const mockEvent = (queryParams: Record<string, string>, authHeader = 'Bearer valid-token') => ({
    headers: { authorization: authHeader },
    queryStringParameters: queryParams,
  } as any)

  it('returns 400 when lat/lng missing', async () => {
    const result = await handler(mockEvent({}), {} as any, () => {})
    expect(result.statusCode).toBe(400)
  })

  it('returns 400 for invalid coordinates', async () => {
    const result = await handler(
      mockEvent({ lat: '100', lng: '0' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
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

describe('GET /events/{id}/details', () => {
  const mockDetailsEvent = (id: string, authHeader = 'Bearer valid-token') => ({
    headers: { authorization: authHeader },
    pathParameters: { id },
  } as any)

  it('returns 400 when event ID missing', async () => {
    const result = await detailsHandler(mockDetailsEvent(''), {} as any, () => {})
    expect(result.statusCode).toBe(400)
  })

  it('returns 401 with invalid auth', async () => {
    const result = await detailsHandler(
      mockDetailsEvent('123', 'Bearer invalid'),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(401)
  })
})