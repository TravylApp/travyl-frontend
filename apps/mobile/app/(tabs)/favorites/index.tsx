import { useState, useMemo, useCallback, useEffect, memo, useRef } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Navy, TextStyles, FontSize, FontFamily, upscaleGoogleImage, mapCategory, getWebApiBase, type PlaceItem } from '@travyl/shared';
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
// Map the fetch category we requested to the PlaceItem type for tab filtering
const FETCH_CAT_TO_TYPE: Record<string, PlaceItem['type']> = {
  restaurant: 'restaurant',
  cafe: 'restaurant',
  nightlife: 'experience',
  sightseeing: 'attraction',
  museum: 'attraction',
  park: 'attraction',
};

function inferType(fetchCategory: string | undefined, apiCategory: string | undefined): PlaceItem['type'] {
  // Trust the fetch category first — we know what we asked for
  if (fetchCategory && FETCH_CAT_TO_TYPE[fetchCategory]) return FETCH_CAT_TO_TYPE[fetchCategory];
  // Fallback: use whatever the API returned
  return (apiCategory as PlaceItem['type']) || 'attraction';
}

function mapToPlaceItem(p: any, fetchCategory?: string): PlaceItem {
  return {
    id: p.id,
    name: p.name,
    image: upscaleGoogleImage(p.image || p.photo_url) ?? '',
    images: p.images?.map((img: string) => upscaleGoogleImage(img) ?? img),
    type: fetchCategory ? inferType(fetchCategory, p.category) : (p.type || inferType(undefined, p.category)),
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
  const categories = ['sightseeing', 'restaurant', 'cafe', 'nightlife', 'park'];
  const results = await Promise.all(
    categories.map(cat =>
      fetch(`${WEB_API}/api/places?lat=${lat}&lng=${lng}&category=${cat}&limit=8`)
        .then(r => r.ok ? r.json() : [])
        .then((data: any[]) => Array.isArray(data) ? data.map((p: any) => mapToPlaceItem(p, cat)) : [])
        .catch(() => [])
    )
  );
  return dedup(results.flat()).filter(p =>
    p.latitude != null && p.longitude != null &&
    distanceKm(lat, lng, p.latitude!, p.longitude!) <= NEARBY_RADIUS_KM
  );
}

// Fetch trending destinations from API, shuffle for variety, cache per session
let _trendingCache: string[] | null = null;
let _trendingFetchPromise: Promise<string[]> | null = null;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function getTrendingDestinations(): Promise<string[]> {
  if (_trendingCache) return _trendingCache;
  if (_trendingFetchPromise) return _trendingFetchPromise;
  _trendingFetchPromise = fetch(`${WEB_API}/api/trending-destinations`)
    .then(r => r.ok ? r.json() : [])
    .then((data: any[]) => {
      const names = Array.isArray(data) ? data.map((d: any) => d.name).filter(Boolean) : [];
      // Shuffle so each app launch shows a different order
      _trendingCache = names.length > 0 ? shuffle(names) : null;
      _trendingFetchPromise = null;
      return _trendingCache ?? [];
    })
    .catch(() => { _trendingFetchPromise = null; return []; });
  return _trendingFetchPromise;
}

// Place categories to fetch per destination
const PLACE_CATEGORIES = ['sightseeing', 'restaurant', 'nightlife', 'museum', 'park', 'cafe'];

async function fetchSuggestPage(page: number): Promise<{ items: PlaceItem[]; hasMore: boolean; nextPage: number | null }> {
  try {
    const trending = await getTrendingDestinations();
    if (trending.length === 0) return { items: [], hasMore: false, nextPage: null };
    const destination = trending[page % trending.length];
    const slug = destination.toLowerCase().replace(/\s/g, '-');

    // Geocode for lat/lng
    const coords = await resolveCoords(destination);

    // Fetch places across categories + events — all in parallel
    const placeFetches = PLACE_CATEGORIES.map(cat => {
      const url = coords
        ? `${WEB_API}/api/places?lat=${coords.lat}&lng=${coords.lng}&category=${cat}&limit=4`
        : `${WEB_API}/api/places?q=${encodeURIComponent(destination)}&category=${cat}&limit=4`;
      return fetch(url)
        .then(r => r.ok ? r.json() : [])
        .then((data: any[]) => (Array.isArray(data) ? data : []).map((p: any, i: number) =>
          mapToPlaceItem({
            ...p,
            id: `${slug}-${cat}-${page}-${i}`,
            address: p.address || p.location || destination,
          }, cat)
        ))
        .catch(() => [] as PlaceItem[]);
    });

    // Also fetch events for this destination
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const eventFetch = fetch(`${WEB_API}/api/events/search?city=${encodeURIComponent(destination)}&start=${today}&end=${nextMonth}`)
      .then(r => r.ok ? r.json() : [])
      .then((events: any[]) => (Array.isArray(events) ? events.slice(0, 5) : []).map((e: any, i: number): PlaceItem => ({
        id: `${slug}-event-${page}-${i}`,
        name: e.name || e.title,
        image: e.photo_url || e.image || '',
        type: 'event',
        rating: 0,
        tagline: [e.venue, e.date].filter(Boolean).join(' · '),
        category: 'Event',
        description: e.description || '',
        tags: ['Event', e.category].filter(Boolean),
        latitude: e.lat,
        longitude: e.lng,
        address: e.venue || destination,
      })))
      .catch(() => [] as PlaceItem[]);

    // On first page, add ALL trending destinations as destination cards
    // On subsequent pages, just add the current destination
    let destCards: PlaceItem[] = [];
    try {
      const trendingData = await fetch(`${WEB_API}/api/trending-destinations`).then(r => r.ok ? r.json() : []) as any[];
      if (page === 0) {
        destCards = trendingData.map((d: any, i: number) => ({
          id: `dest-trending-${i}`,
          name: d.name,
          image: d.thumbnail || '',
          type: 'destination' as const,
          rating: 0,
          tagline: d.country ? `${d.country}` : `Explore ${d.name}`,
          category: 'Destination',
          description: `Discover things to do in ${d.name}`,
          tags: ['Destination', d.country].filter(Boolean),
          address: d.country ? `${d.name}, ${d.country}` : d.name,
        }));
      } else {
        const match = trendingData.find((d: any) => d.name === destination);
        destCards = [{
          id: `${slug}-dest-${page}`,
          name: destination,
          image: match?.thumbnail || '',
          type: 'destination' as const,
          rating: 0,
          tagline: match?.country || `Explore ${destination}`,
          category: 'Destination',
          description: `Discover things to do in ${destination}`,
          tags: ['Destination'],
          address: destination,
        }];
      }
    } catch {}

    const [placeResults, events] = await Promise.all([
      Promise.all(placeFetches),
      eventFetch,
    ]);

    const items = shuffle([...destCards, ...placeResults.flat(), ...events]);

    return {
      items,
      hasMore: page < trending.length - 1,
      nextPage: page + 1,
    };
  } catch {
    return { items: [], hasMore: false, nextPage: null };
  }
}

function dedup(places: PlaceItem[]): PlaceItem[] {
  const seen = new Set<string>();
  const seenNames = new Set<string>();
  return places.filter((p) => {
    if (!p.name || seen.has(p.id)) return false;
    const norm = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenNames.has(norm)) return false;
    seen.add(p.id);
    seenNames.add(norm);
    return true;
  });
}

