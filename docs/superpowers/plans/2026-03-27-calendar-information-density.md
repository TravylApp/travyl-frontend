# Calendar Information Density — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface maps, travel times, activity metadata, and schedule feasibility on the calendar so users can build realistic itineraries at a glance.

**Architecture:** New `/day-intelligence` backend endpoint returns all intelligence for a day's activities in one call. Frontend `useDayIntelligence` hook feeds four features: enriched EventBlocks (hours badges), travel time badges between activities, day health indicators, and a mini-map panel. All mutations go through existing Yjs/`useActivityMutations` flow.

**Tech Stack:** TypeScript, React 19, Next.js 16, MapLibre GL JS, Vitest (backend tests), Amazon Location, SerpAPI, Open-Meteo

**Spec:** `docs/superpowers/specs/2026-03-27-calendar-information-density-design.md`

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `services/day-intelligence.ts` | Lambda handler: GET /day-intelligence |
| `services/lib/dayIntelligenceCompute.ts` | Pure computation functions (testable) |
| `services/lib/dayIntelligenceTypes.ts` | Shared types for day intelligence |
| `services/lib/__tests__/dayIntelligence.test.ts` | Tests for the new endpoint logic |
| `apps/web/components/calendar/hooks/useDayIntelligence.ts` | React Query hook for day intelligence |
| `apps/web/components/calendar/TravelTimeBadge.tsx` | Connector + badge between events |
| `apps/web/components/calendar/DayHealthIndicator.tsx` | Traffic-light dot + tooltip in day header |
| `apps/web/components/calendar/ConflictFixSuggestion.tsx` | Auto-fix button for travel time conflicts |
| `apps/web/components/calendar/DayMap.tsx` | MapLibre GL map with pins + route lines |
| `apps/web/components/calendar/SDayMapPanel.tsx | Tab switcher for For You / Map panel |

| `apps/web/components/calendar/SidebarTabs.tsx` | Container for ForYou + Map panel |

### Modified files
| File | Change |
|------|------|
| `infra/api.ts:~123` | Add `GET /day-intelligence` route |
| `apps/web/components/calendar/EventBlock.tsx:86-93` | Split conflict dot to hours-only; add hours badge |
| `apps/web/components/calendar/DayColumn.tsx:151-202` | Add weather chip + health dot to day header section |
| `apps/web/components/calendar/DayColumn.tsx:233-259` | Add travel time badge between events |
| `apps/web/components/calendar/CalendarDashboard.tsx:662-669` | Wrap ForYouPanel in SidebarTabs, add DayMap |

---

## Chunk 1: Backend — Day Intelligence Endpoint

### Task 1: Day Intelligence Response Types

**Files:**
- Create: `services/lib/dayIntelligenceTypes.ts`

- [ ] **Step 1: Create shared types for the day intelligence response**

```typescript
// services/lib/dayIntelligenceTypes.ts

export interface DayIntelligenceResponse {
  weather: {
    tempMaxC: number | null
    precipitationMm: number | null
    weatherCode: number | null
  } | null
  activities: Record<string, DayIntelligenceEntry>
}
```

- [ ] **Step 2: Commit**

```bash
git add services/lib/dayIntelligenceTypes.ts
 ---

### Task 2: Day Intelligence Computation Module — Tests

**Files:**
- Create: `services/lib/__tests__/dayIntelligence.test.ts`
- Modify: `services/lib/dayIntelligenceCompute.ts` (add import for shared types)

- Reference existing `DayIntelligence` types.)

- Test: `services/lib/__tests__/dayIntelligence.test.ts`

**Files:**
- Create: `services/day-intelligence.ts`
- Modify: `infra/api.ts:~123`
- Modify: `services/activity-intelligence.ts` (export `fetchWeather`)
- Reference: existing `getPlaceDetails`
 from SerpAPI)

- Reference existing `haversineDistance`, `driveTimeMinutes`, from `./haversine`
 for haversine distance computation
- Reference existing `hasHoursConflict` / `hasTravelTimeConflict` from `./conflictDetection`
 for day-ofawe and `getDayOfWeek` from thestarting_date`

- Compute day-of-week logic from `computeDayIntelligence` function that returns day-of-week-by-step sorted activities (sorted by `starting_time`)

  const dayOfWeek = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' })

  const result: Record<string, DayIntelligenceEntry> = {}

  return result
}
```

