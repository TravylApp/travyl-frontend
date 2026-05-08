import { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import { View, ScrollView, Text, Pressable, TextInput, Image, Animated, PanResponder, Dimensions, Modal, FlatList, useWindowDimensions, Platform, Keyboard, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Time format preference, persisted globally so the same toggle applies
// everywhere times are shown.
type TimeFormat = '12h' | '24h';
const TIME_FORMAT_KEY = 'time_format';
function formatClockTime(iso: string | undefined, format: TimeFormat): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: format === '12h',
    });
  } catch {
    return '';
  }
}
import {
  useItineraryScreen,
  ITINERARY_COLORS,
  GLANCE_HERO_IMAGES,
  adjustBrightness,
  getActivityTypeColor,
  TIME_OF_DAY_CONFIG,
  TOD_START_TIMES,
  TOD_START_HOURS,
  TOD_END_HOURS,
  QUICK_FILL_CATEGORIES,
  ACTIVITY_TYPE_ICONS,
  formatHourToTime,
  pickRandomActivity,
  TextStyles,
  FontSize,
  FontFamily,
  supabase,
  getWebApiBase,
  upscaleGoogleImage,
  useSettingsStore,
} from '@travyl/shared';
import type { FlightDetail, HotelDetail, DiscoverItem, ActivityViewModel, ItineraryDayViewModel } from '@travyl/shared';
// Conditionally import react-native-maps. Skip the require on web; on
// native, attempt and fall back to View if it isn't bundled. We do NOT
// gate on Constants.appOwnership — it's deprecated and returns null in
// custom dev clients on newer SDKs, which would skip the require here.
let MapView: any = View;
let Marker: any = View;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
  } catch {}
}
import { DaySelector, TimeGroupSection } from '@/components/itinerary';
import type { MapMarker } from '@/components/itinerary/MapPreview';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAddToTrip } from '@/hooks/useAddToTrip';
import { TripHistoryToggle } from '@/components/trip/TripHistoryPanel';

import { CardStackCarousel } from '@/components/places/CardStackCarousel';
import { discoverItemToPlaceItem } from '@/utils/discoverToPlace';
import { PageTransition, TabCtx, useTabAccent } from './_layout';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';


function parseHour(timeStr: string | null): number | null {
  if (!timeStr) return null;
  // Try "9:00 AM" / "9:00 PM" format
  const ampm = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampm) {
    let hour = parseInt(ampm[1], 10);
    const period = ampm[3].toUpperCase();
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return hour;
  }
  // Try "09:00" / "14:30" (24h format)
  const h24 = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (h24) return parseInt(h24[1], 10);
  return null;
}

// When an activity has no explicit start_time, fall back to a sensible hour
// based on its time-of-day bucket so the calendar doesn't stack everything at
// midnight (which is offscreen — the calendar auto-scrolls to 8 AM on mount).
const TIME_OF_DAY_HOUR: Record<string, number> = {
  morning: 9,
  afternoon: 14,
  evening: 19,
  latenight: 22,
};

