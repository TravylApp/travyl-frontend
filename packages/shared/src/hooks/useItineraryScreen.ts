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
import { MOCK_DAYS, MOCK_FLIGHTS, MOCK_HOTELS, MOCK_TRIP, MOCK_BUDGET } from '../config/mockItineraryData';

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

  // Treat errored queries as done loading (don't spin forever)
  const isStillLoading =
    (tripQuery.isLoading && !tripQuery.error) ||
    (daysQuery.isLoading && !daysQuery.error);

  // Fall back to mock data when real data is empty (demo mode)
  const hasRealData = dayViewModels.length > 0 || flightViewModels.length > 0 || hotelViewModels.length > 0;
  const useMock = !isStillLoading && !hasRealData;

  const days = useMock ? MOCK_DAYS : dayViewModels;
  const flights = useMock ? MOCK_FLIGHTS : flightViewModels;
  const hotels = useMock ? MOCK_HOTELS : hotelViewModels;
  const trip = useMock ? MOCK_TRIP : (tripQuery.data ?? null);
  const budget = useMock ? MOCK_BUDGET : budgetSummary;

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
    isLoading: isStillLoading,
    refetch,
    error: tripQuery.error || daysQuery.error,
    isEmpty: false, // Never empty — mock data fills in
    isMockData: useMock,
  };
}
