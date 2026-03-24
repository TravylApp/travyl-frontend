# Spotlight Search — Inline Trip Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each trip's hero image as a small inline thumbnail in spotlight search results; remove the existing hover preview panel entirely.

**Architecture:** `imageUrl` flows from `trip_context.hero_image_url` in the DB → embedding metadata (indexed in both `index-trip.ts` and `backfill-embeddings.ts`) → Lambda response (`context-search.ts`) → React hook interface (`useContextSearch.ts`) → UI (`GlobalCommandPalette.tsx`). Both indexing paths must be updated together or a backfill will strip `imageUrl` from existing embeddings.

**Tech Stack:** TypeScript, AWS Lambda (SST v3 Ion), Supabase, React/Next.js, Tailwind CSS

---

## File Map

| File | Change |
|------|--------|
| `services/index-trip.ts` | Add `trip_context` to select; write `imageUrl` to metadata |
| `services/backfill-embeddings.ts` | Same metadata change; add top-level `await backfill()` call |
| `services/context-search.ts` | Include `imageUrl` in mapped response |
| `apps/web/hooks/useContextSearch.ts` | Add `imageUrl: string \| null` to `ContextSearchResult` interface |
| `apps/web/components/GlobalCommandPalette.tsx` | Remove preview panel + state; replace trip row with thumbnail + subtitle |

---

### Task 1: Add `imageUrl` to `index-trip.ts` metadata

**Files:**
- Modify: `services/index-trip.ts:29,67-74`

- [ ] **Step 1: Update the select to include `trip_context`**

  Change line 29 from:
  ```typescript
  .select('id, title, destination, status, start_date, end_date, user_id')
  ```
  To:
  ```typescript
  .select('id, title, destination, status, start_date, end_date, user_id, trip_context')
  ```

- [ ] **Step 2: Add `imageUrl` to the metadata object using a narrow type**

  Replace the `metadata` block (lines 67-74):
  ```typescript
  const metadata = {
    title: trip.title,
    destination: trip.destination,
    status: trip.status,
    startDate: trip.start_date,
    endDate: trip.end_date,
    activityCount: activities?.length ?? 0,
  }
  ```
  With:
  ```typescript
  interface TripContextJson { hero_image_url?: string }
  const tripContext = trip.trip_context as TripContextJson | null

  const metadata = {
    title: trip.title,
    destination: trip.destination,
    status: trip.status,
    startDate: trip.start_date,
    endDate: trip.end_date,
    activityCount: activities?.length ?? 0,
    imageUrl: tripContext?.hero_image_url ?? null,
  }
  ```

- [ ] **Step 3: Typecheck**

  ```bash
  npm run typecheck
  ```
  Expected: no errors in `services/index-trip.ts`

- [ ] **Step 4: Commit**

  ```bash
  git add services/index-trip.ts
  git commit -m "feat: add imageUrl to index-trip metadata from trip_context"
  ```

---

### Task 2: Update `backfill-embeddings.ts` to match

**Files:**
- Modify: `services/backfill-embeddings.ts:14,46-53`

> **Why both files:** A backfill run overwrites all `metadata` fields. If `backfill-embeddings.ts` doesn't include `imageUrl`, running the backfill strips it from every embedding that `index-trip.ts` already wrote.

- [ ] **Step 1: Update the select to include `trip_context`**

  Change line 14 from:
  ```typescript
  .select('id, title, destination, status, start_date, end_date, user_id')
  ```
  To:
  ```typescript
  .select('id, title, destination, status, start_date, end_date, user_id, trip_context')
  ```

- [ ] **Step 2: Add `imageUrl` to the metadata object using the same narrow type**

  Replace the `metadata` block (lines 46-53):
  ```typescript
  const metadata = {
    title: trip.title,
    destination: trip.destination,
    status: trip.status,
    startDate: trip.start_date,
    endDate: trip.end_date,
    activityCount: activities?.length ?? 0,
  }
  ```
  With:
  ```typescript
  interface TripContextJson { hero_image_url?: string }
  const tripContext = trip.trip_context as TripContextJson | null

  const metadata = {
    title: trip.title,
    destination: trip.destination,
    status: trip.status,
    startDate: trip.start_date,
    endDate: trip.end_date,
    activityCount: activities?.length ?? 0,
    imageUrl: tripContext?.hero_image_url ?? null,
  }
  ```

  > Place the `interface TripContextJson` declaration once, above the `for` loop, to avoid redeclaring it per iteration:
  ```typescript
  interface TripContextJson { hero_image_url?: string }

  for (const trip of trips) {
    try {
      // ...activities fetch...
      const tripContext = trip.trip_context as TripContextJson | null
      const metadata = { ..., imageUrl: tripContext?.hero_image_url ?? null }
  ```

