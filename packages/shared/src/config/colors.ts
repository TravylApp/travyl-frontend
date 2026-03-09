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
  navy: Blue[600],
  navyLight: Blue[500],
  navyDark: Blue[700],
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

export const ITINERARY_BREAKDOWN_COLORS = {
  primary: '#0ea5e9',
  light: '#e0f2fe',
  medium: '#7dd3fc',
  dark: '#0284c7',
  containerBg: '#f0f9ff',
  // Backwards compat aliases
  daySelectorBg: '#f0f9ff',
  daySelectorActive: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)',
  timeHeaderGradient: 'linear-gradient(to right, #0ea5e9, #38bdf8)',
  timeHeaderText: '#ffffff',
  cardBorder: '#e5e7eb',
} as const;

// Tab colors — all dark blue (navy) for consistent branding
export const TAB_COLORS = {
  itinerary:   '#1e3a5f',
  hotels:      '#1e3a5f',
  flights:     '#1e3a5f',
  packing:     '#1e3a5f',
  budget:      '#1e3a5f',
  restaurants: '#1e3a5f',
  activities:  '#1e3a5f',
  info:        '#1e3a5f',
  settings:    '#1e3a5f',
  explore:     '#1e3a5f',
  events:      '#1e3a5f',
} as const;

export const TIME_SECTION_COLORS = {
  morning:      { bg: '#f0f4f8', border: '#d9e2ec', text: '#1e3a5f', icon: '#3a6b9f',
                  gradient: 'linear-gradient(135deg, #1e3a5f, #2d5a8a)' },
  afternoon:    { bg: '#edf2f7', border: '#cdd8e5', text: '#162d4a', icon: '#2d4a6f',
                  gradient: 'linear-gradient(135deg, #2d4a6f, #3a6b9f)' },
  evening:      { bg: '#e8edf3', border: '#c4cfdd', text: '#0f2440', icon: '#1e3a5f',
                  gradient: 'linear-gradient(135deg, #162d4a, #1e3a5f)' },
  latenight:    { bg: '#e4e9f0', border: '#b8c4d4', text: '#0a1929', icon: '#162d4a',
                  gradient: 'linear-gradient(135deg, #0f2440, #162d4a)' },
  hotel:        { bg: '#f0f4f8', border: '#d9e2ec', text: '#1e3a5f', icon: '#2d5a8a',
                  gradient: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)' },
  travel:       { bg: '#edf2f7', border: '#cdd8e5', text: '#162d4a', icon: '#1e3a5f',
                  gradient: 'linear-gradient(135deg, #1e3a5f, #2d5a8a)' },
  checkout:     { bg: '#f0f4f8', border: '#d9e2ec', text: '#1e3a5f', icon: '#2d4a6f',
                  gradient: 'linear-gradient(135deg, #2d4a6f, #3a6b9f)' },
  returnFlight: { bg: '#edf2f7', border: '#cdd8e5', text: '#162d4a', icon: '#1e3a5f',
                  gradient: 'linear-gradient(135deg, #162d4a, #1e3a5f)' },
} as const;

// Activity type colors (for activity cards)
export const ACTIVITY_TYPE_COLORS = {
  landmark: { primary: '#3b82f6', light: '#eff6ff', border: '#bfdbfe' },
  food:     { primary: '#8b5cf6', light: '#f5f3ff', border: '#ddd6fe' },
  tour:     { primary: '#06b6d4', light: '#ecfeff', border: '#a5f3fc' },
  activity: { primary: '#6366f1', light: '#eef2ff', border: '#c7d2fe' },
  hotel:    { primary: '#60a5fa', light: '#eff6ff', border: '#bfdbfe' },
  default:  { primary: '#3b82f6', light: '#eff6ff', border: '#bfdbfe' },
} as const;

// ─── Utility functions ──────────────────────────────────────────

export function getTimeSectionColors(section: string) {
  return TIME_SECTION_COLORS[section as keyof typeof TIME_SECTION_COLORS] ?? TIME_SECTION_COLORS.morning;
}

export function getTabColor(tabId: string): string {
  return TAB_COLORS[tabId as keyof typeof TAB_COLORS] || COLORS.navy;
}

export function getActivityTypeColors(type: string) {
  return ACTIVITY_TYPE_COLORS[type as keyof typeof ACTIVITY_TYPE_COLORS] || ACTIVITY_TYPE_COLORS.default;
}

// Rich button style generator — matches Figma Make getTabButtonStyles
export function getTabButtonStyles(tabColor: string, isActive?: boolean) {
  // If called with (tabKey, isActive) for backwards compat
  if (typeof isActive === 'boolean') {
    const color = TAB_COLORS[tabColor as keyof typeof TAB_COLORS] ?? tabColor;
    return isActive
      ? { backgroundColor: color, color: '#fff' }
      : { backgroundColor: 'transparent', color: '#6b7280' };
  }
  // New API: getTabButtonStyles(color) → style object
  return {
    primary: { backgroundColor: tabColor, color: '#ffffff', transition: 'opacity 0.2s' },
    secondary: { backgroundColor: hexToRgba(tabColor, 0.1), color: tabColor, transition: 'all 0.2s' },
    badge: { backgroundColor: hexToRgba(tabColor, 0.15), color: tabColor },
    gradient: `linear-gradient(to right, ${hexToRgba(tabColor, 0.1)}, ${hexToRgba(tabColor, 0.05)})`,
    gradientVertical: `linear-gradient(to bottom right, ${tabColor}, ${hexToRgba(tabColor, 0.8)})`,
  };
}