function formatHourLabel(hour: number): string {
  const h = Math.floor(hour);
  const minutes = Math.round((hour - h) * 60);
  const display = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 || h === 24 ? 'AM' : 'PM';
  return `${display}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// ─── Match itinerary activity → DiscoverItem by keyword overlap ──────
const STOP_WORDS = new Set(['the', 'at', 'a', 'an', 'of', 'in', 'to', 'and', 'le', 'la', 'de', 'du', 'des']);

function findDiscoverMatch(activityName: string, discoverPool: any[]): any | undefined {
  const keywords = activityName.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2 && !STOP_WORDS.has(w));
  let bestMatch: any | undefined;
  let bestScore = 0;
  for (const d of discoverPool) {
    const dLower = (d.name || '').toLowerCase();
    const score = keywords.filter((kw: string) => dLower.includes(kw)).length;
    if (score > bestScore) { bestScore = score; bestMatch = d; }
  }
  return bestScore >= 1 ? bestMatch : undefined;
}

// Build discover items from trip_context data
function upscaleImg(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.includes('googleusercontent.com')) {
    return url
      .replace(/=w\d+-h\d+[^&\s]*/, '=w600-h400-k-no')
      .replace(/=s\d+-w\d+-h\d+[^&\s]*/, '=w600-h400-k-no');
  }
  return url;
}

function buildDiscoverItems(trip: any): any[] {
  const ctx = trip?.trip_context;
  if (!ctx) return [];
  const items: any[] = [];
  const seen = new Set<string>();
  const add = (e: any) => { if (e?.id && !seen.has(e.id)) { seen.add(e.id); items.push(e); } };
  for (const e of ctx?.explore_items ?? []) { const img = upscaleImg(e.image); add({ id: e.id, name: e.title || e.name, description: e.description || e.category || '', category: e.category || '', image: img, images: img ? [img] : [], tags: e.tags || [], rating: e.rating || 0 }); }
  for (const v of ctx?.foursquare_venues ?? []) { const img = upscaleImg(v.image); add({ id: v.id, name: v.title || v.name, description: v.description || v.category || '', category: v.category || '', image: img, images: img ? [img] : [], tags: v.tags || [], rating: v.rating || 0 }); }
  return items;
}

// ─── DayMap — activity markers + explore mode at bottom of itinerary ─

// Return real coordinates for an activity, or null if unavailable
function realActivityCoords(activity: ActivityViewModel, discoverPool?: any[]): { lat: number; lng: number } | null {
  const lat = (activity as any).latitude ?? (activity as any).lat;
  const lng = (activity as any).longitude ?? (activity as any).lng ?? (activity as any).lon;
  if (typeof lat === 'number' && typeof lng === 'number' && lat !== 0 && lng !== 0) {
    return { lat, lng };
  }
  // Fallback — the view model strips lat/lng. Look up by activity name in
  // the discover pool, which carries coords from the trip's POIs.
  if (discoverPool && discoverPool.length > 0) {
    const match = findDiscoverMatch(activity.name, discoverPool);
    if (match && typeof match.lat === 'number' && typeof match.lng === 'number') {
      return { lat: match.lat, lng: match.lng };
    }
  }
  return null;
}

function buildMarkers(activities: ActivityViewModel[], accent: string, _centerLat: number, _centerLng: number, discoverPool?: any[]): MapMarker[] {
  const markers: MapMarker[] = [];
  activities.forEach((a, i) => {
    const coords = realActivityCoords(a, discoverPool);
    if (coords) {
      markers.push({
        lat: coords.lat,
        lng: coords.lng,
        label: a.name,
        color: accent,
        number: i + 1,
      });
    }
  });
  return markers;
}

function CollapsibleSection({ title, icon, accent, count, defaultOpen = false, children }: {
  title: string;
  icon: string;
  accent: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.borderLight }}>
      <Pressable
        onPress={() => setOpen(!open)}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 12, paddingVertical: 8,
          backgroundColor: colors.surface,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FontAwesome name={icon as any} size={11} color={accent} />
          <Text style={{ ...TextStyles.bodyEm, color: colors.text }}>{title}</Text>
          {count != null && (
            <View style={{
              backgroundColor: accent + '20', borderRadius: 8,
              paddingHorizontal: 6, paddingVertical: 1,
            }}>
              <Text style={{ ...TextStyles.smEm, color: accent }}>{count}</Text>
            </View>
          )}
        </View>
        <FontAwesome name={open ? 'chevron-up' : 'chevron-down'} size={10} color={colors.textTertiary} />
      </Pressable>
      {open && children}
    </View>
  );
}

// ─── Draggable Map Sheet ─────────────────────────────────
const SCREEN_H = Dimensions.get('window').height;

// Route color palette
const ROUTE_COLORS = [
  { color: '#6366f1', label: 'Indigo' },
  { color: '#3b82f6', label: 'Blue' },
  { color: '#10b981', label: 'Green' },
  { color: '#f59e0b', label: 'Amber' },
  { color: '#ef4444', label: 'Red' },
  { color: '#ec4899', label: 'Pink' },
  { color: '#8b5cf6', label: 'Purple' },
  { color: '#14b8a6', label: 'Teal' },
  { color: '#f97316', label: 'Orange' },
  { color: '#64748b', label: 'Slate' },
];

function DayMap({ todayActivities, allActivities, onClose, centerLat, centerLng, discoverPool = [] }: {
  todayActivities: ActivityViewModel[];
  allActivities: ActivityViewModel[];
  onClose: () => void;
  centerLat: number;
  centerLng: number;
  discoverPool?: any[];
}) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('itinerary');
  const [exploreSearch, setExploreSearch] = useState('');

  // Customization state
  const [routeColor, setRouteColor] = useState(ACCENT);
  const [stopOrder, setStopOrder] = useState<number[]>([]);
  const [showExploreOnMap, setShowExploreOnMap] = useState(true);
  const [selectedStop, setSelectedStop] = useState<number | null>(null);
  const mapRef = useRef<typeof MapView>(null);

  // Sheet drag state (like PlaceDetailModal)
  const [sheetTop, setSheetTop] = useState(0);
  const sheetTopRef = useRef(0);
  const MAP_H_DEFAULT = Math.round(SCREEN_H * 0.35);
  const MIN_SHEET_TOP = -MAP_H_DEFAULT + 80;
  const MAX_SHEET_TOP = SCREEN_H * 0.35;

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        const newTop = sheetTopRef.current + gs.dy;
        const clamped = Math.max(MIN_SHEET_TOP, Math.min(MAX_SHEET_TOP, newTop));
        setSheetTop(clamped);
      },
      onPanResponderRelease: (_, gs) => {
        const newTop = sheetTopRef.current + gs.dy;
        const clamped = Math.max(MIN_SHEET_TOP, Math.min(MAX_SHEET_TOP, newTop));
        sheetTopRef.current = clamped;
        setSheetTop(clamped);
      },
    }),
  ).current;

  // Entry/exit animations (like PlaceDetailModal)
  const mapSlide = useRef(new Animated.Value(-250)).current;
  const contentSlide = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setSheetTop(0);
    sheetTopRef.current = 0;
    mapSlide.setValue(-250);
    contentSlide.setValue(600);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(mapSlide, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
      Animated.spring(contentSlide, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(mapSlide, { toValue: -250, duration: 200, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: 600, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose]);

  // Dedup activities by id (or by name+time if id is missing). The same
  // POI can be in both `trip_context.itinerary[].slots[].poi` AND the
  // `activity` table, which makes `selectedDay.timeGroups.flatMap(...)`
  // emit it twice — once for each source. Without this, the Stops list
  // and the map sidebar show "Bishop Museum / Bishop Museum / ..."
  // pairs even though there's only one entry on the calendar.
  const dedupedTodayActivities = useMemo(() => {
    const seen = new Set<string>();
    const out: ActivityViewModel[] = [];
    for (const a of todayActivities) {
      const key = a.id ? String(a.id) : `${a.name ?? ''}|${a.startTime ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(a);
    }
    return out;
  }, [todayActivities]);

  // Initialize stop order when activities change. Uses the deduped list
  // so the indices match what the Stops + map render.
  useEffect(() => {
    setStopOrder(dedupedTodayActivities.map((_, i) => i));
  }, [dedupedTodayActivities.length]);

  // Reorder helpers
  const moveStop = useCallback((fromIdx: number, direction: 'up' | 'down') => {
    setStopOrder((prev) => {
      const arr = [...prev];
      const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
      if (toIdx < 0 || toIdx >= arr.length) return prev;
      [arr[fromIdx], arr[toIdx]] = [arr[toIdx], arr[fromIdx]];
      return arr;
    });
  }, []);

  // Build ordered activities
  const orderedActivities = useMemo(() =>
    stopOrder.length === dedupedTodayActivities.length
      ? stopOrder.map((i) => dedupedTodayActivities[i])
      : dedupedTodayActivities,
    [stopOrder, dedupedTodayActivities],
  );

  const markers = useMemo(() => buildMarkers(orderedActivities, ACCENT, centerLat, centerLng, discoverPool), [orderedActivities, ACCENT, centerLat, centerLng, discoverPool]);

  const focusStop = useCallback((index: number) => {
    setSelectedStop((prev) => {
      if (prev === index) {
        typeof mapRef.current?.animateToRegion === 'function' && mapRef.current.animateToRegion({
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 400);
        return null;
      }
      const m = markers[index];
      if (m) {
        typeof mapRef.current?.animateToRegion === 'function' && mapRef.current.animateToRegion({
          latitude: m.lat,
          longitude: m.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 400);
      }
      return index;
    });
  }, [markers]);

  const exploreItems = useMemo(() => {
    let items = discoverPool;
    if (exploreSearch) {
      const q = exploreSearch.toLowerCase();
      items = items.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        (i.category?.toLowerCase().includes(q) ?? false),
      );
    }
    return items;
  }, [exploreSearch]);

  const exploreMarkers: MapMarker[] = useMemo(() =>
    showExploreOnMap
      ? exploreItems
          .filter((i) => i.lat && i.lng)
          .map((i) => ({
            lat: i.lat!,
            lng: i.lng!,
            label: i.name,
            color: colors.textTertiary,
            muted: true,
          }))
      : [],
    [exploreItems, showExploreOnMap],
  );

  const allMarkers = useMemo(() => {
    // Dedupe across `markers` (built from the itinerary) and
    // `exploreMarkers` (built from trip_context.explore_items). The
    // same POI is often listed in both — itinerary AND explore_items —
    // which used to render two pins on top of each other for every
    // generated activity. Keys are name + rounded lat/lng so different
    // POIs at very close coords still show distinctly.
    const merged: typeof markers = [];
    const seen = new Set<string>();
    const norm = (s: string | undefined) => (s || '').trim().toLowerCase();
    for (const m of [...markers, ...exploreMarkers]) {
      if (typeof m.lat !== 'number' || typeof m.lng !== 'number') continue;
      const key = `${norm(m.label)}|${m.lat.toFixed(4)},${m.lng.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(m);
    }
    return merged;
  }, [markers, exploreMarkers]);

  if (todayActivities.length === 0 && allActivities.length === 0) return null;

  const mapH = MAP_H_DEFAULT + sheetTop;

  return (
    <Modal visible animationType="none" transparent onRequestClose={handleClose}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Backdrop */}
        <Pressable onPress={handleClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />

        {/* ── Map — full-width, slides in from the top ── */}
        <Animated.View style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: Math.max(mapH, 120),
          transform: [{ translateY: mapSlide }],
        }}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={{
              latitude: centerLat,
              longitude: centerLng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            scrollEnabled
            zoomEnabled
            rotateEnabled={false}
            pitchEnabled={false}
          >
            {allMarkers.map((m, i) => (
              <Marker
                key={`${m.label}-${i}`}
                coordinate={{ latitude: m.lat, longitude: m.lng }}
                title={m.label}
                pinColor={m.muted ? '#94a3b8' : m.color}
              />
            ))}
          </MapView>
          {/* Close button */}
          <Pressable
            onPress={handleClose}
            style={{
              position: 'absolute', top: 52, right: 16,
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.9)',
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3,
            }}
          >
            <FontAwesome name="times" size={14} color="#333" />
          </Pressable>
          {/* Recenter button */}
          <Pressable
            onPress={() => {
              if (typeof mapRef.current?.animateToRegion === 'function') {
                mapRef.current.animateToRegion({
                  latitude: centerLat, longitude: centerLng,
                  latitudeDelta: 0.05, longitudeDelta: 0.05,
                }, 400);
              }
            }}
            style={{
              position: 'absolute', top: 52, left: 16,
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.9)',
              alignItems: 'center', justifyContent: 'center',
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3,
            }}
          >
            <FontAwesome name="crosshairs" size={14} color="#333" />
          </Pressable>
          {/* Stop count pill */}
          <View style={{
            position: 'absolute', top: 52, left: 0, right: 0,
            alignItems: 'center', pointerEvents: 'none',
          }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14,
              paddingHorizontal: 12, paddingVertical: 6,
              shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3,
            }}>
              <FontAwesome name="map-marker" size={12} color={ACCENT} />
              <Text style={{ ...TextStyles.bodyEm, color: colors.text }}>
                {markers.length} {markers.length === 1 ? 'stop' : 'stops'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Sheet — slides up from the bottom ── */}
        <Animated.View style={{
          position: 'absolute', left: 0, right: 0,
          top: Math.max(mapH, 120) - 24,
          height: SCREEN_H - Math.max(mapH, 120) + 24,
          backgroundColor: colors.cardBackground,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          transform: [{ translateY: contentSlide }],
          overflow: 'hidden',
        }}>
          {/* Drag handle */}
          <View
            {...sheetPanResponder.panHandlers}
            style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 10 }}
          >
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          <ScrollView bounces={false} showsVerticalScrollIndicator={false} nestedScrollEnabled>

        {/* Collapsible: Stops */}
        <CollapsibleSection title="Stops" icon="map-marker" accent={ACCENT} count={orderedActivities.length} defaultOpen>
          <View style={{ paddingVertical: 4 }}>
            {orderedActivities.map((activity, i) => {
              const isSelected = selectedStop === i;
              // Stable, always-unique key — even if two activities share
              // the same `activity.id` (e.g. same SerpAPI POI in two
              // sources), suffixing with the index keeps React happy.
              const stopKey = `${activity.id ?? 'noid'}-${i}`;
              return (
                <Pressable
                  key={stopKey}
                  onPress={() => focusStop(i)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 10, paddingVertical: 5,
                    backgroundColor: isSelected ? ACCENT + '12' : 'transparent',
                    borderLeftWidth: isSelected ? 3 : 0,
                    borderLeftColor: ACCENT,
                  }}
                >
                  {/* Reorder buttons */}
                  <View style={{ gap: 1 }}>
                    <Pressable
                      onPress={() => moveStop(i, 'up')}
                      disabled={i === 0}
                      hitSlop={4}
                      style={{ opacity: i === 0 ? 0.2 : 0.6 }}
                    >
                      <FontAwesome name="chevron-up" size={8} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={() => moveStop(i, 'down')}
                      disabled={i === orderedActivities.length - 1}
                      hitSlop={4}
                      style={{ opacity: i === orderedActivities.length - 1 ? 0.2 : 0.6 }}
                    >
                      <FontAwesome name="chevron-down" size={8} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                  {/* Numbered dot — uses tab accent color */}
                  <View style={{
                    width: isSelected ? 26 : 22, height: isSelected ? 26 : 22,
                    borderRadius: isSelected ? 13 : 11,
                    backgroundColor: ACCENT,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: isSelected ? 2 : 0,
                    borderColor: '#fff',
                    shadowColor: isSelected ? ACCENT : 'transparent',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: isSelected ? 0.4 : 0,
                    shadowRadius: isSelected ? 6 : 0,
                    elevation: isSelected ? 4 : 0,
                  }}>
                    <Text style={{ ...(isSelected ? TextStyles.captionEm : TextStyles.smEm), color: '#fff' }}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{
                      ...(isSelected ? TextStyles.bodyEm : TextStyles.body),
                      color: isSelected ? ACCENT : colors.text,
                    }}>
                      {activity.name}
                    </Text>
                    {activity.startTime && (
                      <Text style={{ ...TextStyles.sm, color: colors.textTertiary }}>{activity.startTime}</Text>
                    )}
                  </View>
                  <View style={{
                    backgroundColor: ACCENT + '18', borderRadius: 6,
                    paddingHorizontal: 6, paddingVertical: 2,
                  }}>
                    <Text style={{ ...TextStyles.xs, color: ACCENT }}>{activity.category}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </CollapsibleSection>

        {/* Collapsible: Explore */}
        <CollapsibleSection title="Explore Nearby" icon="compass" accent="#6366f1" count={exploreItems.length}>
          <View>
            {/* Search bar */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              marginHorizontal: 10, marginVertical: 8,
              backgroundColor: colors.surface, borderRadius: 8,
              paddingHorizontal: 10, height: 34,
              borderWidth: 1, borderColor: colors.borderLight,
            }}>
              <FontAwesome name="search" size={11} color={colors.textTertiary} />
              <TextInput
                value={exploreSearch}
                onChangeText={setExploreSearch}
                placeholder="Search places, tours, food..."
                placeholderTextColor={colors.textTertiary}
                style={{ flex: 1, ...TextStyles.body, color: colors.text, paddingVertical: 0 }}
              />
              {exploreSearch.length > 0 && (
                <Pressable onPress={() => setExploreSearch('')}>
                  <FontAwesome name="times-circle" size={13} color={colors.textTertiary} />
                </Pressable>
              )}
            </View>

            {/* Explore items */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 10, gap: 8 }}
            >
              {exploreItems.slice(0, 10).map((item) => (
                <View
                  key={item.id}
                  style={{
                    width: 150, backgroundColor: colors.surface, borderRadius: 10,
                    borderWidth: 1, borderColor: colors.borderLight, overflow: 'hidden',
                  }}
                >
                  <Image
                    source={{ uri: item.images[0] }}
                    style={{ width: 150, height: 80 }}
                    resizeMode="cover"
                  />
                  <View style={{ padding: 8 }}>
                    <Text numberOfLines={2} style={{ ...TextStyles.captionEm, color: colors.text }}>
                      {item.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      {item.rating && (
                        <>
                          <FontAwesome name="star" size={9} color="#f59e0b" />
                          <Text style={{ ...TextStyles.sm, color: colors.textSecondary }}>{item.rating}</Text>
                        </>
                      )}
                      {item.category && (
                        <Text style={{ ...TextStyles.xs, color: colors.textTertiary }}> · {item.category}</Text>
                      )}
                    </View>
                    {item.price && (
                      <Text style={{ ...TextStyles.captionEm, color: colors.tint, marginTop: 3 }}>
                        {item.dealPrice ?? item.price}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </CollapsibleSection>

        {/* Collapsible: Customize */}
        <CollapsibleSection title="Customize" icon="sliders" accent={ACCENT}>
          <View style={{ paddingHorizontal: 12, paddingVertical: 10, gap: 14 }}>

            {/* Route Color */}
            <View>
              <Text style={{ ...TextStyles.captionEm, color: colors.text, marginBottom: 6 }}>Route Color</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {ROUTE_COLORS.map((rc) => (
                  <Pressable
                    key={rc.color}
                    onPress={() => setRouteColor(rc.color)}
                    style={{
                      width: 28, height: 28, borderRadius: 14,
                      backgroundColor: rc.color,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: routeColor === rc.color ? 2.5 : 1.5,
                      borderColor: routeColor === rc.color ? colors.text : colors.borderLight,
                    }}
                  >
                    {routeColor === rc.color && (
                      <FontAwesome name="check" size={11} color="#fff" />
                    )}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Show Explore on Map toggle */}
            <Pressable
              onPress={() => setShowExploreOnMap(!showExploreOnMap)}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingVertical: 4,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FontAwesome name="compass" size={11} color="#6366f1" />
                <Text style={{ ...TextStyles.caption, color: colors.text }}>Show nearby on map</Text>
              </View>
              <View style={{
                width: 36, height: 20, borderRadius: 10,
                backgroundColor: showExploreOnMap ? ACCENT : colors.borderLight,
                justifyContent: 'center',
                paddingHorizontal: 2,
              }}>
                <View style={{
                  width: 16, height: 16, borderRadius: 8,
                  backgroundColor: '#fff',
                  alignSelf: showExploreOnMap ? 'flex-end' : 'flex-start',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.15, shadowRadius: 1, elevation: 2,
                }} />
              </View>
            </Pressable>

          </View>
        </CollapsibleSection>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── MobileCalendarView ─────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 12 AM to 11 PM (full 24h)
const HOUR_HEIGHT = 64;

/** Parse duration between two time strings in hours */
function parseDuration(start: string, end?: string): number {
  if (!end) return 1;
  const s = parseHour(start) ?? 0;
  const e = parseHour(end) ?? 0;
  const diff = e - s;
  return diff > 0 ? Math.min(diff, 4) : 1;
}

/** Activity block for the calendar grid — tap to view, long-press to edit time, drag to move */
function CalendarBlock({ activity, startH, duration, bgColor, isSelected, onTap, onLongPress, onDrop, onDragStateChange, dayColW, colIdx, totalCols, lane = 0, lanes = 1, imageUrl }: {
  activity: any; startH: number; duration: number; bgColor: string;
  isSelected: boolean;
  onTap: () => void;
  onLongPress?: () => void;
  onDrop: (activityId: string, newHour: number, newColOffset: number) => void;
  onDragStateChange?: (dragging: boolean) => void;
  dayColW: number;
  colIdx: number;
  totalCols: number;
  lane?: number;
  lanes?: number;
  imageUrl?: string;
}) {
  const height = Math.max(duration * HOUR_HEIGHT - 4, HOUR_HEIGHT * 0.6);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [dragging, setDragging] = useState(false);
  const tappedRef = useRef(true);
  // Long-press timer: fires the edit-time handler if the user holds the
  // block for ~450ms without dragging. Cancelled the moment a drag is
  // detected (so dragging never accidentally also opens the editor).
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const onLongPressRef = useRef(onLongPress);
  useEffect(() => { onLongPressRef.current = onLongPress; }, [onLongPress]);
  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Snap the visual offset back to 0 whenever the activity's actual position
  // changes (i.e., the drop landed in the data layer and the prop refreshed).
  // This keeps the block sitting where the user dropped it without a snap-back.
  useEffect(() => {
    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 8 }).start();
  }, [startH, colIdx]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      // Refuse to give up the responder once granted — keeps the parent
      // ScrollView (vertical) and the pager (horizontal) from stealing the drag.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: 0, y: 0 });
        pan.setValue({ x: 0, y: 0 });
        tappedRef.current = true;
        longPressFiredRef.current = false;
        onDragStateChange?.(true);
        // Start long-press timer
        cancelLongPress();
        longPressTimerRef.current = setTimeout(() => {
          longPressFiredRef.current = true;
          onLongPressRef.current?.();
        }, 450);
      },
      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4) {
          tappedRef.current = false;
          setDragging(true);
          cancelLongPress();
        }
        pan.setValue({ x: gs.dx, y: gs.dy });
      },
      onPanResponderRelease: (_, { dx, dy }) => {
        cancelLongPress();
        // Long-press already fired the editor — swallow the release so we
        // don't also trigger onTap or a phantom drop.
        if (longPressFiredRef.current) {
          longPressFiredRef.current = false;
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 7 }).start();
          setDragging(false);
          onDragStateChange?.(false);
          return;
        }
        if (tappedRef.current && Math.abs(dx) < 5 && Math.abs(dy) < 5) {
          // Treat as tap — snap back instantly and fire onTap
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 7 }).start();
          setDragging(false);
          onDragStateChange?.(false);
          onTap();
          return;
        }
        const colOffset = Math.round(dx / dayColW);
        const targetCol = Math.max(0, Math.min(totalCols - 1, colIdx + colOffset));
        // Snap to 30-min increments so small drags register
        const halfHourOffset = Math.round((dy / HOUR_HEIGHT) * 2) / 2;
        const newHour = Math.max(0, Math.min(23.5, startH + halfHourOffset));
        // Don't reset pan here — let the parent prop change re-anchor the block.
        // If the drop didn't move it (no startH/colIdx change), the useEffect won't
        // fire, so add a 600ms safety timer that snaps back if nothing happens.
        setTimeout(() => {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 7 }).start();
        }, 600);
        onDrop(activity.id, newHour, targetCol);
        setDragging(false);
        onDragStateChange?.(false);
      },
      onPanResponderTerminate: () => {
        cancelLongPress();
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 7 }).start();
        setDragging(false);
        onDragStateChange?.(false);
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        {
          position: 'absolute',
          top: startH * HOUR_HEIGHT + 2,
          // Side-by-side lanes for overlapping blocks
          left: 2 + (lane * (dayColW - 4)) / lanes,
          width: (dayColW - 4) / lanes - 1,
          height,
          backgroundColor: bgColor,
          borderRadius: 3,
          borderLeftWidth: 3,
          borderLeftColor: adjustBrightness(bgColor, -40),
          paddingHorizontal: 4, paddingVertical: 3,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: dragging ? 6 : isSelected ? 4 : 0 },
          shadowOpacity: dragging ? 0.4 : isSelected ? 0.25 : 0,
          shadowRadius: dragging ? 10 : isSelected ? 6 : 0,
          elevation: dragging ? 12 : isSelected ? 8 : 0,
          borderWidth: isSelected ? 2 : 0,
          borderColor: '#fff',
          zIndex: dragging ? 1000 : isSelected ? 100 : 1,
          opacity: dragging ? 0.9 : 1,
        },
        { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: dragging ? 1.05 : isSelected ? 1.03 : 1 }] },
      ]}
    >
      <View style={{ flex: 1, flexDirection: 'row', gap: 4 }} pointerEvents="box-none">
        {/* Thumbnail at left — only when block is tall enough to fit it. */}
        {imageUrl && height > 38 && (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: 28, height: 28, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.18)' }}
          />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ ...TextStyles.xs, color: '#fff', fontWeight: '700' }} numberOfLines={1}>{activity.name}</Text>
          {height > 35 && (
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.92)', fontWeight: '600' }} numberOfLines={1}>
              {activity.startTime}
            </Text>
          )}
          {height > 60 && activity.locationName && (
            <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }} numberOfLines={1}>
              {activity.locationName}
            </Text>
          )}
        </View>
        {isSelected && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: '#fff', borderRadius: 6, borderStyle: 'dashed' }} />
        )}
      </View>
    </Animated.View>
  );
}

/** Bottom sheet for the calendar's long-press → edit time / view details
 *  flow. Two text inputs (HH:MM 24h) for start/end, a Save button that
 *  fires `onSaveTime`, and a View Details escape hatch into the
 *  activity detail screen. */
function EditActivitySheet({ activity, imageUrl, onClose, onViewDetails, onSaveTime, onDelete }: {
  activity: any;
  imageUrl?: string;
  onClose: () => void;
  onViewDetails: () => void;
  onSaveTime: (start: string, end: string) => void;
  onDelete?: () => void;
}) {
  const colors = useThemeColors();
  const [startVal, setStartVal] = useState<string>(() => normalizeTimeInput(activity.startTime));
  const [endVal, setEndVal] = useState<string>(() => normalizeTimeInput(activity.endTime || activity.startTime));
  const valid = /^([01]?\d|2[0-3]):([0-5]\d)$/.test(startVal) && /^([01]?\d|2[0-3]):([0-5]\d)$/.test(endVal);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} />
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.cardBackground,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        paddingBottom: 40, paddingHorizontal: 20, paddingTop: 16,
      }}>
        <View style={{ alignItems: 'center', marginBottom: 14 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          {imageUrl && (
            <Image source={{ uri: imageUrl }} style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: colors.surface }} />
          )}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ ...TextStyles.subhead, color: colors.text }} numberOfLines={2}>{activity.name}</Text>
            <Text style={{ ...TextStyles.caption, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
              {activity.category}{activity.locationName ? ` · ${activity.locationName}` : ''}
            </Text>
          </View>
        </View>
        <Text style={{ ...TextStyles.caption, color: colors.textSecondary, marginBottom: 6, letterSpacing: 0.4 }}>
          Time (HH:MM, 24h)
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...TextStyles.xs, color: colors.textTertiary, marginBottom: 4 }}>Start</Text>
            <TextInput
              value={startVal}
              onChangeText={setStartVal}
              placeholder="09:00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 10,
                color: colors.text, fontSize: 16,
                backgroundColor: colors.surface,
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...TextStyles.xs, color: colors.textTertiary, marginBottom: 4 }}>End</Text>
            <TextInput
              value={endVal}
              onChangeText={setEndVal}
              placeholder="10:00"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                paddingHorizontal: 12, paddingVertical: 10,
                color: colors.text, fontSize: 16,
                backgroundColor: colors.surface,
              }}
            />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => valid && onSaveTime(startVal, endVal)}
            disabled={!valid}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 6, paddingVertical: 12, borderRadius: 12,
              backgroundColor: valid ? getActivityTypeColor(activity.category).primary : colors.border,
              opacity: valid ? 1 : 0.6,
            }}
          >
            <FontAwesome name="check" size={14} color="#fff" />
            <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>Save Time</Text>
          </Pressable>
          <Pressable
            onPress={onViewDetails}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
          >
            <FontAwesome name="info-circle" size={14} color={colors.textSecondary} />
            <Text style={{ ...TextStyles.bodyLgEm, color: colors.textSecondary }}>Details</Text>
          </Pressable>
        </View>
        {onDelete && (
          <Pressable
            onPress={() => {
              Alert.alert(
                'Remove activity?',
                `"${activity.name}" will be removed from this day.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: onDelete },
                ],
              );
            }}
            style={{
              marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 6, paddingVertical: 11, borderRadius: 12,
              borderWidth: 1, borderColor: 'rgba(239,68,68,0.45)',
            }}
          >
            <FontAwesome name="trash-o" size={14} color="#ef4444" />
            <Text style={{ ...TextStyles.body, color: '#ef4444', fontWeight: '600' }}>Remove from trip</Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}

/** Coerces messy time strings ("9:00 AM", "9:30 PM", "9", "21:30") to
 *  HH:MM 24-hour. Returns "" for unparseable input so the field starts
 *  empty rather than "NaN:NaN". */
