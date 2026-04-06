# Travyl Frontend — Dead Code & Shared Code Analysis

**Repo:** `/home/justin-lo/.openclaw/workspace/travyl-frontend`  
**Analyzed:** 2026-04-05  
**Files:** 569 TS/TSX files  

---

## 1. DEAD CODE

### 1.1 Stubs Returning Empty Data (Shared Package)

**`packages/shared/src/services/api.ts`** exports 4 functions that do nothing:

```typescript
// These tables don't exist in the current schema — return empty to avoid 404s
export async function fetchMosaicTiles(): Promise<MosaicTile[]> { return []; }
export async function fetchInspirationCards(): Promise<InspirationCard[]> { return []; }
export async function fetchExploreRows(): Promise<ExplorePlaceRow[]> { return []; }
export async function fetchHeroConfig(): Promise<HeroConfig | null> { return null; }
```

**Status:** Dead code. Web app has its own `fetchMosaicTiles` in `apps/web/components/home/TravelMosaic.tsx` that actually does work (calls external API). The shared version is never used.

**Action:** Delete these 4 functions from shared package. Also delete the associated types (`MosaicTile`, `InspirationCard`, `ExplorePlaceRow`, `HeroConfig`) if unused elsewhere.

### 1.2 Deprecated Table Stubs

**`api.ts` lines 117-130:**
```typescript
// itinerary_days table doesn't exist — itinerary lives in trip_context
export async function fetchItineraryDays(_tripId: string): Promise<ItineraryDayWithActivities[]> {
  return [];
}

export async function fetchFlights(tripId: string): Promise<Flight[]> {
  const { data, error } = await supabase
    .from('flights').select('*').eq('trip_id', tripId)...
  if (error) return []; // Table doesn't exist yet — fall back to trip_context
  ...
}

export async function fetchHotels(tripId: string): Promise<Hotel[]> {
  ... // Same pattern - returns [] on error
}
```

**Evidence:** Comments explicitly state tables don't exist. Functions return empty data as fallback.

### 1.3 Duplicate Gap Computation Functions

**Two different implementations:**

| File | Function | Interface | Constants |
|------|----------|-----------|-----------|
| `utils/gaps.ts` | `computeGaps` | `TimeGap { startHour, durationHours }` | DAY_START=8, DAY_END=22, MIN_GAP=0.75 |
| `utils/gapCompute.ts` | `computeGaps` | `Gap { startHour, endHour, durationHours }` | dayStart=8, dayEnd=22 (params), min gap=1 |

**Export confusion in `utils/index.ts`:**
```typescript
export { computeGaps as computeTimeGaps } from './gaps'      // Line 53
...
export { computeGaps } from './gapCompute'                 // Line 70
export type { Gap } from './gapCompute'
```

Both exported! Different interfaces! Potential for bugs.

**Action:** 
1. Determine which one is actually used
2. Delete the unused one
3. Update all imports to use the canonical version

### 1.4 Empty MOCK_PLACES Array Shadowing Real Data

**`apps/web/components/PlaceDetailOverlay.tsx` line 39:**
```typescript
const MOCK_PLACES: PlaceItem[] = [];  // Empty!
```

But there's a **2,100-line mock file** at `packages/shared/src/config/mockPlacesData.ts` with full mock data.

The component uses the empty local array instead of the shared one. Either:
1. Import the real mock data from shared, or
2. Delete the local empty array

### 1.5 Unused Session Tracker

**`packages/shared/src/utils/sessionTracker.ts`:**
```typescript
const shownSets = new Map<string, Set<string>>();
export function getShownIds(section: string): Set<string> { ... }
```

Exported in `index.ts` but grep shows **zero usages** outside its own file.

**Action:** Verify usage in mobile app, then delete if unused.

### 1.6 Unused Shuffle Function

**`apps/web/components/home/TravelMosaic.tsx` lines 51-58:**
```typescript
function shuffle<T>(arr: T[]): T[] { ... }
```

But `packages/shared/src/utils/index.ts` already exports:
```typescript
export function shuffle<T>(items: T[]): T[] { ... }
```

