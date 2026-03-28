# AI Day Planner ("Magic Wand") — Design Spec

**Date:** 2026-03-27
**Feature:** AI-powered gap-filling for the trip calendar day view

---

## Overview

A wand button in the `CalendarToolbar` analyzes the selected day's schedule, identifies free time slots, and proposes 2–3 pre-fitted activity suggestions that appear as ghosted blocks directly on the day column. Users confirm or dismiss each suggestion inline. Confirmed activities are added to the calendar via the existing Yjs/`addActivity` flow.

---

## User Flow

1. User is viewing a day with open time gaps (week or day view; selected day is used in week view)
2. User clicks the wand button in `CalendarToolbar`
3. A loading spinner replaces the wand icon while the request fires
4. 2–3 translucent "ghost" activity blocks appear on the correct day column, slotted into the free gaps
5. Each ghost has a **+ Add** button and a **×** dismiss button
6. **+ Add** → calls `addActivity(ghost)` → ghost is removed from ghost state, activity lands on calendar
7. **×** → removes the ghost from ghost state
8. Clicking the active wand button again clears all ghosts (toggle off)
9. Navigating to a different day also clears any pending ghosts

---

## Backend: `POST /fill-gaps`

### Request

```ts
{
  tripId: string
  date: string           // ISO date string, e.g. "2026-04-15"
  destination: string    // trip destination string passed to SerpAPI for place search
  activities: Array<{
    id: string
    title: string
    type: string
    startHour: number    // e.g. 9.5 = 9:30am
    duration: number     // hours
    latitude?: number
    longitude?: number
  }>
}
```

### Lambda logic (`services/fill-gaps.ts`)

1. **Auth** — validate JWT via Supabase (same pattern as `/suggest`, `/activity-intelligence`)
2. **Gap computation** — call `computeGaps(activities)` from `@travyl/shared`:
   - Sort activities by `startHour`
   - Identify contiguous free slots within 8am–10pm
   - Filter out slots shorter than 1 hour
3. **Suggestion fetch** — for each gap (up to 3), call `searchPlaces(destination, category)` from `services/lib/serpapi.ts` (same as `/suggest`). Prioritize category variety: avoid repeating a type already scheduled that day.
4. **Fit suggestions to gaps** — assign `startHour` (gap start) and `duration` (clamp to gap size, max 2.5h)
5. **Deduplication** — exclude suggestions whose name fuzzy-matches an already-scheduled activity title
6. **Cache** — DynamoDB key `pk: "fill-gaps:{tripId}:{date}"`, `sk: "gaps"`, 30-min TTL, via new helpers in `services/lib/cache.ts`
7. **Response** — return up to 3 suggestions

### Response

```ts
{
  suggestions: Array<{
    title: string
    type: string          // activity category
    startHour: number
    duration: number
    latitude?: number
    longitude?: number
    address?: string
    rating?: number
    price?: number | null  // numeric from SerpAPI / SuggestionCard.price (e.g. 10, 25, 50)
    image?: string
    description?: string
  }>
}
```

Note: `price` is `number | null` in the DTO (matching `SuggestionCard.price` from `serpapi.ts`). The frontend `useGapFiller` maps it to `CalendarActivity.price` (a `string | undefined`) when constructing ghost activities.

### Shared: `computeGaps`

The gap computation function is the canonical shared utility consumed by both the Lambda and the frontend.

- **Canonical location:** `packages/shared/src/utils/gapCompute.ts`
- **Export chain:** `gapCompute.ts` → `packages/shared/src/utils/index.ts` (add `export { computeGaps, type Gap } from './gapCompute'`) → already re-exported via the existing `export * from './utils'` in `packages/shared/src/index.ts`
- Lambda (`services/fill-gaps.ts`) imports `computeGaps` from `@travyl/shared`
- Frontend (`CalendarDashboard`) imports `computeGaps` from `@travyl/shared`

```ts
export interface Gap {
  startHour: number
  endHour: number
  durationHours: number
}

export function computeGaps(
  activities: Array<{ startHour: number; duration: number }>,
  dayStart?: number,  // default 8
  dayEnd?: number,    // default 22
): Gap[]
```

### New files (backend + shared)

