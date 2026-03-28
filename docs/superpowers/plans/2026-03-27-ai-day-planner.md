# AI Day Planner (Magic Wand) — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a wand button to the calendar toolbar that auto-fills a day's open time gaps with AI-suggested activities, shown as dismissible ghost blocks directly on the calendar grid.

**Architecture:** Four layers built bottom-up — (1) shared `computeGaps` utility, (2) `POST /fill-gaps` Lambda using SerpAPI, (3) `useGapFiller` hook + `GhostEventBlock` component, (4) wiring into `CalendarDashboard` / `CalendarToolbar` / `DayColumn` / `DayView` / `WeekView`.

**Tech Stack:** TypeScript, React 19, Next.js 16, Tailwind CSS v4, React Query, SST v4 Lambdas, SerpAPI, DynamoDB, Vitest, iconoir-react

**Spec:** `docs/superpowers/specs/2026-03-27-ai-day-planner-design.md`

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `packages/shared/src/utils/gapCompute.ts` | Pure `computeGaps` function |
| `packages/shared/src/utils/gapCompute.test.ts` | Vitest tests for `computeGaps` |
| `services/fill-gaps.ts` | Lambda handler for `POST /fill-gaps` |
| `apps/web/components/calendar/GhostEventBlock.tsx` | Ghost activity block with confirm/dismiss |
| `apps/web/components/calendar/hooks/useGapFiller.ts` | React Query mutation for `/fill-gaps` |

### Modified files

| File | Change |
|------|--------|
| `packages/shared/src/utils/index.ts` | Export `computeGaps`, `Gap` |
| `services/lib/cache.ts` | Add `getCachedGaps` / `setCachedGaps` |
| `infra/api.ts` | Add `POST /fill-gaps` route |
| `apps/web/components/calendar/CalendarToolbar.tsx` | Add wand button + 4 new props |
| `apps/web/components/calendar/CalendarDashboard.tsx` | Ghost state, `useGapFiller`, prop threading |
| `apps/web/components/calendar/DayColumn.tsx` | Ghost layer rendering |
| `apps/web/components/calendar/DayView.tsx` | Thread ghost props |
| `apps/web/components/calendar/WeekView.tsx` | Thread ghost props |

---

## Chunk 1: Shared — `computeGaps`

### Task 1: `computeGaps` — Tests

**Files:**
- Create: `packages/shared/src/utils/gapCompute.test.ts`
- Create: `packages/shared/src/utils/gapCompute.ts` (stub to make file exist)

- [ ] **Step 1: Create stub**

```typescript
// packages/shared/src/utils/gapCompute.ts
export interface Gap {
  startHour: number
  endHour: number
  durationHours: number
}

export function computeGaps(
  _activities: Array<{ startHour: number; duration: number }>,
  _dayStart = 8,
  _dayEnd = 22,
): Gap[] {
  return []
}
```

- [ ] **Step 2: Write tests**

```typescript
// packages/shared/src/utils/gapCompute.test.ts
import { describe, it, expect } from 'vitest'
import { computeGaps } from './gapCompute'

describe('computeGaps', () => {
  it('returns full day as one gap when no activities', () => {
    const result = computeGaps([])
    expect(result).toEqual([{ startHour: 8, endHour: 22, durationHours: 14 }])
  })

  it('returns gap before first activity', () => {
    const result = computeGaps([{ startHour: 11, duration: 1 }])
    expect(result).toContainEqual({ startHour: 8, endHour: 11, durationHours: 3 })
  })

  it('returns gap after last activity', () => {
    const result = computeGaps([{ startHour: 9, duration: 2 }])
    expect(result).toContainEqual({ startHour: 11, endHour: 22, durationHours: 11 })
  })

  it('returns gap between two activities', () => {
    const result = computeGaps([
      { startHour: 9, duration: 1 },
      { startHour: 14, duration: 2 },
    ])
    expect(result).toContainEqual({ startHour: 10, endHour: 14, durationHours: 4 })
  })

  it('filters out gaps shorter than 1 hour', () => {
    const result = computeGaps([
      { startHour: 9, duration: 1 },
      { startHour: 9.5, duration: 2 },  // overlapping; leaves 0.5h before
    ])
    // The gap before (8–9) is 1h, included
    // The gap after (11.5–22) is included
    // No sub-1h gaps
    result.forEach((g) => expect(g.durationHours).toBeGreaterThanOrEqual(1))
  })

  it('handles activities that overlap (cursor advances past overlapping end)', () => {
    const result = computeGaps([
      { startHour: 9, duration: 3 },  // 9–12
      { startHour: 10, duration: 1 }, // 10–11 (inside first)
    ])
    // Cursor ends at 12, not 11
    const afterGap = result.find((g) => g.startHour === 12)
    expect(afterGap).toBeDefined()
    expect(afterGap?.endHour).toBe(22)
  })

  it('respects custom dayStart and dayEnd', () => {
    const result = computeGaps([], 6, 24)
    expect(result).toEqual([{ startHour: 6, endHour: 24, durationHours: 18 }])
  })

  it('returns empty when day is fully scheduled', () => {
    const result = computeGaps([{ startHour: 8, duration: 14 }]) // 8–22
    expect(result).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Run tests — expect failures**

```bash
cd packages/shared && npm test -- --reporter=verbose 2>&1 | grep -A3 "gapCompute"
```
Expected: multiple FAIL

---

### Task 2: `computeGaps` — Implementation

**Files:**
- Modify: `packages/shared/src/utils/gapCompute.ts`

- [ ] **Step 1: Implement**

```typescript
// packages/shared/src/utils/gapCompute.ts
export interface Gap {
  startHour: number
  endHour: number
  durationHours: number
}