function normalizeTimeInput(raw?: string): string {
  if (!raw) return '';
  const h = parseHour(raw);
  if (h == null) return '';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function MobileCalendarView({ days, selectedDayIndex, visibleDayCount = 3, onSelectActivity, onMoveActivity, onSelectDay, imageMap, onEditTime, onDeleteActivity }: {
  days: any[];
  selectedDayIndex: number;
  visibleDayCount?: 1 | 3 | 7;
  onSelectActivity?: (activity: any) => void;
  onMoveActivity?: (activityId: string, newHour: number, newDayIndex: number) => void;
  onSelectDay?: (index: number) => void;
  imageMap?: Record<string, string>;
  onEditTime?: (activityId: string, newStart: string, newEnd: string) => void;
  onDeleteActivity?: (activityId: string) => void;
}) {
  const colors = useThemeColors();
  const { width: SCREEN_W } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [editActivity, setEditActivity] = useState<any | null>(null);
  const [blockDragging, setBlockDragging] = useState(false);

  const VISIBLE_DAYS = Math.min(visibleDayCount, days.length);
  const GUTTER_W = 44;
  // For 1d / 3d, columns split the screen evenly. For 7d, columns use a
  // fixed wider width so each block stays readable; the day grid is then
  // wrapped in a horizontal ScrollView so the user can swipe through all
  // seven days. Same wider width also kicks in if the trip has more
  // days than the toggle (e.g. 14-day trip in 7d view) so the user can
  // page horizontally instead of seeing tiny clamped columns.
  const FIT_COL_W = (SCREEN_W - GUTTER_W - 8) / VISIBLE_DAYS;
  const SCROLLABLE = visibleDayCount === 7 || days.length > VISIBLE_DAYS;
  const DAY_COL_W = SCROLLABLE ? Math.max(FIT_COL_W, 110) : FIT_COL_W;

  // Day range start — syncs with parent selectedDayIndex
  const [rangeStart, setRangeStart] = useState(Math.max(0, selectedDayIndex - Math.floor(VISIBLE_DAYS / 2)));

  // Sync when parent day selector changes
  useEffect(() => {
    const newStart = visibleDayCount === 1 ? selectedDayIndex : Math.max(0, Math.min(days.length - VISIBLE_DAYS, selectedDayIndex - Math.floor(VISIBLE_DAYS / 2)));
    setRangeStart(newStart);
  }, [selectedDayIndex, visibleDayCount]);
  const visibleDays = days.slice(rangeStart, rangeStart + VISIBLE_DAYS);

  // Scroll to 8 AM on mount
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ y: 8 * HOUR_HEIGHT, animated: false }), 100);
  }, [rangeStart]);

  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  // Synced horizontal scroll between header and body so all 7 day
  // columns are reachable via swipe in 7d mode (and any time the trip
  // is longer than the visible range).
  const headerHScrollRef = useRef<ScrollView>(null);
  const bodyHScrollRef = useRef<ScrollView>(null);
  const totalDaysWidth = DAY_COL_W * VISIBLE_DAYS;

  return (
    <>
    {/* ── Day column headers ── */}
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
      <View style={{ width: GUTTER_W }} />
      <ScrollView
        ref={headerHScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={SCROLLABLE}
        onScroll={SCROLLABLE ? (e) => {
          bodyHScrollRef.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
        } : undefined}
        scrollEventThrottle={16}
        contentContainerStyle={{ width: totalDaysWidth }}
      >
        <View style={{ flexDirection: 'row' }}>
          {visibleDays.map((day, i) => (
            <View key={day.id} style={{ width: DAY_COL_W, paddingVertical: 6, alignItems: 'center', borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: colors.borderLight }}>
              <Text style={{ ...TextStyles.xs, color: colors.textTertiary }}>{day.dateLabel || day.dayLabel}</Text>
              <Text style={{ ...TextStyles.captionEm, color: colors.text }}>Day {day.dayNumber}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>

    {/* ── Time grid with multi-day columns ── */}
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      scrollEnabled={!blockDragging}
      {...({ delaysContentTouches: false, canCancelContentTouches: false } as any)}
    >
      <View style={{ flexDirection: 'row' }}>
        {/* ── Hour gutter ── */}
        <View style={{ width: GUTTER_W }}>
          {HOURS.map((hour) => {
            const label = hour === 0 ? '12a' : hour === 12 ? '12p' : hour < 12 ? `${hour}a` : `${hour - 12}p`;
            return (
              <View key={hour} style={{ height: HOUR_HEIGHT, justifyContent: 'flex-start', alignItems: 'flex-end', paddingRight: 4 }}>
                <Text style={{ ...TextStyles.xs, color: colors.textTertiary }}>{label}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Day columns (horizontally scrollable when 7d / overflow) ── */}
        <ScrollView
          ref={bodyHScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={SCROLLABLE && !blockDragging}
          onScroll={SCROLLABLE ? (e) => {
            headerHScrollRef.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
          } : undefined}
          scrollEventThrottle={16}
          contentContainerStyle={{ width: totalDaysWidth }}
        >
          <View style={{ flexDirection: 'row' }}>
        {visibleDays.map((day, colIdx) => {
          const dayIdx = rangeStart + colIdx;
          const rawActivities = day.timeGroups?.flatMap((g: any) => g.activities ?? []) ?? [];

          // Pre-compute each activity's startH so we can cap heights to the next
          // activity's start (prevents overlapping blocks when raw duration is long).
          const activityPositions = rawActivities.map((activity: any) => {
            const parsed = parseHour(activity.startTime);
            let startH: number;
            let displayTime = activity.startTime;
            if (parsed !== null) {
              startH = parsed;
            } else {
              const baseHour = TIME_OF_DAY_HOUR[activity.timeOfDay] ?? 9;
              const todGroup = day.timeGroups?.find((g: any) => g.timeOfDay === activity.timeOfDay);
              const groupIdx = Math.max(0, todGroup?.activities?.findIndex((a: any) => a.id === activity.id) ?? 0);
              startH = baseHour + Math.min(groupIdx * 1.5, 4);
              displayTime = formatHourLabel(startH);
            }
            return { activity, startH, displayTime };
          }).sort((a: any, b: any) => a.startH - b.startH);

          return (
            <View key={day.id} style={{ width: DAY_COL_W, position: 'relative', borderLeftWidth: 1, borderLeftColor: colors.borderLight + '40' }}>
              {/* Grid lines — every 3rd hour, subtle */}
              {HOURS.filter((h) => h % 3 === 0).map((hour) => (
                <View key={hour} style={{ position: 'absolute', top: hour * HOUR_HEIGHT, left: 0, right: 0, height: 1, backgroundColor: colors.borderLight + '60' }} />
              ))}

              {/* Current time line */}
              {currentHour >= 0 && currentHour <= 24 && (
                <View style={{ position: 'absolute', top: currentHour * HOUR_HEIGHT, left: 0, right: 0, height: 2, backgroundColor: colors.error, zIndex: 10 }}>
                  {colIdx === 0 && <View style={{ position: 'absolute', left: -3, top: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error }} />}
                </View>
              )}

              {/* Activity blocks */}
              {(() => {
                // Compute side-by-side lanes for overlapping blocks.
                // Dedupe by activity.id (and a name+startH fallback) so
                // the React `key` on the rendered CalendarBlock list
                // never collides — duplicates here came from the same
                // POI being listed in two slots of the same day in
                // trip_context.itinerary, which produced the
                // "two children with the same key" runtime warning.
                type Pos = { activity: any; startH: number; displayTime: string; duration: number; lane: number; lanes: number };
                const placed: Pos[] = [];
                const seenIds = new Set<string>();
                const seenNameStart = new Set<string>();
                activityPositions.forEach(({ activity, startH, displayTime }: any, idx: number) => {
                  const id = activity?.id != null ? String(activity.id) : '';
                  if (id && seenIds.has(id)) return;
                  const norm = (s: any) => (typeof s === 'string' ? s.trim().toLowerCase() : '');
                  const dupKey = `${norm(activity?.name)}|${startH.toFixed(2)}`;
                  if (dupKey !== '|0.00' && seenNameStart.has(dupKey)) return;
                  if (id) seenIds.add(id);
                  if (dupKey !== '|0.00') seenNameStart.add(dupKey);
                  const rawDuration = parseDuration(activity.startTime, activity.endTime);
                  const next = activityPositions[idx + 1];
                  const maxDuration = next ? Math.max(0.4, next.startH - startH) : rawDuration;
                  const duration = Math.min(rawDuration, maxDuration);
                  if (startH < 0 || startH > 23) return;
                  // Find lowest free lane (lane is occupied if any prior block overlaps this time range)
                  const overlapping = placed.filter((p) => p.startH < startH + duration && p.startH + p.duration > startH);
                  const usedLanes = new Set(overlapping.map((p) => p.lane));
                  let lane = 0;
                  while (usedLanes.has(lane)) lane++;
                  placed.push({ activity, startH, displayTime, duration, lane, lanes: 1 });
                });
                // Second pass: for each block, lanes = max lane count among its overlap cluster
                placed.forEach((p) => {
                  const cluster = placed.filter((q) => q.startH < p.startH + p.duration && q.startH + q.duration > p.startH);
                  p.lanes = Math.max(...cluster.map((c) => c.lane + 1));
                });
                return placed.map(({ activity, startH, displayTime, duration, lane, lanes }) => {
                  const bgColor = activity.category === 'flight'
                    ? '#0891b2' // teal — flights stand out from activities
                    : getActivityTypeColor(activity.category).primary;
                  const blockActivity = displayTime !== activity.startTime
                    ? { ...activity, startTime: displayTime }
                    : activity;
                  return (
                    <CalendarBlock
                      key={activity.id}
                      activity={blockActivity}
                      startH={startH}
                      duration={duration}
                      bgColor={bgColor}
                      isSelected={false}
                      dayColW={DAY_COL_W}
                      colIdx={colIdx}
                      totalCols={visibleDays.length}
                      lane={lane}
                      lanes={lanes}
                      imageUrl={imageMap?.[activity.id]}
                      onTap={() => onSelectActivity?.(activity)}
                      onLongPress={() => setEditActivity(activity)}
                      onDrop={(activityId, newHour, targetCol) => {
                        const targetDayIdx = rangeStart + targetCol;
                        onMoveActivity?.(activityId, newHour, targetDayIdx);
                      }}
                      onDragStateChange={setBlockDragging}
                    />
                  );
                });
              })()}

              {/* Spacer */}
              <View style={{ height: HOURS.length * HOUR_HEIGHT }} />
            </View>
          );
        })}
          </View>
        </ScrollView>
      </View>
    </ScrollView>

    {/* ── Edit Activity / Time Sheet ── */}
    {editActivity && (
      <EditActivitySheet
        activity={editActivity}
        imageUrl={imageMap?.[editActivity.id]}
        onClose={() => setEditActivity(null)}
        onViewDetails={() => { onSelectActivity?.(editActivity); setEditActivity(null); }}
        onSaveTime={(start, end) => {
          onEditTime?.(editActivity.id, start, end);
          setEditActivity(null);
        }}
        onDelete={onDeleteActivity ? () => {
          onDeleteActivity(editActivity.id);
          setEditActivity(null);
        } : undefined}
      />
    )}
    </>
  );
}

// ─── Skeleton Components ────────────────────────────────────

function SkeletonActivityCard() {
  const colors = useThemeColors();
  return (
    <View style={{ backgroundColor: colors.cardBackground, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <View style={{ height: 150, backgroundColor: colors.borderLight, position: 'relative' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <FontAwesome name="picture-o" size={28} color={colors.skeleton} />
        </View>
        <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
          <SkeletonBlock width={50} height={10} />
        </View>
        <View style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.9)' }} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
          locations={[0, 0.5, 1]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%', justifyContent: 'flex-end', padding: 12 }}
        >
          <SkeletonBlock width="65%" height={15} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
          <SkeletonBlock width="45%" height={11} style={{ backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 4 }} />
        </LinearGradient>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <FontAwesome name="clock-o" size={11} color={colors.border} />
          <SkeletonBlock width={60} height={12} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <FontAwesome name="star" size={11} color="#fde68a" />
            <SkeletonBlock width={22} height={12} />
          </View>
          <SkeletonBlock width={40} height={14} />
        </View>
      </View>
    </View>
  );
}

function SkeletonTimeSection({ icon }: { icon: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View
        style={{ backgroundColor: ITINERARY_COLORS.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <FontAwesome name={icon as any} size={18} color="#fff" />
          <View>
            <SkeletonBlock width={70} height={14} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <SkeletonBlock width={90} height={11} style={{ backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 4 }} />
          </View>
        </View>
        <FontAwesome name="chevron-down" size={14} color="rgba(255,255,255,0.5)" />
      </View>
      <View style={{ marginTop: 10, gap: 10 }}>
        <SkeletonActivityCard />
        <SkeletonActivityCard />
      </View>
    </View>
  );
}

function ItinerarySkeleton() {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('itinerary');
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingVertical: 6, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 8 }}>
          <View style={{ backgroundColor: ACCENT, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, minWidth: 56, alignItems: 'center' }}>
            <SkeletonBlock width={24} height={9} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <SkeletonBlock width={40} height={11} style={{ backgroundColor: 'rgba(255,255,255,0.3)', marginTop: 1 }} />
          </View>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, minWidth: 56, alignItems: 'center', backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border }}>
              <SkeletonBlock width={24} height={9} />
              <SkeletonBlock width={40} height={11} style={{ marginTop: 1 }} />
            </View>
          ))}
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 32 }}>
        <SkeletonTimeSection icon="sun-o" />
        <SkeletonTimeSection icon="sun-o" />
        <SkeletonTimeSection icon="moon-o" />
      </ScrollView>
    </View>
  );
}

// ─── FlightSection (inline) ─────────────────────────────────

function FlightSection({ flight, collapsed }: { flight: FlightDetail; collapsed?: boolean }) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('itinerary');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (collapsed !== undefined) setExpanded(!collapsed);
  }, [collapsed]);

  const label = flight.type === 'arrival' ? 'Arrival Flight' : 'Return Flight';

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Header */}
      <Pressable onPress={() => setExpanded(!expanded)}>
        <View
          style={{
            backgroundColor: ACCENT,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <FontAwesome name="plane" size={18} color="#fff" />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ ...TextStyles.bodyXlEm, color: '#fff' }}>{label}</Text>
                {flight.isBooked && (
                  <View style={{ backgroundColor: colors.success, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                    <Text style={{ ...TextStyles.smEm, color: '#fff' }}>Booked</Text>
                  </View>
                )}
              </View>
              <Text style={{ ...TextStyles.caption, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>
                Flight {flight.flightNumber} &bull; {flight.departureTime}
              </Text>
            </View>
          </View>
          <FontAwesome
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="#fff"
          />
        </View>
      </Pressable>

      {/* Expandable details */}
      {expanded && (
        <View style={{
          marginTop: 8,
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.info,
          overflow: 'hidden',
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
        }}>
          {/* Flight Route Visualization */}
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Departure */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginBottom: 2 }}>Departure</Text>
                <Text style={{ ...TextStyles.headline, color: ACCENT }}>{flight.originIata}</Text>
                <Text style={{ ...TextStyles.bodyLgEm, color: colors.text, marginTop: 4 }}>{flight.departureTime}</Text>
                <Text style={{ ...TextStyles.sm, color: colors.textTertiary, marginTop: 2 }}>{flight.departureTerminal}</Text>
                <Text style={{ ...TextStyles.sm, color: colors.textTertiary }}>Gate {flight.gate}</Text>
                <Text style={{ ...TextStyles.sm, color: colors.textTertiary }}>Boarding: {flight.boardingTime}</Text>
              </View>

              {/* Duration line */}
              <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
                <View style={{ width: '100%', position: 'relative', alignItems: 'center' }}>
                  <View style={{ width: '100%', height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border }} />
                  <View style={{
                    position: 'absolute',
                    top: -10,
                    backgroundColor: ACCENT,
                    borderRadius: 10,
                    width: 20,
                    height: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <FontAwesome name="plane" size={10} color="#fff" />
                  </View>
                </View>
                <Text style={{ ...TextStyles.caption, color: colors.textSecondary, marginTop: 12 }}>{flight.duration}</Text>
                <Text style={{ ...TextStyles.smEm, color: colors.success }}>Direct</Text>
              </View>

              {/* Arrival */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginBottom: 2 }}>Arrival</Text>
                <Text style={{ ...TextStyles.headline, color: ACCENT }}>{flight.destIata}</Text>
                <Text style={{ ...TextStyles.bodyLgEm, color: colors.text, marginTop: 4 }}>{flight.arrivalTime}</Text>
                <Text style={{ ...TextStyles.sm, color: colors.textTertiary, marginTop: 2 }}>{flight.arrivalTerminal}</Text>
              </View>
            </View>

            {/* Airline & Status row */}
            <View style={{
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: colors.borderLight,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Text style={{ ...TextStyles.bodyEm, color: colors.text }}>{flight.airline}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ ...TextStyles.caption, color: colors.textSecondary }}>Check-in: {flight.boardingTime}</Text>
                <View style={{ backgroundColor: ACCENT + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ ...TextStyles.smEm, color: ACCENT }}>{flight.status}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Details Grid */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
            <View style={{ paddingTop: 12 }}>
              {[
                { left: { label: 'Flight', value: flight.flightNumber }, right: { label: 'Duration', value: flight.duration } },
                { left: { label: 'Aircraft', value: flight.aircraft }, right: { label: 'Class', value: flight.cabinClass } },
                { left: { label: 'Seats', value: flight.seats }, right: { label: 'Baggage', value: flight.baggage } },
                { left: { label: 'Meal', value: flight.meal }, right: { label: 'Wi-Fi', value: flight.wifi ? 'Available' : 'N/A' } },
              ].map((row, i) => (
                <View key={i} style={{ flexDirection: 'row', marginBottom: 6 }}>
                  <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingRight: 12 }}>
                    <Text style={{ ...TextStyles.caption, color: colors.textSecondary, marginRight: 6 }}>{row.left.label}</Text>
                    <Text style={{ ...TextStyles.captionEm, color: colors.text, flexShrink: 1, textAlign: 'right' }}>{row.left.value}</Text>
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 12 }}>
                    <Text style={{ ...TextStyles.caption, color: colors.textSecondary, marginRight: 6 }}>{row.right.label}</Text>
                    <Text style={{ ...TextStyles.captionEm, color: colors.text, flexShrink: 1, textAlign: 'right' }}>{row.right.value}</Text>
                  </View>
                </View>
              ))}
              {/* Confirmation */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                <Text style={{ ...TextStyles.caption, color: colors.textSecondary }}>Confirmation</Text>
                <Text style={{ ...TextStyles.mono, color: ACCENT }}>{flight.confirmation}</Text>
              </View>
            </View>

            {/* Booking row */}
            <View style={{
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: colors.borderLight,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <View>
                <Text style={{ ...TextStyles.sm, color: colors.textSecondary }}>Per traveler</Text>
                <Text style={{ ...TextStyles.title, color: ACCENT }}>${flight.pricePerTraveler}</Text>
                <Text style={{ ...TextStyles.sm, color: colors.textTertiary }}>Total: ${flight.totalPrice}</Text>
              </View>
              <View style={{
                backgroundColor: flight.isBooked ? '#10b981' : ACCENT,
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}>
                <FontAwesome name={flight.isBooked ? 'check' : 'plane'} size={12} color="#fff" />
                <Text style={{ ...TextStyles.bodyEm, color: '#fff' }}>
                  {flight.isBooked ? 'Flight Booked' : 'Book Flight'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── HotelSection (inline) ──────────────────────────────────

function HotelSection({ hotel, label, collapsed }: { hotel: HotelDetail; label: string; collapsed?: boolean }) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('itinerary');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (collapsed !== undefined) setExpanded(!collapsed);
  }, [collapsed]);

  const roomPrice = hotel.rooms?.find((r: any) => r.isSelected)?.pricePerNight ?? hotel.rooms?.[0]?.pricePerNight ?? (hotel as any).price ?? (hotel as any).price_per_night ?? 0;
  const isConfirmed = hotel.confirmationNumber && hotel.isBooked;

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Header */}
      <Pressable onPress={() => setExpanded(!expanded)}>
        <View
          style={{
            backgroundColor: ACCENT,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <FontAwesome name="building" size={16} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={{ ...TextStyles.bodyXlEm, color: '#fff' }}>{hotel.name}</Text>
              <Text style={{ ...TextStyles.caption, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>
                {'★'} {hotel.rating} &bull; ${roomPrice}/night &bull; {label}
              </Text>
            </View>
          </View>
          <FontAwesome
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="#fff"
          />
        </View>
      </Pressable>

      {/* Expandable details */}
      {expanded && (
        <View style={{
          marginTop: 8,
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 2,
        }}>
          <View style={{ padding: 16 }}>
            {/* Status badges */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <View style={{
                backgroundColor: isConfirmed ? ACCENT : '#60a5fa',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 10,
              }}>
                <Text style={{ ...TextStyles.smEm, color: '#fff' }}>
                  {isConfirmed ? 'Confirmed' : 'Selected'}
                </Text>
              </View>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                backgroundColor: '#dbeafe',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
              }}>
                <FontAwesome name="star" size={9} color={ACCENT} />
                <Text style={{ ...TextStyles.smEm, color: ACCENT }}>
                  {hotel.rating}/5
                </Text>
              </View>
              {hotel.starRating > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                  {Array.from({ length: hotel.starRating }).map((_, i) => (
                    <FontAwesome key={i} name="star" size={10} color="#f59e0b" />
                  ))}
                </View>
              )}
            </View>

            {/* Hotel name */}
            <Text style={{ ...TextStyles.title, color: colors.text, marginBottom: 4 }}>{hotel.name}</Text>

            {/* Check-in / Check-out times */}
            <Text style={{ ...TextStyles.caption, color: colors.textSecondary, marginBottom: 12 }}>
              Check-in: {hotel.checkInTime} &bull; Check-out: {hotel.checkOutTime}
            </Text>

            {/* Address */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 6,
              backgroundColor: colors.surface,
              padding: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.borderLight,
              marginBottom: 12,
            }}>
              <FontAwesome name="map-marker" size={14} color="#8b6f47" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...TextStyles.body, color: colors.text }}>{hotel.address}</Text>
                {hotel.neighborhood && (
                  <Text style={{ ...TextStyles.sm, color: ACCENT, marginTop: 2 }}>{hotel.neighborhood}</Text>
                )}
              </View>
            </View>

            {/* Room info */}
            {hotel.rooms?.length > 0 && (() => {
              const selectedRoom = hotel.rooms.find((r: any) => r.isSelected) ?? hotel.rooms[0];
              return (
                <View style={{
                  backgroundColor: colors.surface,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <FontAwesome name="bed" size={12} color={ACCENT} />
                      <Text style={{ ...TextStyles.bodyEm, color: colors.text }}>{selectedRoom.name}</Text>
                    </View>
                    <Text style={{ ...TextStyles.bodyXlEm, color: ACCENT }}>${selectedRoom.pricePerNight}/nt</Text>
                  </View>
                  {selectedRoom.beds && (
                    <Text style={{ ...TextStyles.caption, color: colors.textSecondary, marginBottom: 2 }}>{selectedRoom.beds}</Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {selectedRoom.maxGuests && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <FontAwesome name="user" size={10} color={colors.textSecondary} />
                        <Text style={{ ...TextStyles.sm, color: colors.textSecondary }}>{selectedRoom.maxGuests} guests</Text>
                      </View>
                    )}
                    {selectedRoom.size && (
                      <Text style={{ ...TextStyles.sm, color: colors.textSecondary }}>{selectedRoom.size}</Text>
                    )}
                  </View>
                </View>
              );
            })()}

            {/* Amenities */}
            {(hotel.amenities?.length ?? 0) > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {(hotel.amenities ?? []).map((amenity) => (
                  <View key={amenity} style={{
                    backgroundColor: colors.borderLight,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}>
                    <Text style={{ ...TextStyles.sm, color: colors.textSecondary }}>{amenity}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Confirmation */}
            {isConfirmed && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#ecfdf5',
                padding: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#a7f3d0',
              }}>
                <FontAwesome name="check-circle" size={14} color="#10b981" />
                <View>
                  <Text style={{ ...TextStyles.xs, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5 }}>Confirmation</Text>
                  <Text style={{ ...TextStyles.mono, color: '#047857' }}>{hotel.confirmationNumber}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── CheckoutSection (inline) ───────────────────────────────

function CheckoutSection({ hotelName, hotelAddress, checkOutTime, collapsed }: {
  hotelName: string;
  hotelAddress: string;
  checkOutTime: string;
  collapsed?: boolean;
}) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('itinerary');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (collapsed !== undefined) setExpanded(!collapsed);
  }, [collapsed]);

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Header */}
      <Pressable onPress={() => setExpanded(!expanded)}>
        <View
          style={{
            backgroundColor: ACCENT,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <FontAwesome name="sign-out" size={18} color="#fff" />
            <View>
              <Text style={{ ...TextStyles.bodyXlEm, color: '#fff' }}>Check-out</Text>
              <Text style={{ ...TextStyles.caption, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>
                {checkOutTime} &bull; {hotelName}
              </Text>
            </View>
          </View>
          <FontAwesome
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="#fff"
          />
        </View>
      </Pressable>

      {/* Expandable details */}
      {expanded && (
        <View style={{
          marginTop: 8,
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          padding: 16,
          gap: 12,
        }}>
          {/* Checkout time */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: '#fff7ed',
            padding: 12,
            borderRadius: 12,
          }}>
            <FontAwesome name="clock-o" size={16} color="#f97316" />
            <View>
              <Text style={{ ...TextStyles.bodyXlEm, color: colors.text }}>Check-out by {checkOutTime}</Text>
              <Text style={{ ...TextStyles.caption, color: colors.textSecondary, marginTop: 2 }}>Late checkout may incur additional charges</Text>
            </View>
          </View>

          {/* Hotel info */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: colors.surface,
            padding: 12,
            borderRadius: 12,
          }}>
            <FontAwesome name="building" size={16} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...TextStyles.bodyXl, color: colors.text }}>{hotelName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <FontAwesome name="map-marker" size={10} color="#9ca3af" />
                <Text style={{ ...TextStyles.caption, color: colors.textSecondary }}>{hotelAddress}</Text>
              </View>
            </View>
          </View>

          {/* Reminders */}
          <View>
            <Text style={{ ...TextStyles.bodyLgEm, color: colors.text, marginBottom: 8 }}>Reminders</Text>
            <View style={{ gap: 6 }}>
              <ReminderRow icon="key" text="Return room keys to front desk" />
              <ReminderRow icon="exclamation-circle" text="Check minibar charges before leaving" />
              <ReminderRow icon="car" text="Arrange transportation to next destination" />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function ReminderRow({ icon, text }: { icon: string; text: string }) {
  const colors = useThemeColors();
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#fffbeb',
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#fef3c7',
    }}>
      <FontAwesome name={icon as any} size={13} color="#d97706" />
      <Text style={{ ...TextStyles.body, color: colors.text, flex: 1 }}>{text}</Text>
    </View>
  );
}

// ─── Browse/Add Constants ───────────────────────────────────

const ADD_CATEGORIES = ['All', 'Tours', 'Museums', 'Restaurants', 'Sightseeing', 'Nightlife'];


// ─── BrowseActivityPanel ────────────────────────────────────

function BrowseActivityPanel({
  timeOfDay,
  items,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  favorites,
  onToggleFavorite,
  onAdd,
  onClose,
}: {
  timeOfDay: string;
  items: DiscoverItem[];
  search: string;
  onSearchChange: (val: string) => void;
  category: string;
  onCategoryChange: (val: string) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onAdd: (item: DiscoverItem) => void;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('itinerary');
  const label = timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1);

  return (
    <View style={{
      marginBottom: 12,
      backgroundColor: colors.cardBackground,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: ACCENT,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <FontAwesome name="compass" size={13} color="rgba(255,255,255,0.8)" />
          <Text style={{ ...TextStyles.bodyEm, color: '#fff' }}>
            Add to {label}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={8}>
          <FontAwesome name="times" size={13} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </View>

      {/* Search bar */}
      <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 12,
          height: 36,
        }}>
          <FontAwesome name="search" size={12} color="#9ca3af" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search activities, tours, restaurants..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={onSearchChange}
            style={{
              flex: 1,
              ...TextStyles.body,
              color: colors.text,
              padding: 0,
            }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => onSearchChange('')} hitSlop={6}>
              <FontAwesome name="times-circle" size={14} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, gap: 6 }}
      >
        {ADD_CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => onCategoryChange(cat)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 14,
              backgroundColor: category === cat ? ACCENT : colors.borderLight,
              borderWidth: 1,
              borderColor: category === cat ? ACCENT : colors.border,
            }}
          >
            <Text style={{
              ...(category === cat ? TextStyles.captionEm : TextStyles.caption),
              color: category === cat ? '#fff' : colors.textSecondary,
            }}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Results list */}
      <View style={{ borderTopWidth: 1, borderTopColor: colors.borderLight }}>
        <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ padding: 12, gap: 10 }}>
          {items.length > 0 ? (
            items.map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: 'row',
                  backgroundColor: colors.cardBackground,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: 'hidden',
                }}
              >
                {/* Image */}
                <Image
                  source={{ uri: item.images?.[0] }}
                  style={{ width: 80, height: 80, backgroundColor: colors.borderLight }}
                  resizeMode="cover"
                />
                {/* Details */}
                <View style={{ flex: 1, padding: 10, justifyContent: 'center' }}>
                  <Text style={{ ...TextStyles.bodyLgEm, color: colors.text }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.category && (
                    <Text style={{ ...TextStyles.sm, color: colors.textSecondary, marginTop: 2 }}>
                      {item.category}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <FontAwesome name="star" size={10} color="#f59e0b" />
                      <Text style={{ ...TextStyles.captionEm, color: colors.text }}>
                        {item.rating}
                      </Text>
                    </View>
                    {item.price && (
                      <Text style={{ ...TextStyles.captionEm, color: ACCENT }}>
                        {item.price}
                      </Text>
                    )}
                  </View>
                </View>
                {/* Action buttons */}
                <View style={{ justifyContent: 'center', alignItems: 'center', paddingRight: 10, gap: 8 }}>
                  <Pressable onPress={() => onToggleFavorite(item.id)} hitSlop={6}>
                    <FontAwesome
                      name={favorites.includes(item.id) ? 'heart' : 'heart-o'}
                      size={16}
                      color={favorites.includes(item.id) ? '#ef4444' : colors.border}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => onAdd(item)}
                    style={{
                      backgroundColor: ACCENT,
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ ...TextStyles.captionEm, color: '#fff' }}>Add</Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <FontAwesome name="search" size={24} color={colors.border} />
              <Text style={{ ...TextStyles.body, color: colors.textSecondary, marginTop: 8 }}>No results match your search</Text>
              <Pressable
                onPress={() => { onSearchChange(''); onCategoryChange('All'); }}
                style={{ marginTop: 6 }}
              >
                <Text style={{ ...TextStyles.caption, color: ACCENT }}>Clear filters</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────


// ─── View Toggle (single icon button) ─────────────────────────
function ViewToggle({ mode, onToggle, accent }: { mode: 'glance' | 'detailed'; onToggle: (m: 'glance' | 'detailed') => void; accent: string }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => onToggle(mode === 'glance' ? 'detailed' : 'glance')}
      style={{
        width: 32, height: 32, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: mode === 'glance' ? accent : colors.cardBackground,
        borderWidth: mode === 'glance' ? 0 : 1,
        borderColor: colors.border,
        marginLeft: 4,
      }}
    >
      <FontAwesome
        name="list-ul"
        size={13}
        color={mode === 'glance' ? '#fff' : colors.textSecondary}
      />
    </Pressable>
  );
}



// ─── Add Activity Panel (self-contained state to avoid parent re-renders) ───
function AddActivityPanel({ dayIndex, timeOfDay, days, onAddActivity, discoverPool = [] }: {
  dayIndex: number; timeOfDay: string;
  days: ItineraryDayViewModel[];
  onAddActivity: (dayIndex: number, timeOfDay: string, name: string, category: string) => void;
  discoverPool?: any[];
}) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return discoverPool.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    ).slice(0, 4);
  }, [query]);

  const handleQuickFill = useCallback((filter: string | null) => {
    const allIds = days.flatMap((d) => d.timeGroups.flatMap((g) => g.activities.map((a) => a.id)));
    const item = pickRandomActivity(filter, allIds, discoverPool);
    console.log(`[handleQuickFill] filter="${filter}" discoverPool=${discoverPool.length} picked="${item?.name ?? 'NONE'}"`);
    if (item) {
      onAddActivity(dayIndex, timeOfDay, item.name, item.category || 'activity');
    } else {
      console.warn(`[handleQuickFill] no item picked — discoverPool length=${discoverPool.length}, filter="${filter}"`);
    }
    setOpen(false);
    setQuery('');
  }, [days, dayIndex, timeOfDay, onAddActivity, discoverPool]);

  if (!open) {
    return (
      <Pressable
        onPress={() => { console.log(`[AddActivityPanel] + Add tapped — opening panel for day=${dayIndex} tod=${timeOfDay}`); setOpen(true); }}
        hitSlop={10}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 4,
          alignSelf: 'flex-start', marginTop: 6,
          paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
          borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface,
        }}
      >
        <FontAwesome name="plus" size={8} color={colors.textTertiary} />
        <Text style={{ ...TextStyles.xs, color: colors.textTertiary }}>Add</Text>
      </Pressable>
    );
  }

  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        {QUICK_FILL_CATEGORIES.map((cat) => (
          <Pressable key={cat.label}
            onPress={() => handleQuickFill(cat.filter)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: colors.surface }}>
            <Text style={{ ...TextStyles.sm }}>{cat.icon}</Text>
            <Text style={{ ...TextStyles.xs, color: colors.textTertiary }}>{cat.label}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => { setOpen(false); setQuery(''); }} hitSlop={6}
          style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.1)' }}>
          <FontAwesome name="times" size={9} color="#ef4444" />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 10, height: 32, borderWidth: 1, borderColor: colors.borderLight }}>
        <FontAwesome name="search" size={10} color={colors.textTertiary} />
        <TextInput autoFocus value={query} onChangeText={setQuery} placeholder="Search places..." placeholderTextColor={colors.textTertiary}
          style={{ flex: 1, ...TextStyles.body, color: colors.text, paddingVertical: 0 }} />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')}><FontAwesome name="times-circle" size={13} color={colors.textTertiary} /></Pressable>
        )}
      </View>
      {results.map((item) => (
        <Pressable key={item.id} onPress={() => { onAddActivity(dayIndex, timeOfDay, item.name, item.category || 'activity'); setOpen(false); setQuery(''); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 4 }}>
          <FontAwesome name="map-marker" size={10} color={colors.textTertiary} />
          <Text numberOfLines={1} style={{ ...TextStyles.body, color: colors.text, flex: 1 }}>{item.name}</Text>
          <Text style={{ ...TextStyles.xs, color: colors.textTertiary }}>{item.category}</Text>
        </Pressable>
      ))}
      {query.length >= 2 && results.length === 0 && (
        <Text style={{ ...TextStyles.caption, color: colors.textTertiary, fontStyle: 'italic', paddingVertical: 6, paddingHorizontal: 4 }}>No results</Text>
      )}
    </View>
  );
}

