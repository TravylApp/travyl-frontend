'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'motion/react';

import {
  Search, Globe, Landmark, UtensilsCrossed, Compass, CalendarDays, Heart,
  MapPin, ArrowUpDown, Star, X, ChevronLeft, ChevronRight,
  LayoutGrid, Layers, Clock, Lightbulb, Maximize2, Minimize2, AlignJustify, Navigation,
} from 'lucide-react';
import type { PanInfo } from 'motion/react';
import { useSimilarPlaces } from '@travyl/shared';
import type { PlaceItem as PlaceItemType, PlaceItem } from '@travyl/shared';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

const BROWSE_CITIES = [
  // Europe
  { name: 'Paris', lat: '48.8566', lng: '2.3522' },
  { name: 'London', lat: '51.5074', lng: '-0.1278' },
  { name: 'Rome', lat: '41.9028', lng: '12.4964' },
  { name: 'Barcelona', lat: '41.3874', lng: '2.1686' },
  { name: 'Amsterdam', lat: '52.3676', lng: '4.9041' },
  { name: 'Prague', lat: '50.0755', lng: '14.4378' },
  { name: 'Lisbon', lat: '38.7223', lng: '-9.1393' },
  { name: 'Istanbul', lat: '41.0082', lng: '28.9784' },
  { name: 'Vienna', lat: '48.2082', lng: '16.3738' },
  { name: 'Berlin', lat: '52.5200', lng: '13.4050' },
  { name: 'Athens', lat: '37.9838', lng: '23.7275' },
  { name: 'Budapest', lat: '47.4979', lng: '19.0402' },
  { name: 'Dublin', lat: '53.3498', lng: '-6.2603' },
  { name: 'Edinburgh', lat: '55.9533', lng: '-3.1883' },
  { name: 'Florence', lat: '43.7696', lng: '11.2558' },
  { name: 'Santorini', lat: '36.3932', lng: '25.4615' },
  { name: 'Dubrovnik', lat: '42.6507', lng: '18.0944' },
  { name: 'Copenhagen', lat: '55.6761', lng: '12.5683' },
  { name: 'Stockholm', lat: '59.3293', lng: '18.0686' },
  { name: 'Reykjavik', lat: '64.1466', lng: '-21.9426' },
  // Asia
  { name: 'Tokyo', lat: '35.6762', lng: '139.6503' },
  { name: 'Bangkok', lat: '13.7563', lng: '100.5018' },
  { name: 'Bali', lat: '-8.4095', lng: '115.1889' },
  { name: 'Singapore', lat: '1.3521', lng: '103.8198' },
  { name: 'Seoul', lat: '37.5665', lng: '126.9780' },
  { name: 'Kyoto', lat: '35.0116', lng: '135.7681' },
  { name: 'Hong Kong', lat: '22.3193', lng: '114.1694' },
  { name: 'Hanoi', lat: '21.0278', lng: '105.8342' },
  { name: 'Dubai', lat: '25.2048', lng: '55.2708' },
  { name: 'Jaipur', lat: '26.9124', lng: '75.7873' },
  { name: 'Petra', lat: '30.3285', lng: '35.4444' },
  { name: 'Kuala Lumpur', lat: '3.1390', lng: '101.6869' },
  { name: 'Taipei', lat: '25.0330', lng: '121.5654' },
  { name: 'Siem Reap', lat: '13.3633', lng: '103.8564' },
  // Americas
  { name: 'New York', lat: '40.7128', lng: '-74.0060' },
  { name: 'Rio de Janeiro', lat: '-22.9068', lng: '-43.1729' },
  { name: 'Mexico City', lat: '19.4326', lng: '-99.1332' },
  { name: 'Buenos Aires', lat: '-34.6037', lng: '-58.3816' },
  { name: 'Havana', lat: '23.1136', lng: '-82.3666' },
  { name: 'San Francisco', lat: '37.7749', lng: '-122.4194' },
  { name: 'Cartagena', lat: '10.3910', lng: '-75.5364' },
  { name: 'Cusco', lat: '-13.5319', lng: '-71.9675' },
  { name: 'Los Angeles', lat: '34.0522', lng: '-118.2437' },
  { name: 'Miami', lat: '25.7617', lng: '-80.1918' },
  { name: 'Nashville', lat: '36.1627', lng: '-86.7816' },
  { name: 'Tulum', lat: '20.2114', lng: '-87.4654' },
  // Africa & Middle East
  { name: 'Cape Town', lat: '-33.9249', lng: '18.4241' },
  { name: 'Marrakech', lat: '31.6295', lng: '-7.9811' },
  { name: 'Cairo', lat: '30.0444', lng: '31.2357' },
  { name: 'Zanzibar', lat: '-6.1659', lng: '39.1989' },
  { name: 'Nairobi', lat: '-1.2921', lng: '36.8219' },
  // Oceania
  { name: 'Sydney', lat: '-33.8688', lng: '151.2093' },
  { name: 'Melbourne', lat: '-37.8136', lng: '144.9631' },
  { name: 'Queenstown', lat: '-45.0312', lng: '168.6626' },
  { name: 'Auckland', lat: '-36.8485', lng: '174.7633' },
]