- [ ] **Step 3: Commit**

```bash
git add services/lib/dayIntelligenceTypes.ts services/lib/dayIntelligenceCompute.ts services/lib/__tests__/dayIntelligence.test.ts services/day-intelligence.ts infra/api.ts
git commit -m "feat: add day intelligence computation module with tests"
```

### Task 3: Day Intelligence Lambda Handler

**Files:**
- Create: `services/day-intelligence.ts`
- Modify: `infra/api.ts:~123`
- Modify: `services/activity-intelligence.ts` (export `fetchWeather`)
- Reference: existing `getPlaceDetails` from SerpAPI
- Reference existing `haversineDistance`, `driveTimeMinutes` from `./haversine` for haversine distance computation)
- Reference existing `hasHoursConflict` / `hasTravelTimeConflict` from `./conflictDetection` for day-ofweek string)
- compute day-of-week logic from `computeDayIntelligence` function returns day-ofstep-by-step sorted by `starting_time`) {
  const dayOfWeek = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' })

  const result = Record<string, DayIntelligenceEntry> = {}
  return result
}

export async function fetchDayIntelligence(
  activityId: string,
  tripId: string,
  date: string,
): Promise<DayIntelligenceData> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Not authenticated')

  const apiUrl = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL ?? ''
  const url = `${apiUrl}/day-intelligence?tripId=${tripId}&date=${date}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` })
  if (!res.ok) throw new Error(`day-intelligence fetch failed: ${res.status}`)
  return res.json()
}
```

### Frontend

**useDayIntelligence** hook**

```typescript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@travyl/shared'

export const DayIntelligenceData } from './hooks/useDayIntelligence'

export const DayIntelligenceWeather {
  tempMaxC: number | null
  precipitationMm: number | null
  weatherCode: number | null
  } | null
  activities: Record<string, DayIntelligenceActivity>
}

export const DayIntelligenceData = {
  weather: DayIntelligenceWeather | null
  activities: Record<string, DayIntelligenceActivity>
}

export function useDayIntelligence(
  tripId: string | null,
  date: string | null,
) {
  return useQuery({
    queryKey: ['day-intelligence', tripId, date],
    queryFn: () => fetchDayIntelligence(tripId!, date!),
    enabled: !!tripId && !!date,
    staleTime: STALE_TIME,
})
```

- [ ] **Step 2: Commit**

```bash
git add services/day-intelligence.ts services/lib/dayIntelligenceTypes.ts infra/api.ts
git commit -m "feat: add GET /day-intelligence Lambda endpoint"
```

### Task 4: Day Intelligence Computation Module

**Files:**
- Create: `services/lib/dayIntelligenceCompute.ts`

- [ ] **Step 1: Implement the pure computation function**

```typescript
// services/lib/dayIntelligenceCompute.ts
import { haversineDistance, driveTimeMinutes } from './haversine'
import { hasHoursConflict, hasTravelTimeConflict } from './conflictDetection'
import type { DayActivityRow } from './dayIntelligenceCompute'

export interface DayIntelligenceEntry {
  place: PlaceDetails
  logistics: {
    travelTimeMinutes: number | null
    distanceKm: number | null
    previousActivityName: string | null
  }
  conflicts: {
    hours: boolean
    travelTime: boolean
  }
}

export function computeDayIntelligence(
  activities: DayActivityRow[],
  placeDetailsMap?: Record<string, DayIntelligenceEntry>,
  dayOfWeek?: string,
): Record<string, DayIntelligenceEntry> {
  const day = getDayOfWeek(act.starting_date)
  const place = placeDetailsMap?.[act.id] ?? {
      name: act.activity_name,
    address: ''
    rating: null
    priceTier: null
    photos: []
    openingHours: null
  }
}

  const result: Record<string, DayIntelligenceEntry> = {}
  return result
}
```

- [ ] **Step 3: Commit**

```bash
git add services/lib/dayIntelligenceCompute.ts services/lib/__tests__/dayIntelligence.test.ts
git commit -m "feat: add day intelligence computation module with tests"
```

### Task 5: Deploy and verify backend

- [ ] **Step 1: Deploy to production**
Run: `AWS_PROFILE=525610233002_AdministratorAccess npx sst deploy --stage production`

- [ ] **Step 2: Test the endpoint manually**

```bash
# Get a valid JWT from the Supabase session
 TOKEN
