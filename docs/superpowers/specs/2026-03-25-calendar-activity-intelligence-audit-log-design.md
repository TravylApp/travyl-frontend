# Calendar: Activity Intelligence + Audit Log

**Date:** 2026-03-25
**Branch:** feature/spotlight-search-entity-details
**Scope:** Activity enrichment panel, conflict detection badges, and a revertible audit history drawer for the trip calendar.

---

## Overview

Three interconnected calendar features built on a shared "activity intelligence" layer:

1. **Activity Enrichment** — clicking an activity surfaces place details, logistics, and weather in a new panel
2. **Conflict Detection** — metadata-based warnings (hours mismatch, insufficient travel time) shown as badges on event blocks
3. **Audit History Drawer** — chronological change log with per-entry revert for the full trip

---

## Feature 1: Activity Intelligence Layer

### Backend — new Lambda endpoint

`GET /activity-intelligence?activityId=&tripId=`

Validates Supabase JWT, fetches the target activity row (`latitude`, `longitude`, `starting_date`, `starting_time`, `ending_time`, `activity_name`) and the previous activity on the same day (ordered by `starting_time` desc) from Supabase, then fans out three parallel fetches:

**1. SerpAPI Google Maps place details**

Adds a new `getPlaceDetails(name: string, lat: number, lng: number)` function to `services/lib/serpapi.ts`. Uses `engine: 'google_maps'` with `q={name}&ll=@{lat},{lng},14z`. This is a different engine from the existing `searchPlaces` (which uses `google_local`) and returns a single-place detail response.

Key response fields parsed from the `place_results` object:
- `photos[]` → up to 3 image URLs
- `rating` → number
- `price` → raw string (`'$'` / `'$$'` / `'$$$'` / `'$$$$'`) — preserved as-is, not converted to a number (the existing `mapPrice` number conversion in `serpapi.ts` is for `SuggestionCard` only; this feature keeps the raw string)
- `address` → string
- `hours` → structured schedule array, e.g. `[{ day: 'Monday', opens: '09:00', closes: '17:00' }]`

Opening hours are **best-effort**: if `place_results.hours` is absent, the Lambda sets `place.openingHours: null` and skips the hours-based conflict check for that activity. Conflict detection only fires when `hours` data is present.

**2. Travel time estimate (Haversine)**

Computes Haversine distance between the previous activity's coordinates and this activity's coordinates, then converts to approximate drive time (assume 40 km/h urban average). No external API call. If no previous activity exists on the same day, `logistics.travelTime` is `null`.

**3. Open-Meteo weather**

- `starting_date` in the future → `https://api.open-meteo.com/v1/forecast`
- `starting_date` in the past → `https://archive-api.open-meteo.com/v1/archive`

Both endpoints accept `latitude`, `longitude`, `start_date`, `end_date`, `daily=temperature_2m_max,precipitation_sum,weathercode`. No API key required. If the activity has no coordinates, weather is `null`.

**Conflict checks** run before responding:
- **Hours conflict:** `starting_time` or `ending_time` falls outside the matching day-of-week hours entry. Only checked when `place.openingHours` is non-null.
- **Travel time conflict:** gap between previous activity `ending_time` and this activity `starting_time` < Haversine-derived travel duration. Only checked when `logistics.travelTimeMinutes` is non-null.

**Response shape:**
```ts
{
  place: {
    name: string
    address: string
    rating: number | null
    priceTier: string | null         // raw SerpAPI price string: '$' | '$$' | '$$$' | '$$$$'
    photos: string[]                 // up to 3 URLs
    openingHours: Array<{ day: string; opens: string; closes: string }> | null
  }
  logistics: {
    travelTimeMinutes: number | null
    distanceKm: number | null
    previousActivityName: string | null
  }
  weather: {
    tempMaxC: number | null
    precipitationMm: number | null
    weatherCode: number | null       // WMO weather interpretation code
  } | null
  conflicts: {
    hours: boolean
    travelTime: boolean
  }
}
```

