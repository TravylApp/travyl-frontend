# Local Events Feature Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface Ticketmaster local events (concerts, sports, theater, festivals) in the trip calendar as read-only day-row pills and a browseable "Events" sidebar tab.

**Architecture:** A new `GET /events` Lambda fetches Ticketmaster events for the trip destination + date range, normalizes them, and caches in DynamoDB (24h). The frontend `useEvents` hook fetches via a Next.js proxy route. `CalendarDashboard` owns the events state and distributes it to `AllDayRow` (for calendar pills) and a new `EventsPanel` inside `SidebarTabs`.

**Tech Stack:** SST v3 Lambda, DynamoDB (existing cache table), Ticketmaster Discovery API, Next.js 16 App Router, React Query v5, Tailwind CSS v4, iconoir-react

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `infra/secrets.ts` | Modify | Add `ticketmasterApiKey` secret |
| `infra/api.ts` | Modify | Register `GET /events` Lambda route |
| `services/lib/types.ts` | Modify | Add `LocalEvent` backend type |
| `services/lib/cache.ts` | Modify | Add `getCachedEvents` / `setCachedEvents` |
| `services/events.ts` | Create | Lambda handler for `GET /events` |
| `apps/web/app/api/trip-events/route.ts` | Create | Next.js proxy → Lambda `/events` |
| `apps/web/components/calendar/types.ts` | Modify | Add `LocalEvent` frontend type |
| `apps/web/components/calendar/hooks/useEvents.ts` | Create | React Query hook for events |
| `apps/web/components/calendar/EventCard.tsx` | Create | Single event list-item card |
| `apps/web/components/calendar/EventsPanel.tsx` | Create | Events sidebar tab panel |
| `apps/web/components/calendar/SidebarTabs.tsx` | Modify | Add "Events" tab, integrate into CalendarDashboard |
| `apps/web/components/calendar/AllDayRow.tsx` | Modify | Add event pills sub-row |
| `apps/web/components/calendar/CalendarToolbar.tsx` | Modify | Add events toggle button |
| `apps/web/components/calendar/CalendarDashboard.tsx` | Modify | Wire useEvents, SidebarTabs, AllDayRow |

---

## Chunk 1: Backend + Proxy Route + Hook

### Task 1: Add `LocalEvent` to backend types and cache functions

**Files:**
- Modify: `services/lib/types.ts`
- Modify: `services/lib/cache.ts`

- [ ] **Step 1: Add `LocalEvent` to `services/lib/types.ts`**

Open `services/lib/types.ts`. It currently has `SuggestionCard`, `SuggestResponse`, `SearchResponse`, `InteractRequest`. Append:

```ts
export interface LocalEvent {
  id: string
  name: string
  category: 'music' | 'sports' | 'arts' | 'family' | 'festival' | 'other'
  date: string          // YYYY-MM-DD
  startTime: string     // HH:mm (24h)
  endTime?: string      // HH:mm, optional
  venueName: string
  venueAddress?: string
  imageUrl?: string
  ticketUrl: string
  priceMin?: number
  priceMax?: number
  currency?: string
}

export interface EventsResponse {
  events: LocalEvent[]
}
```

- [ ] **Step 2: Add cache functions to `services/lib/cache.ts`**

Open `services/lib/cache.ts`. The current import is:
```ts
import type { SuggestionCard } from './types'
```

Update it to:
```ts
import type { SuggestionCard, LocalEvent } from './types'
```

Then append at the bottom of the file (after all existing code):

```ts
interface EventsCacheEntry {
  pk: string
  sk: string
  events: LocalEvent[]
  expiresAt: number
}

export async function getCachedEvents(
  destination: string,
  startDate: string,
  endDate: string,
): Promise<LocalEvent[] | null> {
  const result = await client.send(
    new GetCommand({
      TableName: Resource.RecommendationCache.name,
      Key: { pk: `events:${destination}:${startDate}:${endDate}`, sk: 'events' },
    }),
  )
  if (!result.Item) return null
  const entry = result.Item as EventsCacheEntry
  if (entry.expiresAt < Math.floor(Date.now() / 1000)) return null
  return entry.events
}

export async function setCachedEvents(
  destination: string,
  startDate: string,
  endDate: string,
  events: LocalEvent[],
  ttlSeconds = 86400,
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: Resource.RecommendationCache.name,
      Item: {
        pk: `events:${destination}:${startDate}:${endDate}`,
        sk: 'events',
        events,
        expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
      },
    }),
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck 2>&1 | head -40
```

