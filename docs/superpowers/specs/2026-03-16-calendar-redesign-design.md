# Calendar Page Redesign — Design Spec

## Overview

Full redesign of the trip calendar page from a tab-embedded view into a full-page Outlook-inspired dashboard. Replaces the existing 62KB `CalendarView.tsx` monolith with a modular component architecture, swaps `react-dnd` for `@dnd-kit/core`, and introduces real-time collaboration via y-supabase.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layout | Full-width week grid, top controls, all-day row | Maximizes grid space, clean Outlook feel |
| Event detail | Side panel (slides in from right) | Calendar stays visible and interactive |
| Drag-and-drop | `@dnd-kit/core` | Better accessibility, smoother animations, actively maintained |
| Collaboration | Awareness only (no cursor tracking) | Avatar presence + per-event selection indicators; cursor tracking is overkill for discrete event blocks |
| View modes | Week + Day | Month view rarely useful for short trips; day view useful for packed schedules |
| All-day row | Flights and hotels | Keeps the time grid clean for activities only |
| Sidebar | Collapsed by default, expands on hover | Icon-only collapsed state, overlays grid on expand, doesn't push content |
| Nested blocks | Omitted | Keeping it simple — flat activity list only |
| Real-time sync | y-supabase (Yjs + Supabase Realtime) | Shared activity document with awareness protocol |

## Layout

Full-page dashboard. The calendar is the primary trip interface, not a tab.

### Collapsed sidebar (default)

```
┌──┬──────────────────────────────────────────────┐
│  │ CalendarHeader                                │
│🗺│ [←] Paris, France  Mar 10–14  [Day][Week] [+]│
│📅│────────────────────────────────────────────────│
│📋│ AllDayRow                                      │
│💰│ ✈ CDG Arrival   🏨 Hotel Le Marais ─────── 🏨 │
│⚙│────┬───────┬───────┬───────┬───────┬───────────│
│  │    │ MON   │ TUE   │ WED   │ THU   │ FRI      │
│  │8AM │       │       │       │       │          │
│  │9AM │ █████ │       │ █████ │       │          │
│──│    │       │       │       │       │          │
│👤│    │       │       │       │       │          │
│👤│    │       │       │       │       │          │
└──┴────┴───────┴───────┴───────┴───────┴──────────┘
```

### Expanded sidebar (on hover)

```
┌──────────┬────────────────────────────────────────┐
│          │ CalendarHeader                          │
│ 🗺 Overview │ [←] Paris  Mar 10–14  [Day][Week] [+]│
│ 📅 Calendar│────────────────────────────────────────│
│ 📋 Info    │ AllDayRow                              │
│ 💰 Budget  │──────┬───────┬───────┬───────┬────────│
│ ⚙ Settings│      │ MON   │ TUE   │ WED   │ ...    │
│──────────│ 8AM  │       │       │       │        │
│ Mini Cal │ 9AM  │ █████ │       │ █████ │        │
│ [March]  │      │       │       │       │        │
│──────────│      │       │       │       │        │
│ Online:  │      │       │       │       │        │
│ 👤 Justin │      │       │       │       │        │
│ 👤 Sarah  │      │       │       │       │        │
│ 🔘 Alex   │      │       │       │       │        │
└──────────┴──────┴───────┴───────┴───────┴────────┘
```

### With detail panel open

```
┌──┬──────────────────────────────────────┬────────┐
│  │ CalendarHeader                        │ Detail │
│🗺│ Paris  Mar 10–14  [Day][Week]        │ Panel  │
│📅│───────────────────────────────────────│        │
│📋│ AllDayRow                             │ ───    │
│  │──────┬──────┬──────┬──────┬──────────│ Eiffel │
│  │      │ MON  │ TUE  │ WED  │ ...     │ Tower  │
│  │ 8AM  │      │      │      │         │        │
│  │ 9AM  │ ████ │      │ ████ │         │ 9-11AM │
│  │      │      │      │      │         │ 📍 ...  │
│──│      │      │      │      │         │ 💰 ...  │
│👤│      │      │      │      │         │        │
│👤│      │      │      │      │         │[Edit]  │
└──┴──────┴──────┴──────┴──────┴─────────┴────────┘
```

## Component Architecture

