import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  Dimensions,
  StyleSheet,
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
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;
const IMAGE_HEIGHT = 180;

const STATUS_COLORS: Record<string, string> = {
  planning: '#3b82f6',
  booked: '#22c55e',
  active: '#f59e0b',
  completed: '#6b7280',
  abandoned: '#ef4444',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatBudget(budget: number | null, currency: string): string {
  if (budget == null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(budget);
}

/* ──────────────── Skeleton Card ──────────────── */

function SkeletonCard() {
  const colors = useThemeColors();
  return (
    <View style={[styles.card, { width: CARD_WIDTH, backgroundColor: colors.cardBackground, shadowColor: colors.shadow }]}>
      <View style={[styles.skeletonImage, { height: IMAGE_HEIGHT, backgroundColor: colors.skeleton }]} />
      <View style={styles.cardBody}>
        <View style={[styles.skeletonLine, { width: '80%', height: 12, backgroundColor: colors.skeleton }]} />
        <View style={[styles.skeletonLine, { width: '60%', height: 10, marginTop: 8, backgroundColor: colors.skeleton }]} />
        <View style={[styles.skeletonLine, { width: '50%', height: 10, marginTop: 8, backgroundColor: colors.skeleton }]} />
      </View>
    </View>
  );
}

/* ──────────────── Trip Card ──────────────── */

function TripCard({ item, onPress }: { item: MockTripCard; onPress: () => void }) {
  const colors = useThemeColors();
  const statusColor = STATUS_COLORS[item.status] ?? '#6b7280';
  const dateRange =
    item.start_date && item.end_date
      ? `${formatDate(item.start_date)} - ${formatDate(item.end_date)}`
      : 'Dates TBD';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width: CARD_WIDTH, opacity: pressed ? 0.85 : 1, backgroundColor: colors.cardBackground, shadowColor: colors.shadow },
      ]}
    >
      {/* Image header */}
      <View style={{ height: IMAGE_HEIGHT, borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden' }}>
        <Image
          source={{ uri: item.image }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.65)']}
          style={styles.gradient}
        />

        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>

        {/* Destination + title overlay */}
        <View style={styles.imageOverlayText}>
          <Text style={styles.destinationText} numberOfLines={1}>
            {item.destination}
          </Text>
          <Text style={styles.titleText} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
      </View>

      {/* Card body */}
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <FontAwesome name="calendar" size={12} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>{dateRange}</Text>
        </View>
        <View style={styles.infoRow}>
          <FontAwesome name="users" size={12} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {item.travelers} traveler{item.travelers !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <FontAwesome name="pie-chart" size={12} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {formatBudget(item.budget, item.currency)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/* ──────────────── Empty State ──────────────── */

function EmptyState({ onPlan }: { onPlan: () => void }) {
  const colors = useThemeColors();
  return (
    <View style={styles.emptyContainer}>
      <FontAwesome name="plane" size={48} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No trips yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Start planning your next adventure!
      </Text>
      <Pressable
        onPress={onPlan}
        style={({ pressed }) => [
          styles.planButton,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <FontAwesome name="plus" size={14} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.planButtonText}>Plan a Trip</Text>
      </Pressable>
    </View>
  );
}

/* ──────────────── Main Screen ──────────────── */

export default function TripsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { data: trips, isLoading } = useTrips();

  // Use real trips if available, otherwise fall back to mock data
  const displayTrips: MockTripCard[] =
    trips && trips.length > 0
      ? trips.map((t) => ({
          ...t,
          image:
            MOCK_TRIPS.find((m) => m.id === t.id)?.image ??
            'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800',
        }))
      : MOCK_TRIPS;

  const handlePlan = () => {
    router.push('/trip/new' as never);
  };

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Trips</Text>
          <Pressable style={styles.planButton} onPress={handlePlan}>
            <FontAwesome name="plus" size={14} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.planButtonText}>Plan a Trip</Text>
          </Pressable>
        </View>
        <View style={styles.skeletonGrid}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      </View>
    );
  }

  /* ── Empty state ── */
  if (!displayTrips || displayTrips.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Trips</Text>
        </View>
        <EmptyState onPlan={handlePlan} />
      </View>
    );
  }

  /* ── Trip grid ── */
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <FlatList
        data={displayTrips}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: CARD_GAP }}
        contentContainerStyle={{ paddingHorizontal: CARD_PADDING, paddingBottom: 32 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>My Trips</Text>
            <Pressable
              onPress={handlePlan}
              style={({ pressed }) => [
                styles.planButton,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <FontAwesome name="plus" size={14} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.planButtonText}>Plan a Trip</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <TripCard
            item={item}
            onPress={() => router.push(`/trip/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: CARD_GAP }} />}
      />
    </View>
  );
}

/* ──────────────── Styles ──────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },

  /* Plan button */
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Navy.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  planButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Card */
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },

  /* Status badge */
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  /* Image overlay text */
  imageOverlayText: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  destinationText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '500',
  },
  titleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 1,
  },

  /* Card body */
  cardBody: {
    padding: 10,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 11,
    flexShrink: 1,
  },

  /* Skeleton */
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    paddingHorizontal: CARD_PADDING,
  },
  skeletonImage: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  skeletonLine: {
    borderRadius: 4,
  },

  /* Empty state */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 6,
    marginBottom: 24,
    textAlign: 'center',
  },
});
