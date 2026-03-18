# Overlap Column Sharing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Outlook-style side-by-side column sharing when calendar activities overlap in time.

**Architecture:** Pure `computeOverlapLayout()` function in `packages/shared` (where all testable utils live), called by `DayColumn` before rendering. Results passed as `column`/`totalColumns`/`hiddenCount` props to `EventBlock`, which computes its own `left`/`width`. Drag preview via phantom activity injection in `useCalendarDnd`.

**Tech Stack:** TypeScript, React, dnd-kit, Vitest

**Spec:** `docs/superpowers/specs/2026-03-17-overlap-columns-design.md`

**Note:** The "+N more" badge is rendered but its click-to-open popover is deferred to a follow-up task. This plan covers the layout algorithm, column rendering, and drag preview.

---

## Chunk 1: Core Layout Algorithm + Tests

### Task 1: `computeOverlapLayout` — failing tests

**Files:**
- Create: `packages/shared/src/utils/overlapLayout.ts`
- Create: `packages/shared/src/utils/overlapLayout.test.ts`
- Modify: `packages/shared/src/utils/index.ts` (add barrel export)

- [ ] **Step 1: Write the test file with all test cases**

```ts
// packages/shared/src/utils/overlapLayout.test.ts
import { describe, it, expect } from 'vitest'
import { computeOverlapLayout } from './overlapLayout'

// Minimal shape — only fields the function needs
function activity(id: string, startHour: number, duration: number) {
  return { id, startHour, duration }
}

describe('computeOverlapLayout', () => {
  it('returns full width for non-overlapping activities', () => {
    const result = computeOverlapLayout([
      activity('a', 9, 1),
      activity('b', 11, 1),
    ])
    expect(result.get('a')).toEqual({ column: 0, totalColumns: 1 })
    expect(result.get('b')).toEqual({ column: 0, totalColumns: 1 })
  })

  it('splits two overlapping activities into 2 columns', () => {
    const result = computeOverlapLayout([
      activity('a', 9, 2),  // 9-11
      activity('b', 10, 2), // 10-12
    ])
    expect(result.get('a')).toEqual({ column: 0, totalColumns: 2 })
    expect(result.get('b')).toEqual({ column: 1, totalColumns: 2 })
  })

  it('splits three overlapping activities into 3 columns', () => {
    const result = computeOverlapLayout([
      activity('a', 9, 3),    // 9-12
      activity('b', 10, 3),   // 10-13
      activity('c', 11, 1.5), // 11-12:30
    ])
    expect(result.get('a')).toEqual({ column: 0, totalColumns: 3 })
    expect(result.get('b')).toEqual({ column: 1, totalColumns: 3 })
    expect(result.get('c')).toEqual({ column: 2, totalColumns: 3 })
  })

  it('caps at 3 visible columns, hides 4th+ with column -1', () => {
    const result = computeOverlapLayout([
      activity('a', 10, 3),
      activity('b', 10, 3),
      activity('c', 10, 2),
      activity('d', 10, 1.5),
      activity('e', 10, 3.5),
    ])
    const visible = [...result.values()].filter(v => v.column >= 0)
    const hidden = [...result.values()].filter(v => v.column === -1)
    expect(visible).toHaveLength(3)
    expect(hidden).toHaveLength(2)
    visible.forEach(v => expect(v.totalColumns).toBe(3))
    hidden.forEach(v => expect(v.totalColumns).toBe(3))
  })

  it('treats adjacent non-overlapping activities as separate (A ends when B starts)', () => {
    const result = computeOverlapLayout([
      activity('a', 9, 2),  // 9-11
      activity('b', 11, 2), // 11-13 (starts exactly when A ends)
    ])
    expect(result.get('a')).toEqual({ column: 0, totalColumns: 1 })
    expect(result.get('b')).toEqual({ column: 0, totalColumns: 1 })
  })

  it('clusters transitively (A overlaps B, B overlaps C, A does not overlap C)', () => {
    const result = computeOverlapLayout([
      activity('a', 9, 2),    // 9-11
      activity('b', 10, 2),   // 10-12
      activity('c', 11.5, 1), // 11:30-12:30
    ])
    // All three are in one cluster because A->B and B->C
    expect(result.get('a')!.totalColumns).toBe(3)
    expect(result.get('b')!.totalColumns).toBe(3)
    expect(result.get('c')!.totalColumns).toBe(3)
  })

  it('returns empty map for empty input', () => {
    const result = computeOverlapLayout([])
    expect(result.size).toBe(0)
  })

  it('returns full width for a single activity', () => {
    const result = computeOverlapLayout([activity('a', 9, 1)])
    expect(result.get('a')).toEqual({ column: 0, totalColumns: 1 })
  })

  it('assigns earlier columns to longer activities', () => {
    const result = computeOverlapLayout([
      activity('short', 10, 1),  // 10-11
      activity('long', 10, 3),   // 10-13
    ])
    expect(result.get('long')).toEqual({ column: 0, totalColumns: 2 })
    expect(result.get('short')).toEqual({ column: 1, totalColumns: 2 })
  })

  it('handles phantom activity replacing original without double-counting', () => {
    // Simulates DayColumn filtering: original removed, phantom at new position
    const original = [
      activity('a', 9, 2),  // 9-11 — being dragged
      activity('b', 10, 2), // 10-12
    ]
    // DayColumn filters out 'a' and injects phantom at new time
    const withPhantom = [
      activity('b', 10, 2),     // 10-12 (stays)
      activity('a', 14, 2),     // 14-16 (phantom — moved to non-overlapping time)
    ]
    const result = computeOverlapLayout(withPhantom)
    // No overlap — both should be full width
    expect(result.get('a')).toEqual({ column: 0, totalColumns: 1 })
    expect(result.get('b')).toEqual({ column: 0, totalColumns: 1 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/shared && npx vitest run src/utils/overlapLayout.test.ts`
