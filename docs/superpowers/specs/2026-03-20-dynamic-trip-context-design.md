# Dynamic Trip Context

Make every trip's overview page and components render destination-specific content from the database instead of hardcoded mock data.

## Decision

Use the existing `trip_context` JSONB column on the `trips` table. No migrations, no new tables, no new API calls. The frontend reads typed fields from `trip_context` and hides sections when data is absent. All mock fallbacks are removed.

The backend (future scope) will populate `trip_context` at trip creation time via AI generation. This spec covers only the **web** frontend refactor. Mobile app will need a separate follow-up pass.

## TripContextData Type

Added to `packages/shared/src/types/index.ts`. All fields are optional — absent fields mean the section is hidden, not that mock data is shown.

```typescript
export interface TripContextData {
  // Hero
  hero_image_url?: string;
  hero_images?: string[];          // gallery/mosaic photos

  // Geo
  lat?: number;
  lng?: number;

  // Overview text
  lede_text?: string;

  // Quick facts
  quick_facts?: {
    currency?: string;
    language?: string;
    timezone?: string;
    power?: string;
    transport?: string;
    taxi?: string;
    tipping?: string;
    water?: string;
    emergency?: string;
  };

  // Weather
  weather?: {
    current?: { high: number; low: number; condition: string };
    forecast?: { day: string; high: number; low: number; icon: string; condition: string }[];
  };

  // Explore / Things to Do
  explore_items?: {
    id: string;
    title: string;                 // matches existing component usage (renders item.title)
    subtitle?: string;
    category: string;
    description: string;
    image?: string;
    tags?: string[];
  }[];

  // News / What's Going On (extends existing NewsItem type with optional image)
  news?: {
    id: string;
    title: string;
    snippet: string;
    category: 'event' | 'advisory' | 'news' | 'tip';
    source: string;
    date: string;
    url?: string;
    image?: string;
  }[];
}
```

**Note:** The `explore_items` type uses `title` (not `name`) to match existing component rendering. The `news` type keeps `date` as required to match the existing `NewsItem` type, and adds `image` as optional.

## Data Flow

```
URL /trip/[id]
  -> layout.tsx extracts id
  -> TripLayoutInner calls useItineraryScreen(id)
    -> useItineraryScreen calls useTrip(id) internally
  -> trip.trip_context is typed as TripContextData
  -> Passed to overview page, hero, map, etc.
  -> Each component: if field exists, render; if not, hide section
```

No new hooks. `useItineraryScreen(tripId)` calls `useTrip(tripId)` internally, which returns the full trip object including `trip_context`.

## Component Changes

### 1. Trip type update
**File:** `packages/shared/src/types/index.ts`
- Add `TripContextData` interface (exported)
- Change `trip_context: Record<string, unknown>` to `trip_context: TripContextData`

### 2. TripMagazineHero
**File:** `apps/web/components/trip/TripMagazineHero.tsx`

This component currently owns the hero image, quick facts bar, and weather bar. All of these move to `trip_context`:

- **Hero image:** Read `trip_context.hero_image_url`. Remove `MOCK_TRIPS` image lookup. If absent, show no hero or a generic placeholder.
- **Quick facts:** Read `trip_context.quick_facts` (currency, language, timezone, power, transport, taxi, tipping, water, emergency). Remove hardcoded Paris facts. If absent, hide the facts bar.
- **Weather:** Read `trip_context.weather.current` and `trip_context.weather.forecast`. Remove `MOCK_WEATHER` and `MOCK_WEATHER_FORECAST` imports. If absent, hide the weather bar.

### 3. Overview page
**File:** `apps/web/app/(trips-app)/trip/[id]/page.tsx`
- **Lede text:** Read `trip_context.lede_text`. If absent, hide the paragraph.
- **Things to Do:** Read `trip_context.explore_items`. If absent, hide the section.
- **News / What's Going On:** Read `trip_context.news`. If absent, hide the section.
- **Mosaic gallery:** Read `trip_context.hero_images`. If absent, hide the gallery.
- Remove imports: `MOCK_EXPLORE_ITEMS`, `MOCK_NEWS`, `PARIS_PHOTOS` (locally defined), `NEWS_GRADIENTS`

### 4. TripLayoutInner (map)
**File:** `apps/web/app/(trips-app)/trip/[id]/trip-layout-inner.tsx`
- Read `trip_context.lat` / `trip_context.lng` for map center
- Remove `MOCK_DESTINATION_COORDS` and `MOCK_TRIPS` image lookup
- If no coordinates, don't open the map by default

### 5. Itinerary page
**File:** `apps/web/app/(trips-app)/trip/[id]/itinerary/page.tsx`
- Activity coordinates stay as-is (should come from individual activity records, not trip_context)
- No changes needed for this spec

## Deletions

Remove these mock constants once components no longer reference them:

**From `packages/shared/src/config/mockItineraryData.ts`:**
- `MOCK_EXPLORE_ITEMS`
- `MOCK_NEWS`
- `MOCK_WEATHER`
- `MOCK_WEATHER_FORECAST`
- `MOCK_DESTINATION_COORDS`

**From web component files:**
- `PARIS_PHOTOS` (locally defined in overview page)
- `NEWS_GRADIENTS` (locally defined in overview page)
- Hardcoded lede text in overview page
- Hardcoded quick facts in TripMagazineHero
- `MOCK_TRIPS` lookups in TripMagazineHero and TripLayoutInner

**Note:** `GLANCE_HERO_IMAGES` is a UI constant (carousel placeholder images) and is destination-agnostic. It stays.

### 6. Mobile app components
Mobile uses the same shared mock constants. These files need the same refactor pattern (read from `trip_context`, hide sections when absent):

- `apps/mobile/app/trip/[id]/index.tsx` — Overview screen
- `apps/mobile/app/trip/[id]/_layout.tsx` — Trip layout
- `apps/mobile/app/trip/[id]/itinerary.tsx` — Itinerary screen
- `apps/mobile/app/trip/[id]/info.tsx` — Trip info screen
- `apps/mobile/app/trip/[id]/packing.tsx` — Packing screen
- `apps/mobile/app/(tabs)/trips/index.tsx` — Trips list

## Scope

**In scope (web + mobile):**
- Type updates in shared package
- Web component refactors (4 files)
- Mobile component refactors (6 files)
- Mock constant cleanup

**Out of scope:**
- **Backend AI generation pipeline** — How `trip_context` gets populated at trip creation. Separate future spec.
- **Activity-level coordinates** — Individual activity lat/lng should live on the activity record, not in `trip_context`.
- **webz.io news integration** — How news is fetched and written to `trip_context.news`. Separate concern.
- **Weather API integration** — How weather is fetched and cached. Separate concern.
