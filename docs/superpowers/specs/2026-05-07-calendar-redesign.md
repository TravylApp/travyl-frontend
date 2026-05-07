# Calendar Redesign

**Date:** 2026-05-07
**Status:** Approved (verbal)
**Trip:** Auckland, New Zealand (Jun 1-7, 2026) — 34 activities

## Problems with Current Implementation

1. **Clunky three-column layout** — mini month + calendar grid + suggestions panel all crammed with poor proportions. The For You panel is clipped (overflow hidden cuts off content).
2. **Redundant date info** — top toolbar shows trip name + dates, day strip shows individual days, mini month calendar shows the same month. Three places showing overlapping info.
3. **Day view only** — only single-day view renders, WeekView component is implemented but unused. No easy way to see the whole week.
4. **96+ React duplicate-key errors** — some list rendering has broken keys.
5. **1120-line CalendarDashboard** — monolithic, too many responsibilities.
6. **DayColumn has ~50 props** — severe prop drilling.
7. **Fixed 100vh layout** — `position: fixed; inset: 0; z-index: 40` causes mobile viewport issues.
8. **No week navigation** — no arrow buttons to move between weeks, only day strip clicks.

## Design: Three-Column Clean Layout

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Top Bar: Auckland, New Zealand · Jun 1–7, 2026                 │
│  [<]  Week of Jun 1, 2026  [>]   [Week] [Day]   [+ New] [Share]│
├──────────┬───────────────────────────────────────┬───────────────┤
│  Dates   │  Week View (7 columns)                │  For You      │
│          │  ┌────┬────┬────┬────┬────┬────┬────┐ │  ──────────  │
│  Jun     │  │MON │TUE │WED │THU │FRI │SAT │SUN │ │  Search...    │
│  ┌──┐    │  ├────┼────┼────┼────┼────┼────┼────┤ │  ┌─────────┐ │
│  │1 │    │  │    │    │    │    │    │    │    │ │  │Sugg.    │ │
│  ├──┤    │  │ 9a │ 9a │    │    │    │    │    │ │  │cards    │ │
│  │2 │    │  │----│----│    │    │    │    │    │ │  │scroll   │ │
│  │3 │    │  │Ons.│Alb.│    │    │    │    │    │ │  │here     │ │
│  │4 │    │  │    │    │    │    │    │    │    │ │  │         │ │
│  │5 │    │  │    │    │    │    │    │    │    │ │  └─────────┘ │
│  │6 │    │  └────┴────┴────┴────┴────┴────┴────┘ │             │
│  └──┘    │                                       │ Events | Map│
│          │  Hours scroll vertically              │             │
│ Trip     │  Days scroll horizontally if needed   │             │
│ Summary  │                                       │             │
├──────────┴───────────────────────────────────────┴─────────────┤
```

### Column Details

**Left Column (~180px) — Date Navigator**
- Compact mini month calendar (no change from current MiniMonthCalendar)
- Trip summary below: Days, Activities count
- No duplicate date range text — that lives in the top bar only
- Week arrows (prev/next) could go here or in top bar

**Center Column (flex-1) — Calendar Grid**
- Default view: **week view** showing all 7 days with event blocks
- Click a day → switches to single-day view (DayView)
- Top of grid has day headers: MON, TUE, WED... with date numbers
- Hour gutter (7 AM – 11 PM) with grid lines
- Event blocks as compact cards with category dot + title + time
- Vertical scroll for hours, horizontal scroll for days (if week view is too wide)
- Current time indicator line (when viewing today)
- Resize handles on event blocks remain
- Drag-and-drop remains via dnd-kit

**Right Column (~320px) — Context Panel**
- Proper overflow-y:auto — no more clipping
- For You / Events / Map tabs at top
- Suggestion cards scroll properly within panel
- When an event is selected, slides in event detail view
- Resizable? Yes — keep the current resize handle pattern

### Top Bar (restructured)
- Trip name + date range (concise, one line)
- Week navigation: `<` and `>` arrows + "Week of Jun 1, 2026" label
- View toggle: Week | Day (pill buttons)
- Right side: +New button, Share button
- Collaboration avatars (from CalendarToolbar)

### Event Block Redesign
Current: Full-width colored blocks with lots of text
New: Compact cards with:
- Category color dot (left edge accent)
- Activity name (bold)
- Time range (muted)
- Location name (muted, second line)
- No background color by default — just border-left accent
- Hover shows subtle surface background
- Poll bar remains but more compact

### What's removed
- The old redundant day strip (Week view replaces it)
- Duplicate date text from multiple locations
- The separate CalendarToolbar component merged into top bar
- Fixed 100vh positioning — use normal flex layout

### What stays the same
- Yjs real-time sync infrastructure (hooks, providers)
- dnd-kit drag-and-drop
- Poll voting system
- Activity mutations CRUD
- MiniMonthCalendar component (mostly)
- ForYou panel data fetching (useSuggestions, etc.)
- Collaborator presence

## Component Architecture

```
CalendarPage (page.tsx — minimal, just shell)
└── CalendarShell (new — layout orchestrator)
    ├── CalendarTopBar (restructured from CalendarToolbar)
    │   ├── WeekNavigator (< > arrows + week label)
    │   ├── ViewToggle (Week | Day pills)
    │   └── ActionButtons (New, Share, collaborator avatars)
    ├── CalendarLayout (3-column flex container)
    │   ├── DateNavColumn (left ~180px)
    │   │   ├── MiniMonthCalendar (reuse existing)
    │   │   └── TripSummary (compact)
    │   ├── CalendarGrid (center, flex-1)
    │   │   ├── WeekView (default view, updated)
    │   │   │   └── DayColumn × 7 (with resizable widths)
    │   │   └── DayView (single-day, click-to-zoom)
    │   │       └── DayColumn × 1
    │   └── ContextPanel (right ~320px, scrollable)
    │       └── SidebarTabs (ForYou/Events/Map — reuse existing)
    └── FloatingOverlays
        ├── ActivityEditModal
        ├── CardPopover
        ├── ActivityContextMenu
        └── PollBar (inline in event blocks)
```

### Data Flow (unchanged from current)
- `YjsTripProvider` wraps the page
- `useYjsSync` observes Y.Map changes, flushes to Supabase
- `useActivityMutations` provides CRUD
- `useCalendarDnd` handles drag-and-drop
- `useCollaboratorPresence` for real-time awareness

### Key Files to Create
1. `components/calendar/CalendarShell.tsx` — new layout orchestrator
2. `components/calendar/CalendarTopBar.tsx` — restructured top bar

### Key Files to Significantly Modify
1. `components/calendar/CalendarDashboard.tsx` — gut into CalendarShell, removing ~700 lines of layout cruft
2. `components/calendar/WeekView.tsx` — make it the default view, fix props
3. `components/calendar/DayColumn.tsx` — reduce props
4. `components/calendar/EventBlock.tsx` — cleaner card design

### Key Files to Keep as-is
- All hooks (useYjsSync, useActivityMutations, useCalendarDnd, etc.)
- MiniMonthCalendar
- SidebarTabs / ForYouPanel / EventsPanel
- PollBar
- All modals and overlays
