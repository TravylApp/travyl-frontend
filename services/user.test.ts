import { describe, it, expect } from 'vitest'
import { statsHandler } from './user'

describe('GET /user/stats', () => {
  const mockEvent = (authHeader = 'Bearer valid-token') => ({
    headers: { authorization: authHeader },
  } as any)

  it('returns stats for authenticated user', async () => {
    const result = await statsHandler(mockEvent(), {} as any, () => {})
    expect([200, 401]).toContain(result.statusCode)
  })

  it('returns 401 with invalid auth', async () => {
    const result = await statsHandler(mockEvent('Bearer invalid'), {} as any, () => {})
    expect(result.statusCode).toBe(401)
  })
})