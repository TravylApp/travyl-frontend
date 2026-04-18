/**
 * @module permissions
 * Trip permission checks based on ownership, visibility, and link_permission settings.
 * All functions are pure — they derive permissions from the trip's DB fields and a
 * caller-supplied userId without any network calls.
 *
 * Visibility model:
 * - `"private"`: only the owner can view or edit
 * - `"public"` / `"unlisted"`: any authenticated user can view; editors are
 *   determined by `link_permission === "editor"`
 *
 * These helpers are re-exported from `utils/index.ts` for convenience.
 */

import type { Trip } from '../types'

/**
 * Returns true if the given user is the owner of the trip.
 * Null/undefined userId always returns false.
 *
 * @param trip - The trip record from Supabase
 * @param userId - The authenticated user's UUID, or null if unauthenticated
 * @returns `true` if `trip.user_id === userId`
 */
export function isTripOwner(trip: Trip, userId: string | null): boolean {
  if (!userId) return false
  return trip.user_id === userId
}

/**
 * Returns true if the given user can view the trip.
 * Owners can always view. Non-owners can view public or unlisted trips.
 *
 * @param trip - The trip record from Supabase
 * @param userId - The authenticated user's UUID, or null if unauthenticated
 * @returns `true` if the user is the owner, or the trip is not private
 */
export function canViewTrip(trip: Trip, userId: string | null): boolean {
  if (isTripOwner(trip, userId)) return true
  return trip.visibility !== 'private'
}

/**
 * Returns true if the given user can edit the trip.
 * Owners can always edit. Non-owners can edit only if the trip is not private
 * and `link_permission` is set to `"editor"`.
 *
 * @param trip - The trip record from Supabase
 * @param userId - The authenticated user's UUID, or null if unauthenticated
 * @returns `true` if the user has edit permission
 */
export function canEditTrip(trip: Trip, userId: string | null): boolean {
  if (isTripOwner(trip, userId)) return true
  if (trip.visibility === 'private') return false
  return trip.link_permission === 'editor'
}

/**
 * Returns true if the given user can fork (duplicate) the trip.
 * Forking requires the user to be authenticated and not be the owner.
 * Private trips cannot be forked.
 *
 * @param trip - The trip record from Supabase
 * @param userId - The authenticated user's UUID, or null if unauthenticated
 * @returns `true` if the user can fork the trip
 */
export function canForkTrip(trip: Trip, userId: string | null): boolean {
  if (!userId) return false
  if (isTripOwner(trip, userId)) return false
  return trip.visibility !== 'private'
}

/**
 * Returns true if the given user can change the trip's visibility to public.
 * Only the trip owner can update visibility.
 *
 * @param trip - The trip record from Supabase
 * @param userId - The authenticated user's UUID, or null if unauthenticated
 * @returns `true` if the user is the trip owner
 */
export function canMakePublic(trip: Trip, userId: string | null): boolean {
  return isTripOwner(trip, userId)
}
