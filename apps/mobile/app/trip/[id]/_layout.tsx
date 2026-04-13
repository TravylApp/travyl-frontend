import { useState, useRef, useCallback, useEffect, createContext, useContext, useMemo } from 'react';
import {
  View, Text, Pressable, Share, Modal, ScrollView,
  Platform, PanResponder, Animated, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { withLayoutContext, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme, ThemeProvider } from '@react-navigation/native';
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
  { name: 'activities',  title: 'Explore',     icon: 'compass'     },
  { name: 'packing',     title: 'Packing',     icon: 'suitcase'    },
  { name: 'budget',      title: 'Budget',      icon: 'pie-chart'   },
  { name: 'favorites',   title: 'Favorites',   icon: 'heart'       },
  { name: 'settings',    title: 'Settings',    icon: 'cog'         },
] as const;

const PERMANENT_TAB_NAMES = new Set(['index', 'itinerary']);
const ADDABLE_TABS = ALL_TABS.filter(t => !PERMANENT_TAB_NAMES.has(t.name));
const DEFAULT_ENABLED_TABS = ['index', 'itinerary', 'hotels', 'flights', 'activities', 'packing', 'budget', 'favorites', 'settings'];

// ─── Types ──────────────────────────────────────────────
type SpinePosition = 'top' | 'bottom' | 'left' | 'right';

// ─── Context ─────────────────────────────────────────────
const TabCtx = createContext<{
  tripId: string;
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
  tripId: '',
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

function weatherEmoji(icon: string): string {
  const c = icon.toLowerCase();
  if (c.includes('clear') && c.includes('night')) return '🌙';
  if (c.includes('clear') || c.includes('sun')) return '☀️';
  if (c.includes('partly') || c.includes('cloud')) return '⛅';
  if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return '🌧';
  if (c.includes('snow')) return '❄️';
  if (c.includes('thunder') || c.includes('storm')) return '⛈️';
  if (c.includes('fog') || c.includes('mist')) return '🌫️';
  return '☁️';
}

function getVisibleRoutes(state: MaterialTopTabBarProps['state'], enabledTabs: string[]) {
  return state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => enabledTabs.includes(route.name));
}

const WEB_API = process.env.EXPO_PUBLIC_RECOMMENDATION_API_URL || 'https://api.dev.gotravyl.com';

