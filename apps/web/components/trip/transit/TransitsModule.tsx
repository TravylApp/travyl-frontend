'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { detectRoutePairs, type RoutePair } from './detectRoutePairs';
import { concurrencyLimit } from './concurrencyLimit';
import { TransitRoutePairCard } from './TransitRoutePairCard';
import { TransitDaySection } from './TransitDaySection';
import { TransitBetweenDaysSection } from './TransitBetweenDaysSection';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { fetchTransit, addTransit, updateTransit, deleteTransit } from '@travyl/shared';
import type { TransitData, TransitSegment, TransitDirectionResult, ItineraryDayViewModel, HotelViewModel } from '@travyl/shared';
import { TransitCard } from './TransitCard';
import { TransitForm } from './TransitForm';
import { buildTransitCardViewModel } from './types';
import { TransitSearchPanel, type TransitSearchParams } from './TransitSearchPanel';
import { TransitDirectionResults } from './TransitDirectionResults';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

interface TransitsModuleProps {
  tripId: string;
  defaultCurrency?: string;
  days: ItineraryDayViewModel[];
  hotels: HotelViewModel[];
  tripStartDate: string;
}

export function TransitsModule({ tripId, defaultCurrency = 'USD', days, hotels, tripStartDate }: TransitsModuleProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const { data: rawBookings = [], isLoading, error } = useQuery({
    queryKey: ['transit', tripId],
    queryFn: () => fetchTransit(tripId),
    staleTime: 5 * 60 * 1000,
  });

  const [adding, setAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const hasExpandedRef = React.useRef(false);

  React.useEffect(() => {
    if (hasExpandedRef.current) return;
    const expand = searchParams.get('expand');
    if (expand && rawBookings.some((b) => b.id === expand)) {
      setEditingId(expand);
      hasExpandedRef.current = true;
    }
  }, [searchParams, rawBookings]);

  React.useEffect(() => {
    function handleAdd() { setAdding(true); }
    window.addEventListener('transit:add', handleAdd);
    return () => window.removeEventListener('transit:add', handleAdd);
  }, []);

  // ── Route pair detection (auto-suggest) ──────────────────────
  const routePairs: RoutePair[] = useMemo(
    () => detectRoutePairs(tripStartDate, days, hotels),
    [tripStartDate, days, hotels],
  );

  const [dismissedPairIds, setDismissedPairIds] = useState<Set<string>>(new Set());
  const dismissedPairIdsRef = useRef(dismissedPairIds);
  dismissedPairIdsRef.current = dismissedPairIds;
  const [suggestionResults, setSuggestionResults] = useState<Record<string, TransitDirectionResult[]>>({});
  const [suggestionLoading, setSuggestionLoading] = useState<Record<string, boolean>>({});
  const [suggestionErrors, setSuggestionErrors] = useState<Record<string, string | null>>({});
  const routePairsVersionRef = useRef(0);
  const [fetchVersion, setFetchVersion] = useState(0);

  useEffect(() => {
    const currentVersion = ++routePairsVersionRef.current;
    const limit = concurrencyLimit(4);

    const pairIds = routePairs.map((p) => p.id);
    setSuggestionResults({});
    setSuggestionLoading(Object.fromEntries(pairIds.map((id) => [id, true])));
    setSuggestionErrors({});

    const currentDismissed = dismissedPairIdsRef.current;

    const fetches = routePairs.map((pair) =>
      limit(async () => {
        if (currentDismissed.has(pair.id)) return;

        try {
          const token = await getAuthToken();
          const response = await fetch(
            `/api/transit/directions?origin_lat=${pair.origin.lat}&origin_lng=${pair.origin.lng}` +
            `&dest_lat=${pair.destination.lat}&dest_lng=${pair.destination.lng}` +
            `&departure_time=${encodeURIComponent(pair.departureTime)}`,
            { headers: { authorization: `Bearer ${token}` } }
          );
          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Search failed');
          }
          const results: TransitDirectionResult[] = await response.json();
          if (currentVersion !== routePairsVersionRef.current) return;
          setSuggestionResults((prev) => ({ ...prev, [pair.id]: results }));
        } catch (err: any) {
          if (currentVersion !== routePairsVersionRef.current) return;
          setSuggestionErrors((prev) => ({ ...prev, [pair.id]: err.message }));
        } finally {
          if (currentVersion === routePairsVersionRef.current) {
            setSuggestionLoading((prev) => ({ ...prev, [pair.id]: false }));
          }
        }
      })
    );

    Promise.all(fetches);
  }, [routePairs, fetchVersion]);

  const [searching, setSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<TransitDirectionResult[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const lastSearchParamsRef = React.useRef<TransitSearchParams | null>(null);

  async function getAuthToken(): Promise<string> {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? '';
  }

  async function handleSearch(params: TransitSearchParams) {
    lastSearchParamsRef.current = params;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `/api/transit/directions?origin_lat=${params.originLat}&origin_lng=${params.originLng}` +
        `&dest_lat=${params.destLat}&dest_lng=${params.destLng}` +
        `&departure_time=${encodeURIComponent(params.departureTime)}`,
        { headers: { authorization: `Bearer ${token}` } }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Search failed');
      }
      setSearchResults(await response.json());
    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setSearchLoading(false);
    }
  }

  function handleSearchWithParams(params: TransitSearchParams) {
    handleSearch(params);
  }

  async function handleAddFromSearch(result: TransitDirectionResult) {
    await addMutation.mutateAsync({
      vehicleType: result.steps[0]?.mode ?? 'train',
      provider: result.steps[0]?.carrier ?? '',
      routeName: result.steps.map((s) => s.line).filter(Boolean).join(' → ') || 'Transit route',
      originLabel: result.origin.label,
      destinationLabel: result.destination.label,
      departureAt: result.departure_at,
      arrivalAt: result.arrival_at,
      price: result.fare?.amount ?? null,
      currency: result.fare?.currency ?? 'USD',
      bookingRef: null,
      confirmationCode: null,
      notes: null,
    });
    setSearching(false);
    setSearchResults([]);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['transit', tripId] });
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
  }

  const addMutation = useMutation({
    mutationFn: (data: TransitData) => addTransit(tripId, { trip_id: tripId, data }),
    onSuccess: () => { setAdding(false); invalidate(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransitData }) => updateTransit(id, { data }),
    onSuccess: () => { setEditingId(null); invalidate(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTransit(id),
    onSuccess: () => { setEditingId(null); invalidate(); },
  });

  async function handleAddFromSuggestion(pairId: string, result: TransitDirectionResult) {
    try {
      await addMutation.mutateAsync({
        vehicleType: result.steps[0]?.mode ?? 'train',
        provider: result.steps[0]?.carrier ?? '',
        routeName: result.steps.map((s) => s.line).filter(Boolean).join(' → ') || 'Transit route',
        originLabel: result.origin.label,
        destinationLabel: result.destination.label,
        departureAt: result.departure_at,
        arrivalAt: result.arrival_at,
        price: result.fare?.amount ?? null,
        currency: result.fare?.currency ?? 'USD',
        bookingRef: null,
        confirmationCode: null,
        notes: null,
      });
      setDismissedPairIds((prev) => new Set(prev).add(pairId));
    } catch {
      // mutation failed — pair stays visible so user can retry
    }
  }

  const bookings = React.useMemo(
    () => rawBookings
      .map((b: TransitSegment) => ({ ...buildTransitCardViewModel(b.data), id: b.id }))
      .sort((a, b) => {
        if (!a.departureAt && !b.departureAt) return 0;
        if (!a.departureAt) return 1;
        if (!b.departureAt) return -1;
        return new Date(a.departureAt).getTime() - new Date(b.departureAt).getTime();
      }),
    [rawBookings],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 dark:bg-white/[0.04] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-500">Could not load transit bookings.</p>
      </div>
    );
  }

  if (bookings.length === 0 && routePairs.length === 0 && !adding) {
    return (
      <div className="text-center py-12">
        <p className="text-[15px] font-medium text-gray-900 dark:text-white">No transit bookings yet</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add a transit leg to your trip</p>
        <button
          onClick={() => setAdding(true)}
          className="mt-4 px-4 h-9 rounded-xl text-sm font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
          style={{ backgroundColor: 'var(--trip-base)' }}
        >
          Add Transit
        </button>
      </div>
    );
  }

  function renderSuggestions() {
    const activePairs = routePairs.filter((p) => !dismissedPairIds.has(p.id));
    if (activePairs.length === 0) return null;

    const byDay: Map<number, { withinDay: RoutePair[]; crossDay: RoutePair[] }> = new Map();
    for (const pair of activePairs) {
      if (!byDay.has(pair.dayIndex)) {
        byDay.set(pair.dayIndex, { withinDay: [], crossDay: [] });
      }
      const day = byDay.get(pair.dayIndex)!;
      if (pair.type === 'cross-day') {
        day.crossDay.push(pair);
      } else {
        day.withinDay.push(pair);
      }
    }

    return (
      <div className="space-y-4 mt-6">
        <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Suggested Routes</h2>
        {days.map((day, idx) => {
          const dayPairs = byDay.get(idx);
          if (!dayPairs || (dayPairs.withinDay.length === 0 && dayPairs.crossDay.length === 0)) return null;
          return (
            <TransitDaySection key={idx} dayLabel={day.dayLabel} dateLabel={day.dateLabel}>
              {dayPairs.withinDay.map((pair) => (
                <TransitRoutePairCard
                  key={pair.id}
                  routePair={pair}
                  results={suggestionResults[pair.id] ?? []}
                  isLoading={suggestionLoading[pair.id] ?? false}
                  error={suggestionErrors[pair.id] ?? null}
                  onAdd={(result) => handleAddFromSuggestion(pair.id, result)}
                  onRetry={() => {
                    setSuggestionErrors((prev) => ({ ...prev, [pair.id]: null }));
                    setSuggestionLoading((prev) => ({ ...prev, [pair.id]: true }));
                    setFetchVersion((v) => v + 1);
                  }}
                />
              ))}
              {dayPairs.crossDay.length > 0 && (
                <TransitBetweenDaysSection>
                  {dayPairs.crossDay.map((pair) => (
                    <TransitRoutePairCard
                      key={pair.id}
                      routePair={pair}
                      results={suggestionResults[pair.id] ?? []}
                      isLoading={suggestionLoading[pair.id] ?? false}
                      error={suggestionErrors[pair.id] ?? null}
                      onAdd={(result) => handleAddFromSuggestion(pair.id, result)}
                      onRetry={() => {
                        setSuggestionErrors((prev) => ({ ...prev, [pair.id]: null }));
                        setSuggestionLoading((prev) => ({ ...prev, [pair.id]: true }));
                        setFetchVersion((v) => v + 1);
                      }}
                    />
                  ))}
                </TransitBetweenDaysSection>
              )}
            </TransitDaySection>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {adding && (
        <TransitForm
          onSubmit={async (data) => { await addMutation.mutateAsync(data); }}
          onCancel={() => setAdding(false)}
          defaultCurrency={defaultCurrency}
        />
      )}
      {searching && (
        <TransitSearchPanel
          onSearch={handleSearch}
          onCancel={() => { setSearching(false); setSearchResults([]); setSearchError(null); }}
          isSearching={searchLoading}
        />
      )}
      {(searchResults.length > 0 || searchLoading || searchError) && (
        <TransitDirectionResults
          results={searchResults}
          isLoading={searchLoading}
          error={searchError}
          onAddToTrip={handleAddFromSearch}
          onRetry={() => lastSearchParamsRef.current && handleSearchWithParams(lastSearchParamsRef.current)}
        />
      )}
      {bookings.length > 0 && (
        <div className="space-y-3">
          {bookings.map((vm) =>
            editingId === vm.id ? (
              (() => {
                const segment = rawBookings.find((b: TransitSegment) => b.id === vm.id);
                if (!segment) return null;
                return (
                  <TransitForm
                    key={vm.id}
                    initial={{ ...segment.data, id: segment.id }}
                    onSubmit={async (data) => { await updateMutation.mutateAsync({ id: vm.id, data }); }}
                    onCancel={() => setEditingId(null)}
                    onDelete={async () => { await deleteMutation.mutateAsync(vm.id); }}
                    defaultCurrency={defaultCurrency}
                  />
                );
              })()
            ) : (
              <TransitCard
                key={vm.id}
                booking={vm}
                onEdit={() => setEditingId(vm.id)}
                onDelete={() => deleteMutation.mutateAsync(vm.id)}
              />
            )
          )}
        </div>
      )}
      {renderSuggestions()}
    </div>
  );
}