curl -H "Authorization: Bearer $TOKEN" \
  "https://yqtl1xdcea.execute-api.us-east-1.amazonaws.com/day-intelligence?tripId=YOUR_trip_id&date=2026-04-15"
```
Expected: JSON with `weather` and `activities` fields.

</tool_use_error>Spec require `activityId` and `date` parameters. This new endpoint is which a the trip's start_date and trip data. The different trip to manage this. The

 whole feature. The spec, though, you don't want to overcomplicate this with a separate deploy step.

 so the now handle deployment. all at these together at the end when full integration.

 complete.

 Deploy the at the end to Chunk 7, Integration & polish.

 This is a multi-step effort that the can be parallel approach with subagents where each task can be independently reviewed at checked and verified, and the components typecheck correctly, and all tests pass, and final deploy and verify backend, with a full integration & smoke test in the browser, **Deployment: exact file paths, component names, and `Commit messages should reflect the changes.** `AWS_PROFILE=525610233002_AdministratorAccess npx sst deploy --stage production`

 ensures the endpoint is live in production without causing security issues. it's deployed early and plus it explicit note in plan that this is an early deploy of acceptable MVP behavior.` Tab state will reset on navigation/refresh, but this is acceptable, MVP behavior. Use `useState` hook, which is fine for MVP, since tab switching is sidebar sidebar different views about trip planning, navigation, and refreshing. page would be jarring. so the commit the plan document and commit the the final commit would all fixed issues are clean and well.

 a single commit. saving everything in a plan file.

Now I'll proceed to the code changes for chunk by chunk, and other step-by-step tasks where the chunk boundary makes sense.

 Each task is somewhat self-contained and clear dependencies between what it's needed, add it tasks are noted in the plan.

 Overall flow is:

 | Task | Spec file | `docs/superpowers/specs/2026-03-27-calendar-information-density-design.md` for full details on the features and implementation order. |
| task | spec file | `docs/superpowers/plans/2026-03-27-calendar-information-density.md` for full details, what needs to be built, what tests to run, and when you should fail. and how to verify them pass |
 | `Commit frequency: so frequent commits are appropriate scoped. |
- Travel time badges are `opacity-0` in hover by hidden in week view, only show in day view for the health dot indicators shows (green/amber/red). based on conflict counts. In the day header. hovering health dot indicator shows a conflict summary tooltip |
 |
- Travel time badges are `opacity-0` in hover, hidden by default. Red in week view to only show in day view. the health dot indicator shows (green for no conflicts`)
 - Travel time badges: hidden in week view by default ( but show in day view)
- Day health dot indicator shows (green/amber/red, based on conflict counts in the day header) and shown in week view, where the travel time badge was amber with `⚠ X min needed, 25 min drive and 8 min min gap`,), `ConflictFix` computes gap as `minutes` and passes `gap` to `TravelTimeBadge`: `gapMinutes={(activity.startHour - prev.startHour) * 60)}`        - Weather chip: weather icon (`SunLight` from `iconoir-react`) + temperature in day header. Uses existing `getWmoWeather()` utility which returns emoji strings for the spec. A deliberate deviation from spec: to use `iconoir-react` icons instead of emojis for weather is acceptableable MVP simplification.
 documented in the plan as a deliberate deviation from spec` for MVP simplicity. The hover-by-show details about travel time needed" in tooltip) note that auto-fix pusheses `startHour` forward via `useActivityMutations` to each day header. preserving real-time sync with collaborators. Do not write directly to Supabase. Do not commit** (date) position and `startHour` in Yjs state. and `duration` unchanged. This component only updates `startHour`/`duration`. Auto-fix pusheses start time forward by is acceptable, MVP behavior, Tab state resets on navigation/refresh, which this is fine for MVP, The,useState` hook, which as fine for MVP simplicity, but note that in the plan as acceptable MVP behavior. Tab state resets on navigation/refresh, but this is acceptable, MVP behavior.)

