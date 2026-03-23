# Activity Edit Modal & Context Menu — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add right-click context menu and edit modal to calendar event blocks so users can modify all activity fields.

**Architecture:** New `ActivityEditModal` component rendered via portal, triggered from context menu / CardPopover / DetailPanel. State managed in `CalendarDashboard`. Travel-specific fields added to `CalendarActivity` type and synced via Yjs.

**Tech Stack:** React 19, TypeScript, motion/react (animations), iconoir-react (icons), Yjs (collab sync), Supabase (persistence)

**Spec:** `docs/superpowers/specs/2026-03-22-activity-edit-modal-design.md`

---

## Chunk 1: Type Changes & Mappers

### Task 1: Add travel fields to CalendarActivity type

**Files:**
- Modify: `packages/shared/src/types/index.ts:436-467`

- [ ] **Step 1: Add optional fields to CalendarActivity**

In `packages/shared/src/types/index.ts`, add these fields to the `CalendarActivity` interface after `pollResult`:

```ts
  /** Flight number for flight/transport activities */
  flightNumber?: string
  /** Airline name for flight/transport activities */
  airline?: string
  /** Check-in date/time for hotel activities */
  checkIn?: string
  /** Check-out date/time for hotel activities */
  checkOut?: string
  /** Booking confirmation reference */
  bookingRef?: string
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS (new fields are optional, no consumers break)

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat: add travel fields to CalendarActivity type"
```

---

### Task 2: Update activity mappers

**Files:**
- Modify: `packages/shared/src/utils/activityMapper.ts:85-135`

- [ ] **Step 1: Update toCalendarActivity to extract travel fields from activity_data**

In `packages/shared/src/utils/activityMapper.ts`, in the `toCalendarActivity` function (line 85), add after the `pollResult` line (line 104):

```ts
    flightNumber: row.activity_data?.flight_number,
    airline: row.activity_data?.airline,
    checkIn: row.activity_data?.check_in,
    checkOut: row.activity_data?.check_out,
    bookingRef: row.activity_data?.booking_ref,
```

- [ ] **Step 2: Update toActivityRow to persist travel fields into activity_data**

In the same file, in the `toActivityRow` function (line 108), update the `activity_data` object (line 127) to include the new fields:

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
    },
```

- [ ] **Step 3: Update ActivityData type to include all fields if missing**

Check `packages/shared/src/types/index.ts` — the `ActivityData` interface (line 423) already has `flight_number`, `airline`, `check_in`, `check_out`, `booking_ref`. No change needed. Verify it matches the mapper fields.

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/utils/activityMapper.ts
git commit -m "feat: map travel fields in activity row converters"
```

---

### Task 3: Add travel keys to CALENDAR_ACTIVITY_KEYS in all 3 files

**Files:**
- Modify: `apps/web/components/calendar/hooks/useActivityMutations.ts:7-25`
- Modify: `apps/web/components/calendar/hooks/useYjsSync.ts:18-36`
- Modify: `apps/web/components/calendar/hooks/useTripActivities.ts:6-24`

- [ ] **Step 1: Add 5 keys to useActivityMutations.ts**

In `apps/web/components/calendar/hooks/useActivityMutations.ts`, add these entries to the `CALENDAR_ACTIVITY_KEYS` array after `'pollResult'` (line 24):

```ts
  'flightNumber',
  'airline',
  'checkIn',
  'checkOut',
  'bookingRef',
```

- [ ] **Step 2: Add 5 keys to useYjsSync.ts**

In `apps/web/components/calendar/hooks/useYjsSync.ts`, add the same 5 entries to `CALENDAR_ACTIVITY_KEYS` after `'pollResult'` (line 35):

```ts
  'flightNumber',
  'airline',
  'checkIn',
  'checkOut',
  'bookingRef',
```

- [ ] **Step 3: Add 5 keys to useTripActivities.ts**

In `apps/web/components/calendar/hooks/useTripActivities.ts`, add the same 5 entries to `CALENDAR_ACTIVITY_KEYS` after `'pollResult'` (line 23):