Expected: no errors in `services/lib/cache.ts` or `services/lib/types.ts`

- [ ] **Step 4: Commit**

```bash
git add services/lib/types.ts services/lib/cache.ts
git commit -m "feat(events): add LocalEvent type and DynamoDB cache functions"
```

---

### Task 2: Add Ticketmaster secret + Lambda handler + infra route

**Files:**
- Modify: `infra/secrets.ts`
- Modify: `infra/api.ts`
- Create: `services/events.ts`

- [ ] **Step 1: Add secret to `infra/secrets.ts`**

Open `infra/secrets.ts`. Find the events section (line ~27, marked `// ─── Events ─────────────────────────────────────────────────`, which has `eventbriteApiKey` and `predicthqApiKey`). Add after the existing two exports in that section:

```ts
export const ticketmasterApiKey = new sst.Secret('TicketmasterApiKey')
```

- [ ] **Step 2: Register the route in `infra/api.ts`**

Open `infra/api.ts`. The secrets import at line 3 currently ends with `foursquareApiKey`. Update it to also import `ticketmasterApiKey`:

```ts
import { supabaseSecretKey, supabaseUrl, serpApiKey, pexels, foursquareApiKey, ticketmasterApiKey } from './secrets'
```

Then add this route at the end of the file (before the closing brace if any, or after the last `api.route()` call):

```ts
api.route('GET /events', {
  handler: 'services/events.handler',
  link: [cacheTable, supabaseSecretKey, supabaseUrl, ticketmasterApiKey],
})
```

- [ ] **Step 3: Create `services/events.ts`**

```ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { validateAuth } from './lib/auth'
import { getCachedEvents, setCachedEvents } from './lib/cache'
import type { LocalEvent, EventsResponse } from './lib/types'

const FESTIVAL_KEYWORDS = ['festival', 'fair', 'carnival', 'expo', 'parade']

function mapCategory(classificationName: string, eventName: string): LocalEvent['category'] {
  switch (classificationName) {
    case 'Music': return 'music'
    case 'Sports': return 'sports'
    case 'Arts & Theatre': return 'arts'
    case 'Family': return 'family'
    case 'Miscellaneous': {
      const lower = eventName.toLowerCase()
      if (FESTIVAL_KEYWORDS.some(kw => lower.includes(kw))) return 'festival'
      return 'other'
    }
    default: return 'other'
  }
}

function normalizeEvent(raw: any): LocalEvent | null {
  try {
    const date = raw.dates?.start?.localDate as string | undefined
    const startTime = raw.dates?.start?.localTime as string | undefined
    if (!date || !startTime) {
      console.warn('[events] skipping event missing date/time:', raw.id, raw.name)
      return null
    }

    const classification = raw.classifications?.[0]
    const classificationName: string = classification?.segment?.name ?? ''
    const venueName: string = raw._embedded?.venues?.[0]?.name ?? 'Unknown venue'
    const venueAddress: string | undefined = raw._embedded?.venues?.[0]?.address?.line1

    // Prefer 16:9 image at ≥640px width, else first image
    const images: any[] = raw.images ?? []
    const image = images.find((img: any) => img.ratio === '16_9' && img.width >= 640) ?? images[0]

    return {
      id: raw.id as string,
      name: raw.name as string,
      category: mapCategory(classificationName, raw.name as string),
      date,
      startTime: startTime.slice(0, 5), // HH:mm
      venueName,
      venueAddress,
      imageUrl: image?.url,
      ticketUrl: raw.url as string,
      priceMin: raw.priceRanges?.[0]?.min,
      priceMax: raw.priceRanges?.[0]?.max,
      currency: raw.priceRanges?.[0]?.currency,
    }
  } catch {
    return null
  }
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    await validateAuth(event.headers.authorization)

    const { destination, startDate, endDate } = event.queryStringParameters ?? {}
    if (!destination || !startDate || !endDate) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'destination, startDate, and endDate are required' }),
      }
    }

    const cached = await getCachedEvents(destination, startDate, endDate)
    if (cached) {
      console.log('[events] cache hit:', cached.length, 'events')
      const response: EventsResponse = { events: cached }
      return { statusCode: 200, body: JSON.stringify(response) }
    }

    const city = destination.split(',')[0].trim()
    console.log('[events] cache miss, fetching Ticketmaster for:', city)

    const params = new URLSearchParams({
      city,
      startDateTime: `${startDate}T00:00:00Z`,
      endDateTime: `${endDate}T23:59:59Z`,
      size: '200',
      apikey: Resource.TicketmasterApiKey.value,
    })

    const res = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
    )

    if (!res.ok) {
      console.error('[events] Ticketmaster error:', res.status, await res.text().catch(() => ''))
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch events' }) }
    }

    const data = await res.json()
    const rawEvents: any[] = data._embedded?.events ?? []

    const events: LocalEvent[] = rawEvents
      .map(normalizeEvent)
      .filter((e): e is LocalEvent => e !== null)
      .filter(e => e.date >= startDate && e.date <= endDate)

    console.log('[events] normalized', events.length, 'events from', rawEvents.length, 'raw')

    await setCachedEvents(destination, startDate, endDate, events)

    const response: EventsResponse = { events }
    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[events] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
```

