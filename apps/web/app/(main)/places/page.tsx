'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Search, X, Loader2 } from 'lucide-react';
import {
  fetchPublicTrips,
  fetchNearbyPlaces,
  fetchDiscoverPage,
  searchPlaces as searchPlacesFn,
  dedupPlaces,
  useServerFavorites,
  useAuthStore,
} from '@travyl/shared';
import type { PlaceItem, Trip, DiscoverPageResult } from '@travyl/shared';

import { PlaceDetailModal } from '@/components/explore/PlaceDetailModal';
import { SectionRail } from '@/components/explore/SectionRail';
import { TripRailCard } from '@/components/explore/TripRailCard';
import { PlaceRailCard } from '@/components/explore/PlaceRailCard';

type PublicTrip = Trip & { profiles?: { display_name: string | null; avatar_url: string | null } | null };

export default function ExplorePage() {
  // ── Search state ────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  // ── Geolocation (optional, drives Near You) ─────────────────
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  // ── Favorites (server when signed in, localStorage when not) ─
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

  // ── Selected place modal ────────────────────────────────────
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);

  // ── Data: trending trips ────────────────────────────────────
  const { data: trips, isLoading: tripsLoading } = useQuery<PublicTrip[]>({
    queryKey: ['publicTrips'],
    queryFn: fetchPublicTrips as () => Promise<PublicTrip[]>,
    staleTime: 5 * 60 * 1000,
  });
  const trendingTrips = useMemo(() => {
    if (!trips) return [];
    return [...trips].sort((a, b) => (b.fork_count ?? 0) - (a.fork_count ?? 0)).slice(0, 12);
  }, [trips]);

  // ── Data: nearby places (gated on geolocation) ──────────────
  const { data: nearby = [], isLoading: nearbyLoading } = useQuery({
    queryKey: ['places-nearby', userLocation?.lat, userLocation?.lng],
    queryFn: () => fetchNearbyPlaces(userLocation!.lat, userLocation!.lng),
    enabled: !!userLocation,
    staleTime: 15 * 60 * 1000,
  });

  // ── Data: discover feed (powers the typed rails) ────────────
  const { data: discoverPage, isLoading: discoverLoading } = useQuery<DiscoverPageResult>({
    queryKey: ['places-discover-p0', userLocation?.lat, userLocation?.lng],
    queryFn: () => fetchDiscoverPage(0, userLocation),
    staleTime: 10 * 60 * 1000,
  });
  const discover = discoverPage?.items ?? [];
  const destinations = useMemo(() => discover.filter((p) => p.type === 'destination').slice(0, 12), [discover]);
  const restaurants = useMemo(() => discover.filter((p) => p.type === 'restaurant').slice(0, 12), [discover]);
  const experiences = useMemo(() => discover.filter((p) => p.type === 'experience' || p.type === 'attraction').slice(0, 12), [discover]);

  // ── Search results (infinite scroll) ────────────────────────
  const {
    data: searchData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: searchLoading,
  } = useInfiniteQuery({
    queryKey: ['places-search', searchQuery, userLocation?.lat, userLocation?.lng],
    queryFn: ({ pageParam }) => searchPlacesFn(searchQuery, pageParam, userLocation),
    initialPageParam: 0,
    getNextPageParam: (last: DiscoverPageResult) =>
      last.hasMore && last.nextPage != null ? last.nextPage : undefined,
    enabled: !!searchQuery,
    staleTime: 5 * 60 * 1000,
  });

  const searchResults = useMemo(() => {
    if (!searchData?.pages) return [];
    return dedupPlaces(searchData.pages.flatMap((p) => p.items));
  }, [searchData]);

  // ── Infinite scroll observer for search ─────────────────────
  useEffect(() => {
    if (!searchQuery || !hasNextPage) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '600px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [searchQuery, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a1520]">
      {/* Hero */}
      <header className="px-4 sm:px-6 lg:px-10 pt-12 pb-6 max-w-7xl mx-auto">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 mb-2">Explore</p>
        <h1 className="font-serif text-[34px] sm:text-[44px] md:text-[52px] font-normal text-gray-900 dark:text-white tracking-tight leading-[1.05] mb-3">
          Find a place. Fork a trip.
        </h1>
        <p className="text-[15px] text-gray-500 dark:text-white/60 max-w-2xl">
          Browse destinations, restaurants, and experiences — or remix an itinerary someone else built.
        </p>

        {/* Search */}
        <div className="mt-7 max-w-2xl">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search Tokyo, sushi, museums…"
              className="w-full h-12 pl-11 pr-11 rounded-full bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-[15px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/15 focus:border-[#1e3a5f]/40 transition-shadow"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setSearchQuery(''); }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] flex items-center justify-center"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Search results — replaces all rails when active */}
      {searchQuery ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pb-20">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-gray-500 dark:text-white/60">
              {searchLoading
                ? 'Searching…'
                : `${searchResults.length} result${searchResults.length === 1 ? '' : 's'} for “${searchQuery}”`}
            </p>
          </div>
          {searchLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[300px] rounded-2xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 dark:text-white/60">No results yet — try a different search.</p>
            </div>
          ) : (
            <>
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
              <div ref={loadMoreRef} className="h-10 flex items-center justify-center mt-6">
                {isFetchingNextPage && <Loader2 size={20} className="animate-spin text-gray-400" />}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="max-w-7xl mx-auto pt-4 pb-20">
          {/* Trending trips */}
          <SectionRail
            eyebrow="Community"
            title="Trending trips"
            seeAllHref="/explore"
            isLoading={tripsLoading}
            isEmpty={!tripsLoading && trendingTrips.length === 0}
            emptyText="No public trips yet — be the first to share."
          >
            {trendingTrips.map((trip) => (
              <TripRailCard key={trip.id} trip={trip} />
            ))}
          </SectionRail>

          {/* Near you (only if geolocation granted) */}
          {(userLocation || nearbyLoading) && (
            <SectionRail
              eyebrow="Around you"
              title="Near you"
              isLoading={nearbyLoading}
              isEmpty={!nearbyLoading && nearby.length === 0}
              emptyText="We couldn't find anything close by right now — try searching for a city above."
            >
              {nearby.slice(0, 12).map((place) => (
                <PlaceRailCard
                  key={place.id}
                  place={place}
                  isFavorited={favorites.includes(place.id)}
                  onFavorite={toggleFavorite}
                  onClick={setSelectedPlace}
                />
              ))}
            </SectionRail>
          )}

          {/* Top destinations */}
          <SectionRail
            eyebrow="Cities"
            title="Top destinations"
            isLoading={discoverLoading}
            isEmpty={!discoverLoading && destinations.length === 0}
            emptyText="No destinations queued up yet. Search a city above to start exploring."
          >
            {destinations.map((place) => (
              <PlaceRailCard
                key={place.id}
                place={place}
                isFavorited={favorites.includes(place.id)}
                onFavorite={toggleFavorite}
                onClick={setSelectedPlace}
              />
            ))}
          </SectionRail>

          {/* Top restaurants */}
          <SectionRail
            eyebrow="Eat"
            title="Top restaurants"
            isLoading={discoverLoading}
            isEmpty={!discoverLoading && restaurants.length === 0}
            emptyText="Restaurant picks load once we have a destination — search above or share your location."
          >
            {restaurants.map((place) => (
              <PlaceRailCard
                key={place.id}
                place={place}
                isFavorited={favorites.includes(place.id)}
                onFavorite={toggleFavorite}
                onClick={setSelectedPlace}
              />
            ))}
          </SectionRail>

          {/* Experiences & attractions */}
          <SectionRail
            eyebrow="Do"
            title="Experiences & attractions"
            isLoading={discoverLoading}
            isEmpty={!discoverLoading && experiences.length === 0}
            emptyText="We'll surface attractions once a destination is selected — try the search above."
          >
            {experiences.map((place) => (
              <PlaceRailCard
                key={place.id}
                place={place}
                isFavorited={favorites.includes(place.id)}
                onFavorite={toggleFavorite}
                onClick={setSelectedPlace}
              />
            ))}
          </SectionRail>
        </div>
      )}

      {/* Detail overlay */}
      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          isFavorited={favorites.includes(selectedPlace.id)}
          onToggleFavorite={() => toggleFavorite(selectedPlace.id)}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  );
}