Expected: FAIL — module `./overlapLayout` not found

- [ ] **Step 3: Implement `computeOverlapLayout`**

```ts
// packages/shared/src/utils/overlapLayout.ts

export interface OverlapLayoutItem {
  column: number       // 0, 1, 2, or -1 (hidden)
  totalColumns: number // 1, 2, or 3
}

const MAX_VISIBLE_COLUMNS = 3

interface LayoutInput {
  id: string
  startHour: number
  duration: number
}

export function computeOverlapLayout(
  activities: LayoutInput[],
): Map<string, OverlapLayoutItem> {
  const result = new Map<string, OverlapLayoutItem>()
  if (activities.length === 0) return result

  // Sort: earliest start first, then longest duration first (for column priority)
  const sorted = [...activities].sort((a, b) => {
    if (a.startHour !== b.startHour) return a.startHour - b.startHour
    return b.duration - a.duration
  })

  // Build transitive overlap clusters
  const clusters: LayoutInput[][] = []
  let currentCluster: LayoutInput[] = [sorted[0]]
  let clusterEnd = sorted[0].startHour + sorted[0].duration

  for (let i = 1; i < sorted.length; i++) {
    const act = sorted[i]
    if (act.startHour < clusterEnd) {
      // Overlaps with cluster — extend end if needed
      currentCluster.push(act)
      clusterEnd = Math.max(clusterEnd, act.startHour + act.duration)
    } else {
      // No overlap — finalize cluster, start new one
      clusters.push(currentCluster)
      currentCluster = [act]
      clusterEnd = act.startHour + act.duration
    }
  }
  clusters.push(currentCluster)

  // Assign columns within each cluster
  for (const cluster of clusters) {
    // Sort cluster by duration desc for column assignment priority
    const byPriority = [...cluster].sort((a, b) => b.duration - a.duration)

    const assignments: { act: LayoutInput; column: number }[] = []

    for (const act of byPriority) {
      // Find first available column not occupied by an overlapping activity
      let assignedCol = -1
      for (let col = 0; col < MAX_VISIBLE_COLUMNS; col++) {
        const conflict = assignments.some(
          (a) =>
            a.column === col &&
            a.act.startHour < act.startHour + act.duration &&
            act.startHour < a.act.startHour + a.act.duration,
        )
        if (!conflict) {
          assignedCol = col
          break
        }
      }
      assignments.push({ act, column: assignedCol })
    }

    // totalColumns = max column actually used + 1 (not cluster size)
    const maxCol = Math.max(...assignments.map((a) => a.column))
    const totalColumns = Math.min(Math.max(maxCol + 1, 1), MAX_VISIBLE_COLUMNS)

    for (const { act, column } of assignments) {
      result.set(act.id, { column, totalColumns })
    }
  }

  return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/shared && npx vitest run src/utils/overlapLayout.test.ts`