export function computeGaps(
  activities: Array<{ startHour: number; duration: number }>,
  dayStart = 8,
  dayEnd = 22,
): Gap[] {
  const sorted = [...activities].sort((a, b) => a.startHour - b.startHour)
  const gaps: Gap[] = []
  let cursor = dayStart

  for (const act of sorted) {
    if (act.startHour > cursor) {
      const duration = act.startHour - cursor
      gaps.push({ startHour: cursor, endHour: act.startHour, durationHours: duration })
    }
    cursor = Math.max(cursor, act.startHour + act.duration)
  }

  if (cursor < dayEnd) {
    gaps.push({ startHour: cursor, endHour: dayEnd, durationHours: dayEnd - cursor })
  }

  return gaps.filter((g) => g.durationHours >= 1)
}
```

- [ ] **Step 2: Run tests — expect all pass**

```bash
cd packages/shared && npm test -- --reporter=verbose 2>&1 | grep -A3 "gapCompute"
```
Expected: all PASS

---

### Task 3: Export from shared barrel

**Files:**
- Modify: `packages/shared/src/utils/index.ts` (append at end of file)

- [ ] **Step 1: Add exports to `packages/shared/src/utils/index.ts`**

Append to the end of the file:

```typescript
// Gap computation utility
export { computeGaps } from './gapCompute'
export type { Gap } from './gapCompute'
```

- [ ] **Step 2: Verify the export is accessible**

```bash
cd packages/shared && npm run build 2>&1 | tail -5
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/utils/gapCompute.ts packages/shared/src/utils/gapCompute.test.ts packages/shared/src/utils/index.ts
git commit -m "feat: add computeGaps shared utility"
```

---

## Chunk 2: Backend — Cache, Lambda, Route

### Task 4: Cache helpers

**Files:**
- Modify: `services/lib/cache.ts`

- [ ] **Step 1: Add gap cache helpers**

Append to `services/lib/cache.ts` after the existing `setCachedSuggestions` function:

```typescript
// ─── Gap-fill cache ────────────────────────────────────────────

export interface GapSuggestion {
  title: string
  type: string
  startHour: number
  duration: number
  latitude?: number
  longitude?: number
  address?: string
  rating?: number
  price?: number | null
  image?: string
  description?: string
}

interface GapCacheEntry {
  pk: string
  sk: string
  suggestions: GapSuggestion[]
  expiresAt: number
}

export async function getCachedGaps(
  tripId: string,
  date: string,
): Promise<GapSuggestion[] | null> {
  const result = await client.send(
    new GetCommand({
      TableName: Resource.RecommendationCache.name,
      Key: { pk: `fill-gaps:${tripId}:${date}`, sk: 'gaps' },
    }),
  )
  if (!result.Item) return null
  const entry = result.Item as GapCacheEntry
  if (entry.expiresAt < Math.floor(Date.now() / 1000)) return null
  return entry.suggestions
}

