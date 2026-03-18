import { describe, it, expect } from 'vitest'
import { suggestionToCalendarActivity } from './suggestionMapper'
import type { SuggestionCard } from '../types'

const MOCK_SUGGESTION: SuggestionCard = {
  id: 'sug-1',
  name: 'Eiffel Tower',
  category: 'sightseeing',
  imageUrl: 'https://example.com/eiffel.jpg',
  duration: 2,
  price: 26,
  currency: 'EUR',
  rating: 4.7,
  location: '7th arrondissement',
  latitude: 48.8584,
  longitude: 2.2945,
  description: 'Iconic tower',
  source: 'ai',
  relevanceScore: 0.95,
  reason: 'Top attraction',
}

describe('suggestionToCalendarActivity', () => {
  it('maps all fields correctly', () => {
    const result = suggestionToCalendarActivity(MOCK_SUGGESTION, 2, 9.5)

    expect(result.id).toBeDefined()
    expect(result.id).not.toBe('sug-1') // new UUID, not suggestion id
    expect(result.title).toBe('Eiffel Tower')
    expect(result.type).toBe('sightseeing')
    expect(result.day).toBe(2)
    expect(result.startHour).toBe(9.5)
    expect(result.duration).toBe(2)
    expect(result.price).toBe('26')
    expect(result.rating).toBe(4.7)
    expect(result.location).toBe('7th arrondissement')
    expect(result.image).toBe('https://example.com/eiffel.jpg')
    expect(result.latitude).toBe(48.8584)
    expect(result.longitude).toBe(2.2945)
    expect(result.notes).toBe('Iconic tower')
  })

  it('converts null price to undefined', () => {
    const suggestion = { ...MOCK_SUGGESTION, price: null }
    const result = suggestionToCalendarActivity(suggestion, 0, 10)
    expect(result.price).toBeUndefined()
  })

  it('converts null rating to undefined', () => {
    const suggestion = { ...MOCK_SUGGESTION, rating: null }
    const result = suggestionToCalendarActivity(suggestion, 0, 10)
    expect(result.rating).toBeUndefined()
  })
})