Local version duplicates shared utility.

### 1.7 Supabase Client Duplication

**Two Supabase clients exist:**
1. `packages/shared/src/services/supabase.ts` - Proxy-based shared client
2. `apps/web/lib/supabase-browser.ts` - Browser-specific client with SSR cookie support

Both are used! The web app uses `getSupabaseBrowser()` in several places but also configures the shared client via `configureSupabase()`. This is confusing and error-prone.

**Usage grep:**
```
apps/web/components/providers.tsx: import { getSupabaseBrowser }
apps/web/components/calendar/CalendarDashboard.tsx: import { getSupabaseBrowser }
apps/web/components/calendar/hooks/useBookingMatches.ts: import { getSupabaseBrowser }
```

**Issue:** Providers.tsx configures the shared client with the browser client:
```typescript
const supabaseClient = getSupabaseBrowser();
if (supabaseClient) {
  configureSupabase(supabaseClient);  // Replaces shared client
}
```

So the shared client is essentially a placeholder that gets replaced. The browser client is the real one.

---

## 2. SHARED CODE OPPORTUNITIES

### 2.1 Gap Computation Merge (HIGH PRIORITY)

**Current state:** Two gap computation utilities with overlapping functionality:

**`gaps.ts` features:**
- Merges overlapping activities
- Filters by MIN_GAP (45 min)
- Returns `TimeGap[]`

**`gapCompute.ts` features:**
- No merge logic (simpler)
- Filters by hardcoded 1 hour
- Returns `Gap[]` with endHour

**Recommendation:** Merge into single robust implementation:
```typescript
export interface TimeGap {
  startHour: number;
  endHour: number;        // Add this
  durationHours: number;
}

export function computeGaps(
  activities: Array<{ startHour: number; duration: number }>,
  options?: { 
    dayStart?: number; 
    dayEnd?: number; 
    minGap?: number;
    mergeOverlapping?: boolean;  // Toggle gaps.ts behavior
  }
): TimeGap[]
```

### 2.2 Image URL Utilities (Duplicated Logic)

**`utils/index.ts`:**
```typescript
export function upscaleGoogleImage(url: string, width = 600, height = 400): string | null {
  return url
    .replace(/=w\d+-h\d+[^&\s]*/, `=w${width}-h${height}-k-no`)
    .replace(/=s\d+-w\d+-h\d+[^&\s]*/, `=w${width}-h${height}-k-no`);
}
```

**`getTripHeroImage()` (same file) duplicates the regex:**
```typescript
return url.includes('googleusercontent.com')
  ? url.replace(/=w\d+-h\d+[^&\s]*/, '=w1200-h800-k-no')
       .replace(/=s\d+-w\d+-h\d+[^&\s]*/, '=w1200-h800-k-no')
  : url;
```

**Action:** Use `upscaleGoogleImage()` inside `getTripHeroImage()`:
```typescript
export function getTripHeroImage(trip: {...}): string | null {
  const ctx = trip?.trip_context;
  return upscaleGoogleImage(ctx?.hero_image_url, 1200, 800)
    ?? ctx?.hero_images?.[0] 
    ?? ctx?.destination_photo_url 
    ?? null;
}
```

### 2.3 Shuffle Utilities (Already Exported, But Duplicated Locally)

**Already in shared:**
```typescript
export function shuffle<T>(items: T[]): T[] { ... }
```

**Local duplicates:**
- `apps/web/components/home/TravelMosaic.tsx` - local `shuffle()`

**Action:** Replace local shuffle with import from `@travyl/shared`

### 2.4 Type-Only Re-exports (Simplify Barrel Files)

**`services/lib/types.ts`:**
```typescript
import type { SuggestionCard } from '@travyl/shared/types'
export type { SuggestionCard } from '@travyl/shared/types'  // Redundant!
```

The second line is redundant if the first exists. Can simplify to:
```typescript
export type { SuggestionCard } from '@travyl/shared/types'
```

### 2.5 Mock Data Consolidation

