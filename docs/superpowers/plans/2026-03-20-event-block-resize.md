# Event Block Resize Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to resize EventBlocks by dragging top/bottom edges with 15-minute snapping.

**Architecture:** A `useResizeHandles` hook owns all pointer tracking, snapping, and preview state. EventBlock renders two invisible handle divs that appear on hover. Prop threading carries `onResize` from CalendarDashboard through WeekView/DayView/DayColumn to EventBlock.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, pointer capture API, existing `@dnd-kit/core` (no changes to dnd-kit itself)

**Spec:** `docs/superpowers/specs/2026-03-19-event-block-resize-design.md`

---

## Chunk 1: Hook + Integration

### Task 1: Create useResizeHandles hook

**Files:**
- Create: `apps/web/components/calendar/hooks/useResizeHandles.ts`

The hook encapsulates all resize pointer tracking. It uses `setPointerCapture` so all pointer events route to the capturing element — no document-level listeners needed. It snaps to 0.25h (15 min) increments and clamps within time range boundaries.

- [ ] **Step 1: Create the hook file with full implementation**

```ts
// apps/web/components/calendar/hooks/useResizeHandles.ts
'use client'

import { useRef, useState, useCallback } from 'react'
import { HOUR_HEIGHT } from '../constants'

interface UseResizeHandlesOptions {
  startHour: number
  duration: number
  timeRangeStartHour: number
  timeRangeEndHour: number
  onResize: (newStartHour: number, newDuration: number) => void
}

interface HandleProps {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
}

interface UseResizeHandlesReturn {
  isResizing: boolean
  previewStartHour: number | null
  previewDuration: number | null
  topHandleProps: HandleProps
  bottomHandleProps: HandleProps
}

type Edge = 'top' | 'bottom'

const MIN_DURATION = 0.25

function snap(value: number): number {
  return Math.round(value * 4) / 4
}

export function useResizeHandles({
  startHour,
  duration,
  timeRangeStartHour,
  timeRangeEndHour,
  onResize,
}: UseResizeHandlesOptions): UseResizeHandlesReturn {
  const [isResizing, setIsResizing] = useState(false)
  const [previewStartHour, setPreviewStartHour] = useState<number | null>(null)
  const [previewDuration, setPreviewDuration] = useState<number | null>(null)

  const edgeRef = useRef<Edge>('bottom')
  const startYRef = useRef(0)
  const origStartHourRef = useRef(0)
  const origDurationRef = useRef(0)
  const bottomEdgeRef = useRef(0)

  const computePreview = useCallback(
    (clientY: number) => {
      const deltaY = clientY - startYRef.current
      const deltaHours = snap(deltaY / HOUR_HEIGHT)

      if (edgeRef.current === 'top') {
        // Top handle: move startHour, keep bottom edge fixed
        let newStart = origStartHourRef.current + deltaHours
        let newDuration = bottomEdgeRef.current - newStart

        // Constraint precedence: clamp startHour first
        newStart = Math.max(timeRangeStartHour, newStart)
        newDuration = bottomEdgeRef.current - newStart

        // Then enforce minimum duration
        if (newDuration < MIN_DURATION) {
          newDuration = MIN_DURATION
          newStart = bottomEdgeRef.current - MIN_DURATION
        }

        setPreviewStartHour(newStart)
        setPreviewDuration(newDuration)
      } else {
        // Bottom handle: move duration, keep top edge fixed
        const rawDuration = origDurationRef.current + deltaHours
        const newDuration = Math.max(
          MIN_DURATION,
          Math.min(rawDuration, timeRangeEndHour - origStartHourRef.current),
        )

        setPreviewStartHour(origStartHourRef.current)
        setPreviewDuration(newDuration)
      }
    },
    [timeRangeStartHour, timeRangeEndHour],
  )

  const handlePointerDown = useCallback(
    (edge: Edge) => (e: React.PointerEvent) => {
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
      e.preventDefault()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

      edgeRef.current = edge
      startYRef.current = e.clientY
      origStartHourRef.current = startHour
      origDurationRef.current = duration
      bottomEdgeRef.current = startHour + duration

      // Initialize preview before setting isResizing to avoid null-preview frame
      setPreviewStartHour(startHour)
      setPreviewDuration(duration)
      setIsResizing(true)
    },
    [startHour, duration],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isResizing) return
      computePreview(e.clientY)
    },
    [isResizing, computePreview],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isResizing) return
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)

      // Compute final values
      computePreview(e.clientY)

      // Read the latest preview — compute inline to avoid stale closure
      const deltaY = e.clientY - startYRef.current
      const deltaHours = snap(deltaY / HOUR_HEIGHT)

      let finalStart: number
      let finalDuration: number

      if (edgeRef.current === 'top') {
        finalStart = origStartHourRef.current + deltaHours
        finalDuration = bottomEdgeRef.current - finalStart
        finalStart = Math.max(timeRangeStartHour, finalStart)
        finalDuration = bottomEdgeRef.current - finalStart
        if (finalDuration < MIN_DURATION) {
          finalDuration = MIN_DURATION
          finalStart = bottomEdgeRef.current - MIN_DURATION
        }
      } else {
        finalStart = origStartHourRef.current
        const rawDuration = origDurationRef.current + deltaHours
        finalDuration = Math.max(
          MIN_DURATION,
          Math.min(rawDuration, timeRangeEndHour - origStartHourRef.current),
        )
      }

      onResize(finalStart, finalDuration)
      setPreviewStartHour(null)
      setPreviewDuration(null)
      setIsResizing(false)
    },
    [isResizing, computePreview, onResize, timeRangeStartHour, timeRangeEndHour],
  )

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (!isResizing) return
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      setPreviewStartHour(null)
      setPreviewDuration(null)
      setIsResizing(false)
      // Do NOT call onResize — gesture was interrupted
    },
    [isResizing],
  )

  const topHandleProps: HandleProps = {
    onPointerDown: handlePointerDown('top'),
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  }

  const bottomHandleProps: HandleProps = {
    onPointerDown: handlePointerDown('bottom'),
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  }

  return {
    isResizing,
    previewStartHour,
    previewDuration,
    topHandleProps,
    bottomHandleProps,
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `useResizeHandles.ts`

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/hooks/useResizeHandles.ts
git commit -m "feat: add useResizeHandles hook for EventBlock resize"
```

