# Cars Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 26-line static placeholder Cars page with a working booking-management surface that mirrors Hotels/Flights, persisting rentals to `trip.trip_context.cars` JSONB.

**Architecture:** Five new files under `apps/web/components/trip/cars/` (types, mutations, card, form, module) + a thin orchestrator rewrite of `cars/page.tsx`. No new Supabase tables, no migrations, no shared-package changes. Mutations read trip_context, mutate the `cars` field, write back; same TOCTOU profile as Budget. Cache invalidation on the `['trip', tripId]` query key fires the existing realtime trip-row subscription for cross-client sync.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind, Lucide, motion/react, Supabase (existing), `sonner` for toasts. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-06-cars-page-redesign-design.md` (commit `13642ebc`)

**Branch:** `develop` — commits land directly on develop, no feature branch.

---

## Critical context for the implementer

- **Noah's WIP must not be touched.** `settings/page.tsx`, `budget/page.tsx`, `trip-rail.tsx`, `ThemePicker.tsx`, `TakeoffTransition.tsx`, `GlobalNavbar.tsx`, `DashboardLayout.tsx`, `share/[token]/page.tsx`, `CLAUDE.md` are uncommitted edits in the working tree. Don't stage them, don't stash them, don't fix them.
- **No Supabase migration.** Persistence is `trip.trip_context.cars: CarRental[]` JSONB. Same pattern as Budget's `budget_data`. The implementer should never run anything against the DB schema.
- **No shared-package changes.** `CarRentalData` and `CarRental` types live locally in `apps/web/components/trip/cars/types.ts` — not in `packages/shared`. There's no `useCars` hook; we read from `useItineraryScreen.trip.trip_context.cars`.
- **Vitest in node env, no @testing-library/react.** Most verification is manual via the dev server (`npm run web`).
- **Pre-existing repo lint debt is OUT of scope** (243+ errors elsewhere). Avoid introducing new warnings in your new files.

---

## File Map

### Files created

| File | Responsibility |
| ---- | -------------- |
| `apps/web/components/trip/cars/types.ts` | `CarRentalData` + `CarRental` interfaces. Local to web app. |
| `apps/web/components/trip/cars/carMutations.ts` | `readCars`, `writeCars`, `addCar`, `updateCar`, `deleteCar`. Direct supabase calls against `trips.trip_context.cars`. |
| `apps/web/components/trip/cars/CarCard.tsx` | Read-only display card. Hover ⋯ deletes. Click → toggle edit. |
| `apps/web/components/trip/cars/CarForm.tsx` | Inline add/edit form. Esc cancel, Cmd+Enter submit. |
| `apps/web/components/trip/cars/CarsModule.tsx` | Orchestrator: empty state, sorted list, manage state, mutations. |

### Files modified

| File | Change |
| ---- | ------ |
| `apps/web/app/(dashboard)/trip/[id]/cars/page.tsx` | Rewrite from 26 lines (static placeholder) → ~80-line orchestrator using the new components. |

### Files NOT touched

- `packages/shared/src/types/index.ts` — no new types.
- `packages/shared/src/hooks/` — no new hooks.
- `apps/web/components/trip/Module.tsx`, `BookingFormPrimitives.tsx` — already exist, used as-is.
- `apps/web/components/trip/hotels/`, `apps/web/components/trip/flights/` — separate domain.
- Any of Noah's WIP files.

---

## Pre-flight (one-time)

- [ ] **Step 0.1: Confirm branch + working tree**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git branch --show-current
git status --short | head -10
```

Expected: branch `develop`. Working tree shows Noah's WIP files unchanged.

- [ ] **Step 0.2: Confirm the current cars page is the placeholder**

```bash
cat apps/web/app/\(dashboard\)/trip/\[id\]/cars/page.tsx
```

Expected: 26 lines, static `EmptyState` component, comment `"No DB table yet — show empty state ready for future API"`. If you see anything else, **stop and report NEEDS_CONTEXT**.

