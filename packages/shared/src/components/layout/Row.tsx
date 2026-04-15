/**
 * Row — Horizontal layout component with consistent spacing
 *
 * Replaces the common pattern:
 * ```tsx
 * <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} />
 * ```
 *
 * @example
 * ```tsx
 * <Row align="center" gap="sm" justify="between">
 *   <Text>Left</Text>
 *   <Text>Right</Text>
 * </Row>
 * ```
 */

import type { ReactNode } from 'react';
import type { FlexAlignType, ViewStyle } from 'react-native';
import { SPACING } from '../../constants/spacing';

export interface RowProps {
  children: ReactNode;
  /** Gap between children — uses SPACING tokens */
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Vertical alignment */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** Horizontal distribution */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  /** Whether to wrap to next line */
  wrap?: boolean;
  /** Full width */
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

export function Row({
  children: _children,
  gap = 'sm',
  align = 'center',
  justify = 'start',
  wrap = false,
  fill = false,
  style,
}: RowProps) {
  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: ALIGN_MAP[align],
    justifyContent: JUSTIFY_MAP[justify],
    gap: GAP_MAP[gap],
    flexWrap: wrap ? 'wrap' : 'nowrap',
    ...(fill && { flex: 1 }),
    ...style,
  };

  // Return style object for React Native (consumer wraps in <View>)
  return rowStyle;
}

/** Hook for consuming as style object */
export function useRowStyle(props: Omit<RowProps, 'children'>): ViewStyle {
  return Row({ children: null, ...props });
}