| File | Responsibility |
|------|---------------|
| `packages/shared/src/utils/gapCompute.ts` | Canonical `computeGaps` pure function |
| `packages/shared/src/utils/gapCompute.test.ts` | Vitest tests for `computeGaps` — lives in shared, run by `cd packages/shared && npm test` |
| `services/fill-gaps.ts` | Lambda handler for `POST /fill-gaps` |

### Modified files (backend + shared)

| File | Change |
|------|--------|
| `packages/shared/src/utils/index.ts` | Add `export { computeGaps, type Gap } from './gapCompute'` |
| `infra/api.ts` | Add `POST /fill-gaps` route; `link: [cacheTable, supabaseSecretKey, supabaseUrl, serpApiKey]` (same links as `/suggest`; no Amazon Location needed) |
| `services/lib/cache.ts` | Add `getCachedGaps(tripId, date)` / `setCachedGaps(tripId, date, data)` helpers, key prefix `fill-gaps:` |

---

## Frontend

### State (`CalendarDashboard`)

```ts
const [ghostActivities, setGhostActivities] = useState<CalendarActivity[]>([])
const [isGapFilling, setIsGapFilling] = useState(false)

// Clear ghosts when the selected day changes
useEffect(() => {
  setGhostActivities([])
}, [selectedDayIndex])

// Only include ghosts for the selected day when computing time range
// (prevents ghosts on other days from expanding the grid)
const selectedDayGhosts = useMemo(
  () => ghostActivities.filter((g) => g.day === selectedDayIndex),
  [ghostActivities, selectedDayIndex],
)

// Extend the existing computeTimeRange call to include selected-day ghosts
// Note: computeTimeRange is imported via the existing sub-path
// import { computeTimeRange } from '@travyl/shared/viewmodels/calendarViewModel'
// which is pre-established in CalendarDashboard — do not change that import
const timeRange = useMemo(
  () => computeTimeRange([...activities, ...selectedDayGhosts]),
  [activities, selectedDayGhosts],
)

// Wand disabled state: does the selected day have any gap ≥ 1 hour?
const hasGaps = useMemo(
  () => computeGaps(  // import from '@travyl/shared'
    scheduledActivities
      .filter((a) => a.day === selectedDayIndex)
      .map((a) => ({ startHour: a.startHour, duration: a.duration }))
  ).length > 0,
  [scheduledActivities, selectedDayIndex],
)
```

### `useGapFiller` hook (`apps/web/components/calendar/hooks/useGapFiller.ts`)

```ts
function useGapFiller(opts: {
  tripId: string
  destination: string
  onSuccess: (suggestions: CalendarActivity[]) => void
  onError?: () => void
}): {
  fill: (params: { date: string; activities: CalendarActivity[] }) => void
  isPending: boolean
}
```

- `useMutation` wrapper around `POST /fill-gaps`
- Auth: `supabase.auth.getSession()` using the `supabase` singleton from `@travyl/shared` — matches `useActivityIntelligence.ts` and `useDayIntelligence.ts`
- On success: maps response `suggestions` to `CalendarActivity[]`:
  - Assign `id: \`ghost-${crypto.randomUUID()}\``
  - Map `price: number | null` → `price: suggestion.price != null ? \`$${suggestion.price}\` : undefined` (matching `CalendarActivity.price: string | undefined`)
  - Calling `fill()` replaces any existing ghosts (setGhostActivities overwrites, no accumulation)
- On error: shows a toast; calls `opts.onError?.()`

### Wand button (`CalendarToolbar`)

**New props added to `CalendarToolbarProps`:**
```ts
onFillGaps: () => void
isGapFilling: boolean
hasGhosts: boolean   // true when ghostActivities.length > 0
hasGaps: boolean     // true when selected day has ≥ 1 gap (from CalendarDashboard)
```

- Icon: `MagicWand` from `iconoir-react`
- Placement: right side of toolbar, before the Share button
- In `isSharedView` mode: hidden entirely (consistent with Share and New Activity buttons)
- States (non-shared view only):
  - **Idle:** wand icon, tooltip "Fill day with AI suggestions"
  - **Loading (`isGapFilling`):** spinner, button disabled
  - **Active (`hasGhosts && !isGapFilling`):** wand icon highlighted in `--cal-accent`, tooltip "Clear suggestions"
  - **Disabled (`!hasGaps && !hasGhosts && !isGapFilling`):** muted opacity, tooltip "Day is fully scheduled"
