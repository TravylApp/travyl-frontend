# Trip Search Enrichment — Design Spec

**Date:** 2026-03-25
**Feature:** Richer semantic search for trips (places, dates, activity types)
**Scope:** `services/index-trip.ts`, `services/backfill-embeddings.ts`

---

## Problem

The context search (global spotlight) can't find trips by:
- Place names in activities (e.g. "Eiffel Tower", "Nobu")
- Date ranges (e.g. "trips in July")
- Activity types (e.g. "beach trips", "trips with hiking")

The root cause is that `index-trip.ts` builds a thin text blob from activities — only `activity_name, activity_type, notes`. Trip `start_date`/`end_date` are already stored in metadata but are absent from the `text_content` field that drives both vector embeddings and the ILIKE fallback. Activity dates and location names are never indexed at all.

---

## Solution

Enrich the `text_content` blob and `metadata` stored in `trip_embeddings` by fetching more activity fields. No DB schema changes, no frontend changes, no changes to `context-search.ts`.

---

## Data Changes

### Activity query — add fields

Both files use the Supabase JS client `.select()` DSL. The select string changes from:

**Before:** `'activity_name, activity_type, notes'`

**After:** `'activity_name, activity_type, notes, starting_date, ending_date, activity_data'`

**Column notes:**
- `starting_date`, `ending_date` — `date` NOT NULL columns. Supabase returns them as `YYYY-MM-DD` strings.
- `activity_data` — jsonb, **nullable at the row level** (Foursquare enrichment is best-effort). When non-null, it is a JS object with these relevant top-level keys (from `activityMapper.ts`): `category` (string, canonical display type), `location_name` (string), `image_url`, `rating`. Implementation must guard against `activity_data === null` before accessing any key.
- `activity_type` — the raw DB enum-ish type. The UI uses `activity_data.category ?? activity_type` as the display type (see `activityMapper.ts:86`). The index should follow the same pattern.

---

## Text Blob Format

The `text_content` field (used for embedding generation and ILIKE fallback) changes.

Note: the comment in `context-search.ts` line 44 says "ILIKE on title and destination via trip_embeddings metadata" — this is already inaccurate; the query runs ILIKE on `text_content` (line 49). This discrepancy is pre-existing and not fixed by this change.

**Before:**
```
Paris Adventure | Paris | planning | Eiffel Tower (sightseeing) - great views, Louvre (museum)
```

**After:**
```
Paris Adventure | Paris | planning | 2026-07-01 to 2026-07-10 | Eiffel Tower (Museum) at Champ de Mars on 2026-07-03 - great views, Seine Cruise (Boat Tour) on 2026-07-04 to 2026-07-05
```

Top-level segments are joined with ` | `. The existing `.filter(Boolean)` call drops empty/falsy segments. `trips.status` is NOT NULL with default `'planning'` — always present.

A trip with no activities and valid dates produces:
```
Paris Adventure | Paris | planning | 2026-07-01 to 2026-07-10
```

### Trip date range segment

- Format: `<start_date> to <end_date>`
- Only included when **both** `start_date` and `end_date` are non-null
- Placed between `status` and the activity list

### Activity text format (per activity)

```
{activity_name} ({type})[at {location_name}][on {starting_date}[to {ending_date}]][- {notes}]
```

Where `{type}` = `activity_data?.category ?? activity_type` (matches the UI display type).

Rules:
- `({type})` — always present (`activity_type` is NOT NULL; `activity_data.category` may be absent)
- `at {location_name}` — omitted when `activity_data` is null or `activity_data.location_name` is null/empty
- `on {starting_date}` — `starting_date` is NOT NULL; include defensively with a null guard but expected always present
- `to {ending_date}` — only appended when `ending_date !== starting_date` (string equality on `YYYY-MM-DD`). `ending_date` is NOT NULL, so this check is simply whether the activity spans multiple days
- `- {notes}` — omitted when `notes` is null/empty

Example (single-day, Foursquare-enriched category, with location):
```
Eiffel Tower (Museum) at Champ de Mars on 2026-07-03 - great views
```

Example (multi-day, no location, raw activity_type):
```
Hiking Pyrenees (outdoor) on 2026-07-05 to 2026-07-07
```

---

## Metadata Format

The `metadata` jsonb column in `trip_embeddings` gains three new array fields:

**Before:**
```json
{
  "title": "Paris Adventure",
  "destination": "Paris",
  "status": "planning",
  "startDate": "2026-07-01",
  "endDate": "2026-07-10",
  "activityCount": 3,
  "imageUrl": "https://..."
}
```

**After:**
```json
{
  "title": "Paris Adventure",
  "destination": "Paris",
  "status": "planning",
  "startDate": "2026-07-01",
  "endDate": "2026-07-10",
  "activityCount": 3,
  "imageUrl": "https://...",
  "activityNames": ["Eiffel Tower", "Louvre", "Seine River Cruise"],
  "activityLocations": ["Champ de Mars", "Rue de Rivoli"],
  "activityTypes": ["Museum", "Art Gallery", "Boat Tour"]
}
```

- `activityTypes` uses `activity_data?.category ?? activity_type` — same as the text blob
- `activityLocations` uses `activity_data?.location_name` — omits nulls
- All three arrays are **deduplicated in first-seen order** (Set over Supabase's row order, which is non-deterministic without an ORDER BY clause — acceptable since ordering within these arrays has no semantic meaning)

These arrays are not consumed by `context-search.ts` today. They are stored for future metadata-level filtering (e.g. "find trips containing a specific place") without requiring a re-index.

---

## Files Changed

| File | Change |
|---|---|
| `services/index-trip.ts` | Extended activity query + richer text blob + richer metadata |
| `services/backfill-embeddings.ts` | Same changes — duplicates the indexing logic |

Both files implement the same logic independently. Extracting a shared helper is intentionally deferred — the duplication is confined to two files and not warranted at current scale.

### Files NOT changed

| File | Reason |
|---|---|
| `services/context-search.ts` | ILIKE fallback already searches `text_content`; vector search improves automatically from better embeddings |
| `supabase/migrations/` | `metadata` is already jsonb — adding new keys is backwards-compatible |
| `apps/web/` | Search result shape is unchanged |

---

## Indexing Trigger

`useIndexTrip` (debounced 5s per trip) is already called on all activity mutations:
- `addActivity` → `indexTrip(tripId)`
- `updateActivity` → `indexTrip(tripId)`
- `removeActivity` → `indexTrip(tripId)`
- `duplicateActivity` → calls `addActivity` → `indexTrip(tripId)`
- Trip create (`CreateTripModal`) → `indexTrip(tripId)`

Activity-level changes will therefore re-index with the enriched data without any frontend changes.

---

## Backfill

After deploying the updated `index-trip.ts`, run `backfill-embeddings.ts` once to re-index all existing trips.

The backfill also calls `fetchPexelsImage` for trips without a hero image and writes back to `trips.trip_context` — this is pre-existing behavior, unchanged by this spec.

Backfill behavior:
- Fetches all trips in a single query (acceptable at current trip volume)
- Processes trips sequentially to avoid Bedrock Titan rate limits; also mitigates Pexels API rate limits (pre-existing concern)
- Upserts on `trip_id` — safe to re-run from the beginning if interrupted
- Logs success/failure per trip to stdout

### Truncation

No explicit truncation is added. Amazon Bedrock Titan Embeddings V2 has an 8192-token limit; at current trip sizes this is not expected to be reached. If exceeded, `generateEmbedding` will throw and the error will be caught and logged by the existing try/catch in both files (no silent data loss).

### Rollback

If enriched embeddings degrade search quality: revert the two changed files via git and re-run `backfill-embeddings.ts`. The `trip_embeddings` table is fully derived data — it can be rebuilt at any time from `trips` + `activity`.

---

## Post-Deploy Monitoring

The `search_trips` SQL function has a hardcoded cosine similarity threshold of `>= 0.4` in its function body (migration `20260321000000_context_search.sql` line 54). It is **not** a caller-configurable parameter — adjusting it requires a new migration. Monitor search result quality after backfill and add a migration if the threshold needs tuning.

---

## Search Queries Enabled After This Change

| Query | Mechanism |
|---|---|
| "Eiffel Tower" | Activity name in text blob → vector + ILIKE |
| "trips in July" | Date range in text blob → vector semantic match |
| "beach trips" | Activity type/category in text blob → vector + ILIKE |
| "Champ de Mars" | Location name in text blob → vector + ILIKE |
| "museum" | Activity category in text blob → vector + ILIKE |
| "hiking Pyrenees multi-day" | Activity name + date range in text blob → vector |
