# Spotlight Search + Entity Detail Pages

**Date:** 2026-03-25
**Status:** Draft

## Goal

Replace the existing `GlobalCommandPalette` with a unified **Spotlight Search** that searches across all entity types (trips, hotels, flights, restaurants, activities, destinations) with context awareness. Add dedicated **detail pages** for hotels, flights, restaurants, and activities so users can explore full metadata instead of only seeing summary cards.

## Problem

1. The command palette (Ctrl+K) only searches trips (via vector search), navigation links, and calendar commands. Users can't search for a specific hotel, flight, or restaurant across their trips.
2. Entity pages (`/trip/[id]/hotels`, `/flights`, `/restaurants`) show list/card views with partial data. There's no way to view the full metadata for an individual hotel or flight.
3. No context-aware search — when inside a trip, users should see results from that trip first.

## Approach

**Approach B** — Spotlight Search + Entity Detail Pages. Two independently valuable pieces that work together: search finds things, detail pages show everything about them.

---

## Data Model Context

Entities live in **multiple tables**, not just `activity`:

| Entity | Table | Key Fields |
|--------|-------|-----------|
| Hotels | `hotels` (dedicated table) | `id`, `trip_id`, `data` (jsonb → `HotelData`: name, address, check_in, check_out, price_per_night, total_price, rating, star_rating, image_url, booking_ref, offer_id) |
| Flights | `flights` (dedicated table) | `id`, `trip_id`, `data` (jsonb → `FlightData`: airline, flight_number, origin_iata, dest_iata, departure_at, arrival_at, price, cabin_class, booking_ref, offer_id) |
| Restaurants | `activity` table | `activity_type = 'food'` (mapped from frontend types: dining, food, cafe). Data in `activity_name`, `activity_data` jsonb, `notes` |
| Activities | `activity` table | All other `activity_type` values (sightseeing, tour, nature, etc.). Data in `activity_name`, `activity_data` jsonb, `notes` |
| Trips | `trips` table | `title`, `destination`, `start_date`, `end_date`, `status` |

**DB type mapping** (from `activityMapper.ts`):
- Frontend `flight`/`transport` → DB `airport`
- Frontend `dining`/`food`/`cafe` → DB `food`
- Frontend `hotel` → DB `hotel`
- Frontend `nature`/`hiking`/`beach` → DB `nature`

Existing fetchers: `fetchHotels(tripId)` queries `hotels` table, `fetchFlights(tripId)` queries `flights` table. For calendar activities, `useItineraryScreen` → `useItineraryDays` is the primary data path (not `fetchActivities`, which queries a different legacy view).

---

## Part 1: Unified Spotlight Search

### Replaces

`GlobalCommandPalette.tsx` → `SpotlightSearch.tsx`

Same Ctrl+K trigger, same keyboard-first UX, but searches across everything.

### Search categories

| Category | Data Source | Fields Searched |
|----------|-----------|----------------|
| Trips | `context-search` Lambda (vector + text) | Title, destination, activity names |
| Hotels | `entity-search` Lambda → `hotels` table | `data->>'name'`, `data->>'address'`, `data->>'booking_ref'` |
| Flights | `entity-search` Lambda → `flights` table | `data->>'airline'`, `data->>'flight_number'`, `data->>'origin_iata'`, `data->>'dest_iata'` |
| Restaurants | `entity-search` Lambda → `activity` table (type `food`) | `activity_name`, `notes`, `activity_data->>'location_name'` |
| Activities | `entity-search` Lambda → `activity` table (not hotel/food) | `activity_name`, `notes`, `activity_data->>'location_name'`, `activity_data->>'category'` |
| Destinations | `entity-search` Lambda → `trips` table | `destination` (distinct) |
| Navigation | Static (existing, client-side) | Page names |
| Commands | Calendar commands (existing, client-side) | Command names |
| Settings | Static (existing, client-side) | Theme toggle, inline controls (preserved from recent rich controls work) |

### Context awareness

- **Global** (from `/trips`, `/`, `/places`, `/profile`): Searches across ALL user trips and saved data.
- **Within a trip** (`/trip/[id]/*`): Prioritizes current trip's entities first. Results shown in two groups: "In this trip" and "Other trips".