- Clicking while `hasGhosts` → `onFillGaps()` which clears ghosts and resets state

### `GhostEventBlock` component (`apps/web/components/calendar/GhostEventBlock.tsx`)

```ts
interface GhostEventBlockProps {
  activity: CalendarActivity
  timeRangeStartHour: number
  onConfirm: (activity: CalendarActivity) => void
  onDismiss: (id: string) => void
}
```

- Positioned via `top: (activity.startHour - timeRangeStartHour) * HOUR_HEIGHT`, `height: activity.duration * HOUR_HEIGHT` (same calculation as `EventBlock`)
- Visual: 55% opacity, 2px dashed border in `--cal-accent`, background `color-mix(in srgb, var(--cal-accent) 10%, transparent)`
- Overlaid controls: **+ Add** (primary small button) and **×** (icon button)
- `pointer-events: auto` on the block itself; not draggable, not resizable, not selectable

### `DayColumn` changes

New optional props:
```ts
ghostActivities?: CalendarActivity[]
onConfirmGhost?: (activity: CalendarActivity) => void
onDismissGhost?: (id: string) => void
```

- Render a `GhostEventBlock` per ghost where `ghost.day === dayIndex`
- Ghost layer: absolutely-positioned `div` sibling inside the droppable grid `div`, `style={{ pointerEvents: 'none', zIndex: 10 }}` (above event blocks at z-5, below `CardPopover` which renders outside the grid)
- Each `GhostEventBlock` has its own `pointer-events: auto`

### `DayView` and `WeekView` changes

Add to `DayViewProps` and `WeekViewProps`:
```ts
ghostActivities?: CalendarActivity[]
onConfirmGhost?: (activity: CalendarActivity) => void
onDismissGhost?: (id: string) => void
```

Both views pass these props down to each `DayColumn`. `DayColumn` already filters by `dayIndex` so no additional filtering is needed in `WeekView`.

### New files (frontend)

| File | Responsibility |
|------|---------------|
| `apps/web/components/calendar/GhostEventBlock.tsx` | Ghost activity block with confirm/dismiss |
| `apps/web/components/calendar/hooks/useGapFiller.ts` | React Query mutation for `/fill-gaps` |

### Modified files (frontend)

| File | Change |
|------|--------|
| `apps/web/components/calendar/CalendarToolbar.tsx` | Add `onFillGaps`, `isGapFilling`, `hasGhosts`, `hasGaps` props; render wand button |
| `apps/web/components/calendar/CalendarDashboard.tsx` | Ghost state, `useEffect` clear, `hasGaps` memo, `selectedDayGhosts`, updated `computeTimeRange`, wire `useGapFiller`, pass ghost + wand props to children |
| `apps/web/components/calendar/DayColumn.tsx` | Add ghost layer (z-10, `pointer-events: none` wrapper) |
| `apps/web/components/calendar/DayView.tsx` | Add and thread `ghostActivities`, `onConfirmGhost`, `onDismissGhost` props |
| `apps/web/components/calendar/WeekView.tsx` | Add and thread `ghostActivities`, `onConfirmGhost`, `onDismissGhost` props |

---

## Edge Cases

| Case | Behaviour |
|------|-----------|
| No gaps ≥ 1 hour | Wand disabled; tooltip "Day is fully scheduled" |
| Shared view | Wand hidden entirely |
| 0 suggestions returned | Toast: "No suggestions found for today's gaps"; wand → idle |
| API error | Toast error; wand → idle |
| Day navigation | `useEffect` on `selectedDayIndex` clears ghosts |
| Wand toggled while active | Clears ghosts, wand → idle |
| Collaborator adds activity to ghost's slot before confirmation | No client-side conflict check; Yjs CRDT handles resulting overlap; acceptable MVP behaviour |
| `addActivity` fails after ghost confirmation | Ghost stays visible; Yjs error surfaces via existing error handling |

---

## Out of Scope

- Coordinate-anchored SerpAPI search (destination string used directly; no reverse-geocoding of activity coordinates)
- Regenerating suggestions (user must click wand again)
- User preference signals (dietary, budget, accessibility) — future iteration
- Mobile support — web only
- Concurrent collaborator conflict checking — handled by Yjs CRDT