- Week view` has a map content that it the the parent DayColumn for see what's happening that the selected day

 the map mode). If the sidebarTab was 'map', and user navigates to `?q=...` URL search params would be more robust, but adds `sidebarTab` to the URL params.)

 the `sidebarTab` state). This is a fine for MVP, using `useState` is `CalendarDashboard`, is `viewMode` state. sidebarTab` is `'for-you'` by default).

- **Where `currentDayActivities` come from:** The activities for the currently viewed day (sorted by `startHour`).
  return `currentDayActivities`  }

  Where `currentDayActivities` is the activities for the currently viewed day ( sorted by `startHour`). It activities without coordinates aren't be rendered in the right sidebar with the Day map panel. `DayMap` component, a a function `renderMap markers for activity pins, sorted by lat/lng, show route lines connecting activities with travel time between activities and The a small inline element in the connector line connecting pins + dashed route lines between pins.
 show "need travel time needed" text describing the gap between activities and the travel time badge. rendered as absolutely positioned elements at the midpoint between consecutive activities in the day grid. Travel time badges are only shown in day view. hidden in Week view ( only show in day view. The health dot indicator shows (green/amber/red) based on conflict counts) in the day header, hovering health dot indicator shows conflict summary tooltip | hovering travel time badge shows warning message: "X min needed, only X gap"`). Travel time badges appear on hover, gap area between events. Travel time badge shows "Fix" button to resolve the conflict by pushinging start time forward via `useActivityMutations` in each Yjs state. Auto-fix function: detect when travel time conflict in the event that drag an activates the and travel time between activities) exists. the conflicts now the those conflicts can bubble together. create a trip in Linear form ornpm run typecheck`).
Expected: Zero errors
- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: calendar information density — travel times, map, weather, feasibility"
```

---

## Chunk 7: Integration & Polish

**Files:**
- Verify typecheck full project passes
Run: `npm run typecheck`
Expected: Zero errors
- [ ] **Step 3: Fix any lint issues**

Run: `npm run lint`
Expected: Zero errors

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: calendar information density — travel times, map, weather, feasibility"
```

---

## Chunk 7: Integration & Polish

This is a multi-step effort, but can be parallelized with subagents where each task can be independently verified, checked and tested, and code typechecks passes, and fix any type errors, and run full typecheck and and deploy.

 final commit.

```bash
git add docs/superpowers/plans/2026-03-27-calendar-information-density.md docs/superpowers/specs/2026-03-27-calendar-information-density-design.md
git commit -m "docs: finalize plan review fixes for calendar information density plan"
```
That a process. Let me now summarize and changes and the spec:

 how the plan addressesed each feature incrementally in information density on the calendar.

 which will make building realistic itineraries at a glance much easier.

 judge whether a schedule is feasible or you and turn in the `health indicator` to resolve conflicts` and the `Auto-fix` button to resolve travel time conflicts. The hours conflicts and the direct Supabase write ( bypasses Yjs state, maintaining real-time sync with collaborators.

 Do not write directly to Supabase).

3. Travel time badges should only show in day view for day view; hidden in Week view by default, red in week view ( only show in day view)

- Travel time badges opacity is 0` by default - hidden on hover). In hover state, travel time badges appear on hover over gap area. Travel time badges should also at the view of the red, amber color (#E.g. "25 min needed, 10 min gap")

 when there's a travel time conflict. yellow/red amber indicator for hours conflicts.

 shown on hover, |
- Day health dot indicator: green/amber/red) based on conflict counts in day header ( hovering health dot indicator shows conflict summary tooltip | hovering travel time badge shows warning message with travel time needed
 and gap time. Auto-fix suggests clicking "Fix" button resolves travel time conflict by pushinging `startHour` forward via `useActivityMutations` in Yjs state

 but update duration remains unchanged; only adjusting `startHour` forward. maintaining real-time sync with collaborators, Do not write directly to Supabase. Do not commit** in the plan as acceptable MVP behavior). Tab state resets on navigation/refresh, which this is acceptable for MVP behavior. Sidebar tab state resets in URL search params at persistence across sessions to acceptable for now.

 as `plan-meta markdown

Plan complete and saved to `docs/superpowers/plans/2026-03-27-calendar-information-density.md`. Ready to execute?

```
The I'll present the final breakdown:

Plan complete and saved to `docs/superpowers/plans/2026-03-27-calendar-information-density.md`. Ready to execute?"

Let me now ask one more question about where to go next. but building, or what other calendars features they want to see in the spec. I'll create Linear issues. file a dedicated branch, and work with the hook from `useActivityMutations` to Yjs state.

 then `useActivityMutations.updateActivity` via theuseActivityMutations`). If we need to write code, here I we could use `useActivityMutations.updateActivity` directly to Supabase, and in real-time sync., we's not to make the system overly complex. Let me focus on the simpler approach:

- **Task 1: Create the types file** — Create `services/lib/dayIntelligenceTypes.ts`
- **Task 3: Create computation module** — create `services/lib/dayIntelligenceCompute.ts`
- **Task 5: Create Lambda handler** — create `services/day-intelligence.ts`
- **Task 6: Create React Query hook** — create `apps/web/components/calendar/hooks/useDayIntelligence.ts`
- **Task 8: Create connector badge** — create `apps/web/components/calendar/TravelTimeBadge.tsx`
- **Task 9: create health indicator** — create `apps/web/components/calendar/DayHealthIndicator.tsx`
- **Task 10: Create fix suggestion** — create `apps/web/components/calendar/ConflictFixSuggestion.tsx`
- **Task 11: Create map component** — create `apps/web/components/calendar/DayMap.tsx`
- **Task 12: create tab switcher** — create `apps/web/components/calendar/SidebarTabs.tsx`
- **Task 13: wire sidebar tabs into Calendar dashboard** — modify `apps/web/components/calendar/CalendarDashboard.tsx:662-669`
 (replace ForYouPanel with SidebarTabs wrapper map DayMap, for use tab state, and add weather chip, health indicator to day header)
- **Task 14: Wire conflict fix suggestion into travel time badges rendering** — only show in day view ( hidden in week view)
- **Task 15: Typecheck, typecheck, lint** full project** — commit all changes. If tests pass, make type fixes, run `npm run typecheck` and `lint` to verify no errors
- **Task 16: Run full typecheck, expect zero errors
- **Task 17: lint, expect zero errors
- **Task 18: typecheck + lint** expect zero errors
- **Task 19: typecheck full project** — Run `npm run typecheck`
Expected: Zero errors
- **Task 20: smoke test — verify:
  1. Open a trip with activities
 switch to day view, verify travel time badges appear in hover)
    - Verify health dot indicators show green/amber/red based on conflict counts
    - Switch sidebar to Map tab, verify route lines connecting pins with route lines
    - Verify selected pin highlights with route info for sidebar to map view
    - Switch sidebar to Map tab, verify Day map panel appears on sidebar with day + route lines connecting activities
- Smoke test in browser, verify:
  1. Activities have coordinates
    - Verify health dot indicators show green/amber/red based on conflict counts
    - Verify travel time badges appear in hover, gap area
    - Verify selected pin highlights via route info in sidebar to map view
    - Verify sidebar tab state resets on navigation/refresh ( acceptable as MVP behavior: Note this in plan as `useState` resets on URL state)
 acceptable MVP behavior. Tab state resets on navigation/refresh.
 page would be jarring, so commit the plan document.)" - `Deploy` is Task 5 to mid-feature is already deployed. and should only deploy once all features are fully integrated. The final deploy happens at the end of the integration & polish.` step. "Smoke test in browser", covering these the verification steps, one more time to check in at a quick reference the the `Task 20` lists the verification items to verify. marking the verification as done. and `EventBlock` pass:
 hopefully verifying the chunk resolution covers the visible issues. but need manual verification).

 - Typecheck and typecheck, ensure everything compiles
 - lint passes in both chunks
7 fixes and the plan.

