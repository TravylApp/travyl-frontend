'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'motion/react';

const ResponsiveMasonry = dynamic(
  () => import('react-responsive-masonry').then((m) => m.ResponsiveMasonry),
  { ssr: false },
);
const Masonry = dynamic(
  () => import('react-responsive-masonry').then((m) => m.default),
  { ssr: false },
);
import Image from 'next/image';
import {
  Search, Globe, Landmark, UtensilsCrossed, Compass, CalendarDays, Heart,
  MapPin, ArrowUpDown, Star, X, ChevronLeft, ChevronRight,
  LayoutGrid, Layers, Clock, Lightbulb, Maximize2, Minimize2,
} from 'lucide-react';
import type { PanInfo } from 'motion/react';
import { MOCK_PLACES, groupPlacesByCollection, useSimilarPlaces } from '@travyl/shared';
import type { PlaceItem } from '@travyl/shared';
import { PinCard } from '@/components/PinCard';
import { PlaceDetailOverlay } from '@/components/PlaceDetailOverlay';

import { Footer, OceanWave } from '@/components/home';

const LeafletMap = dynamic(() => import('@/components/leaflet-map'), { ssr: false });


type SortKey = 'default' | 'rating' | 'name';
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'rating', label: 'Top Rated' },
  { key: 'name', label: 'A–Z' },
];