Expected: All 10 tests PASS

- [ ] **Step 5: Export from shared package barrel**

Add to `packages/shared/src/utils/index.ts` (at the end of the file):
```ts
export { computeOverlapLayout } from './overlapLayout'
export type { OverlapLayoutItem } from './overlapLayout'
```

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/utils/overlapLayout.ts packages/shared/src/utils/overlapLayout.test.ts packages/shared/src/utils/index.ts
git commit -m "feat: add computeOverlapLayout pure function with tests (TRA-205)"
```

---

## Chunk 2: EventBlock Column Positioning

### Task 2: Update EventBlock to accept and use column props

**Files:**
- Modify: `apps/web/components/calendar/EventBlock.tsx:14-20` (props interface)
- Modify: `apps/web/components/calendar/EventBlock.tsx:42-53` (style block)
- Modify: `apps/web/components/calendar/constants.ts` (add COLUMN_GAP, COLUMN_OUTER_PAD)

- [ ] **Step 1: Add constants**

In `apps/web/components/calendar/constants.ts`, add:
```ts
export const COLUMN_GAP = 4
export const COLUMN_OUTER_PAD = 4
```

- [ ] **Step 2: Update `EventBlockProps` interface**

In `EventBlock.tsx`, replace lines 14-20:
```ts
interface EventBlockProps {
  activity: CalendarActivity
  viewers?: UserAwareness[]
  isSelected?: boolean
  onSelect: (id: string) => void
  timeRangeStartHour: number
  column?: number
  totalColumns?: number
  hiddenCount?: number
}
```

- [ ] **Step 3: Update component destructuring**

Replace lines 22-28:
```ts
export function EventBlock({
  activity,
  viewers = [],
  isSelected = false,
  onSelect,
  timeRangeStartHour,
  column = 0,
  totalColumns = 1,
  hiddenCount = 0,
}: EventBlockProps) {
```

- [ ] **Step 4: Replace positioning logic in style block**

Replace lines 42-53 with:
```ts
  // Column positioning — uses percentage-based widths with fixed pixel gaps
  // COLUMN_OUTER_PAD preserves the existing 4px inset on each side of the day column
  const availableWidth = `(100% - ${2 * COLUMN_OUTER_PAD}px)`
  const colWidth = `(${availableWidth} - ${(totalColumns - 1) * COLUMN_GAP}px) / ${totalColumns}`
  const leftOffset = column === 0
    ? `${COLUMN_OUTER_PAD}px`
    : `${COLUMN_OUTER_PAD}px + ${column} * (${colWidth} + ${COLUMN_GAP}px)`

  const style: React.CSSProperties = {
    position: 'absolute',
    top: (activity.startHour - timeRangeStartHour) * HOUR_HEIGHT,
    height: Math.max(activity.duration * HOUR_HEIGHT - 2, 20),
    left: `calc(${leftOffset})`,
    width: `calc(${colWidth})`,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : isSelected ? 10 : 1,
    borderLeft: `3px solid ${borderColor}`,
    transition: isDragging ? undefined : 'left 150ms ease, width 150ms ease',
    ...(hasImage ? {} : { backgroundColor: bgColor }),
  }
```

Update import at top of file — replace `import { HOUR_HEIGHT } from './constants'` with:
```ts
import { HOUR_HEIGHT, COLUMN_GAP, COLUMN_OUTER_PAD } from './constants'
```

- [ ] **Step 5: Add "+N more" badge**

After the `activeViewers` block (before closing `</div>` at line 150), add:
```tsx
      {hiddenCount > 0 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-auto">
          +{hiddenCount} more
        </div>
      )}
