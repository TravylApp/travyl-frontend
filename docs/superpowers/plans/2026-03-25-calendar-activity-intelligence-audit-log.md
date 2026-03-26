# Calendar Activity Intelligence + Audit Log — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an activity intelligence enrichment panel (place details, logistics, weather, conflict badges) and a revertible audit history drawer to the trip calendar.

**Architecture:** A new `GET /activity-intelligence` Lambda fans out to SerpAPI, Haversine travel-time, and Open-Meteo in parallel, caches results in DynamoDB, and runs conflict checks before responding. On the frontend, `useActivityIntelligence` powers both an `ActivityIntelligencePanel` in `DetailPanel` and conflict badges on `EventBlock`. A separate `itinerary_edits` audit trail (written from `useActivityMutations` and `useYjsSync`) feeds a `HistoryDrawer` with per-entry revert.

**Tech Stack:** Next.js 16 / React 19 / Tailwind CSS 4, Supabase JS v2, React Query v5, Yjs, AWS Lambda (SST v3), DynamoDB, SerpAPI, Open-Meteo (no key)

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `apps/web/components/calendar/hooks/yMapToCalendarActivity.ts` | **New** | Extract shared helper from `useYjsSync` |
| `supabase/migrations/20260325000003_itinerary_edits.sql` | **New** | Create `itinerary_edits` table + RLS |
| `services/lib/haversine.ts` | **New** | Distance + drive-time math |
| `services/lib/conflictDetection.ts` | **New** | Hours + travel-time conflict checks |
| `services/lib/serpapi.ts` | **Modify** | Add `getPlaceDetails` (google_maps engine) |
| `services/activity-intelligence.ts` | **New** | Lambda handler |
| `infra/api.ts` | **Modify** | Register `/activity-intelligence` route |
| `apps/web/components/calendar/utils/wmoWeatherCode.ts` | **New** | WMO code → icon + label |
| `apps/web/components/calendar/hooks/useActivityIntelligence.ts` | **New** | React Query hook |
| `apps/web/components/calendar/ActivityIntelligencePanel.tsx` | **New** | Enrichment panel UI |
| `apps/web/components/calendar/DetailPanel.tsx` | **Modify** | Mount `ActivityIntelligencePanel` |
| `apps/web/components/calendar/EventBlock.tsx` | **Modify** | Conflict badge (reads from RQ cache) |
| `apps/web/components/calendar/CalendarDashboard.tsx` | **Modify** | Prefetch intelligence; invalidate on move/edit; own `HistoryDrawer` state |
| `apps/web/components/calendar/hooks/useActivityMutations.ts` | **Modify** | Audit insert for create/delete |
| `apps/web/components/calendar/hooks/useYjsSync.ts` | **Modify** | `beforeSnapshotRef`; audit insert for move/edit in flush |
| `apps/web/components/calendar/hooks/useActivityHistory.ts` | **New** | Read + merge audit log |
| `apps/web/components/calendar/HistoryDrawer.tsx` | **New** | History UI + revert |
| `apps/web/components/calendar/TripNavbar.tsx` | **Modify** | `onOpenHistory` prop + History button |

---

## Task 1: Extract `yMapToCalendarActivity` shared helper

Both `useYjsSync` (existing) and `useActivityMutations` (upcoming) need to convert a `Y.Map<unknown>` to `CalendarActivity`. The function currently lives as a module-private helper in `useYjsSync.ts`.

**Files:**
- Create: `apps/web/components/calendar/hooks/yMapToCalendarActivity.ts`
- Modify: `apps/web/components/calendar/hooks/useYjsSync.ts`

- [ ] **Step 1: Create the shared helper file**

```ts
// apps/web/components/calendar/hooks/yMapToCalendarActivity.ts
import * as Y from 'yjs'
import type { CalendarActivity } from '../types'

export const CALENDAR_ACTIVITY_KEYS: (keyof CalendarActivity)[] = [
  'id', 'title', 'type', 'day', 'endDay', 'startHour', 'duration',
  'location', 'image', 'rating', 'price', 'notes', 'color',
  'latitude', 'longitude', 'sortOrder', 'pollResult', 'unscheduled',
  'flightNumber', 'airline', 'checkIn', 'checkOut', 'bookingRef',
]

export function yMapToCalendarActivity(
  id: string,
  yMap: Y.Map<unknown>,
): CalendarActivity {
  const obj: Record<string, unknown> = { id }
  for (const key of CALENDAR_ACTIVITY_KEYS) {
    const val = yMap.get(key)
    if (val !== undefined) obj[key] = val
  }
  return obj as unknown as CalendarActivity
}
```

- [ ] **Step 2: Update `useYjsSync.ts` to import from shared helper**

Remove the local `CALENDAR_ACTIVITY_KEYS` and `yMapToCalendarActivity` definitions and replace with:

```ts
import { yMapToCalendarActivity, CALENDAR_ACTIVITY_KEYS } from './yMapToCalendarActivity'
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/hooks/yMapToCalendarActivity.ts \
        apps/web/components/calendar/hooks/useYjsSync.ts
git commit -m "refactor: extract yMapToCalendarActivity to shared helper"
```

---

## Task 2: Supabase migration — `itinerary_edits` table

The `itinerary_edits` table is referenced in `ARCHITECTURE.md` but has no migration file. This task creates it from scratch with the columns needed for the audit feature.

