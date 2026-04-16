'use client';

import { use, useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Search, Globe, Landmark, UtensilsCrossed, Compass, CalendarDays, Heart,
  X, Wine, Coffee, TreePine, ShoppingBag, Camera, Sparkles,
} from 'lucide-react';
import { useItineraryScreen } from '@travyl/shared';
import { useQuery } from '@tanstack/react-query';
import type { PlaceItem } from '@travyl/shared';
import { PinCard, getCardRowSpan } from '@/components/PinCard';
import { AnimatePresence } from 'motion/react';
import { PlaceDetailOverlay } from '@/components/PlaceDetailOverlay';

// ─── Config ─────────────────────────────────────────────────

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

// ─── Section definitions ─────────────────────────────────────

const SECTIONS = [
  { key: 'attraction', label: 'Top Attractions', icon: Landmark, color: '#f59e0b' },
  { key: 'restaurant', label: 'Restaurants & Dining', icon: UtensilsCrossed, color: '#ef4444' },
  { key: 'nightlife', label: 'Nightlife & Bars', icon: Wine, color: '#a855f7' },
  { key: 'cafe', label: 'Cafés & Coffee', icon: Coffee, color: '#92400e' },
  { key: 'outdoors', label: 'Parks & Nature', icon: TreePine, color: '#22c55e' },
  { key: 'shopping', label: 'Shopping & Markets', icon: ShoppingBag, color: '#ec4899' },
  { key: 'culture', label: 'Museums & Culture', icon: Camera, color: '#6366f1' },
  { key: 'experience', label: 'Experiences', icon: Compass, color: '#0ea5e9' },
  { key: 'event', label: 'Events & Festivals', icon: CalendarDays, color: '#f97316' },
  { key: 'other', label: 'Hidden Gems', icon: Sparkles, color: '#64748b' },
] as const;

function classifyPlace(p: PlaceItem): string {
  const text = [p.category, ...(p.tags || []), p.tagline].join(' ').toLowerCase();
  if (/nightlife|bar\b|club|pub|lounge|disco|cocktail|beer|wine bar|speakeasy/i.test(text)) return 'nightlife';
  if (/caf[eé]|coffee|bakery|tea house|patisserie|brunch/i.test(text)) return 'cafe';
  if (/museum|gallery|art|theater|theatre|opera|heritage|monument|historical|cultural/i.test(text)) return 'culture';
  if (/park|garden|nature|beach|hiking|trail|forest|lake|outdoor|zoo|botanical/i.test(text)) return 'outdoors';
  if (/shop|market|mall|boutique|souvenir|store|retail/i.test(text)) return 'shopping';
  if (p.type === 'event') return 'event';
  if (p.type === 'attraction') return 'attraction';
  if (p.type === 'restaurant') return 'restaurant';
  if (p.type === 'experience') return 'experience';
  return 'other';
}

interface PlaceSection {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  items: PlaceItem[];
}

function groupIntoSections(places: PlaceItem[]): PlaceSection[] {
  const groups: Record<string, PlaceItem[]> = {};
  for (const p of places) {
    const key = classifyPlace(p);
    (groups[key] ??= []).push(p);
  }
  return SECTIONS
    .filter((s) => groups[s.key]?.length)
    .map((s) => ({ ...s, items: groups[s.key] }));
}

// ─── Per-section query map (section key → search terms) ─────

const SECTION_QUERIES: Record<string, string[]> = {
  attraction: ['top attractions', 'landmarks sightseeing', 'viewpoints must see', 'famous places'],
  restaurant: ['best restaurants food dining', 'local food places', 'popular restaurants'],
  nightlife: ['nightlife bars clubs', 'cocktail bars lounges', 'pubs live music'],
  cafe: ['cafes coffee shops', 'bakeries brunch spots', 'tea houses'],
  outdoors: ['parks nature outdoors', 'beaches hiking trails', 'gardens botanical'],
  shopping: ['shopping markets boutiques', 'malls souvenirs stores'],
  culture: ['museums galleries culture', 'theaters heritage historical', 'art exhibitions'],
  experience: ['experiences tours activities', 'adventure unique things to do'],
  event: ['events festivals concerts', 'local events upcoming'],
  other: ['hidden gems off beaten path', 'unique places local favorites'],
};

const SECTION_PREVIEW_COUNT = 6;