// ─── Trip Hero ───────────────────────────────────────────
function TripHero({ trip, refetch }: { trip: Trip | null; refetch: () => void }) {
  const { theme, essentialsOpen, setEssentialsOpen, heroImageOverride } = useContext(TabCtx);
  const router = useRouter();
  const destination = trip?.destination || 'Destination';
  const cityName = destination.split(',')[0].trim();

  // Dynamic hero image: trip_context → override → fetch from Unsplash/Pexels
  const staticHero = heroImageOverride
    || trip?.trip_context?.hero_image_url
    || trip?.trip_context?.hero_images?.[0]
    || (trip?.trip_context as any)?.destination_photo_url;
  const [fetchedHero, setFetchedHero] = useState<string | null>(null);
  useEffect(() => {
    if (staticHero || fetchedHero || !cityName || cityName === 'Destination') return;
    // Try destination-specific endpoint first, then general images
    fetch(`${WEB_API}/api/destination-image?destination=${encodeURIComponent(cityName)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.url) { setFetchedHero(data.url); return; }
        // Fallback to general image search
        return fetch(`${WEB_API}/api/images?q=${encodeURIComponent(cityName + ' landmark')}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.url) setFetchedHero(d.url); });
      })
      .catch(() => {});
  }, [cityName, staticHero, fetchedHero]);
  const coverImage = staticHero || fetchedHero;
  const countryName = destination.split(',').slice(1).join(',').trim();
  const weather = trip?.trip_context?.weather?.current;
  const forecast = trip?.trip_context?.weather?.forecast ?? [];
  const qf = trip?.trip_context?.quick_facts;

  // Fetch wiki if not in trip_context
  const rawWiki = trip?.trip_context?.wiki;
  const existingWiki = typeof rawWiki === 'string' ? rawWiki : rawWiki?.extract;
  const [fetchedWiki, setFetchedWiki] = useState<string | null>(null);
  useEffect(() => {
    if (existingWiki || !cityName || cityName === 'Destination') return;
    fetch(`${WEB_API}/api/wiki?q=${encodeURIComponent(cityName)}`)
      .then(r => r.json())
      .then(d => { if (d?.extract) setFetchedWiki(d.extract); })
      .catch(() => {});
  }, [cityName, existingWiki]);
  const wikiText = existingWiki || fetchedWiki;

  return (
    <View style={{ position: 'relative', minHeight: essentialsOpen ? 280 : 200 }}>
      {/* Background image — fills entire hero, content determines height */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {coverImage ? (
          <Image source={{ uri: coverImage, headers: { Referer: '' } }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={600} cachePolicy="memory-disk" />
        ) : (
          <View style={{ flex: 1, backgroundColor: theme.base, alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesome name="picture-o" size={32} color="rgba(255,255,255,0.3)" />
          </View>
        )}
        {/* Flat tint — ensures readability on any photo */}
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.2)' }} pointerEvents="none" />
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.75)']}
          locations={[0, 0.25, 1]}
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
          pointerEvents="none"
        />
      </View>

      {/* Back button */}
      <Pressable
        onPress={() => router.canDismiss() ? router.dismiss() : router.back()}
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

      {/* Hero text — content-driven height, extra bottom padding for tab bleed */}
      <View style={{ paddingTop: 90, paddingBottom: 100, paddingHorizontal: 16 }}>
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
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <FontAwesome name={essentialsOpen ? 'eye-slash' : 'eye'} size={10} color="rgba(255,255,255,0.7)" />
            <Text style={{ ...TextStyles.xs, fontWeight: '600', letterSpacing: 0.5, color: 'rgba(255,255,255,0.85)' }}>
              {essentialsOpen ? 'Hide' : 'Info'}
            </Text>
          </Pressable>
        </View>

        {/* Collapsible essentials */}
        {essentialsOpen && trip && (
          <View>
            {/* Date + travelers + currency + timezone + safety */}
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {[
                formatDateRange(trip.start_date, trip.end_date),
                `${trip.travelers} ${trip.travelers === 1 ? 'traveler' : 'travelers'}`,
                qf?.currency ? (qf.currency as string).split(' · ')[0] : null,
                qf?.language ? (qf.language as string).split(' · ')[0] : null,
                qf?.timezone ? (qf.timezone as string).split(' · ')[0] : null,
              ].filter(Boolean).map((text, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {i > 0 && <Text style={{ color: 'rgba(255,255,255,0.35)', marginRight: 6 }}>·</Text>}
                  <Text style={{
                    ...TextStyles.bodyLg, fontWeight: i >= 2 ? '700' : '600',
                    color: '#fff',
                    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
                  }}>{text}</Text>
                </View>
              ))}
              {(() => {
                const safety = trip?.trip_context?.safety as { score: number; message: string } | undefined;
                if (!safety || safety.score <= 0) return null;
                const color = safety.score <= 2 ? '#4ade80' : safety.score <= 3 ? '#facc15' : '#f87171';
                const bg = safety.score <= 2 ? 'rgba(34,197,94,0.25)' : safety.score <= 3 ? 'rgba(234,179,8,0.25)' : 'rgba(239,68,68,0.25)';
                const border = safety.score <= 2 ? 'rgba(34,197,94,0.5)' : safety.score <= 3 ? 'rgba(234,179,8,0.5)' : 'rgba(239,68,68,0.5)';
                const label = safety.score <= 2 ? 'Safe' : safety.score <= 3 ? 'Caution' : 'Danger';
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, borderWidth: 1, borderColor: border, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <FontAwesome name="shield" size={9} color={color} />
                    <Text style={{ fontSize: 10, fontWeight: '600', color }}>{label} ({safety.score})</Text>
                  </View>
                );
              })()}
            </View>

            {/* Weather + forecast */}
            {weather && (() => {
              const ts = { textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 } as const;
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 14 }}>{weatherEmoji((weather as any).icon || weather.conditions || '')}</Text>
                    <Text style={{ ...TextStyles.bodyEm, fontWeight: '700', color: '#c8a96a', ...ts }}>{(weather as any).temp ?? weather.high ?? ''}°</Text>
                    <Text style={{ ...TextStyles.xs, color: '#fff', ...ts }}>Now</Text>
                  </View>
                  {forecast.length > 0 && <Text style={{ color: 'rgba(255,255,255,0.35)' }}>|</Text>}
                  {forecast.slice(0, 4).map((d: any, idx: number) => {
                    const dayName = d.day || (d.date ? new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }) : '');
                    const icon = weatherEmoji(d.icon || d.conditions || '');
                    return (
                      <View key={d.date || idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Text style={{ ...TextStyles.smEm, color: 'rgba(255,255,255,0.9)', ...ts }}>{dayName}</Text>
                        <Text style={{ fontSize: 14 }}>{icon}</Text>
                        <Text style={{ ...TextStyles.captionEm, fontWeight: '700', color: '#fff', ...ts }}>{d.high}°</Text>
                      </View>
                    );
                  })}
                </View>
              );
            })()}

            {/* Sunrise / Sunset */}
            {(() => {
              const sr = trip?.trip_context?.sunrise as { sunrise?: string; sunset?: string; golden_hour?: string } | undefined;
              if (!sr?.sunrise || !sr?.sunset) return null;
              const fmt = (iso: string) => { try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); } catch { return ''; } };
              const ts = { textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 } as const;
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 12 }}>☀️</Text>
                    <Text style={{ ...TextStyles.xs, color: '#fff', ...ts }}>Sunrise</Text>
                    <Text style={{ ...TextStyles.captionEm, fontWeight: '700', color: '#fff', ...ts }}>{fmt(sr.sunrise)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 12 }}>🌅</Text>
                    <Text style={{ ...TextStyles.xs, color: '#fff', ...ts }}>Sunset</Text>
                    <Text style={{ ...TextStyles.captionEm, fontWeight: '700', color: '#fff', ...ts }}>{fmt(sr.sunset)}</Text>
                  </View>
                  {sr.golden_hour && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 12 }}>📸</Text>
                      <Text style={{ ...TextStyles.xs, color: '#fff', ...ts }}>Golden Hour</Text>
                      <Text style={{ ...TextStyles.captionEm, fontWeight: '700', color: '#c8a96a', ...ts }}>{fmt(sr.golden_hour)}</Text>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Wiki excerpt */}

            {wikiText ? (
              <View style={{
                marginTop: 8, borderRadius: 10,
                backgroundColor: 'rgba(0,0,0,0.55)',
                height: 19 * 2 + 16, // 2 lines × lineHeight + padding
              }}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
                  nestedScrollEnabled
                >
                  <Text style={{
                    ...TextStyles.body, fontFamily: FontFamily.serif,
                    color: '#fff', lineHeight: 19, fontSize: 13,
                  }}>
                    {wikiText}
                  </Text>
                </ScrollView>
              </View>
            ) : null}
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
  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to active tab
  const activeIdx = visibleRoutes.findIndex(({ index }) => state.index === index);
  useEffect(() => {
    if (scrollRef.current && activeIdx >= 0) {
      scrollRef.current.scrollTo({ x: Math.max(0, activeIdx * 72 - 40), animated: true });
    }
  }, [activeIdx]);

  return (
    <View
      style={{
        position: 'absolute',
        bottom: BOTTOM_BAR_OFFSET,
        left: 0,
        right: 0,
        zIndex: 10,
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingHorizontal: 8,
          gap: 2,
        }}
      >
        {visibleRoutes.map(({ route, index }) => {
          const isFocused = state.index === index;
          const tab = ALL_TABS.find((t) => t.name === route.name);
          const color = tabColorOverrides[route.name] ?? theme.tabColors[route.name] ?? theme.base;

          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                height: 36,
                paddingHorizontal: isFocused ? 14 : 10,
                backgroundColor: isFocused ? color : color + '40',
                borderRadius: 18,
              }}
            >
              <FontAwesome
                name={(tab?.icon ?? 'circle') as any}
                size={13}
                color={isFocused ? '#fff' : 'rgba(255,255,255,0.7)'}
              />
              {isFocused && (
                <Text style={{
                  fontSize: 12,
                  fontFamily: FontFamily.sansBold,
                  color: '#fff',
                }}>
                  {tab?.title ?? route.name}
                </Text>
              )}
            </Pressable>
          );
        })}

        {/* Manage tabs button */}
        <Pressable
          onPress={() => setShowTabPicker(true)}
          style={{
            height: 36,
            width: 36,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.base + '30',
            borderRadius: 18,
          }}
        >
          <FontAwesome name={enabledTabs.length < ALL_TABS.length ? 'plus' : 'ellipsis-h'} size={12} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </ScrollView>
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

