import { View, ScrollView, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useItineraryScreen, Navy, getActivityTypeColor, MOCK_DESTINATION_COORDS } from '@travyl/shared';
import { MapPreview } from '@/components/itinerary';

function SkeletonBlock({ width, height, radius = 6, style }: { width: number | string; height: number; radius?: number; style?: any }) {
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: '#e5e7eb' }, style]} />;
}

export default function OverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trip, days, flights, hotels, isLoading } = useItineraryScreen(id);

  const allActivities = days.flatMap((d) =>
    d.timeGroups.flatMap((g) => g.activities),
  );

  // Grab the first few upcoming activities
  const upcoming = allActivities.slice(0, 5);

  const stats = [
    { icon: 'plane' as const, label: 'Flights', count: flights.length, color: '#2563eb', bg: '#dbeafe' },
    { icon: 'building' as const, label: 'Hotels', count: hotels.length, color: '#ea580c', bg: '#ffedd5' },
    { icon: 'list' as const, label: 'Activities', count: allActivities.length, color: '#0d9488', bg: '#ccfbf1' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ padding: 16 }}>
        {/* Trip info card */}
        <LinearGradient
          colors={[Navy.DEFAULT, Navy.light]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 12, padding: 20, marginBottom: 16 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FontAwesome name="map-marker" size={16} color="#fff" />
            {trip ? (
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{trip.destination}</Text>
            ) : (
              <SkeletonBlock width="50%" height={18} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <FontAwesome name="calendar" size={14} color="rgba(255,255,255,0.8)" />
            {trip ? (
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                {trip.start_date} – {trip.end_date}
              </Text>
            ) : (
              <SkeletonBlock width="60%" height={14} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FontAwesome name="users" size={14} color="rgba(255,255,255,0.8)" />
            {trip ? (
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                {trip.travelers} {trip.travelers === 1 ? 'Traveler' : 'Travelers'}
              </Text>
            ) : (
              <SkeletonBlock width="40%" height={14} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
            )}
          </View>
        </LinearGradient>

        {/* Embedded map */}
        {trip && (
          <View style={{ marginBottom: 16 }}>
            <MapPreview
              lat={MOCK_DESTINATION_COORDS.lat}
              lng={MOCK_DESTINATION_COORDS.lng}
              label={trip.destination}
              height={160}
            />
          </View>
        )}

        {/* Quick stats row */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          {stats.map((stat) => (
            <View key={stat.label} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: stat.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <FontAwesome name={stat.icon} size={16} color={stat.color} />
              </View>
              {isLoading ? (
                <SkeletonBlock width={25} height={18} style={{ marginBottom: 4 }} />
              ) : (
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
                  {stat.count}
                </Text>
              )}
              <Text style={{ fontSize: 11, color: '#6b7280' }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Upcoming section */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 10 }}>Upcoming</Text>
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#f3f4f6' }}>
              <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#f3f4f6', marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <SkeletonBlock width="65%" height={14} />
                <SkeletonBlock width="45%" height={10} style={{ marginTop: 4 }} />
              </View>
              <SkeletonBlock width={50} height={12} />
            </View>
          ))
        ) : upcoming.length > 0 ? (
          upcoming.map((activity) => {
            const typeColor = getActivityTypeColor(activity.category);
            return (
              <View key={activity.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#f3f4f6' }}>
                <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: typeColor.bg, marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                  <FontAwesome name="map-pin" size={14} color={typeColor.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' }} numberOfLines={1}>{activity.name}</Text>
                  {activity.locationName && (
                    <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }} numberOfLines={1}>{activity.locationName}</Text>
                  )}
                </View>
                {activity.timeDisplay && (
                  <Text style={{ fontSize: 11, color: '#6b7280' }}>{activity.timeDisplay}</Text>
                )}
              </View>
            );
          })
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <FontAwesome name="calendar-plus-o" size={24} color="#d1d5db" />
            <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
              No activities yet. Add items to your itinerary to see them here.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
