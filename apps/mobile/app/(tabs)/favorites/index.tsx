import { useState, useMemo, useCallback, useEffect, memo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Navy, groupPlacesByCollection, TextStyles, FontSize, FontFamily, type PlaceItem } from '@travyl/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ExplorePreview } from '@/components/home/ExplorePreview';
import { OceanWave, Footer } from '@/components/home';
import PlaceDetailModal from '@/components/places/PlaceDetailModal';
import { CardStackCarousel } from '@/components/places/CardStackCarousel';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Use web app as API proxy — it has all the API keys (Foursquare, etc.)
// In dev: localhost:3000, in production: deeviaje.com
const WEB_API = process.env.EXPO_PUBLIC_WEB_API_URL || 'https://www.deeviaje.com';
const BACKEND_API = process.env.EXPO_PUBLIC_RECOMMENDATION_API_URL || 'https://api.dev.gotravyl.com';

const KNOWN_CITIES: Record<string, { lat: string; lng: string }> = {
  'paris': { lat: '48.8566', lng: '2.3522' }, 'london': { lat: '51.5074', lng: '-0.1278' },
  'rome': { lat: '41.9028', lng: '12.4964' }, 'tokyo': { lat: '35.6762', lng: '139.6503' },
  'barcelona': { lat: '41.3874', lng: '2.1686' }, 'new york': { lat: '40.7128', lng: '-74.0060' },
  'bali': { lat: '-8.4095', lng: '115.1889' }, 'dubai': { lat: '25.2048', lng: '55.2708' },
  'bangkok': { lat: '13.7563', lng: '100.5018' }, 'amsterdam': { lat: '52.3676', lng: '4.9041' },
  'sydney': { lat: '-33.8688', lng: '151.2093' }, 'istanbul': { lat: '41.0082', lng: '28.9784' },
  'lisbon': { lat: '38.7223', lng: '-9.1393' }, 'singapore': { lat: '1.3521', lng: '103.8198' },
  'seoul': { lat: '37.5665', lng: '126.9780' }, 'athens': { lat: '37.9838', lng: '23.7275' },
  'prague': { lat: '50.0755', lng: '14.4378' }, 'marrakech': { lat: '31.6295', lng: '-7.9811' },
  'cape town': { lat: '-33.9249', lng: '18.4241' }, 'mexico city': { lat: '19.4326', lng: '-99.1332' },
  'rio de janeiro': { lat: '-22.9068', lng: '-43.1729' }, 'miami': { lat: '25.7617', lng: '-80.1918' },
  'san francisco': { lat: '37.7749', lng: '-122.4194' }, 'los angeles': { lat: '34.0522', lng: '-118.2437' },
  'cancun': { lat: '21.1619', lng: '-86.8515' }, 'berlin': { lat: '52.5200', lng: '13.4050' },
};

// Upscale Google Places thumbnails to usable resolution
function upscaleImage(url: string | null | undefined): string {
  if (!url) return '';
  return url.replace(/=w\d+-h\d+(-k-no)?/, '=w600-h400-k-no');
}

// Map backend response to PlaceItem format
function mapBackendToPlaceItem(p: any): PlaceItem {
  const cat = (p.category || '').toLowerCase();
  return {
    id: p.id,
    name: p.name,
    image: upscaleImage(p.photo_url),
    type: /restaurant|cafe|bar|dining/.test(cat) ? 'restaurant' : /park|garden|beach/.test(cat) ? 'experience' : 'attraction',
    rating: p.rating || 0,
    tagline: p.description?.split('.')[0] || p.category || '',
    category: p.category || '',
    description: p.description || '',
    tags: p.tags || [p.category].filter(Boolean),
    latitude: p.lat,
    longitude: p.lng,
    address: p.address,
    reviewCount: p.review_count,
  };
}

async function resolveCoords(query: string): Promise<{ lat: string; lng: string } | null> {
  const known = KNOWN_CITIES[query.toLowerCase()];
  if (known) return known;
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

const BROWSE_CITIES = [
  { lat: '48.8566', lng: '2.3522', name: 'Paris' },
  { lat: '35.6762', lng: '139.6503', name: 'Tokyo' },
  { lat: '41.9028', lng: '12.4964', name: 'Rome' },
  { lat: '40.7128', lng: '-74.0060', name: 'New York' },
  { lat: '41.3874', lng: '2.1686', name: 'Barcelona' },
  { lat: '-33.8688', lng: '151.2093', name: 'Sydney' },
  { lat: '13.7563', lng: '100.5018', name: 'Bangkok' },
  { lat: '25.2048', lng: '55.2708', name: 'Dubai' },
  { lat: '51.5074', lng: '-0.1278', name: 'London' },
  { lat: '-8.4095', lng: '115.1889', name: 'Bali' },
  { lat: '37.9838', lng: '23.7275', name: 'Athens' },
  { lat: '31.6295', lng: '-7.9811', name: 'Marrakech' },
  { lat: '37.7749', lng: '-122.4194', name: 'San Francisco' },
  { lat: '1.3521', lng: '103.8198', name: 'Singapore' },
];

const ALL_CATEGORIES = [
  'sightseeing', 'restaurant', 'museum', 'park', 'cafe',
  'bar', 'shopping', 'nightlife', 'landmark',
];

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
        .then((data: any[]) => Array.isArray(data) ? data.map(mapBackendToPlaceItem) : [])
        .catch(() => [])
    )
  );
  return dedup(results.flat()).filter(p =>
    p.latitude != null && p.longitude != null &&
    distanceKm(lat, lng, p.latitude!, p.longitude!) <= NEARBY_RADIUS_KM
  );
}