### Backend: `GET /entity-search` Lambda

New SST Lambda function at `services/entity-search.ts`.

**SST route definition** (in `infra/api.ts`):
```typescript
api.route('GET /entity-search', {
  handler: 'services/entity-search.handler',
  link: [supabaseSecretKey, supabaseUrl],
})
```

**Query params:**
- `q` (required, min 3 chars — matching existing `useContextSearch` threshold) — search query
- `types` (optional) — comma-separated: `hotel`, `flight`, `restaurant`, `activity`, `destination`
- `tripId` (optional) — prioritize results from this trip

**Behavior:**
1. Validate Supabase JWT (using existing `services/lib/auth.ts`)
2. Call Supabase RPC `search_entities(query, user_id, entity_types, trip_id)`
3. Return grouped results

**Supabase RPC: `search_entities`**

```sql
CREATE OR REPLACE FUNCTION search_entities(
  query TEXT,
  match_user_id UUID,
  entity_types TEXT[] DEFAULT ARRAY['hotel','flight','restaurant','activity','destination'],
  match_trip_id UUID DEFAULT NULL,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  entity_id UUID,
  entity_type TEXT,
  entity_name TEXT,
  entity_subtitle TEXT,
  trip_id UUID,
  trip_title TEXT,
  trip_destination TEXT,
  image_url TEXT,
  score FLOAT
)
```

**Search logic (multi-table, indexed):**

The RPC queries each table separately with targeted field searches, then UNIONs results:

1. **Hotels** (if `'hotel' = ANY(entity_types)`):
   ```sql
   SELECT h.id, 'hotel', h.data->>'name', h.data->>'address',
          h.trip_id, t.title, t.destination, h.data->>'image_url',
          CASE WHEN h.trip_id = match_trip_id THEN 1.5 ELSE 1.0 END
   FROM hotels h JOIN trips t ON h.trip_id = t.id
   WHERE t.user_id = match_user_id
     AND (h.data->>'name' ILIKE '%' || query || '%'
       OR h.data->>'address' ILIKE '%' || query || '%'
       OR h.data->>'booking_ref' ILIKE '%' || query || '%')
   ```

2. **Flights** (if `'flight' = ANY(entity_types)`):
   ```sql
   SELECT f.id, 'flight', f.data->>'airline' || ' ' || f.data->>'flight_number',
          f.data->>'origin_iata' || ' → ' || f.data->>'dest_iata',
          f.trip_id, t.title, t.destination, NULL,
          CASE WHEN f.trip_id = match_trip_id THEN 1.5 ELSE 1.0 END
   FROM flights f JOIN trips t ON f.trip_id = t.id
   WHERE t.user_id = match_user_id
     AND (f.data->>'airline' ILIKE '%' || query || '%'
       OR f.data->>'flight_number' ILIKE '%' || query || '%'
       OR f.data->>'origin_iata' ILIKE '%' || query || '%'
       OR f.data->>'dest_iata' ILIKE '%' || query || '%')
   ```

3. **Restaurants** (if `'restaurant' = ANY(entity_types)`):
   ```sql
   SELECT a.id, 'restaurant', a.activity_name,
          a.activity_data->>'location_name',
          a.trip_id, t.title, t.destination, a.activity_data->>'image_url',
          CASE WHEN a.trip_id = match_trip_id THEN 1.5 ELSE 1.0 END
   FROM activity a JOIN trips t ON a.trip_id = t.id
   WHERE t.user_id = match_user_id
     AND a.activity_type = 'food'
     AND (a.activity_name ILIKE '%' || query || '%'
       OR a.notes ILIKE '%' || query || '%'
       OR a.activity_data->>'location_name' ILIKE '%' || query || '%')
   ```

4. **Activities** (if `'activity' = ANY(entity_types)`):
   ```sql
   SELECT a.id, 'activity', a.activity_name,
          a.activity_data->>'location_name',
          a.trip_id, t.title, t.destination, a.activity_data->>'image_url',
          CASE WHEN a.trip_id = match_trip_id THEN 1.5 ELSE 1.0 END
   FROM activity a JOIN trips t ON a.trip_id = t.id
   WHERE t.user_id = match_user_id
     AND a.activity_type NOT IN ('food', 'hotel')
     AND (a.activity_name ILIKE '%' || query || '%'
       OR a.notes ILIKE '%' || query || '%'
       OR a.activity_data->>'location_name' ILIKE '%' || query || '%'
       OR a.activity_data->>'category' ILIKE '%' || query || '%')
   ```

