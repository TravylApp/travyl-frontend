import { describe, it, expect } from 'vitest'
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