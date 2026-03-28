# Book My Trip — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Book My Trip" feature that sweeps all scheduled calendar activities, auto-matches each to Viator, OpenTable, Ticketmaster, or Amadeus via affiliate APIs, and surfaces booking links in a slide-in panel — with live Realtime progress updates and per-activity status badges.

**Architecture:** A new `book.ts` Lambda handles `POST /book/match` (fans out to provider APIs in parallel, upserts results to `booking_matches` Supabase table) and `GET /book/status/:tripId` (returns stored matches). The frontend subscribes to Supabase Realtime on `booking_matches` before firing the POST, so progress updates stream live. Core routing + confidence scoring logic lives in `packages/shared` for testability; provider API clients are thin fetch wrappers in `services/lib/booking/`.

**Tech Stack:** SST v4 Ion (Lambda + API Gateway), Supabase (PostgreSQL + Realtime), Vitest, Next.js 16, React 19, Tailwind CSS v4, iconoir-react, motion/react

**Spec:** `docs/superpowers/specs/2026-03-27-book-my-trip-design.md`

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `packages/shared/src/utils/bookingMatcher.ts` | Pure routing + confidence scoring logic (testable) |
| `packages/shared/src/utils/bookingMatcher.test.ts` | Vitest unit tests |
| `services/lib/booking/types.ts` | Shared types for the booking system |
| `services/lib/booking/viator.ts` | Viator affiliate API client |
| `services/lib/booking/opentable.ts` | OpenTable affiliate API client |
| `services/lib/booking/ticketmaster.ts` | Ticketmaster Discovery API client |
| `services/lib/booking/amadeus.ts` | Amadeus Activities API client |
| `services/book.ts` | Lambda handler — POST /book/match, GET /book/status/:tripId |
| `apps/web/components/calendar/hooks/useBookingMatches.ts` | Supabase Realtime subscription + status writes |
| `apps/web/components/calendar/BookingPanel.tsx` | Slide-in drawer UI — Loading / Summary / Done states |

### Modified files
| File | Change |
|---|---|
| `infra/secrets.ts` | Add 4 new SST secrets |
| `infra/api.ts` | Add POST /book/match + GET /book/status/:tripId routes |
| `apps/web/components/calendar/CalendarToolbar.tsx` | Add "Book My Trip" + "View Bookings" buttons + new props |
| `apps/web/components/calendar/EventBlock.tsx` | Add `bookingStatus` prop + status badge |
| `apps/web/components/calendar/CalendarDashboard.tsx` | Wire up booking hooks, panel, toolbar props |

---

## Chunk 1: Infrastructure

### Task 1: Supabase migration — booking_matches table

**Files:**
- Create: migration via Supabase MCP

- [ ] **Step 1: Apply the migration**

Run this via Supabase MCP `apply_migration` with name `add_booking_matches`:

```sql
create table booking_matches (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  activity_id text not null,
  provider text,
  matched_name text,
  booking_url text,
  affiliate_url text,
  confidence float,
  status text not null default 'unmatched',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_matches_trip_activity_key unique (trip_id, activity_id)
);

create or replace function set_booking_matches_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger booking_matches_updated_at
  before update on booking_matches
  for each row execute function set_booking_matches_updated_at();

alter table booking_matches enable row level security;

create policy "booking_matches_select"
  on booking_matches for select
  using (
    trip_id in (
      select id from trips where user_id = auth.uid()
      union
      select trip_id from trip_collaborators where user_id = auth.uid() and invite_status = 'accepted'
    )
  );

create policy "booking_matches_update_opened"
  on booking_matches for update
  using (
    trip_id in (
      select id from trips where user_id = auth.uid()
      union
      select trip_id from trip_collaborators where user_id = auth.uid() and invite_status = 'accepted'
    )
  )
  with check (status = 'opened');
```

- [ ] **Step 2: Enable Realtime on booking_matches**

Run via Supabase MCP `execute_sql`:

```sql
alter publication supabase_realtime add table booking_matches;
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add booking_matches Supabase migration"
```

---

### Task 2: SST secrets + API routes

**Files:**
- Modify: `infra/secrets.ts`
- Modify: `infra/api.ts`

- [ ] **Step 1: Add secrets to `infra/secrets.ts`**

Append to the end of `infra/secrets.ts`:

```ts
// ─── Booking / Affiliate ────────────────────────────────────
export const viatorAffiliateKey = new sst.Secret('ViatorAffiliateKey')
export const openTableAffiliateKey = new sst.Secret('OpenTableAffiliateKey')
export const ticketmasterApiKey = new sst.Secret('TicketmasterApiKey')
export const amadeusApiKey = new sst.Secret('AmadeusApiKey')
export const amadeusApiSecret = new sst.Secret('AmadeusApiSecret')
```

- [ ] **Step 2: Add routes to `infra/api.ts`**

First add the import at the top of `infra/api.ts` (alongside existing secret imports):

```ts
import { viatorAffiliateKey, openTableAffiliateKey, ticketmasterApiKey, amadeusApiKey, amadeusApiSecret } from './secrets'
```

Then append two routes at the end of `infra/api.ts`:

```ts
api.route('POST /book/match', {
  handler: 'services/book.handler',
  link: [supabaseSecretKey, supabaseUrl, viatorAffiliateKey, openTableAffiliateKey, ticketmasterApiKey, amadeusApiKey, amadeusApiSecret],
  timeout: '30 seconds',
})

api.route('GET /book/status/{tripId}', {
  handler: 'services/book.statusHandler',
  link: [supabaseSecretKey, supabaseUrl],
  timeout: '10 seconds',
})
```

- [ ] **Step 3: Set placeholder secret values (dev only)**

```bash
AWS_PROFILE=525610233002_AdministratorAccess npx sst secret set ViatorAffiliateKey placeholder --stage production
AWS_PROFILE=525610233002_AdministratorAccess npx sst secret set OpenTableAffiliateKey placeholder --stage production
AWS_PROFILE=525610233002_AdministratorAccess npx sst secret set TicketmasterApiKey placeholder --stage production
AWS_PROFILE=525610233002_AdministratorAccess npx sst secret set AmadeusApiKey placeholder --stage production
AWS_PROFILE=525610233002_AdministratorAccess npx sst secret set AmadeusApiSecret placeholder --stage production
```

- [ ] **Step 4: Commit**

```bash
git add infra/secrets.ts infra/api.ts
git commit -m "feat: add booking SST secrets and API routes"
```

---

## Chunk 2: Business logic (matcher + providers)

### Task 3: Booking matcher utility + tests

