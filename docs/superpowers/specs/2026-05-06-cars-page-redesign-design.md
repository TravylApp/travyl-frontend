# Cars Page Redesign — Design Spec

**Date:** 2026-05-06
**Status:** Approved by user (auto-approved, proceeding directly to plan)
**Scope:** Replace the static placeholder Cars page (`/trip/[id]/cars/page.tsx`, 26 lines, hardcoded "No car rentals yet" with a non-functional Add button) with a working booking-management surface that mirrors the Hotels and Flights redesign. Persist car rentals in `trip.trip_context.cars` JSONB — no new Supabase tables, no migrations.
**Out of scope:** External car-rental search APIs (Kayak, Hertz API, etc.), price comparison, vehicle catalog with images, insurance/extras add-ons, driver age/license fields, multi-driver bookings, hourly rentals.

---

## 1. Why

The current Cars page is dead UI. Lines 23-26 of `apps/web/app/(dashboard)/trip/[id]/cars/page.tsx`:

```tsx
export default function CarRental() {
  // No DB table yet — show empty state ready for future API
  return <EmptyState />;
}
```

The "+ Add Car Rental" button has no handler. There's no Supabase table, no shared hook, no view model, no way for a user to track their ground transportation in the trip. Meanwhile, Hotels and Flights now have full add/edit/delete flows. Cars is the gap.

This redesign uses the same patterns as Hotels/Flights but with **`trip.trip_context.cars` JSONB persistence** instead of a dedicated table — same approach as Budget (`trip_context.budget_data`) and Packing (`trip_context.packing_seeded`). This avoids a backend migration while delivering full CRUD.

## 2. What changes

### 2.1 Page structure

Mirror Hotels and Flights:

- **Outer wrapper:** `w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12`.
- **Single Module:**
  - Title: `Car rentals` (26px serif).
  - Description: `"N rentals · M days total"`, where M is the **sum of per-rental days** (e.g. three 4-day rentals = `"3 rentals · 12 days total"`). When the array is empty: `"No car rentals yet"`.
  - Header action: `+ Rental` primary button (theme color).
  - Body: empty state OR sorted list of cards.

### 2.2 Car rental card

```
┌────────────────────────────────────────────────────────────────────┐
│ [🚗 tile]  Hertz · Toyota Camry                                ⋯   │
│           [📅 May 14 → May 18] [4 days] [SFO airport]              │
│                                                                    │
│                                                              $235  │
└────────────────────────────────────────────────────────────────────┘
```

- **Tile (44×44, theme-color tinted bg + theme-color icon).** Lucide `Car` icon at 18px.
- **Title row:** `vendor · vehicle` (15px font-semibold gray-900). Falls back to just `vendor` if no vehicle is set.
- **Meta row chips:** dates (`May 14 → May 18`), days (`4 days`), pickup location displayed **verbatim** from `pickup_location`, truncated with CSS `max-w-[160px] truncate` so a long address doesn't blow out the chip row. All neutral gray pills.
- **Price** (right-aligned, 13px gray-700 semibold): formatted via `useHomeCurrency().format()`. If null, omit.
- **⋯ menu (hover-revealed):** delete (single-action menu, like Hotels/Flights).

Click anywhere on the card → expand to inline edit form.

### 2.3 Inline add / edit form

Uses the existing `BookingFormPrimitives` (`FieldLabel`, `Input`, `Select`, `DateInput`, `DateTimeInput`, `PrimaryButton`, `SecondaryButton`).

**Fields:**

