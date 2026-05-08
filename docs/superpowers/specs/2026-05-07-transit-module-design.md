# Transit Module

**Date:** 2026-05-07
**Status:** Draft
**Trip area:** Ground transportation for trip itineraries

## Problem

Users need to plan ground transportation (buses, trains, shuttles, ferries, rideshares) between destinations during a trip. The calendar has a generic `"transport"` activity type, but there's no dedicated module to manage these segments — no list view, no specialized form, no unified place to see all ground transport.

## Solution

A **Transit module** — a new tab in the trip rail with a dedicated data model for ground transportation segments. Transit segments appear on the calendar as `"transport"` activities with enhanced display (vehicle type icons, route info, provider details).

**Scope: manual add only.** No search API integration in this version. The data model and module structure are designed to support search later.

## Data Model

### TransitSegment (new DB table: `transit`)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| trip_id | uuid | FK to trips |
| user_id | uuid | FK to users |
| vehicle_type | text | `train` \| `bus` \| `ferry` \| `rideshare` \| `shuttle` |
| provider | text | e.g. Amtrak, FlixBus, Uber |
| route_name | text | Display name, e.g. "Northeast Regional" |
| origin_label | text | "NYC Penn Station" |
| destination_label | text | "Boston South Station" |
| departure_at | timestamptz | ISO datetime |
| arrival_at | timestamptz | ISO datetime |
| price | numeric | nullable |
| currency | text | default "USD" |
| booking_ref | text | nullable |
| confirmation_code | text | nullable |
| notes | text | nullable |
| show_on_calendar | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### TransitData (TypeScript, JSON shape for the data column)

```typescript
interface TransitData {
  vehicleType: 'train' | 'bus' | 'ferry' | 'rideshare' | 'shuttle';
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
```

### TransitSegment (ViewModel)

```typescript
interface TransitSegment {
  id: string;
  tripId: string;
  data: TransitData;
  calendarActivityId?: string;  // ID of the mirrored calendar activity
}
```

## Calendar Integration

When `showOnCalendar` is true, creating/updating a TransitSegment creates/updates a corresponding calendar activity of type `"transport"`:

- **Title:** `"{provider} {routeName}"` or `"{originLabel} → {destinationLabel}"`
- **Type:** `"transport"` (existing blue color `#2563eb`)
- **Day/startHour:** derived from `departureAt`
- **Duration:** derived from `departureAt → arrivalAt`
- **Buffer zones:** Reuse existing `TravelConstraintBlock` — 15min pre-buffer ("Transit prep"), 10min post-buffer ("Arrival")
- **Enhanced display:** Show vehicle type emoji (🚆/🚌/⛴️/🚕/🚐), provider, route, and booking ref in the EventBlock
- **Deletion:** Deleting a TransitSegment removes the mirrored calendar activity

## Component Architecture

### New Files

| File | Responsibility |
|------|---------------|
| `apps/web/components/trip/transit/TransitModule.tsx` | Module orchestrator — list view + add button |
| `apps/web/components/trip/transit/TransitCard.tsx` | Display card for a single transit segment |
| `apps/web/components/trip/transit/TransitForm.tsx` | Add/edit form modal |
| `apps/web/components/trip/transit/TransitList.tsx` | Filterable/sortable list of transit segments |
| `apps/web/components/trip/transit/transitMutations.ts` | CRUD operations on `transit` table + calendar sync |
| `apps/web/components/trip/transit/transitViewModel.ts` | ViewModel transforms for display |

### Modified Files

| File | Change |
|------|--------|
| `apps/web/components/trip-rail.tsx` | Add "Transit" tab with 🚆 icon |
| `apps/web/components/calendar/EventBlock.tsx` | Show transit-specific details (vehicle icon, route) |
| `apps/web/components/trip/Module.tsx` | No changes needed (reusable) |
| `apps/web/components/calendar/ActivityEditModal.tsx` | Minor — enrich transport type with vehicle selector |
| `packages/shared/src/types/index.ts` | Add `TransitData`, `TransitSegment` types |
| `packages/shared/src/viewmodels/itineraryViewModel.ts` | Add `TransitViewModel` |

## Module UI

### Trip Rail

New tab in the "book" group after Cars:

```
🚗 Cars        →   🚗 Cars
                     🚆 Transit     ← NEW
🧭 Activities   →   🧭 Activities
```

### Transit List View

Similar layout to Flights module:
- Header: "Transit" title + description + "+ Add Transit" button
- Card list: each card shows vehicle type icon, provider/route, origin→destination, times, price
- Filter chips: All, Trains, Buses, Ferries, Rideshares, Shuttles
- Empty state: "No transit segments yet. Add your first bus, train, or shuttle."

### Add/Edit Form

Modal with fields:
1. **Vehicle type** — pill selector (Train/Bus/Ferry/Rideshare/Shuttle)
2. **Provider** — text input (e.g. Amtrak, FlixBus)
3. **Route name** — text input (e.g. "Northeast Regional")
4. **Origin** — text input
5. **Destination** — text input
6. **Departure** — date + time pickers
7. **Arrival** — date + time pickers
8. **Price** — number input with currency selector
9. **Booking ref** — text input
10. **Confirmation code** — text input
11. **Notes** — textarea
12. **Show on calendar** — toggle (default on)

## Supabase Schema

```sql
create table transit (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null references profiles(id),
  vehicle_type text not null check (vehicle_type in ('train', 'bus', 'ferry', 'rideshare', 'shuttle')),
  provider text,
  route_name text,
  origin_label text,
  destination_label text,
  departure_at timestamptz not null,
  arrival_at timestamptz not null,
  price numeric,
  currency text default 'USD',
  booking_ref text,
  confirmation_code text,
  notes text,
  show_on_calendar boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index transit_trip_id_idx on transit(trip_id);
```

## Data Flow

```
User adds transit in module
  → transitMutations.addTransit()
    1. INSERT into `transit` table (Supabase)
    2. If showOnCalendar:
       → Create/update calendar activity with type "transport"
       → Store transitSegmentId in activity_data
```

```
Calendar renders transit activity
  → EventBlock checks activity_data.transitSegmentId
  → If found, enhances display with vehicle type icon + route info
  → Click opens TransitForm (not ActivityEditModal)
```

## Out of Scope (v1)

- Search API integration (SerpAPI transit, Google Transit, etc.)
- Real-time departure/arrival tracking
- Map integration showing transit routes
- Public transit directions within a city
- Multi-segment journey builder
