# Event Block Resize — Design Spec

## Goal

Allow users to resize EventBlocks on the calendar by dragging their top and bottom edges, changing the activity's start time and duration with 15-minute snapping.

## Scope

- Resize handles on top and bottom edges of EventBlock
- Custom pointer tracking (no new dependencies)
- 15-minute snap increments
- Live visual preview during resize
- Commit via existing `updateActivity` on pointer release
- No changes to move-drag or popover behavior

## Hook: useResizeHandles

A custom hook that encapsulates all resize pointer tracking logic.

### Interface

```ts
interface UseResizeHandlesOptions {
  startHour: number
  duration: number
  timeRangeStartHour: number
  timeRangeEndHour: number
  onResize: (newStartHour: number, newDuration: number) => void
}

interface UseResizeHandlesReturn {
  isResizing: boolean
  previewStartHour: number | null
  previewDuration: number | null
  topHandleProps: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
  bottomHandleProps: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
}
```

### Behavior

**On `pointerDown` (either handle):**
1. Call `e.stopPropagation()` AND `e.nativeEvent.stopImmediatePropagation()` — the former stops React synthetic event bubbling, the latter stops dnd-kit's native document-level `PointerSensor` listener from seeing the event
2. Call `e.preventDefault()` to prevent text selection
3. Capture the pointer via `(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)`
4. Record starting Y position (`startY`), original `startHour`, original `duration`, and computed `bottomEdge = startHour + duration` (used by top handle to keep the bottom edge fixed)
5. Initialize preview state: `previewStartHour = startHour`, `previewDuration = duration` (must be set before `isResizing` flips to avoid a null-preview render frame)
6. Set `isResizing = true`

**On `pointerMove`:**
If `isResizing` is false, no-op (guards against pointer moves before any pointerDown has occurred). When resizing:
1. Compute pixel delta from `startY`
2. Convert to hour delta: `deltaY / HOUR_HEIGHT`
3. Snap to 0.25h increments: `Math.round(delta * 4) / 4`
4. **Top handle:** Compute `newStartHour = originalStartHour + snappedDelta`, derive `newDuration = bottomEdge - newStartHour`. Clamp per constraint precedence rules below.
5. **Bottom handle:** Compute `newDuration = originalDuration + snappedDelta`. Clamp: `duration = max(0.25, min(newDuration, timeRangeEndHour - startHour))`. If the block is already at the end of the range and the computed result would be below 0.25, keep `duration = 0.25` (minimum duration takes precedence over upper-bound clamp).
6. Update `previewStartHour` and `previewDuration`

**On `pointerUp`:**
1. Release pointer capture via `(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)`
2. Call `onResize(finalStartHour, finalDuration)` with the snapped values
3. Clear preview state (`null`), set `isResizing = false`

**On `pointerCancel`:**
1. Release pointer capture via `(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)`
2. Clear preview state (`null`), set `isResizing = false`
3. Do NOT call `onResize` (the gesture was interrupted, not completed)

This prevents `isResizing` from getting stuck if the browser cancels the pointer (e.g. touch cancel, browser interrupt).

**Listeners:** Use pointer capture (`setPointerCapture`) rather than document-level listeners. Pointer capture routes all pointer events to the capturing element even if the pointer leaves it, so `onPointerMove`, `onPointerUp`, and `onPointerCancel` handlers on the handle div itself are sufficient. The hook returns these as part of `topHandleProps` / `bottomHandleProps`:

### Snapping

Round to nearest 0.25 hours (15 minutes). Example: dragging 37px at `HOUR_HEIGHT=60` → `37/60 = 0.617h` → snaps to `0.5h` (30 min).

### Constraints

- Minimum duration: 0.25 hours (15 minutes)
- Top handle: `startHour` cannot go below `timeRangeStartHour`
- Bottom handle: `startHour + duration` cannot exceed `timeRangeEndHour`
- Top handle: adjusting `startHour` also adjusts `duration` to keep the bottom edge fixed
- **Constraint precedence (top handle):** Clamp `startHour` to `timeRangeStartHour` first, then compute `duration` from the fixed bottom edge. If the resulting duration is < 0.25, clamp duration to 0.25 and recompute startHour = bottomEdge − 0.25. The time-range boundary takes priority over the minimum-duration constraint.

## EventBlock changes

