# Planning Folder Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single `PLANNING.md` with `planning/` folder containing one file per Linear issue.

**Architecture:** Simple file reorganization — split existing content into individual files, update CLAUDE.md references, delete old file.

**Tech Stack:** Markdown files, no code changes

---

## Chunk 1: Create Planning Files

### Task 1: Create TRA-200 planning file

**Files:**
- Create: `planning/TRA-200.md`

- [ ] **Step 1: Create planning folder and TRA-200.md**

Create `planning/TRA-200.md` with content extracted from PLANNING.md:

```markdown
# TRA-200 — Connect calendar to Supabase with Yjs real-time collaboration

**Linear:** [TRA-200](https://linear.app/travyl/issue/TRA-200/connect-calendar-view-to-supabase-with-yjs-real-time-collaboration)
**PR:** [#166](https://github.com/TravylApp/travyl-frontend/pull/166)
**Status:** Merged
**Branch:** `feature/tra-200`

## Goal

Replace all mock data in the calendar view with live Supabase data. Full CRUD on activities, real-time collaboration via Yjs CRDTs, multi-user presence.

## Completed

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

## Known Issues / Deferred

- Mock flight/hotel data still hardcoded in `CalendarDashboard` (`MOCK_FLIGHTS`, `MOCK_HOTELS`)
- `MockTripCard` type still used for real trip data in trips page (misleading name, deferred)
- Trip cover images are all the same Unsplash fallback
```

---

### Task 2: Create TRA-205 planning file

**Files:**
- Create: `planning/TRA-205.md`

- [ ] **Step 1: Create TRA-205.md**

Create `planning/TRA-205.md` with content extracted from PLANNING.md:

```markdown
# TRA-205 — For You Panel + SST Recommendation Engine

**Linear:** [TRA-205](https://linear.app/travyl/issue/TRA-205/for-you-panel-+-sst-recommendation-engine)
**PR:** pending
**Status:** In Progress
**Branch:** `feature/tra-204`

## Goal

Pinterest-style "For You" sidebar on the calendar dashboard where users drag AI-powered activity suggestions onto their trip calendar.

## Completed (Frontend)

- `SuggestionCard` type added to `@travyl/shared/types`
- `mockSuggestions.ts` — 10 Paris activities with realistic data
- `suggestionMapper.ts` — `suggestionToCalendarActivity()` conversion
- `FOR_YOU_PANEL_WIDTH` constant (340px)
- `useSuggestions` hook — React Query fetch to `GET /suggest` with JWT auth, client-side search/category filtering
- `SuggestionCard` component — full-image masonry card with drag
- `ForYouPanel` component — panel shell with search, filters, grid, retry button wired to `refetch()`
- `useCalendarDnd` extended — `onAddFromSuggestion`, type branching
- `CalendarDashboard` integration — DndContext hoist, right column swap, DragOverlay
- Restore-on-delete — suggestions reappear when activities removed
- `useInteractionTracking` hook — fire-and-forget POST to `/interact` (impression, click, drag, dismiss)

## Completed (Backend — API Wiring)

- SST infrastructure: API Gateway, DynamoDB cache, EventBridge bus, Amazon Location PlaceIndex (HERE)
- Lambda functions deployed: `GET /suggest`, `GET /search`, `POST /interact`
- `services/lib/foursquare.ts` — Foursquare Places API enrichment (photos, ratings, prices, descriptions)
- `services/suggest.ts` — Amazon Location discovery → Foursquare enrichment → DynamoDB cache (30min TTL)
- `FoursquareApiKey` SST secret set and linked to suggest Lambda
- Auth: Supabase JWT validation on all endpoints

## Completed (Auth Fix)

- Fixed session persistence: `configureSupabase()` with `createBrowserClient` from `@supabase/ssr`
- Middleware runs on all routes (not just `/trip/*`), refreshes cookies on every request

## Deferred (Personalization — Phase 5-7)

- OpenSearch Serverless collection + vector similarity search
- Amazon Personalize collaborative filtering + contextual re-ranking
- Bedrock Titan embeddings for activity catalog
- Catalog ingestion pipeline (`ingest.ts`, `embed.ts`)
- Image enrichment CDN (S3 + CloudFront)
- Taste vector pipeline (EventBridge subscribers)

## Specs & Plans

- **Spec:** `docs/superpowers/specs/2026-03-17-for-you-api-wiring-design.md`
- **Plan:** `docs/superpowers/plans/2026-03-17-for-you-api-wiring.md`
```

---

## Chunk 2: Update CLAUDE.md and Cleanup

### Task 3: Update CLAUDE.md session start instructions

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update session start section**

Replace lines 5-10 in `CLAUDE.md`:

```markdown
## At the start of each session

Read these three files before doing anything else:
- `PLATFORM.md` — what the product is and who it's for
- `ARCHITECTURE.md` — tech stack, data layer, DB schema, conventions
- `PLANNING.md` — active branch log and current work
```

With:

```markdown
## At the start of each session

Read these files before doing anything else:
- `PLATFORM.md` — what the product is and who it's for
- `ARCHITECTURE.md` — tech stack, data layer, DB schema, conventions
- `planning/TRA-XXX.md` — current branch's planning file (match issue ID from branch name; create if missing)
```

---

### Task 4: Add planning files section to CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add planning files section after Branch + Linear convention**

Insert after line 38 (after "This applies before invoking `/brainstorm`. No Linear issue = no new branch."):

```markdown

## Planning files

Each Linear issue has a planning file at `planning/TRA-XXX.md`. When starting a new feature:

1. Create the Linear issue in the Travyl workspace
2. Create `planning/TRA-XXX.md` from the template
3. Name the branch `feature/tra-XXX`

The planning file tracks: goal, completed work, known issues, and links to Linear + PR.
```

---

### Task 5: Delete old PLANNING.md

**Files:**
- Delete: `PLANNING.md`

- [ ] **Step 1: Delete PLANNING.md**

Remove the root `PLANNING.md` file — content has been migrated to individual planning files.

---

### Task 6: Commit changes

- [ ] **Step 1: Stage and commit**

```bash
git add planning/ CLAUDE.md
git rm PLANNING.md
git commit -m "$(cat <<'EOF'
refactor: split PLANNING.md into per-issue planning files

- Create planning/ folder with TRA-200.md and TRA-205.md
- Update CLAUDE.md to reference planning/TRA-XXX.md
- Delete root PLANNING.md

Each Linear issue now has its own planning file for better
discoverability and context efficiency.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Summary

| Task | Action | Files |
|------|--------|-------|
| 1 | Create | `planning/TRA-200.md` |
| 2 | Create | `planning/TRA-205.md` |
| 3 | Modify | `CLAUDE.md` (session start) |
| 4 | Modify | `CLAUDE.md` (add planning section) |
| 5 | Delete | `PLANNING.md` |
| 6 | Commit | All changes |
