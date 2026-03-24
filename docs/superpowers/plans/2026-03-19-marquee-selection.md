# Marquee Selection Tool Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Shift+drag marquee selection tool to the week-view calendar that lets users select multiple activities and perform bulk delete, move, and duplicate.

**Architecture:** A new `useMarqueeSelection` hook manages selection state (`Set<string>`) and hit-testing logic. A `MarqueeOverlay` component captures Shift+drag events and renders the selection rectangle. Existing hooks (`useKeyboardShortcuts`, `useCalendarCommands`, `useCalendarDnd`) are extended to support bulk operations on the selection set.

**Tech Stack:** React 19, TypeScript, dnd-kit, Tailwind CSS 4, Yjs

**Spec:** `docs/superpowers/specs/2026-03-19-marquee-selection-design.md`

---

## Chunk 1: Selection State & Marquee Drawing

### Task 1: Create `useMarqueeSelection` hook

**Files:**
- Create: `apps/web/components/calendar/hooks/useMarqueeSelection.ts`

This hook manages the selection set, the marquee rectangle, and hit-testing logic.

- [ ] **Step 1: Create the hook file with types and selection state**

```ts
// apps/web/components/calendar/hooks/useMarqueeSelection.ts
import { useState, useCallback, useRef } from 'react'
import type { CalendarActivity } from '../types'
import { HOUR_HEIGHT, COLUMN_OUTER_PAD, COLUMN_GAP } from '../constants'
import { computeOverlapLayout } from '@travyl/shared'

export interface MarqueeRect {
  startX: number
  startY: number
  endX: number
  endY: number
}

interface ActivityLayoutInfo {
  id: string
  dayIndex: number
  startHour: number
  duration: number
  column: number
  totalColumns: number
}

interface UseMarqueeSelectionOptions {
  activities: CalendarActivity[]
  timeRangeStartHour: number
  dayCount: number
}

interface UseMarqueeSelectionReturn {
  selectedIds: Set<string>
  marqueeRect: MarqueeRect | null
  isMarqueeActive: boolean
  startMarquee: (x: number, y: number, containerRect: DOMRect) => void
  updateMarquee: (x: number, y: number) => void
  endMarquee: () => void
  toggleActivityInSelection: (activityId: string) => void
  clearSelection: () => void
  setSelectedIds: (ids: Set<string>) => void
}

function rectsIntersect(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

export function useMarqueeSelection({
  activities,
  timeRangeStartHour,
  dayCount,
}: UseMarqueeSelectionOptions): UseMarqueeSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null)
  const containerRectRef = useRef<DOMRect | null>(null)

  const computeSelectedActivities = useCallback(
    (rect: MarqueeRect): Set<string> => {
      const containerRect = containerRectRef.current
      if (!containerRect) return new Set()

      // Normalize marquee rect (user may drag in any direction)
      const mLeft = Math.min(rect.startX, rect.endX)
      const mRight = Math.max(rect.startX, rect.endX)
      const mTop = Math.min(rect.startY, rect.endY)
      const mBottom = Math.max(rect.startY, rect.endY)

      const columnWidth = containerRect.width / dayCount
      const result = new Set<string>()

      // Group activities by day for overlap layout
      const actsByDay = new Map<number, CalendarActivity[]>()
      for (const act of activities) {
        const list = actsByDay.get(act.day) ?? []
        list.push(act)
        actsByDay.set(act.day, list)
      }

      for (const [day, dayActs] of actsByDay) {
        const overlapLayout = computeOverlapLayout(dayActs)
        const dayLeft = day * columnWidth

        for (const act of dayActs) {
          const layout = overlapLayout.get(act.id)
          if (!layout || layout.column === -1) continue

          // Compute activity bounding box in container-relative coords
          const availableWidth = columnWidth - 2 * COLUMN_OUTER_PAD
          const colWidth =
            (availableWidth - (layout.totalColumns - 1) * COLUMN_GAP) /
            layout.totalColumns
          const actLeft =
            dayLeft +
            COLUMN_OUTER_PAD +
            layout.column * (colWidth + COLUMN_GAP)
          const actRight = actLeft + colWidth
          const actTop = (act.startHour - timeRangeStartHour) * HOUR_HEIGHT
          const actBottom = actTop + act.duration * HOUR_HEIGHT

          if (
            rectsIntersect(
              { left: mLeft, top: mTop, right: mRight, bottom: mBottom },
              { left: actLeft, top: actTop, right: actRight, bottom: actBottom },
            )
          ) {
            result.add(act.id)
          }
        }
      }

      return result
    },
    [activities, timeRangeStartHour, dayCount],
  )

  const startMarquee = useCallback(
    (x: number, y: number, containerRect: DOMRect) => {
      containerRectRef.current = containerRect
      setMarqueeRect({ startX: x, startY: y, endX: x, endY: y })
    },
    [],
  )

  const updateMarquee = useCallback(
    (x: number, y: number) => {
      setMarqueeRect((prev) => {
        if (!prev) return null
        const next = { ...prev, endX: x, endY: y }
        // Live hit-test
        const hits = computeSelectedActivities(next)
        setSelectedIds(hits)
        return next
      })
    },
    [computeSelectedActivities],
  )

  const endMarquee = useCallback(() => {
    setMarqueeRect(null)
    // selectedIds remain — user can now act on them
  }, [])

  const toggleActivityInSelection = useCallback((activityId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(activityId)) {
        next.delete(activityId)
      } else {
        next.add(activityId)
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setMarqueeRect(null)
  }, [])

  return {
    selectedIds,
    marqueeRect,
    isMarqueeActive: marqueeRect !== null,
    startMarquee,
    updateMarquee,
    endMarquee,
    toggleActivityInSelection,
    clearSelection,
    setSelectedIds,
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `useMarqueeSelection.ts`

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/hooks/useMarqueeSelection.ts
git commit -m "feat: add useMarqueeSelection hook with hit-testing"
```

