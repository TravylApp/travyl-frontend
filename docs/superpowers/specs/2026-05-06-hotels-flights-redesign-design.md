# Hotels & Flights Pages Redesign — Design Spec

**Date:** 2026-05-06
**Status:** Approved by user (auto-approved, proceeding directly to plan)
**Scope:** Replace the bloated `/trip/[id]/hotels/page.tsx` (2021 lines) and `/trip/[id]/flights/page.tsx` (1126 lines) with focused booking-management pages that match the new Settings/Budget/Packing styling. Auto-fill from existing `useItineraryScreen` view models; allow manual add/edit/delete via inline forms hitting the existing Supabase tables. Delete the per-record sub-routes (`hotels/[hotelId]/page.tsx`, `flights/[flightId]/page.tsx`) — the inline detail card is the detail view.
**Out of scope:** Hotel/flight search via external APIs (Foursquare, Skyscanner, etc.), price-comparison flows, room-type catalogs, "discover/explore" surfaces, the user-uploaded hotel-image gallery, the AI-generated room-photo features. None of these are wired to anything functional today; deleting them is a feature.

---

## 1. Why

The current Hotels and Flights pages don't work. They contain:

- Mock comparison data (`POPULAR_AIRPORTS = []`, room-type catalogs with hardcoded `image: ''`, `convertFoursquareToHotelData` that fabricates "Standard Room" placeholders).
- Search/booking flows that aren't wired to any external API.
- Their own parallel data-transformation pipelines (`convertFoursquareToHotelData`, `convertDbHotelsToHotelData`, `dbFlightsToBooked`) that duplicate logic already living in the canonical view models (`buildFlightViewModel`, `buildHotelViewModel`).
- 2000+ lines of UI for affordances that go nowhere.

