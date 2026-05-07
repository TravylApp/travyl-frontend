# Calendar Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the trip calendar page with a three-column clean layout, week-view default, proper right-panel scrolling, and cleaner event blocks.

**Architecture:** New `CalendarShell` component replaces the monolithic `CalendarDashboard` as the layout orchestrator. The three columns (date nav, calendar grid, context panel) are independent flex children. Week view becomes default with click-to-zoom into day view. Event blocks get a visual refresh.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, motion/react, dnd-kit, Yjs, iconoir-react

**Design spec:** `docs/superpowers/specs/2026-05-07-calendar-redesign.md`

---

## File Map

### Files to Create
| File | Responsibility |
|------|---------------|
| `apps/web/components/calendar/CalendarShell.tsx` | 3-column layout orchestrator, replaces CalendarDashboard |
| `apps/web/components/calendar/CalendarTopBar.tsx` | Top bar: week nav arrows, view toggle, actions |

### Files to Significantly Modify
| File | Change |
|------|--------|
| `apps/web/components/calendar/CalendarDashboard.tsx` | Gut most logic, keep as thin wrapper or remove entirely |
| `apps/web/components/calendar/WeekView.tsx` | Make default view, add day-header row, simplify |
| `apps/web/components/calendar/DayColumn.tsx` | Reduce ~50 props via context |
| `apps/web/components/calendar/EventBlock.tsx` | Cleaner card design, category dots, compact layout |
| `apps/web/app/(dashboard)/trip/[id]/calendar/page.tsx` | Wire CalendarShell instead of CalendarDashboard |
| `apps/web/components/calendar/ForYouPanel.tsx` | Fix overflow clipping |

### Files to Keep As-Is
All hooks, MiniMonthCalendar, SidebarTabs, PollBar, modals, overlays, dnd logic

---

## Chunk 1: CalendarShell + CalendarTopBar

### Task 1: Create CalendarTopBar component

**Files:**
- Create: `apps/web/components/calendar/CalendarTopBar.tsx`

- [ ] **Step 1: Create CalendarTopBar with week navigation and view toggle**

```tsx
// apps/web/components/calendar/CalendarTopBar.tsx
'use client'

import { useMemo } from 'react'
import { useCalendarNavigation } from './hooks/useCalendarNavigation'
import { ChevronLeft, ChevronRight, Plus, Share } from 'iconoir-react'
import { Blue } from '@travyl/shared'

interface CalendarTopBarProps {
  tripName: string
  dateRange: string
  viewMode: 'week' | 'day'
  onViewModeChange: (mode: 'week' | 'day') => void
  selectedDayIndex: number
  onWeekChange: (direction: -1 | 1) => void
  onToday: () => void
  onNewActivity: () => void
  onShare: () => void
}

export function CalendarTopBar({
  tripName,
  dateRange,
  viewMode,
  onViewModeChange,
  selectedDayIndex,
  onWeekChange,
  onToday,
  onNewActivity,
  onShare,
}: CalendarTopBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
      {/* Left: Trip name + date range */}
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-sm font-semibold text-gray-900 truncate">{tripName}</h2>
        <span className="text-xs text-gray-400 hidden sm:inline">·</span>
        <span className="text-xs text-gray-400 hidden sm:inline truncate">{dateRange}</span>
      </div>

      {/* Center: Week navigation + view toggle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onWeekChange(-1)}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft width={16} height={16} />
          </button>
          <button
            onClick={onToday}
            className="px-2 py-1 text-xs font-medium text-[#003594] hover:bg-blue-50 rounded-md transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => onWeekChange(1)}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Next week"
          >
            <ChevronRight width={16} height={16} />
          </button>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange('week')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              viewMode === 'week'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onViewModeChange('day')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              viewMode === 'day'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Day
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNewActivity}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#003594] text-white text-xs font-medium rounded-lg hover:bg-[#002B7A] transition-colors"
        >
          <Plus width={14} height={14} />
          <span className="hidden sm:inline">New</span>
        </button>
        <button
          onClick={onShare}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Share"
        >
          <Share width={16} height={16} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npm run typecheck`
Expected: No errors related to CalendarTopBar

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/CalendarTopBar.tsx
git commit -m "feat: create CalendarTopBar component with week nav and view toggle"
```

### Task 2: Create CalendarShell layout orchestrator

**Files:**
- Create: `apps/web/components/calendar/CalendarShell.tsx`

- [ ] **Step 1: Create CalendarShell with 3-column layout**

```tsx
// apps/web/components/calendar/CalendarShell.tsx
'use client'

