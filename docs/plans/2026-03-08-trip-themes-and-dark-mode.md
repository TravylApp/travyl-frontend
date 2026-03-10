# Trip Themes & Dark Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add system dark mode support across the entire app and travel-inspired theme presets for trip detail screens.

**Architecture:** Centralized color token system in the shared package (`colors.ts` + new `themes.ts`). A `useThemeColors()` hook resolves light/dark tokens. Trip themes stored per-trip, resolved via `TabCtx` context. All hardcoded hex values replaced with token references.

**Tech Stack:** React Native, Expo Router, `useColorScheme()`, Zustand (existing), `@travyl/shared` config package

---

### Task 1: Expand Color Tokens with Dark Mode

**Files:**
- Modify: `packages/shared/src/config/colors.ts`

**Step 1: Add dark mode token maps after the existing `COLORS` object**

Add a `ThemeTokens` type and `LIGHT_TOKENS` / `DARK_TOKENS` maps at the bottom of `colors.ts`, before the utility functions section:

```ts
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
  // Footer / sand
  sandBackground: string;
  sandText: string;
  sandTextSecondary: string;
  sandBorder: string;
  // Tab bar
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
```

**Step 2: Export the new types and tokens from config/index.ts**

Add to the export list in `packages/shared/src/config/index.ts`:

```ts
export type { ThemeTokens } from './colors';
export { LIGHT_TOKENS, DARK_TOKENS } from './colors';
```

**Step 3: Commit**

```bash
git add packages/shared/src/config/colors.ts packages/shared/src/config/index.ts
git commit -m "feat: add light/dark theme token maps to shared color config"
```

---

### Task 2: Create useThemeColors Hook

**Files:**
- Create: `apps/mobile/hooks/useThemeColors.ts`
- Create: `apps/mobile/hooks/index.ts`

**Step 1: Create the hook**

```ts
// apps/mobile/hooks/useThemeColors.ts
import { useColorScheme } from 'react-native';
import { LIGHT_TOKENS, DARK_TOKENS } from '@travyl/shared';
import type { ThemeTokens } from '@travyl/shared';

export function useThemeColors(): ThemeTokens {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DARK_TOKENS : LIGHT_TOKENS;
}
```

**Step 2: Create barrel export**

```ts
// apps/mobile/hooks/index.ts
export { useThemeColors } from './useThemeColors';
```

**Step 3: Commit**

```bash
git add apps/mobile/hooks/useThemeColors.ts apps/mobile/hooks/index.ts
git commit -m "feat: add useThemeColors hook for system dark mode support"
```

---

### Task 3: Create Trip Theme Presets

**Files:**
- Create: `packages/shared/src/config/themes.ts`
- Modify: `packages/shared/src/config/index.ts`

**Step 1: Create themes.ts with all 8 presets + custom generator**

