# Calendar Dashboard Travyl Theme Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the calendar dashboard's generic dark theme with proper Travyl design system tokens, implementing both light and dark modes with a persistent toggle.

**Architecture:** A `useCalendarTheme` hook manages theme state and localStorage persistence. The `CalendarDashboard` root div receives `class="dark"` when dark mode is active, which activates Tailwind `dark:` variants scoped to the calendar subtree via a `@custom-variant` directive in `globals.css`. A `CalendarThemeContext` provides `isDark: boolean` to deep descendants (e.g. `EventBlock`) without prop drilling.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS v4, TypeScript, iconoir-react

---

## Chunk 1: Foundation — globals.css + calendarViewModel dark colors

### Task 1: Add Tailwind dark variant and Lustria font token to globals.css

**Files:**
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Add `--font-serif` to the `@theme inline` block**

  In `apps/web/app/globals.css`, inside the `@theme inline { ... }` block, add one line after `--font-mono`:

  ```css
  --font-serif: 'Lustria', Georgia, serif;
  ```

  The updated `@theme inline` block should be:

  ```css
  @theme inline {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-primary: var(--primary);
    --color-accent: var(--accent);
    --color-muted: var(--muted);
    --color-muted-foreground: var(--muted-foreground);
    --color-border: var(--border);
    --font-sans: 'Satoshi', system-ui, sans-serif;
    --font-mono: var(--font-geist-mono);
    --font-serif: 'Lustria', Georgia, serif;

    /* Trip theme colors — set dynamically by TripThemeProvider */
    --color-trip-base: var(--trip-base, #1e3a5f);
    --color-trip-base-light: var(--trip-base-light, #2d4a6f);
    --color-trip-base-dark: var(--trip-base-dark, #0f1d30);
    --color-trip-accent: var(--trip-accent, #60a5fa);
    --color-trip-text: var(--trip-text, #ffffff);
  }
  ```

- [ ] **Step 2: Add the `@custom-variant dark` directive immediately after the `@import` line**

  The file currently starts with `@import "tailwindcss";`. Insert the directive on line 2:

  ```css
  @import "tailwindcss";
  @custom-variant dark (&:is(.dark *));
  ```

  This scopes `dark:` variants to descendants of any `.dark` ancestor.

- [ ] **Step 3: Verify the `@custom-variant` directive is present**

  Run:
  ```bash
  head -3 apps/web/app/globals.css
  ```

  Expected output (whitespace between lines may vary):
  ```
  @import "tailwindcss";
  @custom-variant dark (&:is(.dark *));
  ```

- [ ] **Step 4: Run type-check to confirm no build errors**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: No errors.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/app/globals.css
  git commit -m "feat: add Tailwind dark variant and Lustria font token to globals.css"
  ```

---

### Task 2: Add dark-mode color functions to calendarViewModel

**Files:**
- Modify: `packages/shared/src/viewmodels/calendarViewModel.ts`

Note: `packages/shared/src/index.ts` uses `export * from './viewmodels'`, so both new functions will be automatically available via `@travyl/shared` barrel imports and deep path imports (`@travyl/shared/viewmodels/calendarViewModel`) — no `index.ts` change needed.

- [ ] **Step 1a: Replace the existing `ACTIVITY_COLORS` map and `DEFAULT_ACTIVITY_COLOR` with Travyl-aligned light colors**

  The current map uses arbitrary colors (e.g. `sightseeing: '#4a7dff'`). Replace it in-place with the spec values:

  ```ts
  const ACTIVITY_COLORS: Record<string, string> = {
    sightseeing: '#003594',
    dining:      '#D97706',
    tour:        '#0d9488',
    cultural:    '#7C3AED',
    shopping:    '#dc2626',
    nightlife:   '#9333ea',
    outdoor:     '#059669',
    museum:      '#d97706',
    transport:   '#2563eb',
    hotel:       '#6b7280',
  }

  const DEFAULT_ACTIVITY_COLOR = '#6b7280'
  ```

  Note: this changes the default from `'#6b7b9e'` to `'#6b7280'` (Tailwind gray-500) — intentional per spec.

- [ ] **Step 1b: Add the dark-mode color maps and two new exported functions immediately after `DEFAULT_ACTIVITY_COLOR`**

  ```ts
  const ACTIVITY_COLORS_DARK_BG: Record<string, string> = {
    sightseeing: '#1e3a5f',
    dining:      '#78350f',
    tour:        '#134e4a',
    cultural:    '#4c1d95',
    shopping:    '#7f1d1d',
    nightlife:   '#581c87',
    outdoor:     '#064e3b',
    museum:      '#78350f',
    transport:   '#1e3a5f',
    hotel:       '#374151',
  }

  const ACTIVITY_COLORS_DARK_BORDER: Record<string, string> = {
    sightseeing: '#4a7ab5',
    dining:      '#F59E0B',
    tour:        '#14b8a6',
    cultural:    '#8b5cf6',
    shopping:    '#f87171',
    nightlife:   '#a78bfa',
    outdoor:     '#10b981',
    museum:      '#fbbf24',
    transport:   '#60a5fa',
    hotel:       '#9ca3af',
  }

  const DEFAULT_ACTIVITY_COLOR_DARK_BG = '#374151'
  const DEFAULT_ACTIVITY_COLOR_DARK_BORDER = '#9ca3af'

  export function getActivityColorDark(type: string): string {
    return ACTIVITY_COLORS_DARK_BG[type] ?? DEFAULT_ACTIVITY_COLOR_DARK_BG
  }

  export function getActivityColorDarkBorder(type: string): string {
    return ACTIVITY_COLORS_DARK_BORDER[type] ?? DEFAULT_ACTIVITY_COLOR_DARK_BORDER
  }
  ```

- [ ] **Step 2: Verify TypeScript in packages/shared**

  ```bash
  cd packages/shared && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: No errors.

