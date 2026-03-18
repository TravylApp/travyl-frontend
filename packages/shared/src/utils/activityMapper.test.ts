import { describe, it, expect } from 'vitest'
import {
  parseTime,
  hourToTime,
  clampTime,
  hoursBetween,
  daysBetween,
  addDays,
  mapToDbType,
  toCalendarActivity,
  toActivityRow,
} from './activityMapper'
import type { ActivityRow } from './activityMapper'
import type { CalendarActivity } from '../types'

describe('parseTime', () => {
  it('converts "14:30" to 14.5', () => { expect(parseTime('14:30')).toBe(14.5) })
  it('converts "09:00" to 9', () => { expect(parseTime('09:00')).toBe(9) })
  it('converts "00:00" to 0', () => { expect(parseTime('00:00')).toBe(0) })
  it('converts "23:45" to 23.75', () => { expect(parseTime('23:45')).toBe(23.75) })
})

describe('hourToTime', () => {
  it('converts 14.5 to "14:30"', () => { expect(hourToTime(14.5)).toBe('14:30') })
  it('converts 9 to "09:00"', () => { expect(hourToTime(9)).toBe('09:00') })
  it('converts 0 to "00:00"', () => { expect(hourToTime(0)).toBe('00:00') })
  it('converts 23.75 to "23:45"', () => { expect(hourToTime(23.75)).toBe('23:45') })
})

describe('clampTime', () => {
  it('passes through valid times', () => { expect(clampTime('14:30')).toBe('14:30') })
  it('clamps times >= 24:00 to 23:59', () => {
    expect(clampTime('24:00')).toBe('23:59')
    expect(clampTime('25:30')).toBe('23:59')
  })
  it('passes through 23:59', () => { expect(clampTime('23:59')).toBe('23:59') })
})

describe('hoursBetween', () => {
  it('computes difference between two time strings', () => { expect(hoursBetween('09:00', '11:30')).toBe(2.5) })
  it('returns 0 for same times', () => { expect(hoursBetween('14:00', '14:00')).toBe(0) })
})

describe('daysBetween', () => {
  it('computes day offset between two ISO date strings', () => { expect(daysBetween('2026-03-10', '2026-03-13')).toBe(3) })
  it('returns 0 for same date', () => { expect(daysBetween('2026-03-10', '2026-03-10')).toBe(0) })
})

describe('addDays', () => {
  it('adds days to an ISO date string', () => { expect(addDays('2026-03-10', 3)).toBe('2026-03-13') })
  it('handles month boundaries', () => { expect(addDays('2026-03-30', 3)).toBe('2026-04-02') })
  it('adds 0 days returns same date', () => { expect(addDays('2026-03-10', 0)).toBe('2026-03-10') })
})

describe('mapToDbType', () => {
  it('maps hotel to hotel', () => { expect(mapToDbType('hotel')).toBe('hotel') })
  it('maps flight to airport', () => { expect(mapToDbType('flight')).toBe('airport') })
  it('maps transport to airport', () => { expect(mapToDbType('transport')).toBe('airport') })
  it('maps dining to food', () => { expect(mapToDbType('dining')).toBe('food') })
  it('maps cafe to food', () => { expect(mapToDbType('cafe')).toBe('food') })
  it('maps hiking to nature', () => { expect(mapToDbType('hiking')).toBe('nature') })
  it('maps beach to nature', () => { expect(mapToDbType('beach')).toBe('nature') })
  it('maps theme park to amusement park', () => { expect(mapToDbType('theme park')).toBe('amusement park') })
  it('maps unknown types to other', () => {
    expect(mapToDbType('museum')).toBe('other')
    expect(mapToDbType('sightseeing')).toBe('other')
    expect(mapToDbType('nightlife')).toBe('other')
  })
})