| Field             | Type             | Required | Notes                                                    |
| ----------------- | ---------------- | -------- | -------------------------------------------------------- |
| Vendor            | text input       | Yes      | e.g. "Hertz", "Enterprise"                               |
| Vehicle           | text input       | No       | e.g. "Toyota Camry", "Compact SUV"                       |
| Pickup location   | text input       | Yes      | Free text. Could be airport code ("SFO") or address.     |
| Dropoff location  | text input       | No       | Free text. Defaults to pickup location if blank on save. |
| Pickup            | datetime-local   | Yes      | ISO datetime                                             |
| Dropoff           | datetime-local   | Yes      | ISO datetime, must be ≥ pickup                           |
| Price             | number input     | No       | Total trip price                                         |
| Currency          | select           | No       | Defaults to trip's currency. Use the same `CURRENCY_OPTIONS` array currently inlined at the top of `apps/web/components/trip/hotels/HotelForm.tsx` and `apps/web/components/trip/flights/FlightForm.tsx` (USD, EUR, GBP, JPY, CAD, AUD, MXN). Inline a copy in `CarForm.tsx` for consistency — a future cleanup PR can extract these to a shared module. |
| Booking ref       | text input       | No       | Confirmation code                                        |

**Form actions:** Same as Hotels/Flights — `Add` / `Save` primary, `Cancel` secondary, `Delete` text link bottom-left when editing. Esc cancels, Cmd/Ctrl+Enter submits.

**Validation:**
- Vendor, pickup_location, pickup_at, dropoff_at required.
- dropoff_at ≥ pickup_at.
- Red ring on invalid field, no toast.

### 2.4 Persistence — `trip_context.cars` JSONB

No new Supabase table. Cars are appended to `trip.trip_context.cars` as an array of:

```typescript
interface CarRentalData {
  vendor: string;
  vehicle: string | null;
  pickup_location: string;
  dropoff_location: string | null;
  pickup_at: string;        // ISO datetime
  dropoff_at: string;       // ISO datetime
  price: number | null;
  currency: string | null;
  booking_ref: string | null;
}

interface CarRental {
  id: string;               // locally generated: `car-${crypto.randomUUID()}`
  data: CarRentalData;
}
```

**Mutations** (inline supabase calls, mirror of how Budget persists `budget_data`):

```typescript
async function readCars(tripId: string): Promise<CarRental[]> {
  const { data } = await supabase.from('trips').select('trip_context').eq('id', tripId).single();
  return ((data?.trip_context as any)?.cars as CarRental[] | undefined) ?? [];
}

async function writeCars(tripId: string, cars: CarRental[]): Promise<void> {
  const { data: current } = await supabase.from('trips').select('trip_context').eq('id', tripId).single();
  const existing = (current?.trip_context as Record<string, unknown>) ?? {};
  await supabase.from('trips').update({ trip_context: { ...existing, cars } }).eq('id', tripId);
}

async function addCar(tripId: string, data: CarRentalData): Promise<void> {
  const cars = await readCars(tripId);
  const next: CarRental = { id: `car-${crypto.randomUUID()}`, data };
  await writeCars(tripId, [...cars, next]);
}

async function updateCar(tripId: string, id: string, data: CarRentalData): Promise<void> {
  const cars = await readCars(tripId);
  await writeCars(tripId, cars.map((c) => c.id === id ? { ...c, data } : c));
}

async function deleteCar(tripId: string, id: string): Promise<void> {
  const cars = await readCars(tripId);
  await writeCars(tripId, cars.filter((c) => c.id !== id));
}
```

**Read source:** `useItineraryScreen(tripId).trip.trip_context.cars` — already reactive via the existing `['trip', tripId]` query. Realtime sync is already wired on the `trips` table (line 369 of `useItineraryScreen.ts`).

**Cache invalidation after mutation:** `queryClient.invalidateQueries({ queryKey: ['trip', tripId] })`.

### 2.5 Read-then-write race

The mutation pattern (read trip_context, mutate cars, write back) inherits the same TOCTOU window as Budget's `persist`. If Settings or another tab writes a different `trip_context` key concurrently, one write can clobber the other. This is acceptable — same risk profile as Budget, and concurrent writes to disjoint trip_context keys from a single user are rare. Document in the implementation plan; no atomic update needed for first cut.

