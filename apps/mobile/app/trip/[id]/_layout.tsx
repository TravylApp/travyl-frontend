import { useState, useRef, useCallback, useEffect, createContext, useContext, useMemo } from 'react';
import {
  View, Text, Pressable, Share, Modal,
  Platform, PanResponder, Animated, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { withLayoutContext, useLocalSearchParams, useRouter } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useItineraryScreen, formatDateRange, resolveTheme, TextStyles, FontFamily } from '@travyl/shared';
import type { Trip, TripTheme } from '@travyl/shared';
import { ThemePicker } from '../../../components/trip/ThemePicker';
import { useThemeColors } from '@/hooks/useThemeColors';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';

const { Navigator } = createMaterialTopTabNavigator();
const TopTabs = withLayoutContext(Navigator);

// ─── Config (matches web trip-tabs.tsx) ──────────────────
const SIDEBAR_W = 52;
const DRAG_THRESHOLD = 10;
const BOTTOM_BAR_OFFSET = 34; // lift above iOS home indicator

const ALL_TABS = [
  { name: 'index',       title: 'Overview',    icon: 'home'        },
  { name: 'itinerary',   title: 'Itinerary',   icon: 'calendar'    },
  { name: 'hotels',      title: 'Hotels',      icon: 'building-o'  },
  { name: 'flights',     title: 'Flights',     icon: 'plane'       },
  { name: 'restaurants', title: 'Restaurants',  icon: 'cutlery'     },
  { name: 'activities',  title: 'Explore',     icon: 'compass'     },
  { name: 'packing',     title: 'Packing',     icon: 'suitcase'    },
  { name: 'budget',      title: 'Budget',      icon: 'pie-chart'   },
  { name: 'cars',        title: 'Car Rental',  icon: 'car'         },
  { name: 'favorites',   title: 'Favorites',   icon: 'heart'       },
  { name: 'settings',    title: 'Settings',    icon: 'cog'         },
] as const;

const PERMANENT_TAB_NAMES = new Set(['index', 'itinerary']);
const ADDABLE_TABS = ALL_TABS.filter(t => !PERMANENT_TAB_NAMES.has(t.name));
const DEFAULT_ENABLED_TABS = ['index', 'itinerary'];

// ─── Types ──────────────────────────────────────────────
type SpinePosition = 'top' | 'bottom' | 'left' | 'right';

// ─── Context ─────────────────────────────────────────────
const TabCtx = createContext<{
  spinePosition: SpinePosition;
  setSpinePosition: (p: SpinePosition) => void;
  scrubbing: boolean;
  setScrubbing: (s: boolean) => void;
  navDirection: 1 | -1;
  theme: TripTheme;
  setTripTheme: (themeId: string, customColor?: string) => void;
  tabColorOverrides: Record<string, string>;
  setTabColor: (tabName: string, color: string) => void;
  resetTabColors: () => void;
  itineraryColorOverrides: Record<string, string>;
  setItineraryColor: (section: string, color: string) => void;
  resetItineraryColors: () => void;
  calendarOpen: boolean;
  setCalendarOpen: (open: boolean) => void;
  mapOpen: boolean;
  setMapOpen: (open: boolean) => void;
  enabledTabs: string[];
  addTab: (name: string) => void;
  removeTab: (name: string) => void;
  showTabPicker: boolean;
  setShowTabPicker: (show: boolean) => void;
  essentialsOpen: boolean;
  setEssentialsOpen: (open: boolean) => void;
  heroImageOverride: string | null;
  setHeroImageOverride: (url: string | null) => void;
}>({
  spinePosition: 'top',
  setSpinePosition: () => {},
  scrubbing: false,
  setScrubbing: () => {},
  navDirection: 1,
  theme: resolveTheme(),
  setTripTheme: () => {},
  tabColorOverrides: {},
  setTabColor: () => {},
  resetTabColors: () => {},
  itineraryColorOverrides: {},
  setItineraryColor: () => {},
  resetItineraryColors: () => {},
  calendarOpen: false,
  setCalendarOpen: () => {},
  mapOpen: false,
  setMapOpen: () => {},
  enabledTabs: DEFAULT_ENABLED_TABS,
  addTab: () => {},
  removeTab: () => {},
  showTabPicker: false,
  setShowTabPicker: () => {},
  essentialsOpen: true,
  setEssentialsOpen: () => {},
  heroImageOverride: null,
  setHeroImageOverride: () => {},
});