- [ ] **Step 0.3: Confirm no `cars` references that would conflict**

```bash
grep -rn "trip_context\.cars\|interface CarRental\|useCars\b" apps/web packages/shared --include="*.ts" --include="*.tsx" | grep -v ".next" | grep -v "components/trip/cars"
```

Expected: empty (or only matches inside docs/specs). If anything else references `trip_context.cars`, the implementer needs to coordinate.

- [ ] **Step 0.4: Spin up the dev server** (leave running)

```bash
npm run web
```

Open `http://localhost:3001/trip/<a-real-trip-id>/cars` in a browser. You should see the static "No car rentals yet" empty state with a non-functional Add button. That's your starting state.

---

## Task 1: Types

**Files:**
- Create: `apps/web/components/trip/cars/types.ts`

- [ ] **Step 1.1: Create the file**

```typescript
export interface CarRentalData {
  vendor: string
  vehicle: string | null
  pickup_location: string
  dropoff_location: string | null
  pickup_at: string
  dropoff_at: string
  price: number | null
  currency: string | null
  booking_ref: string | null
}

export interface CarRental {
  id: string
  data: CarRentalData
}
```

- [ ] **Step 1.2: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/trip/cars/types.ts
git commit -m "Add CarRental + CarRentalData types"
```

---

## Task 2: Mutations against `trip_context.cars`

**Files:**
- Create: `apps/web/components/trip/cars/carMutations.ts`

- [ ] **Step 2.1: Create the file**

```typescript
import { supabase } from '@travyl/shared'
import type { CarRental, CarRentalData } from './types'

async function readContext(tripId: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('trips')
    .select('trip_context')
    .eq('id', tripId)
    .single()
  if (error) throw error
  return (data?.trip_context as Record<string, unknown>) ?? {}
}

