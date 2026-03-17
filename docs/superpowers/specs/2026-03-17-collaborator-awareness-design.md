# Collaborator Awareness UI — Design Spec
**Date:** 2026-03-17
**Linear:** TRA-202
**Status:** Approved

## Problem

Collaborator presence is broadcast via Supabase Realtime but the UI only surfaces who is online (avatar row in `CalendarHeader`) and which activity they have selected (avatar badges on `EventBlock`). There is no indication of which view a collaborator is in or which day they are focused on.

## Solution

Surface the existing presence data in three additional places: avatar tooltips in the header, day column headers in week view, and the day view header. No new data infrastructure — one small addition to the broadcast payload (`selectedDayIndex`).

## Scope

- `apps/web/components/calendar/hooks/useCollaboratorPresence.ts` — add `selectedDayIndex` to broadcast
- `apps/web/components/calendar/CalendarHeader.tsx` — replace `title` attribute with hover popover showing name, view, and day
- `apps/web/components/calendar/DayColumn.tsx` — render collaborator avatars on the day header
- `apps/web/components/calendar/DayView.tsx` — render collaborator avatars on the day header

No changes to `EventBlock`, `useYjsSync`, or the Supabase schema.

## Changes

### 1. `useCollaboratorPresence` — broadcast `selectedDayIndex`

Add `selectedDayIndex: number` to the presence payload. The hook already accepts `setCurrentView` and `setSelectedEvent` setters — add a `setSelectedDay` setter with the same pattern.

```ts
// New setter exposed from the hook
setSelectedDay: (dayIndex: number) => void
```

`CalendarDashboard` calls `setSelectedDay(selectedDayIndex)` in a `useEffect` that watches `selectedDayIndex`.

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

The received `UserAwareness` object already has `selectedDayIndex?: number` (needs to be added to the type if not present, or confirmed present).

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

The day label is derived by looking up `TRIP_DAYS[collaborator.selectedDayIndex]?.label` — `TRIP_DAYS` must be passed as a new prop to `CalendarHeader`.

New prop:
```ts
tripDays: { dayIndex: number; label: string }[]
```

### 3. `DayColumn` — collaborator avatars on day header

Pass `collaborators: UserAwareness[]` as a new prop to `DayColumn` (and `WeekView` as a passthrough). Filter to collaborators whose `selectedDayIndex === dayIndex` (includes both week-view users scrolled to this day and day-view users on this day).

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

### 4. `DayView` — collaborator avatars on day header

`DayView` renders a single day. Filter collaborators to those whose `selectedDayIndex === currentDayIndex`. Render the same small avatar stack in the day view header bar, next to the date label.

New props on `DayView`:
```ts
collaborators: UserAwareness[]
currentDayIndex: number
```

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
CalendarHeader (tooltip) + DayColumn (header avatars) + DayView (header avatars)
```

## Out of scope

- Live cursor position tracking
- Scroll position sync
- Viewport-aware rendering (off-screen collaborators are just not visible)
- Sidebar panel showing all collaborators and their status
