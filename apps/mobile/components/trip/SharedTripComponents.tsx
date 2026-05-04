/**
 * Shared components used across hotels, restaurants, and activities tabs.
 * Extracted to avoid duplication (were copy-pasted 3x).
 */
import { useState } from 'react';
import { View, Text, Pressable, Image, Linking } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { TextStyles } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';

// ─── Helpers ─────────────────────────────────────────────────

export function ratingColor(r: number, accent = '#60a5fa'): string {
  if (r >= 9) return '#10b981';
  if (r >= 8) return accent;
  return '#f97316';
}

// ─── Section Toggle ──────────────────────────────────────────

export function SectionToggle({
  title, icon, isOpen, onToggle, badge, accent,
}: {
  title: string; icon: string; isOpen: boolean; onToggle: () => void;
  badge?: string; accent: string;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 12, paddingHorizontal: 14,
        backgroundColor: colors.surface, borderRadius: 10,
        borderWidth: 1, borderColor: colors.border,
        marginBottom: isOpen ? 10 : 0,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <FontAwesome name={icon as any} size={14} color={accent} />
        <Text style={{ ...TextStyles.bodyLgEm, color: colors.text }}>{title}</Text>
        {badge && (
          <View style={{ backgroundColor: accent + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
            <Text style={{ ...TextStyles.smEm, color: accent }}>{badge}</Text>
          </View>
        )}
      </View>
      <FontAwesome name={isOpen ? 'chevron-up' : 'chevron-down'} size={12} color={colors.textTertiary} />
    </Pressable>
  );
}

// ─── Rating Badge ────────────────────────────────────────────

export function RatingBadge({ rating, accent }: { rating: number; accent?: string }) {
  return (
    <View style={{ backgroundColor: ratingColor(rating, accent), paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 }}>
      <Text style={{ ...TextStyles.bodyEm, color: '#fff' }}>{rating}</Text>
    </View>
  );
}

// ─── Image Carousel ──────────────────────────────────────────

export function ImageCarousel({ images, height = 220 }: { images: string[]; height?: number }) {
  const colors = useThemeColors();
  const [idx, setIdx] = useState(0);
  const prev = () => setIdx((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setIdx((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <View style={{ width: '100%', height, backgroundColor: colors.skeleton, position: 'relative' }}>
      <Image source={{ uri: images[idx], headers: { Referer: '' } }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      {images.length > 1 && (
        <>
          <Pressable
            onPress={prev}
            style={{
              position: 'absolute', left: 10, top: '50%', marginTop: -16,
              width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FontAwesome name="chevron-left" size={12} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={next}
            style={{
              position: 'absolute', right: 10, top: '50%', marginTop: -16,
              width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FontAwesome name="chevron-right" size={12} color={colors.text} />
          </Pressable>
          <View style={{
            position: 'absolute', bottom: 10, right: 10,
            backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
          }}>
            <Text style={{ ...TextStyles.smEm, color: '#fff' }}>{idx + 1} / {images.length}</Text>
          </View>
        </>
      )}
    </View>
  );
}

// ─── Contact Actions ─────────────────────────────────────────

export function ContactActions({
  phone, website, address, accent,
}: {
  phone?: string; website?: string; address?: string; accent: string;
}) {
  const colors = useThemeColors();
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ ...TextStyles.bodyLgEm, color: colors.text, marginBottom: 10 }}>Contact & Location</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {!!phone && (
          <Pressable
            onPress={() => Linking.openURL(`tel:${phone}`)}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              backgroundColor: colors.successBg, borderRadius: 10, paddingVertical: 12,
              borderWidth: 1, borderColor: colors.success,
            }}
          >
            <FontAwesome name="phone" size={14} color={colors.success} />
            <Text style={{ ...TextStyles.bodyEm, color: colors.success }}>Call</Text>
          </Pressable>
        )}
        {!!website && (
          <Pressable
            onPress={() => Linking.openURL(website)}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              backgroundColor: accent + '10', borderRadius: 10, paddingVertical: 12,
              borderWidth: 1, borderColor: accent + '25',
            }}
          >
            <FontAwesome name="external-link" size={13} color={accent} />
            <Text style={{ ...TextStyles.bodyEm, color: accent }}>Website</Text>
          </Pressable>
        )}
        {!!address && (
          <Pressable
            onPress={() => Linking.openURL(`https://maps.apple.com/?q=${encodeURIComponent(address)}`)}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              backgroundColor: colors.warningBg, borderRadius: 10, paddingVertical: 12,
              borderWidth: 1, borderColor: colors.warning,
            }}
          >
            <FontAwesome name="map-marker" size={14} color={colors.warning} />
            <Text style={{ ...TextStyles.bodyEm, color: colors.warning }}>Map</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Hours Section ───────────────────────────────────────────

export function HoursSection({ hours, accent }: { hours: string; accent: string }) {
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View style={{ marginTop: 14 }}>
      <SectionToggle title="Hours" icon="clock-o" isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)} badge={hours ? 'Today' : undefined} accent={accent} />
      {isOpen && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ ...TextStyles.bodyLg, color: colors.text }}>{hours || 'Hours not available'}</Text>
        </View>
      )}
    </View>
  );
}
