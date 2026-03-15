import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Dimensions,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  useTrips,
  MOCK_TRIPS,
  Navy,
  type MockTripCard,
} from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAD = 16;
const GAP = 10;
const CARD_W = (SCREEN_WIDTH - PAD * 2 - GAP) / 2;
const FEED_CARD_W = SCREEN_WIDTH - PAD * 2;
const GRID_H = 200;
const FEED_H = 300;

type ViewMode = 'grid' | 'feed';

const STATUS_COLOR: Record<string, string> = {
  planning: '#3b82f6',
  booked: '#22c55e',
  active: '#f59e0b',
  completed: '#6b7280',
  abandoned: '#ef4444',
};

function fmtDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtBudget(b: number | null, c: string) {
  if (b == null) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(b);
}

/* ═══════════════ Feed Card ═══════════════ */

function FeedCard({ item, onPress }: { item: MockTripCard; onPress: () => void }) {
  const colors = useThemeColors();
  const sc = STATUS_COLOR[item.status] ?? '#6b7280';
  const dates = item.start_date && item.end_date
    ? `${fmtDate(item.start_date)} - ${fmtDate(item.end_date)}`
    : 'Dates TBD';
  const budget = fmtBudget(item.budget, item.currency);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: colors.cardBackground }}>
        <View style={{ height: FEED_H }}>
          <Image source={{ uri: item.image }} style={{ width: FEED_CARD_W, height: FEED_H }} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.75)']}
            pointerEvents="none"
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%' }}
          />
          {/* Status badge */}
          <View style={{
            position: 'absolute', top: 12, right: 12,
            backgroundColor: sc, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
          }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
          {/* Title overlay */}
          <View style={{ position: 'absolute', bottom: 14, left: 14, right: 14 }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500' }}>
              {item.destination}
            </Text>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 2 }}>
              {item.title}
            </Text>
          </View>
        </View>
        {/* Info row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <FontAwesome name="calendar" size={12} color={colors.textTertiary} />
            <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>{dates}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <FontAwesome name="users" size={12} color={colors.textTertiary} />
            <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>
              {item.travelers} traveler{item.travelers !== 1 ? 's' : ''}
            </Text>
          </View>
          {budget ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <FontAwesome name="pie-chart" size={12} color={colors.textTertiary} />
              <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>{budget}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/* ═══════════════ Empty State ═══════════════ */

function EmptyState({ onPlan }: { onPlan: () => void }) {
  const colors = useThemeColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <FontAwesome name="plane" size={48} color={colors.textTertiary} />
      <Text style={{ fontSize: 20, fontWeight: '700', marginTop: 16, color: colors.text }}>No trips yet</Text>
      <Text style={{ fontSize: 14, marginTop: 6, marginBottom: 24, textAlign: 'center', color: colors.textSecondary }}>
        Start planning your next adventure!
      </Text>
      <Pressable onPress={onPlan} style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', backgroundColor: Navy.DEFAULT,
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, opacity: pressed ? 0.85 : 1,
      })}>
        <FontAwesome name="plus" size={14} color="#fff" style={{ marginRight: 6 }} />
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Plan a Trip</Text>
      </Pressable>
    </View>
  );
}

/* ═══════════════ Main Screen ═══════════════ */

