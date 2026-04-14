# Backend Endpoint Integration — Full Utilization

**Date:** 2026-04-01
**Scope:** Web (Next.js) + Mobile (Expo) — both platforms
**Branch:** feature/TRA-397-398-mobile-places (current)

## Goal

Wire up all unused backend API endpoints (`api.dev.gotravyl.com`) into both web and mobile apps, while deduplicating shared code that has drifted across platforms.

## Backend Endpoints — Current vs Target

| Endpoint | Currently Used | Target |
|---|---|---|
| `GET /api/places/nearby` | Yes (places page) | Keep |
| `GET /api/places/{place_id}` | No (502 — may need backend fix) | Card flip enrichment |
| `GET /api/places/enrich` | No | Extra photos for card gallery |
| `GET /api/places/menu` | No | Restaurant card menu preview |
| `GET /api/places/suggest` | No | Recommended places / infinite scroll |
| `GET /api/events/search` | No | Events tab on places page + trip itinerary |
| `GET /api/images/destination` | No | Hero banners (places page, trip overview) |
| `GET /api/images/search` | No | Better fallback images |
| `GET /api/weather/forecast` | No | Weather widgets (places, trip overview, itinerary) |
| `GET /api/favorites` | No (local storage only) | Server-side favorites sync |
| `POST /api/favorites` | No | Server-side favorites sync |
| `DELETE /api/favorites/{id}` | No | Server-side favorites sync |
| `GET /api/hotels/search` | No | Trip hotels tab — real search |
| `GET /api/flights/search` | No | Trip flights tab — real search |
| `GET /api/trips/plan` | Yes | Keep |
| `POST /api/trips/extract` | Yes | Keep |

---

## Part 1: Deduplication

### Problem

Place mapping logic, utility functions, and constants are duplicated 3-4x across:
- `apps/web/app/api/places/route.ts`
- `apps/web/app/api/places/[id]/route.ts`
- `apps/mobile/app/(tabs)/favorites/index.tsx`
- `apps/mobile/utils/placesApi.ts`

### Solution — Move to `packages/shared`

**New file: `packages/shared/src/utils/places.ts`**
- `mapBackendToPlaceItem(p: BackendPlace): PlaceItem` — single canonical mapper
- `mapType(category, requestedCategory?)` — web's version (most complete)
- `mapCategory(category, subcategory?)`
- `mapTags(category, tags?, cuisine?)`
- `mapPrice(level): 1|2|3|4|undefined`
- `titleCase(s: string)`
- `formatHours(hours?: Record<string, string>)`
- `formatDuration(minutes?: number | null)`
- `FALLBACK_PHOTOS` constant
- `getFallbackImage(name, idx)`
- Uses existing `upscaleGoogleImage()` from shared utils