```
CalendarDashboard/
  CalendarDashboard.tsx       — full-page layout orchestrator
  TripSidebar.tsx             — collapsible sidebar (nav, mini-cal, collaborators)
  CalendarHeader.tsx          — trip name, date range, nav arrows, Day/Week toggle, add event
  AllDayRow.tsx               — flight and hotel banners above the time grid
  WeekView.tsx                — week grid orchestrator (renders DayColumns)
  DayView.tsx                 — single-day expanded view
  TimeGutter.tsx              — hour labels column (8AM–10PM)
  DayColumn.tsx               — single day column, renders EventBlocks
  EventBlock.tsx              — one activity (color, title, time, dnd-kit draggable)
  DetailPanel.tsx             — slide-in right panel for event details
  CollaboratorAvatars.tsx     — avatar stack (sidebar) + per-event dots
  MiniCalendar.tsx            — small month calendar for date navigation
```

### Removed from current codebase

These components from the existing implementation are no longer needed:

- `CalendarView.tsx` (62KB monolith) — replaced by the component tree above
- `SplitScreenModal.tsx` — replaced by `DetailPanel.tsx`
- `CompactActivityCard.tsx`, `MinimalActivityCard.tsx`, `ListActivityCard.tsx` — replaced by `EventBlock.tsx`
- Parent/child block logic (`parentId` field) — omitted, flat activities only
- `CollaboratorPresence` type (with cursor tracking) — replaced by `UserAwareness`

### Kept and adapted

- `ItineraryContext.tsx` — rewired to use y-supabase for shared state
- `ActivityCard.tsx` — referenced for detail panel content structure
- `FlightCard.tsx`, `HotelCard.tsx` — adapted for `AllDayRow.tsx` banner format

## Data Model

### CalendarActivity (UI view model)

`CalendarActivity` is a **view model** — it does not replace the Supabase-backed `Activity` type. It is derived from `Activity` via a transform function for calendar rendering.

```typescript
interface CalendarActivity {
  id: string
  title: string
  type: ActivityType  // 'sightseeing' | 'dining' | 'tour' | 'cultural' | etc.
  day: number         // 0-indexed day of trip
  startHour: number   // 24h format, e.g. 9.5 = 9:30 AM
  duration: number    // in hours
  location?: string
  image?: string
  rating?: number
  price?: string
  notes?: string
}
```

**Note:** `color` is not stored — it is derived at render time from `type` via the color map below. This avoids sync hazards with the Yjs CRDT.

Removed from current model: `onCalendar`, `parentId`, `startTime`/`endTime` strings (computed from `startHour` + `duration`).

### Data transform layer

```typescript
// packages/shared/src/viewmodels/calendarViewModel.ts

function activityToCalendarActivity(
  activity: Activity,
  tripStartDate: string  // ISO date of trip day 0
): CalendarActivity
// Computes:
//   day     → diff between activity's itinerary_day date and tripStartDate
//   startHour → parse start_time string to numeric (e.g. "09:30" → 9.5)
//   duration  → diff between end_time and start_time in hours
//   price     → format estimated_cost to string

function calendarActivityToUpdate(
  calendarActivity: CalendarActivity,
  tripStartDate: string
): Partial<Activity>
// Reverse transform for writing changes back to Supabase
```

### ActivityType color map

```typescript
const ACTIVITY_COLORS: Record<string, string> = {
  sightseeing: '#4a7dff',
  dining:      '#e67e22',
  tour:        '#1abc9c',
  cultural:    '#9b59b6',
  shopping:    '#e74c3c',
  nightlife:   '#8e44ad',
  outdoor:     '#2ecc71',
  museum:      '#f39c12',
  transport:   '#3498db',
  hotel:       '#6c7b8a',
}

const DEFAULT_ACTIVITY_COLOR = '#6b7b9e'  // fallback for unknown categories

function getActivityColor(type: string): string {
  return ACTIVITY_COLORS[type] ?? DEFAULT_ACTIVITY_COLOR
}
```

## Real-Time Collaboration (y-supabase)

### Shared document structure

The Yjs document stores persistence-compatible objects (matching the Supabase `Activity` schema), **not** view models. The `CalendarActivity` view model is derived on each client at render time.

