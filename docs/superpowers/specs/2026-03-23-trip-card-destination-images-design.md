# TRA-261: Dynamic Per-Destination Images on Trip Cards

**Date:** 2026-03-23
**Linear:** [TRA-261](https://linear.app/travyl/issue/TRA-261/dynamic-per-destination-images-on-trip-cards)
**Branch:** `feature/tra-261`

## Problem

Trip cards on `/trips` display the same hardcoded Unsplash photo for every trip regardless of destination. The image provides no visual context about where the trip is going.

## Goal

Each trip card shows a destination-relevant cover photo fetched from Pexels at trip creation time and stored in the database.

## Decisions

- **Image source:** Pexels API (free, no strict rate limits, good travel photo quality)
- **Storage:** `cover_image_url` persisted in the `trips` table — fetched once at creation, never re-fetched on page load
- **Fallback:** Trips without a cover image (existing trips) show a single generic travel fallback photo
- **API key management:** SST secret (`PexelsApiKey`), injected as `PEXELS_API_KEY` env var to the web app — never exposed to the client

## Architecture

### 1. Database Migration

`supabase/migrations/20260323000000_add_cover_image_url.sql`:

```sql
ALTER TABLE trips ADD COLUMN cover_image_url text;
```

No backfill. Existing rows stay `null` and show the fallback image.

### 2. Shared Types

Add to the `Trip` interface in `packages/shared/src/types/index.ts`:

```ts
cover_image_url?: string | null;
```

`MockTripCard extends Trip`, so this field flows through automatically to the `MockTripCard` mapping in the trips page. No changes needed to the `MockTripCard` interface itself.

### 3. SST Secret

`infra/secrets.ts` — add:
```ts
export const pexelsApiKey = new sst.Secret('PexelsApiKey')
```

`infra/web.ts` — import and inject as env var (matching existing pattern; `sst.x.DevCommand` does not support `link`):
```ts
import { pexelsApiKey } from './secrets'

export const web = new sst.x.DevCommand('TravylWeb', {
  dev: {
    command: 'npm run web',
    directory: 'apps/web',
    autostart: true,
  },
  environment: {
    NEXT_PUBLIC_RECOMMENDATION_API_URL: api.url,
    PEXELS_API_KEY: pexelsApiKey.value,
  },
})
```

### 4. Next.js API Route

`apps/web/app/api/destination-image/route.ts`

- `GET /api/destination-image?destination=Paris`
- Server-side only (`PEXELS_API_KEY` via `process.env`, no `NEXT_PUBLIC_` prefix)
- Destination query param must be a short city/place name. The route takes the string as-is, so callers are responsible for trimming (see §5).
- Calls Pexels `GET /v1/search?query={destination}+travel&per_page=15&orientation=landscape`
- Returns a randomly selected photo URL from results for variety across trips to the same destination
- Returns `{ url: string }` on success, `{ url: null }` if no results or on any error (errors are non-fatal)
- No auth required (Next.js server-to-Pexels call, key never leaves the server)
- `images.pexels.com` is already covered by the `"**"` wildcard in `next.config.ts` — no config change needed

### 5. `CreateTripModal` Flow

On submit:
1. Create trip in Supabase → receive new trip `id` (existing logic)
2. Extract the first comma-delimited segment from `destination` for the Pexels query:
   ```ts
   const shortDest = destination.split(',')[0].trim() // "Paris, Île-de-France, France" → "Paris"
   ```
   This is needed because `destination` is stored as a full Nominatim `display_name`. The precedent for this pattern already exists in `TripRouteHover`.
3. `fetch('/api/destination-image?destination={shortDest}')` → `{ url }`
4. If `url` is non-null: `UPDATE trips SET cover_image_url = $url WHERE id = $id`
   - If this UPDATE fails (network error, Supabase error): non-fatal, swallow the error. The trip was successfully created; it will show the fallback image.
5. Modal closes

Steps 2–4 are fast (~300ms). Covered by the existing submit loading state — no additional loading UI needed.

### 6. Trips Page

`apps/web/app/(main)/trips/page.tsx` — define a fallback constant and replace the hardcoded image:

```ts
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800'

// in the trips map:
image: t.cover_image_url ?? FALLBACK_IMAGE
```

`TripCard` and `TripListItem` require no changes — both already read `trip.image` (confirmed).

## Files Changed

| File | Change |
|---|---|
| `supabase/migrations/20260323000000_add_cover_image_url.sql` | Add `cover_image_url` column |
| `packages/shared/src/types/index.ts` | Add `cover_image_url` to `Trip` |
| `infra/secrets.ts` | Add `pexelsApiKey` secret |
| `infra/web.ts` | Inject `PEXELS_API_KEY` env var |
| `apps/web/app/api/destination-image/route.ts` | New Pexels proxy route |
| `apps/web/components/trips/CreateTripModal.tsx` | Fetch image + update trip after creation |
| `apps/web/app/(main)/trips/page.tsx` | Use `cover_image_url ?? FALLBACK_IMAGE` |

## Out of Scope

- Backfilling existing trips with Pexels images
- User-uploaded cover photos
- Editing/replacing a trip's cover image after creation
- Mobile app (web only)