**Files:**
- Create: `packages/shared/src/utils/bookingMatcher.ts`
- Create: `packages/shared/src/utils/bookingMatcher.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `packages/shared/src/utils/bookingMatcher.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { routeProvider, nameSimScore, proximityScore, calculateConfidence } from './bookingMatcher'

describe('routeProvider', () => {
  it('routes dining to opentable', () => {
    expect(routeProvider('dining')).toBe('opentable')
  })
  it('routes sightseeing to viator', () => {
    expect(routeProvider('sightseeing')).toBe('viator')
  })
  it('routes tour to viator', () => {
    expect(routeProvider('tour')).toBe('viator')
  })
  it('routes museum to viator', () => {
    expect(routeProvider('museum')).toBe('viator')
  })
  it('routes cultural to viator', () => {
    expect(routeProvider('cultural')).toBe('viator')
  })
  it('routes outdoor to viator', () => {
    expect(routeProvider('outdoor')).toBe('viator')
  })
  it('routes event to ticketmaster', () => {
    expect(routeProvider('event')).toBe('ticketmaster')
  })
  it('routes concert to ticketmaster', () => {
    expect(routeProvider('concert')).toBe('ticketmaster')
  })
  it('routes show to ticketmaster', () => {
    expect(routeProvider('show')).toBe('ticketmaster')
  })
  it('routes nightlife to ticketmaster', () => {
    expect(routeProvider('nightlife')).toBe('ticketmaster')
  })
  it('routes entertainment to ticketmaster', () => {
    expect(routeProvider('entertainment')).toBe('ticketmaster')
  })
  it('routes unknown types to amadeus', () => {
    expect(routeProvider('shopping')).toBe('amadeus')
    expect(routeProvider('unknown')).toBe('amadeus')
    expect(routeProvider('')).toBe('amadeus')
  })
  it('is case-insensitive', () => {
    expect(routeProvider('Dining')).toBe('opentable')
    expect(routeProvider('TOUR')).toBe('viator')
  })
})

describe('nameSimScore', () => {
  it('returns 1 for identical strings', () => {
    expect(nameSimScore('Eiffel Tower', 'Eiffel Tower')).toBe(1)
  })
  it('returns 1 for identical strings case-insensitively', () => {
    expect(nameSimScore('eiffel tower', 'Eiffel Tower')).toBe(1)
  })
  it('returns 0 for completely different strings', () => {
    expect(nameSimScore('abc', 'xyz')).toBe(0)
  })
  it('returns value between 0 and 1 for similar strings', () => {
    const score = nameSimScore('Eiffel Tower', 'Eiffel Tower Restaurant')
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1)
  })
  it('handles empty strings without throwing', () => {
    expect(() => nameSimScore('', '')).not.toThrow()
    expect(() => nameSimScore('abc', '')).not.toThrow()
  })
})

describe('proximityScore', () => {
  it('returns 1 for same location', () => {
    expect(proximityScore(48.8584, 2.2945, 48.8584, 2.2945)).toBe(1)
  })
  it('returns 1 for distance <= 100m', () => {
    // ~50m north
    expect(proximityScore(48.8584, 2.2945, 48.8589, 2.2945)).toBe(1)
  })
  it('returns 0 for distance >= 500m', () => {
    // ~1km away
    expect(proximityScore(48.8584, 2.2945, 48.8674, 2.2945)).toBe(0)
  })
  it('returns value between 0 and 1 for 100-500m range', () => {
    // ~300m away
    const score = proximityScore(48.8584, 2.2945, 48.8611, 2.2945)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1)
  })
})

