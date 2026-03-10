import { View, Text } from 'react-native';
import { FOOTER_COLUMNS } from '@travyl/shared';
import { PaperPlane } from './PaperPlane';

const SAND = '#e8d5c0';
const BROWN_DARK = '#2a1f17';
const BROWN_MED = '#3d2f23';
const BORDER = '#c4a882';

export function Footer() {
  return (
    <View style={{ backgroundColor: SAND, paddingHorizontal: 24, paddingVertical: 32 }}>
      {/* Brand */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 8 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: BROWN_DARK, letterSpacing: 4 }}>
            Travyl
          </Text>
          <PaperPlane size={28} color={BROWN_DARK} style={{ transform: [{ rotate: '0deg' }] }} />
        </View>
        <Text style={{ fontSize: 13, color: BROWN_MED, lineHeight: 20 }}>
          Discover and plan your perfect trip from one place.
        </Text>
      </View>

      {/* Link columns */}
      <View style={{ flexDirection: 'row', gap: 32, marginBottom: 20 }}>
        {FOOTER_COLUMNS.map((col) => (
          <View key={col.heading}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: BROWN_DARK, marginBottom: 8 }}>
              {col.heading}
            </Text>
            {col.links.map((link) => (
              <Text key={link.label} style={{ fontSize: 13, color: BROWN_MED, marginBottom: 6 }}>
                {link.label}
              </Text>
            ))}
          </View>
        ))}
      </View>

      {/* Divider + copyright */}
      <View style={{ borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 16 }}>
        <Text style={{ fontSize: 12, color: BROWN_MED, textAlign: 'center' }}>
          © 2026 Travyl. All rights reserved.
        </Text>
      </View>
    </View>
  );
}