- [ ] **Step 3: Commit**

  ```bash
  git add packages/shared/src/viewmodels/calendarViewModel.ts
  git commit -m "feat: add dark-mode activity color functions and align light colors to Travyl tokens"
  ```

---

## Chunk 2: Theme Infrastructure — hook, context, toggle button

### Task 3: Create useCalendarTheme hook

**Files:**
- Create: `apps/web/components/calendar/hooks/useCalendarTheme.ts`

- [ ] **Step 1: Create the file**

  ```ts
  import { useState, useCallback, useEffect } from 'react'

  export type CalendarTheme = 'light' | 'dark'

  const STORAGE_KEY = 'travyl-calendar-theme'

  export function useCalendarTheme() {
    // Default to 'light' on server; client corrects on mount via useEffect
    const [theme, setTheme] = useState<CalendarTheme>('light')

    useEffect(() => {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'dark') setTheme('dark')
    }, [])

    const toggleTheme = useCallback(() => {
      setTheme((prev) => {
        const next: CalendarTheme = prev === 'light' ? 'dark' : 'light'
        localStorage.setItem(STORAGE_KEY, next)
        return next
      })
    }, [])

    return { theme, toggleTheme }
  }
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: No errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/components/calendar/hooks/useCalendarTheme.ts
  git commit -m "feat: add useCalendarTheme hook with localStorage persistence"
  ```

---

### Task 4: Create CalendarThemeContext

**Files:**
- Create: `apps/web/components/calendar/CalendarThemeContext.tsx`

- [ ] **Step 1: Create the file**

  ```tsx
  import { createContext, useContext } from 'react'

  interface CalendarThemeContextValue {
    isDark: boolean
  }

  export const CalendarThemeContext = createContext<CalendarThemeContextValue>({
    isDark: false,
  })

  export function useCalendarThemeContext(): CalendarThemeContextValue {
    return useContext(CalendarThemeContext)
  }
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: No errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/components/calendar/CalendarThemeContext.tsx
  git commit -m "feat: add CalendarThemeContext for isDark access in deep descendants"
  ```

---

### Task 5: Create ThemeToggle button component

**Files:**
- Create: `apps/web/components/calendar/ThemeToggle.tsx`

- [ ] **Step 1: Verify iconoir-react exports SunLight and HalfMoon**

  ```bash
  node -e "const i = require('iconoir-react'); console.log('SunLight:', !!i.SunLight, 'HalfMoon:', !!i.HalfMoon)"
  ```

  If either is `false`, find the correct names:
  ```bash
  node -e "const i = require('iconoir-react'); console.log(Object.keys(i).filter(k => /sun|moon/i.test(k)))"
  ```

  Use the correct icon names in Step 2.

- [ ] **Step 2: Create the file**

  ```tsx
  'use client'
  import { SunLight, HalfMoon } from 'iconoir-react'
  import type { CalendarTheme } from './hooks/useCalendarTheme'

  interface ThemeToggleProps {
    theme: CalendarTheme
    onToggle: () => void
  }

  export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
    const isDark = theme === 'dark'
    return (
      <button
        onClick={onToggle}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Light mode' : 'Dark mode'}
        className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-[#4a7ab5] dark:hover:bg-[#1e3a5f]/25 dark:hover:text-white transition-colors shrink-0"
      >
        {isDark ? (
          <SunLight width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <HalfMoon width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
        )}
      </button>
    )
  }
  ```