5. **Destinations** (if `'destination' = ANY(entity_types)`):
   ```sql
   SELECT gen_random_uuid(), 'destination', t.destination,
          COUNT(*)::text || ' trips',
          NULL, NULL, t.destination, NULL, 1.0
   FROM trips t
   WHERE t.user_id = match_user_id
     AND t.destination ILIKE '%' || query || '%'
   GROUP BY t.destination
   ```

Results ordered by score DESC, limited to `match_count`.

**RLS:** Function uses `SECURITY DEFINER` with explicit `user_id` filtering in each query. The `match_user_id` comes from the JWT-validated user, ensuring users can only search their own data.

**Indexes (new migration):**
```sql
-- Hotels: GIN index on data jsonb for text search
CREATE INDEX idx_hotels_data_name ON hotels USING gin ((data->>'name') gin_trgm_ops);

-- Flights: GIN index on data jsonb for text search
CREATE INDEX idx_flights_data_airline ON flights USING gin ((data->>'airline') gin_trgm_ops);
CREATE INDEX idx_flights_data_flight_number ON flights USING gin ((data->>'flight_number') gin_trgm_ops);
-- IATA codes are short exact-match strings; btree is better than trigram here
CREATE INDEX idx_flights_data_origin_iata ON flights ((data->>'origin_iata'));
CREATE INDEX idx_flights_data_dest_iata ON flights ((data->>'dest_iata'));

-- Activity: index on activity_name for text search (already has trip_id FK index)
CREATE INDEX idx_activity_name_trgm ON activity USING gin (activity_name gin_trgm_ops);

-- Trips: index on destination for text search
CREATE INDEX idx_trips_destination_trgm ON trips USING gin (destination gin_trgm_ops);
```

Requires `pg_trgm` extension (check if already enabled, enable if not).

**Note:** Additional searched fields (`hotels.data->>'address'`, `activity.notes`, `activity.activity_data->>'location_name'`) are not indexed. At typical user data volumes (personal trips) this is acceptable. Add indexes if query performance degrades.

**Note:** The `activity` table may contain rows with `activity_type = 'hotel'` from calendar-placed hotel entries (written via `activityMapper.ts`). The activities search query excludes these (`NOT IN ('food', 'hotel')`) to avoid duplicate results with the dedicated `hotels` table search.

**Note:** Destination results return `NULL` for `trip_id`. The frontend grouping ("In this trip" / "Other trips") should treat destination results as a separate ungrouped category, displayed after the trip-scoped groups.

### Frontend: `useSpotlightSearch` hook

Location: `apps/web/hooks/useSpotlightSearch.ts` (web-only, matching `useContextSearch` placement — mobile spotlight can be added later when mobile parity is in scope)

```typescript
interface SpotlightResult {
  id: string
  type: 'trip' | 'hotel' | 'flight' | 'restaurant' | 'activity' | 'destination' | 'navigation' | 'command' | 'setting'
  title: string
  subtitle: string
  imageUrl?: string
  tripId?: string
  tripTitle?: string
  href: string // direct link to detail page or nav target
  score: number
}

interface UseSpotlightSearchReturn {
  query: string
  setQuery: (q: string) => void
  results: Record<string, SpotlightResult[]> // grouped by type
  isLoading: boolean
  recentSearches: string[]
  clearRecent: () => void
}
```

Behavior:
- 300ms debounce (matching existing `useContextSearch`)
- Min 3 characters before API calls (matching existing threshold)
- Calls both `context-search` (for trips, vector-powered) and `entity-search` (for entities) in parallel
- Merges and deduplicates results
- Static nav/command/settings results filtered client-side (existing pattern)
- Caps at 3 results per category, with "View all" expansion
- Recent searches in localStorage (`travyl:recentSearches`, max 10)

### Component structure

