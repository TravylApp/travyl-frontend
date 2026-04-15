/**
 * Spacing constants — Single source of truth for all layout spacing
 *
 * @example
 * ```tsx
 * import { SPACING } from '@travyl/shared';
 *
 * <View style={{ padding: SPACING.md, gap: SPACING.sm }} />
 * ```
 */

export const SPACING = {
  /** 4px — Tightest spacing */
  xs: 4,
  /** 8px — Tight spacing */
  sm: 8,
  /** 12px — Small spacing */
  md: 12,
  /** 16px — Default spacing */
  lg: 16,
  /** 20px — Medium-large spacing */
  xl: 20,
  /** 24px — Large spacing */
  '2xl': 24,
  /** 28px — Extra large spacing */
  '3xl': 28,
  /** 32px — 2x large spacing */
  '4xl': 32,
  /** 48px — Major section spacing */
  '5xl': 48,
} as const;

/** Spacing type for component props */
export type SpacingToken = keyof typeof SPACING;

/** Get numeric value from spacing token */
export function getSpacing(token: SpacingToken): number {
  return SPACING[token];
}