### 2.6 Empty / loading / error states

- **Empty (cars array is empty or undefined):** centered block with `Car` icon (32px in 48×48 theme-tinted circle), copy `"No car rentals yet"` (15px serif gray-700), sub-copy `"Add a rental to track your ground transportation."` (12px gray-500), secondary `+ Add rental` button.
- **Loading (trip is loading):** skeleton boxes inside the Module body.
- **Error (mutation fails):** `sonner` toast — `"Couldn't save — try again"` / `"Couldn't delete — try again"`.

### 2.7 Auto-fill

Per the "auto-fill" directive: there's no external rental-search API to pull from. What auto-fill means here:

1. **Existing data is automatically displayed** — every entry in `trip.trip_context.cars` renders on first load.
2. **Form pre-fills:**
   - Currency: `trip.currency` (or `'USD'`).
   - Pickup / dropoff date defaults: blank. Don't guess from `trip.start_date` — the user might pick up the car at a different time/place.
   - Pickup / dropoff locations: blank.
3. **Dropoff location defaults to pickup on save** if the user leaves it empty (common case — same-location rental).

### 2.8 Card sort order

Sort by `pickup_at` ascending. Multi-rental trips read top-to-bottom in chronological order.

## 3. Files affected

### Files modified (full rewrite)

| File                                                              | Change                                                         |
| ----------------------------------------------------------------- | -------------------------------------------------------------- |
| `apps/web/app/(dashboard)/trip/[id]/cars/page.tsx`                | Rewrite from 26 lines → ~80-line orchestrator using the new components. |

### Files created

| File                                                              | Responsibility                                                 |
| ----------------------------------------------------------------- | -------------------------------------------------------------- |
| `apps/web/components/trip/cars/types.ts`                          | Local `CarRentalData` and `CarRental` types.                   |
| `apps/web/components/trip/cars/carMutations.ts`                   | `readCars`, `writeCars`, `addCar`, `updateCar`, `deleteCar` against `trip_context.cars`. |
| `apps/web/components/trip/cars/CarCard.tsx`                       | Read-only card display.                                        |
| `apps/web/components/trip/cars/CarForm.tsx`                       | Inline form for add/edit.                                      |
| `apps/web/components/trip/cars/CarsModule.tsx`                    | Orchestrator — empty state, sorted list, manage state, mutations. |

### Files NOT touched

- `packages/shared/src/types/index.ts` — no DB type since there's no DB table. `CarRentalData` lives in the web app.
- `packages/shared/src/hooks/` — no `useCars` hook needed; we read from `useItineraryScreen.trip.trip_context.cars`.
- `apps/web/components/trip/Module.tsx`, `BookingFormPrimitives.tsx` — already exist, used as-is.
- `apps/web/components/trip/hotels/`, `apps/web/components/trip/flights/` — separate domain, no cross-talk.

## 4. Behavior details

### 4.1 Realtime sync

The trip row's `postgres_changes` subscription in `useItineraryScreen.ts:367-371` fires on any UPDATE to the `trips` table — which is exactly when our `writeCars` mutation runs. Cross-client propagation ~1s. No new realtime subscription needed.

### 4.2 datetime-local round-trip

Same pattern as `FlightForm` — `isoToLocalInput` to populate, `localInputToIso` (which does `new Date(local).toISOString()`) to commit. Browser-local timezone semantics; future timezone-aware work is out of scope.

