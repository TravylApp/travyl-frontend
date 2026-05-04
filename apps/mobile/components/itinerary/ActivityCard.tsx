import { View, Text, Pressable, Image } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { getActivityTypeColor, TextStyles } from '@travyl/shared';
import type { ActivityViewModel } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ActivityCardProps {
  activity: ActivityViewModel;
  onPress?: () => void;
  imageUrl?: string;
  timeFormat?: '12h' | '24h';
}

// Reformat a time string ("9:00 AM", "21:00", "9:00 AM – 10:30 AM") into
// the requested format. Splits ranges on en-dash, em-dash, hyphen, or "to".
function reformatTime(input: string | null | undefined, format: '12h' | '24h'): string | null {
  if (!input) return null;
  const splitRe = /\s*[–—-]\s*|\s+to\s+/i;
  const parts = input.split(splitRe);
  const fmtOne = (s: string): string => {
    if (!s) return s;
    const ampm = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    let h: number;
    let m: number;
    if (ampm) {
      h = parseInt(ampm[1], 10);
      m = parseInt(ampm[2], 10);
      const period = ampm[3].toUpperCase();
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
    } else {
      const h24 = s.match(/(\d{1,2}):(\d{2})/);
      if (!h24) return s;
      h = parseInt(h24[1], 10);
      m = parseInt(h24[2], 10);
    }
    if (format === '24h') {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  };
  return parts.map(fmtOne).join(' – ');
}

export function ActivityCard({ activity, onPress, imageUrl, timeFormat = '12h' }: ActivityCardProps) {
  const colors = useThemeColors();
  const typeColor = getActivityTypeColor(activity.category);
  const timeDisplay = reformatTime(activity.timeDisplay, timeFormat);

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
            <Image source={{ uri: imageUrl, headers: { Referer: '' } }} style={{ width: '100%', height: 140 }} resizeMode="cover" />
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
            <Text style={{ ...TextStyles.xs, color: typeColor.primary }}>{activity.category}</Text>
          </View>

          {/* Time badge — bottom-left */}
          {timeDisplay && (
            <View pointerEvents="none" style={{
              position: 'absolute', bottom: 8, left: 8,
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
              paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10,
            }}>
              <FontAwesome name="clock-o" size={9} color="#fff" />
              <Text style={{ ...TextStyles.smEm, color: '#fff', marginLeft: 3 }}>{timeDisplay}</Text>
            </View>
          )}

          {/* Cost badge — bottom-right */}
          {activity.costDisplay && (
            <View pointerEvents="none" style={{
              position: 'absolute', bottom: 8, right: 8,
              backgroundColor: 'rgba(0,0,0,0.5)',
              paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10,
            }}>
              <Text style={{ ...TextStyles.smEm, color: '#fff' }}>{activity.costDisplay}</Text>
            </View>
          )}
        </View>

        {/* Info section — below image */}
        <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 }}>
          {activity.locationName && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <FontAwesome name="map-marker" size={9} color={colors.textTertiary} style={{ marginRight: 4 }} />
              <Text style={{ ...TextStyles.sm, color: colors.textTertiary }} numberOfLines={1}>{activity.locationName}</Text>
            </View>
          )}
          <Text style={{ ...TextStyles.bodyLgEm, color: colors.text }} numberOfLines={1}>{activity.name}</Text>
          {activity.notes && (
            <Text style={{ ...TextStyles.sm, color: colors.textSecondary, marginTop: 2 }} numberOfLines={2}>{activity.notes}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
