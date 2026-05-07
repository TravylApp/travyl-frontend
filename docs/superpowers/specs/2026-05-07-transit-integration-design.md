# Global Transit Integration Design

**Date:** 2026-05-07
**Status:** Draft
**Feature:** Multi-modal public transit integration for Travyl trip planning

---

## 1. Overview

Add comprehensive public transit support to Travyl — covering trains, buses, subways, trams, light rail, and ferries globally. Users can search point-to-point transit directions and save specific transit legs as trip bookings.

### Goals
- Search transit directions between any two locations worldwide
- Save transit legs as trip bookings (like flights/hotels/cars)
- Support all major transit modes
- Cover global transit (US, Europe, Japan, Asia)
- Follow existing Flights/Cars/Hotels component patterns

### Non-Goals
- Real-time transit tracking (arrival times in motion)
- Transit ticket purchasing
- Offline transit data
- Transit pass/rail pass integration (e.g., JR Pass)
- Mobile (Expo) transit support (web-only for this feature)

---

## 2. Architecture

### API Strategy (Self-hosted OTP + GTFS)

| Provider | Role | Coverage | Cost |
|----------|------|----------|------|
| OpenTripPlanner (self-hosted) | Primary transit routing engine | Anywhere with GTFS data loaded | Server costs only (~$30-60/mo) |
| GTFS (Mobility Database) | Transit schedule/route data source | 6,000+ feeds from 99+ countries | Free |
| ODPT (Japan) | Japan GTFS feed source | JR East, Tokyo Metro, private railways | Free |
| Transitland | GTFS feed discovery + metadata | Catalog of 5,000+ agencies | Free tier |
| GraphHopper | Walking/cycling/driving fallback | Already integrated | Already have key |

### Infrastructure: OpenTripPlanner Server

An OTP server runs on AWS, consuming GTFS schedules + OSM street maps:

- **Platform:** AWS ECS Fargate (Docker container) or EC2
- **Specs:** 4GB-8GB RAM for regional graphs; Japan needs ~12GB for full graph
- **Graph building:** Scheduled job downloads GTFS feeds + OSM extracts, builds OTP graph
- **Regional strategy:** Separate OTP instance per region (Japan, US, Europe) or one large instance
- **API:** OTP exposes REST + GraphQL routing endpoints. SST Lambda calls these internally.

### Data Flow

```
User Search A→B
    │
    ▼
Next.js API Route (/api/transit/search)
    │
    ▼
SST Lambda (services/transit-search.ts)
    │
    ├── 1. Determine which OTP region covers the search area
    │
    ├── 2. Check DynamoDB cache (30min TTL)
    │   └── Hit → return cached result
    │
    └── 3. Miss → OTP routing API on ECS/EC2
        │
        ├── Success → cache result → return
        └── Fail → GraphHopper fallback (non-transit directions only)
```

### GTFS Data Sources by Region

| Region | Data Source | Update Cadence |
|--------|-------------|---------------|
| Japan | ODPT GTFS (odpt.org) — JR East, Tokyo Metro, Toei, private railways | Weekly |
| US — SF Bay Area | 511.org regional feed (Muni, BART, Caltrain, AC Transit, VTA) | Monthly |
| US — NYC | MTA developer portal (subway, bus, LIRR, Metro-North) | Monthly |
| US — general | Transitland / Mobility Database | As needed |
| Europe | Open data portals + Transitland | As needed |

**Data flow for useTransit hook:**
- `useTransit(tripId)` calls Next.js proxy at `/api/transit/bookings?trip_id=xxx`
- Next.js proxy forwards to SST Lambda `GET /transit/bookings`
- Lambda queries Supabase `transit_bookings` table directly (matching flights pattern)
- Mutations (add/update/delete) follow same path: Next.js proxy → SST Lambda → Supabase

### Caching

