# Overlap Column Sharing — Design Spec

**Issue:** [TRA-205](https://linear.app/travyl/issue/TRA-205/overlap-column-sharing-outlook-style-side-by-side-blocks)
**Branch:** `feature/tra-205`
**Date:** 2026-03-17

## Problem

When two or more activities overlap in time on the trip calendar, they stack via z-index. The underlying activity is hidden and inaccessible.

## Solution

Outlook-style smart column sharing. When activities overlap in time, split the day column into equal-width sub-columns — side by side with a 4px gap. Once the overlap cluster ends, blocks expand back to full width.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layout algorithm | Cluster-based | Consistent block width throughout duration. Predictable, matches Outlook/Google Calendar. |
| Max visible columns | 3 | Beyond 3, blocks get too narrow to read. |
| Overflow handling | "+N more" badge on 3rd block | Discoverable, keeps layout stable. Click opens popover listing hidden items. |
| Drag preview | Live reflow | Phantom activity injected into layout computation. Existing blocks animate to make room. |
| Sub-column gap | 4px | Subtle but visible separation. |
| Reflow animation | CSS transition on left/width | `transition: left 150ms ease, width 150ms ease` on EventBlock style. |

## Architecture

**Approach:** Layout computed in `DayColumn`, pure function in `utils.ts`, results passed as props to `EventBlock`. No new hooks or abstraction layers.

### 1. `computeOverlapLayout()` — Pure Function

**File:** `apps/web/components/calendar/utils.ts`

**Input:** Array of single-day, pre-filtered activities with `id`, `startHour`, `duration`. This function operates on one day's activities only — callers must filter by day before calling.

**Output:** `Map<string, OverlapLayoutItem>` keyed by activity ID.

```ts
interface OverlapLayoutItem {
  column: number       // 0, 1, 2, or -1 (hidden)
  totalColumns: number // 1, 2, or 3
}
```

**Algorithm:**

1. Sort by `startHour` ascending, then `duration` descending (longer activities get earlier columns).
2. Sweep to build overlap clusters: two activities are in the same cluster if one starts before the other ends. Transitive — if A overlaps B and B overlaps C, all three cluster together.
3. Within each cluster, greedily assign column indices (0, 1, 2). Each activity gets the first column not taken by an overlapping activity.
4. `totalColumns` = `min(clusterSize, 3)` for all activities in the cluster.
5. Activities with column index >= 3 get `column: -1` (hidden).

Activities with no overlaps get `{ column: 0, totalColumns: 1 }` — full width, same as current behavior.

### 2. `EventBlock` Changes

**New props:**

- `column: number` — 0, 1, or 2
- `totalColumns: number` — 1, 2, or 3
- `hiddenCount: number` — count of activities in the same cluster with `column === -1`. Default 0.

**Positioning:**

Replace current fixed `left: 4, right: 4` with:

```
gap = 4px
columnWidth = (100% - (totalColumns - 1) * gap) / totalColumns
left = column * (columnWidth + gap)
width = columnWidth
```

When `totalColumns === 1`, this reduces to full-width (current behavior).

**Reflow animation:** Add `transition: 'left 150ms ease, width 150ms ease'` to the EventBlock style so blocks animate smoothly when columns split/merge during drag.

**"+N more" badge:**

When `column === 2` and `hiddenCount > 0`, render a pill at the bottom of the block: `+N more` where N = `hiddenCount`. Clicking opens a popover listing the hidden activities.

No other changes — drag handles, selection, images, viewer avatars, colors all stay the same.

### 3. `DayColumn` Changes

- Calls `computeOverlapLayout(activities)` before rendering.
- Passes `column`, `totalColumns`, and `hiddenCount` to each `EventBlock`.
- `hiddenCount` is the count of activities in the same cluster whose `column === -1`. Only the EventBlock with `column === 2` in that cluster receives a non-zero `hiddenCount`; all others get 0.
- New optional prop: `pendingActivity?: CalendarActivity | null`. When present, included in `computeOverlapLayout()` call so blocks reflow. Renders a ghost block (semi-transparent, dashed border) at the pending position.
- **Important:** When `pendingActivity` represents an existing activity being moved (not a new suggestion), `DayColumn` must filter the original activity out of the `activities` array before passing to `computeOverlapLayout()` to avoid double-counting. The phantom replaces the original, it doesn't duplicate it.

### 4. `useCalendarDnd` Changes

New state: `pendingDrop: { dayIndex: number; activity: CalendarActivity } | null`.

- `handleDragOver` (new handler): compute target day and phantom activity position, set `pendingDrop`.
- `handleDragEnd`: existing handler, additionally clears `pendingDrop` to `null`.
- `handleDragCancel` (new handler): clears `pendingDrop` to `null`.
- Return `pendingDrop` and `handleDragOver` and `handleDragCancel` from the hook.

### 5. `WeekView` / `DayView` Changes

Both `WeekView` and `DayView` pass `pendingDrop` through — each `DayColumn` receives `pendingActivity` only when `pendingDrop.dayIndex` matches its `dayIndex`. `DayView` renders a single `DayColumn` and must also receive and forward this prop.

### 6. `CalendarDashboard` Wiring

- Destructures `pendingDrop`, `handleDragOver`, and `handleDragCancel` from `useCalendarDnd`.
- Passes `pendingDrop` to `WeekView` (and `DayView` when in day mode).
- Adds `onDragOver={handleDragOver}` and `onDragCancel={handleDragCancel}` to the `<DndContext>` JSX alongside existing `onDragStart` and `onDragEnd`.

## Testing

Unit tests for `computeOverlapLayout()`:

- No overlaps → all `{ column: 0, totalColumns: 1 }`
- Two overlapping → columns 0 and 1, totalColumns 2
- Three overlapping → columns 0, 1, 2, totalColumns 3
- Five overlapping → first 3 get columns 0-2, last 2 get `column: -1`
- Adjacent non-overlapping (A ends at 12, B starts at 12) → no overlap, both full width
- Chain overlap (A→B→C transitive) → all cluster together
- Phantom activity injection: existing activity filtered out, phantom included, layout correct (no double-counting)

## Scope Exclusions

- No backend/schema/migration changes — pure client-side layout
- No Yjs changes — layout is computed from existing activity data
- Popover for "+N more" overflow is a simple dropdown list, not a full modal
