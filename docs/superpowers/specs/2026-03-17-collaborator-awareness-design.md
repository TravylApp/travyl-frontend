# Collaborator Awareness UI — Design Spec
**Date:** 2026-03-17
**Linear:** TRA-202
**Status:** Approved

## Problem

Collaborator presence is broadcast via Supabase Realtime but the UI only surfaces who is online (avatar row in `CalendarHeader`) and which activity they have selected (avatar badges on `EventBlock`). There is no indication of which view a collaborator is in or which day they are focused on.

## Solution

Surface the existing presence data in three additional places: avatar tooltips in the header, day column headers in week view, and the day view header. No new data infrastructure — one small addition to the broadcast payload (`selectedDayIndex`).

## Scope

- `packages/shared/src/types/index.ts` — add `selectedDayIndex?: number` to `UserAwareness`
- `apps/web/components/calendar/hooks/useCollaboratorPresence.ts` — add `selectedDayIndex` to broadcast and `localStateRef`
- `apps/web/components/calendar/CalendarHeader.tsx` — replace `title` attribute with hover popover showing name, view, and day
- `apps/web/components/calendar/DayColumn.tsx` — render collaborator avatars on the day header using existing `viewers` prop
- `apps/web/components/calendar/DayView.tsx` — render collaborator avatars on the day header using existing `viewers` prop and `dayIndex` prop
- `apps/web/components/calendar/CalendarDashboard.tsx` — pass `tripDays={TRIP_DAYS}` to `CalendarHeader` and wire `setSelectedDay`

No changes to `EventBlock`, `useYjsSync`, `WeekView`, or the Supabase schema.

## Changes

### 0. `UserAwareness` type — add `selectedDayIndex`

In `packages/shared/src/types/index.ts`, add `selectedDayIndex` to the `UserAwareness` interface. The calendar-local `apps/web/components/calendar/types.ts` barrel re-exports `UserAwareness` from `@travyl/shared` verbatim — **no second edit is needed there**.

```ts
export interface UserAwareness {
  userId: string;
  name: string;
  avatarInitial: string;
  color: string;
  isOnline: boolean;
  selectedEventId: string | null;
  currentView: ViewMode;
  selectedDayIndex?: number;   // ← new
  /** Legacy itinerary view — selected block id */
  selectedBlockId?: string;
  cursor?: { day: number; hour: number };
}
```

### 1. `useCollaboratorPresence` — broadcast `selectedDayIndex`

**a) Extend `localStateRef`** to include `selectedDayIndex`:

```ts
const localStateRef = useRef({
  selectedEventId: null as string | null,
  currentView: 'week' as ViewMode,
  selectedDayIndex: 0,   // ← new
})
```

**b) Add `setSelectedDay` setter** to `UseCollaboratorPresenceReturn`:

```ts
/** Broadcast the currently focused day index to all collaborators. */
setSelectedDay: (dayIndex: number) => void
```

Implement it following the same pattern as `setCurrentView`:

```ts
const setSelectedDay = useCallback(
  (dayIndex: number) => {
    localStateRef.current.selectedDayIndex = dayIndex
    channelRef.current?.track({
      userId,
      userName,
      color,
      selectedEventId: localStateRef.current.selectedEventId,
      currentView: localStateRef.current.currentView,
      selectedDayIndex: dayIndex,
    })
  },
  [userId, userName, color],
)
```

Also update the existing `setSelectedEvent` and `setCurrentView` callbacks to include `selectedDayIndex: localStateRef.current.selectedDayIndex` in their `track()` calls so the field is never dropped on re-broadcast:

```ts
const setSelectedEvent = useCallback(
  (eventId: string | null) => {
    localStateRef.current.selectedEventId = eventId
    channelRef.current?.track({
      userId,
      userName,
      color,
      selectedEventId: eventId,
      currentView: localStateRef.current.currentView,
      selectedDayIndex: localStateRef.current.selectedDayIndex,   // ← add
    })
  },
  [userId, userName, color],
)

const setCurrentView = useCallback(
  (view: ViewMode) => {
    localStateRef.current.currentView = view
    channelRef.current?.track({
      userId,
      userName,
      color,
      selectedEventId: localStateRef.current.selectedEventId,
      currentView: view,
      selectedDayIndex: localStateRef.current.selectedDayIndex,   // ← add
    })
  },
  [userId, userName, color],
)
```

**c) Update initial `track()` call** in the subscribe callback to include `selectedDayIndex`:

```ts
await channel.track({
  userId,
  userName,
  color,
  selectedEventId: localStateRef.current.selectedEventId,
  currentView: localStateRef.current.currentView,
  selectedDayIndex: localStateRef.current.selectedDayIndex,
})
```

**d) Update the presence sync handler** to forward `selectedDayIndex` when building `UserAwareness` entries. Extend the inline type cast and the `users.push(...)` call:

```ts
const state = channel.presenceState<{
  userId: string
  userName: string
  color: string
  selectedEventId: string | null
  currentView: ViewMode
  selectedDayIndex?: number   // ← new
}>()

// ...inside the loop:
users.push({
  userId: entry.userId,
  name: entry.userName,
  avatarInitial: (entry.userName ?? '?').charAt(0).toUpperCase(),
  color: entry.color,
  isOnline: true,
  selectedEventId: entry.selectedEventId ?? null,
  currentView: entry.currentView ?? 'week',
  selectedDayIndex: entry.selectedDayIndex ?? 0,   // ← new
})
```