Reuse the existing `RecommendationCache` DynamoDB table. Keys follow this schema:
- Partition key (`pk`): `transit:{sha256_hash}` — the `transit:` prefix distinguishes transit entries from suggest cache entries (which use `{userId}:{destination}`)
- Sort key (`sk`): `directions` (static; all transit cache entries share this)
- TTL: 30 minutes (DynamoDB TTL field)
- No additional table needed

Cache key hash is SHA-256 of `origin_lat,lng|dest_lat,lng|departure_time|modes`.

---

## 3. Data Model

### Database Table: `transit_bookings`

```sql
CREATE TABLE transit_bookings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id),
  origin      JSONB NOT NULL,       -- { lat, lng, label }
  destination JSONB NOT NULL,       -- { lat, lng, label }
  departure_at    TIMESTAMPTZ NOT NULL,
  arrival_at      TIMESTAMPTZ,
  route_data  JSONB NOT NULL,       -- full TransitDirectionResult
  booking_ref TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transit_bookings_trip ON transit_bookings(trip_id);
```

### TypeScript Types (in `packages/shared/src/types/index.ts`)

```typescript
export type TransitMode =
  | 'train'
  | 'bus'
  | 'subway'
  | 'tram'
  | 'light_rail'
  | 'ferry'
  | 'cable_car'
  | 'funicular';

export interface TransitDirectionStep {
  mode: TransitMode;
  line: string;
  line_color?: string;
  carrier: string;
  origin_stop: string;
  origin_stop_id?: string;
  destination_stop: string;
  destination_stop_id?: string;
  departure_at: string;
  arrival_at: string;
  duration_minutes: number;
  distance_meters?: number;
  num_stops?: number;
}

export interface TransitDirectionResult {
  id: string;
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  departure_at: string;
  arrival_at: string;
  total_duration_minutes: number;
  total_distance_meters?: number;
  fare?: { amount: number; currency: string };
  steps: TransitDirectionStep[];
  leg_count: number;
  provider: 'otp';
}

export interface TransitBookingData {
  id: string;
  trip_id: string;
  user_id: string;
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  departure_at: string;
  arrival_at?: string;
  route_data: TransitDirectionResult;
  booking_ref?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Input type for creating a new booking (omits server-generated fields)
export type CreateTransitBookingInput = Omit<TransitBookingData, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
```

---

## 4. Backend Services

### `services/transit-search.ts` — New Lambda

- **Route:** `GET /transit/directions`
- **Params:** `origin_lat`, `origin_lng`, `dest_lat`, `dest_lng`, `departure_time` (ISO), `modes` (comma-separated, optional)
- **Logic:**
  1. Check DynamoDB cache → return if fresh
  2. Call OTP routing API (REST endpoint on ECS/EC2) with origin, destination, departure time
  3. Parse OTP response into `TransitDirectionResult`
  4. Cache result in DynamoDB (30min TTL)
  5. Return result
- **Auth:** Call `validateAuth()` at the start (matching `services/transit.ts`)
- **Timeout:** 20s (matching existing transit.ts pattern)
- **Error states:**
  - No routes found → empty array
  - API failure → cached stale data if available, else error

### `services/transit-bookings.ts` — New Lambda

- **Route:** `POST /transit/book` — create booking
- **Route:** `GET /transit/bookings?trip_id=xxx` — list bookings for trip
- **Route:** `PUT /transit/book/{id}` — update booking
- **Route:** `DELETE /transit/book/{id}` — delete booking
- **Logic:** Direct Supabase `transit_bookings` CRUD (matching flights pattern)
- **Auth:** Call `validateAuth()` at the start of every handler (matching existing patterns)

### Existing `services/transit.ts` — Update

Keep as-is for driving/walking/cycling directions and route optimization.

### SST Infra Updates (`infra/api.ts`)

```typescript
// Transit directions
api.route('GET /transit/directions', 'services/transit-search.handler', { timeout: 20 });

// Transit bookings CRUD
api.route('GET /transit/bookings', 'services/transit-bookings.listHandler');
api.route('POST /transit/book', 'services/transit-bookings.createHandler');
api.route('PUT /transit/book/{id}', 'services/transit-bookings.updateHandler');
api.route('DELETE /transit/book/{id}', 'services/transit-bookings.deleteHandler');
```

