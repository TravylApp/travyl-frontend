# Trip Rescope Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a navbar-anchored popover to the calendar that lets users change a trip's dates and destination, with safe conflict resolution when shrinking orphans activities.

**Architecture:** `CalendarActivity.day` is a relative offset from `tripStartDate` — shift/expand need only a trip table update; shrink needs conflict detection and activity mutations via `useActivityMutations`. Pure helper functions live in `@travyl/shared` for testability; the stateful hook and all UI are web-local.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Yjs, Supabase, React Query v5, `date-fns`, `iconoir-react`, Vitest (shared package only)

**Spec:** `docs/superpowers/specs/2026-03-22-trip-rescope-design.md`

---

## Chunk 1: Type Foundation

### Task 1: Add `unscheduled` field to shared types and Yjs key lists

**Files:**
- Modify: `packages/shared/src/types/index.ts`
- Modify: `apps/web/components/calendar/hooks/useActivityMutations.ts`
- Modify: `apps/web/components/calendar/hooks/useYjsSync.ts`

- [ ] **Step 1: Add `unscheduled` to `ActivityData` in `packages/shared/src/types/index.ts`**

  Find the `ActivityData` interface (~line 423) and add the field:
  ```ts
  export interface ActivityData {
    category?: string
    location_name?: string
    image_url?: string
    rating?: number
    flight_number?: string
    airline?: string
    check_in?: string
    check_out?: string
    booking_ref?: string
    pollResult?: 'remove'
    unscheduled?: boolean   // ← add this line
  }
  ```

- [ ] **Step 2: Add `unscheduled` to `CalendarActivity` in the same file**

  Find the `CalendarActivity` interface (~line 436) and add after `pollResult`:
  ```ts
  /** True when removed from calendar by a rescope but not deleted. */
  unscheduled?: boolean
  ```

- [ ] **Step 3: Add `'unscheduled'` to `CALENDAR_ACTIVITY_KEYS` in `useActivityMutations.ts`**

  Find `CALENDAR_ACTIVITY_KEYS` (~line 7) and add `'unscheduled'` after `'pollResult'`:
  ```ts
  const CALENDAR_ACTIVITY_KEYS = [
    // ... existing keys ...
    'pollResult',
    'unscheduled',   // ← add this line
  ] as const
  ```

- [ ] **Step 4: Add `'unscheduled'` to `CALENDAR_ACTIVITY_KEYS` in `useYjsSync.ts`**

  Find `CALENDAR_ACTIVITY_KEYS` (~line 18) and add `'unscheduled'` after `'pollResult'`:
  ```ts
  const CALENDAR_ACTIVITY_KEYS: (keyof CalendarActivity)[] = [
    // ... existing keys ...
    'pollResult',
    'unscheduled',   // ← add this line
  ]
  ```