async function fetchSectionMore(
  sectionKey: string, lat: number, lng: number, page: number, city?: string,
): Promise<PlaceItem[]> {
  const queries = SECTION_QUERIES[sectionKey] ?? [`${city || ''} things to do`];
  const cityName = city || '';
  const q = queries[page % queries.length];
  const fullQuery = `${cityName} ${q}`.trim();

  // Offset coords slightly per page for variety
  const offsetLat = lat + (page % 4) * 0.015;
  const offsetLng = lng + (page % 3) * 0.012;

  try {
    const res = await fetch(
      `/api/places?q=${encodeURIComponent(fullQuery)}&lat=${offsetLat}&lng=${offsetLng}&limit=16`,
    );
    if (!res.ok) return [];
    const items = (await res.json()) as PlaceItem[];
    // Only return items matching this section
    return items.filter((p) => p.image && classifyPlace(p) === sectionKey);
  } catch {
    return [];
  }
}

// ─── Data fetching ──────────────────────────────────────────

async function fetchExplorePage(
  lat: number, lng: number, pageParam: number, city?: string, country?: string,
): Promise<PlaceItem[]> {
  // Broad NLP queries — no hardcoded category list.
  // The API returns items with whatever categories exist for this destination.
  const cityName = city || '';
  const queries = [
    `${cityName} things to do`,
    `${cityName} restaurants food`,
    `${cityName} nightlife bars clubs`,
    `${cityName} beaches outdoors`,
    `${cityName} shopping markets`,
    `${cityName} museums culture`,
    `${cityName} parks nature`,
    `${cityName} cafes coffee`,
    `${cityName} hidden gems`,
    `${cityName} viewpoints attractions`,
  ];

  // Pick 3 queries per page, rotating through for variety
  const perPage = 3;
  const start = (pageParam * perPage) % queries.length;
  const pageQueries: string[] = [];
  for (let i = 0; i < perPage; i++) {
    pageQueries.push(queries[(start + i) % queries.length]);
  }

  // Slight coord offset per page for variety
  const offsetLat = lat + (pageParam % 3) * 0.012;
  const offsetLng = lng + (pageParam % 2) * 0.01;

  const results: PlaceItem[][] = await Promise.all(
    pageQueries.map(async (q) => {
      try {
        const res = await fetch(
          `/api/places?q=${encodeURIComponent(q)}&lat=${offsetLat}&lng=${offsetLng}&limit=12`,
        );
        if (!res.ok) return [];
        return (await res.json()) as PlaceItem[];
      } catch {
        return [];
      }
    }),
  );

  // Also fetch from Foursquare on first page for photo variety
  if (pageParam === 0) {
    try {
      const fsRes = await fetch(
        `/api/foursquare?lat=${lat}&lng=${lng}&category=restaurant&limit=8`,
      );
      if (fsRes.ok) {
        const venues = await fsRes.json();
        if (Array.isArray(venues)) {
          results.push(venues
            .filter((v: any) => v.image && !v.image.includes('categories_v2'))
            .map((v: any) => ({
              id: `fs_${v.id}`, name: v.name, image: v.image,
              images: (v.images || []).filter((img: string) => !img.includes('categories_v2')),
              type: 'restaurant' as const, rating: v.rating ? v.rating / 2 : 0,
              tagline: v.address || v.category || 'Restaurant',
              category: v.category || 'Restaurant', description: v.tip || '',
              latitude: v.lat, longitude: v.lng, address: v.address,
              reviewCount: v.ratingCount, tags: [v.category || 'Restaurant'],
            })));
        }
      }
    } catch {}
  }

  // Fetch events on first page
  if (pageParam === 0) {
    try {
      const evParams = new URLSearchParams({ limit: '6' });
      if (city) { evParams.set('city', city); if (country) evParams.set('country', country); }
      const evRes = await fetch(`/api/events?${evParams}`);
      if (evRes.ok) {
        const events = await evRes.json();
        if (Array.isArray(events)) {
          results.push(events.filter((e: any) => e.title).map((e: any) => ({
            id: `ev_${e.id}`, name: e.title, image: e.image || '',
            type: 'event' as const, rating: 0,
            tagline: [e.venue, e.date].filter(Boolean).join(' · ') || 'Event',
            category: e.category || 'Event', description: e.description || '',
            tags: ['Event', e.category].filter(Boolean),
          })));
        }
      }
    } catch {}
  }

  // Deduplicate + filter out items without images
  const seen = new Set<string>();
  const seenNames = new Set<string>();
  return results.flat().filter((p) => {
    if (!p.name || !p.image || seen.has(p.id)) return false;
    const norm = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenNames.has(norm)) return false;
    seen.add(p.id);
    seenNames.add(norm);
    return true;
  });
}

