# Itinerary Overview — At-a-Glance Day Slide

**Status:** Draft · approved via brainstorm
**Branch:** develop (per user — no separate feature branch)
**Mockup:** `.superpowers/brainstorm/139119-1778159964/day-slide-v2.html`

## Problem

Today the "At a Glance" section of the Itinerary Overview (`apps/web/components/itinerary/ItinerarySection.tsx`, `GlanceView` at L159) shows a single day with four time-of-day shells (Morning/Afternoon/Evening/Late Night) — each repeating a Random/Culture/Food/Sights filter row plus a search input. With most days near-empty during early planning, the screen is dominated by repeated empty controls under a generic destination hero. It does not deliver an "at a glance" feel and the empty state is discouraging.

## Goal

Replace the current `GlanceView` with a slide-style, one-day-at-a-time presentation: a horizontal card whose left half is editorial text (AI-generated narrative + a row-by-row moment list that links into the calendar) and whose right half is a large representative image keyed off the day's standout moment. The view auto-syncs with calendar / day-plan changes.

## Out of scope

- Mobile (Expo) parity — separate issue
- Backend image-generation service — use existing destination images / SerpAPI keyed off the top moment
- Bedrock prompt iteration beyond an initial second-person literary voice
- Calendar route (`/trip/[id]/calendar`) — only deep-link targets are added
- The Compact / time-group / quick-fill section beneath At-a-Glance (`compactOpen` block at L1334-onward of `ItinerarySection.tsx`) — left untouched in this issue

## Design

### Layout

A single horizontal slide rendered in place of `GlanceView`'s output:

- **Container.** `max-w-[1480px]`, centered, `min-h: 580px`, `rounded-3xl`, `border border-line`, soft shadow.
- **Two-column grid.** `grid-cols: 1fr 1.25fr` (text-left, image-right) on viewports ≥ 1024px. Below 1024px the columns stack (text first, image second; image height fixed at ~320px).
- **Side nav arrows.** Two circular buttons hanging off the slide's left and right edges (translateY -50%). Hidden on screens < 1024px (collapse inside the card edges).

### Left panel (text)

Padding `48px 52px 44px`, vertical stack:

1. **Day header.** `Day N` (Fraunces serif, weight 500, 28px) + date (`Mon · Jun 1`, eyebrow caps, muted).
2. **AI narrative block.**
   - `Story` eyebrow (warm-tone, with ✦ glyph).
   - `<h2>` headline — Fraunces serif, 48px, 1.04 line-height, max 14ch. Last 1–2 words italicized via inline `<em>` (the AI returns them tagged).
   - `<p>` 1–2 sentence intro — Fraunces italic, 16px, max 44ch.
   - On empty days, the eyebrow becomes `Suggestion` and the body invites action ("A blank page worth filling…").
3. **Moments list** (pushed to bottom via `margin-top: auto`):
   - Border-top divider, then a vertical list of rows.
   - Each row is a real `<a>` to `/trip/[tripId]/calendar?activity={id}` (existing route — calendar respects this query param via `useEffect` we add).
   - Row grid: `grid-cols: 110px 1fr auto` → time/period | activity title | trailing arrow.
   - Time is **either** an absolute time (`2:30 PM`) **or** a coarse period (`Evening`) — picked by whichever the activity exposes.
   - On hover, the row's left padding nudges 6px and the arrow translates 3px.
   - **Empty-slot rows** appear for periods the AI judges meaningful but unfilled, styled as a dashed `+ Add sunset and dinner`. Their `href` deep-links the calendar at the right slot: `/trip/[tripId]/calendar?day={n}&slot=evening`.

What we deliberately do **not** show (calculable / redundant):
- Activity count, total spend, walking distance, "X of N" page counter, "Today's moments" heading, "Open day →" CTA, image-featured caption.

### Right panel (image)

- Background image fills the panel, `bg-cover center`. On hover (slide-level), the image scales 1.03 over 800ms.
- Bottom 40% gets a subtle dark gradient for legibility headroom.
- One floating chip top-right: weather (e.g. `☀ 78°`) — the only data not derivable from activities.
- No caption / no labels on the image. Its job is atmosphere.

### Pip pager (below slide)

- One pip per day, full row, evenly spaced via `flex-1 min-w-[14px] max-w-[60px]`.
- Three states:
  - **Active** — solid ink, height 7px (vs 5px default).
  - **Has activities** — `#b8c5d4`.
  - **Empty** — `#d8dde4`.
- Click any pip → jump to that day. Horizontal-scroll-overflow on narrow viewports (no scrollbars shown).

### Auto-sync indicator

Small green-pulsing dot strip below the pager: "Story & moments regenerate when activities change · ← → to navigate." This is real — the narrative debounce-regenerates on calendar changes (see Data flow below).

