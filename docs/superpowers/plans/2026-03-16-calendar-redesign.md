# Calendar Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 62KB CalendarView monolith with a modular, Outlook-inspired full-page calendar dashboard featuring real-time collaboration via y-supabase.

**Architecture:** Full-page dashboard with collapsible sidebar, week/day time grid, all-day row for flights/hotels, slide-in detail panel, and awareness-based collaboration. Components are small and focused, state is managed via Yjs CRDT with Supabase Realtime sync, drag-and-drop uses @dnd-kit/core.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, @dnd-kit/core, yjs + y-supabase, motion/react (Framer Motion v12), vitest

**Spec:** `docs/superpowers/specs/2026-03-16-calendar-redesign-design.md`

---

## Chunk 1: Foundation — Types, Constants, Data Transforms, Dependencies

### Task 1: Install new dependencies

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install @dnd-kit/core, @dnd-kit/utilities, yjs, y-supabase**

```bash
cd apps/web
npm install @dnd-kit/core @dnd-kit/utilities yjs y-supabase
```

- [ ] **Step 2: Verify installation**

Run: `cd apps/web && node -e "require('@dnd-kit/core'); require('yjs'); console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json package-lock.json
git commit -m "chore: add @dnd-kit/core, yjs, y-supabase dependencies"
```

---

### Task 2: Types and constants

**Files:**
- Create: `apps/web/components/calendar/types.ts`
- Create: `apps/web/components/calendar/constants.ts`
- Modify: `packages/shared/src/types/index.ts` (lines 274-300)

- [ ] **Step 1: Write tests for getActivityColor and time range computation**

```typescript
// packages/shared/src/viewmodels/calendarViewModel.test.ts

import { describe, it, expect } from 'vitest'
import { getActivityColor, computeTimeRange } from './calendarViewModel'

describe('getActivityColor', () => {
  it('returns correct color for known types', () => {
    expect(getActivityColor('sightseeing')).toBe('#4a7dff')
    expect(getActivityColor('dining')).toBe('#e67e22')
  })

  it('returns fallback for unknown types', () => {
    expect(getActivityColor('unknown_category')).toBe('#6b7b9e')
  })
})

describe('computeTimeRange', () => {
  it('returns default range when no activities', () => {
    expect(computeTimeRange([])).toEqual({ startHour: 7, endHour: 23 })
  })

  it('expands range for early activities', () => {
    const activities = [{ startHour: 5, duration: 1 }]
    expect(computeTimeRange(activities as any)).toEqual({ startHour: 4, endHour: 23 })
  })

  it('expands range for late activities', () => {
    const activities = [{ startHour: 22, duration: 3 }]
    expect(computeTimeRange(activities as any)).toEqual({ startHour: 7, endHour: 26 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/shared && npx vitest run src/viewmodels/calendarViewModel.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create calendar types**

```typescript
// apps/web/components/calendar/types.ts

export type ViewMode = 'week' | 'day'

export interface CalendarActivity {
  id: string
  title: string
  type: string
  day: number
  startHour: number
  duration: number
  location?: string
  image?: string
  rating?: number
  price?: string
  notes?: string
}

export interface UserAwareness {
  userId: string
  name: string
  avatarInitial: string
  color: string
  isOnline: boolean
  selectedEventId: string | null
  currentView: ViewMode
}

export interface TimeRange {
  startHour: number
  endHour: number
}
```

- [ ] **Step 4: Create calendar constants**

```typescript
// apps/web/components/calendar/constants.ts

export const HOUR_HEIGHT = 60 // px per hour in the time grid

export const DEFAULT_TIME_RANGE = { startHour: 7, endHour: 23 }

export const SIDEBAR_COLLAPSED_WIDTH = 48
export const SIDEBAR_EXPANDED_WIDTH = 240
export const DETAIL_PANEL_WIDTH = 300
export const SIDEBAR_COLLAPSE_DELAY = 200 // ms

