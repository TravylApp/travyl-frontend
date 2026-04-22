import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from './events-search'

// Mock SST Resource
vi.mock('sst', () => ({
  Resource: {
    PredicthqApiKey: { value: 'test-api-key' },
    RecommendationCache: { name: 'test-cache-table' },
  },
}))

// Mock DynamoDB
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: class {
    send = vi.fn().mockResolvedValue({})
  },
}))

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn().mockReturnValue({
      send: vi.fn().mockResolvedValue({ Item: null }),
    }),
  },
  GetCommand: class {
    constructor() {}
  },
  PutCommand: class {
    constructor() {}
  },
}))

describe('events-search handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('returns 400 when city parameter is missing', async () => {
    const event = {
      queryStringParameters: {},
      headers: {},
    } as any

    const result = await handler(event)

    expect(result.statusCode).toBe(400)
    const body = JSON.parse(result.body!)
    expect(body.error).toContain('city')
  })

  it('returns events from PredictHQ API', async () => {
    const mockPredictHQResponse = {
      results: [
        {
          id: 'evt-123',
          title: 'Summer Music Festival',
          category: 'music',
          start: '2026-07-15T18:00:00Z',
          end: '2026-07-15T23:00:00Z',
          venue: { name: 'Central Park', address: '123 Park Ave' },
          images: [{ url: 'https://example.com/image.jpg' }],
          tickets_url: 'https://tickets.example.com',
          ticket_info: { min_price: 25, max_price: 100, currency: 'USD' },
        },
        {
          id: 'evt-456',
          title: 'Sports Championship',
          category: 'sports',
          start: '2026-07-20T14:00:00Z',
          venue: { name: 'Stadium' },
        },
      ],
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPredictHQResponse),
    })

    const event = {
      queryStringParameters: { city: 'New York' },
      headers: {},
    } as any

    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body!)
    expect(body.events).toHaveLength(2)
    expect(body.events[0].id).toBe('evt-123')
    expect(body.events[0].name).toBe('Summer Music Festival')
    expect(body.events[0].category).toBe('music')
    expect(body.events[0].venueName).toBe('Central Park')
    expect(body.events[0].ticketUrl).toBe('https://tickets.example.com')
    expect(body.events[0].priceMin).toBe(25)
    expect(body.events[0].priceMax).toBe(100)
    expect(body.events[1].category).toBe('sports')
  })

  it('includes date range parameters when provided', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    })

    const event = {
      queryStringParameters: {
        city: 'Paris',
        country: 'France',
        start_date: '2026-06-01',
        end_date: '2026-06-30',
      },
      headers: {},
    } as any

    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('active.gte=2026-06-01'),
      expect.any(Object)
    )
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('active.lte=2026-06-30'),
      expect.any(Object)
    )
  })

  it('normalizes event categories correctly', async () => {
    const mockPredictHQResponse = {
      results: [
        { id: '1', title: 'Concert', category: 'concerts', start: '2026-07-01T20:00:00Z' },
        { id: '2', title: 'Play', category: 'performing-arts', start: '2026-07-02T19:00:00Z' },
        { id: '3', title: 'Fair', category: 'festivals', start: '2026-07-03T10:00:00Z' },
        { id: '4', title: 'Meetup', category: 'community', start: '2026-07-04T18:00:00Z' },
        { id: '5', title: 'Unknown', category: 'other-category', start: '2026-07-05T12:00:00Z' },
      ],
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPredictHQResponse),
    })

    const event = {
      queryStringParameters: { city: 'London' },
      headers: {},
    } as any

    const result = await handler(event)
    const body = JSON.parse(result.body!)

    expect(body.events[0].category).toBe('music') // concerts -> music
    expect(body.events[1].category).toBe('arts') // performing-arts -> arts
    expect(body.events[2].category).toBe('festival') // festivals -> festival
    expect(body.events[3].category).toBe('family') // community -> family
    expect(body.events[4].category).toBe('other') // unknown -> other
  })

  it('returns empty array when PredictHQ API fails', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    })

    const event = {
      queryStringParameters: { city: 'Tokyo' },
      headers: {},
    } as any

    const result = await handler(event)

    expect(result.statusCode).toBe(502)
    const body = JSON.parse(result.body!)
    expect(body.events).toEqual([])
  })

  it('returns empty array on network error', async () => {
    ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

    const event = {
      queryStringParameters: { city: 'Sydney' },
      headers: {},
    } as any

    const result = await handler(event)

    expect(result.statusCode).toBe(500)
    const body = JSON.parse(result.body!)
    expect(body.events).toEqual([])
  })

  it('allows anonymous access (no auth required)', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    })

    const event = {
      queryStringParameters: { city: 'Berlin' },
      headers: {}, // No authorization header
    } as any

    const result = await handler(event)

    expect(result.statusCode).toBe(200)
  })

  it('parses ISO date/time correctly', async () => {
    const mockPredictHQResponse = {
      results: [
        {
          id: 'evt-789',
          title: 'Evening Show',
          category: 'performing-arts',
          start: '2026-08-20T19:30:00Z',
          end: '2026-08-20T22:00:00Z',
          venue: { name: 'Theatre' },
        },
      ],
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockPredictHQResponse),
    })

    const event = {
      queryStringParameters: { city: 'Madrid' },
      headers: {},
    } as any

    const result = await handler(event)
    const body = JSON.parse(result.body!)

    // The time should be parsed from ISO format (note: may vary by timezone)
    expect(body.events[0].date).toBe('2026-08-20')
    expect(body.events[0].startTime).toMatch(/^\d{2}:\d{2}$/)
    expect(body.events[0].endTime).toMatch(/^\d{2}:\d{2}$/)
  })
})