---

### Task 2: Integrate resize into EventBlock

**Files:**
- Modify: `apps/web/components/calendar/EventBlock.tsx`

Add two new optional props (`onResize`, `timeRangeEndHour`), call `useResizeHandles` unconditionally, render resize handle divs when `onResize` is defined, and use preview values during resize for positioning and labels.

- [ ] **Step 1: Add new props to EventBlockProps interface**

In `apps/web/components/calendar/EventBlock.tsx`, add to the `EventBlockProps` interface (after line 22, the `hiddenCount` prop):

```ts
  onResize?: (id: string, newStartHour: number, newDuration: number) => void
  timeRangeEndHour?: number
```

And add to the destructuring (after `hiddenCount = 0`):

```ts
  onResize,
  timeRangeEndHour,
```

- [ ] **Step 2: Add the useResizeHandles import and hook call**

Add import at top of file (after the `useCalendarThemeContext` import):

```ts
import { useResizeHandles } from './hooks/useResizeHandles'
```

Inside the component body, after the `useCalendarThemeContext()` call (after line 41), add:

```ts
  const {
    isResizing,
    previewStartHour,
    previewDuration,
    topHandleProps,
    bottomHandleProps,
  } = useResizeHandles({
    startHour: activity.startHour,
    duration: activity.duration,
    timeRangeStartHour,
    timeRangeEndHour: onResize ? timeRangeEndHour! : timeRangeStartHour + 24,
    onResize: onResize
      ? (s, d) => onResize(activity.id, s, d)
      : () => {},
  })
```

- [ ] **Step 3: Add displayActivity helper and update style + hasImage**

After the `useCalendarThemeContext()` and `useResizeHandles()` calls, before the color/hasImage computations, add a `displayActivity` variable that resolves preview vs. actual values in one place. Then use it for `hasImage`, `top`, `height`, and labels.