```
apps/web/components/spotlight/
├── SpotlightSearch.tsx          # Root overlay (AnimatePresence backdrop + panel)
├── SpotlightInput.tsx           # Input with search icon, clear button, keyboard hint
├── SpotlightResults.tsx         # Scrollable grouped result list
├── SpotlightResultGroup.tsx     # Category header (icon + name + count) + items
├── SpotlightResultItem.tsx      # Individual row: icon, title, subtitle, thumbnail
└── SpotlightEmptyState.tsx      # Recent searches + category quick links
```

### UI behavior

- **Trigger:** Ctrl+K (existing), or click search icon in any navbar
- **Overlay:** Backdrop blur + centered panel (max-w-xl), same z-index pattern as current command palette
- **Input:** Auto-focused, placeholder "Search trips, hotels, flights..."
- **Results:** Grouped by category with category headers. Each item shows type icon, title, subtitle (trip name or location), optional thumbnail.
- **Keyboard:** Arrow keys navigate, Enter opens, Escape closes, Tab cycles categories
- **Empty state:** Recent searches list + quick category chips (Hotels, Flights, Restaurants, Activities)
- **Loading:** Subtle spinner in input, skeleton items in results

### Migration from GlobalCommandPalette

The new `SpotlightSearch` replaces `GlobalCommandPalette` entirely. All existing functionality is preserved:
- Navigation items → "Navigation" category
- Trip search → "Trips" category (same vector search)
- Calendar commands → "Commands" category
- Settings controls (theme toggle, color pickers, segmented controls, pill selectors) → "Settings" category with inline controls (preserved from recent command palette rich controls work, rendered as interactive result items)

---

## Part 2: Entity Detail Pages

### Shared patterns

All detail pages follow a consistent layout:

1. **Back breadcrumb:** "← Back to Hotels" linking to the list page
2. **Hero section:** Full-width image carousel with dots navigation
3. **Info grid:** Key metadata in a structured grid
4. **Content sections:** Expandable sections for detailed info
5. **Actions bar:** Fixed bottom bar with Edit, Remove, Share, Favorite actions
6. **Loading:** Skeleton matching the layout structure
7. **Error states:** "Entity not found" if query returns null (covers both not-found and RLS-filtered cases, since Supabase RLS returns empty rather than 403). Link back to list page.

All pages use existing design tokens (`ACTIVITY_TYPE_COLORS`), motion animations (framer-motion), and Tailwind 4.

### Data sources by entity type

| Entity | Fetch | Hook | Table |
|--------|-------|------|-------|
| Hotel | `fetchHotels(tripId)` → filter by ID | `useHotels` (existing) | `hotels` |
| Flight | `fetchFlights(tripId)` → filter by ID | `useFlights` (existing) | `flights` |
| Restaurant | `fetchActivities(tripId)` → filter by ID + type `food` | `useItineraryScreen` (existing) | `activity` |
| Activity | `fetchActivities(tripId)` → filter by ID | `useItineraryScreen` (existing) | `activity` |

Detail pages use existing hooks and filter client-side by entity ID from the route param. No new `useEntityDetail` hook needed — the existing hooks already fetch all entities for a trip, and React Query caches them.

### Data availability notes

Some detail page sections describe fields that **exist in the current data model** vs. fields that are **aspirational** (would need enrichment from Foursquare/SerpAPI or future booking APIs):

**Available now:**
- Hotel: name, address, lat/lng, check_in, check_out, price_per_night, total_price, currency, rating, star_rating, image_url, booking_ref
- Flight: airline, flight_number, origin_iata, origin_name, dest_iata, dest_name, departure_at, arrival_at, price, currency, cabin_class, booking_ref
- Restaurant/Activity: activity_name, type, dates, times, cost, lat/lng, notes, location_name, image_url, rating (from activity_data)

**Aspirational (show section only when data exists, otherwise hide):**
- Hotel: amenities list, guest rating breakdown, room types, phone/email/website, cancellation policy
- Flight: aircraft type, terminal/gate, seat, baggage, on-time stats
- Restaurant: hours, dress code, menu, reviews, dietary info
- Activity: highlights, included/excluded, meeting point, languages, difficulty, tips

Detail pages render available data and gracefully hide sections with no data. As enrichment APIs are wired up, sections will populate automatically.

### Hotel Detail — `/trip/[id]/hotels/[hotelId]`

