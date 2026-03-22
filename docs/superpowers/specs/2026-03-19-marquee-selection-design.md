# Marquee Selection Tool — Design Spec

## Goal

Add a drag-to-select (marquee) tool to the trip calendar that lets users select multiple activities by drawing a rectangle, then perform bulk actions on the selection: delete, move, and duplicate.

## Activation

- **Shift+drag on empty grid space** starts the marquee (requires 5px movement threshold to distinguish from Shift+click, which currently creates a note in DayColumn)
- **Shift+click an activity** toggles it in/out of the selection (additive)
- Normal drag on an activity still moves it (existing dnd-kit behavior unchanged)
- Click without Shift while marquee selection is active clears the selection (does NOT open popover — the click is consumed by the clear action)
- Escape priority chain: command palette open > clear marquee selection > deselect single activity
- Marquee selection and single-select (`selectedEventId`) are mutually exclusive

## Selection State

New hook: `useMarqueeSelection`

```ts
interface MarqueeState {
  selectedIds: Set<string>         // Selected activity IDs
  marqueeRect: MarqueeRect | null  // Active rectangle during drag, null otherwise
}

interface MarqueeRect {
  startX: number
  startY: number
  endX: number
  endY: number
}
```

When `selectedIds` is non-empty, `selectedEventId` is cleared (and vice versa).

## Marquee Rectangle & Hit Testing

### Drawing

- On Shift+mousedown on empty grid space, record anchor point (screen coords relative to WeekView scroll container)
- On mousemove, update the rectangle endpoint
- On mouseup, finalize selection and hide the rectangle
- The rectangle renders as a child of the WeekView scroll container so it scrolls with the grid

### Hit Testing

- On drag start, read `getBoundingClientRect()` once on the WeekView grid container to get its position and total width. Derive per-column width from `containerWidth / 7` (week view columns are equal flex). This single DOM read is cached for the duration of the drag.
- Activity bounding boxes are then computed from layout data: day index determines X range (via cached column width), startHour/duration determines Y range (via `HOUR_HEIGHT` constant), overlap layout column/totalColumns determines X sub-position within the day column.
- An activity is selected if its computed bounding box intersects the marquee rectangle
- Hit testing runs on every mousemove during drag, throttled via `requestAnimationFrame`, so highlights update live

### Cross-Day Support

- The marquee rectangle is positioned relative to the WeekView scroll container
- Day index derived from X position relative to cached column width
- Activities across multiple day columns are tested against the same rectangle

## Bulk Actions

### Bulk Delete

- Trigger: `Delete` or `Backspace` when `selectedIds.size > 0`
- Calls `removeActivity(id)` for each selected ID
- Clears selection after completion
- `useKeyboardShortcuts` checks: if marquee selection active, run bulk delete instead of single delete

### Bulk Move

- Trigger: drag any activity that is part of the selection
- All selected activities move together with the same delta (days + hours)
- Delta computed from the dragged activity's movement, clamped so that ALL selected activities remain in bounds (no activity pushed before day 0, below hour 0, or past end of trip). The delta is clamped to the most constrained activity in the group.
- Applied via `moveActivity()` for each selected activity
- Ghost previews: the dragged activity uses dnd-kit's existing `<DragOverlay>`. The other selected activities render as absolutely-positioned "ghost" divs (dashed blue border, translucent) in their respective DayColumns at the projected target positions. These are rendered by DayColumn based on a `pendingGroupMove` prop, similar to how `pendingDrop` already works for single-item previews.
- Implementation: extend `onDragOver`/`onDragEnd` in `useCalendarDnd` — if dragged activity is in selection set, compute group delta and move all

### Bulk Duplicate

- Trigger: `Ctrl+D` when `selectedIds.size > 0`
- Calls `duplicateActivity()` for each selected activity
- Clears old selection, selects the new copies
- Existing single-duplicate behavior unchanged when no marquee selection

### Command Palette

- `useCalendarCommands` receives `selectedIds` as a new parameter in its input interface
- Adds selection-aware commands:
  - "Delete selected activities" (enabled when `selectedIds.size > 0`)
  - "Duplicate selected activities" (enabled when `selectedIds.size > 0`)

## Visual Design

### Selected Activity Style (EventBlock)

- Blue ring outline (distinct from white ring used for single-select)
- Subtle blue background tint
- During active marquee drag, activities intersecting the rectangle get the highlight in real-time (preview)

### Marquee Rectangle

- Semi-transparent blue fill (`bg-blue-500/10`)
- Blue border (`border border-blue-500/50`)
- `pointer-events: none` on the rectangle div — events captured by the overlay layer
- Rendered inside WeekView scroll container (scrolls with grid)

### Cursor

- Default cursor on grid normally
- Crosshair cursor when holding Shift over empty grid space

## New Files

| File | Purpose |
|------|---------|
| `hooks/useMarqueeSelection.ts` | Selection state, marquee rect, hit testing logic |
| `MarqueeOverlay.tsx` | Transparent event-capture layer + visible rectangle |

## Modified Files

| File | Change |
|------|--------|
| `EventBlock.tsx` | Add multi-select highlight style (blue ring + tint) |
| `CalendarDashboard.tsx` | Wire up `useMarqueeSelection`, pass `selectedIds` down, mutual exclusion with `selectedEventId`, pass `scrollRef` to WeekView |
| `useCalendarDnd.ts` | Extend `onDragOver`/`onDragEnd` for group move, compute `pendingGroupMove` for ghost previews |
| `useKeyboardShortcuts.ts` | Add `onClearMarquee` callback, update Escape priority chain, bulk delete/duplicate when `selectedIds.size > 0` |
| `useCalendarCommands.ts` | Add `selectedIds` to input interface, add selection-aware command entries |
| `DayColumn.tsx` | Pass `selectedIds` to EventBlocks, render group-move ghost previews via `pendingGroupMove` prop |
| `WeekView.tsx` | Mount `MarqueeOverlay`, receive `scrollRef` from CalendarDashboard |

## Out of Scope

- Marquee in DayView (week view only for v1)
- Ctrl+A select all
- Copy/paste across trips
- Undo/redo for bulk operations
- Mobile/touch marquee gestures