## Data flow

### What stays the same

- `useItineraryScreen(tripId)` continues to provide `trip` + days. We keep using `ItineraryDayViewModel[]` from `@travyl/shared`.
- Calendar route (`/trip/[id]/calendar`) is the source of truth and the deep-link target.

### What changes

1. **New shared hook `useDayStory(tripId, dayIndex)`** in `packages/shared/src/hooks/`.
   - Inputs: trip id, day index, the `ItineraryDayViewModel` for that day.
   - Output: `{ headline, headlineEm, narrative, featuredImageUrl, isLoading, isStale }`.
   - Computes a stable cache key from the activities' `(name, type, startHour, day)` tuple for that day. Cache key changes ⇒ regenerate.
   - Cache layer: React Query, `staleTime: Infinity` (story stays valid until activities for that day change). Persist to `localStorage` keyed `travyl:day-story:{tripId}:{dayIndex}:{hash}` so reloads don't refetch.
   - Generation calls a new web API route `POST /api/day-story` (Next.js app route under `apps/web/app/api/day-story/route.ts`).

2. **New API route `POST /api/day-story`**.
   - Body: `{ tripId, dayIndex, destination, activities: Array<{ name, type, startHour }>, isFirstDay, isLastDay, dateLabel }`.
   - Auth: validate Supabase session via `createServerClient` (existing pattern in other `/api/*` routes — verify caller can view `tripId` via `canViewTrip`).
   - Calls AWS Bedrock (Claude Haiku 4.5 — fast + cheap, see ARCHITECTURE.md `services/lib/`). Prompt asks for: a short editorial headline (≤ 8 words, with the last 1–2 words wrapped `<em>`), a 1–2 sentence narrative intro (second person, present tense, slightly literary), and a `featuredMoment` index (the activity to key the image off).
   - Returns `{ headline, narrativeHtml, featuredActivityIndex }`. Server-side response cached in DynamoDB recommendation cache (existing `lib/cache.ts` pattern, key `day-story:{tripId}:{dayIndex}:{hash}`, TTL 24h).
   - Uses Bedrock IAM grant already established in `infra/api.ts` for the recommendation engine (extend existing Lambda perms; no new infra primitives needed for the route itself since Next.js handles it server-side from Vercel/Amplify — but Bedrock SDK call from the API route **must** use AWS creds available to the web app).

   **Note on AWS access from the Next.js API route.** The web app currently runs on Amplify; calling Bedrock from a Next.js API route requires AWS creds on the web runtime. Two options, decide during implementation:
   - **(a)** Proxy through the existing SST API Gateway (`services/`) — add a new Lambda `services/day-story.ts` and call it from the Next.js route with the user's Supabase JWT. Reuses existing auth + cache patterns.
   - **(b)** Add IAM creds to the Amplify environment and call Bedrock directly from the Next route.

   **Default to (a)** — it's the established pattern in this repo, reuses `services/lib/cache.ts` and `services/lib/auth.ts`, and avoids a new credential surface.

3. **Featured image source.** Pick by priority:
   1. If `featuredActivityIndex` from the AI response points at an activity with an image (most do — Foursquare/SerpAPI populate `activity_data.image`), use that.
   2. Else, query SerpAPI / Foursquare for `{activity.name} {destination}` (existing `/api/places` route already does this — reuse it).
   3. Else, fall back to `useDayImages(destination, days.length)` (already used by current `GlanceView` for day banners — see `ItinerarySection.tsx` L202).

4. **Auto-sync trigger.** `useDayStory` invalidates by hash, so any Yjs-driven activity change for the visible day naturally re-keys and refetches. Debounce client-side: wait 1.5s after the last calendar mutation before issuing a new `/api/day-story` call (matches the existing `useYjsSync` 1s flush + 0.5s buffer).

### Calendar deep-link target

The calendar page already accepts query params via `useSearchParams` in some sub-components but does not currently scroll/highlight a specific activity from the URL. We need a small addition to `apps/web/app/(dashboard)/trip/[id]/calendar/page.tsx`:
- Read `?activity={id}` on mount, scroll the calendar to that activity's day + hour, briefly highlight it.
- Read `?day={n}&slot={morning|afternoon|evening|latenight}` for empty-slot rows: scroll to that day, open the create-activity dialog at that slot (the existing "click empty slot to create" flow).

This is a small, isolated addition; it does not require redesigning the calendar.

## Components & files

