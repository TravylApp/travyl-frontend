import { describe, it, expect } from 'vitest'
import { mapActivityToBudgetCategory } from './budgetMapping'

describe('mapActivityToBudgetCategory', () => {
  it('maps flight to flights', () => {
    expect(mapActivityToBudgetCategory('flight')).toBe('flights')
  })
  it('maps hotel and accommodation to hotels', () => {
    expect(mapActivityToBudgetCategory('hotel')).toBe('hotels')
    expect(mapActivityToBudgetCategory('accommodation')).toBe('hotels')
  })
  it('maps food-related categories to food', () => {
    for (const slug of ['restaurant', 'food', 'dining', 'cafe', 'bar']) {
      expect(mapActivityToBudgetCategory(slug)).toBe('food')
    }
  })
  it('maps activity-related categories to activities', () => {
    for (const slug of ['tour', 'museum', 'attraction', 'entertainment', 'sightseeing']) {
      expect(mapActivityToBudgetCategory(slug)).toBe('activities')
    }
  })
  it('maps transport-related categories to transport', () => {
    for (const slug of ['transport', 'car', 'bus', 'train', 'taxi']) {
      expect(mapActivityToBudgetCategory(slug)).toBe('transport')
    }
  })
  it('maps shopping to shopping', () => {
    expect(mapActivityToBudgetCategory('shopping')).toBe('shopping')
  })
  it('maps unknown categories to other', () => {
    expect(mapActivityToBudgetCategory('xyz')).toBe('other')
    expect(mapActivityToBudgetCategory('')).toBe('other')
  })
  it('is case-insensitive', () => {
    expect(mapActivityToBudgetCategory('Flight')).toBe('flights')
    expect(mapActivityToBudgetCategory('HOTEL')).toBe('hotels')
  })
})