**File:** `apps/web/app/(trips-app)/trip/[id]/hotels/[hotelId]/page.tsx`

**Data:** `useHotels(tripId)` → find by `hotelId` → `Hotel.data` (typed as `HotelData`)

**Sections:**
- **Hero:** Image from `data.image_url` (single image for now, carousel-ready for future enrichment)
- **Overview card:** `data.name`, `data.star_rating` stars, `data.address` (with map pin link using `data.latitude`/`data.longitude`), check-in/out from `data.check_in`/`data.check_out`, computed nights
- **Pricing:** `data.price_per_night`, `data.total_price`, `data.currency`
- **Amenities:** Grid with icons (if enrichment data available in future)
- **Guest ratings:** `data.rating` display (breakdown bars when enrichment available)
- **Location:** Embedded Leaflet map at `data.latitude`/`data.longitude` (dynamic import, already used in Places page)
- **Booking:** `data.booking_ref`, `data.offer_id`
- **Actions:** Edit, Remove from trip, Share, Favorite

### Flight Detail — `/trip/[id]/flights/[flightId]`

**File:** `apps/web/app/(trips-app)/trip/[id]/flights/[flightId]/page.tsx`

**Data:** `useFlights(tripId)` → find by `flightId` → `Flight.data` (typed as `FlightData`)

**Sections:**
- **Hero:** Full-width route visualization (`data.origin_iata` → plane icon → `data.dest_iata`) with `data.airline`, sky gradient
- **Flight info:** `data.airline` + `data.flight_number`, `data.cabin_class`
- **Route details:** Two-column: departure (`data.origin_name`, `data.origin_iata`, `data.departure_at`) / arrival (`data.dest_name`, `data.dest_iata`, `data.arrival_at`), computed duration
- **Pricing:** `data.price`, `data.currency`
- **Booking:** `data.booking_ref`, `data.offer_id`
- **Comparison:** Embedded `ComparisonAlternatives` component (already built in flights page) showing similar flights
- **Actions:** Edit, Remove from trip, Share, Favorite

### Restaurant Detail — `/trip/[id]/restaurants/[restaurantId]`

**File:** `apps/web/app/(trips-app)/trip/[id]/restaurants/[restaurantId]/page.tsx`

**Data:** `useItineraryScreen(tripId)` → filter activities by `id = restaurantId` and `activity_type = 'food'`. Entity data from `activity_name`, `activity_data`, `notes`, `estimated_cost`, `latitude`/`longitude`.

**Sections:**
- **Hero:** Image from `activity_data.image_url`
- **Overview:** `activity_name`, `activity_data.category` as cuisine badge, `estimated_cost` formatted with `currency`, `activity_data.rating`
- **Location:** `activity_data.location_name`, address + Leaflet map at `latitude`/`longitude`
- **Notes:** `notes` field content
- **Schedule:** `starting_date`/`ending_date`, `starting_time`/`ending_time` — which day/meal slot in the trip
- **Trip context:** What's before/after in the itinerary (adjacent activities by time)
- **Actions:** Edit, Remove from trip, Share, Favorite

### Activity Detail — `/trip/[id]/activities/[activityId]`

**File:** `apps/web/app/(trips-app)/trip/[id]/activities/[activityId]/page.tsx`

**Data:** Same as restaurant but for non-food activity types.

**Sections:**
- **Hero:** Image from `activity_data.image_url` with category color accent from `ACTIVITY_TYPE_COLORS`
- **Overview:** `activity_name`, category badge (colored by `activity_data.category`), duration (computed from times), `estimated_cost`, `activity_data.rating`
- **Location:** `activity_data.location_name` + Leaflet map at `latitude`/`longitude`
- **Notes:** `notes` field
- **Schedule:** Date/time display, what comes before/after
- **Actions:** Edit time/date, Remove, Share, Favorite

---

## Routing summary

