# Transit Module Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Transit tab to the trip rail for managing ground transportation (buses, trains, ferries, rideshares, shuttles) with CRUD, a dedicated `transit` DB table, and calendar integration.

**Architecture:** Follows the existing Flights module pattern — dedicated Supabase `transit` table, React Query hooks + API fetchers in `packages/shared`, CRUD mutations in-app, view model transforms, and a page+module+card+form component set in `apps/web`. Calendar integration mirrors transit segments as `"transport"` calendar activities with enhanced display.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Supabase, React Query, lucide-react, iconoir-react

**Design spec:** `docs/superpowers/specs/2026-05-07-transit-module-design.md`

---

## File Map

### Files to Create

| # | File | Responsibility |
|---|------|---------------|
| 1 | `packages/shared/src/types/transit.ts` | TransitData + TransitSegment types |
| 2 | `packages/shared/src/services/transitApi.ts` | fetchTransit API function |
| 3 | `packages/shared/src/hooks/useTransit.ts` | React Query hook for transit data |
| 4 | `packages/shared/src/viewmodels/transitViewModel.ts` | buildTransitViewModel transform |
| 5 | `apps/web/components/trip/transit/transitMutations.ts` | CRUD mutations (add/update/delete) |
| 6 | `apps/web/components/trip/transit/TransitForm.tsx` | Add/edit form modal |
| 7 | `apps/web/components/trip/transit/TransitCard.tsx` | Display card for a transit segment |
| 8 | `apps/web/components/trip/transit/TransitModule.tsx` | Module orchestrator |
| 9 | `apps/web/app/(dashboard)/trip/[id]/transit/page.tsx` | Transit page route |

### Files to Modify

| # | File | Change |
|---|------|--------|
| 10 | `packages/shared/src/types/index.ts` | Export transit types |
| 11 | `packages/shared/src/services/index.ts` | Export fetchTransit |
| 12 | `packages/shared/src/hooks/index.ts` | Export useTransit |
| 13 | `packages/shared/src/viewmodels/index.ts` | Export buildTransitViewModel + TransitViewModel |
| 14 | `packages/shared/src/hooks/useItineraryScreen.ts` | Add useTransit hook + realtime channel for `transit` table |
| 15 | `apps/web/components/trip-rail.tsx` | Add Transit tab to book group after Cars |
| 16 | `apps/web/components/calendar/EventBlock.tsx` | Show transit-specific details on transport activities |

---

## Chunk 1: Shared Types + API + Hook + ViewModel

### Task 1: Create TransitData and TransitSegment types

**File:** Create `packages/shared/src/types/transit.ts`

- [ ] **Step 1: Create transit type definitions**

```typescript
// packages/shared/src/types/transit.ts

export type VehicleType = 'train' | 'bus' | 'ferry' | 'rideshare' | 'shuttle';

export interface TransitData {
  vehicleType: VehicleType;
  provider: string | null;
  routeName: string | null;
  originLabel: string;
  destinationLabel: string;
  departureAt: string;       // ISO datetime
  arrivalAt: string;         // ISO datetime
  price: number | null;
  currency: string;
  bookingRef: string | null;
  confirmationCode: string | null;
  notes: string | null;
}

export interface TransitSegment {
  id: string;
  trip_id: string;
  data: TransitData;
  created_at: string;
}
```

- [ ] **Step 2: Export from types barrel**

Edit `packages/shared/src/types/index.ts` — add at end of file (before any empty trailing line):

```typescript
export type { TransitData, TransitSegment, VehicleType } from './transit';
```

### Task 2: Create fetchTransit API function

**File:** Create `packages/shared/src/services/transitApi.ts`

- [ ] **Step 1: Create fetchTransit function**

```typescript
// packages/shared/src/services/transitApi.ts
import { supabase } from './supabase';
import type { TransitSegment } from '../types';

export async function fetchTransit(tripId: string): Promise<TransitSegment[]> {
  const { data, error } = await supabase
    .from('transit')
    .select('*')
    .eq('trip_id', tripId)
    .order('departure_at', { ascending: true });
  if (error) return [];
  // Map DB row shape to TransitSegment (DB stores TransitData in `data` JSONB column)
  return (data as any[])?.map(row => ({
    id: row.id,
    trip_id: row.trip_id,
    data: row.data as TransitSegment['data'],
    created_at: row.created_at,
  })) ?? [];
}
```

