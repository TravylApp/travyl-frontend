# Dashboard Iteration v2 — Design Spec

## Overview

Iteration on the calendar dashboard: add background images to event blocks, redesign the header to Google Docs style with collaborators and share, replace all emoji/SVG icons with iconoir-react, add click-to-create activities on the grid, and wire sidebar nav to placeholder pages.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Event block images | Background image + light overlay, text bottom-left | Rich visual identity, image shows prominently |
| Header style | Google Docs — single row, share/avatars right | Familiar dashboard pattern, collab-focused |
| Icon pack | iconoir-react | Consistent, modern, lightweight icon set |
| Add activity | Click empty time slot on grid | Most intuitive — same pattern as Google Calendar |
| Sidebar pages | "Coming soon" placeholders | Keep scope tight, focus on calendar |
| Collaborators location | Moved from sidebar bottom to header | More visible, Google Docs pattern |

## Event Block Images

### With image (block >= 1hr and `image` field present)

```
┌─────────────────────────┐
│ ▓▓▓ background image ▓▓▓│
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← light colored overlay (activity type color, ~20-30% opacity)
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│░░░░░░░░░░░░░░░░░░░░░░░░░│  ← gradient fade from bottom (rgba(0,0,0,0.7))
│ Eiffel Tower             │
│ 9 AM – 11 AM            │
│ Champ de Mars            │
└─────────────────────────┘
│← 3px left accent border
```

- Background image fills the entire block via `background-size: cover`
- Colored overlay: activity type color at ~20-30% opacity (light enough to see the image)
- Text at bottom-left inside a gradient container: `linear-gradient(transparent, rgba(0,0,0,0.7))`
- Text has subtle `text-shadow` for legibility
- Left accent border: 3px solid, lighter shade of activity color
- Hover: slight lift (`translateY(-1px)`) + box shadow

### Without image (no `image` field or block < 1hr)

Solid background color (same as current implementation). Text positioned at top-left with padding. No gradient needed.

### Threshold

- Blocks with duration >= 1 hour AND a non-null `image` field: show background image
- All others: solid color fallback

### Mock data update

Add `image` URLs to `MOCK_CALENDAR_ACTIVITIES` in `packages/shared/src/config/mockItineraryData.ts` for activities that should show images. Use Unsplash URLs. Example:

```typescript
{ id: 'cal-1', title: 'Eiffel Tower', ..., image: 'https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=400&h=300&fit=crop' },
{ id: 'cal-3', title: 'Louvre Museum', ..., image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=300&fit=crop' },
```

Not every activity needs an image — some (like "Lunch: Le Marais") should stay imageless to test the solid-color fallback.

## Dashboard Header

### Layout

```
[←]  Paris, France  |  [Week][Day]  [+ New Activity]  ···spacer···  [👤👤👤]  [Share]  [⋯]
     Mar 10 – 16
```

### Sections

**Left group:**
- Back button (iconoir `NavArrowLeft`)
- Trip name (14px semibold) + date range (10px gray) stacked

**Left-center group (after 1px divider):**
- Week/Day segmented toggle (same as current, compact)
- "+ New Activity" outlined button (iconoir `Plus` icon + text)

**Right group:**
- Collaborator avatar stack — overlapping initial-based circles (colored background + white letter) with online/offline dots. Uses `avatarInitial` and `color` from `UserAwareness` — no image URLs needed.
  - Online: green dot
  - Offline: gray dot, avatar at 45% opacity
  - No "2 online" text — just the visual dots
- Share button — primary blue, iconoir `ShareAndroid` icon + "Share" text
- More menu — iconoir `MoreHoriz` icon, opens dropdown (future: rename trip, export, delete)

### Props

```typescript
interface CalendarHeaderProps {
  tripName: string
  dateRange: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onBack: () => void
  onAddEvent: () => void
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
  collaborators: UserAwareness[]
  onShare: () => void
}
```

Collaborators are passed from CalendarDashboard (already available via useYjsSync). The CollaboratorAvatars component in the sidebar is removed — avatars now live exclusively in the header.

## Click-to-Create Activities

### Interaction flow

1. User clicks an empty area in a DayColumn
2. Compute the clicked time from the Y position: `clickedHour = timeRange.startHour + (offsetY / HOUR_HEIGHT)`
3. Snap to nearest 30-minute increment
4. Create a new CalendarActivity with:
   - `id`: generated UUID
   - `title`: "" (empty, to be filled)
   - `type`: "sightseeing" (default)
   - `day`: the column's dayIndex
   - `startHour`: snapped click position
   - `duration`: 1 (default 1 hour)
   - All other fields: undefined
5. Add the activity via `useYjsSync.addActivity()`
6. Select the new activity (opens DetailPanel)
7. DetailPanel opens with the title field focused for immediate typing

### New hook method

Add `addActivity` to `useYjsSync` return type. Updated interface:

```typescript
interface YjsSyncResult {
  activities: CalendarActivity[]
  collaborators: UserAwareness[]
  connectionStatus: ConnectionStatus
  isLoading: boolean
  error: string | null
  updateActivity: (id: string, updates: Partial<CalendarActivity>) => void
  moveActivity: (id: string, newDay: number, newStartHour: number) => void
  removeActivity: (id: string) => void
  addActivity: (activity: CalendarActivity) => void  // NEW
}
```

CalendarDashboard destructures `addActivity` and passes a `handleCreateActivity(dayIndex, startHour)` callback down through WeekView/DayView to DayColumn.

### DayColumn changes

- Add `onCreateActivity(dayIndex: number, startHour: number)` callback prop
- Add `onClick` handler on the column body (not on event blocks — they stopPropagation)
- Compute time from click Y position
- **Click vs drag disambiguation:** Only trigger create if no drag occurred. Use a `mousedown`/`mouseup` pair with a small distance threshold (< 5px movement = click, >= 5px = drag was attempted). This prevents accidental activity creation during drag operations.

### Prop threading

The `onCreateActivity` prop must be threaded through:
- `CalendarDashboard` → `WeekView` → `DayColumn`
- `CalendarDashboard` → `DayView` → `DayColumn`

### DetailPanel title editing

When a new activity is created with an empty title, the DetailPanel renders the title as an `<input>` element (instead of `<h2>`) with `autoFocus`. Once the user types a title and blurs/presses Enter, it calls `updateActivity(id, { title })` and switches back to display mode. Existing activities with titles render as `<h2>` — clicking the title switches to edit mode.

## iconoir-react Icons

### Install

```bash
npm install -w @travyl/web iconoir-react
```

### Icon mapping

| Location | Current | iconoir-react |
|----------|---------|---------------|
| Sidebar: Overview | 🗺 emoji | `Map` |
| Sidebar: Calendar | 📅 emoji | `Calendar` |
| Sidebar: Info | 📋 emoji | `PageEdit` |
| Sidebar: Budget | 💰 emoji | `Wallet` |
| Sidebar: Settings | ⚙ emoji | `Settings` |
| Header: Back | SVG arrow | `NavArrowLeft` |
| Header: Add | SVG plus | `Plus` |
| Header: Share | SVG share | `ShareAndroid` |
| Header: More | "⋯" text | `MoreHoriz` |
| Detail: Time | 🕐 emoji | `Clock` |
| Detail: Location | 📍 emoji | `MapPin` |
| Detail: Price | 💰 emoji | `Wallet` |
| Detail: Rating | ⭐ emoji | `Star` (with `fill="currentColor"`) |
| Detail: Close | "✕" text | `Xmark` |

All icons rendered at 16-18px, `strokeWidth={1.5}`, inheriting `currentColor`.

## Sidebar Pages (Placeholders)

### State management

Add `activeNav` state to CalendarDashboard and pass it to TripSidebar:

```typescript
const [activeNav, setActiveNav] = useState('calendar')

// In render:
<TripSidebar
  activeNav={activeNav}
  onNavChange={setActiveNav}
  // ... other props
/>
```

Currently `onNavChange` is not passed to TripSidebar — this wiring must be added.

### Conditional rendering

When `activeNav !== 'calendar'`, replace the grid area with a placeholder:

```tsx
{activeNav === 'calendar' ? (
  // ... existing calendar grid
) : (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <p className="text-gray-400 text-sm">{activeNav} — coming soon</p>
    </div>
  </div>
)}
```

The header, sidebar, and all-day row remain visible regardless of active nav.

## Files to Modify

```
apps/web/components/calendar/EventBlock.tsx        — background image + bottom-left text
apps/web/components/calendar/CalendarHeader.tsx     — Google Docs style, collaborators, iconoir
apps/web/components/calendar/CalendarDashboard.tsx  — pass collaborators to header, activeNav state, click-to-create, thread onCreateActivity
apps/web/components/calendar/TripSidebar.tsx        — iconoir icons, remove CollaboratorAvatars import
apps/web/components/calendar/DetailPanel.tsx        — iconoir icons, editable title input for new activities
apps/web/components/calendar/DayColumn.tsx          — click handler for creating activities (with drag disambiguation)
apps/web/components/calendar/WeekView.tsx           — thread onCreateActivity prop to DayColumn
apps/web/components/calendar/DayView.tsx            — thread onCreateActivity prop to DayColumn
apps/web/components/calendar/hooks/useYjsSync.ts   — add addActivity method
packages/shared/src/config/mockItineraryData.ts     — add image URLs to mock calendar activities
```

## Files to Remove / Deprecate

```
apps/web/components/calendar/CollaboratorAvatars.tsx — no longer used (avatars inline in header)
```

## Dependencies to Add

```
iconoir-react
```

## Out of Scope

- Share functionality (button is wired but handler is a no-op)
- More menu dropdown (button renders, no dropdown)
- Overview, Info, Budget, Settings page content (placeholder only)
- Activity type picker in detail panel
- Image upload for activities
- Mobile layout changes
