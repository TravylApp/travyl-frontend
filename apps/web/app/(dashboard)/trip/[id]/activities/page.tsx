'use client';

import { use, useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, X, Heart, Loader2 } from 'lucide-react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useItineraryScreen, useServerFavorites, useAuthStore } from '@travyl/shared';
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

async function fetchSearch(query: string, lat: number, lng: number): Promise<PlaceItem[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({ q: query, limit: '24' });
  if (lat !== 0 || lng !== 0) {
    params.set('lat', String(lat));
    params.set('lng', String(lng));
  }
  try {
    const res = await fetch(`/api/places?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as PlaceItem[]).filter((p) => p?.id && p?.name && p.image) : [];
  } catch {
    return [];
  }
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

  // Favorites
  const session = useAuthStore((s) => s.session);
  const authToken = session?.access_token ?? null;
  const { data: serverFavs, addFavorite: serverAdd, removeFavorite: serverRemove } = useServerFavorites(authToken);
  const serverFavIds = useMemo(() => (serverFavs ?? []).map((f) => f.place_id), [serverFavs]);
  const [localFavorites, setLocalFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('places-favorites') || '[]'); } catch { return []; }
  });
  const favorites = authToken ? serverFavIds : localFavorites;

  const toggleFavorite = (placeId: string) => {
    if (authToken) {
      if (serverFavIds.includes(placeId)) serverRemove(placeId);
      else serverAdd(placeId);
      return;
    }
    setLocalFavorites((prev) => {
      const next = prev.includes(placeId) ? prev.filter((f) => f !== placeId) : [...prev, placeId];
      try { localStorage.setItem('places-favorites', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Selected place modal
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);

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
      const items = (q.data ?? []).filter((p) => {
        if (used.has(p.id)) return false;
        used.add(p.id);
        return true;
      });
      return items;
    });
  }, [railQueries]);

  // Search query
  const { data: searchResults = [], isLoading: searchLoading, isFetching: searchFetching } = useQuery({
    queryKey: ['trip-explore-search', id, searchQuery, lat, lng],
    queryFn: () => fetchSearch(searchQuery, lat, lng),
    enabled: ready && !!searchQuery,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
      {/* Hero */}
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 mb-1.5">Explore {destination}</p>
          <h1 className="font-serif text-[28px] sm:text-[34px] font-normal text-gray-900 dark:text-white tracking-tight leading-[1.1]">
            What's worth doing here.
          </h1>
        </div>
        <Link
          href={`/trip/${id}/favorites`}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-gray-200 dark:border-white/[0.08] text-[13px] font-semibold text-gray-700 dark:text-white/80 hover:border-gray-300 dark:hover:border-white/20 transition-colors"
        >
          <Heart size={13} /> Saved ({favorites.length})
        </Link>
      </div>

      {/* Search bar */}
      <div className="relative mb-10 max-w-2xl">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={`Search ${destination} — sushi, parks, bars…`}
          className="w-full h-11 pl-11 pr-11 rounded-full bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--trip-base)]/20 focus:border-[var(--trip-base)]/40 transition-shadow"
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
                  isFavorited={favorites.includes(place.id)}
                  onFavorite={toggleFavorite}
                  onClick={setSelectedPlace}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="-mx-4 sm:-mx-6 lg:-mx-10">
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
                    isFavorited={favorites.includes(place.id)}
                    onFavorite={toggleFavorite}
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
          isFavorited={favorites.includes(selectedPlace.id)}
          onToggleFavorite={() => toggleFavorite(selectedPlace.id)}
          onClose={() => setSelectedPlace(null)}
          tripId={id}
          tripStartDate={trip?.start_date ?? null}
          tripEndDate={trip?.end_date ?? null}
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
