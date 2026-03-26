# Technical Decisions Log

Every non-obvious engineering decision, why it was made, and what trade-offs exist.

---

## Trip Creation — Immediate ID, Background Enrichment

**Problem:** The takeoff animation is 4.6 seconds. If all API enrichment calls (weather, hotels, cuisine, wiki, country, holidays, news, sunrise, places) run before saving the trip ID, the animation finishes and navigates to `/trips` (no ID set) instead of `/trip/{id}`.

**Decision:** Save a basic trip with just destination/dates/lede to sessionStorage IMMEDIATELY after the backend NLP responds (~2s). Set `pendingTripId` at that point. Then run all enrichment APIs in parallel and UPDATE the sessionStorage trip with the full data.

**Trade-off:** If the user navigates to the trip page before enrichment finishes, they'll see basic info first, then the page won't auto-refresh with enriched data (sessionStorage is already written). This is acceptable because:
- The basic trip data is enough to show the overview
- The itinerary tab generates from explore_items which are fetched before enrichment
- Future fix: use React Query to refetch trip data on the trip page

**File:** `apps/web/app/(main)/page.tsx` — `launchTakeoff()`

---

## Local Trip Storage (Supabase RLS Fallback)

**Problem:** Supabase Row Level Security (RLS) blocks anonymous INSERT into the `trips` table. The user removed the login requirement so trips can be planned without auth.

**Decision:** If Supabase insert fails, store the trip in `sessionStorage` with a `local-{timestamp}` ID. The `useTrip` hook checks for `local-` prefix and reads from sessionStorage instead of Supabase.

**Trade-off:**
- Local trips are browser-session-only — clearing sessionStorage loses them
- Local trips don't sync across devices
- To fix permanently: either update Supabase RLS INSERT policy to `true`, or require auth

**Files:**
- `apps/web/app/(main)/page.tsx` — fallback storage
- `packages/shared/src/hooks/useTrip.ts` — sessionStorage reader

---

## Takeoff Animation Timer Fix

**Problem:** The `TakeoffTransition` component used `useCallback` for the `onComplete` prop, which changed on every render, causing the `useEffect` timer to reset infinitely — the animation never completed.

**Decision:** Changed to `useRef` for the callback. The ref always points to the latest `onComplete` without triggering effect re-runs. The timer runs exactly once.

**File:** `apps/web/components/home/TakeoffTransition.tsx`

---

## PinCard Grid Overflow

**Problem:** Cards in a CSS `grid` with `repeat(4, 1fr)` overflowed their grid cells because `motion.div` has no implicit min-width constraint in grid contexts.

**Decision:** Added `min-w-0` to the PinCard's outer `motion.div`. This forces the element to respect the grid column's `1fr` constraint.

**File:** `apps/web/components/PinCard.tsx`

---

## Category Mapping (Backend → Collection System)

**Problem:** The Python backend returns categories like `attraction`, `restaurant`, `cafe`, `park`. The frontend's `PLACE_COLLECTIONS` system uses categories like `Cultural`, `Culinary`, `Nature`, `Landmark`. None matched, so all places fell into "remaining" and the themed section headers never appeared.

**Decision:** Added `mapCategory()` and `mapTags()` in the places API route to convert backend categories to collection-compatible ones:
- `restaurant` → `Culinary` category + `Food` tag
- `museum`/`attraction` → `Historical`/`Landmark` + `Culture` tag
- `park` → `Nature` + `Nature` tag
- etc.

**File:** `apps/web/app/api/places/route.ts`

---

## Destination Parsing — Boundary Words

**Problem:** NLP parser regex for destination captured too much. "5 day romantic trip to Paris for 2 people" → extracted "Paris for" as the destination.

**Decision:** Added boundary words to the regex: `for`, `with`, `solo`, `alone`, `family`, `friends`, `partner`, `budget`, `cheap`, `luxury`, `moderate`, digits. The regex stops at these words.

**File:** `apps/web/app/(main)/page.tsx` — `onSearch()`

---

## Hooks Order — Early Returns

**Problem:** `GetInspired` and `TravelMosaic` had `if (data.length === 0) return null` BEFORE `useEffect` hooks, causing "Rendered more hooks than during the previous render" errors.

**Decision:** Moved all `return null` guards AFTER all hook calls. React hooks must always be called in the same order.

**Files:**
- `apps/web/components/home/GetInspired.tsx`
- `apps/web/components/home/TravelMosaic.tsx`

---

## Foursquare v2 vs v3

**Problem:** Foursquare v3 API key returned 401. The Service API Key format didn't work with the v3 endpoint.

**Decision:** Used Foursquare v2 with Client ID + Client Secret (OAuth credentials from the dashboard). v2 works immediately, v3 may require different key activation or partner status.

**File:** `apps/web/app/api/foursquare/route.ts`

---

## Dead Unsplash Fallback

**Problem:** `source.unsplash.com` (used as no-key fallback for images) is dead/redirecting, producing broken images.

**Decision:** Changed fallback chain:
1. Google Places photo from explore items (best — real destination photo)
2. Unsplash API (if key set)
3. Backend photo_url from Google Places
4. Static Unsplash image URL (generic travel photo, always works)

**File:** `apps/web/app/api/images/route.ts`, `apps/web/app/api/places/route.ts`

---

## Itinerary Generation from Explore Items

**Problem:** Itinerary tab showed "No itinerary yet" because `MOCK_CALENDAR_ACTIVITIES` and `MOCK_DAYS` were empty arrays. Supabase `itinerary_days` table returns nothing for local trips.

**Decision:** `ItineraryProvider` now accepts `tripId`, loads the trip via `useItineraryScreen`, and generates day-by-day activities from `trip_context.explore_items`. Activities are distributed across morning/afternoon/evening slots.

**Trade-off:** Generated itinerary is basic (evenly distributed). A real AI-generated itinerary from the Python backend would be better but requires completing the backend conversation flow.

**File:** `apps/web/components/itinerary/ItineraryContext.tsx`

---

## API Caching Strategy

All API routes use `{ next: { revalidate: 3600 } }` (1-hour cache) on fetch calls. This means:
- Same destination data isn't re-fetched within an hour
- Keeps us within free tier limits for all providers
- Weather updates hourly (acceptable for travel planning)

**Trade-off:** Data can be up to 1 hour stale. For weather this is fine. For news, slightly less ideal but acceptable.

---

## Watermark

**Requirement:** Developer watermark that proves who built the frontend.

**Implementation:**
- `<meta>` tag: `author: "JPB Developments — https://www.jpbdevelopments.com"`
- Console.log watermark on page load
- `developed-by` metadata field

**Note:** Not mentioned in commit messages per user request.

**File:** `apps/web/app/layout.tsx`
