import { Navy } from './colors';

export interface TripTheme {
  id: string;
  name: string;
  base: string;
  baseDark: string;
  accent: string;
  textOnBase: string;
  textOnAccent: string;
  tabColors: Record<string, string>;
  itineraryColors: {
    morning: string;
    afternoon: string;
    evening: string;
    latenight: string;
  };
}

function textForBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#111827' : '#ffffff';
}

export function adjustBrightness(hex: string, amount: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hueShift(hex: string, shift: number): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const s = max === 0 ? 0 : (max - min) / max;
  const v = max;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  h = (h + shift / 360) % 1;
  if (h < 0) h += 1;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let ro: number, go: number, bo: number;
  switch (i % 6) {
    case 0: ro = v; go = t; bo = p; break;
    case 1: ro = q; go = v; bo = p; break;
    case 2: ro = p; go = v; bo = t; break;
    case 3: ro = p; go = q; bo = v; break;
    case 4: ro = t; go = p; bo = v; break;
    default: ro = v; go = p; bo = q; break;
  }
  return `#${Math.round(ro * 255).toString(16).padStart(2, '0')}${Math.round(go * 255).toString(16).padStart(2, '0')}${Math.round(bo * 255).toString(16).padStart(2, '0')}`;
}

function makeTabColors(base: string): Record<string, string> {
  return {
    index:       base,
    itinerary:   hueShift(base, 15),
    hotels:      hueShift(base, 30),
    flights:     hueShift(base, -15),
    restaurants: hueShift(base, 45),
    activities:  hueShift(base, 60),
    packing:     hueShift(base, -30),
    budget:      hueShift(base, -45),
    cars:        hueShift(base, 75),
    favorites:   hueShift(base, -60),
    settings:    adjustBrightness(base, -20),
    info:        base,
  };
}

function makeItineraryColors(base: string): TripTheme['itineraryColors'] {
  return {
    morning:   hueShift(base, 20),
    afternoon: hueShift(base, 45),
    evening:   adjustBrightness(base, -25),
    latenight: adjustBrightness(base, -50),
  };
}

// ─── Default clean palette ──────────────────────────────────
// Sophisticated muted tones that work on light & dark mode
// Default: all same base color — users customize from settings
export const DEFAULT_ITINERARY_COLORS = {
  morning:   '#1e3a5f',
  afternoon: '#1e3a5f',
  evening:   '#1e3a5f',
  latenight: '#1e3a5f',
} as const;

function makeUniformTabColors(base: string): Record<string, string> {
  return {
    index: base, itinerary: base, hotels: base,
    flights: base, restaurants: base, activities: base,
    packing: base, budget: base, cars: base,
    favorites: base, settings: base, info: base,
  };
}

export const TRIP_THEMES: Record<string, TripTheme> = {
  navy: {
    id: 'navy',
    name: 'Navy',
    base: '#1e3a5f',
    baseDark: '#0f1d30',
    accent: '#60a5fa',
    textOnBase: '#ffffff',
    textOnAccent: '#111827',
    tabColors: makeUniformTabColors('#1e3a5f'),
    itineraryColors: DEFAULT_ITINERARY_COLORS,
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    base: '#0e7490',
    baseDark: '#083344',
    accent: '#22d3ee',
    textOnBase: '#ffffff',
    textOnAccent: '#111827',
    tabColors: makeUniformTabColors('#0e7490'),
    itineraryColors: { morning: '#0e7490', afternoon: '#0e7490', evening: '#0e7490', latenight: '#0e7490' },
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    base: '#c2410c',
    baseDark: '#611d06',
    accent: '#fbbf24',
    textOnBase: '#ffffff',
    textOnAccent: '#111827',
    tabColors: makeUniformTabColors('#c2410c'),
    itineraryColors: { morning: '#c2410c', afternoon: '#c2410c', evening: '#c2410c', latenight: '#c2410c' },
  },
  rainforest: {
    id: 'rainforest',
    name: 'Rainforest',
    base: '#15803d',
    baseDark: '#0a401e',
    accent: '#86efac',
    textOnBase: '#ffffff',
    textOnAccent: '#111827',
    tabColors: makeUniformTabColors('#15803d'),
    itineraryColors: { morning: '#15803d', afternoon: '#15803d', evening: '#15803d', latenight: '#15803d' },
  },
  lavender: {
    id: 'lavender',
    name: 'Lavender Fields',
    base: '#7c3aed',
    baseDark: '#3b1d77',
    accent: '#c4b5fd',
    textOnBase: '#ffffff',
    textOnAccent: '#111827',
    tabColors: makeUniformTabColors('#7c3aed'),
    itineraryColors: { morning: '#7c3aed', afternoon: '#7c3aed', evening: '#7c3aed', latenight: '#7c3aed' },
  },
  terracotta: {
    id: 'terracotta',
    name: 'Terracotta',
    base: '#9a3412',
    baseDark: '#4d1a09',
    accent: '#fdba74',
    textOnBase: '#ffffff',
    textOnAccent: '#111827',
    tabColors: makeUniformTabColors('#9a3412'),
    itineraryColors: { morning: '#9a3412', afternoon: '#9a3412', evening: '#9a3412', latenight: '#9a3412' },
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Sky',
    base: '#312e81',
    baseDark: '#191740',
    accent: '#818cf8',
    textOnBase: '#ffffff',
    textOnAccent: '#111827',
    tabColors: makeUniformTabColors('#312e81'),
    itineraryColors: { morning: '#312e81', afternoon: '#312e81', evening: '#312e81', latenight: '#312e81' },
  },
  charcoal: {
    id: 'charcoal',
    name: 'Charcoal',
    base: '#1f2937',
    baseDark: '#111827',
    accent: '#9ca3af',
    textOnBase: '#ffffff',
    textOnAccent: '#111827',
    tabColors: makeUniformTabColors('#1f2937'),
    itineraryColors: { morning: '#1f2937', afternoon: '#1f2937', evening: '#1f2937', latenight: '#1f2937' },
  },
};

export const THEME_ORDER = ['navy', 'ocean', 'sunset', 'rainforest', 'lavender', 'terracotta', 'midnight', 'charcoal'] as const;

export function generateThemeFromColor(hex: string): TripTheme {
  return {
    id: 'custom',
    name: 'Custom',
    base: hex,
    baseDark: adjustBrightness(hex, -60),
    accent: adjustBrightness(hex, 60),
    textOnBase: textForBg(hex),
    textOnAccent: textForBg(adjustBrightness(hex, 60)),
    tabColors: makeUniformTabColors(hex),
    itineraryColors: { morning: hex, afternoon: hex, evening: hex, latenight: hex },
  };
}

export function resolveTheme(themeId?: string, customColor?: string | null): TripTheme {
  if (themeId === 'custom' && customColor) {
    return generateThemeFromColor(customColor);
  }
  return TRIP_THEMES[themeId ?? 'navy'] ?? TRIP_THEMES.navy;
}