Meanwhile, `useItineraryScreen(tripId)` already returns clean `flights: FlightViewModel[]` and `hotels: HotelViewModel[]` arrays — the data the user actually has. Budget already consumes these correctly (Noah's WIP). The Hotels and Flights pages should consume the same view models.

After this redesign:

- Both pages render real data from the existing view models — never mock, never synthesized.
- Both match the Settings/Budget/Packing visual language (Module shell, theme color, 12-col grid).
- Both let the user manually add/edit/delete bookings via inline forms hitting the same Supabase `flights` / `hotels` tables already in use.
- Empty states are clear and graceful: "No flights booked yet" / "No hotels booked yet" with an obvious "+ Add" affordance.
- The 3000+ lines of dead code go away.

## 2. What changes

### 2.1 Combined Hotels + Flights page structure

Both pages share the exact same outer structure (the only difference is the data shape and form fields):

- **Outer wrapper:** `w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12` (matches Settings, Budget, Packing).
- **Single-Module page** — no two-column dashboard. The list is the page.
- **Module header:**
  - Title: `Hotels` or `Flights` (26px serif).
  - Description: dynamically reflects state — `"3 bookings · 8 nights total"` (hotels) / `"2 flights · 14h 30m total"` (flights). When empty: `"No hotels booked yet"` / `"No flights booked yet"`.
  - Header action: `+ Hotel` / `+ Flight` primary button (theme color, rounded-xl, h-9, white text). Toggles an inline "add" form at the top of the list.
- **Module body:**
  - When empty: a centered empty-state block with a friendly icon (Lucide `Building2` for hotels, `Plane` for flights), one line of copy, and a secondary "+ Add" button below.
  - When populated: a vertical stack of booking cards (one per record), separated by hairline dividers.

### 2.2 Hotel card

Each booked hotel renders as a card inside the Module body:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [hero image 88×88]  Hotel name                                          ⋯   │
│                     Address · neighborhood (if available)                   │
│                                                                              │
│                     [📅 Jun 12 → Jun 16] [4 nights] [⭐ 4.6]  $1,440 total  │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Hero image (88×88, rounded-xl)** on the left. If `imageUrl` is null, render a theme-color tinted placeholder with a `Building2` icon centered.
- **Title row:** name (15px font-semibold gray-900), address + neighborhood (12px gray-500). If both null, just the name.
- **Meta row:** chips for dates (`Jun 12 → Jun 16`), nights (`4 nights`), star rating (if non-null, with star icon), guest rating (if non-null).
- **Price (right-aligned):** `priceDisplay` from the view model (already formatted as either `$X total` or `$X/night`). If null, show nothing.
- **⋯ menu (top-right, hover-revealed):** Edit / Delete.

Click anywhere on the card → expand to inline edit form (see § 2.4).

### 2.3 Flight card

Each flight renders as a card:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [✈ tile]  AA · 1234 · Economy                                          ⋯   │
│                                                                              │
│           JFK     ──────── 5h 30m ────────     LHR                          │
│           Jun 12 · 8:30 PM                       Jun 13 · 9:00 AM (+1)      │
│                                                                              │
│                                                              $642           │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Tile (44×44, rounded-lg, theme-color tinted bg + theme-color icon).**
- **Title row:** `airline · flightNumber · cabinClass` (15px, semibold gray-900). Missing pieces are skipped (e.g. if no cabinClass, just `AA · 1234`).
- **Route row:** origin IATA (large, font-serif 22px, theme-color) — connector line with duration label — dest IATA (large, theme-color). Below each end, a 11px gray-500 line: date + time (and `(+1)` if arrival is next-day).
- **Price** (right-aligned, 13px gray-700): `priceDisplay`. If null, show nothing.
- **⋯ menu (hover-revealed):** Edit / Delete.

Click → expand to inline edit form.

### 2.4 Inline add / edit form

When the user clicks **+ Hotel** / **+ Flight** in the Module header, OR clicks any existing card to edit it, an inline form appears (or replaces the card body for edit). The form uses the same primitives as the Settings page (`Input`, `Select`, `PrimaryButton`, `FieldLabel`).

**Hotel form fields:**

| Field           | Type             | Required | Notes                                                     |
| --------------- | ---------------- | -------- | --------------------------------------------------------- |
| Name            | text input       | Yes      | Hotel name                                                |
| Address         | text input       | No       | Street address                                            |
| Check-in        | date input       | Yes      | ISO date                                                  |
| Check-out       | date input       | Yes      | ISO date, must be ≥ check-in                              |
| Price per night | number input     | No       | Optional. Stored as `price_per_night` exactly as entered.  |
| Total price     | number input     | No       | Optional. Stored as `total_price` exactly as entered. If both are set, the view model's `priceDisplay` shows the total — both fields persist. The form does not clear one when the other is entered. |
| Currency        | select           | No       | Common ISO codes; defaults to trip's currency             |
| Booking ref     | text input       | No       | Confirmation number                                       |
| Image URL       | text input       | No       | Manual paste                                              |

**Flight form fields:**

| Field         | Type           | Required | Notes                                          |
| ------------- | -------------- | -------- | ---------------------------------------------- |
| Airline       | text input     | Yes      | e.g. "American Airlines"                       |
| Flight number | text input     | No       | e.g. "AA 1234"                                 |
| Origin IATA   | text input     | Yes      | 3-letter code (auto-uppercase)                 |
| Dest IATA     | text input     | Yes      | 3-letter code (auto-uppercase)                 |
| Departure     | datetime-local | No       | ISO datetime                                   |
| Arrival       | datetime-local | No       | ISO datetime                                   |
| Cabin class   | select         | No       | Economy / Premium / Business / First           |
| Price         | number input   | No       | Optional                                       |
| Currency      | select         | No       | Defaults to trip's currency                    |
| Booking ref   | text input     | No       | Confirmation number                            |

**Form actions:**

- Primary button: `Add` (when adding) / `Save` (when editing).
- Secondary: `Cancel` (collapses without saving).
- For edits: tertiary `Delete` link in the bottom-left, opens a small confirm popover.

**Validation:**

- Hotels: name, check-in, check-out required; check-out ≥ check-in.
- Flights: airline, origin IATA (3 letters), dest IATA (3 letters) required.
- On invalid submit: highlight the offending field with a red ring, no toast.

### 2.5 Mutations

All write operations are direct Supabase upserts to the `flights` / `hotels` tables. No new shared service helpers — inline like Budget does. Pattern:

```typescript
async function addHotel(tripId: string, data: HotelData) {
  const { error } = await supabase.from('hotels').insert({ trip_id: tripId, data });
  if (error) throw error;
}
async function updateHotel(id: string, data: HotelData) {
  const { error } = await supabase.from('hotels').update({ data }).eq('id', id);
  if (error) throw error;
}
async function deleteHotel(id: string) {
  const { error } = await supabase.from('hotels').delete().eq('id', id);
  if (error) throw error;
}
```

(Same pattern for `flights` with `FlightData`.)

After every mutation, invalidate the React Query cache:

```typescript
queryClient.invalidateQueries({ queryKey: ['hotels', tripId] });
queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
```

The realtime channel on `useItineraryScreen` will also fire (postgres_changes already subscribed in `useItineraryScreen.ts`), so the local invalidation is belt-and-suspenders insurance.

### 2.6 Sub-routes — delete

`apps/web/app/(dashboard)/trip/[id]/hotels/[hotelId]/page.tsx` and `flights/[flightId]/page.tsx` get deleted. The inline-expanded card is the detail view; we don't need a separate route. Any inbound links inside the codebase (if any) get redirected to the parent list.

A `grep` for inbound references will be part of the implementation plan's pre-flight.

### 2.7 Empty states

When the view model array is empty:

- **Hotels:** centered block: `Building2` icon (32px, theme-color tint), copy `"No hotels booked yet"` (15px serif gray-700), sub-copy `"Add your check-in and check-out to track your stay."` (12px gray-500), and a secondary `+ Add hotel` button.
- **Flights:** centered block: `Plane` icon, copy `"No flights booked yet"`, sub-copy `"Add your itinerary so the budget and timeline pull together."`, and a secondary `+ Add flight` button.

### 2.8 Loading + error states

- **Loading:** while `useItineraryScreen` is loading, render the Module shell with title + description `"Loading…"` and 3 skeleton cards in the body (hairline-bordered rounded boxes with shimmer).
- **Error:** if the view models query errors, render the Module with title + a red description line + a single inline error block. Mutations on add/edit/delete that error show a toast (`sonner`) `"Couldn't save — try again"` / `"Couldn't delete — try again"`.

### 2.9 Auto-fill behavior

Per Noah's "auto-fill" directive: there's no external API for auto-filling flight/hotel data in this work (out of scope). What "auto-fill" means here:

1. **Existing data is automatically displayed.** The view models pull from the `flights` / `hotels` tables and from `trip_context.hotels` (if the trip was AI-seeded). If those rows exist, the user sees them on first load — no manual action required.
2. **Form pre-fills:** when the user opens the add form, defaults that can be inferred from the trip pre-fill:
   - Currency: `trip.currency` (or `'USD'`).
   - Hotel check-in / check-out: blank by default. (Pre-filling from `trip.start_date` / `end_date` is a misleading default — the user might be booking only part of the stay. Leave blank.)
   - Origin IATA: blank. Dest IATA: blank. (Same reasoning — guessing IATA from destination is wrong.)

   The form is honest about what's known vs. what isn't. No fake defaults.

## 3. Files affected

### Files modified (full rewrite)

| File                                                                  | Change                                                                  |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `apps/web/app/(dashboard)/trip/[id]/hotels/page.tsx`                  | Rewrite from 2021 lines → ~150-line orchestrator that renders the new components. |
| `apps/web/app/(dashboard)/trip/[id]/flights/page.tsx`                 | Rewrite from 1126 lines → ~150 lines, parallel structure to hotels.     |

### Files created

| File                                                              | Responsibility                                                              |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `apps/web/components/trip/hotels/HotelsModule.tsx`                | Orchestrator inside the page Module body (list + add/edit form state).      |
| `apps/web/components/trip/hotels/HotelCard.tsx`                   | Single hotel card (read-only display).                                      |
| `apps/web/components/trip/hotels/HotelForm.tsx`                   | Inline form for add/edit, hitting the `hotels` table.                       |
| `apps/web/components/trip/hotels/hotelMutations.ts`               | `addHotel`, `updateHotel`, `deleteHotel` helpers (3 inline supabase calls). |
| `apps/web/components/trip/flights/FlightsModule.tsx`              | Orchestrator (mirror of `HotelsModule`).                                    |
| `apps/web/components/trip/flights/FlightCard.tsx`                 | Single flight card (read-only display).                                     |
| `apps/web/components/trip/flights/FlightForm.tsx`                 | Inline form for add/edit, hitting the `flights` table.                      |
| `apps/web/components/trip/flights/flightMutations.ts`             | `addFlight`, `updateFlight`, `deleteFlight` helpers.                        |
| `apps/web/components/trip/BookingFormPrimitives.tsx`              | Shared form primitives (`FieldLabel`, `Input`, `Select`, `DateInput`, `DateTimeInput`, `PrimaryButton`, `SecondaryButton`) for the booking forms. **Implementation note:** Settings has equivalents inline (private to its file), but Settings is uncommitted WIP. **Do NOT lift from Settings** — copy the styling tokens into this new file fresh. A future cleanup PR can converge Settings onto these. This avoids touching Noah's WIP. |

### Files deleted

| File                                                                   | Reason                                                                  |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `apps/web/app/(dashboard)/trip/[id]/hotels/[hotelId]/page.tsx`         | Inline-expanded card is the detail view. No external links in the codebase point at this route (verify in pre-flight). |
| `apps/web/app/(dashboard)/trip/[id]/flights/[flightId]/page.tsx`       | Same reason.                                                            |

### Files modified — minor

| File                                                              | Change                                                                  |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/shared/src/viewmodels/itineraryViewModel.ts`            | Add `departureAt: string \| null` and `arrivalAt: string \| null` raw-ISO fields to `FlightViewModel`, populated by `buildFlightViewModel` from `d.departure_at` / `d.arrival_at`. Backwards-compatible — adds optional fields, no consumer breakage. |

### Files NOT touched

- `packages/shared/src/hooks/useFlights.ts`, `useHotels.ts`, `useItineraryScreen.ts` — view models stay as-is.
- `packages/shared/src/viewmodels/itineraryViewModel.ts`'s `buildHotelViewModel` and `HotelViewModel` shape — unchanged.
- `packages/shared/src/types/index.ts` — `Flight`, `Hotel`, `FlightData`, `HotelData` stay as-is.
- `apps/web/components/trip/Module.tsx` — already supports the `'sm'` titleSize variant from the packing work; this redesign uses the default `'lg'`.
- The Budget page's `buildAutoExpenses` — keeps reading from the same view models; the redesign doesn't touch it.
- `apps/web/app/(dashboard)/trip/[id]/settings/page.tsx` — Noah's WIP, hands-off.

## 4. Behavior details

### 4.1 Realtime updates

`useItineraryScreen` already subscribes to `postgres_changes` on `flights` and `hotels` tables (lines 384-395 of `useItineraryScreen.ts`). Mutations made elsewhere (mobile app, second browser tab, partner editing the trip) propagate within ~1 second. The local `queryClient.invalidateQueries` after each mutation is for instant-feeling local updates — realtime is the cross-client guarantee.

### 4.2 IATA code uppercasing

When the user types in the Origin/Dest IATA field, auto-uppercase via a controlled input that runs `.toUpperCase()` on each change. Limit to 3 characters (HTML `maxLength={3}`).

### 4.3 Date input UX

- Hotel `check_in` / `check_out`: `<input type="date">`. Native picker, ISO date string in state.
- Flight `departure_at` / `arrival_at`: `<input type="datetime-local">`. Native picker. Convert to ISO via `new Date(localStr).toISOString()` before insert.
- **Timezone caveat:** `datetime-local` interprets the input string in the user's browser timezone, then `.toISOString()` converts to UTC. This is fine for the current model — the user types "8:30 PM JFK" and we store the UTC equivalent for their local clock. A future timezone-aware iteration (showing arrival times in the destination's timezone) would need the airport's tz to convert correctly; that's out of scope here.

If the user enters check_out < check_in: red ring on check_out, can't save.

### 4.4 Card sort order

- **Hotels:** sorted by `checkIn` (ISO date string from the view model) ascending. Lexicographic comparison on ISO dates is equivalent to chronological — safe.
- **Flights:** sorted by the underlying `departure_at` ISO timestamp ascending. The current `FlightViewModel` exposes only `departureDisplay` (a formatted string like `"Jun 12 · 8:30 PM"`), which would sort lexicographically — not what we want. **As part of this work, add two raw fields to `FlightViewModel`:** `departureAt: string | null` and `arrivalAt: string | null`, both passing through the underlying ISO `data.departure_at` / `data.arrival_at`. The orchestrator sorts on these. The display string stays available for rendering.

The view models don't sort by default; sort happens in the orchestrator.

### 4.5 Hover / focus / keyboard

- Card hover: subtle background tint (`hover:bg-gray-50` / `dark:hover:bg-white/[0.02]`).
- Card click anywhere (not on ⋯ button): toggles the inline edit form for that card.
- Esc inside form: cancel.
- Cmd/Ctrl + Enter inside form: submit.
- Tab order: form fields top-to-bottom, then `Cancel`, `Save`, `Delete`.

### 4.6 Mobile

Single column always (no two-column on mobile or desktop). Hotel cards: hero image goes from `88×88` to `64×64` and the meta row wraps. Flight cards: route row stays as-is (origin → dest line works fine on mobile); the airline/cabin row truncates with ellipsis if narrow.

The Module header's `+ Hotel` button compacts to icon-only at the smallest breakpoint (just `+`).

## 5. Visual specs (quick-reference)

| Token                                  | Value                                                          |
| -------------------------------------- | -------------------------------------------------------------- |
| Page wrapper                           | `w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12`                   |
| Module                                 | shared `Module` from `@/components/trip/Module`, `titleSize='lg'` (default) |
| Card surface                           | `bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-white/[0.08] p-4` |
| Card hover                             | `hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors` |
| Card divider between rows              | `border-b border-gray-100 dark:border-white/[0.04]` (last card no border) |
| Hotel hero                             | `88x88 rounded-xl object-cover` (desktop) / `64x64` (mobile)   |
| Hotel placeholder bg                   | `bg-[rgb(var(--trip-base-rgb)/0.10)]` w/ `Building2` icon at `text-[var(--trip-base)]` |
| Flight tile                            | `44x44 rounded-lg bg-[rgb(var(--trip-base-rgb)/0.10)]`         |
| Flight tile icon                       | `Plane` 18px, `text-[var(--trip-base)]`                        |
| Card title                             | 15px, `font-semibold text-gray-900 dark:text-white`            |
| Card meta                              | 12px, `text-gray-500 dark:text-gray-400`                       |
| Card price                             | 13px right-aligned, `text-gray-700 dark:text-gray-200 font-semibold` |
| Form field label                       | 13px font-medium gray-700                                       |
| Form input                             | h-11, rounded-xl, gray-200 border, theme focus ring (matches Settings) |
| Primary button                         | h-9 / h-11 rounded-xl, `var(--trip-base)` bg, white text       |
| Secondary button                       | h-9, white bg, gray-200 border, gray-600 text                  |
| Empty state icon                       | 32px in 48×48 tinted circle                                    |
| Empty state heading                    | 15px serif gray-700                                            |
| Empty state copy                       | 12px gray-500                                                  |

## 6. Non-goals

- **No external search APIs** for hotel/flight discovery.
- **No price comparison** — the page shows only what the user has booked.
- **No room-type catalog** for hotels — the hotel card has one price; if the user has multiple rooms in the same booking, they enter the total or use multiple bookings.
- **No image gallery** — one hero image per hotel, set via the form's image URL field.
- **No automatic IATA lookup or autocomplete** — IATA codes are 3 letters; the user types them.
- **No email parsing of booking confirmations** — manual entry only.
- **No PNR / airline API integrations.**
- **No multi-currency conversion in the cards** — the card shows the price in its stored currency. Budget already does the conversion; this surface stays raw.

## 7. Open questions

None blocking. One judgment call:

- The Hotel hero image field accepts a manual URL paste. If a future iteration adds an upload flow (Supabase Storage), it'll go through this same field — no schema change needed (`image_url` is already `string | null`).

## 8. Acceptance criteria

- The Hotels page renders inside the same outer wrapper as Settings/Budget/Packing (`w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12`) with one `Module` titled "Hotels".
- The Flights page renders the parallel structure with one `Module` titled "Flights".
- Both pages auto-display every booked record from `useItineraryScreen.hotels` / `.flights` view models — no mock data, no synthesized rows.
- Empty state renders when the view model array is empty: friendly icon + copy + secondary `+ Add` button.
- The `+ Hotel` / `+ Flight` header button opens an inline form at the top of the list.
- Submitting the form inserts a row in `flights` / `hotels` (Supabase) and the view immediately reflects it (via `queryClient.invalidateQueries`).
- Clicking a card → expands to the same inline form pre-populated with the record's data; saving updates; deleting removes.
- Hotels sort by `checkIn` ascending; Flights sort by `departureDisplay` ascending.
- IATA inputs auto-uppercase and limit to 3 chars.
- All visual tokens are theme-color via `var(--trip-base)`. No `var(--cal-*)`, no hard-coded `#003594`, no per-record blue/orange/teal palette.
- The two sub-route files (`hotels/[hotelId]/page.tsx`, `flights/[flightId]/page.tsx`) are deleted with no broken links.
- The 2021-line hotels page and 1126-line flights page are reduced to thin (~150-line) orchestrators.
- No regressions: realtime sync still works, Budget page still pulls flight/hotel costs correctly, the trip rail's hotel and flight tabs still navigate.