**Files:**
- Create: `supabase/migrations/20260325000003_itinerary_edits.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260325000003_itinerary_edits.sql

-- Create base table
CREATE TABLE IF NOT EXISTS itinerary_edits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  activity_id   uuid NOT NULL,
  edit_type     text NOT NULL,  -- 'create' | 'delete' | 'move' | 'edit' | 'revert'
  original_data jsonb,
  new_data      jsonb,
  user_id       uuid REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX itinerary_edits_trip_id_idx ON itinerary_edits (trip_id, created_at DESC);

ALTER TABLE itinerary_edits ENABLE ROW LEVEL SECURITY;

-- Trip owners and accepted collaborators can read edits
CREATE POLICY "Collaborators can read itinerary edits"
  ON itinerary_edits FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_collaborators
      WHERE user_id = auth.uid() AND invite_status = 'accepted'
    )
  );

-- Users can only insert their own edits
CREATE POLICY "Users insert own edits"
  ON itinerary_edits FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

- [ ] **Step 2: Apply migration**

```bash
npx supabase db push
```
Expected: migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260325000003_itinerary_edits.sql
git commit -m "feat(db): create itinerary_edits table with RLS"
```

---

## Task 3: Haversine + conflict detection utilities (Lambda)

Pure math functions. No external dependencies. Easiest to get right with tests first.

**Files:**
- Create: `services/lib/haversine.ts`
- Create: `services/lib/conflictDetection.ts`

- [ ] **Step 1: Write `haversine.ts`**

```ts
// services/lib/haversine.ts
const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/** Returns distance in km between two lat/lng points */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Returns estimated drive time in minutes (assume 40 km/h urban average) */
export function driveTimeMinutes(distanceKm: number): number {
  return Math.round((distanceKm / 40) * 60)
}
```

- [ ] **Step 2: Write `conflictDetection.ts`**

```ts
// services/lib/conflictDetection.ts

interface HoursEntry {
  day: string   // e.g. 'Monday'
  opens: string // e.g. '09:00'
  closes: string
}

/** Returns true if the activity time falls outside any matching opening hours entry */
export function hasHoursConflict(
  openingHours: HoursEntry[] | null,
  dayOfWeek: string,  // e.g. 'Monday'
  startTime: string,  // e.g. '17:30' (HH:MM)
  endTime: string,
): boolean {
  if (!openingHours) return false
  const entry = openingHours.find((h) => h.day === dayOfWeek)
  if (!entry) return false
  return startTime < entry.opens || endTime > entry.closes
}

/** Returns true if gap < required travel time */
export function hasTravelTimeConflict(
  prevEndTime: string | null,     // 'HH:MM'
  activityStartTime: string,
  travelTimeMinutes: number | null,
): boolean {
  if (!prevEndTime || travelTimeMinutes === null) return false
  const [ph, pm] = prevEndTime.split(':').map(Number)
  const [sh, sm] = activityStartTime.split(':').map(Number)
  const gapMinutes = (sh * 60 + sm) - (ph * 60 + pm)
  return gapMinutes < travelTimeMinutes
}
```

- [ ] **Step 3: Write tests**

Create `services/lib/__tests__/haversine.test.ts`:
```ts
import { haversineDistance, driveTimeMinutes } from '../haversine'

test('haversine: same point is 0', () => {
  expect(haversineDistance(48.8566, 2.3522, 48.8566, 2.3522)).toBeCloseTo(0)
})

test('haversine: Paris to London is roughly 340km', () => {
  const d = haversineDistance(48.8566, 2.3522, 51.5074, -0.1278)
  expect(d).toBeGreaterThan(330)
  expect(d).toBeLessThan(350)
})

test('driveTimeMinutes: 20km at 40km/h = 30min', () => {
  expect(driveTimeMinutes(20)).toBe(30)
})
```

Create `services/lib/__tests__/conflictDetection.test.ts`:
```ts
import { hasHoursConflict, hasTravelTimeConflict } from '../conflictDetection'

const hours = [{ day: 'Monday', opens: '09:00', closes: '17:00' }]

test('no conflict when within hours', () => {
  expect(hasHoursConflict(hours, 'Monday', '10:00', '12:00')).toBe(false)
})

test('conflict when activity ends after closing', () => {
  expect(hasHoursConflict(hours, 'Monday', '10:00', '18:00')).toBe(true)
})

test('conflict when activity starts before opening', () => {
  expect(hasHoursConflict(hours, 'Monday', '08:00', '10:00')).toBe(true)
})

test('no hours conflict when openingHours is null', () => {
  expect(hasHoursConflict(null, 'Monday', '10:00', '12:00')).toBe(false)
})

test('travel time conflict: gap shorter than travel', () => {
  expect(hasTravelTimeConflict('14:00', '14:10', 20)).toBe(true)
})

test('no travel time conflict: gap longer than travel', () => {
  expect(hasTravelTimeConflict('14:00', '15:00', 20)).toBe(false)
})

test('no conflict when prevEndTime is null', () => {
  expect(hasTravelTimeConflict(null, '14:00', 20)).toBe(false)
})
```

- [ ] **Step 4: Run tests**

```bash
cd services && npx jest lib/__tests__
```
Expected: 10 tests pass

- [ ] **Step 5: Commit**

```bash
git add services/lib/haversine.ts services/lib/conflictDetection.ts \
        services/lib/__tests__/haversine.test.ts \
        services/lib/__tests__/conflictDetection.test.ts
git commit -m "feat(lambda): add haversine and conflict detection utilities"
```

