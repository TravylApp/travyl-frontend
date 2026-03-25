# Pexels Trip Hero Image Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically fetch a Pexels landscape photo for trips that have no hero image, persist it to `trip_context.hero_images` in Supabase, and include the URL in the embedding metadata so it appears in spotlight search thumbnails.

**Architecture:** A new `services/lib/pexels.ts` helper wraps the Pexels `/v1/search` API. Both `index-trip.ts` (the real-time Lambda) and `backfill-embeddings.ts` (the one-shot script) call it when a trip has an empty `hero_images` array, then write the result back to the `trips` table before building the embedding metadata. The `Pexels` SST secret is added to `infra/secrets.ts` and linked to the `/index` Lambda.

**Tech Stack:** TypeScript, SST v3 Ion (AWS Lambda), Supabase (service-key client), Pexels Photos API v1

---

## File Map

| File | Change |
|------|--------|
| `infra/secrets.ts` | Add `pexels` secret |
| `infra/api.ts` | Link `pexels` to `/index` Lambda |
| `services/lib/pexels.ts` | Create — Pexels API wrapper |
| `services/index-trip.ts` | Add enrichment block before metadata build |
| `services/backfill-embeddings.ts` | Add enrichment block inside per-trip loop |

---

### Task 1: Add `Pexels` SST secret

**Files:**
- Modify: `infra/secrets.ts`
- Modify: `infra/api.ts:3,71`

- [ ] **Step 1: Add the secret to `infra/secrets.ts`**

  Append to the file:
  ```typescript
  export const pexels = new sst.Secret('Pexels')
  ```
  Full file after change:
  ```typescript
  export const supabaseSecretKey = new sst.Secret('SupabaseSecretKey')
  export const supabaseUrl = new sst.Secret('SupabaseUrl')
  export const serpApiKey = new sst.Secret('SerpApiKey')
  export const pexels = new sst.Secret('Pexels')
  ```

- [ ] **Step 2: Import and link `pexels` in `infra/api.ts`**

  Change the import on line 3 from:
  ```typescript
  import { supabaseSecretKey, supabaseUrl, serpApiKey } from './secrets'
  ```
  To:
  ```typescript
  import { supabaseSecretKey, supabaseUrl, serpApiKey, pexels } from './secrets'
  ```

  Change the `/index` route's `link` array (lines 69-78) from:
  ```typescript
  api.route('POST /index', {
    handler: 'services/index-trip.handler',
    link: [supabaseSecretKey, supabaseUrl],
    permissions: [
      {
        actions: ['bedrock:InvokeModel'],
        resources: ['arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0'],
      },
    ],
  })
  ```
  To:
  ```typescript
  api.route('POST /index', {
    handler: 'services/index-trip.handler',
    link: [supabaseSecretKey, supabaseUrl, pexels],
    permissions: [
      {
        actions: ['bedrock:InvokeModel'],
        resources: ['arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0'],
      },
    ],
  })
  ```

- [ ] **Step 3: Typecheck**

  ```bash
  npm run typecheck
  ```
  Expected: no errors in `infra/`.

- [ ] **Step 4: Commit**

  ```bash
  git add infra/secrets.ts infra/api.ts
  git commit -m "feat: add Pexels SST secret and link to index-trip Lambda"
  ```

---

### Task 2: Create `services/lib/pexels.ts`

**Files:**
- Create: `services/lib/pexels.ts`

- [ ] **Step 1: Create the file**

  ```typescript
  // services/lib/pexels.ts
  import { Resource } from 'sst'

  interface PexelsPhoto {
    src: { large: string }
  }

  interface PexelsSearchResponse {
    photos: PexelsPhoto[]
  }

  /**
   * Fetches the first landscape photo URL from Pexels for a given destination query.
   * Returns null on any error or if no photos are found.
   */
  export async function fetchPexelsImage(destination: string): Promise<string | null> {
    const apiKey = Resource.Pexels.value
    const url = new URL('https://api.pexels.com/v1/search')
    url.searchParams.set('query', destination)
    url.searchParams.set('per_page', '1')
    url.searchParams.set('orientation', 'landscape')

    try {
      const res = await fetch(url.toString(), {
        headers: { Authorization: apiKey },
      })
      if (!res.ok) {
        console.error(`[pexels] fetch failed: ${res.status}`)
        return null
      }
      const data = await res.json() as PexelsSearchResponse
      return data.photos[0]?.src?.large ?? null
    } catch (err) {
      console.error('[pexels] fetch error:', err)
      return null
    }
  }
  ```

- [ ] **Step 2: Typecheck**

  ```bash
  npm run typecheck
  ```
  Expected: no errors. Note: `Resource.Pexels` will show a type error until the first `sst deploy` regenerates `sst-env.d.ts` — this is expected and will resolve after Task 4's deploy step.

- [ ] **Step 3: Commit**

  ```bash
  git add services/lib/pexels.ts
  git commit -m "feat: add Pexels image fetch helper"
  ```

---

### Task 3: Add Pexels enrichment to `index-trip.ts`

**Files:**
- Modify: `services/index-trip.ts`

The current file has `TripContextJson` and the metadata block at lines 67-78. We need to:
1. Import `fetchPexelsImage`
2. Before building the metadata, check if `hero_images` is empty — if so, call Pexels and write back to the DB
3. Use the resolved `heroImages` array in the metadata instead of accessing `tripContext` directly

- [ ] **Step 1: Add the import**

  Change line 6 from:
  ```typescript
  import { generateEmbedding } from './lib/embeddings'
  ```
  To:
  ```typescript
  import { generateEmbedding } from './lib/embeddings'
  import { fetchPexelsImage } from './lib/pexels'
  ```