- [ ] **Step 3: Verify TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: No errors.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/web/components/calendar/ThemeToggle.tsx
  git commit -m "feat: add ThemeToggle sun/moon button for calendar header"
  ```

---

## Chunk 3: Dashboard wiring + CalendarHeader

### Task 6: Wire theme into CalendarDashboard

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Add imports**

  Add after the existing import block:

  ```tsx
  import { useCalendarTheme } from './hooks/useCalendarTheme'
  import { CalendarThemeContext } from './CalendarThemeContext'
  ```

- [ ] **Step 2: Call the hook inside the component**

  After the `useCalendarDnd` hook call, add:

  ```tsx
  const { theme, toggleTheme } = useCalendarTheme()
  ```

- [ ] **Step 3: Wrap return with context provider and apply dark class**

  Change the root `<div>` from:

  ```tsx
  return (
    <div className="flex h-screen overflow-hidden bg-[#0f1117] text-white">
  ```

  To (note: the `dark` class is placed at the end of the static class list via concatenation, with a leading space inside the conditional to avoid a double-space):

  ```tsx
  return (
    <CalendarThemeContext.Provider value={{ isDark: theme === 'dark' }}>
    <div className={'flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0a1520] text-gray-900 dark:text-[#f5efe8]' + (theme === 'dark' ? ' dark' : '')}>
  ```

  And close the provider after the closing `</div>` at the bottom of the return:

  ```tsx
    </div>
    </CalendarThemeContext.Provider>
  )
  ```

- [ ] **Step 4: Pass theme props to CalendarHeader**

  Find `<CalendarHeader` and add the two new props:

  ```tsx
  <CalendarHeader
    tripName={MOCK_TRIP.title}
    dateRange={viewMode === 'day' ? currentDayLabel : dateRange}
    viewMode={viewMode}
    onViewModeChange={handleViewModeChange}
    onBack={handleBack}
    onAddEvent={handleAddEvent}
    connectionStatus={connectionStatus}
    collaborators={collaborators}
    onShare={() => {}}
    theme={theme}
    onToggleTheme={toggleTheme}
  />
  ```

- [ ] **Step 5: Verify TypeScript — CalendarHeader will have a type error until Task 7**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | grep -v "CalendarHeader" | head -20
  ```

  Expected: Only errors mentioning `CalendarHeader` missing props. No other errors.

- [ ] **Step 6: Commit**

  ```bash
  git add apps/web/components/calendar/CalendarDashboard.tsx
  git commit -m "feat: wire useCalendarTheme and CalendarThemeContext into CalendarDashboard"
  ```

---

### Task 7: Retheme CalendarHeader + add ThemeToggle

**Files:**
- Modify: `apps/web/components/calendar/CalendarHeader.tsx`

- [ ] **Step 1: Update imports**

  Add:

  ```tsx
  import { ThemeToggle } from './ThemeToggle'
  import type { CalendarTheme } from './hooks/useCalendarTheme'
  ```

- [ ] **Step 2: Update the prop interface and destructuring**

  Replace `CalendarHeaderProps` with:

  ```ts
  interface CalendarHeaderProps {
    tripName: string
    dateRange: string
    viewMode: ViewMode
    onViewModeChange: (mode: ViewMode) => void
    onBack: () => void
    onAddEvent: () => void
    connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
    collaborators: UserAwareness[]
    onShare: () => void
    theme: CalendarTheme
    onToggleTheme: () => void
  }
  ```

  Add `theme` and `onToggleTheme` to the destructured function parameters.

- [ ] **Step 3: Replace the header row div classes**

  Replace:
  ```tsx
  <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 px-4 py-3">
  ```
  With:
  ```tsx
  <div className="flex items-center gap-3 border-b border-gray-200 dark:border-[#1e3a5f]/30 bg-white dark:bg-[#0f1a28] px-4 py-3">
  ```

- [ ] **Step 4: Update the trip name and date range**

  Replace:
  ```tsx
  <span className="truncate text-[14px] font-semibold text-white leading-tight">
    {tripName}
  </span>
  <span className="text-[10px] text-gray-400 leading-tight">{dateRange}</span>
  ```
  With:
  ```tsx
  <span className="truncate text-[15px] font-serif font-normal text-[#1e3a5f] dark:text-[#f5efe8] leading-tight">
    {tripName}
  </span>
  <span className="text-[10px] text-gray-400 dark:text-[#4a7ab5] leading-tight">{dateRange}</span>
  ```

- [ ] **Step 5: Update the divider**

  Replace:
  ```tsx
  <div className="w-px h-6 bg-white/10 shrink-0" />
  ```
  With:
  ```tsx
  <div className="w-px h-6 bg-gray-200 dark:bg-[#1e3a5f]/30 shrink-0" />
  ```
  (There are two dividers — update both.)

- [ ] **Step 6: Update the view toggle border and button classes**

  Replace the group border:
  ```tsx
  className="flex rounded-lg overflow-hidden border border-white/10 text-sm shrink-0"
  ```
  With:
  ```tsx
  className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-[#1e3a5f]/30 text-sm shrink-0"
  ```

  Replace the button class logic:
  ```tsx
  viewMode === mode
    ? 'bg-blue-600 text-white'
    : 'text-gray-400 hover:bg-white/10 hover:text-white',
  ```
  With:
  ```tsx
  viewMode === mode
    ? 'bg-[#003594] text-white'
    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-[#4a7ab5] dark:hover:bg-[#1e3a5f]/25 dark:hover:text-white',
  ```

- [ ] **Step 7: Update the New Activity button**

  Replace:
  ```tsx
  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-gray-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
  ```
  With:
  ```tsx
  className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-[#1e3a5f]/30 px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-[#4a7ab5] hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-[#1e3a5f]/25 dark:hover:text-white transition-colors shrink-0"
  ```

- [ ] **Step 8: Add ThemeToggle after the spacer (right side of header, between collaborators and share)**

  Find the spacer div and the collaborator block. Place `<ThemeToggle>` after the spacer and before the collaborators block:

  ```tsx
  {/* Spacer */}
  <div className="flex-1" />

  {/* Theme toggle */}
  <ThemeToggle theme={theme} onToggle={onToggleTheme} />

  {/* Collaborator avatars — inline, overlapping */}
  {collaborators.length > 0 && (
  ```

- [ ] **Step 9: Update the collaborator avatar ring color**

  Replace all instances of `ring-[#1a1a2e]` with `ring-white dark:ring-[#0a1520]`.
  (Appears twice per avatar — once on the avatar div, once on the online/offline dot span.)

- [ ] **Step 10: Update the Share button**

  Replace:
  ```tsx
  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors shrink-0"
  ```
  With:
  ```tsx
  className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#D97706] transition-colors shrink-0"
  ```

- [ ] **Step 11: Update the back button and more-options button hover states**

  Both currently have `text-gray-400 hover:bg-white/10 hover:text-white`. Replace with:
  ```tsx
  text-gray-400 dark:text-[#4a7ab5] hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-[#1e3a5f]/25 dark:hover:text-white
  ```

- [ ] **Step 12: Update the connection status banner**

  Replace `dark:text-yellow-400` — the banner already has good light/dark handling; just confirm the border `border-yellow-500/20` and bg `bg-yellow-500/10` work in light mode (they do — they're already light-mode-safe). No change needed here.

- [ ] **Step 13: Verify TypeScript — should compile cleanly now**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: No errors.

- [ ] **Step 14: Commit**

  ```bash
  git add apps/web/components/calendar/CalendarHeader.tsx
  git commit -m "feat: retheme CalendarHeader with Travyl tokens and add ThemeToggle"
  ```

---

## Chunk 4: EventBlock + Grid Components

### Task 8: Retheme EventBlock with dark-mode color context

**Files:**
- Modify: `apps/web/components/calendar/EventBlock.tsx`

- [ ] **Step 1: Add imports**

  The file already imports `getActivityColor` from `'@travyl/shared/viewmodels/calendarViewModel'`. Add the two new functions to that same import:

  ```tsx
  import {
    getActivityColor,
    getActivityColorDark,
    getActivityColorDarkBorder,
  } from '@travyl/shared/viewmodels/calendarViewModel'
  ```

  Also add:
  ```tsx
  import { useCalendarThemeContext } from './CalendarThemeContext'
  ```

- [ ] **Step 2: Call the context hook inside the component**

  After the `useDraggable` call, add:

  ```tsx
  const { isDark } = useCalendarThemeContext()
  ```

- [ ] **Step 3: Update the style object to use mode-aware colors**

  The `color` variable (from `getActivityColor`) is still used for image overlay gradients — keep it. Add two new variables for bg and border:

  Replace the style object:

  ```tsx
  const style: React.CSSProperties = {
    position: 'absolute',
    top: (activity.startHour - timeRangeStartHour) * HOUR_HEIGHT,
    height: Math.max(activity.duration * HOUR_HEIGHT - 2, 20),
    left: 4,
    right: 4,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : isSelected ? 10 : 1,
    borderLeft: `3px solid ${color}88`,
    ...(hasImage ? {} : { backgroundColor: color }),
  }
  ```

  With:

  ```tsx
  const bgColor = isDark ? getActivityColorDark(activity.type) : color
  const borderColor = isDark ? getActivityColorDarkBorder(activity.type) : `${color}88`

  const style: React.CSSProperties = {
    position: 'absolute',
    top: (activity.startHour - timeRangeStartHour) * HOUR_HEIGHT,
    height: Math.max(activity.duration * HOUR_HEIGHT - 2, 20),
    left: 4,
    right: 4,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : isSelected ? 10 : 1,
    borderLeft: `3px solid ${borderColor}`,
    ...(hasImage ? {} : { backgroundColor: bgColor }),
  }
  ```

- [ ] **Step 4: Verify TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: No errors.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/components/calendar/EventBlock.tsx
  git commit -m "feat: add dark-mode activity colors to EventBlock via CalendarThemeContext"
  ```

---

### Task 9: Retheme DayColumn

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx`

- [ ] **Step 1: Update the day header div classes**

  Find:
  ```tsx
  className={[
    'text-center text-xs font-medium py-1 border-b border-gray-200 dark:border-gray-700 select-none',
    onClickDayHeader
      ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
      : '',
  ].join(' ')}
  ```

  Replace with:
  ```tsx
  className={[
    'text-center text-xs font-medium py-1 border-b border-gray-200 dark:border-[#1e3a5f]/30 text-gray-500 dark:text-[#4a7ab5] select-none',
    onClickDayHeader
      ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1e3a5f]/25 transition-colors'
      : '',
  ].join(' ')}
  ```

- [ ] **Step 2: Update the droppable grid div classes**

  Find:
  ```tsx
  className={[
    'relative flex-1 border-l border-gray-200 dark:border-gray-700',
    isOver ? 'bg-blue-50 dark:bg-blue-900/20' : '',
  ].join(' ')}
  ```

  Replace with:
  ```tsx
  className={[
    'relative flex-1 border-l border-gray-200 dark:border-[#1e3a5f]/20',
    isOver ? 'bg-[#EFF4FF] dark:bg-[#003594]/15' : '',
  ].join(' ')}
  ```

- [ ] **Step 3: Update the solid hour grid lines**

  Find:
  ```tsx
  className="absolute w-full border-t border-gray-100 dark:border-gray-800 pointer-events-none"
  ```
  Replace with:
  ```tsx
  className="absolute w-full border-t border-gray-100 dark:border-[#1e3a5f]/15 pointer-events-none"
  ```

- [ ] **Step 4: Update the dashed half-hour lines**

  Find:
  ```tsx
  className="absolute w-full border-t border-dashed border-gray-100 dark:border-gray-800 pointer-events-none opacity-60"
  ```
  Replace with (note: light-mode uses `border-gray-100/60` for reduced opacity instead of `opacity-60` class, per spec):
  ```tsx
  className="absolute w-full border-t border-dashed border-gray-100/60 dark:border-[#1e3a5f]/10 pointer-events-none"
  ```

- [ ] **Step 5: Verify TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: No errors.

- [ ] **Step 6: Commit**

  ```bash
  git add apps/web/components/calendar/DayColumn.tsx
  git commit -m "feat: retheme DayColumn grid lines and headers with Travyl tokens"
  ```

---

### Task 10: Retheme AllDayRow

**Files:**
- Modify: `apps/web/components/calendar/AllDayRow.tsx`

- [ ] **Step 1: Update the outer row border**

  Replace:
  ```tsx
  className="flex border-b border-gray-200 dark:border-gray-700 min-h-[2rem]"
  ```
  With:
  ```tsx
  className="flex border-b border-gray-200 dark:border-[#1e3a5f]/30 min-h-[2rem]"
  ```

- [ ] **Step 2: Update the per-day cell border**

  Replace:
  ```tsx
  className="flex-1 min-w-0 border-l border-gray-200 dark:border-gray-700 px-1 py-0.5 flex flex-col gap-0.5"
  ```
  With:
  ```tsx
  className="flex-1 min-w-0 border-l border-gray-200 dark:border-[#1e3a5f]/20 px-1 py-0.5 flex flex-col gap-0.5"
  ```

- [ ] **Step 3: Update the hotel banner classes**

  Replace:
  ```tsx
  'text-[10px] font-medium px-1 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 overflow-hidden',
  ```
  With:
  ```tsx
  'text-[10px] font-medium px-1 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 overflow-hidden',
  ```

  Also update the mid-hotel continuation span:
  ```tsx
  <span className="text-amber-400 dark:text-amber-600">— — —</span>
  ```
  Replace with:
  ```tsx
  <span className="text-amber-400 dark:text-amber-700">— — —</span>
  ```

- [ ] **Step 4: Update the flight banner classes**

  Replace:
  ```tsx
  flight.direction === 'arrival'
    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  ```
  With:
  ```tsx
  flight.direction === 'arrival'
    ? 'bg-[#EFF4FF] text-[#003594] dark:bg-[#003594]/35 dark:text-[#a0c4ff]'
    : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  ```

- [ ] **Step 5: Verify TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: No errors.

- [ ] **Step 6: Commit**

  ```bash
  git add apps/web/components/calendar/AllDayRow.tsx
  git commit -m "feat: retheme AllDayRow banners and borders with Travyl tokens"
  ```

---

### Task 11: Retheme TimeGutter

**Files:**
- Modify: `apps/web/components/calendar/TimeGutter.tsx`

- [ ] **Step 1: Update the hour text class**

  Replace:
  ```tsx
  className="relative text-xs text-gray-400 select-none"
  ```
  With:
  ```tsx
  className="relative text-xs text-gray-400 dark:text-[#4a7ab5]/70 select-none"
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: No errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/components/calendar/TimeGutter.tsx
  git commit -m "feat: retheme TimeGutter hour labels for dark mode"
  ```

---

## Chunk 5: Panels + Peripherals

### Task 12: Retheme TripSidebar

**Files:**
- Modify: `apps/web/components/calendar/TripSidebar.tsx`

- [ ] **Step 1: Update the `<motion.nav>` root className**

  Replace:
  ```tsx
  className="relative flex flex-col shrink-0 overflow-hidden border-r border-white/10 bg-[#141824]"
  ```
  With:
  ```tsx
  className="relative flex flex-col shrink-0 overflow-hidden border-r border-gray-200 dark:border-[#1e3a5f]/30 bg-white dark:bg-[#0a1520]"
  ```

- [ ] **Step 2: Update the nav item active/inactive classes**

  Replace:
  ```tsx
  isActive
    ? 'bg-blue-600/20 text-blue-400'
    : 'text-gray-400 hover:bg-white/10 hover:text-white',
  ```
  With:
  ```tsx
  isActive
    ? 'bg-[#EFF4FF] text-[#003594] dark:bg-[#003594]/35 dark:text-white'
    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-[#4a7ab5] dark:hover:bg-[#1e3a5f]/25 dark:hover:text-white',
  ```

- [ ] **Step 3: Update the mini calendar separator border**

  Replace:
  ```tsx
  <div className="border-t border-white/10">
  ```
  With:
  ```tsx
  <div className="border-t border-gray-200 dark:border-[#1e3a5f]/30">
  ```

- [ ] **Step 4: Verify TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: No errors.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/components/calendar/TripSidebar.tsx
  git commit -m "feat: retheme TripSidebar nav and borders with Travyl tokens"
  ```

---

### Task 13: Retheme DetailPanel

**Files:**
- Modify: `apps/web/components/calendar/DetailPanel.tsx`

- [ ] **Step 1: Update the aside root classes**

  Replace:
  ```tsx
  className="flex flex-col shrink-0 border-l border-white/10 bg-[#1a1f2e] overflow-y-auto"
  ```
  With:
  ```tsx
  className="flex flex-col shrink-0 border-l border-gray-200 dark:border-[#1e3a5f]/30 bg-white dark:bg-[#0f1a28] overflow-y-auto"
  ```

- [ ] **Step 2: Update the activity type label**

  Replace:
  ```tsx
  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
  ```
  With:
  ```tsx
  <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-[#4a7ab5]">
  ```

- [ ] **Step 3: Update the title (static display)**

  Replace:
  ```tsx
  <h2
    className="text-base font-semibold text-white leading-snug cursor-text"
  ```
  With:
  ```tsx
  <h2
    className="text-base font-semibold text-gray-900 dark:text-[#f5efe8] leading-snug cursor-text"
  ```

- [ ] **Step 4: Update the title input (editing state)**

  Replace:
  ```tsx
  className="bg-transparent border-b border-white/30 focus:border-white/60 outline-none text-base font-semibold text-white leading-snug w-full placeholder-gray-500"
  ```
  With:
  ```tsx
  className="bg-transparent border-b border-gray-300 dark:border-white/30 focus:border-gray-500 dark:focus:border-white/60 outline-none text-base font-semibold text-gray-900 dark:text-white leading-snug w-full placeholder-gray-400 dark:placeholder-gray-500"
  ```

- [ ] **Step 5: Update the close button**

  Replace:
  ```tsx
  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
  ```
  With:
  ```tsx
  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 dark:text-[#4a7ab5] hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
  ```

- [ ] **Step 6: Update all four detail row icon classes**

  The icons (`Clock`, `MapPin`, `Wallet`, `Star`) have `className="... text-gray-500"`. Update all four to:
  ```tsx
  className="... text-gray-400 dark:text-[#4a7ab5]"
  ```

- [ ] **Step 7: Update all `<dd>` text elements**

  Replace all instances of `className="text-gray-300"` with:
  ```tsx
  className="text-gray-600 dark:text-gray-300"
  ```
  (4 `<dd>` elements total.)

- [ ] **Step 8: Update the notes div**

  Replace:
  ```tsx
  <div className="mx-4 my-2 rounded-lg bg-white/5 p-3 text-sm text-gray-400 leading-relaxed">
  ```
  With:
  ```tsx
  <div className="mx-4 my-2 rounded-lg bg-gray-50 dark:bg-white/5 p-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
  ```

- [ ] **Step 9: Update the action buttons container border**

  Replace:
  ```tsx
  <div className="flex gap-2 border-t border-white/10 p-4">
  ```
  With:
  ```tsx
  <div className="flex gap-2 border-t border-gray-200 dark:border-[#1e3a5f]/30 p-4">
  ```

- [ ] **Step 10: Update the Edit button**

  Replace:
  ```tsx
  className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
  ```
  With:
  ```tsx
  className="flex-1 rounded-lg border border-gray-200 dark:border-[#1e3a5f]/30 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors"
  ```

- [ ] **Step 11: Update the Remove button**

  Replace:
  ```tsx
  className="flex-1 rounded-lg border border-red-500/30 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
  ```
  With:
  ```tsx
  className="flex-1 rounded-lg border border-red-200 dark:border-red-500/30 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300 transition-colors"
  ```

- [ ] **Step 12: Verify TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: No errors.

- [ ] **Step 13: Commit**

  ```bash
  git add apps/web/components/calendar/DetailPanel.tsx
  git commit -m "feat: retheme DetailPanel with Travyl light/dark tokens"
  ```

---

### Task 14: Retheme MiniCalendar

**Files:**
- Modify: `apps/web/components/calendar/MiniCalendar.tsx`

- [ ] **Step 1: Update the month label**

  Replace:
  ```tsx
  <p className="mb-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">
  ```
  With:
  ```tsx
  <p className="mb-2 text-center text-xs font-medium text-gray-500 dark:text-[#4a7ab5] uppercase tracking-wide">
  ```

- [ ] **Step 2: Update the weekday header spans**

  Replace:
  ```tsx
  <span key={d} className="text-center text-[10px] text-gray-600 font-medium">
  ```
  With:
  ```tsx
  <span key={d} className="text-center text-[10px] text-gray-400 dark:text-[#4a7ab5] font-medium">
  ```

- [ ] **Step 3: Update the day button class logic**

  Replace:
  ```tsx
  isCurrent
    ? 'bg-blue-600 text-white font-semibold'
    : isInTrip
    ? 'text-gray-200 hover:bg-white/10 cursor-pointer'
    : 'text-gray-700 cursor-default',
  ```
  With:
  ```tsx
  isCurrent
    ? 'bg-[#003594] text-white font-semibold'
    : isInTrip
    ? 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#1e3a5f]/25 cursor-pointer'
    : 'text-gray-400 dark:text-[#1e3a5f]/50 cursor-default',
  ```

- [ ] **Step 4: Verify TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: No errors.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/components/calendar/MiniCalendar.tsx
  git commit -m "feat: retheme MiniCalendar with Travyl tokens"
  ```

---

### Task 15: Retheme CalendarSkeleton

**Files:**
- Modify: `apps/web/components/calendar/CalendarSkeleton.tsx`

Note: `CalendarSkeleton` renders before `CalendarDashboard` mounts, so it won't be inside the `.dark` provider. It reads localStorage directly to apply the correct class on render.

- [ ] **Step 1: Replace the entire file with the rewritten component**

  ```tsx
  'use client'

  export function CalendarSkeleton() {
    // Rendered outside CalendarDashboard — read localStorage directly for initial theme
    const isDark =
      typeof window !== 'undefined' &&
      localStorage.getItem('travyl-calendar-theme') === 'dark'

    return (
      <div
        className={
          'flex h-screen overflow-hidden animate-pulse bg-gray-50 dark:bg-[#0a1520]' +
          (isDark ? ' dark' : '')
        }
      >
        {/* Sidebar placeholder */}
        <div className="w-60 flex-shrink-0 bg-white dark:bg-[#0f1a28] border-r border-gray-200 dark:border-[#1e3a5f]/30" />

        {/* Main column */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Header placeholder */}
          <div className="h-14 bg-white dark:bg-[#0f1a28] border-b border-gray-200 dark:border-[#1e3a5f]/30 flex items-center px-4 gap-4">
            <div className="h-5 w-40 rounded bg-gray-200 dark:bg-[#1e3a5f]/40" />
            <div className="ml-auto h-5 w-24 rounded bg-gray-200 dark:bg-[#1e3a5f]/40" />
          </div>

          {/* All-day row placeholder */}
          <div className="h-10 bg-gray-50 dark:bg-[#0a1520] border-b border-gray-200 dark:border-[#1e3a5f]/30" />

          {/* Grid placeholder — 5 columns */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Time gutter placeholder */}
            <div className="w-16 flex-shrink-0 bg-gray-50 dark:bg-[#0a1520] border-r border-gray-200 dark:border-[#1e3a5f]/30" />

            {/* Day columns */}
            <div className="flex flex-1 min-w-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col flex-1 min-w-0 border-l border-gray-200 dark:border-[#1e3a5f]/30"
                >
                  {/* Column header */}
                  <div className="h-7 border-b border-gray-200 dark:border-[#1e3a5f]/30 flex items-center justify-center">
                    <div className="h-3 w-16 rounded bg-gray-200 dark:bg-[#1e3a5f]/40" />
                  </div>

                  {/* Event placeholders */}
                  <div className="relative flex-1 p-1 space-y-2">
                    <div
                      className="rounded bg-gray-200 dark:bg-[#1e3a5f]/40 mx-1"
                      style={{ height: 48, marginTop: 60 }}
                    />
                    <div
                      className="rounded bg-gray-200 dark:bg-[#1e3a5f]/40 mx-1"
                      style={{ height: 36, marginTop: 20 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: No errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/components/calendar/CalendarSkeleton.tsx
  git commit -m "feat: retheme CalendarSkeleton with Travyl tokens"
  ```

---

### Task 16: Retheme CalendarError

**Files:**
- Modify: `apps/web/components/calendar/CalendarError.tsx`

Note: Same as CalendarSkeleton — rendered outside the `.dark` provider, so reads localStorage directly.

- [ ] **Step 1: Replace the entire file with the rewritten component**

  ```tsx
  'use client'

  interface CalendarErrorProps {
    message: string
    onBack?: () => void
  }

  export function CalendarError({ message, onBack }: CalendarErrorProps) {
    const isDark =
      typeof window !== 'undefined' &&
      localStorage.getItem('travyl-calendar-theme') === 'dark'

    return (
      <div
        className={
          'flex h-screen items-center justify-center bg-gray-50 dark:bg-[#0a1520] text-gray-900 dark:text-[#f5efe8]' +
          (isDark ? ' dark' : '')
        }
      >
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-4">
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            className="text-red-400"
            aria-hidden="true"
          >
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" />
            <path
              d="M24 14V26M24 32V34"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-white"
            >
              Go back
            </button>
          )}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: No errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/components/calendar/CalendarError.tsx
  git commit -m "feat: retheme CalendarError with Travyl tokens"
  ```

---

### Task 17: Final verification

- [ ] **Step 1: Full TypeScript check across the monorepo**

  ```bash
  cd /c/Users/justi/dev/travyl2/travyl-frontend && npx tsc --noEmit -p apps/web/tsconfig.json 2>&1 | head -40
  ```

  Expected: No errors.

- [ ] **Step 2: Start the dev server**

  ```bash
  npm run web --workspace=apps/web
  ```

- [ ] **Step 3: Manual verification checklist**

  Navigate to the calendar dashboard and verify:
  - [ ] Light mode on first load: white backgrounds, Lustria trip name in navy `#1e3a5f`, `#003594` active states, amber Share button
  - [ ] Moon icon visible in header right side
  - [ ] Click moon icon → dark mode activates: navy-black `#0a1520` bg, `#0f1a28` header, warm white text
  - [ ] Sun icon replaces moon icon in dark mode
  - [ ] Click sun icon → returns to light mode
  - [ ] Refresh page in dark mode → preference is remembered (theme persists)
  - [ ] Event blocks: brighter solid colors in light mode; deep-tinted bg + bright left border in dark mode
  - [ ] Drag and drop still works in both modes
  - [ ] Detail panel slides in/out correctly in both modes
  - [ ] Sidebar hover states work in both modes
  - [ ] Expand sidebar → MiniCalendar shows correct colors in both modes
  - [ ] AllDayRow flight/hotel banners use correct colors in both modes
  - [ ] Hour grid lines visible but subtle in both modes

- [ ] **Step 4: Final commit**

  ```bash
  git add -A
  git commit -m "feat: complete Travyl theme implementation for calendar dashboard (light + dark)"
  ```
