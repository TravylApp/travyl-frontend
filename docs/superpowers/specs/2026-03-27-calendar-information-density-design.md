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
- **Badge content:** Travel time (e.g. "15 min") and transport mode icon (walking icon for <2km, car icon for >=2km). Compact: just "15 min 🚶" or "8 min 🚗".
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
9. Return array of `ActivityIntelligence` objects keyed by activity ID.

### Frontend

- New hook: `useDayIntelligence(tripId, date)` — React Query wrapper, staleTime 1hr.
- New component: `TravelTimeBadge` — renders the connector + badge between events.
- Modified component: `DayColumn` — insert `TravelTimeBadge` between sorted EventBlocks.

## Feature 3: Enriched Activity Cards

### What

Surface opening hours, weather, and travel time directly on EventBlock and DayHeader without requiring selection.

### UI — EventBlock additions

- **Opening hours badge:** Small pill at top-right of card: "9-18" (green) or "Closed" (red). Only shown when hours data is available. Subtle, doesn't dominate the card.
- **Hours conflict indicator:** Existing amber dot (top-right corner) already exists for conflicts. Enhance its tooltip: "Eiffel Tower closes at 18:00, activity ends at 19:30".

### UI — DayHeader additions

- **Weather chip:** Small icon + temperature in the day header column. e.g. "☀ 22°C". Data from `useDayIntelligence` weather response.
- **Layout:** Weather chip sits to the right of the day label, before collaborator avatars.

### Data

All from `useDayIntelligence` (Feature 2). No additional API calls.

### Components

- Modified: `EventBlock` — conditionally render hours badge when intelligence data is available.
- Modified: `DayHeader` (inside `DayColumn`) — render weather chip.

## Feature 4: Schedule Feasibility

### What

Aggregate per-activity conflict detection into a day-level health indicator with actionable suggestions.

### UI

- **Day health dot:** Small colored circle in the day header (next to weather chip). Green = no conflicts, amber = warnings (travel time tight), red = conflicts (hours overlap or impossible travel).
- **Health tooltip:** Hovering shows summary: "2 hours conflicts, 1 travel time warning".
- **Auto-fix button:** When a travel time conflict exists, a "Fix" button in the tooltip or in the conflict detail pushes the conflicting activity's start time forward by the travel time gap. Simple calculation: `newStartTime = prevActivity.endTime + travelTimeMinutes`.

### Data

Derived from `useDayIntelligence` response. For each day:
- Count activities with `conflicts.hours === true`.
- Count activities with `conflicts.travelTime === true`.
- Map to green/amber/red: green (0 conflicts), amber (only travel time warnings), red (any hours conflicts).

### Components

- New: `DayHealthIndicator` — renders the dot + tooltip.
- New: `ConflictFixSuggestion` — renders "Fix" button with time suggestion.
- Modified: `DayHeader` — include `DayHealthIndicator`.

## Architecture

### Backend

```
services/day-intelligence.ts    ← New endpoint
services/lib/conflictDetection.ts  ← Existing, reused
services/lib/haversine.ts          ← Existing, reused
services/lib/serpapi.ts            ← Existing, reused
infra/api.ts                       ← Add GET /day-intelligence route
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

- **MapLibre GL JS** — new npm dependency for the map component.
- **Amazon Location Maps** — already in SST infra for map tiles (or fallback to OSM raster).
- **No new AWS resources** — reuses existing DynamoDB, Lambda, API Gateway.

## Out of Scope

- Real-time route computation (using haversine estimate, not routing API).
- Turn-by-turn directions on the map.
- Multi-day route visualization (day-by-day only).
- Booking link integration.
- Walking/transit/driving mode selection (auto-detected from distance only).
- Mobile app (web only for now).