const BROWSE_CATEGORIES = [
  'sightseeing', 'restaurant', 'museum', 'park', 'cafe', 'bar',
  'shopping', 'nightlife', 'beach', 'landmark', 'garden', 'market',
]

// Random offset so each session starts at different cities
const CITY_OFFSET = Math.floor(Math.random() * BROWSE_CITIES.length)
const CAT_OFFSET = Math.floor(Math.random() * BROWSE_CATEGORIES.length)

async function fetchBrowsePage(pageParam: number): Promise<PlaceItemType[]> {
  const citiesPerPage = 2
  const catsPerPage = 3
  const startCity = (CITY_OFFSET + pageParam * citiesPerPage) % BROWSE_CITIES.length
  const startCat = (CAT_OFFSET + pageParam * catsPerPage) % BROWSE_CATEGORIES.length

  const cities: typeof BROWSE_CITIES = []
  for (let i = 0; i < citiesPerPage; i++) {
    cities.push(BROWSE_CITIES[(startCity + i) % BROWSE_CITIES.length])
  }
  const cats: string[] = []
  for (let i = 0; i < catsPerPage; i++) {
    cats.push(BROWSE_CATEGORIES[(startCat + i) % BROWSE_CATEGORIES.length])
  }

  const results = await Promise.all(
    cities.flatMap((city) =>
      cats.map(async (cat) => {
        const res = await fetch(`/api/places?lat=${city.lat}&lng=${city.lng}&category=${cat}&limit=10`)
        if (!res.ok) return []
        return res.json() as Promise<PlaceItemType[]>
      })
    )
  )
  return results.flat()
}