const PAD = 16;
const GAP = 4;

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
type ViewMode = 'grid' | 'stack' | 'flush';

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

const TYPE_ICON: Record<string, string> = {
  event: 'calendar', restaurant: 'cutlery', experience: 'compass',
  destination: 'map-marker', attraction: 'university', hotel: 'bed',
};
const TYPE_COLOR: Record<string, string> = {
  event: '#8b5cf6', restaurant: '#ef4444', experience: '#f59e0b',
  destination: '#3b82f6', attraction: '#10b981', hotel: '#6366f1',
};

const GridPlaceCard = memo(function GridPlaceCard({
  place, isFav, onPress, onToggleFav, colors, flush,
}: {
  place: PlaceItem;
  flush?: boolean;
  isFav: boolean;
  onPress: () => void;
  onToggleFav: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const imgH = getImageHeight(place.id);
  const imgs = place.images && place.images.length > 1 ? place.images : place.image ? [place.image] : [];
  const [imgIdx, setImgIdx] = useState(0);
  const hasMultiple = imgs.length > 1;
  const hasImage = imgs.length > 0 && !!imgs[0];
  const typeColor = TYPE_COLOR[place.type] || '#6b7280';
  const typeIcon = TYPE_ICON[place.type] || 'globe';
  const isEvent = place.type === 'event';
  const isRestaurant = place.type === 'restaurant';
  const priceStr = place.priceLevel ? '$'.repeat(place.priceLevel) : '';

  return (
    <Pressable onPress={onPress} style={{ marginBottom: flush ? 1 : GAP }}>
      <View style={{
        borderRadius: flush ? 0 : 14, overflow: 'hidden',
        backgroundColor: colors.cardBackground,
        borderWidth: flush ? 0 : 1, borderColor: colors.border,
      }}>
        <View style={{ height: imgH, position: 'relative' }}>
          {hasImage ? (
            <Image source={{ uri: imgs[imgIdx], headers: { Referer: '' } }} style={{ width: '100%', height: imgH }} contentFit="cover" cachePolicy="memory-disk" transition={200} />
          ) : (
            <View style={{ width: '100%', height: imgH, backgroundColor: typeColor + '18', alignItems: 'center', justifyContent: 'center' }}>
              <FontAwesome name={typeIcon as any} size={32} color={typeColor + '40'} />
            </View>
          )}

          {hasMultiple && (
            <Pressable
              onPress={() => setImgIdx((prev) => (prev + 1) % imgs.length)}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          )}

          {/* Type badge — top-left */}
          <View style={{
            position: 'absolute', top: 8, left: 8,
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: typeColor, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
          }}>
            <FontAwesome name={typeIcon as any} size={8} color="#fff" />
            <Text style={{ ...TextStyles.micro, color: '#fff', textTransform: 'capitalize' }}>{place.type}</Text>
          </View>

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

          {/* Dot indicators */}
          {hasMultiple && (
            <View pointerEvents="none" style={{
              position: 'absolute', bottom: 8, left: 0, right: 0,
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

        {/* Content below image */}
        {!flush && <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 }}>
          {/* Location */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
            <FontAwesome name="map-marker" size={9} color={colors.textTertiary} style={{ marginRight: 4 }} />
            <Text style={{ ...TextStyles.sm, color: colors.textTertiary, flex: 1 }} numberOfLines={1}>
              {place.address || place.tagline}
            </Text>
          </View>

          {/* Name */}
          <Text style={{ ...TextStyles.bodyLgEm, color: colors.text, marginBottom: 2 }} numberOfLines={2}>{place.name}</Text>

          {/* Rating + reviews + price row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
            {place.rating > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <FontAwesome name="star" size={10} color="#fbbf24" />
                <Text style={{ ...TextStyles.smEm, color: colors.text }}>{place.rating}</Text>
              </View>
            )}
            {(place.reviewCount ?? 0) > 0 && (
              <Text style={{ ...TextStyles.xs, color: colors.textTertiary }}>
                ({(place.reviewCount ?? 0).toLocaleString()})
              </Text>
            )}
            {priceStr ? (
              <Text style={{ ...TextStyles.smEm, color: '#10b981' }}>{priceStr}</Text>
            ) : null}
          </View>

          {/* Description */}
          {place.description ? (
            <Text style={{ ...TextStyles.sm, color: colors.textSecondary, marginBottom: 4 }} numberOfLines={2}>{place.description}</Text>
          ) : null}

          {/* Hours + Duration row */}
          {(place.hours || place.duration) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
              {place.hours && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <FontAwesome name="clock-o" size={9} color={colors.textTertiary} />
                  <Text style={{ ...TextStyles.xs, color: colors.textSecondary }} numberOfLines={1}>{place.hours}</Text>
                </View>
              )}
              {place.duration && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <FontAwesome name="hourglass-half" size={8} color={colors.textTertiary} />
                  <Text style={{ ...TextStyles.xs, color: colors.textSecondary }}>{place.duration}</Text>
                </View>
              )}
            </View>
          )}

          {/* Event: date/time + ticket link */}
          {isEvent && place.tagline && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <FontAwesome name="calendar" size={9} color={typeColor} />
              <Text style={{ ...TextStyles.sm, color: typeColor, flex: 1 }} numberOfLines={1}>{place.tagline}</Text>
            </View>
          )}
          {isEvent && place.website && (
            <Pressable
              onPress={() => Linking.openURL(place.website!).catch(() => {})}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: typeColor + '15', borderRadius: 8,
                paddingVertical: 6, marginBottom: 4,
              }}
            >
              <FontAwesome name="ticket" size={10} color={typeColor} />
              <Text style={{ ...TextStyles.smEm, color: typeColor }}>Get Tickets</Text>
            </Pressable>
          )}

          {/* Website link for non-events */}
          {!isEvent && place.website && (
            <Pressable
              onPress={() => Linking.openURL(place.website!).catch(() => {})}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}
            >
              <FontAwesome name="external-link" size={9} color={colors.tint} />
              <Text style={{ ...TextStyles.xs, color: colors.tint }} numberOfLines={1}>Visit website</Text>
            </Pressable>
          )}

          {/* Tags */}
          {place.tags && place.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
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
        </View>}
      </View>
    </Pressable>
  );
});