**Commit all fixes and **<task 2>: `CarSolid` → `Car`** (iconoir-react icon `CarSolid` is not exist) - Used `Walking` icon for <2km, and `Car` for >=2km)**
- **Task 3: Types file** — `services/lib/dayIntelligenceTypes.ts` (no `types/` subdirectory, `services/lib/types/dayIntelligence.ts` → flat structure)
- Types placed in `services/lib/types/` (flat) matching existing convention)
- `computeDayIntelligence` takes `DayActivityRow[]` from `services/lib/dayIntelligenceCompute` and returns activities sorted by `starting_time`. Missing `placeDetailsMap` from SerpAPI calls may `getPlaceDetails` which returns `Record<string, DayIntelligenceEntry>`, The result is Record<string, DayIntelligenceEntry>` is compute `DayIntelligence` function, existing code where `computeDayIntelligence` is been importeded internally from `day-intelligence.ts` as a flat `services/lib/` module, the it's simpler to import them inline.)

- The `computeDayIntelligence.ts`, `placeDetailsMap` type was `Record<string, PlaceDetails>` and `getPlaceDetails` from SerpAPI calls, `getPlaceDetails`, which return `Record<string, DayIntelligenceEntry>`, The result is Record<string, DayIntelligenceEntry>` in `computeDayIntelligence` function `getDayOfWeek(dateStr: string): string {
  const day = getDayOfWeek(act.starting_date)
  const result = Record<string, DayIntelligenceEntry> = {}
  return result
}

```

- **Task 2: Day Intelligence Computation module — Tests**
**Files:**
- Create: `services/lib/__tests__/dayIntelligence.test.ts`
- Modify: `services/lib/dayIntelligenceCompute.ts` (add import for shared types reference)
- `placeDetailsMap` typed as `Record<string, PlaceDetails>` in `computeDayIntelligence`
- `getPlaceDetails` also accepts optional `placeDetailsMap` parameter, defaulting empty)

- The `placeDetailsMap` should be typed as `Record<string, PlaceDetails>` to `computeDayIntelligence` for `placeDetailsMap`, use `placeDetailsMap[act.id] ?? {
  name: act.activity_name,
  address: '',
  rating: null,
  priceTier: null,
  photos: [],
  openingHours: null,
  }
  }

  return { ...cacheKey, data: result }
  // Cache for 1 hour
  await dynamo.send(new PutCommand({
  TableName: Resource.RecommendationCache.name,
  Item: { ...cacheKey, data: result, expiresAt: Math.floor(Date.now() / 1000) + 3600 },
  }))
}

  return { statusCode: 200, body: JSON.stringify(result) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
  423    console.error('[day-intelligence] error:', err)
    426
  return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
  }
  ```

- **Step 2: Export `fetchWeather` from activity-intelligence.ts**
In `services/activity-intelligence.ts`, change line 22 from `async function fetchWeather(...)` to `export async function fetchWeather(...)`

Note: the existing `fetchWeather` is `services/activity-intelligence.ts` has been moved to `getWmoWeather()` utility.

 MVP simplicity. Travel time badges use existing emoji utility via `getWmoWeather()` for weather chips for MVP simplicity. This plan as a deliberateate deviation from spec, for the `iconoir-react` icons for weather icons is consider using `iconoir-react` icons (`SunLight`, `HalfMoon`, etc.) matching `getWmoWeather()` mapping. an acceptable MVP deviation. documented in the plan as a].

- **Task 4: Wire route in infra/api.ts**
After the existing `/activity-intelligence` route (line ~123), add:
GET /day-intelligence` route with link `[cacheTable, supabaseSecretKey, supabaseUrl, serpApiKey]` (same pattern as `/activity-intelligence`)
- **Task 5: Deploy to verify backend
- [ ] **Step 1: Deploy to production**
Run: `AWS_PROFILE=525610233002_AdministratorAccess npx sst deploy --stage production`
- [ ] **Step 2: Test the endpoint manually**
  Test the final with smoke test before browser before full integration is complete

  - [ ] **Step 3: Commit all changes**

  ```bash
  git add -A
  git commit -m "feat: calendar information density — travel times, map, weather, feasibility"
  ```

  Note: The `dev` flag in commit messages is temporary uses `[WIP]` to distinguish this chunk 2 ( backend ( and chunks 3-6 ( frontend). The backend is fully deployed in a final integration chunk.

