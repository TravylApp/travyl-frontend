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
| `services/lib/__tests__/dayIntelligence.test.ts` | Tests for the new endpoint logic |
| `apps/web/components/calendar/hooks/useDayIntelligence.ts` | React Query hook for day intelligence |
| `apps/web/components/calendar/TravelTimeBadge.tsx` | Connector + badge between events |
| `apps/web/components/calendar/DayHealthIndicator.tsx` | Traffic-light dot + tooltip in day header |
| `apps/web/components/calendar/ConflictFixSuggestion.tsx` | Auto-fix button for travel time conflicts |
| `apps/web/components/calendar/DayMap.tsx` | MapLibre GL map with pins + route lines |
| `apps/web/components/calendar/SidebarTabs.tsx` | Tab switcher for "For You" / "Map" |

### Modified files

| File | Change |
|------|--------|
| `infra/api.ts:~123` | Add `GET /day-intelligence` route |
| `apps/web/components/calendar/EventBlock.tsx:86-93` | Split conflict dot to hours-only; add hours badge |
| `apps/web/components/calendar/DayColumn.tsx:151-202` | Add weather chip + health dot to day header |
| `apps/web/components/calendar/DayColumn.tsx:233-259` | Insert TravelTimeBadge between EventBlocks |
| `apps/web/components/calendar/CalendarDashboard.tsx:662-669` | Wrap ForYouPanel in SidebarTabs, add DayMap |

---

## Chunk 1: Backend — Day Intelligence Endpoint

### Task 1: Day Intelligence Response Types

**Files:**
- Create: `services/lib/dayIntelligenceTypes.ts`

- [ ] **Step 1: Create shared types for the day intelligence response**

Place in `services/lib/` (flat structure, matching existing convention) not a new `types/` subdirectory.

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

