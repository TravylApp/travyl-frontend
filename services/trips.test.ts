import { describe, it, expect, vi } from 'vitest'
vi.mock('./lib/auth', () => ({ validateAuth: vi.fn((auth: string) => { if (auth?.includes('invalid')) throw new Error('Invalid token'); return 'user-123' }) }))
vi.mock('./lib/db', () => ({ getTrip: vi.fn(), updateTrip: vi.fn() }))
import { itineraryHandler, shareHandler, duplicateHandler } from './trips'

describe('GET /trips/{id}/itinerary', () => {
  const mockEvent = (id: string, authHeader = 'Bearer valid-token') => ({
    headers: { authorization: authHeader },
    pathParameters: { id },
  } as any)

  it('returns 400 when trip ID missing', async () => {
    const result = await itineraryHandler(mockEvent(''), {} as any, () => {})
    expect(result.statusCode).toBe(400)
  })

  it('returns 401 with invalid auth', async () => {
    const result = await itineraryHandler(mockEvent('123', 'Bearer invalid'), {} as any, () => {})
    expect(result.statusCode).toBe(401)
  })
})

describe('POST /trips/{id}/share', () => {
  const mockShareEvent = (id: string, body: object, authHeader = 'Bearer valid-token') => ({
    headers: { authorization: authHeader },
    pathParameters: { id },
    body: JSON.stringify(body),
  } as any)

  it('returns 400 when trip ID missing', async () => {
    const result = await shareHandler(mockShareEvent('', {}), {} as any, () => {})
    expect(result.statusCode).toBe(400)
  })

  it('returns 400 for invalid permission', async () => {
    const result = await shareHandler(
      mockShareEvent('123', { permission: 'admin' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
  })
})

describe('POST /trips/{id}/duplicate', () => {
  const mockDupEvent = (id: string, authHeader = 'Bearer valid-token') => ({
    headers: { authorization: authHeader },
    pathParameters: { id },
  } as any)

  it('returns 400 when trip ID missing', async () => {
    const result = await duplicateHandler(mockDupEvent(''), {} as any, () => {})
    expect(result.statusCode).toBe(400)
  })

  it('returns 401 with invalid auth', async () => {
    const result = await duplicateHandler(mockDupEvent('123', 'Bearer invalid'), {} as any, () => {})
    expect(result.statusCode).toBe(401)
  })
})