async function fetchSearchPlaces(query: string): Promise<PlaceItemType[]> {
  // Step 1: geocode ONCE via a single API call (the route handles geocoding)
  const geoProbe = await fetch(`/api/places?q=${encodeURIComponent(query)}&category=sightseeing&limit=1`)
  if (!geoProbe.ok) return []
  const probeData = await geoProbe.json() as PlaceItemType[]
  const lat = probeData[0]?.latitude
  const lng = probeData[0]?.longitude
  if (lat == null || lng == null) {
    // Fallback: use q param for all
    const categories = ['sightseeing', 'restaurant', 'museum', 'park', 'cafe', 'bar', 'shopping', 'beach', 'landmark']
    const results = await Promise.all(
      categories.map(async (cat) => {
        const res = await fetch(`/api/places?q=${encodeURIComponent(query)}&category=${cat}&limit=20`)
        if (!res.ok) return []
        return res.json() as Promise<PlaceItemType[]>
      })
    )
    const seen = new Set<string>()
    return results.flat().filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true })
  }

  // Step 2: fetch key categories from center + one offset neighborhood
  // Reduced from 43 API calls to ~14 for much faster search (~2s vs ~8s)
  const categories = ['sightseeing', 'restaurant', 'museum', 'park', 'cafe', 'bar', 'shopping', 'landmark']

  const fetches: Promise<PlaceItemType[]>[] = []

  // Center: key categories, limit 15
  for (const cat of categories) {
    fetches.push(
      fetch(`/api/places?lat=${lat}&lng=${lng}&category=${cat}&limit=15`)
        .then(r => r.ok ? r.json() as Promise<PlaceItemType[]> : [])
        .catch(() => [])
    )
  }
  // One offset neighborhood for variety (northeast, +2km)
  const offsetCats = ['sightseeing', 'restaurant', 'park']
  for (const cat of offsetCats) {
    fetches.push(
      fetch(`/api/places?lat=${lat + 0.02}&lng=${lng + 0.015}&category=${cat}&limit=10`)
        .then(r => r.ok ? r.json() as Promise<PlaceItemType[]> : [])
        .catch(() => [])
    )
  }

  // Foursquare: only restaurants and attractions (best photo quality)
  const fsCats = ['restaurant', 'attraction']
  for (const cat of fsCats) {
    fetches.push(
      fetch(`/api/foursquare?lat=${lat}&lng=${lng}&category=${cat}&limit=8`)
        .then(async r => {
          if (!r.ok) return []
          const venues = await r.json()
          if (venues.error) return []
          // Map Foursquare venues to PlaceItem shape
          return (venues as any[])
            // Filter out venues that only have generic category icons (not real photos)
            .filter((v: any) => v.image && !v.image.includes('categories_v2') && !v.image.includes('_bg_'))
            .map((v: any) => {
              // Filter out icon URLs from images array too
              const realImages = (v.images || []).filter((img: string) => !img.includes('categories_v2') && !img.includes('_bg_'))
              return {
                id: `fs_${v.id}`,
                name: v.name,
                image: realImages[0] || v.image,
                images: realImages.length > 1 ? realImages : undefined,
                type: mapFoursquareType(cat),
                rating: v.rating ? v.rating / 2 : 0,
                tagline: v.address || v.category || cat,
                category: v.category || toTitleCase(cat),
                description: v.tip || '',
                latitude: v.lat,
                longitude: v.lng,
                address: v.address,
                website: v.url,
                priceLevel: v.price && v.price >= 1 && v.price <= 4 ? v.price : undefined,
                hours: v.hours,
                reviewCount: v.ratingCount,
                tags: [toTitleCase(cat)],
              }
            }) as PlaceItemType[]
        })
        .catch(() => [])
    )
  }

  // Events — single call (was 5 OpenTripMap + 1 events = 6 slow calls)
  fetches.push(
    fetch(`/api/events?lat=${lat}&lng=${lng}&limit=8`)
      .then(async r => {
        if (!r.ok) return []
        const events = await r.json()
        if (events.error || !Array.isArray(events)) return []
        return events.filter((e: any) => e.title).map((e: any) => ({
          id: `ev_${e.id}`,
          name: e.title,
          image: e.image || '',
          type: 'event' as const,
          rating: 0,
          tagline: [e.venue, e.date].filter(Boolean).join(' · ') || e.category || 'Event',
          category: e.category || 'Event',
          description: e.description || '',
          latitude: parseFloat(lat as any),
          longitude: parseFloat(lng as any),
          tags: ['Event', e.category].filter(Boolean),
          website: e.url,
        })) as PlaceItemType[]
      })
      .catch(() => [])
  )

  const results = await Promise.all(fetches)

  // Deduplicate by id, then by name (cross-source dedup)
  // Filter out places with no image — no fallbacks
  const seen = new Set<string>()
  const seenNames = new Set<string>()
  return results.flat().filter((p) => {
    if (!p.name) return false
    if (!p.image || p.image === '') return false
    if (seen.has(p.id)) return false
    const normName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (seenNames.has(normName)) return false
    seen.add(p.id)
    seenNames.add(normName)
    return true
  })
}

function mapFoursquareType(cat: string): 'destination' | 'attraction' | 'restaurant' | 'experience' | 'event' {
  if (['restaurant', 'cafe', 'nightlife'].includes(cat)) return 'restaurant'
  if (['museum', 'attraction'].includes(cat)) return 'attraction'
  if (['park'].includes(cat)) return 'experience'
  return 'destination'
}

function toTitleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

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

// Haversine distance in km between two coordinates
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const NEARBY_RADIUS_KM = 15 // Only show places within 15km

