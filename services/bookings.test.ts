import { describe, it, expect } from 'vitest'
import { validateHandler } from './bookings'

describe('POST /bookings/validate', () => {
  const mockEvent = (body: object, authHeader = 'Bearer valid-token') => ({
    headers: { authorization: authHeader },
    body: JSON.stringify(body),
  } as any)

  it('returns 400 for invalid booking type', async () => {
    const result = await validateHandler(
      mockEvent({ type: 'hotel', providerId: '123', date: '2024-06-15' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body).errors).toContain('Invalid booking type')
  })

  it('returns 400 for missing providerId', async () => {
    const result = await validateHandler(
      mockEvent({ type: 'restaurant', date: '2024-06-15' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body).errors).toContain('Provider ID is required')
  })

  it('returns 400 for invalid date format', async () => {
    const result = await validateHandler(
      mockEvent({ type: 'restaurant', providerId: '123', date: '06/15/2024' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body).errors).toContain('YYYY-MM-DD')
  })

  it('returns 400 for past date', async () => {
    const result = await validateHandler(
      mockEvent({ type: 'event', providerId: '123', date: '2020-01-01' }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(400)
    expect(JSON.parse(result.body).errors).toContain('past')
  })

  it('returns 200 for valid restaurant booking', async () => {
    const result = await validateHandler(
      mockEvent({ type: 'restaurant', providerId: '123', date: '2025-06-15', time: '19:00', partySize: 4 }),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(200)
    expect(JSON.parse(result.body).valid).toBe(true)
  })

  it('returns 401 with invalid auth', async () => {
    const result = await validateHandler(
      mockEvent({ type: 'restaurant', providerId: '123', date: '2025-06-15' }, 'Bearer invalid'),
      {} as any,
      () => {}
    )
    expect(result.statusCode).toBe(401)
  })
})