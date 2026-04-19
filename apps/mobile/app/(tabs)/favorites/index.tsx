import { useState, useMemo, useCallback, useEffect, memo, useRef } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Navy, TextStyles, FontSize, upscaleGoogleImage, mapCategory, getWebApiBase, type PlaceItem } from '@travyl/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAddToTrip } from '@/hooks/useAddToTrip';

import { ExplorePreview } from '@/components/home/ExplorePreview';
import { OceanWave, Footer } from '@/components/home';
import PlaceDetailModal from '@/components/places/PlaceDetailModal';
import { CardStackCarousel } from '@/components/places/CardStackCarousel';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Use web app as API proxy — it has all the API keys (Foursquare, etc.)
const WEB_API = getWebApiBase();


// Map backend response to PlaceItem format
// Web proxy /api/places returns PlaceItem-shaped objects directly.
// Just ensure image is upscaled and fields are present.
function mapToPlaceItem(p: any): PlaceItem {
  return {
    id: p.id,
    name: p.name,
    image: upscaleGoogleImage(p.image || p.photo_url) ?? '',
    images: p.images?.map((img: string) => upscaleGoogleImage(img) ?? img),
    type: p.type || 'attraction',
    rating: p.rating || 0,
    tagline: p.tagline || p.description?.split('.')[0] || p.category || '',
    category: mapCategory(p.category || ''),
    description: p.description || '',
    tags: p.tags || [p.category].filter(Boolean),
    latitude: p.latitude ?? p.lat,
    longitude: p.longitude ?? p.lng,
    address: p.address,
    reviewCount: p.reviewCount ?? p.review_count,
    website: p.website,
    priceLevel: p.priceLevel,
    hours: p.hours,
    duration: p.duration,
    phone: p.phone,
    bestTimeToVisit: p.bestTimeToVisit,
  };
}

async function resolveCoords(query: string): Promise<{ lat: string; lng: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'Travyl/1.0' } }
    );
    const data = await res.json();
    if (data.length > 0) return { lat: data[0].lat, lng: data[0].lon };
  } catch {}
  return null;
}

const NEARBY_RADIUS_KM = 15;
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchNearbyPlaces(lat: number, lng: number): Promise<PlaceItem[]> {
  const categories = ['sightseeing', 'restaurant', 'cafe', 'attraction', 'park'];
  const results = await Promise.all(
    categories.map(cat =>
      fetch(`${WEB_API}/api/places?lat=${lat}&lng=${lng}&category=${cat}&limit=8`)
        .then(r => r.ok ? r.json() : [])
        .then((data: any[]) => Array.isArray(data) ? data.map(mapToPlaceItem) : [])
        .catch(() => [])
    )
  );
  return dedup(results.flat()).filter(p =>
    p.latitude != null && p.longitude != null &&
    distanceKm(lat, lng, p.latitude!, p.longitude!) <= NEARBY_RADIUS_KM
  );
}

// Fetch a page of suggested places — returns items + pagination info
// Popular cities with coords for the discovery feed — rotated through for variety
const DISCOVER_CITIES = [
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'New York', lat: 40.7128, lng: -74.006 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Rome', lat: 41.9028, lng: 12.4964 },
  { name: 'Barcelona', lat: 41.3874, lng: 2.1686 },
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018 },
  { name: 'Istanbul', lat: 41.0082, lng: 28.9784 },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
];
const DISCOVER_CATS = ['sightseeing', 'restaurant', 'cafe', 'entertainment'];