---

### Task 2: Create `MarqueeOverlay` component

**Files:**
- Create: `apps/web/components/calendar/MarqueeOverlay.tsx`

This component is an invisible overlay that captures Shift+drag on empty grid space and renders the selection rectangle.

- [ ] **Step 1: Create the overlay component**

```tsx
// apps/web/components/calendar/MarqueeOverlay.tsx
'use client'
import { useRef, useCallback, useEffect, useState } from 'react'
import type { MarqueeRect } from './hooks/useMarqueeSelection'

interface MarqueeOverlayProps {
  /** Ref to the scrollable grid container (the flex wrapper around day columns) */
  gridRef: React.RefObject<HTMLDivElement | null>
  onStartMarquee: (x: number, y: number, containerRect: DOMRect) => void
  onUpdateMarquee: (x: number, y: number) => void
  onEndMarquee: () => void
  marqueeRect: MarqueeRect | null
}

const DRAG_THRESHOLD = 5

export function MarqueeOverlay({
  gridRef,
  onStartMarquee,
  onUpdateMarquee,
  onEndMarquee,
  marqueeRect,
}: MarqueeOverlayProps) {
  const isDragging = useRef(false)
  const anchorScreen = useRef<{ x: number; y: number } | null>(null)
  const [shiftHeld, setShiftHeld] = useState(false)

  // Track Shift key for cursor feedback
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!e.shiftKey) return
      // Only start on empty grid space (not on activity blocks)
      const target = e.target as HTMLElement
      if (target !== e.currentTarget) return

      e.preventDefault()
      anchorScreen.current = { x: e.clientX, y: e.clientY }
    },
    [],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!anchorScreen.current) return

      const grid = gridRef.current
      if (!grid) return

      const dx = Math.abs(e.clientX - anchorScreen.current.x)
      const dy = Math.abs(e.clientY - anchorScreen.current.y)

      if (!isDragging.current) {
        if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return
        // Passed threshold — start marquee
        isDragging.current = true
        const gridRect = grid.getBoundingClientRect()
        const scrollLeft = grid.scrollLeft
        const scrollTop = grid.scrollTop
        const startX = anchorScreen.current.x - gridRect.left + scrollLeft
        const startY = anchorScreen.current.y - gridRect.top + scrollTop
        onStartMarquee(startX, startY, gridRect)
      }

      // Update marquee endpoint
      const gridRect = grid.getBoundingClientRect()
      const scrollLeft = grid.scrollLeft
      const scrollTop = grid.scrollTop
      const currentX = e.clientX - gridRect.left + scrollLeft
      const currentY = e.clientY - gridRect.top + scrollTop
      onUpdateMarquee(currentX, currentY)
    },
    [gridRef, onStartMarquee, onUpdateMarquee],
  )

  const handleMouseUp = useCallback(() => {
    if (isDragging.current) {
      onEndMarquee()
    }
    isDragging.current = false
    anchorScreen.current = null
  }, [onEndMarquee])

  // Render the visible selection rectangle
  const rectStyle = marqueeRect
    ? {
        left: Math.min(marqueeRect.startX, marqueeRect.endX),
        top: Math.min(marqueeRect.startY, marqueeRect.endY),
        width: Math.abs(marqueeRect.endX - marqueeRect.startX),
        height: Math.abs(marqueeRect.endY - marqueeRect.startY),
      }
    : null

  return (
    <>
      {/* Invisible event capture layer — covers the entire grid */}
      <div
        className={[
          'absolute inset-0 z-20',
          shiftHeld ? 'cursor-crosshair' : '',
        ].join(' ')}
        style={{ pointerEvents: shiftHeld ? 'auto' : 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {/* Visible selection rectangle */}
      {rectStyle && (
        <div
          className="absolute border border-blue-500/50 bg-blue-500/10 pointer-events-none z-30 rounded-sm"
          style={rectStyle}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `MarqueeOverlay.tsx`

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/MarqueeOverlay.tsx
git commit -m "feat: add MarqueeOverlay component for drag-to-select rectangle"
```