describe('toCalendarActivity', () => {
  const baseRow: ActivityRow = {
    id: 'abc-123', trip_id: 'trip-1', user_id: 'user-1',
    activity_name: 'Eiffel Tower',
    starting_date: '2026-03-12', ending_date: '2026-03-12',
    starting_time: '09:00', ending_time: '11:30',
    activity_type: 'other', estimated_cost: 25,
    latitude: 48.8584, longitude: 2.2945,
    currency: 'EUR', notes: 'Bring camera', sort_order: 1,
    activity_data: { category: 'sightseeing', location_name: 'Eiffel Tower, Paris', image_url: 'https://example.com/eiffel.jpg', rating: 4.5 },
    created_at: '2026-03-10T00:00:00Z', updated_at: '2026-03-10T00:00:00Z',
  }

  it('maps basic fields correctly', () => {
    const result = toCalendarActivity(baseRow, '2026-03-10')
    expect(result.id).toBe('abc-123')
    expect(result.title).toBe('Eiffel Tower')
    expect(result.day).toBe(2)
    expect(result.endDay).toBe(2)
    expect(result.startHour).toBe(9)
    expect(result.duration).toBe(2.5)
    expect(result.notes).toBe('Bring camera')
    expect(result.price).toBe('25')
    expect(result.latitude).toBe(48.8584)
    expect(result.longitude).toBe(2.2945)
    expect(result.sortOrder).toBe(1)
  })

  it('reads category from activity_data.category first', () => {
    const result = toCalendarActivity(baseRow, '2026-03-10')
    expect(result.type).toBe('sightseeing')
  })

  it('falls back to activity_type when no category in activity_data', () => {
    const row = { ...baseRow, activity_data: {} }
    const result = toCalendarActivity(row, '2026-03-10')
    expect(result.type).toBe('other')
  })

  it('reads location, image, rating from activity_data', () => {
    const result = toCalendarActivity(baseRow, '2026-03-10')
    expect(result.location).toBe('Eiffel Tower, Paris')
    expect(result.image).toBe('https://example.com/eiffel.jpg')
    expect(result.rating).toBe(4.5)
  })

  it('handles multi-day activities', () => {
    const row = { ...baseRow, ending_date: '2026-03-14' }
    const result = toCalendarActivity(row, '2026-03-10')
    expect(result.day).toBe(2)
    expect(result.endDay).toBe(4)
  })
})

describe('toActivityRow', () => {
  const baseCal: CalendarActivity = {
    id: 'abc-123', title: 'Eiffel Tower', type: 'sightseeing',
    day: 2, startHour: 9, duration: 2.5,
    location: 'Eiffel Tower, Paris', image: 'https://example.com/eiffel.jpg',
    rating: 4.5, price: '25', notes: 'Bring camera',
    latitude: 48.8584, longitude: 2.2945, sortOrder: 1,
  }

  it('maps basic fields correctly', () => {
    const result = toActivityRow(baseCal, 'trip-1', 'user-1', '2026-03-10')
    expect(result.id).toBe('abc-123')
    expect(result.trip_id).toBe('trip-1')
    expect(result.user_id).toBe('user-1')
    expect(result.activity_name).toBe('Eiffel Tower')
    expect(result.activity_type).toBe('other')
    expect(result.starting_date).toBe('2026-03-12')
    expect(result.ending_date).toBe('2026-03-12')
    expect(result.starting_time).toBe('09:00')
    expect(result.ending_time).toBe('11:30')
    expect(result.estimated_cost).toBe(25)
    expect(result.notes).toBe('Bring camera')
    expect(result.latitude).toBe(48.8584)
    expect(result.longitude).toBe(2.2945)
    expect(result.sort_order).toBe(1)
  })

  it('stores category in activity_data', () => {
    const result = toActivityRow(baseCal, 'trip-1', 'user-1', '2026-03-10')
    expect(result.activity_data.category).toBe('sightseeing')
    expect(result.activity_data.location_name).toBe('Eiffel Tower, Paris')
    expect(result.activity_data.image_url).toBe('https://example.com/eiffel.jpg')
    expect(result.activity_data.rating).toBe(4.5)
  })

  it('defaults latitude/longitude to 0 when not provided', () => {
    const cal = { ...baseCal, latitude: undefined, longitude: undefined }
    const result = toActivityRow(cal, 'trip-1', 'user-1', '2026-03-10')
    expect(result.latitude).toBe(0)
    expect(result.longitude).toBe(0)
  })

  it('defaults sortOrder to 0 when not provided', () => {
    const cal = { ...baseCal, sortOrder: undefined }
    const result = toActivityRow(cal, 'trip-1', 'user-1', '2026-03-10')
    expect(result.sort_order).toBe(0)
  })

  it('clamps ending_time to 23:59 when duration crosses midnight', () => {
    const cal = { ...baseCal, startHour: 23, duration: 2 }
    const result = toActivityRow(cal, 'trip-1', 'user-1', '2026-03-10')
    expect(result.ending_time).toBe('23:59')
  })

  it('handles multi-day via endDay', () => {
    const cal = { ...baseCal, endDay: 5 }
    const result = toActivityRow(cal, 'trip-1', 'user-1', '2026-03-10')
    expect(result.ending_date).toBe('2026-03-15')
  })

  it('defaults estimated_cost to 0 when price is undefined', () => {
    const cal = { ...baseCal, price: undefined }
    const result = toActivityRow(cal, 'trip-1', 'user-1', '2026-03-10')
    expect(result.estimated_cost).toBe(0)
  })
})
