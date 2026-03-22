# Calendar UX Cleanup — Design Spec

**Date:** 2026-03-19
**Branch:** feature/tra-204
**Scope:** Two targeted fixes to the calendar view — remove the redundant Insert menu tab and make Week view show a proper 7-day windowed view.

---

## Problem

1. **Insert tab is redundant.** The menu bar has an "Insert" tab whose only command is "New Activity." A dedicated "New Activity" button already exists in the navbar, making the tab noise.

2. **Week view is not windowed.** The Week/Day toggle exists in the navbar, but clicking "Week" shows all trip days as columns with no restriction. For a 30-day trip this renders 30 columns — the toggle is meaningless.

---

## Change 1: Remove Insert Tab

### What changes

- Remove `'insert'` from `MENU_GROUPS` in `TripNavbar.tsx`
- Remove the `MenuGroup` type literal `'insert'` and its label entry
- Move the `new-activity` command from group `'insert'` to group `'activity'` in `useCalendarCommands.ts`

### Why

The "New Activity" button in the navbar already handles this action. The Insert tab adds no unique functionality and clutters the menu bar.

### What stays the same

- The keyboard shortcut `N` for New Activity remains (via Command Palette and keyboard shortcuts)
- The command still appears in the Command Palette under the Activity group

---

## Change 2: Windowed Week View

### Behavior

- Week view shows a 7-day window into the trip, not all days at once
- For trips shorter than 7 days, the window shows all available days (no artificial padding)
- Default window: days 0–6 (first week of trip)
- Prev/Next arrows navigate between 7-day windows
- When switching from Day → Week view, `weekOffset` is set so the currently selected day falls within the visible window
- When the sidebar mini-calendar selects a day outside the current window, `weekOffset` jumps to include that day

### Navigation arrows

- Rendered in `TripNavbar`, immediately adjacent to the Week/Day toggle (left arrow to the left, right arrow to the right)
- Only visible when `viewMode === 'week'`
- Left arrow disabled when `weekOffset === 0`
- Right arrow disabled when the next window would exceed trip length

### State changes

`useCalendarNavigation` gains:

| Addition | Type | Purpose |
|---|---|---|
| `weekOffset` | `number` | Which 7-day block is visible (0 = days 0–6) |
| `setWeekOffset` | `(n: number) => void` | Direct setter |
| `prevWeek()` | `() => void` | Decrement weekOffset (clamped to 0) |
| `nextWeek()` | `() => void` | Increment weekOffset (clamped to last window) |
| `canGoPrev` | `boolean` | `weekOffset > 0` |
| `canGoNext` | `boolean` | Next window start < total trip days |

`CalendarDashboard` computes the visible days slice:

```ts
const weekStart = weekOffset * 7
const visibleDays = viewMode === 'week'
  ? TRIP_DAYS.slice(weekStart, weekStart + 7)
  : [TRIP_DAYS[selectedDayIndex]]
```

When `setViewMode('week')` is called, `weekOffset` is set to `Math.floor(selectedDayIndex / 7)` so the current day is in view.

When `selectDay` is called (from sidebar), if `viewMode === 'week'` and the new day is outside the current window, update `weekOffset` to `Math.floor(dayIndex / 7)`.

### Files changed

| File | Change |
|---|---|
| `apps/web/components/calendar/hooks/useCalendarNavigation.ts` | Add `weekOffset`, `prevWeek`, `nextWeek`, `canGoPrev`, `canGoNext` |
| `apps/web/components/calendar/CalendarDashboard.tsx` | Pass new nav values to `TripNavbar`; compute windowed `visibleDays` for WeekView; set `weekOffset` on view mode change and day selection |
| `apps/web/components/calendar/TripNavbar.tsx` | Remove `'insert'` from `MENU_GROUPS`; add prev/next arrows adjacent to Week/Day toggle |
| `apps/web/components/calendar/hooks/useCalendarCommands.ts` | Move `new-activity` command from `'insert'` group to `'activity'` group |

### No changes needed

- `WeekView.tsx` — already accepts a `days` prop; windowing is handled upstream
- `DayView.tsx` — unaffected
- Supabase schema, Yjs, React Query — no data layer changes

---

## Success criteria

- Insert tab no longer appears in the menu bar
- New Activity shortcut (`N`) and Command Palette entry still work
- Week view shows at most 7 columns
- Prev/Next arrows navigate between 7-day windows
- Arrows are hidden in Day view
- Switching Day → Week lands on the week containing the selected day
- Selecting a day in the sidebar while in Week view jumps the window if needed
- Trips shorter than 7 days show all days with no extra empty columns