- [ ] **Step 4: Typecheck**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck 2>&1 | head -40
```

Expected: no new errors in `services/events.ts`, `infra/secrets.ts`, `infra/api.ts`

- [ ] **Step 5: Commit**

```bash
git add infra/secrets.ts infra/api.ts services/events.ts
git commit -m "feat(events): add Ticketmaster Lambda handler and infra wiring"
```

---

### Task 3: Next.js proxy route + `useEvents` hook

**Files:**
- Create: `apps/web/app/api/trip-events/route.ts`
- Modify: `apps/web/components/calendar/types.ts`
- Create: `apps/web/components/calendar/hooks/useEvents.ts`

Note: `/api/events` is already taken (proxies to a different endpoint). Our new route is at `/api/trip-events`.

- [ ] **Step 1: Create `apps/web/app/api/trip-events/route.ts`**

```ts
import { NextRequest } from 'next/server'
import { getRequiredParams, proxyToBackend } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  const params = getRequiredParams(req, 'destination', 'startDate', 'endDate')
  if (params instanceof Response) return params

  return proxyToBackend('/events', req, { params })
}
```

- [ ] **Step 2: Add `LocalEvent` to `apps/web/components/calendar/types.ts`**

Open `apps/web/components/calendar/types.ts` and append:

```ts
export interface LocalEvent {
  id: string
  name: string
  category: 'music' | 'sports' | 'arts' | 'family' | 'festival' | 'other'
  date: string
  startTime: string
  endTime?: string
  venueName: string
  venueAddress?: string
  imageUrl?: string
  ticketUrl: string
  priceMin?: number
  priceMax?: number
  currency?: string
}
```

- [ ] **Step 3: Create `apps/web/components/calendar/hooks/useEvents.ts`**

```ts
'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { LocalEvent } from '../types'

interface UseEventsParams {
  destination: string
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
}

