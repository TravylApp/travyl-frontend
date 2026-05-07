# Hotels + Flights Pages Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bloated 2021-line Hotels page and 1126-line Flights page with focused booking-management surfaces that consume the existing `useItineraryScreen` view models, support inline add/edit/delete via direct Supabase mutations, and match the new Settings/Budget/Packing styling.

**Architecture:** Add raw-ISO timestamp fields to `FlightViewModel` so we can sort by ISO instead of formatted strings. Build shared form primitives (no Settings dependency). Build per-domain components (`HotelCard` + `HotelForm` + `HotelsModule`; same for flights). Rewrite both `page.tsx` files as ~150-line orchestrators. Delete the per-record sub-routes; update the 3 inbound links to deep-link via query param to the list (orchestrator auto-expands the matching card). Mutations are inline `supabase.from(table).insert/update/delete`, with `queryClient.invalidateQueries` for instant local updates and realtime postgres_changes for cross-client.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind, Lucide, motion/react, Supabase (existing), `sonner` for toasts. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-06-hotels-flights-redesign-design.md` (commit `86eed6c9`)

**Branch:** `develop` — commits land directly on develop, no feature branch.

---

## Critical context for the implementer

- **Noah's WIP must not be touched.** `settings/page.tsx`, `budget/page.tsx`, `trip-rail.tsx`, `ThemePicker.tsx`, `TakeoffTransition.tsx`, `GlobalNavbar.tsx`, `DashboardLayout.tsx`, `share/[token]/page.tsx`, `CLAUDE.md` are all uncommitted edits in the working tree. Do not stage them, do not stash them away, do not "fix" them.
- **Form primitives.** The spec is explicit: do NOT lift from Settings (which has its own copies inline). Copy-paste fresh into a new `BookingFormPrimitives.tsx`. A future cleanup PR can converge.
- **Sub-routes have inbound links.** `useSpotlightSearch.ts`, `itinerary/FlightCard.tsx`, `itinerary/HotelCard.tsx` all link to `/trip/${id}/{hotels|flights}/${recordId}`. The plan keeps deep linking working by:
  1. Redirecting these links to `/trip/${id}/{hotels|flights}?expand=${recordId}`.
  2. The orchestrator reads `?expand=` via `useSearchParams` and auto-expands the matching card on mount.
  3. The sub-route files (`hotels/[hotelId]/page.tsx`, `flights/[flightId]/page.tsx`) get deleted after the link rewrites.
- **Realtime is already wired.** `useItineraryScreen.ts` subscribes to `postgres_changes` on `flights` and `hotels` tables. Mutations made elsewhere propagate within ~1s. Local `queryClient.invalidateQueries` is for instant feel.
- **Vitest in node env, no @testing-library/react.** Pure-logic tests only. The orchestrators are mostly visual; verification is manual via the dev server.
- **Pre-existing repo lint debt is OUT of scope.** Avoid introducing new warnings in your new files.

---

## File Map

### Files created

| File | Responsibility |
| ---- | -------------- |
| `apps/web/components/trip/BookingFormPrimitives.tsx` | `FieldLabel`, `Input`, `Select`, `DateInput`, `DateTimeInput`, `PrimaryButton`, `SecondaryButton`. Self-contained — no Settings dependency. |
| `apps/web/components/trip/hotels/hotelMutations.ts` | `addHotel`, `updateHotel`, `deleteHotel` — direct supabase calls + invalidateQueries helper. |
| `apps/web/components/trip/hotels/HotelCard.tsx` | Read-only display card for one hotel. Hover shows ⋯ menu. Click anywhere → toggles edit. |
| `apps/web/components/trip/hotels/HotelForm.tsx` | Inline form (add OR edit). Validation, Cmd+Enter submit, Esc cancel. |
| `apps/web/components/trip/hotels/HotelsModule.tsx` | Orchestrator inside the page Module: empty state OR sorted card list, manages add/edit state, reads `?expand=` to auto-open a record. |
| `apps/web/components/trip/flights/flightMutations.ts` | Mirror for flights. |
| `apps/web/components/trip/flights/FlightCard.tsx` | Mirror — origin → dest route layout. |
| `apps/web/components/trip/flights/FlightForm.tsx` | Mirror — IATA fields, datetime-local for departure/arrival, auto-uppercase IATA. |
| `apps/web/components/trip/flights/FlightsModule.tsx` | Mirror orchestrator. |

### Files modified

| File | Change |
| ---- | ------ |
| `packages/shared/src/viewmodels/itineraryViewModel.ts` | Add `departureAt: string \| null`, `arrivalAt: string \| null` fields to `FlightViewModel`; populate from `d.departure_at` / `d.arrival_at` in `buildFlightViewModel`. |
| `apps/web/app/(dashboard)/trip/[id]/hotels/page.tsx` | Rewrite — 2021 lines → ~150-line orchestrator using `HotelsModule`. |
| `apps/web/app/(dashboard)/trip/[id]/flights/page.tsx` | Rewrite — 1126 lines → ~150 lines using `FlightsModule`. |
| `apps/web/hooks/useSpotlightSearch.ts` | Update `/trip/${id}/flights/${entityId}` → `/trip/${id}/flights?expand=${entityId}`. |
| `apps/web/components/itinerary/FlightCard.tsx` | Update `Link href` from `/trip/${tripId}/flights/${flight.id}` → `/trip/${tripId}/flights?expand=${flight.id}`. |
| `apps/web/components/itinerary/HotelCard.tsx` | Update `Link href` from `/trip/${tripId}/hotels/${hotel.id}` → `/trip/${tripId}/hotels?expand=${hotel.id}`. |

### Files deleted

| File | Reason |
| ---- | ------ |
| `apps/web/app/(dashboard)/trip/[id]/hotels/[hotelId]/page.tsx` | Inline-expanded card on the list IS the detail view. Inbound links rewritten to `?expand=`. |
| `apps/web/app/(dashboard)/trip/[id]/flights/[flightId]/page.tsx` | Same reason. |

### Files NOT touched

- `packages/shared/src/hooks/useFlights.ts`, `useHotels.ts`, `useItineraryScreen.ts`.
- `packages/shared/src/viewmodels/itineraryViewModel.ts`'s `HotelViewModel` and `buildHotelViewModel` — unchanged. Only `FlightViewModel` gets the two new optional fields.
- `packages/shared/src/types/index.ts` — `Flight`, `Hotel`, `FlightData`, `HotelData` unchanged.
- `apps/web/components/trip/Module.tsx` — unchanged. Both pages use `titleSize='lg'` (default).
- Any of Noah's WIP files in working tree — hands-off.

---

## Pre-flight (one-time)

- [ ] **Step 0.1: Confirm branch + working tree**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git branch --show-current
git status --short | head -20
```

