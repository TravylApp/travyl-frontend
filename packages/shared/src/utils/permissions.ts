import type { Trip } from '../types'

export function isTripOwner(trip: Trip, userId: string | null): boolean {
  if (!userId) return false
  return trip.user_id === userId
}

export function canViewTrip(trip: Trip, userId: string | null): boolean {
  if (isTripOwner(trip, userId)) return true
  return trip.visibility !== 'private'
}

export function canEditTrip(trip: Trip, userId: string | null): boolean {
  if (isTripOwner(trip, userId)) return true
  if (trip.visibility === 'private') return false
  return trip.link_permission === 'editor'
}

export function canForkTrip(trip: Trip, userId: string | null): boolean {
  if (!userId) return false
  if (isTripOwner(trip, userId)) return false
  return trip.visibility !== 'private'
}

export function canMakePublic(trip: Trip, userId: string | null): boolean {
  return isTripOwner(trip, userId)
}
