import { describe, it, expect } from 'vitest'
import { itineraryHandler, shareHandler } from './trips'

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