Expected: branch `develop`. Working tree shows Noah's WIP files unchanged. Don't touch them.

- [ ] **Step 0.2: Verify the inbound link grep matches what the plan expects**

```bash
grep -rn "/hotels/\${\|/flights/\${\|hotels/\${.*\.id}\|flights/\${.*\.id}" apps/web --include="*.tsx" --include="*.ts" | grep -v ".next" | grep -v "(dashboard)/trip/\[id\]/hotels\|(dashboard)/trip/\[id\]/flights"
```

Expected: 3 hits — `apps/web/hooks/useSpotlightSearch.ts:~133`, `apps/web/components/itinerary/FlightCard.tsx:~19`, `apps/web/components/itinerary/HotelCard.tsx:~20`. If you find more, the plan is incomplete — stop and report.

- [ ] **Step 0.3: Confirm view models exist**

```bash
grep -n "buildFlightViewModel\|buildHotelViewModel\|FlightViewModel\|HotelViewModel" packages/shared/src/viewmodels/itineraryViewModel.ts | head -10
```

Expected: 4+ hits confirming both view models and their builders exist.

- [ ] **Step 0.4: Confirm DB types**

```bash
grep -n "interface Flight\b\|interface FlightData\b\|interface Hotel\b\|interface HotelData\b" packages/shared/src/types/index.ts
```

Expected: 4 hits.

- [ ] **Step 0.5: Spin up the dev server** (leave running)

```bash
npm run web
```

Open `http://localhost:3001/trip/<a-real-trip-id>/hotels` and `flights` in the browser. These are your starting state — broken/bloated. You'll watch them transform.

---

## Task 1: Add `departureAt` / `arrivalAt` to `FlightViewModel`

**Files:**
- Modify: `packages/shared/src/viewmodels/itineraryViewModel.ts`

Backwards-compatible — adds two optional ISO fields so the orchestrator can sort by timestamp.

- [ ] **Step 1.1: Update the interface**

In `packages/shared/src/viewmodels/itineraryViewModel.ts`, find the `FlightViewModel` interface declaration (around line 220). Add two fields between `arrivalDisplay` and `priceDisplay`:

```typescript
  /** Raw ISO departure timestamp from the DB record, or null. Used for sorting. */
  departureAt: string | null;
  /** Raw ISO arrival timestamp from the DB record, or null. */
  arrivalAt: string | null;
```

- [ ] **Step 1.2: Populate them in `buildFlightViewModel`**

Find `export function buildFlightViewModel` (around line 279). Add the two fields to the returned object:

```typescript
  return {
    id: flight.id,
    airline: d.airline,
    flightNumber: d.flight_number,
    route: `${d.origin_iata} → ${d.dest_iata}`,
    originIata: d.origin_iata,
    destIata: d.dest_iata,
    originName: d.origin_name,
    destName: d.dest_name,
    departureAt: d.departure_at,        // <-- add
    arrivalAt: d.arrival_at,            // <-- add
    departureDisplay: formatDatetime(d.departure_at),
    arrivalDisplay: formatDatetime(d.arrival_at),
    priceDisplay: d.price != null && d.currency ? formatCurrency(d.price, d.currency) : null,
    price: d.price ?? null,
    priceCurrency: d.price != null ? d.currency ?? null : null,
    cabinClass: d.cabin_class,
    bookingRef: d.booking_ref,
  };
```

- [ ] **Step 1.3: Build the shared package**

```bash
cd packages/shared && npm run build 2>&1 | tail -5
```

Expected: clean build. If build fails, the typecheck output points at the specific issue.

- [ ] **Step 1.4: Typecheck the web app**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | grep -v "TakeoffScene3D" | grep -v "app/(main)/page.tsx" | head -10
```

Expected: clean (the new fields are optional additions; no consumer breaks).

- [ ] **Step 1.5: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add packages/shared/src/viewmodels/itineraryViewModel.ts
git commit -m "Add raw ISO departureAt/arrivalAt fields to FlightViewModel"
```

---

## Task 2: `BookingFormPrimitives.tsx`

**Files:**
- Create: `apps/web/components/trip/BookingFormPrimitives.tsx`

Self-contained. Hotels and Flights forms compose these. Settings has private equivalents — DON'T import from there.

- [ ] **Step 2.1: Create the file**

Create `apps/web/components/trip/BookingFormPrimitives.tsx`:

```tsx
'use client'

import { Loader2 } from 'lucide-react'

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-2">
      {children}
    </label>
  )
}

export function Input({
  value, onChange, type = 'text', placeholder, disabled, maxLength, autoFocus, invalid,
  inputMode, min, max, step,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  autoFocus?: boolean
  invalid?: boolean
  inputMode?: 'text' | 'numeric' | 'decimal'
  min?: string | number
  max?: string | number
  step?: string | number
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      autoFocus={autoFocus}
      inputMode={inputMode}
      min={min}
      max={max}
      step={step}
      className={`w-full h-11 rounded-xl border bg-white dark:bg-white/[0.04] px-4 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--trip-base)]/20 transition disabled:bg-gray-50 disabled:text-gray-400 dark:disabled:bg-white/[0.02] ${
        invalid
          ? 'border-red-400 dark:border-red-500/60 focus:border-red-500 focus:ring-red-500/20'
          : 'border-gray-200 dark:border-white/[0.10] focus:border-[var(--trip-base)]/50'
      }`}
    />
  )
}

export function Select({
  value, onChange, options, disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] px-4 text-[14px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--trip-base)]/20 focus:border-[var(--trip-base)]/50 transition disabled:bg-gray-50 disabled:text-gray-400 dark:disabled:bg-white/[0.02]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="dark:bg-gray-900 dark:text-white">{o.label}</option>
      ))}
    </select>
  )
}

export function DateInput(props: { value: string; onChange: (v: string) => void; invalid?: boolean; disabled?: boolean }) {
  return <Input type="date" {...props} />
}

export function DateTimeInput(props: { value: string; onChange: (v: string) => void; invalid?: boolean; disabled?: boolean }) {
  return <Input type="datetime-local" {...props} />
}

export function PrimaryButton({
  onClick, disabled, busy, children, type = 'button',
}: {
  onClick?: () => void
  disabled?: boolean
  busy?: boolean
  children: React.ReactNode
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className="flex items-center gap-2 px-5 h-11 rounded-xl text-[14px] font-semibold text-white shadow-sm hover:shadow-md transition-all disabled:bg-gray-200 dark:disabled:bg-white/[0.06] disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
      style={!disabled && !busy ? { backgroundColor: 'var(--trip-base)' } : undefined}
    >
      {busy && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  )
}

export function SecondaryButton({
  onClick, disabled, children, type = 'button',
}: {
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-4 h-11 rounded-xl text-[13px] font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.10] hover:bg-gray-50 dark:hover:bg-white/[0.08] transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 2.2: Typecheck + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "BookingFormPrimitives" | head -5
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/trip/BookingFormPrimitives.tsx
git commit -m "Add shared BookingFormPrimitives for hotel/flight forms"
```

---

## Task 3: Hotel components

**Files:**
- Create: `apps/web/components/trip/hotels/hotelMutations.ts`
- Create: `apps/web/components/trip/hotels/HotelCard.tsx`
- Create: `apps/web/components/trip/hotels/HotelForm.tsx`
- Create: `apps/web/components/trip/hotels/HotelsModule.tsx`

### 3a. `hotelMutations.ts`

- [ ] **Step 3a.1: Create the file**

```typescript
import { supabase } from '@travyl/shared'
import type { HotelData } from '@travyl/shared'

export async function addHotel(tripId: string, data: HotelData): Promise<void> {
  const { error } = await supabase.from('hotels').insert({ trip_id: tripId, data })
  if (error) throw error
}

export async function updateHotel(id: string, data: HotelData): Promise<void> {
  const { error } = await supabase.from('hotels').update({ data }).eq('id', id)
  if (error) throw error
}

export async function deleteHotel(id: string): Promise<void> {
  const { error } = await supabase.from('hotels').delete().eq('id', id)
  if (error) throw error
}
```

### 3b. `HotelCard.tsx`

- [ ] **Step 3b.1: Create the file**