async function fetchSuggestPage(page: number): Promise<{ items: PlaceItem[]; hasMore: boolean; nextPage: number | null }> {
  try {
    // First page: fetch multiple cities in parallel for a rich initial load
    if (page === 0) {
      const fetches = DISCOVER_CITIES.slice(0, 5).flatMap(city =>
        DISCOVER_CATS.slice(0, 2).map(cat =>
          fetch(`${WEB_API}/api/places?lat=${city.lat}&lng=${city.lng}&category=${cat}&limit=8`)
            .then(r => r.ok ? r.json() : [])
            .then((data: any[]) => data.map(mapToPlaceItem))
            .catch(() => [] as PlaceItem[])
        )
      );
      const results = await Promise.all(fetches);
      const items = results.flat();
      return { items, hasMore: true, nextPage: 1 };
    }
    // Subsequent pages: one city+category at a time
    const cityIdx = (page - 1) % DISCOVER_CITIES.length;
    const catIdx = Math.floor((page - 1) / DISCOVER_CITIES.length) % DISCOVER_CATS.length;
    const city = DISCOVER_CITIES[cityIdx];
    const cat = DISCOVER_CATS[catIdx];
    const res = await fetch(`${WEB_API}/api/places?lat=${city.lat}&lng=${city.lng}&category=${cat}&limit=10`);
    if (!res.ok) return { items: [], hasMore: false, nextPage: null };
    const data: any[] = await res.json();
    const items = data.map(mapToPlaceItem);
    return {
      items,
      hasMore: page < DISCOVER_CITIES.length * DISCOVER_CATS.length,
      nextPage: items.length > 0 ? page + 1 : null,
    };
  } catch {
    return { items: [], hasMore: false, nextPage: null };
  }
}

function dedup(places: PlaceItem[]): PlaceItem[] {
  const seen = new Set<string>();
  const seenNames = new Set<string>();
  return places.filter((p) => {
    if (!p.name || !p.image || seen.has(p.id)) return false;
    const norm = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenNames.has(norm)) return false;
    seen.add(p.id);
    seenNames.add(norm);
    return true;
  });
}

const PAD = 16;
const GAP = 8;
const STACK_CARD_W = SCREEN_WIDTH - 16;
const STACK_CARD_H = SCREEN_HEIGHT * 0.48;

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getImageHeight(id: string): number {
  return 140 + (hashCode(id + 'h') % 100);
}

function balanceColumns(places: PlaceItem[]): [PlaceItem[], PlaceItem[]] {
  const left: PlaceItem[] = [];
  const right: PlaceItem[] = [];
  let leftH = 0;
  let rightH = 0;
  for (const place of places) {
    const h = getImageHeight(place.id) + 70;
    if (leftH <= rightH) { left.push(place); leftH += h; }
    else { right.push(place); rightH += h; }
  }
  return [left, right];
}

type TabKey = 'all' | 'destination' | 'attraction' | 'restaurant' | 'experience' | 'event' | 'favorites';
type SortKey = 'default' | 'top_rated' | 'az';
type ViewMode = 'grid' | 'stack';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'globe' },
  { key: 'destination', label: 'Destinations', icon: 'map-marker' },
  { key: 'attraction', label: 'Attractions', icon: 'university' },
  { key: 'restaurant', label: 'Restaurants', icon: 'cutlery' },
  { key: 'experience', label: 'Experiences', icon: 'compass' },
  { key: 'event', label: 'Events', icon: 'calendar' },
  { key: 'favorites', label: 'Favorites', icon: 'heart' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'top_rated', label: 'Top Rated' },
  { key: 'az', label: 'A-Z' },
];

/* ═══════════════ Grid Place Card ═══════════════ */

