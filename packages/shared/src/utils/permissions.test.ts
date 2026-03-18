import { describe, it, expect } from 'vitest'
import { canEditTrip, canViewTrip, canForkTrip, isTripOwner, canMakePublic } from './permissions'
import type { Trip } from '../types'

const baseTripFields = {
  id: 'trip-1',
  user_id: 'owner-1',
  title: 'Test Trip',
  destination: 'Paris',
  start_date: '2026-06-01',
  end_date: '2026-06-07',
  status: 'planning' as const,
  created_at: '',
  updated_at: '',
  budget: 0,
  currency: 'USD',
  travelers: 1,
  trip_context: {},
  is_generated: false,
  share_link_token: 'abc123',
  forked_from_trip_id: null,
  fork_count: 0,
  theme: 'navy',
  custom_theme_color: null,
}

const privateTrip: Trip = { ...baseTripFields, visibility: 'private', link_permission: 'viewer' }
const linkTrip: Trip = { ...baseTripFields, visibility: 'link', link_permission: 'editor' }
const publicTrip: Trip = { ...baseTripFields, visibility: 'public', link_permission: 'viewer' }

describe('isTripOwner', () => {
  it('returns true for owner', () => { expect(isTripOwner(privateTrip, 'owner-1')).toBe(true) })
  it('returns false for non-owner', () => { expect(isTripOwner(privateTrip, 'other-user')).toBe(false) })
})

describe('canViewTrip', () => {
  it('owner can always view', () => { expect(canViewTrip(privateTrip, 'owner-1')).toBe(true) })
  it('non-owner cannot view private trip', () => { expect(canViewTrip(privateTrip, 'other-user')).toBe(false) })
  it('non-owner can view link trip', () => { expect(canViewTrip(linkTrip, 'other-user')).toBe(true) })
  it('non-owner can view public trip', () => { expect(canViewTrip(publicTrip, 'other-user')).toBe(true) })
})

describe('canEditTrip', () => {
  it('owner can always edit', () => { expect(canEditTrip(privateTrip, 'owner-1')).toBe(true) })
  it('non-owner cannot edit private trip', () => { expect(canEditTrip(privateTrip, 'other-user')).toBe(false) })
  it('non-owner can edit link trip with editor permission', () => { expect(canEditTrip(linkTrip, 'other-user')).toBe(true) })
  it('non-owner cannot edit public trip with viewer permission', () => { expect(canEditTrip(publicTrip, 'other-user')).toBe(false) })
})

describe('canForkTrip', () => {
  it('cannot fork own trip', () => { expect(canForkTrip(publicTrip, 'owner-1')).toBe(false) })
  it('can fork public trip', () => { expect(canForkTrip(publicTrip, 'other-user')).toBe(true) })
  it('cannot fork private trip', () => { expect(canForkTrip(privateTrip, 'other-user')).toBe(false) })
  it('cannot fork link trip', () => { expect(canForkTrip(linkTrip, 'other-user')).toBe(false) })
})

describe('canMakePublic', () => {
  it('owner can make public', () => { expect(canMakePublic(privateTrip, 'owner-1')).toBe(true) })
  it('non-owner cannot make public', () => { expect(canMakePublic(privateTrip, 'other-user')).toBe(false) })
})
