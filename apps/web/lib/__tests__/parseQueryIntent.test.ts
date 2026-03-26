import { describe, it, expect, vi } from 'vitest'
import { parseQueryIntentSync } from '../parseQueryIntent'

describe('parseQueryIntentSync — Pattern 1: trip to X', () => {
  it('matches "trip to paris"', () => {
    const r = parseQueryIntentSync('trip to paris')
    expect(r?.intent).toBe('create-trip')
    expect(r?.location).toBe('Paris')
  })

  it('matches "trip to new york"', () => {
    const r = parseQueryIntentSync('trip to new york')
    expect(r?.intent).toBe('create-trip')
    expect(r?.location).toBe('New York')
  })

  it('is case-insensitive', () => {
    const r = parseQueryIntentSync('TRIP TO LONDON')
    expect(r?.intent).toBe('create-trip')
    expect(r?.location).toBe('London')
  })
})

describe('parseQueryIntentSync — Pattern 2: new/create trip', () => {
  it('matches "new trip"', () => {
    const r = parseQueryIntentSync('new trip')
    expect(r?.intent).toBe('create-trip')
    expect(r?.location).toBeUndefined()
  })

  it('matches "create trip"', () => {
    const r = parseQueryIntentSync('create trip')
    expect(r?.intent).toBe('create-trip')
  })
})

describe('parseQueryIntentSync — Pattern 3: [entity] in [city]', () => {
  it('matches "restaurants in bakersfield"', () => {
    const r = parseQueryIntentSync('restaurants in bakersfield')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('restaurant')
    expect(r?.location).toBe('Bakersfield')
  })

  it('matches "food in chicago"', () => {
    const r = parseQueryIntentSync('food in chicago')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('restaurant')
    expect(r?.location).toBe('Chicago')
  })

  it('matches "hotels in miami"', () => {
    const r = parseQueryIntentSync('hotels in miami')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('hotel')
    expect(r?.location).toBe('Miami')
  })

  it('matches "flights in denver"', () => {
    const r = parseQueryIntentSync('flights in denver')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('flight')
    expect(r?.location).toBe('Denver')
  })

  it('matches "attractions in rome"', () => {
    const r = parseQueryIntentSync('attractions in rome')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('activity')
    expect(r?.location).toBe('Rome')
  })
})

describe('parseQueryIntentSync — Pattern 4: things to do in [city]', () => {
  it('matches "things to do in nyc"', () => {
    const r = parseQueryIntentSync('things to do in nyc')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('activity')
    expect(r?.location).toBe('Nyc')
  })

  it('matches "thing to do in seattle"', () => {
    const r = parseQueryIntentSync('thing to do in seattle')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('activity')
    expect(r?.location).toBe('Seattle')
  })

  it('does NOT misclassify as route (priority over Pattern 6)', () => {
    const r = parseQueryIntentSync('things to do in nyc')
    expect(r?.intent).not.toBe('route')
  })
})

describe('parseQueryIntentSync — Pattern 5: [city] [entity]', () => {
  it('matches "bakersfield restaurants"', () => {
    const r = parseQueryIntentSync('bakersfield restaurants')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('restaurant')
    expect(r?.location).toBe('Bakersfield')
  })

  it('matches "miami hotels"', () => {
    const r = parseQueryIntentSync('miami hotels')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('hotel')
    expect(r?.location).toBe('Miami')
  })

  it('matches "london flights"', () => {
    const r = parseQueryIntentSync('london flights')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('flight')
    expect(r?.location).toBe('London')
  })

  it('matches "paris museums"', () => {
    const r = parseQueryIntentSync('paris museums')
    expect(r?.intent).toBe('entity-search')
    expect(r?.entityType).toBe('activity')
    expect(r?.location).toBe('Paris')
  })
})

describe('parseQueryIntentSync — Pattern 6: X to Y (route)', () => {
  it('matches "la to sf"', () => {
    const r = parseQueryIntentSync('la to sf')
    expect(r?.intent).toBe('route')
    expect(r?.location).toBe('Sf')
  })

  it('matches "new york to boston"', () => {
    const r = parseQueryIntentSync('new york to boston')
    expect(r?.intent).toBe('route')
    expect(r?.location).toBe('Boston')
  })
})

describe('parseQueryIntentSync — Pattern 7: bare single-word location', () => {
  it('matches a single city name', () => {
    const r = parseQueryIntentSync('bakersfield')
    expect(r?.intent).toBe('discover')
    expect(r?.location).toBe('Bakersfield')
  })

  it('matches another single city name', () => {
    const r = parseQueryIntentSync('paris')
    expect(r?.intent).toBe('discover')
    expect(r?.location).toBe('Paris')
  })
})

describe('parseQueryIntentSync — no match → null (Phase 2)', () => {
  it('returns null for "good vibes only" (multi-word, no pattern)', () => {
    expect(parseQueryIntentSync('good vibes only')).toBeNull()
  })

  it('returns null for "somewhere to eat in bakersfield"', () => {
    expect(parseQueryIntentSync('somewhere to eat in bakersfield')).toBeNull()
  })
})

describe('parseQueryIntentSync — rawQuery is always preserved', () => {
  it('preserves the original raw query', () => {
    const r = parseQueryIntentSync('restaurants in Bakersfield')
    expect(r?.rawQuery).toBe('restaurants in Bakersfield')
  })
})

describe('parseQueryIntent (async) — Phase 2 not called when Phase 1 matches', () => {
  it('does not call fetch when Phase 1 matches', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
    const { parseQueryIntent } = await import('../parseQueryIntent')
    await parseQueryIntent('bakersfield restaurants', 'test-token')
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
