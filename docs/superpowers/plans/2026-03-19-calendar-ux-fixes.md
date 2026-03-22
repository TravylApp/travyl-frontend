# Calendar UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove accidental click-to-create from the calendar and sharpen the selected-activity focus indicator.

**Architecture:** Two independent, self-contained changes — each touches a small number of files with no schema or hook changes. Fix 1 threads a new `onDeselect` prop down through `CalendarDashboard → WeekView/DayView → DayColumn` while removing the old `onCreateActivity` prop from that same chain. Fix 2 is a Tailwind class string edit in a single component.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, dnd-kit (drag-and-drop), TypeScript

---

## File Map

| File | Change |
|---|---|
| `apps/web/components/calendar/EventBlock.tsx` | Upgrade selected ring classes + fix transition + suppress hover lift when selected |
| `apps/web/components/calendar/DayColumn.tsx` | Remove `onCreateActivity`, add `onDeselect`, replace mouseDown/Up with `onClick` |
| `apps/web/components/calendar/WeekView.tsx` | Remove `onCreateActivity`, add `onDeselect`, forward to DayColumn |
| `apps/web/components/calendar/DayView.tsx` | Remove `onCreateActivity`, add `onDeselect`, forward to DayColumn |
| `apps/web/components/calendar/CalendarDashboard.tsx` | Stop passing `onCreateActivity`, pass `onDeselect` |

---

## Task 1: Improve activity focus indicator in EventBlock

**Files:**
- Modify: `apps/web/components/calendar/EventBlock.tsx:91-98`

This is a pure Tailwind class change in one file. Three things to update in the `className` array:
1. Line 95: add `transform` to the transition property list (so scale animates)
2. Line 95: make `hover:-translate-y-px hover:shadow-lg` conditional on `!isSelected && !isDragging` (avoids transform stacking)
3. Line 96: upgrade the selected ring from `ring-white ring-offset-1` to `ring-2 ring-white ring-offset-2 scale-[1.02] shadow-lg`

- [ ] **Step 1: Open EventBlock and locate the className block**

  `apps/web/components/calendar/EventBlock.tsx` lines 91–98. Current state:

  ```tsx
  className={[
    'rounded-md cursor-grab active:cursor-grabbing overflow-hidden select-none relative',
    'text-white text-xs',
    'ring-2 ring-transparent',
    isDragging ? '' : 'transition-[ring,shadow,opacity] duration-150 hover:-translate-y-px hover:shadow-lg',
    isSelected ? 'ring-white ring-offset-1' : 'hover:ring-white/40',
    'focus:outline-none focus:ring-white focus:ring-offset-1',
  ].join(' ')}
  ```

- [ ] **Step 2: Apply the three class changes**

  Replace lines 91–98 with:

  ```tsx
  className={[
    'rounded-md cursor-grab active:cursor-grabbing overflow-hidden select-none relative',
    'text-white text-xs',
    'ring-2 ring-transparent',
    isDragging
      ? ''
      : `transition-[ring,shadow,opacity,transform] duration-150${!isSelected ? ' hover:-translate-y-px hover:shadow-lg' : ''}`,
    isSelected ? 'ring-2 ring-white ring-offset-2 scale-[1.02] shadow-lg' : 'hover:ring-white/40',
    'focus:outline-none focus:ring-white focus:ring-offset-1',
  ].join(' ')}
  ```

  Key changes:
  - `transition-[ring,shadow,opacity]` → `transition-[ring,shadow,opacity,transform]` (animate scale)
  - `hover:-translate-y-px hover:shadow-lg` now conditional on `!isSelected` (prevent transform stacking)
  - `ring-white ring-offset-1` → `ring-2 ring-white ring-offset-2 scale-[1.02] shadow-lg` (stronger ring, lift, glow)
  - Note: `ring-2` in the selected classes is redundant with the permanent base `ring-2 ring-transparent`, but Tailwind handles this gracefully — last class wins for the color, so just `ring-white ring-offset-2 scale-[1.02] shadow-lg` would also work. Keeping `ring-2` makes the intent explicit.

- [ ] **Step 3: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: no errors in `EventBlock.tsx`.

- [ ] **Step 4: Visual check**

  Start the dev server (`npm run web`), open a trip calendar. Click an activity — verify:
  - A clear white ring with offset appears around the selected block
  - The block scales up slightly and shows a drop shadow
  - Hovering an unselected block shows the faint ring (unchanged)
  - Hovering a selected block does NOT produce the translate-up (no jitter)
  - Clicking another activity deselects the first and selects the new one with smooth transition

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/components/calendar/EventBlock.tsx
  git commit -m "fix: improve activity focus indicator (ring-2, scale, shadow)"
  ```

---

## Task 2: Remove click-to-create from DayColumn

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx`
- Modify: `apps/web/components/calendar/WeekView.tsx`
- Modify: `apps/web/components/calendar/DayView.tsx`
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

