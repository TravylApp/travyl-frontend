// ─── Typography Design Tokens ───────────────────────────────────
// Single source of truth for the typography system across web + mobile.
//
// Usage (mobile):
//   import { TextStyles, FontSize } from '@travyl/shared';
//   <Text style={{ ...TextStyles.body, color: colors.text }}>
//   <Text style={{ fontSize: FontSize.sm }}>
//
// Usage (web):
//   Tokens map to Tailwind classes — see Tailwind Mapping at bottom.
//   Import FontSize/FontWeight directly when needed for shared components.

// ─── Font Families ──────────────────────────────────────────────

export const FontFamily = {
  sans: 'Satoshi-Regular',
  sansMedium: 'Satoshi-Medium',
  sansBold: 'Satoshi-Bold',
  sansBlack: 'Satoshi-Black',
  sansLight: 'Satoshi-Light',
  serif: 'Lustria-Regular',
  mono: 'monospace',
} as const;

// ─── Font Size Scale ────────────────────────────────────────────

export const FontSize = {
  micro: 8,
  xs: 9,
  sm: 10,
  caption: 11,
  body: 12,
  bodyLg: 13,
  bodyXl: 14,
  subhead: 16,
  title: 20,
  headline: 26,
  display: 32,
} as const;

// ─── Font Weight Scale ──────────────────────────────────────────

export const FontWeight = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

// ─── Line Heights ───────────────────────────────────────────────

export const LineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.65,
} as const;

export function lineHeight(size: number, ratio: number = LineHeight.normal): number {
  return Math.round(size * ratio);
}

// ─── Pre-composed Text Styles ───────────────────────────────────
// Spread directly into RN style objects. Color is NOT included.

export const TextStyles = {
  // Body text (Satoshi)
  micro:     { fontSize: FontSize.micro,   lineHeight: lineHeight(FontSize.micro),                       fontWeight: FontWeight.semibold, fontFamily: FontFamily.sans },
  xs:        { fontSize: FontSize.xs,      lineHeight: lineHeight(FontSize.xs),                          fontWeight: FontWeight.medium,   fontFamily: FontFamily.sans },
  sm:        { fontSize: FontSize.sm,      lineHeight: lineHeight(FontSize.sm),                          fontWeight: FontWeight.regular,  fontFamily: FontFamily.sans },
  smEm:      { fontSize: FontSize.sm,      lineHeight: lineHeight(FontSize.sm),                          fontWeight: FontWeight.semibold, fontFamily: FontFamily.sansBold },
  caption:   { fontSize: FontSize.caption, lineHeight: lineHeight(FontSize.caption),                     fontWeight: FontWeight.regular,  fontFamily: FontFamily.sans },
  captionEm: { fontSize: FontSize.caption, lineHeight: lineHeight(FontSize.caption),                     fontWeight: FontWeight.semibold, fontFamily: FontFamily.sansBold },
  body:      { fontSize: FontSize.body,    lineHeight: lineHeight(FontSize.body),                        fontWeight: FontWeight.regular,  fontFamily: FontFamily.sans },
  bodyEm:    { fontSize: FontSize.body,    lineHeight: lineHeight(FontSize.body),                        fontWeight: FontWeight.semibold, fontFamily: FontFamily.sansBold },
  bodyLg:    { fontSize: FontSize.bodyLg,  lineHeight: lineHeight(FontSize.bodyLg),                      fontWeight: FontWeight.regular,  fontFamily: FontFamily.sans },
  bodyLgEm:  { fontSize: FontSize.bodyLg,  lineHeight: lineHeight(FontSize.bodyLg),                      fontWeight: FontWeight.semibold, fontFamily: FontFamily.sansBold },
  bodyXl:    { fontSize: FontSize.bodyXl,  lineHeight: lineHeight(FontSize.bodyXl),                      fontWeight: FontWeight.regular,  fontFamily: FontFamily.sans },
  bodyXlEm:  { fontSize: FontSize.bodyXl,  lineHeight: lineHeight(FontSize.bodyXl),                      fontWeight: FontWeight.semibold, fontFamily: FontFamily.sansBold },

  // Subheadings (Satoshi bold)
  subhead:   { fontSize: FontSize.subhead,   lineHeight: lineHeight(FontSize.subhead, LineHeight.snug),  fontWeight: FontWeight.semibold, fontFamily: FontFamily.sansBold },

  // Headings (Lustria serif)
  title:     { fontSize: FontSize.title,     lineHeight: lineHeight(FontSize.title, LineHeight.snug),    fontWeight: FontWeight.bold,     fontFamily: FontFamily.serif },
  headline:  { fontSize: FontSize.headline,  lineHeight: lineHeight(FontSize.headline, LineHeight.tight), fontWeight: FontWeight.bold,    fontFamily: FontFamily.serif },
  display:   { fontSize: FontSize.display,   lineHeight: lineHeight(FontSize.display, LineHeight.tight), fontWeight: FontWeight.extrabold, fontFamily: FontFamily.serif },

  // Mono (confirmation codes, data)
  mono:      { fontSize: FontSize.caption, lineHeight: lineHeight(FontSize.caption),                     fontWeight: FontWeight.bold,     fontFamily: FontFamily.mono },
  monoSm:    { fontSize: FontSize.sm,      lineHeight: lineHeight(FontSize.sm),                          fontWeight: FontWeight.bold,     fontFamily: FontFamily.mono },

  // Buttons
  button:    { fontSize: FontSize.bodyXl,  lineHeight: lineHeight(FontSize.bodyXl, LineHeight.snug),     fontWeight: FontWeight.semibold, fontFamily: FontFamily.sansBold },
  buttonSm:  { fontSize: FontSize.body,    lineHeight: lineHeight(FontSize.body, LineHeight.snug),       fontWeight: FontWeight.semibold, fontFamily: FontFamily.sansBold },
} as const;

// ─── Tailwind Mapping Reference ─────────────────────────────────
// FontSize.micro  (8px)  → text-[8px]
// FontSize.xs     (9px)  → text-[9px]
// FontSize.sm     (10px) → text-[10px]
// FontSize.caption(11px) → text-[11px]
// FontSize.body   (12px) → text-xs
// FontSize.bodyLg (13px) → text-[13px]
// FontSize.bodyXl (14px) → text-sm
// FontSize.subhead(16px) → text-base
// FontSize.title  (20px) → text-xl
// FontSize.headline(26px)→ text-2xl
// FontSize.display(32px) → text-3xl