// ─── Inline Time Picker — horizontal scrollable time slots ───
function InlineTimePicker({ currentTime, timeOfDay, onSelect, onClose }: {
  currentTime: string | null;
  timeOfDay: string;
  onSelect: (time: string) => void;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const startH = TOD_START_HOURS[timeOfDay] ?? 6;
  const endH = TOD_END_HOURS[timeOfDay] ?? 24;
  const slots: string[] = [];
  for (let h = startH; h < endH; h++) {
    slots.push(formatHourToTime(h));
    slots.push(formatHourToTime(h + 0.5));
  }

  return (
    <View style={{ marginTop: 4, marginBottom: 4 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
      >
        {slots.map((time) => {
          const isSelected = time === currentTime;
          return (
            <Pressable
              key={time}
              onPress={() => { onSelect(time); onClose(); }}
              style={{
                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                backgroundColor: isSelected ? '#c8a96a' : colors.surface,
                borderWidth: 1,
                borderColor: isSelected ? '#c8a96a' : colors.borderLight,
              }}
            >
              <Text style={{
                ...(isSelected ? TextStyles.captionEm : TextStyles.caption),
                color: isSelected ? '#fff' : colors.text,
                fontVariant: ['tabular-nums'],
              }}>
                {time}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Activity Row — self-contained to avoid parent re-renders ───
function GlanceActivityRow({ activity, dayIndex, timeOfDay, drag, isActive, onRemove, onRegenerate, onUpdateTime, onPress }: {
  activity: ActivityViewModel;
  dayIndex: number;
  timeOfDay: string;
  drag: () => void;
  isActive: boolean;
  onRemove: (dayIndex: number, activityId: string) => void;
  onRegenerate: (dayIndex: number, activityId: string) => void;
  onUpdateTime: (dayIndex: number, activityId: string, time: string) => void;
  onPress: (activityId: string) => void;
}) {
  const colors = useThemeColors();
  const [editingTime, setEditingTime] = useState(false);
  const catColor = getActivityTypeColor(activity.category);
  const iconName = ACTIVITY_TYPE_ICONS[activity.category] || ACTIVITY_TYPE_ICONS.default;

  return (
    <>
      <ScaleDecorator>
        <Pressable onPress={() => onPress(activity.id)} style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          paddingVertical: 5,
          backgroundColor: isActive ? 'rgba(200,169,106,0.12)' : 'transparent',
          borderRadius: 8, marginHorizontal: -4, paddingHorizontal: 4,
        }}>
          <Pressable onLongPress={drag} delayLongPress={200} disabled={isActive} hitSlop={8}
            style={{ opacity: isActive ? 0.7 : 0.25, paddingVertical: 6, paddingRight: 4 }}>
            <View style={{ gap: 2 }}>
              {[0, 1, 2].map((r) => (
                <View key={r} style={{ flexDirection: 'row', gap: 2 }}>
                  <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: isActive ? '#c8a96a' : colors.textSecondary }} />
                  <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: isActive ? '#c8a96a' : colors.textSecondary }} />
                </View>
              ))}
            </View>
          </Pressable>
          <FontAwesome name={iconName as any} size={10} color={catColor.primary} />
          <Text numberOfLines={1} style={{ ...TextStyles.bodyLg, color: colors.text, flex: 1 }}>
            {activity.name}
          </Text>
          <Pressable onPress={() => setEditingTime(!editingTime)} hitSlop={4}
            style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: editingTime ? 'rgba(200,169,106,0.15)' : 'transparent' }}>
            <Text style={{ ...(editingTime ? TextStyles.xs : TextStyles.xs), fontVariant: ['tabular-nums'], color: editingTime ? '#c8a96a' : colors.textTertiary }}>
              {activity.startTime || 'Set time'}
            </Text>
          </Pressable>
          <Pressable onPress={() => onRegenerate(dayIndex, activity.id)} hitSlop={6}
            style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(200,169,106,0.1)' }}>
            <FontAwesome name="refresh" size={8} color="#c8a96a" />
          </Pressable>
          <Pressable onPress={() => onRemove(dayIndex, activity.id)} hitSlop={6}
            style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.1)' }}>
            <FontAwesome name="times" size={9} color="#ef4444" />
          </Pressable>
        </Pressable>
      </ScaleDecorator>
      {editingTime && (
        <InlineTimePicker currentTime={activity.startTime} timeOfDay={timeOfDay}
          onSelect={(time) => onUpdateTime(dayIndex, activity.id, time)} onClose={() => setEditingTime(false)} />
      )}
    </>
  );
}

