# Book My Trip — Design Spec

**Date:** 2026-03-27
**Scope:** Phase 1 — Booking infrastructure + calendar UI + activity/dining provider integrations

---

## Overview

"Book My Trip" is a one-click feature that sweeps through all scheduled activities on a trip, auto-matches each one to a supported booking provider, and surfaces affiliate booking links so the user can complete reservations with minimal friction.

**Business model:** Affiliate/redirect. Travyl matches and links; payment is completed on the provider's side. Providers pay Travyl a commission per completed booking (5–15%). No merchant-of-record liability, no PCI scope.

**Out of scope for Phase 1:** confirmed booking webhooks, multi-provider fallback chains, mobile support, merchant-of-record payment flows.

---

## Architecture

### New Lambda: `services/book.ts`

Two endpoints added to the existing SST API Gateway:

| Method | Path | Description |
|---|---|---|
| `POST` | `/book/match` | Accept array of activities, fan out to provider APIs, return matches |
| `GET` | `/book/status/:tripId` | Return all stored booking matches for a trip |

**Authentication:** Both endpoints require a valid JWT in the `Authorization: Bearer <token>` header, identical to the existing `/suggest` Lambda. Unauthenticated requests return 401.

**Lambda timeout:** 30 seconds. Provider search calls are capped at 5s each, so even a 20-activity trip with full parallelism completes well within this limit.

**`POST /book/match` request body:**

```ts
{
  tripId: string
  activities: Array<{
    id: string        // Yjs activity UUID
    title: string
    type: string      // 'dining' | 'tour' | 'sightseeing' | 'museum' | 'cultural' | 'outdoor' | ...
    latitude: number | null
    longitude: number | null
  }>
}
```

"Scheduled" activities are those with `unscheduled !== true` in the Yjs store — matching the existing `scheduledActivities` filter in `CalendarDashboard`. Only activities with non-null `latitude` and `longitude` are sent to provider APIs; those without coordinates are written directly as `unmatched`.

**`POST /book/match` response:**

```ts
{
  total: number   // total number of activities processed (used by client to track progress)
  matches: Array<{
    activityId: string
    status: 'matched' | 'unmatched'
    provider?: string
    matchedName?: string
    affiliateUrl?: string
    confidence?: number
  }>
}
```

**`GET /book/status/:tripId` response:**

```ts
{
  matches: Array<{
    activityId: string
    status: 'matched' | 'unmatched' | 'opened'
    provider: string | null
    matchedName: string | null
    bookingUrl: string | null
    affiliateUrl: string | null
    confidence: number | null
    updatedAt: string  // ISO timestamp
  }>
}
```

**Provider routing by activity type:**

| Activity type | Primary provider |
|---|---|
| `tour`, `sightseeing`, `museum`, `cultural`, `outdoor` | Viator |
| `dining` | OpenTable |
| `event`, `concert`, `show`, `nightlife`, `entertainment` | Ticketmaster |
| all other types | Amadeus Activities |

No provider fallback chains in Phase 1. Amadeus is the catch-all for unrecognized types. If Amadeus does not return a bookable affiliate URL for a given activity (its API provides discovery links, not guaranteed affiliate booking links), that activity is marked `unmatched`.

