'use client';

import { use, useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import { useItineraryScreen } from '@travyl/shared';
import type { PlaceItem } from '@travyl/shared';
import { PlaceDetailModal } from '@/components/explore/PlaceDetailModal';
import { SectionRail } from '@/components/explore/SectionRail';
import { PlaceRailCard } from '@/components/explore/PlaceRailCard';

// ─── Rail definitions ──────────────────────────────────────────────────────

interface RailDef {
  key: string;
  eyebrow: string;
  title: string;
  /** Backend category — drives Foursquare/SerpAPI to return distinct results per rail. */
  category: string;
  emptyText: string;
}

const RAILS: RailDef[] = [
  {
    key: 'attractions',
    eyebrow: 'See',
    title: 'Top attractions',
    category: 'attraction',
    emptyText: "Couldn't load attractions yet — try again in a moment.",
  },
  {
    key: 'restaurants',
    eyebrow: 'Eat',
    title: 'Restaurants & dining',
    category: 'restaurant',
    emptyText: "No restaurant picks loaded yet.",
  },
  {
    key: 'nightlife',
    eyebrow: 'After dark',
    title: 'Bars & nightlife',
    category: 'nightlife',
    emptyText: "Nightlife results haven't loaded.",
  },
  {
    key: 'outdoors',
    eyebrow: 'Outside',
    title: 'Parks & nature',
    category: 'park',
    emptyText: "No outdoor spots loaded yet.",
  },
  {
    key: 'culture',
    eyebrow: 'Culture',
    title: 'Museums & galleries',
    category: 'museum',
    emptyText: "No culture picks loaded yet.",
  },
  {
    key: 'cafes',
    eyebrow: 'Sip',
    title: 'Cafés & coffee',
    category: 'cafe',
    emptyText: "No café picks loaded yet.",
  },
];

// ─── Data fetch (one rail = one category) ──────────────────────────────────

async function fetchRail(category: string, destination: string, lat: number, lng: number): Promise<PlaceItem[]> {
  const params = new URLSearchParams({ category, limit: '14' });
  // Pass destination text as a hint so the backend can disambiguate the
  // category (e.g. "Cancun nightlife" → SerpAPI sees the city context).
  if (destination) params.set('q', `${destination} ${category}`);
  if (lat !== 0 || lng !== 0) {
    params.set('lat', String(lat));
    params.set('lng', String(lng));
  }
  try {
    const res = await fetch(`/api/places?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    // Filter out items without images so rails always look polished.
    const seen = new Set<string>();
    return (data as PlaceItem[]).filter((p) => {
      if (!p?.id || !p?.name || !p.image) return false;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  } catch {
    return [];
  }
}

// ─── Search ────────────────────────────────────────────────────────────────

// Categories to fan out a single user search across. The backend's
// `/api/places/nearby` endpoint takes a category param and returns only
// matching venues, so a one-shot search would only ever surface one slice
// (it defaulted to 'sightseeing' = "top attractions"). Fanning across the
// rail categories pulls in restaurants, bars, parks, museums, cafés, and
// events too — then we filter by the user's text client-side.
const SEARCH_CATEGORIES = [
  'attraction',
  'restaurant',
  'nightlife',
  'park',
  'museum',
  'cafe',
  'event',
];

function matchesQuery(p: PlaceItem, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const haystack = `${p.name ?? ''} ${(p as { category?: string }).category ?? ''} ${(p as { address?: string }).address ?? ''}`.toLowerCase();
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function TripExplorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { trip, isLoading: tripLoading } = useItineraryScreen(id);

  const lat = trip?.trip_context?.lat ?? 0;
  const lng = trip?.trip_context?.lng ?? 0;
  const destination = (trip?.destination?.split(',')[0] || '').trim() || 'this destination';
  const ready = !tripLoading && trip != null;

  // Search state (debounced)
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  // Selected place modal
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [quickAdd, setQuickAdd] = useState(false);
  const openPlace = (place: PlaceItem) => { setQuickAdd(false); setSelectedPlace(place); };
  const quickAddPlace = (place: PlaceItem) => { setQuickAdd(true); setSelectedPlace(place); };

  // Rail queries — fired in parallel, one per rail definition.
  // Each rail uses a distinct backend category so SerpAPI/Foursquare
  // return non-overlapping results (was previously all text queries that
  // returned the same top-ranking places for every rail).
  const railQueries = useQueries({
    queries: RAILS.map((rail) => ({
      queryKey: ['trip-explore-rail', id, rail.category, lat, lng, destination] as const,
      queryFn: () => fetchRail(rail.category, destination, lat, lng),
      enabled: ready,
      staleTime: 15 * 60 * 1000,
    })),
  });

  // Cross-rail dedupe — when the same place id appears in multiple rails
  // (e.g. a venue that's both a "restaurant" and a "nightlife" hit) keep
  // it in the first rail and drop it from later ones. Preserves the
  // category-led grouping while preventing visual repeats.
  const dedupedRailItems = useMemo(() => {
    const used = new Set<string>();
    return railQueries.map((q) => {
      return (q.data ?? []).filter((p) => {
        if (used.has(p.id)) return false;
        used.add(p.id);
        return true;
      });
    });
  }, [railQueries]);

  // Search — fan one user query across every category so results aren't
  // capped to "top attractions" (the backend default). Results are merged,
  // deduped, and filtered by the user's text on the client.
  const searchQueries = useQueries({
    queries: SEARCH_CATEGORIES.map((category) => ({
      queryKey: ['trip-explore-search', id, category, lat, lng, destination] as const,
      queryFn: () => fetchRail(category, destination, lat, lng),
      enabled: ready && !!searchQuery,
      staleTime: 5 * 60 * 1000,
    })),
  });
  const searchLoading = !!searchQuery && searchQueries.some((q) => q.isLoading);
  const searchFetching = !!searchQuery && searchQueries.some((q) => q.isFetching);
  const searchResults = useMemo<PlaceItem[]>(() => {
    if (!searchQuery) return [];
    const seen = new Set<string>();
    const out: PlaceItem[] = [];
    for (const q of searchQueries) {
      for (const p of q.data ?? []) {
        if (seen.has(p.id)) continue;
        if (!matchesQuery(p, searchQuery)) continue;
        seen.add(p.id);
        out.push(p);
      }
    }
    return out;
  }, [searchQueries, searchQuery]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
      {/* Hero */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 mb-1.5">Explore {destination}</p>
        <h1 className="font-serif text-[28px] sm:text-[34px] font-normal text-gray-900 dark:text-white tracking-tight leading-[1.1]">
          What's worth doing here.
        </h1>
      </div>

      {/* Search bar */}
      <div className="relative mb-9 max-w-2xl">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={`Search ${destination} — sushi, parks, bars…`}
          className="w-full h-11 pl-11 pr-11 rounded-full bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--trip-base)]/20 focus:border-[var(--trip-base)]/40 transition-shadow"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => { setSearchInput(''); setSearchQuery(''); }}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] flex items-center justify-center"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search results — replaces all rails when active */}
      {searchQuery ? (
        <div>
          <p className="text-sm text-gray-500 dark:text-white/60 mb-5">
            {searchLoading || searchFetching
              ? 'Searching…'
              : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'} for “${searchQuery}”`}
          </p>
          {searchLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[300px] rounded-2xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200 dark:border-white/[0.08]">
              <p className="text-gray-500 dark:text-white/60">No results — try a different search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {searchResults.map((place) => (
                <PlaceRailCard
                  key={place.id}
                  place={place}
                  onClick={openPlace}
                  onQuickAdd={quickAddPlace}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {RAILS.map((rail, i) => {
            const q = railQueries[i];
            const items = dedupedRailItems[i] ?? [];
            return (
              <SectionRail
                key={rail.key}
                eyebrow={rail.eyebrow}
                title={rail.title}
                isLoading={!ready || q.isLoading}
                isEmpty={ready && !q.isLoading && items.length === 0}
                emptyText={rail.emptyText}
              >
                {items.map((place) => (
                  <PlaceRailCard
                    key={place.id}
                    place={place}
                    onClick={setSelectedPlace}
                  />
                ))}
              </SectionRail>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          onClose={() => { setSelectedPlace(null); setQuickAdd(false); }}
          tripId={id}
          tripStartDate={trip?.start_date ?? null}
          tripEndDate={trip?.end_date ?? null}
          autoAddToItinerary={quickAdd}
        />
      )}

      {searchFetching && !searchLoading && (
        <div className="fixed bottom-6 right-6 bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] rounded-full px-3 h-9 flex items-center gap-2 shadow-lg text-xs text-gray-600 dark:text-white/80">
          <Loader2 size={12} className="animate-spin" />
          Refreshing
        </div>
      )}
    </div>
  );
}