Add after the `useResizeHandles` call:

```ts
  // Resolve preview values during resize into a single object
  const displayActivity = isResizing && previewStartHour != null && previewDuration != null
    ? { ...activity, startHour: previewStartHour, duration: previewDuration }
    : activity
```

Update the `hasImage` line to use `displayActivity.duration`:

```ts
  const hasImage = !!(activity.image && displayActivity.duration >= 1)
```

Then update the `top` and `height` lines in the style object. Change:

```ts
    top: (activity.startHour - timeRangeStartHour) * HOUR_HEIGHT,
    height: Math.max(activity.duration * HOUR_HEIGHT - 2, 20),
```

To:

```ts
    top: (displayActivity.startHour - timeRangeStartHour) * HOUR_HEIGHT,
    height: Math.max(displayActivity.duration * HOUR_HEIGHT - 2, 20),
```

- [ ] **Step 4: Update className array on root div**

The root div's className array needs three changes:
1. Add `group` class for `group-hover` on resize handles
2. Swap `ring-transparent` to `ring-white/50` when resizing
3. Omit focus ring classes when resizing

Replace the className array (lines 96-102):

```ts
      className={[
        'group rounded-md cursor-grab active:cursor-grabbing overflow-hidden select-none relative',
        'text-white text-xs',
        isResizing ? 'ring-2 ring-white/50' : 'ring-2 ring-transparent',
        isDragging ? '' : 'transition-[ring,shadow,opacity] duration-150 hover:-translate-y-px hover:shadow-lg hover:ring-white/40',
        isResizing ? 'focus:outline-none' : 'focus:outline-none focus:ring-white focus:ring-offset-1',
      ].join(' ')}
```

- [ ] **Step 5: Update time range labels in both render branches**

`displayActivity` was already created in Step 3. Now use it for the time range labels.

In the **image render branch** (line 130), replace:
```ts
              {formatTimeRange(activity)}
```
with:
```ts
              {formatTimeRange(displayActivity)}
```

In the **text-only render branch** (line 145), replace:
```ts
          <span className="opacity-80 truncate text-white">{formatTimeRange(activity)}</span>
```
with:
```ts
          <span className="opacity-80 truncate text-white">{formatTimeRange(displayActivity)}</span>
```

- [ ] **Step 6: Add resize handle divs**

Add the resize handle divs inside the root div, just before the closing `</div>` (before line 175). They are only rendered when `onResize` is defined:

```tsx
      {onResize && (
        <>
          {/* Top resize handle */}
          <div
            className={[
              'absolute left-0 right-0 top-0 h-1.5 cursor-ns-resize z-[2]',
              isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              'transition-opacity duration-150',
            ].join(' ')}
            onClick={(e) => e.stopPropagation()}
            {...topHandleProps}
          >
            <div className="absolute inset-x-0 top-0 h-0.5 bg-white/30" />
          </div>
          {/* Bottom resize handle */}
          <div
            className={[
              'absolute left-0 right-0 bottom-0 h-1.5 cursor-ns-resize z-[2]',
              isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              'transition-opacity duration-150',
            ].join(' ')}
            onClick={(e) => e.stopPropagation()}
            {...bottomHandleProps}
          >
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/30" />
          </div>
        </>
      )}
```

Both handles show at full opacity during any resize (the hook does not expose which edge is active, keeping its internals private).