// Session seed so each app launch gets different cities
const SESSION_SEED = Date.now();

// Fast first batch: 2 cities × 1 category = 2 API calls (~1-2s)
async function fetchMobilePlacesFast(): Promise<PlaceItem[]> {
  const shuffled = [...BROWSE_CITIES].sort(() => Math.sin(SESSION_SEED + Math.random()) - 0.5);
  const cities = shuffled.slice(0, 2);
  const cat = ALL_CATEGORIES[Math.floor(Math.random() * ALL_CATEGORIES.length)];

  const url = `${WEB_API}/api/places/nearby?lat=${cities[0].lat}&lng=${cities[0].lng}&category=${cat}&limit=12`;
  console.log('[Places] Fetching:', url);

  const results = await Promise.all(
    cities.map(city =>
      fetch(`${WEB_API}/api/places/nearby?lat=${city.lat}&lng=${city.lng}&category=${cat}&limit=12`)
        .then(r => {
          console.log('[Places] Response status:', r.status);
          return r.ok ? r.json() : [];
        })
        .then((data: any[]) => {
          console.log('[Places] Raw items:', data.length, 'first photo:', data[0]?.photo_url?.substring(0, 50));
          const mapped = Array.isArray(data) ? data.map(mapBackendToPlaceItem) : [];
          console.log('[Places] Mapped items:', mapped.length, 'first image:', mapped[0]?.image?.substring(0, 50));
          return mapped;
        })
        .catch((err) => { console.log('[Places] Fetch error:', err); return []; })
    )
  );
  const deduped = dedup(results.flat());
  console.log('[Places] Final deduped:', deduped.length);
  return deduped;
}

