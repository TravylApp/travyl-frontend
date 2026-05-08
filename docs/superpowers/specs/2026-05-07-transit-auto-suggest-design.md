# Transit Auto-Suggest

**Date:** 2026-05-07
**Status:** Draft
**Trip area:** Transit page — auto-detecting transit routes from the trip itinerary

## Problem

The transit page requires users to manually add transit bookings or manually search for routes. It doesn't leverage the trip's existing itinerary data (activities with coordinates organized by day) to automatically suggest available transit options between consecutive locations.

## Solution

Auto-detect consecutive location pairs (including hotels) from the itinerary, query the OTP transit routing service for each pair on page load, and display results organized by day in the transit page — with one-click saving.

## Prerequisites: Add Coordinates to ViewModels

### ActivityViewModel

`packages/shared/src/viewmodels/itineraryViewModel.ts` — `ActivityViewModel` currently lacks `latitude`/`longitude`:

1. Add `latitude: number | null` and `longitude: number | null` to `ActivityViewModel`
2. Update `buildActivityViewModel()` to map from the raw `Activity` type (which has these fields)
3. In `useItineraryScreen.ts`, replace the `lat`/`lng` fields in `buildDaysFromContext()` with `latitude`/`longitude` to match the typed interface. Remove the old `lat`/`lng` properties entirely.
4. `mergeUserActivities()` objects (lines 299-300) already use `latitude`/`longitude` — no change needed.
5. `buildDaysFromExploreItems()` creates anonymous activity objects without coordinates at all. These will naturally have `null` for both fields, which is fine — `detectRoutePairs` filters to items with coordinates, so these are skipped.

### HotelViewModel

`HotelViewModel` currently lacks `latitude`/`longitude` even though the raw `HotelData` type has them:

1. Add `latitude: number | null` and `longitude: number | null` to `HotelViewModel`
2. Update `buildHotelViewModel()` to map from `HotelData`

## Route Pair Detection

A utility function `detectRoutePairs(trip, days, hotels, transitBookings)` that:

1. **Groups activities by day** using `ItineraryDayViewModel[]` from `useItineraryScreen`
2. **Includes hotels as route endpoints** — for each day, the hotel with coordinates (if any) is prepended as the first origin and appended as the final destination. This covers "hotel → first activity" and "last activity → hotel" legs automatically. Hotel-to-day mapping uses `checkIn`/`checkOut` dates: a hotel applies to days where `dayDate >= hotel.checkIn && dayDate < hotel.checkOut`. If no hotel matches a day, no hotel is prepended. Trip-context-only hotels (no DB row) won't have `HotelViewModel` entries and thus aren't included.
3. **Filters to items with coordinates** (lat/lng) — skips activities/locations without coordinate data
4. **Builds consecutive pairs within each day** — location 1 → location 2, location 2 → location 3, etc.
5. **Builds cross-day pairs** — last coordinate-location of day N → first coordinate-location of day N+1
6. **Skips pairs already booked** — if a transit booking exists with matching origin/destination proximity (within ~100m), skip that pair
7. **Deduplicates identical route pairs** across days — if the same origin/destination coordinates appear in multiple days, the pair is shown once in the first day it appears. Duplicates aren't shown.
8. **Skips same-location pairs** — if origin and destination coordinates are within ~100m of each other (e.g., same hotel used across consecutive days, or two activities at the same venue), skip that pair.

**Date resolution:** ISO dates for OTP departure times are computed from `trip.start_date + dayIndex` offset (since `ItineraryDayViewModel` only has a formatted display string, not a raw date). This avoids adding more fields to the view model.

**Output:** `RoutePair[]`:
```ts
interface RoutePair {
  id: string;                    // string key: `${dayIndex}:${lat.toFixed(4)},${lng.toFixed(4)}>${lat.toFixed(4)},${lng.toFixed(4)}`
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  dayIndex: number;              // origin day's index (for within-day pairs this is the day; for cross-day pairs this is the departing day)
  type: 'within-day' | 'cross-day';
  departureTime: string;         // ISO datetime: computed as ${dayDate}T12:00:00
}
```

### Data Flow & Caching

On transit page mount:

1. The page component (`transit/page.tsx`) calls `useItineraryScreen` which provides trip, days, hotels, transit bookings
2. `days` and `hotels` are passed as props to the modified `TransitsModule`. The module keeps its existing independent transit data fetch (avoiding type mismatches between `TransitViewModel` and `TransitCardViewModel`).
3. `detectRoutePairs()` runs synchronously to produce the pair list
4. Each pair fires an OTP search via a **dedicated React Query** — key pattern:
   ```
   ['transit-suggestions', tripId, routePair.id]
   ```
5. **Concurrency limit of 4** — install `p-limit` in `apps/web`. All requests are fired immediately; max 4 execute in parallel at any time. Remaining requests automatically queue and execute as slots open.
6. **Stale time: 30 minutes** — caching avoids redundant OTP calls. Navigate away and back: instant.
7. **Cache invalidation on booking save:** The `addTransit` / `deleteTransit` mutation's `onSuccess` callback must also invalidate `['transit-suggestions', tripId]` (wildcard) to clear cached suggestions for now-booked pairs. When a pair is saved, it should no longer appear as a suggestion.
8. **Cache per-pair** via React Query — each pair is independent. Saving a booking for pair A doesn't re-fetch pair B (the wildcard invalidation clears all, but React Query re-fetches only the currently visible pairs).

### Page Layout (Hybrid)