interface UseEventsReturn {
  events: LocalEvent[]
  eventsByDate: Record<string, LocalEvent[]>
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

async function fetchEvents(
  destination: string,
  startDate: string,
  endDate: string,
): Promise<LocalEvent[]> {
  const params = new URLSearchParams({ destination, startDate, endDate })
  const res = await fetch(`/api/trip-events?${params}`)
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`)
  const data = await res.json()
  return (data.events ?? []) as LocalEvent[]
}

export function useEvents({
  destination,
  startDate,
  endDate,
}: UseEventsParams): UseEventsReturn {
  const {
    data: events = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['trip-events', destination, startDate, endDate],
    queryFn: () => fetchEvents(destination, startDate, endDate),
    enabled: !!destination && !!startDate && !!endDate,
    staleTime: 1000 * 60 * 60,        // 1h
    gcTime: 2 * 60 * 60 * 1000,       // 2h
  })

  const eventsByDate = useMemo(() => {
    const map: Record<string, LocalEvent[]> = {}
    for (const event of events) {
      if (!map[event.date]) map[event.date] = []
      map[event.date].push(event)
    }
    return map
  }, [events])

  return {
    events,
    eventsByDate,
    isLoading,
    error: error as Error | null,
    refetch,
  }
}
```

- [ ] **Step 4: Typecheck**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck 2>&1 | head -40
```

Expected: no new errors

- [ ] **Step 5: Lint**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run lint 2>&1 | head -40
```

Expected: no new warnings or errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/trip-events/route.ts apps/web/components/calendar/types.ts apps/web/components/calendar/hooks/useEvents.ts
git commit -m "feat(events): add proxy route and useEvents hook"
```

---

## Chunk 2: Frontend UI Components

### Task 4: `EventCard` component

**Files:**
- Create: `apps/web/components/calendar/EventCard.tsx`

- [ ] **Step 1: Create `apps/web/components/calendar/EventCard.tsx`**

```tsx
'use client'

import type { LocalEvent } from './types'

const CATEGORY_COLORS: Record<LocalEvent['category'], string> = {
  music:    '#7C3AED',
  sports:   '#059669',
  arts:     '#D97706',
  family:   '#DB2777',
  festival: '#CA8A04',
  other:    '#6B7280',
}

const CATEGORY_LABELS: Record<LocalEvent['category'], string> = {
  music:    'Music',
  sports:   'Sports',
  arts:     'Arts',
  family:   'Family',
  festival: 'Festival',
  other:    'Other',
}

function formatEventDate(date: string, startTime: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = startTime.split(':').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
  const monthLabel = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  const dayLabel = d.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
  return `${weekday} ${monthLabel} ${dayLabel} · ${time}`
}

interface EventCardProps {
  event: LocalEvent
}

export function EventCard({ event }: EventCardProps) {
  const color = CATEGORY_COLORS[event.category]

  return (
    <div className="flex items-start gap-3 px-3 py-2.5 hover:bg-[var(--cal-border-light)] transition-colors rounded-lg">
      {/* Thumbnail */}
      <div
        className="shrink-0 w-12 h-12 rounded-lg overflow-hidden"
        style={{ backgroundColor: `${color}22` }}
      >
        {event.imageUrl ? (
          <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[var(--cal-text)] line-clamp-2 leading-snug">
          {event.name}
        </p>
        <p className="text-[11px] text-[var(--cal-text-secondary)] mt-0.5">
          {formatEventDate(event.date, event.startTime)}
        </p>
        <p className="text-[11px] text-[var(--cal-text-tertiary)] truncate">
          {event.venueName}
        </p>
        <span
          className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {CATEGORY_LABELS[event.category]}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck 2>&1 | head -40
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/EventCard.tsx
git commit -m "feat(events): add EventCard component"
```

---

### Task 5: `EventsPanel` component

**Files:**
- Create: `apps/web/components/calendar/EventsPanel.tsx`

- [ ] **Step 1: Create `apps/web/components/calendar/EventsPanel.tsx`**

```tsx
'use client'

import { useState, useMemo } from 'react'
import { EventCard } from './EventCard'
import type { LocalEvent } from './types'

const FILTER_CHIPS = ['All', 'Music', 'Sports', 'Arts', 'Family', 'Festivals'] as const
type FilterChip = (typeof FILTER_CHIPS)[number]

const CHIP_TO_CATEGORY: Record<FilterChip, LocalEvent['category'] | null> = {
  All:       null,
  Music:     'music',
  Sports:    'sports',
  Arts:      'arts',
  Family:    'family',
  Festivals: 'festival',
}

function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return ''
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', timeZone: 'UTC',
    })
  }
  return `${fmt(startDate)}–${fmt(endDate)}`
}

interface EventsPanelProps {
  events: LocalEvent[]
  isLoading: boolean
  destination: string
  startDate: string
  endDate: string
  onRetry?: () => void
}

export function EventsPanel({
  events,
  isLoading,
  destination,
  startDate,
  endDate,
  onRetry,
}: EventsPanelProps) {
  const [activeChip, setActiveChip] = useState<FilterChip>('All')

  const filtered = useMemo(() => {
    const category = CHIP_TO_CATEGORY[activeChip]
    const sorted = [...events].sort((a, b) =>
      a.date === b.date
        ? a.startTime.localeCompare(b.startTime)
        : a.date.localeCompare(b.date),
    )
    return category ? sorted.filter(e => e.category === category) : sorted
  }, [events, activeChip])

  const dateRange = formatDateRange(startDate, endDate)
  const isDisabled = !startDate || !endDate
  const cityName = destination.split(',')[0]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3.5 pb-3 border-b border-[var(--cal-border-light)]">
        <h2 className="text-sm font-semibold text-[var(--cal-text)]">
          Events{cityName ? ` in ${cityName}` : ''}
        </h2>
        {dateRange && (
          <p className="text-[11px] text-[var(--cal-text-secondary)] mt-0.5">{dateRange}</p>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 px-3.5 pt-2.5 pb-0 overflow-x-auto">
        {FILTER_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => setActiveChip(chip)}
            className={[
              'text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-all border',
              activeChip === chip
                ? 'bg-[#003594] border-[#003594] text-white'
                : 'border-[var(--cal-border)] text-[var(--cal-text-secondary)] hover:bg-[var(--cal-border-light)] hover:text-[var(--cal-text)]',
            ].join(' ')}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="h-0 grow overflow-y-auto py-2 scrollbar-thin">
        {isDisabled ? (
          <div className="flex items-center justify-center h-full px-4 text-center">
            <p className="text-sm text-[var(--cal-text-secondary)]">
              Add trip dates to see local events
            </p>
          </div>
        ) : isLoading ? (
          <div className="px-3 space-y-3 pt-2">
            {[0, 1].map(i => (
              <div key={i} className="flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-[var(--cal-border)] animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[var(--cal-border)] animate-pulse rounded w-3/4" />
                  <div className="h-2.5 bg-[var(--cal-border)] animate-pulse rounded w-1/2" />
                  <div className="h-2.5 bg-[var(--cal-border)] animate-pulse rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : onRetry && events.length === 0 ? (
          // Error state takes precedence over empty state when onRetry is provided
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
            <p className="text-sm text-[var(--cal-text-secondary)]">Couldn't load events</p>
            <button
              onClick={onRetry}
              className="text-xs text-[var(--cal-accent)] hover:underline"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full px-4 text-center">
            <p className="text-sm text-[var(--cal-text-secondary)]">
              No events found in {cityName} during your trip
            </p>
          </div>
        ) : (
          filtered.map(event => <EventCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck 2>&1 | head -40
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/EventsPanel.tsx
git commit -m "feat(events): add EventsPanel component"
```

---

### Task 6: Update `SidebarTabs` with Events tab

**Files:**
- Modify: `apps/web/components/calendar/SidebarTabs.tsx`

- [ ] **Step 1: Replace `apps/web/components/calendar/SidebarTabs.tsx`**

The current file has `'for-you' | 'map'` tab type. Replace the entire file:

```tsx
'use client'

import { useState } from 'react'

type Tab = 'for-you' | 'events' | 'map'

interface SidebarTabsProps {
  forYouContent: React.ReactNode
  eventsContent: React.ReactNode
  mapContent: React.ReactNode
}

export default function SidebarTabs({
  forYouContent,
  eventsContent,
  mapContent,
}: SidebarTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('for-you')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'for-you', label: 'For You' },
    { id: 'events', label: 'Events' },
    { id: 'map', label: 'Map' },
  ]

  const content =
    activeTab === 'for-you' ? forYouContent
    : activeTab === 'events' ? eventsContent
    : mapContent

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-[var(--cal-border)] shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'text-[#003594] border-b-2 border-[#003594]'
                : 'text-[var(--cal-text-secondary)] hover:text-[var(--cal-text)]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {content}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck 2>&1 | head -40
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/SidebarTabs.tsx
git commit -m "feat(events): update SidebarTabs with Events tab"
```

---

### Task 7: Update `AllDayRow` with event pills

**Files:**
- Modify: `apps/web/components/calendar/AllDayRow.tsx`

The `days` prop currently carries `{ dayIndex }`. In Task 9, `TRIP_DAYS` will be extended to include `isoDate`. Here we update `AllDayRow` to accept `isoDate` on each day and use it for the event lookup. The `eventsByDate` lookup is wired in this task — no placeholder needed.

- [ ] **Step 1: Replace `apps/web/components/calendar/AllDayRow.tsx`**

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import type { LocalEvent } from './types'

export interface FlightBanner {
  id: string
  label: string
  dayIndex: number
  direction: 'arrival' | 'departure'
}

export interface HotelBanner {
  id: string
  label: string
  startDayIndex: number
  endDayIndex: number
}

const CATEGORY_COLORS: Record<LocalEvent['category'], string> = {
  music:    '#7C3AED',
  sports:   '#059669',
  arts:     '#D97706',
  family:   '#DB2777',
  festival: '#CA8A04',
  other:    '#6B7280',
}

function formatPillTime(startTime: string): string {
  const [h, m] = startTime.split(':').map(Number)
  const d = new Date(0)
  d.setUTCHours(h, m)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
}

interface EventPillProps {
  event: LocalEvent
}

function EventPill({ event }: EventPillProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const color = CATEGORY_COLORS[event.category]

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left text-[10px] px-1 py-0.5 rounded truncate leading-tight"
        style={{
          backgroundColor: `${color}26`,
          borderLeft: `2px solid ${color}`,
          color: 'var(--cal-text)',
        }}
        title={event.name}
      >
        {event.name}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-56 bg-[var(--cal-surface-elevated)] border border-[var(--cal-border)] rounded-lg shadow-lg p-3 text-left">
          <p className="text-[13px] font-semibold text-[var(--cal-text)] leading-snug mb-1">
            {event.name}
          </p>
          <p className="text-[11px] text-[var(--cal-text-secondary)]">
            {formatPillTime(event.startTime)}
            {event.endTime ? ` – ${formatPillTime(event.endTime)}` : ''}
          </p>
          <p className="text-[11px] text-[var(--cal-text-tertiary)] mt-0.5 truncate">
            {event.venueName}
          </p>
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-[11px] font-medium text-[#003594] hover:underline"
          >
            Get tickets →
          </a>
        </div>
      )}
    </div>
  )
}

interface OverflowPillProps {
  events: LocalEvent[]
}

function OverflowPill({ events }: OverflowPillProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full text-left text-[10px] px-1 py-0.5 rounded truncate leading-tight text-[var(--cal-text-secondary)] bg-[var(--cal-border-light)] hover:bg-[var(--cal-border)] transition-colors"
      >
        +{events.length} more
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-56 bg-[var(--cal-surface-elevated)] border border-[var(--cal-border)] rounded-lg shadow-lg py-1">
          {events.map(event => {
            const color = CATEGORY_COLORS[event.category]
            return (
              <div key={event.id} className="flex items-start gap-2 px-3 py-2 hover:bg-[var(--cal-border-light)] transition-colors">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[var(--cal-text)] truncate">{event.name}</p>
                  <p className="text-[10px] text-[var(--cal-text-secondary)]">
                    {formatPillTime(event.startTime)} · {event.venueName}
                  </p>
                  <a
                    href={event.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-[#003594] hover:underline"
                  >
                    Tickets →
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const MAX_PILLS = 3

interface AllDayRowProps {
  days: { dayIndex: number; isoDate?: string }[]
  flights?: FlightBanner[]
  hotels?: HotelBanner[]
  eventsByDate?: Record<string, LocalEvent[]>
  showEvents?: boolean
}

export function AllDayRow({
  days,
  flights = [],
  hotels = [],
  eventsByDate = {},
  showEvents = true,
}: AllDayRowProps) {
  const hasEvents = showEvents && Object.values(eventsByDate).some(arr => arr.length > 0)
  if (flights.length === 0 && hotels.length === 0 && !hasEvents) return null

  return (
    <div className="flex border-b border-[var(--cal-border)] min-h-[2rem]">
      {/* Gutter spacer matching TimeGutter width */}
      <div className="flex-shrink-0 w-14" />

      {/* Per-day cells */}
      <div className="flex flex-1 min-w-0">
        {days.map(({ dayIndex, isoDate }) => {
          const dayFlights = flights.filter(f => f.dayIndex === dayIndex)
          const dayHotels = hotels.filter(
            h => h.startDayIndex <= dayIndex && dayIndex <= h.endDayIndex,
          )
          const dayEvents: LocalEvent[] = showEvents && isoDate
            ? (eventsByDate[isoDate] ?? [])
            : []

          return (
            <div
              key={dayIndex}
              className="flex-1 min-w-0 border-l border-[var(--cal-border-light)] px-1 py-0.5 flex flex-col gap-0.5"
            >
              {/* Hotel banners */}
              {dayHotels.map(hotel => {
                const isStart = hotel.startDayIndex === dayIndex
                const isEnd = hotel.endDayIndex === dayIndex
                return (
                  <div
                    key={hotel.id}
                    title={hotel.label}
                    className={[
                      'text-[10px] font-medium px-1 py-0.5 bg-amber-100 text-amber-800 overflow-hidden',
                      isStart && isEnd ? 'rounded'
                        : isStart ? 'rounded-l pr-0'
                        : isEnd ? 'rounded-r pl-0'
                        : 'rounded-none px-0',
                    ].join(' ')}
                  >
                    {isStart ? (
                      <span className="truncate block">{hotel.label}</span>
                    ) : (
                      <span className="text-amber-400">— — —</span>
                    )}
                  </div>
                )
              })}

              {/* Flight banners */}
              {dayFlights.map(flight => (
                <div
                  key={flight.id}
                  title={flight.label}
                  className={[
                    'text-[10px] font-medium px-1 py-0.5 rounded truncate',
                    flight.direction === 'arrival'
                      ? 'bg-[var(--cal-accent-bg)] text-[var(--cal-accent)]'
                      : 'bg-red-50 text-red-700',
                  ].join(' ')}
                >
                  {flight.direction === 'arrival' ? '→ ' : '← '}
                  {flight.label}
                </div>
              ))}

              {/* Event pills */}
              {dayEvents.slice(0, MAX_PILLS).map(event => (
                <EventPill key={event.id} event={event} />
              ))}
              {dayEvents.length > MAX_PILLS && (
                <OverflowPill events={dayEvents.slice(MAX_PILLS)} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck 2>&1 | head -40
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/AllDayRow.tsx
git commit -m "feat(events): add AllDayRow event pills with popover"
```

---

### Task 8: Update `CalendarToolbar` with Events toggle

**Files:**
- Modify: `apps/web/components/calendar/CalendarToolbar.tsx`

`Calendar` is confirmed to exist in the installed version of iconoir-react.

- [ ] **Step 1: Add `showEvents` and `onToggleEvents` to `CalendarToolbarProps`**

Open `CalendarToolbar.tsx`. Find `interface CalendarToolbarProps` (search for it with grep if unsure of line):

```bash
grep -n "interface CalendarToolbarProps" /c/Users/justi/dev/travyl2/travyl-frontend/apps/web/components/calendar/CalendarToolbar.tsx
```

Add two props to the interface:

```ts
showEvents: boolean
onToggleEvents: () => void
```

- [ ] **Step 2: Destructure the new props and add `Calendar` to iconoir-react import**

Find the iconoir-react import line. It currently imports `Plus, ShareAndroid, Clock`. Add `Calendar`:

```ts
import { Plus, ShareAndroid, Clock, Calendar } from 'iconoir-react'
```

Destructure the new props in the component function signature alongside existing ones.

- [ ] **Step 3: Add the Events toggle button to the toolbar JSX**

Find where the existing toolbar icon buttons are rendered (near the theme toggle or the share button). Add the Events toggle button:

```tsx
{/* Events layer toggle */}
<button
  onClick={onToggleEvents}
  title={showEvents ? 'Hide events' : 'Show events'}
  className={[
    'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
    showEvents
      ? 'bg-[#003594]/10 text-[#003594]'
      : 'text-[var(--cal-text-secondary)] hover:text-[var(--cal-text)] hover:bg-[var(--cal-border-light)]',
  ].join(' ')}
>
  <Calendar width={14} height={14} strokeWidth={1.5} />
  <span>Events</span>
</button>
```

- [ ] **Step 4: Typecheck**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck 2>&1 | head -40
```

Expected: no errors. If `Calendar` is not found, check the import — confirmed available in this codebase's iconoir-react version.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/CalendarToolbar.tsx
git commit -m "feat(events): add Events toggle to CalendarToolbar"
```

---

### Task 9: Wire everything in `CalendarDashboard`

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

This task has the most moving parts. Make each change carefully and typecheck after the full set of edits.

- [ ] **Step 1: Add imports**

Open `CalendarDashboard.tsx`. Add to the existing component imports (near `ForYouPanel`):

```ts
import SidebarTabs from './SidebarTabs'
import { EventsPanel } from './EventsPanel'
import { useEvents } from './hooks/useEvents'
```

- [ ] **Step 2: Add `isoDate` to `TRIP_DAYS`**

Find the `TRIP_DAYS` `useMemo` (around line 235). It currently returns `{ dayIndex, label }`. Add `isoDate`:

```ts
const TRIP_DAYS = useMemo(() => Array.from({ length: tripTotalDays }, (_, i) => {
  const date = new Date(parsedStartMs + i * 24 * 60 * 60 * 1000)
  return {
    dayIndex: i,
    label: date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }),
    isoDate: date.toISOString().slice(0, 10),
  }
}), [tripTotalDays, parsedStartMs])
```

- [ ] **Step 3: Add `useEvents` call and `showEvents` state**

All hooks in `CalendarDashboard` are called before any early returns (before lines 398–400). Add these two lines in the hooks section (after the existing `useInteractionTracking` call is a good place):

```ts
const { events, eventsByDate, isLoading: eventsLoading, error: eventsError, refetch: refetchEvents } = useEvents({
  destination: trip?.destination ?? '',
  startDate: trip?.start_date ?? '',
  endDate: trip?.end_date ?? '',
})
const [showEvents, setShowEvents] = useState(true)
```

`useEvents` is safe to call with empty strings — the query will not fire (`enabled: false`) until all three params are non-empty. This is how all guarded hooks work in this file.

- [ ] **Step 4: Pass `showEvents` + `onToggleEvents` to `CalendarToolbar`**

Find the `<CalendarToolbar` JSX (around line 529). Add:

```tsx
showEvents={showEvents}
onToggleEvents={() => setShowEvents(v => !v)}
```

- [ ] **Step 5: Pass `eventsByDate` + `showEvents` to `AllDayRow`**

Find `<AllDayRow days={visibleDays} />` (around line 567). Replace with:

```tsx
<AllDayRow
  days={visibleDays}
  eventsByDate={eventsByDate}
  showEvents={showEvents}
/>
```

- [ ] **Step 6: Replace `<ForYouPanel>` with `<SidebarTabs>`**

Find this block (around lines 662–669):

```tsx
{/* Right column: For You panel */}
<ForYouPanel
  destination={trip?.destination ?? ''}
  tripId={trip?.id ?? ''}
  scheduledActivityIds={droppedSuggestionIds}
  width={forYouWidth}
/>
```

Replace with:

```tsx
{/* Right column: tabbed sidebar */}
<div
  style={{ width: forYouWidth }}
  className="relative flex flex-col shrink-0 self-stretch overflow-hidden"
>
  <SidebarTabs
    forYouContent={
      <ForYouPanel
        destination={trip?.destination ?? ''}
        tripId={trip?.id ?? ''}
        scheduledActivityIds={droppedSuggestionIds}
        width={forYouWidth}
      />
    }
    eventsContent={
      <EventsPanel
        events={events}
        isLoading={eventsLoading}
        destination={trip?.destination ?? ''}
        startDate={trip?.start_date ?? ''}
        endDate={trip?.end_date ?? ''}
        onRetry={eventsError ? refetchEvents : undefined}
      />
    }
    mapContent={null}
  />
</div>
```

Note: The wrapper `<div>` uses only layout classes (`flex-col shrink-0 self-stretch overflow-hidden`) and does NOT add `border-l` or `bg-[var(--cal-surface-elevated)]`. These styles are already provided by `ForYouPanel`'s `<aside>` on the "For You" tab, and by `EventsPanel`'s own layout. Adding them to the wrapper would cause a double-border visible on the "For You" tab.

- [ ] **Step 7: Typecheck**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck 2>&1 | head -60
```

Expected: zero errors. Fix any type mismatches before the next step.

- [ ] **Step 8: Lint**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run lint 2>&1 | head -40
```

Expected: zero new errors.

- [ ] **Step 9: Start dev server and manually verify**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run web
```

Open a trip at `http://localhost:3000/trip/[id]`. Verify:
1. Right sidebar shows "For You", "Events", "Map" tabs
2. Clicking "Events" shows skeleton → EventsPanel with content
3. Clicking "For You" returns to ForYouPanel with no double border
4. "Events" toggle in CalendarToolbar hides/shows AllDayRow pills
5. Event pills in AllDayRow are clickable — popover shows name, time, venue, ticket link
6. "+N more" chip opens a list with time + venue + ticket link per event
7. EventsPanel filter chips work (Music, Sports, etc.)

- [ ] **Step 10: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat(events): wire CalendarDashboard — events state, SidebarTabs, AllDayRow pills, toolbar toggle"
```

---

### Task 10: Final checks + secret setup

- [ ] **Step 1: Full typecheck**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck 2>&1
```

Expected: zero errors across all workspaces.

- [ ] **Step 2: Full lint**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run lint 2>&1
```

Expected: zero errors.

- [ ] **Step 3: Set the Ticketmaster API key secret (required before production deploy)**

Get a free API key from the Ticketmaster developer portal (developer.ticketmaster.com → Apps). Then:

```bash
AWS_PROFILE=525610233002_AdministratorAccess npx sst secret set TicketmasterApiKey <your-api-key> --stage production
```

- [ ] **Step 4: Final commit if any cleanup needed**

```bash
git status
# If any uncommitted changes:
git add <files>
git commit -m "chore(events): final cleanup"
```