// ─── Component ──────────────────────────────────────────────

export default function ExplorePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = use(params);
  const { tab: initialTab } = use(searchParams);
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
  const [hasMorePages, setHasMorePages] = useState(true);

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['trip-explore', id, lat, lng, page],
    queryFn: () => fetchExplorePage(lat, lng, page, destination !== 'Destination' ? destination : undefined, destCountry),
    staleTime: 15 * 60 * 1000,
    enabled: hasCoords && hasMorePages,
  });

  useEffect(() => {
    if (pageData) {
      if (pageData.length === 0) {
        // No more results — stop loading
        setHasMorePages(false);
        setIsFetchingNextPage(false);
        return;
      }
      setAllPlaces((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const newItems = pageData.filter((p) => !seen.has(p.id) && !!p.image);
        if (newItems.length === 0) setHasMorePages(false);
        return newItems.length > 0 ? [...prev, ...newItems] : prev;
      });
      setIsFetchingNextPage(false);
    }
  }, [pageData]);

  const hasNextPage = hasMorePages && page < 10;

  const fetchNextPage = useCallback(() => {
    setIsFetchingNextPage(true);
    setPage((p) => p + 1);
  }, []);

  // Track which cards have already appeared — skip re-animation on data updates
  const renderedIds = useRef(new Set<string>());
  const getEntryAnimation = useCallback((id: string, i: number) => {
    if (renderedIds.current.has(id)) return undefined;
    renderedIds.current.add(id);
    return `card-fade-in 0.3s ease-out ${Math.min(i * 0.025, 0.15)}s both`;
  }, []);

  // State
  const validTabs = TABS.map(t => t.key) as readonly string[];
  const [activeTab, setActiveTab] = useState<TabKey>(
    initialTab && validTabs.includes(initialTab) ? initialTab as TabKey : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [activeSubcategory, setActiveSubcategory] = useState('');
  const [columnCount, setColumnCount] = useState(3);
  const [flush, setFlush] = useState(false);

  // Infinite scroll observer — disabled in sectioned view (sections have own "discover more")
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isSectionedView = activeTab === 'all' && !searchQuery && sortBy === 'default';
  useEffect(() => {
    if (!hasNextPage || isSectionedView) return;
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
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isSectionedView]);

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

  const places = allPlaces.filter((p) => !!p.image);

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

  // Group into sections (only used in "all" tab with default sort)
  const sections = useMemo(() => {
    if (activeTab !== 'all' || searchQuery || sortBy !== 'default') return null;
    return groupIntoSections(filtered);
  }, [activeTab, searchQuery, sortBy, filtered]);

  // Per-section "load more" state
  const [sectionExtra, setSectionExtra] = useState<Record<string, PlaceItem[]>>({});
  const [sectionPage, setSectionPage] = useState<Record<string, number>>({});
  const [sectionLoading, setSectionLoading] = useState<Record<string, boolean>>({});
  const [sectionDone, setSectionDone] = useState<Record<string, boolean>>({});

  const loadMoreForSection = useCallback(async (sectionKey: string) => {
    if (sectionLoading[sectionKey] || sectionDone[sectionKey]) return;
    setSectionLoading((prev) => ({ ...prev, [sectionKey]: true }));

    const nextPage = (sectionPage[sectionKey] ?? 0) + 1;
    const results = await fetchSectionMore(sectionKey, lat, lng, nextPage, destination !== 'Destination' ? destination : undefined);

    // Dedupe against existing items
    const existingIds = new Set([
      ...allPlaces.map((p) => p.id),
      ...(sectionExtra[sectionKey] ?? []).map((p) => p.id),
    ]);
    const existingNames = new Set([
      ...allPlaces.map((p) => p.name.toLowerCase().replace(/[^a-z0-9]/g, '')),
      ...(sectionExtra[sectionKey] ?? []).map((p) => p.name.toLowerCase().replace(/[^a-z0-9]/g, '')),
    ]);
    const newItems = results.filter((p) => {
      const norm = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return !existingIds.has(p.id) && !existingNames.has(norm);
    });

    if (newItems.length === 0) {
      setSectionDone((prev) => ({ ...prev, [sectionKey]: true }));
    } else {
      setSectionExtra((prev) => ({
        ...prev,
        [sectionKey]: [...(prev[sectionKey] ?? []), ...newItems],
      }));
    }
    setSectionPage((prev) => ({ ...prev, [sectionKey]: nextPage }));
    setSectionLoading((prev) => ({ ...prev, [sectionKey]: false }));
  }, [sectionLoading, sectionDone, sectionPage, sectionExtra, lat, lng, destination, allPlaces]);

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-[60vh]" style={{ overflowAnchor: 'auto' }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-[color-mix(in_srgb,var(--background)_95%,transparent)] backdrop-blur-md border-b border-gray-100 dark:border-white/[0.08]">
        {/* Row 1: Tabs */}
        <div className="px-4 pt-2 pb-0 overflow-x-auto scrollbar-hide">
          <div className="flex gap-0 -mb-px">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setActiveSubcategory(''); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-[12px] whitespace-nowrap border-b-2 transition-all shrink-0 ${
                  activeTab === key
                    ? 'font-semibold'
                    : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                style={activeTab === key ? { borderColor: 'var(--trip-base)', color: 'var(--trip-base)' } : undefined}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Search + Controls */}
        <div className="px-4 py-2 flex items-center gap-3">
          <div className="relative flex-1 min-w-0 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder={`Search ${destination}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] rounded-full text-[12px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 transition-all"
              style={{ '--tw-ring-color': 'var(--trip-base)' } as any}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="text-[11px] px-2 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-gray-600 dark:text-gray-300 focus:outline-none cursor-pointer"
            >
              <option value="default">Default</option>
              <option value="rating">Top Rated</option>
              <option value="name">A–Z</option>
            </select>

            <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/10 rounded-lg p-0.5">
              {[2, 3, 4].map((n) => (
                <button key={n} onClick={() => setColumnCount(n)}
                  className={`w-7 h-7 rounded-md text-[11px] font-semibold transition-all ${
                    columnCount === n
                      ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}>
                  {n}
                </button>
              ))}
            </div>

            <button
              onClick={() => setFlush(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                flush
                  ? 'bg-gray-900 dark:bg-white/90 text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/15'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="0" y="0" width="5" height="5" rx="1" fill="currentColor"/>
                <rect x="7" y="0" width="5" height="5" rx="1" fill="currentColor"/>
                <rect x="0" y="7" width="5" height="5" rx="1" fill="currentColor"/>
                <rect x="7" y="7" width="5" height="5" rx="1" fill="currentColor"/>
              </svg>
              {flush ? 'Grid' : 'Flush'}
            </button>
          </div>
        </div>

        {/* Row 3: Subcategory pills (always visible when available) */}
        {subcategories.length > 1 && (
          <div className="px-4 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveSubcategory('')}
              className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 transition-all ${
                !activeSubcategory
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/15'
              }`}
              style={!activeSubcategory ? { backgroundColor: 'var(--trip-base)' } : undefined}
            >
              All
            </button>
            {subcategories.slice(0, 12).map(({ label, count }) => (
              <button
                key={label}
                onClick={() => setActiveSubcategory(activeSubcategory === label ? '' : label)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 transition-all ${
                  activeSubcategory === label
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/15'
                }`}
                style={activeSubcategory === label ? { backgroundColor: 'var(--trip-base)' } : undefined}
              >
                {label} <span className="opacity-50">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Title + count */}
      <div className="px-4 pt-4 pb-2 flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-normal tracking-wide text-gray-900 dark:text-white font-serif" style={{ color: 'var(--trip-base)' }}>
            Explore {destination}
          </h2>
          <p className="text-[12px] text-gray-400 dark:text-gray-500">{filtered.length} places to discover</p>
        </div>
      </div>

      {/* Card Grid / Masonry */}
      <div className="px-4 pb-8">
        {(isLoading || tripLoading) ? (
          /* ─── Loading skeletons ─── */
          <div>
            {[0, 1].map((s) => (
              <div key={s} className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
                  <div className="h-4 w-32 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" style={{ height: 320 + (i % 3) * 40 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={32} className="text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No places found</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveSubcategory(''); setActiveTab('all'); }}
              className="text-xs mt-2 hover:underline"
              style={{ color: 'var(--trip-base)' }}
            >
              Clear all filters
            </button>
          </div>
        ) : sections ? (
          /* ─── Sectioned view (All tab, default sort) ─── */
          <div className="flex flex-col gap-10">
            {sections.map((section) => {
              const SectionIcon = section.icon;
              const extras = sectionExtra[section.key] ?? [];
              const allItems = [...section.items, ...extras];
              const totalCount = allItems.length;
              const isLoadingMore = sectionLoading[section.key] ?? false;
              const isDone = sectionDone[section.key] ?? false;

              return (
                <div key={section.key}>
                  {/* Section header */}
                  <div className="flex items-center gap-2.5 mb-4">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${section.color}18`, color: section.color }}
                    >
                      <SectionIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-normal text-gray-900 dark:text-white leading-tight font-serif">
                        {section.label}
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        {totalCount} {totalCount === 1 ? 'place' : 'places'}
                      </p>
                    </div>
                  </div>

                  {/* Section grid */}
                  {flush ? (
                    <div
                      className="grid gap-3"
                      style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
                    >
                      {allItems.map((place, i) => (
                        <div
                          key={place.id}
                          style={{ animation: getEntryAnimation(place.id, i) }}
                        >
                          <PinCard
                            item={place}
                            index={i}
                            isFavorited={favorites.includes(place.id)}
                            onFavorite={toggleFavorite}
                            onClick={() => setSelectedPlace(place)}
                            flush
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="grid"
                      style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)`, gridAutoRows: '4px', columnGap: '12px' }}
                    >
                      {allItems.map((place, i) => (
                        <div
                          key={place.id}
                          style={{
                            gridRowEnd: `span ${getCardRowSpan(place.id)}`,
                            animation: getEntryAnimation(place.id, i),
                          }}
                        >
                          <PinCard
                            item={place}
                            index={i}
                            isFavorited={favorites.includes(place.id)}
                            onFavorite={toggleFavorite}
                            onClick={() => setSelectedPlace(place)}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Load more button */}
                  {!isDone && (
                    <div className="flex justify-center mt-4">
                      <button
                        onClick={() => loadMoreForSection(section.key)}
                        disabled={isLoadingMore}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[12px] font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        style={{
                          color: section.color,
                          backgroundColor: `${section.color}10`,
                          border: `1px solid ${section.color}25`,
                        }}
                      >
                        {isLoadingMore ? (
                          <>
                            <div
                              className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                              style={{ borderColor: section.color, borderTopColor: 'transparent' }}
                            />
                            Loading...
                          </>
                        ) : (
                          <>
                            <span>Discover more {section.label.toLowerCase()}</span>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : flush ? (
          /* ─── Flush / Uniform Grid (filtered tab) ─── */
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
          >
            {filtered.map((place, i) => (
              <div
                key={place.id}
                style={{ animation: getEntryAnimation(place.id, i) }}
              >
                <PinCard
                  item={place}
                  index={i}
                  isFavorited={favorites.includes(place.id)}
                  onFavorite={toggleFavorite}
                  onClick={() => setSelectedPlace(place)}
                  flush
                />
              </div>
            ))}
          </div>
        ) : (
          /* ─── Masonry / Pinterest layout (filtered tab) ─── */
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)`, gridAutoRows: '4px', columnGap: '12px' }}
          >
            {filtered.map((place, i) => (
              <div
                key={place.id}
                style={{
                  gridRowEnd: `span ${getCardRowSpan(place.id)}`,
                  animation: getEntryAnimation(place.id, i),
                }}
              >
                <PinCard
                  item={place}
                  index={i}
                  isFavorited={favorites.includes(place.id)}
                  onFavorite={toggleFavorite}
                  onClick={() => setSelectedPlace(place)}
                />
              </div>
            ))}
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

      {/* Place detail overlay — same as Places page */}
      <AnimatePresence>
        {selectedPlace && (
          <PlaceDetailOverlay
            place={selectedPlace}
            isFavorited={favorites.includes(selectedPlace.id)}
            onToggleFavorite={() => toggleFavorite(selectedPlace.id)}
            onClose={() => setSelectedPlace(null)}
            minimal
          />
        )}
      </AnimatePresence>
    </div>
  );
}