The broadcast payload shape becomes:
```ts
{
  name: string
  avatarInitial: string
  color: string
  selectedEventId: string | null
  currentView: 'week' | 'day'
  selectedDayIndex: number   // ← new
}
```

**e) Return `setSelectedDay`** from the hook.

**f) Wire up in `CalendarDashboard`:**

Add `setSelectedDay` to the destructure of `useCollaboratorPresence`:

```ts
const { collaborators, setSelectedEvent: setPresenceSelectedEvent, setCurrentView, setSelectedDay } =
  useCollaboratorPresence({ ... })
```

Add a `useEffect` that broadcasts the current day whenever it changes — following the same pattern as the `setCurrentView` effect:

```ts
useEffect(() => {
  setSelectedDay(selectedDayIndex)
}, [selectedDayIndex, setSelectedDay])
```

### 2. `CalendarHeader` — avatar hover popover

Replace the `title` HTML attribute on each collaborator avatar with a CSS-positioned tooltip that appears on hover.

**Popover content:**
```
Sarah
Week view · Mon Mar 17
```
Or if in day view:
```
Sarah
Day view · Tue Mar 18
```

**Implementation:** render a `<div>` with `position: absolute`, `bottom: calc(100% + 6px)`, centered on the avatar, with a small triangle pointer. Toggle visibility via `group-hover` Tailwind utility or a `useState` per avatar. White background, `rounded-lg`, `shadow-md`, `text-xs`, min-width ~120px. Z-index above the header.

The day label is derived by looking up `tripDays.find(d => d.dayIndex === (collaborator.selectedDayIndex ?? 0))?.label ?? ''` — `TRIP_DAYS` must be passed as a new prop to `CalendarHeader`.

New prop:
```ts
tripDays: { dayIndex: number; label: string }[]
```

`CalendarDashboard` passes `tripDays={TRIP_DAYS}` to `<CalendarHeader>`. `TRIP_DAYS` is the existing array already computed in `CalendarDashboard` (derived from `tripStartDate` and `totalDays`).

### 3. `DayColumn` — collaborator avatars on day header

**Reuse the existing `viewers` prop** — no new prop needed. `DayColumn` already has `viewers?: UserAwareness[]`. Filter to collaborators whose `selectedDayIndex === dayIndex` at the call site in `WeekView` (pass the pre-filtered slice), or filter inside `DayColumn` itself.

Recommended: filter inside `DayColumn` using `viewers` and `dayIndex` (both already in scope):

```ts
const dayCollaborators = viewers.filter(
  (c) => (c.selectedDayIndex ?? 0) === dayIndex
)
```

Render up to 3 tiny avatars (16×16px) stacked with −4px overlap in the day header strip, after the date label. If more than 3, show `+N`.

```tsx
{dayCollaborators.length > 0 && (
  <div className="flex items-center justify-center gap-0 mt-0.5">
    {dayCollaborators.slice(0, 3).map((c, i) => (
      <div
        key={c.userId}
        title={c.name}
        style={{ backgroundColor: c.color, marginLeft: i === 0 ? 0 : '-4px', zIndex: 3 - i }}
        className="w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center ring-1 ring-white dark:ring-[#0a1520]"
      >
        {c.avatarInitial}
      </div>
    ))}
    {dayCollaborators.length > 3 && (
      <span className="text-[9px] text-gray-400 ml-1">+{dayCollaborators.length - 3}</span>
    )}
  </div>
)}
```

`WeekView` already passes `viewers` to each `DayColumn`; no prop change needed in `WeekView`.

### 4. `DayView` — collaborator avatars on day header

`DayView` has no header of its own — its JSX immediately delegates to `DayColumn`. The day header strip lives inside `DayColumn` (lines 101-124 of `DayColumn.tsx`). Since `DayColumn` already receives `viewers` and `dayIndex` from both `WeekView` and `DayView`, **no changes to `DayView` are needed**.

The filtering and rendering in Section 3 (`DayColumn`) handles the day-view case identically:

```ts
const dayCollaborators = viewers.filter(
  (c) => (c.selectedDayIndex ?? 0) === dayIndex
)
```

When `DayView` renders `DayColumn` for a single day, collaborators on that day will appear in the column's header automatically — same code path as week view.

## Data flow

```
useCalendarNavigation → selectedDayIndex
    ↓
CalendarDashboard useEffect → setSelectedDay(selectedDayIndex)
    ↓
useCollaboratorPresence → broadcasts { ..., selectedDayIndex }
    ↓
Supabase Realtime presence sync
    ↓
collaborators[] on other clients includes selectedDayIndex
    ↓
CalendarHeader (tooltip) + DayColumn (header avatars via viewers prop) + DayView (header avatars via viewers prop)
```

## Out of scope

- Live cursor position tracking
- Scroll position sync
- Viewport-aware rendering (off-screen collaborators are just not visible)
- Sidebar panel showing all collaborators and their status
