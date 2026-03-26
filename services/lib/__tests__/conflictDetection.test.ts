import { describe, it, expect } from 'vitest'
import { hasHoursConflict, hasTravelTimeConflict } from '../conflictDetection'

const hours = [{ day: 'Monday', opens: '09:00', closes: '17:00' }]

describe('hasHoursConflict', () => {
  it('no conflict when within hours', () => {
    expect(hasHoursConflict(hours, 'Monday', '10:00', '12:00')).toBe(false)
  })

  it('conflict when activity ends after closing', () => {
    expect(hasHoursConflict(hours, 'Monday', '10:00', '18:00')).toBe(true)
  })

  it('conflict when activity starts before opening', () => {
    expect(hasHoursConflict(hours, 'Monday', '08:00', '10:00')).toBe(true)
  })

  it('no hours conflict when openingHours is null', () => {
    expect(hasHoursConflict(null, 'Monday', '10:00', '12:00')).toBe(false)
  })
})

describe('hasTravelTimeConflict', () => {
  it('travel time conflict: gap shorter than travel', () => {
    expect(hasTravelTimeConflict('14:00', '14:10', 20)).toBe(true)
  })

  it('no travel time conflict: gap longer than travel', () => {
    expect(hasTravelTimeConflict('14:00', '15:00', 20)).toBe(false)
  })

  it('no conflict when prevEndTime is null', () => {
    expect(hasTravelTimeConflict(null, '14:00', 20)).toBe(false)
  })
})