import { useState, useCallback } from 'react'
import { CalendarTopBar } from './CalendarTopBar'
import { MiniMonthCalendar } from './MiniMonthCalendar'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import { SidebarTabs } from './SidebarTabs'
import { CalendarToolbar } from './CalendarToolbar'
import { useCalendarNavigation } from './hooks/useCalendarNavigation'
import { useYjsSync } from './hooks/useYjsSync'
import { useActivityMutations } from './hooks/useActivityMutations'
import { useCalendarDnd } from './hooks/useCalendarDnd'
import { useCollaboratorPresence } from './hooks/useCollaboratorPresence'
import { useCalendarCommands } from './hooks/useCalendarCommands'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useResizablePanel } from './hooks/useResizablePanel'
import { YjsTripContext } from './providers/YjsTripProvider'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { CalendarThemeContext } from './CalendarThemeContext'

interface CalendarShellProps {
  tripId: string
  userId: string
  userName: string
  userAvatarUrl: string
  tripName: string
  startDate: string
  endDate: string
}

export function CalendarShell({
  tripId,
  userId,
  userName,
  userAvatarUrl,
  tripName,
  startDate,
  endDate,
}: CalendarShellProps) {
  // Navigation state
  const { viewMode, setViewMode, selectedDayIndex, setSelectedDayIndex, selectedEventId, setSelectedEventId } =
    useCalendarNavigation({ tripId })

  // Yjs data sync
  const { activities, isLoading: yjsLoading } = useYjsSync({ tripId })
  const { addActivity, updateActivity, moveActivity, removeActivity } = useActivityMutations({ tripId })

  // Drag and drop
  const { dndState, handleDragStart, handleDragEnd, handleDragCancel } = useCalendarDnd({
    tripId,
    activities,
    moveActivity,
    addActivity,
  })

  // Collaborator presence
  const { collaborators } = useCollaboratorPresence({ tripId, userId, userName })

  // Right panel resize
  const { panelWidth, handlePanelResize } = useResizablePanel({ defaultWidth: 320, minWidth: 260, maxWidth: 480 })

  // Week navigation
  const handleWeekChange = useCallback((direction: -1 | 1) => {
    // Move selected day by 7 days
    setSelectedDayIndex(prev => prev + direction * 7)
  }, [setSelectedDayIndex])

  const handleToday = useCallback(() => {
    const today = new Date()
    const start = new Date(startDate)
    const diffDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    setSelectedDayIndex(Math.max(0, diffDays))
  }, [startDate, setSelectedDayIndex])

  // Keyboard commands
  const commands = useCalendarCommands({
    activities,
    selectedEventId,
    setSelectedEventId,
    removeActivity,
    updateActivity,
    viewMode,
    setViewMode,
    selectedDayIndex,
    setSelectedDayIndex,
  })
  useKeyboardShortcuts(commands)

  return (
    <CalendarThemeContext.Provider value={{ isDark: false }}>
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
        <div className="flex flex-col h-full bg-white">
          {/* Top Bar */}
          <CalendarTopBar
            tripName={tripName}
            dateRange={`${startDate} – ${endDate}`}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            selectedDayIndex={selectedDayIndex}
            onWeekChange={handleWeekChange}
            onToday={handleToday}
            onNewActivity={() => {}}
            onShare={() => {}}
          />

          {/* Three-column layout */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Left: Date Nav */}
            <div className="flex-shrink-0 w-[180px] p-3 overflow-y-auto hidden lg:flex flex-col gap-3 border-r border-gray-100">
              <MiniMonthCalendar
                startDate={startDate}
                endDate={endDate}
                selectedDayIndex={selectedDayIndex}
                onSelectDay={setSelectedDayIndex}
              />
              <div className="bg-white rounded-xl border border-gray-100 p-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Trip Summary</h4>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Days</span>
                    <span className="font-medium text-gray-900">{Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Activities</span>
                    <span className="font-medium text-gray-900">{activities.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Center: Calendar Grid */}
            <div className="flex-1 min-w-0 overflow-hidden">
              {viewMode === 'week' ? (
                <WeekView
                  activities={activities}
                  startDate={startDate}
                  endDate={endDate}
                  selectedDayIndex={selectedDayIndex}
                  onSelectDay={setSelectedDayIndex}
                  onSelectEvent={setSelectedEventId}
                  selectedEventId={selectedEventId}
                  userId={userId}
                  onUpdateActivity={updateActivity}
                  onMoveActivity={moveActivity}
                  tripId={tripId}
                />
              ) : (
                <DayView
                  activities={activities}
                  startDate={startDate}
                  selectedDayIndex={selectedDayIndex}
                  onSelectEvent={setSelectedEventId}
                  selectedEventId={selectedEventId}
                  userId={userId}
                  onUpdateActivity={updateActivity}
                  onMoveActivity={moveActivity}
                  tripId={tripId}
                />
              )}
            </div>

            {/* Right: Context Panel */}
            <div
              className="flex-shrink-0 border-l border-gray-100 overflow-y-auto"
              style={{ width: panelWidth }}
            >
              <SidebarTabs tripId={tripId} />
            </div>
          </div>
        </div>

        <DragOverlay>
          {/* Render dragged event here */}
        </DragOverlay>
      </DndContext>
    </CalendarThemeContext.Provider>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npm run typecheck`
Expected: No major errors (may have some TODO placeholders)

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/CalendarShell.tsx
git commit -m "feat: create CalendarShell layout orchestrator"
```

---

## Chunk 2: WeekView + DayColumn Refactor

### Task 3: Refactor WeekView to be default view with day headers

**Files:**
- Modify: `apps/web/components/calendar/WeekView.tsx`

- [ ] **Step 1: Read current WeekView.tsx**

- [ ] **Step 2: Rewrite WeekView with simplified props and day headers**

Key changes:
- Accept a simplified prop interface
- Add a day-header row at the top (MON, TUE, WED... with date numbers)
- The selected day gets highlighted in the header
- Clicking a day header selects that day
- Each day column has hour grid + events
- Use `overflow-y-auto` on the grid body for hour scrolling

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/WeekView.tsx
git commit -m "refactor: make WeekView the default view with day headers"
```

### Task 4: Simplify DayColumn props

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx`

- [ ] **Step 1: Read current DayColumn.tsx**

- [ ] **Step 2: Reduce props — aim for ~15-20 instead of ~50**

Strategy:
- Group related props into a context or use existing hooks internally
- `DayColumn` should derive what it needs from `tripId` + `date` + `activities`
- Remove props that are just passed through to EventBlock (let EventBlock read its own data)

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/DayColumn.tsx
git commit -m "refactor: simplify DayColumn props"
```

---

## Chunk 3: Event Block Redesign

### Task 5: Redesign EventBlock with cleaner card style

**Files:**
- Modify: `apps/web/components/calendar/EventBlock.tsx`

- [ ] **Step 1: Read current EventBlock.tsx**

- [ ] **Step 2: Redesign event card**

New design:
- No full background color — just a 3px left border accent in the category color
- White background with subtle `border border-gray-100`
- Title in semibold gray-900
- Time range in muted gray-400 below title
- Location name on second line if available (truncated)
- Category color dot beside the title (small circle, 8px)
- Hover state: `bg-gray-50` + slightly elevated shadow
- Compact: shorter padding, smaller font
- Keep resize handles (top/bottom)
- Keep drag handle (grab cursor area on left edge)

Category colors:
- sightseeing → emerald-500
- dining → amber-500
- tours → violet-500
- culture → rose-500
- shopping → pink-500
- nightlife → indigo-500
- outdoor → lime-500
- other → gray-400

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/EventBlock.tsx
git commit -m "feat: redesign EventBlock with cleaner card style and category colors"
```

---

## Chunk 4: Fix Right Panel + Page Integration

### Task 6: Fix ForYouPanel overflow clipping

**Files:**
- Modify: `apps/web/components/calendar/ForYouPanel.tsx`
- Modify: `apps/web/components/calendar/SidebarTabs.tsx`

- [ ] **Step 1: Read current ForYouPanel.tsx and SidebarTabs.tsx**

- [ ] **Step 2: Fix overflow clipping**

In `ForYouPanel.tsx`: ensure the suggestion list container has `overflow-y-auto` and a proper height that fills the available space. The parent `SidebarTabs` should have `flex flex-col h-full` so children can fill it.

In `CalendarShell`, the right panel already has `overflow-y-auto` and a fixed width.

- [ ] **Step 3: Verify fix renders correctly**

Run: `npm run dev` (manual visual check)

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/ForYouPanel.tsx apps/web/components/calendar/SidebarTabs.tsx
git commit -m "fix: prevent ForYouPanel overflow clipping"
```

### Task 7: Wire CalendarShell into the page

**Files:**
- Modify: `apps/web/app/(dashboard)/trip/[id]/calendar/page.tsx`
- Modify: `apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx`

- [ ] **Step 1: Read current calendar page.tsx**

- [ ] **Step 2: Replace CalendarDashboard with CalendarShell**

```tsx
// apps/web/app/(dashboard)/trip/[id]/calendar/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { useTrip, useAuthStore } from '@travyl/shared'
import { YjsTripProvider } from '@/components/calendar/providers/YjsTripProvider'
import { CalendarShell } from '@/components/calendar/CalendarShell'
import { CalendarSkeleton } from '@/components/calendar/CalendarSkeleton'
import { CalendarError } from '@/components/calendar/CalendarError'

export default function CalendarPage() {
  const params = useParams()
  const tripId = params.id as string
  const { user } = useAuthStore()
  const { data: trip, isLoading, error } = useTrip(tripId)

  if (isLoading) return <CalendarSkeleton />
  if (error || !trip) return <CalendarError />
  if (!user) return null

  return (
    <YjsTripProvider tripId={tripId} userId={user.id}>
      <CalendarShell
        tripId={tripId}
        userId={user.id}
        userName={user.user_metadata?.display_name || user.email?.split('@')[0] || 'Traveler'}
        userAvatarUrl={user.user_metadata?.avatar_url || ''}
        tripName={trip.title}
        startDate={trip.start_date}
        endDate={trip.end_date}
      />
    </YjsTripProvider>
  )
}
```

- [ ] **Step 3: Check trip-layout-inner.tsx for any calendar-specific fullscreen hacks**

The calendar was using `position: fixed; inset: 0; z-index: 40; height: 100vh`. Remove this for the calendar route so it uses the normal page layout flow.

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/(dashboard)/trip/[id]/calendar/page.tsx apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx
git commit -m "feat: wire CalendarShell into calendar page, remove fixed positioning"
```

---

## Chunk 5: Cleanup + Polish

### Task 8: Remove or deprecate CalendarDashboard

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: If CalendarDashboard is no longer imported anywhere, delete it**

Check for imports of CalendarDashboard across the codebase:
Run: `grep -r "CalendarDashboard" apps/web/ --include="*.tsx" --include="*.ts"`

- [ ] **Step 2: If it's still referenced, add deprecation notice at top and keep until next cleanup**

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "chore: remove deprecated CalendarDashboard"
```

### Task 9: Fix duplicate key errors

**Files:**
- Search the codebase for the duplicate key source

- [ ] **Step 1: Identify the source of duplicate React keys**

The errors are `Encountered two children with the same key`. This likely comes from a `.map()` where two items share the same `key` prop. Common causes:
- Activities with the same `id` rendered twice
- Day columns with duplicate day indices
- Time slots with overlapping ranges

Check `DayColumn.tsx` for any `.map()` with activity keys, and `WeekView.tsx` for day column keys.

- [ ] **Step 2: Fix the key to be unique**

Ensure keys are truly unique — use `${activity.id}-${index}` if there's any risk of duplicates, or log the duplicate IDs to find the root cause.

- [ ] **Step 3: Verify fix**

Run: `npm run dev` and check browser console for zero duplicate-key errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/ *.tsx
git commit -m "fix: resolve duplicate React key errors in calendar"
```

---

## Chunk 6: Final Integration

### Task 10: End-to-end verification

- [ ] **Step 1: Full typecheck**

Run: `npm run typecheck`
Expected: Zero errors

- [ ] **Step 2: Full lint**

Run: `npm run lint`
Expected: Zero errors

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`
- Navigate to `/trip/{id}/calendar`
- Verify 3-column layout renders
- Verify week view shows all 7 days
- Verify event blocks have new clean card style
- Verify right panel scrolls properly
- Verify click day switches to day view
- Verify week navigation arrows work
- Verify Today button works
- Verify no console errors

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: calendar redesign — three-column layout, week view, cleaner events"
```
