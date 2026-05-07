/**
 * @module useItineraryScreen
 * Orchestrates all data needed to render the Itinerary tab on both web and mobile.
 * Fetches the trip, itinerary days, flights, and hotels; transforms raw DB rows
 * into view-model objects; computes a budget summary; and exposes day-selection state.
 *
 * Falls back to trip_context.itinerary when no DB itinerary rows exist (e.g. for
 * newly-created trips that haven't been enriched yet), and further falls back to
 * distributing explore_items across days if there is no itinerary at all.
 *
 * Used by the web ItineraryTab and the mobile ItineraryScreen.
 */

'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTrip } from './useTrip';
import { useItineraryDays } from './useItineraryDays';
import { useFlights } from './useFlights';
import { useHotels } from './useHotels';
import { useCars } from './useCars';
import { useExchangeRates } from './useExchangeRates';
import { useTripActivities, type TripActivityRow } from './useTripActivities';
import {
  buildItineraryDayViewModel,
  buildFlightViewModel,
  buildHotelViewModel,
  buildCarViewModel,
} from '../viewmodels/itineraryViewModel';
import type { ItineraryDayViewModel } from '../viewmodels/itineraryViewModel';
import { buildBudgetSummary } from '../viewmodels/budgetViewModel';
import { upscaleGoogleImage } from '../utils';
import { useSettingsStore } from '../stores/settingsStore';
import { supabase } from '../services/supabase';

/**
 * Synthesizes a basic day-by-day itinerary from `trip_context.explore_items`
 * for trips that have no stored itinerary in the database.
 * Interleaves restaurants (evening) and attractions (morning/afternoon) across
 * the number of days derived from the trip's start/end dates.
 * @param tripContext - The raw `trip_context` JSON blob from the trip row
 * @param trip - The parent trip row (used to compute dates and number of days)
 * @returns Array of `ItineraryDayViewModel` objects ready for rendering
 */
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

/**
 * Converts `trip_context.itinerary` (the AI-generated slot array) into
 * `ItineraryDayViewModel[]` when no enriched DB itinerary rows are present.
 * Falls back to `buildDaysFromExploreItems` if the context itinerary is also empty.
 * @param tripContext - The raw `trip_context` JSON blob from the trip row
 * @param trip - The parent trip row (used for date labels in the explore fallback)
 * @returns Array of `ItineraryDayViewModel` objects ready for rendering
 */
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

/** Merge user-added activity rows (from `activity` table) into the day view models.
 *  Rows are matched to days by `starting_date`; if a day has no date, we fall back
 *  to its index relative to trip.start_date. */
