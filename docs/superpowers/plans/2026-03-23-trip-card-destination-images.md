# Trip Card Destination Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded Unsplash photo on every trip card with a per-destination Pexels image fetched at trip creation time and stored in the `trips` table.

**Architecture:** A new nullable `cover_image_url` column on `trips` is populated via a Next.js API route (`/api/destination-image`) that proxies Pexels. `CreateTripModal` calls this route after inserting a new trip and updates the row. Existing trips fall back to a single generic travel photo constant.

**Tech Stack:** Supabase Postgres (migration), Next.js 16 App Router (API route), SST v3 secret (`PexelsApiKey`), Pexels Photos API v1, React Query v5 (cache invalidation), TypeScript.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/20260323000000_add_cover_image_url.sql` | Create | Add `cover_image_url text nullable` to `trips` |
| `packages/shared/src/types/index.ts` | Modify (line 86) | Add `cover_image_url?: string \| null` to `Trip` interface |
| `infra/secrets.ts` | Modify | Add `pexelsApiKey = new sst.Secret('PexelsApiKey')` |
| `infra/web.ts` | Modify | Inject `PEXELS_API_KEY` env var from secret |
| `apps/web/app/api/destination-image/route.ts` | Create | GET handler — proxies Pexels, returns `{ url: string \| null }` |
| `apps/web/components/trips/CreateTripModal.tsx` | Modify | After trip insert: fetch image URL, update `cover_image_url` |
| `apps/web/app/(main)/trips/page.tsx` | Modify | Replace hardcoded Unsplash URL with `t.cover_image_url ?? FALLBACK_IMAGE` |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260323000000_add_cover_image_url.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260323000000_add_cover_image_url.sql
ALTER TABLE trips ADD COLUMN cover_image_url text;
```

- [ ] **Step 2: Apply the migration**

Run in the project root:
```bash
npx supabase db push
```

Expected: migration applies cleanly. Existing rows will have `cover_image_url = NULL`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260323000000_add_cover_image_url.sql
git commit -m "feat: add cover_image_url column to trips"
```

---

## Task 2: Update `Trip` Type

**Files:**
- Modify: `packages/shared/src/types/index.ts:86`

- [ ] **Step 1: Add the field to the `Trip` interface**

In `packages/shared/src/types/index.ts`, the `Trip` interface ends at line 86 (`updated_at`). Add `cover_image_url` before the closing brace:

```ts
// Before (line 84–86):
  created_at: string;
  updated_at: string;
}

// After:
  created_at: string;
  updated_at: string;
  cover_image_url?: string | null;
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors. `MockTripCard extends Trip`, so the field flows through automatically — no other type changes needed.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat: add cover_image_url to Trip type"
```

---

## Task 3: SST Secret Config

**Files:**
- Modify: `infra/secrets.ts`
- Modify: `infra/web.ts`

- [ ] **Step 1: Add the secret to `infra/secrets.ts`**

```ts
// infra/secrets.ts — add this line:
export const pexelsApiKey = new sst.Secret('PexelsApiKey')
```

Full file after edit:
```ts
export const supabaseSecretKey = new sst.Secret('SupabaseSecretKey')
export const supabaseUrl = new sst.Secret('SupabaseUrl')
export const serpApiKey = new sst.Secret('SerpApiKey')
export const pexelsApiKey = new sst.Secret('PexelsApiKey')
```

- [ ] **Step 2: Inject the env var in `infra/web.ts`**

```ts
// infra/web.ts — full file after edit:
import { api } from './api'
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

- [ ] **Step 3: Set the secret value (one-time, not committed)**

```bash
npx sst secret set PexelsApiKey <your-pexels-api-key>
```

Get a free API key at https://www.pexels.com/api/ if you don't have one.

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add infra/secrets.ts infra/web.ts
git commit -m "feat: add PexelsApiKey SST secret for destination images"
```

---

## Task 4: Destination-Image API Route

**Files:**
- Create: `apps/web/app/api/destination-image/route.ts`

- [ ] **Step 1: Create the route handler**

```ts
// apps/web/app/api/destination-image/route.ts
import { NextRequest, NextResponse } from 'next/server'

interface PexelsPhoto {
  src: {
    large2x: string
    large: string
  }
}

interface PexelsResponse {
  photos: PexelsPhoto[]
}