export { TabCtx };

/** Hook to get the resolved accent color for a given tab/screen name.
 *  Priority: user override → theme tab color → theme base. */
export function useTabAccent(tabName: string): string {
  const { theme, tabColorOverrides } = useContext(TabCtx);
  return tabColorOverrides[tabName] ?? theme.tabColors[tabName] ?? theme.base;
}

/** Hook to get the base theme color. */
export function useThemeBase() {
  const { theme } = useContext(TabCtx);
  return theme;
}

// ─── Page Transition Wrapper ─────────────────────────────
// Horizontal slide for top/bottom spine, vertical wheel rotation for left/right.
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}

// ─── Drag Handle — drag or tap to reposition spine ──────
function DragHandle({ direction }: { direction: 'horizontal' | 'vertical' }) {
  const colors = useThemeColors();
  const { spinePosition, setSpinePosition, theme, setTripTheme } = useContext(TabCtx);
  const didDrag = useRef(false);
  const lastPos = useRef<SpinePosition | null>(null);
  const previewOpacity = useRef(new Animated.Value(0)).current;
  const previewPos = useRef<SpinePosition>('top');
  const [preview, setPreview] = useState<SpinePosition | null>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cycle = () => {
    const order: SpinePosition[] = ['top', 'right', 'bottom', 'left'];
    const idx = order.indexOf(spinePosition);
    setSpinePosition(order[(idx + 1) % order.length]);
  };

  const showPreview = (pos: SpinePosition) => {
    if (previewPos.current !== pos) {
      previewPos.current = pos;
      setPreview(pos);
      Animated.timing(previewOpacity, { toValue: 1, duration: 120, useNativeDriver: true }).start();
    }
  };

  const hidePreview = () => {
    Animated.timing(previewOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setPreview(null);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        didDrag.current = false;
        lastPos.current = null;
        longPressTimer.current = setTimeout(() => {
          if (!didDrag.current) {
            setShowThemePicker(true);
          }
        }, 500);
      },
      onPanResponderMove: (_, { dx, dy }) => {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        if (absDx < DRAG_THRESHOLD && absDy < DRAG_THRESHOLD) return;
        didDrag.current = true;
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        let newPos: SpinePosition;
        if (absDy > absDx) {
          newPos = dy < 0 ? 'top' : 'bottom';
        } else {
          newPos = dx < 0 ? 'left' : 'right';
        }
        if (newPos !== lastPos.current) {
          lastPos.current = newPos;
          showPreview(newPos);
          setSpinePosition(newPos);
        }
      },
      onPanResponderRelease: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        hidePreview();
        if (!didDrag.current) cycle();
      },
    })
  ).current;

  const isHoriz = direction === 'horizontal';

  return (
    <>
      <View
        {...panResponder.panHandlers}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{
          width: 18,
          height: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 4,
        }}
      >
        <FontAwesome
          name={isHoriz ? 'ellipsis-v' : 'ellipsis-h'}
          size={10}
          color="rgba(255,255,255,0.5)"
        />
      </View>

      {/* Drop zone preview */}
      {preview && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            zIndex: 100,
            opacity: previewOpacity,
            backgroundColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.25)',
            borderStyle: 'dashed',
            borderRadius: 8,
            ...(preview === 'top'
              ? { top: -44, left: -8, right: -8, height: 40 }
              : preview === 'bottom'
                ? { bottom: -44, left: -8, right: -8, height: 40 }
                : preview === 'left'
                  ? { top: -8, left: -8, bottom: -8, width: SIDEBAR_W }
                  : { top: -8, right: -8, bottom: -8, width: SIDEBAR_W }
            ),
          }}
        />
      )}

      {/* Long-press theme picker */}
      {showThemePicker && (
        <>
          {/* Backdrop */}
          <Pressable
            onPress={() => setShowThemePicker(false)}
            style={{
              position: 'absolute',
              top: -500,
              left: -500,
              right: -500,
              bottom: -500,
              zIndex: 99,
            }}
          />
          {/* Picker */}
          <View
            style={{
              position: 'absolute',
              top: 24,
              left: -10,
              zIndex: 100,
              backgroundColor: colors.cardBackground,
              borderRadius: 12,
              padding: 12,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
              width: 320,
            }}
          >
            <Text style={{ ...TextStyles.bodyEm, color: colors.text, marginBottom: 8 }}>
              Trip Theme
            </Text>
            <ThemePicker
              currentTheme={theme.id}
              customColor={theme.id === 'custom' ? theme.base : null}
              onSelect={(themeId, customColor) => {
                setTripTheme(themeId, customColor);
                setShowThemePicker(false);
              }}
              compact
            />
          </View>
        </>
      )}
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────

