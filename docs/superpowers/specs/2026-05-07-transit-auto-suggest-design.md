# Transit Auto-Suggest

**Date:** 2026-05-07
**Status:** Draft
**Trip area:** Transit page — auto-detecting transit routes from the trip itinerary

## Problem

The transit page requires users to manually add transit bookings or manually search for routes. It doesn't leverage the trip's existing itinerary data (activities with coordinates organized by day) to automatically suggest available transit options between consecutive locations.

## Solution

Auto-detect consecutive location pairs from the itinerary, query the OTP transit routing service for each pair on page load, and display results organized by day in the transit page — with one-click saving.

## Approach

### Route Pair Detection

A utility function `detectRoutePairs(trip, days, transitBookings)` that:

1. **Groups activities by day** using `ItineraryDayViewModel[]` from `useItineraryScreen`
2. **Filters to items with coordinates** (lat/lng) — skips activities without location data
3. **Builds consecutive pairs within each day** — activity 1 → activity 2, activity 2 → activity 3, etc.
4. **Builds cross-day pairs** — last coordinate-activity of day N → first coordinate-activity of day N+1
5. **Skips pairs already booked** — if a transit booking exists with matching origin/destination proximity, skip
6. **Deduplicates identical route pairs** across days (same origin/dest coords reused)

**Output:** `RoutePair[]` where each item has:
```ts
interface RoutePair {
  id: string;                    // deterministic hash of origin+dest+dayIndex
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  dayIndex: number;
  type: 'within-day' | 'cross-day';
  departureTime: string | null;  // first activity's start time, if available
}
```

### Data Flow & Caching

On transit page mount:

1. `useItineraryScreen` already provides trip, days, hotels, transit bookings — reuse
2. `detectRoutePairs()` runs synchronously to produce the pair list
3. Each pair fires an OTP search via a **dedicated React Query** — key pattern:
   ```
   ['transit-suggestions', tripId, routePair.id]
   ```
4. **Parallel batching** — fire searches in batches of 4, queue the rest
5. **Stale time: 30 minutes** — caching avoids redundant OTP calls
6. **Auto-invalidation** — the existing real-time Supabase subscription already invalidates on trip/itinerary/activity/transit changes. Transit table changes also invalidate relevant pair suggestions.
7. **Cache per-pair** rather than per-trip — when a booking is saved for a route, only that pair's cache is invalidated

### Page Layout (Hybrid)

The transit page is restructured into three zones:

```
┌─────────────────────────────────┐
│  Header: "Transit" + Search btn │
├─────────────────────────────────┤
│  Saved Transit Bookings         │
│  (existing cards, if any)       │
├─────────────────────────────────┤
│  Custom Search (collapsible)     │
│  (existing TransitSearchPanel)   │
├─────────────────────────────────┤
│  Day 1 — Mon, Jun 5             │
│  ├─ Hotel A → Museum B          │
│  │  └─ [Train 20min $5] [Add]   │
│  ├─ Museum B → Restaurant C     │
│  │  └─ [Bus 10min $2] [Add]     │
│  └─ Restaurant C → Gallery D    │
│     └─ [Walk 5min] [Add]        │
├─────────────────────────────────┤
│  Day 2 — Tue, Jun 6             │
│  └─ ...                         │
├─────────────────────────────────┤
│  Between Days                   │
│  └─ Gallery D → Hotel A (next)  │
│     └─ [Train 40min $8] [Add]   │
└─────────────────────────────────┘
```

### Components

| Component | Purpose |
|---|---|
| `TransitRoutePairCard` | Displays one route pair (origin → destination) with OTP results: loading skeleton, results list (up to 3 options), error with retry, or "saved" state |
| `TransitDaySection` | Collapsible section for a day's route pairs, with day label and date |
| `TransitBetweenDaysSection` | Section for cross-day route pairs |
| `TransitsModule` (modified) | Integrates auto-suggest flow alongside existing saved bookings and manual search |

### Interactions

- **Add a suggestion:** Saves OTP result as a `TransitData` booking via the existing `addTransit` mutation. The pair card switches to "Saved" state and the booking appears in the "Saved Bookings" section.
- **Retry on error:** Each failed pair has an independent retry button (the pair's full search params are stored in a ref).
- **Itinerary change:** Real-time subscription invalidates trip data → `useItineraryScreen` re-renders → `detectRoutePairs` re-runs → new pairs auto-search, stale pairs drop, cached pairs show instantly.
- **Manual add fallback:** "+ Manual" button opens the existing `TransitForm` for edge cases.

### Loading States

- **Per-pair skeleton:** Each `RoutePairCard` shows a shimmer while its OTP query is in flight
- **Progressive population:** Results appear pair-by-pair as they arrive (no blocking on all pairs)
- **Error state:** Individual pair shows error message with retry — other pairs unaffected

### Files Changed

- `apps/web/components/trip/transit/TransitsModule.tsx` — integrate auto-suggest flow
- `apps/web/components/trip/transit/TransitRoutePairCard.tsx` — **new**
- `apps/web/components/trip/transit/TransitDaySection.tsx` — **new**
- `apps/web/components/trip/transit/TransitBetweenDaysSection.tsx` — **new**
- `packages/shared/src/hooks/useItineraryScreen.ts` — optionally expose raw activity coords if needed
- `apps/web/app/(dashboard)/trip/[id]/transit/page.tsx` — minor layout adjustments
