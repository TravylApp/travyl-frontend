# Trip Rescope — Design Spec

**Date:** 2026-03-22
**Branch:** feature/TRA-XXX (to be created)
**Status:** Draft

---

## Goal

Let users change a trip's date range and destination directly from the calendar navbar — adding days, removing days, shifting the whole trip, or editing the destination — without leaving the calendar view.

---

## Key Architecture Note

`CalendarActivity.day` is an **integer offset from `tripStartDate`** (day 0 = first day of trip). This means:
- Shift and expand operations **do not require any activity mutations** — activities stay at the same relative positions automatically when trip dates change.
- Only shrink creates conflicts (activities whose `day` or `endDay` falls beyond the new trip length).

---

## Type Changes

In `packages/shared/src/types/index.ts`, add `unscheduled` to **both** interfaces:

```ts
interface ActivityData {
  // ... existing fields ...
  unscheduled?: boolean  // ← add this so toActivityRow / toCalendarActivity typecheck
}

interface CalendarActivity {
  // ... existing fields ...
  /** True when removed from the calendar by a rescope but not deleted. Filtered from grid rendering. */
  unscheduled?: boolean
}
```

Add `'unscheduled'` to `CALENDAR_ACTIVITY_KEYS` in **both** of these files (they are independent copies):
- `apps/web/components/calendar/hooks/useActivityMutations.ts`
- `apps/web/components/calendar/hooks/useYjsSync.ts`

---

## `activityMapper.ts` Changes

In `packages/shared/src/utils/activityMapper.ts`:

- `toActivityRow`: add `unscheduled: cal.unscheduled ?? false` to the `activity_data` object.
- `toCalendarActivity`: add `unscheduled: row.activity_data?.unscheduled ?? false`.

**Note on out-of-range dates for unscheduled activities:** When an activity is marked `unscheduled: true`, its `day` value is intentionally preserved at its original offset (which may exceed `newTotalDays - 1`). The Yjs flush will therefore write a `starting_date` beyond `trip.end_date` for these rows. This is acceptable — there are no DB constraints that check activity dates against the trip's date range, and the `unscheduled` flag gates all calendar rendering. No date clamping is needed in the mapper.

---

## Wiring `TripPermissionProvider`

`TripPermissionProvider` is currently defined but never mounted. `TripNavbar` needs `canEdit` from it for the rescope entry point.

**Important:** `useCollaboratorPresence` returns `UserAwareness[]` (presence/online users), **not** `TripCollaborator[]`. `TripPermissionProvider` requires `TripCollaborator[]` (DB records with `user_id`, `role_type`, `invite_status`). These are different types.

**Fix:** In `CalendarDashboard`, add a React Query call to fetch DB collaborators, then wrap the render in `TripPermissionProvider`:

```tsx
// CalendarDashboard.tsx

// Add this query (fetchCollaborators already exists in api.ts):
const { data: tripCollaborators = [] } = useQuery({
  queryKey: ['collaborators', tripId],
  queryFn: () => fetchCollaborators(tripId),
  enabled: !!tripId,
})

// Wrap outermost return in:
<TripPermissionProvider trip={trip} collaborators={tripCollaborators}>
  {/* existing render */}
</TripPermissionProvider>
```

`TripNavbar` (and any calendar component) can then call `useEffectivePermission()` to read `canEdit`.

---

## User-Facing Behavior

### Entry Point

In `TripNavbar`, call `useEffectivePermission()` to get `canEdit`. Render the date range as:
- A **clickable button** when `canEdit === true`
- **Plain non-interactive `<span>`** when `canEdit === false` (viewers)

Clicking the button opens `RescoperPopover` anchored below it.

### Popover

```
┌─────────────────────────────────────┐
│ Destination  [ Paris              ] │
│                                     │
│ Start   [−]  [ Jun 12, 2026  ]     │
│ End          [ Jun 19, 2026  ] [+]  │
│                                     │
│ 7 nights                            │
│                        [Cancel] [Apply] │
└─────────────────────────────────────┘
```

- Date inputs are plain `<input type="date">` elements (no icon; browser provides the native picker).
- `−` decrements `startDate` by 1 day. No minimum date — past dates are permitted (user may be planning or logging a past trip). Negative-length trips are already blocked by the Apply disabled guard.
- `+` increments `endDate` by 1 day. No maximum.
- Night count = `differenceInCalendarDays(endDate, startDate)`. Updates live.
- **Apply is disabled** when `endDate <= startDate` or when `status === 'loading'`.
- Clicking outside or pressing Cancel dismisses with no changes saved.
- `RescoperPopover` owns local form state (`destination`, `startDate`, `endDate`), pre-filled from the current trip.

