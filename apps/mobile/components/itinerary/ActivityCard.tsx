import { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { getActivityTypeColor } from '@travyl/shared';
import type { ActivityViewModel } from '@travyl/shared';

interface ActivityCardProps {
  activity: ActivityViewModel;
  onPress?: () => void;
}

export function ActivityCard({ activity, onPress }: ActivityCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const typeColor = getActivityTypeColor(activity.category);
  const hasImage = false; // Will be true once we have real activity images

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        opacity: pressed ? 0.95 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {/* Image area */}
      <View style={{ height: 150, position: 'relative', backgroundColor: typeColor.bg }}>
        {hasImage ? (
          <Image
            source={{ uri: '' }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesome name="picture-o" size={28} color={typeColor.primary + '30'} />
          </View>
        )}

        {/* Multi-stop gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']}
          locations={[0, 0.5, 1]}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%',
            justifyContent: 'flex-end',
            padding: 12,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }} numberOfLines={1}>
            {activity.name}
          </Text>
          {activity.locationName && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
              <FontAwesome name="map-marker" size={10} color="rgba(255,255,255,0.9)" />
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)' }} numberOfLines={1}>
                {activity.locationName}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Favorite button (top right) */}
        <Pressable
          onPress={() => setIsFavorited(!isFavorited)}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 30, height: 30, borderRadius: 15,
            backgroundColor: 'rgba(255,255,255,0.9)',
            alignItems: 'center', justifyContent: 'center',
          }}
          hitSlop={8}
        >
          <FontAwesome
            name={isFavorited ? 'heart' : 'heart-o'}
            size={13}
            color={isFavorited ? '#ef4444' : '#6b7280'}
          />
        </Pressable>

        {/* Type badge (top left) */}
        <View style={{
          position: 'absolute', top: 10, left: 10,
          backgroundColor: 'rgba(255,255,255,0.92)',
          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
        }}>
          <Text style={{ fontSize: 10, fontWeight: '600', color: typeColor.primary }}>
            {activity.category}
          </Text>
        </View>
      </View>

      {/* Info bar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fff',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          {activity.timeDisplay && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <FontAwesome name="clock-o" size={11} color="#9ca3af" />
              <Text style={{ fontSize: 12, color: '#6b7280' }}>{activity.timeDisplay}</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {activity.costDisplay && (
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1f2937' }}>
              {activity.costDisplay}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