// ─── Glance View: swipeable day cards with add/remove/regenerate ───
function GlancePager({
  days, selectedDayIndex, onSelectDay, arrivalFlightNumber, returnFlightNumber,
  onRemoveActivity, onRegenerateActivity, onAddActivity, onReorderDay, onUpdateTime, onActivityPress, discoverPool = [],
  sunrise, timeFormat, toggleTimeFormat,
}: {
  days: ItineraryDayViewModel[];
  selectedDayIndex: number;
  onSelectDay: (i: number) => void;
  arrivalFlightNumber: string | null;
  returnFlightNumber: string | null;
  onRemoveActivity: (dayIndex: number, activityId: string) => void;
  onRegenerateActivity: (dayIndex: number, activityId: string) => void;
  onAddActivity: (dayIndex: number, timeOfDay: string, name: string, category: string) => void;
  onReorderDay: (dayIndex: number, reorderedActivities: ActivityViewModel[]) => void;
  onUpdateTime: (dayIndex: number, activityId: string, newTime: string) => void;
  onActivityPress: (activityId: string) => void;
  discoverPool?: any[];
  sunrise?: { sunrise?: string; sunset?: string; golden_hour?: string } | null;
  timeFormat: TimeFormat;
  toggleTimeFormat: () => void;
}) {
  const colors = useThemeColors();
  const { width: screenW } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const isScrolling = useRef(false);
  // `timeFormat` + `toggleTimeFormat` are now lifted to ItineraryScreen
  // and passed as props so the header 12h/24h button and the in-list
  // section labels share a single source of truth.
  // Tracks the last day the FlatList settled on, so the effect below can
  // distinguish "user swiped" (no scroll needed) from "user tapped DaySelector"
  // (scroll required). Without this we re-snap to the already-visible page
  // every swipe, which reads as a janky/sluggish animation.
  const visibleDayIndex = useRef(selectedDayIndex);

  // Only scroll on EXTERNAL day changes (e.g. DaySelector tap), not when the
  // change came from a swipe that already landed us on the right page.
  useEffect(() => {
    if (isScrolling.current) return;
    if (visibleDayIndex.current === selectedDayIndex) return;
    flatListRef.current?.scrollToIndex({ index: selectedDayIndex, animated: true });
    visibleDayIndex.current = selectedDayIndex;
  }, [selectedDayIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      const idx = viewableItems[0].index;
      visibleDayIndex.current = idx;
      onSelectDay(idx);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const renderDay = useCallback(({ item: day, index: i }: { item: ItineraryDayViewModel; index: number }) => {
    const isFirstDay = i === 0;
    const isLastDay = i === days.length - 1;

    // Flat list of real activities only — no placeholders.
    // Dedupe by id (and a name+startTime fallback), then sort
    // chronologically within each time-of-day group so the list reads
    // in order (was previously appearing in insertion order, which
    // mixed up activities the user added after generation).
    const allTods: Array<'morning' | 'afternoon' | 'evening' | 'latenight'> = ['morning', 'afternoon', 'evening', 'latenight'];
    const activeTods = new Set(day.timeGroups.map((g) => g.timeOfDay));
    const todOrder: Record<string, number> = { morning: 0, afternoon: 1, evening: 2, latenight: 3 };
    const flatItemsRaw = day.timeGroups.flatMap((g) => g.activities);
    const seenIds = new Set<string>();
    const seenNameTime = new Set<string>();
    const deduped = flatItemsRaw.filter((a: any) => {
      const id = a?.id != null ? String(a.id) : '';
      if (id && seenIds.has(id)) return false;
      const norm = (s: any) => (typeof s === 'string' ? s.trim().toLowerCase() : '');
      const dupKey = `${norm(a?.name)}|${norm(a?.startTime)}`;
      if (dupKey !== '|' && seenNameTime.has(dupKey)) return false;
      if (id) seenIds.add(id);
      if (dupKey !== '|') seenNameTime.add(dupKey);
      return true;
    });
    const flatItems = [...deduped].sort((a: any, b: any) => {
      const todA = todOrder[a.timeOfDay] ?? 99;
      const todB = todOrder[b.timeOfDay] ?? 99;
      if (todA !== todB) return todA - todB;
      const ha = parseHour(a.startTime) ?? 99;
      const hb = parseHour(b.startTime) ?? 99;
      return ha - hb;
    });

    const headerFlags = flatItems.map((a, idx) => {
      const prev = idx > 0 ? flatItems[idx - 1] : null;
      return a.timeOfDay !== prev?.timeOfDay;
    });
    const lastInGroupFlags = flatItems.map((a, idx) => {
      const next = idx < flatItems.length - 1 ? flatItems[idx + 1] : null;
      return a.timeOfDay !== next?.timeOfDay;
    });

    // Empty groups — shown statically in header/footer
    const emptyTodsBefore: string[] = [];
    const emptyTodsAfter: string[] = [];
    const firstActiveTodIdx = allTods.findIndex((t) => activeTods.has(t));
    const lastActiveTodIdx = allTods.length - 1 - [...allTods].reverse().findIndex((t) => activeTods.has(t));
    for (let ti = 0; ti < allTods.length; ti++) {
      if (!activeTods.has(allTods[ti])) {
        if (firstActiveTodIdx < 0 || ti < firstActiveTodIdx) emptyTodsBefore.push(allTods[ti]);
        else if (ti > lastActiveTodIdx) emptyTodsAfter.push(allTods[ti]);
      }
    }

    const sunriseTime = formatClockTime(sunrise?.sunrise, timeFormat);
    const sunsetTime = formatClockTime(sunrise?.sunset, timeFormat);
    // Returns the sun-time inline suffix for a given time-of-day section.
    const sunSuffixFor = (tod: string): { emoji: string; time: string } | null => {
      if (tod === 'morning' && sunriseTime) return { emoji: '🌅', time: sunriseTime };
      if (tod === 'evening' && sunsetTime) return { emoji: '🌇', time: sunsetTime };
      return null;
    };

    const listHeader = (
      <View>
        <View style={{ paddingHorizontal: 20, paddingTop: 14, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Text style={{ ...TextStyles.xs, letterSpacing: 2.5, textTransform: 'uppercase', color: '#c8a96a', marginBottom: 2 }}>
                {day.dateLabel}
              </Text>
              <Text style={{ ...TextStyles.headline, color: colors.text }}>
                {day.dayLabel}
              </Text>
            </View>
            <Text style={{ ...TextStyles.caption, color: colors.textSecondary }}>
              {flatItems.length} {flatItems.length === 1 ? 'activity' : 'activities'}
            </Text>
          </View>
        </View>
        {/* Daylight times render inline with each TOD label below */}
        {isFirstDay && arrivalFlightNumber && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 8, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            <FontAwesome name="plane" size={11} color="#4ade80" />
            <Text style={{ ...TextStyles.bodyEm, color: colors.text }}>Arrive — {arrivalFlightNumber}</Text>
          </View>
        )}
        {/* Empty groups before first populated group */}
        {emptyTodsBefore.map((tod) => {
          const sun = sunSuffixFor(tod);
          return (
            <View key={tod} style={{ paddingHorizontal: 20, marginBottom: 8 }}>
              <Pressable onPress={toggleTimeFormat} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4, opacity: 0.4 }}>
                <Text style={{ ...TextStyles.micro, letterSpacing: 2, textTransform: 'uppercase', color: '#c8a96a' }}>
                  {TIME_OF_DAY_CONFIG[tod as keyof typeof TIME_OF_DAY_CONFIG].label}
                </Text>
                {sun && (
                  <Text style={{ ...TextStyles.micro, color: '#c8a96a' }}>· {sun.emoji} {sun.time}</Text>
                )}
              </Pressable>
              <AddActivityPanel dayIndex={i} timeOfDay={tod} days={days} onAddActivity={onAddActivity} discoverPool={discoverPool} />
            </View>
          );
        })}
      </View>
    );

    const listFooter = (
      <View>
        {isLastDay && returnFlightNumber && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
            <FontAwesome name="plane" size={11} color="#60a5fa" style={{ transform: [{ rotate: '180deg' }] }} />
            <Text style={{ ...TextStyles.bodyEm, color: colors.text }}>Depart — {returnFlightNumber}</Text>
          </View>
        )}
        {/* Empty groups after last populated group */}
        {emptyTodsAfter.map((tod) => {
          const sun = sunSuffixFor(tod);
          return (
            <View key={tod} style={{ paddingHorizontal: 20, marginTop: 8 }}>
              <Pressable onPress={toggleTimeFormat} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4, opacity: 0.4 }}>
                <Text style={{ ...TextStyles.micro, letterSpacing: 2, textTransform: 'uppercase', color: '#c8a96a' }}>
                  {TIME_OF_DAY_CONFIG[tod as keyof typeof TIME_OF_DAY_CONFIG].label}
                </Text>
                {sun && (
                  <Text style={{ ...TextStyles.micro, color: '#c8a96a' }}>· {sun.emoji} {sun.time}</Text>
                )}
              </Pressable>
              <AddActivityPanel dayIndex={i} timeOfDay={tod} days={days} onAddActivity={onAddActivity} discoverPool={discoverPool} />
            </View>
          );
        })}
      </View>
    );

    return (
      <GestureHandlerRootView style={{ width: screenW - 28, flex: 1 }}>
        <DraggableFlatList
          data={flatItems}
          keyExtractor={(a) => a.id}
          activationDistance={10}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          onDragEnd={({ data: reordered }) => {
            onReorderDay(i, reordered);
          }}
          renderItem={({ item: activity, getIndex, drag, isActive }: RenderItemParams<ActivityViewModel>) => {
            const currentIdx = getIndex() ?? 0;
            const currentTod = activity.timeOfDay;
            const showHeader = headerFlags[currentIdx] ?? false;
            const config = TIME_OF_DAY_CONFIG[currentTod as keyof typeof TIME_OF_DAY_CONFIG];
            const isLastInGroup = lastInGroupFlags[currentIdx] ?? true;
            const emptyGapTods = isLastInGroup ? (() => {
              const todIdx = allTods.indexOf(currentTod as typeof allTods[number]);
              const nextItem = flatItems[currentIdx + 1];
              const nextTodIdx = nextItem ? allTods.indexOf(nextItem.timeOfDay as typeof allTods[number]) : -1;
              if (nextTodIdx <= todIdx + 1) return [];
              return allTods.slice(todIdx + 1, nextTodIdx).filter((t) => !activeTods.has(t));
            })() : [];

            const headerSun = sunSuffixFor(currentTod);
            return (
              <View style={{ paddingHorizontal: 20 }}>
                {showHeader && !isActive && (
                  <Pressable
                    onPress={toggleTimeFormat}
                    hitSlop={6}
                    style={{
                      flexDirection: 'row', alignItems: 'baseline', gap: 6,
                      marginBottom: 4, marginTop: currentIdx > 0 ? 10 : 0, opacity: 0.7,
                    }}
                  >
                    <Text style={{
                      ...TextStyles.micro, letterSpacing: 2,
                      textTransform: 'uppercase', color: '#c8a96a',
                    }}>
                      {config.label}
                    </Text>
                    {headerSun && (
                      <Text style={{ ...TextStyles.micro, color: '#c8a96a' }}>· {headerSun.emoji} {headerSun.time}</Text>
                    )}
                  </Pressable>
                )}
                <GlanceActivityRow
                  activity={activity}
                  dayIndex={i}
                  timeOfDay={currentTod}
                  drag={drag}
                  isActive={isActive}
                  onRemove={onRemoveActivity}
                  onRegenerate={onRegenerateActivity}
                  onUpdateTime={onUpdateTime}
                  onPress={onActivityPress}
                />
                {isLastInGroup && (
                  <AddActivityPanel dayIndex={i} timeOfDay={currentTod} days={days} onAddActivity={onAddActivity} discoverPool={discoverPool} />
                )}
                {emptyGapTods.map((tod) => {
                  const gapSun = sunSuffixFor(tod);
                  return (
                    <View key={tod} style={{ marginTop: 10 }}>
                      <Pressable onPress={gapSun ? toggleTimeFormat : undefined} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4, opacity: 0.4 }}>
                        <Text style={{ ...TextStyles.micro, letterSpacing: 2, textTransform: 'uppercase', color: '#c8a96a' }}>
                          {TIME_OF_DAY_CONFIG[tod as keyof typeof TIME_OF_DAY_CONFIG].label}
                        </Text>
                        {gapSun && (
                          <Text style={{ ...TextStyles.micro, color: '#c8a96a' }}>· {gapSun.emoji} {gapSun.time}</Text>
                        )}
                      </Pressable>
                      <AddActivityPanel dayIndex={i} timeOfDay={tod} days={days} onAddActivity={onAddActivity} discoverPool={discoverPool} />
                    </View>
                  );
                })}
              </View>
            );
          }}
        />
      </GestureHandlerRootView>
    );
  }, [days, colors, screenW, arrivalFlightNumber, returnFlightNumber, onRemoveActivity, onRegenerateActivity, onReorderDay, onAddActivity, onUpdateTime, onActivityPress, sunrise, timeFormat, toggleTimeFormat]);

  return (
    <FlatList
      ref={flatListRef}
      data={days}
      keyExtractor={(d) => d.id}
      renderItem={renderDay}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={screenW - 28}
      decelerationRate="fast"
      disableIntervalMomentum
      onScrollBeginDrag={() => { isScrolling.current = true; }}
      onMomentumScrollEnd={() => { isScrolling.current = false; }}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      contentContainerStyle={{ gap: 0 }}
      getItemLayout={(_, index) => ({
        length: screenW - 28,
        offset: (screenW - 28) * index,
        index,
      })}
    />
  );
}

