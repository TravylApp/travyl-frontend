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
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  Navy, TextStyles, FontSize, FontFamily,
  haversineKm as distanceKm, fetchDiscoverPage, fetchNearbyPlaces, searchPlaces, dedupPlaces, distanceLabel,
  type PlaceItem, type DiscoverPageResult,
} from '@travyl/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAddToTrip } from '@/hooks/useAddToTrip';

import { ExplorePreview } from '@/components/home/ExplorePreview';
import { OceanWave, Footer } from '@/components/home';
import PlaceDetailModal from '@/components/places/PlaceDetailModal';
import { CardStackCarousel } from '@/components/places/CardStackCarousel';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PAD = 16;
const GAP = 4;
const AUTO_LOAD_THRESHOLD = 100;
const SCROLL_LOAD_DISTANCE = 1200;
const NO_COORDS_DISTANCE = 99999;
const NEARBY_MERGE_RADIUS_KM = 16;

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
type SortKey = 'default' | 'top_rated' | 'nearest' | 'az';
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
  { key: 'nearest', label: 'Nearest' },
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
  place, isFav, onPress, onToggleFav, colors, flush, userLoc,
}: {
  place: PlaceItem;
  flush?: boolean;
  isFav: boolean;
  onPress: () => void;
  onToggleFav: () => void;
  colors: ReturnType<typeof useThemeColors>;
  userLoc?: { lat: number; lng: number } | null;
}) {
  const imgH = getImageHeight(place.id);
  const imgs = place.images && place.images.length > 1 ? place.images : place.image ? [place.image] : [];
  const [imgIdx, setImgIdx] = useState(0);
  const hasMultiple = imgs.length > 1;
  const hasImage = imgs.length > 0 && !!imgs[0];
  const typeColor = TYPE_COLOR[place.type] || '#6b7280';
  const typeIcon = TYPE_ICON[place.type] || 'globe';
  const isEvent = place.type === 'event';
  const priceStr = place.priceLevel ? '$'.repeat(place.priceLevel) : '';

  // Calculate distance from user
  let distLabel = '';
  if (userLoc && place.latitude != null && place.longitude != null) {
    const dist = distanceKm(userLoc.lat, userLoc.lng, place.latitude, place.longitude);
    const mi = dist * 0.621371;
    distLabel = mi < 0.3 ? `${Math.round(mi * 5280)} ft` : mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
  }

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
          {/* Location + distance */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
            <FontAwesome name="map-marker" size={9} color={colors.textTertiary} style={{ marginRight: 4 }} />
            <Text style={{ ...TextStyles.sm, color: colors.textTertiary, flex: 1 }} numberOfLines={1}>
              {distLabel ? `${distLabel} · ` : ''}{place.address || place.tagline}
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

  // Near You — separate query, strict radius, sorted by closest
  const { data: nearbyPlaces = [], isLoading: nearbyLoading } = useQuery({
    queryKey: ['mobile-places-nearby', userLocation?.lat, userLocation?.lng],
    queryFn: () => fetchNearbyPlaces(userLocation!.lat, userLocation!.lng),
    staleTime: 10 * 60 * 1000,
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

  // Infinite discovery feed — shared with web
  const {
    data: suggestData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['mobile-places-discover', userLocation?.lat],
    queryFn: ({ pageParam }) => fetchDiscoverPage(pageParam, userLocation),
    initialPageParam: 0,
    getNextPageParam: (lastPage: DiscoverPageResult) =>
      lastPage.hasMore && lastPage.nextPage != null ? lastPage.nextPage : undefined,
    staleTime: 5 * 60 * 1000,
  });

  // Flatten all loaded pages into a single deduped list
  const discoveredPlaces = useMemo(() => {
    if (!suggestData?.pages) return [];
    const all = suggestData.pages.flatMap((p) => p.items);
    return dedupPlaces(all);
  }, [suggestData]);

  // API search — infinite scroll, same as discover feed
  const {
    data: searchData,
    fetchNextPage: fetchNextSearchPage,
    hasNextPage: hasNextSearchPage,
    isFetchingNextPage: isFetchingNextSearchPage,
    isLoading: searchLoading,
  } = useInfiniteQuery({
    queryKey: ['mobile-places-search', searchCity],
    queryFn: ({ pageParam }) => searchPlaces(searchCity, pageParam, userLocation),
    initialPageParam: 0,
    getNextPageParam: (lastPage: DiscoverPageResult) =>
      lastPage.hasMore && lastPage.nextPage != null ? lastPage.nextPage : undefined,
    staleTime: 5 * 60 * 1000,
    enabled: !!searchCity,
  });

  const searchResults = useMemo(() => {
    if (!searchData?.pages) return [];
    return dedupPlaces(searchData.pages.flatMap(p => p.items));
  }, [searchData]);

  // Merge: search results when searching, discover feed otherwise
  const PLACES = useMemo(() => {
    if (searchCity) return searchResults;
    return discoveredPlaces;
  }, [discoveredPlaces, searchCity, searchResults]);

  // Active pagination state — depends on whether searching or browsing
  const activeHasNext = searchCity ? hasNextSearchPage : hasNextPage;
  const activeIsFetching = searchCity ? isFetchingNextSearchPage : isFetchingNextPage;
  const activeLoadMore = searchCity ? fetchNextSearchPage : fetchNextPage;

  // Keep loading pages automatically
  useEffect(() => {
    if (activeHasNext && !activeIsFetching) {
      const count = searchCity ? searchResults.length : discoveredPlaces.length;
      if (count < AUTO_LOAD_THRESHOLD) {
        const timer = setTimeout(() => activeLoadMore(), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [searchResults.length, discoveredPlaces.length, activeHasNext, activeIsFetching, searchCity]);

  // Infinite scroll — load more when user scrolls near bottom
  const handleScroll = useCallback((e: { nativeEvent: { layoutMeasurement: { height: number }; contentOffset: { y: number }; contentSize: { height: number } } }) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (distanceFromBottom < SCROLL_LOAD_DISTANCE && activeHasNext && !activeIsFetching) {
      activeLoadMore();
    }
  }, [activeHasNext, activeIsFetching, activeLoadMore]);


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
    else if ((sortBy === 'nearest' || sortBy === 'default') && userLocation) {
      // Default and Nearest both sort by distance when location is available
      result.sort((a, b) => {
        const dA = a.latitude != null ? distanceKm(userLocation.lat, userLocation.lng, a.latitude, a.longitude!) : NO_COORDS_DISTANCE;
        const dB = b.latitude != null ? distanceKm(userLocation.lat, userLocation.lng, b.latitude, b.longitude!) : NO_COORDS_DISTANCE;
        return dA - dB;
      });
    }
    else if (sortBy === 'az') result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [tabFiltered, activeSubcategory, searchQuery, searchCity, sortBy, userLocation]);

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

  // Combine nearby query + nearby discover feed places into one "Near You" section
  const themedSections = useMemo(() => {
    if (searchCity || activeTab !== 'all') return baseSections;
    if (!userLocation) return baseSections;

    // Merge nearby query + any discover feed places within 10 miles
    const nearIds = new Set(nearbyPlaces.map(p => p.id));
    const discoverNearby = discoveredPlaces.filter(p =>
      !nearIds.has(p.id) &&
      p.latitude != null && p.longitude != null &&
      distanceKm(userLocation.lat, userLocation.lng, p.latitude!, p.longitude!) <= NEARBY_MERGE_RADIUS_KM
    );

    const allNearby = dedupPlaces([...nearbyPlaces, ...discoverNearby])
      .sort((a, b) => {
        const dA = a.latitude != null ? distanceKm(userLocation.lat, userLocation.lng, a.latitude!, a.longitude!) : NO_COORDS_DISTANCE;
        const dB = b.latitude != null ? distanceKm(userLocation.lat, userLocation.lng, b.latitude!, b.longitude!) : NO_COORDS_DISTANCE;
        return dA - dB;
      });

    if (!allNearby.length) return baseSections;

    const nearYouSection = {
      collection: { key: 'near-you', label: 'Near You', icon: 'map-marker' },
      places: allNearby,
    };

    // Other sections: only places NOT in the nearby section
    const nearSet = new Set(allNearby.map(p => p.id));
    const otherSections = baseSections.sections
      .map(s => ({ ...s, places: s.places.filter(p => !nearSet.has(p.id)) }))
      .filter(s => s.places.length > 0);

    return { ...baseSections, sections: [nearYouSection, ...otherSections] };
  }, [baseSections, nearbyPlaces, discoveredPlaces, searchCity, activeTab, userLocation]);

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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} onScroll={handleScroll} scrollEventThrottle={16}>
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
                const keys: SortKey[] = ['default', 'nearest', 'top_rated', 'az'];
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
                  if (val.trim()) {
                    searchTimerRef.current = setTimeout(() => setSearchCity(val.trim()), 400) as unknown as NodeJS.Timeout;
                  } else {
                    setSearchCity('');
                  }
                }}
                onSubmitEditing={() => {
                  Keyboard.dismiss();
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                  if (searchQuery.trim()) setSearchCity(searchQuery.trim());
                }}
                returnKeyType="search"
                blurOnSubmit={true}
                placeholder="Search anything — Nobu, rooftop bars, big library..."
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
                <View key={section.collection.key} style={{ marginBottom: viewMode === 'flush' ? 0 : 24 }}>
                  {/* Section header — hidden in flush mode */}
                  {viewMode !== 'flush' && (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                        <Text style={{ fontFamily: FontFamily.serif, fontSize: 20, color: colors.text, letterSpacing: -0.5 }}>{section.collection.label}</Text>
                        <View style={{ backgroundColor: colors.tint + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                          <Text style={{ ...TextStyles.xs, color: colors.tint, fontFamily: FontFamily.sansBold }}>{section.places.length}</Text>
                        </View>
                      </View>
                    </View>
                  )}
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
                            userLoc={userLocation}
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

        {/* Loading indicator */}
        {activeIsFetching && (
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