```ts
// packages/shared/src/config/themes.ts
import { hexToRgba, Navy } from './colors';

export interface TripTheme {
  id: string;
  name: string;
  base: string;
  baseDark: string;        // darker variant for dark mode
  accent: string;
  textOnBase: string;
  textOnAccent: string;
  tabColors: Record<string, string>;
}

// Helper: compute whether white or dark text has better contrast
function textForBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#111827' : '#ffffff';
}

// Helper: lighten/darken a hex color
function adjustBrightness(hex: string, amount: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Helper: shift hue slightly for variety in tab colors
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
  // HSV to RGB
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

export const TRIP_THEMES: Record<string, TripTheme> = {
  navy: {
    id: 'navy',
    name: 'Navy',
    base: '#1e3a5f',
    baseDark: '#0f1d30',
    accent: '#60a5fa',
    textOnBase: '#ffffff',
    textOnAccent: '#111827',
    tabColors: {
      index: '#3b82f6', itinerary: '#2563eb', hotels: '#60a5fa',
      flights: '#1d4ed8', restaurants: '#0ea5e9', activities: '#06b6d4',
      packing: '#6366f1', budget: '#10b981', cars: '#0891b2',
      favorites: '#ec4899', settings: '#475569', info: '#1e3a5f',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    base: '#0e7490',
    baseDark: '#083344',
    accent: '#22d3ee',
    textOnBase: '#ffffff',
    textOnAccent: '#111827',
    tabColors: makeTabColors('#0e7490'),
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    base: '#c2410c',
    baseDark: '#611d06',
    accent: '#fbbf24',
    textOnBase: '#ffffff',
    textOnAccent: '#111827',
    tabColors: makeTabColors('#c2410c'),
  },
  rainforest: {
    id: 'rainforest',
    name: 'Rainforest',
    base: '#15803d',
    baseDark: '#0a401e',
    accent: '#86efac',
    textOnBase: '#ffffff',
    textOnAccent: '#111827',
    tabColors: makeTabColors('#15803d'),
  },
  lavender: {
    id: 'lavender',
    name: 'Lavender Fields',
    base: '#7c3aed',
    baseDark: '#3b1d77',
    accent: '#c4b5fd',
    textOnBase: '#ffffff',
    textOnAccent: '#111827',
    tabColors: makeTabColors('#7c3aed'),
  },
  terracotta: {
    id: 'terracotta',
    name: 'Terracotta',
    base: '#9a3412',
    baseDark: '#4d1a09',
    accent: '#fdba74',
    textOnBase: '#ffffff',
    textOnAccent: '#111827',
    tabColors: makeTabColors('#9a3412'),
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Sky',
    base: '#312e81',
    baseDark: '#191740',
    accent: '#818cf8',
    textOnBase: '#ffffff',
    textOnAccent: '#111827',
    tabColors: makeTabColors('#312e81'),
  },
  sand: {
    id: 'sand',
    name: 'Sand',
    base: '#e8d5c0',
    baseDark: '#3d2f23',
    accent: '#c4a882',
    textOnBase: '#2a1f17',
    textOnAccent: '#ffffff',
    tabColors: makeTabColors('#c4a882'),
  },
};

export const THEME_ORDER = ['navy', 'ocean', 'sunset', 'rainforest', 'lavender', 'terracotta', 'midnight', 'sand'] as const;

export function generateThemeFromColor(hex: string): TripTheme {
  return {
    id: 'custom',
    name: 'Custom',
    base: hex,
    baseDark: adjustBrightness(hex, -60),
    accent: adjustBrightness(hex, 60),
    textOnBase: textForBg(hex),
    textOnAccent: textForBg(adjustBrightness(hex, 60)),
    tabColors: makeTabColors(hex),
  };
}

export function resolveTheme(themeId?: string, customColor?: string): TripTheme {
  if (themeId === 'custom' && customColor) {
    return generateThemeFromColor(customColor);
  }
  return TRIP_THEMES[themeId ?? 'navy'] ?? TRIP_THEMES.navy;
}
```

**Step 2: Export from config/index.ts**

Add to `packages/shared/src/config/index.ts`:

```ts
export {
  TRIP_THEMES,
  THEME_ORDER,
  generateThemeFromColor,
  resolveTheme,
} from './themes';
export type { TripTheme } from './themes';
```

**Step 3: Commit**

```bash
git add packages/shared/src/config/themes.ts packages/shared/src/config/index.ts
git commit -m "feat: add 8 travel-inspired theme presets with custom color generator"
```

---

### Task 4: Add Theme Fields to Trip Type

**Files:**
- Modify: `packages/shared/src/types/index.ts:13-31` (Trip interface)
- Modify: `packages/shared/src/config/mockTripsData.ts` (add theme to mock trips)

**Step 1: Add theme fields to Trip interface**

Add after `share_link_role` (line 28):

```ts
  theme: string;               // preset name e.g. 'navy', 'ocean', or 'custom'
  custom_theme_color: string | null; // hex when theme === 'custom'
```

**Step 2: Add default theme values to mock trip data**

Find the mock trips in `mockTripsData.ts` and add `theme: 'navy', custom_theme_color: null` to each mock trip object.

**Step 3: Commit**