export default function TripsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { data: trips, isLoading } = useTrips();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const displayTrips: MockTripCard[] =
    trips && trips.length > 0
      ? trips.map((t) => ({
          ...t,
          image:
            MOCK_TRIPS.find((m) => m.id === t.id)?.image ??
            'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800',
        }))
      : MOCK_TRIPS;

  const filteredTrips = useMemo(() => {
    if (!searchQuery.trim()) return displayTrips;
    const q = searchQuery.toLowerCase();
    return displayTrips.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q)
    );
  }, [displayTrips, searchQuery]);

  const handlePlan = () => router.push('/trip/new' as never);

  const toggleViewMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewMode((p) => (p === 'grid' ? 'feed' : 'grid'));
  };

  const tripCount = filteredTrips.length;

  /* ── Header: title + plan button ── */
  const titleRow = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, paddingBottom: 10 }}>
      <View>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text }}>My Trips</Text>
        {tripCount > 0 && (
          <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 2 }}>
            {tripCount} {tripCount === 1 ? 'trip' : 'trips'}
          </Text>
        )}
      </View>
      <Pressable onPress={handlePlan} style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', backgroundColor: Navy.DEFAULT,
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, opacity: pressed ? 0.85 : 1,
      })}>
        <FontAwesome name="plus" size={13} color="#fff" style={{ marginRight: 6 }} />
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Plan a Trip</Text>
      </Pressable>
    </View>
  );

  /* ── Search bar + toggle ── */
  const searchBar = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12 }}>
      <View style={{
        flex: 1, flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.cardBackground, borderRadius: 12,
        borderWidth: 1, borderColor: colors.border,
        paddingHorizontal: 12, height: 40,
      }}>
        <FontAwesome name="search" size={13} color={colors.textTertiary} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search trips..."
          placeholderTextColor={colors.textTertiary}
          style={{ flex: 1, fontSize: 14, color: colors.text, marginLeft: 8, paddingVertical: 0 }}
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
          borderColor: colors.border, backgroundColor: colors.cardBackground,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <FontAwesome name={viewMode === 'grid' ? 'th-large' : 'bars'} size={16} color={colors.text} />
      </Pressable>
    </View>
  );

  /* ── Loading ── */
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, paddingHorizontal: PAD }}>
        {titleRow}
        {searchBar}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: CARD_W, height: GRID_H, borderRadius: 14, backgroundColor: colors.skeleton }} />
          ))}
        </View>
      </View>
    );
  }

  /* ── Empty ── */
  if (!displayTrips.length) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <View style={{ paddingHorizontal: PAD }}>{titleRow}</View>
        <EmptyState onPlan={handlePlan} />
      </View>
    );
  }

  /* ── Grid ── */
  if (viewMode === 'grid') {
    const rows: MockTripCard[][] = [];
    for (let i = 0; i < filteredTrips.length; i += 2) {
      rows.push(filteredTrips.slice(i, i + 2));
    }

    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 32 }}>
          {titleRow}
          {searchBar}
          {rows.map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', gap: GAP, marginBottom: GAP }}>
              {row.map((trip) => {
                const dates = trip.start_date && trip.end_date
                  ? `${fmtDate(trip.start_date)} - ${fmtDate(trip.end_date)}`
                  : '';
                const budget = fmtBudget(trip.budget, trip.currency);
                return (
                  <Pressable key={trip.id} onPress={() => router.push(`/trip/${trip.id}`)} style={{ width: CARD_W }}>
                    <View style={{ height: GRID_H, borderRadius: 14, overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
                      <Image source={{ uri: trip.image }} style={{ width: CARD_W, height: GRID_H }} resizeMode="cover" />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        pointerEvents="none"
                        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%' }}
                      />
                      <View pointerEvents="none" style={{
                        position: 'absolute', top: 8, right: 8,
                        backgroundColor: STATUS_COLOR[trip.status] ?? '#6b7280',
                        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                      }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                          {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                        </Text>
                      </View>
                      <View pointerEvents="none" style={{ position: 'absolute', bottom: 10, left: 10, right: 10 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }} numberOfLines={1}>{trip.destination}</Text>
                        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 1 }} numberOfLines={1}>{trip.title}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6, flexWrap: 'wrap' }}>
                      {dates ? (
                        <>
                          <FontAwesome name="calendar" size={9} color={colors.textTertiary} />
                          <Text style={{ fontSize: 10, color: colors.textSecondary, marginRight: 4 }}>{dates}</Text>
                        </>
                      ) : null}
                      {budget ? (
                        <>
                          <FontAwesome name="pie-chart" size={9} color={colors.textTertiary} />
                          <Text style={{ fontSize: 10, color: colors.textSecondary }}>{budget}</Text>
                        </>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
              {row.length === 1 && <View style={{ width: CARD_W }} />}
            </View>
          ))}
          {filteredTrips.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <FontAwesome name="search" size={36} color={colors.textTertiary} />
              <Text style={{ fontSize: 15, color: colors.textTertiary, marginTop: 12 }}>No trips match your search</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  /* ── Feed ── */
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <FlatList
        key="feed"
        data={filteredTrips}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingHorizontal: PAD, paddingBottom: 32 }}
        ListHeaderComponent={<>{titleRow}{searchBar}</>}
        renderItem={({ item }) => (
          <FeedCard item={item} onPress={() => router.push(`/trip/${item.id}`)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: GAP + 2 }} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <FontAwesome name="search" size={36} color={colors.textTertiary} />
            <Text style={{ fontSize: 15, color: colors.textTertiary, marginTop: 12 }}>No trips match your search</Text>
          </View>
        }
      />
    </View>
  );
}