```

- [ ] **Step 6: Verify build compiles**

Run: `npm run typecheck`
Expected: No new errors (props are optional with defaults, so existing callers still work)

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/calendar/EventBlock.tsx apps/web/components/calendar/constants.ts
git commit -m "feat: add column positioning and overflow badge to EventBlock (TRA-205)"
```

---

## Chunk 3: DayColumn Layout Integration

### Task 3: Wire `computeOverlapLayout` into DayColumn

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx:1-6` (imports)
- Modify: `apps/web/components/calendar/DayColumn.tsx:8-19` (props interface)
- Modify: `apps/web/components/calendar/DayColumn.tsx:99-101` (after hours block)
- Modify: `apps/web/components/calendar/DayColumn.tsx:185-195` (event blocks render)

- [ ] **Step 1: Add imports**

At top of `DayColumn.tsx`, add after existing imports:
```ts
import { computeOverlapLayout } from '@travyl/shared'
import { COLUMN_GAP, COLUMN_OUTER_PAD } from './constants'
```

- [ ] **Step 2: Add `pendingActivity` to props interface**

Add to `DayColumnProps` (after line 18):
```ts
  pendingActivity?: CalendarActivity | null
```

Update component destructuring to include `pendingActivity = null`.

- [ ] **Step 3: Add layout computation in component body**

After the `const hours` block (after line 101), add:
```ts
  // Compute overlap layout
  // If pendingActivity is an existing activity being moved, filter original to avoid double-counting
  const layoutActivities = pendingActivity
    ? [
        ...activities.filter((a) => a.id !== pendingActivity.id),
        pendingActivity,
      ]
    : activities

  const overlapLayout = computeOverlapLayout(layoutActivities)

  // Compute hidden counts: find which column-2 block should show the "+N more" badge
  // hiddenCount = count of activities in the same cluster whose column === -1
  const hiddenByCluster = new Map<string, number>()
  for (const [id, layout] of overlapLayout) {
    if (layout.column === -1) {
      const hiddenAct = layoutActivities.find((a) => a.id === id)!
      for (const [otherId, otherLayout] of overlapLayout) {
        if (otherLayout.column === 2) {
          const otherAct = layoutActivities.find((a) => a.id === otherId)!
          if (
            hiddenAct.startHour < otherAct.startHour + otherAct.duration &&
            otherAct.startHour < hiddenAct.startHour + hiddenAct.duration
          ) {
            hiddenByCluster.set(otherId, (hiddenByCluster.get(otherId) ?? 0) + 1)
            break
          }
        }
      }
    }
  }
```

- [ ] **Step 4: Update event blocks render to pass layout props**

Replace the event blocks section (lines 185-195):
```tsx
        {/* Event blocks */}
        {activities.map((activity) => {
          const layout = overlapLayout.get(activity.id)
          if (!layout || layout.column === -1) return null
          return (
            <EventBlock
              key={activity.id}
              activity={activity}
              viewers={viewers}
              isSelected={selectedEventId === activity.id}
              onSelect={onSelectEvent}
              timeRangeStartHour={timeRange.startHour}
              column={layout.column}
              totalColumns={layout.totalColumns}
              hiddenCount={hiddenByCluster.get(activity.id) ?? 0}
            />
          )
        })}

        {/* Ghost block for pending drag activity */}
        {pendingActivity && (() => {
          const layout = overlapLayout.get(pendingActivity.id)
          if (!layout || layout.column < 0) return null
          const availableWidth = `(100% - ${2 * COLUMN_OUTER_PAD}px)`
          const colWidth = `(${availableWidth} - ${(layout.totalColumns - 1) * COLUMN_GAP}px) / ${layout.totalColumns}`
          const leftOffset = layout.column === 0
            ? `${COLUMN_OUTER_PAD}px`
            : `${COLUMN_OUTER_PAD}px + ${layout.column} * (${colWidth} + ${COLUMN_GAP}px)`
          return (
            <div
              className="absolute rounded-md border-2 border-dashed border-blue-400 dark:border-blue-500 bg-blue-100/30 dark:bg-blue-500/15 pointer-events-none"
              style={{
                top: (pendingActivity.startHour - timeRange.startHour) * HOUR_HEIGHT,
                height: Math.max(pendingActivity.duration * HOUR_HEIGHT - 2, 20),
                left: `calc(${leftOffset})`,
                width: `calc(${colWidth})`,
                zIndex: 5,
              }}
            />
          )
        })()}