**Current mock data files:**
- `packages/shared/src/config/mockPlacesData.ts` (2,124 lines)
- `packages/shared/src/config/mockItineraryData.ts` (1,326 lines)

**Used in:**
- `PlaceDetailOverlay.tsx` has `const MOCK_PLACES: PlaceItem[] = [];` (empty local!)

**Action:** 
1. Delete empty local MOCK_PLACES
2. Import from shared if needed, or
3. Create proper mock data factory/hooks

---

## 3. SPECIFIC FILES REQUIRING ATTENTION

| File | Issue | Lines | Action |
|------|-------|-------|--------|
| `packages/shared/src/services/api.ts` | 4 stub functions returning empty | ~20 | Delete stubs |
| `packages/shared/src/utils/gaps.ts` | Duplicate of gapCompute.ts | 82 | Merge or delete |
| `packages/shared/src/utils/gapCompute.ts` | Duplicate of gaps.ts | 29 | Merge or delete |
| `packages/shared/src/utils/sessionTracker.ts` | Unused utility | 14 | Verify, then delete |
| `apps/web/components/PlaceDetailOverlay.tsx` | Empty MOCK_PLACES shadows shared | 1 | Import from shared |
| `apps/web/components/home/TravelMosaic.tsx` | Local shuffle() duplicates shared | 8 | Use shared import |
| `apps/web/lib/supabase-browser.ts` | Duplicates shared client logic | 15 | Consider consolidation |

---

## 4. ESTIMATED CLEANUP IMPACT

| Category | Lines | Files Affected | Risk |
|------------|-------|----------------|------|
| Delete dead stubs | ~30 | 1 | Very Low |
| Merge gap utilities | ~100 | 2 | Low |
| Remove duplicate shuffle | ~8 | 1 | Very Low |
| Consolidate MOCK_PLACES | ~1 | 1 | Low |
| Delete sessionTracker | ~14 | 1 | Verify first |
| Simplify type re-exports | ~5 | 1 | Very Low |
| **TOTAL** | **~160** | **7** | **Low** |

---

## 5. ADDITIONAL OBSERVATIONS

### 5.1 Import Path Inconsistency

Some imports use deep paths (discouraged per ARCHITECTURE.md):
```typescript
import { savePlanToSupabase } from '@travyl/shared/src/services/api';  // ❌ Deep path
```

Should be:
```typescript
import { savePlanToSupabase } from '@travyl/shared';  // ✅ Barrel export
```

But `savePlanToSupabase` isn't exported from the barrel! This is why deep imports are used.

**Action:** Add `savePlanToSupabase` to `packages/shared/src/services/index.ts` exports.

### 5.2 Unused Type Exports

`packages/shared/src/types/index.ts` is 956 lines. Many types may be unused. Quick scan shows:
- `TripContextData` - massive interface, partially used
- `TravelerMetadata` - unclear if used
- Many `any[]` typed arrays in `TripContextData`

**Recommendation:** Run a type coverage tool to find unused types.

### 5.3 Test Files With No Corresponding Source

Found test files that may test deleted/renamed source:
- `services/lib/__tests__/conflictDetection.test.ts` - check if source still exists
- `services/lib/__tests__/haversine.test.ts` - haversine is now in shared/utils

---

## 6. RECOMMENDED CLEANUP ORDER

### Phase 1: Zero-Risk Deletions (15 min)
1. Delete 4 stub functions from `api.ts`
2. Delete empty `MOCK_PLACES` from `PlaceDetailOverlay.tsx`
3. Replace local `shuffle()` with shared import

### Phase 2: Merge Duplicates (1 hour)
1. Analyze which `computeGaps` is actually used
2. Merge into single implementation
3. Update all imports
4. Delete unused file

### Phase 3: Barrel File Cleanup (30 min)
1. Export missing functions from shared barrel files
2. Replace deep imports with barrel imports
3. Fix type re-export redundancy

### Phase 4: Verify & Delete (15 min)
1. Check if `sessionTracker.ts` is used in mobile app
2. Delete if unused

---

*Analysis by Ambatutron | 2026-04-05*
