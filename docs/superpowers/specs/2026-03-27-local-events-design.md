# Local Events Feature — Design Spec

**Date:** 2026-03-27
**Feature:** Local events (concerts, sports, theater, festivals, etc.) surfaced in the trip calendar

---

## Overview

Add a local events discovery layer to the trip calendar. Events happening at the trip destination during the trip dates automatically appear on the calendar as read-only day-row pills, and are browseable in a new "Events" sidebar tab. Data comes from the Ticketmaster Discovery API via a new `/events` Lambda endpoint.

---

## Architecture & Data Flow

1. User opens trip → `CalendarDashboard` calls `useEvents({ destination, startDate, endDate })` which fires `GET /events?destination=Paris&startDate=2026-04-01&endDate=2026-04-07` with Supabase JWT in Authorization header
2. Lambda validates JWT (same `lib/auth.ts` pattern as `/suggest`)
3. Checks DynamoDB cache via new `getCachedEvents` / `setCachedEvents` functions added to `services/lib/cache.ts`
4. **Cache hit** → return immediately
5. **Cache miss** → extract city name (split on first comma, trim — "Paris, France" → "Paris") → call Ticketmaster Discovery API → normalize response to `LocalEvent[]` → write to DynamoDB → return
6. Frontend: `CalendarDashboard` owns the `LocalEvent[]` list; passes `eventsByDate` to `AllDayRow` for calendar pills and to `EventsPanel` for the sidebar tab; owns `showEvents: boolean` toggle state

**New SST secret:** Add to `infra/secrets.ts` under the `// ─── Events ─────────────────────────────────────────────────` section:
```ts
export const ticketmasterApiKey = new sst.Secret('TicketmasterApiKey')
```

**New Lambda route:** Add to `infra/api.ts` (import `ticketmasterApiKey` from `'./secrets'`):
```ts
api.route('GET /events', {
  handler: 'services/events.handler',
  link: [cacheTable, supabaseSecretKey, supabaseUrl, ticketmasterApiKey],
})
```

---

## Data Model

### `LocalEvent` — frontend type
Add to `apps/web/components/calendar/types.ts`:
```ts
export interface LocalEvent {
  id: string              // Ticketmaster event ID
  name: string
  category: 'music' | 'sports' | 'arts' | 'family' | 'festival' | 'other'
  date: string            // ISO date (YYYY-MM-DD)
  startTime: string       // HH:mm (24h)
  endTime?: string        // HH:mm, optional
  venueName: string
  venueAddress?: string
  imageUrl?: string       // Ticketmaster images array, prefer 16:9 ratio
  ticketUrl: string       // Ticketmaster event page URL
  priceMin?: number
  priceMax?: number
  currency?: string
}
```

### `LocalEvent` — backend type
Add the same interface to `services/lib/types.ts` (backend copy — avoid cross-boundary imports).

### Category mapping
Ticketmaster `classificationName` → `LocalEvent.category`:
- `Music` → `music`
- `Sports` → `sports`
- `Arts & Theatre` → `arts`
- `Family` → `family`
- `Miscellaneous` where event name contains any of: "festival", "fair", "carnival", "expo", "parade" (case-insensitive) → `festival`
- All other values → `other` (intentional safe downgrade for unknown classifications)

---

## Frontend Components

### `CalendarDashboard` — updated
Changes:
- Call `useEvents({ destination: trip?.destination ?? '', startDate: trip?.start_date ?? '', endDate: trip?.end_date ?? '' })` after the existing `if (!trip)` early return (so `trip` is guaranteed non-null)
- Add `const [showEvents, setShowEvents] = useState(true)` local state
- Pass `showEvents` and `onToggleEvents={() => setShowEvents(v => !v)}` to `CalendarToolbar`
- Pass `eventsByDate` and `showEvents` to `AllDayRow`
- Replace the current direct `<ForYouPanel ... />` render with `<SidebarTabs>`:
  - `forYouContent`: `<ForYouPanel ... />` (same props as today)
  - `eventsContent`: `<EventsPanel events={events} destination={trip.destination} startDate={trip.start_date} endDate={trip.end_date} onRetry={refetch} />`
  - `mapContent`: `null` (map tab is out of scope for this feature — renders empty placeholder)
  - `width={forYouWidth}` — the resize handle applies to the entire tabbed panel