The two helpers currently live as private functions inside `apps/web/components/trip/flights/FlightForm.tsx`. Copy them verbatim into `CarForm.tsx` (don't import from FlightForm — the helpers are not exported there). A future cleanup PR can extract to a shared module if a fourth caller appears.

### 4.3 Default dropoff location

If the user leaves dropoff_location blank but pickup_location is set, the form fills `dropoff_location: pickup_location` on save. This is a minor UX nicety — most rentals are same-location. Done in the form's submit handler, not in the database.

### 4.4 Days computation

Days = `Math.max(1, Math.ceil((dropoff_at - pickup_at) / 86400000))`. Same approach as Hotels' nights. Display as `"4 days"` chip.

### 4.5 Hover / focus / keyboard

Same as Hotels/Flights: hover bg tint, click card → toggle edit, Esc cancels, Cmd/Ctrl+Enter submits.

### 4.6 Mobile

Single column always. Card layout stays as-is — no hero image to shrink.

## 5. Visual specs (quick-reference)

Identical to Hotels/Flights for cohesion. Key tokens:

| Token                                  | Value                                                          |
| -------------------------------------- | -------------------------------------------------------------- |
| Page wrapper                           | `w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12`                   |
| Module                                 | shared `Module` from `@/components/trip/Module`, default `titleSize='lg'` |
| Card surface                           | `bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.08] p-4 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors` |
| Car tile                               | `44x44 rounded-lg bg-[rgb(var(--trip-base-rgb)/0.10)]`         |
| Car tile icon                          | Lucide `Car` 18px, `text-[var(--trip-base)]`                   |
| Card title                             | 15px `font-semibold text-gray-900 dark:text-white`             |
| Card meta chip                         | 11px font-medium, `bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full` |
| Card price                             | 13px right-aligned, semibold, gray-900, tabular-nums           |
| Form input                             | `BookingFormPrimitives.Input` (h-11, rounded-xl, theme focus ring) |
| Primary button                         | `BookingFormPrimitives.PrimaryButton`                          |
| Empty state icon background            | `48x48 rounded-full bg-[rgb(var(--trip-base-rgb)/0.10)]`        |
| Empty state heading                    | 15px serif gray-700                                            |
| Empty state copy                       | 12px gray-500                                                  |

## 6. Non-goals

- No external car-rental search / booking-engine integration.
- No price comparison.
- No vehicle catalog / images.
- No insurance, extras, GPS-add-on tracking.
- No driver age, license number, or insurance fields.
- No multi-driver support — one car per booking.
- No hourly / per-hour rentals — assumes day-based.
- No automatic IATA airport autocomplete for pickup location — free text.
- No new Supabase tables or migrations.

## 7. Open questions

None blocking. One judgment call:

- The `id` is generated client-side via `crypto.randomUUID()`. Two simultaneous adds on different clients could in theory collide (cosmically unlikely), and there's no DB-side uniqueness constraint since we're stuffing records into a JSONB array. Acceptable for first cut. If two clients add at the same instant, the realtime invalidation race lets the second writer's payload win and the first add gets lost. Same risk profile as Budget's `budget_data`.

## 8. Acceptance criteria

- The Cars page renders inside the same outer wrapper as Settings/Budget/Packing/Hotels/Flights with one `Module` titled "Car rentals".
- Empty state renders when `trip.trip_context.cars` is empty or undefined: friendly Car icon + copy + secondary `+ Add rental` button.
- The `+ Rental` header button opens an inline form at the top of the list.
- Submitting the form persists to `trip.trip_context.cars` via Supabase update; the view immediately reflects via `queryClient.invalidateQueries({ queryKey: ['trip', tripId] })`.
- Clicking any card → expands to the same inline form pre-populated; saving updates; deleting removes.
- Cars sort by `pickup_at` ascending.
- Default dropoff location: blank pickup-only field on submit copies `pickup_location` into `dropoff_location`.
- Days display: `"4 days"` chip, computed from pickup/dropoff timestamps.
- All visual tokens are theme-color via `var(--trip-base)`. No hard-coded colors. No mock data.
- No new Supabase tables. No migrations. The page works with the existing `trips.trip_context` JSONB column.
- No regressions: realtime sync continues to work, Budget keeps reading `trip_context.budget_data`, Packing keeps reading `trip_context.packing_seeded`.
