import { describe, it, expect, vi } from 'vitest'
vi.mock('./lib/auth', () => ({ validateAuth: vi.fn((auth: string) => { if (auth?.includes('invalid')) throw new Error('Invalid token'); return 'user-123' }) }))
vi.mock('sst', () => ({ Resource: { SerpApiKey: { value: 'placeholder' } } }))
import { handler, generateHandler } from './recommend'

describe('GET /recommend', () => {
  const mockEvent = (queryParams: Record<string, string>, authHeader = 'Bearer valid-token') => ({
    headers: { authorization: authHeader },
    queryStringParameters: queryParams,
  } as any)

  it('returns 400 when destination missing', async () => {
    const result = await handler(mockEvent({}), {} as any, () => {})
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body).error).toContain('destination')
  })

  it('returns 401 with invalid auth', async () => {
    const result = await handler(
      mockEvent({ destination: 'Paris' }, 'Bearer invalid'),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(401)
  })
})

describe('GET /recommendations/generate', () => {
  const mockGenEvent = (queryParams: Record<string, string>, authHeader = 'Bearer valid-token') => ({
    headers: { authorization: authHeader },
    queryStringParameters: queryParams,
  } as any)

  it('returns 400 when destination missing', async () => {
    const result = await generateHandler(mockGenEvent({ days: '3' }), {} as any, () => {})
    expect(result.statusCode).toBe(400)
  })

  it('returns 400 when days missing', async () => {
    const result = await generateHandler(mockGenEvent({ destination: 'Paris' }), {} as any, () => {})
    expect(result.statusCode).toBe(400)
  })

  it('returns 400 for invalid days', async () => {
    const result = await generateHandler(
      mockGenEvent({ destination: 'Paris', days: '20' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body).error).toContain('1-14')
  })

  it('returns 401 with invalid auth', async () => {
    const result = await generateHandler(
      mockGenEvent({ destination: 'Paris', days: '3' }, 'Bearer invalid'),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(401)
  })
})