**New file: `packages/shared/src/config/knownCities.ts`**
- Full 99-city lookup table (web's version)
- Exported as `KNOWN_CITIES: Record<string, { lat: string; lng: string }>`

**New file: `packages/shared/src/config/api.ts`**
- `getBackendUrl()` — reads `EXPO_PUBLIC_RECOMMENDATION_API_URL` or `NEXT_PUBLIC_RECOMMENDATION_API_URL`
- `getWebProxyUrl()` — reads `EXPO_PUBLIC_WEB_API_URL` or `NEXT_PUBLIC_APP_URL`
- `ApiContext` React context + `ApiProvider` — wraps app root, provides URLs to hooks

**Cleanup:** After moving, delete local copies from web route.ts, web [id]/route.ts, mobile favorites/index.tsx, mobile placesApi.ts. Import from `@travyl/shared` instead.

---

## Part 2: Shared React Query Hooks

All hooks live in `packages/shared/src/hooks/`. Each uses React Query, reads base URL from `ApiContext`, and returns `{ data, isLoading, error }`.

### `useWeather(location: string)`
- Endpoint: `GET /api/weather/forecast?location={location}&days=7`
- Returns: `WeatherForecast` (current + daily forecast array)
- Cache: 30 minutes

### `useEvents(city: string, country: string, startDate?: string, endDate?: string)`
- Endpoint: `GET /api/events/search?city={city}&country={country}&start_date=...&end_date=...`
- Returns: `TravylEvent[]`
- Cache: 1 hour

### `useDestinationImage(destination: string)`
- Endpoint: `GET /api/images/destination?destination={destination}`
- Returns: image URL string
- Cache: 24 hours

### `usePlaceDetail(placeId: string)`
- Endpoint: `GET /api/places/{placeId}`
- Returns: `PlaceDetail`
- Enabled: only when placeId is truthy (lazy — fires on card flip)
- Cache: 1 hour
- Note: Currently returns 502 on backend — may need backend team fix

### `usePlaceEnrich(placeId: string, name: string)`
- Endpoint: `GET /api/places/enrich?placeId={placeId}&name={name}`
- Returns: `{ photos: string[] }`
- Fires alongside usePlaceDetail on card flip
- Cache: 1 hour

### `usePlaceMenu(name: string, city?: string)`
- Endpoint: `GET /api/places/menu?name={name}&city={city}`
- Enabled: only for restaurant-type places
- Returns: `MenuResponse`
- Cache: 24 hours

### `usePlaceSuggest(destination: string, category?: string, page?: number)`
- Endpoint: `GET /api/places/suggest?destination={destination}&category={category}&page={page}`
- Returns: `SuggestResponse`
- Cache: 1 hour

### `useServerFavorites()`
- Endpoint: `GET/POST/DELETE /api/favorites`
- Requires auth token
- Provides `addFavorite(placeId)` and `removeFavorite(id)` mutations
- Falls back to local storage (AsyncStorage / localStorage) when unauthenticated
- On first login: merges local favorites up to server

### `useHotelSearch(params)`
- Endpoint: `GET /api/hotels/search?...`
- Params: destination, checkIn, checkOut, guests
- Enabled: only when all params present
- Cache: 15 minutes

### `useFlightSearch(params)`
- Endpoint: `GET /api/flights/search?...`
- Params: origin, destination, departDate, returnDate, passengers
- Enabled: only when all params present
- Cache: 15 minutes

---

## Part 3: UI Integration

### Places Page (web + mobile)

| Hook | UI Change |
|---|---|
| `useDestinationImage(city)` | Hero banner behind city name/search — replaces solid color |
| `useWeather(city)` | Weather pill in city header — icon + temp + conditions |
| `useEvents(city, country)` | New "Events" tab in collection pills. Events render as cards in same carousel/grid |
| `usePlaceSuggest(city)` | "Recommended" section or infinite scroll fallback when nearby runs out |

### Card Detail (MagazineCurtain mobile / PlaceDetailOverlay web)

| Hook | UI Change |
|---|---|
| `usePlaceDetail(placeId)` | Replaces broken inline fetch. Populates: phone, hours, address, website |
| `usePlaceEnrich(placeId, name)` | Merges extra photos into image gallery on card front |
| `usePlaceMenu(name, city)` | Restaurant cards only — menu section on back with top 5 items + "View Full Menu" link |

### Trip Overview

| Hook | UI Change |
|---|---|
| `useWeather(destination)` | Weather widget in "At a Glance" section |
| `useEvents(city, country, startDate, endDate)` | "Happening During Your Trip" section with event cards |
| `useDestinationImage(destination)` | Hero header image replaces fallback Unsplash |

### Trip Hotels/Flights Tabs

| Hook | UI Change |
|---|---|
| `useHotelSearch(...)` | Hotels tab — real search results below trip_context hotels |
| `useFlightSearch(...)` | Flights tab — real search results below trip_context flights |

### Favorites (cross-platform)

| Hook | UI Change |
|---|---|
| `useServerFavorites()` | Authenticated: heart syncs to server. Unauthenticated: local storage. On login: merge local → server |

### Trip Itinerary

| Hook | UI Change |
|---|---|
| `useWeather(destination)` | Weather badge per day card (icon + high/low matched by date) |
| `useEvents(...)` | "Happening nearby" suggestion chips below each day's activities |

---

## Part 4: Types

Added to `packages/shared/src/types/index.ts`:

### Weather
```ts
interface WeatherCurrent {
  temp: number; feelslike: number; conditions: string;
  icon: string; humidity: number; windspeed: number;
}
interface WeatherDay {
  date: string; high: number; low: number; conditions: string;
  icon: string; precipprob: number; sunrise: string; sunset: string;
}
interface WeatherForecast {
  location: string; timezone: string;
  current: WeatherCurrent; forecast: WeatherDay[];
}
```

### Events
```ts
interface TravylEvent {
  id: string; name: string; date: string; time: string | null;
  venue: string | null; lat: number | null; lng: number | null;
  description: string | null; price: string | null;
  category: string | null; photo_url: string | null; link: string | null;
}
```

### Place Detail
```ts
interface PlaceDetail {
  id: string; name: string; address: string | null; city: string | null;
  latitude: number | null; longitude: number | null; rating: number | null;
  phone: string | null; website: string | null; description: string | null;
  images: string[]; image_url: string | null; categories: string[];
  hours: string | null; price: number | null; reviewCount: number | null;
}
```

### Menu
```ts
interface MenuItem { name: string; price: string | null; description: string | null; }
interface MenuResponse {
  restaurant_name: string; menu_url: string | null;
  items: MenuItem[]; source: string;
}
```

### Suggest
```ts
interface SuggestResponse {
  suggestions: SuggestionItem[]; // shape TBD from endpoint testing
  hasMore: boolean; nextPage: number | null;
}
```

### Server Favorites
```ts
interface ServerFavorite {
  id: string; place_id: string; // remaining fields TBD from endpoint testing
}
```

---

## Implementation Order

1. **Deduplication** — move utils to shared, update imports, verify nothing breaks
2. **ApiContext + URL helpers** — single source of truth for API URLs
3. **Tier 1 hooks** — useWeather, useEvents, useDestinationImage, usePlaceSuggest
4. **Tier 1 UI** — places page hero, weather pill, events tab, suggest section
5. **Tier 2 hooks** — usePlaceDetail, usePlaceEnrich, usePlaceMenu
6. **Tier 2 UI** — card flip enrichment, photo gallery, restaurant menu
7. **Tier 3 hooks** — useServerFavorites, useHotelSearch, useFlightSearch
8. **Tier 3 UI** — favorites sync, hotel/flight search tabs

## Known Blockers

- `GET /api/places/{place_id}` returns 502 — may need backend team to fix
- `GET /api/places/enrich` returns empty `{photos:[]}` — may need specific place data in backend
- `GET /api/places/menu` returns "Restaurant not found" for test query — may need exact name matching
- `SuggestionItem` and `ServerFavorite` schemas need verification from live endpoint responses
