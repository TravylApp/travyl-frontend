'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Map, X } from 'lucide-react';
import type { Trip } from '@travyl/shared';
import { usePathname, useRouter } from 'next/navigation';
import TripTabs, { getTabMeta } from '@/components/trip-tabs';
import { useItineraryScreen, formatDateRange, useAuthStore, isTripOwner, canViewTrip } from '@travyl/shared';
// Footer/OceanWave removed — trip pages use workspace layout
import { ItineraryProvider, useItineraryContext } from '@/components/itinerary/ItineraryContext';
import { TripThemeProvider } from '@/components/trip/TripThemeContext';
import { CompactTripHeader } from '@/components/trip/CompactTripHeader';
import { PlaceDetailModal } from '@/components/trip/PlaceDetailModal';
import { useTripSettingsRegistration } from '@/stores/tripSettingsStore';
import type { PlaceItem } from '@travyl/shared';

const LeafletMap = dynamic(() => import('@/components/leaflet-map'), { ssr: false });

// ─── Content Header Bar (per-tab) ───────────────────────────

function ContentHeader({ tripId, mapOpen, onToggleMap }: {
  tripId: string;
  mapOpen: boolean;
  onToggleMap: () => void;
}) {
  const pathname = usePathname();
  const basePath = `/trip/${tripId}`;
  const segment = pathname.replace(basePath, '').replace(/^\//, '') || '';
  const tab = getTabMeta(segment);

  if (!tab) return null;
  const Icon = tab.icon;

  return (
    <div className="shrink-0 border-b bg-white dark:bg-[var(--background)] border-gray-100 dark:border-white/[0.06] px-5 md:pl-16 pt-4 pb-3 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0" style={{ backgroundColor: tab.color }}>
          <Icon size={15} className="text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-[17px] tracking-tight" style={{ color: 'var(--trip-base)', fontWeight: 700 }}>{tab.label}</h2>
          <p className="text-[12px] text-gray-400 dark:text-gray-500">{tab.subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onToggleMap} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200 ${mapOpen ? 'text-white shadow-md' : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-600'}`} style={mapOpen ? { borderColor: 'var(--trip-base)', backgroundColor: 'var(--trip-base)' } : undefined} title={mapOpen ? 'Hide map' : 'Show map'}>
            <Map size={13} />
            <span className="text-[12px] font-medium">Map</span>
          </button>
        </div>
      </div>
      <div className="mt-3 h-[2px] rounded-full opacity-80" style={{ background: `linear-gradient(90deg, ${tab.color}, ${tab.color}40, transparent)` }} />
    </div>
  );
}

// ─── Trip Explore Section (destination-specific categories) ──

export function TripExploreSection({ trip }: { trip: Trip | null }) {
  const city = trip?.destination?.split(',')[0]?.trim() || 'Destination';
  const ctx = trip?.trip_context;
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  type ExploreItem = { id: string; title?: string; name?: string; description?: string; category?: string; image?: string; images?: string[]; rating?: number; cuisines?: string[]; priceLevel?: string; tripAdvisorUrl?: string; lat?: number; lng?: number; address?: string; phone?: string; website?: string; reviewCount?: number };
  const categories: { key: string; label: string; items: ExploreItem[] }[] = [];

  // Famous Attractions
  if (ctx?.explore_items && ctx.explore_items.length > 0) {
    categories.push({ key: 'attractions', label: 'Famous Attractions', items: ctx.explore_items });
  }

  // TripAdvisor restaurants (best data + real photos)
  if (ctx?.restaurants && ctx.restaurants.length > 0) {
    categories.push({ key: 'ta-restaurants', label: 'Top Restaurants', items: ctx.restaurants as ExploreItem[] });
  }

  // Categorize venues into specific buckets
  const allVenues = ctx?.foursquare_venues || [];
  const buckets: Record<string, ExploreItem[]> = { restaurants: [], museums: [], nightlife: [], shopping: [], parks: [], other: [] };

  for (const v of allVenues) {
    const cat = (v.category || '').toLowerCase();
    if (/restaurant|food|café|cafe|dining|pizza|bistro|trattoria|culinary|bakery/i.test(cat)) {
      buckets.restaurants.push(v);
    } else if (/museum|gallery|theater|theatre|cultural|art|history/i.test(cat)) {
      buckets.museums.push(v);
    } else if (/bar|club|nightlife|entertainment|pub|lounge|cocktail/i.test(cat)) {
      buckets.nightlife.push(v);
    } else if (/shop|market|store|mall|boutique/i.test(cat)) {
      buckets.shopping.push(v);
    } else if (/park|garden|outdoor|nature|beach|trail/i.test(cat)) {
      buckets.parks.push(v);
    } else {
      buckets.other.push(v);
    }
  }

  // Only add Foursquare restaurants if no TripAdvisor data
  if (!ctx?.restaurants?.length && buckets.restaurants.length > 0) categories.push({ key: 'restaurants', label: 'Restaurants & Cafes', items: buckets.restaurants });
  if (buckets.museums.length > 0) categories.push({ key: 'museums', label: 'Museums & Culture', items: buckets.museums });
  if (buckets.nightlife.length > 0) categories.push({ key: 'nightlife', label: 'Nightlife & Entertainment', items: buckets.nightlife });
  if (buckets.shopping.length > 0) categories.push({ key: 'shopping', label: 'Shopping', items: buckets.shopping });
  if (buckets.parks.length > 0) categories.push({ key: 'parks', label: 'Parks & Nature', items: buckets.parks });
  if (buckets.other.length > 0) categories.push({ key: 'other', label: 'More to Explore', items: buckets.other });

  // Hotels
  if (ctx?.hotels && ctx.hotels.length > 0) {
    categories.push({ key: 'hotels', label: `Hotels in ${city}`, items: ctx.hotels.map((h) => ({ id: h.id, title: h.name, name: h.name, description: h.tip || h.category || '', category: h.category || 'Hotel', image: h.image ?? undefined })) });
  }

  if (categories.length === 0) return null;

  // Convert an explore item to PlaceItem for PinCard + PlaceDetailOverlay
  const toPlaceItem = (item: ExploreItem): PlaceItem => ({
    id: item.id,
    name: item.title || item.name || '',
    image: item.image || '',
    images: item.images?.length ? item.images : item.image ? [item.image] : [],
    type: /restaurant|food|culinary|dining/i.test(item.category || '') ? 'restaurant' : 'attraction',
    rating: item.rating || 0,
    tagline: item.description || item.category || '',
    category: item.category || '',
    description: item.description || '',
    tags: item.cuisines || (item.category ? [item.category] : []),
    latitude: item.lat || (trip?.trip_context?.lat ?? undefined),
    longitude: item.lng || (trip?.trip_context?.lng ?? undefined),
    address: item.address,
    phone: item.phone,
    website: item.website || item.tripAdvisorUrl,
    reviewCount: item.reviewCount,
    priceLevel: item.priceLevel === '$' ? 1 : item.priceLevel === '$$' ? 2 : item.priceLevel === '$$$' ? 3 : item.priceLevel === '$$$$' ? 4 : undefined,
  });

  const handleCardClick = (item: ExploreItem) => {
    setSelectedPlace(toPlaceItem(item));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:pl-16 py-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Explore {city}
      </h2>

      <div className="space-y-6">
        {categories.map(({ key, label, items }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14px] font-bold text-gray-700 dark:text-white/80 tracking-wide">
                {label}
              </h3>
              <span className="text-[11px] text-gray-400 dark:text-white/40">{items.length} {items.length === 1 ? 'place' : 'places'}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
              {items.map((item: ExploreItem) => (
                <div key={item.id} onClick={() => handleCardClick(item)}
                  className="relative flex-shrink-0 w-[220px] rounded-2xl overflow-hidden shadow-lg group cursor-pointer hover:shadow-xl transition-shadow" style={{ height: 280 }}>
                  {item.image ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt={item.title || item.name} referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }} />
                  )}
                  {/* Favorite button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setFavorites((prev) => prev.includes(item.id) ? prev.filter((f) => f !== item.id) : [...prev, item.id]); }}
                    className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform z-10 ${favorites.includes(item.id) ? 'bg-red-500' : 'bg-black/30'}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={favorites.includes(item.id) ? 'white' : 'none'} stroke="white" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                  </button>
                  {/* Content overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-3.5">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-white/50 mb-1">{item.category}</p>
                    <p className="text-[15px] font-bold text-white leading-tight line-clamp-2 mb-1">{item.title || item.name}</p>
                    {item.rating ? (
                      <div className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                        <span className="text-[12px] font-semibold text-white/80">{item.rating}</span>
                        {item.reviewCount && <span className="text-[10px] text-white/40">({item.reviewCount})</span>}
                      </div>
                    ) : item.description ? (
                      <p className="text-[11px] text-white/50 line-clamp-1">{item.description}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Detail overlay — same as places page (image + map split) */}
      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          isFavorited={favorites.includes(selectedPlace.id)}
          onToggleFavorite={() => setFavorites((prev) => prev.includes(selectedPlace.id) ? prev.filter((f) => f !== selectedPlace.id) : [...prev, selectedPlace.id])}
          onClose={() => setSelectedPlace(null)}
        />
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

  const tabOrder = ['', 'itinerary', 'calendar', 'hotels', 'flights', 'restaurants', 'activities', 'packing', 'budget', 'cars', 'favorites'];
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

  // Skip fancy animation when coming from/going to calendar — it causes a jarring flash
  const wasCalendarRef = useRef(isCalendar);
  useEffect(() => { wasCalendarRef.current = isCalendar; }, [isCalendar]);
  const skipAnimation = isCalendar || wasCalendarRef.current;

  const pageVariants = skipAnimation ? {
    initial: { opacity: 1 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  } : {
    initial: { opacity: 0, y: dir > 0 ? 20 : -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
  };

  // Calendar gets full-screen layout with hover-reveal sidebar
  if (isCalendar) {
    return (
      <TripThemeProvider trip={trip}>
        <ItineraryProvider tripId={tripId}>
          <div className="w-screen overflow-hidden relative" style={{ height: 'calc(100vh - 48px)', marginTop: 48 }}>
            {/* Hover-reveal sidebar — invisible strip on the left, expands on hover */}
            <div className="fixed left-0 top-0 bottom-0 z-50 w-3 hover:w-auto group">
              {/* Thin hover trigger strip */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 rounded-r-full bg-white/10 group-hover:opacity-0 transition-opacity" />
              {/* Sidebar — slides in on hover */}
              <div className="h-full opacity-0 -translate-x-full group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out pointer-events-none group-hover:pointer-events-auto">
                <TripTabs tripId={tripId} position="left" dark />
              </div>
            </div>
            {children}
          </div>
        </ItineraryProvider>
      </TripThemeProvider>
    );
  }

  return (
    <div className="pb-14 md:pb-0 bg-white dark:bg-[var(--background)]">
      {/* Sidebar — always icon-only spine on desktop, bottom bar on mobile */}
      <TripTabs tripId={tripId} position="left" />

      {/* Compact trip header — all tabs */}
      <CompactTripHeader tripId={tripId} trip={trip} onTripUpdate={refetch} />

      {/* Content area */}
      <div className="mx-auto max-w-7xl">
        <div className="relative z-10">
          <ContentHeader
            tripId={tripId}
            mapOpen={mapOpen}
            onToggleMap={() => setMapOpen(!mapOpen)}
          />

          <div className="flex">
            {/* Main content */}
            <div className="flex-1 min-w-0 relative overflow-hidden px-5 md:pl-16 pt-4 pb-5">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={`tab-${currentSegment}`}
                  initial={pageVariants.initial}
                  animate={pageVariants.animate}
                  exit={pageVariants.exit}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Map side panel */}
            <AnimatePresence>
              {mapOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '35%', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                  className="hidden md:block shrink-0 border-l border-gray-200 dark:border-white/[0.08] overflow-hidden"
                >
                  <div className="sticky top-0 h-[calc(100vh-80px)] flex flex-col bg-white dark:bg-[var(--background)]">
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-white/[0.06] shrink-0">
                      <div className="flex items-center gap-2">
                        <Map size={13} className="text-[var(--trip-base)]" />
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                          {hasMarkers ? `${mapMarkers.length} locations` : (trip?.destination || 'Paris, France')}
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
                        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-[var(--background)]">
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
                            {trip?.destination || 'Paris, France'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Explore section — overview only (useful content, not decoration) */}
      {isOverview && (
        <div className="w-full relative z-10 bg-white dark:bg-[var(--background)]">
          <TripExploreSection trip={trip} />
        </div>
      )}
    </div>
  );
}
