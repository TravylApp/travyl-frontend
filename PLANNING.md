# Travyl — Planning Log

Active log of work per branch. Add an entry when a branch starts, update as work progresses, mark merged when done.

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
