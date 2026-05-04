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
import { handler } from './currency'

describe('GET /currency/convert', () => {
  const mockEvent = (queryParams: Record<string, string>, authHeader = 'Bearer valid-token') => ({
    headers: { authorization: authHeader },
    queryStringParameters: queryParams,
  } as any)

  it('returns 400 when from/to missing', async () => {
    const result = await handler(mockEvent({ from: 'USD' }), {} as any, () => {})
    expect(result.statusCode).toBe(400)
  })

  it('returns 400 for invalid amount', async () => {
    const result = await handler(
      mockEvent({ from: 'USD', to: 'EUR', amount: '-5' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body).error).toContain('positive')
  })

  it('returns 400 for invalid currency code', async () => {
    const result = await handler(
      mockEvent({ from: 'US', to: 'EUR', amount: '100' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body).error).toContain('3 letters')
  })

  it('returns 401 with invalid auth', async () => {
    const result = await handler(
      mockEvent({ from: 'USD', to: 'EUR' }, 'Bearer invalid'),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(401)
  })
})