---

## Task 4: Add `getPlaceDetails` to SerpAPI lib

The existing `searchPlaces` uses `engine: 'google_local'` to find lists of places near a destination. The new `getPlaceDetails` uses `engine: 'google_maps'` to fetch details for a specific place by name + coordinates.

**Files:**
- Modify: `services/lib/serpapi.ts`

- [ ] **Step 1: Add the response interface and function**

Add to the bottom of `services/lib/serpapi.ts`:

```ts
interface SerpMapsResult {
  title?: string
  address?: string
  rating?: number
  price?: string    // '$' | '$$' | '$$$$' etc.
  photos?: Array<{ image?: string; thumbnail?: string }>
  hours?: {
    schedule?: Array<{ day: string; opens: string; closes: string }>
  }
}

interface SerpMapsResponse {
  place_results?: SerpMapsResult
}

export interface PlaceDetails {
  name: string
  address: string
  rating: number | null
  priceTier: string | null
  photos: string[]
  openingHours: Array<{ day: string; opens: string; closes: string }> | null
}

/**
 * Fetch place details for a specific location by name + coordinates.
 * Uses SerpAPI google_maps engine (single-place detail, different from google_local).
 * Opening hours are best-effort — absent from many results.
 */
export async function getPlaceDetails(
  name: string,
  lat: number,
  lng: number,
): Promise<PlaceDetails | null> {
  const url = new URL(SERPAPI_BASE)
  url.searchParams.set('engine', 'google_maps')
  url.searchParams.set('q', name)
  url.searchParams.set('ll', `@${lat},${lng},14z`)
  url.searchParams.set('api_key', getApiKey())

  try {
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = (await res.json()) as SerpMapsResponse
    const place = data.place_results
    if (!place) return null

    const photos = (place.photos ?? [])
      .slice(0, 3)
      .map((p) => p.image ?? p.thumbnail ?? '')
      .filter(Boolean)

    return {
      name: place.title ?? name,
      address: place.address ?? '',
      rating: place.rating ?? null,
      priceTier: place.price ?? null,
      photos,
      openingHours: place.hours?.schedule ?? null,
    }
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add services/lib/serpapi.ts
git commit -m "feat(lambda): add getPlaceDetails using SerpAPI google_maps engine"
```

---

## Task 5: Activity intelligence Lambda + SST route

**Files:**
- Create: `services/activity-intelligence.ts`
- Modify: `infra/api.ts`

- [ ] **Step 1: Write the Lambda handler**

```ts
// services/activity-intelligence.ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { createClient } from '@supabase/supabase-js'
import { validateAuth } from './lib/auth'
import { getPlaceDetails } from './lib/serpapi'
import { haversineDistance, driveTimeMinutes } from './lib/haversine'
import { hasHoursConflict, hasTravelTimeConflict } from './lib/conflictDetection'

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}))

function getSupabase() {
  return createClient(Resource.SupabaseUrl.value, Resource.SupabaseSecretKey.value)
}

function getDayOfWeek(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' })
}

async function fetchWeather(lat: number, lng: number, date: string) {
  const isHistorical = new Date(date) < new Date()
  const base = isHistorical
    ? 'https://archive-api.open-meteo.com/v1/archive'
    : 'https://api.open-meteo.com/v1/forecast'
  const url = new URL(base)
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lng))
  url.searchParams.set('start_date', date)
  url.searchParams.set('end_date', date)
  url.searchParams.set('daily', 'temperature_2m_max,precipitation_sum,weathercode')
  url.searchParams.set('timezone', 'auto')
  try {
    const res = await fetch(url.toString())
    if (!res.ok) return null
    const data = await res.json() as any
    return {
      tempMaxC: data.daily?.temperature_2m_max?.[0] ?? null,
      precipitationMm: data.daily?.precipitation_sum?.[0] ?? null,
      weatherCode: data.daily?.weathercode?.[0] ?? null,
    }
  } catch {
    return null
  }
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const { activityId, tripId } = event.queryStringParameters ?? {}
    if (!activityId || !tripId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'activityId and tripId required' }) }
    }

    const supabase = getSupabase()

    // Fetch the target activity first — we need starting_date for the cache key
    const { data: activity } = await supabase
      .from('activity')
      .select('activity_name, latitude, longitude, starting_date, starting_time, ending_time')
      .eq('id', activityId)
      .single()

    if (!activity) return { statusCode: 404, body: JSON.stringify({ error: 'activity not found' }) }

    // Cache check — sk is starting_date so moving the activity to a new date generates
    // a fresh cache entry naturally
    const cacheKey = { pk: `intelligence:${activityId}`, sk: activity.starting_date }
    const cached = await dynamo.send(new GetCommand({ TableName: Resource.RecommendationCache.name, Key: cacheKey }))
    if (cached.Item && (cached.Item.expiresAt as number) > Math.floor(Date.now() / 1000)) {
      return { statusCode: 200, body: JSON.stringify(cached.Item.data) }
    }

    // Fetch previous activity on same day
    const { data: prevActivities } = await supabase
      .from('activity')
      .select('activity_name, latitude, longitude, ending_time')
      .eq('trip_id', tripId)
      .eq('starting_date', activity.starting_date)
      .lt('starting_time', activity.starting_time)
      .order('starting_time', { ascending: false })
      .limit(1)

    const prev = prevActivities?.[0] ?? null

    // Fan out
    const [place, weather] = await Promise.all([
      getPlaceDetails(activity.activity_name, activity.latitude, activity.longitude),
      fetchWeather(activity.latitude, activity.longitude, activity.starting_date),
    ])

    const distanceKm = prev
      ? haversineDistance(prev.latitude, prev.longitude, activity.latitude, activity.longitude)
      : null
    const travelTimeMinutes = distanceKm !== null ? driveTimeMinutes(distanceKm) : null
    const dayOfWeek = getDayOfWeek(activity.starting_date)

    const result = {
      place: place ?? {
        name: activity.activity_name,
        address: '',
        rating: null,
        priceTier: null,
        photos: [],
        openingHours: null,
      },
      logistics: {
        travelTimeMinutes,
        distanceKm,
        previousActivityName: prev?.activity_name ?? null,
      },
      weather,
      conflicts: {
        hours: hasHoursConflict(
          place?.openingHours ?? null,
          dayOfWeek,
          activity.starting_time.slice(0, 5),
          activity.ending_time.slice(0, 5),
        ),
        travelTime: hasTravelTimeConflict(
          prev?.ending_time?.slice(0, 5) ?? null,
          activity.starting_time.slice(0, 5),
          travelTimeMinutes,
        ),
      },
    }

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
    console.error('[activity-intelligence] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
```