export async function GET(req: NextRequest) {
  const destination = req.nextUrl.searchParams.get('destination')

  if (!destination) {
    return NextResponse.json({ url: null }, { status: 400 })
  }

  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) {
    console.error('PEXELS_API_KEY not configured')
    return NextResponse.json({ url: null })
  }

  try {
    const query = encodeURIComponent(`${destination} travel`)
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${query}&per_page=15&orientation=landscape`,
      { headers: { Authorization: apiKey } }
    )

    if (!res.ok) {
      console.error(`Pexels API error: ${res.status}`)
      return NextResponse.json({ url: null })
    }

    const data: PexelsResponse = await res.json()

    if (!data.photos || data.photos.length === 0) {
      return NextResponse.json({ url: null })
    }

    const photo = data.photos[Math.floor(Math.random() * data.photos.length)]
    return NextResponse.json({ url: photo.src.large2x })
  } catch (err) {
    console.error('Pexels fetch failed:', err)
    return NextResponse.json({ url: null })
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Manual smoke test**

With `sst dev` running, open a browser and visit:
```
http://localhost:3000/api/destination-image?destination=Paris
```

Expected response:
```json
{ "url": "https://images.pexels.com/photos/..." }
```

Try with an unlikely destination to verify graceful null:
```
http://localhost:3000/api/destination-image?destination=xyzabc123notaplace
```

Expected:
```json
{ "url": null }
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/destination-image/route.ts
git commit -m "feat: add /api/destination-image Pexels proxy route"
```

---

## Task 5: Update `CreateTripModal`

**Files:**
- Modify: `apps/web/components/trips/CreateTripModal.tsx:174-206`

- [ ] **Step 1: Update `handleSubmit` to fetch and save the cover image**

Replace the `handleSubmit` function (lines 174–206) with:

```ts
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setError(null)
  if (!validate()) return

  setSubmitting(true)
  try {
    const { data, error: insertError } = await supabase
      .from('trips')
      .insert({
        title: title.trim(),
        destination: destination.trim(),
        start_date: startDate,
        end_date: endDate,
        status: 'planning',
        user_id: user?.id ?? null,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      return
    }

    // Fetch and store a destination cover image (non-fatal if it fails)
    const shortDest = destination.split(',')[0].trim()
    try {
      const imgRes = await fetch(`/api/destination-image?destination=${encodeURIComponent(shortDest)}`)
      const { url } = await imgRes.json() as { url: string | null }
      if (url) {
        await supabase
          .from('trips')
          .update({ cover_image_url: url })
          .eq('id', data.id)
      }
    } catch {
      // Non-fatal: trip was created, it will show the fallback image
    }

    await queryClient.invalidateQueries({ queryKey: ['trips'] })
    indexTrip(data.id)
    onClose()
    router.push(`/trip/${data.id}`)
  } finally {
    setSubmitting(false)
  }
}
```

Key changes:
- After the Supabase insert, trim `destination` to its first comma-delimited segment (`"Paris, Île-de-France, France"` → `"Paris"`) for a clean Pexels search
- Fetch `/api/destination-image`, update the trip if a URL comes back
- The entire image fetch + update is wrapped in its own `try/catch` — a failure here is non-fatal
- `invalidateQueries` runs after the image is saved so the React Query cache reflects the cover image immediately

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Manual test**

Create a new trip with a real destination (e.g. "Tokyo, Japan"). After the modal closes:
1. Check the trips page — the new trip card should show a Tokyo photo
2. Open Supabase Table Editor → `trips` table → confirm `cover_image_url` is populated for the new row

Also create a trip with a nonsense destination (e.g. "xyzabc") to verify it still creates successfully and falls back gracefully.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/trips/CreateTripModal.tsx
git commit -m "feat: fetch and store Pexels cover image on trip creation"
```

---

## Task 6: Update Trips Page

**Files:**
- Modify: `apps/web/app/(main)/trips/page.tsx:187-190`

- [ ] **Step 1: Add `FALLBACK_IMAGE` constant and update the trip map**

In `apps/web/app/(main)/trips/page.tsx`, add a constant near the top of the file (after the imports, before `STATUS_TABS`):

```ts
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800'
```

Then replace the `allTrips` map (lines 187–190):

```ts
// Before:
const allTrips: MockTripCard[] = (trips ?? []).map((t) => ({
  ...t,
  image: `https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800`,
}))

// After:
const allTrips: MockTripCard[] = (trips ?? []).map((t) => ({
  ...t,
  image: t.cover_image_url ?? FALLBACK_IMAGE,
}))
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Verify in browser**

Open `/trips`. Confirm:
- Newly created trips show their Pexels destination photo
- Existing trips (with `cover_image_url = null`) show the fallback Unsplash photo
- Past trips, skeleton loading, grid/list toggle all still work

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(main)/trips/page.tsx
git commit -m "feat: use cover_image_url on trip cards with fallback"
```

---

## Done

After all tasks are committed, run a final check:

```bash
npm run typecheck && npm run lint
```

Expected: zero errors, zero warnings.
