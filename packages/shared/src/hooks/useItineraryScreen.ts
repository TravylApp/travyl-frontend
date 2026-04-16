'use client';

import { useState, useMemo, useCallback } from 'react';
import { useTrip } from './useTrip';
import { useItineraryDays } from './useItineraryDays';
import { useFlights } from './useFlights';
import { useHotels } from './useHotels';
import { useExchangeRates } from './useExchangeRates';
import {
  buildItineraryDayViewModel,
  buildFlightViewModel,
  buildHotelViewModel,
} from '../viewmodels/itineraryViewModel';
import type { ItineraryDayViewModel } from '../viewmodels/itineraryViewModel';
import { buildBudgetSummary } from '../viewmodels/budgetViewModel';
import { upscaleGoogleImage } from '../utils';
import { useSettingsStore } from '../stores/settingsStore';

/** Build basic itinerary days from explore_items for trips that have no stored itinerary */
function buildDaysFromExploreItems(tripContext: any, trip?: any): ItineraryDayViewModel[] {
  const explore = tripContext?.explore_items ?? [];
  if (explore.length === 0) return [];

  // Calculate number of days from trip dates
  let numDays = 3;
  if (trip?.start_date && trip?.end_date) {
    const s = new Date(trip.start_date + 'T00:00:00');
    const e = new Date(trip.end_date + 'T00:00:00');
    numDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000));
  }

  // Split explore items across days (restaurants + attractions interleaved)
  const restaurants = explore.filter((e: any) => /restaurant|food|dining|café|bar/i.test(e.category || ''));
  const attractions = explore.filter((e: any) => !/restaurant|food|dining|café|bar/i.test(e.category || ''));
  type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'latenight';
  const tods: TimeOfDay[] = ['morning', 'afternoon', 'evening'];
  const todTimes: Record<string, string> = { morning: '09:00', afternoon: '14:00', evening: '19:00' };
  const fmt12 = (t: string) => { const [h, m] = t.split(':').map(Number); const p = h >= 12 ? 'PM' : 'AM'; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${p}`; };

  const days: ItineraryDayViewModel[] = [];
  let aIdx = 0, rIdx = 0;

  for (let d = 0; d < numDays; d++) {
    const dateStr = trip?.start_date
      ? new Date(new Date(trip.start_date + 'T00:00:00').getTime() + d * 86400000).toISOString().slice(0, 10)
      : '';
    const dateObj = dateStr ? new Date(dateStr + 'T00:00:00') : null;
    const dateLabel = dateObj ? dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';

    const groups: { timeOfDay: TimeOfDay; activities: any[] }[] = [];
    for (const tod of tods) {
      const acts: any[] = [];
      // Add 1-2 items per time slot
      const itemsForSlot = tod === 'evening' ? 1 : 2;
      for (let s = 0; s < itemsForSlot; s++) {
        const item = tod === 'evening' && rIdx < restaurants.length
          ? restaurants[rIdx++]
          : aIdx < attractions.length ? attractions[aIdx++]
          : rIdx < restaurants.length ? restaurants[rIdx++]
          : null;
        if (!item) continue;
        const time = todTimes[tod];
        acts.push({
          id: item.id || `explore-${d}-${tod}-${s}`,
          name: item.title || item.name || 'Activity',
          category: item.category || 'sightseeing',
          locationName: item.title || item.name || null,
          startTime: fmt12(time),
          endTime: null,
          timeDisplay: fmt12(time),
          costDisplay: null,
          cost: null,
          costCurrency: null,
          bookingUrl: null,
          notes: item.description || null,
          image: upscaleGoogleImage(item.image) ?? null,
          source: undefined,
          timeOfDay: tod,
        });
      }
      if (acts.length > 0) groups.push({ timeOfDay: tod, activities: acts });
    }

    days.push({
      id: `ctx-day-${d + 1}`,
      dayNumber: d + 1,
      dayLabel: `Day ${d + 1}`,
      dateLabel,
      theme: null,
      notes: null,
      timeGroups: groups,
      activityCount: groups.reduce((sum, g) => sum + g.activities.length, 0),
    });
  }

  return days;
}

/** Build ItineraryDayViewModels from trip_context.itinerary when DB tables don't exist.
 *  Falls back to distributing explore_items across days if no itinerary exists. */
function buildDaysFromContext(tripContext: any, trip?: any): ItineraryDayViewModel[] {
  const itinerary = tripContext?.itinerary;
  if (!Array.isArray(itinerary) || itinerary.length === 0) {
    // Fallback: build basic days from explore_items for older trips
    return buildDaysFromExploreItems(tripContext, trip);
  }

  return itinerary.map((day: any) => {
    const slots = day.slots ?? [];
    type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'latenight';
    const getToD = (t: string): TimeOfDay => {
      const h = parseInt(t?.split(':')[0], 10);
      if (isNaN(h)) return 'morning';
      if (h < 12) return 'morning';
      if (h < 17) return 'afternoon';
      if (h < 21) return 'evening';
      return 'latenight';
    };
    const fmt12 = (t: string) => {
      if (!t) return null;
      const [h, m] = t.split(':').map(Number);
      const p = h >= 12 ? 'PM' : 'AM';
      return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${p}`;
    };

    const activityVMs = slots.map((slot: any, i: number) => ({
      id: slot.poi?.id ?? `ctx-${day.day}-${i}`,
      name: slot.poi?.name ?? 'Activity',
      category: slot.poi?.category ?? 'other',
      locationName: slot.poi?.name ?? null,
      startTime: fmt12(slot.start_time),
      endTime: fmt12(slot.end_time),
      timeDisplay: slot.start_time && slot.end_time ? `${fmt12(slot.start_time)} – ${fmt12(slot.end_time)}` : null,
      costDisplay: null,
      cost: null,
      costCurrency: null,
      bookingUrl: null,
      notes: slot.poi?.description ?? null,
      image: upscaleGoogleImage(slot.poi?.photo_url) ?? null,
      source: undefined,
      timeOfDay: getToD(slot.start_time),
      lat: slot.poi?.lat ?? null,
      lng: slot.poi?.lng ?? null,
    }));

    const groupMap = new Map<TimeOfDay, typeof activityVMs>();
    for (const vm of activityVMs) {
      const list = groupMap.get(vm.timeOfDay) ?? [];
      list.push(vm);
      groupMap.set(vm.timeOfDay, list);
    }
    const order: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'latenight'];
    const timeGroups = order.filter(tod => groupMap.has(tod)).map(tod => ({ timeOfDay: tod, activities: groupMap.get(tod)! }));

    const dateStr = day.date ?? '';
    const d = dateStr ? new Date(dateStr + 'T00:00:00') : null;
    const dateLabel = d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';

    return {
      id: `ctx-day-${day.day}`,
      dayNumber: day.day,
      dayLabel: `Day ${day.day}`,
      dateLabel,
      theme: null,
      notes: null,
      timeGroups,
      activityCount: activityVMs.length,
    };
  });
}