- [ ] **Step 3: Add top-level `await backfill()` call at the end of the file**

  Append after the closing `}` of the `backfill` function:
  ```typescript
  await backfill()
  ```
  This makes `npx sst shell -- npx tsx services/backfill-embeddings.ts` execute the backfill.

- [ ] **Step 4: Typecheck**

  ```bash
  npm run typecheck
  ```
  Expected: no errors in `services/backfill-embeddings.ts`

- [ ] **Step 5: Commit**

  ```bash
  git add services/backfill-embeddings.ts
  git commit -m "feat: add imageUrl to backfill metadata and add top-level await backfill()"
  ```

---

### Task 3: Return `imageUrl` from `context-search.ts`

**Files:**
- Modify: `services/context-search.ts:37-46`

- [ ] **Step 1: Add `imageUrl` to the results map**

  Replace the `results` map (lines 37-46):
  ```typescript
  const results = (data ?? []).map((row: any) => ({
    tripId: row.trip_id,
    title: row.metadata.title,
    destination: row.metadata.destination,
    startDate: row.metadata.startDate,
    endDate: row.metadata.endDate,
    status: row.metadata.status,
    activityCount: row.metadata.activityCount,
    score: row.score,
  }))
  ```
  With:
  ```typescript
  const results = (data ?? []).map((row: any) => ({
    tripId: row.trip_id,
    title: row.metadata.title,
    destination: row.metadata.destination,
    startDate: row.metadata.startDate,
    endDate: row.metadata.endDate,
    status: row.metadata.status,
    activityCount: row.metadata.activityCount,
    imageUrl: row.metadata.imageUrl ?? null,
    score: row.score,
  }))
  ```

- [ ] **Step 2: Typecheck**

  ```bash
  npm run typecheck
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add services/context-search.ts
  git commit -m "feat: include imageUrl in context-search response"
  ```

---

### Task 4: Add `imageUrl` to `ContextSearchResult` interface

**Files:**
- Modify: `apps/web/hooks/useContextSearch.ts:9-18`

- [ ] **Step 1: Add `imageUrl` field to the interface**

  In `useContextSearch.ts`, update the `ContextSearchResult` interface:
  ```typescript
  export interface ContextSearchResult {
    tripId: string
    title: string
    destination: string
    startDate: string
    endDate: string
    status: string
    activityCount: number
    imageUrl: string | null
    score: number
  }
  ```