### Apply Flow

1. User presses Apply.
2. `rescope(patch)` called on `useRescope`.
3. If conflict-free → writes execute immediately; popover closes on success.
4. If conflicts → hook sets `status = 'pending-conflict'`; popover renders `RescoperConflictModal`.
5. User picks resolution → `confirmRescope(resolution)` → writes → popover closes.
6. On any write error → generic toast; popover stays open.

### Conflict Modal

Shown when `status === 'pending-conflict'`. Conflict set = activities where `(activity.endDay ?? activity.day) >= newTotalDays`.

- Lists names of conflicting activities. If any are multi-day (`endDay !== undefined && endDay !== day`), add a note: "Multi-day activities will be collapsed to a single day."
- Three buttons:
  - **Move to last day** — for each conflicting activity: `updateActivity(id, { day: newTotalDays - 1, endDay: newTotalDays - 1 })`. This intentionally collapses multi-day spans to a single day on the last day of the trip. `startHour` and `duration` are preserved.
  - **Keep as unscheduled** — for each: `updateActivity(id, { unscheduled: true })`. Activities retain their original `day` value; the `unscheduled` flag is the sole gate for filtering.
  - **Cancel** — `cancelRescope()`; no writes; modal dismissed; popover stays open.

### Unscheduled Activities

When `activity.unscheduled === true`:

- **Filtered from the calendar grid** in `CalendarDashboard` before passing activities to `WeekView`/`DayView`. Use the **scheduled-only** array (`activities.filter(a => !a.unscheduled)`) for all calendar rendering and for `useRescope` conflict detection.
- A **"N unscheduled" pill** appears in `TripNavbar` next to the date range button (only when N > 0). Uses `iconoir-react` icons.
- Clicking the pill opens `UnscheduledPopover` listing the activities. Each item:
  - `<input type="date">` constrained to `[tripStartDate, tripEndDate]`. On select: `dayOffset = differenceInCalendarDays(selectedDate, tripStartDate)`, then `updateActivity(id, { day: dayOffset, endDay: dayOffset, unscheduled: false })`. **Use `false`, not `undefined`** — `updateActivity` skips `undefined` values and would fail to clear the flag.
  - **Delete** — `removeActivity(id)`.

---

## Operations & Data Behavior

| Operation | Condition | Trip write | Activity mutations |
|-----------|-----------|------------|--------------------|
| **Metadata only** | Dates unchanged, destination changed | `destination` | None |
| **Expand** | `newTotalDays > oldTotalDays` | `start_date`, `end_date` | None |
| **Shift** | `newTotalDays === oldTotalDays`, `newStart !== oldStart` | `start_date`, `end_date` | None — relative offsets stay valid |
| **Shrink** | `newTotalDays < oldTotalDays` | `start_date`, `end_date` after resolution | Per resolution |

**`newTotalDays`** = `differenceInCalendarDays(newEndDate, newStartDate)`

**Operation precedence** when multiple conditions apply: Shrink → Expand → Shift → Metadata only.

**Trip write** uses `updateTripDetails(tripId, { destination?, start_date?, end_date? })` (already exists in `packages/shared/src/services/api.ts`). After write, invalidate `['trip', tripId]` in React Query so `tripStartDate` updates and `useYjsSync` recomputes absolute dates on next flush.

---

## Yjs / Supabase Write Strategy

- **Trip fields** → `updateTripDetails()` directly (not Yjs-managed).
- **Activity fields** → `useActivityMutations.updateActivity(id, patch)` (writes both Yjs + Supabase).
- When clearing `unscheduled`, pass `unscheduled: false` (not `undefined`).

---

## `useRescope` — State Machine

```ts
// apps/web/components/calendar/hooks/useRescope.ts

interface RescopePatch {
  destination?: string
  startDate: Date
  endDate: Date
}

type ConflictResolution = 'moveToLastDay' | 'unscheduled'
type RescoperStatus = 'idle' | 'pending-conflict' | 'loading' | 'error'

interface UseRescopeReturn {
  status: RescoperStatus
  conflicts: CalendarActivity[]
  rescope: (patch: RescopePatch) => void
  confirmRescope: (resolution: ConflictResolution) => Promise<void>
  cancelRescope: () => void
}

function useRescope(
  tripId: string,
  scheduledActivities: CalendarActivity[], // filtered: !a.unscheduled
): UseRescopeReturn
```

