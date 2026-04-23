import { View, Text } from 'react-native';
import { Brand, TextStyles } from '@travyl/shared';
import { useThemeColors } from '@/hooks/useThemeColors';

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
}

export function SectionHeader({ eyebrow, title }: SectionHeaderProps) {
  const colors = useThemeColors();
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{
        ...TextStyles.captionEm, letterSpacing: 3,
        textTransform: 'uppercase', marginBottom: 4,
        color: Brand.goldMuted,
      }}>{eyebrow}</Text>
      <Text style={{
        ...TextStyles.headline,
        fontFamily: 'Satoshi-Light', color: colors.text,
      }}>{title}</Text>
    </View>
  );
}