```typescript
// Yjs shared types — stores Supabase-compatible Activity objects
const ydoc = new Y.Doc()
const yActivities = ydoc.getArray<Activity>('activities')
const yFlights = ydoc.getArray<Flight>('flights')
const yHotels = ydoc.getArray<Hotel>('hotels')
```

Synced via `y-supabase` provider connected to a Supabase Realtime channel per trip (`trip:{tripId}`).

### Sync lifecycle

1. **Initial hydration:** On page load, fetch activities/flights/hotels from Supabase. Populate the Yjs document. Connect the y-supabase provider.
2. **Live sync:** All local edits (drag-drop, detail panel edits) write to the Yjs document. y-supabase syncs changes to other clients via Supabase Realtime.
3. **Persistence write-back:** y-supabase handles persisting Yjs document state to Supabase. Changes are debounced (500ms) to avoid excessive writes.
4. **Conflict resolution:** Yjs CRDT handles concurrent edits automatically. For simultaneous drags of the same event, last-write-wins at the field level (e.g., two users dragging the same event — the last drop position wins). This is acceptable for a travel planner.
5. **Error handling:** If the provider disconnects, show a "reconnecting..." indicator in the header. Local edits continue in the Yjs doc and sync when reconnected.

### Awareness protocol

```typescript
interface UserAwareness {
  userId: string
  name: string
  avatarInitial: string
  color: string         // assigned collaborator color
  isOnline: boolean
  selectedEventId: string | null   // which event block they have selected
  currentView: 'week' | 'day'
}
```

- Each client sets its awareness state via `provider.awareness.setLocalState()`
- Other clients render presence from `provider.awareness.getStates()`
- No cursor/hover tracking — only online status and selected event

### Where presence appears

| Location | What's shown |
|----------|-------------|
| Sidebar (collapsed) | Stacked avatar circles with green/gray online dots |
| Sidebar (expanded) | Names, online status, "viewing [event name]" |
| Event blocks | Small avatar dot(s) on blocks someone else has selected |
| Detail panel | "Sarah is viewing" when another collaborator has same event open |

## Interactions

### Drag and drop (`@dnd-kit/core`)

- Event blocks are `useDraggable`
- Day columns and time slots are `useDroppable`
- Dragging an event to a different day/time updates `day` and `startHour`
- Drag preview shows a ghost of the event block at 80% opacity
- On drop, the change is applied to the Yjs shared document (syncs to all collaborators)
- Collision detection: `closestCenter` strategy

### View switching

- **Week view (default):** all trip days shown as columns
- **Day view:** click a day header (e.g. "MON 10") to expand that day full-width
- Back to week via the Day/Week toggle or back arrow in day view header
- Smooth transition between views via `motion/react` (Framer Motion v12, already in the project) layout animations

### Detail panel

- Click an event block → panel slides in from right (300px wide)
- Panel overlays the grid edge, doesn't push content
- Shows: title, time, location, price, rating, notes, collaborator presence, edit/remove actions
- Click outside or press X to close
- Clicking a different event swaps the panel content without closing

### Sidebar

- Collapsed by default: ~48px wide, icon-only
- On mouse enter: expands to ~240px, overlays the grid with slight shadow
- On mouse leave: collapses back (with ~200ms delay to prevent flicker)
- Contains: nav links (Overview, Calendar, Info, Budget, Settings), mini month calendar, collaborator list
- Calendar nav link is active/highlighted by default

## View Modes

### Week View

- Columns: one per trip day (not fixed 7-day week — a 5-day trip shows 5 columns)
- Time gutter: 8AM to 10PM in 1-hour increments
- Grid scrolls vertically if viewport is short
- Current time indicator: horizontal red line (if trip is happening now)
- Event blocks positioned absolutely by `startHour` and `duration`
- Left accent border on each event block (lighter shade of event color)

### Day View

- Single column, full width
- Same time gutter, more horizontal space per event
- Events can show more detail inline (location, rating)
- Useful for days with many overlapping or tightly packed activities

## Routing

The calendar dashboard **replaces the entire trip layout**. The current tab-based navigation (`trip-layout-inner.tsx` with `TripTabs`, `TripHero`, map panel) is removed for the calendar view.

### Route structure

```
/trip/[id]              → CalendarDashboard (default, calendar view)
/trip/[id]/info         → Trip info (rendered inside CalendarDashboard with sidebar nav)
/trip/[id]/settings     → Trip settings (same shell)
```