- [ ] **Step 5: Run typecheck to confirm no regressions**

  ```bash
  cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck
  ```
  Expected: 0 errors.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/shared/src/types/index.ts \
    apps/web/components/calendar/hooks/useActivityMutations.ts \
    apps/web/components/calendar/hooks/useYjsSync.ts
  git commit -m "feat: add unscheduled field to CalendarActivity and Yjs key lists"
  ```

---

### Task 2: Update `activityMapper.ts` to persist `unscheduled`

**Files:**
- Modify: `packages/shared/src/utils/activityMapper.ts`
- Modify: `packages/shared/src/utils/activityMapper.test.ts`

- [ ] **Step 1: Write failing tests for mapper round-trip of `unscheduled`**

  Add to `packages/shared/src/utils/activityMapper.test.ts`. Note: `ActivityRow` is already imported at line 13 of this file — **do not add a duplicate import**. Just add the test cases:
  ```ts
  describe('toActivityRow — unscheduled', () => {
    const base: CalendarActivity = {
      id: 'a1', title: 'Test', type: 'sightseeing',
      day: 3, startHour: 9, duration: 2,
    }
    const tripStartDate = '2026-06-12'

    it('persists unscheduled: true to activity_data', () => {
      const row = toActivityRow({ ...base, unscheduled: true }, 'trip1', 'user1', tripStartDate)
      expect((row.activity_data as Record<string, unknown>).unscheduled).toBe(true)
    })

    it('persists unscheduled: false to activity_data', () => {
      const row = toActivityRow({ ...base, unscheduled: false }, 'trip1', 'user1', tripStartDate)
      expect((row.activity_data as Record<string, unknown>).unscheduled).toBe(false)
    })

    it('omits unscheduled from activity_data when undefined', () => {
      const row = toActivityRow(base, 'trip1', 'user1', tripStartDate)
      expect((row.activity_data as Record<string, unknown>).unscheduled).toBeUndefined()
    })
  })

  describe('toCalendarActivity — unscheduled', () => {
    const baseRow: ActivityRow = {
      id: 'a1', trip_id: 'trip1', user_id: 'user1',
      activity_name: 'Test', activity_type: 'sightseeing',
      starting_date: '2026-06-15', ending_date: '2026-06-15',
      starting_time: '09:00', ending_time: '11:00',
      estimated_cost: 0, latitude: 0, longitude: 0,
      currency: null, notes: null, sort_order: 0,
      activity_data: { category: 'sightseeing', unscheduled: true },
      created_at: '', updated_at: '',
    }
    const tripStartDate = '2026-06-12'

    it('reads unscheduled: true from activity_data', () => {
      const cal = toCalendarActivity(baseRow, tripStartDate)
      expect(cal.unscheduled).toBe(true)
    })

    it('defaults unscheduled to false when not in activity_data', () => {
      const row = { ...baseRow, activity_data: { category: 'sightseeing' } }
      const cal = toCalendarActivity(row, tripStartDate)
      expect(cal.unscheduled).toBe(false)
    })
  })
  ```

- [ ] **Step 2: Run tests to verify they fail**

  ```bash
  cd /c/Users/justi/dev/travyl2/travyl-frontend/packages/shared && npm test -- activityMapper
  ```
  Expected: 5 new failures about `unscheduled`.

- [ ] **Step 3: Update `toActivityRow` in `activityMapper.ts`**

  Find the `activity_data` object in `toActivityRow` (~line 132) and add `unscheduled`:
  ```ts
  activity_data: {
    category: cal.type,
    location_name: cal.location,
    image_url: cal.image,
    rating: cal.rating,
    pollResult: cal.pollResult,
    flight_number: cal.flightNumber,
    airline: cal.airline,
    check_in: cal.checkIn,
    check_out: cal.checkOut,
    booking_ref: cal.bookingRef,
    ...(cal.unscheduled !== undefined && { unscheduled: cal.unscheduled }),
  },
  ```

- [ ] **Step 4: Update `toCalendarActivity` in `activityMapper.ts`**

  Find the return object in `toCalendarActivity` (~line 86) and add after `pollResult`:
  ```ts
  unscheduled: row.activity_data?.unscheduled ?? false,
  ```

- [ ] **Step 5: Run tests to verify they pass**

  ```bash
  cd /c/Users/justi/dev/travyl2/travyl-frontend/packages/shared && npm test -- activityMapper
  ```
  Expected: all pass.

- [ ] **Step 6: Run full shared test suite**

  ```bash
  cd /c/Users/justi/dev/travyl2/travyl-frontend/packages/shared && npm test
  ```
  Expected: all pass.

- [ ] **Step 7: Commit**

  ```bash
  git add packages/shared/src/utils/activityMapper.ts \
    packages/shared/src/utils/activityMapper.test.ts
  git commit -m "feat: persist unscheduled flag through activityMapper round-trip"
  ```

---

## Chunk 2: Business Logic

### Task 3: Pure rescoper helpers with tests

**Files:**
- Create: `packages/shared/src/utils/rescoper.ts`
- Create: `packages/shared/src/utils/rescoper.test.ts`

- [ ] **Step 1: Write failing tests**

  Create `packages/shared/src/utils/rescoper.test.ts`:
  ```ts
  import { describe, it, expect } from 'vitest'
  import { detectOperation, getConflictingActivities, computeNewTotalDays } from './rescoper'
  import type { CalendarActivity } from '../types'

  const d = (s: string) => new Date(s + 'T00:00:00Z')

  describe('computeNewTotalDays', () => {
    it('returns 7 for a 7-night trip', () => {
      expect(computeNewTotalDays(d('2026-06-12'), d('2026-06-19'))).toBe(7)
    })
    it('returns 1 for same-day start/end', () => {
      expect(computeNewTotalDays(d('2026-06-12'), d('2026-06-13'))).toBe(1)
    })
  })

  describe('detectOperation', () => {
    const oldStart = d('2026-06-12')
    const oldEnd   = d('2026-06-19') // 7 nights

    it('returns metadata-only when dates are identical', () => {
      expect(detectOperation(oldStart, oldEnd, oldStart, oldEnd)).toBe('metadata-only')
    })
    it('detects expand when new range is longer', () => {
      expect(detectOperation(oldStart, oldEnd, oldStart, d('2026-06-20'))).toBe('expand')
      expect(detectOperation(oldStart, oldEnd, d('2026-06-11'), oldEnd)).toBe('expand')
    })
    it('detects shift when duration unchanged but start moved', () => {
      expect(detectOperation(oldStart, oldEnd, d('2026-06-14'), d('2026-06-21'))).toBe('shift')
    })
    it('detects shrink when new range is shorter', () => {
      expect(detectOperation(oldStart, oldEnd, oldStart, d('2026-06-18'))).toBe('shrink')
    })
    it('prefers shrink over expand when both ends moved asymmetrically resulting in shorter range', () => {
      // start moved +2, end moved +1 → net shrink by 1 day
      expect(detectOperation(oldStart, oldEnd, d('2026-06-14'), d('2026-06-20'))).toBe('shrink')
    })
  })

  describe('getConflictingActivities', () => {
    const acts: CalendarActivity[] = [
      { id: 'a', title: 'A', type: 'sightseeing', day: 3, startHour: 9, duration: 1 },
      { id: 'b', title: 'B', type: 'sightseeing', day: 6, startHour: 10, duration: 1 },
      { id: 'c', title: 'C', type: 'hotel', day: 4, endDay: 7, startHour: 14, duration: 2 },
    ]

    it('returns activities where day >= newTotalDays', () => {
      const conflicts = getConflictingActivities(acts, 6)
      expect(conflicts.map(a => a.id)).toEqual(expect.arrayContaining(['b']))
      expect(conflicts.map(a => a.id)).not.toContain('a')
    })

    it('includes activities where endDay >= newTotalDays', () => {
      const conflicts = getConflictingActivities(acts, 6)
      expect(conflicts.map(a => a.id)).toContain('c') // endDay 7 >= 6
    })

    it('returns empty array when all activities fit', () => {
      expect(getConflictingActivities(acts, 10)).toHaveLength(0)
    })
  })
  ```

- [ ] **Step 2: Run to confirm failures**

  ```bash
  cd /c/Users/justi/dev/travyl2/travyl-frontend/packages/shared && npm test -- rescoper
  ```
  Expected: module not found errors / failures.

- [ ] **Step 3: Implement `packages/shared/src/utils/rescoper.ts`**

  First confirm `date-fns` is available:
  ```bash
  grep '"date-fns"' /c/Users/justi/dev/travyl2/travyl-frontend/packages/shared/package.json
  ```
  Expected: a version line. If absent, run `npm install --workspace=packages/shared date-fns`.

  ```ts
  import { differenceInCalendarDays } from 'date-fns'
  import type { CalendarActivity } from '../types'

  export type RescoperOperation = 'metadata-only' | 'expand' | 'shift' | 'shrink'

  /**
   * Number of calendar days in the trip (end exclusive of start).
   * Uses date-fns to handle DST transitions correctly.
   */
  export function computeNewTotalDays(startDate: Date, endDate: Date): number {
    return differenceInCalendarDays(endDate, startDate)
  }

  /**
   * Determine which operation type applies when rescoping a trip.
   * Precedence: Shrink → Expand → Shift → Metadata-only.
   */
  export function detectOperation(
    oldStart: Date,
    oldEnd: Date,
    newStart: Date,
    newEnd: Date,
  ): RescoperOperation {
    const oldDays = computeNewTotalDays(oldStart, oldEnd)
    const newDays = computeNewTotalDays(newStart, newEnd)

    if (newDays < oldDays) return 'shrink'
    if (newDays > oldDays) return 'expand'
    if (newStart.getTime() !== oldStart.getTime()) return 'shift'
    return 'metadata-only'
  }

  /**
   * Return activities that fall outside [0, newTotalDays).
   * Uses endDay when present (multi-day activities).
   */
  export function getConflictingActivities(
    activities: CalendarActivity[],
    newTotalDays: number,
  ): CalendarActivity[] {
    return activities.filter(
      (a) => (a.endDay ?? a.day) >= newTotalDays,
    )
  }
  ```

- [ ] **Step 4: Export from `utils/index.ts`**

  Add to `packages/shared/src/utils/index.ts` (following the existing re-export pattern):
  ```ts
  export { detectOperation, getConflictingActivities, computeNewTotalDays } from './rescoper'
  export type { RescoperOperation } from './rescoper'
  ```

- [ ] **Step 5: Run tests**

  ```bash
  cd /c/Users/justi/dev/travyl2/travyl-frontend/packages/shared && npm test -- rescoper
  ```
  Expected: all pass.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/shared/src/utils/rescoper.ts \
    packages/shared/src/utils/rescoper.test.ts \
    packages/shared/src/index.ts
  git commit -m "feat: add pure rescoper helpers with tests"
  ```

