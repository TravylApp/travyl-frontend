import { describe, it, expect } from 'vitest'
import { mergeSearchResults, deduplicateResults } from './entitySearch'
import type { SpotlightResult } from './entitySearch'

const tripResult: SpotlightResult = {
  id: 'trip-1',
  type: 'trip',
  title: 'Paris Trip',
  subtitle: 'France',
  href: '/trip/trip-1',
  score: 0.9,
}

const hotelResult: SpotlightResult = {
  id: 'hotel-1',
  type: 'hotel',
  title: 'Le Marais Hotel',
  subtitle: '123 Rue de Rivoli',
  tripId: 'trip-1',
  tripTitle: 'Paris Trip',
  href: '/trip/trip-1/hotels/hotel-1',
  score: 1.5,
}

const dupHotelResult: SpotlightResult = {
  ...hotelResult,
  score: 1.0, // lower score duplicate
}

describe('mergeSearchResults', () => {
  it('merges results from multiple sources into grouped record', () => {
    const tripResults = { trip: [tripResult] }
    const entityResults = { hotel: [hotelResult] }
    const merged = mergeSearchResults([tripResults, entityResults])
    expect(merged.trip).toHaveLength(1)
    expect(merged.hotel).toHaveLength(1)
  })

  it('caps results at maxPerCategory', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      ...hotelResult,
      id: `hotel-${i}`,
    }))
    const merged = mergeSearchResults([{}, { hotel: many }], { maxPerCategory: 3 })
    expect(merged.hotel).toHaveLength(3)
  })

  it('deduplicates within categories keeping higher score', () => {
    const merged = mergeSearchResults([{ hotel: [hotelResult] }, { hotel: [dupHotelResult] }])
    expect(merged.hotel).toHaveLength(1)
    expect(merged.hotel[0].score).toBe(1.5)
  })
})

describe('deduplicateResults', () => {
  it('removes duplicates keeping higher score', () => {
    const results = [hotelResult, dupHotelResult]
    const deduped = deduplicateResults(results)
    expect(deduped).toHaveLength(1)
    expect(deduped[0].score).toBe(1.5)
  })
})
