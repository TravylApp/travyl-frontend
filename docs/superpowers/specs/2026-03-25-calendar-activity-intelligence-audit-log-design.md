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

- Validates Supabase JWT
- Looks up the activity's `lat/lng`, `starting_date`, `starting_time`, `ending_time` from the `activity` table
- Also fetches the previous activity on the same day (by `starting_time` desc) to compute travel time
- Fans out three parallel fetches:
  1. **Foursquare** — photos, rating, price tier, opening hours, address (reuses existing `lib/foursquare.ts` client)
  2. **Amazon Location Routes** — travel duration from previous activity's coordinates to this activity's coordinates (new Routes API call; PlaceIndex already in `infra/storage.ts`)
  3. **Open-Meteo** — free weather API (no key), forecast or historical weather for the activity date + coordinates
- Runs conflict checks against the merged payload before responding:
  - **Hours conflict:** activity `starting_time`/`ending_time` outside Foursquare opening hours for that day of week
  - **Travel time conflict:** gap between previous activity `ending_time` and this activity `starting_time` < computed travel duration
- Returns: `{ place, logistics, weather, conflicts: { hours: boolean, travelTime: boolean } }`
- **Cache:** DynamoDB, key `activityId:date`, TTL 1h (invalidated when the activity is moved or edited)

### Frontend — hook

`useActivityIntelligence(activityId: string, tripId: string)`

- React Query fetch, `enabled: !!activityId` — only fires on click, not on mount
- Returns `{ place, logistics, weather, conflicts, isLoading, error }`

### Frontend — UI

**`ActivityIntelligencePanel`** (new component, `apps/web/components/calendar/ActivityIntelligencePanel.tsx`)

- Rendered inside the existing `DetailPanel` when an activity is selected
- Four collapsible sections:
  - **Place Info** — photo, name, rating, price tier, address, opening hours
  - **Logistics** — travel time from previous activity, distance, transit options
  - **Weather** — temperature, conditions, precipitation probability for the activity date
  - **Budget Impact** — estimated cost vs trip daily budget target

**`EventBlock` conflict badge**

- Amber dot indicator on the top-right corner of `EventBlock` when `conflicts.hours || conflicts.travelTime` is true
- Tooltip on hover: "Opening hours conflict" or "Not enough travel time"
- Data sourced from `useActivityIntelligence` — the hook is called when a user clicks, so the badge appears after first load and persists in React Query cache

---

## Feature 2: Audit History Drawer

### Schema migration

Add two columns to `itinerary_edits`:

```sql
ALTER TABLE itinerary_edits
  ADD COLUMN user_id uuid REFERENCES auth.users(id),
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
```

No other schema changes needed — `edit_type`, `original_data`, `new_data`, `activity_id`, `trip_id` already exist.

### Write side — instrumentation

Insert into `itinerary_edits` at these mutation points:

| Event | Where | `edit_type` | `original_data` | `new_data` |
|---|---|---|---|---|
| Activity created | `useActivityMutations.createActivity` | `'create'` | `null` | full activity row |
| Activity deleted | `useActivityMutations.deleteActivity` | `'delete'` | full activity row | `null` |
| Activity moved | `useActivityMutations.moveActivity` | `'move'` | `{ day, startTime, endTime }` | `{ day, startTime, endTime }` |
| Activity edited | `useActivityMutations.updateActivity` | `'edit'` | changed fields only | changed fields only |
| Revert applied | revert handler | `'revert'` | revert target's `new_data` | revert target's `original_data` |

### Read side — hook

`useActivityHistory(tripId: string)`

- React Query fetch from `itinerary_edits` where `trip_id = tripId`, ordered by `created_at` desc
- Joins `profiles` to get `display_name` for each `user_id`

### Frontend — `HistoryDrawer`

New component: `apps/web/components/calendar/HistoryDrawer.tsx`

- Slides in from the right (same pattern as `SuggestionDetailDrawer`)
- Triggered by a "History" icon button added to `TripNavbar`
- Shows a feed of entries:
  ```
  Justin moved "Eiffel Tower"  2:00pm → 4:00pm   · 10m ago   [Revert]
  Sarah edited "Louvre" notes                      · 1h ago    [Revert]
  Justin added "Café de Flore"                     · 2h ago    [Revert]
  ```
- Each entry has a **Revert** button (hidden for `edit_type: 'revert'` entries to avoid confusion)

### Revert logic

Each `edit_type` has a specific inverse mutation:

| `edit_type` | Revert action |
|---|---|
| `move` | `moveActivity` with original `day`/`startTime`/`endTime` |
| `edit` | `updateActivity` with `original_data` fields |
| `create` | `deleteActivity` |
| `delete` | `createActivity` from `original_data` |

Revert inserts a new `itinerary_edits` row with `edit_type: 'revert'` — the revert is itself auditable. No cascading reverts.

---

## Components + Files

| File | Status |
|---|---|
| `services/activity-intelligence.ts` | New Lambda |
| `infra/api.ts` | Add `/activity-intelligence` route |
| `apps/web/components/calendar/ActivityIntelligencePanel.tsx` | New |
| `apps/web/components/calendar/HistoryDrawer.tsx` | New |
| `apps/web/components/calendar/hooks/useActivityIntelligence.ts` | New |
| `apps/web/components/calendar/hooks/useActivityHistory.ts` | New |
| `apps/web/components/calendar/EventBlock.tsx` | Add conflict badge |
| `apps/web/components/calendar/DetailPanel.tsx` | Mount `ActivityIntelligencePanel` |
| `apps/web/components/calendar/TripNavbar.tsx` | Add History button |
| `apps/web/components/calendar/hooks/useActivityMutations.ts` | Add audit log writes |
| Supabase migration | Add `user_id`, `created_at` to `itinerary_edits` |

---

## Out of scope

- Conflict detection for multi-day activities spanning time zones
- Weather for trips more than 14 days in the future (Open-Meteo forecast limit)
- Bulk revert / revert to a point in time
- Mobile app (web only for now)
