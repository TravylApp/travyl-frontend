# Calendar Information Density — Design Spec

**Date:** 2026-03-27
**Status:** Approved

## Problem

The calendar shows activities with titles, times, and images but lacks the practical information needed to judge whether a schedule is feasible. Users can't see geographic proximity, travel times between stops, opening hours, weather, or scheduling conflicts without clicking into individual activities.

## Goal

Surface maps, travel times, activity metadata, and schedule feasibility directly on the calendar so users can build realistic itineraries at a glance.

## Approach

Calendar-native integration — all four features embed into the existing calendar UX. No new primary views. The calendar stays the planning surface; information layers on top.

## Existing Infrastructure

Much of the data layer is already built:

- **Backend:** `services/activity-intelligence.ts` — fetches place details (SerpAPI), travel time (haversine), weather (Open-Meteo), conflicts (hours + travel time). Caches in DynamoDB with 1hr TTL.
- **Frontend:** `useActivityIntelligence` hook + `ActivityIntelligencePanel` — renders intelligence for a single selected activity.
- **Activity data:** `CalendarActivity` already has `latitude`, `longitude`, `location` fields.
- **AWS infra:** Amazon Location PlaceIndex in SST.

## Feature 1: Mini-Map Panel

### What

A map in the right sidebar showing the current day's activities as numbered pins connected by route lines. Replaces or shares space with the ForYouPanel.

### UI

- **Tabbed sidebar:** Right sidebar gains tabs: "For You" (current suggestions) and "Map".
- **Map view:** MapLibre GL JS map filling the sidebar panel. Pins for each activity, numbered by time order (1, 2, 3...). Pins color-coded by activity type (matching existing category colors).
- **Route lines:** Dashed lines connecting pins in chronological order. Line thickness or opacity could indicate travel time (longer travel = more prominent line).
- **Interaction:** Click pin → select the corresponding activity on the calendar. Selected pin gets a highlight ring. Dragging activities on the calendar updates pin positions via Yjs lat/lng in real time.
- **Empty state:** If no activities have coordinates, show "Add locations to see the route map".

### Data

- Activity positions from Yjs (`latitude`, `longitude` on CalendarActivity).
- Travel times from the new `useDayIntelligence` hook (Feature 2).
- Map tiles: Amazon Location Maps (already in SST infra) or OpenStreetMap raster tiles for MVP.

### Components

- `DayMap` — MapLibre GL map with activity markers and route lines.
- `SidebarTabs` — Tab switcher for "For You" / "Map" in the right panel.

## Feature 2: Travel Time Badges

### What

Inline indicators between adjacent activities in the day column showing estimated travel time.

### UI

- **Badge position:** Between EventBlocks in DayColumn. A thin dashed connector line with a centered badge.
- **Badge content:** Travel time (e.g. "15 min") and transport mode icon from `iconoir-react`: `Walking` icon for <2km, `CarSolid` icon for >=2km.
- **Conflict state:** If travel time exceeds the time gap between activities, badge background turns amber, shows warning icon: "⚠ 25 min needed, 10 min gap".
- **Visibility:** Badges appear on hover over the gap area or when any activity on that day is selected. Hidden by default to reduce clutter.

### Data

- New backend endpoint: `GET /day-intelligence?tripId=X&date=YYYY-MM-DD`
- Returns intelligence for ALL activities on a given day in one call: place info, logistics (travel time, distance from previous), weather, conflicts.
- Avoids N+1 calls (currently each activity triggers a separate `useActivityIntelligence` query).

### Backend

New Lambda handler or route in `services/day-intelligence.ts`:

1. Validate auth (existing `validateAuth`).
2. Query all activities for the trip on the given date from Supabase.
3. Sort by `starting_time`.
4. For each activity, compute travel time from previous activity (haversine + drive time).
5. Fetch weather once for the day (Open-Meteo).
6. Fetch place details for each activity (SerpAPI) — batch or parallel.
7. Detect conflicts (hours + travel time) using existing `hasHoursConflict` / `hasTravelTimeConflict`.
8. Cache result in DynamoDB with key `{ pk: 'day-intelligence:{tripId}', sk: date }`, 1hr TTL.
9. Return response shape: `{ weather: WeatherData | null, activities: Record<activityId, ActivityIntelligence> }` — weather hoisted to day level, activities keyed by ID. Reuse existing `ActivityIntelligence` TypeScript interface, omitting the `weather` field from each activity entry (it's shared at day level).

### Frontend

- New hook: `useDayIntelligence(tripId, date)` — React Query wrapper, staleTime 1hr.
- New component: `TravelTimeBadge` — renders the connector + badge between events.
- Modified component: `DayColumn` — insert `TravelTimeBadge` between sorted EventBlocks. Travel time badges are only shown in DayView; hidden in WeekView where columns are too narrow. In WeekView, the day health dot serves as the feasibility signal.

## Feature 3: Enriched Activity Cards

### What

Surface opening hours, weather, and travel time directly on EventBlock and DayHeader without requiring selection.

### UI — EventBlock additions

- **Opening hours badge:** Small pill at top-right of card: "9-18" (green) or "Closed" (red). Only shown when hours data is available. Subtle, doesn't dominate the card.
- **Hours conflict indicator:** The existing amber dot (EventBlock top-right) currently combines hours and travel-time conflicts (`hasConflict = intel.conflicts.hours || intel.conflicts.travelTime`). Split into two distinct indicators: amber dot for hours conflicts, separate travel-time warning on the TravelTimeBadge. Enhance the hours dot tooltip to show specifics: "Eiffel Tower closes at 18:00, activity ends at 19:30".

### UI — DayHeader additions

- **Weather chip:** Small icon + temperature in the day header column. Use `iconoir-react` icons (`SunLight`, `HalfMoon`, `Cloud`, etc.) matching the existing `getWmoWeather` icon mapping. e.g. `[SunLight icon] 22°C`. Data from `useDayIntelligence` weather response.
- **Layout:** Weather chip sits to the right of the day label, before collaborator avatars.

### Data

All from `useDayIntelligence` (Feature 2). No additional API calls.

### Components

- Modified: `EventBlock` — conditionally render hours badge when intelligence data is available. Split conflict dot to only show hours conflicts (not travel time).
- Modified: `DayColumn.tsx` (day header section, inline `<div>` ~lines 154-189) — render weather chip in the day header area. Note: there is no separate `DayHeader` component; the header is inline in DayColumn.

## Feature 4: Schedule Feasibility

### What

Aggregate per-activity conflict detection into a day-level health indicator with actionable suggestions.

### UI

- **Day health dot:** Small colored circle in the day header (next to weather chip). Green = no conflicts, amber = warnings (travel time tight), red = conflicts (hours overlap or impossible travel).
- **Health tooltip:** Hovering shows summary: "2 hours conflicts, 1 travel time warning".
- **Auto-fix button:** When a travel time conflict exists, a "Fix" button in the tooltip or in the conflict detail pushes the conflicting activity's start time forward by the travel time gap. Simple calculation: `newStartTime = prevActivity.endTime + travelTimeMinutes`. Auto-fix must update the activity's `startHour` and `duration` via the Yjs Y.Map (through `useActivityMutations`) to maintain real-time sync with collaborators. Do not write directly to Supabase.

### Data

Derived from `useDayIntelligence` response. For each day:
- Count activities with `conflicts.hours === true`.
- Count activities with `conflicts.travelTime === true`.
- Map to green/amber/red: green (0 conflicts), amber (only travel time warnings), red (any hours conflicts).

### Components

- New: `DayHealthIndicator` — renders the dot + tooltip.
- New: `ConflictFixSuggestion` — renders "Fix" button with time suggestion. Must use `useActivityMutations` to update Yjs.
- Modified: `DayColumn.tsx` (day header section) — include `DayHealthIndicator` next to weather chip.

## Architecture

### Backend

```
services/day-intelligence.ts    ← New endpoint
services/lib/conflictDetection.ts  ← Existing, reused
services/lib/haversine.ts          ← Existing, reused
services/lib/serpapi.ts            ← Existing, reused
infra/api.ts                       ← Add GET /day-intelligence route, link [cacheTable, supabaseSecretKey, supabaseUrl, serpApiKey] (same pattern as /activity-intelligence)
```

### Frontend

```
apps/web/components/calendar/
├── hooks/
│   ├── useDayIntelligence.ts    ← New hook
│   └── useActivityIntelligence.ts  ← Existing, still used for detail panel
├── DayMap.tsx                   ← New: MapLibre map component
├── TravelTimeBadge.tsx          ← New: connector + badge between events
├── DayHealthIndicator.tsx       ← New: traffic-light dot + tooltip
├── ConflictFixSuggestion.tsx    ← New: auto-fix button
├── SidebarTabs.tsx              ← New: For You / Map tab switcher
├── EventBlock.tsx               ← Modified: add hours badge
├── DayColumn.tsx                ← Modified: add TravelTimeBadge between events
├── CalendarDashboard.tsx        ← Modified: tabbed sidebar
```

### Information Hierarchy

Not everything visible at once. Three layers:

| Layer | When visible | Content |
|-------|-------------|---------|
| Base | Always | Activity cards (current), day health dot, weather chip in day header |
| Hover | Hover gap between events, hover health dot | Travel time badges, conflict tooltip |
| Active | Select tab / select activity | Map panel, ActivityIntelligencePanel detail |

### Dependencies

- **MapLibre GL JS** (`maplibre-gl`) — install in `apps/web`. Import `maplibre-gl/dist/maplibre-gl.css` in the DayMap component or layout.
- **Amazon Location Maps** — for SigV4-signed tiles, also install `@aws/amazon-location-utilities-auth-helper` in `apps/web`. Fallback to OSM raster tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) if Location Maps auth is not configured.
- **No new AWS resources** — reuses existing DynamoDB, Lambda, API Gateway.

## Out of Scope

- Real-time route computation (using haversine estimate, not routing API).
- Turn-by-turn directions on the map.
- Multi-day route visualization (day-by-day only).
- Booking link integration.
- Walking/transit/driving mode selection (auto-detected from distance only).
- Mobile app (web only for now).