- [ ] **Step 2: Register route in `infra/api.ts`**

Add after the last `api.route(...)` call:

```ts
api.route('GET /activity-intelligence', {
  handler: 'services/activity-intelligence.handler',
  link: [cacheTable, supabaseSecretKey, supabaseUrl, serpApiKey],
})
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add services/activity-intelligence.ts infra/api.ts
git commit -m "feat(lambda): add activity-intelligence endpoint"
```

---

## Task 6: WMO weather code utility

**Files:**
- Create: `apps/web/components/calendar/utils/wmoWeatherCode.ts`

- [ ] **Step 1: Write the mapping**

```ts
// apps/web/components/calendar/utils/wmoWeatherCode.ts
export interface WmoWeather {
  icon: string  // emoji
  label: string
}

const WMO_MAP: Record<number, WmoWeather> = {
  0:  { icon: '☀️', label: 'Clear sky' },
  1:  { icon: '🌤', label: 'Mainly clear' },
  2:  { icon: '⛅', label: 'Partly cloudy' },
  3:  { icon: '☁️', label: 'Overcast' },
  45: { icon: '🌫', label: 'Fog' },
  48: { icon: '🌫', label: 'Icy fog' },
  51: { icon: '🌦', label: 'Light drizzle' },
  53: { icon: '🌦', label: 'Drizzle' },
  55: { icon: '🌧', label: 'Heavy drizzle' },
  61: { icon: '🌧', label: 'Light rain' },
  63: { icon: '🌧', label: 'Rain' },
  65: { icon: '🌧', label: 'Heavy rain' },
  71: { icon: '🌨', label: 'Light snow' },
  73: { icon: '🌨', label: 'Snow' },
  75: { icon: '❄️', label: 'Heavy snow' },
  77: { icon: '🌨', label: 'Snow grains' },
  80: { icon: '🌦', label: 'Light showers' },
  81: { icon: '🌧', label: 'Showers' },
  82: { icon: '⛈', label: 'Heavy showers' },
  85: { icon: '🌨', label: 'Snow showers' },
  86: { icon: '❄️', label: 'Heavy snow showers' },
  95: { icon: '⛈', label: 'Thunderstorm' },
  96: { icon: '⛈', label: 'Thunderstorm + hail' },
  99: { icon: '⛈', label: 'Thunderstorm + heavy hail' },
}

export function getWmoWeather(code: number | null): WmoWeather {
  if (code === null) return { icon: '🌡', label: 'Unknown' }
  return WMO_MAP[code] ?? { icon: '🌡', label: `Code ${code}` }
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/utils/wmoWeatherCode.ts
git commit -m "feat(calendar): add WMO weather code utility"
```

---

## Task 7: `useActivityIntelligence` hook

**Files:**
- Create: `apps/web/components/calendar/hooks/useActivityIntelligence.ts`

- [ ] **Step 1: Write the hook**

```ts
// apps/web/components/calendar/hooks/useActivityIntelligence.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@travyl/shared'

export interface ActivityIntelligence {
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
  weather: {
    tempMaxC: number | null
    precipitationMm: number | null
    weatherCode: number | null
  } | null
  conflicts: {
    hours: boolean
    travelTime: boolean
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''
const STALE_TIME = 60 * 60 * 1000 // 1 hour — matches Lambda DynamoDB TTL

async function fetchActivityIntelligence(
  activityId: string,
  tripId: string,
): Promise<ActivityIntelligence> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Not authenticated')

  const url = `${API_URL}/activity-intelligence?activityId=${activityId}&tripId=${tripId}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`intelligence fetch failed: ${res.status}`)
  return res.json()
}

