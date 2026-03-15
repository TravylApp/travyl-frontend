import { View, Text } from 'react-native';
import { FOOTER_COLUMNS } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PaperPlane } from './PaperPlane';

export function Footer() {
  const colors = useThemeColors();

  return (
    <View style={{ backgroundColor: colors.sandBackground, paddingHorizontal: 24, paddingVertical: 32 }}>
      {/* Brand */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 8 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.sandText, letterSpacing: 4 }}>
            TRAVYL
          </Text>
          <PaperPlane size={28} color={colors.sandText} style={{ transform: [{ rotate: '0deg' }] }} />
        </View>
        <Text style={{ fontSize: 13, color: colors.sandTextSecondary, lineHeight: 20 }}>
          Discover and plan your perfect trip from one place.
        </Text>
      </View>

      {/* Link columns */}
      <View style={{ flexDirection: 'row', gap: 32, marginBottom: 20 }}>
        {FOOTER_COLUMNS.map((col) => (
          <View key={col.heading}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.sandText, marginBottom: 8 }}>
              {col.heading}
            </Text>
            {col.links.map((link) => (
              <Text key={link.label} style={{ fontSize: 13, color: colors.sandTextSecondary, marginBottom: 6 }}>
                {link.label}
              </Text>
            ))}
          </View>
        ))}
      </View>

      {/* Divider + copyright */}
      <View style={{ borderTopWidth: 1, borderTopColor: colors.sandBorder, paddingTop: 16 }}>
        <Text style={{ fontSize: 12, color: colors.sandTextSecondary, textAlign: 'center' }}>
          © 2026 Travyl. All rights reserved.
        </Text>
      </View>
    </View>
  );
}