export function useItineraryScreen(tripId: string | undefined) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const tripQuery = useTrip(tripId);
  const daysQuery = useItineraryDays(tripId);
  const flightsQuery = useFlights(tripId);
  const hotelsQuery = useHotels(tripId);
  const homeCurrency = useSettingsStore((s) => s.currency);
  const { rates } = useExchangeRates(homeCurrency);

  // Build days from DB, or fall back to trip_context.itinerary
  const dbDays = useMemo(
    () => (daysQuery.data ?? []).map(buildItineraryDayViewModel),
    [daysQuery.data],
  );
  // Compute context days directly (no useMemo) to avoid stale closure issues
  const tripData = tripQuery.data;
  const tripCtx = tripData?.trip_context;
  const contextDays = useMemo(
    () => dbDays.length > 0 || !tripCtx ? [] : buildDaysFromContext(tripCtx, tripData),
    [dbDays.length, tripCtx, tripData],
  );
  const days = dbDays.length > 0 ? dbDays : contextDays;

  const flights = useMemo(
    () => (flightsQuery.data ?? []).map(buildFlightViewModel),
    [flightsQuery.data],
  );

  const hotels = useMemo(
    () => (hotelsQuery.data ?? []).map(buildHotelViewModel),
    [hotelsQuery.data],
  );

  // Build budget from DB data, or fall back to trip_context hotel prices
  const budget = useMemo(() => {
    const dbBudget = buildBudgetSummary(
      daysQuery.data ?? [],
      flightsQuery.data ?? [],
      hotelsQuery.data ?? [],
      homeCurrency,
      rates,
    );
    // If DB budget is empty, compute from trip_context hotels
    if (dbBudget.total === 0 && tripQuery.data?.trip_context) {
      const ctx = tripQuery.data.trip_context as any;
      const ctxHotels = ctx.hotels ?? [];
      const firstHotel = ctxHotels[0];
      let hotelsCost = 0;
      if (firstHotel) {
        hotelsCost = firstHotel.totalPrice ?? firstHotel.total_price ?? (firstHotel.price ?? firstHotel.price_per_night ?? 0) * (ctx.itinerary?.length ?? 1);
      }
      const categories: { label: string; amount: number; formatted: string }[] = [];
      if (hotelsCost > 0) {
        const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: homeCurrency, maximumFractionDigits: 0 }).format(Math.round(hotelsCost));
        categories.push({ label: 'Hotels', amount: hotelsCost, formatted });
      }
      const total = hotelsCost;
      if (total > 0) {
        const totalFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: homeCurrency, maximumFractionDigits: 0 }).format(Math.round(total));
        return { total, totalFormatted, categories, currency: homeCurrency };
      }
    }
    return dbBudget;
  }, [daysQuery.data, flightsQuery.data, hotelsQuery.data, homeCurrency, rates, tripQuery.data?.trip_context]);

  // Block on trip loading — also treat "not yet started" as loading
  const isLoading = (tripQuery.isLoading || (!tripQuery.data && !tripQuery.error)) && !!tripId;

  const trip = tripQuery.data ?? null;
  const hasContextItinerary = Array.isArray((trip?.trip_context as any)?.itinerary) && (trip?.trip_context as any).itinerary.length > 0;
  const isEmpty = !isLoading && days.length === 0 && !hasContextItinerary && flights.length === 0 && hotels.length === 0;

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
