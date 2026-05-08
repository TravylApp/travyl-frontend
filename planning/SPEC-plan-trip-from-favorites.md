# Spec: "Plan a Trip from My Favorites"

**Status:** ready for implementation
**Owner:** unassigned (handoff target)
**Estimate:** ~1.5–2 days for a complete frontend + Lambda integration
**Depends on:** none — but builds nicely on top of the existing AI trip planner pipeline (`useTripPlanner` hook + the SST `/trips/plan` Lambda)

---

## Why

Today, a user can:
1. Search Places (`/api/places?q=`) for things they want to do — restaurants, museums, beaches, anything.
2. Save those places to their favorites (heart icon, persisted to AsyncStorage + Supabase `favorites` table).

But the AI trip planner (`useTripPlanner` hook on the home tab) only takes a free-text prompt — it has **no awareness of saved favorites**. If the user has spent 20 minutes curating a list of San Francisco restaurants and parks, they have to re-type all of that into the planner prompt.

The vision: **let the user one-tap "plan a trip around these saved places" and have the AI build the itinerary, hotels, flights, weather, packing list around that curated list.**

---

## User flow

### Mobile

1. User opens the **Places** tab and saves N favorites (existing flow).
2. On the **Favorites** category tab, when `favorites.length >= 3`, a sticky CTA appears at the top:

   ```
   ✨  Plan a trip around these 8 places
       ───────────────────────────────────
   ```

3. Tapping the CTA opens a sheet:
   - **Destination dropdown** — pre-filled with the most common city across the user's favorites (resolved by clustering on `place.location` / `place.address` city tokens). User can change it.
   - **Trip length** — default `min(N, 7)` days where N is favorite count divided by 2 (most users want ~2 places per day).
   - **Start date** — default 4 weeks from today.
   - **Travelers** — default 2.
   - **Tone slider** — "leisurely" ↔ "packed" — affects how many places-per-day the planner targets.
   - Big "Plan it" button.
4. On submit: same takeoff animation as the home AI planner, then navigate to the resulting trip detail page.
5. The trip's itinerary should:
   - Place the saved favorites onto specific days (clustered by geography to minimise travel time).
   - Fill remaining time-slots with AI-generated activities matching the saved places' categories.
   - Generate hotels, flights, packing list, etc. as the regular planner does.

### Web

Same flow, but the CTA lives on the `/places` page above the favorites grid.

---

## Where the change lives

### 1. Mobile UI — `apps/mobile/app/(tabs)/favorites/index.tsx`

- Add a sticky CTA banner that renders when `activeTab === 'favorites' && favorites.length >= 3`.
- Tapping it opens a new bottom sheet component `PlanFromFavoritesSheet` (build at `apps/mobile/components/places/PlanFromFavoritesSheet.tsx`).
- On submit, call a new shared hook `useTripPlannerFromFavorites({ favorites, destination, ... })`.

### 2. Web UI — `apps/web/app/(main)/places/page.tsx` (or equivalent)

- Mirror the same CTA + sheet pattern.

### 3. Shared package — `packages/shared/src/hooks/useTripPlannerFromFavorites.ts` (new)

- Wraps the existing `useTripPlanner` state machine but accepts a structured payload instead of a free-text prompt.
- Internally, builds a synthesized prompt **plus** sends a `seed_places` array to the Lambda (see backend section below).

### 4. Backend Lambda — `services/trip-plan.ts` (existing)

- Extend the request schema:
  ```ts
  type PlanRequest = {
    prompt?: string;       // existing free-text
    seed_places?: Array<{
      id: string;
      name: string;
      category: string;
      lat?: number;
      lng?: number;
      address?: string;
    }>;
    destination?: string;  // existing
    days?: number;         // existing
    travelers?: number;    // existing
    start_date?: string;   // existing
    tone?: 'leisurely' | 'packed';  // new
  };
  ```
- When `seed_places` is provided:
  1. Cluster by city if `destination` not specified — pick the city that contains the most places.
  2. Pin those places onto specific days using a greedy spatial-clustering algorithm (places near each other → same day).
  3. Insert them into the LLM context as **must-include items**, e.g.:
     ```
     The user has already saved these places they want to visit:
     - Tartine Manufactory (Bakery, 595 Alabama St)
     - Mission Dolores Park (Park, 19th & Dolores)
     - Foreign Cinema (Restaurant, 2534 Mission St)
     ...
     Build a {N}-day itinerary in {destination} that includes ALL of these,
     fills the remaining time with complementary activities, and follows
     a {tone} pace.
     ```
  4. The rest of the planner pipeline (hotels, flights, weather, packing) runs unchanged.