```
apps/web/components/itinerary/
  GlanceView.tsx                     ← NEW. Replaces inline GlanceView in ItinerarySection.tsx
  glance/
    DaySlide.tsx                     ← NEW. The horizontal card itself
    DaySlideTextPanel.tsx            ← NEW. Left panel: header, narrative, moments
    DaySlideImagePanel.tsx           ← NEW. Right panel: image + weather chip
    DayMomentRow.tsx                 ← NEW. Single row, links to calendar
    DayPipPager.tsx                  ← NEW. Bottom pager
    glance.tokens.ts                 ← NEW. Spacing/typography constants for the slide

apps/web/components/itinerary/
  ItinerarySection.tsx               ← MODIFIED. Drop the inline GlanceView (L159–~970), import the new GlanceView. Keep the header (L1199-1310) — those controls (Regenerate menu, History toggle, Calendar/Map buttons) live above the slide.

apps/web/app/api/
  day-story/route.ts                 ← NEW. Calls SST Lambda, returns story JSON

apps/web/app/(dashboard)/trip/[id]/calendar/
  page.tsx                           ← MODIFIED. Read ?activity / ?day&slot query params and scroll/highlight

packages/shared/src/hooks/
  useDayStory.ts                     ← NEW. React Query + localStorage persistence

packages/shared/src/services/
  dayStory.ts                        ← NEW. Fetch wrapper for /api/day-story

packages/shared/src/types/
  index.ts                           ← MODIFIED. Add DayStory, DayStoryRequest types

services/
  day-story.ts                       ← NEW. Lambda. Bedrock call + DynamoDB cache.

infra/
  api.ts                             ← MODIFIED. Wire POST /day-story route to the new Lambda; bind cache table + Bedrock perms.
```

## Edge cases & error handling

- **No activities at all (Day 1, fresh trip).** Render the slide with the AI narrative in "Suggestion" mode, no moment rows except a single `+ Plan this day` empty row that links to `?day={n}&slot=morning`.
- **Bedrock failure / timeout.** Show a subtle skeleton on the headline + narrative, then fall back to a templated headline (`Day {n} in {destination}`) and the day's first activity name as the narrative. Image still renders. Don't surface a toast — this is editorial chrome, not core functionality.
- **No internet / offline.** Story cache from localStorage hydrates; if cache miss, render the templated fallback above. Pip pager + moment list still work (data is local).
- **First/last day pip nav.** Left arrow disabled on day 1, right arrow disabled on day N. Arrow keys honor the same disable state.
- **Trip with one day.** Hide the side arrows and pip pager. Slide stretches to full width as designed.
- **Trip with many days (e.g., 30+).** Pip pager horizontal-scrolls (already supported via `overflow-x: auto`). Active pip auto-scrolls into view on day change.
- **Slow Bedrock during typing in calendar.** The 1.5s debounce + the hash-based cache key means rapid edits don't fan out into N requests; only the final state triggers a fetch.

## Performance

- Slide render is a pure function of `selectedDayIndex` + the day's `ItineraryDayViewModel`. Switching days is instant (no network).
- Story is fetched lazily per day. Prefetch story for `selectedDayIndex ± 1` after the active day's story resolves (background, low-priority).
- Image is preloaded for `selectedDayIndex ± 1` similarly.
- `useDayStory` keys are stable across reloads via localStorage; first-paint hits the cache.

## Tests

- **Unit (Vitest).** `useDayStory` cache key changes when activities change; doesn't change on reorder of unrelated days; empty-day input produces a "suggestion" mode shape.
- **Component (Vitest + RTL).** `DaySlide` renders the right number of rows; `DayMomentRow` href is correct for both filled and empty slots; pip pager active/has-data classes match `days[i].activityCount > 0`.
- **Integration / e2e (Playwright).** Open `/trip/[id]`, scroll to At-a-Glance, advance days with arrow keys, click a moment row, assert calendar URL params, click the row again from the calendar back arrow → returns to overview at the right day.

## Rollout

- Single feature flag-free PR. The new `GlanceView` is a drop-in replacement; the old code is removed in the same PR (no parallel paths).
- Bedrock cost: at most one call per `(trip, day, activity-hash)`. With 10 active trips × 14 days × ~3 plan revisions = ~420 calls → negligible at Haiku pricing.
- Mobile (Expo) keeps the old screen until follow-up issue.

## Open questions for review

1. **Bedrock model choice.** Default to Claude Haiku 4.5 for speed/cost. If editorial quality is too thin, we'd jump to Sonnet 4.6 (review checkpoint after first 50 generations).
2. **Image fallback hierarchy.** Confirmed above as: featured-activity image → `/api/places` lookup → `useDayImages` destination shot. Worth reconfirming during implementation that `useDayImages` returns deterministic results per `dayIndex` (it currently does via modulo).
3. **Voice/tone.** Initial prompt uses second-person, present tense, light editorial. After 5–10 real generations we'll review and tune. Not a blocker.

## Linear

Not created — workspace is over the free issue limit. Use placeholder `TRA-495` in commit messages once issue is created manually. Branch is `develop` (per user direction; no separate feature branch).