### `SidebarTabs` — updated
`SidebarTabs` exists at `apps/web/components/calendar/SidebarTabs.tsx` with `'for-you' | 'map'` tab type, but `CalendarDashboard` does not currently import or use it (renders `ForYouPanel` directly). This task updates `SidebarTabs` and integrates it into `CalendarDashboard`.

Update interface:
```ts
interface SidebarTabsProps {
  forYouContent: React.ReactNode
  eventsContent: React.ReactNode
  mapContent: React.ReactNode
  width?: number
}
```

`SidebarTabs` manages its own `activeTab` state internally (`'for-you' | 'events' | 'map'`, default `'for-you'`). Three tab buttons: "For You", "Events", "Map". Renders the active tab's content in a `flex-1 overflow-hidden` container. Styled using `--cal-border`, `--cal-text`, `--cal-accent` tokens consistent with existing calendar theme.

### `EventsPanel` — new
Location: `apps/web/components/calendar/EventsPanel.tsx`

Props:
```ts
interface EventsPanelProps {
  events: LocalEvent[]
  isLoading: boolean
  destination: string
  startDate: string   // YYYY-MM-DD, for subtitle display
  endDate: string     // YYYY-MM-DD, for subtitle display
  onRetry?: () => void
  width?: number
}
```

States:
- **Loading:** skeleton cards (2 placeholder items)
- **Empty (events is []):** "No events found in {destination} during your trip"
- **Disabled (startDate or endDate is empty):** "Add trip dates to see local events"
- **Error (events is [] and onRetry is provided):** empty state + "Retry" button that calls `onRetry`
- **Loaded:** category filter chips + sorted `EventCard` list

Layout:
- Header: "Events in {destination}" + trip date range subtitle (formatted: "Apr 1–7")
- Category filter chips: All, Music, Sports, Arts, Family, Festivals — client-side filter of `events` prop
- Scrollable list of `EventCard`, sorted by `date` then `startTime`

### `EventCard` — new
Location: `apps/web/components/calendar/EventCard.tsx`

Compact horizontal list-item (not masonry like `SuggestionCard`):
- Left: 48×48px rounded image thumbnail or category-colored placeholder block
- Right: event name (2-line truncate), date formatted as "Mon Apr 1 · 8:00 PM", venue name, category badge

Category badge colors:
- `music` → `#7C3AED`
- `sports` → `#059669`
- `arts` → `#D97706`
- `family` → `#DB2777`
- `festival` → `#CA8A04`
- `other` → `#6B7280`

### `AllDayRow` — updated
Add two new props:
```ts
eventsByDate?: Record<string, LocalEvent[]>  // keyed by YYYY-MM-DD calendar date
showEvents?: boolean                          // default true
```

**Early-return guard** — replace current guard with:
```ts
const hasEvents = showEvents !== false && Object.values(eventsByDate ?? {}).some(arr => arr.length > 0)
if (flights.length === 0 && hotels.length === 0 && !hasEvents) return null
```

**Event pills sub-row** (only rendered when `showEvents !== false`):
- Per day cell, below existing hotel/flight banners
- Pills: ~18px height, event name truncated, category background at 15% opacity, 2px category-colored left border
- Max 3 pills per day; overflow shown as "+N more" chip
- Clicking any pill or "+N more" opens a **self-contained local popover**: a `useState`-managed `<div>` with `position: absolute`, `z-index: 50`, containing event name, formatted date/time, venue, and an external `<a target="_blank">` link to `ticketUrl`. Clicking outside or pressing Escape closes it. Does **not** use `CardPopover` (which is globally managed by `CalendarDashboard`).

`CalendarDashboard` computes each day's ISO date string for the `eventsByDate` lookup:
```ts
new Date(parsedStartDate.getTime() + dayIndex * 86400000).toISOString().slice(0, 10)
```

### `CalendarToolbar` — updated
Add two new props:
```ts
showEvents: boolean
onToggleEvents: () => void
```
Add an "Events" toggle icon button using `iconoir-react` (e.g., `Calendar` or `Ticket` icon + "Events" label). Visually active (blue tint) when `showEvents === true`.