```bash
git add packages/shared/src/types/index.ts packages/shared/src/config/mockTripsData.ts
git commit -m "feat: add theme and custom_theme_color fields to Trip type"
```

---

### Task 5: Wire Theme into Trip Layout TabCtx

**Files:**
- Modify: `apps/mobile/app/trip/[id]/_layout.tsx`

**Step 1: Import theme utilities and add to context**

Add imports at top:
```ts
import { resolveTheme } from '@travyl/shared';
import type { TripTheme } from '@travyl/shared';
```

Add `theme: TripTheme` to the `TabCtx` context type and default value (use `resolveTheme()` for default).

**Step 2: Resolve theme in TripLayout and pass via context**

In `TripLayout`, after getting `trip` from `useItineraryScreen`:
```ts
const theme = resolveTheme(trip?.theme, trip?.custom_theme_color);
```

Add `theme` to the `TabCtx.Provider` value.

**Step 3: Replace hardcoded NAVY in all 3 tab bar components**

In `HorizontalTabBar`, `BookTabSidebar`, and `BottomTabBar`:
- Replace `const color = NAVY;` with `const { theme } = useContext(TabCtx);`
- Use `theme.tabColors[route.name] ?? theme.base` for individual tab colors
- Use `theme.base` for the bar background / drag handle background

**Step 4: Update TripHero gradient to use theme base**

Replace the hardcoded NAVY bottom edge line and gradient tint with `theme.base`.

**Step 5: Commit**

```bash
git add apps/mobile/app/trip/[id]/_layout.tsx
git commit -m "feat: wire trip theme into tab bars and hero section"
```

---

### Task 6: Create ThemePicker Component

**Files:**
- Create: `apps/mobile/components/trip/ThemePicker.tsx`

**Step 1: Build the swatch picker**

A horizontal scrollable row of colored circles. Each circle shows the theme's base color, with name below. Active theme has a checkmark overlay. Last item is "Custom" with a color grid that expands on tap.

The component receives:
```ts
interface ThemePickerProps {
  currentTheme: string;
  customColor?: string | null;
  onSelect: (themeId: string, customColor?: string) => void;
  compact?: boolean; // for drag handle popover
}
```

Uses `TRIP_THEMES`, `THEME_ORDER` from `@travyl/shared`.

Custom picker: a grid of 12-16 color swatches + hex text input.

**Step 2: Commit**

```bash
git add apps/mobile/components/trip/ThemePicker.tsx
git commit -m "feat: add ThemePicker component with presets and custom color option"
```

---

### Task 7: Add Theme Section to Settings Screen

**Files:**
- Modify: `apps/mobile/app/trip/[id]/settings.tsx`

**Step 1: Add "Trip Theme" section near the top of the settings scroll**

Import `ThemePicker` and `TabCtx` from the layout. Add a new `SettingsSection` with title "Trip Theme", icon "paint-brush", color matching the current theme accent.

Inside, render the `ThemePicker`. On selection, update the trip's theme (local state for now, Supabase later).

**Step 2: Commit**

```bash
git add apps/mobile/app/trip/[id]/settings.tsx
git commit -m "feat: add trip theme picker to settings screen"
```

---

### Task 8: Add Long-Press Theme Picker to Drag Handle

**Files:**
- Modify: `apps/mobile/app/trip/[id]/_layout.tsx` (DragHandle component)

**Step 1: Add long-press handler to DragHandle**

Use `onLongPress` or detect long press in the existing PanResponder (if `didDrag` is false and press duration > 500ms). On long press, show a compact theme picker modal/overlay.

**Step 2: Add a small Modal or absolutely-positioned overlay**

Render the `ThemePicker` in compact mode. Position it near the drag handle. Dismiss on selection or tap outside.

**Step 3: Commit**

```bash
git add apps/mobile/app/trip/[id]/_layout.tsx
git commit -m "feat: add long-press theme picker to drag handle"
```

---

### Task 9: Replace Hardcoded Colors — Home Page

