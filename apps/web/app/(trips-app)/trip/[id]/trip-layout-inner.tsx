'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Map, RefreshCw, Share2, ImageIcon, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useItineraryScreen, formatDateRange, useAuthStore, isTripOwner } from '@travyl/shared';
import { ExplorePreview, OceanWave, Footer } from '@/components/home';
import { ItineraryProvider, useItineraryContext } from '@/components/itinerary/ItineraryContext';
import { ForkButton } from '@/components/trip/ForkButton';
import { TripThemeProvider } from '@/components/trip/TripThemeContext';
import { TripSidebar } from '@/components/trip/TripSidebar';

const LeafletMap = dynamic(() => import('@/components/leaflet-map'), { ssr: false });

// ─── Trip Hero Banner ───────────────────────────────────────

function TripHero({
  tripId,
}: {
  tripId: string;
}) {
  const { trip, isLoading, refetch } = useItineraryScreen(tripId);
  const user = useAuthStore((s) => s.user);
  const isOwner = trip ? isTripOwner(trip, user?.id ?? null) : false;

  const handleShare = async () => {
    if (!trip) return;
    const shareData = {
      title: trip.title ?? `Trip to ${trip.destination}`,
      text: `Check out my trip to ${trip.destination}! ${trip.start_date} – ${trip.end_date}`,
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (_) {}
    } else {
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
    }
  };

  // Buttons only shown for owners
  const ownerButtons = [
    { icon: RefreshCw, label: 'Regenerate', onClick: () => refetch() },
    { icon: Share2, label: 'Share', onClick: handleShare },
  ];

  const tripImage = trip?.trip_context?.hero_image_url;

  return (
    <div className="relative h-[200px] sm:h-[240px] overflow-hidden">
      {tripImage ? (
        <img src={tripImage} alt={trip?.destination ?? 'Trip'} className="w-full h-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center bg-slate-300">
          <ImageIcon size={32} className="text-slate-400" />
        </div>
      )}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}
      />
      <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center gap-1.5 mb-1.5">
          <MapPin size={14} className="text-white/60" />
          {trip && !isLoading ? (
            <span className="text-lg font-bold text-white">{trip.destination}</span>
          ) : (
            <div className="h-5 w-[55%] rounded-md bg-white/25" />
          )}
        </div>
        {trip && !isLoading ? (
          <span className="text-xs text-white/80">
            {formatDateRange(trip.start_date, trip.end_date)} · {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}
          </span>
        ) : (
          <div className="h-3 w-[45%] rounded-md bg-white/[0.18]" />
        )}
      </div>
      {/* Action buttons — bottom right */}
      <div className="absolute bottom-3 right-4 sm:right-6 flex gap-1.5">
        {/* Fork button - shown for non-owners */}
        {trip && !isOwner && <ForkButton trip={trip} variant="compact" />}
        {/* Owner buttons */}
        {isOwner && ownerButtons.map(({ icon: Icon, label, onClick }, i) => (
          <button
            key={i}
            onClick={onClick}
            title={label}
            className="flex items-center gap-1.5 h-[34px] px-3 rounded-xl border border-white/20 bg-white/10 text-white/80 hover:bg-white/20 backdrop-blur-md transition-all text-[11px] font-medium"
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
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
      <ItineraryProvider>
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
  const { trip } = useItineraryScreen(tripId);
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
  const isMagazineLayout = isOverview || currentSegment === 'itinerary';

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

  const pageVariants = {
    initial: { opacity: 0, rotateX: dir > 0 ? -15 : 15, y: dir > 0 ? 30 : -30, scale: 0.97 },
    animate: { opacity: 1, rotateX: 0, y: 0, scale: 1 },
    exit: { opacity: 0, rotateX: dir > 0 ? 15 : -15, y: dir > 0 ? -20 : 20, scale: 0.97 },
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-[var(--background)]">
      {/* Unified sidebar */}
      <TripSidebar tripId={tripId} />

      {/* Main content area */}
      {isCalendar ? (
        <div className="flex-1 min-w-0 overflow-hidden">
          {children}
        </div>
      ) : (
        <div className="flex-1 min-w-0 overflow-auto">
          <div
            className={`${useOverviewBg ? 'bg-[var(--magazine-bg)]' : 'bg-white dark:bg-[var(--background)]'}`}
            style={{ transition: 'background-color 0.5s ease' }}
          >
            <div className="mx-auto max-w-7xl">
              {/* Hero banner — hidden on overview (the cover replaces it) */}
              {!isOverview && currentSegment !== 'itinerary' && <TripHero tripId={tripId} />}
              {!isOverview && currentSegment !== 'itinerary' && <div className="h-2" />}

              {/* Content card */}
              <div
                className={`relative z-10 ${
                  isMagazineLayout
                    ? ''
                    : 'rounded-2xl border border-gray-200/80 dark:border-white/[0.08] bg-white dark:bg-[var(--background)] mx-2 sm:mx-4'
                }`}
                style={
                  isMagazineLayout
                    ? undefined
                    : { boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)' }
                }
              >
                <div className="flex flex-col">
                  {/* Content body */}
                  <div className="flex">
                    <div
                      className={`flex-1 min-w-0 relative overflow-hidden ${
                        isMagazineLayout ? '' : 'bg-white dark:bg-[var(--background)] px-5 pt-4 pb-5'
                      }`}
                      style={{ perspective: 1200 }}
                    >
                      <AnimatePresence mode="popLayout" initial={false} onExitComplete={handleExitComplete}>
                        <motion.div
                          key={`tab-${currentSegment}`}
                          layout
                          initial={pageVariants.initial}
                          animate={pageVariants.animate}
                          exit={pageVariants.exit}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          style={{ transformOrigin: 'center top' }}
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

            {/* Explore + Footer */}
            <div className="w-full bg-[var(--magazine-bg)] dark:bg-[var(--background)]">
              <div className="max-w-7xl mx-auto px-3 py-3">
                <ExplorePreview />
              </div>
              <OceanWave />
              <Footer />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
