import { View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

export function SkeletonBlock({ width, height, radius = 6, style }: {
  width: number | string;
  height: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const colors = useThemeColors();
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeleton }, style]} />;
}
