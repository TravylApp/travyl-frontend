# Activity Edit Modal & Context Menu

## Goal

Add a right-click context menu to calendar event blocks and a full activity edit modal, giving users the ability to modify all activity fields that are currently read-only.

## Current State

- `ActivityContextMenu` component exists but is never imported or used — no `onContextMenu` handler on `EventBlock`
- Left-click opens `CardPopover` (read-only preview with Delete action only)
- `DetailPanel` has an "Edit" button that does nothing (calls `onClose`)
- `updateActivity` in `useActivityMutations` works — patches Yjs + syncs to DB
- Travel-specific fields (`flight_number`, `airline`, `check_in`, `check_out`, `booking_ref`) exist in `ActivityData` type and `activity_data` JSONB column but are never rendered or editable
- `CALENDAR_ACTIVITY_KEYS` is duplicated in 3 files: `useActivityMutations.ts`, `useYjsSync.ts`, `useTripActivities.ts`

## Design

### Entry Points

Three ways to open the edit modal:

1. **Right-click event block** — `ActivityContextMenu` appears with actions: Edit, Duplicate, separator, Delete (danger) — clicking "Edit" opens the modal
2. **CardPopover** — add "Edit" button (ghost variant) alongside existing "Delete"
3. **DetailPanel** — fix broken "Edit" button to call `onEdit` prop

### State Management

`CalendarDashboard` manages two new pieces of state:

- `contextMenu: { activityId: string, x: number, y: number } | null` — position and target for the context menu
- `editingActivityId: string | null` — which activity is being edited (non-null opens the modal)

**Overlay interaction:** Opening the context menu closes the CardPopover (and vice versa). Only one overlay at a time.

### Context Menu Wiring

**EventBlock:**
- New prop: `onContextMenu: (id: string, x: number, y: number) => void`
- On right-click: `e.preventDefault()`, call `onContextMenu(activity.id, e.clientX, e.clientY)`

**Prop threading:** `CalendarDashboard` → `WeekView`/`DayView` → `DayColumn` → `EventBlock`

**Actions (exact IDs for the `onAction` handler):**
- `edit` — set `editingActivityId` to the context menu's `activityId`, close popover
- `duplicate` — call existing `duplicateActivity()`
- `delete` — call existing `removeActivity()`

### ActivityEditModal Component

**File:** `apps/web/components/calendar/ActivityEditModal.tsx`

**Props:**
```ts
interface ActivityEditModalProps {
  activity: CalendarActivity
  tripDays: { dayIndex: number; label: string }[]
  tripStartDate: Date
  onSave: (id: string, patch: Partial<CalendarActivity>) => void
  onClose: () => void
}
```

**Layout — Card with Image Header (~440px):**

```
┌─────────────────────────────────┐
│  [hero image or type-color      │
│   gradient background]          │
│   ✕ (top-right close)           │
│   Title input (over hero)       │
│   Type badge · Duration         │
├─────────────────────────────────┤
│  TYPE        [dropdown ▾]       │
│                                 │
│  ── When ──────────────────     │
│  Date        [day selector]     │
│  Time        [start]–[end]      │
│                                 │
│  ── Where ─────────────────     │
│  Location    [text input]       │
│                                 │
│  ── Cost ──────────────────     │
│  Price       [number input]     │
│                                 │
│  ── Notes ─────────────────     │
│  [textarea, 3 rows]            │
│                                 │
│  ── Travel Details ────────     │  ← conditional
│  (flight/hotel-specific fields) │
├─────────────────────────────────┤
│              Cancel  │  Save    │
└─────────────────────────────────┘
```

**Behavior:**
- Rendered via portal to `document.body`
- Centered with backdrop (`bg-black/50`, click backdrop to close)
- Width: ~440px, max-height with overflow scroll
- Local form state via `useState`, initialized from `activity` prop
- Save computes diff (only changed fields) and calls `onSave(id, diff)`
- Escape closes without saving
- Animate in/out with `motion` (scale + opacity)

**Conditional travel fields by type:**
- `flight` or `transport` → Flight Number, Airline, Booking Ref
- `hotel` → Check-in, Check-out, Booking Ref

**Editable fields:**

