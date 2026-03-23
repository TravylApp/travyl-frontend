import { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import { View, ScrollView, Text, Pressable, TextInput, Image, Animated, PanResponder, Dimensions, Modal, FlatList, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  useItineraryScreen,
  ITINERARY_COLORS,
  MOCK_FLIGHT_DETAILS,
  MOCK_HOTEL_DETAIL,
  MOCK_DISCOVER_ACTIVITIES,
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
} from '@travyl/shared';
import type { MockFlightDetail, MockHotelDetail, DiscoverItem, ActivityViewModel, ItineraryDayViewModel } from '@travyl/shared';
import MapView, { Marker } from 'react-native-maps';
import { DaySelector, TimeGroupSection } from '@/components/itinerary';
import type { MapMarker } from '@/components/itinerary/MapPreview';
import { useThemeColors } from '@/hooks/useThemeColors';
import { CardStackCarousel } from '@/components/places/CardStackCarousel';
import { discoverItemToPlaceItem } from '@/utils/discoverToPlace';
import { PageTransition, TabCtx, useTabAccent } from './_layout';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';


function parseHour(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return hour;
}

// ─── Match itinerary activity → DiscoverItem by keyword overlap ──────
const STOP_WORDS = new Set(['the', 'at', 'a', 'an', 'of', 'in', 'to', 'and', 'le', 'la', 'de', 'du', 'des']);

function findDiscoverMatch(activityName: string): typeof MOCK_DISCOVER_ACTIVITIES[number] | undefined {
  const keywords = activityName.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  let bestMatch: typeof MOCK_DISCOVER_ACTIVITIES[number] | undefined;
  let bestScore = 0;
  for (const d of MOCK_DISCOVER_ACTIVITIES) {
    const dLower = d.name.toLowerCase();
    const score = keywords.filter((kw) => dLower.includes(kw)).length;
    if (score > bestScore) { bestScore = score; bestMatch = d; }
  }
  return bestScore >= 1 ? bestMatch : undefined;
}

// ─── DayMap — activity markers + explore mode at bottom of itinerary ─

// Generate mock coordinates spread around destination center for each activity
function mockActivityCoords(index: number, total: number, centerLat: number, centerLng: number): { lat: number; lng: number } {
  const spread = 0.018; // ~1.8km radius
  const angle = (index / Math.max(total, 1)) * 2 * Math.PI;
  const r = spread * (0.4 + (index % 3) * 0.3);
  return {
    lat: centerLat + r * Math.sin(angle),
    lng: centerLng + r * Math.cos(angle),
  };
}

function buildMarkers(activities: ActivityViewModel[], accent: string, centerLat: number, centerLng: number): MapMarker[] {
  return activities.map((a, i) => {
    const coords = mockActivityCoords(i, activities.length, centerLat, centerLng);
    return {
      lat: coords.lat,
      lng: coords.lng,
      label: a.name,
      color: accent,
      number: i + 1,
    };
  });
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

function DayMap({ todayActivities, allActivities, onClose, centerLat, centerLng }: {
  todayActivities: ActivityViewModel[];
  allActivities: ActivityViewModel[];
  onClose: () => void;
  centerLat: number;
  centerLng: number;
}) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('itinerary');
  const [exploreSearch, setExploreSearch] = useState('');

  // Customization state
  const [routeColor, setRouteColor] = useState(ACCENT);
  const [stopOrder, setStopOrder] = useState<number[]>([]);
  const [showExploreOnMap, setShowExploreOnMap] = useState(true);
  const [selectedStop, setSelectedStop] = useState<number | null>(null);
  const mapRef = useRef<MapView>(null);

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

  // Initialize stop order when activities change
  useEffect(() => {
    setStopOrder(todayActivities.map((_, i) => i));
  }, [todayActivities.length]);

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
    stopOrder.length === todayActivities.length
      ? stopOrder.map((i) => todayActivities[i])
      : todayActivities,
    [stopOrder, todayActivities],
  );

  const markers = useMemo(() => buildMarkers(orderedActivities, ACCENT, centerLat, centerLng), [orderedActivities, ACCENT, centerLat, centerLng]);

  const focusStop = useCallback((index: number) => {
    setSelectedStop((prev) => {
      if (prev === index) {
        mapRef.current?.animateToRegion({
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }, 400);
        return null;
      }
      const m = markers[index];
      if (m) {
        mapRef.current?.animateToRegion({
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
    let items = MOCK_DISCOVER_ACTIVITIES;
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
            color: '#94a3b8',
            muted: true,
          }))
      : [],
    [exploreItems, showExploreOnMap],
  );

  const allMarkers = useMemo(() => [...markers, ...exploreMarkers], [markers, exploreMarkers]);

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
            onPress={() => mapRef.current?.animateToRegion({
              latitude: centerLat,
              longitude: centerLng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }, 400)}
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
              return (
                <Pressable
                  key={activity.id ?? `stop-${i}`}
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
                      <Text style={{ ...TextStyles.captionEm, color: '#6366f1', marginTop: 3 }}>
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

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

function MobileCalendarView({ days, selectedDayIndex }: { days: any[]; selectedDayIndex: number }) {
  const colors = useThemeColors();
  const selectedDay = days[selectedDayIndex];
  if (!selectedDay) return null;

  // Collect all activities from all time groups
  const allActivities = selectedDay.timeGroups?.flatMap((g: any) => g.activities ?? []) ?? [];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
      {HOURS.map((hour) => {
        const timeLabel = hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
        const activities = allActivities.filter((a: any) => {
          if (!a.startTime) return false;
          const actHour = parseHour(a.startTime);
          return actHour === hour;
        });

        return (
          <View key={hour} style={{ flexDirection: 'row', minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            {/* Hour label */}
            <View style={{ width: 48, paddingRight: 8, paddingTop: 4, alignItems: 'flex-end' }}>
              <Text style={{ ...TextStyles.sm, color: colors.textTertiary }}>{timeLabel}</Text>
            </View>
            {/* Activities in this hour */}
            <View style={{ flex: 1, paddingVertical: 2, paddingHorizontal: 4, gap: 2 }}>
              {activities.map((activity: any) => {
                const bgColor = getActivityTypeColor(activity.category).primary;
                return (
                  <View
                    key={activity.id}
                    style={{
                      backgroundColor: bgColor,
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      borderRadius: 6,
                      borderLeftWidth: 3,
                      borderLeftColor: adjustBrightness(bgColor, -30),
                    }}
                  >
                    <Text style={{ ...TextStyles.captionEm, color: '#fff' }} numberOfLines={1}>
                      {activity.name}
                    </Text>
                    {activity.startTime && (
                      <Text style={{ ...TextStyles.xs, color: 'rgba(255,255,255,0.7)' }}>
                        {activity.startTime}{activity.endTime ? ` - ${activity.endTime}` : ''}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
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

function FlightSection({ flight, collapsed }: { flight: MockFlightDetail; collapsed?: boolean }) {
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
                  <View style={{ backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
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
          borderColor: '#bfdbfe',
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
                <Text style={{ ...TextStyles.smEm, color: '#10b981' }}>Direct</Text>
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

function HotelSection({ hotel, label, collapsed }: { hotel: MockHotelDetail; label: string; collapsed?: boolean }) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('itinerary');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (collapsed !== undefined) setExpanded(!collapsed);
  }, [collapsed]);

  const roomPrice = hotel.rooms.find((r) => r.isSelected)?.pricePerNight ?? hotel.rooms[0]?.pricePerNight ?? 0;
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
            {hotel.rooms.length > 0 && (() => {
              const selectedRoom = hotel.rooms.find((r) => r.isSelected) ?? hotel.rooms[0];
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
            {hotel.amenities.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {hotel.amenities.map((amenity) => (
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
function AddActivityPanel({ dayIndex, timeOfDay, days, onAddActivity }: {
  dayIndex: number; timeOfDay: string;
  days: ItineraryDayViewModel[];
  onAddActivity: (dayIndex: number, timeOfDay: string, name: string, category: string) => void;
}) {
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return MOCK_DISCOVER_ACTIVITIES.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    ).slice(0, 4);
  }, [query]);

  const handleQuickFill = useCallback((filter: string | null) => {
    const allIds = days.flatMap((d) => d.timeGroups.flatMap((g) => g.activities.map((a) => a.id)));
    const item = pickRandomActivity(filter, allIds);
    if (item) {
      onAddActivity(dayIndex, timeOfDay, item.name, item.category || 'activity');
    }
    setOpen(false);
    setQuery('');
  }, [days, dayIndex, timeOfDay, onAddActivity]);

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
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
  onRemoveActivity, onRegenerateActivity, onAddActivity, onReorderDay, onUpdateTime, onActivityPress,
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
}) {
  const colors = useThemeColors();
  const { width: screenW } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const isScrolling = useRef(false);

  // Scroll to selected day when tapped from DaySelector
  useEffect(() => {
    if (!isScrolling.current) {
      flatListRef.current?.scrollToIndex({ index: selectedDayIndex, animated: true });
    }
  }, [selectedDayIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      onSelectDay(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const renderDay = useCallback(({ item: day, index: i }: { item: ItineraryDayViewModel; index: number }) => {
    const isFirstDay = i === 0;
    const isLastDay = i === days.length - 1;

    // Flat list of real activities only — no placeholders
    const allTods: Array<'morning' | 'afternoon' | 'evening' | 'latenight'> = ['morning', 'afternoon', 'evening', 'latenight'];
    const activeTods = new Set(day.timeGroups.map((g) => g.timeOfDay));
    const flatItems = day.timeGroups.flatMap((g) => g.activities);

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
        {isFirstDay && arrivalFlightNumber && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 8, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            <FontAwesome name="plane" size={11} color="#4ade80" />
            <Text style={{ ...TextStyles.bodyEm, color: colors.text }}>Arrive — {arrivalFlightNumber}</Text>
          </View>
        )}
        {/* Empty groups before first populated group */}
        {emptyTodsBefore.map((tod) => (
          <View key={tod} style={{ paddingHorizontal: 20, marginBottom: 8 }}>
            <Text style={{ ...TextStyles.micro, letterSpacing: 2, textTransform: 'uppercase', color: '#c8a96a', marginBottom: 4, opacity: 0.4 }}>
              {TIME_OF_DAY_CONFIG[tod as keyof typeof TIME_OF_DAY_CONFIG].label}
            </Text>
            <AddActivityPanel dayIndex={i} timeOfDay={tod} days={days} onAddActivity={onAddActivity} />
          </View>
        ))}
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
        {emptyTodsAfter.map((tod) => (
          <View key={tod} style={{ paddingHorizontal: 20, marginTop: 8 }}>
            <Text style={{ ...TextStyles.micro, letterSpacing: 2, textTransform: 'uppercase', color: '#c8a96a', marginBottom: 4, opacity: 0.4 }}>
              {TIME_OF_DAY_CONFIG[tod as keyof typeof TIME_OF_DAY_CONFIG].label}
            </Text>
            <AddActivityPanel dayIndex={i} timeOfDay={tod} days={days} onAddActivity={onAddActivity} />
          </View>
        ))}
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

            return (
              <View style={{ paddingHorizontal: 20 }}>
                {showHeader && !isActive && (
                  <Text style={{
                    ...TextStyles.micro, letterSpacing: 2,
                    textTransform: 'uppercase', color: '#c8a96a',
                    marginBottom: 4, marginTop: currentIdx > 0 ? 10 : 0, opacity: 0.7,
                  }}>
                    {config.label}
                  </Text>
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
                  <AddActivityPanel dayIndex={i} timeOfDay={currentTod} days={days} onAddActivity={onAddActivity} />
                )}
                {emptyGapTods.map((tod) => (
                  <View key={tod} style={{ marginTop: 10 }}>
                    <Text style={{ ...TextStyles.micro, letterSpacing: 2, textTransform: 'uppercase', color: '#c8a96a', marginBottom: 4, opacity: 0.4 }}>
                      {TIME_OF_DAY_CONFIG[tod as keyof typeof TIME_OF_DAY_CONFIG].label}
                    </Text>
                    <AddActivityPanel dayIndex={i} timeOfDay={tod} days={days} onAddActivity={onAddActivity} />
                  </View>
                ))}
              </View>
            );
          }}
        />
      </GestureHandlerRootView>
    );
  }, [days, colors, screenW, arrivalFlightNumber, returnFlightNumber, onRemoveActivity, onRegenerateActivity, onReorderDay, onAddActivity, onUpdateTime, onActivityPress]);

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip, days, selectedDayIndex, setSelectedDayIndex, selectedDay, flights, isLoading, isEmpty } =
    useItineraryScreen(id);
  const centerLat = trip?.trip_context?.lat ?? 0;
  const centerLng = trip?.trip_context?.lng ?? 0;
  const { calendarOpen, mapOpen, setMapOpen, theme, itineraryColorOverrides, setHeroImageOverride } = useContext(TabCtx);
  const isFocused = useIsFocused();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [allCollapsedOverride, setAllCollapsedOverride] = useState<boolean | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addCategory, setAddCategory] = useState('All');
  const [addSearch, setAddSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [openPlace, setOpenPlace] = useState<import('@travyl/shared').PlaceItem | null>(null);
  const [viewMode, setViewMode] = useState<'glance' | 'detailed'>('glance');

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

  const removeGlanceActivity = useCallback((dayIndex: number, activityId: string) => {
    setGlanceDays((prev) => prev.map((day, di) => {
      if (di !== dayIndex) return day;
      return {
        ...day,
        timeGroups: day.timeGroups
          .map((g) => ({ ...g, activities: g.activities.filter((a) => a.id !== activityId) }))
          .filter((g) => g.activities.length > 0),
        activityCount: day.activityCount - 1,
      };
    }));
  }, []);

  const regenerateGlanceActivity = useCallback((dayIndex: number, activityId: string) => {
    setGlanceDays((prev) => {
      const allIds = prev.flatMap((d) => d.timeGroups.flatMap((g) => g.activities.map((a) => a.id)));
      const current = prev[dayIndex]?.timeGroups.flatMap((g) => g.activities).find((a) => a.id === activityId);
      if (!current) return prev;
      const replacement = pickRandomActivity(current.category, allIds);
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
  }, []);

  const addGlanceActivity = useCallback((dayIndex: number, timeOfDay: string, name: string, category: string) => {
    const newAct: ActivityViewModel = {
      id: `add-${Date.now()}`,
      name,
      category,
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
    setGlanceDays((prev) => prev.map((day, di) => {
      if (di !== dayIndex) return day;
      const hasGroup = day.timeGroups.some((g) => g.timeOfDay === timeOfDay);
      return {
        ...day,
        timeGroups: hasGroup
          ? day.timeGroups.map((g) => g.timeOfDay === timeOfDay ? { ...g, activities: [...g.activities, newAct] } : g)
          : [...day.timeGroups, { timeOfDay: timeOfDay as ActivityViewModel['timeOfDay'], activities: [newAct] }],
        activityCount: day.activityCount + 1,
      };
    }));
  }, []);

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
      return next;
    });
  }, []);

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
      return next;
    });
  }, []);

  // (Map is now a modal overlay — no need to collapse sections)

  const arrivalFlightNumber = flights[0]?.flightNumber ?? null;
  const returnFlightNumber = flights[1]?.flightNumber ?? null;
  const arrivalFlight = MOCK_FLIGHT_DETAILS.find((f) => f.type === 'arrival');
  const returnFlight = MOCK_FLIGHT_DETAILS.find((f) => f.type === 'return');

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
    let items = MOCK_DISCOVER_ACTIVITIES;
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
    const map = new Map<string, typeof MOCK_DISCOVER_ACTIVITIES[number]>();
    for (const day of effectiveDays) {
      for (const group of day.timeGroups) {
        for (const activity of group.activities) {
          if (!map.has(activity.id)) {
            const match = findDiscoverMatch(activity.name);
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
    const allImages = MOCK_DISCOVER_ACTIVITIES.flatMap((d) => d.images ?? []).filter(Boolean);
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

  const dayHeroImages = useMemo(() => {
    const allImages = MOCK_DISCOVER_ACTIVITIES.flatMap((d) => d.images ?? []).filter(Boolean);
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
  useEffect(() => {
    if (!isFocused) {
      setHeroImageOverride(null);
      return;
    }
    // Glance mode: use curated per-day hero images; detailed: use activity-matched images
    const img = viewMode === 'glance'
      ? GLANCE_HERO_IMAGES[selectedDayIndex % GLANCE_HERO_IMAGES.length]
      : dayHeroImages[selectedDayIndex];
    if (img) setHeroImageOverride(img);
    return () => setHeroImageOverride(null);
  }, [selectedDayIndex, dayHeroImages, isFocused, viewMode]);

  // Build PlaceItem for tapped activity — try matching DiscoverItem first, fall back to ActivityViewModel
  // Capture place data once when activity is selected — stable reference for the modal
  useEffect(() => {
    if (!selectedActivityId) { setOpenPlace(null); return; }
    const currentDay = effectiveDays[selectedDayIndex] ?? selectedDay;
    if (!currentDay) { setOpenPlace(null); return; }
    const allActivities = currentDay.timeGroups.flatMap((g) => g.activities);
    const activity = allActivities.find((a) => a.id === selectedActivityId);
    if (!activity) { setOpenPlace(null); return; }

    const discoverMatch = discoverMatchMap.get(activity.id);
    if (discoverMatch) { setOpenPlace(discoverItemToPlaceItem(discoverMatch)); return; }

    const idx = allActivities.indexOf(activity);
    const coords = mockActivityCoords(idx, allActivities.length, centerLat, centerLng);
    setOpenPlace({
      id: activity.id,
      name: activity.name,
      image: '',
      type: 'attraction' as const,
      rating: 4.5,
      tagline: activity.locationName ?? '',
      category: activity.category ?? 'Activity',
      description: activity.notes ?? undefined,
      latitude: coords.lat,
      longitude: coords.lng,
      duration: activity.timeDisplay ?? undefined,
      admissionFee: activity.costDisplay ?? undefined,
      website: activity.bookingUrl ?? undefined,
    });
  }, [selectedActivityId]); // Only run when selection changes, not on every data mutation

  const allPlacesFromDiscover = useMemo(
    () => MOCK_DISCOVER_ACTIVITIES.map(discoverItemToPlaceItem),
    [],
  );

  if ((isLoading || isEmpty) && !calendarOpen && !mapOpen) {
    return <PageTransition><ItinerarySkeleton /></PageTransition>;
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
        {/* Quick-add button */}
        {!calendarOpen && (
          <Pressable
            onPress={() => {
              setViewMode('detailed');
              setAddingTo('morning');
              setAddCategory('All');
              setAddSearch('');
            }}
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
            <FontAwesome name="plus" size={13} color="#c8a96a" />
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
        {/* View Toggle — inline next to collapse button */}
        {!calendarOpen && (
          <ViewToggle mode={viewMode} onToggle={setViewMode} accent={ACCENT} />
        )}
      </View>

      {calendarOpen ? (
        <MobileCalendarView days={days} selectedDayIndex={selectedDayIndex} />
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
          onActivityPress={setSelectedActivityId}
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
                  hotel={MOCK_HOTEL_DETAIL}
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
                    onActivityPress={setSelectedActivityId}
                    activityImages={activityImages}
                    colorOverride={itineraryColorOverrides[group.timeOfDay] ?? theme.itineraryColors[group.timeOfDay as keyof typeof theme.itineraryColors]}
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
                  hotel={MOCK_HOTEL_DETAIL}
                  label={`Night ${selectedDay.dayNumber} \u00b7 ${selectedDay.dateLabel}`}
                  collapsed={allCollapsedOverride ?? undefined}
                />
              )}

              {/* Checkout + return flight on last day */}
              {isLastDay && (
                <>
                  <CheckoutSection
                    hotelName={MOCK_HOTEL_DETAIL.name}
                    hotelAddress={MOCK_HOTEL_DETAIL.address}
                    checkOutTime={MOCK_HOTEL_DETAIL.checkOutTime}
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
        />
      )}

      {/* Activity detail — magazine card overlay */}
      {openPlace && (
        <CardStackCarousel
          places={allPlacesFromDiscover}
          initialIndex={Math.max(0, allPlacesFromDiscover.findIndex((p) => p.id === openPlace.id))}
          favorites={favorites}
          onToggleFav={toggleFavorite}
          overlay
          onClose={() => setSelectedActivityId(null)}
        />
      )}
    </PageTransition>
  );
}