function mergeUserActivities(
  days: ItineraryDayViewModel[],
  trip: any,
  rows: TripActivityRow[],
): ItineraryDayViewModel[] {
  if (!rows.length || !days.length) return days;

  const startDate = trip?.start_date ? new Date(trip.start_date + 'T00:00:00') : null;
  const dayDateByIndex = days.map((_, i) =>
    startDate ? new Date(startDate.getTime() + i * 86400000).toISOString().slice(0, 10) : null,
  );

  type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'latenight';
  const getToD = (t: string | null): TimeOfDay => {
    if (!t) return 'morning';
    const h = parseInt(t.split(':')[0], 10);
    if (isNaN(h)) return 'morning';
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    if (h < 21) return 'evening';
    return 'latenight';
  };
  const fmt12 = (t: string | null) => {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    const p = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${p}`;
  };

  const rowsByDay: TripActivityRow[][] = days.map(() => []);
  for (const r of rows) {
    let dayIdx = dayDateByIndex.findIndex((d) => d === r.starting_date);
    if (dayIdx < 0) dayIdx = 0;
    rowsByDay[dayIdx].push(r);
  }

  return days.map((day, i) => {
    const adds = rowsByDay[i];
    if (!adds.length) return day;

    const timeGroups = day.timeGroups.map((g) => ({ timeOfDay: g.timeOfDay, activities: [...g.activities] }));
    const groupMap = new Map<TimeOfDay, any[]>();
    // Dedupe across BOTH trip_context.itinerary slots and the activity
    // table — when the same POI is saved into both sources (common for
    // SerpAPI place ids that appear in the AI itinerary AND get
    // mirrored into the activity row), the merge would otherwise
    // produce duplicate React keys and make deletes "stick" because
    // the second copy survives any single-source removal.
    const existingIds = new Set<string>();
    const existingNameTime = new Set<string>();
    for (const g of timeGroups) {
      groupMap.set(g.timeOfDay as TimeOfDay, g.activities);
      for (const a of g.activities) {
        if (a?.id) existingIds.add(String(a.id));
        const norm = (s: any) => (typeof s === 'string' ? s.trim().toLowerCase() : '');
        const key = `${norm(a?.name)}|${norm(a?.startTime)}`;
        if (key !== '|') existingNameTime.add(key);
      }
    }

    for (const r of adds) {
      // Skip rows that are already represented in trip_context.itinerary.
      // Match by id first (fast), then by (name + start_time) so
      // SerpAPI ids that happen to differ across sources still dedupe.
      if (existingIds.has(String(r.id))) continue;
      const dupKey = `${(r.activity_name || '').trim().toLowerCase()}|${(fmt12(r.starting_time) || '').trim().toLowerCase()}`;
      if (existingNameTime.has(dupKey)) continue;
      const tod = getToD(r.starting_time);
      const list = groupMap.get(tod) ?? [];
      const data = r.activity_data ?? {};
      list.push({
        id: r.id,
        name: r.activity_name,
        category: data.category || r.activity_type || 'other',
        locationName: data.location_name ?? r.activity_name,
        startTime: fmt12(r.starting_time),
        endTime: fmt12(r.ending_time),
        timeDisplay: r.starting_time && r.ending_time ? `${fmt12(r.starting_time)} – ${fmt12(r.ending_time)}` : fmt12(r.starting_time),
        costDisplay: null,
        cost: null,
        costCurrency: null,
        bookingUrl: null,
        notes: r.notes ?? null,
        image: upscaleGoogleImage(data.image_url) ?? null,
        source: 'user-added' as any,
        timeOfDay: tod,
        latitude: r.latitude ?? null,
        longitude: r.longitude ?? null,
        userAdded: true,
      });
      groupMap.set(tod, list);
    }

    const order: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'latenight'];
    const merged = order.filter((tod) => groupMap.has(tod) && groupMap.get(tod)!.length > 0)
      .map((tod) => ({ timeOfDay: tod, activities: groupMap.get(tod)! }));

    return {
      ...day,
      timeGroups: merged,
      activityCount: merged.reduce((sum, g) => sum + g.activities.length, 0),
    };
  });
}

/**
 * Provides all data and state needed by the itinerary screen.
 *
 * Resolves days from DB rows first, falls back to `trip_context.itinerary`,
 * and finally synthesizes days from `explore_items` for very early trips.
 * Budget is also computed with a context fallback when no DB cost data exists.
 *
 * @param tripId - UUID of the trip, or undefined while routing/loading
 * @returns Object with:
 *   - `trip` — full trip record
 *   - `days` — resolved `ItineraryDayViewModel[]`
 *   - `selectedDayIndex` / `setSelectedDayIndex` — active day tab state
 *   - `selectedDay` — the currently selected day view model
 *   - `flights` / `hotels` — flight/hotel view models
 *   - `budget` — computed budget summary
 *   - `isLoading` — true while trip or itinerary data is pending
 *   - `refetch` — force refresh all queries
 *   - `error` — first encountered error
 *   - `isEmpty` — true when there is genuinely nothing to show
 *
 * @example
 * ```tsx
 * const { days, selectedDayIndex, setSelectedDayIndex, budget, isLoading } =
 *   useItineraryScreen(tripId);
 * ```
 */
export function useItineraryScreen(tripId: string | undefined) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const queryClient = useQueryClient();
  const channelRef = useRef<string | null>(null);
  const tripQuery = useTrip(tripId);
  const daysQuery = useItineraryDays(tripId);
  const activitiesQuery = useTripActivities(tripId);
  const flightsQuery = useFlights(tripId);
  const hotelsQuery = useHotels(tripId);
  const carsQuery = useCars(tripId);
  const homeCurrency = useSettingsStore((s) => s.currency);

  // Realtime sync — listen for postgres_changes on the trip row + every
  // related table and invalidate the matching react-query cache so any
  // collaborator (web or mobile) sees edits propagate within ~1 second.
  // No Yjs, no extra deps — purely Supabase Realtime + react-query.
  // Anonymous users can't reach this code path (app gates on session
  // before mounting trip screens) so we don't worry about that case.
  useEffect(() => {
    if (!tripId) return;
    // Use a ref-stabilized unique ID so multiple instances of this hook
    // don't clash (the component calls useItineraryScreen twice in the
    // layout tree). The ref persists across StrictMode double-mount too.
    if (!channelRef.current) {
      channelRef.current = `${tripId}-${Math.random().toString(36).slice(2, 8)}`;
    }
    const channel = supabase
      .channel(`trip:${channelRef.current}`)
      // Trip row itself (title, dates, trip_context, settings, theme).
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` },
        () => queryClient.invalidateQueries({ queryKey: ['trip', tripId] }),
      )
      // User-added activities (the rows that mergeUserActivities pulls in).
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'activity', filter: `trip_id=eq.${tripId}` },
        () => queryClient.invalidateQueries({ queryKey: ['trip-activities', tripId] }),
      )
      // Itinerary day rows (when the DB-backed itinerary is in use).
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'itinerary_days', filter: `trip_id=eq.${tripId}` },
        () => queryClient.invalidateQueries({ queryKey: ['itinerary-days', tripId] }),
      )
      // Flight rows.
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'flights', filter: `trip_id=eq.${tripId}` },
        () => queryClient.invalidateQueries({ queryKey: ['flights', tripId] }),
      )
      // Hotel rows.
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'hotels', filter: `trip_id=eq.${tripId}` },
        () => queryClient.invalidateQueries({ queryKey: ['hotels', tripId] }),
      )
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'cars', filter: `trip_id=eq.${tripId}` },
        () => queryClient.invalidateQueries({ queryKey: ['cars', tripId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);
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
  const baseDays = dbDays.length > 0 ? dbDays : contextDays;
  // Merge user-added activities (from `activity` table, written by useAddToTrip)
  const days = useMemo(
    () => mergeUserActivities(baseDays, tripData, activitiesQuery.data ?? []),
    [baseDays, tripData, activitiesQuery.data],
  );

  const flights = useMemo(
    () => (flightsQuery.data ?? []).map(buildFlightViewModel),
    [flightsQuery.data],
  );

  const hotels = useMemo(
    () => (hotelsQuery.data ?? []).map(buildHotelViewModel),
    [hotelsQuery.data],
  );

  const cars = useMemo(
    () => (carsQuery.data ?? []).map(buildCarViewModel),
    [carsQuery.data],
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
  const isEmpty = !isLoading && days.length === 0 && !hasContextItinerary && flights.length === 0 && hotels.length === 0 && cars.length === 0;

  const refetch = useCallback(() => {
    tripQuery.refetch();
    daysQuery.refetch();
    activitiesQuery.refetch();
    flightsQuery.refetch();
    hotelsQuery.refetch();
    carsQuery.refetch();
  }, [tripQuery, daysQuery, activitiesQuery, flightsQuery, hotelsQuery, carsQuery]);

  return {
    trip,
    days,
    selectedDayIndex,
    setSelectedDayIndex,
    selectedDay: days[selectedDayIndex] ?? null,
    flights,
    hotels,
    cars,
    budget,
    isLoading,
    refetch,
    error: tripQuery.error || daysQuery.error,
    isEmpty,
  };
}