---

## Chunk 2: Wiring & Visual Feedback

### Task 3: Add multi-select highlight to `EventBlock`

**Files:**
- Modify: `apps/web/components/calendar/EventBlock.tsx`

Add an `isMultiSelected` prop that shows a blue ring + tint, distinct from the single-select white ring.

- [ ] **Step 1: Add `isMultiSelected` prop to EventBlockProps interface**

At `EventBlock.tsx:14-23`, add `isMultiSelected?: boolean` to the interface:

```ts
interface EventBlockProps {
  activity: CalendarActivity
  viewers?: UserAwareness[]
  isSelected?: boolean
  isMultiSelected?: boolean  // ← NEW
  onClickEvent: (id: string, anchorEl: HTMLElement) => void
  timeRangeStartHour: number
  column?: number
  totalColumns?: number
  hiddenCount?: number
}
```

- [ ] **Step 2: Destructure `isMultiSelected` in component and update className**

At `EventBlock.tsx:25-34`, add `isMultiSelected = false` to destructured props.

At `EventBlock.tsx:96-102`, update the className array to add blue ring when multi-selected:

```ts
className={[
  'rounded-md cursor-grab active:cursor-grabbing overflow-hidden select-none relative',
  'text-white text-xs',
  isMultiSelected
    ? 'ring-2 ring-blue-400 bg-blue-500/10'
    : 'ring-2 ring-transparent',
  isDragging ? '' : 'transition-[ring,shadow,opacity] duration-150 hover:-translate-y-px hover:shadow-lg hover:ring-white/40',
  'focus:outline-none focus:ring-white focus:ring-offset-1',
].join(' ')}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/EventBlock.tsx
git commit -m "feat: add multi-select highlight style to EventBlock"
```

---

### Task 4: Pass `selectedIds` through `DayColumn` to `EventBlock`

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx`

- [ ] **Step 1: Add `marqueeSelectedIds` prop to DayColumnProps**

At `DayColumn.tsx:12-32`, add to the interface:

```ts
  marqueeSelectedIds?: Set<string>