**Files:**
- Modify: `apps/mobile/app/(tabs)/(home)/index.tsx`

**Step 1: Import `useThemeColors` and replace all hardcoded hex values**

Replace:
- `backgroundColor: '#fff'` → `colors.background`
- `backgroundColor: '#f9fafb'` → `colors.surface`
- `color: '#111827'` / `Gray[900]` → `colors.text`
- `color: '#6b7280'` / `Gray[500]` → `colors.textSecondary`
- `borderColor: '#e5e7eb'` → `colors.border`
- Skeleton `#e5e7eb` → `colors.skeleton`

Keep decorative/brand colors (Blue gradients, hero section) as-is — they're intentional design, not theme-dependent.

**Step 2: Commit**

```bash
git add apps/mobile/app/(tabs)/(home)/index.tsx
git commit -m "fix: replace hardcoded colors with theme tokens on home page"
```

---

### Task 10: Replace Hardcoded Colors — Trips List

**Files:**
- Modify: `apps/mobile/app/(tabs)/trips/index.tsx`

**Step 1: Import `useThemeColors` and replace hardcoded values**

Key replacements:
- Container `#f9fafb` → `colors.surface`
- Card `#fff` → `colors.cardBackground`
- Header title `#111827` → `colors.text`
- Info text `#4b5563` → `colors.textSecondary`
- Skeleton `#e5e7eb` → `colors.skeleton`
- Shadow `#000` → `colors.shadow`

**Step 2: Commit**

```bash
git add apps/mobile/app/(tabs)/trips/index.tsx
git commit -m "fix: replace hardcoded colors with theme tokens on trips list"
```

---

### Task 11: Replace Hardcoded Colors — Profile

**Files:**
- Modify: `apps/mobile/app/(tabs)/profile/index.tsx`

**Step 1: Same pattern — import hook, replace all hardcoded hex**

**Step 2: Commit**

```bash
git add apps/mobile/app/(tabs)/profile/index.tsx
git commit -m "fix: replace hardcoded colors with theme tokens on profile screen"
```

---

### Task 12: Replace Hardcoded Colors — Login

**Files:**
- Modify: `apps/mobile/app/login.tsx`

**Step 1: Replace hardcoded colors**

- Beige background `#f8f6f3` → `colors.surface`
- White inputs `#fff` → `colors.inputBackground`
- Text colors → `colors.text` / `colors.textSecondary`

**Step 2: Commit**

```bash
git add apps/mobile/app/login.tsx
git commit -m "fix: replace hardcoded colors with theme tokens on login screen"
```

---

### Task 13: Replace Hardcoded Colors — Footer & Decorative Components

**Files:**
- Modify: `apps/mobile/components/home/Footer.tsx`
- Modify: `apps/mobile/components/home/HowItWorks.tsx`
- Modify: `apps/mobile/components/home/OceanWave.tsx`

**Step 1: Footer — replace hardcoded SAND/BROWN with tokens**

Replace `SAND`, `BROWN_DARK`, `BROWN_MED`, `BORDER` constants with `colors.sandBackground`, `colors.sandText`, `colors.sandTextSecondary`, `colors.sandBorder`.

**Step 2: HowItWorks — replace gray backgrounds/text**

**Step 3: OceanWave — the sand gradient endpoint should use the token**

**Step 4: Commit**

```bash
git add apps/mobile/components/home/Footer.tsx apps/mobile/components/home/HowItWorks.tsx apps/mobile/components/home/OceanWave.tsx
git commit -m "fix: replace hardcoded colors with theme tokens in footer and decorative components"
```

---

### Task 14: Replace Hardcoded Colors — Trip Detail Screens