const GridPlaceCard = memo(function GridPlaceCard({
  place, isFav, onPress, onToggleFav, colors,
}: {
  place: PlaceItem;
  isFav: boolean;
  onPress: () => void;
  onToggleFav: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const imgH = getImageHeight(place.id);
  const imgs = place.images && place.images.length > 1 ? place.images : [place.image];
  const [imgIdx, setImgIdx] = useState(0);
  const hasMultiple = imgs.length > 1;

  return (
    <Pressable onPress={onPress} style={{ marginBottom: GAP }}>
      <View style={{
        borderRadius: 14, overflow: 'hidden',
        backgroundColor: colors.cardBackground,
        borderWidth: 1, borderColor: colors.border,
      }}>
        <View style={{ height: imgH, position: 'relative' }}>
          <Image source={{ uri: imgs[imgIdx], headers: { Referer: '' } }} style={{ width: '100%', height: imgH }} contentFit="cover" cachePolicy="memory-disk" transition={200} />

          {hasMultiple && (
            <Pressable
              onPress={() => setImgIdx((prev) => (prev + 1) % imgs.length)}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          )}

          {/* Heart button — top-right */}
          <Pressable
            onPress={onToggleFav}
            style={{
              position: 'absolute', top: 8, right: 8,
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: isFav ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.9)',
              borderWidth: isFav ? 1 : 0,
              borderColor: 'rgba(239,68,68,0.4)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FontAwesome name={isFav ? 'heart' : 'heart-o'} size={12} color={isFav ? '#ef4444' : '#9ca3af'} />
          </Pressable>

          {/* Gradient overlay */}
          <View pointerEvents="none" style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: imgH * 0.4,
            backgroundColor: 'transparent',
          }} />

          {/* Centered dot indicators */}
          {hasMultiple && (
            <View pointerEvents="none" style={{
              position: 'absolute', bottom: 8,
              left: 0, right: 0,
              flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4,
            }}>
              {imgs.map((_, i) => (
                <View key={i} style={{
                  width: imgIdx === i ? 14 : 5, height: 5, borderRadius: 3,
                  backgroundColor: imgIdx === i ? '#fff' : 'rgba(255,255,255,0.5)',
                }} />
              ))}
            </View>
          )}
        </View>

        {/* Content below image — matches web PinCard style */}
        <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <FontAwesome name="map-marker" size={9} color={colors.textTertiary} style={{ marginRight: 4 }} />
            <Text style={{ ...TextStyles.sm, color: colors.textTertiary, flex: 1 }} numberOfLines={1}>{place.tagline}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Text style={{ ...TextStyles.bodyLgEm, color: colors.text, flex: 1 }} numberOfLines={1}>{place.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 4 }}>
              <FontAwesome name="star" size={10} color="#fbbf24" style={{ marginRight: 2 }} />
              <Text style={{ ...TextStyles.sm, color: colors.textSecondary }}>{place.rating}</Text>
            </View>
          </View>
          {place.description && (
            <Text style={{ ...TextStyles.sm, color: colors.textSecondary }} numberOfLines={2}>{place.description}</Text>
          )}
          {place.tags && place.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {place.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={{
                  paddingHorizontal: 6, paddingVertical: 2,
                  backgroundColor: colors.surface, borderRadius: 10,
                }}>
                  <Text style={{ ...TextStyles.xs, color: colors.textTertiary }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});


/* ═══════════════ Main Screen ═══════════════ */

export default function FavoritesScreen() {
  const colors = useThemeColors();
  const { addToTrip, state: tripSheetState, selectTrip, selectDay, dismiss, createTrip } = useAddToTrip();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [activeSubcategory, setActiveSubcategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Geolocation — get user's current position for Near You
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    import('expo-location').then(async (Location) => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {}
    }).catch(() => {});
  }, []);

  // Near You places
  const { data: nearbyPlaces = [], isLoading: nearbyLoading } = useQuery({
    queryKey: ['mobile-places-nearby', userLocation?.lat, userLocation?.lng],
    queryFn: () => fetchNearbyPlaces(userLocation!.lat, userLocation!.lng),
    staleTime: 15 * 60 * 1000,
    enabled: !!userLocation,
  });
  const [searchCity, setSearchCity] = useState('');
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => {
    import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
      AsyncStorage.getItem('travyl-favorites').then(val => {
        if (val) try { setFavorites(JSON.parse(val)); } catch {}
      });
    }).catch(() => {});
  }, []);
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [showcaseIdx, setShowcaseIdx] = useState(-1); // -1 = hidden

  // Infinite discovery feed — pages through /api/places/suggest
  const {
    data: suggestData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['mobile-places-discover'],
    queryFn: ({ pageParam }) => fetchSuggestPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextPage != null ? lastPage.nextPage : undefined,
    staleTime: 5 * 60 * 1000,
  });

  // Flatten all loaded pages into a single deduped list
  const discoveredPlaces = useMemo(() => {
    if (!suggestData?.pages) return [];
    const all = suggestData.pages.flatMap((p) => p.items);
    return dedup(all);
  }, [suggestData]);

  // API search — uses /api/places?q= which handles geocoding + backend search
  const { data: searchPlaces = [] } = useQuery({
    queryKey: ['mobile-places-search', searchCity],
    queryFn: async () => {
      if (!searchCity) return [];

      const coords = await resolveCoords(searchCity);
      const cats = ['sightseeing', 'restaurant', 'museum', 'park', 'cafe', 'nightlife'];
      const fetches: Promise<PlaceItem[]>[] = cats.map(cat => {
        const url = coords
          ? `${WEB_API}/api/places?lat=${coords.lat}&lng=${coords.lng}&category=${cat}&limit=8`
          : `${WEB_API}/api/places?q=${encodeURIComponent(searchCity)}&category=${cat}&limit=8`;
        return fetch(url)
          .then(r => r.ok ? r.json() : [])
          .then((data: any[]) => data.map(mapToPlaceItem))
          .catch(() => []);
      });
      const results = await Promise.all(fetches);
      const allPlaces = results.flat();
      // Use first result's coordinates to fetch events
      const firstWithCoords = allPlaces.find(p => p.latitude && p.longitude);
      if (firstWithCoords) {
        try {
          const evRes = await fetch(`${WEB_API}/api/events?lat=${firstWithCoords.latitude}&lng=${firstWithCoords.longitude}&limit=6`);
          if (evRes.ok) {
            const events = await evRes.json();
            if (Array.isArray(events)) {
              for (const e of events) {
                if (e.title) {
                  allPlaces.push({
                    id: `ev_${e.id}`, name: e.title, image: e.image || '',
                    type: 'event', rating: 0,
                    tagline: [e.venue, e.date].filter(Boolean).join(' · ') || 'Event',
                    category: e.category || 'Event', description: e.description || '',
                    tags: ['Event', e.category].filter(Boolean),
                  } as PlaceItem);
                }
              }
            }
          }
        } catch {}
      }
      return dedup(allPlaces);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!searchCity,
  });

  // Search results take priority, otherwise use infinite discover feed
  const PLACES = useMemo(() => {
    if (searchCity && searchPlaces.length > 0) return searchPlaces;
    return discoveredPlaces;
  }, [discoveredPlaces, searchCity, searchPlaces]);

  // Scroll handler — fetch next page when near bottom
  const handleScroll = useCallback((e: { nativeEvent: { layoutMeasurement: { height: number }; contentOffset: { y: number }; contentSize: { height: number } } }) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (distanceFromBottom < 500 && hasNextPage && !isFetchingNextPage && !searchCity) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, searchCity]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
        AsyncStorage.setItem('travyl-favorites', JSON.stringify(next)).catch(() => {});
      }).catch(() => {});
      return next;
    });
  }, []);

  const tabFiltered = useMemo(() => {
    if (activeTab === 'all') return PLACES;
    if (activeTab === 'favorites') return PLACES.filter((p) => favorites.includes(p.id));
    return PLACES.filter((p) => p.type === activeTab);
  }, [activeTab, favorites, PLACES]);

  const subcategories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of tabFiltered) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);
  }, [tabFiltered]);

  const filteredPlaces = useMemo(() => {
    let result = [...tabFiltered];
    if (activeSubcategory) result = result.filter((p) => p.category === activeSubcategory);
    // Only apply local text filter when NOT in API search mode
    if (searchQuery.trim() && !searchCity) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.tagline?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (sortBy === 'top_rated') result.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'az') result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [tabFiltered, activeSubcategory, searchQuery, sortBy]);

  const baseSections = useMemo(() => {
    // Group by API category first (Landmark, Culinary, Museum, etc.) — always works
    const byCategory: Record<string, typeof filteredPlaces> = {};
    for (const place of filteredPlaces) {
      const cat = place.category || 'Other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(place);
    }
    const sections = Object.entries(byCategory)
      .filter(([, places]) => places.length >= 2)
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([cat, places]) => ({
        collection: { key: cat.toLowerCase(), label: cat, match: {} },
        places,
      }));
    // Fallback if no categories have 2+ items
    if (sections.length === 0 && filteredPlaces.length > 0) {
      sections.push({
        collection: { key: 'all', label: 'Places', match: {} },
        places: filteredPlaces,
      });
    }
    return { sections, remaining: [] as typeof filteredPlaces };
  }, [filteredPlaces]);

  // Prepend "Near You" as the first section when available
  const themedSections = useMemo(() => {
    if (!nearbyPlaces.length || searchCity || activeTab !== 'all') return baseSections;
    const nearYouSection = {
      collection: { key: 'near-you', label: 'Near You', icon: 'map-marker' },
      places: nearbyPlaces.slice(0, 10),
    };
    return { ...baseSections, sections: [nearYouSection, ...baseSections.sections] };
  }, [baseSections, nearbyPlaces, searchCity, activeTab]);

  // All places for the showcase — nearby + filtered combined
  const allShowcasePlaces = useMemo(() => {
    const nearIds = new Set(nearbyPlaces.map(p => p.id));
    const combined = [...nearbyPlaces, ...filteredPlaces.filter(p => !nearIds.has(p.id))];
    return combined;
  }, [nearbyPlaces, filteredPlaces]);

  const openShowcase = useCallback((placeId: string) => {
    const idx = allShowcasePlaces.findIndex((p) => p.id === placeId);
    if (idx !== -1) setShowcaseIdx(idx);
  }, [allShowcasePlaces]);

  const closeModal = useCallback(() => setSelectedPlace(null), []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} onScroll={handleScroll} scrollEventThrottle={200}>
        {/* Header */}
        <View style={{ paddingHorizontal: PAD, paddingTop: insets.top + 8, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ ...TextStyles.headline, color: colors.text }}>Places</Text>
              <View style={{
                backgroundColor: colors.cardBackground, borderRadius: 10,
                paddingHorizontal: 8, paddingVertical: 2,
                borderWidth: 1, borderColor: colors.border,
              }}>
                <Text style={{ ...TextStyles.captionEm, color: colors.textTertiary }}>
                  {filteredPlaces.length}
                </Text>
              </View>
            </View>

            {/* View mode toggle */}
            <View style={{
              flexDirection: 'row', backgroundColor: colors.cardBackground,
              borderRadius: 20, padding: 3, borderWidth: 1, borderColor: colors.border,
            }}>
              {(['grid', 'stack'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setViewMode(mode)}
                  style={{
                    width: 32, height: 32, borderRadius: 16,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: viewMode === mode ? '#fff' : 'transparent',
                    shadowColor: viewMode === mode ? '#000' : 'transparent',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: viewMode === mode ? 0.1 : 0,
                    shadowRadius: 2,
                  }}
                >
                  <FontAwesome
                    name={mode === 'grid' ? 'th-large' : 'clone'}
                    size={14}
                    color={viewMode === mode ? Navy.DEFAULT : colors.textTertiary}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: PAD }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => { setActiveTab(tab.key); setActiveSubcategory(''); }}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 10, paddingVertical: 8, marginRight: 4,
                  borderBottomWidth: 2,
                  borderBottomColor: isActive ? Navy.DEFAULT : 'transparent',
                }}
              >
                <FontAwesome
                  name={tab.icon as any}
                  size={12}
                  color={isActive ? Navy.DEFAULT : colors.textTertiary}
                  style={{ marginRight: 5 }}
                />
                <Text style={{
                  ...(isActive ? TextStyles.bodyEm : TextStyles.body),
                  color: isActive ? Navy.DEFAULT : colors.textTertiary,
                }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ height: 1, backgroundColor: colors.border }} />

        {/* Subcategory pills */}
        {subcategories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: PAD, paddingVertical: 8 }}
          >
            <Pressable
              onPress={() => setActiveSubcategory('')}
              style={{
                paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, marginRight: 6,
                backgroundColor: !activeSubcategory ? Navy.DEFAULT : colors.cardBackground,
              }}
            >
              <Text style={{
                ...TextStyles.captionEm,
                color: !activeSubcategory ? '#fff' : colors.textSecondary,
              }}>All</Text>
            </Pressable>
            {subcategories.map((cat) => {
              const isActive = activeSubcategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setActiveSubcategory(isActive ? '' : cat)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, marginRight: 6,
                    backgroundColor: isActive ? Navy.DEFAULT : colors.cardBackground,
                  }}
                >
                  <Text style={{
                    ...TextStyles.captionEm,
                    color: isActive ? '#fff' : colors.textSecondary,
                  }}>{cat}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Search + Sort row */}
        <View style={{ paddingHorizontal: PAD, paddingBottom: 10, paddingTop: subcategories.length > 1 ? 0 : 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Pressable
              onPress={() => {
                const keys: SortKey[] = ['default', 'top_rated', 'az'];
                const idx = keys.indexOf(sortBy);
                setSortBy(keys[(idx + 1) % keys.length]);
              }}
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 12, height: 36, borderRadius: 20,
                backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border,
              }}
            >
              <FontAwesome name="sort" size={11} color={colors.textTertiary} style={{ marginRight: 6 }} />
              <Text style={{ ...TextStyles.body, color: colors.textSecondary }}>
                {SORT_OPTIONS.find((o) => o.key === sortBy)?.label}
              </Text>
            </Pressable>
            <View style={{
              flex: 1, flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.cardBackground, borderRadius: 20,
              borderWidth: 1, borderColor: colors.border,
              paddingHorizontal: 12, height: 36,
            }}>
              <FontAwesome name="search" size={12} color={colors.textTertiary} />
              <TextInput
                value={searchQuery}
                onChangeText={(val) => {
                  setSearchQuery(val);
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                  if (val.trim().length >= 2) {
                    searchTimerRef.current = setTimeout(() => setSearchCity(val.trim()), 400) as unknown as NodeJS.Timeout;
                  } else if (!val.trim()) {
                    setSearchCity('');
                  }
                }}
                onSubmitEditing={() => {
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                  if (searchQuery.trim()) setSearchCity(searchQuery.trim());
                }}
                returnKeyType="search"
                placeholder="Search a city or destination..."
                placeholderTextColor={colors.textTertiary}
                style={{ flex: 1, fontSize: FontSize.body, color: colors.text, marginLeft: 8, paddingVertical: 0 }}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => { setSearchQuery(''); setSearchCity(''); if (searchTimerRef.current) clearTimeout(searchTimerRef.current); }}>
                  <FontAwesome name="times-circle" size={14} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Near You — rendered as a section in the same grid style */}
        {nearbyLoading && !searchCity && activeTab === 'all' && (
          <View style={{ paddingHorizontal: PAD, paddingVertical: 20, alignItems: 'center' }}>
            <Text style={{ ...TextStyles.caption, color: colors.textTertiary }}>Finding places near you...</Text>
          </View>
        )}

        {/* Content: Grid or Stack */}
        {viewMode === 'grid' ? (
          <View style={{ paddingHorizontal: PAD }}>
            {filteredPlaces.length === 0 && (
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <FontAwesome name="search" size={36} color={colors.textTertiary} />
                <Text style={{ ...TextStyles.subhead, color: colors.textTertiary, marginTop: 12 }}>
                  {activeTab === 'favorites' ? 'No favorites yet' : 'No places match your search'}
                </Text>
              </View>
            )}

            {themedSections.sections.map(({ collection, places: sectionPlaces }) => {
              const [left, right] = balanceColumns(sectionPlaces);
              return (
                <View key={collection.key} style={{ marginBottom: 8 }}>
                  {/* Section heading */}
                  <View style={{
                    borderTopWidth: 1, borderTopColor: colors.border,
                    paddingTop: 16, paddingBottom: 12, marginTop: 8,
                  }}>
                    <Text style={{ ...TextStyles.title, color: Navy.DEFAULT }}>
                      {collection.label}
                    </Text>
                    <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginTop: 2 }}>
                      {sectionPlaces.length} places
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: GAP, alignItems: 'flex-start' }}>
                    {[left, right].map((col, colIdx) => (
                      <View key={colIdx} style={{ flex: 1 }}>
                        {col.map((place) => (
                          <GridPlaceCard
                            key={place.id}
                            place={place}
                            isFav={favorites.includes(place.id)}
                            onPress={() => openShowcase(place.id)}
                            onToggleFav={() => toggleFavorite(place.id)}
                            colors={colors}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}

          </View>
        ) : (
          /* Stack view — tinder-style card carousel */
          <View style={{ minHeight: SCREEN_HEIGHT - 400, justifyContent: 'flex-end' }}>
            {filteredPlaces.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <FontAwesome name="search" size={36} color={colors.textTertiary} />
                <Text style={{ ...TextStyles.subhead, color: colors.textTertiary, marginTop: 12 }}>
                  {activeTab === 'favorites' ? 'No favorites yet' : 'No places match your search'}
                </Text>
              </View>
            ) : (
              <CardStackCarousel
                places={filteredPlaces}
                favorites={favorites}
                onToggleFav={toggleFavorite}
                onAddToTrip={addToTrip}
                tripSheet={{ state: tripSheetState, selectTrip, selectDay, dismiss, createTrip }}
                cardWidth={STACK_CARD_W}
                cardHeight={STACK_CARD_H}
              />
            )}
          </View>
        )}

        {/* Infinite scroll loading indicator */}
        {isFetchingNextPage && (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={Navy.DEFAULT} />
            <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginTop: 8 }}>
              Discovering more places...
            </Text>
          </View>
        )}
        {!hasNextPage && discoveredPlaces.length > 0 && !searchCity && (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <Text style={{ ...TextStyles.caption, color: colors.textTertiary }}>
              You've explored it all — for now
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Card Stack Showcase — full screen overlay when tapping a card */}
      {showcaseIdx >= 0 && allShowcasePlaces[showcaseIdx] && (
        <CardStackCarousel
          places={allShowcasePlaces}
          initialIndex={showcaseIdx}
          favorites={favorites}
          onToggleFav={toggleFavorite}
          onAddToTrip={addToTrip}
          tripSheet={{ state: tripSheetState, selectTrip, selectDay, dismiss, createTrip }}
          overlay
          onClose={() => setShowcaseIdx(-1)}
        />
      )}

      {/* Detail Modal — shared component */}
      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          allPlaces={PLACES}
          onClose={closeModal}
          favorites={favorites}
          onToggleFav={toggleFavorite}
          onSearchTag={(query) => {
            setSearchQuery(query);
            setSelectedPlace(null);
          }}
          renderFooter={(currentPlace) => (
            <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
              <ExplorePreview contextPlace={currentPlace} />
              <OceanWave />
              <Footer />
            </View>
          )}
        />
      )}

    </View>
  );
}
