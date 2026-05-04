/**
 * @module useForkTrip
 * Provides a mutation to fork (duplicate) an existing trip into the current user's
 * account. After a successful fork, invalidates the trips list query so the new
 * trip appears immediately, and also pre-warms the cache for the forked trip's
 * individual query key.
 * Used by the trip detail page's "Fork Trip" / "Save a Copy" action on both web and mobile.
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { forkTrip } from '../services/api';
import type { Trip } from '../types';

/** Parameters accepted by the `useForkTrip` mutation function. */
interface ForkTripVariables {
  tripId: string;
}

/**
 * Returns a React Query mutation for forking a trip.
 *
 * On success, invalidates the `['trips']` list query and the individual
 * `['trip', newTrip.id]` query so both the list and any preloaded detail
 * caches reflect the new copy.
 *
 * @returns A `UseMutationResult<Trip, Error, ForkTripVariables>` — call
 *   `.mutate({ tripId })` or `.mutateAsync({ tripId })` to trigger the fork.
 *
 * @example
 * ```tsx
 * const forkMutation = useForkTrip();
 * forkMutation.mutate({ tripId: trip.id });
 * // After success: router.push(`/trips/${forkMutation.data?.id}`)
 * ```
 */
export function useForkTrip() {
  const queryClient = useQueryClient();

  return useMutation<Trip, Error, ForkTripVariables>({
    mutationFn: ({ tripId }) => forkTrip(tripId),
    onSuccess: (newTrip) => {
      // Invalidate trips list to show the new forked trip
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      // Also invalidate any cached data for the new trip
      queryClient.invalidateQueries({ queryKey: ['trip', newTrip.id] });
    },
  });
}
