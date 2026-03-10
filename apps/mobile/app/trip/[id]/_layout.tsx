import { useState, useRef, useCallback, useEffect, createContext, useContext, useMemo } from 'react';
import {
  View, Text, Pressable, Share, Modal,
  Platform, PanResponder, Animated, Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { withLayoutContext, useLocalSearchParams, useRouter } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useItineraryScreen, formatDateRange, resolveTheme, MOCK_DESTINATION_COORDS } from '@travyl/shared';
import { MapPreview } from '@/components/itinerary/MapPreview';
import type { Trip, TripTheme } from '@travyl/shared';
import { ThemePicker } from '../../../components/trip/ThemePicker';
import { useThemeColors } from '@/hooks/useThemeColors';

const { Navigator } = createMaterialTopTabNavigator();
const TopTabs = withLayoutContext(Navigator);

// ─── Config (matches web trip-tabs.tsx) ──────────────────
const SIDEBAR_W = 52;
const DRAG_THRESHOLD = 10;
const BOTTOM_BAR_OFFSET = 34; // lift above iOS home indicator

const CORE_TABS = [
  { name: 'index',       title: 'Overview',    icon: 'home'        },
  { name: 'itinerary',   title: 'Itinerary',   icon: 'calendar'    },
  { name: 'hotels',      title: 'Hotels',      icon: 'building-o'  },
  { name: 'flights',     title: 'Flights',     icon: 'plane'       },
  { name: 'restaurants', title: 'Restaurants',  icon: 'cutlery'     },
  { name: 'activities',  title: 'Explore',     icon: 'compass'     },
] as const;

const OPTIONAL_TABS = [
  { name: 'packing',     title: 'Packing',     icon: 'suitcase'    },
  { name: 'budget',      title: 'Budget',      icon: 'pie-chart'   },
  { name: 'cars',        title: 'Car Rental',  icon: 'car'         },
  { name: 'favorites',   title: 'Favorites',   icon: 'heart'       },
  { name: 'settings',    title: 'Settings',    icon: 'cog'         },
] as const;

const ALL_TABS = [...CORE_TABS, ...OPTIONAL_TABS];

// ─── Types ──────────────────────────────────────────────
type SpinePosition = 'top' | 'bottom' | 'left' | 'right';

// ─── Context ─────────────────────────────────────────────
const TabCtx = createContext<{
  spinePosition: SpinePosition;
  setSpinePosition: (p: SpinePosition) => void;
  scrubbing: boolean;
  setScrubbing: (s: boolean) => void;
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
}>({
  spinePosition: 'top',
  setSpinePosition: () => {},
  scrubbing: false,
  setScrubbing: () => {},
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
// Wrap each tab screen's content in this for a polished entrance animation.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const isFocused = useIsFocused();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isFocused) {
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }).start();
    }
  }, [isFocused]);

  const opacity = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.6, 1],
  });
  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });
  const rotateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-12deg', '0deg'],
  });

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity,
        transform: [
          { perspective: 800 },
          { rotateY },
          { scale },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
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
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
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
function SkeletonBlock({ width, height, radius = 6, style }: { width: number | string; height: number; radius?: number; style?: any }) {
  const colors = useThemeColors();
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeleton }, style]} />;
}

function getVisibleRoutes(state: MaterialTopTabBarProps['state']) {
  const allNames = ALL_TABS.map((t) => t.name);
  return state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => allNames.includes(route.name as typeof allNames[number]));
}

