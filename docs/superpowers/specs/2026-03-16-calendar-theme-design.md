# Calendar Dashboard — Travyl Theme (Light + Dark)

**Date:** 2026-03-16
**Branch:** feature/tra-192
**Status:** Spec

---

## Overview

Replace the current generic dark theme on the calendar dashboard with the official Travyl design system tokens. Both light and dark modes are implemented. A manual toggle in the `CalendarHeader` switches modes; the preference persists to `localStorage` (stubbed — real impl will sync to user preferences in Supabase).

The rest of the web app is unaffected. Tailwind's `dark:` variants are scoped to the calendar dashboard root element via a `@custom-variant` directive.

---

## Goals

- Light and dark modes that both use Travyl design tokens (navy, Blue[600], amber, Lustria/Satoshi)
- Theme toggle button in the calendar header (sun/moon icon)
- Preference persisted to `localStorage` keyed to `'travyl-calendar-theme'`
- No regressions on drag-and-drop, event selection, detail panel, or collaborator presence

## Non-Goals

- Syncing theme to Supabase user profile (deferred)
- Theming any other page or route outside the calendar dashboard
- Changing the activity-type color palette

---

## Token Mapping

All hardcoded dark hex values are replaced. Base styles target light mode; `dark:` variants override for dark mode.

| Element | Light | Dark |
|---|---|---|
| Page / main bg | `bg-gray-50` | `dark:bg-[#0a1520]` |
| Sidebar bg | `bg-white` | `dark:bg-[#0a1520]` |
| Header bg | `bg-white` | `dark:bg-[#0f1a28]` |
| Detail panel bg | `bg-white` | `dark:bg-[#0f1a28]` |
| Borders | `border-gray-200` | `dark:border-[#1e3a5f]/30` |
| Primary text | `text-gray-900` | `dark:text-[#f5efe8]` |
| Secondary text | `text-gray-500` | `dark:text-[#4a7ab5]` |
| Trip name (Lustria) | `text-[#1e3a5f] font-serif` | `dark:text-[#f5efe8]` |
| Active nav bg | `bg-[#EFF4FF]` | `dark:bg-[#003594]/35` |
| Active nav text | `text-[#003594]` | `dark:text-white` |
| Inactive nav icon | `text-gray-400` | `dark:text-[#4a7ab5]` |
| View toggle active | `bg-[#003594] text-white` | same |
| View toggle inactive | `bg-gray-100 text-gray-500` | `dark:bg-[#1e3a5f]/25 dark:text-[#4a7ab5]` |
| Share button | `bg-[#F59E0B] text-white` | same (amber is constant across modes) |
| Hour grid lines | `border-gray-100` | `dark:border-[#1e3a5f]/15` |
| Half-hour lines | `border-gray-100/60` | `dark:border-[#1e3a5f]/10` |
| Day col header text | `text-gray-500` | `dark:text-[#4a7ab5]` |
| Drag-over highlight | `bg-[#EFF4FF]` | `dark:bg-[#003594]/15` |
| Flight banner | `bg-[#EFF4FF] text-[#003594]` | `dark:bg-[#003594]/35 dark:text-[#a0c4ff]` |
| Hotel banner | `bg-amber-100 text-amber-800` | `dark:bg-amber-900/40 dark:text-amber-200` |
| Skeleton bg | `bg-gray-50` | `dark:bg-[#0a1520]` |
| Skeleton surface | `bg-white` | `dark:bg-[#0f1a28]` |
| Skeleton pulse lines | `bg-gray-200` | `dark:bg-[#1e3a5f]/40` |

**Note on `#0f1a28`:** This is an intermediate navy surface (`#0a1520` → `#0f1a28` → `#1e3a5f`) used for elevated surfaces (header, detail panel) to create visual layering depth in dark mode. It is intentional and not a token gap.

### Event Block Colors Per Mode

Light mode: full-saturation activity color as block background.
Dark mode: deep-tinted background + bright left border, preserving activity color identity.

| Type | Light bg | Dark bg | Dark border |
|---|---|---|---|
| sightseeing | `#003594` | `#1e3a5f` | `#4a7ab5` |
| dining | `#D97706` | `#78350f` | `#F59E0B` |
| tour | `#0d9488` | `#134e4a` | `#14b8a6` |
| cultural | `#7C3AED` | `#4c1d95` | `#8b5cf6` |
| shopping | `#dc2626` | `#7f1d1d` | `#f87171` |
| nightlife | `#9333ea` | `#581c87` | `#a78bfa` |
| outdoor | `#059669` | `#064e3b` | `#10b981` |
| museum | `#d97706` | `#78350f` | `#fbbf24` |
| transport | `#2563eb` | `#1e3a5f` | `#60a5fa` |
| hotel | `#6b7280` | `#374151` | `#9ca3af` |
| default | `#6b7280` | `#374151` | `#9ca3af` |

Note: `cultural` uses violet (`#7C3AED`) and `nightlife` uses purple (`#9333ea`) — distinct in light mode.

---

## globals.css Changes

Two additions to `apps/web/app/globals.css`:

**1. Register Lustria as `--font-serif` in `@theme`:**

```css
@theme inline {
  /* ... existing tokens ... */
  --font-serif: 'Lustria', Georgia, serif;
}
```

**2. Add dark mode custom variant** (Tailwind v4 has no `tailwind.config.ts`):

```css
@custom-variant dark (&:is(.dark *));
```

This scopes `dark:` variants to elements that are descendants of a `.dark` ancestor. Adding `class="dark"` to the `CalendarDashboard` root div activates dark mode only within that component tree, leaving all other routes in light mode.

---

## New Files

### `apps/web/components/calendar/hooks/useCalendarTheme.ts`

Manages theme state and localStorage persistence. Uses `useEffect` for localStorage init to avoid SSR hydration mismatch — the server always renders `'light'`, then the client corrects on mount:

```ts
type Theme = 'light' | 'dark'
const STORAGE_KEY = 'travyl-calendar-theme'

export function useCalendarTheme() {
  const [theme, setTheme] = useState<Theme>('light') // server default

  useEffect(() => {
    // Client-only: read persisted preference after mount
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark') setTheme('dark')
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}
```

The single `useEffect` mount read means users who prefer dark mode will see a brief light flash on initial page load. This is acceptable for the stub phase; the Supabase sync (future) will eliminate the flash by server-rendering the correct theme.

### `apps/web/components/calendar/CalendarThemeContext.tsx`

A React context exposing `isDark: boolean` to deep descendants (avoids prop-drilling through WeekView → DayView → DayColumn → EventBlock):

```ts
export const CalendarThemeContext = createContext<{ isDark: boolean }>({ isDark: false })
export const useCalendarThemeContext = () => useContext(CalendarThemeContext)
```

`CalendarDashboard` wraps its tree in `<CalendarThemeContext.Provider value={{ isDark: theme === 'dark' }}>`.

`EventBlock` reads `isDark` via `useCalendarThemeContext()` to select light or dark event block colors from `calendarViewModel`.

### `apps/web/components/calendar/ThemeToggle.tsx`

A small icon button rendered inside `CalendarHeader`. Shows `SunLight` icon in dark mode (click to go light) and `HalfMoon` in light mode (click to go dark). Uses existing iconoir-react style (`strokeWidth={1.5}`, size 18).

---

## Modified Files

### `apps/web/app/globals.css`

Add `--font-serif` to `@theme inline` block and add the `@custom-variant dark` directive as described above.

### `CalendarDashboard.tsx`

