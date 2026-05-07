# Hotels & Flights Search-First Redesign

**Date:** 2026-05-06
**Branch:** develop
**Status:** Spec — pending implementation

## Goal

Replace manual-input forms on the Hotels and Flights tabs with provider-backed search → select → add flow. Users no longer type vendor names, dates, or flight numbers by hand — they search live inventory from the existing `/api/hotels/search` and `/api/flights/search` endpoints, pick a result, and the system maps the result to the existing `addHotel` / `addFlight` mutations.

## Non-goals

- **Trip-creation auto-population.** "Generated with the trip if it deems necessary" is the natural follow-up but lives in the trip generation pipeline, not the trip pages. Listed in Future Work.
- **Cars search.** No `/api/cars/search` endpoint exists. Cars page stays as-is.
- **In-product booking / checkout.** Search results expose the provider's external link (Google Hotels / Google Flights). No booking flow inside the product.
- **DB migrations.** Existing `FlightData` and `HotelData` shapes are kept verbatim. No new columns.
- **Saved-search persistence.** Every search is fresh; no "recent searches" feature.
- **Filters/sorts beyond what the route already supports.** Sort by `lowest_price` is already wired; neighborhood/amenity filters are deferred.

## Architecture

Single pattern shared by both pages, three vertically stacked sections inside the existing `Module` shell:

1. **Search panel** — destination/from-to inputs, dates, party size, search button.
2. **Results pane** — appears after Search clicked. Provider-backed cards with "Add to trip" action.
3. **Saved list** — existing `HotelCard` / `FlightCard` rendering, edit-in-place for metadata only.

Search and results are sibling components inside the Module. The CRUD layer (`addHotel`, `addFlight`, mutation files, view models, realtime subscription) is unchanged — only the UI feeding the mutations changes.

## Data flow

### Hotels

```
HotelSearchPanel
  → fetch('/api/hotels/search?destination=&check_in=&check_out=&guests=&sort=3')
  → SerpAPI Google Hotels
  → HotelResultsList renders provider cards
  → user clicks "Add"
  → mapSerpHotelToHotelData(result, formInputs)
  → addHotel(tripId, data)
  → invalidateQueries(['trip', tripId])
  → saved list updates via realtime
```

**Field mapping** (`SerpHotel` → `HotelData`):

| `HotelData` field   | Source                                                   |
|---------------------|----------------------------------------------------------|
| `name`              | `result.name`                                            |
| `address`           | `result.address`                                         |
| `latitude`          | `result.lat`                                             |
| `longitude`         | `result.lng`                                             |
| `check_in`          | search panel input (default = `trip.start_date`)         |
| `check_out`         | search panel input (default = `trip.end_date`)           |
| `price_per_night`   | `result.price` (per-night USD, parsed from SerpAPI)      |
| `total_price`       | `price_per_night × nights` (computed)                    |
| `currency`          | `'USD'` (SerpAPI route hardcodes)                        |
| `rating`            | `result.rating`                                          |
| `star_rating`       | `result.stars`                                           |
| `image_url`         | `result.images[0]`                                       |
| `booking_ref`       | `null` (user adds later if applicable)                   |
| `offer_id`          | `result.id` (SerpAPI synthetic ID, used for de-dupe UX)  |

### Flights

```
FlightSearchPanel
  → AirportAutocomplete (from)  ─┐
  → AirportAutocomplete (to)    ─┤   → /api/airports?q= → Duffel
  → fetch('/api/flights/search?origin=IATA&destination=IATA&date=&return=&passengers=&class=')
  → SerpAPI Google Flights
  → FlightResultsList renders flights with tabs (Best / Cheapest / Fastest) + expandable legs
  → user clicks "Add"
  → mapSerpFlightToFlightData(flight, formInputs)
  → addFlight(tripId, data)
  → invalidateQueries(['trip', tripId])
```

**Field mapping** (`SerpFlight` → `FlightData`):

| `FlightData` field   | Source                                              |
|----------------------|-----------------------------------------------------|
| `airline`            | `flight.legs[0].airline`                            |
| `flight_number`      | `flight.legs[0].flightNumber`                       |
| `origin_iata`        | `flight.legs[0].departure.id`                       |
| `origin_name`        | `flight.legs[0].departure.airport`                  |
| `dest_iata`          | `flight.legs[lastIdx].arrival.id`                   |
| `dest_name`          | `flight.legs[lastIdx].arrival.airport`              |
| `departure_at`       | `flight.legs[0].departure.time` (ISO)               |
| `arrival_at`         | `flight.legs[lastIdx].arrival.time` (ISO)           |
| `price`              | `flight.price`                                      |
| `currency`           | `'USD'`                                             |
| `cabin_class`        | `flight.legs[0].travelClass`                        |
| `booking_ref`        | `null`                                              |
| `offer_id`           | `flight.id` (SerpAPI synthetic, e.g. `best-3`)      |

