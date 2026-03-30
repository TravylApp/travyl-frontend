import { describe, it, expect } from 'vitest'
import { generatePackingSuggestions } from '../packingSuggestions'

const USER_ID = 'test-user-123'

describe('generatePackingSuggestions', () => {
  const baseCtx = {
    destination: 'Paris, France',
    country: 'France',
    durationDays: 5,
    startDate: '2026-06-15',
    endDate: '2026-06-20',
  }

  it('always includes essentials', () => {
    const suggestions = generatePackingSuggestions({ ...baseCtx }, USER_ID)
    const essentials = suggestions.filter((s) => s.category === 'essentials')
    const names = essentials.map((s) => s.name)
    expect(names).toContain('Wallet')
    expect(names).toContain('Phone')
    expect(names).toContain('Keys')
  })

  it('always includes important documents', () => {
    const suggestions = generatePackingSuggestions({ ...baseCtx }, USER_ID)
    const docs = suggestions.filter((s) => s.category === 'documents')
    const names = docs.map((s) => s.name)
    expect(names).toContain('Passport')
    expect(names).toContain('Credit cards')
    expect(names).toContain('Cash')
    expect(names).toContain('Copies of documents')
    expect(names).toContain('Emergency contacts')
  })

  it('always includes basic toiletries', () => {
    const suggestions = generatePackingSuggestions({ ...baseCtx }, USER_ID)
    const toiletries = suggestions.filter((s) => s.category === 'toiletries')
    const names = toiletries.map((s) => s.name)
    expect(names).toContain('Toothbrush')
    expect(names).toContain('Toothpaste')
    expect(names).toContain('Deodorant')
    expect(names).toContain('Medications')
    expect(names).toContain('Pain reliever')
    expect(names).toContain('Band-aids')
  })

  it('always includes essential electronics', () => {
    const suggestions = generatePackingSuggestions({ ...baseCtx }, USER_ID)
    const electronics = suggestions.filter((s) => s.category === 'electronics')
    const names = electronics.map((s) => s.name)
    expect(names).toContain('Phone charger')
    expect(names).toContain('Power adapter')
    expect(names).toContain('Portable battery')
    expect(names).toContain('Headphones')
  })

  it('suggests cold-weather clothing for cold trips', () => {
    const suggestions = generatePackingSuggestions(
      { ...baseCtx, destination: 'Reykjavik, Iceland', weather: { forecast: [{ high: 25, low: 15, conditions: 'snow' }] } },
      USER_ID,
    )
    const clothing = suggestions.filter((s) => s.category === 'clothing')
    const names = clothing.map((s) => s.name)
    expect(names).toContain('Warm layers')
    expect(names).toContain('Scarf')
    expect(names).toContain('Gloves')
    expect(names).toContain('Jacket')
    // Should NOT suggest beach/summer items
    expect(names).not.toContain('Swimsuit')
    expect(names).not.toContain('Shorts')
  })

  it('suggests beach items for hot/beach trips', () => {
    const suggestions = generatePackingSuggestions(
      { ...baseCtx, destination: 'Maui, Hawaii', tripTheme: 'beach', weather: { forecast: [{ high: 88, low: 75, conditions: 'sunny' }] } },
      USER_ID,
    )
    const clothing = suggestions.filter((s) => s.category === 'clothing')
    const names = clothing.map((s) => s.name)
    expect(names).toContain('Swimsuit')
    expect(names).toContain('Shorts')
    expect(names).toContain('Sandals')
    // Should NOT suggest cold-weather items
    expect(names).not.toContain('Warm layers')
    expect(names).not.toContain('Gloves')
  })

  it('suggests rain gear for rainy weather', () => {
    const suggestions = generatePackingSuggestions(
      { ...baseCtx, weather: { forecast: [{ high: 60, low: 50, conditions: 'rain showers' }] } },
      USER_ID,
    )
    const clothingAndAccessories = suggestions.filter(
      (s) => s.category === 'clothing' || s.category === 'accessories',
    )
    const names = clothingAndAccessories.map((s) => s.name)
    expect(names).toContain('Rain jacket')
    expect(names).toContain('Umbrella')
  })

  it('suggests hiking gear for outdoor trips', () => {
    const suggestions = generatePackingSuggestions(
      { ...baseCtx, destination: 'Patagonia', tripTheme: 'hiking adventure' },
      USER_ID,
    )
    const clothing = suggestions.filter((s) => s.category === 'clothing')
    const names = clothing.map((s) => s.name)
    expect(names).toContain('Hiking boots')
  })

  it('suggests business attire for business trips', () => {
    const suggestions = generatePackingSuggestions(
      { ...baseCtx, tripTheme: 'business conference' },
      USER_ID,
    )
    const clothing = suggestions.filter((s) => s.category === 'clothing')
    const names = clothing.map((s) => s.name)
    expect(names).toContain('Dress shoes')
    expect(names).toContain('Dress')
  })

  it('suggests sunscreen for hot/sunny weather', () => {
    const suggestions = generatePackingSuggestions(
      { ...baseCtx, weather: { forecast: [{ high: 90, low: 70, conditions: 'clear' }] } },
      USER_ID,
    )
    const toiletries = suggestions.filter((s) => s.category === 'toiletries')
    const names = toiletries.map((s) => s.name)
    expect(names).toContain('Sunscreen')
  })

  it('suggests bug spray for outdoor trips', () => {
    const suggestions = generatePackingSuggestions(
      { ...baseCtx, tripTheme: 'hiking' },
      USER_ID,
    )
    const toiletries = suggestions.filter((s) => s.category === 'toiletries')
    const names = toiletries.map((s) => s.name)
    expect(names).toContain('Bug spray')
  })

  it('suggests camera for longer trips or outdoor trips', () => {
    const longTrip = generatePackingSuggestions({ ...baseCtx, durationDays: 7 }, USER_ID)
    expect(longTrip.some((s) => s.name === 'Camera')).toBe(true)

    const outdoorTrip = generatePackingSuggestions({ ...baseCtx, tripTheme: 'hiking' }, USER_ID)
    expect(outdoorTrip.some((s) => s.name === 'Camera')).toBe(true)
  })

  it('suggests laundry bag for trips 5+ days', () => {
    const shortTrip = generatePackingSuggestions({ ...baseCtx, durationDays: 3 }, USER_ID)
    expect(shortTrip.some((s) => s.name === 'Laundry bag')).toBe(false)

    const longTrip = generatePackingSuggestions({ ...baseCtx, durationDays: 5 }, USER_ID)
    expect(longTrip.some((s) => s.name === 'Laundry bag')).toBe(true)
  })

  it('every suggestion has a reason', () => {
    const suggestions = generatePackingSuggestions({ ...baseCtx }, USER_ID)
    for (const s of suggestions) {
      expect(s.reason).toBeTruthy()
      expect(typeof s.reason).toBe('string')
      expect(s.reason.length).toBeGreaterThan(0)
    }
  })

  it('every suggestion has a valid category', () => {
    const validCategories = ['clothing', 'toiletries', 'electronics', 'documents', 'accessories', 'essentials']
    const suggestions = generatePackingSuggestions({ ...baseCtx }, USER_ID)
    for (const s of suggestions) {
      expect(validCategories).toContain(s.category)
    }
  })

  it('suggestions are sorted by category order then name', () => {
    const suggestions = generatePackingSuggestions({ ...baseCtx }, USER_ID)
    const categoryOrder: Record<string, number> = {
      essentials: 0, documents: 1, clothing: 2, toiletries: 3,
      electronics: 4, accessories: 5,
    }
    for (let i = 1; i < suggestions.length; i++) {
      const prev = suggestions[i - 1]!
      const curr = suggestions[i]!
      const prevOrder = categoryOrder[prev.category] ?? 99
      const currOrder = categoryOrder[curr.category] ?? 99
      if (prevOrder === currOrder) {
        expect(prev.name.localeCompare(curr.name)).toBeLessThanOrEqual(0)
      } else {
        expect(prevOrder).toBeLessThan(currOrder)
      }
    }
  })

  it('sets user_id from parameter', () => {
    const suggestions = generatePackingSuggestions({ ...baseCtx }, 'user-abc')
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.every((s) => s.user_id === 'user-abc')).toBe(true)
  })

  it('returns suggestions with status pending', () => {
    const suggestions = generatePackingSuggestions({ ...baseCtx }, USER_ID)
    expect(suggestions.every((s) => s.status === 'pending')).toBe(true)
  })

  it('handles missing weather gracefully', () => {
    const suggestions = generatePackingSuggestions({ ...baseCtx, weather: undefined }, USER_ID)
    expect(suggestions.length).toBeGreaterThan(0)
  })

  it('handles missing destination gracefully', () => {
    const suggestions = generatePackingSuggestions({ destination: '', durationDays: 1 }, USER_ID)
    expect(suggestions.length).toBeGreaterThan(0)
    // Should still have essentials
    expect(suggestions.some((s) => s.category === 'essentials')).toBe(true)
  })
})