/* ═══════════════ Main Screen ═══════════════ */

export default function FavoritesScreen() {
  const colors = useThemeColors();
  const queryClient = useQueryClient();
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

  // API search — free-text: searches places, events, and Google Maps in parallel
  const { data: searchPlaces = [], isLoading: searchLoading } = useQuery({
    queryKey: ['mobile-places-search', searchCity],
    queryFn: async () => {
      if (!searchCity) return [];
      const query = searchCity;
      const allPlaces: PlaceItem[] = [];

      // 1) Google Maps search — finds any business, landmark, or place by name
      const mapsFetch = fetch(`${WEB_API}/api/search/maps?q=${encodeURIComponent(query)}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: any[]) => (Array.isArray(data) ? data : []).map((p: any) => mapToPlaceItem(p)))
        .catch(() => [] as PlaceItem[]);

      // 2) Try geocoding — if it's a city name, fetch places by category
      const coords = await resolveCoords(query);

      // 3) If we got coords, also fetch by categories for that location
      const catFetches = coords
        ? ['sightseeing', 'restaurant', 'nightlife'].map(cat =>
            fetch(`${WEB_API}/api/places?lat=${coords.lat}&lng=${coords.lng}&category=${cat}&limit=6`)
              .then(r => r.ok ? r.json() : [])
              .then((data: any[]) => (Array.isArray(data) ? data : []).map((p: any) => mapToPlaceItem(p, cat)))
              .catch(() => [] as PlaceItem[])
          )
        : [];

      // 4) Search events — SerpAPI Google Events (rich data: tickets, venue, address)
      const eventFetch = fetch(`${WEB_API}/api/events/search?city=${encodeURIComponent(query)}`)
        .then(r => r.ok ? r.json() : [])
        .then((events: any[]) => (Array.isArray(events) ? events.slice(0, 10) : []).map((e: any, i: number): PlaceItem => ({
          id: `search-ev-${i}`,
          name: e.name || e.title,
          image: e.photo_url || e.image || '',
          type: 'event',
          rating: e.venue_rating || 0,
          reviewCount: e.venue_reviews || undefined,
          tagline: [e.venue, e.date].filter(Boolean).join(' · '),
          category: 'Event',
          description: e.description || '',
          tags: ['Event', e.venue].filter(Boolean),
          address: e.address || e.venue || '',
          website: e.link || '',
        })))
        .catch(() => [] as PlaceItem[]);

      // 5) Also try the suggest endpoint with query as destination
      const suggestFetch = fetch(`${WEB_API}/api/places/suggest?destination=${encodeURIComponent(query)}&limit=10`)
        .then(r => r.ok ? r.json() : { suggestions: [] })
        .then((data: any) => (data.suggestions ?? []).map((s: any, i: number) => mapToPlaceItem({
          id: `search-suggest-${i}`,
          name: s.name,
          category: s.category,
          image: s.imageUrl || s.image,
          images: s.imageUrls,
          rating: s.rating,
          description: s.description,
          address: s.location,
          latitude: s.latitude,
          longitude: s.longitude,
        })))
        .catch(() => [] as PlaceItem[]);

      const [mapsResults, ...catResults] = await Promise.all([mapsFetch, ...catFetches]);
      const [events, suggested] = await Promise.all([eventFetch, suggestFetch]);

      // Maps results first (most relevant), then events, then category results
      allPlaces.push(...mapsResults, ...events, ...catResults.flat(), ...suggested);
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

  // Auto-load first 3 pages for rich initial content
  useEffect(() => {
    if (discoveredPlaces.length > 0 && discoveredPlaces.length < 60 && hasNextPage && !isFetchingNextPage && !searchCity) {
      fetchNextPage();
    }
  }, [discoveredPlaces.length]);

  // Load more on scroll
  const handleScroll = useCallback((e: { nativeEvent: { layoutMeasurement: { height: number }; contentOffset: { y: number }; contentSize: { height: number } } }) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (distanceFromBottom < 2000 && hasNextPage && !isFetchingNextPage && !searchCity) {
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
      .filter(([, places]) => places.length >= 1)
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} onScroll={handleScroll} scrollEventThrottle={100}>
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
                  {allShowcasePlaces.length}
                </Text>
              </View>
            </View>

            {/* View mode toggle */}
            <View style={{
              flexDirection: 'row', backgroundColor: colors.cardBackground,
              borderRadius: 20, padding: 3, borderWidth: 1, borderColor: colors.border,
            }}>
              {(['grid', 'flush', 'stack'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setViewMode(mode)}
                  style={{
                    width: 32, height: 32, borderRadius: 16,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: viewMode === mode ? colors.surfaceElevated : 'transparent',
                    shadowColor: viewMode === mode ? colors.shadow : 'transparent',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: viewMode === mode ? 0.1 : 0,
                    shadowRadius: 2,
                  }}
                >
                  <FontAwesome
                    name={mode === 'grid' ? 'th-large' : mode === 'flush' ? 'th' : 'clone'}
                    size={14}
                    color={viewMode === mode ? colors.tint : colors.textTertiary}
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
                  borderBottomColor: isActive ? colors.tint : 'transparent',
                }}
              >
                <FontAwesome
                  name={tab.icon as any}
                  size={12}
                  color={isActive ? colors.tint : colors.textTertiary}
                  style={{ marginRight: 5 }}
                />
                <Text style={{
                  ...(isActive ? TextStyles.bodyEm : TextStyles.body),
                  color: isActive ? colors.tint : colors.textTertiary,
                }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ height: 1, backgroundColor: colors.border }} />


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
        {(viewMode === 'grid' || viewMode === 'flush') ? (
          <View style={{ paddingHorizontal: viewMode === 'flush' ? 0 : PAD }}>
            {themedSections.sections.flatMap(s => s.places).length === 0 && (
              <View style={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 }}>
                <FontAwesome name={activeTab === 'favorites' ? 'heart-o' : 'compass'} size={40} color={colors.textTertiary} />
                <Text style={{ ...TextStyles.subhead, color: colors.text, marginTop: 16 }}>
                  {activeTab === 'favorites' ? 'No favorites yet' : `No ${activeTab === 'all' ? '' : activeTab + ' '}places found`}
                </Text>
                <Text style={{ ...TextStyles.body, color: colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                  {activeTab === 'favorites'
                    ? 'Tap the heart on any place to save it here.'
                    : 'Try selecting "All" or search for a specific city.'}
                </Text>
                {activeTab !== 'all' && (
                  <Pressable
                    onPress={() => { setActiveTab('all'); setActiveSubcategory(''); }}
                    style={({ pressed }) => ({
                      marginTop: 20, paddingHorizontal: 20, paddingVertical: 10,
                      borderRadius: 10, backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ ...TextStyles.bodyEm, color: '#fff' }}>Show All Places</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Sectioned masonry grid with headers */}
            {themedSections.sections.map((section) => {
              if (section.places.length === 0) return null;
              const [left, right] = balanceColumns(section.places);
              return (
                <View key={section.collection.key} style={{ marginBottom: 24 }}>
                  {/* Section header — editorial style */}
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: viewMode === 'flush' ? PAD : 0, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                      <Text style={{ fontFamily: FontFamily.serif, fontSize: 20, color: colors.text, letterSpacing: -0.5 }}>{section.collection.label}</Text>
                      <View style={{ backgroundColor: colors.tint + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                        <Text style={{ ...TextStyles.xs, color: colors.tint, fontFamily: FontFamily.sansBold }}>{section.places.length}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: viewMode === 'flush' ? 1 : GAP, alignItems: 'flex-start' }}>
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
                            flush={viewMode === 'flush'}
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
          /* Stack view — full overlay with map */
          <View style={{ minHeight: SCREEN_HEIGHT - 300 }}>
            {allShowcasePlaces.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <FontAwesome name="search" size={36} color={colors.textTertiary} />
                <Text style={{ ...TextStyles.subhead, color: colors.textTertiary, marginTop: 12 }}>
                  {activeTab === 'favorites' ? 'No favorites yet' : 'No places match your search'}
                </Text>
              </View>
            ) : (
              <CardStackCarousel
                places={allShowcasePlaces}
                favorites={favorites}
                onToggleFav={toggleFavorite}
                onAddToTrip={addToTrip}
                tripSheet={{ state: tripSheetState, selectTrip, selectDay, dismiss, createTrip }}
                overlay
                onClose={() => setViewMode('grid')}
              />
            )}
          </View>
        )}

        {/* Load more button + indicator */}
        {isFetchingNextPage && (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.tint} />
            <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginTop: 8 }}>
              Discovering more places...
            </Text>
          </View>
        )}
        {/* Loading indicator for infinite scroll */}
        {isFetchingNextPage && (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.tint} />
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