export async function readCars(tripId: string): Promise<CarRental[]> {
  const ctx = await readContext(tripId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((ctx as any).cars as CarRental[] | undefined) ?? []
}

async function writeCars(tripId: string, cars: CarRental[]): Promise<void> {
  const ctx = await readContext(tripId)
  const { error } = await supabase
    .from('trips')
    .update({ trip_context: { ...ctx, cars } })
    .eq('id', tripId)
  if (error) throw error
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `car-${crypto.randomUUID()}`
  }
  return `car-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function addCar(tripId: string, data: CarRentalData): Promise<void> {
  const cars = await readCars(tripId)
  const next: CarRental = { id: newId(), data }
  await writeCars(tripId, [...cars, next])
}

export async function updateCar(tripId: string, id: string, data: CarRentalData): Promise<void> {
  const cars = await readCars(tripId)
  await writeCars(tripId, cars.map((c) => c.id === id ? { ...c, data } : c))
}

export async function deleteCar(tripId: string, id: string): Promise<void> {
  const cars = await readCars(tripId)
  await writeCars(tripId, cars.filter((c) => c.id !== id))
}
```

- [ ] **Step 2.2: Typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "trip/cars" | head -5
```

Expected: clean.

- [ ] **Step 2.3: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/trip/cars/carMutations.ts
git commit -m "Add car CRUD mutations against trip_context.cars JSONB"
```

---

## Task 3: `CarCard.tsx`

**Files:**
- Create: `apps/web/components/trip/cars/CarCard.tsx`

- [ ] **Step 3.1: Create the file**

```tsx
'use client'

import { Car, MoreHorizontal } from 'lucide-react'
import type { CarRental } from './types'

export interface CarCardProps {
  car: CarRental
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

function computeDays(pickupAt: string | null, dropoffAt: string | null): number {
  if (!pickupAt || !dropoffAt) return 0
  const ms = new Date(dropoffAt).getTime() - new Date(pickupAt).getTime()
  if (!isFinite(ms) || ms <= 0) return 0
  return Math.max(1, Math.ceil(ms / 86400000))
}

export function CarCard({ car, formatPrice, onEdit, onDelete }: CarCardProps) {
  const { data } = car
  const titleParts = [data.vendor, data.vehicle].filter(Boolean) as string[]
  const days = computeDays(data.pickup_at, data.dropoff_at)
  const dateRange = `${formatShortDate(data.pickup_at)} → ${formatShortDate(data.dropoff_at)}`

  return (
    <div
      onClick={onEdit}
      className="group rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4 transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04]"
    >
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
        >
          <Car size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
              {titleParts.join(' · ')}
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 -m-1 rounded text-gray-400 hover:text-red-500"
              aria-label="Delete car rental"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
              {dateRange}
            </span>
            {days > 0 && (
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
                {days} {days === 1 ? 'day' : 'days'}
              </span>
            )}
            {data.pickup_location && (
              <span
                className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full max-w-[160px] truncate"
                title={data.pickup_location}
              >
                {data.pickup_location}
              </span>
            )}
            {data.price != null && (
              <span className="ml-auto text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">
                {formatPrice(data.price, data.currency)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3.2: Typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "trip/cars" | head -5
```

- [ ] **Step 3.3: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/trip/cars/CarCard.tsx
git commit -m "Add CarCard read-only display"
```

---

## Task 4: `CarForm.tsx`

**Files:**
- Create: `apps/web/components/trip/cars/CarForm.tsx`

- [ ] **Step 4.1: Create the file**

The currency options + datetime helpers are copied verbatim from `apps/web/components/trip/flights/FlightForm.tsx` per the spec. A future cleanup PR can extract them.

```tsx
'use client'

import { useState } from 'react'
import type { CarRentalData } from './types'
import { FieldLabel, Input, Select, DateTimeInput, PrimaryButton, SecondaryButton } from '@/components/trip/BookingFormPrimitives'

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

export interface CarFormProps {
  initial?: Partial<CarRentalData> & { id?: string }
  defaultCurrency?: string
  onSubmit: (data: CarRentalData) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}

export function CarForm({ initial, defaultCurrency = 'USD', onSubmit, onCancel, onDelete }: CarFormProps) {
  const [vendor, setVendor] = useState(initial?.vendor ?? '')
  const [vehicle, setVehicle] = useState(initial?.vehicle ?? '')
  const [pickupLocation, setPickupLocation] = useState(initial?.pickup_location ?? '')
  const [dropoffLocation, setDropoffLocation] = useState(initial?.dropoff_location ?? '')
  const [pickupLocal, setPickupLocal] = useState(isoToLocalInput(initial?.pickup_at))
  const [dropoffLocal, setDropoffLocal] = useState(isoToLocalInput(initial?.dropoff_at))
  const [price, setPrice] = useState(initial?.price?.toString() ?? '')
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency)
  const [bookingRef, setBookingRef] = useState(initial?.booking_ref ?? '')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<{ vendor?: boolean; pickupLocation?: boolean; pickup?: boolean; dropoff?: boolean }>({})

  const validate = () => {
    const next: typeof errors = {}
    if (!vendor.trim()) next.vendor = true
    if (!pickupLocation.trim()) next.pickupLocation = true
    if (!pickupLocal) next.pickup = true
    if (!dropoffLocal) next.dropoff = true
    else if (pickupLocal && dropoffLocal < pickupLocal) next.dropoff = true
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setBusy(true)
    try {
      const pickupIso = localInputToIso(pickupLocal)
      const dropoffIso = localInputToIso(dropoffLocal)
      if (!pickupIso || !dropoffIso) {
        setBusy(false)
        return
      }
      const data: CarRentalData = {
        vendor: vendor.trim(),
        vehicle: vehicle.trim() || null,
        pickup_location: pickupLocation.trim(),
        dropoff_location: dropoffLocation.trim() || pickupLocation.trim(),
        pickup_at: pickupIso,
        dropoff_at: dropoffIso,
        price: price ? Number(price) : null,
        currency: price ? currency : null,
        booking_ref: bookingRef.trim() || null,
      }
      await onSubmit(data)
    } finally {
      setBusy(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div onKeyDown={handleKey} className="rounded-xl border border-[var(--trip-base)]/30 bg-white dark:bg-white/[0.04] p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-3">
        <div className="md:col-span-3">
          <FieldLabel>Vendor</FieldLabel>
          <Input value={vendor} onChange={setVendor} autoFocus invalid={errors.vendor} placeholder="Hertz, Enterprise, etc." />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Vehicle</FieldLabel>
          <Input value={vehicle} onChange={setVehicle} placeholder="Toyota Camry, Compact SUV" />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Pickup location</FieldLabel>
          <Input value={pickupLocation} onChange={setPickupLocation} invalid={errors.pickupLocation} placeholder="SFO airport, address, etc." />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Dropoff location</FieldLabel>
          <Input value={dropoffLocation} onChange={setDropoffLocation} placeholder="Same as pickup if blank" />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Pickup</FieldLabel>
          <DateTimeInput value={pickupLocal} onChange={setPickupLocal} invalid={errors.pickup} />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Dropoff</FieldLabel>
          <DateTimeInput value={dropoffLocal} onChange={setDropoffLocal} invalid={errors.dropoff} />
        </div>
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
      </div>

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            onClick={onDelete}
            disabled={busy}
            className="text-[13px] font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
          >
            Delete rental
          </button>
        ) : <span />}
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onCancel} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} busy={busy}>{initial?.id ? 'Save' : 'Add rental'}</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4.2: Typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "trip/cars" | head -5
```

- [ ] **Step 4.3: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/trip/cars/CarForm.tsx
git commit -m "Add CarForm inline add/edit"
```

