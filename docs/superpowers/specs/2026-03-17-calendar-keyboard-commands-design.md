# Calendar Keyboard Commands + Trip Navbar

**Date:** 2026-03-17
**Branch:** feature/tra-204 (or new issue)
**Status:** Approved for implementation

---

## Overview

Add keyboard command support to the trip calendar, surfaced through three complementary layers:

1. **TripNavbar** — a custom app-style navbar replacing the global pill navbar and CalendarHeader on trip pages. Contains a native-style menu bar (Edit | Activity | View | Insert) with shortcut hints.
2. **Keyboard shortcuts** — a global keydown listener that executes commands when an activity is selected.
3. **Command palette** — a searchable `Ctrl+K` / `Cmd+K` modal giving quick access to all commands by name.

All three layers are driven by a single **command registry** — commands are defined once and consumed by all surfaces.

---

## Architecture

```
useCalendarCommands(deps)
  → Command[]  { id, label, shortcut, group, isEnabled, execute }
       │
       ├── TripMenuBar          — Edit/Activity/View/Insert dropdowns
       ├── CommandPalette       — Ctrl+K searchable modal
       └── useKeyboardShortcuts — document keydown listener
```

### Command type

```ts
interface Command {
  id: string
  label: string
  group: 'edit' | 'activity' | 'view' | 'insert'
  shortcut?: {
    key: string
    meta?: boolean   // Ctrl/Cmd
    shift?: boolean
    display: string  // e.g. "Ctrl D", "↑", "Del"
  }
  isEnabled: boolean  // false → shown grayed out, not executable
  execute: () => void
}
```

---

## Command Registry

`useCalendarCommands` lives at `apps/web/components/calendar/hooks/useCalendarCommands.ts`.

**Inputs:** `{ selectedActivity, isPaletteOpen, moveActivity, removeActivity, updateActivity, duplicateActivity, onViewModeChange, viewMode, tripDays }`

- `moveActivity` signature (from `useActivityMutations`): `moveActivity(id: string, newDay: number, newStartHour: number): void` — `newDay` is a 0-based day index matching `activity.day` and the `tripDays` array.
- `duplicateActivity` is a new helper added to `useActivityMutations` (see Modified Files). The command registry calls `duplicateActivity`, not `addActivity` directly.

**Full command set:**

| Group | ID | Label | Shortcut | Enabled when |
|---|---|---|---|---|
| edit | `undo` | Undo | Ctrl+Z | Never (TODO) |
| edit | `redo` | Redo | Ctrl+Y | Never (TODO) |
| edit | `delete` | Delete Activity | Del / Backspace | Activity selected |
| edit | `duplicate` | Duplicate Activity | Ctrl+D | Activity selected |
| activity | `move-up` | Move Up 30 min | ↑ | Activity selected AND palette closed |
| activity | `move-down` | Move Down 30 min | ↓ | Activity selected AND palette closed |
| activity | `move-prev-day` | Move to Prev Day | ← | Activity selected AND palette closed |
| activity | `move-next-day` | Move to Next Day | → | Activity selected AND palette closed |
| activity | `extend` | Extend Duration | + | Activity selected AND startHour + duration + 0.5 ≤ 24 |
| activity | `shorten` | Shorten Duration | - | Activity selected, duration > 0.5h |
| view | `week-view` | Week View | W | Always |
| view | `day-view` | Day View | D | Always |
| view | `jump-today` | Jump to Today | T | Always (no-op if today is outside trip date range) |
| view | `open-palette` | Open Command Palette | Ctrl+K | Always |
| insert | `new-activity` | New Activity | N | Always |

**Undo/Redo note:** Handlers are stubs with a `// TODO: implement undo stack` comment. Commands are always `isEnabled: false`. Shown grayed out in menus — no shortcut is intercepted.

**Arrow key / palette conflict note:** The four arrow move commands have `isEnabled: false` when `isPaletteOpen === true`. This prevents move shortcuts from firing while the user navigates palette results with ↑/↓. When palette is closed and nothing is selected, arrow keys are also not captured so browser scroll works normally.