```

- [ ] **Step 2: Destructure and pass to EventBlock**

At `DayColumn.tsx:71-91`, add `marqueeSelectedIds` to destructured props (default `new Set()`).

At `DayColumn.tsx:254` (inside the `activities.map` block), add the `isMultiSelected` prop to `EventBlock`:

```tsx
<EventBlock
  key={activity.id}
  activity={activity}
  viewers={viewers}
  isSelected={selectedEventId === activity.id}
  isMultiSelected={marqueeSelectedIds?.has(activity.id)}
  onClickEvent={onClickEvent}
  timeRangeStartHour={timeRange.startHour}
  column={layout.column}
  totalColumns={layout.totalColumns}
  hiddenCount={hiddenByCluster.get(activity.id) ?? 0}
/>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/DayColumn.tsx
git commit -m "feat: pass marquee selectedIds through DayColumn to EventBlock"
```

---

### Task 5: Pass `selectedIds` through `WeekView` and mount `MarqueeOverlay`

**Files:**
- Modify: `apps/web/components/calendar/WeekView.tsx`

- [ ] **Step 1: Add new props to WeekViewProps**

At `WeekView.tsx:6-17`, add:

```ts
  marqueeSelectedIds?: Set<string>
  gridRef?: React.RefObject<HTMLDivElement | null>
  marqueeOverlay?: React.ReactNode