export function useActivityIntelligence(
  activityId: string | null,
  tripId: string,
) {
  return useQuery({
    queryKey: ['activity-intelligence', activityId],
    queryFn: () => fetchActivityIntelligence(activityId!, tripId),
    enabled: !!activityId,
    staleTime: STALE_TIME,
  })
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/hooks/useActivityIntelligence.ts
git commit -m "feat(calendar): add useActivityIntelligence hook"
```

---

## Task 8: `ActivityIntelligencePanel` component + wire into `DetailPanel`

**Files:**
- Create: `apps/web/components/calendar/ActivityIntelligencePanel.tsx`
- Modify: `apps/web/components/calendar/DetailPanel.tsx`

- [ ] **Step 1: Write `ActivityIntelligencePanel`**

```tsx
// apps/web/components/calendar/ActivityIntelligencePanel.tsx
'use client'
import { useState } from 'react'
import { MapPin, Clock, Cloud, Wallet, NavArrowDown, NavArrowRight } from 'iconoir-react'
import { useActivityIntelligence } from './hooks/useActivityIntelligence'
import { getWmoWeather } from './utils/wmoWeatherCode'
import type { CalendarActivity } from './types'

interface Props {
  activity: CalendarActivity
  tripId: string
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-t border-gray-100 dark:border-[#1e3a5f]/30">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-[#7a9cc0] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 transition-colors"
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {open ? <NavArrowDown className="w-3 h-3" /> : <NavArrowRight className="w-3 h-3" />}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  )
}

export function ActivityIntelligencePanel({ activity, tripId }: Props) {
  const { data, isLoading, error } = useActivityIntelligence(activity.id, tripId)

  if (isLoading) {
    return (
      <div className="px-4 py-3 text-xs text-gray-400 dark:text-[#4a7ab5] animate-pulse">
        Loading place info…
      </div>
    )
  }

  if (error || !data) return null

  const weather = data.weather
  const wmo = getWmoWeather(weather?.weatherCode ?? null)

  return (
    <div className="flex flex-col">
      {/* Place Info */}
      <Section icon={<MapPin className="w-3.5 h-3.5" />} title="Place Info">
        {data.place.photos[0] && (
          <img
            src={data.place.photos[0]}
            alt={data.place.name}
            className="w-full h-28 object-cover rounded-lg mb-2"
          />
        )}
        <div className="space-y-0.5 text-xs text-gray-600 dark:text-[#cdd9e5]">
          {data.place.rating && (
            <div className="flex items-center gap-1">
              <span className="text-amber-500">★</span>
              <span>{data.place.rating.toFixed(1)}</span>
              {data.place.priceTier && <span className="ml-1 text-gray-400">{data.place.priceTier}</span>}
            </div>
          )}
          {data.place.address && <div className="text-gray-500 dark:text-[#7a9cc0]">{data.place.address}</div>}
          {data.place.openingHours && (
            <div className="mt-1 space-y-0.5">
              {data.place.openingHours.map((h) => (
                <div key={h.day} className="flex justify-between text-[11px]">
                  <span className="font-medium">{h.day.slice(0, 3)}</span>
                  <span>{h.opens}–{h.closes}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Logistics */}
      <Section icon={<Clock className="w-3.5 h-3.5" />} title="Getting There">
        <p className="text-xs text-gray-600 dark:text-[#cdd9e5]">
          {data.logistics.travelTimeMinutes !== null
            ? <>~{data.logistics.travelTimeMinutes} min drive from <span className="font-medium">{data.logistics.previousActivityName}</span> ({data.logistics.distanceKm?.toFixed(1)} km)</>
            : 'First activity of the day'}
        </p>
        {data.conflicts.travelTime && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">⚠ Not enough travel time</p>
        )}
      </Section>

      {/* Weather */}
      {weather && (
        <Section icon={<Cloud className="w-3.5 h-3.5" />} title="Weather">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-[#cdd9e5]">
            <span className="text-lg">{wmo.icon}</span>
            <div>
              <div className="font-medium">{wmo.label}</div>
              {weather.tempMaxC !== null && <div className="text-gray-400">{Math.round(weather.tempMaxC)}°C high · {weather.precipitationMm?.toFixed(1) ?? 0} mm rain</div>}
            </div>
          </div>
        </Section>
      )}

      {/* Budget Impact */}
      <Section icon={<Wallet className="w-3.5 h-3.5" />} title="Budget">
        <p className="text-xs text-gray-600 dark:text-[#cdd9e5]">
          {activity.price !== undefined && activity.price !== null
            ? `Estimated cost: ${activity.price} ${activity.price !== null ? (activity as any).currency ?? '' : ''}`
            : 'No cost estimate'}
        </p>
      </Section>
    </div>
  )
}
```

- [ ] **Step 2: Mount in `DetailPanel`**

In `DetailPanel.tsx`, add after the existing import block:
```ts
import { ActivityIntelligencePanel } from './ActivityIntelligencePanel'
```

Add a `tripId` prop to `DetailPanelProps`:
```ts
tripId: string
```

Inside the panel JSX (after the existing activity detail rows, before the closing `</motion.aside>`):
```tsx
<ActivityIntelligencePanel activity={activity} tripId={tripId} />
```

Update the call site in `CalendarDashboard.tsx` to pass `tripId={tripId}` to `DetailPanel`.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/ActivityIntelligencePanel.tsx \
        apps/web/components/calendar/DetailPanel.tsx
git commit -m "feat(calendar): add ActivityIntelligencePanel with place/logistics/weather/budget"
```

---

## Task 9: Conflict badge on `EventBlock` + background prefetch in `CalendarDashboard`

`EventBlock` reads conflict state from the React Query cache (already populated by prefetch) without triggering a new fetch.

**Files:**
- Modify: `apps/web/components/calendar/EventBlock.tsx`
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Add conflict badge to `EventBlock`**

In `EventBlock.tsx`, add near the top:
```ts
import { useQueryClient } from '@tanstack/react-query'
import type { ActivityIntelligence } from './hooks/useActivityIntelligence'
```

Inside the `EventBlock` function body, before the return:
```ts
const queryClient = useQueryClient()
const intel = queryClient.getQueryData<ActivityIntelligence>(['activity-intelligence', activity.id])
const hasConflict = intel ? (intel.conflicts.hours || intel.conflicts.travelTime) : false
const conflictTooltip = intel?.conflicts.hours && intel?.conflicts.travelTime
  ? 'Two scheduling issues'
  : intel?.conflicts.hours
  ? 'Opening hours conflict'
  : intel?.conflicts.travelTime
  ? 'Not enough travel time'
  : null
```

Add the badge inside the event block JSX (top-right corner):
```tsx
{hasConflict && conflictTooltip && (
  <div
    title={conflictTooltip}
    className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-1 ring-white dark:ring-[#0f1a28] z-10"
  />
)}
```

- [ ] **Step 2: Add background prefetch in `CalendarDashboard`**

In `CalendarDashboard.tsx`, add:
```ts
import { useQueryClient } from '@tanstack/react-query'
import { fetchActivityIntelligence } from './hooks/useActivityIntelligence'
```

Note: `fetchActivityIntelligence` is currently not exported from the hook file. Export it by adding `export` to the function declaration in `useActivityIntelligence.ts`.

Inside `CalendarDashboard`, after the `activities` array is populated:
```ts
const queryClient = useQueryClient()

useEffect(() => {
  if (!activities.length) return
  // Prefetch intelligence for visible week's activities (fire-and-forget)
  // NOTE: CalendarActivity.day is a zero-based day index relative to tripStartDate.
  // currentWeekOffset is the first day index of the visible week (e.g. 0, 7, 14…).
  // Confirm these semantics match the existing useCalendarNavigation hook before writing this filter.
  const visibleActivities = activities.filter(
    (a) => a.day >= currentWeekOffset && a.day < currentWeekOffset + 7,
  )
  for (const a of visibleActivities) {
    queryClient.prefetchQuery({
      queryKey: ['activity-intelligence', a.id],
      queryFn: () => fetchActivityIntelligence(a.id, tripId),
      staleTime: 60 * 60 * 1000,
    })
  }
}, [activities, currentWeekOffset, tripId, queryClient])
```

Also add cache invalidation when `moveActivity` or `updateActivity` is called. Find the existing handlers in `CalendarDashboard` that call these and add:
```ts
queryClient.invalidateQueries({ queryKey: ['activity-intelligence', activityId] })
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/EventBlock.tsx \
        apps/web/components/calendar/CalendarDashboard.tsx \
        apps/web/components/calendar/hooks/useActivityIntelligence.ts
git commit -m "feat(calendar): add conflict badges on EventBlock with background prefetch"
```

---

## Task 10: Audit write side — `useActivityMutations` (create + delete)

**Files:**
- Modify: `apps/web/components/calendar/hooks/useActivityMutations.ts`

- [ ] **Step 1: Add audit helper and update `addActivity` / `removeActivity`**

Add import at the top:
```ts
import { yMapToCalendarActivity } from './yMapToCalendarActivity'
```

Add a helper function inside the hook (above the returned callbacks):
```ts
async function insertAuditRow(
  tripId: string,
  activityId: string,
  editType: 'create' | 'delete',
  originalData: unknown,
  newData: unknown,
  userId: string,
) {
  await supabase.from('itinerary_edits').insert({
    trip_id: tripId,
    activity_id: activityId,
    edit_type: editType,
    original_data: originalData,
    new_data: newData,
    user_id: userId,
  })
  // Audit failures are non-blocking — log but don't throw
}
```

In `addActivity`, after the successful `supabase.from('activity').insert(row)` call:
```ts
await insertAuditRow(tripId, activity.id, 'create', null, activity, userId).catch(console.warn)
```

In `removeActivity`, read the snapshot **before** the `supabase.delete()` call:
```ts
const yMap = activitiesMap.get(id)
const snapshot = yMap ? yMapToCalendarActivity(id, yMap) : null

const { error } = await supabase.from('activity').delete().eq('id', id)
// ... existing error handling ...

if (snapshot) {
  await insertAuditRow(tripId, id, 'delete', snapshot, null, userId).catch(console.warn)
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/hooks/useActivityMutations.ts
git commit -m "feat(calendar): add audit log writes for create/delete in useActivityMutations"
```

---

## Task 11: Audit write side — `useYjsSync` (move + edit with `beforeSnapshotRef`)

The `observeDeep` callback fires after a Yjs transaction. Yjs `Y.YMapEvent` provides `event.changes.keys` — a `Map<string, { action, oldValue }>` — for the changed fields. We use `oldValue` entries to reconstruct the before-state before the flush upsert.

**Files:**
- Modify: `apps/web/components/calendar/hooks/useYjsSync.ts`

- [ ] **Step 1: Add `beforeSnapshotRef` and update observer**

Add after the existing `dirtyRef` declaration:
```ts
const beforeSnapshotRef = useRef<Map<string, Partial<CalendarActivity>>>(new Map())
```

In the `observer` callback, inside the `if (!isRemote)` block, after the `dirtyRef.current.add(key)` calls, add before-state capture:

```ts
// Capture before-state from Yjs change events (first-write-wins per flush window)
for (const event of events) {
  if (event.target instanceof Y.Map && event instanceof Y.YMapEvent) {
    // Find the activity ID for this nested map
    activitiesMap.forEach((yMap, key) => {
      if (yMap === event.target) {
        if (!beforeSnapshotRef.current.has(key)) {
          // Reconstruct before-state from oldValue entries
          const before: Record<string, unknown> = {}
          event.changes.keys.forEach(({ oldValue }, field) => {
            before[field] = oldValue
          })
          beforeSnapshotRef.current.set(key, before as Partial<CalendarActivity>)
        }
      }
    })
  }
}
```

- [ ] **Step 2: Update `flush` to write audit rows after upsert**

In the `flush` callback, after the `supabase.from('activity').upsert(rows)` call succeeds (inside the `if (!upsertError)` branch or add an `else` — insert only on success):

```ts
if (!upsertError) {
  // Write audit rows for each flushed activity
  const auditRows = ids
    .map((id) => {
      const yMap = activitiesMap.get(id)
      if (!yMap) return null
      const after = yMapToCalendarActivity(id, yMap)
      const before = beforeSnapshotRef.current.get(id) ?? {}
      beforeSnapshotRef.current.delete(id)

      // Determine edit_type: if day/startHour changed → move, else → edit
      const isMoveFields = ['day', 'endDay', 'startHour']
      const changedKeys = Object.keys(before)
      const isMove = changedKeys.some((k) => isMoveFields.includes(k))

      return {
        trip_id: tripIdRef.current,
        activity_id: id,
        edit_type: isMove ? 'move' : 'edit',
        original_data: before,
        new_data: isMove
          ? { day: after.day, endDay: after.endDay, startHour: after.startHour }
          : after,
        user_id: userIdRef.current,
      }
    })
    .filter(Boolean)

  if (auditRows.length > 0) {
    supabase.from('itinerary_edits').insert(auditRows).then(({ error }) => {
      if (error) console.warn('[useYjsSync] audit insert error:', error.message)
    })
  }
}
```

Also import `yMapToCalendarActivity` at the top:
```ts
import { yMapToCalendarActivity, CALENDAR_ACTIVITY_KEYS } from './yMapToCalendarActivity'
```

And remove the now-duplicate local import of `CALENDAR_ACTIVITY_KEYS`.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/hooks/useYjsSync.ts
git commit -m "feat(calendar): add audit log writes for move/edit in useYjsSync flush"
```

---

## Task 12: `useActivityHistory` hook

**Files:**
- Create: `apps/web/components/calendar/hooks/useActivityHistory.ts`

- [ ] **Step 1: Write the hook**

```ts
// apps/web/components/calendar/hooks/useActivityHistory.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@travyl/shared'

export interface AuditEntry {
  id: string
  activity_id: string
  edit_type: 'create' | 'delete' | 'move' | 'edit' | 'revert'
  original_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  user_id: string | null
  created_at: string
  displayName: string   // merged from profiles
  activityName: string  // best-effort from new_data or original_data
}

async function fetchHistory(tripId: string): Promise<AuditEntry[]> {
  const { data: edits, error } = await supabase
    .from('itinerary_edits')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error || !edits) return []

  // Fetch display names for distinct user_ids
  const userIds = [...new Set(edits.map((e) => e.user_id).filter(Boolean))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds)

  const nameMap: Record<string, string> = {}
  for (const p of profiles ?? []) {
    nameMap[p.id] = p.display_name ?? 'Unknown'
  }

  return edits.map((e) => ({
    ...e,
    displayName: e.user_id ? (nameMap[e.user_id] ?? 'Unknown') : 'Unknown',
    activityName:
      (e.new_data as any)?.title ??
      (e.original_data as any)?.title ??
      (e.new_data as any)?.activity_name ??
      (e.original_data as any)?.activity_name ??
      'Activity',
  }))
}

export function useActivityHistory(tripId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['activity-history', tripId],
    queryFn: () => fetchHistory(tripId),
    enabled,
    staleTime: 0,
  })
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/hooks/useActivityHistory.ts
git commit -m "feat(calendar): add useActivityHistory hook"
```

---

## Task 13: `HistoryDrawer` component

Uses the CSS class toggle + `requestAnimationFrame` pattern from `SuggestionDetailDrawer` (not `motion`).

**Files:**
- Create: `apps/web/components/calendar/HistoryDrawer.tsx`

- [ ] **Step 1: Write the component**

```tsx
// apps/web/components/calendar/HistoryDrawer.tsx
'use client'
import { useEffect, useState } from 'react'
import { Xmark, Undo } from 'iconoir-react'
import { useQueryClient } from '@tanstack/react-query'
import { useActivityHistory, type AuditEntry } from './hooks/useActivityHistory'
import { formatDistanceToNow } from 'date-fns'
import type { CalendarActivity } from './types'
import { toCalendarActivity } from '@travyl/shared'

interface Props {
  tripId: string
  isOpen: boolean
  onClose: () => void
  onMove: (id: string, day: number, startHour: number) => void
  onEdit: (id: string, patch: Partial<CalendarActivity>) => void
  onDelete: (id: string) => Promise<void>
  onAdd: (activity: CalendarActivity) => Promise<void>
  tripStartDate: string
  userId: string
}

function describeEntry(entry: AuditEntry): string {
  const name = entry.activityName
  switch (entry.edit_type) {
    case 'create': return `added "${name}"`
    case 'delete': return `removed "${name}"`
    case 'move': {
      const orig = entry.original_data as any
      const next = entry.new_data as any
      return `moved "${name}" · day ${orig?.day} → ${next?.day}`
    }
    case 'edit': return `edited "${name}"`
    case 'revert': return `reverted a change to "${name}"`
    default: return `changed "${name}"`
  }
}

export function HistoryDrawer({
  tripId, isOpen, onClose, onMove, onEdit, onDelete, onAdd, tripStartDate, userId,
}: Props) {
  const [isVisible, setIsVisible] = useState(false)
  const queryClient = useQueryClient()
  const { data: entries = [], isLoading } = useActivityHistory(tripId, isOpen)

  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => setIsVisible(true))
      return () => cancelAnimationFrame(raf)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  async function handleRevert(entry: AuditEntry) {
    const { supabase } = await import('@travyl/shared')
    const activityId = entry.activity_id

    switch (entry.edit_type) {
      case 'move': {
        const orig = entry.original_data as any
        onMove(activityId, orig.day, orig.startHour)
        break
      }
      case 'edit':
        onEdit(activityId, entry.original_data as Partial<CalendarActivity>)
        break
      case 'create':
        await onDelete(activityId)
        break
      case 'delete': {
        const activity = toCalendarActivity(entry.original_data as any, tripStartDate)
        await onAdd(activity)
        break
      }
    }

    // Log the revert itself
    await supabase.from('itinerary_edits').insert({
      trip_id: tripId,
      activity_id: activityId,
      edit_type: 'revert',
      original_data: entry.new_data,
      new_data: entry.original_data,
      user_id: userId,
    })

    // Refresh the history feed so the new revert entry appears immediately
    queryClient.invalidateQueries({ queryKey: ['activity-history', tripId] })
  }

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div
        className={[
          'absolute right-0 top-0 h-full w-80 bg-white dark:bg-[#0f1a28] border-l border-gray-200 dark:border-[#1e3a5f]/40 shadow-xl pointer-events-auto flex flex-col transition-transform duration-300',
          isVisible ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#1e3a5f]/30">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-[#f5efe8]">Change History</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#1e3a5f]/30">
            <Xmark className="w-4 h-4 text-gray-500 dark:text-[#7a9cc0]" />
          </button>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <p className="px-4 py-3 text-xs text-gray-400 animate-pulse">Loading history…</p>
          )}
          {!isLoading && entries.length === 0 && (
            <p className="px-4 py-6 text-xs text-center text-gray-400 dark:text-[#4a7ab5]">No changes yet</p>
          )}
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-2 px-4 py-2.5 border-b border-gray-50 dark:border-[#1e3a5f]/20 hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/10"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 dark:text-[#cdd9e5] leading-snug">
                  <span className="font-medium">{entry.displayName}</span>{' '}
                  {describeEntry(entry)}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-[#4a7ab5] mt-0.5">
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </p>
              </div>
              {entry.edit_type !== 'revert' && (
                <button
                  onClick={() => handleRevert(entry)}
                  title="Revert this change"
                  className="shrink-0 p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-[#cdd9e5] hover:bg-gray-100 dark:hover:bg-[#1e3a5f]/30"
                >
                  <Undo className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/HistoryDrawer.tsx
git commit -m "feat(calendar): add HistoryDrawer with revert support"
```

---

## Task 14: Wire `HistoryDrawer` into `TripNavbar` + `CalendarDashboard`

**Files:**
- Modify: `apps/web/components/calendar/TripNavbar.tsx`
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Add `onOpenHistory` prop to `TripNavbar`**

In `TripNavbar.tsx`, find the `TripNavbarProps` interface and add:
```ts
onOpenHistory?: () => void
```

Find the right toolbar area (next to the existing share/settings buttons) and add:
```tsx
{onOpenHistory && !isSharedView && (
  <button
    onClick={onOpenHistory}
    title="Change history"
    className="p-1.5 rounded-lg text-gray-500 dark:text-[#7a9cc0] hover:bg-gray-100 dark:hover:bg-[#1e3a5f]/30 transition-colors"
  >
    <ClockOutline className="w-4 h-4" />
  </button>
)}
```

Add to iconoir imports: `ClockOutline` (or `Clock` if already imported).

- [ ] **Step 2: Wire state and render in `CalendarDashboard`**

In `CalendarDashboard.tsx`, add:
```ts
import { HistoryDrawer } from './HistoryDrawer'
```

Add state:
```ts
const [isHistoryOpen, setIsHistoryOpen] = useState(false)
```

Pass to `TripNavbar`:
```tsx
onOpenHistory={() => setIsHistoryOpen(true)}
```

Render `HistoryDrawer` at the end of the component return, alongside the existing `ShareModal`:
```tsx
<HistoryDrawer
  tripId={tripId}
  isOpen={isHistoryOpen}
  onClose={() => setIsHistoryOpen(false)}
  onMove={moveActivity}
  onEdit={updateActivity}
  onDelete={removeActivity}
  onAdd={addActivity}
  tripStartDate={tripStartDate}
  userId={userId}
/>
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Final lint check**

```bash
npm run lint
```
Expected: no new errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/TripNavbar.tsx \
        apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat(calendar): wire HistoryDrawer into CalendarDashboard and TripNavbar"
```

---

## Done

All three features are now implemented:
- Activity enrichment panel in `DetailPanel` (place info, logistics, weather, budget)
- Conflict badges on `EventBlock` (hours mismatch, insufficient travel time)
- History drawer in `TripNavbar` with chronological audit log and per-entry revert