- [ ] **Step 2: Replace the metadata block with enrichment logic**

  Replace lines 67-78:
  ```typescript
  // Upsert to trip_embeddings
  interface TripContextJson { hero_images?: string[] }
  const tripContext = trip.trip_context as TripContextJson | null

  const metadata = {
    title: trip.title,
    destination: trip.destination,
    status: trip.status,
    startDate: trip.start_date,
    endDate: trip.end_date,
    activityCount: activities?.length ?? 0,
    imageUrl: tripContext?.hero_images?.[0] ?? null,
  }
  ```
  With:
  ```typescript
  // Enrich with Pexels image if none exists
  interface TripContextJson { hero_images?: string[] }
  const tripContext = trip.trip_context as TripContextJson | null
  let heroImages = tripContext?.hero_images ?? []

  if (heroImages.length === 0 && trip.destination) {
    const pexelsUrl = await fetchPexelsImage(trip.destination)
    if (pexelsUrl) {
      heroImages = [pexelsUrl]
      await supabase
        .from('trips')
        .update({
          trip_context: {
            ...((trip.trip_context as object) ?? {}),
            hero_images: heroImages,
          },
        })
        .eq('id', tripId)
    }
  }

  // Upsert to trip_embeddings
  const metadata = {
    title: trip.title,
    destination: trip.destination,
    status: trip.status,
    startDate: trip.start_date,
    endDate: trip.end_date,
    activityCount: activities?.length ?? 0,
    imageUrl: heroImages[0] ?? null,
  }
  ```

- [ ] **Step 3: Typecheck**

  ```bash
  npm run typecheck
  ```
  Expected: no errors in `services/index-trip.ts` (ignore any `Resource.Pexels` type error until deploy regenerates `sst-env.d.ts`).

- [ ] **Step 4: Commit**

  ```bash
  git add services/index-trip.ts
  git commit -m "feat: fetch Pexels image in index-trip when trip has no hero image"
  ```

---

### Task 4: Add Pexels enrichment to `backfill-embeddings.ts`

**Files:**
- Modify: `services/backfill-embeddings.ts`

The current file already has `TripContextJson` declared at line 23 (above the for loop) as `{ hero_images?: string[] }` — no change needed to the interface itself.

- [ ] **Step 1: Add the import**

  Change line 4 from:
  ```typescript
  import { generateEmbedding } from './lib/embeddings'
  ```
  To:
  ```typescript
  import { generateEmbedding } from './lib/embeddings'
  import { fetchPexelsImage } from './lib/pexels'
  ```

- [ ] **Step 2: Replace the per-trip `tripContext`/`metadata` block with enrichment logic**

  Inside the `for` loop, replace lines 48-57:
  ```typescript
  const tripContext = trip.trip_context as TripContextJson | null
  const metadata = {
    title: trip.title,
    destination: trip.destination,
    status: trip.status,
    startDate: trip.start_date,
    endDate: trip.end_date,
    activityCount: activities?.length ?? 0,
    imageUrl: tripContext?.hero_images?.[0] ?? null,
  }
  ```
  With:
  ```typescript
  const tripContext = trip.trip_context as TripContextJson | null
  let heroImages = tripContext?.hero_images ?? []

  if (heroImages.length === 0 && trip.destination) {
    const pexelsUrl = await fetchPexelsImage(trip.destination)
    if (pexelsUrl) {
      heroImages = [pexelsUrl]
      await supabase
        .from('trips')
        .update({
          trip_context: {
            ...((trip.trip_context as object) ?? {}),
            hero_images: heroImages,
          },
        })
        .eq('id', trip.id)
    }
  }

  const metadata = {
    title: trip.title,
    destination: trip.destination,
    status: trip.status,
    startDate: trip.start_date,
    endDate: trip.end_date,
    activityCount: activities?.length ?? 0,
    imageUrl: heroImages[0] ?? null,
  }
  ```

- [ ] **Step 3: Typecheck**

  ```bash
  npm run typecheck
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add services/backfill-embeddings.ts
  git commit -m "feat: fetch Pexels image in backfill when trip has no hero image"
  ```

---

### Task 5: Set secret, deploy, and run backfill

This task requires a Pexels API key. Get one free at https://www.pexels.com/api/ if you don't have one yet.

- [ ] **Step 1: Set the `Pexels` SST secret**

  ```bash
  AWS_PROFILE=travyl npx sst secret set Pexels <your-pexels-api-key>
  ```
  Expected: `✓ Set Pexels for stage justinjusti`

- [ ] **Step 2: Deploy (updates Lambda + regenerates `sst-env.d.ts`)**

  ```bash
  AWS_PROFILE=travyl npx sst deploy
  ```
  Expected: deploy completes, `sst-env.d.ts` is regenerated with `Pexels` resource.

- [ ] **Step 3: Run the backfill**

  ```bash
  AWS_PROFILE=travyl npx sst shell -- npx tsx services/backfill-embeddings.ts
  ```
  Expected output — for each trip without an existing hero image and with a real destination, you should see Pexels fetching happening and then:
  ```
  Backfilling 16 trips...
  Indexed: Kathmandu, Nepal (...)
  Indexed: New York, United States (...)
  ...
  Backfill complete.
  ```
  Trips with existing `hero_images` (Kathmandu, New York) are re-indexed but Pexels is NOT called for them — their existing image is used.

- [ ] **Step 4: Verify in the browser**

  1. `npm run web`
  2. Open the app, press `Ctrl+K`
  3. Search for a real destination trip (e.g. "Napa" or "lady boys")
  4. Confirm a thumbnail now appears next to it
  5. Check the trip's entry in Supabase `trips` table — `trip_context.hero_images` should contain a Pexels URL (`images.pexels.com/...`)