```tsx
const { theme, toggleTheme } = useCalendarTheme()

return (
  <CalendarThemeContext.Provider value={{ isDark: theme === 'dark' }}>
    <div className={`flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0a1520] text-gray-900 dark:text-[#f5efe8] ${theme === 'dark' ? 'dark' : ''}`}>
      ...
    </div>
  </CalendarThemeContext.Provider>
)
```

Pass `onToggleTheme={toggleTheme}` and `theme={theme}` to `CalendarHeader`.

### `CalendarHeader.tsx`

Updated prop interface:

```ts
interface CalendarHeaderProps {
  // ... existing props ...
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}
```

- Add `<ThemeToggle theme={theme} onToggle={onToggleTheme} />` between the view toggle group and the share button
- Change trip name: `<span className="font-serif font-normal text-[#1e3a5f] dark:text-[#f5efe8] text-[15px]">`
- Replace `bg-white/5` header bg: `bg-white dark:bg-[#0f1a28]`
- Replace `border-white/10`: `border-gray-200 dark:border-[#1e3a5f]/30`
- Replace view toggle inactive `text-gray-400 hover:bg-white/10`: `text-gray-500 hover:bg-gray-100 dark:text-[#4a7ab5] dark:hover:bg-[#1e3a5f]/25`
- Replace "New Activity" button `border-white/10 text-gray-400`: `border-gray-200 text-gray-500 dark:border-[#1e3a5f]/30 dark:text-[#4a7ab5]`
- Replace `border-white/10` dividers: `border-gray-200 dark:border-[#1e3a5f]/30`
- Replace avatar `ring-[#1a1a2e]`: `ring-white dark:ring-[#0a1520]`

### `TripSidebar.tsx`

- `bg-[#141824]` → `bg-white dark:bg-[#0a1520]`
- `border-white/10` → `border-gray-200 dark:border-[#1e3a5f]/30`
- Active nav: `bg-blue-600/20 text-blue-400` → `bg-[#EFF4FF] text-[#003594] dark:bg-[#003594]/35 dark:text-white`
- Inactive nav: `text-gray-400 hover:bg-white/10 hover:text-white` → `text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-[#4a7ab5] dark:hover:bg-[#1e3a5f]/25 dark:hover:text-white`

### `DayColumn.tsx`

- Day header border: `border-gray-200 dark:border-[#1e3a5f]/30`
- Day header text: `text-gray-500 dark:text-[#4a7ab5]`
- Day header hover: `hover:bg-gray-100 dark:hover:bg-[#1e3a5f]/25`
- Droppable grid border: `border-gray-200 dark:border-[#1e3a5f]/20`
- Drag-over: `bg-[#EFF4FF] dark:bg-[#003594]/15`
- Hour lines: `border-gray-100 dark:border-[#1e3a5f]/15`
- Half-hour lines: `border-gray-100/60 dark:border-[#1e3a5f]/10`

### `AllDayRow.tsx`

- Row border: `border-gray-200 dark:border-[#1e3a5f]/30`
- Cell borders: `border-gray-200 dark:border-[#1e3a5f]/20`
- Flight arrival: `bg-[#EFF4FF] text-[#003594] dark:bg-[#003594]/35 dark:text-[#a0c4ff]`
- Flight departure: `bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300`
- Hotel: `bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200`

### `EventBlock.tsx`

- Remove hardcoded `backgroundColor: color` and `borderLeft: \`3px solid ${color}88\`` inline styles
- Call `useCalendarThemeContext()` to get `isDark`
- Select colors: `isDark ? getActivityColorDark(activity.type) : getActivityColor(activity.type)` for background; `isDark ? getActivityColorDarkBorder(activity.type) : \`${getActivityColor(activity.type)}88\`` for border
- `transition-[ring,shadow,opacity]` already fixed (from drag bug fix); no change needed here

### `packages/shared/src/viewmodels/calendarViewModel.ts`

Add two new exported functions:

```ts
export function getActivityColorDark(type: ActivityType): string {
  // Returns deep-tinted bg for dark mode (see token table)
}

export function getActivityColorDarkBorder(type: ActivityType): string {
  // Returns bright border accent for dark mode (see token table)
}
```

### `DetailPanel.tsx`

- `bg-[#1a1f2e]` → `bg-white dark:bg-[#0f1a28]`
- `border-white/10` → `border-gray-200 dark:border-[#1e3a5f]/30`
- Type label: `text-gray-400 dark:text-[#4a7ab5]`
- Title: `text-gray-900 dark:text-[#f5efe8]`
- Detail rows text: `text-gray-600 dark:text-gray-300`
- Detail row icons: `text-gray-400 dark:text-[#4a7ab5]`
- Notes bg: `bg-gray-50 dark:bg-white/5`
- Notes text: `text-gray-500 dark:text-gray-400`
- Hover states: `hover:bg-gray-100 dark:hover:bg-white/10`
- Remove button border: `border-red-200 dark:border-red-500/30`
- Remove button text: `text-red-500 dark:text-red-400`

### `TimeGutter.tsx`

- `text-gray-400` → `text-gray-400 dark:text-[#4a7ab5]/70`

### `MiniCalendar.tsx`

- Month label: `text-gray-500 dark:text-[#4a7ab5]`
- Weekday headers: `text-gray-400 dark:text-[#4a7ab5]`
- Active day: `bg-[#003594] text-white` (same across modes)
- In-trip days: `text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#1e3a5f]/25`
- Outside-trip days: `text-gray-400 dark:text-[#1e3a5f]/50` (intentionally de-emphasised; `text-gray-400` passes AA contrast on white)

### `CalendarSkeleton.tsx`

- Main bg: `bg-gray-50 dark:bg-[#0a1520]`
- Sidebar/header surface: `bg-white dark:bg-[#0f1a28]`
- Border: `border-gray-200 dark:border-[#1e3a5f]/30`
- Pulse elements: `bg-gray-200 dark:bg-[#1e3a5f]/40`

### `CalendarError.tsx`

- Bg: `bg-gray-50 dark:bg-[#0a1520]`
- Message: `text-gray-600 dark:text-gray-300`
- Retry button: `bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600`
- Error icon: `text-red-400` (same across modes)

---

## Data Flow

```
useCalendarTheme()         ← reads/writes localStorage, SSR-safe via useEffect
       │
       ▼
CalendarDashboard          ← applies 'dark' CSS class to root div
       │                   ← wraps tree in CalendarThemeContext.Provider
       │
       ├── CalendarHeader  ← ThemeToggle button; Lustria trip name
       ├── TripSidebar     ← dark: variants
       ├── AllDayRow       ← dark: variants
       ├── WeekView / DayView
       │     └── DayColumn ← dark: variants
       │           └── EventBlock ← useCalendarThemeContext() for color selection
       └── DetailPanel     ← dark: variants
```

---

## Implementation Order

1. `globals.css` — add `--font-serif` + `@custom-variant dark`
2. `calendarViewModel.ts` — add `getActivityColorDark` + `getActivityColorDarkBorder`
3. `useCalendarTheme.ts` + `CalendarThemeContext.tsx` + `ThemeToggle.tsx` — new files
4. `CalendarDashboard.tsx` — wire theme, apply `dark` class, wrap context
5. `CalendarHeader.tsx` — add toggle, Lustria font, replace colors
6. `EventBlock.tsx` — consume context, select colors per mode
7. Remaining components — `TripSidebar`, `DayColumn`, `AllDayRow`, `DetailPanel`, `TimeGutter`, `MiniCalendar`, `CalendarSkeleton`, `CalendarError`