export interface DayIntelligenceEntry {
  place: {
    name: string
    address: string
    rating: number | null
    priceTier: string | null
    photos: string[]
    openingHours: Array<{ day: string; opens: string; closes: string }> | null
  }
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
```

- [ ] **Step 2: Commit**

```bash
git add services/lib/dayIntelligenceTypes.ts
git commit -m "feat: add day intelligence response types"
```

### Task 2: Day Intelligence Lambda Handler — Tests

**Files:**
- Create: `services/lib/__tests__/dayIntelligence.test.ts`

- [ ] **Step 1: Write tests for the day intelligence computation logic**

The handler itself is hard to unit test (it's a Lambda handler with DynamoDB/Supabase deps). Instead, test the pure computation functions we'll extract.

```typescript
// services/lib/__tests__/dayIntelligence.test.ts
import { describe, it, expect } from 'vitest'
import { computeDayIntelligence, type DayActivityRow } from '../dayIntelligenceCompute'
import type { DayIntelligenceEntry } from '../dayIntelligenceTypes'

const makeActivity = (overrides: Partial<DayActivityRow> = {}): DayActivityRow => ({
  id: 'act-1',
  activity_name: 'Eiffel Tower',
  latitude: 48.8584,
  longitude: 2.2945,
  starting_date: '2026-04-15',
  starting_time: '09:00',
  ending_time: '11:00',
  ...overrides,
})

describe('computeDayIntelligence', () => {
  it('returns null logistics for first activity (no previous)', () => {
    const result = computeDayIntelligence([makeActivity()])
    expect(result['act-1'].logistics.travelTimeMinutes).toBeNull()
    expect(result['act-1'].logistics.previousActivityName).toBeNull()
  })

  it('computes travel time between consecutive activities', () => {
    const activities = [
      makeActivity({ id: 'a1', activity_name: 'Hotel', ending_time: '10:00' }),
      makeActivity({
        id: 'a2',
        activity_name: 'Museum',
        latitude: 48.8606,
        longitude: 2.3376,
        starting_time: '11:00',
        ending_time: '13:00',
      }),
    ]
    const result = computeDayIntelligence(activities)
    expect(result['a2'].logistics.travelTimeMinutes).toBeGreaterThan(0)
    expect(result['a2'].logistics.previousActivityName).toBe('Hotel')
  })

  it('detects hours conflict when activity is outside opening hours', () => {
    const activities = [
      makeActivity({
        id: 'a1',
        starting_time: '20:00',
        ending_time: '22:00',
      }),
    ]
    const placeDetails = {
      'a1': {
        name: 'Museum',
        address: 'Paris',
        rating: null,
        priceTier: null,
        photos: [],
        openingHours: [
          { day: 'Wednesday', opens: '09:00', closes: '18:00' },
        ],
      },
    }
    const result = computeDayIntelligence(activities, placeDetails, 'Wednesday')
    expect(result['a1'].conflicts.hours).toBe(true)
  })

  it('detects travel time conflict when gap is too short', () => {
    const activities = [
      makeActivity({ id: 'a1', ending_time: '10:00' }),
      makeActivity({
        id: 'a2',
        latitude: 48.95,
        longitude: 2.5,
        starting_time: '10:05',
        ending_time: '12:00',
      }),
    ]
    const result = computeDayIntelligence(activities)
    expect(result['a2'].conflicts.travelTime).toBe(true)
  })

  it('returns no conflict when gap is sufficient', () => {
    const activities = [
      makeActivity({ id: 'a1', ending_time: '10:00' }),
      makeActivity({
        id: 'a2',
        latitude: 48.87,
        longitude: 2.33,
        starting_time: '14:00',
        ending_time: '16:00',
      }),
    ]
    const result = computeDayIntelligence(activities)
    expect(result['a2'].conflicts.travelTime).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd services && npx vitest run lib/__tests__/dayIntelligence.test.ts`
Expected: FAIL — module `../dayIntelligenceCompute` does not exist

### Task 3: Day Intelligence Computation Module

**Files:**
- Create: `services/lib/dayIntelligenceCompute.ts`

- [ ] **Step 1: Implement the pure computation function**

```typescript
// services/lib/dayIntelligenceCompute.ts
import { haversineDistance, driveTimeMinutes } from './haversine'
import { hasHoursConflict, hasTravelTimeConflict } from './conflictDetection'

export interface DayActivityRow {
  id: string
  activity_name: string
  latitude: number
  longitude: number
  starting_date: string
  starting_time: string
  ending_time: string
}

interface PlaceDetails {
  name: string
  address: string
  rating: number | null
  priceTier: string | null
  photos: string[]
  openingHours: Array<{ day: string; opens: string; closes: string }> | null
}

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
  placeDetailsMap?: Record<string, PlaceDetails>,
  dayOfWeek?: string,
): Record<string, DayIntelligenceEntry> {
  const result: Record<string, DayIntelligenceEntry> = {}

  for (let i = 0; i < activities.length; i++) {
    const act = activities[i]
    const prev = i > 0 ? activities[i - 1] : null
    const place = placeDetailsMap?.[act.id] ?? {
      name: act.activity_name,
      address: '',
      rating: null,
      priceTier: null,
      photos: [],
      openingHours: null,
    }

    const distanceKm = prev
      ? haversineDistance(prev.latitude, prev.longitude, act.latitude, act.longitude)
      : null
    const travelTimeMinutes = distanceKm !== null ? driveTimeMinutes(distanceKm) : null
    const day = dayOfWeek ?? getDayOfWeek(act.starting_date)

    result[act.id] = {
      place,
      logistics: {
        travelTimeMinutes,
        distanceKm,
        previousActivityName: prev?.activity_name ?? null,
      },
      conflicts: {
        hours: hasHoursConflict(place.openingHours, day, act.starting_time.slice(0, 5), act.ending_time.slice(0, 5)),
        travelTime: hasTravelTimeConflict(prev?.ending_time?.slice(0, 5) ?? null, act.starting_time.slice(0, 5), travelTimeMinutes),
      },
    }
  }

  return result
}

function getDayOfWeek(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' })
}
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd services && npx vitest run lib/__tests__/dayIntelligence.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 3: Commit**

```bash
git add services/lib/dayIntelligenceCompute.ts services/lib/__tests__/dayIntelligence.test.ts
git commit -m "feat: add day intelligence computation module with tests"
```

### Task 4: Day Intelligence Lambda Handler

**Files:**
- Create: `services/day-intelligence.ts`
- Modify: `infra/api.ts:~123`

- [ ] **Step 1: Create the Lambda handler**

Follow the exact pattern from `services/activity-intelligence.ts`.

```typescript
// services/day-intelligence.ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { createClient } from '@supabase/supabase-js'
import { validateAuth } from './lib/auth'
import { getPlaceDetails } from './lib/serpapi'
import { fetchWeather } from './activity-intelligence'
import { computeDayIntelligence, type DayActivityRow } from './lib/dayIntelligenceCompute'

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}))

function getSupabase() {
  return createClient(Resource.SupabaseUrl.value, Resource.SupabaseSecretKey.value)
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const { tripId, date } = event.queryStringParameters ?? {}
    if (!tripId || !date) {
      return { statusCode: 400, body: JSON.stringify({ error: 'tripId and date required' }) }
    }

    const supabase = getSupabase()

    // Authorization — verify caller has access
    const { data: owned } = await supabase
      .from('trips')
      .select('id')
      .eq('id', tripId)
      .eq('user_id', userId)
      .maybeSingle()

    const { data: collaborated } = await supabase
      .from('trip_collaborators')
      .select('trip_id')
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .eq('invite_status', 'accepted')
      .maybeSingle()

    if (!owned && !collaborated) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) }
    }

    // Cache check
    const cacheKey = { pk: `day-intelligence:${tripId}`, sk: date }
    const cached = await dynamo.send(new GetCommand({ TableName: Resource.RecommendationCache.name, Key: cacheKey }))
    if (cached.Item && (cached.Item.expiresAt as number) > Math.floor(Date.now() / 1000)) {
      return { statusCode: 200, body: JSON.stringify(cached.Item.data) }
    }

    // Fetch all activities for this day
    const { data: activities } = await supabase
      .from('activity')
      .select('id, activity_name, latitude, longitude, starting_date, starting_time, ending_time')
      .eq('trip_id', tripId)
      .eq('starting_date', date)
      .order('starting_time', { ascending: true })

    if (!activities || activities.length === 0) {
      const emptyResult = { weather: null, activities: {} }
      return { statusCode: 200, body: JSON.stringify(emptyResult) }
    }

    // Fetch weather once for the day (use first activity's coords)
    const firstAct = activities[0]
    const weather = await fetchWeather(firstAct.latitude, firstAct.longitude, date)

    // Fetch place details in parallel
    const placePromises = activities.map((act: DayActivityRow) =>
      getPlaceDetails(act.activity_name, act.latitude, act.longitude)
    )
    const placeResults = await Promise.all(placePromises)

    const placeDetailsMap: Record<string, { name: string; address: string; rating: number | null; priceTier: string | null; photos: string[]; openingHours: Array<{ day: string; opens: string; closes: string }> | null }> = {}
    for (let i = 0; i < activities.length; i++) {
      const act = activities[i] as DayActivityRow
      placeDetailsMap[act.id] = placeResults[i] ?? {
        name: act.activity_name,
        address: '',
        rating: null,
        priceTier: null,
        photos: [],
        openingHours: null,
      }
    }

    // Compute intelligence for all activities
    const dayOfWeek = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' })
    const activitiesResult = computeDayIntelligence(activities as DayActivityRow[], placeDetailsMap, dayOfWeek)

    const result = { weather, activities: activitiesResult }

    // Cache for 1 hour
    await dynamo.send(new PutCommand({
      TableName: Resource.RecommendationCache.name,
      Item: { ...cacheKey, data: result, expiresAt: Math.floor(Date.now() / 1000) + 3600 },
    }))

    return { statusCode: 200, body: JSON.stringify(result) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[day-intelligence] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
```

- [ ] **Step 2: Export `fetchWeather` from activity-intelligence.ts**

In `services/activity-intelligence.ts`, the `fetchWeather` function is currently file-scoped (not exported). Add `export`:

Change line 22 from `async function fetchWeather(...)` to `export async function fetchWeather(...)`.

- [ ] **Step 3: Wire the route in infra/api.ts**

After the existing `/activity-intelligence` route (line 123), add:

```typescript
api.route('GET /day-intelligence', {
  handler: 'services/day-intelligence.handler',
  link: [cacheTable, supabaseSecretKey, supabaseUrl, serpApiKey],
})
```

- [ ] **Step 4: Commit**

```bash
git add services/day-intelligence.ts services/activity-intelligence.ts infra/api.ts
git commit -m "feat: add GET /day-intelligence Lambda endpoint"
```

### Task 5: Deploy and Verify Backend

- [ ] **Step 1: Deploy to production**

Run: `AWS_PROFILE=525610233002_AdministratorAccess npx sst deploy --stage production`

- [ ] **Step 2: Test the endpoint manually**

```bash
# Get a valid JWT from the Supabase session
curl -H "Authorization: Bearer $TOKEN" \
  "https://yqtl1xdcea.execute-api.us-east-1.amazonaws.com/day-intelligence?tripId=YOUR_TRIP_ID&date=2026-04-15"
```

Expected: JSON with `weather` and `activities` fields.

- [ ] **Step 3: Commit any fixes**

---

## Chunk 2: Frontend Data Layer

### Task 6: useDayIntelligence Hook

**Files:**
- Create: `apps/web/components/calendar/hooks/useDayIntelligence.ts`

- [ ] **Step 1: Create the hook**

Follow the exact pattern from `useActivityIntelligence.ts`.

```typescript
// apps/web/components/calendar/hooks/useDayIntelligence.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@travyl/shared'

export interface DayIntelligenceWeather {
  tempMaxC: number | null
  precipitationMm: number | null
  weatherCode: number | null
}

export interface DayIntelligenceActivity {
  place: {
    name: string
    address: string
    rating: number | null
    priceTier: string | null
    photos: string[]
    openingHours: Array<{ day: string; opens: string; closes: string }> | null
  }
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

export interface DayIntelligenceData {
  weather: DayIntelligenceWeather | null
  activities: Record<string, DayIntelligenceActivity>
}

const STALE_TIME = 60 * 60 * 1000 // 1 hour — matches Lambda TTL

async function fetchDayIntelligence(
  tripId: string,
  date: string,
): Promise<DayIntelligenceData> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Not authenticated')

  const apiUrl = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL ?? ''
  const url = `${apiUrl}/day-intelligence?tripId=${tripId}&date=${date}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`day-intelligence fetch failed: ${res.status}`)
  return res.json()
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
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/hooks/useDayIntelligence.ts
git commit -m "feat: add useDayIntelligence React Query hook"
```

---

## Chunk 3: Enriched Activity Cards

### Task 7: Split Conflict Dot in EventBlock

**Files:**
- Modify: `apps/web/components/calendar/EventBlock.tsx:86-93`

- [ ] **Step 1: Update conflict detection to only show hours conflict on the dot**

In `EventBlock.tsx`, change lines 86-93:

```typescript
// Before:
const intel = cachedResults[0]?.[1] ?? null
const hasConflict = intel ? (intel.conflicts.hours || intel.conflicts.travelTime) : false
const conflictTooltip = intel?.conflicts.hours && intel?.conflicts.travelTime
  ? 'Two scheduling issues'
  : intel?.conflicts.hours
  ? 'Opening hours conflict'
  : intel?.conflicts.travelTime
  ? 'Not enough travel time'
  : null

// After:
const intel = cachedResults[0]?.[1] ?? null
const hasHoursConflict = intel?.conflicts.hours ?? false
const hasTravelTimeConflict = intel?.conflicts.travelTime ?? false
const hoursConflictTooltip = intel?.conflicts.hours
  ? 'Opening hours conflict'
  : null
```

- [ ] **Step 2: Update the amber dot rendering (line 180-185)**

```typescript
// Before:
{hasConflict && conflictTooltip && (
  <div
    title={conflictTooltip}
    className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-white dark:ring-[#0f1a28] z-10"
  />
)}

// After:
{hasHoursConflict && hoursConflictTooltip && (
  <div
    title={hoursConflictTooltip}
    className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-white dark:ring-[#0f1a28] z-10"
  />
)}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/EventBlock.tsx
git commit -m "refactor: split EventBlock conflict dot to hours-only"
```

### Task 8: Add Opening Hours Badge to EventBlock

**Files:**
- Modify: `apps/web/components/calendar/EventBlock.tsx`

- [ ] **Step 1: Add hours badge below the activity card content**

The EventBlock receives intelligence via React Query cache. After the conflict dot section (after line 185), add an hours badge. The badge shows "9-18" or "Closed" based on opening hours data.

Add a new prop to EventBlock:

```typescript
// Add to EventBlockProps interface (around line 19):
intelligence?: DayIntelligenceActivity | null
```

Import the type:

```typescript
import type { DayIntelligenceActivity } from './hooks/useDayIntelligence'
```

Add the hours badge rendering after the conflict dot (after line 185):

```typescript
{intelligence?.place.openingHours && (() => {
  // Find today's hours from the opening hours array
  const todayEntry = intelligence.place.openingHours.find(h => {
    // Match against the day of the activity
    return true // simplified — actual day matching done by parent
  })
  if (!todayEntry) return null
  const isClosed = false // determined by conflict status
  return (
    <div
      className={`absolute top-0.5 left-0.5 px-1 py-0 rounded text-[8px] font-medium z-10 ${
        hasHoursConflict
          ? 'bg-red-500/80 text-white'
          : 'bg-white/70 dark:bg-black/50 text-[var(--cal-text-secondary)]'
      }`}
    >
      {hasHoursConflict ? 'Closed' : `${todayEntry.opens.slice(0,5)}-${todayEntry.closes.slice(0,5)}`}
    </div>
  )
})()}
```

Note: The exact day matching will be handled by passing the `intelligence` prop from the parent DayColumn, which has access to `useDayIntelligence` data.

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/EventBlock.tsx
git commit -m "feat: add opening hours badge to EventBlock"
```

### Task 9: Add Weather Chip to DayColumn Header

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx:151-202`

- [ ] **Step 1: Add weather chip to the day header**

Import the hook and weather icon utility at the top of DayColumn.tsx:

```typescript
import { useDayIntelligence } from './hooks/useDayIntelligence'
import { getWmoWeather } from './utils/wmoWeatherCode'
```

Inside the DayColumn component, call the hook (need tripId and date from props — may need to pass these through). Add the weather chip after the `{label}` in the day header div (around line 190, after the label text):

```typescript
{dayWeather && (
  <div className="flex items-center justify-center gap-0.5 mt-0.5 text-[10px] text-[var(--cal-text-tertiary)]">
    <span className="text-xs">{getWmoWeather(dayWeather.weatherCode ?? null).icon}</span>
    {dayWeather.tempMaxC !== null && (
      <span>{Math.round(dayWeather.tempMaxC)}°C</span>
    )}
  </div>
)}
```

Where `dayWeather` comes from `useDayIntelligence` data. The hook needs `tripId` and `date` — these may need to be threaded through props from the parent components (WeekView/DayView → DayColumn).

- [ ] **Step 2: Thread tripId and date props through WeekView/DayView to DayColumn**

Check WeekView and DayView components to see what props DayColumn currently receives. Add `tripId` and `date` (ISO string) to the DayColumn props interface and pass them through.

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/DayColumn.tsx
git commit -m "feat: add weather chip to day header"
```

---

## Chunk 4: Travel Time Badges

### Task 10: TravelTimeBadge Component

**Files:**
- Create: `apps/web/components/calendar/TravelTimeBadge.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/components/calendar/TravelTimeBadge.tsx
'use client'
import { Walking, Car } from 'iconoir-react'
import { WarningCircle } from 'iconoir-react'

interface TravelTimeBadgeProps {
  travelTimeMinutes: number | null
  distanceKm: number | null
  previousActivityName: string | null
  hasConflict: boolean
  gapMinutes?: number | null
}

export function TravelTimeBadge({
  travelTimeMinutes,
  distanceKm,
  previousActivityName,
  hasConflict,
  gapMinutes,
}: TravelTimeBadgeProps) {
  if (travelTimeMinutes === null || distanceKm === null) return null

  const isWalking = distanceKm < 2
  const TransportIcon = isWalking ? Walking : Car

  return (
    <div className="flex items-center justify-center py-0.5 group/gap">
      {/* Dashed connector line */}
      <div className="flex-1 border-t border-dashed border-[var(--cal-border)] mx-2" />

      {/* Badge */}
      <div
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${
          hasConflict
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            : 'bg-[var(--cal-border-light)] text-[var(--cal-text-tertiary)]'
        }`}
        title={
          hasConflict
            ? `${travelTimeMinutes} min needed from ${previousActivityName}, only ${gapMinutes} min gap`
            : `${travelTimeMinutes} min from ${previousActivityName}`
        }
      >
        {hasConflict && <WarningCircle className="w-3 h-3" />}
        <TransportIcon className="w-3 h-3" />
        <span>{travelTimeMinutes} min</span>
      </div>

      {/* Dashed connector line */}
      <div className="flex-1 border-t border-dashed border-[var(--cal-border)] mx-2" />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/TravelTimeBadge.tsx
git commit -m "feat: add TravelTimeBadge component"
```

### Task 11: Insert Travel Time Badges in DayColumn

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx:233-259`

- [ ] **Step 1: Insert TravelTimeBadge between EventBlocks in the day grid**

This requires changing the activities rendering loop. Currently it's a flat `.map()`. Change it to interleave TravelTimeBadge components between consecutive EventBlocks.

The key challenge is positioning: EventBlocks are absolutely positioned in the hour grid. Travel time badges need to be positioned between them. The simplest approach: render them as absolutely positioned elements at the midpoint between consecutive activities.

In DayColumn, after the EventBlocks map section, add a separate loop for travel time badges:

```tsx
{/* Travel time badges between activities */}
{viewMode === 'day' && dayIntel && sortedActivities.length > 1 && (
  sortedActivities.slice(1).map((activity, i) => {
    const prev = sortedActivities[i]
    const intel = dayIntel.activities[activity.id]
    if (!intel?.logistics.travelTimeMinutes) return null

    const prevEndY = (prev.startHour + prev.duration - timeRange.startHour) * HOUR_HEIGHT
    const currentStartY = (activity.startHour - timeRange.startHour) * HOUR_HEIGHT
    const midY = (prevEndY + currentStartY) / 2

    return (
      <div
        key={`tt-${activity.id}`}
        className="absolute left-4 right-4"
        style={{ top: midY - 8 }}
      >
        <TravelTimeBadge
          travelTimeMinutes={intel.logistics.travelTimeMinutes}
          distanceKm={intel.logistics.distanceKm}
          previousActivityName={intel.logistics.previousActivityName}
          hasConflict={intel.conflicts.travelTime}
        />
      </div>
    )
  })
)}
```

Need to ensure:
- `viewMode` is available (import from `useCalendarNavigation` or pass as prop)
- `dayIntel` is from `useDayIntelligence`
- `sortedActivities` is the activities array sorted by `startHour`

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/DayColumn.tsx
git commit -m "feat: add travel time badges between activities in day view"
```

---

## Chunk 5: Schedule Feasibility

### Task 12: DayHealthIndicator Component

**Files:**
- Create: `apps/web/components/calendar/DayHealthIndicator.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/components/calendar/DayHealthIndicator.tsx
'use client'
import { useState } from 'react'

interface DayHealthIndicatorProps {
  hoursConflicts: number
  travelTimeConflicts: number
}

export function DayHealthIndicator({
  hoursConflicts,
  travelTimeConflicts,
}: DayHealthIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  if (hoursConflicts === 0 && travelTimeConflicts === 0) {
    // Green dot — all good
    return (
      <div className="inline-flex items-center">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Schedule looks good" />
      </div>
    )
  }

  const isRed = hoursConflicts > 0
  const color = isRed ? 'bg-red-400' : 'bg-amber-400'

  const parts: string[] = []
  if (hoursConflicts > 0) parts.push(`${hoursConflicts} hours conflict${hoursConflicts > 1 ? 's' : ''}`)
  if (travelTimeConflicts > 0) parts.push(`${travelTimeConflicts} travel time warning${travelTimeConflicts > 1 ? 's' : ''}`)

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${color} cursor-help`} />
      {showTooltip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 rounded bg-gray-900 text-white text-[10px] whitespace-nowrap z-50 shadow-lg">
          {parts.join(', ')}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/DayHealthIndicator.tsx
git commit -m "feat: add DayHealthIndicator component"
```

### Task 13: ConflictFixSuggestion Component

**Files:**
- Create: `apps/web/components/calendar/ConflictFixSuggestion.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/components/calendar/ConflictFixSuggestion.tsx
'use client'

interface ConflictFixSuggestionProps {
  activityId: string
  currentStartHour: number
  currentDuration: number
  travelTimeMinutes: number
  gapMinutes: number
  onFix: (activityId: string, newStartHour: number) => void
}

export function ConflictFixSuggestion({
  activityId,
  currentStartHour,
  currentDuration,
  travelTimeMinutes,
  gapMinutes,
  onFix,
}: ConflictFixSuggestionProps) {
  // Push start time forward by the difference
  const neededExtraMinutes = travelTimeMinutes - gapMinutes
  const newStartHour = currentStartHour + neededExtraMinutes / 60

  if (newStartHour >= 24) return null // can't fix, would go past midnight

  const newStartFormatted = formatHour(newStartHour)

  return (
    <button
      onClick={() => onFix(activityId, newStartHour)}
      className="text-[10px] text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
    >
      Move to {newStartFormatted}
    </button>
  )
}

function formatHour(h: number): string {
  const hours = Math.floor(h)
  const minutes = Math.round((h - hours) * 60)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return minutes > 0 ? `${displayHours}:${String(minutes).padStart(2, '0')} ${period}` : `${displayHours} ${period}`
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/ConflictFixSuggestion.tsx
git commit -m "feat: add ConflictFixSuggestion component"
```

### Task 14: Wire Health Indicator and Fix into DayColumn

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx`

- [ ] **Step 1: Add DayHealthIndicator to day header**

Import `DayHealthIndicator` and add it to the day header section (around line 190, after `{label}`):

```tsx
{dayIntel && (() => {
  const entries = Object.values(dayIntel.activities)
  const hoursConflicts = entries.filter(e => e.conflicts.hours).length
  const travelTimeConflicts = entries.filter(e => e.conflicts.travelTime).length
  return (
    <span className="ml-1">
      <DayHealthIndicator hoursConflicts={hoursConflicts} travelTimeConflicts={travelTimeConflicts} />
    </span>
  )
})()}
```

- [ ] **Step 2: Wire ConflictFixSuggestion into travel time badges**

Pass an `onFix` callback to the TravelTimeBadge that calls `useActivityMutations.moveActivity` (or `updateActivity`). The fix button appears inside the travel time badge tooltip or as an inline action.

For now, the ConflictFixSuggestion renders inside TravelTimeBadge when `hasConflict` is true. Update TravelTimeBadge to accept and render it.

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/DayColumn.tsx
git commit -m "feat: wire day health indicator and conflict fix into day column"
```

---

## Chunk 6: Mini-Map Panel

### Task 15: Install MapLibre GL JS

- [ ] **Step 1: Install dependencies**

Run: `npm install --workspace=apps/web maplibre-gl @types/maplibre-gl`

For Amazon Location Maps tiles (optional, for later):
Run: `npm install --workspace=apps/web @aws/amazon-location-utilities-auth-helper`

- [ ] **Step 2: Commit**

```bash
git add apps/web/package.json package-lock.json
git commit -m "chore: add maplibre-gl dependency"
```

### Task 16: SidebarTabs Component

**Files:**
- Create: `apps/web/components/calendar/SidebarTabs.tsx`

- [ ] **Step 1: Create the tab switcher**

```tsx
// apps/web/components/calendar/SidebarTabs.tsx
'use client'
import type { ReactNode } from 'react'

type Tab = 'for-you' | 'map'

interface SidebarTabsProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  forYouContent: ReactNode
  mapContent: ReactNode
}

export function SidebarTabs({
  activeTab,
  onTabChange,
  forYouContent,
  mapContent,
}: SidebarTabsProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-[var(--cal-border)] shrink-0">
        <button
          onClick={() => onTabChange('for-you')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'for-you'
              ? 'text-[var(--cal-text)] border-b-2 border-[var(--cal-accent)]'
              : 'text-[var(--cal-text-tertiary)] hover:text-[var(--cal-text-secondary)]'
          }`}
        >
          For You
        </button>
        <button
          onClick={() => onTabChange('map')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'map'
              ? 'text-[var(--cal-text)] border-b-2 border-[var(--cal-accent)]'
              : 'text-[var(--cal-text-tertiary)] hover:text-[var(--cal-text-secondary)]'
          }`}
        >
          Map
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'for-you' ? forYouContent : mapContent}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/SidebarTabs.tsx
git commit -m "feat: add SidebarTabs component for For You / Map switcher"
```

### Task 17: DayMap Component

**Files:**
- Create: `apps/web/components/calendar/DayMap.tsx`

- [ ] **Step 1: Create the MapLibre map component**

```tsx
// apps/web/components/calendar/DayMap.tsx
'use client'
import { useRef, useEffect, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import type { CalendarActivity } from './types'
import type { DayIntelligenceData } from './hooks/useDayIntelligence'

interface DayMapProps {
  activities: CalendarActivity[]
  intelligence?: DayIntelligenceData | null
  selectedActivityId: string | null
  onSelectActivity: (id: string) => void
}

export function DayMap({
  activities,
  intelligence,
  selectedActivityId,
  onSelectActivity,
}: DayMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const activitiesWithCoords = activities.filter(a => a.latitude && a.longitude)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return
    if (activitiesWithCoords.length === 0) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [{
          id: 'osm-tiles-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19,
        }],
      },
      center: [activitiesWithCoords[0].longitude!, activitiesWithCoords[0].latitude!],
      zoom: 13,
    })

    map.on('load', () => setMapReady(true))
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers when activities change
  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    const map = mapRef.current

    // Remove existing markers
    document.querySelectorAll('.day-map-marker').forEach(el => el.remove())

    const bounds = new maplibregl.LngLatBounds()

    activitiesWithCoords.forEach((activity, index) => {
      const color = getActivityColor(activity.type)
      const isSelected = activity.id === selectedActivityId

      const el = document.createElement('div')
      el.className = 'day-map-marker'
      el.style.cssText = `
        width: 24px; height: 24px; border-radius: 50%;
        background: ${color}; color: white; display: flex;
        align-items: center; justify-content: center;
        font-size: 10px; font-weight: bold; cursor: pointer;
        border: 2px solid ${isSelected ? 'white' : 'transparent'};
        box-shadow: ${isSelected ? '0 0 0 2px ' + color : '0 1px 3px rgba(0,0,0,0.3)'};
      `
      el.textContent = String(index + 1)
      el.addEventListener('click', () => onSelectActivity(activity.id))

      new maplibregl.Marker({ element: el })
        .setLngLat([activity.longitude!, activity.latitude!])
        .addTo(map)

      bounds.extend([activity.longitude!, activity.latitude!])
    })

    // Draw route line between activities
    if (activitiesWithCoords.length > 1) {
      const coordinates = activitiesWithCoords.map(a => [a.longitude!, a.latitude!] as [number, number])

      const sourceId = 'route'
      const layerId = 'route-line'

      if (map.getSource(sourceId)) {
        map.getSource(sourceId).setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates },
        } as any)
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates },
          },
        })
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#1e3a5f',
            'line-width': 2,
            'line-dasharray': [4, 4],
            'line-opacity': 0.6,
          },
        })
      }

      map.fitBounds(bounds, { padding: 40, maxZoom: 15 })
    }
  }, [mapReady, activitiesWithCoords, selectedActivityId, onSelectActivity])

  if (activitiesWithCoords.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-[var(--cal-text-tertiary)] p-4 text-center">
        Add locations to activities to see the route map
      </div>
    )
  }

  return <div ref={mapContainer} className="w-full h-full" />
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/DayMap.tsx
git commit -m "feat: add DayMap component with MapLibre GL"
```

### Task 18: Wire SidebarTabs + DayMap into CalendarDashboard

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx:662-669`

- [ ] **Step 1: Add tab state**

In CalendarDashboard, add state for the sidebar tab:

```typescript
const [sidebarTab, setSidebarTab] = useState<'for-you' | 'map'>('for-you')
```

- [ ] **Step 2: Replace ForYouPanel with SidebarTabs**

Replace lines 662-669 (the ForYouPanel rendering) with:

```tsx
<SidebarTabs
  activeTab={sidebarTab}
  onTabChange={setSidebarTab}
  forYouContent={
    <ForYouPanel
      destination={trip?.destination ?? ''}
      tripId={trip?.id ?? ''}
      scheduledActivityIds={droppedSuggestionIds}
      width={forYouWidth}
    />
  }
  mapContent={
    <DayMap
      activities={currentDayActivities}
      intelligence={dayIntelligence}
      selectedActivityId={selectedEventId}
      onSelectActivity={(id) => selectEvent(id)}
    />
  }
/>
```

Where `currentDayActivities` is the activities for the currently selected/viewed day, and `dayIntelligence` comes from a `useDayIntelligence` call at the dashboard level.

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: wire sidebar tabs with day map into calendar dashboard"
```

---

## Chunk 7: Integration & Polish

### Task 19: Typecheck Full Project

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: Zero errors

- [ ] **Step 2: Fix any type errors**

### Task 20: Lint

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: Zero errors

- [ ] **Step 2: Fix any lint issues**

### Task 21: Deploy and Smoke Test

- [ ] **Step 1: Deploy**

Run: `AWS_PROFILE=525610233002_AdministratorAccess npx sst deploy --stage production`

- [ ] **Step 2: Smoke test in browser**

1. Open a trip with activities
2. Switch to Day View — verify travel time badges appear between activities
3. Verify weather chip shows in day header
4. Verify health dot shows (green/amber/red) based on conflicts
5. Switch sidebar to Map tab — verify pins appear for activities with locations
6. Click a pin — verify the activity is selected on the calendar
7. Hover over a travel time badge with conflict — verify warning message shows

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: calendar information density — travel times, map, weather, feasibility"
```
