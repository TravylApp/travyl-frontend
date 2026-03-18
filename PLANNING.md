# Travyl — Planning Log

Active log of work per branch. Add an entry when a branch starts, update as work progresses, mark merged when done.

---

## `feature/tra-200` — Connect calendar to Supabase with Yjs real-time collaboration
**Linear:** [TRA-200](https://linear.app/travyl/issue/TRA-200/connect-calendar-view-to-supabase-with-yjs-real-time-collaboration)
**Status:** Complete ✅
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

## `feature/tra-205` — For You Panel + SST Recommendation Engine
**Linear:** [TRA-205](https://linear.app/travyl/issue/TRA-205/for-you-panel-+-sst-recommendation-engine)
**Status:** In Progress (Frontend Complete, Backend Deferred)
**PR:** (pending)
**Branch:** `feature/tra-204` (working branch)

### Goal
Pinterest-style "For You" sidebar on the calendar dashboard where users drag AI-powered activity suggestions onto their trip calendar.

### Completed (Frontend)
- `SuggestionCard` type added to `@travyl/shared/types`
- `mockSuggestions.ts` — 10 Paris activities with realistic data
- `suggestionMapper.ts` — `suggestionToCalendarActivity()` conversion
- `FOR_YOU_PANEL_WIDTH` constant (340px)
- `useSuggestions` hook — mock data, search, category filtering
- `SuggestionCard` component — full-image masonry card with drag
- `ForYouPanel` component — panel shell with search, filters, grid
- `useCalendarDnd` extended — `onAddFromSuggestion`, type branching
- `CalendarDashboard` integration — DndContext hoist, right column swap, DragOverlay
- Restore-on-delete — suggestions reappear when activities removed

### Deferred (Backend - Phase 4-7)
- SST infrastructure setup (`sst.config.ts`, `infra/`, `services/`)
- OpenSearch Serverless collection
- DynamoDB cache layer
- EventBridge interaction bus
- Lambda functions: suggest, search, interact
- Amazon Personalize integration
- Bedrock Titan embeddings
- API wiring in frontend (React Query)

**Plan:** `docs/superpowers/plans/2026-03-17-for-you-panel.md`