**Multi-leg handling:** Flights with layovers are stored end-to-end (first leg's origin → last leg's destination, first leg's airline). Layover detail is shown in the search-result card (number of stops, layover airport, layover duration), but the saved record collapses to a single `FlightData` row. Users tracking layovers as separate records can add each leg as a separate flight — same as today.

## Components

### New files

```
apps/web/components/trip/hotels/
  HotelSearchPanel.tsx        — search inputs (destination, dates, guests) + submit
  HotelResultCard.tsx         — single SerpAPI result card with "Add to trip" button
  HotelResultsList.tsx        — list/grid wrapper with loading + empty states
  hotelSearch.ts              — types (SerpHotel, HotelSearchResponse), fetch helper, mapSerpHotelToHotelData

apps/web/components/trip/flights/
  FlightSearchPanel.tsx       — from/to airport autocomplete + dates + passengers + cabin
  AirportAutocomplete.tsx     — Duffel-backed combobox (debounced, keyboard-navigable)
  FlightResultCard.tsx        — single flight card (collapsed: airline, times, stops, price; expand: leg list)
  FlightResultsList.tsx       — tabs (Best / Cheapest / Fastest), loading, empty
  flightSearch.ts             — types (SerpFlight, FlightSearchResponse), fetch helper, mapSerpFlightToFlightData
```

### Changed files

```
apps/web/components/trip/hotels/HotelsModule.tsx
  — replace inline-add CTA with HotelSearchPanel + HotelResultsList sections above saved list
  — keep saved list (existing HotelCard usage)
  — keep ?expand= deep-linking and hotels:add CustomEvent listener (header "+ Hotel" button now opens search panel)

apps/web/components/trip/hotels/HotelForm.tsx
  — gut. Becomes "edit saved hotel" only.
  — Read-only: name, address, latitude, longitude, image_url, rating, star_rating
  — Editable: check_in, check_out, price_per_night, total_price, currency, booking_ref, notes
  — No "Add hotel" path through this form

apps/web/components/trip/flights/FlightsModule.tsx
  — same shape as HotelsModule: search panel + results pane + saved list
  — flights:add CustomEvent now opens search panel

apps/web/components/trip/flights/FlightForm.tsx
  — same gutting: edit-only mode
  — Read-only: airline, flight_number, origin_iata, origin_name, dest_iata, dest_name, departure_at, arrival_at, cabin_class
  — Editable: price, currency, booking_ref
```

### Unchanged

- `addHotel`, `addFlight`, `updateHotel`, `updateFlight`, `deleteHotel`, `deleteFlight` mutations.
- `HotelCard`, `FlightCard` view components.
- `useItineraryScreen` hook (still produces `hotels`, `flights` view models).
- Realtime postgres_changes channel.
- `Module` shell, `BookingFormPrimitives`.
- All Supabase tables and types.

## Edge cases

- **API key missing** (`SERPAPI_KEY` or `DUFFEL_API_TOKEN` unset): `/api/hotels/search` and `/api/flights/search` already return `{ hotels: [], total: 0 }` / 503 gracefully. UI surfaces "Search unavailable — contact admin" instead of cards. `/api/airports` returns `[]` so the autocomplete shows "No airports found."
- **No results for valid query** (SerpAPI returned 0 properties): empty state with "No matches for these dates. Try adjusting your search." No manual-add escape hatch — the explicit product requirement is search-first only. Off-platform bookings (Airbnb, etc.) are out of scope; Future Work covers adding more provider adapters if needed.
- **Rate limit hit** (10 req/min on hotels/flights, 60 req/min on airports): route returns 429. Surface inline error in search panel: "Too many searches — try again in a minute."
- **SerpAPI partial / malformed response**: route already filters to required fields and returns `{ hotels: [] }` on parse failure. No additional client-side handling needed.
- **Same hotel added twice**: allow it. Multiple bookings for one property is a real use case (split stay, group booking). De-dupe is UX-only — show a "Already added" badge on a result card if a hotel with the same `offer_id` is already saved, but don't block adding it again.
- **Network failure mid-search**: standard React Query retry behavior (3x, exponential). Final failure shows toast "Search failed — check connection."
- **Trip without start/end dates**: search panel still works but the date inputs are required-empty. Submit disabled until user provides dates inline. Fallback when the dates exist on the trip: prefill them.
- **Multi-airline flights**: `airline` field stores the first leg's carrier. Result card displays "Operated by X + Y" for multi-airline trips so the user is aware before saving.

## Component contracts

### `HotelSearchPanel`

```ts
interface HotelSearchPanelProps {
  trip: { id: string; destination: string; start_date: string; end_date: string }
  onResultsChange: (state: { loading: boolean; results: SerpHotel[]; error: string | null }) => void
}
```

Owns its own form state (destination, check_in, check_out, guests). Calls `/api/hotels/search` on submit. Reports state up via `onResultsChange`. Re-search clears prior results.

### `HotelResultCard`

```ts
interface HotelResultCardProps {
  hotel: SerpHotel
  alreadySaved: boolean   // computed by parent from saved hotels
  onAdd: (hotel: SerpHotel) => Promise<void>
  formInputs: { check_in: string; check_out: string; guests: number }
}
```

Renders one provider result. "Add to trip" calls `onAdd`, which the parent maps via `mapSerpHotelToHotelData` and passes to `addHotel`. Disabled state during in-flight add.

### `HotelResultsList`

```ts
interface HotelResultsListProps {
  state: { loading: boolean; results: SerpHotel[]; error: string | null }
  savedOfferIds: Set<string>
  onAdd: (hotel: SerpHotel) => Promise<void>
  formInputs: HotelSearchInputs
}
```

Renders skeleton / empty / error / cards based on state.

### `FlightSearchPanel`

```ts
interface FlightSearchPanelProps {
  trip: { id: string; destination: string; start_date: string; end_date: string }
  onResultsChange: (state: { loading: boolean; results: SerpFlight[]; error: string | null }) => void
}
```

Owns from/to airport state, dates, passengers, cabin. Both airport fields use `AirportAutocomplete`. Calls `/api/flights/search` on submit.

### `AirportAutocomplete`

```ts
interface AirportAutocompleteProps {
  value: { iata: string; name: string; city: string } | null
  onChange: (value: AirportAutocompleteProps['value']) => void
  label: string                  // "From" / "To"
  invalid?: boolean
}
```

Debounced (200ms) `/api/airports?q=` calls. Keyboard arrow-key navigation through results. Selection sets the IATA + display name.

### `FlightResultCard` / `FlightResultsList`

Mirror the hotel components. Tabs in `FlightResultsList` filter by `tier` (`best` / `other`) plus client-side sort variants (cheapest by `price`, fastest by `totalDuration`).

## File-size guardrails

- Each new component ≤200 lines.
- Search/results/list separation enforces single-purpose files.
- Field mappers (`mapSerpHotelToHotelData`, `mapSerpFlightToFlightData`) live in their respective `*Search.ts` modules — pure functions, easy to unit-test.

## Testing strategy

- **Unit**: `mapSerpHotelToHotelData` and `mapSerpFlightToFlightData` mappers (vitest, node env, pure functions).
- **Unit**: search response → state machine for loading/empty/error transitions.
- **Manual**: dev server walkthrough — search hotels in Tokyo for valid dates, add one, edit booking_ref, delete; same for flights NRT→LAX. Verify saved data persists across refresh and propagates via realtime.
- **Manual**: rate-limit, missing-key, no-results paths via setting envs to invalid / spamming requests.

## Future work (not in this spec)

- **Trip-creation auto-population**: hook the trip generation pipeline to call `/api/hotels/search` and `/api/flights/search` for the trip's destination and dates, picking top-rated / cheapest results. Lives in trip-create, not trip-pages.
- **Cars search adapter**: wire an Avis/Hertz/Kayak provider to a new `/api/cars/search` route, then apply this same pattern to the Cars page.
- **In-product booking**: Duffel for flights supports actual offer/order creation. Hotels via Booking.com or similar partner program.
- **Saved searches / recents**: persist search state per user/trip.
- **Provider-aware filters**: amenity filters for hotels, layover-cap filters for flights.
- **Multi-leg as separate records**: optional UI to expand a multi-leg flight into one saved record per leg, for users who want fine-grained tracking.
