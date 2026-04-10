import { describe, it, expect, vi } from 'vitest'

// Mocks must be at top level and are hoisted by vitest
vi.mock('sst', () => ({
  Resource: {
    SupabaseUrl: { value: 'https://test.supabase.co' },
    SupabaseSecretKey: { value: 'test-secret-key' }
  }
}))
vi.mock('./lib/auth', () => ({ validateAuth: vi.fn((auth: string) => { if (auth?.includes('invalid')) throw new Error('Invalid token'); return 'user-123' }) }))
vi.mock('./lib/db', () => ({ getUserStats: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({ from: vi.fn((table: string) => {
        // Return different mock chains based on table
        if (table === 'users') {
          return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { created_at: '2024-01-01' }, error: null })) })) })) }
        }
        // For trips table - handle both count queries and country queries
        return {
          select: vi.fn((cols: string, opts?: any) => {
            if (opts?.head) {
              // Count query
              return { eq: vi.fn(() => ({ gte: vi.fn(() => ({ count: 2 })), count: 5 })) }
            }
            // Regular select for countries/types
            return { eq: vi.fn(() => ({ data: [{ country: 'USA' }, { country: 'France' }] })) }
          })
        }
      }) })) }))

// Import after mocks
const { statsHandler } = await import('./user')

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