```

- [ ] **Step 5: Verify build compiles**

Run: `npm run typecheck`
Expected: No errors. `pendingActivity` is optional so existing callers don't break.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/calendar/DayColumn.tsx
git commit -m "feat: wire computeOverlapLayout into DayColumn with ghost block (TRA-205)"
```

---

## Chunk 4: Drag Preview Wiring

### Task 4: Add `pendingDrop` to `useCalendarDnd`

**Files:**
- Modify: `apps/web/components/calendar/hooks/useCalendarDnd.ts`

- [ ] **Step 1: Add `DragOverEvent` to dnd-kit import and add `pendingDrop` state**

Add `DragOverEvent` to the existing dnd-kit import (line 2-8). Keep all other existing imports on lines 9-12 unchanged (`suggestionToCalendarActivity`, `HOUR_HEIGHT`, `CalendarActivity`, `SuggestionCard`).

The dnd-kit import becomes:
```ts
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
```

After `const [activeId, setActiveId]` (line 32), add:
```ts
  const [pendingDrop, setPendingDrop] = useState<{
    dayIndex: number
    activity: CalendarActivity
  } | null>(null)
```

- [ ] **Step 2: Add `handleDragOver` handler**

After `handleDragStart` (after line 45), add:
```ts
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over, delta } = event
      if (!over) {
        setPendingDrop(null)
        return
      }

      const overIdStr = String(over.id)
      let newDay: number | null = null
      if (overIdStr.startsWith('day-')) {
        const parsed = parseInt(overIdStr.replace('day-', ''), 10)
        if (!isNaN(parsed)) newDay = parsed
      }
      if (newDay === null) {
        setPendingDrop(null)
        return
      }

      const dragData = active.data?.current as
        | { type: 'activity'; activity: CalendarActivity }
        | { type: 'suggestion'; suggestion: SuggestionCard }
        | undefined

      if (!dragData) return

      if (dragData.type === 'activity') {
        const rawHourDelta = delta.y / HOUR_HEIGHT
        const snappedHourDelta = Math.round(rawHourDelta * 2) / 2
        const currentStartHour = dragData.activity.startHour ?? 0
        const newStartHour = Math.max(0, Math.min(23, currentStartHour + snappedHourDelta))
        setPendingDrop({
          dayIndex: newDay,
          activity: { ...dragData.activity, day: newDay, startHour: newStartHour },
        })
      } else if (dragData.type === 'suggestion') {
        const overRect = over.rect
        const scrollTop = scrollRef.current?.scrollTop ?? 0
        const pointerY = (event.activatorEvent as PointerEvent)?.clientY ?? 0
        const dropY = pointerY + delta.y
        const gridRelativeY = dropY - overRect.top + scrollTop
        const rawHour = timeRangeStartHour + gridRelativeY / HOUR_HEIGHT
        const snappedStartHour = Math.max(0, Math.min(23, Math.round(rawHour * 2) / 2))
        setPendingDrop({
          dayIndex: newDay,
          activity: {
            id: `pending-${dragData.suggestion.id}`,
            title: dragData.suggestion.title,
            type: dragData.suggestion.category as CalendarActivity['type'],
            day: newDay,
            startHour: snappedStartHour,
            duration: dragData.suggestion.durationHours,
          },
        })
      }
    },
    [scrollRef, timeRangeStartHour],
  )
```