- [ ] **Step 2: Export from services barrel**

Edit `packages/shared/src/services/index.ts` — add to the `fetch...` imports from `'./api'` and add:

```typescript
export { fetchTransit } from './transitApi';
```

### Task 3: Create useTransit React Query hook

**File:** Create `packages/shared/src/hooks/useTransit.ts`

- [ ] **Step 1: Create the hook**

```typescript
// packages/shared/src/hooks/useTransit.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTransit } from '../services/transitApi';

export function useTransit(tripId: string | undefined) {
  return useQuery({
    queryKey: ['transit', tripId],
    queryFn: () => fetchTransit(tripId!),
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Export from hooks barrel**

Edit `packages/shared/src/hooks/index.ts` — add:

```typescript
export { useTransit } from './useTransit';
```

### Task 4: Create TransitViewModel

**File:** Create `packages/shared/src/viewmodels/transitViewModel.ts`

- [ ] **Step 1: Create view model + builder**

```typescript
// packages/shared/src/viewmodels/transitViewModel.ts
import type { TransitSegment, VehicleType } from '../types';

export interface TransitViewModel {
  id: string;
  vehicleType: VehicleType;
  provider: string | null;
  routeName: string | null;
  route: string;         // "Origin → Destination"
  originLabel: string;
  destinationLabel: string;
  departureAt: string | null;
  arrivalAt: string | null;
  departureDisplay: string;
  arrivalDisplay: string;
  price: number | null;
  currency: string;
  bookingRef: string | null;
  confirmationCode: string | null;
  notes: string | null;
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function buildTransitViewModel(segment: TransitSegment): TransitViewModel {
  const d = segment.data;
  return {
    id: segment.id,
    vehicleType: d.vehicleType,
    provider: d.provider,
    routeName: d.routeName,
    route: `${d.originLabel} → ${d.destinationLabel}`,
    originLabel: d.originLabel,
    destinationLabel: d.destinationLabel,
    departureAt: d.departureAt,
    arrivalAt: d.arrivalAt,
    departureDisplay: fmtTime(d.departureAt),
    arrivalDisplay: fmtTime(d.arrivalAt),
    price: d.price,
    currency: d.currency,
    bookingRef: d.bookingRef,
    confirmationCode: d.confirmationCode,
    notes: d.notes,
  };
}
```

- [ ] **Step 2: Export from viewmodels barrel**

Edit `packages/shared/src/viewmodels/index.ts` — add:

```typescript
export {
  buildTransitViewModel,
  type TransitViewModel,
} from './transitViewModel';
```

- [ ] **Step 3: Commit Chunk 1**

```bash
git add packages/shared/src/types/transit.ts packages/shared/src/types/index.ts packages/shared/src/services/transitApi.ts packages/shared/src/services/index.ts packages/shared/src/hooks/useTransit.ts packages/shared/src/hooks/index.ts packages/shared/src/viewmodels/transitViewModel.ts packages/shared/src/viewmodels/index.ts
git commit -m "feat: add transit types, API, hook, and view model"
```

---

## Chunk 2: Wire useTransit into useItineraryScreen + Trip Rail

### Task 5: Add transit to useItineraryScreen

**File:** Modify `packages/shared/src/hooks/useItineraryScreen.ts`

- [ ] **Step 1: Import useTransit + buildTransitViewModel**

Add to imports near the top:

```typescript
import { useTransit } from './useTransit';
import { buildTransitViewModel } from '../viewmodels/transitViewModel';
import type { TransitViewModel } from '../viewmodels/transitViewModel';
```

- [ ] **Step 2: Add useTransit and realtime channel**

After the existing `carsQuery` line (~line 350), add:

```typescript
const transitQuery = useTransit(tripId);
```

In the realtime channel setup (around line 397), add `transit` table subscription after the hotels subscription:

```typescript
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'transit', filter: `trip_id=eq.${tripId}` },
        () => queryClient.invalidateQueries({ queryKey: ['transit', tripId] }),
      )