**Clamp behavior for time and day boundaries:** Both are silently clamped with no error or visual feedback. `selectedActivity` in the registry is derived as `activities.find(a => a.id === selectedEventId)` — the id is stable across Yjs updates, so `selectedActivity` continues to resolve to the moved activity after `moveActivity` updates the doc.

**`new-activity` command / `onAddEvent`:** The `N` shortcut and the `+ New Activity` button both call the same `onAddEvent` handler already wired in `CalendarDashboard`. The handler uses `selectedDayIndex` from `useCalendarNavigation` (falling back to `0`) and `startHour = 12` as defaults. No change to the existing `onAddEvent` behavior is required.

**Theme toggle note:** Theme toggling is navbar-only (the `ThemeToggle` button in `TripNavbar`). It is not a keyboard command or palette entry.

**`jump-today` behavior:** Compute `todayDayIndex = differenceInDays(today, tripStartDate)`. If `0 ≤ todayDayIndex < tripDays.length`, call `selectDay(todayDayIndex)`. Otherwise no-op. Does not switch view mode.

**Movement logic:**
- Move up/down: `moveActivity(id, day, clamp(startHour ± 0.5, 0, 24 - duration))` — upper bound is `24 - duration` so the activity never extends past hour 24. Silently clamped.
- Move prev/next day: `moveActivity(id, clamp(day ± 1, 0, tripDays.length - 1), startHour)` — `day` and `tripDays` share the same 0-based index; silently clamped.
- Extend: `updateActivity(id, { duration: duration + 0.5 })` — `extend` command `isEnabled` condition includes `startHour + duration + 0.5 <= 24`.
- Shorten: `updateActivity(id, { duration: Math.max(0.5, duration - 0.5) })`
- Duplicate: calls `duplicateActivity(selectedActivity)` — clone copies all fields verbatim (same `day`, `startHour`, `duration`, `title`, etc.) with a new `id` (uuid) and `sortOrder = Math.max(...activities.map(a => a.sortOrder ?? 0)) + 1`. `sortOrder` max is computed from the React `activities` array (the Yjs-derived state already in scope in `useActivityMutations`). `duplicateActivity` internally calls `addActivity` (immediate Supabase insert + Yjs write), so its return type is `Promise<void>`. Clone lands in same slot as source; `computeOverlapLayout` handles visual overlap automatically.

---

## TripNavbar

**File:** `apps/web/components/calendar/TripNavbar.tsx`

Replaces both `Navbar` (global pill) and `CalendarHeader` on trip pages.

### Layout

```
[TRAVYL ✈] [←] │ [Edit] [Activity] [View] [Insert] │ [Trip Name / Dates] ──── [? Selection indicator] [Week|Day] [+ New  N] [collabs] [Share] [avatar ▾]
```

- Height: `44px`, `sticky top-0 z-50`. `CalendarDashboard` must be the scroll root (`h-screen overflow-hidden` with the calendar grid as the inner scroll area) for sticky to function correctly — confirm this matches the existing layout before implementing.
- Background: `bg-white dark:bg-[#0f1a28]`, `border-b border-gray-200 dark:border-[#1e3a5f]/30`
- Typography: trip name in Lustria serif `text-[#1e3a5f] dark:text-[#f5efe8]`; date range in `text-[#4a7ab5]`

### Zones (left → right)

**Logo** — `TRAVYL ✈` wordmark, links to `/trips`, right-bordered divider. Same font and color as existing navbar.

**Back button** — `←` icon (`NavArrowLeft` from iconoir), navigates back to `/trips`. Right-bordered.

**Menu bar** — `Edit | Activity | View | Insert` text items rendered inline in the bar. Implemented as a single `TripMenuBar` sub-component inside `TripNavbar.tsx` (not a separate file). Each item is a button; clicking toggles a dropdown positioned below it. Only one dropdown is open at a time (clicking another item closes the current one; clicking outside closes all). Each dropdown lists the commands for that group, one per row:
- Left: command label
- Right: shortcut hint (e.g. `Del`, `Ctrl D`, `↑`) in a `<kbd>` element
- Disabled commands: `text-gray-400 dark:text-[#484f58]`, `cursor-default`, `pointer-events-none`
- Enabled commands: `hover:bg-gray-100 dark:hover:bg-[#1e3a5f]/25`, clicking calls `command.execute()`
- Delete command in Edit group: red label `text-red-600` when enabled

