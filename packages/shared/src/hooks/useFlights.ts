/**
 * @module useFlights
 * Fetches the saved flight bookings associated with a specific trip from the Travyl backend.
 * Delegates to `fetchFlights` from the shared API service.
 * Used by trip detail pages to display itinerary flight cards.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchFlights } from '../services/api';

/**
 * Fetches saved flight records for a given trip.
 * The query is skipped when tripId is undefined.
 * @param tripId - Travyl trip UUID; pass undefined to skip the query
 * @returns React Query result with the array of flight records for the trip
 * @example
 * ```tsx
 * const { data: flights } = useFlights(tripId);
 * flights?.map(f => <FlightCard key={f.id} flight={f} />);
 * ```
 */
export function useFlights(tripId: string | undefined) {
  return useQuery({
    queryKey: ['flights', tripId],
    queryFn: () => fetchFlights(tripId!),
    enabled: !!tripId,
  });
}
