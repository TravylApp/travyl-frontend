import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  LayoutAnimation,
  UIManager,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  useTrips,
  Navy,
  formatDateRange,
  TextStyles,
  FontSize,
  FontFamily,
} from '@travyl/shared';
import type { MockTripCard } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreateTripModal } from '@/components/trips/CreateTripModal';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const PAD = 16;
const GAP = 10;

// ─── Status helpers (matches web) ─────────────────────────────

type StatusFilter = 'all' | 'active' | 'upcoming' | 'past';

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
];

function getTripStatusFilter(trip: MockTripCard): 'active' | 'upcoming' | 'past' {
  const now = new Date();
  const endDate = new Date(trip.end_date + 'T00:00:00');
  const startDate = new Date(trip.start_date + 'T00:00:00');

  if (trip.status === 'active') return 'active';
  if (trip.status === 'completed' || trip.status === 'abandoned' || endDate < now) return 'past';
  if ((trip.status === 'planning' || trip.status === 'booked') && startDate > now) return 'upcoming';
  return 'upcoming';
}

function getDaysUntilTrip(start: string): number | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const s = new Date(start + 'T00:00:00');
  const diff = Math.ceil((s.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

function getTripDuration(start: string | null, end: string | null): number {
  if (!start || !end) return 1;
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diff) && diff > 0 ? diff : 1;
}

function fmtBudget(b: number | null, c: string) {
  if (b == null) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(b);
}

// ─── Status badge (matches web: countdown + active) ───────────

function getStatusBadge(trip: MockTripCard): { label: string; bg: string } | null {
  if (trip.status === 'active') return { label: 'In progress', bg: 'rgba(16,185,129,0.85)' };
  if (trip.status === 'completed') return null;
  const daysUntil = getDaysUntilTrip(trip.start_date);
  if (daysUntil !== null && daysUntil <= 30) return { label: `${daysUntil}d until trip`, bg: 'rgba(245,158,11,0.9)' };
  if (daysUntil !== null) return { label: `${daysUntil}d away`, bg: 'rgba(255,255,255,0.2)' };
  return null;
}

// ─── Masonry helpers (matches web layout) ─────────────────────

function getTripWeight(days: number): number {
  if (!days || days <= 1) return 1;
  if (days <= 3) return 1.3;
  if (days <= 5) return 1.6;
  if (days <= 7) return 2;
  if (days <= 10) return 2.4;
  return 3;
}

function getRowHeight(maxDays: number): number {
  if (!maxDays || maxDays <= 3) return 180;
  if (maxDays <= 5) return 210;
  if (maxDays <= 7) return 240;
  if (maxDays <= 10) return 260;
  return 280;
}

type TripItem = { trip: MockTripCard; duration: number; weight: number };

function buildRows(items: TripItem[]): TripItem[][] {
  const rows: TripItem[][] = [];
  let i = 0;
  while (i < items.length) {
    const remaining = items.length - i;
    if (remaining <= 2) {
      rows.push(items.slice(i));
      break;
    }
    if (rows.length % 3 === 2) {
      rows.push([items[i]]);
      i += 1;
    } else {
      rows.push(items.slice(i, i + 2));
      i += 2;
    }
  }
  return rows;
}

// ─── Trip Card ────────────────────────────────────────────────

function TripCard({ trip, height, width }: { trip: MockTripCard; height: number; width: number }) {
  const router = useRouter();
  const colors = useThemeColors();
  const duration = getTripDuration(trip.start_date, trip.end_date);
  const badge = getStatusBadge(trip);
  const members = trip.members ?? [];
  const visibleMembers = members.slice(0, 3);
  const extraCount = members.length - 3;

  return (
    <View style={{ width }}>
    <Pressable
      onPress={() => router.push(`/trip/${trip.id}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}
    >
      <View style={{ height, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.border }}>
        <Image source={{ uri: trip.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(0,0,0,0.75)']}
          locations={[0, 0.3, 1]}
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
        />

        {/* Top: duration pill + member avatars */}
        <View pointerEvents="none" style={{
          position: 'absolute', top: 10, left: 12, right: 12,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
            }}>
              <Text style={{ ...TextStyles.smEm, color: '#fff' }}>{duration} days</Text>
            </View>
            {visibleMembers.length > 0 && (
              <View style={{ flexDirection: 'row' }}>
                {visibleMembers.map((m, mi) => (
                  <View key={m.id} style={{
                    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
                    backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center',
                    marginLeft: mi > 0 ? -8 : 0,
                  }}>
                    {m.avatar ? (
                      <Image source={{ uri: m.avatar }} style={{ width: 20, height: 20, borderRadius: 10 }} />
                    ) : (
                      <Text style={{ ...TextStyles.xs, color: '#fff' }}>{m.name.charAt(0)}</Text>
                    )}
                  </View>
                ))}
                {extraCount > 0 && (
                  <View style={{
                    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
                    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
                    marginLeft: -8,
                  }}>
                    <Text style={{ ...TextStyles.xs, color: '#fff' }}>+{extraCount}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Bottom: status badge, title, destination, metadata */}
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 }}>
          {badge && (
            <View style={{
              alignSelf: 'flex-start', backgroundColor: badge.bg,
              paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 6,
            }}>
              <Text style={{ ...TextStyles.smEm, color: '#fff' }}>{badge.label}</Text>
            </View>
          )}
          <Text style={{
            ...TextStyles.subhead, color: '#fff',
            textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
          }} numberOfLines={1}>
            {trip.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <FontAwesome name="map-marker" size={11} color="rgba(255,255,255,0.7)" />
            <Text style={{
              ...TextStyles.body, color: 'rgba(255,255,255,0.9)',
              textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
            }} numberOfLines={1}>
              {trip.destination}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap', overflow: 'hidden', maxHeight: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <FontAwesome name="calendar" size={9} color="rgba(255,255,255,0.6)" />
              <Text style={{ ...TextStyles.sm, color: 'rgba(255,255,255,0.85)' }} numberOfLines={1}>
                {formatDateRange(trip.start_date, trip.end_date)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <FontAwesome name="users" size={9} color="rgba(255,255,255,0.6)" />
              <Text style={{ ...TextStyles.sm, color: 'rgba(255,255,255,0.85)' }}>{trip.travelers}</Text>
            </View>
            {trip.budget ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <FontAwesome name="pie-chart" size={9} color="rgba(255,255,255,0.6)" />
                <Text style={{ ...TextStyles.sm, color: 'rgba(255,255,255,0.85)' }} numberOfLines={1}>{fmtBudget(trip.budget, trip.currency)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
    </View>
  );
}

// ─── Feed Card ────────────────────────────────────────────────

function FeedCard({ item, onPress }: { item: MockTripCard; onPress: () => void }) {
  const colors = useThemeColors();
  const duration = getTripDuration(item.start_date, item.end_date);
  const badge = getStatusBadge(item);
  const budget = fmtBudget(item.budget, item.currency);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}>
      <View style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: colors.cardBackground }}>
        <View style={{ height: 280 }}>
          <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'transparent', 'rgba(0,0,0,0.8)']}
            locations={[0, 0.3, 1]}
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
          />
          {/* Top: duration pill */}
          <View style={{ position: 'absolute', top: 12, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ ...TextStyles.captionEm, color: '#fff' }}>{duration} days</Text>
            </View>
          </View>
          {/* Bottom content */}
          <View style={{ position: 'absolute', bottom: 14, left: 14, right: 14 }}>
            {badge && (
              <View style={{
                alignSelf: 'flex-start', backgroundColor: badge.bg,
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 6,
              }}>
                <Text style={{ ...TextStyles.smEm, color: '#fff' }}>{badge.label}</Text>
              </View>
            )}
            <Text style={{ ...TextStyles.title, color: '#fff', marginBottom: 3 }} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <FontAwesome name="map-marker" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={{ ...TextStyles.bodyLg, color: 'rgba(255,255,255,0.9)' }}>{item.destination}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name="calendar" size={11} color="rgba(255,255,255,0.6)" />
                <Text style={{ ...TextStyles.body, color: 'rgba(255,255,255,0.85)' }}>
                  {formatDateRange(item.start_date, item.end_date)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FontAwesome name="users" size={11} color="rgba(255,255,255,0.6)" />
                <Text style={{ ...TextStyles.body, color: 'rgba(255,255,255,0.85)' }}>{item.travelers}</Text>
              </View>
              {budget ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <FontAwesome name="pie-chart" size={11} color="rgba(255,255,255,0.6)" />
                  <Text style={{ ...TextStyles.body, color: 'rgba(255,255,255,0.85)' }}>{budget}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Empty State ──────────────────────────────────────────────

function EmptyState({ onPlan }: { onPlan: () => void }) {
  const colors = useThemeColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <FontAwesome name="plane" size={48} color={colors.textTertiary} />
      <Text style={{ ...TextStyles.title, marginTop: 16, color: colors.text }}>No trips yet</Text>
      <Text style={{ ...TextStyles.bodyXl, marginTop: 6, marginBottom: 24, textAlign: 'center', color: colors.textSecondary }}>
        Start planning your next adventure!
      </Text>
      <Pressable onPress={onPlan} style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', backgroundColor: Navy.DEFAULT,
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, opacity: pressed ? 0.85 : 1,
      })}>
        <FontAwesome name="plus" size={14} color="#fff" style={{ marginRight: 6 }} />
        <Text style={{ ...TextStyles.bodyXlEm, color: '#fff' }}>Plan a Trip</Text>
      </Pressable>
    </View>
  );
}

// ─── Masonry Grid ─────────────────────────────────────────────

function TripMasonryGrid({ trips, screenWidth }: { trips: MockTripCard[]; screenWidth: number }) {
  const contentWidth = screenWidth - PAD * 2;
  const halfWidth = (contentWidth - GAP) / 2;
  const items = trips.map((trip) => {
    const duration = getTripDuration(trip.start_date, trip.end_date);
    return { trip, duration, weight: getTripWeight(duration) };
  });
  const rows = buildRows(items);

  return (
    <View style={{ gap: GAP }}>
      {rows.map((row, ri) => {
        const maxDays = Math.max(...row.map((r) => r.duration));
        const isFeatureRow = row.length === 1;
        const height = isFeatureRow ? getRowHeight(maxDays) + 40 : getRowHeight(maxDays);
        return (
          <View key={ri} style={{ flexDirection: 'row', gap: GAP }}>
            {row.map((item) => (
              <TripCard
                key={item.trip.id}
                trip={item.trip}
                height={height}
                width={isFeatureRow ? contentWidth : halfWidth}
              />
            ))}
            {row.length === 1 ? null : row.length < 2 ? <View style={{ width: halfWidth }} /> : null}
          </View>
        );
      })}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────

export default function TripsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { data: trips, isLoading } = useTrips();
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const displayTrips: MockTripCard[] =
    trips && trips.length > 0
      ? trips.map((t) => ({
          ...t,
          image: t.trip_context?.hero_image_url ?? '',
        }))
      : [];

  const filteredTrips = useMemo(() => {
    let result = displayTrips;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((t) => getTripStatusFilter(t) === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.destination.toLowerCase().includes(q)
      );
    }

    return result;
  }, [displayTrips, searchQuery, statusFilter]);

  // Separate current from past (when viewing "all")
  const currentTrips = useMemo(() => {
    if (statusFilter === 'all') return filteredTrips.filter((t) => getTripStatusFilter(t) !== 'past');
    if (statusFilter === 'past') return [];
    return filteredTrips;
  }, [filteredTrips, statusFilter]);

  const pastTrips = useMemo(() => {
    if (statusFilter === 'all') return filteredTrips.filter((t) => getTripStatusFilter(t) === 'past');
    if (statusFilter === 'past') return filteredTrips;
    return [];
  }, [filteredTrips, statusFilter]);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const handlePlan = () => setPlanModalOpen(true);

  const toggleViewMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewMode((p) => (p === 'grid' ? 'feed' : 'grid'));
  };

  const tripCount = filteredTrips.length;

  /* ── Header ── */
  const titleRow = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Math.max(insets.top, 16), paddingBottom: 10 }}>
      <View>
        <Text style={{ ...TextStyles.headline, color: colors.text }}>My Trips</Text>
        {tripCount > 0 && (
          <Text style={{ ...TextStyles.bodyLg, color: colors.textTertiary, marginTop: 2 }}>
            {tripCount} {tripCount === 1 ? 'trip' : 'trips'}
          </Text>
        )}
      </View>
      <Pressable onPress={handlePlan} style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', backgroundColor: Navy.DEFAULT,
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, opacity: pressed ? 0.85 : 1,
      })}>
        <FontAwesome name="plus" size={13} color="#fff" style={{ marginRight: 6 }} />
        <Text style={{ ...TextStyles.bodyLgEm, color: '#fff' }}>Plan a Trip</Text>
      </Pressable>
    </View>
  );

  /* ── Status Tabs ── */
  const statusTabs = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingBottom: 10 }}
    >
      {STATUS_TABS.map(({ key, label }) => {
        const isActive = statusFilter === key;
        return (
          <Pressable
            key={key}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setStatusFilter(key);
            }}
            style={{
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
              backgroundColor: isActive ? Navy.DEFAULT : colors.surfaceElevated,
              borderWidth: isActive ? 0 : 1,
              borderColor: colors.borderLight,
            }}
          >
            <Text style={{
              ...TextStyles.bodyLgEm,
              color: isActive ? '#fff' : colors.text,
            }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  /* ── Search + toggle ── */
  const searchBar = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12 }}>
      <View style={{
        flex: 1, flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.inputBackground, borderRadius: 12,
        borderWidth: 1, borderColor: colors.borderLight,
        paddingHorizontal: 12, height: 40,
      }}>
        <FontAwesome name="search" size={13} color={colors.textTertiary} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search trips..."
          placeholderTextColor={colors.textTertiary}
          style={{ flex: 1, fontSize: FontSize.bodyXl, color: colors.text, marginLeft: 8, paddingVertical: 0 }}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <FontAwesome name="times-circle" size={15} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>
      <Pressable
        onPress={toggleViewMode}
        style={{
          width: 40, height: 40, borderRadius: 12, borderWidth: 1,
          borderColor: colors.borderLight, backgroundColor: colors.surfaceElevated,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <FontAwesome name={viewMode === 'grid' ? 'th-large' : 'bars'} size={16} color={colors.text} />
      </Pressable>
    </View>
  );

  /* ── Empty ── */
  if (!displayTrips.length && !isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingHorizontal: PAD }}>
          {titleRow}
          {statusTabs}
        </View>
        <EmptyState onPlan={handlePlan} />
        <CreateTripModal visible={planModalOpen} onClose={() => setPlanModalOpen(false)} />
      </View>
    );
  }

  /* ── Grid ── */
  if (viewMode === 'grid') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 32 }}>
          {titleRow}
          {statusTabs}
          {searchBar}

          {/* Current / Active / Upcoming */}
          {currentTrips.length > 0 && (
            <TripMasonryGrid trips={currentTrips} screenWidth={screenWidth} />
          )}

          {/* Past trips section */}
          {pastTrips.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Text style={{ ...TextStyles.subhead, color: colors.textTertiary }}>Past Trips</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              </View>
              <View style={{ opacity: 0.7 }}>
                <TripMasonryGrid trips={pastTrips} screenWidth={screenWidth} />
              </View>
            </View>
          )}

          {/* No results */}
          {filteredTrips.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <FontAwesome name="search" size={36} color={colors.textTertiary} />
              <Text style={{ ...TextStyles.subhead, color: colors.textTertiary, marginTop: 12 }}>No trips match your search</Text>
            </View>
          )}
        </ScrollView>
        <CreateTripModal visible={planModalOpen} onClose={() => setPlanModalOpen(false)} />
      </View>
    );
  }

  /* ── Feed ── */
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        key="feed"
        data={filteredTrips}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 32 }}
        ListHeaderComponent={<>{titleRow}{statusTabs}{searchBar}</>}
        renderItem={({ item }) => (
          <FeedCard item={item} onPress={() => router.push(`/trip/${item.id}`)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: GAP + 2 }} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <FontAwesome name="search" size={36} color={colors.textTertiary} />
            <Text style={{ ...TextStyles.subhead, color: colors.textTertiary, marginTop: 12 }}>No trips match your search</Text>
          </View>
        }
      />
      <CreateTripModal visible={planModalOpen} onClose={() => setPlanModalOpen(false)} />
    </View>
  );
}