The sidebar nav links (Overview, Calendar, Info, Budget, Settings) control which content panel is shown inside the `CalendarDashboard` shell. Calendar is the default. Other pages render their content in the main area where the grid normally sits. This means:

- `CalendarDashboard.tsx` is the shared layout shell (sidebar + header)
- The calendar grid is one "page" within that shell, not the shell itself
- Existing sub-routes (`/flights`, `/hotels`, `/restaurants`, `/activities`) are consolidated — flights and hotels appear in the all-day row, activities are the calendar events, restaurants are a type of dining activity

### Existing routes removed

- `/trip/[id]/itinerary` — merged into the default calendar view
- `/trip/[id]/activities` — activities are now calendar events
- `/trip/[id]/restaurants` — dining activities on the calendar

## Time Grid Range

The default time range is **7AM to 11PM**. If any event falls outside this range (e.g., 5 AM airport transfer, midnight dinner), the grid range expands to include it with 1-hour padding. The grid scrolls vertically — the viewport shows the most relevant portion, auto-scrolling to the first event of the current/selected day.

## Loading, Empty, and Error States

- **Loading:** Skeleton grid with pulsing placeholder columns and header. No spinner.
- **Empty trip (no activities):** Grid renders with empty columns + centered prompt: "No activities yet. Click + to start planning."
- **Yjs connection error:** Yellow banner below header: "Reconnecting to sync..." with retry. Local edits continue offline.
- **Failed to load trip:** Full-page error with back button to trips list.

## Files to Create

```
apps/web/components/calendar/CalendarDashboard.tsx
apps/web/components/calendar/TripSidebar.tsx
apps/web/components/calendar/CalendarHeader.tsx
apps/web/components/calendar/AllDayRow.tsx
apps/web/components/calendar/WeekView.tsx
apps/web/components/calendar/DayView.tsx
apps/web/components/calendar/TimeGutter.tsx
apps/web/components/calendar/DayColumn.tsx
apps/web/components/calendar/EventBlock.tsx
apps/web/components/calendar/DetailPanel.tsx
apps/web/components/calendar/CollaboratorAvatars.tsx
apps/web/components/calendar/MiniCalendar.tsx
apps/web/components/calendar/types.ts
apps/web/components/calendar/constants.ts
apps/web/components/calendar/hooks/useCalendarDnd.ts
apps/web/components/calendar/hooks/useYjsSync.ts
apps/web/components/calendar/hooks/useCollaboratorPresence.ts
apps/web/components/calendar/hooks/useCalendarNavigation.ts
```

## Files to Modify

```
apps/web/app/trip/[id]/page.tsx              — becomes CalendarDashboard entry point
apps/web/app/trip/[id]/layout.tsx            — simplified to just wrap CalendarDashboard shell
apps/web/app/trip/[id]/trip-layout-inner.tsx  — removed (replaced by CalendarDashboard)
packages/shared/src/types/index.ts           — remove CollaboratorPresence, add UserAwareness, remove parentId/onCalendar from CalendarActivity
packages/shared/src/viewmodels/calendarViewModel.ts — new: data transform functions
packages/shared/src/config/mockItineraryData.ts     — update mock data to match new model
apps/web/components/itinerary/ItineraryContext.tsx   — rewire to y-supabase
```

## Dependencies to Add

```
@dnd-kit/core
@dnd-kit/utilities
y-supabase
yjs
```

## Keyboard & Accessibility

- **Tab:** Navigate between event blocks in reading order (left-to-right, top-to-bottom)
- **Enter/Space:** Open detail panel for focused event
- **Escape:** Close detail panel, deselect event
- **Arrow keys:** Move between events (left/right = days, up/down = earlier/later in day)
- **`@dnd-kit` keyboard sensor:** Drag events with Space to pick up, arrow keys to move, Space to drop
- **ARIA landmarks:** `role="grid"` on week view, `role="gridcell"` on day columns, `role="complementary"` on sidebar and detail panel
- **Screen reader:** Event blocks announce title, time, and day on focus

## Out of Scope

- Nested/sub-activity blocks (parentId)
- Month view
- Mobile app changes (separate effort)
- Budget page implementation (sidebar placeholder only)
- Overview page implementation (sidebar placeholder only)
- Activity creation/discovery flow (uses existing patterns)