The `Activity` menu label renders with a subtle muted style when no activity is selected (indicating its items are disabled), and at full opacity when an activity is selected.

**Trip info** — Trip name (serif, 13px) + date range below (10px, muted blue). Right-bordered.

**Spacer** — `flex-1`

**Selection indicator** — conditionally rendered when `selectedActivity !== null`. Shows: blue `4×4` rounded square + activity name (truncated, max 140px) + `×` deselect button (calls `selectEvent(null)`). This slides in/out with a simple opacity transition.

**View toggle** — existing Week/Day segmented control. Unchanged.

**+ New Activity button** — existing outlined button with a `N` shortcut badge appended (small `kbd` element, muted).

**Collaborator avatars** — exact same rendering as current `CalendarHeader` collaborators block.

**Share button** — amber `bg-[#F59E0B]` button. Unchanged.

**Avatar dropdown** — user avatar (initials or photo). Opens dropdown with: Profile (`href="/profile"`), Settings (`href="/profile/settings"`), dark mode toggle, Sign out. Pulled from `useAuthStore`. These are existing routes under `(main)` — no changes needed to those routes.

**Connection banner** — `connectionStatus !== 'connected'` renders a yellow banner row above the main bar. Unchanged from current CalendarHeader. `connectionStatus` is sourced from `useYjsSync` inside `CalendarDashboard`, which already computes it and previously passed it to `CalendarHeader` — the same value is now forwarded to `TripNavbar` as a prop.

### Props

```ts
interface TripNavbarProps {
  // Trip info
  tripName: string
  dateRange: string
  // Commands (drives menu bar)
  commands: Command[]
  onOpenPalette: () => void
  // Calendar controls
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onAddEvent: () => void
  onBack: () => void
  // Collaboration
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
  collaborators: UserAwareness[]
  onShare: () => void
  // Selection
  selectedActivity: CalendarActivity | null
  onDeselect: () => void
  // Theme (existing)
  theme: CalendarTheme
  onToggleTheme: () => void
  tripDays: { dayIndex: number; label: string }[]
}
```

---

## useKeyboardShortcuts

**File:** `apps/web/components/calendar/hooks/useKeyboardShortcuts.ts`

**Mount location:** Called inside `CalendarDashboard` (a client component that stays mounted for the lifetime of the trip page). Single instance, no risk of duplicate listeners.

```ts
function useKeyboardShortcuts(commands: Command[]): void
```

Updated signature:

```ts
function useKeyboardShortcuts(
  commands: Command[],
  isPaletteOpen: boolean,
  onClosePalette: () => void,
  onDeselect: () => void,
): void
```

- Attaches a `keydown` listener to `document` on mount, removes on unmount
- On each keydown: matches `event.key`, `event.ctrlKey || event.metaKey`, `event.shiftKey` against each command's `shortcut`
- If match found and `command.isEnabled`: calls `event.preventDefault()` then `command.execute()`
- Arrow keys and other movement keys only execute when `command.isEnabled` is true (i.e. activity selected and palette closed) — no extra special-casing needed
- Text inputs are excluded: if `event.target` is `INPUT`, `TEXTAREA`, or has `contenteditable="true"`, skip execution (except Escape)
- **Escape** is special-cased outside the command registry (no `escape` command entry): if `isPaletteOpen` → call `onClosePalette()`; else if activity selected (derived from `commands.some(c => c.id === 'delete' && c.isEnabled)`) → call `onDeselect()`. Always `preventDefault` for Escape.

---

## CommandPalette

**File:** `apps/web/components/calendar/CommandPalette.tsx`

Triggered by `Ctrl+K` / `Cmd+K` (via the `open-palette` command) or menu bar.

### Behavior

- Full-screen semi-transparent backdrop (`bg-black/40`)
- Centered modal, `max-w-[480px]`, `rounded-xl`, dark background
- Search input autofocused on open
- Filters `commands` by label (case-insensitive substring match)
- Results grouped by `group`, rendered in order: edit → activity → view → insert
- Disabled commands rendered at the end of their group, grayed, not selectable. If live `isEnabled` changes while palette is open (e.g. activity deselected via another mechanism), the command re-sorts to the bottom and the keyboard highlight resets to the first enabled command.
- Keyboard navigation: `↑`/`↓` moves highlight, `Enter` executes highlighted command and closes, `Esc` closes
- Clicking a command executes and closes
- Shortcut badge shown on the right of each result row