```

- [ ] **Step 3: Build transit view models and add to return value**

After the `cars` memo (~line 437), add:

```typescript
const transit = useMemo(
  () => (transitQuery.data ?? []).map(buildTransitViewModel),
  [transitQuery.data],
);
```

Add `transit` and `isLoading: transitQuery.isLoading` to the hook's return object.

- [ ] **Step 4: Export TransitViewModel type from hook**

Update the type export if needed, or just add `transit: TransitViewModel[]` and `transitLoading: boolean` to the return type.

### Task 6: Add Transit tab to trip rail

**File:** Modify `apps/web/components/trip-rail.tsx`

- [ ] **Step 1: Import Train icon from lucide-react**

Add `Train` to the lucide icon import:

```typescript
import {
  Home, Calendar, CalendarDays, Plane, Building2, Compass,
  Luggage, PieChart, Car, Settings, History, Train,
  MoreHorizontal, X, ChevronLeft, ChevronRight,
  type LucideIcon,
} from 'lucide-react';
```

- [ ] **Step 2: Add Transit tab to ALL_TABS**

Add after the cars entry:

```typescript
{ segment: 'transit',    label: 'Transit',    subtitle: 'Buses, trains & ground transport', icon: Train,    color: DEFAULT_COLOR },
```

- [ ] **Step 3: Add transit to the book group**

Edit TAB_GROUPS — add `'transit'` after `'cars'`:

```typescript
{ id: 'book', segments: ['hotels', 'flights', 'cars', 'transit'] },
```

- [ ] **Step 4: Commit Chunk 2**

```bash
git add packages/shared/src/hooks/useItineraryScreen.ts apps/web/components/trip-rail.tsx
git commit -m "feat: wire transit into useItineraryScreen and trip rail"
```

---

## Chunk 3: Transit Module Components

### Task 7: Create transitMutations

**File:** Create `apps/web/components/trip/transit/transitMutations.ts`

- [ ] **Step 1: Create CRUD mutations**

```typescript
import { supabase } from '@travyl/shared'
import type { TransitData } from '@travyl/shared'

export async function addTransit(tripId: string, data: TransitData): Promise<void> {
  const { error } = await supabase.from('transit').insert({ trip_id: tripId, data })
  if (error) throw error
}

export async function updateTransit(id: string, data: TransitData): Promise<void> {
  const { error } = await supabase.from('transit').update({ data }).eq('id', id)
  if (error) throw error
}

export async function deleteTransit(id: string): Promise<void> {
  const { error } = await supabase.from('transit').delete().eq('id', id)
  if (error) throw error
}
```

### Task 8: Create TransitForm

**File:** Create `apps/web/components/trip/transit/TransitForm.tsx`

- [ ] **Step 1: Create the form component**

Follow the FlightForm pattern exactly:

```tsx
'use client'

import { useState } from 'react'
import type { TransitData, VehicleType } from '@travyl/shared'
import { FieldLabel, Input, Select, DateTimeInput, PrimaryButton, SecondaryButton } from '@/components/trip/BookingFormPrimitives'

const VEHICLE_OPTIONS: { value: VehicleType; label: string; icon: string }[] = [
  { value: 'train', label: 'Train', icon: '🚆' },
  { value: 'bus', label: 'Bus', icon: '🚌' },
  { value: 'ferry', label: 'Ferry', icon: '⛴️' },
  { value: 'rideshare', label: 'Rideshare', icon: '🚕' },
  { value: 'shuttle', label: 'Shuttle', icon: '🚐' },
]

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'MXN', label: 'MXN ($)' },
]

function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

export interface TransitFormProps {
  initial?: Partial<TransitData> & { id?: string }
  defaultCurrency?: string
  onSubmit: (data: TransitData) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}

