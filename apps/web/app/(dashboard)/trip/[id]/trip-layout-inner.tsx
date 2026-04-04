'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Map, X } from 'lucide-react';
import type { Trip } from '@travyl/shared';
import { usePathname, useRouter } from 'next/navigation';
import TripTabs, { getTabMeta } from '@/components/trip-tabs';
import { useItineraryScreen, formatDateRange, useAuthStore, isTripOwner, canViewTrip, useDestinationImage } from '@travyl/shared';
import { OceanWave, Footer } from '@/components/home';
import { ItineraryProvider, useItineraryContext } from '@/components/itinerary/ItineraryContext';
import { TripThemeProvider } from '@/components/trip/TripThemeContext';
import { TripMagazineHero } from '@/components/trip/TripMagazineHero';
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

  // Overview + Itinerary: clean magazine look — no header bar
  if (segment === '' || segment === 'itinerary') return null;

  return (
    <div className="shrink-0 px-5 md:pl-20 pt-4 pb-3 z-20">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0 backdrop-blur-md" style={{ backgroundColor: `${tab.color}cc` }}>
          <Icon size={15} className="text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-[17px] tracking-tight text-white font-bold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{tab.label}</h2>
          <p className="text-[12px] text-white/60" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{tab.subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onToggleMap} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border backdrop-blur-md transition-all duration-200 ${mapOpen ? 'text-white shadow-md' : 'border-white/30 hover:bg-white/20 text-white'}`} style={mapOpen ? { borderColor: 'var(--trip-base)', backgroundColor: 'var(--trip-base)' } : undefined} title={mapOpen ? 'Hide map' : 'Show map'}>
            <Map size={13} />
            <span className="text-[12px] font-medium">Map</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Trip Explore Section (overview page — shows trip_context data) ──

export function TripExploreSection({ trip }: { trip: Trip | null }) {
  const city = trip?.destination?.split(',')[0]?.trim() || 'Destination';
  const ctx = trip?.trip_context;
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  type ExploreItem = { id: string; title?: string; name?: string; description?: string; category?: string; image?: string; images?: string[]; rating?: number; cuisines?: string[]; priceLevel?: string; tripAdvisorUrl?: string; lat?: number; lng?: number; address?: string; phone?: string; website?: string; reviewCount?: number };

  // Collect ALL items from every source
  const allItems: ExploreItem[] = [];
  const seen = new Set<string>();
  const addItems = (items: any[], fallbackCategory?: string) => {
    for (const item of items) {
      const key = item.id || item.title || item.name;
      if (!key || seen.has(key) || !item.image) continue;
      seen.add(key);
      allItems.push({ ...item, title: item.title || item.name, category: item.category || fallbackCategory || 'Attraction' });
    }
  };
  addItems(ctx?.explore_items || []);
  addItems(ctx?.foursquare_venues || []);
  if (ctx?.restaurants?.length) addItems(ctx.restaurants, 'Restaurant');
  for (const e of (ctx?.events || []) as any[]) {
    const key = e.id || e.title || e.name;
    if (!key || seen.has(key) || !(e.image || e.photo_url)) continue;
    seen.add(key);
    allItems.push({ id: e.id, title: e.title || e.name, name: e.title || e.name, description: `${e.date ? new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} ${e.venue ? '· ' + e.venue : ''}`.trim() || e.description || '', category: e.category || 'Event', image: e.image || e.photo_url });
  }

  // Group by category dynamically
  const grouped: Record<string, ExploreItem[]> = {};
  for (const item of allItems) {
    const cat = item.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }
  const toLabel = (cat: string) => cat.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const categories = Object.entries(grouped).filter(([, items]) => items.length > 0).map(([key, items]) => ({ key, label: toLabel(key), items }));

  if (categories.length === 0) return null;

  const toPlaceItem = (item: ExploreItem): PlaceItem => ({
    id: item.id, name: item.title || item.name || '', image: item.image || '',
    images: item.images?.length ? item.images : item.image ? [item.image] : [],
    type: /restaurant|food|culinary|dining/i.test(item.category || '') ? 'restaurant' : 'attraction',
    rating: item.rating || 0, tagline: item.description || item.category || '',
    category: item.category || '', description: item.description || '',
    tags: item.cuisines || (item.category ? [item.category] : []),
    latitude: item.lat || (trip?.trip_context?.lat ?? undefined),
    longitude: item.lng || (trip?.trip_context?.lng ?? undefined),
    address: item.address, phone: item.phone, website: item.website || item.tripAdvisorUrl,
    reviewCount: item.reviewCount,
    priceLevel: item.priceLevel === '$' ? 1 : item.priceLevel === '$$' ? 2 : item.priceLevel === '$$$' ? 3 : item.priceLevel === '$$$$' ? 4 : undefined,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:pl-20 py-8">
      <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--magazine-heading, #1e3a5f)' }}>Explore {city}</h2>
      <div className="space-y-6">
        {categories.map(({ key, label, items }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[14px] font-bold tracking-wide" style={{ color: 'var(--magazine-heading, #1e3a5f)', opacity: 0.7 }}>{label}</h3>
              <span className="text-[11px]" style={{ color: 'var(--magazine-text, #666)', opacity: 0.5 }}>{items.length} {items.length === 1 ? 'place' : 'places'}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
              {items.map((item: ExploreItem, idx: number) => (
                <div key={`${item.id}-${idx}`} onClick={() => setSelectedPlace(toPlaceItem(item))}
                  className="relative flex-shrink-0 w-[220px] rounded-2xl overflow-hidden shadow-lg group cursor-pointer hover:shadow-xl transition-shadow" style={{ height: 280 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image!} alt={item.title || item.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <button onClick={(e) => { e.stopPropagation(); setFavorites((prev) => prev.includes(item.id) ? prev.filter((f) => f !== item.id) : [...prev, item.id]); }}
                    className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform z-10 ${favorites.includes(item.id) ? 'bg-red-500' : 'bg-black/30'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={favorites.includes(item.id) ? 'white' : 'none'} stroke="white" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 p-3.5">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-white/50 mb-1">{item.category}</p>
                    <p className="text-[15px] font-bold text-white leading-tight line-clamp-2 mb-1">{item.title || item.name}</p>
                    {item.rating ? (
                      <div className="flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                        <span className="text-[12px] font-semibold text-white/80">{item.rating}</span>
                      </div>
                    ) : item.description ? (<p className="text-[11px] text-white/50 line-clamp-1">{item.description}</p>) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {selectedPlace && (
        <PlaceDetailModal place={selectedPlace} isFavorited={favorites.includes(selectedPlace.id)}
          onToggleFavorite={() => setFavorites((prev) => prev.includes(selectedPlace.id) ? prev.filter((f) => f !== selectedPlace.id) : [...prev, selectedPlace.id])}
          onClose={() => setSelectedPlace(null)} />
      )}
    </div>
  );
}

// ─── Bottom Photo Mosaic (full-bleed, matches hero width) ───

function TripPhotoMosaic({ photos, destination }: { photos: string[]; destination?: string }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    setCurrent(0);
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((c) => (c + 1) % photos.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [photos]);

  return (
    <div className="w-full relative overflow-hidden" style={{ height: 600, marginTop: -40 }}>
      {photos.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={src}
          alt={destination || 'Trip photo'}
                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms]"
          style={{ opacity: i === current ? 1 : 0, objectPosition: 'center 40%' }}
        />
      ))}
      {/* Top fade */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{
        height: '20%',
        background: 'linear-gradient(to bottom, var(--magazine-bg, #f5f0eb) 0%, transparent 100%)',
      }} />
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
        height: '20%',
        background: 'linear-gradient(to top, var(--magazine-bg, #f5f0eb) 0%, transparent 100%)',
      }} />
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
  const tripCity = trip?.destination?.split(',')[0]?.trim();
  const { data: destImageData, isLoading: destImageLoading } = useDestinationImage(tripCity || '');
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
  const isMagazineLayout = !isCalendar; // All tabs get magazine treatment except calendar

  // Track exit animation from magazine pages to prevent white flash
  const [exitingFromMagazine, setExitingFromMagazine] = useState(false);
  const wasMagazineRef = useRef(isMagazineLayout);

  useEffect(() => {
    if (wasMagazineRef.current && !isMagazineLayout) {
      setExitingFromMagazine(true);
    }
    wasMagazineRef.current = isMagazineLayout;
  }, [isMagazineLayout]);

  const handleExitComplete = () => {
    setExitingFromMagazine(false);
  };

  const isItinerary = currentSegment === 'itinerary';
  const useOverviewBg = isMagazineLayout || exitingFromMagazine;

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
    <div
      className={`pb-14 md:pb-0 ${useOverviewBg ? 'relative' : 'bg-white dark:bg-[var(--background)]'}`}
      style={{ transition: 'background-color 0.5s ease' }}
    >
      {/* Trip navigation sidebar — vertical on desktop, bottom bar on mobile */}
      <TripTabs tripId={tripId} position="left" dark={isMagazineLayout} />

      {/* Hero banner — all tabs, compact on non-overview */}
      <TripMagazineHero tripId={tripId} trip={trip} compact={!isOverview} onTripUpdate={refetch}
        overrideImage={destImageData?.url ?? undefined} suppressFallback={destImageLoading} />

      <div className="mx-auto max-w-7xl">

        {/* Content wrapper — flush, no card border */}
        <div className="relative z-10">
        <div>
          {/* Content area */}
          <div className="flex-1 flex flex-col min-w-0">
            <ContentHeader
              tripId={tripId}
              mapOpen={mapOpen}
              onToggleMap={() => setMapOpen(!mapOpen)}
            />

            <div className="flex">
              <div
                className="flex-1 min-w-0 relative overflow-hidden md:pl-20"
              >
                <AnimatePresence mode="popLayout" initial={false} onExitComplete={handleExitComplete}>
                  <motion.div
                    key={`tab-${currentSegment}`}
                    initial={pageVariants.initial}
                    animate={pageVariants.animate}
                    exit={pageVariants.exit}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className={!isOverview && !isItinerary && !isCalendar ? 'px-4 sm:px-6 pt-2 pb-8 mb-8 rounded-2xl backdrop-blur-md' : ''}
                    style={!isOverview && !isItinerary && !isCalendar ? { background: 'linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.95) 60px, rgba(255,255,255,0.98) 100%)' } : undefined}
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
                  className="hidden md:block shrink-0 border-l border-gray-200 overflow-hidden rounded-r-2xl"
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
      </div>

      </div>{/* end max-w-7xl */}

      {/* Bottom photo mosaic — full-bleed, shown on overview + itinerary */}
      {(isOverview || isItinerary) && (destImageData?.images?.length ?? 0) > 0 && (
        <TripPhotoMosaic photos={destImageData!.images} destination={trip?.destination} />
      )}

      {/* Trip Explore — only on overview page */}
      {isOverview && (
        <div className="w-full relative z-10">
          <TripExploreSection trip={trip} />
          <div className="h-24" />
        </div>
      )}

      {/* Footer — only on overview */}
      {isOverview && (
        <div className="w-full relative z-20 bg-[var(--magazine-bg)] dark:bg-[var(--background)]">
          <OceanWave />
          <Footer />
        </div>
      )}
    </div>
  );
}
