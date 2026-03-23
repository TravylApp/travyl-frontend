'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Map, Calendar, RefreshCw, Share2, ImageIcon, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import TripTabs, { getTabMeta } from '@/components/trip-tabs';
import type { SpinePosition } from '@/components/trip-tabs';
import { useItineraryScreen, formatDateRange, useAuthStore, isTripOwner } from '@travyl/shared';
import { ExplorePreview, OceanWave, Footer } from '@/components/home';
import { ItineraryProvider, useItineraryContext } from '@/components/itinerary/ItineraryContext';
import { ForkButton } from '@/components/trip/ForkButton';
import { TripThemeProvider } from '@/components/trip/TripThemeContext';
import { TripMagazineHero } from '@/components/trip/TripMagazineHero';

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

  // Upscale Google Places hero image for full-width banner
  const rawImage = trip?.trip_context?.hero_image_url;
  const tripImage = rawImage?.includes('googleusercontent.com')
    ? rawImage.replace(/=w\d+-h\d+[^&]*/, '=w1200-h800-k-no')
    : rawImage;

  const city = trip?.destination?.split(',')[0]?.trim() ?? '';
  const country = trip?.destination?.split(',')[1]?.trim() ?? '';
  const ctx = trip?.trip_context;
  const weather = ctx?.weather?.current;
  const forecast = ctx?.weather?.forecast;
  const countryData = ctx?.country;

  return (
    <div className="relative min-h-[85vh] overflow-hidden">
      {/* Background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {tripImage ? (
        <img src={tripImage} alt={trip?.destination ?? 'Trip'} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] to-[#0f1d2e]" />
      )}
      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.75) 100%)' }} />

      {/* Magazine-style content overlay */}
      <div className="absolute inset-0 flex flex-col justify-between px-6 sm:px-10 pt-20 pb-6 sm:pb-10 max-w-7xl mx-auto">
        {/* ── Top: Title + Trip info ── */}
        <div>
          {country && (
            <span className="text-[11px] sm:text-[13px] tracking-[0.3em] uppercase font-semibold text-[#c8a96a] mb-1 block">{country}</span>
          )}
          {trip && !isLoading ? (
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white font-serif leading-[0.9] tracking-tight uppercase">
              {city}
            </h1>
          ) : (
            <div className="h-20 w-[60%] rounded-md bg-white/20" />
          )}
          {trip && !isLoading && (
            <div className="flex items-center gap-2 text-[13px] text-white/70 mt-3 flex-wrap">
              {trip.start_date && trip.end_date && (
                <>
                  <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
                  <span className="text-white/30">·</span>
                </>
              )}
              <span>{trip.travelers ?? 1} {(trip.travelers ?? 1) === 1 ? 'traveler' : 'travelers'}</span>
              {weather && (
                <>
                  <span className="text-white/30">·</span>
                  <span>{weather.temp}° / {weather.conditions}</span>
                </>
              )}
            </div>
          )}

          {/* Wikipedia excerpt */}
          {ctx?.wiki?.extract && (
            <p className="text-[13px] sm:text-[14px] leading-[1.7] text-white/60 font-serif max-w-lg mt-4 line-clamp-4">
              {ctx.wiki.extract}
            </p>
          )}
        </div>

        {/* ── Bottom: Quick facts + Weather ── */}
        <div>
          {countryData && (
            <div className="flex items-center gap-4 flex-wrap text-[11px] sm:text-[12px] text-white/90 mb-3">
              <span className="font-bold">{countryData.currency?.code} {countryData.currency?.symbol}</span>
              <span className="font-bold">{countryData.language}</span>
              <span className="font-bold">{countryData.timezone}</span>
              <span className="text-red-400 font-bold">112</span>
              <span className="text-white/50">Emergency</span>
            </div>
          )}

        {/* Weather forecast row */}
        {weather && forecast && (
          <div className="flex items-center gap-3 text-[11px] text-white/80 flex-wrap">
            <span className="font-bold text-white">{weather.temp}°</span>
            <span className="text-white/50 uppercase text-[10px]">Now</span>
            <span className="text-white/20">|</span>
            {forecast.slice(0, 5).map((d: { date: string; high: number; low: number; conditions: string }) => {
              const day = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
              return (
                <span key={d.date} className="flex items-center gap-1">
                  <span className="text-white/50 font-semibold">{day}</span>
                  <span className="font-bold text-white">{d.high}°</span>
                </span>
              );
            })}
          </div>
        )}
        </div>{/* end bottom section */}
      </div>

      {/* Action buttons — top right */}
      <div className="absolute top-4 right-4 sm:right-6 flex gap-1.5">
        {trip && !isOwner && <ForkButton trip={trip} variant="compact" />}
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

// ─── Content Header Bar (per-tab) ───────────────────────────

function ContentHeader({ tripId, mapOpen, onToggleMap }: {
  tripId: string;
  mapOpen: boolean;
  onToggleMap: () => void;
}) {
  const pathname = usePathname();
  const basePath = `/trip/${tripId}`;

  const suffix = pathname.replace(basePath, '').replace(/^\//, '');
  const segment = suffix || '';
  const tab = getTabMeta(segment);

  if (!tab) return null;

  const Icon = tab.icon;
  const isOverview = segment === '';

  // Overview + Itinerary: clean magazine look — no header bar (itinerary has its own controls)
  if (isOverview || segment === 'itinerary') return null;

  return (
    <div className="shrink-0 border-b bg-white dark:bg-[var(--background)] border-gray-100 dark:border-white/[0.06] px-5 pt-4 pb-3 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0"
          style={{ backgroundColor: tab.color }}
        >
          <Icon size={15} className="text-white" />
        </div>
        <div className="flex-1">
          <h2
            className="text-[17px] tracking-tight"
            style={{ color: 'var(--trip-base)', fontWeight: 700 }}
          >
            {tab.label}
          </h2>
          <p className="text-[12px] text-gray-400 dark:text-gray-500">{tab.subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href={`/trip/${tripId}/calendar`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200 border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-600 dark:border-white/10 dark:hover:bg-white/10 dark:hover:border-white/20 dark:text-gray-400"
            title="Calendar view"
          >
            <Calendar size={13} />
            <span className="text-[12px] font-medium">Calendar</span>
          </a>
          <button
            onClick={onToggleMap}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200 ${
              mapOpen
                ? 'text-white shadow-md scale-[1.02]'
                : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-600 dark:border-white/10 dark:hover:bg-white/10 dark:hover:border-white/20 dark:text-gray-400'
            }`}
            style={mapOpen ? { borderColor: 'var(--trip-base)', backgroundColor: 'var(--trip-base)' } : undefined}
            title={mapOpen ? 'Hide map' : 'Show map'}
          >
            <Map size={13} />
            <span className="text-[12px] font-medium">Map</span>
          </button>
        </div>
      </div>
      {/* Gradient underline */}
      <div
        className="mt-3 h-[2px] rounded-full opacity-80"
        style={{ background: `linear-gradient(90deg, ${tab.color}, ${tab.color}40, transparent)` }}
      />
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
  return (
    <TripThemeProvider tripId={tripId}>
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
  const [spinePosition, setSpinePosition] = useState<SpinePosition>("left");
  const [mapOpen, setMapOpen] = useState(false);
  const { trip } = useItineraryScreen(tripId);
  const { mapMarkers, selectedMarkerId, requestMapOpen, setRequestMapOpen } = useItineraryContext();
  const isTopMode = spinePosition === "top";
  const isVerticalSpine = spinePosition === "left" || spinePosition === "right";

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
  const isItinerary = currentSegment === 'itinerary';
  const isCalendar = currentSegment === 'calendar';
  const isMagazineLayout = isOverview || isItinerary;

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

  // Update direction in an effect to avoid ref mutation during render
  useEffect(() => {
    if (prevSegmentRef.current !== currentSegment) {
      const oldIdx = tabOrder.indexOf(prevSegmentRef.current);
      const newIdx = tabOrder.indexOf(currentSegment);
      directionRef.current = newIdx >= oldIdx ? 1 : -1;
      prevSegmentRef.current = currentSegment;
    }
  }, [currentSegment]);

  // Determine if map should show markers or single destination pin
  const hasMarkers = mapMarkers.length > 0;

  // Page transition — rolodex flip for side spine, horizontal slide for top
  const dir = directionRef.current;
  const pageVariants = isVerticalSpine
    ? {
        initial: { opacity: 0, rotateX: dir > 0 ? -15 : 15, y: dir > 0 ? 30 : -30, scale: 0.97 },
        animate: { opacity: 1, rotateX: 0, y: 0, scale: 1 },
        exit: { opacity: 0, rotateX: dir > 0 ? 15 : -15, y: dir > 0 ? -20 : 20, scale: 0.97 },
      }
    : {
        initial: { opacity: 0, x: dir > 0 ? 24 : -24 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: dir > 0 ? -12 : 12 },
      };

  // Calendar is a full-screen component with its own sidebar/navbar — bypass all layout chrome
  if (isCalendar) {
    return <>{children}</>;
  }

  return (
    <div
      className={`pb-14 md:pb-0 ${useOverviewBg ? 'bg-[var(--magazine-bg)] -mt-16 relative' : 'bg-white dark:bg-[var(--background)]'}`}
      style={{ transition: 'background-color 0.5s ease' }}
    >
      {/* Hero banner */}
      {isOverview ? (
        /* Magazine hero — image bleeds behind content below */
        <TripMagazineHero trip={trip} />
      ) : (
        currentSegment !== 'itinerary' && <TripHero tripId={tripId} />
      )}

      <div className="mx-auto max-w-7xl">

        {/* Suitcase card */}
        <div
          className={`relative z-10 ${
            isOverview || currentSegment === 'itinerary'
              ? ''
              : 'rounded-2xl border border-gray-200/80 dark:border-white/[0.08] bg-white dark:bg-[var(--background)] mx-2 sm:mx-4'
          }`}
          style={
            isOverview || currentSegment === 'itinerary'
              ? undefined
              : {
                  boxShadow:
                    '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                }
          }
        >
        <div className={`flex ${isTopMode ? 'flex-col' : 'flex-col md:flex-row'}`}>
          {/* Spine */}
          <TripTabs
            tripId={tripId}
            position={spinePosition}
            onPositionChange={setSpinePosition}
            dark={isOverview}
          />

          {/* Content area */}
          <div
            className="flex-1 flex flex-col min-w-0"
            style={{ order: spinePosition === "right" ? 0 : 1 }}
          >
            <ContentHeader
              tripId={tripId}
              mapOpen={mapOpen}
              onToggleMap={() => setMapOpen((v) => !v)}
            />

            {/* Content body */}
            <div className="flex">
              <div
                className={`flex-1 min-w-0 relative overflow-hidden ${
                  isOverview || currentSegment === 'itinerary' ? '' : 'bg-white dark:bg-[var(--background)] px-5 pt-4 pb-5'
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
                    style={isVerticalSpine ? { transformOrigin: 'center top' } : undefined}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Map side panel — sticky, follows scroll */}
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

      {/* Explore + Footer */}
      <div className="w-full bg-[var(--magazine-bg)] dark:bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-3 py-3">
          <ExplorePreview />
        </div>
        <OceanWave />
        <Footer />
      </div>
    </div>
  );
}
