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
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  Navy, TextStyles, FontSize, FontFamily,
  haversineKm as distanceKm, fetchDiscoverPage, fetchNearbyPlaces, searchPlaces, dedupPlaces, distanceLabel,
  inferSearchHint,
  favoritesKeyFor,
  useAuthStore,
  type PlaceItem, type DiscoverPageResult,
} from '@travyl/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAddToTrip } from '@/hooks/useAddToTrip';

import { ExplorePreview } from '@/components/home/ExplorePreview';
import { OceanWave, Footer } from '@/components/home';
import PlaceDetailModal from '@/components/places/PlaceDetailModal';
import { CardStackCarousel } from '@/components/places/CardStackCarousel';
import { GridPlaceCard, getImageHeight } from '@/components/places/GridPlaceCard';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PAD = 16;
const GAP = 4;
const AUTO_LOAD_THRESHOLD = 100;
const SCROLL_LOAD_DISTANCE = 1200;
const NO_COORDS_DISTANCE = 99999;
const NEARBY_MERGE_RADIUS_KM = 16;

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
type SortKey = 'default' | 'top_rated' | 'nearest' | 'popular' | 'az';
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
  { key: 'default', label: 'Distance' },
  { key: 'top_rated', label: 'Top Rated' },
  { key: 'popular', label: 'Most Reviewed' },
  { key: 'az', label: 'A-Z' },
];

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
  // Per-user favorites — read with the user-scoped key so a sign-out →
  // sign-in switches lists rather than carrying the previous user's saves.
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => {
    setFavorites([]);
    import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
      AsyncStorage.getItem(favoritesKeyFor(userId)).then(val => {
        if (val) try { setFavorites(JSON.parse(val)); } catch {}
      });
    }).catch(() => {});
  }, [userId]);
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

  // When searching, merge API results with locally-filtered nearby places.
  // The /api/search/maps backend ignores location, so local matches surface
  // relevant nearby places (e.g. "park" hits Tilden, Marina Park, etc).
  const PLACES = useMemo(() => {
    if (!searchCity) return discoveredPlaces;
    const q = searchCity.toLowerCase();
    const localMatches = discoveredPlaces.filter((p) =>
      p.name?.toLowerCase().includes(q) ||
      p.tagline?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q))
    );
    return dedupPlaces([...localMatches, ...searchResults]);
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
      const wasFavorited = prev.includes(id);
      const next = wasFavorited ? prev.filter((f) => f !== id) : [...prev, id];
      import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
        AsyncStorage.setItem(favoritesKeyFor(userId), JSON.stringify(next)).catch(() => {});
      }).catch(() => {});
      // Surface a toast so the user gets concrete feedback that the save
      // succeeded — silent state flips made the heart feel decorative.
      setToastMessage(
        wasFavorited
          ? `Removed (${next.length} saved)`
          : `Saved to your places (${next.length} total)`,
      );
      return next;
    });
  }, [userId]);

  // Toast lifecycle — fade in on message, fade out after 1.5s.
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!toastMessage) return;
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setToastMessage(null);
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [toastMessage]);

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
    // Local text filter — narrows the merged set further while user types
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.tagline?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (sortBy === 'top_rated') result.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'popular') result.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
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

  // Split results into "Near You" (within ~10 miles) and "More results".
  // Runs for both browse and search modes — when searching, Near You shows
  // local matches, More results shows further-afield API hits.
  const themedSections = useMemo(() => {
    if (activeTab !== 'all') return baseSections;
    if (!userLocation) return baseSections;

    // Build the candidate "near you" pool. When searching, pull from the
    // already-filtered set (which contains both API and local matches).
    // When browsing, also fold in discover-feed nearby places.
    const nearIds = new Set(nearbyPlaces.map(p => p.id));
    const filteredIds = new Set(filteredPlaces.map(p => p.id));
    const isWithinRadius = (p: typeof filteredPlaces[number]) =>
      p.latitude != null && p.longitude != null &&
      distanceKm(userLocation.lat, userLocation.lng, p.latitude!, p.longitude!) <= NEARBY_MERGE_RADIUS_KM;

    const filteredNearby = filteredPlaces.filter(isWithinRadius);
    const discoverNearby = !searchCity
      ? discoveredPlaces.filter(p => !nearIds.has(p.id) && !filteredIds.has(p.id) && isWithinRadius(p))
      : [];
    const seedNearby = !searchCity ? nearbyPlaces : [];

    const allNearby = dedupPlaces([...seedNearby, ...filteredNearby, ...discoverNearby])
      .sort((a, b) => {
        const dA = a.latitude != null ? distanceKm(userLocation.lat, userLocation.lng, a.latitude!, a.longitude!) : NO_COORDS_DISTANCE;
        const dB = b.latitude != null ? distanceKm(userLocation.lat, userLocation.lng, b.latitude!, b.longitude!) : NO_COORDS_DISTANCE;
        return dA - dB;
      });

    if (!allNearby.length) return baseSections;

    const nearYouSection = {
      collection: { key: 'near-you', label: 'Near You', match: {} },
      places: allNearby,
    };

    // When searching, the rest goes under "More results" — flattened, not split by category
    if (searchCity) {
      const nearSet = new Set(allNearby.map(p => p.id));
      const remaining = filteredPlaces.filter(p => !nearSet.has(p.id));
      const sections: typeof baseSections.sections = [nearYouSection];
      if (remaining.length > 0) {
        sections.push({ collection: { key: 'more-results', label: 'More results', match: {} }, places: remaining });
      }
      return { ...baseSections, sections };
    }

    // Browse mode: keep category sections, just hoist nearby out
    const nearSet = new Set(allNearby.map(p => p.id));
    const otherSections = baseSections.sections
      .map(s => ({ ...s, places: s.places.filter(p => !nearSet.has(p.id)) }))
      .filter(s => s.places.length > 0);

    return { ...baseSections, sections: [nearYouSection, ...otherSections] };
  }, [baseSections, filteredPlaces, nearbyPlaces, discoveredPlaces, searchCity, activeTab, userLocation]);

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

      {/* Favorite-toggle toast — floats above content, doesn't block taps */}
      {toastMessage && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: insets.top + 12,
            left: PAD,
            right: PAD,
            zIndex: 1000,
            opacity: toastOpacity,
            backgroundColor: 'rgba(15,23,42,0.92)',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <FontAwesome name="heart" size={14} color="#ef4444" />
          <Text style={{ ...TextStyles.bodyEm, color: '#fff', flex: 1 }} numberOfLines={1}>
            {toastMessage}
          </Text>
        </Animated.View>
      )}

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

          {/* Sort chips — visible options */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingRight: 4 }}
          >
            {SORT_OPTIONS.map((opt) => {
              const active = sortBy === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setSortBy(opt.key)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 12, height: 30, borderRadius: 15,
                    backgroundColor: active ? colors.tint : colors.cardBackground,
                    borderWidth: 1,
                    borderColor: active ? colors.tint : colors.border,
                  }}
                >
                  <Text style={{
                    ...TextStyles.caption,
                    color: active ? '#fff' : colors.textSecondary,
                    fontWeight: active ? '600' : '400',
                  }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Near You — rendered as a section in the same grid style */}
        {nearbyLoading && !searchCity && activeTab === 'all' && (
          <View style={{ paddingHorizontal: PAD, paddingVertical: 20, alignItems: 'center' }}>
            <Text style={{ ...TextStyles.caption, color: colors.textTertiary }}>Finding places near you...</Text>
          </View>
        )}

        {/* Searching feedback — show inferred intent so the user sees what
            we understood (e.g. "Searching nightlife near San Francisco…")
            instead of a bare spinner. */}
        {searchCity && searchLoading && (
          <View style={{ paddingHorizontal: PAD, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator size="small" color={colors.tint} />
            <Text style={{ ...TextStyles.body, color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
              {inferSearchHint(searchCity, null)}
            </Text>
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