```tsx
'use client'

import { Building2, MapPin, Star, MoreHorizontal } from 'lucide-react'
import type { HotelViewModel } from '@travyl/shared'

export interface HotelCardProps {
  hotel: HotelViewModel
  onEdit: () => void
  onDelete: () => void
  expanded?: boolean
}

export function HotelCard({ hotel, onEdit, onDelete, expanded = false }: HotelCardProps) {
  return (
    <div
      onClick={onEdit}
      className={`group rounded-xl border p-4 transition-colors cursor-pointer ${
        expanded
          ? 'border-[var(--trip-base)]/40 bg-[rgb(var(--trip-base-rgb)/0.04)]'
          : 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex gap-4">
        {hotel.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hotel.imageUrl}
            alt={hotel.name}
            className="w-[88px] h-[88px] rounded-xl object-cover shrink-0"
          />
        ) : (
          <div
            className="w-[88px] h-[88px] rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
          >
            <Building2 size={28} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
              {hotel.name}
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 -m-1 rounded text-gray-400 hover:text-red-500"
              aria-label="Delete hotel"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
          {hotel.address && (
            <p className="flex items-center gap-1 text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{hotel.address}</span>
            </p>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
              {hotel.checkInDisplay} → {hotel.checkOutDisplay}
            </span>
            <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
              {hotel.nightsLabel}
            </span>
            {hotel.starRating != null && hotel.starRating > 0 && (
              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                <Star size={10} fill="currentColor" />
                {hotel.starRating}
              </span>
            )}
            {hotel.rating != null && hotel.rating > 0 && (
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
                {hotel.rating} guest rating
              </span>
            )}
            {hotel.priceDisplay && (
              <span className="ml-auto text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">
                {hotel.priceDisplay}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 3c. `HotelForm.tsx`

- [ ] **Step 3c.1: Create the file**

```tsx
'use client'

import { useState } from 'react'
import type { HotelData } from '@travyl/shared'
import { FieldLabel, Input, Select, DateInput, PrimaryButton, SecondaryButton } from '@/components/trip/BookingFormPrimitives'

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'MXN', label: 'MXN ($)' },
]

export interface HotelFormProps {
  initial?: Partial<HotelData> & { id?: string }
  defaultCurrency?: string
  onSubmit: (data: HotelData) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}

export function HotelForm({ initial, defaultCurrency = 'USD', onSubmit, onCancel, onDelete }: HotelFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [checkIn, setCheckIn] = useState(initial?.check_in ?? '')
  const [checkOut, setCheckOut] = useState(initial?.check_out ?? '')
  const [pricePerNight, setPricePerNight] = useState(initial?.price_per_night?.toString() ?? '')
  const [totalPrice, setTotalPrice] = useState(initial?.total_price?.toString() ?? '')
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency)
  const [bookingRef, setBookingRef] = useState(initial?.booking_ref ?? '')
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<{ name?: boolean; checkIn?: boolean; checkOut?: boolean }>({})

  const validate = () => {
    const next: typeof errors = {}
    if (!name.trim()) next.name = true
    if (!checkIn) next.checkIn = true
    if (!checkOut) next.checkOut = true
    else if (checkIn && checkOut < checkIn) next.checkOut = true
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setBusy(true)
    try {
      const data: HotelData = {
        name: name.trim(),
        address: address.trim() || null,
        latitude: initial?.latitude ?? null,
        longitude: initial?.longitude ?? null,
        check_in: checkIn,
        check_out: checkOut,
        price_per_night: pricePerNight ? Number(pricePerNight) : null,
        total_price: totalPrice ? Number(totalPrice) : null,
        currency: (pricePerNight || totalPrice) ? currency : null,
        rating: initial?.rating ?? null,
        star_rating: initial?.star_rating ?? null,
        image_url: imageUrl.trim() || null,
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
        <div className="md:col-span-6">
          <FieldLabel>Hotel name</FieldLabel>
          <Input value={name} onChange={setName} autoFocus invalid={errors.name} />
        </div>
        <div className="md:col-span-6">
          <FieldLabel>Address</FieldLabel>
          <Input value={address} onChange={setAddress} placeholder="Street, City" />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Check-in</FieldLabel>
          <DateInput value={checkIn} onChange={setCheckIn} invalid={errors.checkIn} />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Check-out</FieldLabel>
          <DateInput value={checkOut} onChange={setCheckOut} invalid={errors.checkOut} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Per night</FieldLabel>
          <Input type="number" value={pricePerNight} onChange={setPricePerNight} placeholder="0" min={0} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Total</FieldLabel>
          <Input type="number" value={totalPrice} onChange={setTotalPrice} placeholder="0" min={0} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Currency</FieldLabel>
          <Select value={currency} onChange={setCurrency} options={CURRENCY_OPTIONS} />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Booking ref</FieldLabel>
          <Input value={bookingRef} onChange={setBookingRef} placeholder="Optional" />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Image URL</FieldLabel>
          <Input value={imageUrl} onChange={setImageUrl} placeholder="Optional" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            onClick={onDelete}
            disabled={busy}
            className="text-[13px] font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
          >
            Delete hotel
          </button>
        ) : <span />}
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onCancel} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} busy={busy}>{initial?.id ? 'Save' : 'Add hotel'}</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
```

### 3d. `HotelsModule.tsx`

- [ ] **Step 3d.1: Create the file**

```tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Building2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { HotelViewModel, HotelData } from '@travyl/shared'
import { HotelCard } from './HotelCard'
import { HotelForm } from './HotelForm'
import { addHotel, updateHotel, deleteHotel } from './hotelMutations'

export interface HotelsModuleProps {
  tripId: string
  hotels: HotelViewModel[]
  rawHotels: { id: string; data: HotelData }[]
  defaultCurrency: string
}

export function HotelsModule({ tripId, hotels, rawHotels, defaultCurrency }: HotelsModuleProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Sort hotels by check-in date (ISO date strings sort lexicographically === chronologically)
  // Defensive `?? ''` in case checkIn ever becomes nullable.
  const sorted = useMemo(
    () => [...hotels].sort((a, b) => (a.checkIn ?? '').localeCompare(b.checkIn ?? '')),
    [hotels],
  )

  // Auto-expand a record if URL ?expand=<id> is present (deep link from itinerary cards)
  useEffect(() => {
    const expandId = searchParams.get('expand')
    if (expandId && hotels.some((h) => h.id === expandId)) {
      setEditingId(expandId)
    }
  }, [searchParams, hotels])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['hotels', tripId] })
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
  }

  const handleAdd = async (data: HotelData) => {
    try {
      await addHotel(tripId, data)
      invalidate()
      setAdding(false)
    } catch (e) {
      console.error(e)
      toast.error("Couldn't save — try again")
    }
  }

  const handleUpdate = async (id: string, data: HotelData) => {
    try {
      await updateHotel(id, data)
      invalidate()
      setEditingId(null)
      // Clear ?expand= so a re-render doesn't reopen the form.
      if (searchParams.get('expand')) {
        router.replace(`/trip/${tripId}/hotels`, { scroll: false })
      }
    } catch (e) {
      console.error(e)
      toast.error("Couldn't save — try again")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this hotel booking?')) return
    try {
      await deleteHotel(id)
      invalidate()
      setEditingId(null)
    } catch (e) {
      console.error(e)
      toast.error("Couldn't delete — try again")
    }
  }

  if (hotels.length === 0 && !adding) {
    return (
      <div className="flex flex-col items-center text-center py-12">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
        >
          <Building2 size={20} />
        </div>
        <p className="text-[15px] font-serif text-gray-700 dark:text-gray-200">No hotels booked yet</p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
          Add your check-in and check-out to track your stay.
        </p>
        <button
          onClick={() => setAdding(true)}
          className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.08] transition"
        >
          <Plus size={13} /> Add hotel
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {adding && (
        <HotelForm
          defaultCurrency={defaultCurrency}
          onSubmit={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}

      {sorted.map((h) => {
        const raw = rawHotels.find((r) => r.id === h.id)
        if (editingId === h.id && raw) {
          return (
            <HotelForm
              key={h.id}
              initial={{ ...raw.data, id: h.id }}
              defaultCurrency={defaultCurrency}
              onSubmit={(data) => handleUpdate(h.id, data)}
              onCancel={() => setEditingId(null)}
              onDelete={() => handleDelete(h.id)}
            />
          )
        }
        return (
          <HotelCard
            key={h.id}
            hotel={h}
            onEdit={() => setEditingId(h.id)}
            onDelete={() => handleDelete(h.id)}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3e.1: Typecheck + commit Task 3 as a unit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "trip/hotels\|hotels/page" | head -10
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/trip/hotels/
git commit -m "Add hotel components: card, form, mutations, module"
```

(Typecheck will still complain about `hotels/page.tsx` until Task 5 — that's expected. Errors limited to the page file are fine to commit through.)

---

## Task 4: Flight components

**Files:**
- Create: `apps/web/components/trip/flights/flightMutations.ts`
- Create: `apps/web/components/trip/flights/FlightCard.tsx`
- Create: `apps/web/components/trip/flights/FlightForm.tsx`
- Create: `apps/web/components/trip/flights/FlightsModule.tsx`

Mirror of Task 3 with flight-specific shapes.

### 4a. `flightMutations.ts`

```typescript
import { supabase } from '@travyl/shared'
import type { FlightData } from '@travyl/shared'

export async function addFlight(tripId: string, data: FlightData): Promise<void> {
  const { error } = await supabase.from('flights').insert({ trip_id: tripId, data })
  if (error) throw error
}

export async function updateFlight(id: string, data: FlightData): Promise<void> {
  const { error } = await supabase.from('flights').update({ data }).eq('id', id)
  if (error) throw error
}

export async function deleteFlight(id: string): Promise<void> {
  const { error } = await supabase.from('flights').delete().eq('id', id)
  if (error) throw error
}
```

### 4b. `FlightCard.tsx`

```tsx
'use client'

import { Plane, MoreHorizontal } from 'lucide-react'
import type { FlightViewModel } from '@travyl/shared'

export interface FlightCardProps {
  flight: FlightViewModel
  onEdit: () => void
  onDelete: () => void
  expanded?: boolean
}

function isNextDay(departureAt: string | null, arrivalAt: string | null): boolean {
  if (!departureAt || !arrivalAt) return false
  return new Date(arrivalAt).getDate() !== new Date(departureAt).getDate()
}

export function FlightCard({ flight, onEdit, onDelete, expanded = false }: FlightCardProps) {
  const titleParts = [
    flight.airline,
    flight.flightNumber,
    flight.cabinClass ? flight.cabinClass.charAt(0).toUpperCase() + flight.cabinClass.slice(1) : null,
  ].filter(Boolean)

  // Compute duration display from raw timestamps if both available
  let durationDisplay: string | null = null
  if (flight.departureAt && flight.arrivalAt) {
    const ms = new Date(flight.arrivalAt).getTime() - new Date(flight.departureAt).getTime()
    if (ms > 0) {
      const h = Math.floor(ms / 3600000)
      const m = Math.round((ms % 3600000) / 60000)
      durationDisplay = `${h}h ${m}m`
    }
  }

  const nextDay = isNextDay(flight.departureAt, flight.arrivalAt)

  return (
    <div
      onClick={onEdit}
      className={`group rounded-xl border p-4 transition-colors cursor-pointer ${
        expanded
          ? 'border-[var(--trip-base)]/40 bg-[rgb(var(--trip-base-rgb)/0.04)]'
          : 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
        >
          <Plane size={18} />
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
              aria-label="Delete flight"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>

          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 mt-3">
            <div>
              <div className="font-serif text-[22px] text-[var(--trip-base)] tabular-nums leading-none">{flight.originIata}</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                {flight.departureDisplay ?? '—'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200 dark:bg-white/[0.10]" />
              <span className="text-[10px] uppercase tracking-wide text-gray-400">{durationDisplay ?? 'Flight'}</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-white/[0.10]" />
            </div>
            <div className="text-right">
              <div className="font-serif text-[22px] text-[var(--trip-base)] tabular-nums leading-none">{flight.destIata}</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                {flight.arrivalDisplay ?? '—'}
                {nextDay && <span className="text-amber-600 dark:text-amber-400 ml-1">(+1)</span>}
              </div>
            </div>
          </div>

          {flight.priceDisplay && (
            <div className="text-right mt-3 text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">
              {flight.priceDisplay}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### 4c. `FlightForm.tsx`

```tsx
'use client'

import { useState } from 'react'
import type { FlightData } from '@travyl/shared'
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

const CABIN_OPTIONS = [
  { value: '', label: '—' },
  { value: 'economy', label: 'Economy' },
  { value: 'premium', label: 'Premium economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First' },
]

// Convert ISO -> input value for <input type="datetime-local">.
// datetime-local expects "YYYY-MM-DDTHH:mm" in browser local time.
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

export interface FlightFormProps {
  initial?: Partial<FlightData> & { id?: string }
  defaultCurrency?: string
  onSubmit: (data: FlightData) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}

export function FlightForm({ initial, defaultCurrency = 'USD', onSubmit, onCancel, onDelete }: FlightFormProps) {
  const [airline, setAirline] = useState(initial?.airline ?? '')
  const [flightNumber, setFlightNumber] = useState(initial?.flight_number ?? '')
  const [originIata, setOriginIata] = useState(initial?.origin_iata ?? '')
  const [destIata, setDestIata] = useState(initial?.dest_iata ?? '')
  const [departureLocal, setDepartureLocal] = useState(isoToLocalInput(initial?.departure_at))
  const [arrivalLocal, setArrivalLocal] = useState(isoToLocalInput(initial?.arrival_at))
  const [cabinClass, setCabinClass] = useState(initial?.cabin_class ?? '')
  const [price, setPrice] = useState(initial?.price?.toString() ?? '')
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency)
  const [bookingRef, setBookingRef] = useState(initial?.booking_ref ?? '')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<{ airline?: boolean; origin?: boolean; dest?: boolean }>({})

  const validate = () => {
    const next: typeof errors = {}
    if (!airline.trim()) next.airline = true
    if (originIata.length !== 3) next.origin = true
    if (destIata.length !== 3) next.dest = true
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setBusy(true)
    try {
      const data: FlightData = {
        airline: airline.trim(),
        flight_number: flightNumber.trim() || null,
        origin_iata: originIata.toUpperCase(),
        origin_name: initial?.origin_name ?? null,
        dest_iata: destIata.toUpperCase(),
        dest_name: initial?.dest_name ?? null,
        departure_at: localInputToIso(departureLocal),
        arrival_at: localInputToIso(arrivalLocal),
        price: price ? Number(price) : null,
        currency: price ? currency : null,
        cabin_class: cabinClass || null,
        booking_ref: bookingRef.trim() || null,
        offer_id: initial?.offer_id ?? null,
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
        <div className="md:col-span-4">
          <FieldLabel>Airline</FieldLabel>
          <Input value={airline} onChange={setAirline} autoFocus invalid={errors.airline} placeholder="e.g. American Airlines" />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Flight number</FieldLabel>
          <Input value={flightNumber} onChange={setFlightNumber} placeholder="AA 1234" />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Origin (IATA)</FieldLabel>
          <Input value={originIata} onChange={(v) => setOriginIata(v.toUpperCase())} maxLength={3} invalid={errors.origin} placeholder="JFK" />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Destination (IATA)</FieldLabel>
          <Input value={destIata} onChange={(v) => setDestIata(v.toUpperCase())} maxLength={3} invalid={errors.dest} placeholder="LHR" />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Departure</FieldLabel>
          <DateTimeInput value={departureLocal} onChange={setDepartureLocal} />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Arrival</FieldLabel>
          <DateTimeInput value={arrivalLocal} onChange={setArrivalLocal} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Cabin</FieldLabel>
          <Select value={cabinClass} onChange={setCabinClass} options={CABIN_OPTIONS} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Price</FieldLabel>
          <Input type="number" value={price} onChange={setPrice} placeholder="0" min={0} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Currency</FieldLabel>
          <Select value={currency} onChange={setCurrency} options={CURRENCY_OPTIONS} />
        </div>
        <div className="md:col-span-6">
          <FieldLabel>Booking ref</FieldLabel>
          <Input value={bookingRef} onChange={setBookingRef} placeholder="Confirmation number (optional)" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            onClick={onDelete}
            disabled={busy}
            className="text-[13px] font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
          >
            Delete flight
          </button>
        ) : <span />}
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onCancel} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} busy={busy}>{initial?.id ? 'Save' : 'Add flight'}</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
```

### 4d. `FlightsModule.tsx`

```tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Plane, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { FlightViewModel, FlightData } from '@travyl/shared'
import { FlightCard } from './FlightCard'
import { FlightForm } from './FlightForm'
import { addFlight, updateFlight, deleteFlight } from './flightMutations'

export interface FlightsModuleProps {
  tripId: string
  flights: FlightViewModel[]
  rawFlights: { id: string; data: FlightData }[]
  defaultCurrency: string
}

export function FlightsModule({ tripId, flights, rawFlights, defaultCurrency }: FlightsModuleProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const sorted = useMemo(
    () => [...flights].sort((a, b) => {
      const av = a.departureAt ?? ''
      const bv = b.departureAt ?? ''
      return av.localeCompare(bv)
    }),
    [flights],
  )

  useEffect(() => {
    const expandId = searchParams.get('expand')
    if (expandId && flights.some((f) => f.id === expandId)) {
      setEditingId(expandId)
    }
  }, [searchParams, flights])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['flights', tripId] })
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
  }

  const handleAdd = async (data: FlightData) => {
    try {
      await addFlight(tripId, data)
      invalidate()
      setAdding(false)
    } catch (e) {
      console.error(e)
      toast.error("Couldn't save — try again")
    }
  }

  const handleUpdate = async (id: string, data: FlightData) => {
    try {
      await updateFlight(id, data)
      invalidate()
      setEditingId(null)
      if (searchParams.get('expand')) {
        router.replace(`/trip/${tripId}/flights`, { scroll: false })
      }
    } catch (e) {
      console.error(e)
      toast.error("Couldn't save — try again")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this flight?')) return
    try {
      await deleteFlight(id)
      invalidate()
      setEditingId(null)
    } catch (e) {
      console.error(e)
      toast.error("Couldn't delete — try again")
    }
  }

  if (flights.length === 0 && !adding) {
    return (
      <div className="flex flex-col items-center text-center py-12">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
        >
          <Plane size={20} />
        </div>
        <p className="text-[15px] font-serif text-gray-700 dark:text-gray-200">No flights booked yet</p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
          Add your itinerary so the budget and timeline pull together.
        </p>
        <button
          onClick={() => setAdding(true)}
          className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.08] transition"
        >
          <Plus size={13} /> Add flight
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {adding && (
        <FlightForm
          defaultCurrency={defaultCurrency}
          onSubmit={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}
      {sorted.map((f) => {
        const raw = rawFlights.find((r) => r.id === f.id)
        if (editingId === f.id && raw) {
          return (
            <FlightForm
              key={f.id}
              initial={{ ...raw.data, id: f.id }}
              defaultCurrency={defaultCurrency}
              onSubmit={(data) => handleUpdate(f.id, data)}
              onCancel={() => setEditingId(null)}
              onDelete={() => handleDelete(f.id)}
            />
          )
        }
        return (
          <FlightCard
            key={f.id}
            flight={f}
            onEdit={() => setEditingId(f.id)}
            onDelete={() => handleDelete(f.id)}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4e.1: Typecheck + commit Task 4 as a unit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "trip/flights\|flights/page" | head -10
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/trip/flights/
git commit -m "Add flight components: card, form, mutations, module"
```

(Typecheck still complains about `flights/page.tsx` — fixed in Task 6.)

---

## Task 5: Rewrite `hotels/page.tsx`

**Files:**
- Modify: `apps/web/app/(dashboard)/trip/[id]/hotels/page.tsx` (full rewrite)

- [ ] **Step 5.1: Replace the file**

```tsx
'use client'

import { use } from 'react'
import { Plus } from 'lucide-react'
import { useItineraryScreen, useHotels } from '@travyl/shared'
import { Module } from '@/components/trip/Module'
import { HotelsModule } from '@/components/trip/hotels/HotelsModule'

export default function Hotels({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { hotels, isLoading, trip } = useItineraryScreen(id)
  const rawHotelsQuery = useHotels(id)
  const rawHotels = rawHotelsQuery.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tripCurrency = ((trip as any)?.currency ?? 'USD').match(/^[A-Z]{3}/)?.[0] ?? 'USD'

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-10 py-12">
        <Module title="Hotels" description="Loading…">
          <div className="h-40 animate-pulse bg-gray-100 dark:bg-white/[0.04] rounded-xl" />
        </Module>
      </div>
    )
  }

  const totalNights = hotels.reduce((sum, h) => sum + h.nights, 0)
  const description = hotels.length === 0
    ? 'No hotels booked yet'
    : `${hotels.length} ${hotels.length === 1 ? 'booking' : 'bookings'} · ${totalNights} ${totalNights === 1 ? 'night' : 'nights'} total`

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <Module
        title="Hotels"
        description={description}
        action={
          <a
            href={`/trip/${id}/hotels?adding=1`}
            onClick={(e) => {
              e.preventDefault()
              // Trigger the module's add flow via DOM event — simpler than lifting state up.
              window.dispatchEvent(new CustomEvent('hotels:add'))
            }}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: 'var(--trip-base)' }}
          >
            <Plus size={13} /> Hotel
          </a>
        }
      >
        <HotelsModule
          tripId={id}
          hotels={hotels}
          rawHotels={rawHotels}
          defaultCurrency={tripCurrency}
        />
      </Module>
    </div>
  )
}
```

**Note on the "+ Hotel" header button:** the implementer has two valid choices:
- **Option A (used above):** dispatch a DOM `CustomEvent` that `HotelsModule` listens for. Avoids lifting `adding` state up. Simple.
- **Option B:** lift `adding`/`setAdding` to the page via `useState`, pass into `HotelsModule` as props.

Option A is shown above to keep the page thin. If you use Option A, add a corresponding `useEffect` in `HotelsModule.tsx` that listens for `'hotels:add'` events:

```tsx
useEffect(() => {
  const onAdd = () => setAdding(true)
  window.addEventListener('hotels:add', onAdd)
  return () => window.removeEventListener('hotels:add', onAdd)
}, [])
```

Add the equivalent listener for flights when you do Task 6.

- [ ] **Step 5.2: Add the event listener to `HotelsModule.tsx`**

In `apps/web/components/trip/hotels/HotelsModule.tsx`, add the following inside the component, right after the `useEffect` that handles `?expand=`:

```tsx
useEffect(() => {
  const onAdd = () => setAdding(true)
  window.addEventListener('hotels:add', onAdd)
  return () => window.removeEventListener('hotels:add', onAdd)
}, [])
```

- [ ] **Step 5.3: Typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | grep -v "TakeoffScene3D" | grep -v "app/(main)/page.tsx" | head -15
```

Expected: no errors in `hotels/page.tsx` or any new files. May still see errors in `flights/page.tsx` (Task 6).

- [ ] **Step 5.4: Visual check**

Open `http://localhost:3001/trip/<id>/hotels`. You should see the new Module with either an empty state or a list of cards. Click "+ Hotel" → form appears at the top. Fill in name + check-in + check-out, click "Add hotel" — card appears. Click the card — form expands inline. Click "Delete hotel" inside the form — confirms then removes.

If anything's broken, fix before commit.

- [ ] **Step 5.5: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/app/\(dashboard\)/trip/\[id\]/hotels/page.tsx apps/web/components/trip/hotels/HotelsModule.tsx
git commit -m "Rewrite hotels/page.tsx as Module + HotelsModule orchestrator"
```

---

## Task 6: Rewrite `flights/page.tsx`

**Files:**
- Modify: `apps/web/app/(dashboard)/trip/[id]/flights/page.tsx` (full rewrite)

Mirror of Task 5.

- [ ] **Step 6.1: Replace the file**

```tsx
'use client'

import { use } from 'react'
import { Plus } from 'lucide-react'
import { useItineraryScreen, useFlights } from '@travyl/shared'
import { Module } from '@/components/trip/Module'
import { FlightsModule } from '@/components/trip/flights/FlightsModule'

function formatTotalDuration(flights: { departureAt: string | null; arrivalAt: string | null }[]): string {
  const totalMs = flights.reduce((sum, f) => {
    if (!f.departureAt || !f.arrivalAt) return sum
    const ms = new Date(f.arrivalAt).getTime() - new Date(f.departureAt).getTime()
    return sum + Math.max(0, ms)
  }, 0)
  if (totalMs === 0) return ''
  const h = Math.floor(totalMs / 3600000)
  const m = Math.round((totalMs % 3600000) / 60000)
  return `${h}h ${m}m`
}

export default function Flights({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { flights, isLoading, trip } = useItineraryScreen(id)
  const rawFlightsQuery = useFlights(id)
  const rawFlights = rawFlightsQuery.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tripCurrency = ((trip as any)?.currency ?? 'USD').match(/^[A-Z]{3}/)?.[0] ?? 'USD'

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-10 py-12">
        <Module title="Flights" description="Loading…">
          <div className="h-40 animate-pulse bg-gray-100 dark:bg-white/[0.04] rounded-xl" />
        </Module>
      </div>
    )
  }

  const totalDuration = formatTotalDuration(flights)
  const description = flights.length === 0
    ? 'No flights booked yet'
    : `${flights.length} ${flights.length === 1 ? 'flight' : 'flights'}${totalDuration ? ` · ${totalDuration} total` : ''}`

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <Module
        title="Flights"
        description={description}
        action={
          <a
            href={`/trip/${id}/flights?adding=1`}
            onClick={(e) => {
              e.preventDefault()
              window.dispatchEvent(new CustomEvent('flights:add'))
            }}
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: 'var(--trip-base)' }}
          >
            <Plus size={13} /> Flight
          </a>
        }
      >
        <FlightsModule
          tripId={id}
          flights={flights}
          rawFlights={rawFlights}
          defaultCurrency={tripCurrency}
        />
      </Module>
    </div>
  )
}
```

- [ ] **Step 6.2: Add the event listener to `FlightsModule.tsx`**

```tsx
useEffect(() => {
  const onAdd = () => setAdding(true)
  window.addEventListener('flights:add', onAdd)
  return () => window.removeEventListener('flights:add', onAdd)
}, [])
```

(Insert next to the existing `?expand=` useEffect.)

- [ ] **Step 6.3: Typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | grep -v "TakeoffScene3D" | grep -v "app/(main)/page.tsx" | head -10
```

Expected: clean for the work area. The pre-existing `app/(main)/page.tsx` `statsOnly` error remains.

- [ ] **Step 6.4: Visual check**

Open `/trip/<id>/flights` and run through: empty state, add, edit, delete, route render with origin/dest IATA, duration display computed from raw timestamps. IATA inputs should auto-uppercase. Press Esc inside the form — should cancel.

- [ ] **Step 6.5: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/app/\(dashboard\)/trip/\[id\]/flights/page.tsx apps/web/components/trip/flights/FlightsModule.tsx
git commit -m "Rewrite flights/page.tsx as Module + FlightsModule orchestrator"
```

---

## Task 7: Update inbound links + delete sub-routes

**Files:**
- Modify: `apps/web/hooks/useSpotlightSearch.ts`
- Modify: `apps/web/components/itinerary/FlightCard.tsx`
- Modify: `apps/web/components/itinerary/HotelCard.tsx`
- Delete: `apps/web/app/(dashboard)/trip/[id]/hotels/[hotelId]/page.tsx`
- Delete: `apps/web/app/(dashboard)/trip/[id]/flights/[flightId]/page.tsx`

- [ ] **Step 7.1: Find and update the 3 inbound links**

Use the same broad pattern as Step 0.2 (the simpler grep can miss some interpolation forms):

```bash
grep -rn "/hotels/\|/flights/" apps/web --include="*.tsx" --include="*.ts" | grep -v ".next" | grep -v "(dashboard)/trip/\[id\]/hotels\|(dashboard)/trip/\[id\]/flights" | grep -E "tripId.*\.id|hotel\.id|flight\.id|entityId"
```

Update each:
- `useSpotlightSearch.ts:~133` — `/trip/${tripId}/flights/${entityId}` → `/trip/${tripId}/flights?expand=${entityId}`
- `itinerary/FlightCard.tsx:~19` — `/trip/${tripId}/flights/${flight.id}` → `/trip/${tripId}/flights?expand=${flight.id}`
- `itinerary/HotelCard.tsx:~20` — `/trip/${tripId}/hotels/${hotel.id}` → `/trip/${tripId}/hotels?expand=${hotel.id}`

(If the cases use different variable names, adapt — the pattern is `/<table>/${id}` → `/<table>?expand=${id}`.)

- [ ] **Step 7.2: Verify no other inbound links exist**

```bash
grep -rn "/hotels/\${\|/flights/\${" apps/web --include="*.tsx" --include="*.ts" | grep -v ".next" | grep -v "components/trip/hotels\|components/trip/flights"
```

Expected: empty after the 3 edits above.

- [ ] **Step 7.3: Delete the sub-route files**

```bash
git rm apps/web/app/\(dashboard\)/trip/\[id\]/hotels/\[hotelId\]/page.tsx apps/web/app/\(dashboard\)/trip/\[id\]/flights/\[flightId\]/page.tsx
```

- [ ] **Step 7.4: Typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | grep -v "TakeoffScene3D" | grep -v "app/(main)/page.tsx" | head -10
```

Expected: clean for the work area.

- [ ] **Step 7.5: Visual check**

Open the trip Itinerary tab. Find a flight or hotel card. Click it — should navigate to `/trip/<id>/{hotels|flights}?expand=<recordId>`. The list page should auto-expand that record's edit form on mount.

If the auto-expand doesn't fire, check the `useSearchParams` import path is `next/navigation` (App Router), not `next/router` (Pages Router).

- [ ] **Step 7.6: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/hooks/useSpotlightSearch.ts apps/web/components/itinerary/FlightCard.tsx apps/web/components/itinerary/HotelCard.tsx
git commit -m "Redirect itinerary card + spotlight links to ?expand= query, delete sub-routes"
```

---

## Task 8: Suite + lint + push

- [ ] **Step 8.1: Run all web tests**

```bash
cd apps/web && npx vitest run 2>&1 | tail -10
```

Expected: tests pass, count unchanged from before this work (no new tests added — these are display-layer components with logic covered by the view models).

- [ ] **Step 8.2: Lint the new + modified files**

```bash
cd apps/web && npx eslint \
  components/trip/BookingFormPrimitives.tsx \
  components/trip/hotels/ \
  components/trip/flights/ \
  app/\(dashboard\)/trip/\[id\]/hotels/page.tsx \
  app/\(dashboard\)/trip/\[id\]/flights/page.tsx \
  hooks/useSpotlightSearch.ts \
  components/itinerary/FlightCard.tsx \
  components/itinerary/HotelCard.tsx \
  2>&1 | tail -20
```

Expected: clean. If new warnings appear, fix them.

- [ ] **Step 8.3: Push**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git push origin develop
```

If the push is rejected because Noah pushed in parallel: stash WIP, `git pull --rebase origin develop`, push, pop stash. Noah does this sometimes — see the packing redesign notes.

---

## Out of Scope (deferred)

- External hotel/flight search APIs (Foursquare, Skyscanner, Amadeus) — the spec drops these.
- Multi-room hotel bookings — the form is one-room/one-card.
- Per-passenger flight info (seats, meal preference, etc.) — out of scope.
- Auto-fill from booking confirmation emails (PNR parsing, Gmail integration) — out.
- Image upload for hotels — manual URL paste only. A future Supabase Storage flow uses the same `image_url` field, no schema change.
- Automatic IATA autocomplete / airport name lookup — user types codes, no lookup.
- Currency conversion in the cards — the card shows raw stored currency; Budget converts.
- Sharing booking confirmations with co-travelers — already covered by trip share, no new flow needed.

## Risk Notes

- **`useItineraryScreen` is called once in `trip-layout-inner.tsx` and once on each tab page. Re-renders are fine** — React Query dedupes by key. No perf concern.
- **Hotels uses `useHotels` directly** for raw data because the view model strips the `data` payload (we need it back for the edit form's `initial` prop). Same for flights with `useFlights`. This adds one extra query but it's the same key the view model is already pulling — no extra network requests, just an extra cache reader.
- **`?expand=` deep-link race condition.** If a user opens the deep link before the data has loaded, the `useEffect` fires with empty hotels/flights and does nothing. When the data arrives, the effect re-runs (deps include `hotels`/`flights`), and the matching record auto-opens. No race; the dependency array handles it.
- **CustomEvent for "+ Hotel/+ Flight" header buttons.** This is a slight pattern deviation from prop-drilling, used to avoid lifting `adding` state to the page. If a future reviewer prefers props, the migration is mechanical.
- **Noah's WIP `budget/page.tsx`** uses `flights[].price` and `hotels[].price` from the same view models. The new add/edit forms write to the same DB tables, so Budget auto-picks up new records via the same realtime invalidation. No coordination needed.
- **`confirm()` for delete.** The plan uses native `window.confirm` for delete confirmation (small UX wart). A future iteration can swap to a motion/react popover; for the first cut `confirm` is honest about the destructive action and zero infrastructure.
