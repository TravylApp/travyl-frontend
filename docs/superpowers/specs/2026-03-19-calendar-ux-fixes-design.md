# Calendar UX Fixes — Design Spec
**Linear:** TRA-217
**Branch:** `feature/tra-217`
**Date:** 2026-03-19

---

## Problem

Two related interaction issues on the trip calendar that cause friction:

1. **Accidental activity creation** — clicking anywhere on a day column creates a new activity. Since `N` already handles intentional creation, this is a footgun.
2. **Unclear focus state** — the selected activity's ring (`ring-white ring-offset-1`) is too subtle to notice reliably, making it hard to tell which activity is active.

---

## Fix 1: Remove click-to-create from DayColumn

### Decision
Remove the `handleMouseDown`/`handleMouseUp` click-to-create path from `DayColumn`. `N` is the canonical way to create an activity.

### Behavior after change

| Interaction | Before | After |
|---|---|---|
| Click empty calendar area | Creates new activity | Deselects (closes detail panel) |
| Shift+click empty area | Creates post-it note (not yet wired — TRA-204) | Same — guard preserved in DayColumn, silently no-ops until TRA-204 wires the prop chain |
| Press `N` | Creates activity at noon on selected day | Same (unchanged) |
| Click existing activity | Selects it | Same (unchanged) |
| Click already-selected activity | Deselects (toggles off) | Same (unchanged — toggle stays in EventBlock) |

### Implementation

**`apps/web/components/calendar/DayColumn.tsx`**
- Remove `mouseDownPos` ref
- Remove `handleMouseDown` and `handleMouseUp` functions
- Remove `onMouseDown` and `onMouseUp` props from the droppable background div
- Remove `onCreateActivity` from `DayColumnProps` — no longer needed
- Replace with a single `onClick` handler that:
  - Guards with `e.target === e.currentTarget` to ignore bubbled clicks from `EventBlock` and `PostItNote` children (without this guard, clicking an activity would select it and then immediately deselect it as the click bubbles up)
  - On Shift+click: calls `onCreateNote(dayIndex, hour)` if `canCreateNotes && onCreateNote`
  - Otherwise: calls `onDeselect()` to close the detail panel
- Add `onDeselect: () => void` to `DayColumnProps`

**`apps/web/components/calendar/WeekView.tsx`**
- Remove `onCreateActivity` from `WeekViewProps`
- Remove the `onCreateActivity` prop forwarded to `DayColumn`
- Add `onDeselect: () => void` to `WeekViewProps` and forward to `DayColumn`

**`apps/web/components/calendar/DayView.tsx`**
- Remove `onCreateActivity` from `DayViewProps`
- Remove the `onCreateActivity` prop forwarded to `DayColumn`
- Add `onDeselect: () => void` to `DayViewProps` and forward to `DayColumn`

**`apps/web/components/calendar/CalendarDashboard.tsx`**
- Stop passing `onCreateActivity` to `WeekView` and `DayView`
- Pass `onDeselect={() => selectEvent(null)}` instead
- `handleCreateActivity` is **retained** — it is still used by the `N` keyboard shortcut via `useCalendarCommands` (`onAddEvent: () => handleCreateActivity(selectedDayIndex ?? 0, 12)`)

### What stays the same
- Shift+click note creation guard is preserved in `DayColumn`, but silently no-ops until TRA-204 wires `onCreateNote`/`canCreateNotes` through `WeekView`, `DayView`, and `CalendarDashboard` — those props are not currently forwarded above `DayColumn`
- Drag-and-drop is unaffected (dnd-kit manages its own pointer events)
- The 5px drag threshold logic is removed entirely — dnd-kit handles drag vs click discrimination on event blocks

---

## Fix 2: Improve activity focus indicator

### Decision
White ring + subtle scale up. Mirrors selection treatment in tools like Figma — unambiguous without being heavy.

### Visual spec

| State | Classes |
|---|---|
| **Selected** | `ring-2 ring-white ring-offset-2 scale-[1.02] shadow-lg` |
| **Hover (unselected)** | `hover:ring-white/40` (unchanged) |
| **Dragging** | `opacity-50` (unchanged) |

Changes from current: `ring-white ring-offset-1` → `ring-2 ring-white ring-offset-2 scale-[1.02] shadow-lg`

### Implementation

**`apps/web/components/calendar/EventBlock.tsx`**
- Replace `isSelected ? 'ring-white ring-offset-1' : 'hover:ring-white/40'` with `isSelected ? 'ring-2 ring-white ring-offset-2 scale-[1.02] shadow-lg' : 'hover:ring-white/40'`
- Replace `transition-[ring,shadow,opacity]` with `transition-[ring,shadow,opacity,transform]` so the scale animates in. (`transition-all` is avoided because `left` and `width` are already handled by the inline `style.transition` on the same element.)
- The existing static class `hover:-translate-y-px hover:shadow-lg` must be suppressed when selected to avoid stacking with `scale-[1.02]`. Make it conditional: apply `hover:-translate-y-px hover:shadow-lg` only when `!isSelected && !isDragging`. `shadow-lg` on hover is redundant with the selected state's own `shadow-lg`, so this is safe to drop.
- Note: `ring-2` is already present as a permanent base class (`ring-2 ring-transparent`). The selected state adds `ring-white ring-offset-2` on top — no duplicate `ring-2` needed in the class string.

---

## Scope

Five files touched:
- `apps/web/components/calendar/DayColumn.tsx` — remove click-to-create, add `onDeselect`
- `apps/web/components/calendar/WeekView.tsx` — remove `onCreateActivity`, add `onDeselect`
- `apps/web/components/calendar/DayView.tsx` — remove `onCreateActivity`, add `onDeselect`
- `apps/web/components/calendar/CalendarDashboard.tsx` — prop wiring update
- `apps/web/components/calendar/EventBlock.tsx` — selected ring classes + transition

No schema changes, no Yjs changes, no new hooks or components.

---

## Out of scope

- Keyboard focus ring (already handled by `focus:ring-white focus:ring-offset-1` — acceptable for now)
- Changing what `N` creates (currently noon on selected day — separate issue if needed)
- Click-to-create on mobile (`apps/mobile` has its own calendar — unaffected)