---

### Task 4: `useRescope` hook

**Files:**
- Create: `apps/web/components/calendar/hooks/useRescope.ts`

- [ ] **Step 1: Create the hook**

  Note on imports: `CalendarActivity` is re-exported from `apps/web/components/calendar/types.ts` (which re-exports from `@travyl/shared`), so the import from `'../types'` is correct for web-local files. No stale-closure risk in the hook below — each callback lists its full dep array and no helper function is shared between callbacks.

  Create `apps/web/components/calendar/hooks/useRescope.ts`:
  ```ts
  'use client'

  import { useState, useCallback } from 'react'
  import { useQueryClient } from '@tanstack/react-query'
  import { updateTripDetails, detectOperation, getConflictingActivities, computeNewTotalDays } from '@travyl/shared'
  import type { Trip } from '@travyl/shared'
  import type { CalendarActivity } from '../types'
  import { useActivityMutations } from './useActivityMutations'

  export interface RescopePatch {
    destination?: string
    startDate: Date
    endDate: Date
  }

  export type ConflictResolution = 'moveToLastDay' | 'unscheduled'
  export type RescoperStatus = 'idle' | 'pending-conflict' | 'loading' | 'error'

  export interface UseRescopeReturn {
    status: RescoperStatus
    conflicts: CalendarActivity[]
    // oldStartDate / oldEndDate tell the hook how to classify the change
    rescope: (patch: RescopePatch, oldStartDate: Date, oldEndDate: Date) => void
    confirmRescope: (resolution: ConflictResolution) => Promise<void>
    cancelRescope: () => void
  }

  /**
   * tripStartDate — ISO date string from the trip record (e.g. "2026-06-12").
   *   Passed to useActivityMutations so it can compute absolute dates for Yjs flush.
   * userId — required by useActivityMutations to stamp mutations.
   * scheduledActivities — activities where !a.unscheduled (filtered by CalendarDashboard).
   */
  export function useRescope(
    tripId: string,
    tripStartDate: string,
    userId: string,
    scheduledActivities: CalendarActivity[],
  ): UseRescopeReturn {
    const queryClient = useQueryClient()
    const { updateActivity } = useActivityMutations(tripId, tripStartDate, userId)

    const [status, setStatus] = useState<RescoperStatus>('idle')
    const [conflicts, setConflicts] = useState<CalendarActivity[]>([])
    const [pendingPatch, setPendingPatch] = useState<RescopePatch | null>(null)

    // Direct execute — no conflict modal, called from rescope() when no conflicts found
    const executeDirectly = useCallback(
      async (patch: RescopePatch) => {
        setStatus('loading')
        try {
          const tripUpdate: Partial<Pick<Trip, 'destination' | 'start_date' | 'end_date'>> = {
            start_date: patch.startDate.toISOString().slice(0, 10),
            end_date: patch.endDate.toISOString().slice(0, 10),
          }
          if (patch.destination !== undefined) tripUpdate.destination = patch.destination
          await updateTripDetails(tripId, tripUpdate)
          await queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
          setStatus('idle')
          setPendingPatch(null)
        } catch {
          setStatus('error')
        }
      },
      [tripId, queryClient],
    )

    const rescope = useCallback(
      (patch: RescopePatch, oldStartDate: Date, oldEndDate: Date) => {
        const op = detectOperation(oldStartDate, oldEndDate, patch.startDate, patch.endDate)

        if (op === 'shrink') {
          const newTotalDays = computeNewTotalDays(patch.startDate, patch.endDate)
          const found = getConflictingActivities(scheduledActivities, newTotalDays)
          if (found.length > 0) {
            setConflicts(found)
            setPendingPatch(patch)
            setStatus('pending-conflict')
            return
          }
        }

        void executeDirectly(patch)
      },
      [scheduledActivities, executeDirectly],
    )

    // confirmRescope lists pendingPatch and conflicts as deps — React recreates this
    // callback after the state update in rescope(), so it always has fresh values.
    const confirmRescope = useCallback(
      async (resolution: ConflictResolution) => {
        if (!pendingPatch) return
        setStatus('loading')
        try {
          const tripUpdate: Partial<Pick<Trip, 'destination' | 'start_date' | 'end_date'>> = {
            start_date: pendingPatch.startDate.toISOString().slice(0, 10),
            end_date: pendingPatch.endDate.toISOString().slice(0, 10),
          }
          if (pendingPatch.destination !== undefined) {
            tripUpdate.destination = pendingPatch.destination
          }
          // 1. Write trip first
          await updateTripDetails(tripId, tripUpdate)
          // 2. Invalidate so tripStartDate refreshes before activity mutations
          await queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
          // 3. Activity mutations use updated tripStartDate via useYjsSync ref
          const newTotalDays = computeNewTotalDays(pendingPatch.startDate, pendingPatch.endDate)
          for (const act of conflicts) {
            if (resolution === 'moveToLastDay') {
              updateActivity(act.id, { day: newTotalDays - 1, endDay: newTotalDays - 1 })
            } else {
              updateActivity(act.id, { unscheduled: true })
            }
          }
          setStatus('idle')
          setConflicts([])
          setPendingPatch(null)
        } catch {
          setStatus('error')
        }
      },
      [tripId, queryClient, updateActivity, pendingPatch, conflicts],
    )

    const cancelRescope = useCallback(() => {
      setStatus('idle')
      setConflicts([])
      setPendingPatch(null)
    }, [])

    return { status, conflicts, rescope, confirmRescope, cancelRescope }
  }
  ```

