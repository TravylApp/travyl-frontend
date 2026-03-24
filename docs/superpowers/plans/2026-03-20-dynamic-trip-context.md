# Dynamic Trip Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every trip's overview page render destination-specific content from `trip_context` JSONB instead of hardcoded mock data.

**Architecture:** Add a `TripContextData` type to the shared package. Update `Trip.trip_context` to use it. Refactor 4 web components to read from `trip_context` and hide sections when data is absent. Delete unused mock constants.

**Tech Stack:** TypeScript, React, Next.js, Supabase (existing), TanStack Query (existing)

**Spec:** `docs/superpowers/specs/2026-03-20-dynamic-trip-context-design.md`

---

### Task 1: Add TripContextData type and update Trip interface

**Files:**
- Modify: `packages/shared/src/types/index.ts:17-39`
- Modify: `packages/shared/src/config/index.ts` (add export if needed)

- [ ] **Step 1: Add TripContextData interface before the Trip interface**

Add this above the existing `Trip` interface (before line 17):

```typescript
export interface TripContextData {
  hero_image_url?: string;
  hero_images?: string[];
  lat?: number;
  lng?: number;
  lede_text?: string;
  quick_facts?: {
    currency?: string;
    language?: string;
    timezone?: string;
    power?: string;
    transport?: string;
    taxi?: string;
    tipping?: string;
    water?: string;
    emergency?: string;
  };
  weather?: {
    current?: { high: number; low: number; condition: string };
    forecast?: { day: string; high: number; low: number; icon: string; condition: string }[];
  };
  explore_items?: {
    id: string;
    title: string;
    subtitle?: string;
    category: string;
    description: string;
    image?: string;
    tags?: string[];
  }[];
  news?: {
    id: string;
    title: string;
    snippet: string;
    category: 'event' | 'advisory' | 'news' | 'tip';
    source: string;
    date: string;
    url?: string;
    image?: string;
  }[];
}
```

- [ ] **Step 2: Update the trip_context field on the Trip interface**

Change line 28 from:
```typescript
trip_context: Record<string, unknown>;
```
to:
```typescript
trip_context: TripContextData;
```

- [ ] **Step 3: Verify the type compiles**

Run: `cd /Users/z/Travyl/travyl && npx tsc --noEmit --project packages/shared/tsconfig.json 2>&1 | head -20`

Expected: No errors related to `TripContextData`. There may be existing errors elsewhere — ignore those, just confirm no new ones.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat: add TripContextData type to Trip interface"
```

---

### Task 2: Refactor TripMagazineHero to read from trip_context

**Files:**
- Modify: `apps/web/components/trip/TripMagazineHero.tsx`

This component currently hardcodes: hero image (via MOCK_TRIPS lookup), quick facts (Paris-specific), weather (MOCK_WEATHER, MOCK_WEATHER_FORECAST).

- [ ] **Step 1: Update imports**

Remove `MOCK_WEATHER`, `MOCK_WEATHER_FORECAST`, `MOCK_TRIPS` from the import on line 5. Keep `formatDateRange`.

Change:
```typescript
import { formatDateRange, MOCK_WEATHER, MOCK_WEATHER_FORECAST, MOCK_TRIPS } from '@travyl/shared';
```
to:
```typescript
import { formatDateRange } from '@travyl/shared';
```

- [ ] **Step 2: Update hero image to read from trip_context**

Replace the MOCK_TRIPS image lookup (lines 23-25) with:
```typescript
const coverImage = trip?.trip_context?.hero_image_url
  ?? (trip as any)?.image?.replace(/\?w=\d+/, '?w=1600&q=80');
