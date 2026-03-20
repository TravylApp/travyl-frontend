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
| Shift+click empty area | Creates post-it note | Creates post-it note (unchanged — TRA-204) |
| Press `N` | Creates activity at noon on selected day | Same (unchanged) |
| Click existing activity | Selects it | Same (unchanged) |

### Implementation

**`apps/web/components/calendar/DayColumn.tsx`**
- Remove `mouseDownPos` ref
- Remove `handleMouseDown` and `handleMouseUp` functions
- Remove `onMouseDown` and `onMouseUp` props from the droppable background div
- Replace with a single `onClick` handler that:
  - On Shift+click: calls `onCreateNote(dayIndex, hour)` if `canCreateNotes && onCreateNote`
  - Otherwise: calls `onDeselect()` to close the detail panel
- Remove `onCreateActivity` prop from `DayColumn` — no longer needed
- `CalendarDashboard` passes `onDeselect={() => selectEvent(null)}` to each `DayColumn`

### What stays the same
- Shift+click note creation (TRA-204 feature, same event, different modifier)
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
- The existing `transition-[ring,shadow,opacity] duration-150` transition already in place will animate the ring and scale smoothly — no change needed there

---

## Scope

- No schema changes
- No Yjs changes
- No new hooks or components
- Two files touched: `DayColumn.tsx`, `EventBlock.tsx`
- `CalendarDashboard.tsx` needs a minor prop update (remove `onCreateActivity` from DayColumn calls, add `onDeselect`)

---

## Out of scope

- Keyboard focus ring (already handled by `focus:ring-white focus:ring-offset-1` — acceptable for now)
- Changing what `N` creates (currently noon on selected day — separate issue if needed)
- Click-to-create on mobile (`apps/mobile` has its own calendar — unaffected)