function getVisibleRoutes(state: MaterialTopTabBarProps['state'], enabledTabs: string[]) {
  return state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => enabledTabs.includes(route.name));
}

// ─── Trip Hero ───────────────────────────────────────────
function TripHero({ trip, refetch }: { trip: Trip | null; refetch: () => void }) {
  const { theme, essentialsOpen, setEssentialsOpen, heroImageOverride } = useContext(TabCtx);
  const router = useRouter();
  const coverImage = heroImageOverride || trip?.trip_context?.hero_image_url;
  const destination = trip?.destination || 'Destination';
  const cityName = destination.split(',')[0].trim();
  const countryName = destination.split(',').slice(1).join(',').trim();
  const weather = trip?.trip_context?.weather?.current;
  const forecast = trip?.trip_context?.weather?.forecast ?? [];
  const qf = trip?.trip_context?.quick_facts;

  return (
    <View style={{ position: 'relative' }}>
      {/* Background image — crossfades when override changes */}
      <View style={{ height: essentialsOpen ? 340 : 200 }}>
        {coverImage ? (
          <Image source={{ uri: coverImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={600} cachePolicy="memory-disk" />
        ) : (
          <View style={{ flex: 1, backgroundColor: theme.base, alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesome name="picture-o" size={32} color="rgba(255,255,255,0.3)" />
          </View>
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
          locations={[0, 0.4, 1]}
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
          pointerEvents="none"
        />
      </View>

      {/* Back button */}
      <Pressable
        onPress={() => router.back()}
        style={{
          position: 'absolute', top: 50, left: 14, zIndex: 10,
          width: 34, height: 34, borderRadius: 17,
          backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <FontAwesome name="chevron-left" size={14} color="#fff" />
      </Pressable>

      {/* Share button */}
      <Pressable
        onPress={async () => {
          if (!trip) return;
          try { await Share.share({ message: `Check out my trip to ${trip.destination}!`, title: trip.title ?? `Trip to ${trip.destination}` }); } catch {}
        }}
        style={{
          position: 'absolute', top: 50, right: 14, zIndex: 10,
          width: 34, height: 34, borderRadius: 17,
          backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <FontAwesome name="share" size={13} color="#fff" />
      </Pressable>

      {/* Hero text overlay */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 }}>
        {/* Country + City + Toggle */}
        <Text style={{ ...TextStyles.xs, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase', color: '#c8a96a', marginBottom: 4 }}>
          {countryName || 'Your Trip Guide'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Text style={{
            ...TextStyles.display, color: '#fff',
            textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12,
          }}>
            {cityName.toUpperCase()}
          </Text>
          <Pressable
            onPress={() => setEssentialsOpen(!essentialsOpen)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <Text style={{ ...TextStyles.smEm, color: '#fff' }}>
              {essentialsOpen ? 'Hide Info' : 'Trip Info'}
            </Text>
            <FontAwesome name={essentialsOpen ? 'chevron-up' : 'chevron-down'} size={8} color="rgba(255,255,255,0.6)" />
          </Pressable>
        </View>

        {/* Collapsible essentials */}
        {essentialsOpen && trip && (
          <View>
            {/* Date + travelers */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={{ ...TextStyles.bodyLg, fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>
                {formatDateRange(trip.start_date, trip.end_date)}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.2)' }}>·</Text>
              <Text style={{ ...TextStyles.bodyLg, fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>
                {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}
              </Text>
            </View>

            {/* Quick facts */}
            {qf && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
                {[qf.currency, qf.language, qf.timezone, qf.power].filter(Boolean).map((f, i) => {
                  const [label, ...rest] = (f as string).split(' · ');
                  return (
                    <Text key={i} style={{ ...TextStyles.caption, color: 'rgba(255,255,255,0.7)' }}>
                      <Text style={{ fontWeight: '700', color: '#fff' }}>{label}</Text>
                      {rest.length > 0 ? ` · ${rest.join(' · ')}` : ''}
                    </Text>
                  );
                })}
              </View>
            )}

            {/* Weather + forecast */}
            {weather && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <FontAwesome name="cloud" size={12} color="#c8a96a" />
                  <Text style={{ ...TextStyles.bodyEm, fontWeight: '700', color: '#c8a96a' }}>{weather.high}° / {weather.low}°</Text>
                  <Text style={{ ...TextStyles.xs, color: 'rgba(255,255,255,0.5)' }}>Now</Text>
                </View>
                {forecast.length > 0 && <Text style={{ color: 'rgba(255,255,255,0.2)' }}>|</Text>}
                {forecast.slice(0, 4).map((d) => (
                  <View key={d.day} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={{ ...TextStyles.smEm, color: 'rgba(255,255,255,0.6)' }}>{d.day}</Text>
                    <Text style={{ ...TextStyles.body }}>{d.icon}</Text>
                    <Text style={{ ...TextStyles.captionEm, fontWeight: '700', color: '#fff' }}>{d.high}°</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Swipeable tab helper — scrub finger across tabs ─────
// Tracks each tab's actual layout position so scrubbing maps 1:1 to the tab under the finger.
function useTabScrub(
  visibleRoutes: ReturnType<typeof getVisibleRoutes>,
  state: MaterialTopTabBarProps['state'],
  navigation: MaterialTopTabBarProps['navigation'],
  axis: 'x' | 'y',
) {
  const { setScrubbing } = useContext(TabCtx);
  const containerRef = useRef<View>(null);
  const lastScrubIdx = useRef<number>(-1);
  const scrubTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stores { start, end } for each tab index, measured via registerTabLayout
  const tabRegions = useRef<{ start: number; end: number }[]>([]);
  // Keep refs to avoid stale closures in PanResponder
  const routesRef = useRef(visibleRoutes);
  const stateRef = useRef(state);
  routesRef.current = visibleRoutes;
  stateRef.current = state;

  const registerTabLayout = useCallback((tabIdx: number, e: any) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    const start = axis === 'x' ? x : y;
    const size = axis === 'x' ? width : height;
    tabRegions.current[tabIdx] = { start, end: start + size };
  }, [axis]);

  const scrub = useCallback((locX: number, locY: number) => {
    const routes = routesRef.current;
    const regions = tabRegions.current;
    if (routes.length === 0) return;
    const pos = axis === 'x' ? locX : locY;
    // Find which tab region the finger is over
    let hitIdx = -1;
    for (let i = 0; i < routes.length; i++) {
      const r = regions[i];
      if (r && pos >= r.start && pos < r.end) {
        hitIdx = i;
        break;
      }
    }
    if (hitIdx < 0) return;
    if (hitIdx === lastScrubIdx.current) return;
    lastScrubIdx.current = hitIdx;
    const { route, index } = routes[hitIdx];
    if (stateRef.current.index !== index) {
      navigation.navigate(route.name);
    }
  }, [axis, navigation]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(axis === 'x' ? dx : dy) > 2,
      onPanResponderGrant: (e) => {
        if (scrubTimer.current) clearTimeout(scrubTimer.current);
        lastScrubIdx.current = -1;
        setScrubbing(true);
        scrub(e.nativeEvent.locationX, e.nativeEvent.locationY);
      },
      onPanResponderMove: (e) => {
        scrub(e.nativeEvent.locationX, e.nativeEvent.locationY);
      },
      onPanResponderRelease: () => {
        lastScrubIdx.current = -1;
        scrubTimer.current = setTimeout(() => setScrubbing(false), 250);
      },
    })
  ).current;

  return { containerRef, panResponder, registerTabLayout };
}

// ─── Book-style Tab Sidebar (left / right) ───────────────
const TAB_NOTCH_W = 38;
const SIDE_TAB_W = 30;


function BookTabSidebar({ state, navigation }: MaterialTopTabBarProps) {
  const { spinePosition, theme, tabColorOverrides, enabledTabs, setShowTabPicker } = useContext(TabCtx);
  const visibleRoutes = getVisibleRoutes(state, enabledTabs);
  const side = spinePosition as 'left' | 'right';
  const isLeft = side === 'left';
  const { containerRef, panResponder, registerTabLayout } = useTabScrub(visibleRoutes, state, navigation, 'y');
  const { height: screenH } = useWindowDimensions();

  // Round the outer corners (screen-edge side)
  const outerRadii = {
    borderTopLeftRadius: isLeft ? 6 : 0,
    borderBottomLeftRadius: isLeft ? 6 : 0,
    borderTopRightRadius: isLeft ? 0 : 6,
    borderBottomRightRadius: isLeft ? 0 : 6,
  };

  const HANDLE_H = 28;
  const MANAGE_H = 28;
  const GAP = 2;
  const tabCount = visibleRoutes.length;

  return (
    <View
      ref={containerRef}
      {...panResponder.panHandlers}
      style={{
        position: 'absolute',
        top: 0,
        bottom: BOTTOM_BAR_OFFSET,
        [side]: 0,
        zIndex: 10,
        width: SIDE_TAB_W,
      }}
    >
      {/* Drag handle */}
      <View style={{
        height: HANDLE_H,
        width: SIDE_TAB_W,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.base + '40',
        ...outerRadii,
      }}>
        <DragHandle direction="vertical" />
      </View>

      {visibleRoutes.map(({ route, index: _index }, i) => {
        const isFocused = state.index === _index;
        const tab = ALL_TABS.find((t) => t.name === route.name);
        const color = tabColorOverrides[route.name] ?? theme.tabColors[route.name] ?? theme.base;

        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            onLayout={(e) => registerTabLayout(i, e)}
            style={{
              flex: 1,
              width: SIDE_TAB_W,
              marginTop: GAP,
              backgroundColor: isFocused ? color : color + '99',
              alignItems: 'center',
              justifyContent: 'center',
              ...outerRadii,
            }}
          >
            <FontAwesome
              name={(tab?.icon ?? 'circle') as any}
              size={tabCount > 6 ? 12 : 14}
              color={isFocused ? '#fff' : 'rgba(255,255,255,0.6)'}
            />
          </Pressable>
        );
      })}

      {/* Manage tabs button */}
      <Pressable
        onPress={() => setShowTabPicker(true)}
        style={{
          height: MANAGE_H,
          width: SIDE_TAB_W,
          marginTop: GAP,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.base + '40',
          ...outerRadii,
        }}
      >
        <FontAwesome name={enabledTabs.length < ALL_TABS.length ? 'plus' : 'ellipsis-v'} size={11} color="rgba(255,255,255,0.5)" />
      </Pressable>
    </View>
  );
}

// ─── Bottom Book Tab Bar ──────────────────────────────────
function BottomTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const { theme, tabColorOverrides, enabledTabs, setShowTabPicker } = useContext(TabCtx);
  const visibleRoutes = getVisibleRoutes(state, enabledTabs);
  const { containerRef, panResponder, registerTabLayout } = useTabScrub(visibleRoutes, state, navigation, 'x');

  return (
    <View
      ref={containerRef}
      {...panResponder.panHandlers}
      style={{
        position: 'absolute',
        bottom: BOTTOM_BAR_OFFSET,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'flex-end',
      }}
    >
      {/* Drag handle */}
      <View style={{
        height: TAB_NOTCH_W,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.base + '80',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        marginHorizontal: 1,
        paddingHorizontal: 4,
      }}>
        <DragHandle direction="horizontal" />
      </View>

      {visibleRoutes.map(({ route, index }, i) => {
        const isFocused = state.index === index;
        const tab = ALL_TABS.find((t) => t.name === route.name);
        const color = tabColorOverrides[route.name] ?? theme.tabColors[route.name] ?? theme.base;

        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            onLayout={(e) => registerTabLayout(i, e)}
            style={{
              flex: 1,
              height: TAB_NOTCH_W,
              backgroundColor: isFocused ? color : color + 'B3',
              alignItems: 'center',
              justifyContent: 'center',
              marginHorizontal: 1,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            }}
          >
            <FontAwesome
              name={(tab?.icon ?? 'circle') as any}
              size={16}
              color={isFocused ? '#fff' : 'rgba(255,255,255,0.6)'}
            />
          </Pressable>
        );
      })}

      {/* Manage tabs button */}
      <Pressable
        onPress={() => setShowTabPicker(true)}
        style={{
          height: TAB_NOTCH_W,
          paddingHorizontal: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.base + '40',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          marginHorizontal: 1,
        }}
      >
        <FontAwesome name={enabledTabs.length < ALL_TABS.length ? 'plus' : 'ellipsis-h'} size={14} color="rgba(255,255,255,0.6)" />
      </Pressable>
    </View>
  );
}

// ─── Tab navigation ref (allows TripHero to switch tabs) ─
const tabNavRef = { current: null as MaterialTopTabBarProps['navigation'] | null };

// ─── Custom Tab Bar (delegates to horizontal or vertical) ─
// Also tracks navigation direction for PageTransition animations.
const navDirectionRef = { current: 1 as 1 | -1 };
const prevTabIndexRef = { current: 0 };
const activeTabNameRef = { current: 'index' };
let setActiveTabFn: (name: string) => void = () => {};

function CustomTabBar(props: MaterialTopTabBarProps) {
  const { spinePosition } = useContext(TabCtx);
  tabNavRef.current = props.navigation;

  // Track direction and active tab name
  const idx = props.state.index;
  if (idx !== prevTabIndexRef.current) {
    navDirectionRef.current = idx > prevTabIndexRef.current ? 1 : -1;
    prevTabIndexRef.current = idx;
  }
  const tabName = props.state.routes[idx]?.name ?? 'index';
  activeTabNameRef.current = tabName;

  // Sync active tab into layout state (for conditional TripHero rendering)
  useEffect(() => {
    setActiveTabFn(tabName);
  }, [tabName]);

  // "top" is unreachable on mobile — treat it as bottom
  if (spinePosition === 'top' || spinePosition === 'bottom') {
    return <BottomTabBar {...props} />;
  }

  return <BookTabSidebar {...props} />;
}

// ─── Tab Picker Modal ────────────────────────────────────
function TabPickerModal() {
  const { enabledTabs, addTab, removeTab, showTabPicker, setShowTabPicker, theme } = useContext(TabCtx);
  const colors = useThemeColors();

  return (
    <Modal transparent animationType="slide" visible={showTabPicker} onRequestClose={() => setShowTabPicker(false)}>
      <Pressable
        onPress={() => setShowTabPicker(false)}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
      >
        <Pressable onPress={() => {}} style={{
          backgroundColor: colors.cardBackground,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 20,
          paddingBottom: 40,
        }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 }} />
          <Text style={{ ...TextStyles.title, fontFamily: FontFamily.sansBold, color: colors.text, marginBottom: 4 }}>
            Manage Tabs
          </Text>
          <Text style={{ ...TextStyles.body, color: colors.textSecondary, marginBottom: 16 }}>
            Add or remove tabs from your trip
          </Text>
          {ADDABLE_TABS.map((tab) => {
            const isEnabled = enabledTabs.includes(tab.name);
            return (
              <Pressable
                key={tab.name}
                onPress={() => isEnabled ? removeTab(tab.name) : addTab(tab.name)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border + '30',
                }}
              >
                <View style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: isEnabled ? theme.base + '15' : colors.border + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FontAwesome
                    name={tab.icon as any}
                    size={15}
                    color={isEnabled ? theme.base : colors.textTertiary}
                  />
                </View>
                <Text style={{
                  ...TextStyles.subhead,
                  flex: 1,
                  fontWeight: '500',
                  color: colors.text,
                }}>
                  {tab.title}
                </Text>
                <FontAwesome
                  name={isEnabled ? 'check-circle' : 'plus-circle'}
                  size={22}
                  color={isEnabled ? theme.base : colors.textTertiary}
                />
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main Layout ─────────────────────────────────────────
export default function TripLayout() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip, refetch } = useItineraryScreen(id);
  const [spinePosition, setSpinePosition] = useState<SpinePosition>('left');
  const [scrubbing, setScrubbing] = useState(false);
  const [activeTab, setActiveTab] = useState('index');
  setActiveTabFn = setActiveTab;

  const [enabledTabs, setEnabledTabs] = useState<string[]>(DEFAULT_ENABLED_TABS);
  const [showTabPicker, setShowTabPicker] = useState(false);

  const addTab = useCallback((name: string) => {
    setEnabledTabs(prev => {
      if (prev.includes(name)) return prev;
      const order = ALL_TABS.map(t => t.name) as string[];
      return [...prev, name].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    });
  }, []);

  const removeTab = useCallback((name: string) => {
    if (PERMANENT_TAB_NAMES.has(name)) return;
    setEnabledTabs(prev => prev.filter(n => n !== name));
  }, []);

  const [tripThemeId, setTripThemeId] = useState('navy');
  const [tripCustomColor, setTripCustomColor] = useState<string | null>(null);
  const theme = resolveTheme(tripThemeId, tripCustomColor ?? undefined);

  const setTripTheme = useCallback((themeId: string, customColor?: string) => {
    setTripThemeId(themeId);
    setTripCustomColor(customColor ?? null);
  }, []);

  const [tabColorOverrides, setTabColorOverrides] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const hasPersistedState = useRef(false);

  const setTabColor = useCallback((tabName: string, color: string) => {
    setTabColorOverrides(prev => ({ ...prev, [tabName]: color }));
  }, []);

  const resetTabColors = useCallback(() => {
    setTabColorOverrides({});
  }, []);

  const [itineraryColorOverrides, setItineraryColorOverrides] = useState<Record<string, string>>({});

  const setItineraryColor = useCallback((section: string, color: string) => {
    setItineraryColorOverrides(prev => ({ ...prev, [section]: color }));
  }, []);

  const resetItineraryColors = useCallback(() => {
    setItineraryColorOverrides({});
  }, []);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [essentialsOpen, setEssentialsOpen] = useState(true);
  const [heroImageOverride, setHeroImageOverride] = useState<string | null>(null);

  // Load persisted theme state from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(`trip-theme-${id}`);
        if (raw) {
          const saved = JSON.parse(raw);
          hasPersistedState.current = true;
          if (saved.themeId) setTripThemeId(saved.themeId);
          if (saved.customColor !== undefined) setTripCustomColor(saved.customColor);
          if (saved.tabColorOverrides) setTabColorOverrides(saved.tabColorOverrides);
          if (saved.itineraryColorOverrides) setItineraryColorOverrides(saved.itineraryColorOverrides);
          if (saved.enabledTabs) setEnabledTabs(saved.enabledTabs);
          if (saved.essentialsOpen !== undefined) setEssentialsOpen(saved.essentialsOpen);
        }
      } catch {}
      setHydrated(true);
    })();
  }, [id]);

  // Persist theme state when it changes (after initial hydration)
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(`trip-theme-${id}`, JSON.stringify({
      themeId: tripThemeId,
      customColor: tripCustomColor,
      tabColorOverrides,
      itineraryColorOverrides,
      enabledTabs,
      essentialsOpen,
    })).catch(() => {});
  }, [hydrated, id, tripThemeId, tripCustomColor, tabColorOverrides, itineraryColorOverrides, enabledTabs, essentialsOpen]);

  // Only use trip data as initial default when there's NO persisted state
  useEffect(() => {
    if (hasPersistedState.current) return;
    if (trip?.theme) setTripThemeId(trip.theme);
    if (trip?.custom_theme_color !== undefined) setTripCustomColor(trip.custom_theme_color);
  }, [trip?.theme, trip?.custom_theme_color]);

  return (
    <TabCtx.Provider
      value={{ spinePosition, setSpinePosition, scrubbing, setScrubbing, navDirection: navDirectionRef.current, theme, setTripTheme, tabColorOverrides, setTabColor, resetTabColors, itineraryColorOverrides, setItineraryColor, resetItineraryColors, calendarOpen, setCalendarOpen, mapOpen, setMapOpen, enabledTabs, addTab, removeTab, showTabPicker, setShowTabPicker, essentialsOpen, setEssentialsOpen, heroImageOverride, setHeroImageOverride }}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <TripHero trip={trip} refetch={refetch} />

        <View style={{ flex: 1, position: 'relative' }}>
          <TopTabs
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
              lazy: true,
              lazyPlaceholder: () => (
                <View style={{ flex: 1, backgroundColor: colors.cardBackground }} />
              ),
              swipeEnabled: true,
              animationEnabled: true,
              sceneStyle: {
                paddingLeft: spinePosition === 'left' ? SIDE_TAB_W : 0,
                paddingRight: spinePosition === 'right' ? SIDE_TAB_W : 0,
                paddingBottom: (spinePosition === 'bottom' || spinePosition === 'top') ? TAB_NOTCH_W + BOTTOM_BAR_OFFSET : 0,
                backgroundColor: colors.cardBackground,
              },
            }}
          >
            <TopTabs.Screen name="index" options={{ title: 'Overview' }} />
            <TopTabs.Screen name="itinerary" options={{ title: 'Itinerary' }} />
            <TopTabs.Screen name="hotels" options={{ title: 'Hotels' }} />
            <TopTabs.Screen name="flights" options={{ title: 'Flights' }} />
            <TopTabs.Screen name="restaurants" options={{ title: 'Restaurants' }} />
            <TopTabs.Screen name="activities" options={{ title: 'Explore' }} />
            <TopTabs.Screen name="packing" options={{ title: 'Packing' }} />
            <TopTabs.Screen name="budget" options={{ title: 'Budget' }} />
            <TopTabs.Screen name="cars" options={{ title: 'Car Rental' }} />
            <TopTabs.Screen name="favorites" options={{ title: 'Favorites' }} />
            <TopTabs.Screen name="settings" options={{ title: 'Settings' }} />
          </TopTabs>
        </View>
      </View>
      <TabPickerModal />
    </TabCtx.Provider>
  );
}
