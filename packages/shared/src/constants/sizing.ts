/**
 * Sizing constants — Single source of truth for component dimensions
 *
 * @example
 * ```tsx
 * import { SIZES } from '@travyl/shared';
 *
 * <FontAwesome size={SIZES.icon.md} />
 * <View style={{ height: SIZES.button.height.md, borderRadius: SIZES.radius.md }} />
 * ```
 */

export const SIZES = {
  /** Button height variants */
  button: {
    height: {
      /** 36px — Small button */
      sm: 36,
      /** 48px — Standard button (login CTAs) */
      md: 48,
      /** 56px — Large button */
      lg: 56,
    },
  },

  /** Icon size variants (FontAwesome, etc.) */
  icon: {
    /** 12px — Tiny icons */
    xs: 12,
    /** 14px — Small icons (inputs, labels) */
    sm: 14,
    /** 16px — Standard icons */
    md: 16,
    /** 20px — Large icons */
    lg: 20,
    /** 24px — Extra large icons */
    xl: 24,
    /** 28px — Logo/branding size */
    '2xl': 28,
  },

  /** Border radius variants */
  radius: {
    /** 8px — Small radius */
    sm: 8,
    /** 12px — Standard radius (cards, buttons) */
    md: 12,
    /** 16px — Large radius */
    lg: 16,
    /** 20px — Extra large radius */
    xl: 20,
    /** 9999px — Full pill/circle */
    full: 9999,
  },

  /** Border width */
  border: {
    /** 1px — Hairline border */
    hairline: 1,
    /** 2px — Standard border */
    md: 2,
  },

  /** Flex layout helpers */
  flex: {
    /** 1 — Fill available space */
    fill: 1,
    /** 0 — Fixed size (no grow) */
    none: 0,
  },

  /** Opacity values */
  opacity: {
    /** 0.1 — Very subtle */
    subtle: 0.1,
    /** 0.25 — Light overlay */
    light: 0.25,
    /** 0.3 — Placeholder text */
    muted: 0.3,
    /** 0.5 — Disabled/hint state */
    disabled: 0.5,
    /** 0.4 — Secondary text */
    secondary: 0.4,
  },
} as const;

/** Size token type for component props */
export type SizeToken = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/** Icon size type */
export type IconSize = typeof SIZES.icon[keyof typeof SIZES.icon];

/** Button height type */
export type ButtonHeight = typeof SIZES.button.height[keyof typeof SIZES.button.height];
