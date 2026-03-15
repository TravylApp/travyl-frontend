import { View, Text, Pressable, Image } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { getActivityTypeColor } from '@travyl/shared';
import type { ActivityViewModel } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ActivityCardProps {
  activity: ActivityViewModel;
  onPress?: () => void;
  imageUrl?: string;
}

export function ActivityCard({ activity, onPress, imageUrl }: ActivityCardProps) {
  const colors = useThemeColors();
  const typeColor = getActivityTypeColor(activity.category);

  return (
    <Pressable onPress={onPress}>
      <View style={{
        borderRadius: 14, overflow: 'hidden',
        backgroundColor: colors.cardBackground,
        borderWidth: 1, borderColor: colors.border,
      }}>
        {/* Image area */}
        <View style={{ height: 140, position: 'relative' }}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={{ width: '100%', height: 140 }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: typeColor.bg }}>
              <FontAwesome name="picture-o" size={24} color={typeColor.primary + '30'} />
            </View>
          )}

          {/* Category badge — top-left */}
          <View pointerEvents="none" style={{
            position: 'absolute', top: 8, left: 8,
            backgroundColor: 'rgba(255,255,255,0.85)',
            paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
          }}>
            <Text style={{ fontSize: 9, fontWeight: '600', color: typeColor.primary }}>{activity.category}</Text>
          </View>

          {/* Time badge — bottom-left */}
          {activity.timeDisplay && (
            <View pointerEvents="none" style={{
              position: 'absolute', bottom: 8, left: 8,
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
              paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10,
            }}>
              <FontAwesome name="clock-o" size={9} color="#fff" />
              <Text style={{ fontSize: 10, fontWeight: '600', color: '#fff', marginLeft: 3 }}>{activity.timeDisplay}</Text>
            </View>
          )}

          {/* Cost badge — bottom-right */}
          {activity.costDisplay && (
            <View pointerEvents="none" style={{
              position: 'absolute', bottom: 8, right: 8,
              backgroundColor: 'rgba(0,0,0,0.5)',
              paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10,
            }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{activity.costDisplay}</Text>
            </View>
          )}
        </View>

        {/* Info section — below image */}
        <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 }}>
          {activity.locationName && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <FontAwesome name="map-marker" size={9} color={colors.textTertiary} style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 10, color: colors.textTertiary }} numberOfLines={1}>{activity.locationName}</Text>
            </View>
          )}
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }} numberOfLines={1}>{activity.name}</Text>
          {activity.notes && (
            <Text style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 14, marginTop: 2 }} numberOfLines={2}>{activity.notes}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