**Match flow per activity:**
1. Look up provider based on `activity.type`
2. Search provider API with `activity.title` + `activity.latitude` + `activity.longitude`
3. Score top result: `confidence = 0.7 * nameSimilarity + 0.3 * proximityScore`. Name similarity uses any normalized string distance (implementer's choice). Proximity score: 1.0 if distance ≤ 100m, 0.0 if distance > 500m, linear between. Confidence is a float 0–1.
4. If `confidence >= 0.6`: mark `matched`, construct affiliate URL server-side
5. If `confidence < 0.6`: mark `unmatched`
6. Upsert to `booking_matches` via Supabase service role (on conflict `(trip_id, activity_id)` do update)

All provider searches run in parallel (Promise.allSettled). Individual provider failures mark that activity `unmatched` and do not block the response.

**Affiliate URL construction** is done server-side. Provider API keys and affiliate tokens are stored as SST secrets (`Resource.ViatorAffiliateKey.value`, `Resource.OpenTableAffiliateKey.value`, `Resource.AmadeusApiKey.value`, `Resource.TicketmasterApiKey.value`), never exposed to the client.

**`booking_url` vs `affiliate_url`:**
- `booking_url` — the provider's canonical URL for the venue/product (e.g., Viator product page)
- `affiliate_url` — the same URL with affiliate tracking params appended (e.g., `?partner=travyl&ref=...`). The UI always opens `affiliate_url`. `booking_url` is stored for debugging and future use.

---

## Database

New Supabase table: `booking_matches`

```sql
create table booking_matches (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  activity_id text not null,           -- Yjs activity UUID
  provider text,                       -- 'viator' | 'opentable' | 'ticketmaster' | 'amadeus' | null for unmatched
  matched_name text,
  booking_url text,                    -- provider canonical URL
  affiliate_url text,                  -- booking_url + affiliate tracking params
  confidence float,
  status text not null default 'unmatched',  -- unmatched | matched | opened
  -- 'confirmed' is reserved for Phase 4 webhook support; inert in Phase 1
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One active match per activity per trip
  constraint booking_matches_trip_activity_key unique (trip_id, activity_id)
);

-- Namespaced trigger function to avoid conflicts with other tables
create or replace function set_booking_matches_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger booking_matches_updated_at
  before update on booking_matches
  for each row execute function set_booking_matches_updated_at();

-- RLS
alter table booking_matches enable row level security;

-- Users can read matches for trips they own or collaborate on
create policy "booking_matches_select"
  on booking_matches for select
  using (
    trip_id in (
      select id from trips where user_id = auth.uid()
      union
      select trip_id from trip_collaborators where user_id = auth.uid() and invite_status = 'accepted'
    )
  );

-- Clients may only update status to 'opened' (Lambda writes via service role, bypasses RLS)
create policy "booking_matches_update_opened"
  on booking_matches for update
  using (
    trip_id in (
      select id from trips where user_id = auth.uid()
      union
      select trip_id from trip_collaborators where user_id = auth.uid() and invite_status = 'accepted'
    )
  )
  with check (status = 'opened');
```

The Lambda uses the Supabase service role key (SST secret) and bypasses RLS entirely for upserts. Client-side status updates (marking `opened`) use the authenticated user session and are constrained to `status = 'opened'` only by the update policy. Any trip member can mark any activity row as `opened` — this is intentional for a shared trip context where multiple collaborators may book different activities.

Supabase Realtime is enabled on `booking_matches` — the UI subscribes filtered by `trip_id` so status badges update live as the Lambda upserts results.

---

## Calendar UI

### 1. "Book My Trip" button — `CalendarToolbar`

- Placed next to the Share button in the toolbar
- Visible only to trip owners and editors; hidden in `isSharedView`
- Disabled when no scheduled activities exist on the trip
- Disabled (loading state) while a match run is in progress — prevents double-firing
- On click: calls `POST /book/match` with all scheduled activities, opens `BookingPanel` in Loading state

### 2. `BookingPanel` — slide-in drawer (right side)

**Opening behavior:**
- Opened by the "Book My Trip" button: always fires a new `POST /book/match` run, shows Loading state
- Re-opened via a secondary "View Bookings" button: calls `GET /book/status/:tripId`, opens directly to Summary state with prior results. This button appears in the toolbar whenever `booking_matches` rows exist for the trip — determined by calling `GET /book/status/:tripId` on `CalendarDashboard` mount. It persists across page refreshes.

**Loading → Summary transition:**
The client establishes the Supabase Realtime subscription on `booking_matches` filtered by `trip_id` **before** calling `POST /book/match`, to avoid missing events that fire before the subscription is active. The `POST` response includes `total` (total activities processed). The client counts received Realtime `INSERT`/`UPDATE` events; when count equals `total`, the panel transitions from Loading to Summary. Fallback: if 10 seconds pass after the POST response arrives without the count reaching `total` (e.g., lost Realtime events), the client calls `GET /book/status/:tripId` and transitions to Summary using those results.

Three states:

**Loading**
- "Matching your activities…" heading
- Progress bar: `received / total` events
- Per-activity rows appear as Realtime events arrive (live)

**Summary (matching complete)**
- Two sections: "Ready to Book" and "Not Available"
- Ready to Book rows: activity title, provider name, matched venue name, confidence indicator, individual "Book" button
- Low-confidence matches (0.6–0.75): warning label "Uncertain match — [matched name]"
- Not Available rows: greyed out, "No booking found"
- "Book All" CTA: opens matched `affiliate_url` values. Because browsers block programmatic `window.open` calls outside a direct user gesture, "Book All" opens links synchronously within the click handler. Any links that cannot be opened are shown in a fallback section: "Couldn't open automatically — click each below to book manually" with `<a target="_blank">` links per item.
- Count summary: "X of Y activities can be booked"

**Done**
- "Booking links opened" confirmation
- List of opened bookings with provider badges
- "Close" button

### 3. Booking status badges — `EventBlock`

Small pill on the bottom-right corner of each activity block:

| Status | Badge |
|---|---|
| `matched` | Blue dot — "Bookable" |
| `opened` | Green checkmark — "Booking opened" |
| `unmatched` | No badge |

Badges only appear after `booking_matches` has a row for the activity (i.e., after the first match run).

---

## Data Flow

```
User clicks "Book My Trip"
  → Button disabled (loading) to prevent double-fire
  → Client subscribes to Supabase Realtime on booking_matches filtered by trip_id (BEFORE POST)
  → Client calls POST /book/match with tripId + all scheduledActivities (id, title, type, lat, lng)
  → BookingPanel opens in Loading state
  → Lambda fans out to provider APIs in parallel (Promise.allSettled, 5s timeout each)
  → Lambda upserts each result to booking_matches via service role as it resolves
  → Realtime events arrive at client; progress bar fills; rows appear live
  → POST /book/match returns { total, matches } when all parallel calls complete
  → When received count == total: panel transitions to Summary; button re-enabled
  → If 10s pass after POST response without count reaching total: client calls GET /book/status
    and transitions to Summary using those results

User clicks "Book All" (or individual "Book")
  → Client opens affiliate_url values synchronously in click handler (window.open)
  → Any that fail to open are shown as manual fallback links
  → Client calls supabase.update({ status: 'opened' }) per opened activity
    (authenticated session; RLS allows only status = 'opened')
  → EventBlock badges update to green checkmark via Realtime

User re-opens panel later (via "View Bookings" button)
  → Client calls GET /book/status/:tripId
  → Prior matches re-hydrated; panel opens directly to Summary state
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Provider API timeout (>5s) | Activity marked `unmatched`; shown in "Not Available" |
| Provider rate limit (429) | Same as timeout; logged for monitoring |
| Confidence below 0.6 | Marked `unmatched` |
| Confidence 0.6–0.75 | Marked `matched` with "Uncertain match" warning |
| Amadeus returns no bookable affiliate URL | Activity marked `unmatched` |
| Activity has no coordinates | Skipped; written as `unmatched` directly by Lambda |
| Lambda timeout (>30s) | Client shows partial results; remaining activities stay as loading rows until Realtime confirms or request errors |
| No scheduled activities | "Book My Trip" button disabled |
| Popup blocker prevents tab opening | Fallback manual link list shown in panel |
| User clicks "Book My Trip" twice | Button disabled during in-progress run; second click is a no-op |

---

## Providers — Phase 1

### Viator (activities, tours, experiences)
- Developer API access via Viator Partner Program
- Search: `/products/search` with name + lat/lng bounding box
- Affiliate URL: constructed with partner ID + product code
- Commission: ~8% per booking

### OpenTable (dining)
- Affiliate API via OpenTable's partner program
- Search: restaurant name + lat/lng
- Affiliate URL: constructed with restaurant ID + affiliate tracking param
- Commission: per-cover fee per confirmed reservation

### Ticketmaster (events, concerts, shows, nightlife)
- Free public API via developer.ticketmaster.com (no partnership required)
- Search: `GET /discovery/v2/events` with keyword (activity title) + lat/lng + radius
- Match by event name similarity + date proximity to the activity's scheduled day
- Affiliate URL: Ticketmaster affiliate program link with tracking param
- Commission: per-ticket fee via affiliate program

### Amadeus Activities (catch-all)
- Free developer tier at developers.amadeus.com
- `GET /v1/shopping/activities` with lat/lng + radius (1km)
- Name similarity matching against activity title
- Note: Amadeus provides discovery links; affiliate booking URLs are not guaranteed for all results. Activities where Amadeus cannot produce an affiliate URL are marked `unmatched`.

---

## Testing

- Unit tests for provider routing logic (type → provider mapping)
- Unit tests for confidence scoring (nameSimilarity + proximityScore formula, threshold boundary cases)
- Integration tests for `/book/match` with mocked provider API responses:
  - Happy path (Viator match, OpenTable match, Amadeus fallback)
  - Provider timeout → `unmatched`
  - Low confidence → `unmatched`
  - Missing coordinates → `unmatched` without API call
- Manual QA: verify affiliate URLs include correct tracking params before launch

No E2E tests for affiliate redirects — provider checkout flows cannot be automated.

---

## Future Phases

- **Phase 2:** Hotel integration (Booking.com / Expedia affiliate API)
- **Phase 3:** Flight integration (Duffel or Amadeus Flight Offers)
- **Phase 4:** Booking confirmation webhooks → `confirmed` status in `booking_matches`
- **Phase 5:** Merchant-of-record payments via Stripe (once volume justifies compliance investment)
