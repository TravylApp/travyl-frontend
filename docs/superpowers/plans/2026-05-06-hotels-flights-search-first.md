# Hotels & Flights Search-First Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual-input forms on the Hotels and Flights tabs with search panels backed by `/api/hotels/search`, `/api/flights/search`, and `/api/airports`. Saved hotels/flights become edit-only for metadata (price, booking ref) — vendor/route/date fields lock once a result is added.

**Architecture:** Three-section page layout inside the existing `Module` shell — search panel at the top, results pane in the middle, saved-records list at the bottom. SerpAPI/Duffel response shapes map to the existing `HotelData` / `FlightData` types via pure functions; the existing `addHotel` / `addFlight` mutations and realtime channel are unchanged. No DB migrations.

**Tech Stack:** Next.js 16 (App Router), React 19, TanStack Query, Tailwind, lucide-react, motion/react, sonner. Tests run on vitest in node env (no `@testing-library/react` — pure-logic only).

**Spec:** `docs/superpowers/specs/2026-05-06-hotels-flights-search-first-design.md` (commit `d2dcf569`)

---

## File Structure

### New files

| Path | Responsibility |
|------|----------------|
| `apps/web/components/trip/hotels/hotelSearch.ts` | `SerpHotel` type, `SerpHotelSearchResponse`, `searchHotels(input)` fetch wrapper, `mapSerpHotelToHotelData(result, formInputs)` mapper |
| `apps/web/components/trip/hotels/HotelSearchPanel.tsx` | Form inputs (destination, check-in, check-out, guests, sort) + Search button. Owns its own form state. Reports `{ loading, results, error }` upward via `onResultsChange`. |
| `apps/web/components/trip/hotels/HotelResultCard.tsx` | Single SerpAPI hotel card with "Add to trip" button. Disabled state during in-flight add. Shows "Already added" badge if `alreadySaved`. |
| `apps/web/components/trip/hotels/HotelResultsList.tsx` | Skeleton / empty / error / cards switch based on state. Wraps `HotelResultCard`s. |
| `apps/web/components/trip/flights/flightSearch.ts` | `SerpFlight`, `SerpFlightLeg`, `SerpFlightSearchResponse`, `searchFlights(input)`, `mapSerpFlightToFlightData(flight)` (decision B: first-leg origin → last-leg arrival). |
| `apps/web/components/trip/flights/airportSearch.ts` | `Airport` type (iata/name/city/country), `searchAirports(q)` fetch wrapper. Debounce lives in the consumer component, not here. |
| `apps/web/components/trip/flights/AirportAutocomplete.tsx` | Combobox: text input → debounced `searchAirports` → dropdown of `Airport` results with keyboard navigation (Up/Down/Enter/Escape). Selection sets `{ iata, name, city }`. |
| `apps/web/components/trip/flights/FlightSearchPanel.tsx` | Two `AirportAutocomplete`s (from/to), depart/return dates, passengers, cabin class, Search button. Owns its form state. Reports `{ loading, results, error }` upward. |
| `apps/web/components/trip/flights/FlightResultCard.tsx` | Single flight card. Collapsed: airline logo + name, depart→arrive times, duration, stops, price, Add button. Expand: leg list with layover details. |
| `apps/web/components/trip/flights/FlightResultsList.tsx` | Tabs (Best / Cheapest / Fastest) over `FlightResultCard`s. Sort applied client-side from a single result list. |

### Test files

| Path | What it tests |
|------|---------------|
| `apps/web/components/trip/hotels/hotelSearch.test.ts` | `mapSerpHotelToHotelData` — single-night, multi-night, missing optional fields, image fallbacks, currency hardcode |
| `apps/web/components/trip/flights/flightSearch.test.ts` | `mapSerpFlightToFlightData` — direct flight, 1-stop layover, 2-stop multi-airline, missing leg fields, ISO time pass-through |

### Modified files

| Path | Change |
|------|--------|
| `apps/web/components/trip/hotels/HotelsModule.tsx` | Replace `adding` state + `<HotelForm onSubmit={handleAdd}>` with `<HotelSearchPanel>` + `<HotelResultsList>`. Empty state opens search panel. CustomEvent listener `hotels:add` toggles search panel open. Saved-hotel edit (`HotelForm` with `initial.id`) is unchanged in flow but the form below is gutted. |
| `apps/web/components/trip/hotels/HotelForm.tsx` | Edit-only mode. Read-only: name, address, image_url, latitude, longitude, rating, star_rating. Editable: check_in, check_out, price_per_night, total_price, currency, booking_ref. Remove the `initial?.id ? 'Save' : 'Add hotel'` ternary — always 'Save'. Remove validation paths that don't apply (name validation gone since name is read-only). |
| `apps/web/components/trip/flights/FlightsModule.tsx` | Same shape: replace `adding` state with search-panel toggle. CustomEvent listener `flights:add` opens search panel. |
| `apps/web/components/trip/flights/FlightForm.tsx` | Edit-only mode. Read-only: airline, flight_number, origin_iata, origin_name, dest_iata, dest_name, departure_at, arrival_at, cabin_class. Editable: price, currency, booking_ref. |

### Unchanged

- `addHotel`, `addFlight`, `updateHotel`, `updateFlight`, `deleteHotel`, `deleteFlight` mutations.
- `HotelCard`, `FlightCard` view components.
- `useItineraryScreen` hook + realtime channel.
- `Module`, `BookingFormPrimitives`.
- All Supabase tables and `packages/shared` types.
- Page-level files (`apps/web/app/(dashboard)/trip/[id]/hotels/page.tsx`, `flights/page.tsx`) — header `+ Hotel` / `+ Flight` button still dispatches the same CustomEvent; the only change is what the listener does.

---

## Task 1: Hotel search lib + mapper (with tests)

**Files:**
- Create: `apps/web/components/trip/hotels/hotelSearch.ts`
- Test: `apps/web/components/trip/hotels/hotelSearch.test.ts`

- [ ] **Step 1: Write the failing tests**

