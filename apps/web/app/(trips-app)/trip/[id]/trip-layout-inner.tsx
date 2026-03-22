'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import { Map, MapPin, Calendar, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import TripTabs, { getTabMeta } from '@/components/trip-tabs';
import type { SpinePosition } from '@/components/trip-tabs';
import { useItineraryScreen } from '@travyl/shared';
import { ExplorePreview, OceanWave, Footer } from '@/components/home';
import { ItineraryProvider, useItineraryContext } from '@/components/itinerary/ItineraryContext';
import { TripThemeProvider } from '@/components/trip/TripThemeContext';
import { TripMagazineHero } from '@/components/trip/TripMagazineHero';

const LeafletMap = dynamic(() => import('@/components/leaflet-map'), { ssr: false });


// ─── Per-tab hero images ────────────────────────────────────
const TAB_HERO_IMAGES: Record<string, string> = {
  hotels:      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1400&q=85',
  flights:     'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1400&q=85',
  restaurants: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=85',
  activities:  'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1400&q=85',
  packing:     'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1400&q=85',
  favorites:   'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1400&q=85',
  cars:        'https://images.unsplash.com/photo-1449965408869-ebd3fee7710d?w=1400&q=85',
};

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

  const isOverview = segment === '';

  // Overview + Itinerary: clean magazine look — no header bar (itinerary has its own controls)
  if (isOverview || segment === 'itinerary') return null;

  return (
    <div className="shrink-0 px-6 sm:px-10 pt-4 pb-3 relative z-20">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <span className="inline-block text-[10px] tracking-[0.3em] uppercase font-semibold mb-1 px-2.5 py-1 rounded-full backdrop-blur-md"
            style={{ backgroundColor: 'rgba(200,169,106,0.15)', color: 'var(--magazine-accent, #c8a96a)', border: '1px solid rgba(200,169,106,0.25)' }}>
            {tab.subtitle}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
            {tab.label}
          </h2>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md"
          style={{ backgroundColor: 'var(--magazine-bg, rgba(245,240,235,0.85))' }}>
          <a
            href={`/trip/${tripId}/calendar`}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
            style={{ border: '1px solid var(--magazine-border, rgba(0,0,0,0.15))' }}
            title="Calendar view"
          >
            <Calendar size={13} style={{ color: 'var(--magazine-text, var(--muted-foreground))' }} />
          </a>
          <button
            onClick={onToggleMap}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
            style={{
              border: '1px solid var(--magazine-border, rgba(0,0,0,0.15))',
              backgroundColor: mapOpen ? 'var(--magazine-accent, #c8a96a)' : 'transparent',
              color: mapOpen ? 'white' : 'var(--magazine-text, var(--muted-foreground))',
            }}
            title={mapOpen ? 'Hide map' : 'Show map'}
          >
            <Map size={13} />
          </button>
        </div>
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
  return (
    <TripThemeProvider tripId={tripId}>
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
  const [spinePosition, setSpinePosition] = useState<SpinePosition>("left");
  const [mapOpen, setMapOpen] = useState(false);
  const { trip } = useItineraryScreen(tripId);
  const { mapMarkers, selectedMarkerId, requestMapOpen, setRequestMapOpen } = useItineraryContext();
  const isTopMode = spinePosition === "top";
  const isVerticalSpine = spinePosition === "left" || spinePosition === "right";
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContentHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Page-slide direction tracking
  const pathname = usePathname();
  const basePath = `/trip/${tripId}`;
  const currentSegment = pathname.replace(basePath, '').replace(/^\//, '') || '';
  const isOverview = currentSegment === '';

  // Close map when on overview page
  useEffect(() => {
    if (isOverview && mapOpen) {
      setMapOpen(false);
      setRequestMapOpen(false);
    }
  }, [isOverview, mapOpen, setRequestMapOpen]);

  // Sync map open with context requests (skip on overview)
  useEffect(() => {
    if (isOverview) return;
    if (requestMapOpen && !mapOpen) setMapOpen(true);
    if (!requestMapOpen && mapOpen) setMapOpen(false);
  }, [requestMapOpen, mapOpen, isOverview]);

  // When map is manually closed, clear the request
  const handleCloseMap = () => {
    setMapOpen(false);
    setRequestMapOpen(false);
  };
  const handleExitComplete = () => {};

  const tabOrder = ['', 'itinerary', 'hotels', 'flights', 'restaurants', 'activities', 'packing', 'budget', 'cars', 'favorites', 'settings'];
  const prevSegmentRef = useRef(currentSegment);
  const directionRef = useRef<1 | -1>(1);
  const router = useRouter();

  // Drag-to-change-tab gesture
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const isDraggingPage = useRef(false);
  const dragLocked = useRef<'x' | 'y' | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const el = e.target as HTMLElement;
    // Skip any interactive element or anything inside a no-swipe zone
    if (el.closest('button, a, input, textarea, select, [draggable], [data-no-page-swipe]')) return;
    if (['img', 'canvas', 'video'].includes(el.tagName.toLowerCase())) return;

    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    isDraggingPage.current = false;
    dragLocked.current = null;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current === 0) return;
    const dx = e.clientX - dragStartX.current;
    const dy = e.clientY - dragStartY.current;

    // Lock axis after 8px movement
    if (!dragLocked.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      dragLocked.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }

    // Only handle horizontal drags
    if (dragLocked.current !== 'x') return;

    isDraggingPage.current = true;
    setDragOffset(dx * 0.3); // damped so it feels weighted
  };

  const handlePointerUp = () => {
    if (isDraggingPage.current && dragLocked.current === 'x') {
      const dx = dragOffset / 0.3; // un-damp for threshold check
      const currentIdx = tabOrder.indexOf(currentSegment);

      if (dx < -80 && currentIdx < tabOrder.length - 1) {
        // Swiped left → next tab
        const next = tabOrder[currentIdx + 1];
        router.push(`/trip/${tripId}${next ? `/${next}` : ''}`);
      } else if (dx > 80 && currentIdx > 0) {
        // Swiped right → previous tab
        const prev = tabOrder[currentIdx - 1];
        router.push(`/trip/${tripId}${prev ? `/${prev}` : ''}`);
      }
    }

    dragStartX.current = 0;
    dragStartY.current = 0;
    isDraggingPage.current = false;
    dragLocked.current = null;
    setDragOffset(0);
  };

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
  // Magazine page-turn — lightweight rotateY
  const dir = directionRef.current;
  const pageVariants = {
    initial: {
      opacity: 0,
      rotateY: dir > 0 ? 20 : -20,
      x: dir > 0 ? 40 : -40,
    },
    animate: {
      opacity: 1,
      rotateY: 0,
      x: 0,
    },
    exit: {
      opacity: 0,
      rotateY: dir > 0 ? -15 : 15,
      x: dir > 0 ? -30 : 30,
    },
  };

  return (
    <div
      className="bg-[var(--magazine-bg)] dark:bg-[var(--background)] -mt-16"
      style={{ transition: 'background-color 0.3s ease' }}
    >
      <div className="mx-auto max-w-7xl">

        {/* Suitcase card */}
        <div className="relative z-10">
        <div className={`flex ${isTopMode ? 'flex-col' : 'flex-col md:flex-row'}`}>
          {/* Spine */}
          <TripTabs
            tripId={tripId}
            position={spinePosition}
            onPositionChange={setSpinePosition}
            dark
          />

          {/* Content area — drag to change tabs */}
          <div
            className="flex-1 flex flex-col min-w-0 touch-pan-y"
            style={{ order: spinePosition === "right" ? 0 : 1 }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* Magazine hero — consistent across all tabs, image changes per tab */}
            <TripMagazineHero tripId={tripId} trip={trip} overrideImage={TAB_HERO_IMAGES[currentSegment]} />

            <ContentHeader
              tripId={tripId}
              mapOpen={mapOpen}
              onToggleMap={() => setRequestMapOpen((v: boolean) => !v)}
            />

            {/* Content body */}
            <div className="flex items-start bg-[var(--magazine-bg)] dark:bg-[var(--background)]">
              <div
                ref={contentRef}
                className={`flex-1 min-w-0 relative overflow-hidden ${
                  !isOverview && currentSegment !== 'itinerary'
                    ? 'px-6 sm:px-10 pb-6'
                    : ''
                }`}
                style={{ perspective: 1200 }}
              >
                <AnimatePresence mode="popLayout" initial={false} onExitComplete={handleExitComplete}>
                  <motion.div
                    key={`tab-${currentSegment}`}
                    initial={pageVariants.initial}
                    animate={{
                      ...pageVariants.animate,
                      x: dragOffset,
                      rotateY: dragOffset ? dragOffset * -0.12 : 0,
                    }}
                    exit={pageVariants.exit}
                    transition={dragOffset
                      ? { duration: 0 }
                      : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
                    }
                    style={{
                      transformOrigin: dragOffset > 0 ? 'left center' : 'right center',
                      willChange: 'transform, opacity',
                    }}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Map side panel — sticky, follows scroll */}
              <AnimatePresence>
              {mapOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0, x: 40 }}
                  animate={{ width: '30%', opacity: 1, x: 0 }}
                  exit={{ width: 0, opacity: 0, x: 40 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="hidden md:block shrink-0 border-l border-gray-200 overflow-hidden mt-16"
                  style={{ maxWidth: 380 }}
                >
                  <div className="sticky top-16 flex flex-col bg-white dark:bg-[var(--background)] overflow-hidden" style={{ height: contentHeight > 0 ? contentHeight : 'calc(100vh - 4rem)', maxHeight: 'calc(100vh - 4rem)' }}>
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
      <div className="relative z-10 w-full bg-[var(--magazine-surface)] dark:bg-[var(--background)]">
        <div className="border-t border-[var(--magazine-border)]" />
        <div className="max-w-7xl mx-auto px-3 py-6">
          <ExplorePreview />
        </div>
        <OceanWave />
        <Footer />
      </div>
    </div>
  );
}
