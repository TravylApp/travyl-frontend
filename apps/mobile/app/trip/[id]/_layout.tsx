import { useState, useRef, useCallback, useEffect, createContext, useContext, useMemo } from 'react';
import {
  View, Text, Pressable, Share, Modal, Image,
  Platform, PanResponder, Animated, Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { withLayoutContext, useLocalSearchParams, useRouter } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useItineraryScreen, formatDateRange, resolveTheme, MOCK_TRIPS } from '@travyl/shared';
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
  const isFocused = useIsFocused();
  const { spinePosition, navDirection } = useContext(TabCtx);
  const anim = useRef(new Animated.Value(0)).current;
  // Capture direction at mount so it doesn't flip mid-animation
  const dirRef = useRef(navDirection);
  const spineRef = useRef(spinePosition);
  if (isFocused) {
    dirRef.current = navDirection;
    spineRef.current = spinePosition;
  }

  useEffect(() => {
    if (isFocused) {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isFocused]);

  const isVerticalSpine = spineRef.current === 'left' || spineRef.current === 'right';
  const dir = dirRef.current;

  const opacity = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.7, 1],
  });

  if (isVerticalSpine) {
    // Circular Z-axis: page rotates towards you (dir=1) or away from you (dir=-1)
    // like a rolodex spinning in depth
    const rotateX = anim.interpolate({
      inputRange: [0, 1],
      // dir=1 (going down): starts tilted back, swings toward you
      // dir=-1 (going up): starts tilted forward, swings away then settles
      outputRange: [dir > 0 ? '-55deg' : '55deg', '0deg'],
    });
    const scale = anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.75, 0.92, 1],
    });
    const translateY = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [dir > 0 ? 80 : -80, 0],
    });

    return (
      <Animated.View
        style={{
          flex: 1,
          opacity,
          transform: [
            { perspective: 600 },
            { translateY },
            { rotateX },
            { scale },
          ],
        }}
      >
        {children}
      </Animated.View>
    );
  }

  // Horizontal slide for top/bottom
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [dir > 0 ? 60 : -60, 0],
  });

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity,
        transform: [{ translateX }],
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

function getVisibleRoutes(state: MaterialTopTabBarProps['state'], enabledTabs: string[]) {
  return state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => enabledTabs.includes(route.name));
}

// ─── Trip Hero ───────────────────────────────────────────
function TripHero({ trip, refetch }: { trip: Trip | null; refetch: () => void }) {
  const { theme, calendarOpen, setCalendarOpen, mapOpen, setMapOpen } = useContext(TabCtx);
  const router = useRouter();
  const tripImage = trip ? MOCK_TRIPS.find(t => t.id === trip.id)?.image : undefined;

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
    const next = !calendarOpen;
    setCalendarOpen(next);
    if (next) {
      setMapOpen(false);
      tabNavRef.current?.navigate('itinerary');
    }
  };

  const handleMap = () => {
    const next = !mapOpen;
    setMapOpen(next);
    if (next) {
      setCalendarOpen(false);
      tabNavRef.current?.navigate('itinerary');
    }
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
      {tripImage ? (
        <Image source={{ uri: tripImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesome name="picture-o" size={32} color="#94a3b8" />
        </View>
      )}
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
  const { theme, tabColorOverrides, enabledTabs, setShowTabPicker } = useContext(TabCtx);
  const visibleRoutes = getVisibleRoutes(state, enabledTabs);
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

// ─── Book-style Tab Sidebar (left / right) ───────────────
const TAB_NOTCH_W = 38;
const SIDE_TAB_W = 36;

function BookTabSidebar({ state, navigation }: MaterialTopTabBarProps) {
  const { spinePosition, theme, tabColorOverrides, enabledTabs, setShowTabPicker } = useContext(TabCtx);
  const visibleRoutes = getVisibleRoutes(state, enabledTabs);
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

      {/* Manage tabs button */}
      <Pressable
        onPress={() => setShowTabPicker(true)}
        style={{
          height: 28,
          width: SIDE_TAB_W,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.base + '40',
          borderTopLeftRadius: isLeft ? 6 : 0,
          borderBottomLeftRadius: isLeft ? 6 : 0,
          borderTopRightRadius: isLeft ? 0 : 6,
          borderBottomRightRadius: isLeft ? 0 : 6,
        }}
      >
        <FontAwesome name={enabledTabs.length < ALL_TABS.length ? 'plus' : 'ellipsis-v'} size={12} color="rgba(255,255,255,0.6)" />
      </Pressable>
    </View>
  );
}

// ─── Bottom Book Tab Bar ──────────────────────────────────
function BottomTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const { theme, tabColorOverrides, enabledTabs, setShowTabPicker } = useContext(TabCtx);
  const visibleRoutes = getVisibleRoutes(state, enabledTabs);
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

function CustomTabBar(props: MaterialTopTabBarProps) {
  const { spinePosition } = useContext(TabCtx);
  tabNavRef.current = props.navigation;

  // Track direction based on tab index changes
  const idx = props.state.index;
  if (idx !== prevTabIndexRef.current) {
    navDirectionRef.current = idx > prevTabIndexRef.current ? 1 : -1;
    prevTabIndexRef.current = idx;
  }

  if (spinePosition === 'top') {
    return <HorizontalTabBar {...props} />;
  }
  if (spinePosition === 'bottom') {
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
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
            Manage Tabs
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 16 }}>
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
                  flex: 1,
                  fontSize: 15,
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
  const [spinePosition, setSpinePosition] = useState<SpinePosition>('bottom');
  const [scrubbing, setScrubbing] = useState(false);

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
    })).catch(() => {});
  }, [hydrated, id, tripThemeId, tripCustomColor, tabColorOverrides, itineraryColorOverrides, enabledTabs]);

  // Only use trip data as initial default when there's NO persisted state
  useEffect(() => {
    if (hasPersistedState.current) return;
    if (trip?.theme) setTripThemeId(trip.theme);
    if (trip?.custom_theme_color !== undefined) setTripCustomColor(trip.custom_theme_color);
  }, [trip?.theme, trip?.custom_theme_color]);

  return (
    <TabCtx.Provider
      value={{ spinePosition, setSpinePosition, scrubbing, setScrubbing, navDirection: navDirectionRef.current, theme, setTripTheme, tabColorOverrides, setTabColor, resetTabColors, itineraryColorOverrides, setItineraryColor, resetItineraryColors, calendarOpen, setCalendarOpen, mapOpen, setMapOpen, enabledTabs, addTab, removeTab, showTabPicker, setShowTabPicker }}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <TripHero trip={trip} refetch={refetch} />
        <View style={{ height: 1, backgroundColor: colors.border }} />

        <View style={{ flex: 1, position: 'relative' }}>
          <TopTabs
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
              lazy: true,
              swipeEnabled: false,
              animationEnabled: false,
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
      <TabPickerModal />
    </TabCtx.Provider>
  );
}