`apps/web/components/trip/hotels/hotelSearch.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mapSerpHotelToHotelData, type SerpHotel } from './hotelSearch'

const baseSerp: SerpHotel = {
  id: 'serp-hotel-0',
  name: 'Park Hyatt Tokyo',
  stars: 5,
  rating: 4.6,
  reviews: 1234,
  price: 480,
  currency: 'USD',
  address: '3-7-1-2 Nishi-Shinjuku, Shinjuku-ku',
  neighborhood: 'Shinjuku',
  lat: 35.6859,
  lng: 139.6915,
  images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
  amenities: ['Wi-Fi', 'Pool'],
  checkIn: '3:00 PM',
  checkOut: '11:00 AM',
  description: 'Luxury hotel',
  link: 'https://google.com/hotel/abc',
  source: 'serpapi',
}

describe('mapSerpHotelToHotelData', () => {
  it('maps a 3-night stay with full data', () => {
    const data = mapSerpHotelToHotelData(baseSerp, {
      check_in: '2026-06-01',
      check_out: '2026-06-04',
      guests: 2,
    })
    expect(data.name).toBe('Park Hyatt Tokyo')
    expect(data.address).toBe('3-7-1-2 Nishi-Shinjuku, Shinjuku-ku')
    expect(data.latitude).toBe(35.6859)
    expect(data.longitude).toBe(139.6915)
    expect(data.check_in).toBe('2026-06-01')
    expect(data.check_out).toBe('2026-06-04')
    expect(data.price_per_night).toBe(480)
    expect(data.total_price).toBe(1440)
    expect(data.currency).toBe('USD')
    expect(data.rating).toBe(4.6)
    expect(data.star_rating).toBe(5)
    expect(data.image_url).toBe('https://example.com/img1.jpg')
    expect(data.booking_ref).toBeNull()
    expect(data.offer_id).toBe('serp-hotel-0')
  })

  it('handles a 1-night stay correctly', () => {
    const data = mapSerpHotelToHotelData(baseSerp, {
      check_in: '2026-06-01',
      check_out: '2026-06-02',
      guests: 2,
    })
    expect(data.total_price).toBe(480)
  })

  it('treats same-day or invalid dates as 1 night minimum', () => {
    const data = mapSerpHotelToHotelData(baseSerp, {
      check_in: '2026-06-01',
      check_out: '2026-06-01',
      guests: 2,
    })
    expect(data.total_price).toBe(480)
  })

  it('keeps total_price null when price is null', () => {
    const data = mapSerpHotelToHotelData({ ...baseSerp, price: null as unknown as number }, {
      check_in: '2026-06-01',
      check_out: '2026-06-04',
      guests: 2,
    })
    expect(data.price_per_night).toBeNull()
    expect(data.total_price).toBeNull()
    expect(data.currency).toBeNull()
  })

  it('handles missing image gracefully', () => {
    const data = mapSerpHotelToHotelData({ ...baseSerp, images: [] }, {
      check_in: '2026-06-01',
      check_out: '2026-06-04',
      guests: 2,
    })
    expect(data.image_url).toBeNull()
  })

  it('handles 0 stars / 0 rating as null, not 0', () => {
    const data = mapSerpHotelToHotelData({ ...baseSerp, stars: 0, rating: 0 }, {
      check_in: '2026-06-01',
      check_out: '2026-06-04',
      guests: 2,
    })
    expect(data.star_rating).toBeNull()
    expect(data.rating).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run components/trip/hotels/hotelSearch.test.ts`
Expected: FAIL with "Cannot find module './hotelSearch'"

- [ ] **Step 3: Implement `hotelSearch.ts`**

`apps/web/components/trip/hotels/hotelSearch.ts`:

```typescript
import type { HotelData } from '@travyl/shared'

export interface SerpHotel {
  id: string
  name: string
  stars: number
  rating: number
  reviews: number
  price: number | null
  currency: string
  address: string
  neighborhood: string
  lat: number
  lng: number
  images: string[]
  amenities: string[]
  checkIn: string
  checkOut: string
  description: string
  link: string
  source: string
}

export interface SerpHotelSearchResponse {
  total: number
  hotels: SerpHotel[]
  error?: string
}

export interface HotelSearchInput {
  destination: string
  check_in: string
  check_out: string
  guests: number
  sort?: '3' | '8'  // 3 = lowest price, 8 = highest rating
}

export interface MapHotelInputs {
  check_in: string
  check_out: string
  guests: number
}

export async function searchHotels(input: HotelSearchInput): Promise<SerpHotelSearchResponse> {
  const params = new URLSearchParams({
    destination: input.destination,
    guests: String(input.guests),
    sort: input.sort ?? '3',
  })
  if (input.check_in) params.set('check_in', input.check_in)
  if (input.check_out) params.set('check_out', input.check_out)

  const res = await fetch(`/api/hotels/search?${params}`)
  if (!res.ok) {
    return { total: 0, hotels: [], error: `Search failed (${res.status})` }
  }
  return res.json()
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn + 'T00:00:00Z').getTime()
  const b = new Date(checkOut + 'T00:00:00Z').getTime()
  if (!isFinite(a) || !isFinite(b)) return 1
  const diff = Math.round((b - a) / 86_400_000)
  return Math.max(1, diff)
}

export function mapSerpHotelToHotelData(serp: SerpHotel, inputs: MapHotelInputs): HotelData {
  const nights = nightsBetween(inputs.check_in, inputs.check_out)
  const price = serp.price ?? null
  const totalPrice = price != null ? price * nights : null
  return {
    name: serp.name,
    address: serp.address || null,
    latitude: serp.lat || null,
    longitude: serp.lng || null,
    check_in: inputs.check_in,
    check_out: inputs.check_out,
    price_per_night: price,
    total_price: totalPrice,
    currency: price != null ? serp.currency : null,
    rating: serp.rating > 0 ? serp.rating : null,
    star_rating: serp.stars > 0 ? serp.stars : null,
    image_url: serp.images[0] || null,
    booking_ref: null,
    offer_id: serp.id,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run components/trip/hotels/hotelSearch.test.ts`
Expected: PASS, 6/6 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/trip/hotels/hotelSearch.ts apps/web/components/trip/hotels/hotelSearch.test.ts
git commit -m "Add SerpAPI hotel search lib + mapper with tests"
```

---

## Task 2: Hotel result card + results list

**Files:**
- Create: `apps/web/components/trip/hotels/HotelResultCard.tsx`
- Create: `apps/web/components/trip/hotels/HotelResultsList.tsx`

These are UI components verified manually. No vitest tests — they import React, motion, and would require `@testing-library/react`.

- [ ] **Step 1: Implement `HotelResultCard.tsx`**

```tsx
'use client'

import { Star, Plus, Check } from 'lucide-react'
import type { SerpHotel } from './hotelSearch'

export interface HotelResultCardProps {
  hotel: SerpHotel
  alreadySaved: boolean
  busy: boolean
  onAdd: (hotel: SerpHotel) => Promise<void>
  formatPrice: (n: number, currency?: string | null) => string
}

