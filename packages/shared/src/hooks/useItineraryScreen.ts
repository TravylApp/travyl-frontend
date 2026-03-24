import { useState, useMemo, useCallback } from 'react';
import { useTrip } from './useTrip';
import { useItineraryDays } from './useItineraryDays';
import { useFlights } from './useFlights';
import { useHotels } from './useHotels';
import {
  buildItineraryDayViewModel,
  buildFlightViewModel,
  buildHotelViewModel,
} from '../viewmodels/itineraryViewModel';
import { buildBudgetSummary } from '../viewmodels/budgetViewModel';

export function useItineraryScreen(tripId: string | undefined) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const tripQuery = useTrip(tripId);
  const daysQuery = useItineraryDays(tripId);
  const flightsQuery = useFlights(tripId);
  const hotelsQuery = useHotels(tripId);

  const days = useMemo(
    () => (daysQuery.data ?? []).map(buildItineraryDayViewModel),
    [daysQuery.data],
  );

  const flights = useMemo(
    () => (flightsQuery.data ?? []).map(buildFlightViewModel),
    [flightsQuery.data],
  );

  const hotels = useMemo(
    () => (hotelsQuery.data ?? []).map(buildHotelViewModel),
    [hotelsQuery.data],
  );

  const budget = useMemo(
    () => buildBudgetSummary(
      daysQuery.data ?? [],
      flightsQuery.data ?? [],
      hotelsQuery.data ?? [],
      tripQuery.data?.currency ?? 'USD',
    ),
    [daysQuery.data, flightsQuery.data, hotelsQuery.data, tripQuery.data?.currency],
  );

  const isLoading =
    (tripQuery.isLoading && !tripQuery.error) ||
    (daysQuery.isLoading && !daysQuery.error);

  const trip = tripQuery.data ?? null;
  const isEmpty = !isLoading && days.length === 0 && flights.length === 0 && hotels.length === 0;

  const refetch = useCallback(() => {
    tripQuery.refetch();
    daysQuery.refetch();
    flightsQuery.refetch();
    hotelsQuery.refetch();
  }, [tripQuery, daysQuery, flightsQuery, hotelsQuery]);

  return {
    trip,
    days,
    selectedDayIndex,
    setSelectedDayIndex,
    selectedDay: days[selectedDayIndex] ?? null,
    flights,
    hotels,
    budget,
    isLoading,
    refetch,
    error: tripQuery.error || daysQuery.error,
    isEmpty,
  };
}
