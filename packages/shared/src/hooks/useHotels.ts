/**
 * @module useHotels
 * Fetches the saved hotel bookings associated with a specific trip from the Travyl backend.
 * Delegates to `fetchHotels` from the shared API service.
 * Used by trip detail pages to display itinerary hotel cards.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchHotels } from '../services/api';

/**
 * Fetches saved hotel records for a given trip.
 * The query is skipped when tripId is undefined.
 * @param tripId - Travyl trip UUID; pass undefined to skip the query
 * @returns React Query result with the array of hotel records for the trip
 * @example
 * ```tsx
 * const { data: hotels } = useHotels(tripId);
 * hotels?.map(h => <HotelCard key={h.id} hotel={h} />);
 * ```
 */
export function useHotels(tripId: string | undefined) {
  return useQuery({
    queryKey: ['hotels', tripId],
    queryFn: () => fetchHotels(tripId!),
    enabled: !!tripId,
  });
}