export function HotelResultCard({ hotel, alreadySaved, busy, onAdd, formatPrice }: HotelResultCardProps) {
  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await onAdd(hotel)
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] overflow-hidden">
      <div className="flex gap-4 p-4">
        {hotel.images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hotel.images[0]}
            alt={hotel.name}
            className="w-28 h-24 object-cover rounded-lg shrink-0"
            referrerPolicy="no-referrer"
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
              {hotel.name}
            </h3>
            {hotel.price != null && (
              <div className="text-right shrink-0">
                <div className="text-[15px] font-semibold text-gray-900 dark:text-white tabular-nums">
                  {formatPrice(hotel.price, hotel.currency)}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">/night</div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-[12px] text-gray-600 dark:text-gray-400">
            {hotel.stars > 0 && (
              <span className="inline-flex items-center gap-0.5">
                {Array.from({ length: hotel.stars }).map((_, i) => (
                  <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                ))}
              </span>
            )}
            {hotel.rating > 0 && (
              <span className="tabular-nums">
                {hotel.rating.toFixed(1)}
                {hotel.reviews > 0 && (
                  <span className="text-gray-400"> ({hotel.reviews})</span>
                )}
              </span>
            )}
          </div>

          {hotel.address && (
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1" title={hotel.address}>
              {hotel.address}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleAdd}
              disabled={busy || alreadySaved}
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition disabled:opacity-50"
              style={{ backgroundColor: alreadySaved ? 'rgb(107 114 128)' : 'var(--trip-base)' }}
            >
              {alreadySaved ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add to trip</>}
            </button>
            {hotel.link && (
              <a
                href={hotel.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] text-gray-500 dark:text-gray-400 hover:underline"
              >
                View on Google
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement `HotelResultsList.tsx`**

```tsx
'use client'

import { Building2, Search, AlertCircle } from 'lucide-react'
import type { SerpHotel } from './hotelSearch'
import { HotelResultCard } from './HotelResultCard'

export interface HotelSearchState {
  loading: boolean
  results: SerpHotel[]
  error: string | null
  hasSearched: boolean
}

export interface HotelResultsListProps {
  state: HotelSearchState
  savedOfferIds: Set<string>
  busyOfferId: string | null
  onAdd: (hotel: SerpHotel) => Promise<void>
  formatPrice: (n: number, currency?: string | null) => string
}

export function HotelResultsList({ state, savedOfferIds, busyOfferId, onAdd, formatPrice }: HotelResultsListProps) {
  if (!state.hasSearched && !state.loading) return null

  if (state.loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="flex flex-col items-center text-center py-10">
        <AlertCircle size={20} className="text-gray-400 mb-2" />
        <p className="text-[13px] text-gray-700 dark:text-gray-200">{state.error}</p>
      </div>
    )
  }

  if (state.results.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-10">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
        >
          <Search size={20} />
        </div>
        <p className="text-[14px] text-gray-700 dark:text-gray-200">No matches for these dates</p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">Try adjusting your search.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400">
        <Building2 size={12} />
        <span>{state.results.length} {state.results.length === 1 ? 'option' : 'options'}</span>
      </div>
      {state.results.map((hotel) => (
        <HotelResultCard
          key={hotel.id}
          hotel={hotel}
          alreadySaved={savedOfferIds.has(hotel.id)}
          busy={busyOfferId === hotel.id}
          onAdd={onAdd}
          formatPrice={formatPrice}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json 2>&1 | head -30`
Expected: No errors related to the new files.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/trip/hotels/HotelResultCard.tsx apps/web/components/trip/hotels/HotelResultsList.tsx
git commit -m "Add HotelResultCard + HotelResultsList components"
```

---

## Task 3: Hotel search panel

**Files:**
- Create: `apps/web/components/trip/hotels/HotelSearchPanel.tsx`

- [ ] **Step 1: Implement `HotelSearchPanel.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { FieldLabel, Input, Select, DateInput, PrimaryButton } from '@/components/trip/BookingFormPrimitives'
import { searchHotels, type HotelSearchInput, type HotelSearchState } from './hotelSearch'

const SORT_OPTIONS = [
  { value: '3', label: 'Lowest price' },
  { value: '8', label: 'Highest rating' },
]

export interface HotelSearchPanelProps {
  trip: { id: string; destination: string; start_date: string; end_date: string }
  onResultsChange: (state: HotelSearchState) => void
  onInputsChange: (inputs: { check_in: string; check_out: string; guests: number }) => void
}

export function HotelSearchPanel({ trip, onResultsChange, onInputsChange }: HotelSearchPanelProps) {
  const [destination, setDestination] = useState(trip.destination ?? '')
  const [checkIn, setCheckIn] = useState(trip.start_date ?? '')
  const [checkOut, setCheckOut] = useState(trip.end_date ?? '')
  const [guests, setGuests] = useState('2')
  const [sort, setSort] = useState<'3' | '8'>('3')
  const [busy, setBusy] = useState(false)

  const handleSearch = async () => {
    if (!destination.trim() || !checkIn || !checkOut || busy) return
    setBusy(true)
    onResultsChange({ loading: true, results: [], error: null, hasSearched: true })
    onInputsChange({ check_in: checkIn, check_out: checkOut, guests: Number(guests) })
    try {
      const input: HotelSearchInput = {
        destination: destination.trim(),
        check_in: checkIn,
        check_out: checkOut,
        guests: Number(guests),
        sort,
      }
      const res = await searchHotels(input)
      if (res.error) {
        onResultsChange({ loading: false, results: [], error: res.error, hasSearched: true })
      } else {
        onResultsChange({ loading: false, results: res.hotels, error: null, hasSearched: true })
      }
    } catch (e) {
      onResultsChange({
        loading: false,
        results: [],
        error: e instanceof Error ? e.message : 'Search failed',
        hasSearched: true,
      })
    } finally {
      setBusy(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div onKeyDown={handleKey} className="rounded-xl border border-[var(--trip-base)]/30 bg-white dark:bg-white/[0.04] p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-3">
        <div className="md:col-span-6">
          <FieldLabel>Destination</FieldLabel>
          <Input value={destination} onChange={setDestination} placeholder="City, country" autoFocus />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Check-in</FieldLabel>
          <DateInput value={checkIn} onChange={setCheckIn} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Check-out</FieldLabel>
          <DateInput value={checkOut} onChange={setCheckOut} />
        </div>
        <div className="md:col-span-1">
          <FieldLabel>Guests</FieldLabel>
          <Input type="number" value={guests} onChange={setGuests} min={1} />
        </div>
        <div className="md:col-span-1">
          <FieldLabel>Sort</FieldLabel>
          <Select value={sort} onChange={(v) => setSort(v as '3' | '8')} options={SORT_OPTIONS} />
        </div>
      </div>

      <div className="flex justify-end">
        <PrimaryButton onClick={handleSearch} busy={busy}>
          <span className="inline-flex items-center gap-1.5">
            <Search size={13} /> Search hotels
          </span>
        </PrimaryButton>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "hotels/" | head -10`
Expected: no errors for `hotels/`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/trip/hotels/HotelSearchPanel.tsx
git commit -m "Add HotelSearchPanel component"
```

---

## Task 4: Wire HotelsModule to search-first + gut HotelForm

**Files:**
- Modify: `apps/web/components/trip/hotels/HotelsModule.tsx`
- Modify: `apps/web/components/trip/hotels/HotelForm.tsx`

- [ ] **Step 1: Replace `HotelsModule.tsx` body**

Replace the entire file body (keeping the `'use client'` directive and imports as updated below):

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { HotelViewModel, HotelData, Trip } from '@travyl/shared'
import { supabase } from '@travyl/shared'
import { HotelCard } from './HotelCard'
import { HotelForm } from './HotelForm'
import { HotelSearchPanel } from './HotelSearchPanel'
import { HotelResultsList, type HotelSearchState } from './HotelResultsList'
import { mapSerpHotelToHotelData, type SerpHotel } from './hotelSearch'
import { addHotel, updateHotel, deleteHotel } from './hotelMutations'

export interface HotelsModuleProps {
  tripId: string
  hotels: HotelViewModel[]
  rawHotels: { id: string; data: HotelData }[]
  defaultCurrency: string
  formatPrice: (n: number, currency?: string | null) => string
}

export function HotelsModule({ tripId, hotels, rawHotels, defaultCurrency, formatPrice }: HotelsModuleProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searching, setSearching] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchState, setSearchState] = useState<HotelSearchState>({
    loading: false, results: [], error: null, hasSearched: false,
  })
  const [searchInputs, setSearchInputs] = useState({ check_in: '', check_out: '', guests: 2 })
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null)
  const hasExpandedRef = useRef(false)

  const { data: trip } = useQuery<Trip | null>({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const { data } = await supabase.from('trips').select('*').eq('id', tripId).single()
      return data as Trip | null
    },
    enabled: !!tripId,
    staleTime: 60_000,
  })

  const sorted = useMemo(
    () => [...hotels].sort((a, b) => (a.checkIn ?? '').localeCompare(b.checkIn ?? '')),
    [hotels],
  )

  const savedOfferIds = useMemo(
    () => new Set(rawHotels.map((r) => r.data.offer_id).filter(Boolean) as string[]),
    [rawHotels],
  )

  useEffect(() => {
    if (hasExpandedRef.current) return
    const expandId = searchParams.get('expand')
    if (expandId && hotels.some((h) => h.id === expandId)) {
      setEditingId(expandId)
      hasExpandedRef.current = true
    }
  }, [searchParams, hotels])

  useEffect(() => {
    const onAdd = () => setSearching(true)
    window.addEventListener('hotels:add', onAdd)
    return () => window.removeEventListener('hotels:add', onAdd)
  }, [])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['hotels', tripId] })
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
  }

  const handleAddFromSearch = async (serpHotel: SerpHotel) => {
    setBusyOfferId(serpHotel.id)
    try {
      const data = mapSerpHotelToHotelData(serpHotel, searchInputs)
      await addHotel(tripId, data)
      invalidate()
      toast.success(`Added ${serpHotel.name}`)
    } catch (e) {
      console.error(e)
      toast.error("Couldn't add — try again")
    } finally {
      setBusyOfferId(null)
    }
  }

  const handleUpdate = async (id: string, data: HotelData) => {
    try {
      await updateHotel(id, data)
      invalidate()
      setEditingId(null)
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
      if (searchParams.get('expand')) {
        router.replace(`/trip/${tripId}/hotels`, { scroll: false })
      }
    } catch (e) {
      console.error(e)
      toast.error("Couldn't delete — try again")
    }
  }

  const tripForPanel = {
    id: tripId,
    destination: trip?.destination ?? '',
    start_date: trip?.start_date ?? '',
    end_date: trip?.end_date ?? '',
  }

  return (
    <div className="space-y-4">
      {searching && (
        <>
          <HotelSearchPanel
            trip={tripForPanel}
            onResultsChange={setSearchState}
            onInputsChange={setSearchInputs}
          />
          <HotelResultsList
            state={searchState}
            savedOfferIds={savedOfferIds}
            busyOfferId={busyOfferId}
            onAdd={handleAddFromSearch}
            formatPrice={formatPrice}
          />
        </>
      )}

      {hotels.length === 0 && !searching && (
        <div className="flex flex-col items-center text-center py-12">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21V7l9-4 9 4v14h-6v-6h-6v6H3z"/></svg>
          </div>
          <p className="text-[15px] font-serif text-gray-700 dark:text-gray-200">No hotels booked yet</p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
            Search live inventory to add a stay to your trip.
          </p>
          <button
            onClick={() => setSearching(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium text-white shadow-sm hover:shadow-md transition"
            style={{ backgroundColor: 'var(--trip-base)' }}
          >
            Search hotels
          </button>
        </div>
      )}

      <div className="space-y-3">
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
    </div>
  )
}
```

- [ ] **Step 2: Replace `HotelForm.tsx` body (edit-only)**

Replace the entire file body:

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
  initial: Partial<HotelData> & { id: string }
  defaultCurrency?: string
  onSubmit: (data: HotelData) => Promise<void>
  onCancel: () => void
  onDelete: () => Promise<void>
}

export function HotelForm({ initial, defaultCurrency = 'USD', onSubmit, onCancel, onDelete }: HotelFormProps) {
  const [checkIn, setCheckIn] = useState(initial.check_in ?? '')
  const [checkOut, setCheckOut] = useState(initial.check_out ?? '')
  const [pricePerNight, setPricePerNight] = useState(initial.price_per_night?.toString() ?? '')
  const [totalPrice, setTotalPrice] = useState(initial.total_price?.toString() ?? '')
  const [currency, setCurrency] = useState(initial.currency ?? defaultCurrency)
  const [bookingRef, setBookingRef] = useState(initial.booking_ref ?? '')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<{ checkIn?: boolean; checkOut?: boolean }>({})

  const validate = () => {
    const next: typeof errors = {}
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
        name: initial.name ?? '',
        address: initial.address ?? null,
        latitude: initial.latitude ?? null,
        longitude: initial.longitude ?? null,
        check_in: checkIn,
        check_out: checkOut,
        price_per_night: pricePerNight ? Number(pricePerNight) : null,
        total_price: totalPrice ? Number(totalPrice) : null,
        currency: (pricePerNight || totalPrice) ? currency : null,
        rating: initial.rating ?? null,
        star_rating: initial.star_rating ?? null,
        image_url: initial.image_url ?? null,
        booking_ref: bookingRef.trim() || null,
        offer_id: initial.offer_id ?? null,
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
      <div className="space-y-2">
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">{initial.name}</h3>
        {initial.address && <p className="text-[12px] text-gray-500 dark:text-gray-400">{initial.address}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-3">
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
        <div className="md:col-span-6">
          <FieldLabel>Booking ref</FieldLabel>
          <Input value={bookingRef} onChange={setBookingRef} placeholder="Confirmation number (optional)" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onDelete}
          disabled={busy}
          className="text-[13px] font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
        >
          Delete hotel
        </button>
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onCancel} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} busy={busy}>Save</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update the page to pass `formatPrice`**

Modify `apps/web/app/(dashboard)/trip/[id]/hotels/page.tsx`:

Add `useHomeCurrency` to the imports from `@travyl/shared` (it already provides `formatPrice`):

```tsx
import { useItineraryScreen, useHotels, useHomeCurrency } from '@travyl/shared'
```

Inside the component, after `const tripCurrency = ...`:

```tsx
const { formatPrice } = useHomeCurrency()
```

In the `<HotelsModule>` JSX, add the prop:

```tsx
<HotelsModule
  tripId={id}
  hotels={hotels}
  rawHotels={rawHotels}
  defaultCurrency={tripCurrency}
  formatPrice={formatPrice}
/>
```

> If `useHomeCurrency` is not exported from `@travyl/shared`, fall back to defining the function inline in the page:
> ```tsx
> const formatPrice = (n: number, currency: string | null = 'USD') =>
>   new Intl.NumberFormat('en-US', { style: 'currency', currency: currency ?? 'USD' }).format(n)
> ```

- [ ] **Step 4: Typecheck**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "hotels/" | head -20`
Expected: no errors for `hotels/`.

- [ ] **Step 5: Manual smoke test**

Start dev server (`npm run web`), open `http://localhost:3001/trip/<id>/hotels`. Verify:
- Header `+ Hotel` button opens search panel.
- Search returns SerpAPI results (or graceful empty/error if `SERPAPI_KEY` unset).
- Click "Add to trip" → toast → hotel appears in saved list.
- Click a saved hotel → form shows name read-only, dates/price editable. Save updates.
- Delete works.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/trip/hotels/HotelsModule.tsx apps/web/components/trip/hotels/HotelForm.tsx apps/web/app/\(dashboard\)/trip/\[id\]/hotels/page.tsx
git commit -m "Wire HotelsModule to search-first; gut HotelForm to edit-only"
```

---

## Task 5: Flight search lib + mapper (with tests)

**Files:**
- Create: `apps/web/components/trip/flights/flightSearch.ts`
- Test: `apps/web/components/trip/flights/flightSearch.test.ts`

- [ ] **Step 1: Write the failing tests**

`apps/web/components/trip/flights/flightSearch.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mapSerpFlightToFlightData, type SerpFlight } from './flightSearch'

const direct: SerpFlight = {
  id: 'best-0',
  tier: 'best',
  price: 480,
  type: 'Round trip',
  totalDuration: 360,
  stops: 0,
  airlineLogo: 'https://example.com/aa.png',
  carbonEmissions: null,
  legs: [{
    flightNumber: 'AA 100',
    airline: 'American Airlines',
    airlineLogo: 'https://example.com/aa.png',
    airplane: '777',
    travelClass: 'Economy',
    legroom: '32 in',
    duration: 360,
    overnight: false,
    departure: { airport: 'JFK', id: 'JFK', time: '2026-06-01 09:00' },
    arrival:   { airport: 'LHR', id: 'LHR', time: '2026-06-01 21:00' },
    extensions: [],
  }],
  layovers: [],
}

const oneStop: SerpFlight = {
  ...direct,
  id: 'other-2',
  tier: 'other',
  stops: 1,
  totalDuration: 600,
  legs: [
    {
      flightNumber: 'AA 100',
      airline: 'American Airlines',
      airlineLogo: 'https://example.com/aa.png',
      airplane: '777',
      travelClass: 'Economy',
      legroom: '32 in',
      duration: 240,
      overnight: false,
      departure: { airport: 'JFK', id: 'JFK', time: '2026-06-01 09:00' },
      arrival:   { airport: 'LAX', id: 'LAX', time: '2026-06-01 12:00' },
      extensions: [],
    },
    {
      flightNumber: 'BA 200',
      airline: 'British Airways',
      airlineLogo: 'https://example.com/ba.png',
      airplane: '787',
      travelClass: 'Economy',
      legroom: '31 in',
      duration: 600,
      overnight: true,
      departure: { airport: 'LAX', id: 'LAX', time: '2026-06-01 14:00' },
      arrival:   { airport: 'LHR', id: 'LHR', time: '2026-06-02 08:00' },
      extensions: [],
    },
  ],
  layovers: [{ duration: 120, airport: 'Los Angeles', id: 'LAX' }],
}

describe('mapSerpFlightToFlightData', () => {
  it('maps a direct flight 1:1', () => {
    const data = mapSerpFlightToFlightData(direct)
    expect(data.airline).toBe('American Airlines')
    expect(data.flight_number).toBe('AA 100')
    expect(data.origin_iata).toBe('JFK')
    expect(data.origin_name).toBe('JFK')
    expect(data.dest_iata).toBe('LHR')
    expect(data.dest_name).toBe('LHR')
    expect(data.departure_at).toBe('2026-06-01 09:00')
    expect(data.arrival_at).toBe('2026-06-01 21:00')
    expect(data.price).toBe(480)
    expect(data.currency).toBe('USD')
    expect(data.cabin_class).toBe('Economy')
    expect(data.booking_ref).toBeNull()
    expect(data.offer_id).toBe('best-0')
  })

  it('maps a 1-stop flight to first-leg origin → last-leg arrival (decision B)', () => {
    const data = mapSerpFlightToFlightData(oneStop)
    expect(data.airline).toBe('American Airlines') // first leg's carrier
    expect(data.flight_number).toBe('AA 100')
    expect(data.origin_iata).toBe('JFK')
    expect(data.dest_iata).toBe('LHR')                    // last leg's arrival
    expect(data.departure_at).toBe('2026-06-01 09:00')    // first leg's departure
    expect(data.arrival_at).toBe('2026-06-02 08:00')      // last leg's arrival
    expect(data.cabin_class).toBe('Economy')
    expect(data.offer_id).toBe('other-2')
  })

  it('returns null fields when legs array is empty', () => {
    const data = mapSerpFlightToFlightData({ ...direct, legs: [] })
    expect(data.airline).toBe('')
    expect(data.flight_number).toBeNull()
    expect(data.origin_iata).toBe('')
    expect(data.dest_iata).toBe('')
    expect(data.departure_at).toBeNull()
    expect(data.arrival_at).toBeNull()
  })

  it('preserves null price', () => {
    const data = mapSerpFlightToFlightData({ ...direct, price: null as unknown as number })
    expect(data.price).toBeNull()
    expect(data.currency).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run components/trip/flights/flightSearch.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `flightSearch.ts`**

```typescript
import type { FlightData } from '@travyl/shared'

export interface SerpFlightLeg {
  flightNumber: string
  airline: string
  airlineLogo: string
  airplane: string
  travelClass: string
  legroom: string
  duration: number
  overnight: boolean
  departure: { airport: string; id: string; time: string }
  arrival:   { airport: string; id: string; time: string }
  extensions: string[]
}

export interface SerpFlight {
  id: string
  tier: 'best' | 'other'
  price: number | null
  type: string
  totalDuration: number
  stops: number
  airlineLogo: string
  carbonEmissions: { this_flight?: number; typical_for_this_route?: number; difference_percent?: number } | null
  legs: SerpFlightLeg[]
  layovers: { duration: number; airport: string; id: string }[]
}

export interface SerpFlightSearchResponse {
  flights: SerpFlight[]
  priceInsights?: unknown
  total: number
  flights_state?: string
  error?: string
}

export interface FlightSearchInput {
  origin: string       // IATA
  destination: string  // IATA
  date: string         // YYYY-MM-DD
  return?: string      // YYYY-MM-DD
  passengers: number
  cabin: 'economy' | 'premium_economy' | 'business' | 'first'
}

export async function searchFlights(input: FlightSearchInput): Promise<SerpFlightSearchResponse> {
  const params = new URLSearchParams({
    origin: input.origin,
    destination: input.destination,
    date: input.date,
    passengers: String(input.passengers),
    class: input.cabin,
  })
  if (input.return) params.set('return', input.return)

  const res = await fetch(`/api/flights/search?${params}`)
  if (!res.ok) {
    return { flights: [], total: 0, error: `Search failed (${res.status})` }
  }
  return res.json()
}

export function mapSerpFlightToFlightData(serp: SerpFlight): FlightData {
  const first = serp.legs[0]
  const last = serp.legs[serp.legs.length - 1]
  const price = serp.price ?? null
  return {
    airline: first?.airline ?? '',
    flight_number: first?.flightNumber || null,
    origin_iata: first?.departure.id ?? '',
    origin_name: first?.departure.airport ?? null,
    dest_iata: last?.arrival.id ?? '',
    dest_name: last?.arrival.airport ?? null,
    departure_at: first?.departure.time ?? null,
    arrival_at: last?.arrival.time ?? null,
    price,
    currency: price != null ? 'USD' : null,
    cabin_class: first?.travelClass ?? null,
    booking_ref: null,
    offer_id: serp.id,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && npx vitest run components/trip/flights/flightSearch.test.ts`
Expected: PASS, 4/4 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/trip/flights/flightSearch.ts apps/web/components/trip/flights/flightSearch.test.ts
git commit -m "Add SerpAPI flight search lib + mapper with tests"
```

---

## Task 6: Airport autocomplete

**Files:**
- Create: `apps/web/components/trip/flights/airportSearch.ts`
- Create: `apps/web/components/trip/flights/AirportAutocomplete.tsx`

- [ ] **Step 1: Implement `airportSearch.ts`**

```typescript
export interface Airport {
  iata: string
  name: string
  city: string
  country: string
  type: 'airport' | 'city'
}

export async function searchAirports(q: string): Promise<Airport[]> {
  if (q.length < 2) return []
  try {
    const res = await fetch(`/api/airports?q=${encodeURIComponent(q)}`)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}
```

- [ ] **Step 2: Implement `AirportAutocomplete.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Plane } from 'lucide-react'
import { FieldLabel } from '@/components/trip/BookingFormPrimitives'
import { searchAirports, type Airport } from './airportSearch'

export interface AirportAutocompleteProps {
  label: string
  value: { iata: string; name: string; city: string } | null
  onChange: (v: AirportAutocompleteProps['value']) => void
  invalid?: boolean
}

export function AirportAutocomplete({ label, value, onChange, invalid }: AirportAutocompleteProps) {
  const [query, setQuery] = useState(value ? `${value.iata} · ${value.city}` : '')
  const [results, setResults] = useState<Airport[]>([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (query.length < 2) {
        setResults([])
        return
      }
      const res = await searchAirports(query)
      setResults(res)
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const select = (a: Airport) => {
    onChange({ iata: a.iata, name: a.name, city: a.city })
    setQuery(`${a.iata} · ${a.city}`)
    setOpen(false)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      select(results[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActiveIdx(0)
          if (e.target.value === '') onChange(null)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        placeholder="Type a city or airport"
        className={`w-full h-10 px-3 rounded-lg border bg-white dark:bg-white/[0.04] text-[13px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--trip-base)]/30 ${invalid ? 'border-red-400' : 'border-gray-200 dark:border-white/[0.10]'}`}
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-[var(--background)] shadow-lg">
          {results.map((a, i) => (
            <button
              key={`${a.iata}-${i}`}
              type="button"
              onClick={() => select(a)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] ${i === activeIdx ? 'bg-gray-100 dark:bg-white/[0.06]' : ''}`}
            >
              <Plane size={12} className="text-gray-400 shrink-0" />
              <span className="font-mono font-semibold text-gray-900 dark:text-white">{a.iata}</span>
              <span className="text-gray-700 dark:text-gray-300 truncate">{a.city}</span>
              <span className="text-gray-400 truncate">{a.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "flights/" | head -10`
Expected: no errors for `flights/`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/trip/flights/airportSearch.ts apps/web/components/trip/flights/AirportAutocomplete.tsx
git commit -m "Add airport autocomplete (Duffel-backed)"
```

---

## Task 7: Flight result card + results list

**Files:**
- Create: `apps/web/components/trip/flights/FlightResultCard.tsx`
- Create: `apps/web/components/trip/flights/FlightResultsList.tsx`

- [ ] **Step 1: Implement `FlightResultCard.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Plus, Check, Plane, ChevronDown, ChevronUp } from 'lucide-react'
import type { SerpFlight } from './flightSearch'

export interface FlightResultCardProps {
  flight: SerpFlight
  alreadySaved: boolean
  busy: boolean
  onAdd: (flight: SerpFlight) => Promise<void>
  formatPrice: (n: number, currency?: string | null) => string
}

function formatTime(iso: string): string {
  // SerpAPI returns "YYYY-MM-DD HH:MM" — show "HH:MM"
  const m = iso.match(/(\d{2}:\d{2})$/)
  return m ? m[1] : iso
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function FlightResultCard({ flight, alreadySaved, busy, onAdd, formatPrice }: FlightResultCardProps) {
  const [expanded, setExpanded] = useState(false)
  const first = flight.legs[0]
  const last = flight.legs[flight.legs.length - 1]
  const carriers = Array.from(new Set(flight.legs.map((l) => l.airline)))

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await onAdd(flight)
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-4">
          {flight.airlineLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={flight.airlineLogo} alt={first?.airline ?? ''} className="w-10 h-10 object-contain shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-[16px] font-semibold text-gray-900 dark:text-white tabular-nums">
                {first ? formatTime(first.departure.time) : '—'}
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-[16px] font-semibold text-gray-900 dark:text-white tabular-nums">
                {last ? formatTime(last.arrival.time) : '—'}
              </span>
              <span className="text-[12px] text-gray-500 dark:text-gray-400 ml-2">
                {formatDuration(flight.totalDuration)}
              </span>
            </div>
            <div className="mt-1 text-[12px] text-gray-600 dark:text-gray-400">
              {carriers.join(' + ')} · {flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
              {' · '}
              <span className="font-mono">{first?.departure.id}</span>
              {' → '}
              <span className="font-mono">{last?.arrival.id}</span>
            </div>
          </div>
          {flight.price != null && (
            <div className="text-right shrink-0">
              <div className="text-[16px] font-semibold text-gray-900 dark:text-white tabular-nums">
                {formatPrice(flight.price, 'USD')}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleAdd}
            disabled={busy || alreadySaved}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition disabled:opacity-50"
            style={{ backgroundColor: alreadySaved ? 'rgb(107 114 128)' : 'var(--trip-base)' }}
          >
            {alreadySaved ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add to trip</>}
          </button>
          {flight.legs.length > 1 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 hover:underline"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {flight.legs.length} legs
            </button>
          )}
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.06] space-y-2">
            {flight.legs.map((leg, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px]">
                <Plane size={12} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-gray-700 dark:text-gray-300">
                    {leg.airline} {leg.flightNumber} · {leg.travelClass}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    <span className="font-mono">{leg.departure.id}</span> {formatTime(leg.departure.time)} → <span className="font-mono">{leg.arrival.id}</span> {formatTime(leg.arrival.time)} · {formatDuration(leg.duration)}
                  </div>
                </div>
              </div>
            ))}
            {flight.layovers.map((l, i) => (
              <div key={`l-${i}`} className="text-[11px] text-gray-500 dark:text-gray-400 pl-5">
                Layover at {l.airport} ({l.id}) · {formatDuration(l.duration)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement `FlightResultsList.tsx`**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { Plane, Search, AlertCircle } from 'lucide-react'
import type { SerpFlight } from './flightSearch'
import { FlightResultCard } from './FlightResultCard'

export interface FlightSearchState {
  loading: boolean
  results: SerpFlight[]
  error: string | null
  hasSearched: boolean
}

type Tab = 'best' | 'cheapest' | 'fastest'

export interface FlightResultsListProps {
  state: FlightSearchState
  savedOfferIds: Set<string>
  busyOfferId: string | null
  onAdd: (flight: SerpFlight) => Promise<void>
  formatPrice: (n: number, currency?: string | null) => string
}

export function FlightResultsList({ state, savedOfferIds, busyOfferId, onAdd, formatPrice }: FlightResultsListProps) {
  const [tab, setTab] = useState<Tab>('best')

  const sorted = useMemo(() => {
    if (tab === 'best') return state.results.filter((f) => f.tier === 'best').concat(state.results.filter((f) => f.tier !== 'best'))
    if (tab === 'cheapest') return [...state.results].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
    return [...state.results].sort((a, b) => a.totalDuration - b.totalDuration)
  }, [state.results, tab])

  if (!state.hasSearched && !state.loading) return null

  if (state.loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="flex flex-col items-center text-center py-10">
        <AlertCircle size={20} className="text-gray-400 mb-2" />
        <p className="text-[13px] text-gray-700 dark:text-gray-200">{state.error}</p>
      </div>
    )
  }

  if (state.results.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-10">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
        >
          <Search size={20} />
        </div>
        <p className="text-[14px] text-gray-700 dark:text-gray-200">No flights for these dates</p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">Try different airports or dates.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400">
          <Plane size={12} />
          <span>{state.results.length} {state.results.length === 1 ? 'flight' : 'flights'}</span>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-white/[0.04]">
          {(['best', 'cheapest', 'fastest'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 h-7 rounded text-[12px] font-medium transition ${tab === t ? 'bg-white dark:bg-white/[0.08] text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {sorted.map((flight) => (
        <FlightResultCard
          key={flight.id}
          flight={flight}
          alreadySaved={savedOfferIds.has(flight.id)}
          busy={busyOfferId === flight.id}
          onAdd={onAdd}
          formatPrice={formatPrice}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "flights/" | head -10`
Expected: no errors for `flights/`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/trip/flights/FlightResultCard.tsx apps/web/components/trip/flights/FlightResultsList.tsx
git commit -m "Add FlightResultCard + FlightResultsList components"
```

---

## Task 8: Flight search panel

**Files:**
- Create: `apps/web/components/trip/flights/FlightSearchPanel.tsx`

- [ ] **Step 1: Implement `FlightSearchPanel.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { FieldLabel, Input, Select, DateInput, PrimaryButton } from '@/components/trip/BookingFormPrimitives'
import { AirportAutocomplete } from './AirportAutocomplete'
import { searchFlights, type FlightSearchInput, type SerpFlight } from './flightSearch'
import type { FlightSearchState } from './FlightResultsList'

const CABIN_OPTIONS = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium_economy', label: 'Premium economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First' },
]

export interface FlightSearchPanelProps {
  trip: { id: string; start_date: string; end_date: string }
  onResultsChange: (state: FlightSearchState) => void
}

export function FlightSearchPanel({ trip, onResultsChange }: FlightSearchPanelProps) {
  const [from, setFrom] = useState<{ iata: string; name: string; city: string } | null>(null)
  const [to, setTo] = useState<{ iata: string; name: string; city: string } | null>(null)
  const [date, setDate] = useState(trip.start_date ?? '')
  const [returnDate, setReturnDate] = useState(trip.end_date ?? '')
  const [oneWay, setOneWay] = useState(false)
  const [passengers, setPassengers] = useState('1')
  const [cabin, setCabin] = useState<FlightSearchInput['cabin']>('economy')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<{ from?: boolean; to?: boolean; date?: boolean }>({})

  const validate = () => {
    const next: typeof errors = {}
    if (!from?.iata) next.from = true
    if (!to?.iata) next.to = true
    if (!date) next.date = true
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSearch = async () => {
    if (!validate() || busy) return
    setBusy(true)
    onResultsChange({ loading: true, results: [], error: null, hasSearched: true })
    try {
      const input: FlightSearchInput = {
        origin: from!.iata,
        destination: to!.iata,
        date,
        return: oneWay ? undefined : (returnDate || undefined),
        passengers: Number(passengers),
        cabin,
      }
      const res = await searchFlights(input)
      if (res.error) {
        onResultsChange({ loading: false, results: [], error: res.error, hasSearched: true })
      } else {
        const flights: SerpFlight[] = res.flights ?? []
        onResultsChange({ loading: false, results: flights, error: null, hasSearched: true })
      }
    } catch (e) {
      onResultsChange({
        loading: false,
        results: [],
        error: e instanceof Error ? e.message : 'Search failed',
        hasSearched: true,
      })
    } finally {
      setBusy(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div onKeyDown={handleKey} className="rounded-xl border border-[var(--trip-base)]/30 bg-white dark:bg-white/[0.04] p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-3">
        <div className="md:col-span-3">
          <AirportAutocomplete label="From" value={from} onChange={setFrom} invalid={errors.from} />
        </div>
        <div className="md:col-span-3">
          <AirportAutocomplete label="To" value={to} onChange={setTo} invalid={errors.to} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Depart</FieldLabel>
          <DateInput value={date} onChange={setDate} invalid={errors.date} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Return</FieldLabel>
          <DateInput value={returnDate} onChange={setReturnDate} disabled={oneWay} />
        </div>
        <div className="md:col-span-1">
          <FieldLabel>Passengers</FieldLabel>
          <Input type="number" value={passengers} onChange={setPassengers} min={1} />
        </div>
        <div className="md:col-span-1">
          <FieldLabel>Cabin</FieldLabel>
          <Select value={cabin} onChange={(v) => setCabin(v as FlightSearchInput['cabin'])} options={CABIN_OPTIONS} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <label className="inline-flex items-center gap-2 text-[12px] text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={oneWay}
            onChange={(e) => setOneWay(e.target.checked)}
            className="rounded"
          />
          One-way
        </label>
        <PrimaryButton onClick={handleSearch} busy={busy}>
          <span className="inline-flex items-center gap-1.5">
            <Search size={13} /> Search flights
          </span>
        </PrimaryButton>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "flights/" | head -10`
Expected: no errors for `flights/`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/trip/flights/FlightSearchPanel.tsx
git commit -m "Add FlightSearchPanel component"
```

---

## Task 9: Wire FlightsModule to search-first + gut FlightForm

**Files:**
- Modify: `apps/web/components/trip/flights/FlightsModule.tsx`
- Modify: `apps/web/components/trip/flights/FlightForm.tsx`
- Modify: `apps/web/app/(dashboard)/trip/[id]/flights/page.tsx`

- [ ] **Step 1: Replace `FlightsModule.tsx` body**

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FlightViewModel, FlightData, Trip } from '@travyl/shared'
import { supabase } from '@travyl/shared'
import { FlightCard } from './FlightCard'
import { FlightForm } from './FlightForm'
import { FlightSearchPanel } from './FlightSearchPanel'
import { FlightResultsList, type FlightSearchState } from './FlightResultsList'
import { mapSerpFlightToFlightData, type SerpFlight } from './flightSearch'
import { addFlight, updateFlight, deleteFlight } from './flightMutations'

export interface FlightsModuleProps {
  tripId: string
  flights: FlightViewModel[]
  rawFlights: { id: string; data: FlightData }[]
  defaultCurrency: string
  formatPrice: (n: number, currency?: string | null) => string
}

export function FlightsModule({ tripId, flights, rawFlights, defaultCurrency, formatPrice }: FlightsModuleProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searching, setSearching] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchState, setSearchState] = useState<FlightSearchState>({
    loading: false, results: [], error: null, hasSearched: false,
  })
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null)
  const hasExpandedRef = useRef(false)

  const { data: trip } = useQuery<Trip | null>({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const { data } = await supabase.from('trips').select('*').eq('id', tripId).single()
      return data as Trip | null
    },
    enabled: !!tripId,
    staleTime: 60_000,
  })

  const sorted = useMemo(
    () => [...flights].sort((a, b) => {
      const av = a.departureAt ?? ''
      const bv = b.departureAt ?? ''
      return av.localeCompare(bv)
    }),
    [flights],
  )

  const savedOfferIds = useMemo(
    () => new Set(rawFlights.map((r) => r.data.offer_id).filter(Boolean) as string[]),
    [rawFlights],
  )

  useEffect(() => {
    if (hasExpandedRef.current) return
    const expandId = searchParams.get('expand')
    if (expandId && flights.some((f) => f.id === expandId)) {
      setEditingId(expandId)
      hasExpandedRef.current = true
    }
  }, [searchParams, flights])

  useEffect(() => {
    const onAdd = () => setSearching(true)
    window.addEventListener('flights:add', onAdd)
    return () => window.removeEventListener('flights:add', onAdd)
  }, [])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['flights', tripId] })
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
  }

  const handleAddFromSearch = async (serpFlight: SerpFlight) => {
    setBusyOfferId(serpFlight.id)
    try {
      const data = mapSerpFlightToFlightData(serpFlight)
      await addFlight(tripId, data)
      invalidate()
      toast.success(`Added ${data.airline || 'flight'}`)
    } catch (e) {
      console.error(e)
      toast.error("Couldn't add — try again")
    } finally {
      setBusyOfferId(null)
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
      if (searchParams.get('expand')) {
        router.replace(`/trip/${tripId}/flights`, { scroll: false })
      }
    } catch (e) {
      console.error(e)
      toast.error("Couldn't delete — try again")
    }
  }

  const tripForPanel = {
    id: tripId,
    start_date: trip?.start_date ?? '',
    end_date: trip?.end_date ?? '',
  }

  return (
    <div className="space-y-4">
      {searching && (
        <>
          <FlightSearchPanel trip={tripForPanel} onResultsChange={setSearchState} />
          <FlightResultsList
            state={searchState}
            savedOfferIds={savedOfferIds}
            busyOfferId={busyOfferId}
            onAdd={handleAddFromSearch}
            formatPrice={formatPrice}
          />
        </>
      )}

      {flights.length === 0 && !searching && (
        <div className="flex flex-col items-center text-center py-12">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
          </div>
          <p className="text-[15px] font-serif text-gray-700 dark:text-gray-200">No flights booked yet</p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
            Search live inventory to add a flight to your trip.
          </p>
          <button
            onClick={() => setSearching(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium text-white shadow-sm hover:shadow-md transition"
            style={{ backgroundColor: 'var(--trip-base)' }}
          >
            Search flights
          </button>
        </div>
      )}

      <div className="space-y-3">
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
    </div>
  )
}
```

- [ ] **Step 2: Replace `FlightForm.tsx` body (edit-only)**

```tsx
'use client'

import { useState } from 'react'
import type { FlightData } from '@travyl/shared'
import { FieldLabel, Input, Select, PrimaryButton, SecondaryButton } from '@/components/trip/BookingFormPrimitives'

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'MXN', label: 'MXN ($)' },
]

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export interface FlightFormProps {
  initial: Partial<FlightData> & { id: string }
  defaultCurrency?: string
  onSubmit: (data: FlightData) => Promise<void>
  onCancel: () => void
  onDelete: () => Promise<void>
}

export function FlightForm({ initial, defaultCurrency = 'USD', onSubmit, onCancel, onDelete }: FlightFormProps) {
  const [price, setPrice] = useState(initial.price?.toString() ?? '')
  const [currency, setCurrency] = useState(initial.currency ?? defaultCurrency)
  const [bookingRef, setBookingRef] = useState(initial.booking_ref ?? '')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async () => {
    setBusy(true)
    try {
      const data: FlightData = {
        airline: initial.airline ?? '',
        flight_number: initial.flight_number ?? null,
        origin_iata: initial.origin_iata ?? '',
        origin_name: initial.origin_name ?? null,
        dest_iata: initial.dest_iata ?? '',
        dest_name: initial.dest_name ?? null,
        departure_at: initial.departure_at ?? null,
        arrival_at: initial.arrival_at ?? null,
        price: price ? Number(price) : null,
        currency: price ? currency : null,
        cabin_class: initial.cabin_class ?? null,
        booking_ref: bookingRef.trim() || null,
        offer_id: initial.offer_id ?? null,
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
      <div className="space-y-1">
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
          {initial.airline} {initial.flight_number ?? ''}
        </h3>
        <p className="text-[12px] text-gray-500 dark:text-gray-400">
          <span className="font-mono">{initial.origin_iata}</span> → <span className="font-mono">{initial.dest_iata}</span>
          {' · '}{formatTime(initial.departure_at)} → {formatTime(initial.arrival_at)}
          {initial.cabin_class && <> · {initial.cabin_class}</>}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-3">
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
        <button
          onClick={onDelete}
          disabled={busy}
          className="text-[13px] font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
        >
          Delete flight
        </button>
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onCancel} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} busy={busy}>Save</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Pass `formatPrice` to `<FlightsModule>` from the page**

Modify `apps/web/app/(dashboard)/trip/[id]/flights/page.tsx`:
- Import `useHomeCurrency` from `@travyl/shared` (or define `formatPrice` inline as in Task 4 fallback).
- Compute `const { formatPrice } = useHomeCurrency()`.
- Pass `formatPrice={formatPrice}` to `<FlightsModule>`.

- [ ] **Step 4: Typecheck**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | grep -E "flights/" | head -20`
Expected: no errors.

- [ ] **Step 5: Manual smoke test**

Open `http://localhost:3001/trip/<id>/flights`. Verify:
- Header `+ Flight` button opens search panel.
- "From" / "To" autocomplete via `/api/airports`.
- Search returns flights (or graceful empty/error if `SERPAPI_KEY` unset).
- Tabs (Best/Cheapest/Fastest) re-sort the same result list.
- Click "Add to trip" → toast → flight appears in saved list.
- Click a saved flight → form shows airline/route/times read-only, only price + booking_ref editable.
- Delete works.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/trip/flights/FlightsModule.tsx apps/web/components/trip/flights/FlightForm.tsx apps/web/app/\(dashboard\)/trip/\[id\]/flights/page.tsx
git commit -m "Wire FlightsModule to search-first; gut FlightForm to edit-only"
```

---

## Task 10: End-to-end verification + final review

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck 2>&1 | tail -30`
Expected: no errors in any workspace.

- [ ] **Step 2: Run all relevant unit tests**

Run: `cd apps/web && npx vitest run components/trip/hotels components/trip/flights`
Expected: all mapper tests green.

- [ ] **Step 3: Manual end-to-end walkthrough on dev server**

Start dev (`npm run web`), open a real trip in the browser, exercise:
1. Hotels: open page → click "+ Hotel" header button → search "Tokyo" with valid dates → Add 2 results → verify both appear in saved list → click one → edit price + booking_ref → Save → verify update → delete one.
2. Flights: open page → click "+ Flight" → autocomplete From "JFK" + To "LHR" → date 30+ days out → search → switch tabs (Best/Cheapest/Fastest) → expand a multi-leg flight → Add → verify appears in saved list → edit price → Save → delete.
3. Refresh both pages → data persists.
4. Open same trip in second browser tab → Add a hotel in first tab → verify second tab updates via realtime.

- [ ] **Step 4: Final-review subagent**

Dispatch a code-reviewer subagent over the full diff `develop...HEAD` covering all 9 task commits. Address any Important issues.

- [ ] **Step 5: Push**

```bash
git push origin develop
```

---

## Out of scope reminders

- Trip-creation auto-population of hotels/flights — separate work in trip-create pipeline.
- `/api/cars/search` adapter — Cars page stays manual until a provider is wired.
- In-product booking checkout.
- Saved searches / search history.
- Filters beyond what SerpAPI returns.

## Skills to use during implementation

- @superpowers:test-driven-development for the mapper tasks (Tasks 1, 5).
- @superpowers:subagent-driven-development to execute this plan.