---

## Task 5: `CarsModule.tsx`

**Files:**
- Create: `apps/web/components/trip/cars/CarsModule.tsx`

- [ ] **Step 5.1: Create the file**

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Car, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { CarRental, CarRentalData } from './types'
import { CarCard } from './CarCard'
import { CarForm } from './CarForm'
import { addCar, updateCar, deleteCar } from './carMutations'

export interface CarsModuleProps {
  tripId: string
  cars: CarRental[]
  defaultCurrency: string
  formatPrice: (n: number, currency?: string | null) => string
}

export function CarsModule({ tripId, cars, defaultCurrency, formatPrice }: CarsModuleProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const hasExpandedRef = useRef(false)

  // Sort by pickup_at ascending. Defensive `?? ''` in case someone hand-edits trip_context.
  const sorted = useMemo(
    () => [...cars].sort((a, b) => (a.data.pickup_at ?? '').localeCompare(b.data.pickup_at ?? '')),
    [cars],
  )

  // Auto-expand if URL ?expand=<id> is present. Only fires once.
  useEffect(() => {
    if (hasExpandedRef.current) return
    const expandId = searchParams.get('expand')
    if (expandId && cars.some((c) => c.id === expandId)) {
      setEditingId(expandId)
      hasExpandedRef.current = true
    }
  }, [searchParams, cars])

  // Listen for the page-header "+ Rental" CustomEvent to open the add form.
  useEffect(() => {
    const onAdd = () => setAdding(true)
    window.addEventListener('cars:add', onAdd)
    return () => window.removeEventListener('cars:add', onAdd)
  }, [])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
  }

  const handleAdd = async (data: CarRentalData) => {
    try {
      await addCar(tripId, data)
      invalidate()
      setAdding(false)
    } catch (e) {
      console.error(e)
      toast.error("Couldn't save — try again")
    }
  }

  const handleUpdate = async (id: string, data: CarRentalData) => {
    try {
      await updateCar(tripId, id, data)
      invalidate()
      setEditingId(null)
      if (searchParams.get('expand')) {
        router.replace(`/trip/${tripId}/cars`, { scroll: false })
      }
    } catch (e) {
      console.error(e)
      toast.error("Couldn't save — try again")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this car rental?')) return
    try {
      await deleteCar(tripId, id)
      invalidate()
      setEditingId(null)
      if (searchParams.get('expand')) {
        router.replace(`/trip/${tripId}/cars`, { scroll: false })
      }
    } catch (e) {
      console.error(e)
      toast.error("Couldn't delete — try again")
    }
  }

  if (cars.length === 0 && !adding) {
    return (
      <div className="flex flex-col items-center text-center py-12">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
        >
          <Car size={20} />
        </div>
        <p className="text-[15px] font-serif text-gray-700 dark:text-gray-200">No car rentals yet</p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
          Add a rental to track your ground transportation.
        </p>
        <button
          onClick={() => setAdding(true)}
          className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.08] transition"
        >
          <Plus size={13} /> Add rental
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {adding && (
        <CarForm
          defaultCurrency={defaultCurrency}
          onSubmit={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}
      {sorted.map((c) => {
        if (editingId === c.id) {
          return (
            <CarForm
              key={c.id}
              initial={{ ...c.data, id: c.id }}
              defaultCurrency={defaultCurrency}
              onSubmit={(data) => handleUpdate(c.id, data)}
              onCancel={() => setEditingId(null)}
              onDelete={() => handleDelete(c.id)}
            />
          )
        }
        return (
          <CarCard
            key={c.id}
            car={c}
            formatPrice={formatPrice}
            onEdit={() => setEditingId(c.id)}
            onDelete={() => handleDelete(c.id)}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5.2: Typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "trip/cars" | head -5
```

Expected: clean. May still see errors in `cars/page.tsx` (Task 6).

- [ ] **Step 5.3: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/trip/cars/CarsModule.tsx
git commit -m "Add CarsModule orchestrator"
```

---

## Task 6: Rewrite `cars/page.tsx`

**Files:**
- Modify: `apps/web/app/(dashboard)/trip/[id]/cars/page.tsx`

- [ ] **Step 6.1: Replace the file**

```tsx
'use client'

import { use } from 'react'
import { Plus } from 'lucide-react'
import { useItineraryScreen, useHomeCurrency } from '@travyl/shared'
import { Module } from '@/components/trip/Module'
import { CarsModule } from '@/components/trip/cars/CarsModule'
import type { CarRental } from '@/components/trip/cars/types'

function totalDays(cars: CarRental[]): number {
  return cars.reduce((sum, c) => {
    const ms = new Date(c.data.dropoff_at).getTime() - new Date(c.data.pickup_at).getTime()
    if (!isFinite(ms) || ms <= 0) return sum
    return sum + Math.max(1, Math.ceil(ms / 86400000))
  }, 0)
}

export default function CarsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { trip, isLoading } = useItineraryScreen(id)
  const { format: formatHome } = useHomeCurrency()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tripCurrency = ((trip as any)?.currency ?? 'USD').match(/^[A-Z]{3}/)?.[0] ?? 'USD'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cars = (((trip?.trip_context as any)?.cars as CarRental[] | undefined) ?? [])

  const formatPrice = (n: number, currency?: string | null) => formatHome(n, currency ?? tripCurrency)

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-10 py-12">
        <Module title="Car rentals" description="Loading…">
          <div className="h-40 animate-pulse bg-gray-100 dark:bg-white/[0.04] rounded-xl" />
        </Module>
      </div>
    )
  }

  const days = totalDays(cars)
  const description = cars.length === 0
    ? 'No car rentals yet'
    : `${cars.length} ${cars.length === 1 ? 'rental' : 'rentals'}${days > 0 ? ` · ${days} ${days === 1 ? 'day' : 'days'} total` : ''}`

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <Module
        title="Car rentals"
        description={description}
        action={
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('cars:add'))}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: 'var(--trip-base)' }}
          >
            <Plus size={13} /> Rental
          </button>
        }
      >
        <CarsModule
          tripId={id}
          cars={cars}
          defaultCurrency={tripCurrency}
          formatPrice={formatPrice}
        />
      </Module>
    </div>
  )
}
```

- [ ] **Step 6.2: Typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | grep -v "TakeoffScene3D" | grep -v "app/(main)/page.tsx" | head -10
```

Expected: clean for the work area. The pre-existing `app/(main)/page.tsx` `statsOnly` error is the only thing that should still appear.

- [ ] **Step 6.3: Visual check**

Open `http://localhost:3001/trip/<id>/cars`. You should see the new Module ("Car rentals" title, "No car rentals yet" description, "+ Rental" theme-color button). Click "+ Rental" → form opens at top of list. Fill in vendor + pickup location + pickup/dropoff datetimes, click "Add rental" — card appears. Click the card — form expands inline. Click "Delete rental" → confirms then removes. Refresh the page — the data persists (it's in `trip.trip_context.cars` JSONB).

If anything breaks, fix before committing.

- [ ] **Step 6.4: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/app/\(dashboard\)/trip/\[id\]/cars/page.tsx
git commit -m "Rewrite cars/page.tsx as Module + CarsModule orchestrator"
```

---

## Task 7: Suite + lint + push

- [ ] **Step 7.1: Run all web tests**

```bash
cd apps/web && npx vitest run 2>&1 | tail -10
```

Expected: tests pass, count unchanged from before this work.

- [ ] **Step 7.2: Lint the new + modified files**

```bash
cd apps/web && npx eslint \
  components/trip/cars/ \
  app/\(dashboard\)/trip/\[id\]/cars/page.tsx \
  2>&1 | tail -20
```

Expected: clean. If new warnings appear, fix them.

- [ ] **Step 7.3: Push**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git push origin develop
```

If the push is rejected because Noah pushed in parallel: stash WIP, `git pull --rebase origin develop`, push, pop stash. Pattern documented in the Hotels/Flights and Packing plans.

---

## Out of Scope (deferred)

- External car-rental search APIs.
- Price comparison.
- Vehicle catalog with images.
- Insurance / extras / GPS add-on tracking.
- Driver age, license, insurance fields.
- Multi-driver bookings.
- Hourly rentals.
- IATA airport autocomplete for pickup location.
- Atomic `trip_context` updates (TOCTOU race with concurrent Settings/Budget writes — same risk profile as Budget's `persist`).

## Risk Notes

- **TOCTOU on `trip_context`.** The `writeCars` helper reads `trip_context`, mutates the `cars` field, and writes back. If Settings or another writer modifies a different `trip_context` key in the same window, one write clobbers the other. Same risk as Budget. Acceptable for a single-user-per-trip model; flag if it becomes a real problem.
- **Locally-generated IDs.** `crypto.randomUUID()` keeps collisions cosmically unlikely. Two simultaneous adds from different clients race the JSONB write — last-write wins, first add lost. Same pattern as Budget. Document in the implementation README if useful.
- **`useItineraryScreen` re-renders.** The page reads `trip.trip_context.cars` directly each render. React Query memoizes the `trip` query data, so the array identity is stable until the next refetch. `useMemo` on the sorted list only recomputes when the array reference changes. No re-render storm.
- **The "+ Rental" CustomEvent pattern** mirrors Hotels/Flights. Same rationale, same caveat about address-bar navigation (not worth solving in this plan).
- **Hidden field check.** `CarRentalData` has 9 fields. The form exposes all 9 either as inputs (vendor, vehicle, pickup_location, dropoff_location, price, currency, booking_ref) or computes them from inputs (pickup_at, dropoff_at). No internal-only fields like `offer_id` to hide.