This threads a new `onDeselect: () => void` prop down the tree while removing `onCreateActivity` from the same chain. Do the files in order: DayColumn first (defines the interface), then WeekView/DayView (forward it), then CalendarDashboard (provides it).

- [ ] **Step 1: Update DayColumnProps**

  In `apps/web/components/calendar/DayColumn.tsx`, update the interface (lines 12–32):

  ```tsx
  interface DayColumnProps {
    dayIndex: number
    label: string
    activities: CalendarActivity[]
    viewers?: UserAwareness[]
    selectedEventId?: string | null
    timeRange: TimeRange
    tripStartDate: Date
    onSelectEvent: (id: string) => void
    onClickDayHeader?: () => void
    onDeselect: () => void                       // NEW — replaces onCreateActivity
    pendingActivity?: CalendarActivity | null
    notes?: TripNote[]
    canCreateNotes?: boolean
    canEditNotes?: boolean
    userId?: string
    isOwner?: boolean
    onCreateNote?: (day: number, hour: number) => void
    onUpdateNote?: (noteId: string, text: string) => void
    onDeleteNote?: (noteId: string) => void
  }
  ```

  (`onCreateActivity` removed, `onDeselect` added as required.)

- [ ] **Step 2: Update DayColumn destructuring and remove mouse handlers**

  Replace the destructuring and mouse handler code (lines 71–118) with:

  ```tsx
  export function DayColumn({
    dayIndex,
    label,
    activities,
    viewers = [],
    selectedEventId = null,
    timeRange,
    tripStartDate,
    onSelectEvent,
    onClickDayHeader,
    onDeselect,
    pendingActivity = null,
    notes,
    canCreateNotes,
    canEditNotes,
    userId,
    isOwner,
    onCreateNote,
    onUpdateNote,
    onDeleteNote,
  }: DayColumnProps) {
    const dayCollaborators = viewers.filter(
      (c) => (c.selectedDayIndex ?? 0) === dayIndex,
    )

    const handleBackgroundClick = (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget) return  // ignore bubbled clicks from EventBlock/PostItNote
      const rect = e.currentTarget.getBoundingClientRect()
      const offsetY = e.clientY - rect.top
      const rawHour = timeRange.startHour + offsetY / HOUR_HEIGHT
      const snappedHour = Math.round(rawHour * 2) / 2
      if (e.shiftKey && canCreateNotes && onCreateNote) {
        onCreateNote(dayIndex, snappedHour)
        return
      }
      onDeselect()
    }
  ```

  Changes:
  - Removed `mouseDownPos` ref (and the `useRef` import is now unused — check below)
  - Removed `handleMouseDown` and `handleMouseUp`
  - Added `handleBackgroundClick` with the `e.target === e.currentTarget` guard
  - `onCreateActivity` removed from destructuring

- [ ] **Step 3: Remove unused useRef import (if applicable)**

  Check line 1 of `DayColumn.tsx`. If `useRef` is the only import from `'react'`, remove it:

  ```tsx
  // Before (line 1):
  import { useRef } from 'react'

  // After — remove entirely if useRef is the only import.
  // If other hooks from 'react' are used, just remove 'useRef' from the list.
  ```

  `DayColumn` currently only imports `useRef`. After this change it imports nothing from React directly (JSX is handled by the compiler). Remove the line.

- [ ] **Step 4: Update the droppable background div**

  Find the droppable grid div (around line 215). Replace `onMouseDown`/`onMouseUp` with `onClick`:

  ```tsx
  {/* Droppable grid */}
  <div
    ref={setNodeRef}
    className={[
      'relative flex-1 border-l border-[var(--cal-border-light)]',
      isOver ? 'bg-[var(--cal-drag-over)]' : '',
    ].join(' ')}
    style={{ height: hourCount * HOUR_HEIGHT }}
    onClick={handleBackgroundClick}
  >
  ```