- [ ] **Step 2: Typecheck**

  ```bash
  npm run typecheck
  ```
  Expected: TypeScript now knows `imageUrl` is available throughout the app.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/hooks/useContextSearch.ts
  git commit -m "feat: add imageUrl to ContextSearchResult interface"
  ```

---

### Task 5: Update `GlobalCommandPalette.tsx` — remove preview panel, add thumbnail + subtitle

**Files:**
- Modify: `apps/web/components/GlobalCommandPalette.tsx`

This is the largest single change. Complete all steps before committing.

- [ ] **Step 1: Remove `STATUS_COLORS` constant**

  Delete lines 54-60:
  ```typescript
  const STATUS_COLORS: Record<string, string> = {
    planning: 'bg-gray-400',
    booked: 'bg-amber-500',
    active: 'bg-emerald-500',
    completed: 'bg-[#003594]',
    abandoned: 'bg-red-500',
  }
  ```

- [ ] **Step 2: Remove `hoveredTrip` and `hoverAnchor` state declarations**

  Delete lines 79-80:
  ```typescript
  const [hoveredTrip, setHoveredTrip] = useState<ContextSearchResult | null>(null)
  const [hoverAnchor, setHoverAnchor] = useState<HTMLElement | null>(null)
  ```

- [ ] **Step 3: Remove the `setHoveredTrip(null)` and `setHoverAnchor(null)` calls from the reset-on-open `useEffect`**

  In the `useEffect` that runs when `isOpen` changes (lines 106-114), remove:
  ```typescript
  setHoveredTrip(null)
  setHoverAnchor(null)
  ```
  The effect should now only reset `query` and `highlightedIndex`, then focus the input.

- [ ] **Step 4: Remove the keyboard-highlight-trip `useEffect`**

  Delete lines 171-180:
  ```typescript
  // ─── Show preview for keyboard-highlighted trip ──────────
  useEffect(() => {
    const item = flatItems[highlightedIndex]
    if (item?.type === 'trip') {
      setHoveredTrip(item.data)
    } else {
      setHoveredTrip(null)
      setHoverAnchor(null)
    }
  }, [highlightedIndex, flatItems])
  ```

- [ ] **Step 5: Remove `previewStyle` memo**

  Delete lines 233-246:
  ```typescript
  const previewStyle = useMemo(() => {
    if (!hoveredTrip) return { display: 'none' as const }
    if (!hoverAnchor) {
      return { top: '15vh', left: 'calc(50% + 280px)', display: 'block' as const }
    }
    const rect = hoverAnchor.getBoundingClientRect()
    const spaceRight = window.innerWidth - rect.right
    if (spaceRight > 260) {
      return { top: rect.top, left: rect.right + 8, display: 'block' as const }
    }
    return { top: rect.top, right: window.innerWidth - rect.left + 8, display: 'block' as const }
  }, [hoverAnchor, hoveredTrip])
  ```

- [ ] **Step 6: Remove hover event handlers from the trip row button**

  In the `<button>` element for each item (around lines 323-335), remove the `onMouseEnter` and `onMouseLeave` event handlers for trips:
  ```typescript
  // Remove these from onMouseEnter:
  if (item.type === 'trip') {
    setHoveredTrip(item.data)
    setHoverAnchor(e.currentTarget)
  }
  // Remove onMouseLeave entirely (or keep just the highlighted index update):
  onMouseLeave={() => {
    if (item.type === 'trip') {
      setHoveredTrip(null)
      setHoverAnchor(null)
    }
  }}
  ```
  The simplified `onMouseEnter` should only set `highlightedIndex`:
  ```typescript
  onMouseEnter={() => {
    if (!disabled) setHighlightedIndex(index)
  }}
  ```
  Remove `onMouseLeave` entirely (it was only used for the preview panel).

- [ ] **Step 7: Replace the trip row label `<span>` with thumbnail + subtitle layout**

  Replace the current inner `<span>` (lines 345-352):
  ```tsx
  <span className="flex items-center gap-2">
    {item.type === 'trip' && (
      <span className="text-xs text-gray-400 dark:text-[#4a7ab5]">
        {item.data.destination}
      </span>
    )}
    <span>{item.label}</span>
  </span>
  ```
  With:
  ```tsx
  <span className="flex items-center gap-2.5">
    {item.type === 'trip' && item.data.imageUrl && (
      <img
        src={item.data.imageUrl}
        alt={item.data.destination}
        className="w-[46px] h-[36px] rounded object-cover shrink-0"
      />
    )}
    <span className="flex flex-col min-w-0">
      <span>{item.label}</span>
      {item.type === 'trip' && (item.data.startDate && item.data.endDate) && (
        <span className="text-[10px] text-gray-400 dark:text-[#4a7ab5] truncate">
          {item.data.destination} · {formatTripDates(item.data.startDate, item.data.endDate)}
        </span>
      )}
    </span>
  </span>
  ```

- [ ] **Step 8: Remove the hover preview panel JSX block**

  Delete lines 366-390 (the `{hoveredTrip && <div ...>}` block at the bottom of the render).

- [ ] **Step 9: Remove unused imports**

  `useMemo` is still used (for `groups` and `flatItems`). Check if `useRef` is still needed (yes — `inputRef`). No import changes needed unless TypeScript complains.

- [ ] **Step 10: Typecheck**

  ```bash
  npm run typecheck
  ```
  Expected: no errors. If `ContextSearchResult` missing `imageUrl` errors appear, Task 4 wasn't completed first.

- [ ] **Step 11: Commit**

  ```bash
  git add apps/web/components/GlobalCommandPalette.tsx
  git commit -m "feat: replace preview panel with inline thumbnail and subtitle in spotlight search"
  ```

---

### Task 6: Deploy Lambda and run backfill

- [ ] **Step 1: Deploy the updated Lambda**

  ```bash
  AWS_PROFILE=travyl npx sst deploy
  ```
  Expected: deploy completes, API URL in output matches `.env.local`'s `NEXT_PUBLIC_RECOMMENDATION_API_URL`.

- [ ] **Step 2: Run the backfill to re-embed all trips with `imageUrl`**

  ```bash
  AWS_PROFILE=travyl npx sst shell -- npx tsx services/backfill-embeddings.ts
  ```
  Expected output:
  ```
  Backfilling N trips...
  Indexed: <trip title> (<trip id>)
  ...
  Backfill complete.
  ```

- [ ] **Step 3: Verify in the browser**

  1. Start the web dev server: `npm run web`
  2. Open the app, press `Ctrl+K`
  3. Type a trip name or destination (≥ 3 characters)
  4. Confirm: trips with a hero image show a 46×36 thumbnail; trips without show text only with no blank slot
  5. Confirm: the hover preview panel is gone
  6. Confirm: each trip row shows `destination · Apr 10 – May 1, 2026` subtitle when dates are present

- [ ] **Step 4: Commit if any last-minute fixes were needed, then push**

  ```bash
  git push origin feature/tra-204
  ```
