# Mock Data → Real Data Migration

## Overview
This document tracks how each part of the Travyl frontend was migrated from hardcoded mock data to real API-driven data. All changes were made on the `develop` branch of RB24-7/travyl-web.

---

## API Routes Created

| Route | Service | Purpose |
|-------|---------|---------|
| `/api/places` | Python backend (Google Places via SerpAPI) | Place search by lat/lng + category |
| `/api/trips/plan` | Python backend (NLP) | Trip planning with natural language |
| `/api/weather` | Visual Crossing | Weather forecast for destinations |
| `/api/foursquare` | Foursquare v2 | Hotels, restaurants, attractions |
| `/api/directions` | GraphHopper | Walking/driving directions between places |
| `/api/news` | Google News RSS | Destination travel news (free, no key) |
| `/api/images` | Unsplash / Google Places fallback | Destination hero images |

---

## Page-by-Page Migration

### Home Page (`apps/web/app/(main)/page.tsx`)

**Before:** Static hero, empty sections, no trip planning
**After:**
- Conversational search with NLP parsing (destination, duration, companions, vibe, budget)
- Descriptive inputs (3+ fields) skip follow-up questions and launch immediately
- Trip creation calls backend, stores in Supabase or sessionStorage fallback
- Fetches weather, hotels, explore items, news, landmark photos in parallel

### Home Page Sections

| Component | Before | After |
|-----------|--------|-------|
| `GetInspired` | `MOCK_PLACES = []` (empty) | `useQuery` → `/api/places` (Paris, Tokyo, Rome, Sydney) |
| `TravelMosaic` | `useMosaicTiles()` → missing Supabase table | `useQuery` → `/api/places` (5 cities × 2 places) |
| `ExplorePreview` | `useExploreRows()` → missing Supabase table | `useQuery` → `/api/places` (4 sections: attractions, restaurants, museums, parks) |

### Places Page (`apps/web/app/(main)/places/page.tsx`)

**Before:** `MOCK_PLACES = []` (empty array), no data
**After:**
- `useInfiniteQuery` → browse 16 cities × 9 categories with infinite scroll
- Search mode queries 5 categories in parallel, deduplicates results
- CSS grid with 4-column layout, responsive breakpoints
- Category mapping (`attraction` → `Landmark`, `restaurant` → `Culinary`) to match PLACE_COLLECTIONS for themed sections
- Remaining uncategorized places rendered in grid below themed sections

### Places API Route (`apps/web/app/api/places/route.ts`)

**Before:** Simple proxy to backend
**After:**
- `mapCategory()` converts backend categories to PLACE_COLLECTIONS-compatible format
- `mapTags()` generates tags for collection matching
- `upscaleGoogleImage()` converts thumbnails (w122-h92) to high-res (w800-h600)

### Trip Overview (`apps/web/app/(trips-app)/trip/[id]/page.tsx`)

**Before:** Required Supabase trip with `trip_context` populated externally
**After:**
- Local trip fallback via sessionStorage when Supabase RLS blocks insert
- `trip_context` populated at creation time with:
  - `hero_image_url` — Google Places landmark photo
  - `hero_images` — 8 landmark photos for bottom mosaic rotation
  - `explore_items` — sightseeing + restaurant + museum places
  - `weather` — current conditions + multi-day forecast
  - `hotels` — Foursquare hotel results
  - `news` — Google News RSS articles (auto-categorized)
  - `lede_text` — generated description from backend NLP

### Itinerary Tab (`apps/web/components/itinerary/ItineraryContext.tsx`)

**Before:** `MOCK_CALENDAR_ACTIVITIES = []`, `MOCK_DAYS = []`
**After:**
- `ItineraryProvider` accepts `tripId`, loads trip via `useItineraryScreen`
- `generateFromTripContext()` creates day-by-day itinerary from explore_items
- Activities distributed across days (morning/afternoon/evening slots)
- Day themes rotate: Explore & Discover, Culture & History, Food & Relaxation, etc.

### PinCard Component (`apps/web/components/PinCard.tsx`)

**Before:** Aspect ratio 0.95–1.14 (nearly square, huge cards)
**After:**
- Aspect ratio 1.4–1.59 (landscape, compact cards matching Figma)
- `min-w-0` to prevent overflow in CSS grid cells
- `layout` prop for smooth column-change animation
- Entrance animation only plays once (useRef guard)

### Takeoff Animation (`apps/web/components/home/TakeoffTransition.tsx`)

**Before:** `useCallback` for `onComplete` caused infinite timer reset
**After:** `useRef` for `onComplete` — timer runs once, animation completes reliably

### Trip Hook (`packages/shared/src/hooks/useTrip.ts`)

**Before:** Only fetched from Supabase
**After:** Falls back to sessionStorage for `local-*` trip IDs

---

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_RECOMMENDATION_API_URL=https://api.dev.gotravyl.com
VISUAL_CROSSING_API_KEY=...
FOURSQUARE_CLIENT_ID=...
FOURSQUARE_CLIENT_SECRET=...
GRAPHHOPPER_API_KEY=...
DUFFEL_API_TOKEN=...
AVIATIONSTACK_API_KEY=...
UNSPLASH_ACCESS_KEY=...  (optional — falls back to Google Places photos)
```

---

## Full Tab Audit (March 23, 2026)

| Tab | Status | Data Source | Notes |
|-----|--------|-------------|-------|
| Overview | DONE | trip_context (weather, explore, news, hotels, hero images) | All dynamic |
| Itinerary | DONE | Generated from trip_context.explore_items + Places API search | Glance + compact views |
| Calendar | Working | Yjs collaborative | Active development by teammate |
| Hotels | DONE | Foursquare v2 API + trip_context.hotels | Real hotel names/locations |
| Flights | DONE | Duffel API (113+ real offers with prices) | Auto-searches from JFK |
| Restaurants | Working | useRestaurantFilters hook | Data from trip context |
| Activities | Working | useActivityFilters hook | Data from trip context |
| Packing | Working | Local state + weather from trip_context | User creates lists |
| Budget | DONE | Generated from trip.budget, distributed across categories | Seeds from trip data |
| Cars | Placeholder | Empty state | Low priority |
| Favorites | DONE | Wired to trip_context.explore_items | User adds via other tabs |
| Settings | Working | Local state | Theme picker, tab visibility |
| Share | Working | fetchTripByShareToken | Fork trip functionality |
| Info | DONE | Dynamic per destination (Foursquare restaurants, country emergency numbers) | Was hardcoded Paris |

---

## What's Still TODO

- **Cars page** — empty placeholder, needs rental car API
- **Calendar** — being developed by teammate, needs itinerary sync
- **Supabase RLS** — INSERT policy needs to allow anonymous users
- **Packing auto-generate** — could auto-suggest items based on destination weather
- **Currency exchange** — Open Exchange Rates API for budget tab
- **Rest Countries** — for destination info (currency, language, timezone)
- **Wikipedia API** — destination descriptions for itinerary cards
- **Public holidays** — Nager.Date API to avoid planning on closed days
