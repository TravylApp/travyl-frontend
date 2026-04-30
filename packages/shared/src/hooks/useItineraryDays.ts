/**
 * @module useItineraryDays
 * Thin React Query wrapper around the `fetchItineraryDays` API call.
 * Returns the raw `ItineraryDay[]` rows from the `trip_days` and
 * `trip_activities` tables for a given trip.
 * Consumed by `useItineraryScreen`, `useTripBudget`, and any component
 * that needs the day-by-day itinerary data without extra view-model transforms.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchItineraryDays } from '../services/api';

/**
 * Fetches the itinerary days (with nested activities) for a trip.
 * The query is disabled while `tripId` is undefined, preventing spurious requests.
 *
 * @param tripId - UUID of the trip, or undefined while routing/loading
 * @returns A React Query result containing an array of `ItineraryDay` objects
 *
 * @example
 * ```tsx
 * const { data: days = [], isLoading } = useItineraryDays(tripId);
 * ```
 */
export function useItineraryDays(tripId: string | undefined) {
  return useQuery({
    queryKey: ['itinerary-days', tripId],
    queryFn: () => fetchItineraryDays(tripId!),
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000,
  });
}