async function fetchNearbyPlaces(lat: number, lng: number): Promise<PlaceItemType[]> {
  const categories = ['sightseeing', 'restaurant', 'cafe', 'attraction', 'park']
  const results = await Promise.all(
    categories.map(async (cat) => {
      const res = await fetch(`/api/places?lat=${lat}&lng=${lng}&category=${cat}&limit=8`)
      if (!res.ok) return []
      return res.json() as Promise<PlaceItemType[]>
    })
  )
  const seen = new Set<string>()
  return results.flat().filter((p) => {
    if (!p.name || !p.image) return false
    if (seen.has(p.id)) return false
    // Require coordinates — skip places we can't verify distance for
    if (p.latitude == null || p.longitude == null) return false
    if (distanceKm(lat, lng, p.latitude, p.longitude) > NEARBY_RADIUS_KM) return false
    seen.add(p.id)
    return true
  })
}

export default function PlacesPage() {
  const [searchCity, setSearchCity] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Geolocation for "Near You"
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},  // silently ignore denial
      { timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  const { data: nearbyPlaces = [], isLoading: nearbyLoading } = useQuery({
    queryKey: ['places-nearby', userLocation?.lat, userLocation?.lng],
    queryFn: () => fetchNearbyPlaces(userLocation!.lat, userLocation!.lng),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!userLocation,
  });

  // Browse mode: infinite scroll through cities × categories
  const {
    data: browseData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: browseLoading,
  } = useInfiniteQuery({
    queryKey: ['places-browse'],
    queryFn: ({ pageParam }) => fetchBrowsePage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (_lastPage, _allPages, lastPageParam) =>
      lastPageParam < 99 ? lastPageParam + 1 : undefined, // endless scrolling — cycles through all cities
    staleTime: 30 * 60 * 1000,  // Data stays fresh for 30 min
    gcTime: 60 * 60 * 1000,     // Keep in cache for 1 hour
    enabled: !searchCity,
  });

  // Search mode: single query across categories
  const { data: searchData = [], isLoading: searchLoading } = useQuery({
    queryKey: ['places-search', searchCity],
    queryFn: () => fetchSearchPlaces(searchCity),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!searchCity,
  });

  // Merge browse pages, deduplicate
  const places = useMemo(() => {
    if (searchCity) return searchData;
    if (!browseData?.pages) return [];
    const seen = new Set<string>();
    return browseData.pages.flat().filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [searchCity, searchData, browseData]);

  const placesLoading = searchCity ? searchLoading : browseLoading;

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('travyl-favorites') || '[]'); } catch { return []; }
  });
  const [activeSubcategory, setActiveSubcategory] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [selectedPlace, _setSelectedPlace] = useState<PlaceItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'stack'>('grid');
  const [flushGrid, setFlushGrid] = useState(false);
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

  // Intersection observer for infinite scroll — paused while showcase is open
  useEffect(() => {
    if (searchCity || !hasNextPage || gridShowcase) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '800px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [searchCity, hasNextPage, isFetchingNextPage, fetchNextPage, gridShowcase]);

  const toggleFavorite = (itemId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(itemId) ? prev.filter((f) => f !== itemId) : [...prev, itemId];
      try { localStorage.setItem('travyl-favorites', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Responsive column count on mount
  useEffect(() => {
    const w = window.innerWidth;
    if (w < 550) setColumnCount(1);
    else if (w < 768) setColumnCount(2);
    else if (w < 900) setColumnCount(3);
  }, []);

  // Filter by tab
  const tabFiltered = useMemo(() => {
    if (activeTab === 'all') return places;
    if (activeTab === 'favorites') return places.filter((p) => favorites.includes(p.id));
    return places.filter((p) => p.type === activeTab);
  }, [activeTab, favorites, places]);

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

  // Filter by subcategory + local search (skip local filter when API search is active)
  const filtered = useMemo(() => {
    let items = tabFiltered;

    if (activeSubcategory) {
      items = items.filter((p) => p.category === activeSubcategory);
    }

    // Only apply local text filter when NOT in API search mode
    if (searchQuery && !searchCity) {
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
  }, [tabFiltered, activeSubcategory, searchQuery, searchCity, sortBy]);

  // Group filtered items by category for section headers
  const groupedByCategory = useMemo(() => {
    const groups: { category: string; items: typeof filtered }[] = [];
    const catMap = new Map<string, typeof filtered>();
    for (const item of filtered) {
      const cat = item.category || 'Other';
      if (!catMap.has(cat)) {
        catMap.set(cat, []);
        groups.push({ category: cat, items: catMap.get(cat)! });
      }
      catMap.get(cat)!.push(item);
    }
    return groups;
  }, [filtered]);

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

  const savedScrollRef = useRef(0);

  const openGridShowcase = useCallback((placeId: string) => {
    const idx = filtered.findIndex((p) => p.id === placeId);
    if (idx === -1) return;
    if (gridPhaseRef.current) clearTimeout(gridPhaseRef.current);
    if (gridTimerRef.current) clearTimeout(gridTimerRef.current);
    savedScrollRef.current = window.scrollY;
    setGridShowcaseIdx(idx);
    setGridDirection(0);
    setGridPhase('card');
    setGridShowcase(true);
    gridPhaseRef.current = setTimeout(() => setGridPhase('magazine'), 5000);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [filtered]);

  const dismissGridShowcase = useCallback(() => {
    if (gridPhaseRef.current) clearTimeout(gridPhaseRef.current);
    if (gridTimerRef.current) clearTimeout(gridTimerRef.current);
    // Restore scroll position instantly BEFORE showing grid to prevent visible reflow
    window.scrollTo({ top: savedScrollRef.current, behavior: 'instant' as ScrollBehavior });
    // Show grid after scroll position is restored
    requestAnimationFrame(() => {
      setGridShowcase(false);
    });
  }, []);




  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
      {/* Sticky Header — single compact bar, sits at top and behind the floating navbar */}
      <div className="sticky top-0 z-30 bg-white dark:bg-[var(--background)] border-b border-gray-200/50 dark:border-white/5 py-1">
        <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-10 py-1">
          {/* Single row: Tabs | Search | Controls */}
          <div className="flex items-center gap-2">
            {/* Tabs — compact */}
            <div className="shrink-0 overflow-x-auto scrollbar-hide">
              <div className="flex gap-0">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => { setActiveTab(key); setActiveSubcategory(''); }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] whitespace-nowrap rounded-full transition-all shrink-0 ${
                      activeTab === key
                        ? 'bg-[#1e3a5f] text-white font-semibold shadow-sm'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon size={12} />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search — grows to fill */}
            <div className="relative flex-1 min-w-0 max-w-sm">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search a city..."
                value={searchInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchInput(val);
                  if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                  if (val.trim().length >= 2) {
                    searchDebounceRef.current = setTimeout(() => {
                      setSearchCity(val.trim());
                      setSearchQuery('');
                    }, 300);
                  } else if (!val.trim()) {
                    setSearchCity('');
                    setSearchQuery('');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchInput.trim()) {
                    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                    setSearchCity(searchInput.trim());
                    setSearchQuery('');
                  }
                }}
                className="w-full pl-7 pr-7 py-1.5 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-full text-[11px] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/30"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    setSearchQuery('');
                    setSearchCity('');
                    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={10} />
                </button>
              )}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Sort */}
              {viewMode === 'grid' && (
                <div className="relative shrink-0">
                  <ArrowUpDown size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    className="appearance-none pl-5 pr-4 py-1 bg-gray-100 dark:bg-white/10 rounded-full text-[10px] text-gray-600 dark:text-gray-300 focus:outline-none cursor-pointer hover:bg-gray-200 dark:hover:bg-white/15 transition-colors"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.key} value={o.key}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Expand toggle — stack mode only */}
              {viewMode === 'stack' && (
                <button
                  onClick={() => setShowPostcard((v) => !v)}
                  className={`shrink-0 p-1.5 rounded-full transition-colors ${
                    showPostcard
                      ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-400 hover:bg-gray-200'
                  }`}
                  title={showPostcard ? 'Card view' : 'Expanded view'}
                >
                  {showPostcard ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </button>
              )}

              {/* Column count — md+ */}
              {viewMode === 'grid' && (
                <div className="hidden md:flex items-center bg-gray-100 dark:bg-white/10 rounded-full p-0.5 shrink-0">
                  {[2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setColumnCount(n)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors ${
                        columnCount === n ? 'bg-white dark:bg-white/20 text-[#1e3a5f] shadow-sm' : 'text-gray-400'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}

              {/* Flush grid toggle */}
              {viewMode === 'grid' && (
                <button
                  onClick={() => setFlushGrid((f) => !f)}
                  className={`p-1.5 rounded-full transition-colors shrink-0 ${
                    flushGrid
                      ? 'bg-[#1e3a5f] text-white'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-400 hover:text-gray-600'
                  }`}
                  title={flushGrid ? 'Masonry layout' : 'Flush grid'}
                >
                  <AlignJustify size={12} />
                </button>
              )}

              {/* View mode toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-white/10 rounded-full p-0.5 shrink-0">
                {(['grid', 'stack'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`relative p-1.5 rounded-full transition-colors ${
                      viewMode === mode ? 'bg-white dark:bg-white/20 shadow-sm' : ''
                    }`}
                    title={mode === 'grid' ? 'Grid view' : 'Stack view'}
                  >
                    {mode === 'grid'
                      ? <LayoutGrid size={12} className={viewMode === mode ? 'text-[#1e3a5f]' : 'text-gray-400'} />
                      : <Layers size={12} className={viewMode === mode ? 'text-[#1e3a5f]' : 'text-gray-400'} />
                    }
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content: Grid or Stack */}
      {placesLoading && places.length === 0 ? (
        <div className="max-w-[85rem] mx-auto px-4 sm:px-6 lg:px-10 py-6">
          <div style={{ columnCount: Math.min(columnCount, 4), columnGap: '1rem' }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="mb-4 break-inside-avoid">
                <div
                  className="rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-white/10 dark:to-white/5 shimmer-skeleton"
                  style={{ height: 280 + (i % 3) * 60 }}
                >
                  <div className="h-full flex flex-col justify-end p-4">
                    <div className="h-3 bg-white/20 rounded w-16 mb-3" />
                    <div className="h-5 bg-white/30 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/15 rounded w-1/2 mb-3" />
                    <div className="flex gap-1.5">
                      <div className="h-4 bg-white/10 rounded-full w-12" />
                      <div className="h-4 bg-white/10 rounded-full w-10" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div
          className={`mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-4 transition-all duration-300 ${
            columnCount === 2 ? 'max-w-5xl' : columnCount === 3 ? 'max-w-7xl' : 'max-w-[85rem]'
          }`}
          style={{}}
          // Removed crosshatch SVG background pattern — causes visual noise during scroll
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
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={prevP.image} alt={prevP.name} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
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
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={nextNextP.image} alt="" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                              </div>
                              {/* Back card 1 */}
                              <div
                                className="absolute inset-0 rounded-2xl overflow-hidden shadow-md pointer-events-none"
                                style={{ transform: 'scale(0.94) translateY(12px)', opacity: 0.6 }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={nextP.image} alt="" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
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
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={filtered[gridShowcaseIdx].image} alt={filtered[gridShowcaseIdx].name} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
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
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={nextP.image} alt={nextP.name} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
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


            <div style={{ display: gridShowcase ? 'none' : undefined }}>
              {/* Near You section */}
              {nearbyPlaces.length > 0 && !searchCity && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <Navigation size={14} className="text-[#1e3a5f]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]/60 dark:text-white/50">Near You</h3>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-white/10" />
                    <span className="text-[10px] text-gray-400">{nearbyPlaces.length}</span>
                  </div>
                  <div className={`grid gap-3 grid-cols-2 sm:grid-cols-${Math.min(columnCount, 4)}`}>
                    {nearbyPlaces.slice(0, 12).map((place, i) => (
                      <div key={place.id}>
                        <PinCard
                          item={place}
                          index={i}
                          isFavorited={favorites.includes(place.id)}
                          onFavorite={toggleFavorite}
                          onClick={() => setSelectedPlace(place)}
                          onAddToTrip={(p) => {
                            if (!favorites.includes(p.id)) toggleFavorite(p.id);
                          }}
                          flush
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {nearbyLoading && !searchCity && userLocation && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <Navigation size={14} className="text-gray-300 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-300">Finding places near you...</span>
                  </div>
                  <div style={{ columnCount, columnGap: '1rem' }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="mb-4 break-inside-avoid">
                        <div className="rounded-2xl shimmer-skeleton" style={{ height: flushGrid ? 360 : 300 + (i % 3) * 60 }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filtered.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-extrabold text-[#1e3a5f] dark:text-white">
                        {searchCity ? `Results for "${searchCity}"` : 'Explore'}
                      </h2>
                      <p className="text-xs text-gray-400">
                        {filtered.length} places {searchCity ? 'found' : 'from around the world'}
                      </p>
                    </div>
                    {searchCity && (
                      <button
                        onClick={() => { setSearchInput(''); setSearchCity(''); setSearchQuery(''); }}
                        className="text-xs text-[#1e3a5f] hover:underline"
                      >
                        Clear search
                      </button>
                    )}
                  </div>

                  {/* Search loading overlay */}
                  {searchLoading && (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-[#1e3a5f] rounded-full animate-spin" />
                        <span className="text-sm text-gray-500">Searching {searchCity}...</span>
                      </div>
                    </div>
                  )}

                  {!searchLoading && (
                    <div
                      style={{
                        columnCount,
                        columnGap: '0.75rem',
                      }}
                    >
                      {/* Render all items in a single column flow with inline category headers */}
                      {(() => {
                        let currentCat = '';
                        return filtered.map((item, i) => {
                          const showHeader = item.category !== currentCat;
                          if (showHeader) currentCat = item.category;
                          return (
                            <div key={item.id}>
                              {showHeader && (
                                <div className="mb-2 mt-4 first:mt-0" style={{ breakInside: 'avoid' }}>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#1e3a5f]/50 dark:text-white/40">{item.category}</h3>
                                    <div className="flex-1 h-px bg-gray-100 dark:bg-white/10" />
                                  </div>
                                </div>
                              )}
                              <div
                                className="mb-3"
                                style={{ breakInside: 'avoid' }}
                              >
                                <PinCard
                                  item={item}
                                  index={i}
                                  isFavorited={favorites.includes(item.id)}
                                  onFavorite={toggleFavorite}
                                  onClick={(id) => {
                                    const place = filtered.find(p => p.id === id);
                                    if (place) setSelectedPlace(place);
                                  }}
                                  onAddToTrip={(place) => {
                                    if (!favorites.includes(place.id)) toggleFavorite(place.id);
                                  }}
                                  flush={flushGrid}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20">
                  <Search size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">
                    {activeTab === 'favorites'
                      ? 'No favorites yet. Heart places to save them here.'
                      : searchCity
                        ? `No places found for "${searchCity}". Try a different city or destination.`
                        : 'No places match your filters.'}
                  </p>
                </div>
              )}
            </div>
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
      {/* Infinite scroll sentinel */}
      {!searchCity && hasNextPage && (
        <div ref={loadMoreRef} className="flex justify-center py-10">
          {isFetchingNextPage && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-[#1e3a5f] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[#1e3a5f] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[#1e3a5f] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-gray-400 font-medium tracking-wide">Discovering more places...</span>
            </div>
          )}
          {!isFetchingNextPage && (
            <div className="h-4" />
          )}
        </div>
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[imgIdx]} alt={place.name} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
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
          <LeafletMap key={`map-${place.latitude}-${place.longitude}`} lat={place.latitude} lng={place.longitude} label={place.name} zoom={11} height="100%" className="!rounded-2xl !border-0" />
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

  const similarPlaces = useSimilarPlaces(place, items, 10);

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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={items[prevIdx].image} alt={items[prevIdx].name} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={items[nextIdx].image} alt={items[nextIdx].name} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={items[nextNextIdx].image} alt="" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
                </div>

                {/* Back card 1 */}
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden shadow-md pointer-events-none"
                  style={{ transform: 'scale(0.94) translateY(12px)', opacity: 0.6 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={items[nextIdx].image} alt="" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={images[imgIdx]}
                          alt={place.name}
                          referrerPolicy="no-referrer"
                          className="absolute inset-0 w-full h-full object-cover"
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={images[0]} alt="" referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover" />
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sp.images?.[0] || sp.image}
                      alt={sp.name}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
