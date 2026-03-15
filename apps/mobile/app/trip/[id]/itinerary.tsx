import { useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react';
import { View, ScrollView, Text, Pressable, TextInput, Image, Animated, PanResponder, Dimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  useItineraryScreen,
  ITINERARY_COLORS,
  MOCK_FLIGHT_DETAILS,
  MOCK_HOTEL_DETAIL,
  MOCK_DISCOVER_ACTIVITIES,
  MOCK_DESTINATION_COORDS,
  adjustBrightness,
} from '@travyl/shared';
import type { MockFlightDetail, MockHotelDetail, DiscoverItem, ActivityViewModel } from '@travyl/shared';
import { getActivityTypeColor } from '@travyl/shared';
import { DaySelector, TimeGroupSection } from '@/components/itinerary';
import { MapPreview } from '@/components/itinerary/MapPreview';
import type { MapMarker, MapPreviewHandle } from '@/components/itinerary/MapPreview';
import { useThemeColors } from '@/hooks/useThemeColors';
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

// ─── DayMap — activity markers + explore mode at bottom of itinerary ─

// Generate mock coordinates spread around Paris center for each activity
function mockActivityCoords(index: number, total: number): { lat: number; lng: number } {
  const spread = 0.018; // ~1.8km radius
  const angle = (index / Math.max(total, 1)) * 2 * Math.PI;
  const r = spread * (0.4 + (index % 3) * 0.3);
  return {
    lat: MOCK_DESTINATION_COORDS.lat + r * Math.sin(angle),
    lng: MOCK_DESTINATION_COORDS.lng + r * Math.cos(angle),
  };
}

function buildMarkers(activities: ActivityViewModel[], accent: string): MapMarker[] {
  return activities.map((a, i) => {
    const coords = mockActivityCoords(i, activities.length);
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
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{title}</Text>
          {count != null && (
            <View style={{
              backgroundColor: accent + '20', borderRadius: 8,
              paddingHorizontal: 6, paddingVertical: 1,
            }}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: accent }}>{count}</Text>
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
// Snap points: PEEK (just handle + header), DEFAULT (map visible), EXPANDED (near full screen)
const SCREEN_H = Dimensions.get('window').height;
const SHEET_PEEK = 44;        // drag handle + header row
const SHEET_DEFAULT = 320;    // map + header
const SHEET_EXPANDED = Math.round(SCREEN_H * 0.75);
const SNAP_POINTS = [0, SHEET_PEEK, SHEET_DEFAULT, SHEET_EXPANDED];

function snapTo(value: number): number {
  let best = SNAP_POINTS[0];
  let bestDist = Math.abs(value - best);
  for (const p of SNAP_POINTS) {
    const d = Math.abs(value - p);
    if (d < bestDist) { best = p; bestDist = d; }
  }
  return best;
}

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

function DayMap({ todayActivities, allActivities, onClose }: {
  todayActivities: ActivityViewModel[];
  allActivities: ActivityViewModel[];
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('itinerary');
  const [exploreSearch, setExploreSearch] = useState('');

  // Customization state
  const [routeColor, setRouteColor] = useState(ACCENT);
  const [stopOrder, setStopOrder] = useState<number[]>([]);
  const [showExploreOnMap, setShowExploreOnMap] = useState(true);
  const [selectedStop, setSelectedStop] = useState<number | null>(null);
  const mapRef = useRef<MapPreviewHandle>(null);

  // Sheet height animation
  const sheetHeight = useRef(new Animated.Value(SHEET_DEFAULT)).current;
  const currentHeight = useRef(SHEET_DEFAULT);
  const startHeight = useRef(SHEET_DEFAULT);

  // Track height for expand button
  const [measuredHeight, setMeasuredHeight] = useState(SHEET_DEFAULT);

  // Initialize stop order when activities change
  useEffect(() => {
    setStopOrder(todayActivities.map((_, i) => i));
  }, [todayActivities.length]);

  useEffect(() => {
    const id = sheetHeight.addListener(({ value }) => {
      currentHeight.current = value;
    });
    return () => sheetHeight.removeListener(id);
  }, [sheetHeight]);

  const animateTo = useCallback((target: number) => {
    if (target <= 0) {
      Animated.spring(sheetHeight, {
        toValue: 0, tension: 100, friction: 15, useNativeDriver: false,
      }).start(() => onClose());
    } else {
      Animated.spring(sheetHeight, {
        toValue: target, tension: 100, friction: 15, useNativeDriver: false,
      }).start(() => setMeasuredHeight(target));
    }
  }, [sheetHeight, onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 4,
      onPanResponderGrant: () => {
        startHeight.current = currentHeight.current;
      },
      onPanResponderMove: (_, { dy }) => {
        const next = Math.max(0, Math.min(SHEET_EXPANDED, startHeight.current - dy));
        sheetHeight.setValue(next);
      },
      onPanResponderRelease: (_, { vy }) => {
        const cur = currentHeight.current;
        if (vy < -0.5) {
          const upper = SNAP_POINTS.find((p) => p > cur + 20) ?? SHEET_EXPANDED;
          animateTo(upper);
        } else if (vy > 0.5) {
          const lower = [...SNAP_POINTS].reverse().find((p) => p < cur - 20) ?? 0;
          animateTo(lower);
        } else {
          animateTo(snapTo(cur));
        }
      },
    })
  ).current;

  const focusStop = useCallback((index: number) => {
    setSelectedStop((prev) => {
      if (prev === index) {
        // Deselect — reset view
        mapRef.current?.resetView();
        return null;
      }
      mapRef.current?.focusMarker(index);
      return index;
    });
  }, []);

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

  const markers = useMemo(() => buildMarkers(orderedActivities, ACCENT), [orderedActivities, ACCENT]);

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

  return (
    <Animated.View style={{
      height: sheetHeight,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      borderTopLeftRadius: 14,
      borderTopRightRadius: 14,
      overflow: 'hidden',
    }}>
      {/* Drag handle */}
      <View {...panResponder.panHandlers}>
        <View style={{ alignItems: 'center', paddingTop: 6, paddingBottom: 2 }}>
          <View style={{
            width: 36, height: 4, borderRadius: 2,
            backgroundColor: colors.textTertiary + '40',
          }} />
        </View>

        {/* Header bar */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 12, paddingVertical: 4,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <FontAwesome name="map" size={10} color={ACCENT} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
              {markers.length} {markers.length === 1 ? 'stop' : 'stops'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Pressable
              onPress={() => animateTo(measuredHeight >= SHEET_EXPANDED ? SHEET_DEFAULT : SHEET_EXPANDED)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: colors.borderLight,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FontAwesome
                name={measuredHeight >= SHEET_EXPANDED ? 'compress' : 'expand'}
                size={10}
                color={colors.textSecondary}
              />
            </Pressable>
            <Pressable
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: colors.borderLight,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <FontAwesome name="times" size={10} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Map fills the space above collapsible sections */}
      <View style={{ flex: 1, minHeight: 120 }}>
        <MapPreview
          ref={mapRef}
          lat={MOCK_DESTINATION_COORDS.lat}
          lng={MOCK_DESTINATION_COORDS.lng}
          markers={allMarkers}
          flex
          borderless
          routeColor={routeColor}
        />
      </View>

      {/* Collapsible sections scroll underneath */}
      <ScrollView style={{ maxHeight: 300 }} bounces={false} showsVerticalScrollIndicator={false} nestedScrollEnabled>

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
                    <Text style={{ fontSize: isSelected ? 11 : 10, fontWeight: '700', color: '#fff' }}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{
                      fontSize: 12, fontWeight: isSelected ? '600' : '500',
                      color: isSelected ? ACCENT : colors.text,
                    }}>
                      {activity.name}
                    </Text>
                    {activity.startTime && (
                      <Text style={{ fontSize: 10, color: colors.textTertiary }}>{activity.startTime}</Text>
                    )}
                  </View>
                  <View style={{
                    backgroundColor: ACCENT + '18', borderRadius: 6,
                    paddingHorizontal: 6, paddingVertical: 2,
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: '500', color: ACCENT }}>{activity.category}</Text>
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
                style={{ flex: 1, fontSize: 12, color: colors.text, paddingVertical: 0 }}
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
                    <Text numberOfLines={2} style={{ fontSize: 11, fontWeight: '600', color: colors.text, lineHeight: 14 }}>
                      {item.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      {item.rating && (
                        <>
                          <FontAwesome name="star" size={9} color="#f59e0b" />
                          <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '500' }}>{item.rating}</Text>
                        </>
                      )}
                      {item.category && (
                        <Text style={{ fontSize: 9, color: colors.textTertiary }}> · {item.category}</Text>
                      )}
                    </View>
                    {item.price && (
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#6366f1', marginTop: 3 }}>
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
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Route Color</Text>
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
                <Text style={{ fontSize: 11, fontWeight: '500', color: colors.text }}>Show nearby on map</Text>
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
  );
}

// ─── MobileCalendarView ─────────────────────────────────────

function MobileCalendarView({ days, selectedDayIndex }: { days: any[]; selectedDayIndex: number }) {
  const colors = useThemeColors();
  const selectedDay = days[selectedDayIndex];
  if (!selectedDay) return null;

  const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

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
              <Text style={{ fontSize: 10, color: colors.textTertiary }}>{timeLabel}</Text>
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
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }} numberOfLines={1}>
                      {activity.name}
                    </Text>
                    {activity.startTime && (
                      <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>
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
  const colors = useThemeColors();
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
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{label}</Text>
                {flight.isBooked && (
                  <View style={{ backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#fff' }}>Booked</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>
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
                <Text style={{ fontSize: 11, color: colors.textTertiary, marginBottom: 2 }}>Departure</Text>
                <Text style={{ fontSize: 22, color: ACCENT, fontWeight: '700' }}>{flight.originIata}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 4 }}>{flight.departureTime}</Text>
                <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }}>{flight.departureTerminal}</Text>
                <Text style={{ fontSize: 10, color: colors.textTertiary }}>Gate {flight.gate}</Text>
                <Text style={{ fontSize: 10, color: colors.textTertiary }}>Boarding: {flight.boardingTime}</Text>
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
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 12 }}>{flight.duration}</Text>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#10b981' }}>Direct</Text>
              </View>

              {/* Arrival */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: colors.textTertiary, marginBottom: 2 }}>Arrival</Text>
                <Text style={{ fontSize: 22, color: ACCENT, fontWeight: '700' }}>{flight.destIata}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 4 }}>{flight.arrivalTime}</Text>
                <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }}>{flight.arrivalTerminal}</Text>
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
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{flight.airline}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Check-in: {flight.boardingTime}</Text>
                <View style={{ backgroundColor: ACCENT + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: ACCENT }}>{flight.status}</Text>
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
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>{row.left.label}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{row.left.value}</Text>
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 12 }}>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>{row.right.label}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{row.right.value}</Text>
                  </View>
                </View>
              ))}
              {/* Confirmation */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Confirmation</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: ACCENT, fontFamily: 'monospace' }}>{flight.confirmation}</Text>
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
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>Per traveler</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: ACCENT }}>${flight.pricePerTraveler}</Text>
                <Text style={{ fontSize: 10, color: colors.textTertiary }}>Total: ${flight.totalPrice}</Text>
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
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>
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
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>{hotel.name}</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>
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
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#fff' }}>
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
                <Text style={{ fontSize: 10, fontWeight: '600', color: ACCENT }}>
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
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4 }}>{hotel.name}</Text>

            {/* Check-in / Check-out times */}
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 12 }}>
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
                <Text style={{ fontSize: 12, color: colors.text, lineHeight: 17 }}>{hotel.address}</Text>
                {hotel.neighborhood && (
                  <Text style={{ fontSize: 10, color: ACCENT, marginTop: 2 }}>{hotel.neighborhood}</Text>
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
                      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{selectedRoom.name}</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: ACCENT }}>${selectedRoom.pricePerNight}/nt</Text>
                  </View>
                  {selectedRoom.beds && (
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 2 }}>{selectedRoom.beds}</Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {selectedRoom.maxGuests && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <FontAwesome name="user" size={10} color={colors.textSecondary} />
                        <Text style={{ fontSize: 10, color: colors.textSecondary }}>{selectedRoom.maxGuests} guests</Text>
                      </View>
                    )}
                    {selectedRoom.size && (
                      <Text style={{ fontSize: 10, color: colors.textSecondary }}>{selectedRoom.size}</Text>
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
                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>{amenity}</Text>
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
                  <Text style={{ fontSize: 9, color: '#059669', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Confirmation</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857', fontFamily: 'monospace' }}>{hotel.confirmationNumber}</Text>
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
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>Check-out</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>
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
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Check-out by {checkOutTime}</Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Late checkout may incur additional charges</Text>
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
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text }}>{hotelName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <FontAwesome name="map-marker" size={10} color="#9ca3af" />
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{hotelAddress}</Text>
              </View>
            </View>
          </View>

          {/* Reminders */}
          <View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Reminders</Text>
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
      <Text style={{ fontSize: 12, color: colors.text, flex: 1 }}>{text}</Text>
    </View>
  );
}

// ─── Browse/Add Constants ───────────────────────────────────

const ADD_CATEGORIES = ['All', 'Tours', 'Museums', 'Restaurants', 'Sightseeing', 'Nightlife'];
const TIME_TO_HOUR: Record<string, number> = { morning: 9, afternoon: 13, evening: 19, latenight: 22 };

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
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#fff' }}>
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
              fontSize: 12,
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
              fontSize: 11,
              fontWeight: category === cat ? '600' : '400',
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
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.category && (
                    <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                      {item.category}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <FontAwesome name="star" size={10} color="#f59e0b" />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>
                        {item.rating}
                      </Text>
                    </View>
                    {item.price && (
                      <Text style={{ fontSize: 11, fontWeight: '600', color: ACCENT }}>
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
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#fff' }}>Add</Text>
                  </Pressable>
                </View>
              </View>
            ))
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <FontAwesome name="search" size={24} color={colors.border} />
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>No results match your search</Text>
              <Pressable
                onPress={() => { onSearchChange(''); onCategoryChange('All'); }}
                style={{ marginTop: 6 }}
              >
                <Text style={{ fontSize: 11, color: ACCENT, fontWeight: '500' }}>Clear filters</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────

export default function ItineraryScreen() {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('itinerary');
  const { id } = useLocalSearchParams<{ id: string }>();
  const { days, selectedDayIndex, setSelectedDayIndex, selectedDay, isLoading, isEmpty } =
    useItineraryScreen(id);
  const { calendarOpen, setCalendarOpen, mapOpen, setMapOpen, theme, itineraryColorOverrides } = useContext(TabCtx);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [allCollapsedOverride, setAllCollapsedOverride] = useState<boolean | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addCategory, setAddCategory] = useState('All');
  const [addSearch, setAddSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);

  // Auto-collapse itinerary sections when map opens to make room
  const prevMapOpen = useRef(mapOpen);
  useEffect(() => {
    if (mapOpen && !prevMapOpen.current && selectedDay) {
      const next: Record<string, boolean> = {};
      for (const g of selectedDay.timeGroups) next[g.timeOfDay] = true;
      setCollapsedSections(next);
      setAllCollapsedOverride(true);
    }
    prevMapOpen.current = mapOpen;
  }, [mapOpen, selectedDay]);

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

  const handleAddItem = useCallback((item: DiscoverItem, timeOfDay: string) => {
    setAddingTo(null);
    setAddSearch('');
    setAddCategory('All');
  }, []);

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
        {/* Collapse All */}
        {!calendarOpen && (
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
      </View>

      {calendarOpen ? (
        <MobileCalendarView days={days} selectedDayIndex={selectedDayIndex} />
      ) : (
      <View style={{ flex: 1, flexDirection: 'column' }}>
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
                  <Text style={{ fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 18 }}>
                    {selectedDay.notes}
                  </Text>
                </View>
              )}

            </View>
          )}
        </ScrollView>

        {/* Map panel — below itinerary */}
        {mapOpen && selectedDay && (
          <DayMap
            todayActivities={selectedDay.timeGroups.flatMap((g) => g.activities ?? [])}
            allActivities={days.flatMap((d) => d.timeGroups.flatMap((g) => g.activities ?? []))}
            onClose={() => setMapOpen(false)}
          />
        )}
      </View>
      )}
    </View>
    </PageTransition>
  );
}
