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

  const dayViewModels = useMemo(
    () => (daysQuery.data ?? []).map(buildItineraryDayViewModel),
    [daysQuery.data],
  );

  const flightViewModels = useMemo(
    () => (flightsQuery.data ?? []).map(buildFlightViewModel),
    [flightsQuery.data],
  );

  const hotelViewModels = useMemo(
    () => (hotelsQuery.data ?? []).map(buildHotelViewModel),
    [hotelsQuery.data],
  );

  const budgetSummary = useMemo(
    () => buildBudgetSummary(
      daysQuery.data ?? [],
      flightsQuery.data ?? [],
      hotelsQuery.data ?? [],
      tripQuery.data?.currency ?? 'USD',
    ),
    [daysQuery.data, flightsQuery.data, hotelsQuery.data, tripQuery.data?.currency],
  );

  const isStillLoading =
    (tripQuery.isLoading && !tripQuery.error) ||
    (daysQuery.isLoading && !daysQuery.error);

  const hasRealData = dayViewModels.length > 0 || flightViewModels.length > 0 || hotelViewModels.length > 0;

  const refetch = useCallback(() => {
    tripQuery.refetch();
    daysQuery.refetch();
    flightsQuery.refetch();
    hotelsQuery.refetch();
  }, [tripQuery, daysQuery, flightsQuery, hotelsQuery]);

  return {
    trip: tripQuery.data ?? null,
    days: dayViewModels,
    selectedDayIndex,
    setSelectedDayIndex,
    selectedDay: dayViewModels[selectedDayIndex] ?? null,
    flights: flightViewModels,
    hotels: hotelViewModels,
    budget: budgetSummary,
    isLoading: isStillLoading,
    refetch,
    error: tripQuery.error || daysQuery.error,
    isEmpty: !isStillLoading && !hasRealData,
    isMockData: false,
  };
}
