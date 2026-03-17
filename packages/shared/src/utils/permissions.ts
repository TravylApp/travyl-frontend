import type { Trip } from '../types';

/**
 * Check if a user can edit a trip.
 * Users can edit if they are the owner, or if they have editor access via share link.
 */
export function canEditTrip(trip: Trip, userId: string | null): boolean {
  if (!userId) return false;
  if (trip.user_id === userId) return true;
  if (trip.share_link_role === 'editor' && trip.is_shared) return true;
  return false;
}

/**
 * Check if a user can fork a trip.
 * Users can fork if: trip is public OR shared, and user is not the owner.
 */
export function canForkTrip(trip: Trip, userId: string | null): boolean {
  // Can't fork own trip
  if (userId && trip.user_id === userId) return false;

  // Can fork if trip is public
  if (trip.is_public) return true;

  // Can fork if trip is shared (has a share token)
  if (trip.is_shared && trip.share_link_token) return true;

  return false;
}

/**
 * Check if a user owns a trip.
 */
export function isTripOwner(trip: Trip, userId: string | null): boolean {
  if (!userId) return false;
  return trip.user_id === userId;
}

/**
 * Check if a trip can be made public.
 * Only owners can make their trips public.
 */
export function canMakePublic(trip: Trip, userId: string | null): boolean {
  return isTripOwner(trip, userId);
}

/**
 * Check if a trip is viewable by a user.
 * Users can view if they own it, it's public, or it's shared.
 */
export function canViewTrip(trip: Trip, userId: string | null): boolean {
  // Owner can always view
  if (isTripOwner(trip, userId)) return true;

  // Public trips are viewable by everyone
  if (trip.is_public) return true;

  // Shared trips are viewable
  if (trip.is_shared) return true;

  return false;
}
