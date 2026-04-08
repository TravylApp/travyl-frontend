import { describe, it, expect, vi } from 'vitest'
import { handler } from './health'

describe('GET /api/health', () => {
  it('returns 200 with healthy status', async () => {
    vi.mock('sst', () => ({
      Resource: {
        SupabaseUrl: { value: 'https://test.supabase.co' }
      }
    }))

    const result = await handler({} as any, {} as any, () => {})
    expect(result.statusCode).toBe(200)

    const body = JSON.parse(result.body)
    expect(body.status).toBe('healthy')
    expect(body.services.api).toBe(true)
    expect(body.services.auth).toBe(true)
    expect(body.timestamp).toBeDefined()
  })

  it('returns degraded when auth not configured', async () => {
    vi.mock('sst', () => ({
      Resource: {
        SupabaseUrl: { value: 'placeholder' }
      }
    }))

    const result = await handler({} as any, {} as any, () => {})

    const body = JSON.parse(result.body)
    expect(body.status).toBe('degraded')
    expect(body.services.auth).toBe(false)
  })
})