### 5. Supabase favorites sync (already exists)

- `packages/shared/src/services/api.ts:637` already has `from('favorites')` queries — check if they're symmetric (insert + read) and if the mobile is using them. If mobile is still AsyncStorage-only, add a sync useEffect that pushes pending favorites to Supabase when the user is authenticated.

---

## Data model

The user's saved favorites need:
- `id` (already have)
- `name` (already have)
- `category` (already have via `PlaceItem.type`)
- `lat`, `lng` — **may not have** today; many favorites are saved from cards that don't expose coordinates. The Lambda should geocode these on the fly via the existing `/api/places?q=` endpoint if missing.
- `address` — optional but helps clustering

If we want to do this _properly_ we should ensure that whenever a place is favorited, we persist its coordinates. That's a small change in `toggleFavorite` (`apps/mobile/app/(tabs)/favorites/index.tsx:428`) — instead of saving just the ID, save a lean `FavoritePlace` blob:

```ts
type FavoritePlace = {
  id: string;
  name: string;
  category: string;
  lat?: number;
  lng?: number;
  city?: string;       // resolved from address
  imageUrl?: string;
  savedAt: number;     // for sort
};
```

This is technically a breaking change to AsyncStorage (`travyl-favorites` key currently holds `string[]`). Migration path: on app launch, detect if the stored value is `string[]` vs `FavoritePlace[]` and upgrade in place.

---

## Edge cases / decisions for the implementer

1. **What if favorites span multiple cities?**
   - Surface a small picker: "Plan a trip to **San Francisco** (5 places) or **Tokyo** (3 places)?". User chooses.

2. **What if the user has only 1–2 favorites?**
   - Hide the CTA. The threshold of 3 is a heuristic — feel free to lower to 2 or raise to 5 based on UX testing.

3. **What if the AI rejects a saved place?** (e.g. it's permanently closed, or the model can't fit it given the time budget)
   - The Lambda should still include it on the itinerary, even if marked "low priority" — the user explicitly saved it. Log a warning if dropped.

4. **What if the user has zero authentication?**
   - Anonymous users have favorites in AsyncStorage. The trip created from them should follow the existing anonymous-trip flow (private visibility, sessionStorage tracking).

5. **Conflict with existing `addToTrip` flow?**
   - `useAddToTrip` adds a single place to an existing trip's itinerary. This new flow creates a NEW trip from a list. They're complementary — no conflict.

---

## Out of scope (future work, do not block on these)

- Drag-and-drop reordering of places before submitting to the planner.
- Multi-trip "boards" (Pinterest-style collections).
- Sharing a favorites list with friends and having them suggest items.

---

## Acceptance criteria

- [ ] On mobile **and** web, when a user has 3+ favorites and is on the favorites filter, a "Plan a trip from these favorites" CTA is visible.
- [ ] Tapping the CTA opens a sheet with destination, length, start date, travelers, tone, and a submit button.
- [ ] Submitting fires the same takeoff animation as the regular planner.
- [ ] The resulting trip detail has all saved favorites placed on specific days (verifiable by inspecting `trip_context.itinerary`).
- [ ] The trip detail page also has hotels, flights, weather, and a packing list (i.e., the regular planner pipeline still runs).
- [ ] If the user has favorites in two cities, they're prompted to pick which trip.
- [ ] The favorites persist across app launches (AsyncStorage + Supabase sync if logged in).

---

## Files to read before starting

- `apps/mobile/app/(tabs)/favorites/index.tsx` — current favorites UI + toggle
- `packages/shared/src/hooks/useTripPlanner.ts` (or wherever the existing planner hook lives)
- `services/trip-plan.ts` (or whichever Lambda is at the receiving end of `/api/trips/plan`)
- `apps/web/app/api/trips/plan/route.ts` — current planner proxy
- `apps/mobile/app/(tabs)/(home)/index.tsx:374-418` — the takeoff animation + completion handling, as a reference pattern
- `packages/shared/src/utils/searchIntent.ts` — newly added intent inference, reuse for category clustering