**Commands are passed as a live prop** (not snapshotted at open). Since every command execution closes the palette, a stale `isEnabled` state mid-session is not a practical concern — the palette closes before state changes from a prior action would render a command stale.

### Props

```ts
interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  commands: Command[]
}
```

---

## Route Changes

### Opting trip pages out of the global navbar

The global `Navbar` is rendered in `apps/web/app/(main)/layout.tsx`. Trip pages need to opt out.

**Approach:** Move trip routes into a separate route group `(trips-app)` with its own layout that renders no navbar:

```
apps/web/app/
  (main)/
    layout.tsx          ← keeps Navbar, pt-16
    page.tsx            ← home / discover
    places/
    trips/
    profile/
    ...
  (trips-app)/          ← NEW route group
    layout.tsx          ← just renders {children}, no navbar, no pt-16
    trip/
      [id]/
        layout.tsx      ← existing, unchanged (just returns children)
        page.tsx
        itinerary/
        ...
```

**Migration details:**
- URL structure is unchanged — route groups don't affect URLs in Next.js, so `/trip/[id]` still resolves correctly. No redirects needed.
- `(main)/layout.tsx` adds `<Navbar />` and `<main className="pt-16">`. After moving to `(trips-app)`, the `pt-16` offset is removed. `CalendarDashboard` already renders as a full `h-screen overflow-hidden` component that manages its own internal layout — the `pt-16` from `(main)` was redundant/incorrect for this page. The `(trips-app)/layout.tsx` renders `{children}` with no wrapper and no padding.
- The existing `(main)/trip/[id]/layout.tsx` (which currently just returns `{children}`) is preserved as-is inside `(trips-app)`.
- `TripNavbar` is rendered inside `CalendarDashboard` (a client component), where it has direct access to all live state without prop drilling through layouts.
- `connectionStatus` prop on `TripNavbar` comes from `useYjsSync` inside `CalendarDashboard`, which already computes it.

**Complete list of files/directories to move** from `(main)/trip/[id]/` to `(trips-app)/trip/[id]/`:
```
layout.tsx
page.tsx
itinerary/page.tsx
activities/page.tsx
budget/page.tsx
cars/page.tsx
favorites/page.tsx
flights/page.tsx
hotels/page.tsx
info/page.tsx
packing/page.tsx
restaurants/page.tsx
share/[token]/page.tsx
settings/page.tsx
```

---

## New Files

| File | Purpose |
|---|---|
| `apps/web/components/calendar/TripNavbar.tsx` | Unified navbar component |
| `apps/web/components/calendar/CommandPalette.tsx` | Ctrl+K palette |
| `apps/web/components/calendar/hooks/useCalendarCommands.ts` | Command registry hook |
| `apps/web/components/calendar/hooks/useKeyboardShortcuts.ts` | Global keydown handler |
| `apps/web/app/(trips-app)/layout.tsx` | Navbar-free route group layout |

## Modified Files

| File | Change |
|---|---|
| `apps/web/app/(main)/trip/[id]/**` | Move to `(trips-app)/trip/[id]/**` |
| `apps/web/components/calendar/CalendarDashboard.tsx` | Replace CalendarHeader with TripNavbar, wire commands, palette state, `isPaletteOpen` |
| `apps/web/components/calendar/hooks/useActivityMutations.ts` | Add `duplicateActivity(source: CalendarActivity): Promise<void>` — clones source with new `id` (uuid) and `sortOrder = max + 1`, calls existing `addActivity` internally |
| `apps/web/components/calendar/types.ts` | Add `Command` interface (web-local, not shared — `execute: () => void` is a runtime function, not a serializable type) |

---

## Out of Scope

- Undo/Redo implementation (marked TODO in registry)
- Mobile keyboard support (Expo app not affected)
- Tab/Shift+Tab cycling between activities (can be added later)
- Multi-select