### Resize handle elements

Two divs at the top and bottom edges of the EventBlock:

```
Position: absolute, left: 0, right: 0
Height: 6px
Top handle: top: 0
Bottom handle: bottom: 0
Cursor: ns-resize (via cursor-ns-resize class)
z-index: 2 (above block content)
```

**Visibility:**
- Default: invisible (`opacity-0`)
- Hover on EventBlock (via group-hover): fade in as 2px white/30% line (`opacity-100`, with a 2px-tall inner bar via `after` pseudo-element or a centered border)
- During resize: active handle at full opacity

**Event handling:**
- `onPointerDown` from `useResizeHandles` (top or bottom props)
- `onClick` with `e.stopPropagation()` to prevent popover opening after resize
- Handles must NOT have `{...listeners}` from dnd-kit (those stay on the main div)

### EventBlock root div changes

The EventBlock root `<div>` must add the Tailwind `group` class so that resize handle visibility can use `group-hover:opacity-100`. The existing `ring-2 ring-transparent` must be conditionally swapped: when `isResizing` is true, replace with `ring-2 ring-white/50`; otherwise keep `ring-2 ring-transparent`.

### Rendering during resize

When `isResizing` is true:
- Use `previewStartHour` and `previewDuration` instead of `activity.startHour` and `activity.duration` for computing `top` and `height` in the style object
- Replace the ring class: `ring-2 ring-transparent` → `ring-2 ring-white/50`
- Omit focus ring classes: when `isResizing` is true, exclude `focus:ring-white focus:ring-offset-1` from the class string entirely (do not append `focus:ring-transparent` alongside them, as Tailwind specificity between same-variant classes is unpredictable)
- The time range label updates in both render branches (image path and text-only path): call `formatTimeRange({ ...activity, startHour: previewStartHour, duration: previewDuration })` to produce the updated label using the existing utility

### New props

```ts
onResize?: (id: string, newStartHour: number, newDuration: number) => void
timeRangeEndHour?: number
```

Both are optional. If `onResize` is not provided, resize handles are not rendered and `timeRangeEndHour` is unused. DayColumn always passes both: `onResize={onResize}` and `timeRangeEndHour={timeRange.endHour}`.

## Prop threading

The `onResize` callback flows through the component tree:

1. **CalendarDashboard** — creates `handleResize`:
   ```ts
   const handleResize = (id: string, newStartHour: number, newDuration: number) => {
     updateActivity(id, { startHour: newStartHour, duration: newDuration })
   }
   ```

2. **WeekView / DayView** — accept `onResize?: (id: string, newStartHour: number, newDuration: number) => void`, pass through to DayColumn

3. **DayColumn** — accept `onResize?: (id: string, newStartHour: number, newDuration: number) => void` in `DayColumnProps`, pass to each EventBlock along with `timeRangeEndHour={timeRange.endHour}`

4. **EventBlock** — receive `onResize?` and `timeRangeEndHour`, always call `useResizeHandles` (hooks cannot be called conditionally). When `onResize` is defined, pass `onResize: (s, d) => onResize(activity.id, s, d)` and `timeRangeEndHour: timeRangeEndHour!`. When `onResize` is undefined, pass `onResize: () => {}` and `timeRangeEndHour: timeRangeStartHour + 24` as inert fallbacks — the hook is always invoked but the handle divs are only rendered when `onResize` is defined.

## Files to create/modify

| File | Action |
|---|---|
| `apps/web/components/calendar/hooks/useResizeHandles.ts` | **Create** — pointer tracking, snapping, preview state |
| `apps/web/components/calendar/EventBlock.tsx` | **Modify** — add resize handle divs, integrate hook, accept `onResize` prop |
| `apps/web/components/calendar/DayColumn.tsx` | **Modify** — accept and pass `onResize` |
| `apps/web/components/calendar/WeekView.tsx` | **Modify** — accept and pass `onResize` |
| `apps/web/components/calendar/DayView.tsx` | **Modify** — accept and pass `onResize` |
| `apps/web/components/calendar/CalendarDashboard.tsx` | **Modify** — create `handleResize`, pass to views |

## Out of scope

- Resizing multi-day events (endDay changes)
- Resize via keyboard
- Collaborative presence during resize (no broadcast of resize-in-progress)
- Undo/redo for resize
