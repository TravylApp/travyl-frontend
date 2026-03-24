# Spotlight Search — Inline Trip Images

**Date:** 2026-03-23
**Branch:** feature/session-2026-03-23
**Status:** Approved

## Goal

Show each trip's hero image as a small inline thumbnail inside its spotlight search result row. When no image exists, render no thumbnail and left-align the text. Remove the existing hover preview panel entirely.

## Files That Change

| File | Change |
|------|--------|
| `services/index-trip.ts` | Add `trip_context` to select; include `imageUrl` in metadata |
| `services/backfill-embeddings.ts` | Same additions as `index-trip.ts`; add top-level `await backfill()` call |
| `services/context-search.ts` | Return `imageUrl` from metadata |
| `apps/web/hooks/useContextSearch.ts` | Add `imageUrl: string \| null` to `ContextSearchResult` |
| `apps/web/components/GlobalCommandPalette.tsx` | Remove preview panel; add thumbnail + subtitle to trip rows |

## Implementation Details

### 1. `services/index-trip.ts` and `services/backfill-embeddings.ts`

Both files must make the same two changes or the backfill will overwrite existing metadata and strip `imageUrl`.

**Select change:**
```typescript
.select('id, title, destination, status, start_date, end_date, user_id, trip_context')
```

**Metadata change** — use a narrow local type instead of `as any`:
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

`backfill-embeddings.ts` must also add a top-level invocation at the bottom of the file so `sst shell` executes it:
```typescript
await backfill()
```

### 2. `services/context-search.ts`

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

### 3. `apps/web/hooks/useContextSearch.ts`

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

### 4. `apps/web/components/GlobalCommandPalette.tsx`

**Remove entirely:**
- `hoveredTrip` state + `hoverAnchor` state
- `previewStyle` memo
- All `setHoveredTrip` / `setHoverAnchor` calls on mouse events
- The "Show preview for keyboard-highlighted trip" `useEffect`
- The `{hoveredTrip && <div ...>}` preview panel JSX block
- `STATUS_COLORS` constant (no longer rendered anywhere)

**Update trip row rendering** — replace the current `<span>` containing the destination chip + label with:
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

The destination chip that currently renders before the label is removed. Destination now lives in the subtitle, applying to all trip rows regardless of whether an image is present.

### 5. Reindex existing embeddings

After deploying the updated Lambda (`sst deploy`), run the backfill:

```bash
AWS_PROFILE=travyl npx sst shell -- npx tsx services/backfill-embeddings.ts
```

This re-embeds all trips and repopulates metadata with `imageUrl`. Requires `tsx` to be available (`npm install -D tsx` if not already present).

## Degradation

Trips whose embeddings predate this change will show text-only rows until the backfill runs. Rows remain fully functional.

## Out of Scope

- Fallback placeholder/gradient for missing images (by design)
- Status badge in the row (status display was only in the removed preview panel)
- `next/image` optimisation (plain `<img>` is fine at 46×36)
