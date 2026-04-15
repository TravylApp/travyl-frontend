/**
 * Card — Styled container component
 *
 * Replaces the common pattern:
 * ```tsx
 * <View style={{
 *   borderRadius: 12,
 *   borderWidth: 1,
 *   borderColor: colors.borderLight,
 *   padding: 16,
 *   backgroundColor: colors.cardBackground
 * }} />
 * ```
 *
 * @example
 * ```tsx
 * <Card variant="outlined" padding="md">
 *   <Text>Card content</Text>
 * </Card>
 * ```
 */

import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { SPACING } from '../../constants/spacing';
import { SIZES } from '../../constants/sizing';

export interface CardProps {
  children: ReactNode;
  /** Visual style variant */
  variant?: 'default' | 'outlined' | 'filled' | 'elevated';
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Border radius */
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Full width */
  fill?: boolean;
  /** Additional styles */
  style?: ViewStyle;
}

const PADDING_MAP = {
  none: 0,
  sm: SPACING.sm,
  md: SPACING.lg,
  lg: SPACING['2xl'],
  xl: SPACING['4xl'],
} as const;

const RADIUS_MAP = {
  none: 0,
  sm: SIZES.radius.sm,
  md: SIZES.radius.md,
  lg: SIZES.radius.lg,
  xl: SIZES.radius.xl,
} as const;

/** Card style config — tokens to be replaced by theme values in consumer */
export interface CardStyleConfig {
  background: string;
  borderColor: string;
  shadowColor: string;
}

export function Card({
  children: _children,
  variant = 'default',
  padding = 'md',
  radius = 'md',
  fill = false,
  style,
}: CardProps) {
  const baseStyle: ViewStyle = {
    borderRadius: RADIUS_MAP[radius],
    padding: PADDING_MAP[padding],
    ...(fill && { flex: 1 }),
    ...style,
  };

  // Variant-specific styles (consumer must provide colors)
  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: 'transparent',
    },
    outlined: {
      borderWidth: SIZES.border.hairline,
      borderColor: '#e5e7eb', // Will be overridden by theme
    },
    filled: {
      backgroundColor: '#f9fafb', // Will be overridden by theme
    },
    elevated: {
      backgroundColor: '#ffffff',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: SIZES.border.md },
      shadowOpacity: SIZES.opacity.light,
      shadowRadius: SIZES.border.md + SIZES.border.md,
      elevation: SIZES.border.md,
    },
  };

  return {
    ...baseStyle,
    ...variantStyles[variant],
  };
}

/** Hook for consuming as style object */
export function useCardStyle(props: Omit<CardProps, 'children'>): ViewStyle {
  return Card({ children: null, ...props });
}