### Secrets
- `otpServerUrl` — new SST secret in `infra/secrets.ts` for the OTP server endpoint URL
- `otpApiKey` — new SST secret for authenticating between Lambda and OTP server
- No external paid API keys needed (GTFS data is free/open; OTP is self-hosted)

---

## 5. Frontend Components

### Route Page
`apps/web/app/(dashboard)/trip/[id]/transit/page.tsx`

- Follows same pattern as `flights/page.tsx`, `cars/page.tsx`
- Uses `useTransit(tripId)` hook
- Renders `TransitsModule`

### TransitSearchPanel.tsx
- Origin input (text + geolocation)
- Destination input (text + geolocation)
- Date/time picker (departure or arrival)
- Optional mode filter (checkboxes for train/bus/subway/ferry/etc.)
- "Search" button

States:
- **Default** — empty form
- **Validating** — checking addresses
- **Searching** — loading spinner + "Finding routes..."
- **Error** — "Could not find transit routes. Try different locations or times."

### TransitDirectionResults.tsx
Displays route options found by search.

States:
- **Loading** — skeleton cards
- **Empty** — "No transit routes found between these locations. Try adjusting your departure time or transit modes."
- **Error** — "Transit search failed. Please try again."
- **Results** — List of route cards, each showing:
  - Total duration
  - Fare (if available)
  - Step-by-step breakdown: mode icon → line name → stops count → time per leg
  - "Add to trip" button per result

### TransitCard.tsx
Displays a saved transit booking.

- Mode badge (color-coded: blue=subway, green=train, orange=bus, teal=ferry)
- Carrier + line name
- Origin stop → Destination stop
- Departure time → Arrival time
- Duration badge
- Fare (if available)
- Booking reference (if available)
- Edit/Delete actions

States:
- **Default** — normal display
- **Editing** — transforms to TransitForm
- **Deleting** — confirmation dialog

### TransitForm.tsx
Manual add/edit form for transit bookings.

- Uses existing `BookingFormPrimitives` (Input, Select, DateTimeInput, PrimaryButton, SecondaryButton)
- Fields: origin, destination, departure, arrival, mode (dropdown), carrier, line/route, booking ref, notes, fare
- Search form: uses `DateInput` for date + separate time input (more flexible than DateTimeInput)
- Manual form: uses `DateTimeInput` for departure/arrival (matching FlightForm pattern)

States:
- **Adding** — empty form
- **Editing** — pre-filled form
- **Saving** — disabled button + spinner
- **Error** — inline error message

### TransitsModule.tsx
Orchestrator component managing all states.

States:
- **Loading** — `useTransit` query loading → skeleton
- **Empty (no transit, no search)** — "No transit bookings yet" + "Search routes" / "Add manually" buttons
- **Adding** — TransitSearchPanel or TransitForm shown
- **Searching** — TransitSearchPanel + TransitDirectionResults
- **View** — sorted TransitCards (by departure_at)
- **Editing** — TransitForm replaces one card
- **Error** — "Could not load transit bookings"

### Trip Sidebar Update
Add transit tab to `apps/web/components/trip-rail.tsx`:
- Icon: `Train` from `lucide-react` (matches existing sidebar icon library)
- Label: "Transit"
- Position: add `'transit'` to `ALL_TABS` array and to the `'book'` group's `segments` in `TAB_GROUPS`, positioned after `'cars'`
- Also add `'transit'` to `tabOrder` array in `apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx` for page transition animations
- Mobile tab list (`MOBILE_PRIMARY` in trip-rail.tsx): add transit entry as well

### Shared API Layer