- `rescope(patch)` stores patch, computes conflict set from `scheduledActivities`. If conflicts → `status = 'pending-conflict'`. If none → proceed to writes.
- `confirmRescope(resolution)` uses stored patch + resolution to execute writes in this order:
  1. `await updateTripDetails(...)` — trip dates written to Supabase first
  2. `await queryClient.invalidateQueries(['trip', tripId])` — React Query refetches, `tripStartDate` updates in `CalendarDashboard`, `tripStartDateRef` in `useYjsSync` updates
  3. Call `updateActivity(...)` for any activity mutations — these write to Yjs immediately; the subsequent debounced flush uses the now-updated `tripStartDate` for correct `starting_date`/`ending_date` computation

  This ordering is required. If activity mutations are written to Yjs before the trip date update is reflected, the Yjs flush may compute stale absolute dates.
- `cancelRescope()` resets to `'idle'`.

---

## Components

### New

**`apps/web/components/calendar/RescoperPopover.tsx`**
- Props: `trip: Trip`, `scheduledActivities: CalendarActivity[]`, `onClose: () => void`
- Calls `useRescope(trip.id, scheduledActivities)`
- Apply: disabled when `endDate <= startDate` or `status === 'loading'`; shows error toast when `status === 'error'`
- Renders `RescoperConflictModal` when `status === 'pending-conflict'`
- Icons from `iconoir-react`

**`apps/web/components/calendar/RescoperConflictModal.tsx`**
- Props: `conflictingActivities: CalendarActivity[]`, `onMoveToLastDay: () => void`, `onKeepUnscheduled: () => void`, `onCancel: () => void`
- Notes multi-day collapse when applicable

**`apps/web/components/calendar/UnscheduledPopover.tsx`**
- Props: `activities: CalendarActivity[]`, `tripStartDate: Date`, `tripEndDate: Date`, `onAssign: (id: string, dayOffset: number) => void`, `onDelete: (id: string) => void`, `onClose: () => void`
- Icons from `iconoir-react`

**`apps/web/components/calendar/hooks/useRescope.ts`** (web-local)

### Modified

**`packages/shared/src/types/index.ts`** — add `unscheduled?: boolean` to both `ActivityData` and `CalendarActivity`

**`packages/shared/src/utils/activityMapper.ts`** — `toActivityRow` + `toCalendarActivity` for `unscheduled`

**`apps/web/components/calendar/hooks/useActivityMutations.ts`** — add `'unscheduled'` to `CALENDAR_ACTIVITY_KEYS`

**`apps/web/components/calendar/hooks/useYjsSync.ts`** — add `'unscheduled'` to its `CALENDAR_ACTIVITY_KEYS`

**`apps/web/components/calendar/CalendarDashboard.tsx`**
- Add `useQuery(['collaborators', tripId], fetchCollaborators)` for `TripCollaborator[]`
- Mount `TripPermissionProvider` wrapping render output (using `trip` + fetched `tripCollaborators`)
- Derive `scheduledActivities = activities.filter(a => !a.unscheduled)`
- Derive `unscheduledActivities = activities.filter(a => a.unscheduled)`
- Pass `scheduledActivities` to `WeekView`/`DayView` and to `TripNavbar` for `RescoperPopover`
- Pass `unscheduledActivities` to `TripNavbar` for the pill count and `UnscheduledPopover`

**`apps/web/components/calendar/TripNavbar.tsx`**
- Call `useEffectivePermission()` for `canEdit`
- Date range: button (canEdit) vs plain span (!canEdit) → opens `RescoperPopover`
- Unscheduled pill when `unscheduledActivities.length > 0` → opens `UnscheduledPopover`
- New props: `scheduledActivities: CalendarActivity[]`, `unscheduledActivities: CalendarActivity[]`

---

## Out of Scope

- Trip title editing (belongs in a settings panel)
- Multi-destination trips
- Undo/redo of a rescope
- Mobile (web-only for now)
- Drag-from-unscheduled-tray onto calendar (assign via date input is sufficient for MVP)
