'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Map, X } from 'lucide-react';
import type { Trip } from '@travyl/shared';
import { usePathname, useRouter } from 'next/navigation';
import TripRail, { useRailCollapsed } from '@/components/trip-rail';
import { useItineraryScreen, useAuthStore, canViewTrip, useDestinationImage, upscaleGoogleImage } from '@travyl/shared';
import { ItineraryProvider, useItineraryContext } from '@/components/itinerary/ItineraryContext';
import { TripThemeProvider } from '@/components/trip/TripThemeContext';
import { CompactTripHeader } from '@/components/trip/CompactTripHeader';
import { TripMagazineHero } from '@/components/trip/TripMagazineHero';
import { PlaceDetailOverlay } from '@/components/PlaceDetailOverlay';
import { TripOnboardingBanner } from '@/components/trip/TripOnboardingBanner';
import { useTripSettingsRegistration } from '@/stores/tripSettingsStore';
import { useQuery } from '@tanstack/react-query';
import type { PlaceItem } from '@travyl/shared';

const LeafletMap = dynamic(() => import('@/components/leaflet-map'), { ssr: false });

// ─── Trip Explore Section (overview page — shows trip_context data) ──

export function TripExploreSection({ trip, embedded }: { trip: Trip | null; embedded?: boolean }) {
  const city = trip?.destination?.split(',')[0]?.trim() || '';
  const lat = trip?.trip_context?.lat as number | undefined;
  const lng = trip?.trip_context?.lng as number | undefined;
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [extraItems, setExtraItems] = useState<Record<string, ExploreItem[]>>({});
  const [loadingMore, setLoadingMore] = useState<Record<string, boolean>>({});
  const loadingRef = useRef<Record<string, boolean>>({});
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const exploreRef = useRef<HTMLDivElement>(null);
  const [railCollapsed] = useRailCollapsed();

  // Scan page for place names rendered above the explore section
  const getAboveNames = useCallback(() => {
    const el = exploreRef.current;
    if (!el) return new Set<string>();
    const norm = (n: string) => n.toLowerCase().replace(/[®™''""·\-–—]/g, '').replace(/\s+/g, ' ').trim();
    const names = new Set<string>();
    const allCards = document.querySelectorAll('.font-serif');
    allCards.forEach(card => {
      if (el.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_PRECEDING) {
        const text = card.textContent?.trim();
        if (text && text.length > 2 && text.length < 100) names.add(norm(text));
      }
    });
    return names;
  }, []);

  // Strip items with no real image URL, known broken ones, or low-res thumbnails
  const hasValidImage = (item: ExploreItem) => {
    const url = item.image;
    if (!url || url.length < 10) return false;
    if (brokenImages.has(item.id)) return false;
    // Skip tiny Google proxy thumbnails (gstatic) that can't be upscaled
    if (url.includes('encrypted-tbn')) return false;
    return true;
  };
  const onImgError = (id: string) => {
    setBrokenImages(prev => new Set(prev).add(id));
  };

  type ExploreItem = { id: string; title?: string; name?: string; description?: string; category?: string; image?: string; images?: string[]; rating?: number; lat?: number; lng?: number; address?: string; phone?: string; website?: string; reviewCount?: number; priceLevel?: string; cuisines?: string[] };

  const coordParams = lat && lng ? `&lat=${lat}&lng=${lng}` : '';

  const mapPlace = (p: any): ExploreItem => ({
    id: p.id, title: p.name, name: p.name,
    description: p.description || p.tagline || '',
    category: p.category || '',
    image: upscaleGoogleImage(p.images?.[0] || p.image) || p.image || '',
    images: p.images, rating: p.rating,
    lat: p.latitude, lng: p.longitude,
    address: p.address, phone: p.phone, website: p.website,
    reviewCount: p.reviewCount, priceLevel: p.priceLevel,
  });

  // Fetch places across Foursquare categories + SerpAPI text search for diversity
  const { data: liveCategories, isLoading: liveFetching } = useQuery({
    queryKey: ['explore-section', trip?.id, city, lat, lng],
    queryFn: async () => {
      if (!city && !lat) return [];
      // Wait a tick so overview sections render first — then we can scan their names
      await new Promise(r => setTimeout(r, 500));

      // Categories that produce distinct Foursquare results → display label
      const catLabel: Record<string, string> = {
        sightseeing: 'Landmark', restaurant: 'Culinary', nightlife: 'Nightlife',
        shopping: 'Shopping', cafe: 'Cafes', entertainment: 'Entertainment',
      };

      // Nearby Foursquare fetches — reliable, category-specific results
      const nearbyResults = lat && lng ? await Promise.all(
        Object.entries(catLabel).map(async ([api, label]) => {
          try {
            const res = await fetch(`/api/places?lat=${lat}&lng=${lng}&category=${api}&limit=20`);
            if (!res.ok) return [];
            const places = await res.json();
            return (places as any[]).map((p: any) => ({ ...p, category: label }));
          } catch { return []; }
        })
      ) : [];

      // Text search supplements with SerpAPI results (different source when available)
      // Uses category-specific queries for diversity; falls back to Foursquare if SerpAPI unavailable
      const textCats = ['sightseeing', 'dining', 'nightlife', 'cultural', 'shopping', 'museum', 'cafe'];
      const textResults = await Promise.all(
        textCats.map(async (cat) => {
          try {
            const res = await fetch(`/api/places?q=${encodeURIComponent(city)}&category=${cat}&limit=15${coordParams}`);
            if (!res.ok) return [];
            return (await res.json()) as any[];
          } catch { return []; }
        })
      );

      // Merge all results, deduplicate by normalized name, group by display category
      const allPlaces = [...nearbyResults.flat(), ...textResults.flat()];
      const normalize = (n: string) => n.toLowerCase().replace(/[®™''""·\-–—]/g, '').replace(/\s+/g, ' ').trim();
      const seen = getAboveNames();
      const grouped: Record<string, ExploreItem[]> = {};
      for (const p of allPlaces) {
        if (!p.name) continue;
        const key = normalize(p.name);
        if (seen.has(key)) continue;
        const img = p.images?.[0] || p.image;
        if (!img) continue;
        seen.add(key);
        const cat = p.category || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(mapPlace(p));
      }

      return Object.entries(grouped)
        .filter(([, items]) => items.length >= 2)
        .sort(([, a], [, b]) => b.length - a.length)
        .map(([key, items]) => ({ key, label: `${key} in ${city}`, items }));
    },
    enabled: !!(city || lat),
    staleTime: 10 * 60 * 1000,
  });

  // Load more — text search to get SerpAPI results (different source than initial nearby/Foursquare)
  const loadMore = useCallback(async (catKey: string, existingNames: Set<string>) => {
    if (loadingRef.current[catKey]) return;
    loadingRef.current[catKey] = true;
    setLoadingMore(prev => ({ ...prev, [catKey]: true }));
    try {
      const url = `/api/places?q=${encodeURIComponent(`${city} ${catKey}`)}&limit=20${coordParams}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const places: any[] = await res.json();
      const norm = (n: string) => n.toLowerCase().replace(/[®™''""·\-–—]/g, '').replace(/\s+/g, ' ').trim();
      const newItems: ExploreItem[] = places
        .filter((p: any) => p.name && (p.images?.[0] || p.image) && !existingNames.has(norm(p.name)))
        .map((p: any) => mapPlace(p));
      if (newItems.length > 0) {
        setExtraItems(prev => ({ ...prev, [catKey]: [...(prev[catKey] || []), ...newItems] }));
      }
    } catch { /* ignore */ } finally {
      loadingRef.current[catKey] = false;
      setLoadingMore(prev => ({ ...prev, [catKey]: false }));
    }
  }, [city, coordParams]);

  const handleRowScroll = useCallback((e: React.UIEvent<HTMLDivElement>, catKey: string, allNames: Set<string>) => {
    const el = e.currentTarget;
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 400) {
      loadMore(catKey, allNames);
    }
  }, [loadMore]);

  // Fallback: trip_context data while live data loads
  const ctx = trip?.trip_context;
  const fallbackCategories = (() => {
    if (liveCategories && liveCategories.length > 0) return null;
    const allItems: ExploreItem[] = [];
    const seen = new Set<string>();
    const add = (items: any[], fallbackCat?: string) => {
      for (const item of items) {
        const key = item.id || item.title || item.name;
        if (!key || seen.has(key) || !item.image) continue;
        const upscaled = upscaleGoogleImage(item.image);
        // Skip gstatic thumbnails that can't be upscaled
        if (!upscaled || upscaled.includes('encrypted-tbn')) continue;
        seen.add(key);
        allItems.push({ ...item, title: item.title || item.name, image: upscaled, category: item.category || fallbackCat || 'Attraction' });
      }
    };
    add(ctx?.explore_items || []);
    add(ctx?.foursquare_venues || []);
    if (ctx?.restaurants?.length) add(ctx.restaurants as any[], 'Restaurant');
    if (!allItems.length) return null;
    return [{ key: 'all', label: `Explore ${city}`, items: allItems }];
  })();

  const categories = liveCategories ?? fallbackCategories ?? [];

  const toPlaceItem = (item: ExploreItem): PlaceItem => ({
    id: item.id, name: item.title || item.name || '', image: item.image || '',
    images: item.images?.length ? item.images : item.image ? [item.image] : [],
    type: /restaurant|food|culinary|dining/i.test(item.category || '') ? 'restaurant' : 'attraction',
    rating: item.rating || 0, tagline: item.description || item.category || '',
    category: item.category || '', description: item.description || '',
    tags: item.cuisines || (item.category ? [item.category] : []),
    latitude: item.lat || lat, longitude: item.lng || lng,
    address: item.address, phone: item.phone, website: item.website,
    reviewCount: item.reviewCount,
    priceLevel: item.priceLevel === '$' ? 1 : item.priceLevel === '$$' ? 2 : item.priceLevel === '$$$' ? 3 : item.priceLevel === '$$$$' ? 4 : undefined,
  });

  if (categories.length === 0 && !liveFetching) return null;

  return (
    <div ref={exploreRef} className={embedded ? 'py-2' : `max-w-7xl mx-auto px-4 sm:px-6 ${railCollapsed ? 'md:pl-[76px]' : 'md:pl-[240px]'} py-8 transition-[padding] duration-200 ease-out`}>
      <h2 className={`text-xl font-normal tracking-wide mb-6 font-serif ${embedded ? 'text-white' : 'text-gray-900 dark:text-white'}`}
        style={embedded ? { textShadow: '0 2px 10px rgba(0,0,0,0.5)' } : undefined}>
        Explore {city || 'Destination'}
      </h2>

      {liveFetching && categories.length === 0 && (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className={`h-4 w-48 rounded mb-3 animate-pulse ${embedded ? 'bg-white/10' : 'bg-gray-200'}`} />
              <div className="flex gap-3">
                {[1, 2, 3, 4].map(j => (
                  <div key={j} className={`flex-shrink-0 w-[220px] rounded-2xl animate-pulse ${embedded ? 'bg-white/10' : 'bg-gray-100'}`} style={{ height: 280 }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {categories.map(({ key, label, items }) => {
          const merged = [...items, ...(extraItems[key] || [])].filter(hasValidImage);
          const nameSet = new Set(merged.map(i => (i.title || i.name || '').toLowerCase().replace(/[®™''""·\-–—]/g, '').replace(/\s+/g, ' ').trim()));
          const totalCount = merged.length;
          if (totalCount === 0) return null;
          return (
          <div key={key}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm font-semibold tracking-wide ${embedded ? 'text-white/80' : 'text-gray-700 dark:text-gray-300'}`}>
                {label}
              </h3>
              <span className={`text-[11px] ${embedded ? 'text-white/40' : 'text-gray-400 dark:text-gray-500'}`}>{totalCount} {totalCount === 1 ? 'place' : 'places'}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1"
              onScroll={(e) => handleRowScroll(e, key, nameSet)}>
              {merged.map((item: ExploreItem, idx: number) => (
                <div key={`${item.id}-${idx}`} onClick={() => setSelectedPlace(toPlaceItem(item))}
                  className="relative flex-shrink-0 w-[220px] rounded-2xl overflow-hidden shadow-lg group cursor-pointer hover:shadow-xl transition-shadow" style={{ height: 280 }}>
                  <Image src={item.image!} alt={item.title || item.name || ''} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="220px" onError={() => onImgError(item.id)} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <button onClick={(e) => { e.stopPropagation(); setFavorites((prev) => prev.includes(item.id) ? prev.filter((f) => f !== item.id) : [...prev, item.id]); }}
                    className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform z-10 ${favorites.includes(item.id) ? 'bg-red-500' : 'bg-black/30'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={favorites.includes(item.id) ? 'white' : 'none'} stroke="white" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 p-3.5">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-white/50 mb-1">{item.category}</p>
                    <p className="text-[15px] font-normal text-white leading-tight line-clamp-2 mb-1 font-serif">{item.title || item.name}</p>
                    {item.rating ? (
                      <div className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                        <span className="text-[12px] font-semibold text-white/80">{item.rating}</span>
                      </div>
                    ) : item.description ? (<p className="text-[11px] text-white/50 line-clamp-1">{item.description}</p>) : null}
                  </div>
                </div>
              ))}
              {loadingMore[key] && (
                <div className="flex-shrink-0 w-[220px] rounded-2xl flex items-center justify-center" style={{ height: 280 }}>
                  <div className={`w-6 h-6 border-2 rounded-full animate-spin ${embedded ? 'border-white/20 border-t-white/60' : 'border-gray-200 border-t-gray-500'}`} />
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>
      {selectedPlace && (
        <PlaceDetailOverlay place={selectedPlace} isFavorited={favorites.includes(selectedPlace.id)}
          onToggleFavorite={() => setFavorites((prev) => prev.includes(selectedPlace.id) ? prev.filter((f) => f !== selectedPlace.id) : [...prev, selectedPlace.id])}
          onClose={() => setSelectedPlace(null)} minimal />
      )}
    </div>
  );
}

// ─── Main Layout ────────────────────────────────────────────

export default function TripLayoutInner({
  tripId,
  children,
}: {
  tripId: string;
  children: React.ReactNode;
}) {
  const { trip } = useItineraryScreen(tripId);

  return (
    <TripThemeProvider trip={trip}>
      <ItineraryProvider tripId={tripId}>
        <TripLayoutContent tripId={tripId}>{children}</TripLayoutContent>
      </ItineraryProvider>
    </TripThemeProvider>
  );
}

function TripLayoutContent({
  tripId,
  children,
}: {
  tripId: string;
  children: React.ReactNode;
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const { trip, isLoading, refetch } = useItineraryScreen(tripId);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  useTripSettingsRegistration(tripId);
  const [railCollapsed] = useRailCollapsed();

  // Layout mode toggle — persisted in localStorage
  const [layoutMode, setLayoutMode] = useState<'magazine' | 'compact'>('compact');
  useEffect(() => {
    const saved = localStorage.getItem('travyl-layout-mode');
    if (saved === 'magazine' || saved === 'compact') setLayoutMode(saved);
  }, []);
  const toggleLayout = () => {
    const next = layoutMode === 'magazine' ? 'compact' : 'magazine';
    setLayoutMode(next);
    localStorage.setItem('travyl-layout-mode', next);
    window.dispatchEvent(new Event('layout-mode-change'));
  };
  const isMagazine = layoutMode === 'magazine';

  // Destination image for magazine hero
  const city = trip?.destination?.split(',')[0]?.trim();
  const { data: destImageData, isLoading: destImageLoading } = useDestinationImage(city || '');

  // Redirect to login if the trip has loaded and the user can't view it
  useEffect(() => {
    if (isLoading || !trip) return;
    if (!canViewTrip(trip, user?.id ?? null)) {
      router.replace(`/login?next=/trip/${tripId}`);
    }
  }, [trip, isLoading, user?.id, tripId, router]);
  const { mapMarkers, selectedMarkerId, requestMapOpen, setRequestMapOpen } = useItineraryContext();

  // Sync map open with context requests
  useEffect(() => {
    if (requestMapOpen && !mapOpen) setMapOpen(true);
    if (!requestMapOpen && mapOpen && mapMarkers.length > 0) setMapOpen(false);
  }, [requestMapOpen, mapOpen, mapMarkers.length]);

  // When map is manually closed, clear the request
  const handleCloseMap = () => {
    setMapOpen(false);
    setRequestMapOpen(false);
  };

  // Page-slide direction tracking
  const pathname = usePathname();
  const basePath = `/trip/${tripId}`;
  const currentSegment = pathname.replace(basePath, '').replace(/^\//, '') || '';
  const isOverview = currentSegment === '';
  const isCalendar = currentSegment === 'calendar';

  const tabOrder = ['', 'itinerary', 'calendar', 'hotels', 'flights', 'transit', 'restaurants', 'activities', 'packing', 'budget', 'cars'];
  const prevSegmentRef = useRef(currentSegment);
  const directionRef = useRef<1 | -1>(1);

  useEffect(() => {
    if (prevSegmentRef.current !== currentSegment) {
      const oldIdx = tabOrder.indexOf(prevSegmentRef.current);
      const newIdx = tabOrder.indexOf(currentSegment);
      directionRef.current = newIdx >= oldIdx ? 1 : -1;
      prevSegmentRef.current = currentSegment;
    }
  }, [currentSegment]);

  const hasMarkers = mapMarkers.length > 0;
  const dir = directionRef.current;

  const pageVariants = {
    initial: { opacity: 0, y: dir > 0 ? 14 : -14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: dir > 0 ? -8 : 8 },
  };

  return (
    <AnimatePresence mode="sync">
    <motion.div
      key="trip-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`${isCalendar ? 'flex flex-col h-[calc(100vh-48px)] overflow-hidden' : 'pb-14 md:pb-0'} ${isMagazine ? 'relative' : 'bg-white dark:bg-background'}`}
    >
      {/* Sidebar */}
      <TripRail tripId={tripId} variant={isMagazine ? 'dark' : 'light'} />

      {/* Header — magazine hero or compact (hidden on calendar for full-height view) */}
      {!isCalendar && (
        isMagazine ? (
          <TripMagazineHero tripId={tripId} trip={trip} compact={!isOverview} onTripUpdate={refetch}
            overrideImage={destImageData?.url ?? undefined} suppressFallback={destImageLoading} />
        ) : (
          <CompactTripHeader
            tripId={tripId}
            trip={trip}
            onTripUpdate={refetch}
            overrideImage={destImageData?.url ?? undefined}
            mapOpen={mapOpen}
            onToggleMap={() => setMapOpen(!mapOpen)}
          />
        )
      )}

      {/* Content area */}
      <div className={`relative z-10 ${isCalendar ? 'flex-1 flex flex-col min-h-0' : ''}`}>
        <div className={isCalendar ? 'flex-1 flex flex-col min-h-0 w-full' : isMagazine ? '' : 'mx-auto max-w-[1800px]'}>
          {isOverview && <TripOnboardingBanner />}

          <div className={`flex ${isCalendar ? 'flex-1 min-h-0' : ''}`}>
            {/* Main content */}
            <div className={`flex-1 min-w-0 relative overflow-hidden transition-[padding] duration-200 ease-out ${
              isCalendar
                ? `${railCollapsed ? 'md:pl-[76px]' : 'md:pl-[240px]'} flex flex-col`
                : isMagazine
                  ? `px-6 sm:px-10 ${railCollapsed ? 'md:pl-[96px]' : 'md:pl-[260px]'} md:pr-10`
                  : `px-5 ${railCollapsed ? 'md:pl-[76px]' : 'md:pl-[240px]'} pt-4 pb-5`
            }`}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={`tab-${currentSegment}`}
                  initial={pageVariants.initial}
                  animate={pageVariants.animate}
                  exit={pageVariants.exit}
                  transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                  className={
                    isCalendar
                      ? 'flex-1 min-h-0 flex flex-col'
                      : isMagazine
                        ? (isOverview ? 'pt-2' : 'bg-white/85 backdrop-blur-xl rounded-2xl p-5 sm:p-6 mt-4 mb-8')
                        : ''
                  }
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Map side panel — hidden on calendar (it has its own Map tab in the right panel) */}
            {!isCalendar && (
            <AnimatePresence>
              {mapOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '35%', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                  className="hidden md:block shrink-0 border-l border-gray-200 dark:border-white/[0.08] overflow-hidden"
                >
                  <div className="sticky top-0 h-[calc(100vh-80px)] flex flex-col bg-white dark:bg-background">
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-white/[0.06] shrink-0">
                      <div className="flex items-center gap-2">
                        <Map size={13} className="text-[var(--trip-base)]" />
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                          {hasMarkers ? `${mapMarkers.length} locations` : (trip?.destination || 'Destination')}
                        </span>
                      </div>
                      <button
                        onClick={handleCloseMap}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                      >
                        <X size={12} className="text-gray-400" />
                      </button>
                    </div>
                    <div className="flex-1 relative">
                      <Suspense fallback={
                        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-background">
                          <span className="text-sm text-gray-400">Loading map...</span>
                        </div>
                      }>
                        {hasMarkers ? (
                          <LeafletMap
                            locations={mapMarkers}
                            selectedId={selectedMarkerId}
                            zoom={13}
                            height="100%"
                            className="!rounded-none !border-0"
                          />
                        ) : (
                          <LeafletMap
                            lat={trip?.trip_context?.lat ?? 0}
                            lng={trip?.trip_context?.lng ?? 0}
                            label={trip?.destination || ''}
                            zoom={13}
                            height="100%"
                            className="!rounded-none !border-0"
                          />
                        )}
                      </Suspense>
                      {!hasMarkers && (
                        <div className="absolute bottom-0 inset-x-0 flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-black/80 backdrop-blur-md border-t border-gray-100 dark:border-white/[0.06]">
                          <MapPin size={12} className="text-[var(--trip-base)] shrink-0" />
                          <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate">
                            {trip?.destination || 'Destination'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* Below-the-fold content — overview only, never calendar */}
      {isOverview && !isCalendar && (
        <div className="relative z-10">
          {isMagazine ? (
            <div className={`px-6 sm:px-10 ${railCollapsed ? 'md:pl-[96px]' : 'md:pl-[260px]'} md:pr-10 mt-4 pb-8 transition-[padding] duration-200 ease-out`}>
              <TripExploreSection trip={trip} embedded />
            </div>
          ) : (
            <div className="bg-white dark:bg-background">
              <TripExploreSection trip={trip} />
            </div>
          )}
        </div>
      )}

      {/* Magazine footer — gradient floor so the page has a defined end */}
      {isMagazine && !isCalendar && (
        <div className="relative z-10 h-40 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.85) 100%)' }} />
      )}
    </motion.div>
    </AnimatePresence>
  );
}