```ts
  'flightNumber',
  'airline',
  'checkIn',
  'checkOut',
  'bookingRef',
```

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/hooks/useActivityMutations.ts apps/web/components/calendar/hooks/useYjsSync.ts apps/web/components/calendar/hooks/useTripActivities.ts
git commit -m "feat: sync travel fields via Yjs CALENDAR_ACTIVITY_KEYS"
```

---

## Chunk 2: Context Menu Wiring

### Task 4: Add onContextMenu to EventBlock

**Files:**
- Modify: `apps/web/components/calendar/EventBlock.tsx:15-28,109-139`

- [ ] **Step 1: Add onContextMenu prop to EventBlockProps**

In `apps/web/components/calendar/EventBlock.tsx`, add to the `EventBlockProps` interface (after `onShiftClick` at line 22):

```ts
  onContextMenu?: (id: string, x: number, y: number) => void
```

- [ ] **Step 2: Destructure the new prop**

Add `onContextMenu` to the destructured props in the function signature (after `onShiftClick` at line 37).

- [ ] **Step 3: Add onContextMenu handler to the root div**

On the root `<div>` element (line 110), add this handler alongside the existing `onClick`:

```ts
      onContextMenu={(e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu?.(activity.id, e.clientX, e.clientY)
      }}
```

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS (prop is optional)

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/EventBlock.tsx
git commit -m "feat: add onContextMenu prop to EventBlock"
```

---

### Task 5: Thread onContextMenu through DayColumn, WeekView, DayView

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx:11-32,229-243`
- Modify: `apps/web/components/calendar/WeekView.tsx:10-26,93-110`
- Modify: `apps/web/components/calendar/DayView.tsx:6-18,39-52`

- [ ] **Step 1: Add to DayColumnProps and thread to EventBlock**

In `apps/web/components/calendar/DayColumn.tsx`:

Add to `DayColumnProps` interface (after `onResizeEvent` at line 31):
```ts
  onContextMenu?: (id: string, x: number, y: number) => void
```

Destructure it in the function params (after `onResizeEvent` at line 91):
```ts
  onContextMenu,
```

Pass to each `<EventBlock>` (line 229, add after `onResize`):
```ts
              onContextMenu={onContextMenu}
```

- [ ] **Step 2: Add to WeekViewProps and thread to DayColumn**

In `apps/web/components/calendar/WeekView.tsx`:

Add to `WeekViewProps` interface (after `onResizeEvent` at line 25):
```ts
  onContextMenu?: (id: string, x: number, y: number) => void
```

Destructure in function params (after `onResizeEvent` at line 43):
```ts
  onContextMenu,
```

Pass to `<DayColumn>` (line 93, add after `onResizeEvent`):
```ts
                  onContextMenu={onContextMenu}
```

- [ ] **Step 3: Add to DayViewProps and thread to DayColumn**

In `apps/web/components/calendar/DayView.tsx`:

Add to `DayViewProps` interface (after `onResizeEvent` at line 17):
```ts
  onContextMenu?: (id: string, x: number, y: number) => void
```

Destructure in function params (after `onResizeEvent` at line 31):
```ts
  onContextMenu,
```

Pass to `<DayColumn>` (line 39, add after `onResizeEvent`):
```ts
          onContextMenu={onContextMenu}
```

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/DayColumn.tsx apps/web/components/calendar/WeekView.tsx apps/web/components/calendar/DayView.tsx
git commit -m "feat: thread onContextMenu through calendar view hierarchy"
```

---

### Task 6: Wire context menu state in CalendarDashboard

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Add imports**

At the top of `CalendarDashboard.tsx`, add import for ActivityContextMenu:

```ts
import { ActivityContextMenu } from './ActivityContextMenu'
```

- [ ] **Step 2: Add context menu state**

After the `popoverAnchor` state (line 74), add:

```ts
  const [contextMenu, setContextMenu] = useState<{ activityId: string; x: number; y: number } | null>(null)
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
```