```
┌─────────────────────────────────┐
│  Header: "Transit" + Search btn │
├─────────────────────────────────┤
│  Saved Transit Bookings         │
│  (existing TransitCard list)    │
├─────────────────────────────────┤
│  Custom Search (collapsible)     │
│  (existing TransitSearchPanel)   │
├─────────────────────────────────┤
│  Suggested Routes               │
│                                 │
│  Day 1 — Mon, Jun 5             │
│  ├─ Hotel A → Museum B          │
│  │  └─ [Train 20min $5] [Add]   │
│  ├─ Museum B → Restaurant C     │
│  │  └─ [Bus 10min $2] [Add]     │
│  └─ Restaurant C → Gallery D    │
│     └─ [Walk 5min] [Add]        │
│                                 │
│  Day 2 — Tue, Jun 6             │
│  ├─ Hotel A → Park E            │
│  │  └─ [Subway 15min $3] [Add]  │
│  └─ Park E → Museum F           │
│     └─ [Bus 8min $2] [Add]      │
│                                 │
│  Between Days                   │
│  └─ Gallery D → Hotel A (next)  │
│     └─ [Train 40min $8] [Add]   │
└─────────────────────────────────┘
```

**Between Days section** is positioned immediately after the origin day's section. The cross-day pair's `dayIndex` references the departing day, so the "Between Days" section for day N→N+1 appears right after Day N's section.

**Empty state logic updated:** The "No transit bookings yet" empty state only shows when there are zero bookings AND zero detectable route pairs (no itinerary activities with coordinates). When route pairs exist, the suggestions section shows immediately regardless of saved booking count.

### Components

| Component | Purpose |
|---|---|
| `TransitRoutePairCard` | Displays one route pair (origin → destination name/label) with OTP results. States: loading skeleton, results list (up to 3 transit options sorted by duration), error with retry, or "no routes found" |
| `TransitDaySection` | Collapsible section wrapper for a day's route pairs. Header shows day label + date. Chevron to collapse/expand. |
| `TransitBetweenDaysSection` | Section for cross-day route pairs, shown after the origin day's section. |
| `TransitsModule` (modified) | Receives `days` and `hotels` as new props from parent page. Integrates auto-suggest flow alongside existing saved bookings and manual search. Keeps its own independent transit data fetch for saved bookings. |

### TransitRoutePairCard Details

Each card shows:
- Origin label (with location icon) → arrow → Destination label
- Loading: shimmer skeleton (light gray bars for route options)
- Results: up to 3 transit options, each showing:
  - Mode icon — the transit module already uses `lucide-react` (Train, Bus, Ship, CableCar icons per existing TransitCard)
  - Duration (e.g. "20 min")
  - Fare (e.g. "$5.00") — if available from OTP
  - Line/carrier name
  - "Add" button per option
- Error: red text + "Retry" button (retries that specific pair)
- "No routes found": subtle text indicating no transit available between these points
- After "Add": the card is removed from suggestions (deduplication means it appeared once, so one removal is sufficient)

### Interactions

- **Add a suggestion:** Saves OTP result as a `TransitData` booking via the existing `addTransit` mutation. The mutation's `onSuccess` invalidates both `['transit', tripId]` (to refresh saved bookings) and `['transit-suggestions', tripId]` (to remove the now-booked pair from suggestions). The route pair card disappears from the suggestions section.
- **Retry on error:** Each failed pair has an independent retry button. The pair's search params are stored in a ref for replay.
- **Itinerary change:** Real-time subscription invalidates trip data → page re-renders → `detectRoutePairs` re-runs → new pairs auto-search, stale pairs drop, cached pairs show instantly.
- **Custom search:** The existing `TransitSearchPanel` remains as a collapsible section at the top. It works independently of the auto-suggest section.
- **Manual add fallback:** "+ Manual" button opens the existing `TransitForm` for edge cases (e.g., booking a ride that's not in the itinerary).

### Loading States

- **Per-pair skeleton:** Each `TransitRoutePairCard` shows a shimmer while its OTP query is in flight
- **Progressive population:** Results appear pair-by-pair as they arrive — no blocking on all pairs
- **Error state:** Individual pair shows error message with retry. Other pairs unaffected.
- **No results state:** OTP returns empty itineraries → "No transit routes found" text (not an error)

### Files Changed

- `packages/shared/src/viewmodels/itineraryViewModel.ts` — add `latitude`/`longitude` to `ActivityViewModel` and `HotelViewModel`; update `buildActivityViewModel` and `buildHotelViewModel`
- `packages/shared/src/hooks/useItineraryScreen.ts` — normalize `lat`/`lng` to `latitude`/`longitude` in `buildDaysFromContext`
- `apps/web/components/trip/transit/TransitsModule.tsx` — accept `days`, `hotels` as new props; integrate auto-suggest flow; fix empty state conditional; update mutation `onSuccess` to invalidate suggestion cache
- `apps/web/components/trip/transit/detectRoutePairs.ts` — **new**: the utility function for detecting route pairs from itinerary days + hotels + existing bookings
- `apps/web/components/trip/transit/TransitRoutePairCard.tsx` — **new**
- `apps/web/components/trip/transit/TransitDaySection.tsx` — **new**
- `apps/web/components/trip/transit/TransitBetweenDaysSection.tsx` — **new**
- `apps/web/app/(dashboard)/trip/[id]/transit/page.tsx` — pass `days` and `hotels` to TransitsModule
- `apps/web/package.json` — add `p-limit` dependency

### Out of Scope

- Walking-only routes as primary suggestions (OTP may return them but they're deprioritized)
- Real-time transit tracking or delay information
- Multi-city transit (e.g., train from Paris to London involving multiple OTP queries)
- Transit pass / multi-ride ticket suggestions
