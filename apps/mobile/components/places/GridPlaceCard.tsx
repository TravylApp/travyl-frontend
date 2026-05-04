import { memo, useState } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { TextStyles, haversineKm as distanceKm, type PlaceItem } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';

const GAP = 4;

const TYPE_ICON: Record<string, string> = {
  event: 'calendar', restaurant: 'cutlery', experience: 'compass',
  destination: 'map-marker', attraction: 'university', hotel: 'bed',
};
const TYPE_COLOR: Record<string, string> = {
  event: '#8b5cf6', restaurant: '#ef4444', experience: '#f59e0b',
  destination: '#3b82f6', attraction: '#10b981', hotel: '#6366f1',
};

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getImageHeight(id: string): number {
  return 140 + (hashCode(id + 'h') % 100);
}

export interface GridPlaceCardProps {
  place: PlaceItem;
  flush?: boolean;
  isFav: boolean;
  onPress: () => void;
  onToggleFav: () => void;
  colors: ReturnType<typeof useThemeColors>;
  userLoc?: { lat: number; lng: number } | null;
}

export const GridPlaceCard = memo(function GridPlaceCard({
  place, isFav, onPress, onToggleFav, colors, flush, userLoc,
}: GridPlaceCardProps) {
  const imgH = getImageHeight(place.id);
  const imgs = place.images && place.images.length > 1 ? place.images : place.image ? [place.image] : [];
  const [imgIdx, setImgIdx] = useState(0);
  const hasMultiple = imgs.length > 1;
  const hasImage = imgs.length > 0 && !!imgs[0];
  const typeColor = TYPE_COLOR[place.type] || '#6b7280';
  const typeIcon = TYPE_ICON[place.type] || 'globe';
  const isEvent = place.type === 'event';
  const priceStr = place.priceLevel ? '$'.repeat(place.priceLevel) : '';

  let distLabel = '';
  if (userLoc && place.latitude != null && place.longitude != null) {
    const dist = distanceKm(userLoc.lat, userLoc.lng, place.latitude, place.longitude);
    const mi = dist * 0.621371;
    distLabel = mi < 0.3 ? `${Math.round(mi * 5280)} ft` : mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
  }

  return (
    <Pressable onPress={onPress} style={{ marginBottom: flush ? 1 : GAP }}>
      <View style={{
        borderRadius: flush ? 0 : 14, overflow: 'hidden',
        backgroundColor: colors.cardBackground,
        borderWidth: flush ? 0 : 1, borderColor: colors.border,
      }}>
        <View style={{ height: imgH, position: 'relative' }}>
          {hasImage ? (
            <Image source={{ uri: imgs[imgIdx], headers: { Referer: '' } }} style={{ width: '100%', height: imgH }} contentFit="cover" cachePolicy="memory-disk" transition={200} />
          ) : (
            <View style={{ width: '100%', height: imgH, backgroundColor: typeColor + '18', alignItems: 'center', justifyContent: 'center' }}>
              <FontAwesome name={typeIcon as any} size={32} color={typeColor + '40'} />
            </View>
          )}

          {hasMultiple && (
            <Pressable
              onPress={() => setImgIdx((prev) => (prev + 1) % imgs.length)}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          )}

          <View style={{
            position: 'absolute', top: 8, left: 8,
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: typeColor, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
          }}>
            <FontAwesome name={typeIcon as any} size={8} color="#fff" />
            <Text style={{ ...TextStyles.micro, color: '#fff', textTransform: 'capitalize' }}>{place.type}</Text>
          </View>

          <Pressable
            onPress={onToggleFav}
            style={{
              position: 'absolute', top: 8, right: 8,
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: isFav ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.9)',
              borderWidth: isFav ? 1 : 0,
              borderColor: 'rgba(239,68,68,0.4)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FontAwesome name={isFav ? 'heart' : 'heart-o'} size={12} color={isFav ? colors.error : colors.textTertiary} />
          </Pressable>

          {hasMultiple && (
            <View pointerEvents="none" style={{
              position: 'absolute', bottom: 8, left: 0, right: 0,
              flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4,
            }}>
              {imgs.map((_, i) => (
                <View key={i} style={{
                  width: imgIdx === i ? 14 : 5, height: 5, borderRadius: 3,
                  backgroundColor: imgIdx === i ? '#fff' : 'rgba(255,255,255,0.5)',
                }} />
              ))}
            </View>
          )}
        </View>

        {!flush && <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
            <FontAwesome name="map-marker" size={9} color={colors.textTertiary} style={{ marginRight: 4 }} />
            <Text style={{ ...TextStyles.sm, color: colors.textTertiary, flex: 1 }} numberOfLines={1}>
              {distLabel ? `${distLabel} · ` : ''}{place.address || place.tagline}
            </Text>
          </View>

          <Text style={{ ...TextStyles.bodyLgEm, color: colors.text, marginBottom: 2 }} numberOfLines={2}>{place.name}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
            {place.rating > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <FontAwesome name="star" size={10} color="#fbbf24" />
                <Text style={{ ...TextStyles.smEm, color: colors.text }}>{place.rating}</Text>
              </View>
            )}
            {(place.reviewCount ?? 0) > 0 && (
              <Text style={{ ...TextStyles.xs, color: colors.textTertiary }}>
                ({(place.reviewCount ?? 0).toLocaleString()})
              </Text>
            )}
            {priceStr ? (
              <Text style={{ ...TextStyles.smEm, color: colors.success }}>{priceStr}</Text>
            ) : null}
          </View>

          {place.description ? (
            <Text style={{ ...TextStyles.sm, color: colors.textSecondary, marginBottom: 4 }} numberOfLines={2}>{place.description}</Text>
          ) : null}

          {(place.hours || place.duration) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
              {place.hours && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <FontAwesome name="clock-o" size={9} color={colors.textTertiary} />
                  <Text style={{ ...TextStyles.xs, color: colors.textSecondary }} numberOfLines={1}>{place.hours}</Text>
                </View>
              )}
              {place.duration && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <FontAwesome name="hourglass-half" size={8} color={colors.textTertiary} />
                  <Text style={{ ...TextStyles.xs, color: colors.textSecondary }}>{place.duration}</Text>
                </View>
              )}
            </View>
          )}

          {isEvent && place.tagline && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <FontAwesome name="calendar" size={9} color={typeColor} />
              <Text style={{ ...TextStyles.sm, color: typeColor, flex: 1 }} numberOfLines={1}>{place.tagline}</Text>
            </View>
          )}
          {isEvent && place.website && (
            <Pressable
              onPress={() => Linking.openURL(place.website!).catch(() => {})}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: typeColor + '15', borderRadius: 8,
                paddingVertical: 6, marginBottom: 4,
              }}
            >
              <FontAwesome name="ticket" size={10} color={typeColor} />
              <Text style={{ ...TextStyles.smEm, color: typeColor }}>Get Tickets</Text>
            </Pressable>
          )}

          {!isEvent && place.website && (
            <Pressable
              onPress={() => Linking.openURL(place.website!).catch(() => {})}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}
            >
              <FontAwesome name="external-link" size={9} color={colors.tint} />
              <Text style={{ ...TextStyles.xs, color: colors.tint }} numberOfLines={1}>Visit website</Text>
            </Pressable>
          )}

          {place.tags && place.tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
              {place.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={{
                  paddingHorizontal: 6, paddingVertical: 2,
                  backgroundColor: colors.surface, borderRadius: 10,
                }}>
                  <Text style={{ ...TextStyles.xs, color: colors.textTertiary }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>}
      </View>
    </Pressable>
  );
});