- [ ] **Step 3: Add `handleDragCancel` and update `handleDragEnd`**

After `handleDragOver`, add:
```ts
  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setPendingDrop(null)
  }, [])
```

In the existing `handleDragEnd` callback, add `setPendingDrop(null)` right after `setActiveId(null)` (line 49).

- [ ] **Step 4: Update return object**

Replace the return block (lines 100-105):
```ts
  return {
    sensors,
    activeId,
    pendingDrop,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  }
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/hooks/useCalendarDnd.ts
git commit -m "feat: add pendingDrop state and drag over/cancel handlers (TRA-205)"
```

---

### Task 5: Wire everything through WeekView, DayView, and CalendarDashboard

**Files:**
- Modify: `apps/web/components/calendar/WeekView.tsx`
- Modify: `apps/web/components/calendar/DayView.tsx`
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Update WeekView props and rendering**

In `WeekView.tsx`, add to `WeekViewProps` interface:
```ts
  pendingDrop?: { dayIndex: number; activity: CalendarActivity } | null
```

Update component destructuring to include `pendingDrop = null`.

In the `DayColumn` render (inside the `.map()`), add prop:
```ts
              pendingActivity={pendingDrop?.dayIndex === dayIndex ? pendingDrop.activity : null}
```

- [ ] **Step 2: Update DayView props and rendering**

In `DayView.tsx`, add to `DayViewProps` interface:
```ts
  pendingDrop?: { dayIndex: number; activity: CalendarActivity } | null
```

Update component destructuring to include `pendingDrop = null`.

In the `DayColumn` render, add prop:
```ts
            pendingActivity={pendingDrop?.dayIndex === dayIndex ? pendingDrop.activity : null}
```

- [ ] **Step 3: Update CalendarDashboard wiring**

In `CalendarDashboard.tsx`, update the destructuring of `useCalendarDnd` (line 80):
```ts
  const { sensors, activeId, pendingDrop, handleDragStart, handleDragOver, handleDragEnd, handleDragCancel } = useCalendarDnd({
```

Update the `<DndContext>` JSX (lines 300-303):
```tsx
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
```

Pass `pendingDrop` to `WeekView` (line 318) — add prop:
```tsx
                      pendingDrop={pendingDrop}
```

Pass `pendingDrop` to `DayView` (line 339) — add prop:
```tsx
                      pendingDrop={pendingDrop}
```

- [ ] **Step 4: Verify full build compiles**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 5: Run all shared tests to verify nothing broke**

Run: `cd packages/shared && npm test`
Expected: All tests pass including new overlapLayout tests

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/calendar/WeekView.tsx apps/web/components/calendar/DayView.tsx apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: wire pendingDrop through WeekView, DayView, and CalendarDashboard (TRA-205)"
```

---

## Chunk 5: Manual Verification

### Task 6: Manual smoke test

- [ ] **Step 1: Start dev server**

Run: `npm run web`

- [ ] **Step 2: Verify basic overlap rendering**

1. Open a trip with 2+ activities on the same day with overlapping times
2. Confirm they render side-by-side (not stacked)
3. Confirm non-overlapping activities render full-width as before
4. Confirm single-column activities maintain the same 4px outer padding as before

- [ ] **Step 3: Verify drag preview**

1. Drag an activity over a day with existing activities
2. Confirm existing blocks reflow (animate) to make room
3. Confirm ghost block appears at drop position with dashed border
4. Confirm blocks snap back when drag leaves or is cancelled

- [ ] **Step 4: Verify overflow badge**

1. Create 4+ overlapping activities on same day
2. Confirm only 3 columns visible
3. Confirm "+N more" badge appears on the 3rd column block

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: overlap column polish from manual testing (TRA-205)"
```