### `useEvents` hook — new
Location: `apps/web/components/calendar/hooks/useEvents.ts`

```ts
function useEvents(params: {
  destination: string
  startDate: string
  endDate: string
}): {
  events: LocalEvent[]
  eventsByDate: Record<string, LocalEvent[]>  // grouped by date via useMemo inside hook
  isLoading: boolean
  error: Error | null
  refetch: () => void
}
```

- `enabled: !!destination && !!startDate && !!endDate`
- React Query, `staleTime: 1000 * 60 * 60` (1h client-side)
- Authenticated fetch via `getSupabaseBrowser()` (same pattern as `useSuggestions`)
- `eventsByDate` grouped inside hook via `useMemo` — consumers do not group themselves

---

## Backend — `services/lib/cache.ts` — updated

Add new exported functions for events caching. Define a local `EventsCacheEntry` interface:
```ts
interface EventsCacheEntry {
  pk: string
  sk: string
  events: LocalEvent[]  // import LocalEvent from './types'
  expiresAt: number     // Unix seconds
}
```

```ts
export async function getCachedEvents(
  destination: string,
  startDate: string,
  endDate: string,
): Promise<LocalEvent[] | null>
// Key: { pk: `events:${destination}:${startDate}:${endDate}`, sk: 'events' }
// Returns null if not found or expired (same expiry check as getCachedSuggestions)

export async function setCachedEvents(
  destination: string,
  startDate: string,
  endDate: string,
  events: LocalEvent[],
  ttlSeconds: number = 86400,  // 24h default
): Promise<void>
// Writes: { pk, sk, events, expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds }
```

Import `LocalEvent` from `'./types'`.

---

## Backend — `services/events.ts` — new

Lambda handler:

1. Parse query params: `destination`, `startDate`, `endDate`. Return 400 if any missing.
2. Validate JWT via `lib/auth.ts`. Return 401 if invalid.
3. Check cache: `getCachedEvents(destination, startDate, endDate)`. Return `{ events }` if hit.
4. Normalize city: `const city = destination.split(',')[0].trim()`
5. Call Ticketmaster: `GET https://app.ticketmaster.com/discovery/v2/events.json` with params `city`, `startDateTime: ${startDate}T00:00:00Z`, `endDateTime: ${endDate}T23:59:59Z`, `size: 200` (max allowed — first 200 results by Ticketmaster default relevance, no pagination), `apikey: Resource.TicketmasterApiKey.value`
6. Normalize `response._embedded?.events ?? []` → `LocalEvent[]` using category mapping
7. Filter to events where `date` is within `[startDate, endDate]`
8. `setCachedEvents(destination, startDate, endDate, events)` (24h TTL)
9. Return `{ events }`

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Ticketmaster API failure | Lambda returns 500. `useEvents` sets `error`. `CalendarDashboard` passes `onRetry={refetch}` to `EventsPanel`, which shows empty state + retry button. `AllDayRow` receives empty `eventsByDate`, early-return guard fires. Calendar unaffected. |
| No events in date range | `{ events: [] }` returned. `EventsPanel` shows empty state. `AllDayRow` early-return guard fires — no row rendered. |
| Trip missing dates or destination | `useEvents` disabled. `EventsPanel` shows "Add trip dates to see local events." `AllDayRow` gets empty `eventsByDate`. |
| Events toggle off | `showEvents === false`. `AllDayRow` skips pills sub-row. Early-return guard accounts for this. No refetch triggered. |
| Ticketmaster rate limit | 24h cache per destination+date-range = 1 API call per unique trip window. Free tier (5k/day) easily handles this. |
| `_embedded` missing | `response._embedded?.events ?? []` — returns empty array gracefully. |

---

## Out of Scope (this iteration)

- Adding events as editable activities (read-only only)
- Eventbrite or other event sources
- Mobile app support
- Personalized event ranking
- Notifications or reminders for upcoming events
- Saving/favoriting events
- Pagination beyond 200 results per trip window
- Timezone-aware date filtering (UTC used; events near midnight in non-UTC timezones may appear on adjacent days)
- Map tab content (map slot renders `null` placeholder — separate feature)