```

- [ ] **Step 3: Update weather to read from trip_context**

Replace the MOCK_WEATHER/MOCK_WEATHER_FORECAST usage (lines 21-22) with:
```typescript
const weather = trip?.trip_context?.weather?.current;
const forecast = trip?.trip_context?.weather?.forecast;
```

Update the weather icon selection (around line 32-33) to guard for undefined:
```typescript
const conditions = weather?.condition?.toLowerCase() ?? '';
```

Wrap the weather display (temperature, line ~86-87) with a conditional:
```typescript
{weather && (
  // existing weather JSX, using weather.high and weather.low
)}
```

Wrap the forecast rendering (lines ~90-96) with a conditional:
```typescript
{forecast && forecast.length > 0 && (
  // existing forecast JSX
)}
```

- [ ] **Step 4: Update quick facts to read from trip_context**

Replace the hardcoded quick facts (lines 66-81) with a conditional render:
```typescript
{trip?.trip_context?.quick_facts && (() => {
  const qf = trip.trip_context.quick_facts;
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] mb-3"
        style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
        {qf.currency && <span className="text-white/80"><span className="font-semibold text-white">{qf.currency.split(' · ')[0]}</span> · {qf.currency.split(' · ')[1] || ''}</span>}
        {qf.language && <span className="text-white/80"><span className="font-semibold text-white">{qf.language.split(' · ')[0]}</span> · {qf.language.split(' · ')[1] || ''}</span>}
        {qf.timezone && <span className="text-white/80"><span className="font-semibold text-white">{qf.timezone.split(' · ')[0]}</span> · {qf.timezone.split(' · ')[1] || ''}</span>}
        {qf.power && <span className="text-white/80"><span className="font-semibold text-white">{qf.power.split(' · ')[0]}</span> · {qf.power.split(' · ')[1] || ''}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] mb-5"
        style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
        {qf.transport && <span className="text-white/80"><span className="font-semibold text-white">{qf.transport.split(' · ')[0]}</span> · {qf.transport.split(' · ')[1] || ''}</span>}
        {qf.taxi && <span className="text-white/80"><span className="font-semibold text-white">{qf.taxi.split(' · ')[0]}</span> · {qf.taxi.split(' · ')[1] || ''}</span>}
        {qf.tipping && <span className="text-white/80"><span className="font-semibold text-white">{qf.tipping.split(' · ')[0]}</span> · {qf.tipping.split(' · ')[1] || ''}</span>}
        {qf.water && <span className="text-white/80"><span className="font-semibold text-white">{qf.water.split(' · ')[0]}</span> · {qf.water.split(' · ')[1] || ''}</span>}
        {qf.emergency && <span className="text-white/60"><span className="font-semibold text-red-400">{qf.emergency}</span> Emergency</span>}
      </div>
    </>
  );
})()}
```

- [ ] **Step 5: Verify the page renders without errors**

Run the dev server and navigate to `http://localhost:3000/trip/paris-adventure`. The hero should render. Since `trip_context` is empty in the database, quick facts and weather should be hidden. The hero image may fall back to the trip's `image` field.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/trip/TripMagazineHero.tsx
git commit -m "refactor: TripMagazineHero reads from trip_context instead of mocks"
```

---

### Task 3: Refactor overview page to read from trip_context

**Files:**
- Modify: `apps/web/app/(trips-app)/trip/[id]/page.tsx`

This component currently hardcodes: lede text, MOCK_EXPLORE_ITEMS, MOCK_NEWS, PARIS_PHOTOS, NEWS_GRADIENTS.

- [ ] **Step 1: Update imports**

Remove `MOCK_NEWS`, `MOCK_EXPLORE_ITEMS`, `NEWS_GRADIENTS` from the shared import (lines 7-9).

Change:
```typescript
import {
  useItineraryScreen,
  MOCK_NEWS,
  MOCK_EXPLORE_ITEMS, NEWS_GRADIENTS,
} from '@travyl/shared';
```
to:
```typescript
import { useItineraryScreen } from '@travyl/shared';
```

Remove the `NewsItem` type import if no longer needed.

- [ ] **Step 2: Remove PARIS_PHOTOS constant**

Delete the `PARIS_PHOTOS` array definition (lines 237-243).

- [ ] **Step 3: Update lede text to read from trip_context**

Replace the hardcoded lede paragraph (lines 312-318) with:
```typescript
{trip?.trip_context?.lede_text && (
  <div className="px-6 sm:px-10 mb-6">
    <p className="text-[13px] sm:text-[14px] leading-[1.8] max-w-lg font-serif"
      style={{ color: 'var(--magazine-heading)', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
      {trip.trip_context.lede_text}
    </p>
  </div>
)}
```

- [ ] **Step 4: Update Things to Do section to read from trip_context**

Replace `MOCK_EXPLORE_ITEMS` references with `trip?.trip_context?.explore_items ?? []`. Wrap the entire ThingsToDoSection in a conditional:
```typescript
{trip?.trip_context?.explore_items && trip.trip_context.explore_items.length > 0 && (
  // existing ThingsToDoSection JSX, using trip.trip_context.explore_items
)}
```

Update all references within the section: `MOCK_EXPLORE_ITEMS` → `trip.trip_context.explore_items`, `MOCK_EXPLORE_ITEMS.length` → `trip.trip_context.explore_items.length`.

- [ ] **Step 5: Update News / What's Going On section to read from trip_context**

Replace `const news = MOCK_NEWS;` (line 292) with:
```typescript
const news = trip?.trip_context?.news ?? [];
```

Wrap the news section in a conditional so it hides when empty:
```typescript
{news.length > 0 && (
  // existing news JSX
)}
```

Replace `NEWS_GRADIENTS` usage with a static fallback array defined locally (these are UI colors, not destination-specific):
```typescript
const NEWS_COLORS: [string, string][] = [
  ['#1a1a2e', '#16213e'],
  ['#0f3460', '#1a1a2e'],
  ['#533483', '#0f3460'],
];
```

- [ ] **Step 6: Update mosaic gallery to read from trip_context**

Replace `PARIS_PHOTOS` references with `trip?.trip_context?.hero_images ?? []`. Wrap the gallery in a conditional:
```typescript
{trip?.trip_context?.hero_images && trip.trip_context.hero_images.length > 0 && (
  // existing mosaic JSX using trip.trip_context.hero_images
)}
```

- [ ] **Step 7: Verify the page renders**

Navigate to `http://localhost:3000/trip/paris-adventure`. Since `trip_context` is empty, the lede, Things to Do, News, and gallery sections should all be hidden. The hero and day selector should still render.

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/(trips-app)/trip/[id]/page.tsx
git commit -m "refactor: overview page reads from trip_context instead of mocks"
```

---

### Task 4: Refactor TripLayoutInner to read from trip_context

**Files:**
- Modify: `apps/web/app/(trips-app)/trip/[id]/trip-layout-inner.tsx`

This component currently uses MOCK_DESTINATION_COORDS for the map center and MOCK_TRIPS for the hero image.

- [ ] **Step 1: Remove mock imports**

Remove `MOCK_DESTINATION_COORDS` and `MOCK_TRIPS` from the import on line 10.

- [ ] **Step 2: Update map coordinates**

Replace the MOCK_DESTINATION_COORDS usage (lines 397-398) with trip_context values:
```typescript
<LeafletMap
  lat={trip?.trip_context?.lat ?? 0}
  lng={trip?.trip_context?.lng ?? 0}
  label={trip?.destination || ''}
  zoom={13}
  height="100%"
  className="!rounded-none !border-0"
/>
```

Also wrap the map rendering in a conditional so it only shows when coordinates exist:
```typescript
{trip?.trip_context?.lat && trip?.trip_context?.lng && (
  // existing LeafletMap JSX
)}
```

- [ ] **Step 3: Update hero image lookup**

Replace the MOCK_TRIPS image lookup (line 49) with:
```typescript
const tripImage = trip?.trip_context?.hero_image_url
  ?? (trip as any)?.image;
```

- [ ] **Step 4: Verify the page renders**

Navigate to `http://localhost:3000/trip/paris-adventure`. The map should not appear (no coordinates in trip_context). The hero image area should handle the missing image gracefully.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/(trips-app)/trip/[id]/trip-layout-inner.tsx
git commit -m "refactor: TripLayoutInner reads coords and image from trip_context"
```

---

### Task 5: Delete unused mock constants from shared package

**Files:**
- Modify: `packages/shared/src/config/mockItineraryData.ts`
- Modify: `packages/shared/src/config/index.ts` (remove re-exports)

- [ ] **Step 1: Check for remaining references**

Run:
```bash
cd /Users/z/Travyl/travyl
grep -r "MOCK_EXPLORE_ITEMS\|MOCK_NEWS\|MOCK_WEATHER_FORECAST\|MOCK_DESTINATION_COORDS\|NEWS_GRADIENTS" --include="*.ts" --include="*.tsx" apps/ packages/ | grep -v node_modules | grep -v ".next"
```

This will show any remaining references. Mobile files will likely still reference some of these — those will be handled in Task 6.

- [ ] **Step 2: Remove exports from mockItineraryData.ts**

Delete these exports from `packages/shared/src/config/mockItineraryData.ts`:
- `MOCK_DESTINATION_COORDS` (line 321)
- `MOCK_WEATHER` (line 466) — keep if mobile still uses it
- `MOCK_WEATHER_FORECAST` (line 1164) — keep if mobile still uses it
- `MOCK_NEWS` (line 1176) — keep if mobile still uses it
- `MOCK_EXPLORE_ITEMS` (line 1231) — keep if mobile still uses it
- `NEWS_GRADIENTS` (line 1271)

If mobile still references them, leave the constants in place but remove the web imports. Mark them with a `// TODO: remove after mobile migration` comment.

- [ ] **Step 3: Remove re-exports from config/index.ts**

Remove any re-exports of the deleted constants from `packages/shared/src/config/index.ts`.

- [ ] **Step 4: Verify compilation**

Run: `cd /Users/z/Travyl/travyl && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -30`

Fix any remaining import references.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/config/mockItineraryData.ts packages/shared/src/config/index.ts
git commit -m "chore: remove unused mock constants replaced by trip_context"
```

---

### Task 6: Update mobile components to read from trip_context

**Files:**
- Modify: `apps/mobile/app/trip/[id]/index.tsx`
- Modify: `apps/mobile/app/trip/[id]/_layout.tsx`
- Modify: `apps/mobile/app/trip/[id]/itinerary.tsx`
- Modify: `apps/mobile/app/trip/[id]/info.tsx`
- Modify: `apps/mobile/app/trip/[id]/packing.tsx`
- Modify: `apps/mobile/app/(tabs)/trips/index.tsx`

Same pattern as web: replace mock constant references with `trip.trip_context.*` reads. Hide sections when data is absent.

- [ ] **Step 1: Check which mocks each mobile file uses**

Run:
```bash
cd /Users/z/Travyl/travyl
grep -n "MOCK_EXPLORE_ITEMS\|MOCK_NEWS\|MOCK_WEATHER\|MOCK_DESTINATION_COORDS\|MOCK_TRIPS\|NEWS_GRADIENTS" apps/mobile/ -r --include="*.tsx" --include="*.ts"
```

- [ ] **Step 2: Update each mobile file**

For each file, apply the same pattern:
1. Remove mock imports
2. Read from `trip.trip_context.*`
3. Conditionally render sections (hide when data absent)

- [ ] **Step 3: Verify mobile compiles**

Run: `cd /Users/z/Travyl/travyl && npx tsc --noEmit --project apps/mobile/tsconfig.json 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/
git commit -m "refactor: mobile components read from trip_context instead of mocks"
```

---

### Task 7: Final cleanup and delete mock constants

**Files:**
- Modify: `packages/shared/src/config/mockItineraryData.ts`
- Modify: `packages/shared/src/config/index.ts`

- [ ] **Step 1: Verify no remaining references**

Run:
```bash
cd /Users/z/Travyl/travyl
grep -r "MOCK_EXPLORE_ITEMS\|MOCK_NEWS\|MOCK_WEATHER_FORECAST\|MOCK_DESTINATION_COORDS\|NEWS_GRADIENTS" --include="*.ts" --include="*.tsx" apps/ packages/ | grep -v node_modules | grep -v ".next"
```

Expected: No matches (or only the definition lines themselves).

- [ ] **Step 2: Delete the constants**

Remove from `mockItineraryData.ts`:
- `MOCK_DESTINATION_COORDS`
- `MOCK_WEATHER` (the WeatherInfo constant, not the type)
- `MOCK_WEATHER_FORECAST`
- `MOCK_NEWS`
- `MOCK_EXPLORE_ITEMS`
- `NEWS_GRADIENTS`

Remove corresponding re-exports from `config/index.ts`.

- [ ] **Step 3: Verify full build**

Run:
```bash
cd /Users/z/Travyl/travyl
npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -20
npx tsc --noEmit --project apps/mobile/tsconfig.json 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared/
git commit -m "chore: delete mock constants fully replaced by trip_context"
```
