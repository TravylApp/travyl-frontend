# Trip Themes & Dark Mode Design

**Date**: 2026-03-08
**Status**: Approved

## Overview

Two independent color systems that compose together:
1. **Dark mode** — System-wide appearance support (iOS dark mode)
2. **Trip themes** — Per-trip customizable color themes for trip detail screens

## 1. Dark Mode

### Strategy
Create a centralized color system in the shared config. All screens reference tokens instead of hardcoded hex values. A `useThemeColors()` hook returns the correct palette based on system appearance.

### Color Tokens

| Token | Light | Dark |
|-------|-------|------|
| `background` | `#ffffff` | `#121212` |
| `surface` | `#f9fafb` | `#1e1e1e` |
| `surfaceElevated` | `#ffffff` | `#2a2a2a` |
| `text` | `#111827` | `#f3f4f6` |
| `textSecondary` | `#6b7280` | `#9ca3af` |
| `textTertiary` | `#9ca3af` | `#6b7280` |
| `border` | `#e5e7eb` | `#333333` |
| `borderLight` | `#f3f4f6` | `#2a2a2a` |
| `skeleton` | `#e5e7eb` | `#333333` |
| `tint` | `#1e3a5f` | `#5b8cb8` |
| `accent` | `#FFC72C` | `#FFC72C` |
| `cardBackground` | `#ffffff` | `#1e1e1e` |
| `inputBackground` | `#ffffff` | `#2a2a2a` |
| `overlay` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` |
| `shadow` | `#000` | `#000` |
| `success` | `#22c55e` | `#4ade80` |
| `warning` | `#f59e0b` | `#fbbf24` |
| `error` | `#ef4444` | `#f87171` |

### Hook API
```ts
const colors = useThemeColors();
// colors.background, colors.text, colors.surface, etc.
```

### Screens to Update (priority order)
1. Home page — white backgrounds, gray text
2. Trips list — card backgrounds, headers
3. Profile — cards, section backgrounds
4. Login/signup — beige background, white inputs
5. Trip detail screens — all 11 tab screens
6. Footer — sand colors need dark variant
7. HowItWorks, OceanWave — decorative components

## 2. Trip Themes

### Travel-Inspired Presets

| Theme | Base | Accent | Vibe |
|-------|------|--------|------|
| **Navy** (default) | `#1e3a5f` | `#60a5fa` | Classic travel journal |
| **Ocean** | `#0e7490` | `#22d3ee` | Tropical waters |
| **Sunset** | `#c2410c` | `#fbbf24` | Golden hour |
| **Rainforest** | `#15803d` | `#86efac` | Jungle exploration |
| **Lavender Fields** | `#7c3aed` | `#c4b5fd` | Provence countryside |
| **Terracotta** | `#9a3412` | `#fdba74` | Mediterranean villages |
| **Midnight Sky** | `#312e81` | `#818cf8` | Stargazing, night flights |
| **Sand** | `#e8d5c0` | `#c4a882` | Beach/desert (matches app footer) |

### What Each Preset Defines
- `base` — tab bar background, hero tint
- `accent` — active states, buttons, highlights
- `tabColors` — map of all tab names to specific palette colors
- `textOnBase` / `textOnAccent` — auto-computed for contrast
- Light + dark variants (dark mode uses subtler tinting)

### Custom Theme
User picks a base color (swatch grid + hex input). System generates:
- Tab colors as hue-shifted variants
- Accent as lighter/saturated variant
- Contrast-aware text colors

### What Themes Affect
- **Tab bar** — button colors from `tabColors`, bar background from `base`
- **Hero section** — gradient overlay tinted to `base`
- **Active states** — buttons, badges, indicators use `accent`
- **Screen headers** — section titles pick up accent subtly

### Per-Trip Storage
- `theme?: string` on Trip type — preset name or `"custom"`
- `customThemeColor?: string` — hex value when theme is `"custom"`
- Stored in mock data for now, Supabase `trips` table later

### Theme + Dark Mode Interaction
In dark mode, the trip theme's `base` color is applied more subtly:
- Tab bar backgrounds darken slightly rather than full base color
- Hero gradient blends with dark background
- Accents remain vibrant for contrast

## 3. UI Surfaces

### Settings Tab — "Trip Theme" Section
- Horizontal scrollable row of theme swatches (colored circles + name)
- Active theme shows a check mark
- Last item "Custom" with color wheel icon → expands swatch grid + hex input

### Drag Handle Long-Press
- Opens compact floating theme picker overlay
- Same swatch circles for quick switching
- Dismisses on selection or tap outside

## 4. File Changes

### New Files
| File | Purpose |
|------|---------|
| `packages/shared/src/config/themes.ts` | Theme presets, `generateThemeFromColor()`, `resolveTheme()` |
| `apps/mobile/hooks/useThemeColors.ts` | Centralized dark mode hook |
| `apps/mobile/components/trip/ThemePicker.tsx` | Reusable swatch picker component |

### Modified Files
| File | Change |
|------|--------|
| `packages/shared/src/config/colors.ts` | Add dark mode token map, ensure all palette colors exist |
| `packages/shared/src/types/index.ts` | Add `theme?`, `customThemeColor?` to Trip type |
| `packages/shared/src/index.ts` | Export new theme utilities |
| `apps/mobile/constants/Colors.ts` | Expand to full token set, import from shared |
| `apps/mobile/app/trip/[id]/_layout.tsx` | Extend TabCtx with resolved theme, use theme colors in all tab bars + hero |
| `apps/mobile/app/trip/[id]/settings.tsx` | Add "Trip Theme" section |
| `apps/mobile/app/(tabs)/(home)/index.tsx` | Replace hardcoded colors with tokens |
| `apps/mobile/app/(tabs)/trips/index.tsx` | Replace hardcoded colors with tokens |
| `apps/mobile/app/(tabs)/profile/index.tsx` | Replace hardcoded colors with tokens |
| `apps/mobile/app/login.tsx` | Replace hardcoded colors with tokens |
| `apps/mobile/app/trip/[id]/index.tsx` | Replace hardcoded colors with tokens |
| `apps/mobile/app/trip/[id]/*.tsx` | All trip detail screens — use tokens |
| `apps/mobile/components/home/Footer.tsx` | Dark variant of sand theme |
| `apps/mobile/components/home/HowItWorks.tsx` | Use tokens |
| `apps/mobile/components/home/OceanWave.tsx` | Dark variant |

## 5. Future: AI-Generated Palettes
Extract dominant colors from destination images using KNN clustering. Auto-suggest a theme palette when a user creates a trip. Not in this phase.
