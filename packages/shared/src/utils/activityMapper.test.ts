import { describe, it, expect } from 'vitest'
import {
  parseTime,
  hourToTime,
  clampTime,
  hoursBetween,
  daysBetween,
  addDays,
} from './activityMapper'

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