- [ ] **Step 5: Update WeekView**

  In `apps/web/components/calendar/WeekView.tsx`, update `WeekViewProps` and forwarding:

  ```tsx
  interface WeekViewProps {
    days: { dayIndex: number; label: string }[]
    activities: CalendarActivity[]
    viewers?: UserAwareness[]
    selectedEventId?: string | null
    timeRange: TimeRange
    tripStartDate: Date
    onSelectEvent: (id: string) => void
    onClickDayHeader?: (dayIndex: number) => void
    onDeselect: () => void                       // NEW — replaces onCreateActivity
    pendingDrop?: { dayIndex: number; activity: CalendarActivity } | null
  }
  ```

  Update destructuring (remove `onCreateActivity`, add `onDeselect`) and forward to DayColumn:

  ```tsx
  export function WeekView({
    days,
    activities,
    viewers = [],
    selectedEventId = null,
    timeRange,
    tripStartDate,
    onSelectEvent,
    onClickDayHeader,
    onDeselect,
    pendingDrop = null,
  }: WeekViewProps) {
    // ... handleKeyDown unchanged ...

    return (
      <div role="grid" className="flex flex-1 min-w-0" onKeyDown={handleKeyDown}>
        <TimeGutter timeRange={timeRange} />
        <div className="flex flex-1 min-w-0">
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
                onSelectEvent={onSelectEvent}
                onClickDayHeader={
                  onClickDayHeader ? () => onClickDayHeader(dayIndex) : undefined
                }
                onDeselect={onDeselect}
                pendingActivity={pendingDrop?.dayIndex === dayIndex ? pendingDrop.activity : null}
              />
            )
          })}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 6: Update DayView**

  In `apps/web/components/calendar/DayView.tsx`, same swap:

  ```tsx
  interface DayViewProps {
    dayIndex: number
    label: string
    activities: CalendarActivity[]
    viewers?: UserAwareness[]
    selectedEventId?: string | null
    timeRange: TimeRange
    tripStartDate: Date
    onSelectEvent: (id: string) => void
    onDeselect: () => void                       // NEW — replaces onCreateActivity
    pendingDrop?: { dayIndex: number; activity: CalendarActivity } | null
  }

  export function DayView({
    dayIndex,
    label,
    activities,
    viewers = [],
    selectedEventId = null,
    timeRange,
    tripStartDate,
    onSelectEvent,
    onDeselect,
    pendingDrop = null,
  }: DayViewProps) {
    const dayActivities = activities.filter((a) => a.day === dayIndex)

    return (
      <div role="grid" className="flex flex-1 overflow-auto">
        <TimeGutter timeRange={timeRange} />
        <div className="flex flex-1 min-w-0">
          <DayColumn
            dayIndex={dayIndex}
            label={label}
            activities={dayActivities}
            viewers={viewers}
            selectedEventId={selectedEventId}
            timeRange={timeRange}
            tripStartDate={tripStartDate}
            onSelectEvent={onSelectEvent}
            onClickDayHeader={undefined}
            onDeselect={onDeselect}
            pendingActivity={pendingDrop?.dayIndex === dayIndex ? pendingDrop.activity : null}
          />
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 7: Update CalendarDashboard call sites**

  In `apps/web/components/calendar/CalendarDashboard.tsx`, find where `WeekView` and `DayView` are rendered and swap the prop. Search for `onCreateActivity` — there will be two usages (one for WeekView, one for DayView). Replace both with `onDeselect={() => selectEvent(null)}`.

  Do NOT remove `handleCreateActivity` — it is still used by the `N` keyboard shortcut:
  ```tsx
  onAddEvent: () => handleCreateActivity(selectedDayIndex ?? 0, 12),
  ```

- [ ] **Step 8: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: no errors. If TypeScript complains about `onCreateActivity` being passed somewhere, search for remaining usages: `grep -r "onCreateActivity" apps/web/`.

- [ ] **Step 9: Visual check**

  On the running dev server:
  - Click empty space on a day column → nothing is created, the detail panel closes if open
  - Press `N` → a new activity appears at noon (creation still works)
  - Click an existing activity → selects it
  - Click the same activity again → deselects it (detail panel closes)
  - Drag an activity → drag works, no accidental creation on release

- [ ] **Step 10: Commit**

  ```bash
  git add \
    apps/web/components/calendar/DayColumn.tsx \
    apps/web/components/calendar/WeekView.tsx \
    apps/web/components/calendar/DayView.tsx \
    apps/web/components/calendar/CalendarDashboard.tsx
  git commit -m "fix: remove click-to-create from calendar, clicking empty space now deselects"
  ```

---

## Task 3: Final typecheck and branch setup

- [ ] **Step 1: Full typecheck across all workspaces**

  ```bash
  npm run typecheck
  ```

  Expected: clean output with no errors.

- [ ] **Step 2: Lint check**

  ```bash
  npm run lint
  ```

  Expected: no errors. Fix any lint warnings in the files touched.

- [ ] **Step 3: Update PLANNING.md**

  Add an entry for `feature/tra-217` under the active branches section in `PLANNING.md`. Record: branch, Linear issue, status (Complete), what was done.

- [ ] **Step 4: Final commit if PLANNING.md updated**

  ```bash
  git add PLANNING.md
  git commit -m "chore: update PLANNING.md for TRA-217"
  ```
