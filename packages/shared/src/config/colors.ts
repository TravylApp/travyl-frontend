// Design tokens — single source of truth for the color system.
// Change a value here and it ripples across web + mobile.
// All values are hex strings. No CSS var(), no platform-specific code.
//
// Usage:
//   import { Blue, Gray, hexToRgba } from '@travyl/shared';
//   color: Blue[600]              // brand primary
//   backgroundColor: Blue[50]     // light tint background
//   borderColor: hexToRgba(Blue[600], 0.15)  // 15% opacity border

// ─── Utility ──────────────────────────────────────────────────────

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Color Scales ─────────────────────────────────────────────────

export const Blue = {
  50:  '#EFF4FF',
  100: '#DBE6FF',
  200: '#B3C9FF',
  300: '#80A5FF',
  400: '#4D7FD7',
  500: '#1A5CC8',
  600: '#003594',   // ← brand primary
  700: '#002B7A',
  800: '#002060',
  900: '#001545',
} as const;

export const Gray = {
  50:  '#F9FAFB',
  100: '#F3F4F6',
  200: '#E5E7EB',
  300: '#D1D5DB',
  400: '#9CA3AF',
  500: '#6B7280',
  600: '#4B5563',
  700: '#374151',
  800: '#1F2937',
  900: '#111827',
} as const;

export const Emerald = {
  50:  '#ECFDF5',
  100: '#D1FAE5',
  500: '#10B981',
  600: '#059669',
  700: '#047857',
} as const;

export const Amber = {
  50:  '#FFFBEB',
  100: '#FEF3C7',
  400: '#FBBF24',
  500: '#F59E0B',
  600: '#D97706',
} as const;

export const Red = {
  50:  '#FEF2F2',
  100: '#FEE2E2',
  500: '#EF4444',
  600: '#DC2626',
  700: '#B91C1C',
} as const;

export const Orange = {
  500: '#F97316',
  600: '#EA580C',
} as const;

export const Sky = {
  500: '#0EA5E9',
} as const;

export const Violet = {
  500: '#8B5CF6',
} as const;

export const Indigo = {
  500: '#6366F1',
} as const;

export const Cyan = {
  500: '#06B6D4',
} as const;

export const Teal = {
  500: '#0D9488',
  600: '#0F766E',
} as const;

export const Slate = {
  500: '#475569',
} as const;

export const Navy = {
  DEFAULT: '#1e3a5f',
  light: '#2d4a6f',
  dark: '#162d4a',
} as const;

// ─── Semantic Colors ──────────────────────────────────────────────

export const Brand = {
  primary: Blue[600],    // #003594
  accent: '#FFC72C',      // Gold
  background: '#FFFFFF',
  foreground: Gray[900], // #111827
  muted: Gray[100],      // #F3F4F6
  mutedForeground: Gray[500], // #6B7280
  border: Gray[200],     // #E5E7EB
} as const;

export const TripStatusColors = {
  planning:  { bg: Blue[100],      text: '#1D4ED8' },
  booked:    { bg: Amber[100],     text: '#A16207' },
  active:    { bg: Emerald[100],   text: '#15803D' },
  completed: { bg: Gray[100],      text: Gray[600] },
  abandoned: { bg: '#FEE2E2',      text: '#B91C1C' },
} as const;

// ─── V3 Color System (matches Figma Make) ───────────────────────

export const COLORS = {
  // Primary colors
  navy: Navy.DEFAULT,
  navyLight: Navy.light,
  navyDark: Navy.dark,
  sand: '#e8dcc4',
  sandLight: '#f5f0e6',
  warmBrown: '#8b6f47',
  white: '#ffffff',
  black: '#000000',
  // Semantic
  primary: Blue[600],
  secondary: '#8b6f47',
  accent: '#FFC72C',
  background: '#ffffff',
  // UI state
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
} as const;

// Tab colors — distinct per-tab for visual differentiation
export const TAB_COLORS = {
  index:       '#3b82f6',  // overview — blue
  itinerary:   '#3b82f6',  // blue
  hotels:      '#60a5fa',  // light blue
  flights:     '#2563eb',  // dark blue
  restaurants: '#f97316',  // orange
  activities:  '#f59e0b',  // amber
  packing:     '#6366f1',  // indigo
  budget:      '#10b981',  // emerald
  settings:    '#475569',  // slate
  cars:        '#06b6d4',  // cyan
  favorites:   '#ef4444',  // red
  info:        Navy.DEFAULT,  // navy
  explore:     '#3b82f6',  // blue
  events:      '#8b5cf6',  // violet
} as const;

