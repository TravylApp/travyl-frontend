import { describe, it, expect } from 'vitest'
import { computeDayIntelligence } from '../dayIntelligenceCompute'
import type { DayActivityRow } from '../dayIntelligenceTypes'
import type { PlaceDetails } from '../serpapi'

const BASE_DATE = '2026-03-27'

function makeActivity(overrides: Partial<DayActivityRow> & { id: string }): DayActivityRow {
  return {
    activity_name: 'Test Activity',
    latitude: 48.8566,
    longitude: 2.3522,
    starting_date: BASE_DATE,
    starting_time: '10:00:00',
    ending_time: '12:00:00',
    ...overrides,
  }
}

describe('computeDayIntelligence', () => {
  it('returns empty record for empty activities list', () => {
    const result = computeDayIntelligence([])
    expect(result).toEqual({})
  })

  it('single activity has no travel time or travel conflict', () => {
    const act = makeActivity({ id: 'act-1', activity_name: 'Eiffel Tower' })
    const result = computeDayIntelligence([act])

    expect(result['act-1']).toBeDefined()
    expect(result['act-1'].logistics.travelTimeMinutes).toBeNull()
    expect(result['act-1'].logistics.distanceKm).toBeNull()
    expect(result['act-1'].logistics.previousActivityName).toBeNull()
    expect(result['act-1'].conflicts.travelTime).toBe(false)
  })

  it('two activities with travel time conflict (gap < travel time)', () => {
    // Paris Eiffel Tower → Versailles (~20 km → ~30 min drive time)
    // Gap between activities is only 10 minutes → conflict
    const act1 = makeActivity({
      id: 'act-1',
      activity_name: 'Eiffel Tower',
      latitude: 48.8584,
      longitude: 2.2945,
      starting_time: '09:00:00',
      ending_time: '10:00:00',
    })
    const act2 = makeActivity({
      id: 'act-2',
      activity_name: 'Palace of Versailles',
      latitude: 48.8049,
      longitude: 2.1204,
      starting_time: '10:10:00',
      ending_time: '12:00:00',
    })

    const result = computeDayIntelligence([act1, act2])

    expect(result['act-2'].logistics.previousActivityName).toBe('Eiffel Tower')
    expect(result['act-2'].logistics.distanceKm).toBeGreaterThan(5)
    expect(result['act-2'].logistics.travelTimeMinutes).toBeGreaterThan(0)
    // Gap is 10 min, distance ~14 km → ~21 min drive → conflict
    expect(result['act-2'].conflicts.travelTime).toBe(true)
  })

  it('two activities without travel time conflict (gap > travel time)', () => {
    // Same location → 0 km distance → 0 min travel time → no conflict
    const act1 = makeActivity({
      id: 'act-1',
      activity_name: 'Cafe de Flore',
      latitude: 48.8534,
      longitude: 2.3334,
      starting_time: '08:00:00',
      ending_time: '09:00:00',
    })
    const act2 = makeActivity({
      id: 'act-2',
      activity_name: 'Nearby Bookshop',
      latitude: 48.8535,
      longitude: 2.3335,
      starting_time: '11:00:00',
      ending_time: '12:00:00',
    })

    const result = computeDayIntelligence([act1, act2])

    expect(result['act-2'].conflicts.travelTime).toBe(false)
  })

  it('activity with hours conflict from placeDetailsMap', () => {
    // Louvre closes at 18:00 — activity runs until 20:00 → hours conflict
    const act = makeActivity({
      id: 'act-1',
      activity_name: 'Louvre Museum',
      starting_date: '2026-03-27', // Friday
      starting_time: '16:00:00',
      ending_time: '20:00:00',
    })

    const placeDetails: PlaceDetails = {
      name: 'Louvre Museum',
      address: 'Rue de Rivoli, Paris',
      rating: 4.7,
      priceTier: '$$',
      photos: [],
      openingHours: [
        { day: 'Friday', opens: '09:00', closes: '18:00' },
      ],
    }

    const result = computeDayIntelligence([act], { 'act-1': placeDetails })

    expect(result['act-1'].place.name).toBe('Louvre Museum')
    expect(result['act-1'].conflicts.hours).toBe(true)
  })

  it('activity without hours conflict from placeDetailsMap', () => {
    // Museum open until 22:00 — activity ends at 19:00 → no conflict
    const act = makeActivity({
      id: 'act-1',
      activity_name: 'Orsay Museum',
      starting_date: '2026-03-27', // Friday
      starting_time: '17:00:00',
      ending_time: '19:00:00',
    })

    const placeDetails: PlaceDetails = {
      name: 'Orsay Museum',
      address: "Rue de la Légion d'Honneur, Paris",
      rating: 4.8,
      priceTier: '$$',
      photos: [],
      openingHours: [
        { day: 'Friday', opens: '09:30', closes: '22:00' },
      ],
    }

    const result = computeDayIntelligence([act], { 'act-1': placeDetails })

    expect(result['act-1'].conflicts.hours).toBe(false)
  })

  it('activity with lat/lng = 0 still processes correctly', () => {
    const act1 = makeActivity({
      id: 'act-1',
      activity_name: 'Unknown Place A',
      latitude: 0,
      longitude: 0,
      starting_time: '09:00:00',
      ending_time: '10:00:00',
    })
    const act2 = makeActivity({
      id: 'act-2',
      activity_name: 'Unknown Place B',
      latitude: 0,
      longitude: 0,
      starting_time: '11:00:00',
      ending_time: '12:00:00',
    })

    const result = computeDayIntelligence([act1, act2])

    expect(result['act-1']).toBeDefined()
    expect(result['act-2']).toBeDefined()
    // Same coords → 0 km distance
    expect(result['act-2'].logistics.distanceKm).toBeCloseTo(0, 5)
    expect(result['act-2'].logistics.travelTimeMinutes).toBe(0)
    // Stub place details used since no placeDetailsMap entry
    expect(result['act-2'].place.name).toBe('Unknown Place B')
    expect(result['act-2'].place.openingHours).toBeNull()
  })

  it('falls back to stub PlaceDetails when activity not in placeDetailsMap', () => {
    const act = makeActivity({ id: 'act-1', activity_name: 'Mystery Spot' })
    const result = computeDayIntelligence([act], {})

    expect(result['act-1'].place).toEqual({
      name: 'Mystery Spot',
      address: '',
      rating: null,
      priceTier: null,
      photos: [],
      openingHours: null,
    })
  })
})