const TABS = [
  { key: 'all', label: 'All', icon: Globe },
  { key: 'destination', label: 'Destinations', icon: MapPin },
  { key: 'attraction', label: 'Attractions', icon: Landmark },
  { key: 'restaurant', label: 'Restaurants', icon: UtensilsCrossed },
  { key: 'experience', label: 'Experiences', icon: Compass },
  { key: 'event', label: 'Events', icon: CalendarDays },
  { key: 'favorites', label: 'Favorites', icon: Heart },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const ITEMS_PER_PAGE = 16;

export default function PlacesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeSubcategory, setActiveSubcategory] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [selectedPlace, _setSelectedPlace] = useState<PlaceItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [viewMode, setViewMode] = useState<'grid' | 'stack'>('grid');
  const [columnCount, setColumnCount] = useState(4);
  const [showFilters, setShowFilters] = useState(false);
  const [showPostcard, setShowPostcard] = useState(false);
  const [gridShowcase, setGridShowcase] = useState(false);
  const [gridShowcaseIdx, setGridShowcaseIdx] = useState(0);
  const [gridPhase, setGridPhase] = useState<'magazine' | 'card'>('magazine');
  const [gridDirection, setGridDirection] = useState(0);
  const gridTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gridPhaseRef = useRef<NodeJS.Timeout | null>(null);
  const setSelectedPlace = (p: PlaceItem | null) => { _setSelectedPlace(p); };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  };

  // Responsive column count on mount
  useEffect(() => {
    const w = window.innerWidth;
    if (w < 550) setColumnCount(1);
    else if (w < 900) setColumnCount(2);
    else if (w < 1200) setColumnCount(3);
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [activeTab, activeSubcategory, searchQuery, sortBy]);

  // Filter by tab
  const tabFiltered = useMemo(() => {
    if (activeTab === 'all') return MOCK_PLACES;
    if (activeTab === 'favorites') return MOCK_PLACES.filter((p) => favorites.includes(p.id));
    return MOCK_PLACES.filter((p) => p.type === activeTab);
  }, [activeTab, favorites]);

  // Compute subcategories from current tab
  const subcategories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of tabFiltered) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({ label: cat, count }));
  }, [tabFiltered]);

  // Filter by subcategory + search
  const filtered = useMemo(() => {
    let items = tabFiltered;

    if (activeSubcategory) {
      items = items.filter((p) => p.category === activeSubcategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Sort
    if (sortBy === 'rating') items = [...items].sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'name') items = [...items].sort((a, b) => a.name.localeCompare(b.name));

    return items;
  }, [tabFiltered, activeSubcategory, searchQuery, sortBy]);

  const visibleItems = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Reset showcase when filters/view change
  useEffect(() => {
    setGridShowcase(false);
    if (gridTimerRef.current) clearTimeout(gridTimerRef.current);
    if (gridPhaseRef.current) clearTimeout(gridPhaseRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, activeTab, searchQuery, sortBy]);

  const gridGoNext = useCallback(() => {
    if (gridPhaseRef.current) clearTimeout(gridPhaseRef.current);
    setGridDirection(1);
    setGridShowcaseIdx((i) => (i + 1) % filtered.length);
    setGridPhase('card');
    gridPhaseRef.current = setTimeout(() => setGridPhase('magazine'), 5000);
  }, [filtered.length]);

  const gridGoPrev = useCallback(() => {
    if (gridPhaseRef.current) clearTimeout(gridPhaseRef.current);
    setGridDirection(-1);
    setGridShowcaseIdx((i) => (i === 0 ? filtered.length - 1 : i - 1));
    setGridPhase('card');
    gridPhaseRef.current = setTimeout(() => setGridPhase('magazine'), 5000);
  }, [filtered.length]);

  const openGridShowcase = useCallback((placeId: string) => {
    const idx = filtered.findIndex((p) => p.id === placeId);
    if (idx === -1) return;
    if (gridPhaseRef.current) clearTimeout(gridPhaseRef.current);
    if (gridTimerRef.current) clearTimeout(gridTimerRef.current);
    setGridShowcaseIdx(idx);
    setGridDirection(0);
    setGridPhase('card');
    setGridShowcase(true);
    gridPhaseRef.current = setTimeout(() => setGridPhase('magazine'), 5000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [filtered]);

  const dismissGridShowcase = useCallback(() => {
    setGridShowcase(false);
    if (gridPhaseRef.current) clearTimeout(gridPhaseRef.current);
    if (gridTimerRef.current) clearTimeout(gridTimerRef.current);
  }, []);

  // Height-balanced column distribution for a given set of items
  const balanceIntoCols = useCallback((items: PlaceItem[], maxCols?: number) => {
    const colCount = maxCols ?? columnCount;
    if (colCount <= 0) return null;
    const cols: PlaceItem[][] = Array.from({ length: colCount }, () => []);
    const heights = new Array(colCount).fill(0);
    for (const item of items) {
      const hash = (() => { let h = 0; for (let i = 0; i < (item.id + 'ar').length; i++) h = ((h << 5) - h + (item.id + 'ar').charCodeAt(i)) | 0; return Math.abs(h); })();
      const ar = 0.95 + (hash % 20) / 100;
      const imgH = 1 / ar;
      const contentH = 0.3;
      const h = imgH + contentH;
      const shortest = heights.indexOf(Math.min(...heights));
      cols[shortest].push(item);
      heights[shortest] += h;
    }
    return cols;
  }, [columnCount]);

  const distributeRoundRobin = useCallback((items: PlaceItem[], maxCols?: number) => {
    const colCount = Math.min(maxCols ?? columnCount, items.length);
    if (colCount <= 0) return null;
    const cols: PlaceItem[][] = Array.from({ length: colCount }, () => []);
    items.forEach((item, i) => cols[i % colCount].push(item));
    return cols;
  }, [columnCount]);

  const balancedCols = useMemo(() => balanceIntoCols(visibleItems), [visibleItems, balanceIntoCols]);

  const themedSections = useMemo(() => groupPlacesByCollection(filtered), [filtered]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1">
      {/* Sticky Header */}
      <div className="sticky top-11 z-40 bg-white/95 backdrop-blur-md">
        {/* Row 1: Tabs + Search */}
        <div className="max-w-7xl mx-auto px-4 pt-2 pb-0">
          <div className="flex items-center gap-2">
            <div className="shrink-0 overflow-x-auto scrollbar-hide">
              <div className="flex gap-0 -mb-px">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => { setActiveTab(key); setActiveSubcategory(''); }}
                    className={`flex items-center gap-1.5 px-3 py-2 text-[12px] whitespace-nowrap border-b-2 transition-all shrink-0 ${
                      activeTab === key
                        ? 'border-[#1e3a5f] text-[#1e3a5f] font-semibold'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Icon size={13} />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="relative flex-1 min-w-0">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-[11px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        {/* Row 2: Controls */}
        <div className="max-w-7xl mx-auto px-4 py-1.5">
          <div className="flex items-center gap-2">
            {/* Filter toggle + inline pills */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
              {subcategories.length > 1 && (
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all shrink-0 ${
                    showFilters || activeSubcategory
                      ? 'bg-[#1e3a5f] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>Filters</span>
                  {activeSubcategory && !showFilters && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                  )}
                  <motion.div
                    animate={{ rotate: showFilters ? 90 : 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ChevronRight size={11} />
                  </motion.div>
                </button>
              )}

              {/* Inline filter pills — pop out to the right */}
              <AnimatePresence>
                {showFilters && subcategories.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-1 overflow-x-auto scrollbar-hide min-w-0 flex-1"
                  >
                    <motion.button
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ delay: 0.05, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => setActiveSubcategory('')}
                      className={`px-2.5 py-1 rounded-full text-[10px] whitespace-nowrap transition-colors shrink-0 ${
                        !activeSubcategory
                          ? 'bg-[#1e3a5f] text-white font-medium'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </motion.button>
                    {subcategories.map(({ label }, i) => (
                      <motion.button
                        key={label}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ delay: 0.05 + (i + 1) * 0.03, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        onClick={() => setActiveSubcategory(label === activeSubcategory ? '' : label)}
                        className={`px-2.5 py-1 rounded-full text-[10px] whitespace-nowrap transition-colors shrink-0 ${
                          activeSubcategory === label
                            ? 'bg-[#1e3a5f] text-white font-medium'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Active filter badge — quick clear (when pills hidden) */}
              {activeSubcategory && !showFilters && (
                <motion.button
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  onClick={() => setActiveSubcategory('')}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] text-[10px] font-medium shrink-0"
                >
                  {activeSubcategory}
                  <X size={10} />
                </motion.button>
              )}
            </div>

            {/* Sort — grid mode only */}
            <AnimatePresence>
              {viewMode === 'grid' && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative shrink-0 overflow-hidden"
                >
                  <ArrowUpDown size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    className="appearance-none pl-6 pr-5 py-1.5 bg-gray-100 rounded-full text-[10px] text-gray-600 focus:outline-none cursor-pointer hover:bg-gray-200 transition-colors"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.key} value={o.key}>{o.label}</option>
                    ))}
                  </select>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Expand toggle — stack mode only */}
            <AnimatePresence>
              {viewMode === 'stack' && (
                <motion.button
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setShowPostcard((v) => !v)}
                  className={`shrink-0 p-1.5 rounded-full transition-colors overflow-hidden ${
                    showPostcard
                      ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                  title={showPostcard ? 'Card view' : 'Expanded view'}
                >
                  {showPostcard ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </motion.button>
              )}
            </AnimatePresence>

            {/* Column count — grid mode only, md+ */}
            <AnimatePresence>
              {viewMode === 'grid' && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="hidden md:flex items-center bg-gray-100 rounded-full p-0.5 shrink-0 overflow-hidden"
                >
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setColumnCount(n)}
                      className="relative w-7 h-7 rounded-full flex items-center justify-center"
                    >
                      {columnCount === n && (
                        <motion.div
                          layoutId="colToggle"
                          className="absolute inset-0 bg-white rounded-full shadow-sm"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                      <span className={`relative z-10 text-[11px] font-semibold transition-colors ${
                        columnCount === n ? 'text-[#1e3a5f]' : 'text-gray-400'
                      }`}>{n}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* View mode toggle */}
            <div className="flex items-center bg-gray-100 rounded-full p-0.5 shrink-0">
              {(['grid', 'stack'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="relative p-1.5 rounded-full"
                  title={mode === 'grid' ? 'Grid view' : 'Stack view'}
                >
                  {viewMode === mode && (
                    <motion.div
                      layoutId="viewToggle"
                      className="absolute inset-0 bg-white rounded-full shadow-sm"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 block">
                    {mode === 'grid'
                      ? <LayoutGrid size={13} className={`transition-colors ${viewMode === mode ? 'text-[#1e3a5f]' : 'text-gray-400'}`} />
                      : <Layers size={13} className={`transition-colors ${viewMode === mode ? 'text-[#1e3a5f]' : 'text-gray-400'}`} />
                    }
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Content: Grid or Stack */}
      {viewMode === 'grid' ? (
        <div
          className={`mx-auto px-6 lg:px-10 xl:px-14 py-4 transition-all duration-300 ${
            columnCount === 2 ? 'max-w-5xl' : columnCount === 3 ? 'max-w-6xl' : ''
          }`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0l40 40M40 0L0 40' stroke='%23000' stroke-width='0.3' opacity='0.03'/%3E%3C/svg%3E")`,
          }}
        >
          {/* Grid idle showcase curtain */}
          <AnimatePresence>
            {gridShowcase && filtered[gridShowcaseIdx] && (
              <motion.div
                key="grid-showcase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-6 relative"
              >
                {/* Close button */}
                <button
                  onClick={dismissGridShowcase}
                  className="absolute top-2 right-2 z-30 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                >
                  <X size={14} className="text-gray-500" />
                </button>
                <AnimatePresence mode="wait">
                  {gridPhase === 'card' ? (
                    /* Card stack with shuffle animation + clickable peek cards */
                    <motion.div
                      key="grid-card-phase"
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96, y: -20 }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="relative mx-auto flex items-center justify-center"
                      style={{ maxWidth: 900, height: 480 }}
                    >
                      {(() => {
                        const prevP = filtered[gridShowcaseIdx === 0 ? filtered.length - 1 : gridShowcaseIdx - 1];
                        const nextP = filtered[(gridShowcaseIdx + 1) % filtered.length];
                        const nextNextP = filtered[(gridShowcaseIdx + 2) % filtered.length];
                        // Deck-of-cards animation: exit pulls card toward viewer, enter reveals from behind
                        const shuffleVariants = {
                          enter: (d: number) => ({ scale: 0.85, y: 30, opacity: 0, rotate: d > 0 ? 2 : -2 }),
                          center: { x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 },
                          exit: (d: number) => ({ scale: 1.15, y: -50, opacity: 0, rotate: d > 0 ? -4 : 4 }),
                        };
                        return (
                          <>
                            {/* Left peek card — clickable */}
                            <div
                              className="hidden md:block absolute rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:opacity-50"
                              style={{ width: 280, height: 400, opacity: 0.35, zIndex: 1, left: 20, top: '50%', transform: 'translateY(-50%) rotate(-6deg)' }}
                              onClick={gridGoPrev}
                            >
                              <div className="relative w-full h-full">
                                <Image src={prevP.image} alt={prevP.name} fill className="object-cover" sizes="280px" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                  <p className="font-bold uppercase tracking-wider text-[#7dd3fc] text-[8px] mb-1">{prevP.type}</p>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-white font-extrabold text-base leading-tight truncate">{prevP.name}</h4>
                                    {prevP.rating != null && (
                                      <span className="flex items-center gap-0.5 bg-black/45 text-white rounded-lg px-1.5 py-0.5 shrink-0">
                                        <Star size={9} className="text-yellow-400 fill-yellow-400" />
                                        <span className="text-[10px] font-bold">{prevP.rating.toFixed(1)}</span>
                                      </span>
                                    )}
                                  </div>
                                  {prevP.tagline && (
                                    <div className="flex items-center gap-1">
                                      <MapPin size={10} className="text-white/60 shrink-0" />
                                      <span className="text-xs text-white/60 truncate">{prevP.tagline}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Center card stack */}
                            <div className="relative" style={{ width: 400, height: 480, zIndex: 5 }}>
                              {/* Back card 2 */}
                              <div
                                className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
                                style={{ transform: 'scale(0.88) translateY(24px)', opacity: 0.3 }}
                              >
                                <Image src={nextNextP.image} alt="" fill className="object-cover" sizes="380px" />
                              </div>
                              {/* Back card 1 */}
                              <div
                                className="absolute inset-0 rounded-2xl overflow-hidden shadow-md pointer-events-none"
                                style={{ transform: 'scale(0.94) translateY(12px)', opacity: 0.6 }}
                              >
                                <Image src={nextP.image} alt="" fill className="object-cover" sizes="380px" />
                              </div>
                              {/* Active card — shuffle animation */}
                              <AnimatePresence mode="popLayout" custom={gridDirection}>
                                <motion.div
                                  key={gridShowcaseIdx}
                                  custom={gridDirection}
                                  variants={shuffleVariants}
                                  initial="enter"
                                  animate="center"
                                  exit="exit"
                                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                  className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl"
                                  style={{ zIndex: 10 }}
                                >
                                  <div className="relative w-full h-full bg-black">
                                    <Image src={filtered[gridShowcaseIdx].image} alt={filtered[gridShowcaseIdx].name} fill className="object-cover" sizes="400px" priority />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                                    {/* Favorite button */}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleFavorite(filtered[gridShowcaseIdx].id); }}
                                      className={`absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                        favorites.includes(filtered[gridShowcaseIdx].id) ? 'bg-red-500/20 border border-red-400/60' : 'bg-white/90 backdrop-blur-sm'
                                      }`}
                                    >
                                      <Heart size={14} className={favorites.includes(filtered[gridShowcaseIdx].id) ? 'text-red-400 fill-red-400' : 'text-gray-400'} />
                                    </button>

                                    <div className="absolute bottom-0 left-0 right-0 p-5">
                                      <p className="font-bold uppercase tracking-wider text-[#7dd3fc] text-[10px] mb-1.5">{filtered[gridShowcaseIdx].type}</p>
                                      <div className="flex items-center gap-2.5 mb-1.5">
                                        <h3 className="text-white font-extrabold text-xl leading-tight drop-shadow-md">{filtered[gridShowcaseIdx].name}</h3>
                                        {filtered[gridShowcaseIdx].rating != null && (
                                          <span className="flex items-center gap-1 bg-black/45 text-white rounded-lg px-2 py-0.5 shrink-0">
                                            <Star size={11} className="text-yellow-400 fill-yellow-400" />
                                            <span className="text-xs font-bold">{filtered[gridShowcaseIdx].rating.toFixed(1)}</span>
                                          </span>
                                        )}
                                      </div>
                                      {filtered[gridShowcaseIdx].tagline && (
                                        <div className="flex items-center gap-1 mb-2">
                                          <MapPin size={12} className="text-white/60 shrink-0" />
                                          <span className="text-sm text-white/60 truncate">{filtered[gridShowcaseIdx].tagline}</span>
                                        </div>
                                      )}
                                      {filtered[gridShowcaseIdx].description && (
                                        <p className="text-[13px] text-white/70 leading-snug line-clamp-2">{filtered[gridShowcaseIdx].description}</p>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              </AnimatePresence>
                            </div>

                            {/* Right peek card — clickable */}
                            <div
                              className="hidden md:block absolute rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:opacity-50"
                              style={{ width: 280, height: 400, opacity: 0.35, zIndex: 1, right: 20, top: '50%', transform: 'translateY(-50%) rotate(6deg)' }}
                              onClick={gridGoNext}
                            >
                              <div className="relative w-full h-full">
                                <Image src={nextP.image} alt={nextP.name} fill className="object-cover" sizes="280px" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                  <p className="font-bold uppercase tracking-wider text-[#7dd3fc] text-[8px] mb-1">{nextP.type}</p>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-white font-extrabold text-base leading-tight truncate">{nextP.name}</h4>
                                    {nextP.rating != null && (
                                      <span className="flex items-center gap-0.5 bg-black/45 text-white rounded-lg px-1.5 py-0.5 shrink-0">
                                        <Star size={9} className="text-yellow-400 fill-yellow-400" />
                                        <span className="text-[10px] font-bold">{nextP.rating.toFixed(1)}</span>
                                      </span>
                                    )}
                                  </div>
                                  {nextP.tagline && (
                                    <div className="flex items-center gap-1">
                                      <MapPin size={10} className="text-white/60 shrink-0" />
                                      <span className="text-xs text-white/60 truncate">{nextP.tagline}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </motion.div>
                  ) : (
                    /* Magazine curtain */
                    <motion.div
                      key={`grid-mag-${gridShowcaseIdx}`}
                      initial="closed"
                      animate="open"
                      exit="closed"
                      variants={CURTAIN_VARIANTS}
                    >
                      <MagazineCurtain place={filtered[gridShowcaseIdx]} totalCount={filtered.length} placeIndex={gridShowcaseIdx} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation arrows — outside phase AnimatePresence so they stay centered */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <button
                    onClick={gridGoPrev}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {gridShowcaseIdx + 1} / {filtered.length}
                  </span>
                  <button
                    onClick={gridGoNext}
                    className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!gridShowcase && (
            <motion.div
              key={`${activeTab}-${activeSubcategory}-${searchQuery}-${sortBy}`}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.08 }}
            >
              {filtered.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-400">
                      {filtered.length} places
                    </p>
                  </div>

                  {themedSections.sections.map(({ collection, places: sectionPlaces }) => {
                    const cols = distributeRoundRobin(sectionPlaces);
                    const gapClass = columnCount === 2 ? 'gap-5' : columnCount === 3 ? 'gap-4' : 'gap-5';
                    return (
                      <div key={collection.key} className="mb-6">
                        <div className="border-t border-gray-100 pt-5 pb-4 mt-2">
                          <h3 className="text-lg font-extrabold text-[#1e3a5f]">{collection.label}</h3>
                          <p className="text-xs text-gray-400 mt-0.5">{sectionPlaces.length} places</p>
                        </div>
                        {cols ? (
                          <div className={`flex ${gapClass}`}>
                            {cols.map((col, colIdx) => (
                              <div key={colIdx} className={`flex-1 flex flex-col ${gapClass}`}>
                                {col.map((item, i) => (
                                  <PinCard
                                    key={item.id}
                                    item={item}
                                    index={i}
                                    isFavorited={favorites.includes(item.id)}
                                    onFavorite={toggleFavorite}
                                    onClick={(id) => openGridShowcase(id)}
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 550: 2, 900: 3, 1400: 4 }}>
                            <Masonry gutter="20px">
                              {sectionPlaces.map((item, i) => (
                                <PinCard
                                  key={item.id}
                                  item={item}
                                  index={i}
                                  isFavorited={favorites.includes(item.id)}
                                  onFavorite={toggleFavorite}
                                  onClick={(id) => openGridShowcase(id)}
                                />
                              ))}
                            </Masonry>
                          </ResponsiveMasonry>
                        )}
                      </div>
                    );
                  })}

                </>
              ) : (
                <div className="text-center py-20">
                  <Search size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">
                    {activeTab === 'favorites' ? 'No favorites yet. Heart places to save them here.' : 'No places match your search.'}
                  </p>
                </div>
              )}
            </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <CardStack
          items={filtered}
          favorites={favorites}
          onFavorite={toggleFavorite}
          onSelect={setSelectedPlace}
          showPostcard={showPostcard}
          setShowPostcard={setShowPostcard}
        />
      )}
      </div>
      <OceanWave />
      <Footer />

      {/* Detail Overlay — 3D flip card with discovery navigation */}
      <AnimatePresence>
        {selectedPlace && (
          <PlaceDetailOverlay
            place={selectedPlace}
            isFavorited={favorites.includes(selectedPlace.id)}
            onToggleFavorite={() => toggleFavorite(selectedPlace.id)}
            onClose={() => setSelectedPlace(null)}
            onNavigate={(p) => { _setSelectedPlace(p); }}
            onSearchTag={(tag) => { setSearchQuery(tag); setSelectedPlace(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Magazine Curtain — shared idle showcase for grid and stack views
// ═══════════════════════════════════════════════════════════════════════════

const CURTAIN_VARIANTS = {
  open: { transition: { staggerChildren: 0.08 } },
  closed: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
};

function MagazineCurtain({
  place,
  totalCount,
  placeIndex,
}: {
  place: PlaceItem;
  totalCount: number;
  placeIndex: number;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const images = place.images?.length ? place.images : [place.image];

  // Reset on place change
  useEffect(() => { setImgIdx(0); setIsFlipped(false); }, [place.id]);

  // Auto-cycle images every 4s when not flipped
  useEffect(() => {
    if (isFlipped || images.length <= 1) return;
    const interval = setInterval(() => setImgIdx((i) => (i + 1) % images.length), 4000);
    return () => clearInterval(interval);
  }, [isFlipped, images.length]);

  return (
    <div className="flex gap-2 max-w-7xl mx-auto" style={{ height: 480 }}>
      {/* Left — image card with animated info overlay */}
      <motion.div
        variants={{ closed: { x: '-100%', opacity: 0 }, open: { x: 0, opacity: 1 } }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex-[2] relative rounded-2xl overflow-hidden bg-black cursor-pointer"
        onClick={() => setIsFlipped((f) => !f)}
      >
        {/* Image */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`mc-${place.id}-${imgIdx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <Image src={images[imgIdx]} alt={place.name} fill className="object-cover" sizes="65vw" priority />
          </motion.div>
        </AnimatePresence>

        {/* Image nav arrows */}
        {images.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i === 0 ? images.length - 1 : i - 1)); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors z-20" aria-label="Previous image">
              <ChevronLeft size={16} className="text-white" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i + 1) % images.length); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors z-20" aria-label="Next image">
              <ChevronRight size={16} className="text-white" />
            </button>
          </>
        )}

        {/* Image dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {images.slice(0, 6).map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setImgIdx(i); }} className={`rounded-full transition-all duration-300 ${i === imgIdx ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'}`} />
            ))}
          </div>
        )}

        {/* Animated info overlay */}
        <AnimatePresence>
          {isFlipped && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 overflow-hidden z-30"
              onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
            >
              <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
              <div className="relative h-full flex flex-col p-6 text-white overflow-y-auto">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.3 }}>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-sky-300 mb-1 block">
                    {place.category} &middot; {place.type}
                  </span>
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="text-2xl font-extrabold leading-tight">{place.name}</h3>
                    {place.rating != null && (
                      <div className="flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-lg shrink-0">
                        <Star size={11} className="text-amber-400 fill-amber-400" />
                        <span className="text-[12px] font-bold">{place.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  {place.tagline && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <MapPin size={11} className="text-white/50 shrink-0" />
                      <span className="text-[12px] text-white/50">{place.tagline}</span>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, duration: 0.3 }}
                  className="grid grid-cols-2 gap-2 mb-3"
                >
                  {place.priceLevel && (
                    <div className="bg-white/10 rounded-xl px-3 py-2">
                      <span className="text-[9px] text-white/45 block">Price</span>
                      <span className="text-[13px] font-bold">
                        {'$'.repeat(place.priceLevel)}
                        <span className="text-white/25">{'$'.repeat(4 - place.priceLevel)}</span>
                      </span>
                    </div>
                  )}
                  {place.duration && (
                    <div className="bg-white/10 rounded-xl px-3 py-2">
                      <span className="text-[9px] text-white/45 block">Duration</span>
                      <span className="text-[13px] font-bold">{place.duration}</span>
                    </div>
                  )}
                  {place.admissionFee && (
                    <div className="bg-white/10 rounded-xl px-3 py-2">
                      <span className="text-[9px] text-white/45 block">Admission</span>
                      <span className="text-[13px] font-bold">{place.admissionFee}</span>
                    </div>
                  )}
                  {place.rating != null && place.reviewCount && (
                    <div className="bg-white/10 rounded-xl px-3 py-2">
                      <span className="text-[9px] text-white/45 block">Reviews</span>
                      <span className="text-[13px] font-bold">{place.reviewCount.toLocaleString()}</span>
                    </div>
                  )}
                  {place.bestTimeToVisit && (
                    <div className="bg-white/10 rounded-xl px-3 py-2 col-span-2">
                      <span className="text-[9px] text-white/45 block">Best Time</span>
                      <span className="text-[11px] font-semibold leading-tight">{place.bestTimeToVisit}</span>
                    </div>
                  )}
                </motion.div>

                {(place.hours || place.website) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    className="flex flex-wrap gap-1.5 mb-3"
                  >
                    {place.hours && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/10">
                        <Clock size={10} className="text-sky-300/70" />
                        <span className="text-[10px] text-white/60">{place.hours}</span>
                      </span>
                    )}
                    {place.website && (
                      <a href={place.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/10 hover:bg-white/15 transition-colors">
                        <Globe size={10} className="text-sky-300/70" />
                        <span className="text-[10px] text-white/60 truncate max-w-[120px]">{place.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                      </a>
                    )}
                  </motion.div>
                )}

                {place.description && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18, duration: 0.3 }}
                    className="text-[13px] text-white/70 leading-[19px] line-clamp-3 mb-3"
                  >
                    {place.description}
                  </motion.p>
                )}

                {place.tips && place.tips.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="mb-3"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Lightbulb size={11} className="text-sky-300/70" />
                      <span className="text-[10px] font-semibold text-white/50">Tips</span>
                    </div>
                    {place.tips.slice(0, 3).map((tip, i) => (
                      <p key={i} className="text-[11px] text-white/60 leading-[16px] pl-4 mb-1">
                        &bull; {tip}
                      </p>
                    ))}
                  </motion.div>
                )}

                <div className="flex-1 min-h-2" />

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.24, duration: 0.3 }}
                  className="text-center"
                >
                  <span className="text-[10px] text-white/40">Tap to dismiss</span>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Right — map */}
      <motion.div
        variants={{ closed: { x: '100%', opacity: 0 }, open: { x: 0, opacity: 1 } }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 relative overflow-hidden rounded-2xl"
      >
        {place.latitude != null && place.longitude != null ? (
          <LeafletMap lat={place.latitude} lng={place.longitude} label={place.name} zoom={11} height="100%" className="!rounded-2xl !border-0" />
        ) : (
          <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MapPin size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Map unavailable</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Card Stack — Tinder-style deck browsing
// ═══════════════════════════════════════════════════════════════════════════

const SWIPE_THRESHOLD = 80;

function CardStack({
  items,
  favorites,
  onFavorite,
  onSelect,
  showPostcard,
  setShowPostcard,
}: {
  items: PlaceItem[];
  favorites: string[];
  onFavorite: (id: string) => void;
  onSelect: (place: PlaceItem) => void;
  showPostcard: boolean;
  setShowPostcard: (v: boolean | ((prev: boolean) => boolean)) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const place = items[currentIndex];
  const prevIdx = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
  const nextIdx = (currentIndex + 1) % items.length;
  const nextNextIdx = (currentIndex + 2) % items.length;

  const images = place?.images?.length ? place.images : [place?.image];
  const isFav = place ? favorites.includes(place.id) : false;

  const similarPlaces = useSimilarPlaces(place, MOCK_PLACES, 10);

  // Reset when items change (filter/tab switch)
  useEffect(() => {
    setCurrentIndex(0);
    setImgIdx(0);
    setDirection(0);
    setShowPostcard(false);
    setIsFlipped(false);
  }, [items, setShowPostcard]);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((i) => (i + 1) % items.length);
    setImgIdx(0);
    setIsFlipped(false);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((i) => (i === 0 ? items.length - 1 : i - 1));
    setImgIdx(0);
    setIsFlipped(false);
  }, [items.length]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) goNext();
    else if (info.offset.x > SWIPE_THRESHOLD) goPrev();
  }, [goNext, goPrev]);

  // Keyboard — collapses postcard then navigates
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') { setShowPostcard(false); goNext(); }
      else if (e.key === 'ArrowLeft') { setShowPostcard(false); goPrev(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, setShowPostcard]);

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-500">No places match your filters.</p>
      </div>
    );
  }

  // Deck-of-cards: exit lifts toward viewer, enter reveals from behind
  const cardVariants = {
    enter: (d: number) => ({
      scale: 0.85,
      y: 30,
      opacity: 0,
      rotate: d > 0 ? 2 : -2,
    }),
    center: { x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 },
    exit: (d: number) => ({
      scale: 1.15,
      y: -50,
      opacity: 0,
      rotate: d > 0 ? -4 : 4,
    }),
  };

  return (
    <div className="flex flex-col items-center py-8">
      <AnimatePresence mode="wait">
        {showPostcard ? (
          /* ── Curtain view: magazine-style postcard + map ── */
          <motion.div
            key="postcard"
            className="w-full px-6"
            initial="closed"
            animate="open"
            exit="closed"
            variants={CURTAIN_VARIANTS}
          >
            <MagazineCurtain place={place} totalCount={items.length} placeIndex={currentIndex} />
          </motion.div>
        ) : (
          /* ── Card stack view ── */
          <motion.div
            key="stack"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <div className="relative w-full mx-auto flex items-center justify-center" style={{ maxWidth: 900, height: 480 }}>
              {/* Left peek */}
              <div
                className="hidden md:block absolute rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:opacity-50"
                style={{ width: 300, height: 400, opacity: 0.35, zIndex: 1, left: 20, top: '50%', transform: 'translateY(-50%) rotate(-6deg)' }}
                onClick={goPrev}
              >
                <div className="relative w-full h-full">
                  <Image src={items[prevIdx].image} alt={items[prevIdx].name} fill className="object-cover" sizes="280px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="font-bold uppercase tracking-wider text-[#7dd3fc] text-[8px] mb-1">{items[prevIdx].type}</p>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-extrabold text-base leading-tight truncate">{items[prevIdx].name}</h4>
                      {items[prevIdx].rating != null && (
                        <span className="flex items-center gap-0.5 bg-black/45 text-white rounded-lg px-1.5 py-0.5 shrink-0">
                          <Star size={9} className="text-yellow-400 fill-yellow-400" />
                          <span className="text-[10px] font-bold">{items[prevIdx].rating.toFixed(1)}</span>
                        </span>
                      )}
                    </div>
                    {items[prevIdx].tagline && (
                      <div className="flex items-center gap-1 mb-1.5">
                        <MapPin size={10} className="text-white/60 shrink-0" />
                        <span className="text-xs text-white/60 truncate">{items[prevIdx].tagline}</span>
                      </div>
                    )}
                    {items[prevIdx].description && (
                      <p className="text-[11px] text-white/70 leading-snug line-clamp-2">{items[prevIdx].description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right peek */}
              <div
                className="hidden md:block absolute rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:opacity-50"
                style={{ width: 300, height: 400, opacity: 0.35, zIndex: 1, right: 20, top: '50%', transform: 'translateY(-50%) rotate(6deg)' }}
                onClick={goNext}
              >
                <div className="relative w-full h-full">
                  <Image src={items[nextIdx].image} alt={items[nextIdx].name} fill className="object-cover" sizes="280px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="font-bold uppercase tracking-wider text-[#7dd3fc] text-[8px] mb-1">{items[nextIdx].type}</p>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-extrabold text-base leading-tight truncate">{items[nextIdx].name}</h4>
                      {items[nextIdx].rating != null && (
                        <span className="flex items-center gap-0.5 bg-black/45 text-white rounded-lg px-1.5 py-0.5 shrink-0">
                          <Star size={9} className="text-yellow-400 fill-yellow-400" />
                          <span className="text-[10px] font-bold">{items[nextIdx].rating.toFixed(1)}</span>
                        </span>
                      )}
                    </div>
                    {items[nextIdx].tagline && (
                      <div className="flex items-center gap-1 mb-1.5">
                        <MapPin size={10} className="text-white/60 shrink-0" />
                        <span className="text-xs text-white/60 truncate">{items[nextIdx].tagline}</span>
                      </div>
                    )}
                    {items[nextIdx].description && (
                      <p className="text-[11px] text-white/70 leading-snug line-clamp-2">{items[nextIdx].description}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Center card stack */}
              <div className="relative" style={{ width: 400, height: 480, zIndex: 5 }}>
                {/* Back card 2 */}
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
                  style={{ transform: 'scale(0.88) translateY(24px)', opacity: 0.3 }}
                >
                  <Image src={items[nextNextIdx].image} alt="" fill className="object-cover" sizes="(max-width: 640px) 85vw, 380px" />
                </div>

                {/* Back card 1 */}
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden shadow-md pointer-events-none"
                  style={{ transform: 'scale(0.94) translateY(12px)', opacity: 0.6 }}
                >
                  <Image src={items[nextIdx].image} alt="" fill className="object-cover" sizes="(max-width: 640px) 85vw, 380px" />
                </div>

                {/* Active card */}
                <AnimatePresence mode="popLayout" custom={direction}>
                  <motion.div
                    key={currentIndex}
                    custom={direction}
                    variants={cardVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                    drag={isFlipped ? false : 'x'}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.7}
                    onDragEnd={handleDragEnd}
                    className="absolute inset-0 rounded-2xl shadow-2xl"
                    style={{ zIndex: 10, perspective: 1000 }}
                  >
                    <motion.div
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.6, type: 'spring', damping: 15, stiffness: 100 }}
                      className="w-full h-full relative cursor-pointer"
                      style={{ transformStyle: 'preserve-3d' }}
                      onClick={() => setIsFlipped((f) => !f)}
                    >
                      {/* ── Front ── */}
                      <div className="absolute inset-0 rounded-2xl overflow-hidden bg-black" style={{ backfaceVisibility: 'hidden' }}>
                        <Image
                          src={images[imgIdx]}
                          alt={place.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 85vw, 380px"
                          priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                        {/* Tap zones for image nav */}
                        {images.length > 1 && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i === 0 ? images.length - 1 : i - 1)); }}
                              className="absolute left-0 top-0 w-1/3 h-2/3 z-20"
                              aria-label="Previous image"
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i + 1) % images.length); }}
                              className="absolute right-0 top-0 w-1/3 h-2/3 z-20"
                              aria-label="Next image"
                            />
                          </>
                        )}

                        {/* Favorite badge */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onFavorite(place.id); }}
                          className={`absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            isFav ? 'bg-red-500/20 border border-red-400/60' : 'bg-white/90 backdrop-blur-sm'
                          }`}
                        >
                          <Heart size={14} className={isFav ? 'text-red-400 fill-red-400' : 'text-gray-400'} />
                        </button>

                        {/* Bottom content */}
                        <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none">
                          <p className="font-bold uppercase tracking-wider text-[#7dd3fc] text-[10px] mb-1.5">
                            {place.type}
                          </p>
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <h3 className="text-white font-extrabold text-xl leading-tight drop-shadow-md">
                              {place.name}
                            </h3>
                            {place.rating != null && (
                              <span className="flex items-center gap-1 bg-black/45 text-white rounded-lg px-2 py-0.5 shrink-0">
                                <Star size={11} className="text-yellow-400 fill-yellow-400" />
                                <span className="text-xs font-bold">{place.rating.toFixed(1)}</span>
                              </span>
                            )}
                          </div>
                          {place.tagline && (
                            <div className="flex items-center gap-1 mb-2">
                              <MapPin size={12} className="text-white/60 shrink-0" />
                              <span className="text-sm text-white/60 truncate">{place.tagline}</span>
                            </div>
                          )}
                          {place.description && (
                            <p className="text-[13px] text-white/70 leading-snug line-clamp-2">
                              {place.description}
                            </p>
                          )}
                          {/* Image dots */}
                          {images.length > 1 && (
                            <div className="flex items-center justify-center gap-1.5 mt-3 pointer-events-auto">
                              {images.slice(0, 5).map((_, i) => (
                                <button
                                  key={i}
                                  onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                                  className={`rounded-full transition-all ${
                                    i === imgIdx ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Back ── */}
                      <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                        <Image src={images[0]} alt="" fill className="object-cover" sizes="(max-width: 640px) 85vw, 380px" />
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                        <div className="relative h-full flex flex-col p-5 text-white overflow-y-auto">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-sky-300 mb-1 block">
                            {place.category} &middot; {place.type}
                          </span>
                          <div className="flex items-center gap-2.5 mb-1">
                            <h3 className="text-xl font-extrabold leading-tight">{place.name}</h3>
                            {place.rating != null && (
                              <div className="flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-lg shrink-0">
                                <Star size={11} className="text-amber-400 fill-amber-400" />
                                <span className="text-[12px] font-bold">{place.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          {place.tagline && (
                            <div className="flex items-center gap-1.5 mb-3">
                              <MapPin size={11} className="text-white/50 shrink-0" />
                              <span className="text-[12px] text-white/50">{place.tagline}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 mb-3">
                            {place.priceLevel && (
                              <div className="bg-white/10 rounded-xl px-3 py-2">
                                <span className="text-[9px] text-white/45 block">Price</span>
                                <span className="text-[13px] font-bold">
                                  {'$'.repeat(place.priceLevel)}
                                  <span className="text-white/25">{'$'.repeat(4 - place.priceLevel)}</span>
                                </span>
                              </div>
                            )}
                            {place.duration && (
                              <div className="bg-white/10 rounded-xl px-3 py-2">
                                <span className="text-[9px] text-white/45 block">Duration</span>
                                <span className="text-[13px] font-bold">{place.duration}</span>
                              </div>
                            )}
                            {place.admissionFee && (
                              <div className="bg-white/10 rounded-xl px-3 py-2">
                                <span className="text-[9px] text-white/45 block">Admission</span>
                                <span className="text-[13px] font-bold">{place.admissionFee}</span>
                              </div>
                            )}
                            {place.bestTimeToVisit && (
                              <div className="bg-white/10 rounded-xl px-3 py-2 col-span-2">
                                <span className="text-[9px] text-white/45 block">Best Time</span>
                                <span className="text-[11px] font-semibold leading-tight">{place.bestTimeToVisit}</span>
                              </div>
                            )}
                          </div>

                          {place.description && (
                            <p className="text-[12px] text-white/70 leading-[17px] line-clamp-3 mb-3">
                              {place.description}
                            </p>
                          )}

                          {place.tips && place.tips.length > 0 && (
                            <div className="mb-3">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Lightbulb size={10} className="text-sky-300/70" />
                                <span className="text-[9px] font-semibold text-white/50">Tips</span>
                              </div>
                              {place.tips.slice(0, 2).map((tip, i) => (
                                <p key={i} className="text-[10px] text-white/60 leading-[14px] pl-3 mb-1">&bull; {tip}</p>
                              ))}
                            </div>
                          )}

                          <div className="flex-1 min-h-1" />

                          <button
                            onClick={(e) => { e.stopPropagation(); onSelect(place); }}
                            className="w-full py-2.5 rounded-xl bg-white text-[#1e3a5f] font-bold text-[13px] hover:bg-white/90 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation — always visible */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={() => { setShowPostcard(false); goPrev(); }}
          className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => setShowPostcard(true)}
          className="text-sm text-muted-foreground tabular-nums hover:text-[#1e3a5f] transition-colors cursor-pointer"
        >
          {currentIndex + 1} / {items.length}
        </button>
        <button
          onClick={() => { setShowPostcard(false); goNext(); }}
          className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Similar / Explore section */}
      {similarPlaces.length > 0 && (
        <div className="w-full max-w-5xl mx-auto mt-8 px-6">
          <h3 className="text-sm font-bold text-gray-800 mb-3">
            More like {place.name}
          </h3>
          <div className="relative">
            <div
              className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {similarPlaces.map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => {
                    const idx = items.findIndex((it) => it.id === sp.id);
                    if (idx !== -1) {
                      setDirection(idx > currentIndex ? 1 : -1);
                      setCurrentIndex(idx);
                      setImgIdx(0);
                      setIsFlipped(false);
                    } else {
                      onSelect(sp);
                    }
                  }}
                  className="shrink-0 w-36 group text-left"
                >
                  <div className="relative w-36 h-24 rounded-xl overflow-hidden mb-1.5">
                    <Image
                      src={sp.images?.[0] || sp.image}
                      alt={sp.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="144px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    {sp.rating != null && (
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/50 rounded-md px-1.5 py-0.5">
                        <Star size={8} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-[9px] font-bold text-white">{sp.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-gray-800 truncate">{sp.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{sp.tagline}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