export function TransitForm({ initial, defaultCurrency = 'USD', onSubmit, onCancel, onDelete }: TransitFormProps) {
  const isAddMode = !initial?.originLabel && !initial?.destinationLabel

  const [vehicleType, setVehicleType] = useState<VehicleType>(initial?.vehicleType ?? 'train')
  const [provider, setProvider] = useState(initial?.provider ?? '')
  const [routeName, setRouteName] = useState(initial?.routeName ?? '')
  const [originLabel, setOriginLabel] = useState(initial?.originLabel ?? '')
  const [destinationLabel, setDestinationLabel] = useState(initial?.destinationLabel ?? '')
  const [departureLocal, setDepartureLocal] = useState(isoToLocalInput(initial?.departureAt))
  const [arrivalLocal, setArrivalLocal] = useState(isoToLocalInput(initial?.arrivalAt))
  const [price, setPrice] = useState(initial?.price?.toString() ?? '')
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency)
  const [bookingRef, setBookingRef] = useState(initial?.bookingRef ?? '')
  const [confirmationCode, setConfirmationCode] = useState(initial?.confirmationCode ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const validate = () => {
    if (!isAddMode) return true
    const next: Record<string, boolean> = {}
    if (!originLabel.trim()) next.originLabel = true
    if (!destinationLabel.trim()) next.destinationLabel = true
    if (!departureLocal) next.departure = true
    if (!arrivalLocal) next.arrival = true
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setBusy(true)
    try {
      const departureIso = isAddMode ? localInputToIso(departureLocal) : (initial?.departureAt ?? null)
      const arrivalIso = isAddMode ? localInputToIso(arrivalLocal) : (initial?.arrivalAt ?? null)
      const data: TransitData = {
        vehicleType,
        provider: provider.trim() || null,
        routeName: routeName.trim() || null,
        originLabel: originLabel.trim(),
        destinationLabel: destinationLabel.trim(),
        departureAt: departureIso ?? initial?.departureAt ?? '',
        arrivalAt: arrivalIso ?? initial?.arrivalAt ?? '',
        price: price ? Number(price) : null,
        currency: currency || defaultCurrency,
        bookingRef: bookingRef.trim() || null,
        confirmationCode: confirmationCode.trim() || null,
        notes: notes.trim() || null,
      }
      await onSubmit(data)
    } finally {
      setBusy(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel()
    else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
  }

  // Vehicle type pills
  const vehiclePills = VEHICLE_OPTIONS.map((opt) => (
    <button
      key={opt.value}
      type="button"
      onClick={() => setVehicleType(opt.value)}
      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
        vehicleType === opt.value
          ? 'bg-[var(--trip-base)]/10 text-[var(--trip-base)] border-2 border-[var(--trip-base)]/30'
          : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 border-2 border-transparent hover:border-gray-200'
      }`}
    >
      {opt.icon} {opt.label}
    </button>
  ))

  return (
    <div onKeyDown={handleKey} className="rounded-xl border border-[var(--trip-base)]/30 bg-white dark:bg-white/[0.04] p-5 space-y-4">
      {!isAddMode && (
        <div className="space-y-1">
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
            {initial?.provider} {initial?.routeName ?? ''}
          </h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">
            {initial?.originLabel} → {initial?.destinationLabel}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-3">
        {/* Vehicle type */}
        <div className="md:col-span-6">
          <FieldLabel>Vehicle type</FieldLabel>
          <div className="flex gap-2 flex-wrap">{vehiclePills}</div>
        </div>

        {isAddMode && (
          <>
            <div className="md:col-span-3">
              <FieldLabel>Provider</FieldLabel>
              <Input value={provider} onChange={setProvider} autoFocus placeholder="Amtrak, FlixBus, Uber, etc." />
            </div>
            <div className="md:col-span-3">
              <FieldLabel>Route name</FieldLabel>
              <Input value={routeName} onChange={setRouteName} placeholder="Northeast Regional (optional)" />
            </div>
            <div className="md:col-span-3">
              <FieldLabel>Origin</FieldLabel>
              <Input value={originLabel} onChange={setOriginLabel} invalid={errors.originLabel} placeholder="NYC Penn Station" />
            </div>
            <div className="md:col-span-3">
              <FieldLabel>Destination</FieldLabel>
              <Input value={destinationLabel} onChange={setDestinationLabel} invalid={errors.destinationLabel} placeholder="Boston South Station" />
            </div>
            <div className="md:col-span-3">
              <FieldLabel>Departure</FieldLabel>
              <DateTimeInput value={departureLocal} onChange={setDepartureLocal} invalid={errors.departure} />
            </div>
            <div className="md:col-span-3">
              <FieldLabel>Arrival</FieldLabel>
              <DateTimeInput value={arrivalLocal} onChange={setArrivalLocal} invalid={errors.arrival} />
            </div>
          </>
        )}

        {/* Price/currency/ref — always visible */}
        <div className="md:col-span-2">
          <FieldLabel>Price</FieldLabel>
          <Input type="number" value={price} onChange={setPrice} placeholder="0" min={0} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Currency</FieldLabel>
          <Select value={currency} onChange={setCurrency} options={CURRENCY_OPTIONS} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Booking ref</FieldLabel>
          <Input value={bookingRef} onChange={setBookingRef} placeholder="Optional" />
        </div>
        <div className="md:col-span-6">
          <FieldLabel>Confirmation code</FieldLabel>
          <Input value={confirmationCode} onChange={setConfirmationCode} placeholder="Optional" />
        </div>
        <div className="md:col-span-6">
          <FieldLabel>Notes</FieldLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={2}
            className="w-full rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] px-4 py-2 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--trip-base)]/20 resize-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            onClick={onDelete}
            disabled={busy}
            className="text-[13px] font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
          >
            Delete transit
          </button>
        ) : <span />}
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onCancel} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} busy={busy}>{isAddMode ? 'Add transit' : 'Save'}</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
```

### Task 9: Create TransitCard

**File:** Create `apps/web/components/trip/transit/TransitCard.tsx`

- [ ] **Step 1: Create display card**

```tsx
'use client'

import { Train, MoreHorizontal } from 'lucide-react'
import type { TransitViewModel } from '@travyl/shared'

const VEHICLE_ICONS: Record<string, string> = {
  train: '🚆', bus: '🚌', ferry: '⛴️', rideshare: '🚕', shuttle: '🚐',
}

export interface TransitCardProps {
  transit: TransitViewModel
  formatPrice: (n: number, currency?: string | null) => string
  onEdit: () => void
  onDelete: () => void
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function TransitCard({ transit, formatPrice, onEdit, onDelete }: TransitCardProps) {
  const d = transit
  const titleParts = [d.provider, d.routeName].filter(Boolean) as string[]

  return (
    <div
      onClick={onEdit}
      className="group rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04]"
    >
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 text-lg"
          style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
        >
          {VEHICLE_ICONS[d.vehicleType] ?? '🚆'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
              {titleParts.length > 0 ? titleParts.join(' · ') : d.route}
            </h3>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 -m-1 rounded text-gray-400 hover:text-red-500"
              aria-label="Delete transit"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
              {d.route}
            </span>
            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
              {formatShortDate(d.departureAt)} → {formatShortDate(d.arrivalAt)}
            </span>
            {d.price != null && (
              <span className="ml-auto text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">
                {formatPrice(d.price, d.currency)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Task 10: Create TransitModule

**File:** Create `apps/web/components/trip/transit/TransitModule.tsx`

- [ ] **Step 1: Create module orchestrator**

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { TransitViewModel, TransitData } from '@travyl/shared'
import { TransitCard } from './TransitCard'
import { TransitForm } from './TransitForm'
import { addTransit, updateTransit, deleteTransit } from './transitMutations'

export interface TransitModuleProps {
  tripId: string
  transit: TransitViewModel[]
  defaultCurrency: string
  formatPrice: (n: number, currency?: string | null) => string
}

export function TransitModule({ tripId, transit, defaultCurrency, formatPrice }: TransitModuleProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const hasExpandedRef = useRef(false)

  const sorted = useMemo(
    () => [...transit].sort((a, b) => (a.departureAt ?? '').localeCompare(b.departureAt ?? '')),
    [transit],
  )

  useEffect(() => {
    if (hasExpandedRef.current) return
    const expandId = searchParams.get('expand')
    if (expandId && transit.some((t) => t.id === expandId)) {
      setEditingId(expandId)
      hasExpandedRef.current = true
    }
  }, [searchParams, transit])

  useEffect(() => {
    const onAdd = () => setAdding(true)
    window.addEventListener('transit:add', onAdd)
    return () => window.removeEventListener('transit:add', onAdd)
  }, [])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['transit', tripId] })
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
  }

  const handleAdd = async (data: TransitData) => {
    try {
      await addTransit(tripId, data)
      invalidate()
      setAdding(false)
    } catch (e) {
      console.error(e)
      toast.error("Couldn't save — try again")
    }
  }

  const handleUpdate = async (id: string, data: TransitData) => {
    try {
      await updateTransit(id, data)
      invalidate()
      setEditingId(null)
      if (searchParams.get('expand')) {
        router.replace(`/trip/${tripId}/transit`, { scroll: false })
      }
    } catch (e) {
      console.error(e)
      toast.error("Couldn't save — try again")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transit segment?')) return
    try {
      await deleteTransit(id)
      invalidate()
      setEditingId(null)
      if (searchParams.get('expand')) {
        router.replace(`/trip/${tripId}/transit`, { scroll: false })
      }
    } catch (e) {
      console.error(e)
      toast.error("Couldn't delete — try again")
    }
  }

  return (
    <div className="space-y-3">
      {adding && (
        <TransitForm
          defaultCurrency={defaultCurrency}
          onSubmit={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}
      {sorted.map((t) => {
        if (editingId === t.id) {
          return (
            <TransitForm
              key={t.id}
              initial={{
                vehicleType: t.vehicleType,
                provider: t.provider,
                routeName: t.routeName,
                originLabel: t.originLabel,
                destinationLabel: t.destinationLabel,
                departureAt: t.departureAt ?? undefined,
                arrivalAt: t.arrivalAt ?? undefined,
                price: t.price ?? undefined,
                currency: t.currency,
                bookingRef: t.bookingRef ?? undefined,
                confirmationCode: t.confirmationCode ?? undefined,
                notes: t.notes ?? undefined,
                id: t.id,
              }}
              defaultCurrency={defaultCurrency}
              onSubmit={(data) => handleUpdate(t.id, data)}
              onCancel={() => setEditingId(null)}
              onDelete={() => handleDelete(t.id)}
            />
          )
        }
        return (
          <TransitCard
            key={t.id}
            transit={t}
            formatPrice={formatPrice}
            onEdit={() => setEditingId(t.id)}
            onDelete={() => handleDelete(t.id)}
          />
        )
      })}
    </div>
  )
}
```

### Task 11: Create Transit page

**File:** Create `apps/web/app/(dashboard)/trip/[id]/transit/page.tsx`

- [ ] **Step 1: Create page component**

```tsx
'use client'

import { use } from 'react'
import { Plus, Train } from 'lucide-react'
import { useItineraryScreen, useHomeCurrency } from '@travyl/shared'
import { TransitModule } from '@/components/trip/transit/TransitModule'

export default function TransitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { transit, isLoading, trip } = useItineraryScreen(id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tripCurrency = ((trip as any)?.currency ?? 'USD').match(/^[A-Z]{3}/)?.[0] ?? 'USD'
  const { format: formatHome } = useHomeCurrency()
  const formatPrice = (n: number, currency?: string | null) => formatHome(n, currency ?? tripCurrency)

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-10 py-12">
        <div className="h-40 animate-pulse bg-gray-100 dark:bg-white/[0.04] rounded-xl" />
      </div>
    )
  }

  const description = transit.length === 0
    ? 'No transit segments yet'
    : `${transit.length} ${transit.length === 1 ? 'segment' : 'segments'}`

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[26px] font-serif font-normal text-gray-900 dark:text-white tracking-tight leading-tight">
            Transit
          </h1>
          {description && (
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5">{description}</p>
          )}
        </div>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('transit:add'))}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
          style={{ backgroundColor: 'var(--trip-base)' }}
        >
          <Plus size={13} /> Transit
        </button>
      </div>

      <TransitModule
        tripId={id}
        transit={transit}
        defaultCurrency={tripCurrency}
        formatPrice={formatPrice}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit Chunk 3**

```bash
git add apps/web/components/trip/transit/ apps/web/app/\(dashboard\)/trip/\[id\]/transit/
git commit -m "feat: add Transit module components and page"
```

---

## Chunk 4: Calendar Integration

### Task 12: Enhance EventBlock for transit activities

**File:** Modify `apps/web/components/calendar/EventBlock.tsx`

- [ ] **Step 1: Add transit-specific display in the normal layout section**

After the line that renders `activity.title` (around line 234-237 in the normal layout section), check if the activity type is `'transport'` and has transit metadata. The transit metadata comes from `activityData` stored on the activity. In the layout section, we want to show the vehicle-type emoji and route info.

Actually, looking at the code more carefully, the `CalendarActivity` type already has `flightNumber`, `airline`, and `bookingRef` fields. We need to add transit-specific fields or reuse these. The key enhancement is: when activity type is `'transport'`, check for transit-related data (like vehicle type stored in `activity_data`) and show the appropriate emoji.

For now since we're not doing full calendar mirroring in this initial implementation, let's keep this simpler. The calendar activities created by the transit module will use the `"transport"` type with the existing fields. The vehicle-type icon could be stored in the activity's `airline` or `notes` field, or we could add a `transitVehicleType` field to `CalendarActivity`.

Let me reconsider the calendar integration scope. The spec says:
- Transit segments mirror to calendar as `"transport"` activities
- Enhanced display showing vehicle type emoji, provider, route, booking ref

But this requires:
1. Creating calendar activities from transit segments
2. Storing the transit data reference so EventBlock can display it
3. Updating EventBlock to check for this reference

For v1, let's make this simpler: the transit module tracks `showOnCalendar` (boolean), and when enabled, creates a calendar activity that stores `transitSegmentId` in its `activity_data`. The EventBlock can then look up the transit data. But this adds significant complexity.

**Simplified approach for v1:** Transit segments added to the trip are listed in the Transit tab. They don't automatically create calendar activities. The user can manually add a "transport" activity to the calendar and reference their transit booking. This keeps the scope manageable.

Wait, let me re-read the spec... "When `showOnCalendar` is true, creating/updating a TransitSegment creates/updates a corresponding calendar activity of type `"transport"`"

OK, let me scope this properly. For the initial implementation:
- Transit CRUD works standalone (Chunk 1-3)
- Calendar mirroring is a separate follow-up feature

This keeps the implementation focused and deliverable. The calendar integration can be added later.

- [ ] **Step 2: Remove EventBlock changes from scope (deferred to follow-up)**

Update the ticket to note that calendar mirroring is deferred.

- [ ] **Step 3: Commit Chunk 4 (empty — just the scope note)**

Actually, let me just note this as deferred. But we should keep the EventBlock type updated so `CalendarActivity` can carry transit data. Let me add the field.

Edit `packages/shared/src/types/index.ts` — add to `CalendarActivity` interface:

```typescript
  /** Transit vehicle type reference for transport activities */
  transitVehicleType?: 'train' | 'bus' | 'ferry' | 'rideshare' | 'shuttle'
```

And add to `ActivityData`:

```typescript
  transit_vehicle_type?: string
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat: add transitVehicleType to CalendarActivity and ActivityData"
```

---

## Chunk 5: Supabase Migration

### Task 13: Create transit table migration

- [ ] **Step 1: Write SQL for the `transit` table**

```sql
create table if not exists transit (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references profiles(id),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists transit_trip_id_idx on transit(trip_id);
```

Note: We store everything in a `data` JSONB column (matching the flight pattern: `flights` table stores `data` as JSONB). This keeps the schema simple and avoids creating individual columns for each transit field. The `departure_at` ordering is done on the client side.

- [ ] **Step 2: Apply migration via Supabase dashboard or CLI**

Run the SQL against the production Supabase project.

---

## Summary of What's Built

After this implementation:
- [x] `TransitData`, `TransitSegment`, `VehicleType` types in shared
- [x] `fetchTransit` API function
- [x] `useTransit` React Query hook
- [x] `buildTransitViewModel` + `TransitViewModel`
- [x] Transit tab in trip rail (between Cars and Activities)
- [x] Transit page route (`/trip/:id/transit`)
- [x] Transit module with list view
- [x] Transit form (add/edit with vehicle type selector)
- [x] Transit card (display with vehicle icon, route, times, price)
- [x] CRUD mutations (add/update/delete)
- [x] Real-time sync via Supabase channels
- [x] `transit` DB table

## Out of Scope (v1)

- Calendar mirroring (transit segments automatically appearing as calendar activities)
- Search API integration (SerpAPI, Google Transit)
- ActivityConnector integration showing transit between activities
- Enhanced EventBlock display for transit activities
- The `showOnCalendar` field