// ─── Tabs wrapper with transparent navigation theme ──────
function TripTabsWithTransparentTheme({ trip, refetch, spinePosition }: {
  trip: Trip | null; refetch: () => void; spinePosition: SpinePosition;
}) {
  const parentTheme = useTheme();
  const transparentTheme = useMemo(() => ({
    ...parentTheme,
    colors: { ...parentTheme.colors, background: 'transparent', card: 'transparent' },
  }), [parentTheme]);

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
      <TripHero trip={trip} refetch={refetch} />
      <View style={{ flex: 1, position: 'relative', marginTop: -90 }}>
        <ThemeProvider value={transparentTheme}>
          <TopTabs
            tabBar={(props) => <CustomTabBar {...props} />}
            style={{ backgroundColor: 'transparent' }}
            pagerStyle={{ backgroundColor: 'transparent' }}
            screenOptions={{
              lazy: true,
              lazyPlaceholder: () => (
                <View style={{ flex: 1, backgroundColor: 'transparent' }} />
              ),
              swipeEnabled: true,
              animationEnabled: true,
              sceneStyle: {
                paddingLeft: spinePosition === 'left' ? SIDE_TAB_W : 0,
                paddingRight: spinePosition === 'right' ? SIDE_TAB_W : 0,
                paddingBottom: (spinePosition === 'bottom' || spinePosition === 'top') ? TAB_NOTCH_W + BOTTOM_BAR_OFFSET : 0,
                backgroundColor: 'transparent',
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
            <TopTabs.Screen name="favorites" options={{ title: 'Favorites' }} />
            <TopTabs.Screen name="settings" options={{ title: 'Settings' }} />
          </TopTabs>
        </ThemeProvider>
      </View>
    </View>
  );
}

// ─── Main Layout ─────────────────────────────────────────
export default function TripLayout() {
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
      value={{ tripId: id, spinePosition, setSpinePosition, scrubbing, setScrubbing, navDirection: navDirectionRef.current, theme, setTripTheme, tabColorOverrides, setTabColor, resetTabColors, itineraryColorOverrides, setItineraryColor, resetItineraryColors, calendarOpen, setCalendarOpen, mapOpen, setMapOpen, enabledTabs, addTab, removeTab, showTabPicker, setShowTabPicker, essentialsOpen, setEssentialsOpen, heroImageOverride, setHeroImageOverride }}
    >
      <TripTabsWithTransparentTheme trip={trip} refetch={refetch} spinePosition={spinePosition} />
      <TabPickerModal />
    </TabCtx.Provider>
  );
}