```typescript
// packages/shared/src/services/api.ts
export async function fetchTransitBookings(tripId: string): Promise<TransitBookingData[]>
export async function addTransitBooking(tripId: string, data: CreateTransitBookingInput): Promise<TransitBookingData>
export async function updateTransitBooking(id: string, data: Partial<CreateTransitBookingInput>): Promise<TransitBookingData>
export async function deleteTransitBooking(id: string): Promise<void>
```

```typescript
// packages/shared/src/hooks/useTransit.ts — combined query + mutations hook
export function useTransit(tripId: string): {
  bookings: TransitBookingData[];
  isLoading: boolean;
  error: Error | null;
  addBooking: (data: CreateTransitBookingInput) => Promise<void>;
  updateBooking: (id: string, data: Partial<CreateTransitBookingInput>) => Promise<void>;
  deleteBooking: (id: string) => Promise<void>;
}
```

---

## 6. Frontend API Proxy

### `apps/web/app/api/transit/directions/route.ts`

Next.js API route that proxies transit direction requests (same pattern as `/api/cars/search` and `/api/flights/search`):

- Receives search params from TransitSearchPanel
- Forwards request to SST Lambda (`GET /transit/directions`) — always calls the Lambda, never Google Routes directly
- Returns JSON to the client

### `useTransitSearch` hook

```typescript
function useTransitSearch(params: TransitSearchParams) {
  return useQuery({
    queryKey: ['transit-directions', params],
    queryFn: () => fetchTransitDirections(params),
    enabled: !!params.origin && !!params.destination,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
```

---

## 7. Error Handling Matrix

| Scenario | User-facing message | Technical handling |
|----------|-------------------|-------------------|
| No API key configured | "Transit search is not available" | Log error, show fallback |
| Google Routes API timeout | "Transit search timed out. Try again." | Retry once, then fail |
| Rate limited | "Too many transit searches. Wait a moment." | Exponential backoff |
| No transit routes exist | "No transit routes found" | Return empty results |
| Invalid coordinates | "Could not find that location" | Highlight input error |
| Save booking fails | "Could not save transit booking" | Retry, then show error toast |
| Delete booking fails | "Could not delete transit booking" | Retry, then show error toast |

---

## 8. Testing Strategy

### Unit Tests
- `packages/shared/src/__tests__/transit.test.ts` — type validation, data transformation
- `services/transit-search.test.ts` — Lambda handler unit tests (mocking Google Routes)

### Integration Tests
- API route tests via SST Lambda invocations
- Cache hit/miss behavior

### Frontend Tests
- Component rendering tests for each state (loading, empty, error, results)
- Form validation tests

---

## 9. Implementation Phases

### Phase 1: Foundation
- Create `transit_bookings` DB table
- Add types to shared package
- Create transit-search Lambda with Google Routes API
- Set up DynamoDB caching
- Register API routes in infra

### Phase 2: Frontend — Transit Listings
- TransitCard component
- TransitForm component
- TransitsModule (view/empty/add/edit states)
- Transit tab in sidebar
- useTransit hook
- API proxy route

### Phase 3: Frontend — Search
- TransitSearchPanel component
- TransitDirectionResults component
- useTransitSearch hook
- CRUD from search results

### Phase 4: Map Integration (Stretch)
- TransitRouteMap component (follows existing map patterns from flights/cars if applicable)
- Show transit routes on trip map
- Stop markers

### Phase 5: Polish & Launch
- Error states and edge cases
- Loading skeletons
- Responsive design
- Performance optimization

---

## 10. Costs & Operations

### OTP Server (Self-hosted)
- **ECS Fargate:** ~$30-60/month for a 4GB-8GB RAM task running continuously
- **EC2 alternative:** ~$20-40/month for a t3.medium/large spot instance
- **Graph builds:** One-time cost per region (compute-heavy, ~5-30 min each)
- **No per-query costs** (unlike Google Routes at $10-20/1K requests)

### DynamoDB Cache
- Reuses existing `RecommendationCache` table
- Negligible additional cost

### Transitland
- Free tier sufficient for feed discovery and metadata lookups