- [ ] **Step 3: Add handleContextMenu callback**

After the existing `handleResizeEvent` function (around line 339), add:

```ts
  const handleContextMenu = (id: string, x: number, y: number) => {
    // Close any open popover (overlay exclusivity)
    setPopoverAnchor(null)
    selectEvent(null)
    setEditingActivityId(null)
    setContextMenu({ activityId: id, x, y })
  }

  const handleContextMenuAction = (actionId: string) => {
    if (!contextMenu) return
    const activity = activities.find((a) => a.id === contextMenu.activityId)
    setContextMenu(null)

    switch (actionId) {
      case 'edit':
        setEditingActivityId(contextMenu.activityId)
        break
      case 'duplicate':
        if (activity) duplicateActivity(activity)
        break
      case 'delete':
        handleRemoveActivity(contextMenu.activityId)
        break
    }
  }
```

- [ ] **Step 4: Add reverse overlay exclusivity to handleSelectEvent**

In the existing `handleSelectEvent` function (around line 288), add `setContextMenu(null)` at the top of the function body so that left-clicking an event closes any open context menu:

```ts
  const handleSelectEvent = (id: string, anchorEl?: HTMLElement) => {
    setContextMenu(null) // close context menu (overlay exclusivity)
    // ... rest of existing logic
```

- [ ] **Step 5: Pass onContextMenu to WeekView and DayView**

In the `<WeekView>` JSX (around line 432), add prop:
```ts
                        onContextMenu={handleContextMenu}
```

In the `<DayView>` JSX (around line 459), add prop:
```ts
                        onContextMenu={handleContextMenu}
```

- [ ] **Step 6: Render ActivityContextMenu**

After the `<CardPopover>` JSX (around line 595), add:

```tsx
    {contextMenu && (
      <ActivityContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        actions={[
          { id: 'edit', label: 'Edit' },
          { id: 'duplicate', label: 'Duplicate' },
          { id: 'separator', label: '', separator: true },
          { id: 'delete', label: 'Delete', danger: true },
        ]}
        onAction={handleContextMenuAction}
        onClose={() => setContextMenu(null)}
      />
    )}
```

- [ ] **Step 7: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 8: Manual test — right-click an event block**

Run: `npm run web`
1. Open a trip calendar with activities
2. Right-click an event block
3. Verify context menu appears at cursor position with Edit, Duplicate, Delete
4. Click "Duplicate" — verify activity is duplicated
5. Right-click again, click "Delete" — verify activity is removed
6. Click "Edit" — nothing visible yet (modal not built), but no errors

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: wire context menu to event blocks in CalendarDashboard"
```

---

## Chunk 3: Activity Edit Modal

### Task 7: Build ActivityEditModal component

**Files:**
- Create: `apps/web/components/calendar/ActivityEditModal.tsx`

- [ ] **Step 1: Create the modal component**

Create `apps/web/components/calendar/ActivityEditModal.tsx` with the full implementation:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Xmark } from 'iconoir-react'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import type { CalendarActivity } from './types'

// ─── Constants ──────────────────────────────────────────────

const MODAL_WIDTH = 440

const ACTIVITY_TYPE_OPTIONS = [
  'sightseeing', 'dining', 'tour', 'cultural', 'museum',
  'shopping', 'nightlife', 'outdoor', 'flight', 'transport', 'hotel',
] as const

/** Generate time options in 15-min increments: "0:00", "0:15", ..., "23:45" */
function generateTimeOptions(): { label: string; value: number }[] {
  const options: { label: string; value: number }[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
      const ampm = h < 12 ? 'AM' : 'PM'
      const label = `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
      options.push({ label, value: h + m / 60 })
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

// ─── Types ──────────────────────────────────────────────────

interface ActivityEditModalProps {
  activity: CalendarActivity
  tripDays: { dayIndex: number; label: string }[]
  onSave: (id: string, patch: Partial<CalendarActivity>) => void
  onClose: () => void
}

