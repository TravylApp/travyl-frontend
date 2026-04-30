import { View, Text } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { TextStyles } from '@travyl/shared';
import { PageTransition, useTabAccent } from './_layout';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function CarsScreen() {
  const colors = useThemeColors();
  const ACCENT = useTabAccent('cars');

  return (
    <PageTransition>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, padding: 32 }}>
        <View style={{
          width: 64, height: 64, borderRadius: 32,
          backgroundColor: ACCENT + '15',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}>
          <FontAwesome name="car" size={28} color={ACCENT} />
        </View>
        <Text style={{ ...TextStyles.title, color: colors.text, marginBottom: 6 }}>
          Coming Soon
        </Text>
        <Text style={{ ...TextStyles.bodyXl, color: colors.textSecondary, textAlign: 'center' }}>
          Car rental search and booking is on the way. Stay tuned!
        </Text>
      </View>
    </PageTransition>
  );
}
