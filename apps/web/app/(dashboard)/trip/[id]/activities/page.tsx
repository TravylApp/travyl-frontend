'use client';

import { use, useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Search, Globe, Landmark, UtensilsCrossed, Compass, CalendarDays, Heart,
  X, ChevronRight,
} from 'lucide-react';
import { useItineraryScreen } from '@travyl/shared';
import { useQuery } from '@tanstack/react-query';
import type { PlaceItem } from '@travyl/shared';
import { PinCard } from '@/components/PinCard';

// ─── Config ─────────────────────────────────────────────────

const CATEGORIES = [
  'sightseeing', 'restaurant', 'museum', 'park', 'cafe', 'bar',
  'shopping', 'nightlife', 'landmark',
];

const TABS = [
  { key: 'all', label: 'All', icon: Globe },
  { key: 'attraction', label: 'Attractions', icon: Landmark },
  { key: 'restaurant', label: 'Restaurants', icon: UtensilsCrossed },
  { key: 'experience', label: 'Experiences', icon: Compass },
  { key: 'event', label: 'Events', icon: CalendarDays },
  { key: 'favorites', label: 'Favorites', icon: Heart },
] as const;

type TabKey = (typeof TABS)[number]['key'];
type SortKey = 'default' | 'rating' | 'name';

// ─── Data fetching ──────────────────────────────────────────

async function fetchExplorePage(
  lat: number, lng: number, pageParam: number, city?: string, country?: string,
): Promise<PlaceItem[]> {
  const catsPerPage = 3;
  const startCat = (pageParam * catsPerPage) % CATEGORIES.length;
  const cats: string[] = [];
  for (let i = 0; i < catsPerPage; i++) {
    cats.push(CATEGORIES[(startCat + i) % CATEGORIES.length]);
  }

  // Center + slight offset for variety
  const offsets = [
    { lat, lng },
    { lat: lat + 0.015, lng: lng + 0.01 },
  ];
  const offset = offsets[pageParam % offsets.length];

  const results = await Promise.all(
    cats.map(async (cat) => {
      try {
        const res = await fetch(
          `/api/places?lat=${offset.lat}&lng=${offset.lng}&category=${cat}&limit=12`,
        );
        if (!res.ok) return [];
        return (await res.json()) as PlaceItem[];
      } catch {
        return [];
      }
    }),
  );

  // Also fetch from Foursquare for restaurant variety
  if (cats.includes('restaurant') || cats.includes('cafe')) {
    try {
      const fsRes = await fetch(
        `/api/foursquare?lat=${lat}&lng=${lng}&category=restaurant&limit=8`,
      );
      if (fsRes.ok) {
        const venues = await fsRes.json();
        if (Array.isArray(venues)) {
          const mapped = venues
            .filter((v: any) => v.image && !v.image.includes('categories_v2'))
            .map((v: any) => ({
              id: `fs_${v.id}`,
              name: v.name,
              image: v.image,
              images: (v.images || []).filter((img: string) => !img.includes('categories_v2')),
              type: 'restaurant' as const,
              rating: v.rating ? v.rating / 2 : 0,
              tagline: v.address || v.category || 'Restaurant',
              category: v.category || 'Restaurant',
              description: v.tip || '',
              latitude: v.lat,
              longitude: v.lng,
              address: v.address,
              reviewCount: v.ratingCount,
              tags: [v.category || 'Restaurant'],
            }));
          results.push(mapped);
        }
      }
    } catch {}
  }

  // Fetch events (Eventbrite + PredictHQ) on first page
  if (pageParam === 0) {
    try {
      const evParams = new URLSearchParams({ limit: '6' });
      if (city) { evParams.set('city', city); if (country) evParams.set('country', country); }
      const evRes = await fetch(`/api/events?${evParams}`);
      if (evRes.ok) {
        const events = await evRes.json();
        if (Array.isArray(events)) {
          const mapped = events.filter((e: any) => e.title).map((e: any) => ({
            id: `ev_${e.id}`, name: e.title, image: e.image || '',
            type: 'event' as const, rating: 0,
            tagline: [e.venue, e.date].filter(Boolean).join(' · ') || 'Event',
            category: e.category || 'Event', description: e.description || '',
            tags: ['Event', e.category].filter(Boolean),
          }));
          results.push(mapped);
        }
      }
    } catch {}
  }

  // Deduplicate
  const seen = new Set<string>();
  const seenNames = new Set<string>();
  return results.flat().filter((p) => {
    if (!p.name || seen.has(p.id)) return false;
    const norm = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenNames.has(norm)) return false;
    seen.add(p.id);
    seenNames.add(norm);
    return true;
  });
}

// ─── Component ──────────────────────────────────────────────