```
New routes:
  /trip/[id]/hotels/[hotelId]           → Hotel detail page
  /trip/[id]/flights/[flightId]         → Flight detail page
  /trip/[id]/restaurants/[restaurantId] → Restaurant detail page
  /trip/[id]/activities/[activityId]    → Activity detail page

Modified:
  GlobalCommandPalette.tsx → replaced by SpotlightSearch
  All entity list pages → cards now link to detail pages

New Lambda:
  GET /entity-search → services/entity-search.ts

New SST route:
  infra/api.ts → api.route('GET /entity-search', { ... link: [supabaseSecretKey, supabaseUrl] })

New Supabase migration:
  search_entities() RPC + pg_trgm indexes on hotels.data, flights.data, activity.activity_name, trips.destination
```

## Component inventory

| Component | Status | Location |
|-----------|--------|----------|
| `SpotlightSearch` | New | `apps/web/components/spotlight/SpotlightSearch.tsx` |
| `SpotlightInput` | New | `apps/web/components/spotlight/SpotlightInput.tsx` |
| `SpotlightResults` | New | `apps/web/components/spotlight/SpotlightResults.tsx` |
| `SpotlightResultGroup` | New | `apps/web/components/spotlight/SpotlightResultGroup.tsx` |
| `SpotlightResultItem` | New | `apps/web/components/spotlight/SpotlightResultItem.tsx` |
| `SpotlightEmptyState` | New | `apps/web/components/spotlight/SpotlightEmptyState.tsx` |
| `useSpotlightSearch` | New | `apps/web/hooks/useSpotlightSearch.ts` |
| `EntityHero` | New (shared) | `apps/web/components/entity/EntityHero.tsx` |
| `EntityActionsBar` | New (shared) | `apps/web/components/entity/EntityActionsBar.tsx` |
| `EntityMap` | New (shared) | `apps/web/components/entity/EntityMap.tsx` |
| `EntityBreadcrumb` | New (shared) | `apps/web/components/entity/EntityBreadcrumb.tsx` |
| Hotel detail page | New | `apps/web/app/(trips-app)/trip/[id]/hotels/[hotelId]/page.tsx` |
| Flight detail page | New | `apps/web/app/(trips-app)/trip/[id]/flights/[flightId]/page.tsx` |
| Restaurant detail page | New | `apps/web/app/(trips-app)/trip/[id]/restaurants/[restaurantId]/page.tsx` |
| Activity detail page | New | `apps/web/app/(trips-app)/trip/[id]/activities/[activityId]/page.tsx` |
| `entity-search` Lambda | New | `services/entity-search.ts` |
| `search_entities` RPC | New | `supabase/migrations/` |
| `HotelCard` | Modified | Link to detail page |
| `FlightCard` | Modified | Link to detail page |
| Restaurant cards | Modified | Link to detail page |
| Activity cards | Modified | Link to detail page |
| `GlobalCommandPalette` | Removed | Replaced by SpotlightSearch |

## Dependencies

- Existing: React Query, Zustand, Framer Motion, Leaflet (dynamic), Lucide icons, Tailwind 4
- Existing Lambda infra: SST, API Gateway, Supabase JWT validation (`services/lib/auth.ts`)
- Existing secrets: `supabaseSecretKey`, `supabaseUrl` (from `infra/secrets.ts`)
- Postgres extension: `pg_trgm` (for trigram indexes — verify enabled, enable if not)
- No new npm dependencies needed

## Testing strategy

- Unit tests for `search_entities` RPC with test data across all 5 entity types
- Unit tests for `useSpotlightSearch` hook (mock both API responses, verify merge/dedup logic)
- Integration test: search query → correct results grouped by type, context-aware scoring
- Visual review of each detail page with existing mock data (hotels + flights have rich mock data; restaurants + activities render from activity table data)

## Scope boundaries

**In scope:**
- Spotlight search replacing command palette
- Entity detail pages for hotel, flight, restaurant, activity
- entity-search Lambda + SST route + search_entities RPC + pg_trgm indexes
- Linking existing cards to detail pages
- Context-aware search (trip-scoped vs global)
- Settings category in spotlight (preserving existing inline controls)

**Out of scope:**
- Real booking/reservation APIs (still mock/stored data)
- Full-text search indexing beyond pg_trgm (no OpenSearch for entities yet)
- Mobile app changes (web-first, mobile follows later)
- Destination detail pages (can be a follow-up)
- Search analytics or trending searches
- Enrichment API integration for aspirational detail fields (Foursquare amenities, reviews, etc.)
