import { describe, it, expect } from 'vitest'
import { haversineDistance, driveTimeMinutes } from '../haversine'

describe('haversineDistance', () => {
  it('same point is 0', () => {
    expect(haversineDistance(48.8566, 2.3522, 48.8566, 2.3522)).toBeCloseTo(0)
  })

  it('Paris to London is roughly 340km', () => {
    const d = haversineDistance(48.8566, 2.3522, 51.5074, -0.1278)
    expect(d).toBeGreaterThan(330)
    expect(d).toBeLessThan(350)
  })
})

describe('driveTimeMinutes', () => {
  it('20km at 40km/h = 30min', () => {
    expect(driveTimeMinutes(20)).toBe(30)
  })
})
