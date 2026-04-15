/**
 * Column — Vertical layout component with consistent spacing
 *
 * Replaces the common pattern:
 * ```tsx
 * <View style={{ flexDirection: 'column', gap: 16 }} />
 * ```
 *
 * @example
 * ```tsx
 * <Column gap="lg" align="center">
 *   <Text>Top</Text>
 *   <Text>Bottom</Text>
 * </Column>
 * ```
 */

import type { ReactNode } from 'react';
import type { FlexAlignType, ViewStyle } from 'react-native';
import { SPACING } from '../../constants/spacing';

export interface ColumnProps {
  children: ReactNode;
  /** Gap between children — uses SPACING tokens */
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Horizontal alignment */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** Vertical distribution */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  /** Full height */
  fill?: boolean;
  /** Additional styles */
  style?: ViewStyle;
}

const GAP_MAP = {
  none: 0,
  xs: SPACING.xs,
  sm: SPACING.sm,
  md: SPACING.md,
  lg: SPACING.lg,
  xl: SPACING.xl,
} as const;

const ALIGN_MAP: Record<string, FlexAlignType> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const JUSTIFY_MAP: Record<string, ViewStyle['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

export function Column({
  children: _children,
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  fill = false,
  style,
}: ColumnProps) {
  const columnStyle: ViewStyle = {
    flexDirection: 'column',
    alignItems: ALIGN_MAP[align],
    justifyContent: JUSTIFY_MAP[justify],
    gap: GAP_MAP[gap],
    ...(fill && { flex: 1 }),
    ...style,
  };

  return columnStyle;
}

/** Hook for consuming as style object */
export function useColumnStyle(props: Omit<ColumnProps, 'children'>): ViewStyle {
  return Column({ children: null, ...props });
}