export async function setCachedGaps(
  tripId: string,
  date: string,
  suggestions: GapSuggestion[],
  ttlSeconds = 1800,
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: Resource.RecommendationCache.name,
      Item: {
        pk: `fill-gaps:${tripId}:${date}`,
        sk: 'gaps',
        suggestions,
        expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
      },
    }),
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck 2>&1 | grep "cache.ts"
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add services/lib/cache.ts
git commit -m "feat: add getCachedGaps/setCachedGaps cache helpers"
```

---

### Task 5: `fill-gaps` Lambda handler

**Files:**
- Create: `services/fill-gaps.ts`

- [ ] **Step 1: Create the Lambda**

```typescript
// services/fill-gaps.ts
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { validateAuth } from './lib/auth'
import { getCachedGaps, setCachedGaps, type GapSuggestion } from './lib/cache'
import { searchPlaces } from './lib/serpapi'
import { computeGaps } from '@travyl/shared'

interface FillGapsRequestBody {
  tripId: string
  date: string
  destination: string
  activities: Array<{
    id: string
    title: string
    type: string
    startHour: number
    duration: number
    latitude?: number
    longitude?: number
  }>
}

// Activity types to cycle through for variety
const CATEGORY_ROTATION = [
  'sightseeing', 'dining', 'cultural', 'outdoor', 'shopping', 'tour',
] as const

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    console.log('[fill-gaps] userId:', userId)

    const body = JSON.parse(event.body ?? '{}') as FillGapsRequestBody
    const { tripId, date, destination, activities = [] } = body

    if (!tripId || !date || !destination) {
      return { statusCode: 400, body: JSON.stringify({ error: 'tripId, date, and destination required' }) }
    }

    // Check cache
    const cached = await getCachedGaps(tripId, date)
    if (cached) {
      console.log('[fill-gaps] cache hit, returning', cached.length, 'suggestions')
      return { statusCode: 200, body: JSON.stringify({ suggestions: cached }) }
    }

    // Compute free time slots
    const gaps = computeGaps(
      activities.map((a) => ({ startHour: a.startHour, duration: a.duration })),
    )
    console.log('[fill-gaps] computed', gaps.length, 'gaps for', destination)

    if (gaps.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ suggestions: [] }) }
    }

    // Collect already-scheduled types to avoid repeating
    const scheduledTypes = new Set(activities.map((a) => a.type.toLowerCase()))

    // Pick a category for each gap, prioritising types not yet scheduled
    const suggestions: GapSuggestion[] = []

    for (const gap of gaps.slice(0, 3)) {
      const unusedCategory = CATEGORY_ROTATION.find((c) => !scheduledTypes.has(c))
      const category = unusedCategory ?? 'sightseeing'

      const places = await searchPlaces(destination, category, { limit: 5 })
      if (places.length === 0) continue

      // Deduplicate against already-scheduled activity titles (case-insensitive)
      const scheduledTitles = activities.map((a) => a.title.toLowerCase())
      const place = places.find(
        (p) => !scheduledTitles.some((t) => t.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(t)),
      ) ?? places[0]

      // Clamp duration to fit the gap, max 2.5h
      const duration = Math.min(gap.durationHours, 2.5)

      suggestions.push({
        title: place.name,
        type: category,
        startHour: gap.startHour,
        duration,
        latitude: place.latitude ?? undefined,
        longitude: place.longitude ?? undefined,
        address: place.address ?? undefined,
        rating: place.rating ?? undefined,
        price: place.price ?? null,
        image: place.image ?? undefined,
        description: place.description ?? undefined,
      })

      scheduledTypes.add(category)
    }

    console.log('[fill-gaps] returning', suggestions.length, 'suggestions')

    if (suggestions.length > 0) {
      await setCachedGaps(tripId, date, suggestions)
    }

    return { statusCode: 200, body: JSON.stringify({ suggestions }) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[fill-gaps] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck 2>&1 | grep "fill-gaps"
```
Expected: no errors

---

### Task 6: Register route in `infra/api.ts`

**Files:**
- Modify: `infra/api.ts`

- [ ] **Step 1: Add the route**

**Depends on:** Task 3 Step 2 (shared build verify) must pass before this Lambda will compile.

Add immediately after the closing `})` of the `GET /suggest` block (line 48 in `infra/api.ts`):

```typescript
api.route('POST /fill-gaps', {
  handler: 'services/fill-gaps.handler',
  link: [cacheTable, supabaseSecretKey, supabaseUrl, serpApiKey],
})
```

- [ ] **Step 2: Commit**

```bash
git add services/fill-gaps.ts infra/api.ts
git commit -m "feat: add POST /fill-gaps Lambda endpoint"
```

---

## Chunk 3: Frontend Components

### Task 7: `GhostEventBlock` component

**Files:**
- Create: `apps/web/components/calendar/GhostEventBlock.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/components/calendar/GhostEventBlock.tsx
'use client'
import { HOUR_HEIGHT } from './constants'
import type { CalendarActivity } from './types'

