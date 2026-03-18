# Travyl — Planning Log

Active log of work per branch. Add an entry when a branch starts, update as work progresses, mark merged when done.

---

## `feature/tra-204` — Trip sharing & post-it notes
**Linear:** [TRA-204](https://linear.app/travyl/issue/TRA-204/trip-sharing-and-post-it-notes)
**Status:** In Progress
**PR:** —

### Goal
Add Google Docs-style trip sharing (private/link/public visibility, per-collaborator roles, email invite flow) and free-floating post-it notes on the calendar canvas via Shift+Click.

### Design & Plan
- Spec: `docs/superpowers/specs/2026-03-17-trip-sharing-design.md`
- Plan: `docs/superpowers/plans/2026-03-17-trip-sharing.md` (20 tasks)

### Completed
- Task 1 ✅ — Schema migration: `visibility`/`link_permission` on `trips`, extended `trip_collaborators`, new `trip_notes` table with RLS
- Task 2 ✅ — Updated `Trip` type, added `TripNote`/`TripCollaborator`/`CollaboratorRole`/`TripVisibility`/`LinkPermission` to shared types

### In Progress
- Task 3: `pickColor` utility (next up — Tasks 3–20 remaining)

---

## `feature/tra-200` — Connect calendar to Supabase with Yjs real-time collaboration
**Linear:** [TRA-200](https://linear.app/travyl/issue/TRA-200/connect-calendar-view-to-supabase-with-yjs-real-time-collaboration)
**Status:** In Progress
**PR:** [#166](https://github.com/TravylApp/travyl-frontend/pull/166)

### Goal
Replace all mock data in the calendar view with live Supabase data. Full CRUD on activities, real-time collaboration via Yjs CRDTs, multi-user presence.

### Completed
- `activityMapper.ts` — bidirectional conversion between DB `activity` rows and `CalendarActivity` objects (time parsing, date math, type mapping, midnight clamping)
- `YjsTripProvider` — React context providing `Y.Doc` and `Y.Map<"activities">` per trip, using `y-supabase` as transport
- `useYjsSync` — observes Y.Map changes, debounced 1s flush to Supabase, tab-refocus reconciliation
- `useTripActivities` — fetches trip + activities from Supabase on mount, hydrates Y.Map
- `useActivityMutations` — CRUD: immediate Supabase write for create/delete, Y.Map-only for move/update
- `useCollaboratorPresence` — rewritten to use Supabase Realtime presence broadcast
- `CalendarDashboard` — rewired to consume real hooks, fixed Rules of Hooks violation (useCallback before early returns)
- Trip route wrapped with `YjsTripProvider` and auth gate
- Auth: fixed session persistence, signup silent-failure detection, loading skeleton in navbar
- `CreateTripModal` — new component: 4-field form, Nominatim destination autocomplete, Supabase insert, React Query cache invalidation
- Trips page: removed `MOCK_TRIPS` fallback, wired modal to "Plan a Trip" buttons
- DB migration: renamed `trips` columns (`trip_name→title`, `starting_date→start_date`, `ending_date→end_date`, `trip_status→status`), added `destination` column
- Drag-and-drop fixes: correct `active.data.current.activity` access, removed nested `overflow-auto` from WeekView, `moveActivity` now shifts `endDay` by same delta as `day`
- TRA-202 collaborator awareness UI: `selectedDayIndex` broadcast, avatar tooltip in `CalendarHeader`, avatar stack in `DayColumn` day header
- Fixed `@travyl/shared` sub-path import violations in all 4 calendar hooks

### In Progress / Known issues
- Mock flight/hotel data still hardcoded in `CalendarDashboard` (`MOCK_FLIGHTS`, `MOCK_HOTELS`)
- `MockTripCard` type still used for real trip data in trips page (misleading name, deferred)
- Trip cover images are all the same Unsplash fallback

---

## `feature/tra-205` — Overlap column sharing (Outlook-style)
**Linear:** [TRA-205](https://linear.app/travyl/issue/TRA-205/overlap-column-sharing-outlook-style-side-by-side-blocks)
**Status:** Design spec written, not yet implemented

### Goal
When activities overlap in time on the trip calendar, split the day column into equal-width sub-columns so all activities are visible side-by-side — like Outlook and Google Calendar.

### Design decisions
- Smart columns: blocks split only where they overlap, expand back to full width otherwise
- Equal width, 4px gap between sub-columns
- Max 3 visible side-by-side; 4th+ shows "+N more" badge
- Images always shown in split blocks
- Live drag preview: columns split as user hovers over occupied time slots
- Pure client-side layout — no schema/migration/Yjs changes

### Spec
- `docs/superpowers/specs/2026-03-17-overlap-columns-design.md`

### Files to change
- `apps/web/components/calendar/utils.ts` — add `computeOverlapLayout()` algorithm
- `apps/web/components/calendar/EventBlock.tsx` — accept `column`, `totalColumns` props
- `apps/web/components/calendar/DayColumn.tsx` — run layout, pass results, render overflow badge
- `apps/web/hooks/useCalendarDnd.ts` — compute `pendingActivity` for drag preview

### Completed
- (none yet — spec only)
