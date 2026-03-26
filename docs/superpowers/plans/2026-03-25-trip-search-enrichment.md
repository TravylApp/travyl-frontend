# Trip Search Enrichment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the text blob and metadata indexed per trip so that context search can find trips by activity place names, date ranges, and activity categories.

**Architecture:** Two Lambda service files (`index-trip.ts` and `backfill-embeddings.ts`) have identical indexing logic that needs to be updated in both places. The activity query is extended to fetch `starting_date`, `ending_date`, and `activity_data`. The text blob gains trip date ranges and per-activity location/date segments. The metadata gains three new arrays: `activityNames`, `activityLocations`, `activityTypes`.

**Tech Stack:** TypeScript, Supabase JS client, SST v4 Lambdas, Amazon Bedrock Titan Embeddings V2

**Spec:** `docs/superpowers/specs/2026-03-25-trip-search-enrichment-design.md`

---

## Chunk 1: Update indexing logic in both service files

### Task 1: Update `services/index-trip.ts`

**Files:**
- Modify: `services/index-trip.ts:44-97`

The changes are in two sections:
1. The `.select()` string and activity text-building block (lines 44–62)
2. The metadata object (lines 89–97)

- [ ] **Step 1: Replace the activity fetch + text-building block**

In `services/index-trip.ts`, replace lines 43–62 (from `// Fetch activities` to the end of the `textContent` assignment) with:

```typescript
// Fetch activities
const { data: activities } = await supabase
  .from('activity')
  .select('activity_name, activity_type, notes, starting_date, ending_date, activity_data')
  .eq('trip_id', tripId)

// Build text blob
interface ActivityData { category?: string; location_name?: string }

const activityText = (activities ?? [])
  .map((a) => {
    const activityData = a.activity_data as ActivityData | null
    const type = activityData?.category ?? a.activity_type
    let text = `${a.activity_name} (${type})`
    if (activityData?.location_name) text += ` at ${activityData.location_name}`
    if (a.starting_date) {
      text += ` on ${a.starting_date}`
      if (a.ending_date && a.ending_date !== a.starting_date) {
        text += ` to ${a.ending_date}`
      }
    }
    if (a.notes) text += ` - ${a.notes}`
    return text
  })
  .join(', ')

const dateRange = trip.start_date && trip.end_date
  ? `${trip.start_date} to ${trip.end_date}`
  : null

const textContent = [
  trip.title,
  trip.destination,
  trip.status,
  dateRange,
  activityText,
].filter(Boolean).join(' | ')
```

- [ ] **Step 2: Replace the metadata object**

In `services/index-trip.ts`, replace lines 88–97 (from `// Upsert to trip_embeddings` comment up to and including the closing `}` of the `metadata` const) with:

```typescript
// Upsert to trip_embeddings
const activityList = activities ?? []
const activityNames = [...new Set(activityList.map((a) => a.activity_name).filter(Boolean))]
const activityLocations = [...new Set(
  activityList
    .map((a) => (a.activity_data as ActivityData | null)?.location_name)
    .filter((loc): loc is string => Boolean(loc)),
)]
const activityTypes = [...new Set(
  activityList
    .map((a) => (a.activity_data as ActivityData | null)?.category ?? a.activity_type)
    .filter(Boolean),
)]

const metadata = {
  title: trip.title,
  destination: trip.destination,
  status: trip.status,
  startDate: trip.start_date,
  endDate: trip.end_date,
  activityCount: activityList.length,
  imageUrl: heroImages[0] ?? null,
  activityNames,
  activityLocations,
  activityTypes,
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors in `services/index-trip.ts`.

- [ ] **Step 4: Commit**

```bash
git add services/index-trip.ts
git commit -m "feat: enrich trip index with activity locations, dates, and categories"
```

---

### Task 2: Apply the same changes to `services/backfill-embeddings.ts`

**Files:**
- Modify: `services/backfill-embeddings.ts:28-76`

Identical logic to Task 1, but inside the `for (const trip of trips)` loop.

- [ ] **Step 1: Replace the activity fetch + text-building block**

In `services/backfill-embeddings.ts`, replace lines 28–45 (the activity fetch through the `textContent` assignment — do NOT replace line 27 `try {`) with:

```typescript
      const { data: activities } = await supabase
        .from('activity')
        .select('activity_name, activity_type, notes, starting_date, ending_date, activity_data')
        .eq('trip_id', trip.id)

      interface ActivityData { category?: string; location_name?: string }

      const activityText = (activities ?? [])
        .map((a) => {
          const activityData = a.activity_data as ActivityData | null
          const type = activityData?.category ?? a.activity_type
          let text = `${a.activity_name} (${type})`
          if (activityData?.location_name) text += ` at ${activityData.location_name}`
          if (a.starting_date) {
            text += ` on ${a.starting_date}`
            if (a.ending_date && a.ending_date !== a.starting_date) {
              text += ` to ${a.ending_date}`
            }
          }
          if (a.notes) text += ` - ${a.notes}`
          return text
        })
        .join(', ')

      const dateRange = trip.start_date && trip.end_date
        ? `${trip.start_date} to ${trip.end_date}`
        : null

      const textContent = [
        trip.title,
        trip.destination,
        trip.status,
        dateRange,
        activityText,
      ].filter(Boolean).join(' | ')
```

- [ ] **Step 2: Replace the metadata object**

In `services/backfill-embeddings.ts`, replace lines 68–76 (the `metadata` const) with:

```typescript
      const activityList = activities ?? []
      const activityNames = [...new Set(activityList.map((a) => a.activity_name).filter(Boolean))]
      const activityLocations = [...new Set(
        activityList
          .map((a) => (a.activity_data as ActivityData | null)?.location_name)
          .filter((loc): loc is string => Boolean(loc)),
      )]
      const activityTypes = [...new Set(
        activityList
          .map((a) => (a.activity_data as ActivityData | null)?.category ?? a.activity_type)
          .filter(Boolean),
      )]

      const metadata = {
        title: trip.title,
        destination: trip.destination,
        status: trip.status,
        startDate: trip.start_date,
        endDate: trip.end_date,
        activityCount: activityList.length,
        imageUrl: heroImages[0] ?? null,
        activityNames,
        activityLocations,
        activityTypes,
      }
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors in `services/backfill-embeddings.ts`.

- [ ] **Step 4: Commit**

```bash
git add services/backfill-embeddings.ts
git commit -m "feat: enrich backfill with activity locations, dates, and categories"
```

---

## Chunk 2: Verification

### Task 3: Verify the output is correct

No automated test harness exists for Lambda services. Verify by inspecting the produced text blob format.

- [ ] **Step 1: Spot-check the text blob format manually**

After both files are updated, read the final state of `services/index-trip.ts` and verify:
1. The `.select()` string includes `starting_date, ending_date, activity_data`
2. The activity map produces `name (type)[ at location][ on date[ to date]][ - notes]`
3. The `textContent` array includes `dateRange` between `status` and `activityText`
4. The `metadata` object includes `activityNames`, `activityLocations`, `activityTypes`

Do the same for `services/backfill-embeddings.ts`.

- [ ] **Step 2: Check for the `ActivityData` interface duplication**

The `ActivityData` interface is defined inside the function body in both files. Confirm neither definition leaks outside its scope or conflicts with other declarations in the file. Both are local `interface` declarations — this is fine in TypeScript.

- [ ] **Step 3: Run full typecheck**

```bash
npm run typecheck
```

Expected: zero errors across all workspaces.

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: no lint errors in the modified files.

- [ ] **Step 5: Final commit if any lint fixes were needed**

If lint auto-fixed anything:
```bash
git add services/index-trip.ts services/backfill-embeddings.ts
git commit -m "fix: lint cleanup after search enrichment changes"
```

---

## Post-Deploy: Backfill

After deploying (SST deploy), run the backfill script to re-index all existing trips:

```bash
# sst shell injects SST-linked secrets (SupabaseUrl, SupabaseSecretKey) into the process
npx sst shell --stage production npx tsx services/backfill-embeddings.ts
```

Monitor stdout for `Indexed: <title> (<id>)` per trip. Any `Failed to index trip` lines indicate a partial failure — re-run from the beginning (safe due to upsert-on-conflict).

Watch for Bedrock Titan errors (token limit) or Pexels rate limit errors in the log output.