**Files:**
- Modify: `apps/mobile/app/trip/[id]/index.tsx`
- Modify: `apps/mobile/app/trip/[id]/itinerary.tsx`
- Modify: `apps/mobile/app/trip/[id]/hotels.tsx`
- Modify: `apps/mobile/app/trip/[id]/flights.tsx`
- Modify: `apps/mobile/app/trip/[id]/restaurants.tsx`
- Modify: `apps/mobile/app/trip/[id]/activities.tsx`
- Modify: `apps/mobile/app/trip/[id]/packing.tsx`
- Modify: `apps/mobile/app/trip/[id]/budget.tsx`
- Modify: `apps/mobile/app/trip/[id]/cars.tsx`
- Modify: `apps/mobile/app/trip/[id]/favorites.tsx`
- Modify: `apps/mobile/app/trip/[id]/settings.tsx`
- Modify: `apps/mobile/app/trip/[id]/info.tsx`

**Step 1: Each screen — import `useThemeColors`, replace hardcoded whites/grays/text colors**

All trip detail screens follow the same pattern. Replace:
- White backgrounds → `colors.background` / `colors.cardBackground`
- Gray[100-200] borders → `colors.border` / `colors.borderLight`
- Gray[900] text → `colors.text`
- Gray[500] secondary text → `colors.textSecondary`
- Gray[300-400] tertiary → `colors.textTertiary`
- Skeleton gray → `colors.skeleton`

**Step 2: Commit in batches of 3-4 screens**

```bash
git add apps/mobile/app/trip/[id]/index.tsx apps/mobile/app/trip/[id]/itinerary.tsx apps/mobile/app/trip/[id]/hotels.tsx
git commit -m "fix: replace hardcoded colors with theme tokens in overview, itinerary, hotels"

git add apps/mobile/app/trip/[id]/flights.tsx apps/mobile/app/trip/[id]/restaurants.tsx apps/mobile/app/trip/[id]/activities.tsx
git commit -m "fix: replace hardcoded colors with theme tokens in flights, restaurants, activities"

git add apps/mobile/app/trip/[id]/packing.tsx apps/mobile/app/trip/[id]/budget.tsx apps/mobile/app/trip/[id]/cars.tsx
git commit -m "fix: replace hardcoded colors with theme tokens in packing, budget, cars"

git add apps/mobile/app/trip/[id]/favorites.tsx apps/mobile/app/trip/[id]/settings.tsx apps/mobile/app/trip/[id]/info.tsx
git commit -m "fix: replace hardcoded colors with theme tokens in favorites, settings, info"
```

---

### Task 15: Update Root Layout Colors.ts

**Files:**
- Modify: `apps/mobile/constants/Colors.ts`

**Step 1: Update to reference shared tokens**

```ts
import { LIGHT_TOKENS, DARK_TOKENS, Navy } from '@travyl/shared';

export default {
  light: {
    text: LIGHT_TOKENS.text,
    background: LIGHT_TOKENS.background,
    tint: LIGHT_TOKENS.tint,
    tabIconDefault: LIGHT_TOKENS.textTertiary,
    tabIconSelected: Navy.DEFAULT,
    accent: LIGHT_TOKENS.accent,
  },
  dark: {
    text: DARK_TOKENS.text,
    background: DARK_TOKENS.background,
    tint: DARK_TOKENS.tint,
    tabIconDefault: DARK_TOKENS.textTertiary,
    tabIconSelected: DARK_TOKENS.tabBarActive,
    accent: DARK_TOKENS.accent,
  },
};
```

**Step 2: Commit**

```bash
git add apps/mobile/constants/Colors.ts
git commit -m "refactor: update Colors.ts to reference shared theme tokens"
```

---

### Task 16: Visual QA Pass

**Step 1: Test light mode** — Open every major screen (home, trips, profile, login, trip detail with each tab). Verify no hardcoded white/gray remnants.

**Step 2: Test dark mode** — Toggle system appearance to dark. Walk through same screens. Check contrast, readability, card edges.

**Step 3: Test each theme preset** — Navigate to a trip, open settings, switch through all 8 themes. Verify tab bar colors change, hero tints, accents update.

**Step 4: Test custom theme** — Pick a custom color, verify the generated palette looks harmonious.

**Step 5: Test drag handle long-press** — Long-press the drag handle, verify theme picker appears and works.

**Step 6: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix: visual QA fixes for themes and dark mode"
```