interface FormState {
  title: string
  type: string
  day: number
  startHour: number
  endHour: number
  location: string
  price: string
  notes: string
  flightNumber: string
  airline: string
  checkIn: string
  checkOut: string
  bookingRef: string
}

// ─── Component ──────────────────────────────────────────────

export function ActivityEditModal({
  activity,
  tripDays,
  onSave,
  onClose,
}: ActivityEditModalProps) {
  const [form, setForm] = useState<FormState>(() => ({
    title: activity.title,
    type: activity.type,
    day: activity.day,
    startHour: activity.startHour,
    endHour: activity.startHour + activity.duration,
    location: activity.location ?? '',
    price: activity.price ?? '',
    notes: activity.notes ?? '',
    flightNumber: activity.flightNumber ?? '',
    airline: activity.airline ?? '',
    checkIn: activity.checkIn ?? '',
    checkOut: activity.checkOut ?? '',
    bookingRef: activity.bookingRef ?? '',
  }))

  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (form.endHour <= form.startHour) errs.endHour = 'End must be after start'
    if (form.endHour - form.startHour < 0.25) errs.endHour = 'Minimum 15 minutes'
    if (form.price && (isNaN(Number(form.price)) || Number(form.price) < 0)) {
      errs.price = 'Must be a non-negative number'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = () => {
    if (!validate()) return

    const patch: Partial<CalendarActivity> = {}

    if (form.title.trim() !== activity.title) patch.title = form.title.trim()
    if (form.type !== activity.type) patch.type = form.type
    if (form.day !== activity.day) patch.day = form.day
    if (form.startHour !== activity.startHour) patch.startHour = form.startHour
    const newDuration = form.endHour - form.startHour
    if (newDuration !== activity.duration) patch.duration = newDuration
    if (form.location !== (activity.location ?? '')) patch.location = form.location || undefined
    if (form.price !== (activity.price ?? '')) patch.price = form.price || undefined
    if (form.notes !== (activity.notes ?? '')) patch.notes = form.notes || undefined
    if (form.flightNumber !== (activity.flightNumber ?? '')) patch.flightNumber = form.flightNumber || undefined
    if (form.airline !== (activity.airline ?? '')) patch.airline = form.airline || undefined
    if (form.checkIn !== (activity.checkIn ?? '')) patch.checkIn = form.checkIn || undefined
    if (form.checkOut !== (activity.checkOut ?? '')) patch.checkOut = form.checkOut || undefined
    if (form.bookingRef !== (activity.bookingRef ?? '')) patch.bookingRef = form.bookingRef || undefined

    if (Object.keys(patch).length > 0) {
      onSave(activity.id, patch)
    }
    onClose()
  }

  const color = getActivityColor(form.type)
  const hasImage = !!activity.image
  const showFlightFields = form.type === 'flight' || form.type === 'transport'
  const showHotelFields = form.type === 'hotel'
  const showTravelSection = showFlightFields || showHotelFields

  const durationHours = Math.max(0, form.endHour - form.startHour)
  const durationLabel = durationHours < 1
    ? `${Math.round(durationHours * 60)}m`
    : durationHours % 1 === 0
      ? `${durationHours}h`
      : `${Math.floor(durationHours)}h ${Math.round((durationHours % 1) * 60)}m`

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="edit-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{ width: MODAL_WIDTH }}
          className="rounded-xl border border-[var(--cal-border)] bg-[var(--cal-surface-elevated)] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Hero header */}
          <div
            className="relative flex flex-col justify-end shrink-0"
            style={{
              height: 140,
              ...(hasImage
                ? { backgroundImage: `url(${activity.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)` }),
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-7 h-7 rounded-md bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors z-10"
              aria-label="Close"
            >
              <Xmark width={16} height={16} strokeWidth={1.5} />
            </button>
            <div className="relative px-4 pb-3 pt-8 z-10">
              <input
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className="w-full bg-transparent border-none text-white text-xl font-serif outline-none placeholder-white/50"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                placeholder="Activity name..."
              />
              {errors.title && (
                <span className="text-red-300 text-xs">{errors.title}</span>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: `${color}60`, color: 'white' }}
                >
                  {form.type.charAt(0).toUpperCase() + form.type.slice(1)}
                </span>
                <span className="text-white/70 text-[11px]">{durationLabel}</span>
              </div>
            </div>
          </div>

          {/* Form body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            {/* Type */}
            <FieldRow label="Type">
              <select
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
                className="flex-1 bg-[var(--cal-bg)] border border-[var(--cal-border)] rounded-md px-3 py-1.5 text-sm text-[var(--cal-text)] outline-none focus:border-[var(--cal-accent)]"
              >
                {ACTIVITY_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </FieldRow>

            {/* When */}
            <SectionLabel>When</SectionLabel>
            <FieldRow label="Date">
              <select
                value={form.day}
                onChange={(e) => update('day', Number(e.target.value))}
                className="flex-1 bg-[var(--cal-bg)] border border-[var(--cal-border)] rounded-md px-3 py-1.5 text-sm text-[var(--cal-text)] outline-none focus:border-[var(--cal-accent)]"
              >
                {tripDays.map((d) => (
                  <option key={d.dayIndex} value={d.dayIndex}>{d.label}</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Time">
              <div className="flex-1 flex items-center gap-2">
                <select
                  value={form.startHour}
                  onChange={(e) => update('startHour', Number(e.target.value))}
                  className="flex-1 bg-[var(--cal-bg)] border border-[var(--cal-border)] rounded-md px-3 py-1.5 text-sm text-[var(--cal-text)] outline-none focus:border-[var(--cal-accent)]"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <span className="text-[var(--cal-text-tertiary)] text-sm">–</span>
                <select
                  value={form.endHour}
                  onChange={(e) => update('endHour', Number(e.target.value))}
                  className={[
                    'flex-1 bg-[var(--cal-bg)] border rounded-md px-3 py-1.5 text-sm text-[var(--cal-text)] outline-none focus:border-[var(--cal-accent)]',
                    errors.endHour ? 'border-red-500' : 'border-[var(--cal-border)]',
                  ].join(' ')}
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </FieldRow>
            {errors.endHour && (
              <span className="text-red-500 text-xs -mt-2 ml-[82px]">{errors.endHour}</span>
            )}

            {/* Where */}
            <SectionLabel>Where</SectionLabel>
            <FieldRow label="Location">
              <input
                value={form.location}
                onChange={(e) => update('location', e.target.value)}
                className="flex-1 bg-[var(--cal-bg)] border border-[var(--cal-border)] rounded-md px-3 py-1.5 text-sm text-[var(--cal-text)] outline-none focus:border-[var(--cal-accent)]"
                placeholder="Address or place name"
              />
            </FieldRow>

            {/* Cost */}
            <SectionLabel>Cost</SectionLabel>
            <FieldRow label="Price">
              <input
                value={form.price}
                onChange={(e) => update('price', e.target.value)}
                className={[
                  'flex-1 bg-[var(--cal-bg)] border rounded-md px-3 py-1.5 text-sm text-[var(--cal-text)] outline-none focus:border-[var(--cal-accent)]',
                  errors.price ? 'border-red-500' : 'border-[var(--cal-border)]',
                ].join(' ')}
                placeholder="0.00"
              />
            </FieldRow>
            {errors.price && (
              <span className="text-red-500 text-xs -mt-2 ml-[82px]">{errors.price}</span>
            )}

            {/* Notes */}
            <SectionLabel>Notes</SectionLabel>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              className="bg-[var(--cal-bg)] border border-[var(--cal-border)] rounded-md px-3 py-2 text-sm text-[var(--cal-text)] outline-none focus:border-[var(--cal-accent)] resize-none"
              placeholder="Add notes..."
            />

            {/* Travel Details (conditional) */}
            {showTravelSection && (
              <>
                <SectionLabel>Travel Details</SectionLabel>
                {showFlightFields && (
                  <>
                    <FieldRow label="Flight #">
                      <input
                        value={form.flightNumber}
                        onChange={(e) => update('flightNumber', e.target.value)}
                        className="flex-1 bg-[var(--cal-bg)] border border-[var(--cal-border)] rounded-md px-3 py-1.5 text-sm text-[var(--cal-text)] outline-none focus:border-[var(--cal-accent)]"
                        placeholder="BA 123"
                      />
                    </FieldRow>
                    <FieldRow label="Airline">
                      <input
                        value={form.airline}
                        onChange={(e) => update('airline', e.target.value)}
                        className="flex-1 bg-[var(--cal-bg)] border border-[var(--cal-border)] rounded-md px-3 py-1.5 text-sm text-[var(--cal-text)] outline-none focus:border-[var(--cal-accent)]"
                        placeholder="British Airways"
                      />
                    </FieldRow>
                  </>
                )}
                {showHotelFields && (
                  <>
                    <FieldRow label="Check-in">
                      <input
                        value={form.checkIn}
                        onChange={(e) => update('checkIn', e.target.value)}
                        className="flex-1 bg-[var(--cal-bg)] border border-[var(--cal-border)] rounded-md px-3 py-1.5 text-sm text-[var(--cal-text)] outline-none focus:border-[var(--cal-accent)]"
                        placeholder="3:00 PM"
                      />
                    </FieldRow>
                    <FieldRow label="Check-out">
                      <input
                        value={form.checkOut}
                        onChange={(e) => update('checkOut', e.target.value)}
                        className="flex-1 bg-[var(--cal-bg)] border border-[var(--cal-border)] rounded-md px-3 py-1.5 text-sm text-[var(--cal-text)] outline-none focus:border-[var(--cal-accent)]"
                        placeholder="11:00 AM"
                      />
                    </FieldRow>
                  </>
                )}
                <FieldRow label="Booking Ref">
                  <input
                    value={form.bookingRef}
                    onChange={(e) => update('bookingRef', e.target.value)}
                    className="flex-1 bg-[var(--cal-bg)] border border-[var(--cal-border)] rounded-md px-3 py-1.5 text-sm text-[var(--cal-text)] outline-none focus:border-[var(--cal-accent)]"
                    placeholder="ABC123"
                  />
                </FieldRow>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[var(--cal-border)] px-4 py-3 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-[var(--cal-border)] text-sm text-[var(--cal-text-secondary)] hover:bg-[var(--cal-border-light)] hover:text-[var(--cal-text)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-[#003594] text-sm text-white hover:bg-[#002a7a] transition-colors"
            >
              Save
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

// ─── Sub-components ─────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--cal-text-tertiary)] border-b border-[var(--cal-border-light)] pb-1">
      {children}
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[var(--cal-text-secondary)] w-[70px] shrink-0">{label}</span>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/ActivityEditModal.tsx
git commit -m "feat: add ActivityEditModal component"
```

---

## Chunk 4: Wiring the Modal & Entry Points

### Task 8: Wire modal in CalendarDashboard + add Edit to CardPopover

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Import ActivityEditModal**

Add import at top of CalendarDashboard.tsx:

```ts
import { ActivityEditModal } from './ActivityEditModal'
```

- [ ] **Step 2: Add handleEditSave callback**

After the `handleContextMenuAction` function, add:

```ts
  const handleEditSave = useCallback((id: string, patch: Partial<CalendarActivity>) => {
    // Route day changes through moveActivity
    if (patch.day !== undefined) {
      const startHour = patch.startHour ?? 0
      moveActivity(id, patch.day, startHour)
      // Remove day and startHour from the patch since moveActivity handles them
      const { day: _day, startHour: _sh, ...rest } = patch
      if (Object.keys(rest).length > 0) {
        updateActivity(id, rest)
      }
    } else {
      updateActivity(id, patch)
    }
    setEditingActivityId(null)
  }, [moveActivity, updateActivity])
```

- [ ] **Step 3: Add Edit action to CardPopover actions array**

Find the `<CardPopover>` JSX (around line 588). Update the `actions` prop to include an Edit button:

```tsx
      actions={selectedActivity ? [
        {
          label: 'Edit',
          onClick: () => {
            setEditingActivityId(selectedActivity.id)
            handleClosePopover()
          },
          variant: 'ghost' as const,
        },
        {
          label: 'Delete',
          onClick: () => handleRemoveActivity(selectedActivity.id),
          variant: 'danger' as const,
        },
      ] : []}
```

- [ ] **Step 4: Render ActivityEditModal**

After the `<ActivityContextMenu>` JSX (added in Task 6), add:

```tsx
    {editingActivityId && (() => {
      const editActivity = activities.find((a) => a.id === editingActivityId)
      if (!editActivity) return null
      return (
        <ActivityEditModal
          activity={editActivity}
          tripDays={TRIP_DAYS}
          onSave={handleEditSave}
          onClose={() => setEditingActivityId(null)}
        />
      )
    })()}
```

- [ ] **Step 5: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: wire ActivityEditModal and Edit action in CardPopover"
```

---

### Task 9: Fix DetailPanel Edit button

**Files:**
- Modify: `apps/web/components/calendar/DetailPanel.tsx:10-16,197-203`

- [ ] **Step 1: Add onEdit prop**

In `apps/web/components/calendar/DetailPanel.tsx`, add to `DetailPanelProps` interface (after `onUpdateActivity` at line 15):

```ts
  onEdit?: (id: string) => void
```

Destructure in function params (after `onUpdateActivity`):
```ts
  onEdit,
```

- [ ] **Step 2: Fix Edit button onClick**

Replace the Edit button (line 198-201):

```tsx
            <button
              className="flex-1 rounded-lg border border-[var(--cal-border)] py-2 text-sm text-[var(--cal-text-secondary)] hover:bg-[var(--cal-border-light)] hover:text-[var(--cal-text)] transition-colors"
              onClick={() => activity && onEdit?.(activity.id)}
            >
              Edit
            </button>
```

- [ ] **Step 3: Pass onEdit from CalendarDashboard (if DetailPanel is used)**

Check if `DetailPanel` is rendered in `CalendarDashboard.tsx`. If it is, add the `onEdit` prop:
```ts
onEdit={(id) => setEditingActivityId(id)}
```

Note: The current `CalendarDashboard` uses `CardPopover` instead of `DetailPanel`. If `DetailPanel` is not rendered, this step just adds the prop for future use.

- [ ] **Step 4: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/DetailPanel.tsx
git commit -m "feat: fix DetailPanel Edit button with onEdit prop"
```

---

### Task 10: Final integration test

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS with no errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS (or only pre-existing warnings)

- [ ] **Step 3: Manual integration test**

Run: `npm run web`

Test the following flows:

1. **Right-click context menu:**
   - Right-click an event → context menu appears
   - Click "Edit" → edit modal opens with activity data pre-filled
   - Modify title, change type, adjust time → click Save
   - Verify changes reflected on calendar

2. **CardPopover Edit button:**
   - Left-click an event → popover appears
   - Click "Edit" → popover closes, edit modal opens
   - Make changes → Save

3. **Context menu other actions:**
   - Right-click → Duplicate → verify new event appears
   - Right-click → Delete → verify event removed

4. **Validation:**
   - Open edit modal → clear title → click Save → verify error shown
   - Set end time before start time → verify error shown

5. **Overlay exclusivity:**
   - Left-click to open popover → right-click another event → verify popover closes and context menu opens

6. **Escape to close:**
   - Open edit modal → press Escape → verify modal closes without saving

7. **Travel fields:**
   - Change type to "transport" → verify flight fields appear
   - Change type to "hotel" → verify check-in/out fields appear
   - Change type to "sightseeing" → verify travel fields hide

- [ ] **Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "fix: address integration test findings"
```