// ─── Trip Hero ───────────────────────────────────────────
function TripHero({ trip, refetch }: { trip: Trip | null; refetch: () => void }) {
  const { theme, calendarOpen, setCalendarOpen, mapOpen, setMapOpen } = useContext(TabCtx);
  const router = useRouter();
  const handleMap = () => {
    setMapOpen(!mapOpen);
  };

  const handleShare = async () => {
    if (!trip) return;
    try {
      await Share.share({
        message: `Check out my trip to ${trip.destination}! ${trip.start_date} – ${trip.end_date}`,
        title: trip.title ?? `Trip to ${trip.destination}`,
      });
    } catch (_) {}
  };

  const handleCalendar = () => {
    if (!trip?.id) return;
    setCalendarOpen(!calendarOpen);
    router.push(`/trip/${trip.id}/itinerary`);
  };

  const btns = [
    { icon: 'calendar', onPress: handleCalendar },
    { icon: 'map', onPress: handleMap },
    { icon: 'refresh', onPress: refetch },
    { icon: 'share', onPress: handleShare },
  ];

  return (
    <View style={{ height: 180, backgroundColor: '#cbd5e1', position: 'relative' }}>
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <FontAwesome name="picture-o" size={32} color="#94a3b8" />
      </View>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)']}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, justifyContent: 'flex-end', padding: 14 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <FontAwesome name="map-marker" size={14} color="rgba(255,255,255,0.6)" />
          {trip ? (
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{trip.destination}</Text>
          ) : (
            <SkeletonBlock width="55%" height={20} style={{ backgroundColor: 'rgba(255,255,255,0.25)' }} />
          )}
        </View>
        {trip ? (
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
            {formatDateRange(trip.start_date, trip.end_date)} · {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}
          </Text>
        ) : (
          <SkeletonBlock width="45%" height={12} style={{ backgroundColor: 'rgba(255,255,255,0.18)' }} />
        )}
      </LinearGradient>
      <View style={{ position: 'absolute', bottom: 14, right: 10, flexDirection: 'row', gap: 6 }}>
        {btns.map((b) => (
          <Pressable
            key={b.icon}
            onPress={b.onPress}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
              borderRadius: 10, width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FontAwesome name={b.icon as any} size={13} color="#fff" />
          </Pressable>
        ))}
      </View>
      {/* Bottom edge line */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: theme.base,
      }} />
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
  // Stores { start, end } for each tab index, measured via onLayout
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

  const onLayout = useCallback(() => {}, []);

  return { containerRef, panResponder, onLayout, registerTabLayout };
}

// ─── Horizontal Book Tab Bar (top position) ──────────────
function HorizontalTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const { theme, tabColorOverrides } = useContext(TabCtx);
  const visibleRoutes = getVisibleRoutes(state);
  const { containerRef, panResponder, onLayout, registerTabLayout } = useTabScrub(visibleRoutes, state, navigation, 'x');

  return (
    <View
      ref={containerRef}
      onLayout={onLayout}
      {...panResponder.panHandlers}
      style={{ flexDirection: 'row', alignItems: 'flex-end' }}
    >
      {/* Drag handle — same size as a tab */}
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
    </View>
  );
}

// ─── Book-style Tab Sidebar (left / right) ───────────────
const TAB_NOTCH_W = 38;
const SIDE_TAB_W = 36;