- [ ] **Step 2: Run typecheck**

  ```bash
  cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck
  ```
  Expected: 0 errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/components/calendar/hooks/useRescope.ts
  git commit -m "feat: add useRescope state machine hook"
  ```

---

## Chunk 3: UI Components

### Task 5: `RescoperConflictModal`

**Files:**
- Create: `apps/web/components/calendar/RescoperConflictModal.tsx`

- [ ] **Step 1: Create the component**

  Create `apps/web/components/calendar/RescoperConflictModal.tsx`:
  ```tsx
  'use client'

  import type { CalendarActivity } from './types'

  interface RescoperConflictModalProps {
    conflictingActivities: CalendarActivity[]
    onMoveToLastDay: () => void
    onKeepUnscheduled: () => void
    onCancel: () => void
  }

  export function RescoperConflictModal({
    conflictingActivities,
    onMoveToLastDay,
    onKeepUnscheduled,
    onCancel,
  }: RescoperConflictModalProps) {
    const hasMultiDay = conflictingActivities.some(
      (a) => a.endDay !== undefined && a.endDay !== a.day,
    )

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white dark:bg-[#0f1a28] border border-gray-200 dark:border-[#1e3a5f]/40 rounded-xl shadow-xl w-full max-w-sm mx-4 p-5">
          <h2 className="text-[15px] font-medium text-gray-900 dark:text-[#f5efe8] mb-1">
            Activities outside new range
          </h2>
          <p className="text-[13px] text-gray-500 dark:text-[#4a7ab5] mb-3">
            {conflictingActivities.length === 1
              ? '1 activity falls outside the new trip dates.'
              : `${conflictingActivities.length} activities fall outside the new trip dates.`}
            {hasMultiDay && (
              <span className="block mt-1 text-amber-600 dark:text-amber-400">
                Multi-day activities will be collapsed to a single day.
              </span>
            )}
          </p>

          <ul className="mb-4 space-y-1 max-h-40 overflow-y-auto">
            {conflictingActivities.map((a) => (
              <li
                key={a.id}
                className="text-[13px] text-gray-700 dark:text-[#cdd9e5] bg-gray-50 dark:bg-[#1e3a5f]/10 rounded px-2 py-1 truncate"
              >
                {a.title || 'Untitled'}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            <button
              onClick={onMoveToLastDay}
              className="w-full px-4 py-2 rounded-lg bg-[#003594] text-white text-[13px] font-medium hover:bg-[#002a7a] transition-colors"
            >
              Move to last day
            </button>
            <button
              onClick={onKeepUnscheduled}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-[#1e3a5f]/40 text-gray-700 dark:text-[#cdd9e5] text-[13px] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 transition-colors"
            >
              Keep as unscheduled
            </button>
            <button
              onClick={onCancel}
              className="w-full px-4 py-2 text-[13px] text-gray-400 dark:text-[#4a7ab5] hover:text-gray-600 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Typecheck**

  ```bash
  cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck
  ```
  Expected: 0 errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/components/calendar/RescoperConflictModal.tsx
  git commit -m "feat: add RescoperConflictModal component"
  ```

---

### Task 6: `RescoperPopover`

**Files:**
- Create: `apps/web/components/calendar/RescoperPopover.tsx`

- [ ] **Step 1: Create the component**

  Create `apps/web/components/calendar/RescoperPopover.tsx`:
  ```tsx
  'use client'

  import { useState, useEffect, useRef } from 'react'
  import type { Trip } from '@travyl/shared'
  import type { CalendarActivity } from './types'
  import { useRescope } from './hooks/useRescope'
  import { RescoperConflictModal } from './RescoperConflictModal'

  // userId is passed from CalendarDashboard (which already receives it as a prop).
  // tripStartDate is derived from trip.start_date inside the component — no separate prop needed.
  interface RescoperPopoverProps {
    trip: Trip
    userId: string
    scheduledActivities: CalendarActivity[]
    onClose: () => void
  }

  function toInputValue(d: Date): string {
    return d.toISOString().slice(0, 10)
  }

  function fromInputValue(s: string): Date {
    return new Date(s + 'T00:00:00Z')
  }

  function addOneDayTo(d: Date): Date {
    const n = new Date(d)
    n.setUTCDate(n.getUTCDate() + 1)
    return n
  }

  function subtractOneDayFrom(d: Date): Date {
    const n = new Date(d)
    n.setUTCDate(n.getUTCDate() - 1)
    return n
  }

  export function RescoperPopover({
    trip,
    userId,
    scheduledActivities,
    onClose,
  }: RescoperPopoverProps) {
    const tripStartDate = trip.start_date  // ISO string, e.g. "2026-06-12"
    const [destination, setDestination] = useState(trip.destination)
    const [startDate, setStartDate] = useState(() => new Date(trip.start_date + 'T00:00:00Z'))
    const [endDate, setEndDate]     = useState(() => new Date(trip.end_date + 'T00:00:00Z'))
    const [errorMsg, setErrorMsg]   = useState<string | null>(null)

    const popoverRef = useRef<HTMLDivElement>(null)

    const oldStartDate = new Date(trip.start_date + 'T00:00:00Z')
    const oldEndDate   = new Date(trip.end_date   + 'T00:00:00Z')

    const { status, conflicts, rescope, confirmRescope, cancelRescope } = useRescope(
      trip.id,
      tripStartDate,
      userId,
      scheduledActivities,
    )

    // Dismiss on outside click
    useEffect(() => {
      function handleClick(e: MouseEvent) {
        if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
          onClose()
        }
      }
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }, [onClose])

    // Show error toast when status === 'error'
    useEffect(() => {
      if (status === 'error') {
        setErrorMsg('Something went wrong. Please try again.')
      } else {
        setErrorMsg(null)
      }
    }, [status])

    // Close popover when a direct (no-conflict) write completes:
    // detect the 'loading' → 'idle' transition using a ref to hold the previous status.
    // (Conflict-resolution path also triggers this transition, but onClose is harmlessly
    // called twice there — the second call is a no-op since the popover is already closing.)
    const prevStatusRef = useRef<typeof status>(status)
    useEffect(() => {
      if (prevStatusRef.current === 'loading' && status === 'idle') {
        onClose()
      }
      prevStatusRef.current = status
    }, [status, onClose])

    const nights = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const isInvalid = nights <= 0
    const isLoading = status === 'loading'

    function handleApply() {
      rescope({ destination, startDate, endDate }, oldStartDate, oldEndDate)
    }

    return (
      <>
        <div
          ref={popoverRef}
          className="absolute top-full mt-1 left-0 z-40 bg-white dark:bg-[#0f1a28] border border-gray-200 dark:border-[#1e3a5f]/40 rounded-xl shadow-xl w-80 p-4"
        >
          {errorMsg && (
            <div className="mb-3 text-[12px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">
              {errorMsg}
            </div>
          )}

          {/* Destination */}
          <div className="mb-3">
            <label className="block text-[11px] uppercase tracking-wide text-gray-400 dark:text-[#4a7ab5] mb-1">
              Destination
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-[#1e3a5f]/40 bg-transparent px-3 py-1.5 text-[13px] text-gray-800 dark:text-[#f5efe8] focus:outline-none focus:ring-1 focus:ring-[#003594]"
            />
          </div>

          {/* Start date */}
          <div className="mb-2">
            <label className="block text-[11px] uppercase tracking-wide text-gray-400 dark:text-[#4a7ab5] mb-1">
              Start
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStartDate(subtractOneDayFrom(startDate))}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-[#1e3a5f]/40 text-gray-500 dark:text-[#4a7ab5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 text-[15px] font-light transition-colors"
                aria-label="Remove start day"
              >
                −
              </button>
              <input
                type="date"
                value={toInputValue(startDate)}
                onChange={(e) => e.target.value && setStartDate(fromInputValue(e.target.value))}
                className="flex-1 rounded-lg border border-gray-200 dark:border-[#1e3a5f]/40 bg-transparent px-2 py-1.5 text-[13px] text-gray-800 dark:text-[#f5efe8] focus:outline-none focus:ring-1 focus:ring-[#003594]"
              />
            </div>
          </div>

          {/* End date */}
          <div className="mb-3">
            <label className="block text-[11px] uppercase tracking-wide text-gray-400 dark:text-[#4a7ab5] mb-1">
              End
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={toInputValue(endDate)}
                onChange={(e) => e.target.value && setEndDate(fromInputValue(e.target.value))}
                className="flex-1 rounded-lg border border-gray-200 dark:border-[#1e3a5f]/40 bg-transparent px-2 py-1.5 text-[13px] text-gray-800 dark:text-[#f5efe8] focus:outline-none focus:ring-1 focus:ring-[#003594]"
              />
              <button
                onClick={() => setEndDate(addOneDayTo(endDate))}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-[#1e3a5f]/40 text-gray-500 dark:text-[#4a7ab5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 text-[15px] font-light transition-colors"
                aria-label="Add end day"
              >
                +
              </button>
            </div>
          </div>

          {/* Night count */}
          <p className="text-[12px] text-gray-400 dark:text-[#4a7ab5] mb-4">
            {isInvalid ? (
              <span className="text-red-500">End must be after start</span>
            ) : (
              `${nights} ${nights === 1 ? 'night' : 'nights'}`
            )}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-[13px] text-gray-500 dark:text-[#4a7ab5] hover:text-gray-700 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={isInvalid || isLoading}
              className="px-4 py-1.5 rounded-lg bg-[#003594] text-white text-[13px] font-medium hover:bg-[#002a7a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </div>

        {/* Conflict modal rendered outside popover so it overlays everything */}
        {status === 'pending-conflict' && (
          <RescoperConflictModal
            conflictingActivities={conflicts}
            onMoveToLastDay={() => confirmRescope('moveToLastDay').then(onClose)}
            onKeepUnscheduled={() => confirmRescope('unscheduled').then(onClose)}
            onCancel={cancelRescope}
          />
        )}
      </>
    )
  }
  ```

- [ ] **Step 2: Typecheck**

  ```bash
  cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck
  ```
  Expected: 0 errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/components/calendar/RescoperPopover.tsx
  git commit -m "feat: add RescoperPopover component"
  ```

---

### Task 7: `UnscheduledPopover`

**Files:**
- Create: `apps/web/components/calendar/UnscheduledPopover.tsx`

- [ ] **Step 1: Create the component**

  Create `apps/web/components/calendar/UnscheduledPopover.tsx`:
  ```tsx
  'use client'

  import { useEffect, useRef } from 'react'
  import { Trash } from 'iconoir-react'
  import type { CalendarActivity } from './types'

  interface UnscheduledPopoverProps {
    activities: CalendarActivity[]
    tripStartDate: Date
    tripEndDate: Date
    onAssign: (id: string, dayOffset: number) => void
    onDelete: (id: string) => void
    onClose: () => void
  }

  export function UnscheduledPopover({
    activities,
    tripStartDate,
    tripEndDate,
    onAssign,
    onDelete,
    onClose,
  }: UnscheduledPopoverProps) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
      function handleClick(e: MouseEvent) {
        if (ref.current && !ref.current.contains(e.target as Node)) onClose()
      }
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }, [onClose])

    const minDate = tripStartDate.toISOString().slice(0, 10)
    const maxDate = tripEndDate.toISOString().slice(0, 10)

    function handleDateChange(id: string, value: string) {
      if (!value) return
      const selected = new Date(value + 'T00:00:00Z')
      const offset = Math.round(
        (selected.getTime() - tripStartDate.getTime()) / (1000 * 60 * 60 * 24),
      )
      onAssign(id, offset)
    }

    return (
      <div
        ref={ref}
        className="absolute top-full mt-1 z-40 bg-white dark:bg-[#0f1a28] border border-gray-200 dark:border-[#1e3a5f]/40 rounded-xl shadow-xl w-72 p-3"
      >
        <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-[#4a7ab5] mb-2">
          Unscheduled activities
        </p>
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {activities.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-[#1e3a5f]/10 px-2 py-1.5"
            >
              <span className="flex-1 text-[12px] text-gray-700 dark:text-[#cdd9e5] truncate min-w-0">
                {a.title || 'Untitled'}
              </span>
              <input
                type="date"
                min={minDate}
                max={maxDate}
                onChange={(e) => handleDateChange(a.id, e.target.value)}
                title="Assign to day"
                className="w-32 text-[11px] rounded border border-gray-200 dark:border-[#1e3a5f]/40 bg-transparent px-1.5 py-0.5 text-gray-600 dark:text-[#cdd9e5] focus:outline-none focus:ring-1 focus:ring-[#003594]"
              />
              <button
                onClick={() => onDelete(a.id)}
                aria-label="Delete activity"
                className="text-gray-400 dark:text-[#4a7ab5] hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
              >
                <Trash width={14} height={14} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  ```

- [ ] **Step 2: Typecheck**

  ```bash
  cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck
  ```
  Expected: 0 errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/components/calendar/UnscheduledPopover.tsx
  git commit -m "feat: add UnscheduledPopover component"
  ```

---

## Chunk 4: Integration

### Task 8: Wire `CalendarDashboard`

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Export `fetchCollaborators` from `@travyl/shared`**

  `fetchCollaborators` exists in `packages/shared/src/services/api.ts` but is not yet exported from the package barrel. Open `packages/shared/src/services/index.ts` and add `fetchCollaborators` to the existing API export block:
  ```ts
  // In the existing block that ends with inviteCollaborator:
    inviteCollaborator,
    fetchCollaborators,        // ← add this line
  } from './api';
  ```

  Run typecheck to confirm it resolves:
  ```bash
  cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck
  ```

- [ ] **Step 2: Add collaborators query and derive activity subsets**

  At the top of `CalendarDashboard`, import the new pieces:
  ```ts
  import { useQuery } from '@tanstack/react-query'
  import { fetchCollaborators } from '@travyl/shared'
  import { TripPermissionProvider } from './providers/TripPermissionContext'
  ```

  After the `useCollaboratorPresence` call (~line 81), add:
  ```ts
  const { data: tripCollaborators = [] } = useQuery({
    queryKey: ['collaborators', tripId],
    queryFn: () => fetchCollaborators(tripId),
    enabled: !!tripId,
  })
  ```

  After the `isLoading` / `error` derivation (~line 82), add:
  ```ts
  const scheduledActivities = useMemo(
    () => activities.filter((a) => !a.unscheduled),
    [activities],
  )
  const unscheduledActivities = useMemo(
    () => activities.filter((a) => a.unscheduled),
    [activities],
  )
  ```

- [ ] **Step 3: Pass `scheduledActivities` where `activities` was used for rendering**

  The `WeekView` and `DayView` components must receive `scheduledActivities` — not the full `activities` array — so unscheduled items don't appear on the grid. The same applies to drag-and-drop logic.

  Find the `activities` prop on `WeekView` and `DayView` and change both to `scheduledActivities`:
  ```tsx
  // WeekView (find by searching for activities={activities} near the WeekView JSX):
  <WeekView
    activities={scheduledActivities}   // ← was: activities
    ...
  />

  // DayView:
  <DayView
    activities={scheduledActivities}   // ← was: activities
    ...
  />
  ```

  Also update internal `activities` references that feed drag/selection logic:
  ```ts
  // useMarqueeSelection:
  const { ... } = useMarqueeSelection({
    activities: scheduledActivities,   // ← was: activities
    ...
  })

  // handleGroupMove callback: change activities.filter to scheduledActivities.filter
  const selected = scheduledActivities.filter((a) => marqueeSelectedIds.has(a.id))

  // handleBulkDelete and handleBulkDuplicate: change activities.filter to scheduledActivities.filter
  const toDuplicate = scheduledActivities.filter((a) => marqueeSelectedIds.has(a.id))

  // selectedActivity derivation:
  const selectedActivity = useMemo(
    () => scheduledActivities.find((a) => a.id === selectedEventId) ?? null,
    [scheduledActivities, selectedEventId],
  )
  ```

- [ ] **Step 4: Wrap the return in `TripPermissionProvider`**

  The outermost `return (` wraps in `CalendarThemeContext.Provider`. Add `TripPermissionProvider` inside it:
  ```tsx
  return (
    <CalendarThemeContext.Provider value={{ isDark: theme === 'dark' }}>
    <TripPermissionProvider trip={trip!} collaborators={tripCollaborators}>
    <div className={theme === 'dark' ? 'dark' : ''}>
      {/* rest of existing JSX unchanged */}
    </div>
    </TripPermissionProvider>
    </CalendarThemeContext.Provider>
  )
  ```
  Note: `trip` is non-null at this point (loading/error handled above early returns).

- [ ] **Step 5: Typecheck**

  ```bash
  cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck
  ```
  Fix any type errors before continuing.

- [ ] **Step 6: Commit**

  ```bash
  git add apps/web/components/calendar/CalendarDashboard.tsx
  git commit -m "feat: wire TripPermissionProvider and activity filtering in CalendarDashboard"
  ```

---

### Task 9: Wire `TripNavbar`

**Files:**
- Modify: `apps/web/components/calendar/TripNavbar.tsx`

- [ ] **Step 1: Add new props to `TripNavbarProps`**

  `TripNavbar.tsx` already imports `useState`, `useRef`, and `useEffect` — no import changes needed for hooks.

  In the `TripNavbarProps` interface (~line 113), add all 6 new props at once:
  ```ts
  export interface TripNavbarProps {
    // ... existing props ...
    trip: Trip | null
    scheduledActivities: CalendarActivity[]
    unscheduledActivities: CalendarActivity[]
    /** Same userId CalendarDashboard receives — threaded to RescoperPopover → useRescope → useActivityMutations */
    userId: string
    onAssignUnscheduled: (id: string, dayOffset: number) => void
    onDeleteUnscheduled: (id: string) => void
  }
  ```

  Add imports at the top of the file:
  ```ts
  import type { Trip } from '@travyl/shared'
  import { useEffectivePermission } from './providers/TripPermissionContext'
  import { RescoperPopover } from './RescoperPopover'
  import { UnscheduledPopover } from './UnscheduledPopover'
  ```

- [ ] **Step 2: Read `canEdit` and add popover state in the component body**

  Inside `TripNavbar` (after line 179), add:
  ```ts
  const { canEdit } = useEffectivePermission()
  const [rescoperOpen, setRescoperOpen] = useState(false)
  const [unscheduledOpen, setUnscheduledOpen] = useState(false)
  const rescoperAnchorRef = useRef<HTMLDivElement>(null)
  const unscheduledAnchorRef = useRef<HTMLDivElement>(null)
  ```

- [ ] **Step 3: Replace the date range `<span>` with a conditional button/span**

  Find the "Trip info" section (~line 240):
  ```tsx
  {/* Trip info */}
  <div className="flex flex-col justify-center px-4 h-full border-r border-gray-200 dark:border-[#1e3a5f]/30 shrink-0 min-w-0">
    <span className="truncate text-[13px] font-serif font-normal tracking-wide text-[#1e3a5f] dark:text-[#f5efe8] leading-tight">
      {tripName}
    </span>
    <span className="text-[10px] text-[#4a7ab5] leading-tight">{dateRange}</span>
  </div>
  ```

  Replace with:
  ```tsx
  {/* Trip info */}
  <div
    ref={rescoperAnchorRef}
    className="relative flex flex-col justify-center px-4 h-full border-r border-gray-200 dark:border-[#1e3a5f]/30 shrink-0 min-w-0"
  >
    <span className="truncate text-[13px] font-serif font-normal tracking-wide text-[#1e3a5f] dark:text-[#f5efe8] leading-tight">
      {tripName}
    </span>
    {canEdit ? (
      <button
        onClick={() => setRescoperOpen((v) => !v)}
        className="text-[10px] text-[#4a7ab5] leading-tight hover:text-[#003594] dark:hover:text-[#f5efe8] transition-colors text-left"
        aria-label="Edit trip dates and destination"
      >
        {dateRange}
      </button>
    ) : (
      <span className="text-[10px] text-[#4a7ab5] leading-tight">{dateRange}</span>
    )}

    {rescoperOpen && trip && (
      <RescoperPopover
        trip={trip}
        userId={userId}
        scheduledActivities={scheduledActivities}
        onClose={() => setRescoperOpen(false)}
      />
    )}
  </div>
  ```

- [ ] **Step 4: Add the unscheduled pill (complete, fully wired)**

  Destructure the new props in `TripNavbar`'s function signature:
  ```ts
  export function TripNavbar({
    // ... existing props ...
    trip,
    scheduledActivities,
    unscheduledActivities,
    userId,
    onAssignUnscheduled,
    onDeleteUnscheduled,
  }: TripNavbarProps)
  ```

  Find the right controls area (~line 280). Before the view toggle group, add:
  ```tsx
  {/* Unscheduled activities pill */}
  {unscheduledActivities.length > 0 && (
    <div ref={unscheduledAnchorRef} className="relative">
      <button
        onClick={() => setUnscheduledOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 text-[11px] text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors shrink-0"
      >
        <span className="font-medium">{unscheduledActivities.length}</span>
        <span>unscheduled</span>
      </button>

      {unscheduledOpen && trip && (
        <UnscheduledPopover
          activities={unscheduledActivities}
          tripStartDate={new Date(trip.start_date + 'T00:00:00Z')}
          tripEndDate={new Date(trip.end_date + 'T00:00:00Z')}
          onAssign={onAssignUnscheduled}
          onDelete={onDeleteUnscheduled}
          onClose={() => setUnscheduledOpen(false)}
        />
      )}
    </div>
  )}
  ```

- [ ] **Step 5: Pass all new `TripNavbar` props from `CalendarDashboard`**

  In `CalendarDashboard`, update the `TripNavbar` JSX to pass all 6 new props:
  ```tsx
  <TripNavbar
    // ... existing props unchanged ...
    trip={trip ?? null}
    scheduledActivities={scheduledActivities}
    unscheduledActivities={unscheduledActivities}
    userId={userId}
    onAssignUnscheduled={(id, dayOffset) =>
      updateActivity(id, { day: dayOffset, endDay: dayOffset, unscheduled: false })
    }
    onDeleteUnscheduled={removeActivity}
  />
  ```

- [ ] **Step 6: Typecheck**

  ```bash
  cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck
  ```
  Fix any type errors.

- [ ] **Step 7: Run full shared test suite one more time**

  ```bash
  cd /c/Users/justi/dev/travyl2/travyl-frontend/packages/shared && npm test
  ```
  Expected: all pass.

- [ ] **Step 8: Commit**

  ```bash
  git add apps/web/components/calendar/TripNavbar.tsx \
    apps/web/components/calendar/CalendarDashboard.tsx
  git commit -m "feat: wire rescope entry point and unscheduled pill in TripNavbar"
  ```

---

## Manual Smoke Test

- [ ] Run `npm run web` and open a trip in the calendar
- [ ] As the trip owner: click the date range in the navbar → popover opens with current dates and destination pre-filled
- [ ] Change destination text → Apply → navbar updates, no activity mutations
- [ ] Add 1 day (+ button on end) → Apply → new empty day column appears
- [ ] Remove a day that has activities → conflict modal shows → choose "Keep as unscheduled" → amber pill appears in navbar → click pill → activity listed → assign back via date input
- [ ] As a viewer (use a second account or toggle `canEdit` in devtools): date range renders as plain text, not clickable

- [ ] **Final commit if all smoke tests pass**

  ```bash
  git add -A
  git commit -m "feat: trip rescope — complete implementation"
  ```
