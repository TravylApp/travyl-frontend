import { View, Text } from 'react-native';
import { Brand, Navy, TextStyles } from '@travyl/shared';

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
}

export function SectionHeader({ eyebrow, title }: SectionHeaderProps) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{
        ...TextStyles.captionEm, letterSpacing: 3,
        textTransform: 'uppercase', marginBottom: 4,
        color: Brand.goldMuted,
      }}>{eyebrow}</Text>
      <Text style={{
        ...TextStyles.headline,
        fontFamily: 'Satoshi-Light', color: Navy.DEFAULT,
      }}>{title}</Text>
    </View>
  );
}