- [ ] **Step 7: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors. EventBlock now accepts `onResize` and `timeRangeEndHour` as optional props (existing call sites don't pass them, which is fine).

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/calendar/EventBlock.tsx
git commit -m "feat: integrate resize handles into EventBlock"
```

---

### Task 3: Thread onResize through DayColumn

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx`

Add `onResize` to `DayColumnProps` and pass it (along with `timeRangeEndHour`) to each EventBlock.

- [ ] **Step 1: Add onResize to DayColumnProps interface**

In `apps/web/components/calendar/DayColumn.tsx`, add to the `DayColumnProps` interface (after `onDeleteNote` on line 31):

```ts
  onResize?: (id: string, newStartHour: number, newDuration: number) => void
```

- [ ] **Step 2: Destructure onResize in component**

Add `onResize` to the destructuring (after `onDeleteNote` on line 90):

```ts
  onResize,
```

- [ ] **Step 3: Pass onResize and timeRangeEndHour to EventBlock**

In the EventBlock render (around line 254-264), add two new props after `hiddenCount`:

```tsx
              onResize={onResize}
              timeRangeEndHour={timeRange.endHour}
```

The full EventBlock JSX becomes:

```tsx
            <EventBlock
              key={activity.id}
              activity={activity}
              viewers={viewers}
              isSelected={selectedEventId === activity.id}
              onClickEvent={onClickEvent}
              timeRangeStartHour={timeRange.startHour}
              column={layout.column}
              totalColumns={layout.totalColumns}
              hiddenCount={hiddenByCluster.get(activity.id) ?? 0}
              onResize={onResize}
              timeRangeEndHour={timeRange.endHour}
            />
```

- [ ] **Step 4: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/DayColumn.tsx
git commit -m "feat: thread onResize through DayColumn to EventBlock"
```

---

### Task 4: Thread onResize through WeekView and DayView

**Files:**
- Modify: `apps/web/components/calendar/WeekView.tsx`
- Modify: `apps/web/components/calendar/DayView.tsx`

Both components accept `onResize?` and pass it through to DayColumn.

- [ ] **Step 1: Add onResize to WeekViewProps**

In `apps/web/components/calendar/WeekView.tsx`, add to `WeekViewProps` (after `pendingDrop` on line 16):

```ts
  onResize?: (id: string, newStartHour: number, newDuration: number) => void
```

Add to the destructuring (after `pendingDrop = null`):

```ts
  onResize,
```

Add to the DayColumn JSX (after the `pendingActivity` prop, around line 52):

```tsx
              onResize={onResize}
```

- [ ] **Step 2: Add onResize to DayViewProps**

In `apps/web/components/calendar/DayView.tsx`, add to `DayViewProps` (after `pendingDrop` on line 16):

```ts
  onResize?: (id: string, newStartHour: number, newDuration: number) => void
```

Add to the destructuring (after `pendingDrop = null`):

```ts
  onResize,
```

Add to the DayColumn JSX (after `pendingActivity`, around line 48):

```tsx
          onResize={onResize}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/WeekView.tsx apps/web/components/calendar/DayView.tsx
git commit -m "feat: thread onResize through WeekView and DayView"
```

---

### Task 5: Wire handleResize in CalendarDashboard

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

Create `handleResize` callback and pass it to both WeekView and DayView.

- [ ] **Step 1: Create handleResize callback**

In `apps/web/components/calendar/CalendarDashboard.tsx`, add the callback after `handleCreateActivity` (after line 234). `useCallback` is already imported on line 3.

```ts
  const handleResize = useCallback((id: string, newStartHour: number, newDuration: number) => {
    updateActivity(id, { startHour: newStartHour, duration: newDuration })
  }, [updateActivity])
```

- [ ] **Step 2: Pass handleResize to WeekView**

In the WeekView JSX (around line 379-390), add after `pendingDrop`:

```tsx
                      onResize={handleResize}
```

- [ ] **Step 3: Pass handleResize to DayView**

In the DayView JSX (around line 401-412), add after `pendingDrop`:

```tsx
                      onResize={handleResize}
```

- [ ] **Step 4: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 5: Manual smoke test**

Run: `npm run web`

Test in the browser:
1. Hover over an EventBlock — two thin white lines should appear at top and bottom edges
2. Drag the bottom handle down — the block should grow in 15-minute increments
3. Drag the top handle up — the block should grow upward (bottom edge stays fixed)
4. Release — the block should snap to its new size and persist
5. Click an EventBlock — popover should still open (handles don't interfere)
6. Drag an EventBlock to move it — move drag should still work normally
7. Resize to minimum (15 min) — block should not shrink further

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: wire handleResize in CalendarDashboard to complete resize feature"
```