| Field | Input Type |
|-------|-----------|
| Title | Text input (over hero) |
| Type | Dropdown (activity categories) |
| Date | Day selector from trip days |
| Start time | Time input |
| End time | Time input (derives duration) |
| Location | Text input |
| Price | Text input (stored as string) |
| Notes | Textarea (3 rows) |
| Flight Number | Text input (conditional) |
| Airline | Text input (conditional) |
| Check-in | Text input (conditional) |
| Check-out | Text input (conditional) |
| Booking Ref | Text input (conditional) |

**Not editable:** Rating (source data), Image (from suggestion), Latitude/Longitude (derived from location), Currency (deferred — currently always null in DB)

**Validation:**
- Title: required, cannot be blank (trim whitespace)
- End time must be after start time (minimum 15min duration)
- Price: if provided, must be non-negative number
- All other text fields: optional, no max length enforced (DB handles limits)

**Day change handling:** When the user changes the day via the date picker, this is treated as a `moveActivity` call (same as drag-and-drop), not a raw `updateActivity` patch. The `onSave` callback in `CalendarDashboard` detects if `day` changed and routes to `moveActivity(id, newDay, startHour)` for that field while using `updateActivity` for the rest.

### Type Changes

**`CalendarActivity`** (in `packages/shared/src/types/index.ts`) — add optional fields:
```ts
flightNumber?: string
airline?: string
checkIn?: string
checkOut?: string
bookingRef?: string
```

**`CALENDAR_ACTIVITY_KEYS`** — add to **all three** locations:
- `apps/web/components/calendar/hooks/useActivityMutations.ts`
- `apps/web/components/calendar/hooks/useYjsSync.ts`
- `apps/web/components/calendar/hooks/useTripActivities.ts`

New keys: `'flightNumber', 'airline', 'checkIn', 'checkOut', 'bookingRef'`

**`toCalendarActivity`** (in `packages/shared/src/utils/activityMapper.ts`) — extract new fields from `activity_data`:
- `activity_data.flight_number` → `flightNumber`
- `activity_data.airline` → `airline`
- `activity_data.check_in` → `checkIn`
- `activity_data.check_out` → `checkOut`
- `activity_data.booking_ref` → `bookingRef`

**`toActivityRow`** (in `packages/shared/src/utils/activityMapper.ts`) — map new fields into `activity_data` JSONB:
- `cal.flightNumber` → `activity_data.flight_number`
- `cal.airline` → `activity_data.airline`
- `cal.checkIn` → `activity_data.check_in`
- `cal.checkOut` → `activity_data.check_out`
- `cal.bookingRef` → `activity_data.booking_ref`

No DB migration needed — fields already exist in the `activity_data` JSONB column.

### CardPopover Change

Add an "Edit" action button (ghost variant) to the actions array passed from `CalendarDashboard`. Clicking it sets `editingActivityId` and closes the popover.

### DetailPanel Change

- Add `onEdit: (id: string) => void` prop
- Fix the "Edit" button `onClick` to call `onEdit(activity.id)` instead of `onClose()`

## Files Changed

| File | Change |
|------|--------|
| `packages/shared/src/types/index.ts` | Add 5 optional fields to `CalendarActivity` |
| `packages/shared/src/utils/activityMapper.ts` | Map new fields in `toCalendarActivity` and `toActivityRow` |
| `apps/web/components/calendar/ActivityEditModal.tsx` | **New** — edit modal component |
| `apps/web/components/calendar/EventBlock.tsx` | Add `onContextMenu` prop + handler |
| `apps/web/components/calendar/CalendarDashboard.tsx` | Wire context menu state, edit modal state, overlay exclusivity, pass props |
| `apps/web/components/calendar/hooks/useActivityMutations.ts` | Add 5 keys to `CALENDAR_ACTIVITY_KEYS` |
| `apps/web/components/calendar/hooks/useYjsSync.ts` | Add 5 keys to `CALENDAR_ACTIVITY_KEYS` |
| `apps/web/components/calendar/hooks/useTripActivities.ts` | Add 5 keys to `CALENDAR_ACTIVITY_KEYS` |
| `apps/web/components/calendar/WeekView.tsx` | Thread `onContextMenu` prop |
| `apps/web/components/calendar/DayView.tsx` | Thread `onContextMenu` prop |
| `apps/web/components/calendar/DayColumn.tsx` | Thread `onContextMenu` prop |
| `apps/web/components/calendar/CardPopover.tsx` | Add "Edit" action from dashboard |
| `apps/web/components/calendar/DetailPanel.tsx` | Add `onEdit` prop, fix Edit button |