function BookTabSidebar({ state, navigation }: MaterialTopTabBarProps) {
  const { spinePosition, theme, tabColorOverrides } = useContext(TabCtx);
  const visibleRoutes = getVisibleRoutes(state);
  const side = spinePosition as 'left' | 'right';
  const isLeft = side === 'left';
  const { containerRef, panResponder, onLayout, registerTabLayout } = useTabScrub(visibleRoutes, state, navigation, 'y');

  return (
    <View
      ref={containerRef}
      onLayout={onLayout}
      {...panResponder.panHandlers}
      style={{
        position: 'absolute',
        top: 4,
        bottom: 4,
        [side]: 2,
        zIndex: 10,
        width: SIDE_TAB_W,
        gap: 2,
        paddingVertical: 4,
      }}
    >
      {/* Drag handle */}
      <View style={{
        height: 28,
        width: SIDE_TAB_W,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.base + '40',
        borderTopLeftRadius: isLeft ? 6 : 0,
        borderBottomLeftRadius: isLeft ? 6 : 0,
        borderTopRightRadius: isLeft ? 0 : 6,
        borderBottomRightRadius: isLeft ? 0 : 6,
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
              maxHeight: 60,
              width: SIDE_TAB_W,
              backgroundColor: isFocused ? color : color + '99',
              alignItems: 'center',
              justifyContent: 'center',
              borderTopLeftRadius: isLeft ? 6 : 0,
              borderBottomLeftRadius: isLeft ? 6 : 0,
              borderTopRightRadius: isLeft ? 0 : 6,
              borderBottomRightRadius: isLeft ? 0 : 6,
            }}
          >
            <FontAwesome
              name={(tab?.icon ?? 'circle') as any}
              size={14}
              color={isFocused ? '#fff' : 'rgba(255,255,255,0.6)'}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Bottom Book Tab Bar ──────────────────────────────────
function BottomTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const { theme, tabColorOverrides } = useContext(TabCtx);
  const visibleRoutes = getVisibleRoutes(state);
  const { containerRef, panResponder, onLayout, registerTabLayout } = useTabScrub(visibleRoutes, state, navigation, 'x');

  return (
    <View
      ref={containerRef}
      onLayout={onLayout}
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
    </View>
  );
}

// ─── Custom Tab Bar (delegates to horizontal or vertical) ─
function CustomTabBar(props: MaterialTopTabBarProps) {
  const { spinePosition } = useContext(TabCtx);

  if (spinePosition === 'top') {
    return <HorizontalTabBar {...props} />;
  }
  if (spinePosition === 'bottom') {
    return <BottomTabBar {...props} />;
  }

  return <BookTabSidebar {...props} />;
}

// ─── Main Layout ─────────────────────────────────────────
export default function TripLayout() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip, refetch } = useItineraryScreen(id);
  const [spinePosition, setSpinePosition] = useState<SpinePosition>('left');
  const [scrubbing, setScrubbing] = useState(false);

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
    })).catch(() => {});
  }, [hydrated, id, tripThemeId, tripCustomColor, tabColorOverrides, itineraryColorOverrides]);

  // Only use trip data as initial default when there's NO persisted state
  useEffect(() => {
    if (hasPersistedState.current) return;
    if (trip?.theme) setTripThemeId(trip.theme);
    if (trip?.custom_theme_color !== undefined) setTripCustomColor(trip.custom_theme_color);
  }, [trip?.theme, trip?.custom_theme_color]);

  return (
    <TabCtx.Provider
      value={{ spinePosition, setSpinePosition, scrubbing, setScrubbing, theme, setTripTheme, tabColorOverrides, setTabColor, resetTabColors, itineraryColorOverrides, setItineraryColor, resetItineraryColors, calendarOpen, setCalendarOpen, mapOpen, setMapOpen }}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <TripHero trip={trip} refetch={refetch} />

        {/* In-app map modal */}
        <Modal visible={mapOpen} animationType="slide" presentationStyle="pageSheet">
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 12,
              backgroundColor: theme.base,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FontAwesome name="map" size={14} color="#fff" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                  {trip?.destination || 'Map'}
                </Text>
              </View>
              <Pressable onPress={() => setMapOpen(false)} hitSlop={12}>
                <FontAwesome name="times" size={18} color="#fff" />
              </Pressable>
            </View>
            <MapPreview
              lat={MOCK_DESTINATION_COORDS.lat}
              lng={MOCK_DESTINATION_COORDS.lng}
              label={trip?.destination || 'Destination'}
              zoom={13}
              flex
            />
          </View>
        </Modal>

        {/* Separator line */}
        <View style={{ height: 1, backgroundColor: colors.border }} />

        <View style={{ flex: 1, position: 'relative' }}>
          <TopTabs
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
              lazy: true,
              swipeEnabled: false,
              animationEnabled: !scrubbing,
              sceneStyle: {
                paddingLeft: spinePosition === 'left' ? SIDE_TAB_W : 0,
                paddingRight: spinePosition === 'right' ? SIDE_TAB_W : 0,
                paddingBottom: spinePosition === 'bottom' ? TAB_NOTCH_W + BOTTOM_BAR_OFFSET : 0,
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
    </TabCtx.Provider>
  );
}