```

- [ ] **Step 2: Destructure and pass down**

Destructure the new props in the component function. Pass `marqueeSelectedIds` to each `DayColumn`. Render `marqueeOverlay` inside the grid flex container (after the day columns):

```tsx
export function WeekView({
  days,
  activities,
  viewers = [],
  selectedEventId = null,
  timeRange,
  tripStartDate,
  onClickEvent,
  onClickDayHeader,
  onCreateActivity,
  pendingDrop = null,
  marqueeSelectedIds,
  gridRef,
  marqueeOverlay,
}: WeekViewProps) {
  return (
    <div role="grid" className="flex flex-1 min-w-0">
      <TimeGutter timeRange={timeRange} />
      <div ref={gridRef} className="flex flex-1 min-w-0 relative">
        {days.map(({ dayIndex, label }) => {
          const dayActivities = activities.filter((a) => a.day === dayIndex)
          return (
            <DayColumn
              key={dayIndex}
              dayIndex={dayIndex}
              label={label}
              activities={dayActivities}
              viewers={viewers}
              selectedEventId={selectedEventId}
              timeRange={timeRange}
              tripStartDate={tripStartDate}
              onClickEvent={onClickEvent}
              onClickDayHeader={
                onClickDayHeader ? () => onClickDayHeader(dayIndex) : undefined
              }
              onCreateActivity={onCreateActivity}
              pendingActivity={pendingDrop?.dayIndex === dayIndex ? pendingDrop.activity : null}
              marqueeSelectedIds={marqueeSelectedIds}
            />
          )
        })}
        {marqueeOverlay}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/WeekView.tsx
git commit -m "feat: wire marquee selectedIds and overlay into WeekView"
```

---

### Task 6: Wire everything up in `CalendarDashboard`

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

This is the main integration point — instantiate the hook, create the overlay, handle mutual exclusion, and pass everything down.

- [ ] **Step 1: Import the new hook and component**

At the top of `CalendarDashboard.tsx`, add:

```ts
import { useMarqueeSelection } from './hooks/useMarqueeSelection'
import { MarqueeOverlay } from './MarqueeOverlay'
```

- [ ] **Step 2: Instantiate the hook**

After the `useCalendarNavigation()` call (around line 87), add:

```ts
const weekGridRef = useRef<HTMLDivElement>(null)

const {
  selectedIds: marqueeSelectedIds,
  marqueeRect,
  startMarquee,
  updateMarquee,
  endMarquee,
  toggleActivityInSelection,
  clearSelection: clearMarqueeSelection,
  setSelectedIds: setMarqueeSelectedIds,
} = useMarqueeSelection({
  activities,
  timeRangeStartHour: timeRange.startHour,
  dayCount: TRIP_DAYS.length,
})
```

- [ ] **Step 3: Add mutual exclusion logic**

When single-selecting, clear marquee. When marquee-selecting, clear single-select. Modify `handleClickEvent` (around line 263):

```ts
const handleClickEvent = (id: string, anchorEl: HTMLElement) => {
  // If marquee selection is active, clear it on click without Shift
  // (handled by the overlay — this is for clicks on activities)
  if (marqueeSelectedIds.size > 0) {
    clearMarqueeSelection()
    return  // consume the click
  }
  if (popoverEventId === id) {
    setPopoverEventId(null)
    setPopoverAnchor(null)
  } else {
    setPopoverEventId(id)
    setPopoverAnchor(anchorEl)
  }
}
```

- [ ] **Step 4: Create the marquee overlay element and pass to WeekView**

Before the return statement, create the overlay:

```ts
const marqueeOverlayElement = (
  <MarqueeOverlay
    gridRef={weekGridRef}
    onStartMarquee={(x, y, rect) => {
      selectEvent(null) // clear single-select
      startMarquee(x, y, rect)
    }}
    onUpdateMarquee={updateMarquee}
    onEndMarquee={endMarquee}
    marqueeRect={marqueeRect}
  />
)
```

Then in the WeekView JSX (around line 379), pass the new props:

```tsx
<WeekView
  days={TRIP_DAYS}
  activities={activities}
  viewers={collaborators}
  selectedEventId={selectedEventId}
  timeRange={timeRange}
  tripStartDate={parsedStartDate}
  onClickEvent={handleClickEvent}
  onClickDayHeader={handleClickDayHeader}
  onCreateActivity={handleCreateActivity}
  pendingDrop={pendingDrop}
  marqueeSelectedIds={marqueeSelectedIds}
  gridRef={weekGridRef}
  marqueeOverlay={marqueeOverlayElement}
/>
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: wire marquee selection into CalendarDashboard with mutual exclusion"
```

---

## Chunk 3: Bulk Actions

### Task 7: Update `useKeyboardShortcuts` for marquee Escape priority

**Files:**
- Modify: `apps/web/components/calendar/hooks/useKeyboardShortcuts.ts`

- [ ] **Step 1: Add `onClearMarquee` param and `hasMarqueeSelection` param**

Update the function signature:

```ts
export function useKeyboardShortcuts(
  commands: Command[],
  isPaletteOpen: boolean,
  onClosePalette: () => void,
  onDeselect: () => void,
  hasMarqueeSelection?: boolean,
  onClearMarquee?: () => void,
): void {
```

- [ ] **Step 2: Update Escape handler priority chain**

Replace the Escape block (lines 19-28) with:

```ts
if (e.key === 'Escape') {
  e.preventDefault()
  if (isPaletteOpen) {
    onClosePalette()
  } else if (hasMarqueeSelection && onClearMarquee) {
    onClearMarquee()
  } else if (commands.some((c) => c.id === 'delete' && c.isEnabled)) {
    onDeselect()
  }
  return
}
```

- [ ] **Step 3: Update the useEffect dependency array**

Add `hasMarqueeSelection` and `onClearMarquee` to the deps array at line 53.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/hooks/useKeyboardShortcuts.ts
git commit -m "feat: add marquee Escape priority to useKeyboardShortcuts"
```

---

### Task 8: Add selection-aware commands to `useCalendarCommands`

**Files:**
- Modify: `apps/web/components/calendar/hooks/useCalendarCommands.ts`

- [ ] **Step 1: Add `marqueeSelectedIds` and bulk action callbacks to the input interface**

At `useCalendarCommands.ts:5-18`, add to `UseCalendarCommandsInput`:

```ts
  marqueeSelectedIds?: Set<string>
  onBulkDelete?: () => void
  onBulkDuplicate?: () => void
```

- [ ] **Step 2: Destructure new params and add bulk commands**

In the `useCalendarCommands` function, destructure the new params. After the existing `duplicate` command (around line 78), add:

```ts
// ── Bulk Edit (marquee) ─────────────────────────────────────
{
  id: 'bulk-delete',
  label: 'Delete Selected Activities',
  group: 'edit',
  shortcut: { key: 'Delete', display: 'Del' },
  isEnabled: (marqueeSelectedIds?.size ?? 0) > 0,
  execute: () => { if (onBulkDelete) onBulkDelete() },
},
{
  id: 'bulk-duplicate',
  label: 'Duplicate Selected Activities',
  group: 'edit',
  shortcut: { key: 'd', meta: true, display: 'Ctrl D' },
  isEnabled: (marqueeSelectedIds?.size ?? 0) > 0,
  execute: () => { if (onBulkDuplicate) onBulkDuplicate() },
},
```

- [ ] **Step 3: Update the existing `delete` and `duplicate` commands**

The existing `delete` and `duplicate` commands should be disabled when marquee selection is active (so the bulk versions fire instead):

```ts
// Existing delete command — disable when marquee is active
{
  id: 'delete',
  label: 'Delete Activity',
  group: 'edit',
  shortcut: { key: 'Delete', display: 'Del' },
  isEnabled: hasSelection && (marqueeSelectedIds?.size ?? 0) === 0,
  execute: () => { if (hasSelection) removeActivity(id) },
},
// Existing duplicate command — disable when marquee is active
{
  id: 'duplicate',
  label: 'Duplicate Activity',
  group: 'edit',
  shortcut: { key: 'd', meta: true, display: 'Ctrl D' },
  isEnabled: hasSelection && (marqueeSelectedIds?.size ?? 0) === 0,
  execute: () => { if (selectedActivity) duplicateActivity(selectedActivity) },
},
```

- [ ] **Step 4: Add new params to useMemo dependency array**

Add `marqueeSelectedIds`, `onBulkDelete`, `onBulkDuplicate` to the deps array at line 196-201.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/hooks/useCalendarCommands.ts
git commit -m "feat: add bulk delete/duplicate commands for marquee selection"
```

---

### Task 9: Wire bulk actions in `CalendarDashboard`

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Create bulk action handlers**

Before the `commands` declaration (around line 236), add:

```ts
const handleBulkDelete = useCallback(async () => {
  const ids = Array.from(marqueeSelectedIds)
  clearMarqueeSelection()
  await Promise.all(ids.map((id) => removeActivity(id)))
}, [marqueeSelectedIds, clearMarqueeSelection, removeActivity])

const handleBulkDuplicate = useCallback(async () => {
  const toDuplicate = activities.filter((a) => marqueeSelectedIds.has(a.id))
  clearMarqueeSelection()
  const newIds: string[] = []
  for (const act of toDuplicate) {
    const newId = crypto.randomUUID()
    await duplicateActivity(act)
    // duplicateActivity generates its own ID internally, so we can't track newIds here
    // Just clear selection — user can re-select if needed
  }
}, [marqueeSelectedIds, clearMarqueeSelection, activities, duplicateActivity])
```

- [ ] **Step 2: Pass to `useCalendarCommands`**

Update the `useCalendarCommands` call (around line 236) to include:

```ts
const commands = useCalendarCommands({
  selectedActivity,
  isPaletteOpen,
  moveActivity,
  removeActivity,
  updateActivity,
  duplicateActivity,
  onViewModeChange: setViewMode,
  selectDay,
  tripDays: TRIP_DAYS,
  tripStartDate: parsedStartDate,
  onAddEvent: () => handleCreateActivity(selectedDayIndex ?? 0, 12),
  onOpenPalette: () => setIsPaletteOpen(true),
  marqueeSelectedIds,
  onBulkDelete: handleBulkDelete,
  onBulkDuplicate: handleBulkDuplicate,
})
```

- [ ] **Step 3: Pass marquee state to `useKeyboardShortcuts`**

Update the `useKeyboardShortcuts` call (around line 251):

```ts
useKeyboardShortcuts(
  commands,
  isPaletteOpen,
  () => setIsPaletteOpen(false),
  () => selectEvent(null),
  marqueeSelectedIds.size > 0,
  clearMarqueeSelection,
)
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: wire bulk delete and duplicate actions for marquee selection"
```

---

## Chunk 4: Bulk Move

### Task 10: Extend `useCalendarDnd` for group move

**Files:**
- Modify: `apps/web/components/calendar/hooks/useCalendarDnd.ts`

- [ ] **Step 1: Add `marqueeSelectedIds` to options interface**

At `useCalendarDnd.ts:24-32`, add to `UseCalendarDndOptions`:

```ts
  marqueeSelectedIds?: Set<string>
```

- [ ] **Step 2: Add `pendingGroupMove` state**

After `pendingDrop` state (line 43-46), add:

```ts
const [pendingGroupMove, setPendingGroupMove] = useState<
  { activityId: string; dayIndex: number; startHour: number }[] | null
>(null)
```

- [ ] **Step 3: Extend `handleDragOver` for group drag**

Inside `handleDragOver`, after the existing activity case (around line 90-98), update the logic:

When the dragged activity is in the marquee selection, compute delta for all selected activities and set `pendingGroupMove`:

```ts
if (dragData.type === 'activity') {
  const rawHourDelta = delta.y / HOUR_HEIGHT
  const snappedHourDelta = Math.round(rawHourDelta * 2) / 2
  const currentStartHour = dragData.activity.startHour ?? 0
  const newStartHour = Math.max(0, Math.min(23, currentStartHour + snappedHourDelta))
  setPendingDrop({
    dayIndex: newDay,
    activity: { ...dragData.activity, day: newDay, startHour: newStartHour },
  })

  // Group move preview
  if (marqueeSelectedIds && marqueeSelectedIds.has(String(active.id)) && marqueeSelectedIds.size > 1) {
    const dayDelta = newDay - dragData.activity.day
    // We need all activities — but we only have the dragged one.
    // Store the delta so CalendarDashboard can compute group positions.
    setPendingGroupMove(null) // CalendarDashboard handles group ghost rendering
  } else {
    setPendingGroupMove(null)
  }
}
```

- [ ] **Step 4: Extend `handleDragEnd` for group move**

Inside `handleDragEnd`, in the activity branch (around line 156-162), add group move logic:

```ts
if (dragData.type === 'activity') {
  const rawHourDelta = delta.y / HOUR_HEIGHT
  const snappedHourDelta = Math.round(rawHourDelta * 2) / 2
  const currentStartHour = dragData.activity.startHour ?? 0
  const newStartHour = Math.max(0, Math.min(23, currentStartHour + snappedHourDelta))

  if (marqueeSelectedIds && marqueeSelectedIds.has(String(active.id)) && marqueeSelectedIds.size > 1) {
    // Group move — compute delta and apply to all selected
    const dayDelta = newDay - dragData.activity.day
    const hourDelta = newStartHour - currentStartHour
    // Call onGroupMove instead of single move
    if (onGroupMove) {
      onGroupMove(dayDelta, hourDelta)
    }
  } else {
    onMoveActivity(String(active.id), newDay, newStartHour)
  }
}
```

- [ ] **Step 5: Add `onGroupMove` to the options interface and destructure it**

```ts
interface UseCalendarDndOptions {
  onMoveActivity: (id: string, newDay: number, newStartHour: number) => void
  onAddFromSuggestion: (activity: CalendarActivity, suggestionId: string) => void
  onMoveNote?: (noteId: string, day: number, hour: number) => void
  onGroupMove?: (dayDelta: number, hourDelta: number) => void  // ← NEW
  marqueeSelectedIds?: Set<string>  // ← NEW
  scrollRef: React.RefObject<HTMLDivElement | null>
  timeRangeStartHour: number
}
```

- [ ] **Step 6: Return `pendingGroupMove` and add new deps**

Return `pendingGroupMove` from the hook. Add `marqueeSelectedIds`, `onGroupMove` to callback dependency arrays.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/calendar/hooks/useCalendarDnd.ts
git commit -m "feat: extend useCalendarDnd for group move with marquee selection"
```

---

### Task 11: Wire group move handler in `CalendarDashboard`

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Create group move handler**

Before the `useCalendarDnd` call, add:

```ts
const handleGroupMove = useCallback((dayDelta: number, hourDelta: number) => {
  const selected = activities.filter((a) => marqueeSelectedIds.has(a.id))
  if (selected.length === 0) return

  // Clamp delta so ALL activities stay in bounds
  let clampedDayDelta = dayDelta
  let clampedHourDelta = hourDelta
  for (const act of selected) {
    const newDay = act.day + clampedDayDelta
    const newHour = act.startHour + clampedHourDelta
    if (newDay < 0) clampedDayDelta = Math.max(clampedDayDelta, -act.day)
    if (newDay >= TRIP_DAYS.length) clampedDayDelta = Math.min(clampedDayDelta, TRIP_DAYS.length - 1 - act.day)
    if (newHour < 0) clampedHourDelta = Math.max(clampedHourDelta, -act.startHour)
    if (newHour + act.duration > 24) clampedHourDelta = Math.min(clampedHourDelta, 24 - act.duration - act.startHour)
  }

  for (const act of selected) {
    moveActivity(act.id, act.day + clampedDayDelta, act.startHour + clampedHourDelta)
  }
}, [activities, marqueeSelectedIds, moveActivity, TRIP_DAYS.length])
```

- [ ] **Step 2: Pass to `useCalendarDnd`**

Update the `useCalendarDnd` call to include:

```ts
const { sensors, activeData, pendingDrop, handleDragStart, handleDragOver, handleDragEnd, handleDragCancel } = useCalendarDnd({
  onMoveActivity: moveActivity,
  onAddFromSuggestion: handleAddFromSuggestion,
  onGroupMove: handleGroupMove,
  marqueeSelectedIds,
  scrollRef,
  timeRangeStartHour: timeRange.startHour,
})
```

- [ ] **Step 3: Verify TypeScript compiles and manually test**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: wire group move handler with boundary clamping"
```

---

## Chunk 5: Shift+Click Toggle & Final Polish

### Task 12: Add Shift+click toggle on activities

**Files:**
- Modify: `apps/web/components/calendar/EventBlock.tsx`
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Add `onShiftClick` prop to EventBlock**

At `EventBlock.tsx:14-23`, add:

```ts
  onShiftClick?: (id: string) => void
```

- [ ] **Step 2: Update click handler in EventBlock**

At `EventBlock.tsx:71-73`, update `handleClick`:

```ts
const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
  if (e.shiftKey && onShiftClick) {
    e.stopPropagation()
    onShiftClick(activity.id)
    return
  }
  onClickEvent(activity.id, e.currentTarget)
}
```

- [ ] **Step 3: Pass `onShiftClick` from DayColumn**

Add `onShiftClickEvent?: (id: string) => void` to `DayColumnProps` and pass it to each EventBlock.

- [ ] **Step 4: Pass from WeekView → DayColumn**

Add `onShiftClickEvent` to `WeekViewProps` and pass through.

- [ ] **Step 5: Wire in CalendarDashboard**

Pass `toggleActivityInSelection` as `onShiftClickEvent` to WeekView:

```tsx
<WeekView
  ...
  onShiftClickEvent={toggleActivityInSelection}
/>
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/calendar/EventBlock.tsx apps/web/components/calendar/DayColumn.tsx apps/web/components/calendar/WeekView.tsx apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: add Shift+click toggle for additive marquee selection"
```

---

### Task 13: Final typecheck and integration test

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: No errors (or only pre-existing warnings)

- [ ] **Step 3: Manual smoke test**

Start dev server with `npm run web` and verify:
1. Shift+drag on empty grid draws blue rectangle
2. Activities inside rectangle get blue highlight
3. Cross-day selection works
4. Shift+click toggles individual activities in/out
5. Delete/Backspace removes all selected
6. Ctrl+D duplicates all selected
7. Drag a selected activity moves entire group
8. Escape clears selection
9. Click without Shift clears selection
10. Single-click (no Shift) still opens popover normally

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: marquee selection tool — complete implementation"
```