**Cache:** Reuses the existing `RecommendationCache` DynamoDB table (`cacheTable` in `infra/storage.ts`). The new Lambda does **not** use `services/lib/cache.ts` — that helper is typed to `SuggestionCard[]` and is incompatible. Instead, the Lambda calls `GetCommand`/`PutCommand` directly (same pattern as `cache.ts` internally). Item shape: `{ pk: "intelligence:{activityId}", sk: "{starting_date}", data: <response payload>, expiresAt: <unix timestamp> }`. TTL field: `expiresAt` (matches the existing table's TTL attribute).

**`infra/api.ts` stanza:**
```ts
api.route('GET /activity-intelligence', {
  handler: 'services/activity-intelligence.handler',
  link: [cacheTable, supabaseSecretKey, supabaseUrl, serpApiKey],
})
```
No additional IAM permissions needed — all external calls are HTTPS.

**Known limitation:** Cache is invalidated per-activity. Moving activity A does not automatically invalidate the intelligence cache for activity B (which is now A's new neighbor). Stale conflict badges on adjacent activities are acceptable for MVP.

### Frontend — hook

`useActivityIntelligence(activityId: string, tripId: string)`
- `queryKey: ['activity-intelligence', activityId]`
- `enabled: !!activityId` — fires on click only
- `staleTime: 60 * 60 * 1000` — matches the Lambda's 1h DynamoDB TTL
- Returns `{ place, logistics, weather, conflicts, isLoading, error }`

**Cache invalidation:** In `CalendarDashboard`, after `moveActivity` or `updateActivity` calls, call `queryClient.invalidateQueries({ queryKey: ['activity-intelligence', activityId] })`.

**Background prefetch for conflict badges:**
Prefetch lives in `CalendarDashboard` (not `WeekView` — `WeekView` does not have access to `tripId`). After activities load, call `queryClient.prefetchQuery` for each activity in the currently-visible week. Fire-and-forget; missing data means no badge (fail silent).

### Frontend — UI

**`ActivityIntelligencePanel`** (`apps/web/components/calendar/ActivityIntelligencePanel.tsx`)

Rendered inside the existing `DetailPanel` when an activity is selected. Four collapsible sections:

- **Place Info** — photo, name, rating, `priceTier` string, address, opening hours
- **Logistics** — travel time + distance from previous activity ("First activity of the day" when `null`)
- **Weather** — temperature, precipitation, conditions icon (WMO code → icon + label mapping defined in new utility `apps/web/components/calendar/utils/wmoWeatherCode.ts`)
- **Budget Impact** — client-computed from existing `activity.estimated_cost` vs `avg_budget_per_day` from `user_travel_profile` (sourced from existing React Query hooks, not the Lambda)

**`EventBlock` conflict badge**
- Amber dot top-right corner when `conflicts.hours || conflicts.travelTime`
- Tooltip: "Opening hours conflict" / "Not enough travel time" / "Two scheduling issues"
- Not rendered while loading or on error (fail silent)

---

## Feature 2: Audit History Drawer

### Schema migration

No existing migration creates `itinerary_edits` — the table is listed in `ARCHITECTURE.md` but has no migration file. The migration must first create it, then add the new columns.

```sql
-- Create base table (no prior migration exists for this table)
CREATE TABLE IF NOT EXISTS itinerary_edits (
  trip_id     uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL,
  edit_type   text NOT NULL,
  original_data jsonb,
  new_data    jsonb
);

-- Add new columns needed for audit features
ALTER TABLE itinerary_edits
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- RLS: collaborators and trip owners can read edits for their trips
CREATE POLICY "Collaborators can read itinerary edits"
  ON itinerary_edits FOR SELECT
  USING (
    trip_id IN (
      SELECT trip_id FROM trip_collaborators
      WHERE user_id = auth.uid() AND invite_status = 'accepted'
      UNION
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert own edits"
  ON itinerary_edits FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

Note: `user_id` FK points to `profiles(id)` (not `auth.users`) so the display name join is a direct FK traversal via Supabase.

### Write side — instrumentation

**`create` and `delete` events** (handled in `useActivityMutations`):

| Event | Location | `edit_type` | `original_data` | `new_data` |
|---|---|---|---|---|
| Activity created | `addActivity` — after Supabase insert succeeds | `'create'` | `null` | full `CalendarActivity` |
| Activity deleted | `removeActivity` — read `activitiesMap.get(id)` **synchronously before** `supabase.delete()` call; convert to `CalendarActivity` via `yMapToCalendarActivity` (see shared helper below) | `'delete'` | full `CalendarActivity` | `null` |

**Shared helper — `yMapToCalendarActivity`:**
The `yMapToCalendarActivity(id, yMap)` function currently lives as a module-private function inside `useYjsSync.ts`. To allow `useActivityMutations` to use it for the `delete` snapshot, extract it to a new shared file: `apps/web/components/calendar/hooks/yMapToCalendarActivity.ts`. Both `useYjsSync` and `useActivityMutations` import from there.

**`move` and `edit` events** (handled in `useYjsSync`):

`moveActivity` and `updateActivity` only write to the Yjs Y.Map; Supabase persistence happens in the debounced 1s flush. Audit writes for these events happen inside the `flush()` callback in `useYjsSync`, after the upsert succeeds.

To capture before-state: in `useYjsSync`'s `observeDeep` callback, Yjs `Y.YMapEvent` provides `event.changes.keys` — a `Map<string, { action, oldValue }>` — for each changed field on the nested activity Y.Map. The observer reconstructs the before-state from `oldValue` entries for the changed keys only, and stores these snapshots in a `beforeSnapshotRef: Map<string, Partial<CalendarActivity>>`. On flush, the before-snapshot for each dirty ID is read from `beforeSnapshotRef` alongside the current Y.Map state (after-state), then cleared.

If the same activity is dirtied multiple times within a single flush window, `beforeSnapshotRef` keeps the **first** captured before-state (i.e., do not overwrite if the key already exists) — this preserves the original pre-edit values.

| Event | Location | `edit_type` | `original_data` | `new_data` |
|---|---|---|---|---|
| Activity moved | `useYjsSync` flush — after upsert succeeds | `'move'` | `{ day, startHour, endDay }` from `beforeSnapshotRef` | current Y.Map values |
| Activity edited | `useYjsSync` flush — after upsert succeeds | `'edit'` | changed fields from `beforeSnapshotRef` | current Y.Map values |

**Revert events** (own `edit_type`):
| Event | `edit_type` | notes |
|---|---|---|
| Revert applied | `'revert'` | inserted by revert handler; logged so reverts are auditable |

### Read side — hook

`useActivityHistory(tripId: string)`
- `queryKey: ['activity-history', tripId]`
- `staleTime: 0` — always refetch when drawer opens (pass `enabled: isDrawerOpen` so it only fetches on demand)
- Two fetches, merged client-side:
  1. `SELECT * FROM itinerary_edits WHERE trip_id = ? ORDER BY created_at DESC LIMIT 100`
  2. `SELECT id, display_name FROM profiles WHERE id = ANY(?)` for the distinct `user_id` values

### Frontend — `HistoryDrawer`

`apps/web/components/calendar/HistoryDrawer.tsx`

Follows the CSS class toggle + `requestAnimationFrame` animation pattern from `SuggestionDetailDrawer` (not the `motion` pattern from `DetailPanel`).

Drawer open/close state owned by `CalendarDashboard`. `TripNavbar` receives a new `onOpenHistory?: () => void` prop. The History button is hidden when `isSharedView` is true.

Feed layout:
```
Justin moved "Eiffel Tower"  2:00pm → 4:00pm   · 10m ago   [Revert]
Sarah edited "Louvre" notes                      · 1h ago    [Revert]
Justin added "Café de Flore"                     · 2h ago    [Revert]
```

- **Revert** button hidden for `edit_type: 'revert'` entries
- Capped at 100 entries (no pagination for MVP)

### Revert logic

Each `edit_type` has a specific inverse mutation:

| `edit_type` | Revert action |
|---|---|
| `move` | `moveActivity(id, original.day, original.startHour)` |
| `edit` | `updateActivity(id, original_data)` |
| `create` | `removeActivity(id)` |
| `delete` | `addActivity(toCalendarActivity(original_data))` — uses `toCalendarActivity` from `@travyl/shared` to convert DB-shape back to `CalendarActivity` |

Revert inserts a new `itinerary_edits` row with `edit_type: 'revert'`. No cascading reverts.

---

## Components + Files

| File | Change |
|---|---|
| `services/activity-intelligence.ts` | New Lambda |
| `services/lib/serpapi.ts` | Add `getPlaceDetails(name, lat, lng)` using `engine: 'google_maps'` |
| `infra/api.ts` | Add `GET /activity-intelligence` route |
| `apps/web/components/calendar/ActivityIntelligencePanel.tsx` | New |
| `apps/web/components/calendar/HistoryDrawer.tsx` | New |
| `apps/web/components/calendar/utils/wmoWeatherCode.ts` | New — WMO code → icon + label mapping |
| `apps/web/components/calendar/hooks/useActivityIntelligence.ts` | New |
| `apps/web/components/calendar/hooks/useActivityHistory.ts` | New |
| `apps/web/components/calendar/EventBlock.tsx` | Add conflict badge |
| `apps/web/components/calendar/DetailPanel.tsx` | Mount `ActivityIntelligencePanel` |
| `apps/web/components/calendar/CalendarDashboard.tsx` | Own `HistoryDrawer` state; prefetch intelligence; pass `onOpenHistory` to `TripNavbar`; invalidate cache on move/edit |
| `apps/web/components/calendar/TripNavbar.tsx` | Add `onOpenHistory?: () => void` prop + History button (hidden in `isSharedView`) |
| `apps/web/components/calendar/hooks/yMapToCalendarActivity.ts` | New — extracted from `useYjsSync.ts`; shared by both `useYjsSync` and `useActivityMutations` |
| `apps/web/components/calendar/hooks/useActivityMutations.ts` | Add audit insert for `create`/`delete`; import `yMapToCalendarActivity` |
| `apps/web/components/calendar/hooks/useYjsSync.ts` | Import `yMapToCalendarActivity`; add `beforeSnapshotRef`; add audit insert for `move`/`edit` in flush callback |
| Supabase migration | Add `id`, `user_id`, `created_at` to `itinerary_edits`; add RLS policies |

---

## Out of scope

- Conflict detection for multi-day activities spanning time zones
- Travel time using routed directions (vs Haversine estimate)
- Weather for activities without coordinates
- Stale conflict badges on activities adjacent to a moved activity (known limitation — MVP only invalidates the moved activity's own cache entry)
- Bulk revert / revert to a point in time
- Pagination in `HistoryDrawer` (cap at 100 entries)
- Mobile app (web only)