// Slower second batch: more cities + categories + foursquare
async function fetchMobilePlacesMore(): Promise<PlaceItem[]> {
  const shuffled = [...BROWSE_CITIES].sort(() => Math.sin(SESSION_SEED + Math.random() + 1) - 0.5);
  const cities = shuffled.slice(0, 3);
  const catStart = Math.floor(Math.random() * ALL_CATEGORIES.length);

  const fetches: Promise<PlaceItem[]>[] = [];
  cities.forEach((city, i) => {
    const cat = ALL_CATEGORIES[(catStart + i) % ALL_CATEGORIES.length];
    fetches.push(
      fetch(`${WEB_API}/api/places/nearby?lat=${city.lat}&lng=${city.lng}&category=${cat}&limit=10`)
        .then(r => r.ok ? r.json() : [])
        .then((data: any[]) => data.map(mapBackendToPlaceItem))
        .catch(() => [])
    );
  });
  // Foursquare for restaurants
  fetches.push(
    fetch(`${WEB_API}/api/foursquare?lat=${cities[0].lat}&lng=${cities[0].lng}&category=restaurant&limit=6`)
      .then(async r => {
        if (!r.ok) return [];
        const venues = await r.json();
        if (!Array.isArray(venues)) return [];
        return venues
          .filter((v: any) => v.image && !v.image.includes('categories_v2'))
          .map((v: any): PlaceItem => ({
            id: `fs_${v.id}`, name: v.name, image: v.image, type: 'restaurant',
            rating: v.rating ? v.rating / 2 : 0, tagline: v.address || 'Restaurant',
            category: v.category || 'Restaurant', description: v.tip || '',
            latitude: v.lat, longitude: v.lng, tags: [v.category || 'Restaurant'],
          }));
      })
      .catch(() => [])
  );

  const results = await Promise.all(fetches);
  return dedup(results.flat());
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
const STACK_CARD_W = SCREEN_WIDTH * 0.72;
const STACK_CARD_H = STACK_CARD_W * 1.3;

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
          <Image source={imgs[imgIdx]} style={{ width: '100%', height: imgH }} contentFit="cover" cachePolicy="memory-disk" transition={200} />

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

  // Phase 1: fast initial load (~1-2s)
  const { data: fastPlaces = [], isLoading: fastLoading } = useQuery({
    queryKey: ['mobile-places-fast', SESSION_SEED],
    queryFn: fetchMobilePlacesFast,
    staleTime: 5 * 60 * 1000,
  });
  // Phase 2: more results in background
  const { data: morePlaces = [] } = useQuery({
    queryKey: ['mobile-places-more', SESSION_SEED],
    queryFn: fetchMobilePlacesMore,
    staleTime: 5 * 60 * 1000,
    enabled: fastPlaces.length > 0, // only after fast batch loads
  });
  // API search — NLP search via /api/places/suggest
  const { data: searchPlaces = [], isLoading: searchLoading } = useQuery({
    queryKey: ['mobile-places-search', searchCity],
    queryFn: async () => {
      if (!searchCity) return [];

      // Try NLP suggest endpoint first (handles "hidden gem restaurant in Paris", "best ramen Tokyo", etc.)
      const coords = await resolveCoords(searchCity);
      const destination = coords ? searchCity : searchCity.split(' ').pop() || searchCity;

      const suggestRes = await fetch(
        `${WEB_API}/api/places/suggest?q=${encodeURIComponent(searchCity)}&destination=${encodeURIComponent(destination)}&limit=20`
      ).catch(() => null);

      if (suggestRes?.ok) {
        const json = await suggestRes.json();
        const suggestions = json.suggestions ?? json.results ?? [];
        if (suggestions.length > 0) {
          return dedup(suggestions.map((s: any): PlaceItem => ({
            id: s.id,
            name: s.name,
            image: s.imageUrl || s.imageUrls?.[0] || '',
            images: s.imageUrls || (s.imageUrl ? [s.imageUrl] : []),
            type: /restaurant|food|cafe|dining/i.test(s.category || '') ? 'restaurant' : 'attraction',
            rating: s.rating || 0,
            tagline: s.location || s.description || s.category || '',
            category: s.category || '',
            description: s.description || '',
            tags: s.tags || [s.category].filter(Boolean),
            latitude: s.latitude,
            longitude: s.longitude,
            address: s.location,
            reviewCount: s.reviewCount,
          })));
        }
      }

      // Fallback: nearby search with resolved coordinates
      if (!coords) return [];
      const cats = ['sightseeing', 'restaurant', 'museum', 'park', 'cafe', 'nightlife'];
      const fetches: Promise<PlaceItem[]>[] = cats.map(cat =>
        fetch(`${WEB_API}/api/places/nearby?lat=${coords.lat}&lng=${coords.lng}&category=${cat}&limit=8`)
          .then(r => r.ok ? r.json() : [])
          .then((data: any[]) => data.map(mapBackendToPlaceItem))
          .catch(() => [])
      );
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

  // Merge and deduplicate — search results take priority
  const PLACES = useMemo(() => {
    if (searchCity && searchPlaces.length > 0) return searchPlaces;
    const all = [...fastPlaces, ...morePlaces];
    const seen = new Set<string>();
    return all.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
  }, [fastPlaces, morePlaces, searchCity, searchPlaces]);
  const placesLoading = searchCity ? searchLoading : fastLoading;
  const placesError = null;


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

  const themedSections = useMemo(() => groupPlacesByCollection(filteredPlaces), [filteredPlaces]);

  const openShowcase = useCallback((placeId: string) => {
    const idx = filteredPlaces.findIndex((p) => p.id === placeId);
    if (idx !== -1) setShowcaseIdx(idx);
  }, [filteredPlaces]);

  const closeModal = useCallback(() => setSelectedPlace(null), []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <StatusBar barStyle="dark-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
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

        {/* Near You Section */}
        {nearbyPlaces.length > 0 && !searchCity && activeTab === 'all' && (
          <View style={{ paddingHorizontal: PAD, marginBottom: 16 }}>
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, paddingBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FontAwesome name="map-marker" size={14} color="#1e3a5f" />
                <Text style={{ ...TextStyles.title, color: '#1e3a5f' }}>Near You</Text>
              </View>
              <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginTop: 2 }}>
                {nearbyPlaces.length} places within {NEARBY_RADIUS_KM}km
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {nearbyPlaces.slice(0, 10).map((place) => (
                <Pressable
                  key={place.id}
                  onPress={() => setSelectedPlace(place)}
                  style={{ width: 160 }}
                >
                  <Image
                    source={{ uri: place.image }}
                    style={{ width: 160, height: 120, borderRadius: 12 }}
                    contentFit="cover"
                  />
                  <Text style={{ ...TextStyles.bodyLgEm, color: colors.text, marginTop: 6 }} numberOfLines={1}>{place.name}</Text>
                  <Text style={{ ...TextStyles.caption, color: colors.textTertiary }} numberOfLines={1}>{place.tagline}</Text>
                  {place.rating > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                      <FontAwesome name="star" size={10} color="#f59e0b" />
                      <Text style={{ ...TextStyles.caption, color: colors.textSecondary }}>{place.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
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
                    <Text style={{ ...TextStyles.title, color: '#1e3a5f' }}>
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
          <View style={{ flex: 1 }}>
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
                cardWidth={STACK_CARD_W}
                cardHeight={STACK_CARD_H}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Card Stack Showcase — full screen overlay when tapping a card */}
      {showcaseIdx >= 0 && filteredPlaces[showcaseIdx] && (
        <CardStackCarousel
          places={filteredPlaces}
          initialIndex={showcaseIdx}
          favorites={favorites}
          onToggleFav={toggleFavorite}
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