// Note: ACTIVITY_COLORS and DEFAULT_ACTIVITY_COLOR live only in
// calendarViewModel.ts (single source of truth). Import getActivityColor()
// from there — do NOT duplicate the color map here.
```

- [ ] **Step 5: Update shared types — add UserAwareness, clean CalendarActivity**

In `packages/shared/src/types/index.ts`:

Replace the existing `CalendarActivity` interface (lines 274-290) with:

```typescript
export interface CalendarActivity {
  id: string
  title: string
  type: string
  day: number
  startHour: number
  duration: number
  location?: string
  image?: string
  rating?: number
  price?: string
  notes?: string
}
```

Replace `CollaboratorPresence` (lines 292-300) with:

```typescript
export interface UserAwareness {
  userId: string
  name: string
  avatarInitial: string
  color: string
  isOnline: boolean
  selectedEventId: string | null
  currentView: 'week' | 'day'
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/calendar/types.ts apps/web/components/calendar/constants.ts packages/shared/src/types/index.ts
git commit -m "feat: add calendar types, constants, and UserAwareness type"
```

---

### Task 3: Data transform layer

**Files:**
- Create: `packages/shared/src/viewmodels/calendarViewModel.ts`
- Test: `packages/shared/src/viewmodels/calendarViewModel.test.ts`

- [ ] **Step 1: Expand test file with transform tests**

Add to `packages/shared/src/viewmodels/calendarViewModel.test.ts`:

```typescript
import {
  getActivityColor,
  computeTimeRange,
  activityToCalendarActivity,
  calendarActivityToUpdate,
} from './calendarViewModel'
import type { Activity } from '../types'

// ... existing tests from Task 2 ...

describe('activityToCalendarActivity', () => {
  const mockActivity: Activity = {
    id: 'act-1',
    itinerary_day_id: 'day-2',
    trip_id: 'trip-1',
    name: 'Eiffel Tower',
    category: 'sightseeing',
    location_name: 'Champ de Mars',
    location_lat: 48.8584,
    location_lng: 2.2945,
    start_time: '09:30',
    end_time: '11:30',
    estimated_cost: 26.10,
    booking_url: null,
    notes: 'Book skip-the-line',
    source: 'user',
    image_url: null,
    rating: 4.7,
  }

  it('computes day from tripStartDate and dayIndex', () => {
    const result = activityToCalendarActivity(mockActivity, 1)
    expect(result.day).toBe(1)
  })

  it('parses start_time to numeric startHour', () => {
    const result = activityToCalendarActivity(mockActivity, 0)
    expect(result.startHour).toBe(9.5)
  })

  it('computes duration from start and end times', () => {
    const result = activityToCalendarActivity(mockActivity, 0)
    expect(result.duration).toBe(2)
  })

  it('formats estimated_cost to price string', () => {
    const result = activityToCalendarActivity(mockActivity, 0)
    expect(result.price).toBe('$26.10')
  })

  it('maps all fields correctly', () => {
    const result = activityToCalendarActivity(mockActivity, 0)
    expect(result).toEqual({
      id: 'act-1',
      title: 'Eiffel Tower',
      type: 'sightseeing',
      day: 0,
      startHour: 9.5,
      duration: 2,
      location: 'Champ de Mars',
      image: null,
      rating: 4.7,
      price: '$26.10',
      notes: 'Book skip-the-line',
    })
  })
})

describe('calendarActivityToUpdate', () => {
  it('converts startHour back to time string', () => {
    const calActivity = {
      id: 'act-1', title: 'Eiffel Tower', type: 'sightseeing',
      day: 0, startHour: 9.5, duration: 2,
    }
    const result = calendarActivityToUpdate(calActivity)
    expect(result.start_time).toBe('09:30')
    expect(result.end_time).toBe('11:30')
  })

  it('converts whole hours correctly', () => {
    const calActivity = {
      id: 'act-1', title: 'Test', type: 'tour',
      day: 0, startHour: 14, duration: 1.5,
    }
    const result = calendarActivityToUpdate(calActivity)
    expect(result.start_time).toBe('14:00')
    expect(result.end_time).toBe('15:30')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/shared && npx vitest run src/viewmodels/calendarViewModel.test.ts`
Expected: FAIL — functions not found

- [ ] **Step 3: Implement calendarViewModel.ts**

```typescript
// packages/shared/src/viewmodels/calendarViewModel.ts

import type { Activity } from '../types'
import type { CalendarActivity } from '../types'

const ACTIVITY_COLORS: Record<string, string> = {
  sightseeing: '#4a7dff',
  dining:      '#e67e22',
  tour:        '#1abc9c',
  cultural:    '#9b59b6',
  shopping:    '#e74c3c',
  nightlife:   '#8e44ad',
  outdoor:     '#2ecc71',
  museum:      '#f39c12',
  transport:   '#3498db',
  hotel:       '#6c7b8a',
}

const DEFAULT_ACTIVITY_COLOR = '#6b7b9e'

export function getActivityColor(type: string): string {
  return ACTIVITY_COLORS[type] ?? DEFAULT_ACTIVITY_COLOR
}

function parseTimeToHours(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h + m / 60
}

function hoursToTimeString(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Intentional simplification from spec: accepts dayIndex directly instead of
 * tripStartDate + date-diff computation. The caller (useYjsSync / data layer)
 * already groups activities by itinerary day, so the dayIndex is known at call
 * site. This avoids coupling the transform to trip metadata and itinerary_day
 * date lookups.
 */
export function activityToCalendarActivity(
  activity: Activity,
  dayIndex: number,
): CalendarActivity {
  const startHour = parseTimeToHours(activity.start_time)
  const endHour = parseTimeToHours(activity.end_time)

  return {
    id: activity.id,
    title: activity.name,
    type: activity.category,
    day: dayIndex,
    startHour,
    duration: endHour - startHour,
    location: activity.location_name ?? undefined,
    image: activity.image_url ?? undefined,
    rating: activity.rating ?? undefined,
    price: activity.estimated_cost != null
      ? `$${activity.estimated_cost.toFixed(2)}`
      : undefined,
    notes: activity.notes ?? undefined,
  }
}

export function calendarActivityToUpdate(
  calActivity: Pick<CalendarActivity, 'startHour' | 'duration' | 'title' | 'notes'>,
): Partial<Activity> {
  return {
    name: calActivity.title,
    start_time: hoursToTimeString(calActivity.startHour),
    end_time: hoursToTimeString(calActivity.startHour + calActivity.duration),
    notes: calActivity.notes ?? null,
  }
}

export interface TimeRange {
  startHour: number
  endHour: number
}

export function computeTimeRange(
  activities: Pick<CalendarActivity, 'startHour' | 'duration'>[],
): TimeRange {
  const DEFAULT_START = 7
  const DEFAULT_END = 23

  if (activities.length === 0) {
    return { startHour: DEFAULT_START, endHour: DEFAULT_END }
  }

  let min = DEFAULT_START
  let max = DEFAULT_END

  for (const a of activities) {
    if (a.startHour < min) min = a.startHour - 1
    const end = a.startHour + a.duration
    if (end > max) max = end + 1
  }

  return { startHour: Math.floor(min), endHour: Math.ceil(max) }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/shared && npx vitest run src/viewmodels/calendarViewModel.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/viewmodels/calendarViewModel.ts packages/shared/src/viewmodels/calendarViewModel.test.ts
git commit -m "feat: add calendar data transform layer with tests"
```

---

### Task 4: Update mock data

**Files:**
- Modify: `packages/shared/src/config/mockItineraryData.ts`

- [ ] **Step 1: Update MOCK_CALENDAR_ACTIVITIES to match new CalendarActivity type**

In `packages/shared/src/config/mockItineraryData.ts`, replace `MOCK_CALENDAR_ACTIVITIES` with flat activities (no parentId, no onCalendar):

```typescript
export const MOCK_CALENDAR_ACTIVITIES: CalendarActivity[] = [
  // Day 0 - Monday
  { id: 'cal-1', title: 'Eiffel Tower', type: 'sightseeing', day: 0, startHour: 9, duration: 2, location: 'Champ de Mars', rating: 4.7, price: '$26.10' },
  { id: 'cal-2', title: 'Lunch: Le Marais', type: 'dining', day: 0, startHour: 12, duration: 1.5, location: 'Le Marais District' },
  { id: 'cal-3', title: 'Louvre Museum', type: 'museum', day: 0, startHour: 15, duration: 3, location: 'Rue de Rivoli', rating: 4.8, price: '$17.00' },
  // Day 1 - Tuesday
  { id: 'cal-4', title: 'Montmartre Walk', type: 'outdoor', day: 1, startHour: 9.5, duration: 2, location: 'Montmartre' },
  { id: 'cal-5', title: 'Cooking Class', type: 'cultural', day: 1, startHour: 14, duration: 3, location: 'Le Foodist', price: '$85.00' },
  { id: 'cal-6', title: 'Dinner: Le Comptoir', type: 'dining', day: 1, startHour: 19.5, duration: 2, location: 'Saint-Germain' },
  // Day 2 - Wednesday
  { id: 'cal-7', title: 'Versailles Day Trip', type: 'tour', day: 2, startHour: 8, duration: 5, location: 'Palace of Versailles', price: '$20.00' },
  { id: 'cal-8', title: 'Seine River Cruise', type: 'sightseeing', day: 2, startHour: 18, duration: 1.5, location: 'Pont Neuf', price: '$15.00' },
  // Day 3 - Thursday
  { id: 'cal-9', title: "Musée d'Orsay", type: 'museum', day: 3, startHour: 10, duration: 2.5, location: "1 Rue de la Légion d'Honneur", rating: 4.7, price: '$16.00' },
  { id: 'cal-10', title: 'Luxembourg Gardens', type: 'outdoor', day: 3, startHour: 14, duration: 1.5, location: '6th Arrondissement' },
  // Day 4 - Friday
  { id: 'cal-11', title: 'Shopping: Le Bon Marché', type: 'shopping', day: 4, startHour: 10, duration: 2, location: '24 Rue de Sèvres' },
  { id: 'cal-12', title: 'Farewell Dinner', type: 'dining', day: 4, startHour: 19, duration: 2.5, location: 'Le Jules Verne', price: '$150.00' },
]
```

- [ ] **Step 2: Update MOCK_COLLABORATORS to use UserAwareness shape**

Replace `MOCK_COLLABORATORS` with:

```typescript
export const MOCK_COLLABORATORS: UserAwareness[] = [
  { userId: 'user-1', name: 'Justin', avatarInitial: 'J', color: '#4a7dff', isOnline: true, selectedEventId: 'cal-1', currentView: 'week' },
  { userId: 'user-2', name: 'Sarah', avatarInitial: 'S', color: '#e67e22', isOnline: true, selectedEventId: 'cal-3', currentView: 'week' },
  { userId: 'user-3', name: 'Alex', avatarInitial: 'A', color: '#2ecc71', isOnline: false, selectedEventId: null, currentView: 'week' },
]
```

- [ ] **Step 3: Verify the build still works**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds (or only pre-existing errors)

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/config/mockItineraryData.ts
git commit -m "feat: update mock data for new calendar types"
```

---

## Chunk 2: Core Calendar Grid Components

### Task 5: Shared time formatting utility

**Files:**
- Create: `apps/web/components/calendar/utils.ts`

- [ ] **Step 1: Create shared time formatting functions**

These are used by EventBlock, DetailPanel, and TimeGutter — extract once to avoid duplication.

```typescript
// apps/web/components/calendar/utils.ts

import type { CalendarActivity } from './types'

export function formatHour12(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`
}

export function formatTimeRange(activity: Pick<CalendarActivity, 'startHour' | 'duration'>): string {
  return `${formatHour12(activity.startHour)} – ${formatHour12(activity.startHour + activity.duration)}`
}

export function formatHourGutter(hour: number): string {
  if (hour === 0 || hour === 24) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/utils.ts
git commit -m "feat: add shared time formatting utilities"
```

---

### Task 6: TimeGutter component


**Files:**
- Create: `apps/web/components/calendar/TimeGutter.tsx`

- [ ] **Step 1: Create TimeGutter**

```tsx
// apps/web/components/calendar/TimeGutter.tsx
'use client'

import { HOUR_HEIGHT } from './constants'
import { formatHourGutter } from './utils'
import type { TimeRange } from './types'

interface TimeGutterProps {
  timeRange: TimeRange
}

export function TimeGutter({ timeRange }: TimeGutterProps) {
  const hours: number[] = []
  for (let h = timeRange.startHour; h <= timeRange.endHour; h++) {
    hours.push(h)
  }

  return (
    <div className="relative flex-shrink-0 w-14 text-right pr-3">
      {hours.map((hour) => (
        <div
          key={hour}
          className="relative text-xs text-gray-400 select-none"
          style={{ height: HOUR_HEIGHT }}
        >
          <span className="absolute -top-2 right-3">{formatHourGutter(hour)}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/TimeGutter.tsx
git commit -m "feat: add TimeGutter component"
```

---

### Task 7: EventBlock component

**Files:**
- Create: `apps/web/components/calendar/EventBlock.tsx`

- [ ] **Step 1: Create EventBlock with dnd-kit draggable**

```tsx
// apps/web/components/calendar/EventBlock.tsx
'use client'

import { useDraggable } from '@dnd-kit/core'
import { HOUR_HEIGHT } from './constants'
import { formatTimeRange } from './utils'
import type { CalendarActivity, UserAwareness } from './types'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'

interface EventBlockProps {
  activity: CalendarActivity
  timeRangeStart: number
  onSelect: (id: string) => void
  isSelected: boolean
  viewers: UserAwareness[]
}

export function EventBlock({
  activity,
  timeRangeStart,
  onSelect,
  isSelected,
  viewers,
}: EventBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: activity.id, data: { activity } })

  const color = getActivityColor(activity.type)
  const top = (activity.startHour - timeRangeStart) * HOUR_HEIGHT
  const height = activity.duration * HOUR_HEIGHT

  const style: React.CSSProperties = {
    top,
    height: Math.max(height, 24),
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    opacity: isDragging ? 0.8 : 1,
    background: `linear-gradient(135deg, ${color}, ${color}dd)`,
    borderLeft: `3px solid ${color}88`,
    zIndex: isDragging ? 50 : isSelected ? 10 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      role="gridcell"
      tabIndex={0}
      aria-label={`${activity.title}, ${formatTimeRange(activity)}`}
      className={`absolute left-0.5 right-0.5 rounded-md px-2 py-1 cursor-pointer
        text-white text-xs overflow-hidden transition-shadow
        ${isSelected ? 'ring-2 ring-white/40' : ''}
        hover:brightness-110`}
      style={style}
      onClick={(e) => { e.stopPropagation(); onSelect(activity.id) }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(activity.id)
        }
      }}
      {...attributes}
      {...listeners}
    >
      <div className="font-semibold truncate">{activity.title}</div>
      {height >= 40 && (
        <div className="opacity-70 text-[10px] truncate">
          {formatTimeRange(activity)}
        </div>
      )}
      {viewers.length > 0 && (
        <div className="absolute top-1 right-1 flex -space-x-1">
          {viewers.slice(0, 3).map((v) => (
            <div
              key={v.userId}
              className="w-4 h-4 rounded-full text-[8px] flex items-center justify-center text-white border border-white/30"
              style={{ background: v.color }}
              title={v.name}
            >
              {v.avatarInitial}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/EventBlock.tsx
git commit -m "feat: add EventBlock component with dnd-kit draggable"
```

---

### Task 8: DayColumn component

**Files:**
- Create: `apps/web/components/calendar/DayColumn.tsx`

- [ ] **Step 1: Create DayColumn with droppable zones**

```tsx
// apps/web/components/calendar/DayColumn.tsx
'use client'

import { useDroppable } from '@dnd-kit/core'
import { HOUR_HEIGHT } from './constants'
import { EventBlock } from './EventBlock'
import type { CalendarActivity, TimeRange, UserAwareness } from './types'

interface DayColumnProps {
  dayIndex: number
  dayLabel: string
  dateLabel: string
  activities: CalendarActivity[]
  timeRange: TimeRange
  selectedEventId: string | null
  onSelectEvent: (id: string) => void
  onClickDayHeader: (dayIndex: number) => void
  collaborators: UserAwareness[]
}

export function DayColumn({
  dayIndex,
  dayLabel,
  dateLabel,
  activities,
  timeRange,
  selectedEventId,
  onSelectEvent,
  onClickDayHeader,
  collaborators,
}: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dayIndex}`,
    data: { dayIndex },
  })

  const totalHours = timeRange.endHour - timeRange.startHour
  const gridHeight = totalHours * HOUR_HEIGHT

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Day header */}
      <button
        className="text-center py-2 hover:bg-white/5 rounded-t-md transition-colors cursor-pointer"
        onClick={() => onClickDayHeader(dayIndex)}
      >
        <div className="text-[10px] text-gray-400 uppercase tracking-wide">
          {dayLabel}
        </div>
        <div className="text-lg font-semibold text-gray-100">{dateLabel}</div>
      </button>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={`relative flex-1 border-l border-white/5
          ${isOver ? 'bg-white/5' : 'bg-white/[0.02]'}`}
        style={{ height: gridHeight }}
      >
        {/* Hour grid lines */}
        {Array.from({ length: totalHours }, (_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-white/5"
            style={{ top: i * HOUR_HEIGHT }}
          />
        ))}

        {/* Event blocks */}
        {activities.map((activity) => (
          <EventBlock
            key={activity.id}
            activity={activity}
            timeRangeStart={timeRange.startHour}
            onSelect={onSelectEvent}
            isSelected={activity.id === selectedEventId}
            viewers={collaborators.filter(
              (c) => c.selectedEventId === activity.id
            )}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/DayColumn.tsx
git commit -m "feat: add DayColumn component with droppable zones"
```

---

### Task 9: WeekView component

**Files:**
- Create: `apps/web/components/calendar/WeekView.tsx`

- [ ] **Step 1: Create WeekView orchestrator**

```tsx
// apps/web/components/calendar/WeekView.tsx
'use client'

import { TimeGutter } from './TimeGutter'
import { DayColumn } from './DayColumn'
import type { CalendarActivity, TimeRange, UserAwareness } from './types'

interface TripDay {
  dayIndex: number
  dayLabel: string   // e.g. "MON"
  dateLabel: string  // e.g. "10"
}

interface WeekViewProps {
  days: TripDay[]
  activities: CalendarActivity[]
  timeRange: TimeRange
  selectedEventId: string | null
  onSelectEvent: (id: string) => void
  onClickDayHeader: (dayIndex: number) => void
  collaborators: UserAwareness[]
}

export function WeekView({
  days,
  activities,
  timeRange,
  selectedEventId,
  onSelectEvent,
  onClickDayHeader,
  collaborators,
}: WeekViewProps) {
  return (
    <div
      className="flex flex-1 overflow-y-auto overflow-x-hidden"
      role="grid"
      aria-label="Calendar week view"
    >
      <TimeGutter timeRange={timeRange} />
      <div className="flex flex-1">
        {days.map((day) => (
          <DayColumn
            key={day.dayIndex}
            dayIndex={day.dayIndex}
            dayLabel={day.dayLabel}
            dateLabel={day.dateLabel}
            activities={activities.filter((a) => a.day === day.dayIndex)}
            timeRange={timeRange}
            selectedEventId={selectedEventId}
            onSelectEvent={onSelectEvent}
            onClickDayHeader={onClickDayHeader}
            collaborators={collaborators}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/WeekView.tsx
git commit -m "feat: add WeekView grid orchestrator"
```

---

### Task 10: DayView component

**Files:**
- Create: `apps/web/components/calendar/DayView.tsx`

- [ ] **Step 1: Create DayView (single-day expanded)**

```tsx
// apps/web/components/calendar/DayView.tsx
'use client'

import { TimeGutter } from './TimeGutter'
import { DayColumn } from './DayColumn'
import type { CalendarActivity, TimeRange, UserAwareness } from './types'

interface DayViewProps {
  dayIndex: number
  dayLabel: string
  dateLabel: string
  activities: CalendarActivity[]
  timeRange: TimeRange
  selectedEventId: string | null
  onSelectEvent: (id: string) => void
  collaborators: UserAwareness[]
}

export function DayView({
  dayIndex,
  dayLabel,
  dateLabel,
  activities,
  timeRange,
  selectedEventId,
  onSelectEvent,
  collaborators,
}: DayViewProps) {
  return (
    <div
      className="flex flex-1 overflow-y-auto overflow-x-hidden"
      role="grid"
      aria-label={`Calendar day view: ${dayLabel} ${dateLabel}`}
    >
      <TimeGutter timeRange={timeRange} />
      <div className="flex flex-1">
        <DayColumn
          dayIndex={dayIndex}
          dayLabel={dayLabel}
          dateLabel={dateLabel}
          activities={activities}
          timeRange={timeRange}
          selectedEventId={selectedEventId}
          onSelectEvent={onSelectEvent}
          onClickDayHeader={() => {}} // no-op in day view
          collaborators={collaborators}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/DayView.tsx
git commit -m "feat: add DayView single-day expanded component"
```

---

### Task 11: AllDayRow component

**Files:**
- Create: `apps/web/components/calendar/AllDayRow.tsx`

- [ ] **Step 1: Create AllDayRow for flights and hotels**

```tsx
// apps/web/components/calendar/AllDayRow.tsx
'use client'

interface FlightBanner {
  id: string
  dayIndex: number
  label: string // e.g. "✈ CDG Arrival 7:30 AM"
  type: 'arrival' | 'departure'
}

interface HotelBanner {
  id: string
  startDay: number
  endDay: number
  label: string // e.g. "🏨 Hotel Le Marais"
}

interface AllDayRowProps {
  flights: FlightBanner[]
  hotels: HotelBanner[]
  totalDays: number
}

export function AllDayRow({ flights, hotels, totalDays }: AllDayRowProps) {
  if (flights.length === 0 && hotels.length === 0) return null

  return (
    <div className="flex border-b border-white/10 px-1 py-1.5">
      {/* Label */}
      <div className="w-14 flex-shrink-0 text-[10px] text-gray-400 pr-3 text-right pt-0.5">
        All day
      </div>
      {/* Day columns */}
      <div className="flex flex-1">
        {Array.from({ length: totalDays }, (_, dayIndex) => {
          const dayFlights = flights.filter((f) => f.dayIndex === dayIndex)
          const dayHotels = hotels.filter(
            (h) => dayIndex >= h.startDay && dayIndex <= h.endDay
          )

          return (
            <div key={dayIndex} className="flex-1 min-w-0 px-0.5 space-y-0.5">
              {dayFlights.map((f) => (
                <div
                  key={f.id}
                  className={`rounded px-2 py-0.5 text-[10px] truncate ${
                    f.type === 'arrival'
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'bg-red-500/15 text-red-400'
                  }`}
                >
                  {f.label}
                </div>
              ))}
              {dayHotels.map((h) => (
                <div
                  key={`${h.id}-${dayIndex}`}
                  className="rounded px-2 py-0.5 text-[10px] truncate bg-gray-500/15 text-gray-300"
                >
                  {dayIndex === h.startDay ? h.label : '─'}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/AllDayRow.tsx
git commit -m "feat: add AllDayRow for flights and hotels"
```

---

## Chunk 3: Shell Components — Header, Sidebar, Detail Panel

### Task 12: CalendarHeader component

**Files:**
- Create: `apps/web/components/calendar/CalendarHeader.tsx`

- [ ] **Step 1: Create CalendarHeader with view toggle and nav**

```tsx
// apps/web/components/calendar/CalendarHeader.tsx
'use client'

import type { ViewMode } from './types'

interface CalendarHeaderProps {
  tripName: string
  dateRange: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onBack: () => void
  onAddEvent: () => void
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
}

export function CalendarHeader({
  tripName,
  dateRange,
  viewMode,
  onViewModeChange,
  onBack,
  onAddEvent,
  connectionStatus,
}: CalendarHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors text-sm"
          aria-label="Back to trips"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-100">{tripName}</h1>
          <p className="text-xs text-gray-400">{dateRange}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {connectionStatus === 'reconnecting' && (
          <div className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
            Reconnecting to sync...
          </div>
        )}

        {/* View mode toggle */}
        <div className="flex bg-white/5 rounded-md p-0.5">
          {(['day', 'week'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-3 py-1 text-xs rounded transition-colors capitalize ${
                viewMode === mode
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <button
          onClick={onAddEvent}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md transition-colors"
        >
          + Add
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/CalendarHeader.tsx
git commit -m "feat: add CalendarHeader with view toggle and connection status"
```

---

### Task 13: DetailPanel component

**Files:**
- Create: `apps/web/components/calendar/DetailPanel.tsx`

- [ ] **Step 1: Create slide-in DetailPanel**

```tsx
// apps/web/components/calendar/DetailPanel.tsx
'use client'

import { AnimatePresence, motion } from 'motion/react'
import { DETAIL_PANEL_WIDTH } from './constants'
import { formatTimeRange } from './utils'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import type { CalendarActivity, UserAwareness } from './types'

interface DetailPanelProps {
  activity: CalendarActivity | null
  viewers: UserAwareness[]
  onClose: () => void
  onRemove: (id: string) => void
}

export function DetailPanel({ activity, viewers, onClose, onRemove }: DetailPanelProps) {
  return (
    <AnimatePresence>
      {activity && (
        <motion.aside
          role="complementary"
          aria-label="Activity details"
          initial={{ x: DETAIL_PANEL_WIDTH, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: DETAIL_PANEL_WIDTH, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute top-0 right-0 bottom-0 border-l border-white/10 bg-gray-900/95 backdrop-blur-sm z-30 overflow-y-auto"
          style={{ width: DETAIL_PANEL_WIDTH }}
        >
          <div className="p-4 flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <div
                  className="h-1 w-10 rounded-full mb-3"
                  style={{ background: getActivityColor(activity.type) }}
                />
                <h2 className="text-lg font-bold text-gray-100">{activity.title}</h2>
                <p className="text-xs text-gray-400 capitalize">{activity.type}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white p-1 transition-colors"
                aria-label="Close detail panel"
              >
                ✕
              </button>
            </div>

            {/* Details */}
            <div className="space-y-3 text-sm">
              <DetailRow icon="🕐" value={formatTimeRange(activity)} />
              {activity.location && <DetailRow icon="📍" value={activity.location} />}
              {activity.price && <DetailRow icon="💰" value={activity.price} />}
              {activity.rating && <DetailRow icon="⭐" value={String(activity.rating)} />}
            </div>

            {activity.notes && (
              <p className="text-xs text-gray-400 leading-relaxed mt-4">
                {activity.notes}
              </p>
            )}

            {/* Collaborator presence */}
            {viewers.length > 0 && (
              <div className="mt-auto pt-4 border-t border-white/10">
                {viewers.map((v) => (
                  <div key={v.userId} className="flex items-center gap-2 py-1">
                    <div
                      className="w-5 h-5 rounded-full text-[9px] flex items-center justify-center text-white"
                      style={{ background: v.color }}
                    >
                      {v.avatarInitial}
                    </div>
                    <span className="text-xs text-gray-400">{v.name} is viewing</span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 rounded-md transition-colors">
                Edit
              </button>
              <button
                onClick={() => onRemove(activity.id)}
                className="flex-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm py-2 rounded-md transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function DetailRow({ icon, value }: { icon: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-300">{value}</span>
    </div>
  )
}

```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/DetailPanel.tsx
git commit -m "feat: add DetailPanel slide-in component"
```

---

### Task 14: MiniCalendar component

**Files:**
- Create: `apps/web/components/calendar/MiniCalendar.tsx`

- [ ] **Step 1: Create MiniCalendar for sidebar**

```tsx
// apps/web/components/calendar/MiniCalendar.tsx
'use client'

interface MiniCalendarProps {
  tripStartDate: Date
  tripDays: number
  currentDay: number
  onSelectDay: (dayIndex: number) => void
}

const DAY_NAMES = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function MiniCalendar({
  tripStartDate,
  tripDays,
  currentDay,
  onSelectDay,
}: MiniCalendarProps) {
  const year = tripStartDate.getFullYear()
  const month = tripStartDate.getMonth()
  const firstDayOfMonth = new Date(year, month, 1)
  // Monday = 0 offset
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const tripStartDay = tripStartDate.getDate()
  const tripEndDay = tripStartDay + tripDays - 1

  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="px-2">
      <div className="text-[10px] text-gray-400 font-semibold text-center mb-2 uppercase tracking-wider">
        {MONTH_NAMES[month]} {year}
      </div>
      <div className="grid grid-cols-7 gap-px text-center">
        {DAY_NAMES.map((d, i) => (
          <div key={i} className="text-[8px] text-gray-500 py-0.5">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />

          const isTripDay = day >= tripStartDay && day <= tripEndDay
          const dayIndex = day - tripStartDay
          const isCurrentDay = isTripDay && dayIndex === currentDay

          return (
            <button
              key={day}
              onClick={() => isTripDay && onSelectDay(dayIndex)}
              disabled={!isTripDay}
              className={`text-[10px] py-0.5 rounded-full transition-colors
                ${isCurrentDay
                  ? 'bg-blue-500 text-white font-bold'
                  : isTripDay
                    ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 cursor-pointer'
                    : 'text-gray-500'
                }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/MiniCalendar.tsx
git commit -m "feat: add MiniCalendar for sidebar navigation"
```

---

### Task 15: CollaboratorAvatars component

**Files:**
- Create: `apps/web/components/calendar/CollaboratorAvatars.tsx`

- [ ] **Step 1: Create CollaboratorAvatars**

```tsx
// apps/web/components/calendar/CollaboratorAvatars.tsx
'use client'

import type { CalendarActivity, UserAwareness } from './types'

interface CollaboratorAvatarsProps {
  collaborators: UserAwareness[]
  activities: CalendarActivity[]
  expanded: boolean
}

export function CollaboratorAvatars({
  collaborators,
  activities,
  expanded,
}: CollaboratorAvatarsProps) {
  if (!expanded) {
    // Collapsed: stacked circles
    return (
      <div className="flex flex-col items-center gap-1 py-2">
        {collaborators.map((c) => (
          <div
            key={c.userId}
            className="relative w-7 h-7 rounded-full text-[10px] flex items-center justify-center text-white"
            style={{ background: c.color }}
            title={`${c.name}${c.isOnline ? '' : ' (offline)'}`}
          >
            {c.avatarInitial}
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900
                ${c.isOnline ? 'bg-green-400' : 'bg-gray-500'}`}
            />
          </div>
        ))}
      </div>
    )
  }

  // Expanded: full list with viewing status
  return (
    <div className="px-3 py-2 space-y-2">
      <div className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">
        Collaborators
      </div>
      {collaborators.map((c) => {
        const viewingActivity = c.selectedEventId
          ? activities.find((a) => a.id === c.selectedEventId)
          : null

        return (
          <div key={c.userId} className="flex items-center gap-2">
            <div className="relative">
              <div
                className="w-6 h-6 rounded-full text-[9px] flex items-center justify-center text-white"
                style={{ background: c.color }}
              >
                {c.avatarInitial}
              </div>
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-gray-900
                  ${c.isOnline ? 'bg-green-400' : 'bg-gray-500'}`}
              />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-200 truncate">{c.name}</div>
              {viewingActivity && c.isOnline && (
                <div className="text-[9px] text-gray-500 truncate">
                  Viewing {viewingActivity.title}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/CollaboratorAvatars.tsx
git commit -m "feat: add CollaboratorAvatars with collapsed/expanded modes"
```

---

### Task 16: TripSidebar component

**Files:**
- Create: `apps/web/components/calendar/TripSidebar.tsx`

- [ ] **Step 1: Create TripSidebar with hover expansion**

```tsx
// apps/web/components/calendar/TripSidebar.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_COLLAPSE_DELAY,
} from './constants'
import { MiniCalendar } from './MiniCalendar'
import { CollaboratorAvatars } from './CollaboratorAvatars'
import type { CalendarActivity, UserAwareness } from './types'

interface NavItem {
  id: string
  icon: string
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', icon: '🗺', label: 'Overview' },
  { id: 'calendar', icon: '📅', label: 'Calendar' },
  { id: 'info', icon: '📋', label: 'Info' },
  { id: 'budget', icon: '💰', label: 'Budget' },
  { id: 'settings', icon: '⚙', label: 'Settings' },
]

interface TripSidebarProps {
  activeNav: string
  onNavChange: (id: string) => void
  tripStartDate: Date
  tripDays: number
  currentDay: number
  onSelectDay: (dayIndex: number) => void
  collaborators: UserAwareness[]
  activities: CalendarActivity[]
}

export function TripSidebar({
  activeNav,
  onNavChange,
  tripStartDate,
  tripDays,
  currentDay,
  onSelectDay,
  collaborators,
  activities,
}: TripSidebarProps) {
  const [expanded, setExpanded] = useState(false)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current)
      collapseTimer.current = null
    }
    setExpanded(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    collapseTimer.current = setTimeout(() => {
      setExpanded(false)
    }, SIDEBAR_COLLAPSE_DELAY)
  }, [])

  return (
    <motion.nav
      role="complementary"
      aria-label="Trip sidebar"
      className="relative flex-shrink-0 bg-gray-900/80 border-r border-white/10 flex flex-col z-20 overflow-hidden"
      animate={{ width: expanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH }}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Nav items */}
      <div className="flex flex-col gap-0.5 py-2 px-1.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavChange(item.id)}
            className={`flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors
              ${activeNav === item.id
                ? 'bg-blue-500/15 text-blue-300'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            title={!expanded ? item.label : undefined}
          >
            <span className="text-base flex-shrink-0 w-5 text-center">{item.icon}</span>
            <AnimatePresence>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="truncate"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-white/10 mx-2 my-1" />

      {/* Mini calendar (expanded only) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MiniCalendar
              tripStartDate={tripStartDate}
              tripDays={tripDays}
              currentDay={currentDay}
              onSelectDay={onSelectDay}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider */}
      <div className="border-t border-white/10 mx-2 my-1" />

      {/* Collaborators */}
      <CollaboratorAvatars
        collaborators={collaborators}
        activities={activities}
        expanded={expanded}
      />
    </motion.nav>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/TripSidebar.tsx
git commit -m "feat: add TripSidebar with hover expand and collaborator presence"
```

---

## Chunk 4: Hooks, Dashboard Orchestrator, and Route Wiring

### Task 17: useCalendarDnd hook

**Files:**
- Create: `apps/web/components/calendar/hooks/useCalendarDnd.ts`

- [ ] **Step 1: Create drag-and-drop hook**

```typescript
// apps/web/components/calendar/hooks/useCalendarDnd.ts
'use client'

import { useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { HOUR_HEIGHT } from '../constants'
import type { CalendarActivity, TimeRange } from '../types'

// Re-export DndContext for use in CalendarDashboard
export { DndContext }

export function useCalendarDnd(
  timeRange: TimeRange,
  onMoveActivity: (id: string, newDay: number, newStartHour: number) => void,
) {
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  })
  const keyboardSensor = useSensor(KeyboardSensor)
  const sensors = useSensors(pointerSensor, keyboardSensor)

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over, delta } = event
      if (!over) return

      const activity = active.data.current?.activity as CalendarActivity | undefined
      if (!activity) return

      const overData = over.data.current as { dayIndex?: number } | undefined
      const newDay = overData?.dayIndex ?? activity.day

      // Calculate new start hour from vertical delta
      const hourDelta = Math.round(delta.y / HOUR_HEIGHT * 2) / 2 // snap to 30 min
      const newStartHour = Math.max(
        timeRange.startHour,
        Math.min(timeRange.endHour - activity.duration, activity.startHour + hourDelta)
      )

      if (newDay !== activity.day || newStartHour !== activity.startHour) {
        onMoveActivity(activity.id, newDay, newStartHour)
      }
    },
    [timeRange, onMoveActivity],
  )

  return { sensors, handleDragEnd, collisionDetection: closestCenter }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/hooks/useCalendarDnd.ts
git commit -m "feat: add useCalendarDnd hook"
```

---

### Task 18: useYjsSync hook (stub for now — real y-supabase wiring is a follow-up)

**Files:**
- Create: `apps/web/components/calendar/hooks/useYjsSync.ts`

- [ ] **Step 1: Create Yjs sync hook with mock fallback**

This hook will be the integration point for y-supabase. For now it manages local state with the same interface, so the dashboard works with mock data immediately.

```typescript
// apps/web/components/calendar/hooks/useYjsSync.ts
'use client'

import { useState, useCallback } from 'react'
import { MOCK_CALENDAR_ACTIVITIES, MOCK_COLLABORATORS } from '@travyl/shared/config/mockItineraryData'
import type { CalendarActivity, UserAwareness } from '../types'

type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected'

interface YjsSyncResult {
  activities: CalendarActivity[]
  collaborators: UserAwareness[]
  connectionStatus: ConnectionStatus
  updateActivity: (id: string, updates: Partial<CalendarActivity>) => void
  moveActivity: (id: string, newDay: number, newStartHour: number) => void
  removeActivity: (id: string) => void
}

/**
 * Stub hook — manages local state with y-supabase-compatible interface.
 * Replace internals with real Yjs sync when y-supabase is wired up.
 */
export function useYjsSync(tripId: string): YjsSyncResult {
  const [activities, setActivities] = useState<CalendarActivity[]>(MOCK_CALENDAR_ACTIVITIES)
  const [collaborators] = useState<UserAwareness[]>(MOCK_COLLABORATORS)

  const updateActivity = useCallback((id: string, updates: Partial<CalendarActivity>) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    )
  }, [])

  const moveActivity = useCallback((id: string, newDay: number, newStartHour: number) => {
    setActivities((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, day: newDay, startHour: newStartHour } : a
      )
    )
  }, [])

  const removeActivity = useCallback((id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id))
  }, [])

  return {
    activities,
    collaborators,
    connectionStatus: 'connected',
    updateActivity,
    moveActivity,
    removeActivity,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/hooks/useYjsSync.ts
git commit -m "feat: add useYjsSync stub hook with mock data"
```

---

### Task 18b: useCollaboratorPresence hook (stub)

**Files:**
- Create: `apps/web/components/calendar/hooks/useCollaboratorPresence.ts`

- [ ] **Step 1: Create presence hook stub**

This manages the local user's awareness state and reads other clients' presence. Stubbed for now — will connect to `provider.awareness` when y-supabase is wired up.

```typescript
// apps/web/components/calendar/hooks/useCollaboratorPresence.ts
'use client'

import { useCallback } from 'react'
import type { UserAwareness, ViewMode } from '../types'

interface CollaboratorPresenceResult {
  setSelectedEvent: (eventId: string | null) => void
  setCurrentView: (view: ViewMode) => void
}

/**
 * Stub hook — manages local user's awareness state.
 * When y-supabase is wired up, this will call:
 *   provider.awareness.setLocalState({ ...localState, selectedEventId, currentView })
 * and read other clients via:
 *   provider.awareness.getStates()
 *
 * For now, collaborator list comes from useYjsSync mock data.
 * This hook only manages the local user's broadcast state.
 */
export function useCollaboratorPresence(
  collaborators: UserAwareness[],
): CollaboratorPresenceResult {
  const setSelectedEvent = useCallback((_eventId: string | null) => {
    // TODO: provider.awareness.setLocalStateField('selectedEventId', eventId)
  }, [])

  const setCurrentView = useCallback((_view: ViewMode) => {
    // TODO: provider.awareness.setLocalStateField('currentView', view)
  }, [])

  return { setSelectedEvent, setCurrentView }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/hooks/useCollaboratorPresence.ts
git commit -m "feat: add useCollaboratorPresence stub hook"
```

---

### Task 19: useCalendarNavigation hook

**Files:**
- Create: `apps/web/components/calendar/hooks/useCalendarNavigation.ts`

- [ ] **Step 1: Create navigation state hook**

```typescript
// apps/web/components/calendar/hooks/useCalendarNavigation.ts
'use client'

import { useState, useCallback } from 'react'
import type { ViewMode } from '../types'

interface CalendarNavigationResult {
  viewMode: ViewMode
  selectedDayIndex: number
  selectedEventId: string | null
  setViewMode: (mode: ViewMode) => void
  selectDay: (dayIndex: number) => void
  selectEvent: (id: string | null) => void
  goToDayView: (dayIndex: number) => void
  goToWeekView: () => void
}

export function useCalendarNavigation(initialDay: number = 0): CalendarNavigationResult {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedDayIndex, setSelectedDayIndex] = useState(initialDay)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const goToDayView = useCallback((dayIndex: number) => {
    setSelectedDayIndex(dayIndex)
    setViewMode('day')
  }, [])

  const goToWeekView = useCallback(() => {
    setViewMode('week')
  }, [])

  const selectEvent = useCallback((id: string | null) => {
    setSelectedEventId(id)
  }, [])

  return {
    viewMode,
    selectedDayIndex,
    selectedEventId,
    setViewMode,
    selectDay: setSelectedDayIndex,
    selectEvent,
    goToDayView,
    goToWeekView,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/hooks/useCalendarNavigation.ts
git commit -m "feat: add useCalendarNavigation hook"
```

---

### Task 20: CalendarDashboard orchestrator

**Files:**
- Create: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Create CalendarDashboard — the full-page layout**

```tsx
// apps/web/components/calendar/CalendarDashboard.tsx
'use client'

import { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DndContext } from '@dnd-kit/core'
import { computeTimeRange } from '@travyl/shared/viewmodels/calendarViewModel'
import { CalendarHeader } from './CalendarHeader'
import { TripSidebar } from './TripSidebar'
import { AllDayRow } from './AllDayRow'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import { DetailPanel } from './DetailPanel'
import { HOUR_HEIGHT } from './constants'
import { useCalendarDnd } from './hooks/useCalendarDnd'
import { useYjsSync } from './hooks/useYjsSync'
import { useCalendarNavigation } from './hooks/useCalendarNavigation'
import { useCollaboratorPresence } from './hooks/useCollaboratorPresence'
import { MOCK_TRIP, MOCK_FLIGHTS, MOCK_HOTELS } from '@travyl/shared/config/mockItineraryData'

const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

interface CalendarDashboardProps {
  tripId: string
}

export function CalendarDashboard({ tripId }: CalendarDashboardProps) {
  const {
    activities,
    collaborators,
    connectionStatus,
    moveActivity,
    removeActivity,
  } = useYjsSync(tripId)

  const {
    viewMode,
    selectedDayIndex,
    selectedEventId,
    setViewMode,
    selectDay,
    selectEvent,
    goToDayView,
  } = useCalendarNavigation()

  const { setSelectedEvent, setCurrentView } = useCollaboratorPresence(collaborators)

  // Broadcast view mode and selection to collaborators
  useEffect(() => { setCurrentView(viewMode) }, [viewMode, setCurrentView])
  useEffect(() => { setSelectedEvent(selectedEventId) }, [selectedEventId, setSelectedEvent])

  // Derive trip days from mock data (will come from API later)
  const tripStartDate = useMemo(() => new Date(MOCK_TRIP.start_date), [])
  const tripDays = MOCK_TRIP.duration_days ?? 5

  const days = useMemo(
    () =>
      Array.from({ length: tripDays }, (_, i) => {
        const date = new Date(tripStartDate)
        date.setDate(date.getDate() + i)
        return {
          dayIndex: i,
          dayLabel: WEEKDAY_LABELS[date.getDay() === 0 ? 6 : date.getDay() - 1],
          dateLabel: String(date.getDate()),
        }
      }),
    [tripStartDate, tripDays],
  )

  const timeRange = useMemo(() => computeTimeRange(activities), [activities])

  const { sensors, handleDragEnd, collisionDetection } = useCalendarDnd(
    timeRange,
    moveActivity,
  )

  // Auto-scroll to first event on load and day change
  const gridRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!gridRef.current || activities.length === 0) return
    const dayActivities = activities.filter((a) => a.day === selectedDayIndex)
    if (dayActivities.length === 0) return
    const earliestHour = Math.min(...dayActivities.map((a) => a.startHour))
    const scrollTop = Math.max(0, (earliestHour - timeRange.startHour - 0.5) * HOUR_HEIGHT)
    gridRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' })
  }, [selectedDayIndex, activities, timeRange])

  const selectedActivity = selectedEventId
    ? activities.find((a) => a.id === selectedEventId) ?? null
    : null

  const selectedViewers = selectedEventId
    ? collaborators.filter((c) => c.selectedEventId === selectedEventId)
    : []

  // Mock flight/hotel banners
  const flightBanners = MOCK_FLIGHTS.map((f, i) => ({
    id: f.id,
    dayIndex: i === 0 ? 0 : tripDays - 1,
    label: `✈ ${f.segments[0].arrival_iata} ${i === 0 ? 'Arrival' : 'Departure'}`,
    type: (i === 0 ? 'arrival' : 'departure') as 'arrival' | 'departure',
  }))

  const hotelBanners = MOCK_HOTELS.map((h) => ({
    id: h.id,
    startDay: 0,
    endDay: tripDays - 1,
    label: `🏨 ${h.name}`,
  }))

  const dateRange = `${tripStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${
    new Date(tripStartDate.getTime() + (tripDays - 1) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }`

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      <TripSidebar
        activeNav="calendar"
        onNavChange={() => {}}
        tripStartDate={tripStartDate}
        tripDays={tripDays}
        currentDay={selectedDayIndex}
        onSelectDay={selectDay}
        collaborators={collaborators}
        activities={activities}
      />

      <div className="flex flex-col flex-1 min-w-0 relative">
        <CalendarHeader
          tripName={MOCK_TRIP.destination}
          dateRange={dateRange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onBack={() => window.history.back()}
          onAddEvent={() => {}}
          connectionStatus={connectionStatus}
        />

        <AllDayRow
          flights={flightBanners}
          hotels={hotelBanners}
          totalDays={tripDays}
        />

        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragEnd={handleDragEnd}
        >
          <div ref={gridRef} className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {viewMode === 'week' ? (
                <motion.div
                  key="week"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  <WeekView
                    days={days}
                    activities={activities}
                    timeRange={timeRange}
                    selectedEventId={selectedEventId}
                    onSelectEvent={selectEvent}
                    onClickDayHeader={goToDayView}
                    collaborators={collaborators}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="day"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  <DayView
                    dayIndex={selectedDayIndex}
                    dayLabel={days[selectedDayIndex]?.dayLabel ?? ''}
                    dateLabel={days[selectedDayIndex]?.dateLabel ?? ''}
                    activities={activities.filter((a) => a.day === selectedDayIndex)}
                    timeRange={timeRange}
                    selectedEventId={selectedEventId}
                    onSelectEvent={selectEvent}
                    collaborators={collaborators}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            {activities.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-400 text-sm">No activities yet.</p>
                  <button className="mt-2 text-blue-400 hover:text-blue-300 text-sm">
                    Click + to start planning
                  </button>
                </div>
              </div>
            )}

            <DetailPanel
              activity={selectedActivity}
              viewers={selectedViewers}
              onClose={() => selectEvent(null)}
              onRemove={(id) => {
                removeActivity(id)
                selectEvent(null)
              }}
            />
          </div>
        </DndContext>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: add CalendarDashboard full-page orchestrator"
```

---

### Task 21: Wire up the route

**Files:**
- Modify: `apps/web/app/trip/[id]/page.tsx`
- Modify: `apps/web/app/trip/[id]/layout.tsx`

- [ ] **Step 1: Update trip page to render CalendarDashboard**

Replace the contents of `apps/web/app/trip/[id]/page.tsx` with:

```tsx
import { CalendarDashboard } from '@/components/calendar/CalendarDashboard'

interface TripPageProps {
  params: Promise<{ id: string }>
}

export default async function TripPage({ params }: TripPageProps) {
  const { id } = await params
  return <CalendarDashboard tripId={id} />
}
```

- [ ] **Step 2: Simplify the layout**

Replace `apps/web/app/trip/[id]/layout.tsx` with:

```tsx
export default function TripLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
```

- [ ] **Step 3: Remove old trip-layout-inner.tsx**

Delete `apps/web/app/trip/[id]/trip-layout-inner.tsx` and verify no remaining imports reference it:

```bash
rm apps/web/app/trip/[id]/trip-layout-inner.tsx
```

Search for stale imports:

```bash
grep -r "trip-layout-inner\|TripLayoutInner" apps/web/ --include="*.tsx" --include="*.ts"
```

Remove any remaining import lines found.

- [ ] **Step 4: Run the dev server and verify**

Run: `cd apps/web && npx next dev`

Open `http://localhost:3000/trip/test-trip-1` in the browser. Expected:
- Full-page calendar dashboard with dark background
- Sidebar on the left (collapsed, expands on hover)
- Calendar header with "Paris" and date range
- All-day row with flight/hotel banners
- Week grid with color-coded event blocks
- Click an event → detail panel slides in from right
- Drag an event → moves to new position
- View transitions animate smoothly between week/day

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire CalendarDashboard to trip route, remove old layout"
```

---

## Chunk 5: Polish and Cleanup

### Task 22: Current time indicator

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx`

- [ ] **Step 1: Add current time red line to DayColumn**

Add to `DayColumn.tsx`, inside the column body div, after the event blocks:

```tsx
// Add a CurrentTimeIndicator that renders if today falls on this day column
function CurrentTimeIndicator({ dayIndex, tripStartDate, timeRange }: {
  dayIndex: number
  tripStartDate: Date
  timeRange: TimeRange
}) {
  const now = new Date()
  const dayDate = new Date(tripStartDate)
  dayDate.setDate(dayDate.getDate() + dayIndex)

  const isToday =
    now.getFullYear() === dayDate.getFullYear() &&
    now.getMonth() === dayDate.getMonth() &&
    now.getDate() === dayDate.getDate()

  if (!isToday) return null

  const currentHour = now.getHours() + now.getMinutes() / 60
  if (currentHour < timeRange.startHour || currentHour > timeRange.endHour) return null

  const top = (currentHour - timeRange.startHour) * HOUR_HEIGHT

  return (
    <div
      className="absolute left-0 right-0 z-20 pointer-events-none"
      style={{ top }}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
        <div className="flex-1 h-px bg-red-500" />
      </div>
    </div>
  )
}
```

Add `tripStartDate` as a prop to `DayColumn` and render `<CurrentTimeIndicator>` inside the column body.

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/DayColumn.tsx
git commit -m "feat: add current time indicator line to DayColumn"
```

---

### Task 23: Keyboard navigation

**Files:**
- Modify: `apps/web/components/calendar/WeekView.tsx`

- [ ] **Step 1: Add keyboard event handler to WeekView**

Add this to WeekView, wrapping the grid:

```tsx
// Add to WeekView component
const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
  if (e.key === 'Escape') {
    onSelectEvent('')  // deselect
    return
  }
  // Arrow key navigation between events is handled by browser tabIndex ordering
}, [onSelectEvent])
```

Add `onKeyDown={handleKeyDown}` to the outer div of WeekView.

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/WeekView.tsx
git commit -m "feat: add keyboard navigation to WeekView"
```

---

### Task 24: Loading, error, and empty states

**Files:**
- Create: `apps/web/components/calendar/CalendarSkeleton.tsx`
- Modify: `apps/web/components/calendar/hooks/useYjsSync.ts`

- [ ] **Step 1: Add loading/error state to useYjsSync**

Update the `YjsSyncResult` interface and hook in `useYjsSync.ts`:

```typescript
interface YjsSyncResult {
  activities: CalendarActivity[]
  collaborators: UserAwareness[]
  connectionStatus: ConnectionStatus
  isLoading: boolean
  error: string | null
  updateActivity: (id: string, updates: Partial<CalendarActivity>) => void
  moveActivity: (id: string, newDay: number, newStartHour: number) => void
  removeActivity: (id: string) => void
}
```

Add `isLoading: false` and `error: null` to the stub return value. When real y-supabase is wired, these will be driven by provider state.

- [ ] **Step 2: Create CalendarSkeleton component**

```tsx
// apps/web/components/calendar/CalendarSkeleton.tsx
'use client'

export function CalendarSkeleton() {
  return (
    <div className="flex h-screen bg-gray-950 animate-pulse">
      {/* Sidebar skeleton */}
      <div className="w-12 bg-gray-900/80 border-r border-white/10" />
      <div className="flex flex-col flex-1">
        {/* Header skeleton */}
        <div className="h-14 border-b border-white/10 px-4 flex items-center gap-3">
          <div className="h-4 w-32 bg-gray-800 rounded" />
          <div className="h-4 w-20 bg-gray-800 rounded" />
        </div>
        {/* Grid skeleton */}
        <div className="flex flex-1 p-4 gap-1">
          <div className="w-14" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex-1 space-y-2">
              <div className="h-6 bg-gray-800 rounded mx-1" />
              <div className="h-full bg-gray-900/50 rounded mx-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add error state component**

```tsx
// apps/web/components/calendar/CalendarError.tsx
'use client'

interface CalendarErrorProps {
  message: string
  onBack: () => void
}

export function CalendarError({ message, onBack }: CalendarErrorProps) {
  return (
    <div className="flex h-screen bg-gray-950 items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 text-sm mb-2">{message}</p>
        <button
          onClick={onBack}
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          ← Back to trips
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire loading/error into CalendarDashboard**

Add at the top of CalendarDashboard's body (before the return):

```tsx
const { activities, collaborators, connectionStatus, isLoading, error, ... } = useYjsSync(tripId)

if (error) return <CalendarError message={error} onBack={() => window.history.back()} />
if (isLoading) return <CalendarSkeleton />
```

Note: the empty state is already handled inline in CalendarDashboard (added in Task 19).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/CalendarSkeleton.tsx apps/web/components/calendar/CalendarError.tsx apps/web/components/calendar/hooks/useYjsSync.ts apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: add loading skeleton, error, and empty states"
```

---

### Task 25: Final cleanup and type-check

- [ ] **Step 1: Run type-check**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -30`
Fix any type errors found.

- [ ] **Step 2: Run existing tests**

Run: `cd packages/shared && npx vitest run`
Expected: ALL PASS

- [ ] **Step 3: Run lint**

Run: `cd apps/web && npx eslint components/calendar/ --max-warnings 0 2>&1 | head -20`
Fix any lint errors found.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve type and lint issues in calendar components"
```

---

### Task 26: Final integration commit

- [ ] **Step 1: Verify the full app builds**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 2: Create summary commit if needed**

If all previous commits are clean, no action needed. If there were fixes:

```bash
git add -A
git commit -m "feat: calendar page redesign — complete implementation"
```
