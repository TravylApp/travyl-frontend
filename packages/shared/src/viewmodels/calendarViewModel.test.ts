import { describe, it, expect } from 'vitest'
import { getActivityColor, computeTimeRange, activityToCalendarActivity, calendarActivityToUpdate } from './calendarViewModel'
import type { Activity } from '../types'

describe('getActivityColor', () => {
  it('returns correct color for known types', () => {
    expect(getActivityColor('sightseeing')).toBe('#003594')
    expect(getActivityColor('dining')).toBe('#D97706')
  })
  it('returns fallback for unknown types', () => {
    expect(getActivityColor('unknown_category')).toBe('#6b7280')
  })
})

describe('computeTimeRange', () => {
  it('returns default range when no activities', () => {
    expect(computeTimeRange([])).toEqual({ startHour: 7, endHour: 23 })
  })
  it('expands range for early activities', () => {
    const activities = [{ startHour: 5, duration: 1 }]
    expect(computeTimeRange(activities as any)).toEqual({ startHour: 4, endHour: 23 })
  })
  it('expands range for late activities', () => {
    const activities = [{ startHour: 22, duration: 3 }]
    expect(computeTimeRange(activities as any)).toEqual({ startHour: 7, endHour: 26 })
  })
})

describe('activityToCalendarActivity', () => {
  const mockActivity: Activity = {
    id: 'act-1',
    itinerary_day_id: 'day-2',
    trip_id: 'trip-1',
    name: 'Eiffel Tower',
    category: 'sightseeing',
    location_name: 'Champ de Mars',
    latitude: 48.8584,
    longitude: 2.2945,
    start_time: '09:30',
    end_time: '11:30',
    estimated_cost: 26.10,
    currency: 'USD',
    sort_order: null,
    booking_url: null,
    notes: 'Book skip-the-line',
    source: 'user',
    created_at: '2024-01-01T00:00:00Z',
  }

  it('passes dayIndex through as day', () => {
    const result = activityToCalendarActivity(mockActivity, 1)
    expect(result.day).toBe(1)
  })
  it('parses start_time to numeric startHour', () => {
    const result = activityToCalendarActivity(mockActivity, 0)
    expect(result.startHour).toBe(9.5)
  })
  it('computes duration from start and end times', () => {
    const result = activityToCalendarActivity(mockActivity, 0)
    expect(result.duration).toBe(2)
  })
  it('formats estimated_cost to price string', () => {
    const result = activityToCalendarActivity(mockActivity, 0)
    expect(result.price).toBe('$26.10')
  })
})

describe('calendarActivityToUpdate', () => {
  it('converts startHour back to time string', () => {
    const calActivity = { id: 'act-1', title: 'Eiffel Tower', type: 'sightseeing', day: 0, startHour: 9.5, duration: 2 }
    const result = calendarActivityToUpdate(calActivity)
    expect(result.start_time).toBe('09:30')
    expect(result.end_time).toBe('11:30')
  })
  it('converts whole hours correctly', () => {
    const calActivity = { id: 'act-1', title: 'Test', type: 'tour', day: 0, startHour: 14, duration: 1.5 }
    const result = calendarActivityToUpdate(calActivity)
    expect(result.start_time).toBe('14:00')
    expect(result.end_time).toBe('15:30')
  })
})