export const TIME_SECTION_COLORS = {
  morning:      { bg: '#f0f4f8', border: '#d9e2ec', text: Navy.DEFAULT, icon: '#3a6b9f',
                  gradient: `linear-gradient(135deg, ${Navy.DEFAULT}, #2d5a8a)` },
  afternoon:    { bg: '#edf2f7', border: '#cdd8e5', text: Navy.dark, icon: Navy.light,
                  gradient: `linear-gradient(135deg, ${Navy.light}, #3a6b9f)` },
  evening:      { bg: '#e8edf3', border: '#c4cfdd', text: '#0f2440', icon: Navy.DEFAULT,
                  gradient: `linear-gradient(135deg, ${Navy.dark}, ${Navy.DEFAULT})` },
  latenight:    { bg: '#e4e9f0', border: '#b8c4d4', text: '#0a1929', icon: Navy.dark,
                  gradient: `linear-gradient(135deg, #0f2440, ${Navy.dark})` },
  hotel:        { bg: '#f0f4f8', border: '#d9e2ec', text: Navy.DEFAULT, icon: '#2d5a8a',
                  gradient: `linear-gradient(135deg, ${Navy.DEFAULT}, ${Navy.light})` },
  travel:       { bg: '#edf2f7', border: '#cdd8e5', text: Navy.dark, icon: Navy.DEFAULT,
                  gradient: `linear-gradient(135deg, ${Navy.DEFAULT}, #2d5a8a)` },
  checkout:     { bg: '#f0f4f8', border: '#d9e2ec', text: Navy.DEFAULT, icon: Navy.light,
                  gradient: `linear-gradient(135deg, ${Navy.light}, #3a6b9f)` },
  returnFlight: { bg: '#edf2f7', border: '#cdd8e5', text: Navy.dark, icon: Navy.DEFAULT,
                  gradient: `linear-gradient(135deg, ${Navy.dark}, ${Navy.DEFAULT})` },
} as const;

// Activity type colors are in itineraryData.ts (richer set with bg key)

// ─── Utility functions ──────────────────────────────────────────

export function getTabColor(tabId: string): string {
  return TAB_COLORS[tabId as keyof typeof TAB_COLORS] || Navy.DEFAULT;
}

// getActivityTypeColors is in itineraryData.ts as getActivityTypeColor

// ─── Dark Mode Token System ─────────────────────────────────────

export type ThemeTokens = {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  skeleton: string;
  tint: string;
  accent: string;
  cardBackground: string;
  inputBackground: string;
  overlay: string;
  shadow: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  error: string;
  errorBg: string;
  info: string;
  infoBg: string;
  sandBackground: string;
  sandText: string;
  sandTextSecondary: string;
  sandBorder: string;
  tabBarBackground: string;
  tabBarInactive: string;
  tabBarActive: string;
};

export const LIGHT_TOKENS: ThemeTokens = {
  background: '#ffffff',
  surface: '#f9fafb',
  surfaceElevated: '#ffffff',
  text: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  skeleton: '#e5e7eb',
  tint: Navy.DEFAULT,
  accent: '#FFC72C',
  cardBackground: '#ffffff',
  inputBackground: '#ffffff',
  overlay: 'rgba(0,0,0,0.5)',
  shadow: '#000000',
  success: '#22c55e',
  successBg: '#dcfce7',
  warning: '#f59e0b',
  warningBg: '#fef3c7',
  error: '#ef4444',
  errorBg: '#fee2e2',
  info: '#3b82f6',
  infoBg: '#dbeafe',
  sandBackground: '#e8d5c0',
  sandText: '#2a1f17',
  sandTextSecondary: '#3d2f23',
  sandBorder: '#c4a882',
  tabBarBackground: Navy.DEFAULT,
  tabBarInactive: 'rgba(255,255,255,0.6)',
  tabBarActive: '#ffffff',
};

export const DARK_TOKENS: ThemeTokens = {
  background: '#121212',
  surface: '#1e1e1e',
  surfaceElevated: '#2a2a2a',
  text: '#f3f4f6',
  textSecondary: '#9ca3af',
  textTertiary: '#6b7280',
  border: '#333333',
  borderLight: '#2a2a2a',
  skeleton: '#333333',
  tint: '#5b8cb8',
  accent: '#FFC72C',
  cardBackground: '#1e1e1e',
  inputBackground: '#2a2a2a',
  overlay: 'rgba(0,0,0,0.7)',
  shadow: '#000000',
  success: '#4ade80',
  successBg: '#14532d',
  warning: '#fbbf24',
  warningBg: '#713f12',
  error: '#f87171',
  errorBg: '#7f1d1d',
  info: '#60a5fa',
  infoBg: '#1e3a5f',
  sandBackground: '#1a1512',
  sandText: '#e8d5c0',
  sandTextSecondary: '#c4a882',
  sandBorder: '#3d2f23',
  tabBarBackground: '#1a1a2e',
  tabBarInactive: 'rgba(255,255,255,0.5)',
  tabBarActive: '#ffffff',
};