export default function ExplorePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { trip, isLoading: tripLoading } = useItineraryScreen(id);

  const lat = trip?.trip_context?.lat ?? 0;
  const lng = trip?.trip_context?.lng ?? 0;
  const destParts = trip?.destination?.split(',') ?? [];
  const destination = destParts[0]?.trim() || 'Destination';
  const destCountry = destParts.slice(1).join(',').trim() || undefined;
  const hasCoords = lat !== 0 || lng !== 0;

  // Paginated data — accumulate pages manually to avoid useInfiniteQuery internal bug
  const [page, setPage] = useState(0);
  const [allPlaces, setAllPlaces] = useState<PlaceItem[]>([]);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['trip-explore', id, lat, lng, page],
    queryFn: () => fetchExplorePage(lat, lng, page, destination !== 'Destination' ? destination : undefined, destCountry),
    staleTime: 15 * 60 * 1000,
    enabled: hasCoords,
  });

  useEffect(() => {
    if (pageData && pageData.length > 0) {
      setAllPlaces((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const newItems = pageData.filter((p) => !seen.has(p.id));
        return newItems.length > 0 ? [...prev, ...newItems] : prev;
      });
      setIsFetchingNextPage(false);
    }
  }, [pageData]);

  const hasNextPage = page < 20;

  const fetchNextPage = useCallback(() => {
    setIsFetchingNextPage(true);
    setPage((p) => p + 1);
  }, []);

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasNextPage) return;
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
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // State
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [showFilters, setShowFilters] = useState(false);
  const [activeSubcategory, setActiveSubcategory] = useState('');
  const [columnCount, setColumnCount] = useState(3);

  useEffect(() => {
    const w = window.innerWidth;
    if (w < 550) setColumnCount(1);
    else if (w < 768) setColumnCount(2);
    else if (w < 1100) setColumnCount(3);
    else setColumnCount(4);
  }, []);

  const toggleFavorite = useCallback((fid: string) => {
    setFavorites((prev) => prev.includes(fid) ? prev.filter((f) => f !== fid) : [...prev, fid]);
  }, []);

  const places = allPlaces;

  // Filter by tab
  const tabFiltered = useMemo(() => {
    if (activeTab === 'all') return places;
    if (activeTab === 'favorites') return places.filter((p) => favorites.includes(p.id));
    return places.filter((p) => p.type === activeTab);
  }, [activeTab, favorites, places]);

  // Subcategories
  const subcategories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of tabFiltered) counts[item.category] = (counts[item.category] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => ({ label: cat, count }));
  }, [tabFiltered]);

  // Filter + sort
  const filtered = useMemo(() => {
    let items = tabFiltered;
    if (activeSubcategory) items = items.filter((p) => p.category === activeSubcategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (sortBy === 'rating') items = [...items].sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'name') items = [...items].sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }, [tabFiltered, activeSubcategory, searchQuery, sortBy]);

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-[60vh]">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[var(--background)]/95 backdrop-blur-md border-b border-gray-100 dark:border-white/10">
        {/* Row 1: Tabs + Search */}
        <div className="px-4 pt-2 pb-0">
          <div className="flex items-center gap-2">
            <div className="shrink-0 overflow-x-auto scrollbar-hide">
              <div className="flex gap-0 -mb-px">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => { setActiveTab(key); setActiveSubcategory(''); }}
                    className={`flex items-center gap-1.5 px-3 py-2 text-[12px] whitespace-nowrap border-b-2 transition-all shrink-0 ${
                      activeTab === key
                        ? 'font-semibold'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                    style={activeTab === key ? { borderColor: 'var(--trip-base)', color: 'var(--trip-base)' } : undefined}
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
                placeholder={`Search ${destination}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-full text-[11px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all"
                style={{ '--tw-ring-color': 'var(--trip-base)' } as any}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Filters + Sort */}
        <div className="px-4 py-1.5 flex items-center gap-2">
          {subcategories.length > 1 && (
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all shrink-0 ${
                showFilters || activeSubcategory ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={showFilters || activeSubcategory ? { backgroundColor: 'var(--trip-base)' } : undefined}
            >
              <span>Filters</span>
              <motion.div animate={{ rotate: showFilters ? 90 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronRight size={11} />
              </motion.div>
            </button>
          )}

          <AnimatePresence>
            {showFilters && subcategories.length > 1 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1 overflow-x-auto scrollbar-hide min-w-0 flex-1"
              >
                <button
                  onClick={() => setActiveSubcategory('')}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0 transition-all ${
                    !activeSubcategory ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  style={!activeSubcategory ? { backgroundColor: 'var(--trip-base)' } : undefined}
                >
                  All
                </button>
                {subcategories.slice(0, 12).map(({ label, count }) => (
                  <button
                    key={label}
                    onClick={() => setActiveSubcategory(activeSubcategory === label ? '' : label)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0 transition-all ${
                      activeSubcategory === label ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    style={activeSubcategory === label ? { backgroundColor: 'var(--trip-base)' } : undefined}
                  >
                    {label} <span className="opacity-50 ml-0.5">{count}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="text-[10px] px-2 py-1 rounded-md border border-gray-200 bg-white text-gray-600 focus:outline-none"
            >
              <option value="default">Default</option>
              <option value="rating">Top Rated</option>
              <option value="name">A–Z</option>
            </select>
            <span className="text-[10px] text-gray-400 tabular-nums">{filtered.length} places</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold text-gray-900" style={{ color: 'var(--trip-base)' }}>
          Explore {destination}
        </h2>
        <p className="text-[12px] text-gray-400">
          {filtered.length} places to discover
        </p>
      </div>

      {/* Masonry Grid */}
      <div className="px-4 pb-8">
        {(isLoading || tripLoading) ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-gray-100 animate-pulse" style={{ height: 320 + (i % 3) * 40 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={32} className="text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No places found</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveSubcategory(''); setActiveTab('all'); }}
              className="text-xs mt-2 hover:underline"
              style={{ color: 'var(--trip-base)' }}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div
            className="gap-3"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
            }}
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((place, i) => (
                <motion.div
                  key={place.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                >
                  <PinCard
                    item={place}
                    index={i}
                    isFavorited={favorites.includes(place.id)}
                    onFavorite={toggleFavorite}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={loadMoreRef} className="h-1" />
        {isFetchingNextPage && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--trip-base)', borderTopColor: 'transparent' }} />
          </div>
        )}
      </div>
    </div>
  );
}
