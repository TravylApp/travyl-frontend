# Overlap Column Sharing — Design Spec

**Date:** 2026-03-17
**Branch:** feature/tra-203
**Status:** Approved

## Problem

When two or more activities overlap in time on the trip calendar, they currently stack on top of each other via z-index. The underlying activity is hidden and inaccessible. Users need to see all overlapping activities simultaneously.

## Solution

Outlook-style smart column sharing. When activities overlap in time, they split the day column into equal-width sub-columns — side by side with a visible gap. Once the overlap region ends, blocks expand back to full width.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Column sharing style | Smart columns — split only in overlap region | Most space-efficient; blocks expand to full width when no conflict |
| Block separation | Clean side-by-side with 4px gap | No visual clipping or layering |
| Width distribution | Equal width for all blocks in a cluster | Simple, predictable |
| Max visible columns | 3 | Day columns are narrow in week view; 4+ blocks would be unreadable |
| Overflow (4+ blocks) | "+N more" badge | Activities still stored, just not rendered inline |
| Images in split blocks | Always shown | Keeps visual richness; existing `duration >= 1hr` threshold still applies |
| Drag preview | Live column split preview during hover | Run layout with tentative activity; columns animate into position |
| Overflow drop | Allowed, shows "+N more" | Drop is not blocked, just visually capped |

## Architecture

### Approach: Layout algorithm in DayColumn (Approach A)

Pure client-side layout computation. No schema changes, no migration, no Yjs changes. The overlap layout is derived from existing activity time data on every render.

### Core algorithm: `computeOverlapLayout(activities)`

Located in `apps/web/components/calendar/utils.ts`.

**Input:** array of `CalendarActivity` for a single day.

**Steps:**

1. **Sort** by `startHour` ascending, then `duration` descending (longer blocks get stable column assignment).
2. **Cluster** — walk sorted list, group activities whose time ranges overlap. Two activities overlap when `A.startHour < B.startHour + B.duration` AND `B.startHour < A.startHour + A.duration`. A cluster ends when the next activity starts after all current cluster members end.
3. **Assign columns** — within each cluster, greedily assign column index (0, 1, 2). Each activity gets the lowest available column not occupied by an overlapping activity.
4. **Cap at 3** — if a cluster has 4+ activities, only the first 3 (by sort order) get column assignments. The rest are marked as overflow.

**Output:** `Map<string, { column: number; totalColumns: number; overflow: boolean }>` keyed by activity ID. Non-overlapping activities get `{ column: 0, totalColumns: 1, overflow: false }`.

### EventBlock positioning

`EventBlock` receives two new optional props:

- `column: number` (default `0`)
- `totalColumns: number` (default `1`)

Current style:
```ts
left: 4,
right: 4,
```

New style:
```ts
const gap = 4; // px between sub-columns
const widthPercent = (100 - (totalColumns - 1) * gap_as_percent) / totalColumns;
const leftPercent = column * (widthPercent + gap_as_percent);
// Applied as percentage-based left/width on the absolute-positioned block
```

When `totalColumns === 1`, positioning is identical to current behavior.

### Overflow badge

When a cluster has 4+ activities, a small "+N more" badge renders at the bottom-right of the overlap time region. Clicking it could open a popover or expand the day view (future enhancement — for now, just the badge).

### Drag preview

The existing `useCalendarDnd` hook tracks the dragged activity and its hovered position. During drag:

1. Compute a `pendingActivity` — the dragged item at its tentative drop position.
2. Pass `pendingActivity` into `computeOverlapLayout()` alongside real activities.
3. `DayColumn` renders all blocks (including pending) in their computed split positions.
4. On drop — commit via existing `useActivityMutations`. Layout recalculates from persisted data.
5. On cancel — remove `pendingActivity`, layout snaps back.

No changes to the Yjs write path or Supabase mutations.

### Collaboration

Each client independently runs `computeOverlapLayout()` on the same Y.Map activity data synced via Yjs. All clients converge to the same layout. Race conditions (two users dropping into the same slot simultaneously) are handled naturally — Yjs merges both writes, both clients re-run layout, and the 3-block visual cap applies.

No new Yjs fields, no schema changes, no migration.

## Files changed

| File | Change |
|---|---|
| `apps/web/components/calendar/utils.ts` | Add `computeOverlapLayout()` function |
| `apps/web/components/calendar/EventBlock.tsx` | Accept `column`, `totalColumns` props; compute width/left |
| `apps/web/components/calendar/DayColumn.tsx` | Run layout algorithm, pass results to EventBlock, render overflow badge |
| `apps/web/hooks/useCalendarDnd.ts` | Compute `pendingActivity` during drag for preview |

## Out of scope

- Overflow popover/expand UI (just the badge for now)
- Mobile implementation (can lift to shared package later)
- Multi-day activity overlap handling (activities spanning multiple days already render differently)
- Resize handles on split blocks