export default function ItineraryScreen() {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('itinerary');
  const { tripId: id } = useContext(TabCtx);
  const queryClient = useQueryClient();

  // Time format preference is now in the global settings store so every
  // tab (Itinerary, Hotels, Flights, Restaurants, Calendar, Settings)
  // reads from one source of truth and they all flip together when the
  // user toggles. The store also persists to profiles.preferences for
  // cross-device parity.
  const timeFormat = useSettingsStore((s) => s.timeFormat);
  const toggleTimeFormat = useSettingsStore((s) => s.toggleTimeFormat);
  const { addToTrip, state: tripSheetState, selectTrip, selectDay, dismiss, createTrip } = useAddToTrip(id);
  const { trip, days, selectedDayIndex, setSelectedDayIndex, selectedDay, flights, isLoading, isEmpty } =
    useItineraryScreen(id);
  const centerLat = trip?.trip_context?.lat ?? 0;
  const centerLng = trip?.trip_context?.lng ?? 0;

  // Build data from trip_context — replaces all mock data
  const discoverPool = useMemo(() => buildDiscoverItems(trip), [trip]);
  const tripHotel: any = useMemo(() => {
    const h = (trip?.trip_context as any)?.hotels?.[0];
    if (!h) return { name: 'Hotel', address: '', checkInTime: '3:00 PM', checkOutTime: '11:00 AM', image: '', stars: 3, rating: 0 };
    return { name: h.name, address: h.address || '', checkInTime: '3:00 PM', checkOutTime: '11:00 AM', image: h.image || h.photo_url || '', stars: h.stars || 3, rating: h.rating || 0 };
  }, [trip]);
  const { calendarOpen, setCalendarOpen, mapOpen, setMapOpen, theme, itineraryColorOverrides, setHeroImageOverride } = useContext(TabCtx);
  const isFocused = useIsFocused();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [allCollapsedOverride, setAllCollapsedOverride] = useState<boolean | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addCategory, setAddCategory] = useState('All');
  const [addSearch, setAddSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [openPlace, setOpenPlace] = useState<import('@travyl/shared').PlaceItem | null>(null);
  const [cardReady, setCardReady] = useState(false);
  const [viewMode, setViewMode] = useState<'glance' | 'detailed'>('glance');
  const [calDayCount, setCalDayCount] = useState<1 | 3 | 7>(3);

  // Calendar-only "search & add" sheet — toggle next to the calendar button.
  const [showCalSearch, setShowCalSearch] = useState(false);
  const [calSearch, setCalSearch] = useState('');
  const [calSearchResults, setCalSearchResults] = useState<any[]>([]);
  const [calSearching, setCalSearching] = useState(false);
  const calSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Debounced place search for the calendar-only quick-add sheet ───
  const tripCtx = trip?.trip_context as any;
  const calSearchLat = tripCtx?.lat;
  const calSearchLng = tripCtx?.lng;
  const calSearchCity = trip?.destination?.split(',')[0]?.trim() || '';
  useEffect(() => {
    const q = calSearch.trim();
    if (!showCalSearch || !q) {
      setCalSearchResults([]);
      return;
    }
    if (calSearchTimer.current) clearTimeout(calSearchTimer.current);
    calSearchTimer.current = setTimeout(() => {
      setCalSearching(true);
      const base = getWebApiBase();
      const fullQuery = `${q} ${calSearchCity}`.trim();
      // Fan out: Maps gives reliable category/cuisine matches ("sushi"),
      // TripAdvisor adds rated venues, /api/places adds NLP-tagged places.
      const fetches: Promise<any[]>[] = [
        fetch(`${base}/api/search/maps?q=${encodeURIComponent(fullQuery)}`)
          .then((r) => r.ok ? r.json() : []).catch(() => []),
        fetch(`${base}/api/search/tripadvisor?q=${encodeURIComponent(fullQuery)}`)
          .then((r) => r.ok ? r.json() : []).catch(() => []),
      ];
      const placesUrl = calSearchLat && calSearchLng
        ? `${base}/api/places?q=${encodeURIComponent(fullQuery)}&lat=${calSearchLat}&lng=${calSearchLng}&limit=10`
        : `${base}/api/places?q=${encodeURIComponent(fullQuery)}&limit=10`;
      fetches.push(fetch(placesUrl).then((r) => r.ok ? r.json() : []).catch(() => []));

      Promise.all(fetches).then((results) => {
        const merged = results.flat().filter((p: any) => p && p.name);
        // Dedupe by lowercased name; first occurrence wins (Maps results lead).
        const seen = new Set<string>();
        const deduped = merged.filter((p: any) => {
          const k = (p.name || '').toLowerCase();
          if (!k || seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        // Light relevance filter — keep entries whose name OR category mentions
        // any token of the query, so "sushi" doesn't get drowned in generic Tokyo POIs.
        const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
        const ranked = deduped
          .map((p: any) => {
            const hay = [p.name, p.category, ...(p.tags ?? [])].filter(Boolean).join(' ').toLowerCase();
            const hits = tokens.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0);
            return { p, hits };
          })
          .sort((a, b) => b.hits - a.hits)
          .map((x) => x.p);
        setCalSearchResults(ranked.slice(0, 12));
      }).finally(() => setCalSearching(false));
    }, 300);
    return () => { if (calSearchTimer.current) clearTimeout(calSearchTimer.current); };
  }, [calSearch, showCalSearch, calSearchLat, calSearchLng, calSearchCity]);

  // ─── Local mutable copy of days for glance add/remove/regenerate ───
  const [glanceDays, setGlanceDays] = useState<ItineraryDayViewModel[]>([]);
  const glanceSynced = useRef(false);
  useEffect(() => {
    if (days.length > 0 && !glanceSynced.current) {
      setGlanceDays(days.map((d) => ({
        ...d,
        timeGroups: d.timeGroups.map((g) => ({ ...g, activities: [...g.activities] })),
      })));
      glanceSynced.current = true;
    }
  }, [days]);
  const effectiveDays = glanceDays.length > 0 ? glanceDays : days;

  // `persistReorderedDay` is defined later in the component, so removing
  // an item references it via a ref to dodge TDZ. The ref is updated on
  // every render so the latest closure (with the latest `trip` / `id`)
  // is always invoked.
  const persistReorderedDayRef = useRef<((dayIndex: number, activities: ActivityViewModel[]) => void) | null>(null);
  const removeGlanceActivity = useCallback((dayIndex: number, activityId: string) => {
    setGlanceDays((prev) => {
      const next = prev.map((day, di) => {
        if (di !== dayIndex) return day;
        return {
          ...day,
          timeGroups: day.timeGroups
            .map((g) => ({ ...g, activities: g.activities.filter((a) => a.id !== activityId) }))
            .filter((g) => g.activities.length > 0),
          activityCount: day.activityCount - 1,
        };
      });
      // Persist the new (shrunken) day to trip_context on Supabase. Same
      // write channel reorder + drag-to-move use.
      const updatedDay = next[dayIndex];
      if (updatedDay) {
        const remaining = updatedDay.timeGroups.flatMap((g) => g.activities);
        persistReorderedDayRef.current?.(dayIndex, remaining);
      }
      return next;
    });
    // ALSO remove from the `activity` table when the id LOOKS like a
    // UUID — only user-added activities live there. AI-generated slot
    // ids (e.g. "serp_ChIJ..." from SerpAPI place ids, or "ctx-1-2"
    // synthetic ids) live only in trip_context.itinerary and are
    // already removed by the persistReorderedDay rewrite above. Calling
    // the activity-table delete with a non-UUID throws a Postgres
    // "invalid input syntax for type uuid" error, so gate on shape.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (id && UUID_RE.test(activityId)) {
      (async () => {
        try {
          const { error, count } = await supabase
            .from('activity')
            .delete({ count: 'exact' })
            .eq('id', activityId);
          if (error) {
            console.warn('[removeGlanceActivity] activity-table delete failed', error.message);
          } else {
            console.log(`[removeGlanceActivity] activity-table delete: ${count ?? 0} row(s) for id="${activityId}"`);
          }
          queryClient.invalidateQueries({ queryKey: ['trip-activities', id] });
          queryClient.invalidateQueries({ queryKey: ['trip', id] });
        } catch (e: any) {
          console.warn('[removeGlanceActivity] unexpected error', e?.message ?? e);
        }
      })();
    } else if (id) {
      // Non-UUID id → only in trip_context. Still invalidate the trip
      // query so the screen re-reads the slot list after persistReorderedDay.
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
    }
  }, [id, queryClient]);

  const regenerateGlanceActivity = useCallback((dayIndex: number, activityId: string) => {
    setGlanceDays((prev) => {
      const allIds = prev.flatMap((d) => d.timeGroups.flatMap((g) => g.activities.map((a) => a.id)));
      const current = prev[dayIndex]?.timeGroups.flatMap((g) => g.activities).find((a) => a.id === activityId);
      if (!current) return prev;
      const replacement = pickRandomActivity(current.category, allIds, discoverPool);
      if (!replacement) return prev;
      return prev.map((day, di) => {
        if (di !== dayIndex) return day;
        return {
          ...day,
          timeGroups: day.timeGroups.map((g) => ({
            ...g,
            activities: g.activities.map((a) => {
              if (a.id !== activityId) return a;
              return { ...a, id: `regen-${Date.now()}`, name: replacement.name, category: replacement.category || a.category };
            }),
          })),
        };
      });
    });
  }, [discoverPool]);

  const addGlanceActivity = useCallback((dayIndex: number, timeOfDay: string, name: string, category: string) => {
    console.log(`[addGlanceActivity] day=${dayIndex} tod=${timeOfDay} name="${name}" category="${category}"`);
    const newAct: ActivityViewModel = {
      id: `add-${Date.now()}`,
      name,
      image: '',
      category,
      cost: null,
      costCurrency: null,
      locationName: null,
      startTime: TOD_START_TIMES[timeOfDay] ?? '12:00 PM',
      endTime: formatHourToTime((TOD_START_HOURS[timeOfDay] ?? 12) + 1.5),
      timeDisplay: `${TOD_START_TIMES[timeOfDay] ?? '12:00 PM'} – ${formatHourToTime((TOD_START_HOURS[timeOfDay] ?? 12) + 1.5)}`,
      costDisplay: null,
      bookingUrl: null,
      notes: null,
      source: 'agent' as const,
      timeOfDay: timeOfDay as ActivityViewModel['timeOfDay'],
    };
    setGlanceDays((prev) => {
      const next = prev.map((day, di) => {
        if (di !== dayIndex) return day;
        const hasGroup = day.timeGroups.some((g) => g.timeOfDay === timeOfDay);
        return {
          ...day,
          timeGroups: hasGroup
            ? day.timeGroups.map((g) => g.timeOfDay === timeOfDay ? { ...g, activities: [...g.activities, newAct] } : g)
            : [...day.timeGroups, { timeOfDay: timeOfDay as ActivityViewModel['timeOfDay'], activities: [newAct] }],
          activityCount: day.activityCount + 1,
        };
      });
      // Persist the now-larger day list to trip_context.itinerary so the
      // new activity sticks across navigation. Without this, the add was
      // local-state-only and disappeared on refetch (same root cause as
      // the delete bug — never wrote anywhere).
      const updatedDay = next[dayIndex];
      if (updatedDay) {
        const allActivities = updatedDay.timeGroups.flatMap((g) => g.activities);
        if (persistReorderedDayRef.current) {
          console.log(`[addGlanceActivity] persisting day ${dayIndex} with ${allActivities.length} activities`);
          persistReorderedDayRef.current(dayIndex, allActivities);
        } else {
          console.warn('[addGlanceActivity] persistReorderedDayRef.current is null — ref not yet wired');
        }
      } else {
        console.warn(`[addGlanceActivity] dayIndex ${dayIndex} out of range (glanceDays length = ${next.length})`);
      }
      return next;
    });
  }, []);

  // Persist reordered day to Supabase (fire-and-forget)
  const persistReorderedDay = useCallback(async (dayIndex: number, activities: ActivityViewModel[]) => {
    if (!trip || !id) {
      console.warn('[persistReorderedDay] aborted — missing trip or id');
      return;
    }
    try {
      // Compute YYYY-MM-DD via string math instead of Date arithmetic so a
      // user in a UTC-behind timezone doesn't get an off-by-one day.
      const startDateStr = trip.start_date || new Date().toISOString().split('T')[0];
      const [sy, sm, sd] = startDateStr.split('-').map(Number);
      const localStart = new Date(sy, (sm ?? 1) - 1, sd ?? 1);
      localStart.setDate(localStart.getDate() + dayIndex);
      const yyyy = localStart.getFullYear();
      const mm = String(localStart.getMonth() + 1).padStart(2, '0');
      const dd = String(localStart.getDate()).padStart(2, '0');
      const dayDateStr = `${yyyy}-${mm}-${dd}`;

      const { data: tripData, error: readErr } = await supabase.from('trips').select('trip_context').eq('id', id).single();
      if (readErr) {
        console.warn('[persistReorderedDay] read failed', readErr.message);
        return;
      }
      if (!tripData?.trip_context) {
        console.warn('[persistReorderedDay] trip has no trip_context');
        return;
      }

      const itinerary = tripData.trip_context.itinerary || [];
      // Try date match first; fall back to dayIndex if the dates don't
      // line up (e.g. context.itinerary[i].date in a different format).
      let dayIdx = itinerary.findIndex((d: any) => d.date === dayDateStr);
      if (dayIdx < 0 && itinerary[dayIndex]) {
        console.warn(`[persistReorderedDay] date "${dayDateStr}" not found, falling back to index ${dayIndex}`);
        dayIdx = dayIndex;
      }
      if (dayIdx < 0) {
        console.warn(`[persistReorderedDay] dayIndex ${dayIndex} out of range; itinerary length = ${itinerary.length}`);
        return;
      }

      // Preserve existing POI data (lat/lng/photo), just reorder slots.
      const existingPois = new Map<string, any>();
      for (const slot of itinerary[dayIdx].slots || []) {
        if (slot.poi?.name) existingPois.set(slot.poi.name, slot.poi);
      }
      itinerary[dayIdx].slots = activities.map((a) => ({
        start_time: a.startTime?.replace(/\s?(AM|PM)/i, '') || '09:00',
        end_time: a.endTime?.replace(/\s?(AM|PM)/i, '') || '10:00',
        poi: existingPois.get(a.name) || { id: a.id, name: a.name, category: a.category },
      }));

      const { error: writeErr } = await supabase
        .from('trips')
        .update({ trip_context: { ...tripData.trip_context, itinerary } })
        .eq('id', id);
      if (writeErr) {
        console.warn('[persistReorderedDay] write failed', writeErr.message);
      } else {
        console.log(`[persistReorderedDay] day ${dayIdx} (${dayDateStr}) → ${activities.length} slots`);
        // Force the trip query to refetch so the UI reads back from the
        // new trip_context next time the screen renders.
        queryClient.invalidateQueries({ queryKey: ['trip', id] });
      }
    } catch (e: any) {
      console.warn('[persistReorderedDay] unexpected error', e?.message ?? e);
    }
  }, [trip, id, queryClient]);

  // Keep the forward-ref hot — `removeGlanceActivity` is declared earlier
  // in the file and references this via `persistReorderedDayRef`. Without
  // this effect, the ref stays null until the user happens to trigger
  // persistReorderedDay through some OTHER path (drag-to-move, edit-time)
  // first. Fired on every render so the latest closure (with current trip
  // / id) is always the one called.
  useEffect(() => {
    persistReorderedDayRef.current = persistReorderedDay;
  }, [persistReorderedDay]);

  const reorderGlanceDay = useCallback((dayIndex: number, reorderedActivities: ActivityViewModel[]) => {
    setGlanceDays((prev) => {
      const day = prev[dayIndex];
      if (!day) return prev;

      // Build original index map (O(n) instead of O(n²) findIndex)
      const originalFlat = day.timeGroups.flatMap((g) => g.activities);
      const origPosMap = new Map<string, number>();
      originalFlat.forEach((a, idx) => origPosMap.set(a.id, idx));

      // Detect which item was moved — find candidates with max position jump,
      // then pick the one that's "out of place" (surrounded by a different group)
      let movedNewIdx = -1;
      let maxJump = 0;
      const len = reorderedActivities.length;
      for (let j = 0; j < len; j++) {
        const jump = Math.abs(j - (origPosMap.get(reorderedActivities[j].id) ?? j));
        if (jump > maxJump) { maxJump = jump; movedNewIdx = j; }
      }

      // When there are ties (e.g., last item in group), find the one surrounded by a different group
      if (maxJump > 0) {
        const candidates: number[] = [];
        for (let j = 0; j < len; j++) {
          const jump = Math.abs(j - (origPosMap.get(reorderedActivities[j].id) ?? j));
          if (jump === maxJump) candidates.push(j);
        }
        if (candidates.length > 1) {
          // Pick the candidate whose original tod differs from BOTH new neighbors
          for (const idx of candidates) {
            const a = reorderedActivities[idx];
            const prevTod = idx > 0 ? reorderedActivities[idx - 1].timeOfDay : null;
            const nextTod = idx < len - 1 ? reorderedActivities[idx + 1].timeOfDay : null;
            const outOfPlace = (prevTod && prevTod !== a.timeOfDay) && (nextTod && nextTod !== a.timeOfDay);
            // Also match if at edge and single neighbor differs
            const edgeOutOfPlace = (!prevTod && nextTod && nextTod !== a.timeOfDay) || (!nextTod && prevTod && prevTod !== a.timeOfDay);
            if (outOfPlace || edgeOutOfPlace) { movedNewIdx = idx; break; }
          }
        }
      }

      // Assign the moved item the group of its nearest neighbor
      let movedTod: string | null = null;
      if (maxJump > 0 && movedNewIdx >= 0) {
        const movedItem = reorderedActivities[movedNewIdx];
        const neighbor = reorderedActivities[movedNewIdx > 0 ? movedNewIdx - 1 : movedNewIdx + 1];
        if (neighbor && neighbor.timeOfDay !== movedItem.timeOfDay) {
          movedTod = neighbor.timeOfDay;
        }
      }

      // Rebuild groups — reuse original activity objects where possible
      const groupOrder = day.timeGroups.map((g) => g.timeOfDay);
      const groupMap = new Map<string, ActivityViewModel[]>();
      for (const tod of groupOrder) groupMap.set(tod, []);
      for (let j = 0; j < reorderedActivities.length; j++) {
        const a = reorderedActivities[j];
        const tod = (j === movedNewIdx && movedTod) ? movedTod : a.timeOfDay;
        const list = groupMap.get(tod);
        if (list) list.push(tod !== a.timeOfDay ? { ...a, timeOfDay: tod as ActivityViewModel['timeOfDay'] } : a);
      }

      // Rebuild with updated times
      const next = [...prev];
      next[dayIndex] = {
        ...day,
        timeGroups: groupOrder
          .filter((tod) => (groupMap.get(tod)?.length ?? 0) > 0)
          .map((tod) => {
            const acts = groupMap.get(tod)!;
            const startH = TOD_START_HOURS[tod] ?? 9;
            const endH = TOD_END_HOURS[tod] ?? startH + 4;
            const interval = acts.length > 1 ? (endH - startH) / acts.length : 1.5;
            return {
              timeOfDay: tod as ActivityViewModel['timeOfDay'],
              activities: acts.map((a, ai) => {
                const time = formatHourToTime(startH + ai * interval);
                return a.startTime === time ? a : { ...a, startTime: time };
              }),
            };
          }),
      };
      // Persist reordered day async
      const allActivities = next[dayIndex].timeGroups.flatMap(g => g.activities);
      persistReorderedDay(dayIndex, allActivities);

      return next;
    });
  }, [persistReorderedDay]);

  const updateActivityTime = useCallback((dayIndex: number, activityId: string, newTime: string) => {
    setGlanceDays((prev) => {
      const next = [...prev];
      const day = next[dayIndex];
      if (!day) return prev;
      next[dayIndex] = {
        ...day,
        timeGroups: day.timeGroups.map((g) => ({
          ...g,
          activities: g.activities.map((a) =>
            a.id === activityId ? { ...a, startTime: newTime } : a,
          ),
        })),
      };
      // Persist to Supabase — collect all activities from updated day
      const allActivities = next[dayIndex].timeGroups.flatMap((g) => g.activities);
      persistReorderedDay(dayIndex, allActivities);
      return next;
    });
  }, [persistReorderedDay]);

  // (Map is now a modal overlay — no need to collapse sections)

  const arrivalFlightNumber = flights[0]?.flightNumber ?? null;
  const returnFlightNumber = flights[1]?.flightNumber ?? null;
  const arrivalFlight = ([] as any[]).find((f) => f.type === 'arrival');
  const returnFlight = ([] as any[]).find((f) => f.type === 'return');

  const isFirstDay = selectedDayIndex === 0;
  const isLastDay = selectedDayIndex === days.length - 1;

  const allCollapsed = selectedDay
    ? selectedDay.timeGroups.every((g) => collapsedSections[g.timeOfDay])
    : false;

  const toggleCollapseAll = useCallback(() => {
    if (!selectedDay) return;
    const newState = !allCollapsed;
    const next: Record<string, boolean> = {};
    for (const g of selectedDay.timeGroups) {
      next[g.timeOfDay] = newState;
    }
    setCollapsedSections(next);
    setAllCollapsedOverride(newState);
  }, [selectedDay, allCollapsed]);

  const toggleSectionCollapse = useCallback((timeOfDay: string) => {
    setCollapsedSections((prev) => ({ ...prev, [timeOfDay]: !prev[timeOfDay] }));
    setAllCollapsedOverride(null);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  }, []);

  const filteredDiscoverItems = useMemo(() => {
    let items = discoverPool;
    if (addSearch) {
      const q = addSearch.toLowerCase();
      items = items.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        (i.category?.toLowerCase().includes(q) ?? false),
      );
    }
    if (addCategory !== 'All') {
      items = items.filter((i) => i.category?.toLowerCase().includes(addCategory.toLowerCase()) ?? false);
    }
    return items;
  }, [addSearch, addCategory]);

  const handleAddActivity = useCallback((timeOfDay: string) => {
    setAddingTo((prev) => (prev === timeOfDay ? null : timeOfDay));
    setAddCategory('All');
    setAddSearch('');
  }, []);

  const handleAddItem = useCallback((_item: DiscoverItem, _timeOfDay: string) => {
    setAddingTo(null);
    setAddSearch('');
    setAddCategory('All');
  }, []);

  // Shared lookup: call findDiscoverMatch once per unique activity across all days
  const discoverMatchMap = useMemo(() => {
    const map = new Map<string, typeof discoverPool[number]>();
    for (const day of effectiveDays) {
      for (const group of day.timeGroups) {
        for (const activity of group.activities) {
          if (!map.has(activity.id)) {
            const match = findDiscoverMatch(activity.name, discoverPool);
            if (match) map.set(activity.id, match);
          }
        }
      }
    }
    return map;
  }, [effectiveDays]);

  const activityImages = useMemo(() => {
    if (!selectedDay) return {};
    const map: Record<string, string> = {};
    const allImages = discoverPool.flatMap((d) => d.images ?? []).filter(Boolean);
    for (const group of selectedDay.timeGroups) {
      for (const activity of group.activities) {
        const match = discoverMatchMap.get(activity.id);
        if (match?.images?.[0]) {
          map[activity.id] = match.images[0];
        } else if (allImages.length > 0) {
          const idx = Object.keys(map).length % allImages.length;
          map[activity.id] = allImages[idx];
        }
      }
    }
    return map;
  }, [selectedDay, discoverMatchMap]);

  // All-days image map for the calendar grid (which renders activities
  // across multiple days at once, so the per-day `activityImages` above
  // isn't enough). Keyed by activity.id so CalendarBlock can render a
  // thumbnail without having to walk the discover pool itself.
  const calendarImages = useMemo(() => {
    const map: Record<string, string> = {};
    const allImages = discoverPool.flatMap((d) => d.images ?? []).filter(Boolean);
    let fallbackIdx = 0;
    for (const day of effectiveDays) {
      for (const group of day.timeGroups) {
        for (const activity of group.activities) {
          if (map[activity.id]) continue;
          const match = discoverMatchMap.get(activity.id);
          if (match?.images?.[0]) {
            map[activity.id] = match.images[0];
          } else if (allImages.length > 0) {
            map[activity.id] = allImages[fallbackIdx++ % allImages.length];
          }
        }
      }
    }
    return map;
  }, [effectiveDays, discoverMatchMap]);

  const dayHeroImages = useMemo(() => {
    const allImages = discoverPool.flatMap((d) => d.images ?? []).filter(Boolean);
    return effectiveDays.map((day, dayIdx) => {
      for (const group of day.timeGroups) {
        for (const activity of group.activities) {
          const match = discoverMatchMap.get(activity.id);
          if (match?.images?.[0]) return match.images[0];
        }
      }
      return allImages.length > 0 ? allImages[dayIdx % allImages.length] : null;
    });
  }, [effectiveDays, discoverMatchMap]);

  // Update hero image when selected day changes — clear when tab loses focus
  // Prefer trip's own hero image (destination-specific from enrichment), fall back to generic
  const tripHeroImages = useMemo(() => {
    const ctx = trip?.trip_context as any;
    const heroes: string[] = [];
    // Enrichment hero image (Unsplash, destination-specific)
    if (ctx?.hero_image_url) heroes.push(ctx.hero_image_url);
    // Additional hero images from enrichment
    if (ctx?.hero_images?.length) {
      for (const img of ctx.hero_images) {
        if (img && !heroes.includes(img)) heroes.push(img);
      }
    }
    // Only fall back to generic if we have nothing destination-specific
    if (heroes.length === 0) {
      heroes.push(...GLANCE_HERO_IMAGES);
    }
    return heroes;
  }, [trip]);

  useEffect(() => {
    if (!isFocused) {
      setHeroImageOverride(null);
      return;
    }
    const img = viewMode === 'glance'
      ? tripHeroImages[selectedDayIndex % tripHeroImages.length]
      : dayHeroImages[selectedDayIndex] || tripHeroImages[0];
    if (img) setHeroImageOverride(img);
    return () => setHeroImageOverride(null);
  }, [selectedDayIndex, dayHeroImages, isFocused, viewMode, tripHeroImages]);

  // Block the activity-card overlay from rendering for 800ms after focus gain,
  // and clear any stale selection / map state. This prevents phantom taps from
  // the sidebar tab tap bleeding through to the activity row underneath when
  // the pager swipes Itinerary into place. Also force-closes the map overlay
  // on focus so a stale TabCtx mapOpen=true never leaks into a fresh visit.
  useEffect(() => {
    setSelectedActivityId(null);
    setOpenPlace(null);
    setCardReady(false);
    setMapOpen(false);
    if (!isFocused) return;
    const t = setTimeout(() => setCardReady(true), 800);
    return () => clearTimeout(t);
  }, [isFocused]);

  const handleActivityPress = useCallback((id: string) => {
    if (!cardReady) return;
    setSelectedActivityId(id);
  }, [cardReady]);

  // Build PlaceItem for tapped activity — try matching DiscoverItem first, fall back to ActivityViewModel
  // Capture place data once when activity is selected — stable reference for the modal.
  // Also gated on cardReady so any phantom selection during the focus settling
  // window can never paint the carousel overlay.
  useEffect(() => {
    if (!cardReady) { setOpenPlace(null); return; }
    if (!selectedActivityId) { setOpenPlace(null); return; }
    const currentDay = effectiveDays[selectedDayIndex] ?? selectedDay;
    if (!currentDay) { setOpenPlace(null); return; }
    const allActivities = currentDay.timeGroups.flatMap((g) => g.activities);
    const activity = allActivities.find((a) => a.id === selectedActivityId);
    if (!activity) { setOpenPlace(null); return; }

    const discoverMatch = discoverMatchMap.get(activity.id);
    if (discoverMatch) { setOpenPlace(discoverItemToPlaceItem(discoverMatch)); return; }

    const coords = realActivityCoords(activity);
    setOpenPlace({
      id: activity.id,
      name: activity.name,
      image: '',
      type: 'attraction' as const,
      rating: 0,
      tagline: activity.locationName ?? '',
      category: activity.category ?? 'Activity',
      description: activity.notes ?? undefined,
      latitude: coords?.lat,
      longitude: coords?.lng,
      duration: activity.timeDisplay ?? undefined,
      admissionFee: activity.costDisplay ?? undefined,
      website: activity.bookingUrl ?? undefined,
    });
  }, [selectedActivityId, cardReady]); // Run when selection or readiness changes

  const allPlacesFromDiscover = useMemo(
    () => discoverPool.map(discoverItemToPlaceItem),
    [],
  );

  // Show skeleton only while trip is loading
  if (isLoading && !calendarOpen && !mapOpen) {
    return <PageTransition><ItinerarySkeleton /></PageTransition>;
  }

  // Empty state — trip loaded but no itinerary data
  if (days.length === 0 && !calendarOpen && !mapOpen) {
    return (
      <PageTransition>
        <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <FontAwesome name="calendar-o" size={40} color={colors.textTertiary} />
          <Text style={{ ...TextStyles.title, color: colors.text, marginTop: 16, textAlign: 'center' }}>No itinerary yet</Text>
          <Text style={{ ...TextStyles.body, color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
            Generate a new trip to get a day-by-day itinerary with activities, hotels, and flights.
          </Text>
        </View>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Day Selector + Controls */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <DaySelector days={days} selectedIndex={selectedDayIndex} onSelect={setSelectedDayIndex} accentColor={ACCENT} />
        </View>
        {/* History button — to the LEFT of the plus, same gold accent */}
        {id && (
          <View style={{ marginLeft: 4 }}>
            <TripHistoryToggle
              tripId={id}
              variant="toolbar"
              color="#c8a96a"
            />
          </View>
        )}
        {/* Map button — opens the full-trip DayMap modal (replaces the
            former quick-add plus; add-activity now lives via "Browse" in
            detailed view). */}
        {!calendarOpen && (
          <Pressable
            onPress={() => setMapOpen(true)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#c8a96a' + '25',
              borderWidth: 1,
              borderColor: '#c8a96a' + '40',
              marginLeft: 4,
            }}
          >
            <FontAwesome name="map-o" size={14} color="#c8a96a" />
          </Pressable>
        )}
        {/* Collapse All */}
        {!calendarOpen && viewMode === 'detailed' && (
          <Pressable
            onPress={toggleCollapseAll}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: ACCENT,
              marginLeft: 4,
            }}
          >
            <FontAwesome
              name={allCollapsed ? 'chevron-down' : 'chevron-up'}
              size={13}
              color="#fff"
            />
          </Pressable>
        )}
        {/* View Toggle + Calendar button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {!calendarOpen && (
            <ViewToggle mode={viewMode} onToggle={setViewMode} accent={ACCENT} />
          )}
          <Pressable
            onPress={() => setCalendarOpen(!calendarOpen)}
            style={{
              width: 32, height: 32, borderRadius: 8,
              backgroundColor: calendarOpen ? ACCENT : colors.cardBackground,
              borderWidth: 1, borderColor: calendarOpen ? ACCENT : colors.border,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FontAwesome name="calendar" size={14} color={calendarOpen ? '#fff' : colors.textSecondary} />
          </Pressable>
          {calendarOpen && (
            <Pressable
              onPress={() => setCalDayCount(calDayCount === 1 ? 3 : calDayCount === 3 ? 7 : 1)}
              style={{
                height: 32, paddingHorizontal: 10, borderRadius: 8,
                backgroundColor: colors.cardBackground,
                borderWidth: 1, borderColor: colors.border,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ ...TextStyles.xs, color: colors.text, fontWeight: '700' }}>
                {calDayCount === 1 ? '1D' : calDayCount === 3 ? '3D' : '7D'}
              </Text>
            </Pressable>
          )}
          {calendarOpen && (
            <Pressable
              onPress={() => setShowCalSearch(true)}
              hitSlop={6}
              style={{
                width: 32, height: 32, borderRadius: 8,
                backgroundColor: showCalSearch ? ACCENT : colors.cardBackground,
                borderWidth: 1, borderColor: showCalSearch ? ACCENT : colors.border,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FontAwesome name="search" size={13} color={showCalSearch ? '#fff' : colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Inline calendar quick-add — search + Add buttons rendered above the grid */}
      {calendarOpen && showCalSearch && (
        <View style={{ borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.surface, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, height: 36, marginBottom: 8 }}>
            <FontAwesome name="search" size={12} color={colors.textTertiary} />
            <TextInput
              value={calSearch}
              onChangeText={setCalSearch}
              placeholder={`Add a place in ${calSearchCity || 'this trip'}...`}
              placeholderTextColor={colors.textTertiary}
              returnKeyType="search"
              autoFocus
              style={{ flex: 1, fontSize: FontSize.body, color: colors.text, marginLeft: 6, paddingVertical: 0 }}
            />
            {calSearch.length > 0 ? (
              <Pressable onPress={() => setCalSearch('')} hitSlop={8} style={{ marginRight: 6 }}>
                <FontAwesome name="times-circle" size={13} color={colors.textTertiary} />
              </Pressable>
            ) : null}
            <Pressable onPress={() => { setShowCalSearch(false); Keyboard.dismiss(); }} hitSlop={8}>
              <Text style={{ ...TextStyles.caption, color: ACCENT, fontWeight: '700' }}>Done</Text>
            </Pressable>
          </View>
          {calSearch.trim().length > 0 && (
            <ScrollView
              horizontal
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 12 }}
              style={{ maxHeight: 116 }}
            >
              {calSearching && calSearchResults.length === 0 && (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
                  <ActivityIndicator color={ACCENT} />
                </View>
              )}
              {!calSearching && calSearchResults.length === 0 && (
                <Text style={{ ...TextStyles.caption, color: colors.textSecondary, alignSelf: 'center', paddingHorizontal: 8 }}>
                  No matches for "{calSearch.trim()}"
                </Text>
              )}
              {calSearchResults.map((p: any) => {
                const photo = upscaleGoogleImage(p.image) || p.image || '';
                const neighborhood = (p.address || '').split(',')[0]?.trim() || '';
                const rating = typeof p.rating === 'number' && p.rating > 0 ? p.rating : null;
                return (
                  <View
                    key={p.id || p.name}
                    style={{
                      flexDirection: 'row', gap: 10,
                      backgroundColor: colors.cardBackground,
                      borderRadius: 10, borderWidth: 1, borderColor: colors.border,
                      padding: 8, width: 280, height: 100,
                    }}
                  >
                    {photo ? (
                      <Image
                        source={{ uri: photo }}
                        style={{ width: 64, height: 84, borderRadius: 8, backgroundColor: colors.surface }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ width: 64, height: 84, borderRadius: 8, backgroundColor: ACCENT + '15', alignItems: 'center', justifyContent: 'center' }}>
                        <FontAwesome name="map-marker" size={18} color={ACCENT} />
                      </View>
                    )}
                    <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 2 }}>
                      <View>
                        <Text style={{ ...TextStyles.bodyEm, color: colors.text }} numberOfLines={1}>{p.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          {rating && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <FontAwesome name="star" size={9} color="#f59e0b" />
                              <Text style={{ ...TextStyles.caption, color: colors.text, fontWeight: '600' }}>{rating.toFixed(1)}</Text>
                            </View>
                          )}
                          {rating && p.category ? <Text style={{ ...TextStyles.caption, color: colors.textTertiary }}>·</Text> : null}
                          {!!p.category && (
                            <Text style={{ ...TextStyles.caption, color: colors.textSecondary }} numberOfLines={1}>{p.category}</Text>
                          )}
                        </View>
                        {!!neighborhood && (
                          <Text style={{ ...TextStyles.caption, color: colors.textTertiary, marginTop: 2 }} numberOfLines={1}>
                            {neighborhood}
                          </Text>
                        )}
                      </View>
                      <Pressable
                        onPress={() => {
                          addGlanceActivity(selectedDayIndex, 'morning', p.name, p.category || 'Activity');
                          setCalSearch('');
                        }}
                        hitSlop={6}
                        style={{
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
                          backgroundColor: ACCENT, borderRadius: 8,
                          paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start',
                        }}
                      >
                        <FontAwesome name="plus" size={9} color="#fff" />
                        <Text style={{ ...TextStyles.caption, color: '#fff', fontWeight: '700' }}>Add to calendar</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {calendarOpen ? (
        <MobileCalendarView
          days={effectiveDays}
          selectedDayIndex={selectedDayIndex}
          visibleDayCount={calDayCount}
          imageMap={calendarImages}
          onDeleteActivity={(activityId) => {
            // Three-layer delete: (1) update glanceDays so the UI shrinks
            // immediately, (2) re-write trip_context.itinerary so any
            // AI-generated slot disappears on next read, (3) delete the
            // matching `activity` table row so `mergeUserActivities`
            // can't re-add it on refetch. All three are needed because
            // the itinerary view reads from BOTH sources.
            setGlanceDays((prev) => {
              if (prev.length === 0) return prev;
              let dayIdx = -1;
              const next = prev.map((day, di) => {
                let touched = false;
                const groups = day.timeGroups
                  .map((g) => {
                    const before = g.activities.length;
                    const filtered = g.activities.filter((a) => a.id !== activityId);
                    if (filtered.length !== before) touched = true;
                    return { ...g, activities: filtered };
                  })
                  .filter((g) => g.activities.length > 0);
                if (touched) dayIdx = di;
                return { ...day, timeGroups: groups };
              });
              if (dayIdx >= 0) {
                const allActivities = next[dayIdx].timeGroups.flatMap((g) => g.activities);
                persistReorderedDay(dayIdx, allActivities);
              }
              return next;
            });
            if (id) {
              (async () => {
                try {
                  await supabase.from('activity').delete().eq('id', activityId);
                  queryClient.invalidateQueries({ queryKey: ['trip-activities', id] });
                } catch {}
              })();
            }
          }}
          onEditTime={(activityId, newStart, newEnd) => {
            // Optimistic local update with both start + end times. Then
            // re-persist the day this activity lives in via the existing
            // `persistReorderedDay` helper (same write channel the drag-
            // to-move path uses), so the times stick on reload + sync.
            const hourInt = parseInt(newStart.split(':')[0], 10);
            const newTod: 'morning' | 'afternoon' | 'evening' | 'latenight' =
              hourInt < 12 ? 'morning' : hourInt < 17 ? 'afternoon' : hourInt < 21 ? 'evening' : 'latenight';
            setGlanceDays((prev) => {
              if (prev.length === 0) return prev;
              let dayIdx = -1;
              const next = prev.map((day, di) => {
                let touched = false;
                const groups = day.timeGroups.map((g) => ({
                  ...g,
                  activities: g.activities.map((a) => {
                    if (a.id !== activityId) return a;
                    touched = true;
                    return { ...a, startTime: newStart, endTime: newEnd, timeOfDay: newTod };
                  }),
                }));
                if (touched) dayIdx = di;
                return { ...day, timeGroups: groups };
              });
              if (dayIdx >= 0) {
                const allActivities = next[dayIdx].timeGroups.flatMap((g) => g.activities);
                persistReorderedDay(dayIdx, allActivities);
              }
              return next;
            });
          }}
          onSelectActivity={(a) => handleActivityPress(a.id)}
          onSelectDay={setSelectedDayIndex}
          onMoveActivity={(activityId, newHour, newDayIdx) => {
            const startDateStr = (trip as any)?.start_date;
            if (!startDateStr) return;
            const newDate = new Date(startDateStr + 'T12:00:00');
            newDate.setDate(newDate.getDate() + newDayIdx);
            const dateStr = newDate.toISOString().split('T')[0];
            const hourInt = Math.floor(newHour);
            const minuteInt = (newHour - hourInt) >= 0.5 ? 30 : 0;
            const endHourFloat = Math.min(23.5, newHour + 2);
            const endHourInt = Math.floor(endHourFloat);
            const endMinuteInt = (endHourFloat - endHourInt) >= 0.5 ? 30 : 0;
            const startTime = `${String(hourInt).padStart(2, '0')}:${String(minuteInt).padStart(2, '0')}`;
            const endTime = `${String(endHourInt).padStart(2, '0')}:${String(endMinuteInt).padStart(2, '0')}`;
            const newTod: 'morning' | 'afternoon' | 'evening' | 'latenight' =
              hourInt < 12 ? 'morning' : hourInt < 17 ? 'afternoon' : hourInt < 21 ? 'evening' : 'latenight';

            // Optimistic local move — update glanceDays so the block stays where dropped
            // even if the row isn't a real activity-table UUID (e.g. AI-generated trip
            // activities that live in trip_context.itinerary).
            setGlanceDays((prev) => {
              if (prev.length === 0) return prev;
              let movedActivity: any = null;
              const removed = prev.map((day) => {
                const newGroups = day.timeGroups
                  .map((g) => {
                    const idx = g.activities.findIndex((a) => a.id === activityId);
                    if (idx < 0) return g;
                    movedActivity = g.activities[idx];
                    return { ...g, activities: g.activities.filter((_, i) => i !== idx) };
                  })
                  .filter((g) => g.activities.length > 0);
                return { ...day, timeGroups: newGroups };
              });
              if (!movedActivity) return prev;
              const updated = { ...movedActivity, startTime, endTime, timeOfDay: newTod };
              return removed.map((day, di) => {
                if (di !== newDayIdx) return day;
                const existingGroup = day.timeGroups.find((g) => g.timeOfDay === newTod);
                let groups;
                if (existingGroup) {
                  groups = day.timeGroups.map((g) =>
                    g.timeOfDay === newTod
                      ? { ...g, activities: [...g.activities, updated].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')) }
                      : g
                  );
                } else {
                  groups = [...day.timeGroups, { timeOfDay: newTod, activities: [updated] }];
                }
                return { ...day, timeGroups: groups };
              });
            });

            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activityId);
            if (isUuid) {
              // Real DB row — update activity table
              supabase
                .from('activity')
                .update({
                  starting_date: dateStr,
                  ending_date: dateStr,
                  starting_time: startTime,
                  ending_time: endTime,
                })
                .eq('id', activityId)
                .then(({ error }) => {
                  if (error) {
                    console.warn('[calendar move] update failed:', error.message);
                    return;
                  }
                  queryClient.invalidateQueries({ queryKey: ['trip-activities', id] });
                });
            } else {
              // AI-generated activity — persist via trip_context.itinerary JSON
              const ctx: any = (trip as any)?.trip_context;
              const itinerary: any[] = Array.isArray(ctx?.itinerary) ? ctx.itinerary : [];
              if (!itinerary.length || !id) return;

              // Locate the slot by poi.id across all days
              let foundDayIdx = -1;
              let foundSlotIdx = -1;
              let foundSlot: any = null;
              for (let di = 0; di < itinerary.length; di++) {
                const slots = itinerary[di]?.slots ?? [];
                const si = slots.findIndex((s: any) => s?.poi?.id === activityId);
                if (si >= 0) {
                  foundDayIdx = di;
                  foundSlotIdx = si;
                  foundSlot = slots[si];
                  break;
                }
              }
              if (!foundSlot) return;

              const updatedSlot = { ...foundSlot, start_time: startTime, end_time: endTime };
              const nextItinerary = itinerary.map((day, di) => {
                const slots = (day?.slots ?? []).filter((_: any, si: number) => !(di === foundDayIdx && si === foundSlotIdx));
                if (di === newDayIdx) {
                  return { ...day, slots: [...slots, updatedSlot].sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || '')) };
                }
                return { ...day, slots };
              });

              const nextContext = { ...ctx, itinerary: nextItinerary };
              supabase
                .from('trips')
                .update({ trip_context: nextContext })
                .eq('id', id)
                .then(({ error }) => {
                  if (error) {
                    console.warn('[calendar move] trip_context update failed:', error.message);
                    return;
                  }
                  queryClient.invalidateQueries({ queryKey: ['trip', id] });
                });
            }
          }}
        />
      ) : viewMode === 'glance' ? (
        <GlancePager
          days={effectiveDays}
          selectedDayIndex={selectedDayIndex}
          onSelectDay={setSelectedDayIndex}
          arrivalFlightNumber={arrivalFlightNumber}
          returnFlightNumber={returnFlightNumber}
          onRemoveActivity={removeGlanceActivity}
          onRegenerateActivity={regenerateGlanceActivity}
          onAddActivity={addGlanceActivity}
          onReorderDay={reorderGlanceDay}
          onUpdateTime={updateActivityTime}
          onActivityPress={handleActivityPress}
          discoverPool={discoverPool}
          sunrise={(trip?.trip_context as any)?.sunrise ?? null}
          timeFormat={timeFormat}
          toggleTimeFormat={toggleTimeFormat}
        />
      ) : (
      <View style={{ flex: 1 }}>
        {/* Itinerary content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingTop: 14,
            paddingBottom: 32,
          }}
        >
          {selectedDay && (
            <View>
              {/* Arrival flight on first day */}
              {isFirstDay && arrivalFlight && (
                <FlightSection flight={arrivalFlight} collapsed={allCollapsedOverride ?? undefined} />
              )}

              {/* Hotel check-in on first day */}
              {isFirstDay && (
                <HotelSection
                  hotel={tripHotel}
                  label={`Check-in \u00b7 ${selectedDay.dateLabel}`}
                  collapsed={allCollapsedOverride ?? undefined}
                />
              )}

              {/* Time groups */}
              {selectedDay.timeGroups.map((group) => (
                <View key={group.timeOfDay}>
                  <TimeGroupSection
                    group={group}
                    collapsed={collapsedSections[group.timeOfDay]}
                    onToggleCollapse={toggleSectionCollapse}
                    onAddActivity={handleAddActivity}
                    onActivityPress={handleActivityPress}
                    activityImages={activityImages}
                    colorOverride={itineraryColorOverrides[group.timeOfDay] ?? theme.itineraryColors[group.timeOfDay as keyof typeof theme.itineraryColors]}
                    timeFormat={timeFormat}
                  />
                  {addingTo === group.timeOfDay && (
                    <BrowseActivityPanel
                      timeOfDay={group.timeOfDay}
                      items={filteredDiscoverItems}
                      search={addSearch}
                      onSearchChange={setAddSearch}
                      category={addCategory}
                      onCategoryChange={setAddCategory}
                      favorites={favorites}
                      onToggleFavorite={toggleFavorite}
                      onAdd={(item) => handleAddItem(item, group.timeOfDay)}
                      onClose={() => { setAddingTo(null); setAddSearch(''); setAddCategory('All'); }}
                    />
                  )}
                </View>
              ))}

              {/* Hotel nightly on middle days */}
              {!isFirstDay && !isLastDay && (
                <HotelSection
                  hotel={tripHotel}
                  label={`Night ${selectedDay.dayNumber} \u00b7 ${selectedDay.dateLabel}`}
                  collapsed={allCollapsedOverride ?? undefined}
                />
              )}

              {/* Checkout + return flight on last day */}
              {isLastDay && (
                <>
                  <CheckoutSection
                    hotelName={tripHotel.name}
                    hotelAddress={tripHotel.address}
                    checkOutTime={tripHotel.checkOutTime}
                    collapsed={allCollapsedOverride ?? undefined}
                  />
                  {returnFlight && (
                    <FlightSection flight={returnFlight} collapsed={allCollapsedOverride ?? undefined} />
                  )}
                </>
              )}

              {/* Day notes */}
              {selectedDay.notes && (
                <View style={{
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  padding: 12,
                  marginTop: 4,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                }}>
                  <Text style={{ ...TextStyles.body, color: colors.textSecondary, fontStyle: 'italic' }}>
                    {selectedDay.notes}
                  </Text>
                </View>
              )}

            </View>
          )}
        </ScrollView>

      </View>
      )}
    </View>

      {/* Map modal — full screen like Places page */}
      {mapOpen && selectedDay && (
        <DayMap
          todayActivities={selectedDay.timeGroups.flatMap((g) => g.activities ?? [])}
          allActivities={days.flatMap((d) => d.timeGroups.flatMap((g) => g.activities ?? []))}
          onClose={() => setMapOpen(false)}
          centerLat={centerLat}
          centerLng={centerLng}
          discoverPool={discoverPool}
        />
      )}

      {/* Activity detail — magazine card overlay */}
      {openPlace && cardReady && (
        <CardStackCarousel
          places={allPlacesFromDiscover}
          initialIndex={Math.max(0, allPlacesFromDiscover.findIndex((p) => p.id === openPlace.id))}
          favorites={favorites}
          onToggleFav={toggleFavorite}
          onAddToTrip={addToTrip}
          tripSheet={{ state: tripSheetState, selectTrip, selectDay, dismiss, createTrip }}
          overlay
          onClose={() => setSelectedActivityId(null)}
        />
      )}

    </PageTransition>
  );
}