describe('calculateConfidence', () => {
  it('returns 1 for perfect name and proximity', () => {
    expect(calculateConfidence(1, 1)).toBe(1)
  })
  it('returns 0 for no name match and no proximity', () => {
    expect(calculateConfidence(0, 0)).toBe(0)
  })
  it('weights name 70% and proximity 30%', () => {
    expect(calculateConfidence(1, 0)).toBeCloseTo(0.7)
    expect(calculateConfidence(0, 1)).toBeCloseTo(0.3)
  })
  it('reaches 0.6 threshold with good name match and moderate proximity', () => {
    // nameSim=0.8, proxScore=0.2 → 0.7*0.8 + 0.3*0.2 = 0.56 + 0.06 = 0.62
    expect(calculateConfidence(0.8, 0.2)).toBeGreaterThanOrEqual(0.6)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd packages/shared && npm test -- --run bookingMatcher
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement `bookingMatcher.ts`**

Create `packages/shared/src/utils/bookingMatcher.ts`:

```ts
// ─── Provider routing ─────────────────────────────────────────

const PROVIDER_MAP: Record<string, string> = {
  tour: 'viator',
  sightseeing: 'viator',
  museum: 'viator',
  cultural: 'viator',
  outdoor: 'viator',
  dining: 'opentable',
  event: 'ticketmaster',
  concert: 'ticketmaster',
  show: 'ticketmaster',
  nightlife: 'ticketmaster',
  entertainment: 'ticketmaster',
}

/** Returns the booking provider name for a given activity type. */
export function routeProvider(activityType: string): string {
  return PROVIDER_MAP[activityType.toLowerCase()] ?? 'amadeus'
}

// ─── Name similarity (normalized Levenshtein) ─────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/** Normalized name similarity score 0–1 (case-insensitive). */
export function nameSimScore(a: string, b: string): number {
  const na = a.toLowerCase().trim()
  const nb = b.toLowerCase().trim()
  if (na === nb) return 1
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(na, nb) / maxLen
}

// ─── Proximity scoring ────────────────────────────────────────

const MIN_DISTANCE_M = 100
const MAX_DISTANCE_M = 500

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Proximity score 0–1. 1.0 if ≤100m, 0.0 if ≥500m, linear between. */
export function proximityScore(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const d = haversineMeters(lat1, lon1, lat2, lon2)
  if (d <= MIN_DISTANCE_M) return 1
  if (d >= MAX_DISTANCE_M) return 0
  return 1 - (d - MIN_DISTANCE_M) / (MAX_DISTANCE_M - MIN_DISTANCE_M)
}

// ─── Combined confidence ─────────────────────────────────────

/** Combined confidence = 0.7 × nameSim + 0.3 × proximity */
export function calculateConfidence(nameSim: number, proxScore: number): number {
  return 0.7 * nameSim + 0.3 * proxScore
}
```

- [ ] **Step 4: Export from `packages/shared/src/utils/index.ts`**

Append to the end of `packages/shared/src/utils/index.ts`:

```ts
// Booking matcher utilities
export { routeProvider, nameSimScore, proximityScore, calculateConfidence } from './bookingMatcher'
```

These are now available as `import { routeProvider, ... } from '@travyl/shared'`.

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/shared && npm test -- --run bookingMatcher
```

Expected: all 26 tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/utils/bookingMatcher.ts packages/shared/src/utils/bookingMatcher.test.ts packages/shared/src/utils/index.ts
git commit -m "feat: add booking matcher utility with routing and confidence scoring"
```

---

### Task 4: Provider API clients

**Files:**
- Create: `services/lib/booking/types.ts`
- Create: `services/lib/booking/viator.ts`
- Create: `services/lib/booking/opentable.ts`
- Create: `services/lib/booking/ticketmaster.ts`
- Create: `services/lib/booking/amadeus.ts`

- [ ] **Step 1: Create shared types**

Create `services/lib/booking/types.ts`:

```ts
export interface BookingActivity {
  id: string
  title: string
  type: string
  latitude: number
  longitude: number
  /** ISO date string for the activity's scheduled day — used by Ticketmaster date matching */
  scheduledDate?: string
}

export interface ProviderMatch {
  provider: string
  matchedName: string
  bookingUrl: string
  affiliateUrl: string
  /** Lat/lng of matched venue — used to compute proximity score */
  lat: number
  lng: number
}
```

- [ ] **Step 2: Create Viator client**

Create `services/lib/booking/viator.ts`:

```ts
import { Resource } from 'sst'
import type { BookingActivity, ProviderMatch } from './types'

const BASE_URL = 'https://api.viator.com/partner'
const AFFILIATE_BASE = 'https://www.viator.com'

interface ViatorProduct {
  productCode: string
  title: string
  webURL: string
  destinations?: Array<{ ref: string }>
}

export async function searchViator(
  activity: BookingActivity,
): Promise<ProviderMatch | null> {
  const apiKey = Resource.ViatorAffiliateKey.value
  if (!apiKey || apiKey === 'placeholder') return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(`${BASE_URL}/products/search`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'exp-api-key': apiKey,
        'Accept-Language': 'en-US',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filtering: {
          destination: '',
          searchTerm: activity.title,
          lowestPrice: 0,
          highestPrice: 999999,
          startDate: '',
          endDate: '',
          includeAutomaticTranslations: false,
          confirmationType: 'ALL',
          durationInMinutes: { from: 0, to: 99999 },
          rating: { from: 0, to: 5 },
        },
        sorting: { sort: 'RELEVANCE', order: 'DESCENDING' },
        pagination: { start: 1, count: 1 },
        currency: 'USD',
      }),
    })
    clearTimeout(timeout)

    if (!res.ok) return null
    const data = await res.json()
    const product: ViatorProduct | undefined = data.products?.[0]
    if (!product) return null

    const affiliateUrl = `${AFFILIATE_BASE}${product.webURL}${product.webURL.includes('?') ? '&' : '?'}mcid=${apiKey}`

    // Viator doesn't return lat/lng in search — use activity coords for proximity (same city assumed)
    return {
      provider: 'viator',
      matchedName: product.title,
      bookingUrl: `${AFFILIATE_BASE}${product.webURL}`,
      affiliateUrl,
      lat: activity.latitude,
      lng: activity.longitude,
    }
  } catch {
    clearTimeout(timeout)
    return null
  }
}
```

- [ ] **Step 3: Create OpenTable client**

Create `services/lib/booking/opentable.ts`:

```ts
import { Resource } from 'sst'
import type { BookingActivity, ProviderMatch } from './types'

const BASE_URL = 'https://platform.otgw.ot.tools/restaurants/v1'
const AFFILIATE_BASE = 'https://www.opentable.com'

interface OTRestaurant {
  restaurantId: number
  name: string
  latitude: number
  longitude: number
  profileLink: string
}

export async function searchOpenTable(
  activity: BookingActivity,
): Promise<ProviderMatch | null> {
  const apiKey = Resource.OpenTableAffiliateKey.value
  if (!apiKey || apiKey === 'placeholder') return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const params = new URLSearchParams({
      latitude: String(activity.latitude),
      longitude: String(activity.longitude),
      radius: '1',
      name: activity.title,
    })
    const res = await fetch(`${BASE_URL}?${params}`, {
      signal: controller.signal,
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    clearTimeout(timeout)

    if (!res.ok) return null
    const data = await res.json()
    const restaurant: OTRestaurant | undefined = data.restaurants?.[0]
    if (!restaurant) return null

    const bookingUrl = `${AFFILIATE_BASE}${restaurant.profileLink}`
    const affiliateUrl = `${bookingUrl}${bookingUrl.includes('?') ? '&' : '?'}ref=travyl`

    return {
      provider: 'opentable',
      matchedName: restaurant.name,
      bookingUrl,
      affiliateUrl,
      lat: restaurant.latitude,
      lng: restaurant.longitude,
    }
  } catch {
    clearTimeout(timeout)
    return null
  }
}
```

- [ ] **Step 4: Create Ticketmaster client**

Create `services/lib/booking/ticketmaster.ts`:

```ts
import { Resource } from 'sst'
import type { BookingActivity, ProviderMatch } from './types'

const BASE_URL = 'https://app.ticketmaster.com/discovery/v2'

interface TMEvent {
  name: string
  url: string
  _embedded?: {
    venues?: Array<{ location?: { latitude: string; longitude: string } }>
  }
}

export async function searchTicketmaster(
  activity: BookingActivity,
): Promise<ProviderMatch | null> {
  const apiKey = Resource.TicketmasterApiKey.value
  if (!apiKey || apiKey === 'placeholder') return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      keyword: activity.title,
      latlong: `${activity.latitude},${activity.longitude}`,
      radius: '25',
      unit: 'miles',
      size: '1',
      sort: 'relevance,desc',
    })
    // If the activity has a scheduled date, filter events around that date
    if (activity.scheduledDate) {
      const d = new Date(activity.scheduledDate)
      const start = d.toISOString().split('.')[0] + 'Z'
      const end = new Date(d.getTime() + 86400000).toISOString().split('.')[0] + 'Z'
      params.set('startDateTime', start)
      params.set('endDateTime', end)
    }

    const res = await fetch(`${BASE_URL}/events.json?${params}`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return null
    const data = await res.json()
    const event: TMEvent | undefined = data._embedded?.events?.[0]
    if (!event) return null

    const venue = event._embedded?.venues?.[0]
    const lat = parseFloat(venue?.location?.latitude ?? String(activity.latitude))
    const lng = parseFloat(venue?.location?.longitude ?? String(activity.longitude))

    const affiliateUrl = `${event.url}${event.url.includes('?') ? '&' : '?'}utm_source=travyl`

    return {
      provider: 'ticketmaster',
      matchedName: event.name,
      bookingUrl: event.url,
      affiliateUrl,
      lat,
      lng,
    }
  } catch {
    clearTimeout(timeout)
    return null
  }
}
```

- [ ] **Step 5: Create Amadeus client**

Create `services/lib/booking/amadeus.ts`:

```ts
import { Resource } from 'sst'
import type { BookingActivity, ProviderMatch } from './types'

const AUTH_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token'
const BASE_URL = 'https://test.api.amadeus.com/v1'

interface AmadeusActivity {
  name: string
  bookingLink?: string
  geoCode?: { latitude: number; longitude: number }
}

async function getAmadeusToken(): Promise<string | null> {
  const id = Resource.AmadeusApiKey.value
  const secret = Resource.AmadeusApiSecret.value
  if (!id || id === 'placeholder') return null

  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${id}&client_secret=${secret}`,
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token ?? null
}

export async function searchAmadeus(
  activity: BookingActivity,
): Promise<ProviderMatch | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const token = await getAmadeusToken()
    if (!token) return null

    const params = new URLSearchParams({
      latitude: String(activity.latitude),
      longitude: String(activity.longitude),
      radius: '1',
    })
    const res = await fetch(`${BASE_URL}/shopping/activities?${params}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    })
    clearTimeout(timeout)

    if (!res.ok) return null
    const data = await res.json()
    const items: AmadeusActivity[] = data.data ?? []

    // Find best name match from first 5 results
    const { nameSimScore } = await import('@travyl/shared')
    const scored = items.slice(0, 5).map((item) => ({
      item,
      sim: nameSimScore(activity.title, item.name),
    }))
    const best = scored.sort((a, b) => b.sim - a.sim)[0]
    if (!best || !best.item.bookingLink) return null

    const affiliateUrl = `${best.item.bookingLink}${best.item.bookingLink.includes('?') ? '&' : '?'}utm_source=travyl`

    return {
      provider: 'amadeus',
      matchedName: best.item.name,
      bookingUrl: best.item.bookingLink,
      affiliateUrl,
      lat: best.item.geoCode?.latitude ?? activity.latitude,
      lng: best.item.geoCode?.longitude ?? activity.longitude,
    }
  } catch {
    clearTimeout(timeout)
    return null
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add services/lib/booking/
git commit -m "feat: add booking provider API clients (Viator, OpenTable, Ticketmaster, Amadeus)"
```

---

## Chunk 3: Lambda handler

### Task 5: book.ts Lambda

**Files:**
- Create: `services/book.ts`

- [ ] **Step 1: Create the handler**

Create `services/book.ts`:

```ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { createClient } from '@supabase/supabase-js'
import { validateAuth } from './lib/auth'
import { routeProvider, nameSimScore, proximityScore, calculateConfidence } from '@travyl/shared'
import { searchViator } from './lib/booking/viator'
import { searchOpenTable } from './lib/booking/opentable'
import { searchTicketmaster } from './lib/booking/ticketmaster'
import { searchAmadeus } from './lib/booking/amadeus'
import type { BookingActivity } from './lib/booking/types'

const CONFIDENCE_THRESHOLD = 0.6

function getSupabaseAdmin() {
  return createClient(Resource.SupabaseUrl.value, Resource.SupabaseSecretKey.value)
}

async function matchActivity(activity: BookingActivity) {
  const provider = routeProvider(activity.type)

  let match = null
  try {
    if (provider === 'viator') match = await searchViator(activity)
    else if (provider === 'opentable') match = await searchOpenTable(activity)
    else if (provider === 'ticketmaster') match = await searchTicketmaster(activity)
    else match = await searchAmadeus(activity)
  } catch {
    // provider threw — treat as unmatched
  }

  if (!match) {
    return {
      activityId: activity.id,
      provider: null,
      matchedName: null,
      bookingUrl: null,
      affiliateUrl: null,
      confidence: null,
      status: 'unmatched' as const,
    }
  }

  const nameSim = nameSimScore(activity.title, match.matchedName)
  const proxScore = proximityScore(activity.latitude, activity.longitude, match.lat, match.lng)
  const confidence = calculateConfidence(nameSim, proxScore)

  if (confidence < CONFIDENCE_THRESHOLD) {
    return {
      activityId: activity.id,
      provider: null,
      matchedName: null,
      bookingUrl: null,
      affiliateUrl: null,
      confidence,
      status: 'unmatched' as const,
    }
  }

  return {
    activityId: activity.id,
    provider: match.provider,
    matchedName: match.matchedName,
    bookingUrl: match.bookingUrl,
    affiliateUrl: match.affiliateUrl,
    confidence,
    status: 'matched' as const,
  }
}

// ─── POST /book/match ─────────────────────────────────────────

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers?.authorization)
  } catch {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  let body: { tripId?: string; activities?: BookingActivity[] }
  try {
    body = JSON.parse(event.body ?? '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { tripId, activities } = body
  if (!tripId || !Array.isArray(activities) || activities.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'tripId and activities required' }) }
  }

  const supabase = getSupabaseAdmin()

  // Filter to activities with coordinates; mark the rest unmatched directly
  const withCoords = activities.filter((a) => a.latitude != null && a.longitude != null)
  const withoutCoords = activities.filter((a) => a.latitude == null || a.longitude == null)

  // Upsert uncoordinated activities as unmatched immediately
  if (withoutCoords.length > 0) {
    await supabase.from('booking_matches').upsert(
      withoutCoords.map((a) => ({
        trip_id: tripId,
        activity_id: a.id,
        provider: null,
        matched_name: null,
        booking_url: null,
        affiliate_url: null,
        confidence: null,
        status: 'unmatched',
      })),
      { onConflict: 'trip_id,activity_id' },
    )
  }

  // Fan out provider searches in parallel
  const results = await Promise.allSettled(withCoords.map(matchActivity))

  const matches = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          activityId: withCoords[i].id,
          provider: null,
          matchedName: null,
          bookingUrl: null,
          affiliateUrl: null,
          confidence: null,
          status: 'unmatched' as const,
        },
  )

  // Upsert all matches to Supabase (triggers Realtime events to client)
  await supabase.from('booking_matches').upsert(
    matches.map((m) => ({
      trip_id: tripId,
      activity_id: m.activityId,
      provider: m.provider,
      matched_name: m.matchedName,
      booking_url: m.bookingUrl,
      affiliate_url: m.affiliateUrl,
      confidence: m.confidence,
      status: m.status,
    })),
    { onConflict: 'trip_id,activity_id' },
  )

  const allMatches = [
    ...withoutCoords.map((a) => ({
      activityId: a.id,
      status: 'unmatched' as const,
      provider: undefined,
      matchedName: undefined,
      affiliateUrl: undefined,
      confidence: undefined,
    })),
    ...matches.map((m) => ({
      activityId: m.activityId,
      status: m.status,
      provider: m.provider ?? undefined,
      matchedName: m.matchedName ?? undefined,
      affiliateUrl: m.affiliateUrl ?? undefined,
      confidence: m.confidence ?? undefined,
    })),
  ]

  return {
    statusCode: 200,
    body: JSON.stringify({ total: activities.length, matches: allMatches }),
  }
}

// ─── GET /book/status/{tripId} ────────────────────────────────

export const statusHandler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers?.authorization)
  } catch {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const tripId = event.pathParameters?.tripId
  if (!tripId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'tripId required' }) }
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('booking_matches')
    .select('activity_id, provider, matched_name, booking_url, affiliate_url, confidence, status, updated_at')
    .eq('trip_id', tripId)

  if (error) {
    console.error('[book/status] supabase error:', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }

  const matches = (data ?? []).map((row) => ({
    activityId: row.activity_id,
    status: row.status,
    provider: row.provider ?? undefined,
    matchedName: row.matched_name ?? undefined,
    bookingUrl: row.booking_url ?? undefined,
    affiliateUrl: row.affiliate_url ?? undefined,
    confidence: row.confidence ?? undefined,
    updatedAt: row.updated_at,
  }))

  return {
    statusCode: 200,
    body: JSON.stringify({ matches }),
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors in `services/book.ts` or related files

- [ ] **Step 3: Commit**

```bash
git add services/book.ts
git commit -m "feat: add book Lambda handler for POST /book/match and GET /book/status"
```

---

## Chunk 4: Frontend hooks

### Task 6: useBookingMatches hook

**Files:**
- Create: `apps/web/components/calendar/hooks/useBookingMatches.ts`

This hook manages three concerns:
1. Fetching prior match state on mount (via `GET /book/status`)
2. Subscribing to Supabase Realtime for live updates
3. Marking activities as `opened` in the DB

- [ ] **Step 1: Create the hook**

Create `apps/web/components/calendar/hooks/useBookingMatches.ts`:

```ts
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

export type BookingStatus = 'unmatched' | 'matched' | 'opened'

export interface BookingMatch {
  activityId: string
  status: BookingStatus
  provider?: string
  matchedName?: string
  bookingUrl?: string
  affiliateUrl?: string
  confidence?: number
  updatedAt?: string
}

interface UseBookingMatchesOptions {
  tripId: string
  apiUrl: string
  authToken: string
}

interface UseBookingMatchesReturn {
  matches: Map<string, BookingMatch>
  hasMatches: boolean
  fetchStatus: () => Promise<void>
  startRealtimeAndMatch: (activities: Array<{
    id: string; title: string; type: string
    latitude: number | null; longitude: number | null
  }>) => Promise<{ total: number; matches: BookingMatch[] }>
  markOpened: (activityIds: string[]) => Promise<void>
}

export function useBookingMatches({
  tripId,
  apiUrl,
  authToken,
}: UseBookingMatchesOptions): UseBookingMatchesReturn {
  const [matches, setMatches] = useState<Map<string, BookingMatch>>(new Map())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)

  const applyRows = useCallback((rows: BookingMatch[]) => {
    setMatches((prev) => {
      const next = new Map(prev)
      for (const row of rows) next.set(row.activityId, row)
      return next
    })
  }, [])

  // Subscribe to Realtime updates for this trip
  const subscribeRealtime = useCallback(() => {
    const supabase = getSupabaseBrowser()
    if (channelRef.current) return // already subscribed

    const channel = supabase
      .channel(`booking_matches:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_matches',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const row = payload.new as any
          if (!row?.activity_id) return
          applyRows([{
            activityId: row.activity_id,
            status: row.status,
            provider: row.provider ?? undefined,
            matchedName: row.matched_name ?? undefined,
            bookingUrl: row.booking_url ?? undefined,
            affiliateUrl: row.affiliate_url ?? undefined,
            confidence: row.confidence ?? undefined,
            updatedAt: row.updated_at,
          }])
        },
      )
      .subscribe()
    channelRef.current = channel
  }, [tripId, applyRows])

  // Fetch current status from Lambda
  const fetchStatus = useCallback(async () => {
    const res = await fetch(`${apiUrl}/book/status/${tripId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    if (!res.ok) return
    const data = await res.json()
    applyRows(data.matches ?? [])
  }, [tripId, apiUrl, authToken, applyRows])

  // Subscribe Realtime first, then fire POST /book/match
  const startRealtimeAndMatch = useCallback(async (activities: Array<{
    id: string; title: string; type: string
    latitude: number | null; longitude: number | null
  }>) => {
    subscribeRealtime()

    const res = await fetch(`${apiUrl}/book/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ tripId, activities }),
    })
    if (!res.ok) throw new Error('match request failed')
    const data = await res.json()
    return data as { total: number; matches: BookingMatch[] }
  }, [tripId, apiUrl, authToken, subscribeRealtime])

  // Mark activities as opened in Supabase (client-side update, constrained by RLS to 'opened' only)
  const markOpened = useCallback(async (activityIds: string[]) => {
    const supabase = getSupabaseBrowser()
    for (const activityId of activityIds) {
      await supabase
        .from('booking_matches')
        .update({ status: 'opened' })
        .eq('trip_id', tripId)
        .eq('activity_id', activityId)
    }
    applyRows(activityIds.map((id) => {
      const existing = matches.get(id)
      return { ...(existing ?? { activityId: id, status: 'unmatched' }), status: 'opened' as BookingStatus }
    }))
  }, [tripId, matches, applyRows])

  // Fetch prior state on mount
  useEffect(() => {
    if (!tripId || !authToken) return
    fetchStatus()
    return () => {
      // Unsubscribe on unmount
      if (channelRef.current) {
        getSupabaseBrowser().removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

  const hasMatches = matches.size > 0

  return { matches, hasMatches, fetchStatus, startRealtimeAndMatch, markOpened }
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/hooks/useBookingMatches.ts
git commit -m "feat: add useBookingMatches hook with Realtime subscription and status management"
```

---

## Chunk 5: Frontend UI

### Task 7: BookingPanel component

**Files:**
- Create: `apps/web/components/calendar/BookingPanel.tsx`

Pattern: follow `HistoryDrawer.tsx` — fixed overlay, slide-in from right, `isOpen`/`isVisible` state.

- [ ] **Step 1: Create BookingPanel**

Create `apps/web/components/calendar/BookingPanel.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { Xmark, BookmarkSolid } from 'iconoir-react'
import type { BookingMatch } from './hooks/useBookingMatches'

const PROVIDER_LABELS: Record<string, string> = {
  viator: 'Viator',
  opentable: 'OpenTable',
  ticketmaster: 'Ticketmaster',
  amadeus: 'Amadeus',
}

const PROVIDER_COLORS: Record<string, string> = {
  viator: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  opentable: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ticketmaster: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  amadeus: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export type BookingPanelMode = 'loading' | 'summary' | 'done'

interface ActivityInfo {
  id: string
  title: string
}

interface BookingPanelProps {
  isOpen: boolean
  onClose: () => void
  mode: BookingPanelMode
  activities: ActivityInfo[]
  matches: Map<string, BookingMatch>
  receivedCount: number
  total: number
  onBookAll: () => void
  onBookOne: (activityId: string) => void
  failedToOpenIds: string[]
}

export function BookingPanel({
  isOpen,
  onClose,
  mode,
  activities,
  matches,
  receivedCount,
  total,
  onBookAll,
  onBookOne,
  failedToOpenIds,
}: BookingPanelProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => setIsVisible(true))
      return () => cancelAnimationFrame(raf)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const matchedActivities = activities.filter((a) => matches.get(a.id)?.status === 'matched' || matches.get(a.id)?.status === 'opened')
  const unmatchedActivities = activities.filter((a) => {
    const m = matches.get(a.id)
    return !m || m.status === 'unmatched'
  })
  const bookableCount = matchedActivities.filter((a) => matches.get(a.id)?.status === 'matched').length

  const progress = total > 0 ? Math.round((receivedCount / total) * 100) : 0

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div
        className={[
          'absolute right-0 top-0 h-full w-96 bg-white dark:bg-[#0f1a28] border-l border-gray-200 dark:border-[#1e3a5f]/40 shadow-xl pointer-events-auto flex flex-col transition-transform duration-300',
          isVisible ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#1e3a5f]/30 shrink-0">
          <div className="flex items-center gap-2">
            <BookmarkSolid className="w-4 h-4 text-[#003594] dark:text-[#4a7ab5]" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-[#f5efe8]">Book My Trip</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close booking panel"
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#1e3a5f]/30"
          >
            <Xmark className="w-4 h-4 text-gray-500 dark:text-[#7a9cc0]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Loading state */}
          {mode === 'loading' && (
            <div className="px-4 py-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-[#cdd9e5] mb-2">Matching your activities…</p>
                <div className="h-1.5 bg-gray-100 dark:bg-[#1e3a5f]/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#003594] rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 dark:text-[#4a7ab5] mt-1">{receivedCount} of {total} checked</p>
              </div>

              {/* Live rows as they arrive */}
              <div className="space-y-1">
                {activities.map((a) => {
                  const m = matches.get(a.id)
                  return (
                    <div key={a.id} className="flex items-center gap-2 py-2 border-b border-gray-50 dark:border-[#1e3a5f]/20">
                      {m ? (
                        m.status === 'matched' ? (
                          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-[#2a4a6a] shrink-0" />
                        )
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-gray-200 dark:bg-[#1e3a5f]/40 animate-pulse shrink-0" />
                      )}
                      <span className="text-xs text-gray-700 dark:text-[#cdd9e5] truncate">{a.title || 'Untitled'}</span>
                      {m?.provider && (
                        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${PROVIDER_COLORS[m.provider] ?? ''}`}>
                          {PROVIDER_LABELS[m.provider] ?? m.provider}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Summary state */}
          {(mode === 'summary' || mode === 'done') && (
            <div className="px-4 py-4 space-y-4">
              {/* Count summary */}
              <p className="text-xs text-gray-500 dark:text-[#7a9cc0]">
                <span className="font-semibold text-gray-800 dark:text-[#f5efe8]">{bookableCount}</span> of{' '}
                <span className="font-semibold text-gray-800 dark:text-[#f5efe8]">{total}</span> activities can be booked
              </p>

              {/* Ready to Book */}
              {matchedActivities.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#4a7ab5] mb-2">Ready to Book</h3>
                  <div className="space-y-1">
                    {matchedActivities.map((a) => {
                      const m = matches.get(a.id)!
                      const isOpened = m.status === 'opened'
                      const isUncertain = m.confidence !== undefined && m.confidence >= 0.6 && m.confidence < 0.75
                      return (
                        <div key={a.id} className="flex items-start gap-2 py-2 border-b border-gray-50 dark:border-[#1e3a5f]/20">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 dark:text-[#f5efe8] truncate">{a.title || 'Untitled'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {m.provider && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${PROVIDER_COLORS[m.provider] ?? ''}`}>
                                  {PROVIDER_LABELS[m.provider] ?? m.provider}
                                </span>
                              )}
                              {m.matchedName && m.matchedName !== a.title && (
                                <span className="text-[10px] text-gray-400 dark:text-[#4a7ab5] truncate">→ {m.matchedName}</span>
                              )}
                            </div>
                            {isUncertain && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                                Uncertain match — {m.matchedName}
                              </p>
                            )}
                          </div>
                          {isOpened ? (
                            <span className="text-[10px] text-green-600 dark:text-green-400 shrink-0 mt-0.5">Opened</span>
                          ) : (
                            <button
                              onClick={() => onBookOne(a.id)}
                              className="text-[11px] font-medium text-[#003594] dark:text-[#4a7ab5] hover:underline shrink-0 mt-0.5"
                            >
                              Book
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Not Available */}
              {unmatchedActivities.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#4a7ab5] mb-2">Not Available</h3>
                  <div className="space-y-1">
                    {unmatchedActivities.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 py-1.5">
                        <span className="h-2 w-2 rounded-full bg-gray-200 dark:bg-[#2a4a6a] shrink-0" />
                        <span className="text-xs text-gray-400 dark:text-[#4a7ab5] truncate">{a.title || 'Untitled'}</span>
                        <span className="ml-auto text-[10px] text-gray-400 dark:text-[#4a7ab5] shrink-0">No booking found</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Popup blocker fallback */}
              {failedToOpenIds.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">Couldn't open automatically — click each below to book manually:</p>
                  <div className="space-y-1">
                    {failedToOpenIds.map((id) => {
                      const a = activities.find((x) => x.id === id)
                      const m = matches.get(id)
                      if (!a || !m?.affiliateUrl) return null
                      return (
                        <a
                          key={id}
                          href={m.affiliateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-[#003594] dark:text-[#4a7ab5] hover:underline truncate"
                        >
                          {a.title || 'Untitled'}
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(mode === 'summary') && bookableCount > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-[#1e3a5f]/30 shrink-0">
            <button
              onClick={onBookAll}
              className="w-full rounded-lg bg-[#003594] text-white text-sm font-medium py-2 hover:bg-[#002a7a] transition-colors"
            >
              Book All ({bookableCount})
            </button>
          </div>
        )}

        {mode === 'done' && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-[#1e3a5f]/30 shrink-0">
            <p className="text-xs text-center text-green-600 dark:text-green-400 mb-2 font-medium">Booking links opened</p>
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-gray-200 dark:border-[#1e3a5f]/30 text-gray-600 dark:text-[#cdd9e5] text-sm py-2 hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/BookingPanel.tsx
git commit -m "feat: add BookingPanel slide-in drawer with Loading/Summary/Done states"
```

---

### Task 8: CalendarToolbar + EventBlock updates

**Files:**
- Modify: `apps/web/components/calendar/CalendarToolbar.tsx`
- Modify: `apps/web/components/calendar/EventBlock.tsx`

- [ ] **Step 1: Update CalendarToolbar props interface**

In `apps/web/components/calendar/CalendarToolbar.tsx`, add these fields to `CalendarToolbarProps` (after `onOpenHistory`):

```ts
  /** Called when user clicks "Book My Trip" */
  onBookTrip?: () => void
  /** When true, shows "View Bookings" button instead of / alongside "Book My Trip" */
  hasBookingMatches?: boolean
  /** When true, "Book My Trip" button is disabled (match run in progress) */
  isBookingInProgress?: boolean
  /** Called when user clicks "View Bookings" */
  onViewBookings?: () => void
```

- [ ] **Step 2: Add "Book My Trip" and "View Bookings" buttons to CalendarToolbar**

In `CalendarToolbar`, inside the right controls `div` (just before the Share button, around line 353 of the original file), add:

```tsx
          {/* Book My Trip */}
          {!isSharedView && onBookTrip && canEdit && (
            <button
              onClick={isBookingInProgress ? undefined : onBookTrip}
              disabled={isBookingInProgress}
              className={[
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shrink-0',
                isBookingInProgress
                  ? 'bg-gray-100 dark:bg-[#1e3a5f]/20 text-gray-400 dark:text-[#4a7ab5] cursor-not-allowed'
                  : 'border border-[#003594]/30 text-[#003594] dark:text-[#4a7ab5] hover:bg-[#003594]/5 dark:hover:bg-[#1e3a5f]/20',
              ].join(' ')}
            >
              {isBookingInProgress ? 'Matching…' : 'Book My Trip'}
            </button>
          )}

          {/* View Bookings (appears once matches exist) */}
          {!isSharedView && hasBookingMatches && onViewBookings && (
            <button
              onClick={onViewBookings}
              className="flex items-center gap-1.5 rounded-lg border border-green-300 dark:border-green-700/40 bg-green-50 dark:bg-green-900/10 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors shrink-0"
            >
              View Bookings
            </button>
          )}
```

- [ ] **Step 3: Add `bookingStatus` prop to EventBlock**

In `apps/web/components/calendar/EventBlock.tsx`, add to the `EventBlockProps` interface:

```ts
  bookingStatus?: 'matched' | 'opened' | null
```

Add to the destructured props in the `EventBlock` function signature:

```ts
  bookingStatus,
```

Then, inside the returned JSX (in the outermost `div` that wraps the activity block, immediately before the closing `</div>`), add the badge:

```tsx
        {/* Booking status badge */}
        {bookingStatus === 'matched' && (
          <span
            title="Bookable"
            className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-blue-500 ring-1 ring-white dark:ring-[#0a1520]"
          />
        )}
        {bookingStatus === 'opened' && (
          <span
            title="Booking opened"
            className="absolute bottom-1 right-1 flex items-center justify-center h-3.5 w-3.5 rounded-full bg-green-500 ring-1 ring-white dark:ring-[#0a1520]"
          >
            <svg width="7" height="7" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        )}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/CalendarToolbar.tsx apps/web/components/calendar/EventBlock.tsx
git commit -m "feat: add booking buttons to CalendarToolbar and booking status badge to EventBlock"
```

---

### Task 9: CalendarDashboard wiring

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

This is the final wiring task — connecting `useBookingMatches`, `BookingPanel`, and the updated toolbar/EventBlock props.

- [ ] **Step 1: Add imports to CalendarDashboard**

At the top of `apps/web/components/calendar/CalendarDashboard.tsx`, add:

```ts
import { useBookingMatches } from './hooks/useBookingMatches'
import { BookingPanel, type BookingPanelMode } from './BookingPanel'
```

- [ ] **Step 2: Add booking state inside CalendarDashboard (after existing useState declarations)**

```ts
  const [isBookingPanelOpen, setIsBookingPanelOpen] = useState(false)
  const [bookingPanelMode, setBookingPanelMode] = useState<BookingPanelMode>('loading')
  const [bookingTotal, setBookingTotal] = useState(0)
  const [bookingReceived, setBookingReceived] = useState(0)
  const [bookingInProgress, setBookingInProgress] = useState(false)
  const [failedToOpenIds, setFailedToOpenIds] = useState<string[]>([])
  const bookingFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
```

- [ ] **Step 3: Add useBookingMatches hook call (after existing hook declarations)**

First add a static import at the top of `CalendarDashboard.tsx` with the other imports:

```ts
import { getSupabaseBrowser } from '@/lib/supabase-browser'
```

Then add after the `useInteractionTracking` hook call:

```ts
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await getSupabaseBrowser().auth.getSession()
      return data.session
    },
    staleTime: 5 * 60 * 1000,
  })

  const { matches: bookingMatches, hasBookingMatches, startRealtimeAndMatch, markOpened } = useBookingMatches({
    tripId,
    apiUrl: process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL ?? '',
    authToken: session?.access_token ?? '',
  })
```

- [ ] **Step 4: Add handleBookTrip and handleBookAll callbacks (after existing handleBulkDuplicate)**

```ts
  const handleBookTrip = useCallback(async () => {
    if (bookingInProgress) return
    setBookingInProgress(true)
    setBookingPanelMode('loading')
    setIsBookingPanelOpen(true)
    setBookingReceived(0)
    setFailedToOpenIds([])

    try {
      const activitiesToMatch = scheduledActivities.map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        latitude: a.latitude ?? null,
        longitude: a.longitude ?? null,
      }))
      setBookingTotal(activitiesToMatch.length)

      // Subscribe Realtime first, then fire POST — result arrives when all parallel calls complete.
      // Use result.total as the authoritative count; Realtime events update the live rows.
      const result = await startRealtimeAndMatch(activitiesToMatch)
      setBookingTotal(result.total)

      // Give Realtime events 2s to arrive after POST returns, then transition to summary.
      // The 10s fallback in the hook handles the case where Realtime events are lost.
      if (bookingFallbackTimerRef.current) clearTimeout(bookingFallbackTimerRef.current)
      bookingFallbackTimerRef.current = setTimeout(() => {
        setBookingReceived(result.total)
        setBookingPanelMode('summary')
        setBookingInProgress(false)
      }, 2000)
    } catch {
      setBookingPanelMode('summary')
      setBookingInProgress(false)
    }
  }, [bookingInProgress, scheduledActivities, startRealtimeAndMatch])

  // Track live Realtime updates for progress bar — clamp to total to avoid overflow
  useEffect(() => {
    if (bookingPanelMode !== 'loading' || bookingTotal === 0) return
    // bookingMatches includes prior-run data on mount; for a new run the map is being
    // populated from scratch by Realtime events. Use Math.min to avoid showing >100%.
    setBookingReceived(Math.min(bookingMatches.size, bookingTotal))
  }, [bookingMatches.size, bookingTotal, bookingPanelMode])

  const handleBookAll = useCallback(() => {
    const toBook = scheduledActivities.filter((a) => bookingMatches.get(a.id)?.status === 'matched')
    const failed: string[] = []

    for (const a of toBook) {
      const m = bookingMatches.get(a.id)
      if (!m?.affiliateUrl) continue
      const win = window.open(m.affiliateUrl, '_blank')
      if (!win) failed.push(a.id)
    }

    setFailedToOpenIds(failed)
    const successIds = toBook.map((a) => a.id).filter((id) => !failed.includes(id))
    if (successIds.length > 0) markOpened(successIds)
    setBookingPanelMode('done')
  }, [scheduledActivities, bookingMatches, markOpened])

  const handleBookOne = useCallback((activityId: string) => {
    const m = bookingMatches.get(activityId)
    if (!m?.affiliateUrl) return
    const win = window.open(m.affiliateUrl, '_blank')
    if (win) {
      markOpened([activityId])
    } else {
      setFailedToOpenIds((prev) => [...prev, activityId])
    }
  }, [bookingMatches, markOpened])

  // Cleanup fallback timer on unmount
  useEffect(() => {
    return () => {
      if (bookingFallbackTimerRef.current) clearTimeout(bookingFallbackTimerRef.current)
    }
  }, [])
```

- [ ] **Step 5: Pass new props to CalendarToolbar**

In the `CalendarToolbar` JSX in CalendarDashboard, add:

```tsx
          onBookTrip={handleBookTrip}
          hasBookingMatches={hasBookingMatches}
          isBookingInProgress={bookingInProgress}
          onViewBookings={() => {
            setBookingPanelMode('summary')
            setIsBookingPanelOpen(true)
          }}
```

- [ ] **Step 6: Thread bookingStatuses through WeekView → DayColumn and DayView → DayColumn**

**In `apps/web/components/calendar/DayColumn.tsx`:**

Add to `DayColumnProps` interface (after the `onVotePoll` prop):

```ts
  bookingStatuses?: Map<string, 'matched' | 'opened'>
```

Add `bookingStatuses,` to the destructured props in `DayColumn` function signature.

In the EventBlock render (around line 238), add the `bookingStatus` prop:

```tsx
              bookingStatus={bookingStatuses?.get(activity.id) ?? null}
```

**In `apps/web/components/calendar/WeekView.tsx`:**

Add to `WeekViewProps` interface (after `onVotePoll`):

```ts
  bookingStatuses?: Map<string, 'matched' | 'opened'>
```

Add `bookingStatuses,` to the destructured props in `WeekView` function signature.

Pass it to `DayColumn` (inside the `DayColumn` JSX, after `onVotePoll`):

```tsx
                  bookingStatuses={bookingStatuses}
```

**In `apps/web/components/calendar/DayView.tsx`:**

Add to `DayViewProps` interface (after `onVotePoll`):

```ts
  bookingStatuses?: Map<string, 'matched' | 'opened'>
```

Add `bookingStatuses,` to the destructured props in `DayView` function signature.

Pass it to `DayColumn` (inside the `DayColumn` JSX, after `onVotePoll`):

```tsx
          bookingStatuses={bookingStatuses}
```

**In `apps/web/components/calendar/CalendarDashboard.tsx`:**

Build the statuses map (add alongside the other `useMemo` calls):

```ts
  const bookingStatuses = useMemo(() => {
    const m = new Map<string, 'matched' | 'opened'>()
    for (const [id, match] of bookingMatches) {
      if (match.status === 'matched' || match.status === 'opened') {
        m.set(id, match.status)
      }
    }
    return m
  }, [bookingMatches])
```

Then pass `bookingStatuses={bookingStatuses}` to both `WeekView` and `DayView` in the JSX.

- [ ] **Step 7: Add BookingPanel to CalendarDashboard return JSX**

After the `HistoryDrawer` in the return JSX, add:

```tsx
    <BookingPanel
      isOpen={isBookingPanelOpen}
      onClose={() => setIsBookingPanelOpen(false)}
      mode={bookingPanelMode}
      activities={scheduledActivities.map((a) => ({ id: a.id, title: a.title }))}
      matches={bookingMatches}
      receivedCount={bookingReceived}
      total={bookingTotal}
      onBookAll={handleBookAll}
      onBookOne={handleBookOne}
      failedToOpenIds={failedToOpenIds}
    />
```

- [ ] **Step 8: Typecheck**

```bash
npm run typecheck
```

Fix any type errors — most likely related to threading `bookingMatches` through WeekView/DayView/DayColumn.

- [ ] **Step 9: Run all shared tests to confirm nothing broken**

```bash
cd packages/shared && npm test -- --run
```

Expected: all tests PASS

- [ ] **Step 10: Final commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx apps/web/components/calendar/WeekView.tsx apps/web/components/calendar/DayView.tsx apps/web/components/calendar/DayColumn.tsx
git commit -m "feat: wire Book My Trip into CalendarDashboard — panel, hooks, toolbar, badges"
```