interface GhostEventBlockProps {
  activity: CalendarActivity
  timeRangeStartHour: number
  onConfirm: (activity: CalendarActivity) => void
  onDismiss: (id: string) => void
}

export function GhostEventBlock({
  activity,
  timeRangeStartHour,
  onConfirm,
  onDismiss,
}: GhostEventBlockProps) {
  const top = (activity.startHour - timeRangeStartHour) * HOUR_HEIGHT
  const height = activity.duration * HOUR_HEIGHT

  return (
    <div
      className="absolute left-0 right-0 px-1"
      style={{ top, height, pointerEvents: 'auto' }}
    >
      <div
        className="relative h-full rounded-md border-2 border-dashed flex flex-col justify-between p-2 overflow-hidden"
        style={{
          opacity: 0.55,
          borderColor: 'var(--cal-accent)',
          background: 'color-mix(in srgb, var(--cal-accent) 10%, transparent)',
        }}
      >
        <span className="text-[11px] font-medium text-[var(--cal-text)] truncate leading-tight">
          {activity.title}
        </span>
        <div className="flex gap-1 justify-end mt-1">
          <button
            onClick={() => onConfirm(activity)}
            className="text-[10px] font-semibold rounded px-2 py-0.5 transition-opacity"
            style={{ background: 'var(--cal-accent)', color: 'white' }}
          >
            + Add
          </button>
          <button
            onClick={() => onDismiss(activity.id)}
            className="text-[10px] rounded px-2 py-0.5 transition-colors"
            style={{ color: 'var(--cal-text-secondary)', background: 'transparent' }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck 2>&1 | grep "GhostEventBlock"
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/GhostEventBlock.tsx
git commit -m "feat: add GhostEventBlock component"
```

---

### Task 8: `useGapFiller` hook

**Files:**
- Create: `apps/web/components/calendar/hooks/useGapFiller.ts`

- [ ] **Step 1: Create the hook**

```typescript
// apps/web/components/calendar/hooks/useGapFiller.ts
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@travyl/shared'
import type { CalendarActivity } from '../types'

interface GapSuggestionDto {
  title: string
  type: string
  startHour: number
  duration: number
  latitude?: number
  longitude?: number
  address?: string
  rating?: number
  price?: number | null
  image?: string
  description?: string
}

interface FillGapsParams {
  date: string
  dayIndex: number
  activities: CalendarActivity[]
}

interface UseGapFillerOpts {
  tripId: string
  destination: string
  onSuccess: (suggestions: CalendarActivity[]) => void
  onError?: () => void
}

export function useGapFiller({
  tripId,
  destination,
  onSuccess,
  onError,
}: UseGapFillerOpts): {
  fill: (params: FillGapsParams) => void
  isPending: boolean
} {
  const mutation = useMutation<CalendarActivity[], Error, FillGapsParams>({
    mutationFn: async ({ date, dayIndex, activities }) => {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')

      const apiUrl = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL ?? ''
      const res = await fetch(`${apiUrl}/fill-gaps`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId,
          destination,
          date,
          activities: activities.map((a) => ({
            id: a.id,
            title: a.title,
            type: a.type,
            startHour: a.startHour,
            duration: a.duration,
            latitude: a.latitude,
            longitude: a.longitude,
          })),
        }),
      })

      if (!res.ok) throw new Error(`fill-gaps failed: ${res.status}`)

      const data: { suggestions: GapSuggestionDto[] } = await res.json()

      return data.suggestions.map((s) => ({
        id: `ghost-${crypto.randomUUID()}`,
        title: s.title,
        type: s.type,
        day: dayIndex,
        startHour: s.startHour,
        duration: s.duration,
        latitude: s.latitude,
        longitude: s.longitude,
        rating: s.rating,
        price: s.price != null ? `$${s.price}` : undefined,
        image: s.image,
        unscheduled: false,
      } satisfies CalendarActivity))
    },
    onSuccess,
    onError: () => {
      onError?.()
    },
  })

  return {
    fill: (params) => mutation.mutate(params),
    isPending: mutation.isPending,
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck 2>&1 | grep "useGapFiller"
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/hooks/useGapFiller.ts
git commit -m "feat: add useGapFiller React Query hook"
```

---

## Chunk 4: Wiring

### Task 9: `DayColumn` — ghost layer

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx`

- [ ] **Step 1: Add `GhostEventBlock` import and new props to `DayColumnProps`**

Add the import after the existing imports (around line 9):
```typescript
import { GhostEventBlock } from './GhostEventBlock'
```

Add to `DayColumnProps` interface (after `onVotePoll?` on line 35):
```typescript
  ghostActivities?: CalendarActivity[]
  onConfirmGhost?: (activity: CalendarActivity) => void
  onDismissGhost?: (id: string) => void
```

- [ ] **Step 2: Destructure new props in `DayColumn` function signature**

In the `DayColumn` function destructuring (starts around line 75), add after `onVotePoll`:
```typescript
  ghostActivities = [],
  onConfirmGhost,
  onDismissGhost,
```

- [ ] **Step 3: Add ghost layer inside the droppable grid `div`**

Inside `DayColumn`, find the return statement's droppable grid `div` (the one with `ref={setNodeRef}` or `data-day-index`). Add the ghost layer as the last child inside that div:

```tsx
{/* Ghost activity layer — above events (z-10), pointer-events only on blocks */}
{ghostActivities.length > 0 && (
  <div className="absolute inset-0" style={{ pointerEvents: 'none', zIndex: 10 }}>
    {ghostActivities
      .filter((g) => g.day === dayIndex)
      .map((ghost) => (
        <GhostEventBlock
          key={ghost.id}
          activity={ghost}
          timeRangeStartHour={timeRange.startHour}
          onConfirm={(a) => onConfirmGhost?.(a)}
          onDismiss={(id) => onDismissGhost?.(id)}
        />
      ))}
  </div>
)}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck 2>&1 | grep "DayColumn"
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/DayColumn.tsx
git commit -m "feat: add ghost activity layer to DayColumn"
```

---

### Task 10: Thread ghost props through `DayView` and `WeekView`

**Files:**
- Modify: `apps/web/components/calendar/DayView.tsx`
- Modify: `apps/web/components/calendar/WeekView.tsx`

- [ ] **Step 1: Update `DayViewProps`**

In `apps/web/components/calendar/DayView.tsx`, add to the `DayViewProps` interface (after `onVotePoll?`):
```typescript
  ghostActivities?: CalendarActivity[]
  onConfirmGhost?: (activity: CalendarActivity) => void
  onDismissGhost?: (id: string) => void
```

- [ ] **Step 2: Destructure and pass through in `DayView`**

In the `DayView` function, add to destructuring (after `onVotePoll`):
```typescript
  ghostActivities,
  onConfirmGhost,
  onDismissGhost,
```

Pass to `DayColumn` (which `DayView` renders internally):
```tsx
ghostActivities={ghostActivities}
onConfirmGhost={onConfirmGhost}
onDismissGhost={onDismissGhost}
```

- [ ] **Step 3: Update `WeekViewProps`**

In `apps/web/components/calendar/WeekView.tsx`, add to `WeekViewProps` interface (after `onVotePoll?` on line ~30):
```typescript
  ghostActivities?: CalendarActivity[]
  onConfirmGhost?: (activity: CalendarActivity) => void
  onDismissGhost?: (id: string) => void
```

- [ ] **Step 4: Destructure and pass through in `WeekView`**

In the `WeekView` function, add to destructuring (after `onVotePoll`):
```typescript
  ghostActivities,
  onConfirmGhost,
  onDismissGhost,
```

Pass to each `DayColumn` render in `WeekView`:
```tsx
ghostActivities={ghostActivities}
onConfirmGhost={onConfirmGhost}
onDismissGhost={onDismissGhost}
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck 2>&1 | grep -E "DayView|WeekView"
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/calendar/DayView.tsx apps/web/components/calendar/WeekView.tsx
git commit -m "feat: thread ghost props through DayView and WeekView"
```

---

### Task 11: `CalendarToolbar` — wand button

**Files:**
- Modify: `apps/web/components/calendar/CalendarToolbar.tsx`

- [ ] **Step 1: Add `MagicWand` to imports**

Change line 4 from:
```typescript
import { Plus, ShareAndroid, Clock } from 'iconoir-react'
```
to:
```typescript
import { Plus, ShareAndroid, Clock, MagicWand } from 'iconoir-react'
```

- [ ] **Step 2: Add new props to `CalendarToolbarProps`**

Add to `CalendarToolbarProps` interface (after `onOpenHistory?`):
```typescript
  onFillGaps?: () => void
  isGapFilling?: boolean
  hasGhosts?: boolean
  hasGaps?: boolean
```

- [ ] **Step 3: Destructure new props in `CalendarToolbar`**

Add to the function destructuring (after `onOpenHistory`):
```typescript
  onFillGaps,
  isGapFilling = false,
  hasGhosts = false,
  hasGaps = false,
```

- [ ] **Step 4: Add wand button in the right controls section**

In the "Right controls" `div` (around line 239), add the wand button after the history button (`Clock`) block and before the collaborator avatars block:

```tsx
{/* Magic wand — gap filler */}
{!isSharedView && onFillGaps && (
  <button
    onClick={onFillGaps}
    disabled={isGapFilling || (!hasGaps && !hasGhosts)}
    title={
      isGapFilling
        ? 'Finding suggestions…'
        : hasGhosts
        ? 'Clear suggestions'
        : hasGaps
        ? 'Fill day with AI suggestions'
        : 'Day is fully scheduled'
    }
    aria-label="Fill day with AI suggestions"
    className={[
      'p-1.5 rounded-lg transition-colors',
      hasGhosts && !isGapFilling
        ? 'text-[var(--cal-accent)] bg-[color-mix(in_srgb,var(--cal-accent)_12%,transparent)]'
        : 'text-gray-500 dark:text-[#7a9cc0] hover:bg-gray-100 dark:hover:bg-[#1e3a5f]/30',
      (isGapFilling || (!hasGaps && !hasGhosts)) ? 'opacity-40 cursor-not-allowed' : '',
    ].join(' ')}
  >
    {isGapFilling ? (
      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    ) : (
      <MagicWand className="w-4 h-4" />
    )}
  </button>
)}
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck 2>&1 | grep "CalendarToolbar"
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/calendar/CalendarToolbar.tsx
git commit -m "feat: add magic wand button to CalendarToolbar"
```

---

### Task 12: `CalendarDashboard` — state and wiring

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Add imports**

Add near the top of the file (after the existing hook imports):
```typescript
import { computeGaps } from '@travyl/shared'
import { useGapFiller } from './hooks/useGapFiller'
```

- [ ] **Step 2: Add ghost state after the existing `useState` declarations (around line 98–105)**

```typescript
const [ghostActivities, setGhostActivities] = useState<CalendarActivity[]>([])
```

- [ ] **Step 3: Add `useEffect` to clear ghosts on day change (after existing `useEffect` hooks)**

```typescript
// Clear ghost suggestions when the user navigates to a different day
useEffect(() => {
  setGhostActivities([])
}, [selectedDayIndex])
```

- [ ] **Step 4: Add memos for `selectedDayGhosts`, updated `timeRange`, and `hasGaps`**

Replace the existing `timeRange` memo:
```typescript
// existing: const timeRange = useMemo(() => computeTimeRange(activities), [activities])
```
with:
```typescript
const selectedDayGhosts = useMemo(
  () => ghostActivities.filter((g) => g.day === selectedDayIndex),
  [ghostActivities, selectedDayIndex],
)

const timeRange = useMemo(
  () => computeTimeRange([...activities, ...selectedDayGhosts]),
  [activities, selectedDayGhosts],
)

const hasGaps = useMemo(
  () =>
    computeGaps(
      scheduledActivities
        .filter((a) => a.day === selectedDayIndex)
        .map((a) => ({ startHour: a.startHour, duration: a.duration })),
    ).length > 0,
  [scheduledActivities, selectedDayIndex],
)
```

- [ ] **Step 5: Wire `useGapFiller`**

Add after the `usePollSync` call (around line 141):
```typescript
const { fill: fillGaps, isPending: isGapFilling } = useGapFiller({
  tripId,
  destination: trip?.destination ?? '',
  onSuccess: (suggestions) => {
    if (suggestions.length === 0) {
      // No suggestions found — wand returns to idle silently (nothing to show)
      return
    }
    setGhostActivities(suggestions)
  },
  onError: () => {
    // Error fetching suggestions — wand returns to idle (ghostActivities stays empty)
    // Note: add a toast here using whatever notification pattern the app uses
    console.error('[fill-gaps] Failed to fetch gap suggestions')
  },
})
```

- [ ] **Step 6: Add ghost confirm/dismiss handlers and `handleFillGaps`**

Add alongside the other `useCallback` handlers:
```typescript
const handleConfirmGhost = useCallback((ghost: CalendarActivity) => {
  addActivity({ ...ghost, id: crypto.randomUUID() })
  setGhostActivities((prev) => prev.filter((g) => g.id !== ghost.id))
}, [addActivity])

const handleDismissGhost = useCallback((id: string) => {
  setGhostActivities((prev) => prev.filter((g) => g.id !== id))
}, [])

const handleFillGaps = useCallback(() => {
  if (ghostActivities.length > 0) {
    setGhostActivities([])
    return
  }
  if (!trip) return
  const date = new Date(parsedStartMs + selectedDayIndex * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  const dayActivities = scheduledActivities.filter((a) => a.day === selectedDayIndex)
  fillGaps({ date, dayIndex: selectedDayIndex, activities: dayActivities })
}, [ghostActivities, trip, parsedStartMs, selectedDayIndex, scheduledActivities, fillGaps])
```

- [ ] **Step 7: Pass wand props to `CalendarToolbar`**

In the `<CalendarToolbar ...>` JSX (around line 540), add these props:
```tsx
onFillGaps={handleFillGaps}
isGapFilling={isGapFilling}
hasGhosts={ghostActivities.length > 0}
hasGaps={hasGaps}
```

- [ ] **Step 8: Pass ghost props to `WeekView`**

In the `<WeekView ...>` JSX (around line 593), add:
```tsx
ghostActivities={ghostActivities}
onConfirmGhost={handleConfirmGhost}
onDismissGhost={handleDismissGhost}
```

- [ ] **Step 9: Pass ghost props to `DayView`**

In the `<DayView ...>` JSX (around line 625), add:
```tsx
ghostActivities={ghostActivities}
onConfirmGhost={handleConfirmGhost}
onDismissGhost={handleDismissGhost}
```

- [ ] **Step 10: Full typecheck**

```bash
npm run typecheck
```
Expected: zero errors

- [ ] **Step 11: Lint**

```bash
npm run lint
```
Expected: zero errors

- [ ] **Step 12: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: wire AI day planner into CalendarDashboard"
```

---

## Chunk 5: Deploy and Smoke Test

### Task 13: Deploy and verify

- [ ] **Step 1: Full typecheck before deploying**

```bash
npm run typecheck
```
Expected: zero errors across all workspaces

- [ ] **Step 2: Deploy to production**

```bash
AWS_PROFILE=525610233002_AdministratorAccess npx sst deploy --stage production
```
Expected: deploys without error; `POST /fill-gaps` appears in the API Gateway route list

- [ ] **Step 3: Smoke test the endpoint**

```bash
# Get a valid token from your browser's DevTools (Application → Local Storage → supabase session)
TOKEN="<paste-token-here>"
curl -s -X POST \
  "https://yqtl1xdcea.execute-api.us-east-1.amazonaws.com/fill-gaps" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tripId":"test","date":"2026-04-15","destination":"Paris, France","activities":[{"id":"1","title":"Eiffel Tower","type":"sightseeing","startHour":10,"duration":2}]}' \
  | jq .
```
Expected: JSON with `suggestions` array (may be empty if SerpAPI quota is low)

- [ ] **Step 4: Browser smoke test**

1. Open a trip with activities on one day
2. Verify the wand button appears in the toolbar (non-shared view)
3. Click the wand — verify loading spinner appears
4. Verify 0–3 ghost activity blocks appear on the calendar
5. Click **+ Add** on a ghost — verify it becomes a real activity
6. Click **×** on a ghost — verify it disappears
7. Navigate to a different day — verify remaining ghosts clear
8. Click wand again with ghosts showing — verify they clear immediately (toggle)
9. Fully schedule a day — verify wand button becomes disabled with tooltip "Day is fully scheduled"

- [ ] **Step 5: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "feat: AI day planner complete — magic wand gap-fill for trip calendar"
```
