import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './restaurant-search'
import * as cache from './lib/cache'

// Mock the cache module
vi.mock('./lib/cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
}))

// Mock SST Resource
vi.mock('sst', () => ({
  Resource: {
    SerpApiKey: { value: 'test-api-key' },
    OpenTableAffiliateKey: { value: 'test-affiliate-key' },
  },
}))

describe('restaurant-search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cache.getCache).mockResolvedValue(null)
    vi.mocked(cache.setCache).mockResolvedValue()
  })

  it('returns 400 when location is missing', async () => {
    const event = {
      queryStringParameters: {},
    } as any

    const result = await handler(event)

    expect(result.statusCode).toBe(400)
    const body = JSON.parse(result.body as string)
    expect(body.error).toContain('Missing required parameter')
  })

  it('returns cached results when available', async () => {
    const cachedRestaurants = [
      { id: '1', name: 'Test Restaurant', address: '123 Main St', rating: 4.5 },
    ]
    vi.mocked(cache.getCache).mockResolvedValue(JSON.stringify(cachedRestaurants))

    const event = {
      queryStringParameters: { location: 'San Francisco' },
    } as any

    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body as string)
    expect(body.source).toBe('cache')
    expect(body.restaurants).toHaveLength(1)
    expect(body.restaurants[0].name).toBe('Test Restaurant')
  })

  it('returns 503 when SerpAPI key is not configured', async () => {
    // Temporarily override the mock
    const sstModule = await import('sst')
    const originalValue = sstModule.Resource.SerpApiKey.value
    sstModule.Resource.SerpApiKey.value = undefined as any

    const event = {
      queryStringParameters: { location: 'San Francisco' },
    } as any

    const result = await handler(event)

    expect(result.statusCode).toBe(503)

    // Restore
    sstModule.Resource.SerpApiKey.value = originalValue
  })

  it('respects the limit parameter', async () => {
    const manyRestaurants = Array(20).fill(null).map((_, i) => ({
      id: `${i}`,
      name: `Restaurant ${i}`,
      address: `${i} Main St`,
    }))
    vi.mocked(cache.getCache).mockResolvedValue(JSON.stringify(manyRestaurants))

    const event = {
      queryStringParameters: { location: 'San Francisco', limit: '5' },
    } as any

    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body as string)
    expect(body.restaurants).toHaveLength(5)
    expect(body.total).toBe(20)
  })

  it('uses lat/lng when provided instead of location', async () => {
    const event = {
      queryStringParameters: { lat: '37.7749', lng: '-122.4194' },
    } as any

    // Mock the fetch call
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        local_results: [
          {
            place_id: 'test-1',
            title: 'SF Restaurant',
            address: 'SF Address',
            rating: '4.5',
            reviews: '100',
            price: '$$',
            type: 'italian restaurant',
          },
        ],
      }),
    } as any)

    const result = await handler(event)

    expect(global.fetch).toHaveBeenCalled()
    const fetchCall = vi.mocked(global.fetch).mock.calls[0]
    expect(fetchCall[0]).toContain('37.7749')
    expect(fetchCall[0]).toContain('-122.4194')
  })
})
