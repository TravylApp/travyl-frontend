# Backend Endpoint Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up all unused backend API endpoints into both web and mobile, eliminating duplicated code across platforms.

**Architecture:** Shared React Query hooks in `@travyl/shared` consume a centralized API config. All place mapping/utility code moves to shared package. Web integrates first, mobile follows using the same hooks.

**Tech Stack:** React Query, TypeScript, Next.js (web), Expo (mobile), `@travyl/shared` monorepo package.

**Spec:** `docs/superpowers/specs/2026-04-01-backend-endpoint-integration-design.md`

---

## Phase 1: Foundation — Deduplication & Shared Infrastructure

### Task 1: Add new types to shared package

**Files:**
- Modify: `packages/shared/src/types/index.ts` (append after line ~451)

- [ ] **Step 1: Add weather types**

```ts
// ─── Weather ────────────────────────────────────────────────

export interface WeatherCurrent {
  temp: number;
  feelslike: number;
  conditions: string;
  icon: string;
  humidity: number;
  windspeed: number;
}

export interface WeatherDay {
  date: string;
  high: number;
  low: number;
  conditions: string;
  icon: string;
  precipprob: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherForecast {
  location: string;
  timezone: string;
  current: WeatherCurrent;
  forecast: WeatherDay[];
}
```

- [ ] **Step 2: Add event types**

```ts
// ─── Events ─────────────────────────────────────────────────

export interface TravylEvent {
  id: string;
  name: string;
  date: string;
  time: string | null;
  venue: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  price: string | null;
  category: string | null;
  photo_url: string | null;
  link: string | null;
}
```

- [ ] **Step 3: Add place detail, menu, suggest types**

```ts
// ─── Place Detail (from /api/places/{id}) ───────────────────

export interface PlaceDetailResponse {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  images: string[];
  image_url: string | null;
  categories: string[];
  hours: string | null;
  price: number | null;
  reviewCount: number | null;
}

// ─── Menu ───────────────────────────────────────────────────

export interface MenuItem {
  name: string;
  price: string | null;
  description: string | null;
}

export interface MenuResponse {
  restaurant_name: string;
  menu_url: string | null;
  items: MenuItem[];
  source: string;
}

// ─── Suggest ────────────────────────────────────────────────

export interface SuggestResponse {
  suggestions: PlaceItem[];
  hasMore: boolean;
  nextPage: number | null;
}

// ─── Server Favorites ───────────────────────────────────────

export interface ServerFavorite {
  id: string;
  place_id: string;
  user_id: string;
  created_at: string;
}
```

- [ ] **Step 4: Run typecheck**

Run: `cd /Users/z/Travyl/travyl && npm run typecheck`
Expected: PASS (types are just additions)

---

### Task 2: Move place mapping utilities to shared

**Files:**
- Create: `packages/shared/src/utils/places.ts`
- Modify: `packages/shared/src/utils/index.ts` (add re-export)

- [ ] **Step 1: Create `packages/shared/src/utils/places.ts`**

Consolidate from:
- `apps/web/app/api/places/route.ts` lines 263-352 (formatHours, formatDuration, mapType, mapCategory, mapTags, mapPrice, titleCase, FALLBACK_PHOTOS, getFallbackImage)
- `apps/web/app/api/places/[id]/route.ts` lines 108-175 (same functions)
- `apps/mobile/utils/placesApi.ts` lines 6-65 (upscaleImage, mapCategory, mapTags, mapBackendToPlaceItem)

Use the web `route.ts` versions as canonical (most complete). The file should export:

```ts
import { upscaleGoogleImage } from './index';
import type { PlaceItem } from '../types';

// ─── Backend response shape ─────────────────────────────────

export interface BackendPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  subcategory?: string;
  rating: number;
  review_count?: number;
  price_level?: string | number | null;
  description?: string | null;
  photo_url?: string | null;
  website?: string | null;
  address?: string | null;
  opening_hours?: Record<string, string>;
  visit_duration_min?: number | null;
  cuisine?: string | null;
  tags?: string[];
}

// ─── Mapping functions ──────────────────────────────────────

export function titleCase(s: string): string {
  return s.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export function formatHours(hours?: Record<string, string>): string | undefined {
  if (!hours) return undefined;
  const days = Object.entries(hours);
  if (days.length === 0) return undefined;
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = dayNames[new Date().getDay()];
  if (hours[today]) return `Today: ${hours[today]}`;
  return days[0][1];
}

export function formatDuration(minutes?: number | null): string | undefined {
  if (!minutes) return undefined;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? 's' : ''}`;
}

export function mapType(backendCat: string, requestedCat?: string): PlaceItem['type'] {
  const cat = backendCat.toLowerCase();
  const req = requestedCat?.toLowerCase();
  if (['restaurant', 'cafe', 'bar', 'dining'].includes(cat)) return 'restaurant';
  if (['museum', 'attraction', 'landmark', 'monument'].includes(cat)) {
    if (req && ['restaurant', 'cafe', 'bar', 'dining', 'nightlife'].includes(req)) return 'restaurant';
    if (req && ['park', 'garden', 'beach'].includes(req)) return 'experience';
    return 'attraction';
  }
  if (['park', 'garden', 'outdoor', 'beach'].includes(cat)) return 'experience';
  if (['event', 'festival', 'concert'].includes(cat)) return 'event';
  if (req) {
    if (['restaurant', 'cafe', 'bar', 'dining', 'nightlife'].includes(req)) return 'restaurant';
    if (['museum', 'landmark', 'sightseeing'].includes(req)) return 'attraction';
    if (['park', 'garden', 'beach'].includes(req)) return 'experience';
    if (['shopping', 'market'].includes(req)) return 'destination';
  }
  return 'destination';
}

export function mapCategory(cat: string, sub?: string): string {
  const c = (sub ?? cat).toLowerCase();
  if (['restaurant', 'dining'].includes(c)) return 'Culinary';
  if (c === 'cafe') return 'Culinary';
  if (c === 'bar' || c === 'nightlife') return 'Music Festival';
  if (c === 'museum') return 'Historical';
  if (['attraction', 'landmark', 'monument', 'sightseeing'].includes(c)) return 'Landmark';
  if (['park', 'garden'].includes(c)) return 'Nature';
  if (c === 'beach') return 'Coastal';
  if (c === 'shopping') return 'Market';
  return 'Cultural';
}

export function mapTags(cat: string, backendTags?: string[], cuisine?: string | null): string[] {
  const tags: string[] = (backendTags ?? []).map(titleCase);
  const c = cat.toLowerCase();
  if (c === 'restaurant' || c === 'cafe' || c === 'dining') tags.push('Food');
  if (c === 'museum' || c === 'attraction' || c === 'sightseeing') tags.push('Culture', 'Landmark');
  if (c === 'park' || c === 'garden') tags.push('Nature');
  if (c === 'bar' || c === 'nightlife') tags.push('Nightlife', 'Bar');
  if (c === 'beach') tags.push('Beach', 'Coast');
  if (c === 'shopping') tags.push('Markets');
  if (cuisine) tags.push(titleCase(cuisine));
  return [...new Set(tags)];
}

export function mapPrice(level: string | number | null | undefined): 1 | 2 | 3 | 4 | undefined {
  if (level == null) return undefined;
  if (typeof level === 'number') {
    return level >= 1 && level <= 4 ? (level as 1 | 2 | 3 | 4) : undefined;
  }
  const len = level.replace(/[^$]/g, '').length;
  if (len >= 1 && len <= 4) return len as 1 | 2 | 3 | 4;
  const num = parseInt(level, 10);
  if (num >= 1 && num <= 4) return num as 1 | 2 | 3 | 4;
  return undefined;
}

// ─── Fallback images ────────────────────────────────────────

export const FALLBACK_PHOTOS = [
  'photo-1488646953014-85cb44e25828', 'photo-1507525428034-b723cf961d3e',
  'photo-1476514525535-07fb3b4ae5f1', 'photo-1469854523086-cc02fe5d8800',
  'photo-1530789253388-582c481c54b0', 'photo-1502602898657-3e91760cbb34',
  'photo-1493976040374-85c8e12f0c0e', 'photo-1504150558240-0b4fd8946624',
  'photo-1528127269322-539801943592', 'photo-1558642452-9d2a7deb7f62',
  'photo-1506929562872-bb421503ef21', 'photo-1501785888041-af3ef285b470',
  'photo-1523906834658-6e24ef2386f9', 'photo-1504598318550-17eba1008a68',
  'photo-1516483638261-f4dbaf036963', 'photo-1526129318478-62ed807ebdf9',
];

export function getFallbackImage(name: string, idx: number): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  const photoIdx = (Math.abs(hash) + idx) % FALLBACK_PHOTOS.length;
  return `https://images.unsplash.com/${FALLBACK_PHOTOS[photoIdx]}?w=800&fit=crop&q=80&fm=webp`;
}

// ─── Canonical mapper ───────────────────────────────────────

export function mapBackendToPlaceItem(p: BackendPlace, idx = 0, requestedCategory?: string): PlaceItem {
  return {
    id: p.id,
    name: p.name,
    image: upscaleGoogleImage(p.photo_url) ?? getFallbackImage(p.name, idx),
    type: mapType(p.category, requestedCategory),
    rating: p.rating ?? 0,
    tagline: p.description?.split('.')[0] ?? p.category,
    category: mapCategory(p.category, p.subcategory),
    description: p.description ?? '',
    latitude: p.lat,
    longitude: p.lng,
    reviewCount: p.review_count,
    address: p.address,
    website: p.website,
    priceLevel: mapPrice(p.price_level),
    hours: formatHours(p.opening_hours),
    duration: formatDuration(p.visit_duration_min),
    tags: mapTags(p.category, p.tags, p.cuisine),
  };
}
```

- [ ] **Step 2: Add re-export to `packages/shared/src/utils/index.ts`**

Append to end of file:

```ts
export * from './places';
```

- [ ] **Step 3: Run typecheck**

Run: `cd /Users/z/Travyl/travyl && npm run typecheck`
Expected: PASS

---

### Task 3: Move KNOWN_CITIES to shared config

**Files:**
- Create: `packages/shared/src/config/knownCities.ts`
- Modify: `packages/shared/src/config/index.ts` (add re-export)

- [ ] **Step 1: Create `packages/shared/src/config/knownCities.ts`**

Copy the full 99-city table from `apps/web/app/api/places/route.ts` lines 6-99.

```ts
export const KNOWN_CITIES: Record<string, { lat: string; lng: string }> = {
  'paris': { lat: '48.8566', lng: '2.3522' },
  'london': { lat: '51.5074', lng: '-0.1278' },
  // ... all 99 cities from web route.ts
};
```

- [ ] **Step 2: Add re-export to `packages/shared/src/config/index.ts`**

```ts
export { KNOWN_CITIES } from './knownCities';
```

- [ ] **Step 3: Run typecheck**

---

### Task 4: Create API config and context

**Files:**
- Create: `packages/shared/src/config/api.ts`
- Modify: `packages/shared/src/config/index.ts` (add re-export)

- [ ] **Step 1: Create `packages/shared/src/config/api.ts`**

```ts
'use client';

import { createContext, useContext } from 'react';

export interface ApiConfig {
  /** Backend API base URL (e.g. https://api.dev.gotravyl.com) */
  backendUrl: string;
  /** Web proxy base URL (e.g. https://www.gotravyl.com) for Next.js API routes */
  webProxyUrl: string;
}

const ApiConfigContext = createContext<ApiConfig>({
  backendUrl: '',
  webProxyUrl: '',
});

export const ApiProvider = ApiConfigContext.Provider;

export function useApiConfig(): ApiConfig {
  return useContext(ApiConfigContext);
}

/**
 * Read API URLs from environment variables.
 * Works on both web (NEXT_PUBLIC_*) and mobile (EXPO_PUBLIC_*).
 */
export function getApiConfigFromEnv(): ApiConfig {
  return {
    backendUrl:
      process.env.EXPO_PUBLIC_RECOMMENDATION_API_URL ??
      process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL ??
      'https://api.dev.gotravyl.com',
    webProxyUrl:
      process.env.EXPO_PUBLIC_WEB_API_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'https://www.gotravyl.com',
  };
}
```

- [ ] **Step 2: Re-export from config barrel**

Add to `packages/shared/src/config/index.ts`:

```ts
export { ApiProvider, useApiConfig, getApiConfigFromEnv, type ApiConfig } from './api';
```

- [ ] **Step 3: Run typecheck**

---

### Task 5: Replace duplicates in web API routes

**Files:**
- Modify: `apps/web/app/api/places/route.ts`
- Modify: `apps/web/app/api/places/[id]/route.ts`

- [ ] **Step 1: Update `apps/web/app/api/places/route.ts`**

Replace local function definitions with imports from shared:

```ts
import {
  mapBackendToPlaceItem,
  KNOWN_CITIES,
  type BackendPlace,
} from '@travyl/shared';
```

Remove: local `KNOWN_CITIES` (lines 6-99), `BackendPlace` interface (lines 101-119), `upscaleGoogleImage` (lines 238-242), `FALLBACK_PHOTOS` (lines 245-254), `getFallbackImage` (lines 256-261), `formatHours` (lines 263-273), `formatDuration` (lines 275-281), `mapType` (lines 283-306), `mapCategory` (lines 309-320), `titleCase` (lines 323-325), `mapTags` (lines 327-338), `mapPrice` (lines 340-352).

Update the mapping in `GET` handler (lines 169-187) to use `mapBackendToPlaceItem(p, idx, requestedCat)`.

- [ ] **Step 2: Update `apps/web/app/api/places/[id]/route.ts`**

Replace local function definitions with imports from shared:

```ts
import {
  mapBackendToPlaceItem,
  type BackendPlace,
  upscaleGoogleImage,
  getFallbackImage,
  formatHours,
  formatDuration,
  mapType,
  mapCategory,
  mapTags,
  mapPrice,
} from '@travyl/shared';
```

Remove all local duplicate functions (lines 63-175). Keep the route handler but use shared mapper.

- [ ] **Step 3: Run typecheck and test web locally**

Run: `cd /Users/z/Travyl/travyl && npm run typecheck`
Run: `cd apps/web && npm run dev`
Test: `curl -s "http://localhost:3000/api/places?lat=37.7749&lng=-122.4194&limit=2" | python3 -m json.tool | head -20`
Expected: Same PlaceItem-shaped response as before.

---

### Task 6: Replace duplicates in mobile

**Files:**
- Modify: `apps/mobile/app/(tabs)/favorites/index.tsx`
- Modify: `apps/mobile/utils/placesApi.ts`

- [ ] **Step 1: Update `apps/mobile/app/(tabs)/favorites/index.tsx`**

Replace local `upscaleImage`, `mapToPlaceItem`, `KNOWN_CITIES` with shared imports:

```ts
import {
  Navy, groupPlacesByCollection, TextStyles, FontSize, type PlaceItem,
  upscaleGoogleImage, KNOWN_CITIES,
} from '@travyl/shared';
```

Replace `mapToPlaceItem` function with a thin wrapper or use inline mapping that passes through all fields from the web proxy response (which already returns PlaceItem-shaped objects):

```ts
function mapToPlaceItem(p: any): PlaceItem {
  return {
    ...p,
    image: upscaleGoogleImage(p.image || p.photo_url) ?? '',
    latitude: p.latitude ?? p.lat,
    longitude: p.longitude ?? p.lng,
    reviewCount: p.reviewCount ?? p.review_count,
  };
}
```

Remove local `KNOWN_CITIES` (lines 25-39) and `upscaleImage` (lines 42-45).

- [ ] **Step 2: Update `apps/mobile/utils/placesApi.ts`**

Replace all local functions with shared imports:

```ts
import {
  mapBackendToPlaceItem,
  upscaleGoogleImage,
  type BackendPlace,
} from '@travyl/shared';

const WEB_API = process.env.EXPO_PUBLIC_WEB_API_URL || 'https://www.gotravyl.com';

export async function fetchPlacesNearby(lat: number, lng: number, category = 'sightseeing', limit = 20) {
  const res = await fetch(`${WEB_API}/api/places?lat=${lat}&lng=${lng}&category=${category}&limit=${limit}`);
  if (!res.ok) return [];
  return res.json();
}
```

- [ ] **Step 3: Run typecheck**

---

## Phase 2: Tier 1 Hooks — Weather, Events, Destination Image, Suggest

### Task 7: Create useWeather hook

**Files:**
- Create: `packages/shared/src/hooks/useWeather.ts`
- Modify: `packages/shared/src/hooks/index.ts` (add re-export)

- [ ] **Step 1: Create the hook**

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiConfig } from '../config/api';
import type { WeatherForecast } from '../types';

export function useWeather(location: string | undefined) {
  const { backendUrl } = useApiConfig();

  return useQuery<WeatherForecast>({
    queryKey: ['weather', location],
    queryFn: async () => {
      const res = await fetch(
        `${backendUrl}/api/weather/forecast?location=${encodeURIComponent(location!)}&days=7`,
      );
      if (!res.ok) throw new Error('Weather fetch failed');
      return res.json();
    },
    enabled: !!location && !!backendUrl,
    staleTime: 30 * 60 * 1000, // 30 min
    gcTime: 60 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Re-export from hooks barrel**

Add to `packages/shared/src/hooks/index.ts`:

```ts
export { useWeather } from './useWeather';
```

- [ ] **Step 3: Run typecheck**

---

### Task 8: Create useEvents hook

**Files:**
- Create: `packages/shared/src/hooks/useEvents.ts`
- Modify: `packages/shared/src/hooks/index.ts`

- [ ] **Step 1: Create the hook**

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiConfig } from '../config/api';
import type { TravylEvent } from '../types';

export function useEvents(
  city: string | undefined,
  country: string | undefined,
  startDate?: string,
  endDate?: string,
) {
  const { backendUrl } = useApiConfig();

  return useQuery<TravylEvent[]>({
    queryKey: ['events', city, country, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        city: city!,
        country: country!,
      });
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);

      const res = await fetch(`${backendUrl}/api/events/search?${params}`);
      if (!res.ok) throw new Error('Events fetch failed');
      return res.json();
    },
    enabled: !!city && !!country && !!backendUrl,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
```

- [ ] **Step 2: Re-export from hooks barrel**

```ts
export { useEvents } from './useEvents';
```

---

### Task 9: Create useDestinationImage hook

**Files:**
- Create: `packages/shared/src/hooks/useDestinationImage.ts`
- Modify: `packages/shared/src/hooks/index.ts`

- [ ] **Step 1: Create the hook**

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiConfig } from '../config/api';

export function useDestinationImage(destination: string | undefined) {
  const { backendUrl } = useApiConfig();

  return useQuery<string | null>({
    queryKey: ['destination-image', destination],
    queryFn: async () => {
      const res = await fetch(
        `${backendUrl}/api/images/destination?destination=${encodeURIComponent(destination!)}`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      // Endpoint may return { url: string } or the URL directly
      return typeof data === 'string' ? data : data?.url ?? data?.image_url ?? null;
    },
    enabled: !!destination && !!backendUrl,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}
```

- [ ] **Step 2: Re-export from hooks barrel**

```ts
export { useDestinationImage } from './useDestinationImage';
```

---

### Task 10: Create usePlaceSuggest hook

**Files:**
- Create: `packages/shared/src/hooks/usePlaceSuggest.ts`
- Modify: `packages/shared/src/hooks/index.ts`

- [ ] **Step 1: Create the hook**

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiConfig } from '../config/api';
import type { SuggestResponse } from '../types';

export function usePlaceSuggest(
  destination: string | undefined,
  category = 'all',
  page = 0,
) {
  const { backendUrl } = useApiConfig();

  return useQuery<SuggestResponse>({
    queryKey: ['place-suggest', destination, category, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        destination: destination!,
        category,
        page: String(page),
      });
      const res = await fetch(`${backendUrl}/api/places/suggest?${params}`);
      if (!res.ok) throw new Error('Suggest fetch failed');
      return res.json();
    },
    enabled: !!destination && !!backendUrl,
    staleTime: 60 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Re-export from hooks barrel**

```ts
export { usePlaceSuggest } from './usePlaceSuggest';
```

---

### Task 11: Wire Tier 1 hooks into web places page

**Files:**
- Modify: `apps/web/app/(main)/places/page.tsx`
- May need to wrap app root with ApiProvider if not already done

- [ ] **Step 1: Add ApiProvider to web app layout**

Check if `apps/web/app/layout.tsx` or `apps/web/app/providers.tsx` exists. Wrap the app with:

```tsx
import { ApiProvider, getApiConfigFromEnv } from '@travyl/shared';

const apiConfig = getApiConfigFromEnv();

// Inside the provider tree:
<ApiProvider value={apiConfig}>
  {children}
</ApiProvider>
```

- [ ] **Step 2: Add weather pill and destination hero to places page**

In the places page header area, add:

```tsx
import { useWeather, useDestinationImage } from '@travyl/shared';

// Inside component:
const { data: weather } = useWeather(currentCity);
const { data: heroImage } = useDestinationImage(currentCity);
```

Render weather pill next to city name:
```tsx
{weather?.current && (
  <span className="inline-flex items-center gap-1 text-sm text-gray-500">
    {Math.round(weather.current.temp)}° · {weather.current.conditions}
  </span>
)}
```

Render hero image as background if available:
```tsx
{heroImage && (
  <div className="absolute inset-0 opacity-20">
    <img src={heroImage} className="w-full h-full object-cover" alt="" />
  </div>
)}
```

- [ ] **Step 3: Add events tab to places page category pills**

Add "Events" as a browse category. When selected, fetch from `useEvents` instead of `/api/places`:

```tsx
import { useEvents } from '@travyl/shared';

const { data: events } = useEvents(
  currentCity,
  'US', // derive country from city or use a lookup
);
```

Map events to PlaceItem-compatible cards for rendering in the existing grid.

- [ ] **Step 4: Test locally**

Run: `cd apps/web && npm run dev`
Navigate to places page, verify:
- Weather pill shows temp + conditions
- Hero image loads behind header
- Events tab loads event cards

---

### Task 12: Wire Tier 1 hooks into web trip overview

**Files:**
- Modify: `apps/web/app/(dashboard)/trip/[id]/page.tsx`

- [ ] **Step 1: Add weather widget to "At a Glance"**

```tsx
import { useWeather, useEvents, useDestinationImage } from '@travyl/shared';

const { data: weather } = useWeather(trip?.destination);
const { data: events } = useEvents(trip?.destination_city, trip?.destination_country, trip?.start_date, trip?.end_date);
const { data: heroImage } = useDestinationImage(trip?.destination);
```

- [ ] **Step 2: Render weather in overview section**

Add a weather card showing current conditions and multi-day forecast.

- [ ] **Step 3: Render "Happening During Your Trip" events section**

Map `events` array to event cards with date, venue, photo, and "Get Tickets" link.

- [ ] **Step 4: Use destination image as hero header**

Replace fallback Unsplash hero with `heroImage` when available.

- [ ] **Step 5: Test locally**

Navigate to a trip overview page. Verify weather, events, and hero image render.

---

## Phase 3: Tier 2 Hooks — Place Detail, Enrich, Menu

### Task 13: Create usePlaceDetail hook

**Files:**
- Create: `packages/shared/src/hooks/usePlaceDetail.ts`
- Modify: `packages/shared/src/hooks/index.ts`

- [ ] **Step 1: Create the hook**

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiConfig } from '../config/api';
import type { PlaceDetailResponse } from '../types';

export function usePlaceDetail(placeId: string | undefined) {
  const { backendUrl } = useApiConfig();

  return useQuery<PlaceDetailResponse>({
    queryKey: ['place-detail', placeId],
    queryFn: async () => {
      const res = await fetch(
        `${backendUrl}/api/places/${encodeURIComponent(placeId!)}`,
      );
      if (!res.ok) throw new Error('Place detail fetch failed');
      return res.json();
    },
    enabled: !!placeId && !!backendUrl,
    staleTime: 60 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Re-export**

---

### Task 14: Create usePlaceEnrich hook

**Files:**
- Create: `packages/shared/src/hooks/usePlaceEnrich.ts`
- Modify: `packages/shared/src/hooks/index.ts`

- [ ] **Step 1: Create the hook**

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiConfig } from '../config/api';

interface EnrichResponse {
  photos: string[];
}

export function usePlaceEnrich(placeId: string | undefined, name: string | undefined) {
  const { backendUrl } = useApiConfig();

  return useQuery<EnrichResponse>({
    queryKey: ['place-enrich', placeId],
    queryFn: async () => {
      const params = new URLSearchParams({ placeId: placeId! });
      if (name) params.set('name', name);
      const res = await fetch(`${backendUrl}/api/places/enrich?${params}`);
      if (!res.ok) return { photos: [] };
      return res.json();
    },
    enabled: !!placeId && !!backendUrl,
    staleTime: 60 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Re-export**

---

### Task 15: Create usePlaceMenu hook

**Files:**
- Create: `packages/shared/src/hooks/usePlaceMenu.ts`
- Modify: `packages/shared/src/hooks/index.ts`

- [ ] **Step 1: Create the hook**

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiConfig } from '../config/api';
import type { MenuResponse } from '../types';

export function usePlaceMenu(name: string | undefined, city?: string) {
  const { backendUrl } = useApiConfig();

  return useQuery<MenuResponse>({
    queryKey: ['place-menu', name, city],
    queryFn: async () => {
      const params = new URLSearchParams({ name: name! });
      if (city) params.set('city', city);
      const res = await fetch(`${backendUrl}/api/places/menu?${params}`);
      if (!res.ok) throw new Error('Menu fetch failed');
      return res.json();
    },
    enabled: !!name && !!backendUrl,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Re-export**

---

### Task 16: Wire Tier 2 into web PlaceDetailOverlay

**Files:**
- Modify: `apps/web/components/PlaceDetailOverlay.tsx`

- [ ] **Step 1: Replace inline fetch with usePlaceDetail**

Current code (lines 57-67) does an inline React Query fetch. Replace with:

```tsx
import { usePlaceDetail, usePlaceEnrich, usePlaceMenu } from '@travyl/shared';

const { data: detail } = usePlaceDetail(place.id);
const { data: enrichPhotos } = usePlaceEnrich(place.id, place.name);
const { data: menu } = usePlaceMenu(
  place.type === 'restaurant' ? place.name : undefined,
  // derive city from place data
);
```

- [ ] **Step 2: Merge enriched data into display**

Merge `detail` fields (phone, hours, address, website) into the card back. Merge `enrichPhotos.photos` into the image gallery.

- [ ] **Step 3: Add menu section for restaurants**

If `menu?.items?.length > 0`, render a menu preview section showing top 5 items with prices and a "View Full Menu" link.

- [ ] **Step 4: Test locally**

Click a place card on the web explore/places page. Verify detail data loads on flip.

---

### Task 17: Wire Tier 2 into mobile MagazineCurtain

**Files:**
- Modify: `apps/mobile/components/places/MagazineCurtain.tsx`

- [ ] **Step 1: Replace inline fetch with hooks**

Remove the inline `fetch` on lines 88-96 and the `enriched`/`enriching` state. Replace with:

```tsx
import { usePlaceDetail, usePlaceEnrich, usePlaceMenu } from '@travyl/shared';

const { data: detail, isLoading: enriching } = usePlaceDetail(isFlipped ? place.id : undefined);
const { data: enrichPhotos } = usePlaceEnrich(isFlipped ? place.id : undefined, place.name);
const { data: menu } = usePlaceMenu(
  isFlipped && place.type === 'restaurant' ? place.name : undefined,
);
```

- [ ] **Step 2: Merge enriched photos into image gallery**

If `enrichPhotos?.photos?.length`, append to the `images` array.

- [ ] **Step 3: Add menu section on card back for restaurants**

Below the tags section, if `menu?.items?.length`, show top 5 menu items.

- [ ] **Step 4: Test on mobile**

User tests card flip on mobile device.

---

## Phase 4: Tier 3 Hooks — Server Favorites, Hotels, Flights

### Task 18: Create useServerFavorites hook

**Files:**
- Create: `packages/shared/src/hooks/useServerFavorites.ts`
- Modify: `packages/shared/src/hooks/index.ts`

- [ ] **Step 1: Create the hook**

```ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiConfig } from '../config/api';
import type { ServerFavorite } from '../types';

export function useServerFavorites(authToken: string | null) {
  const { backendUrl } = useApiConfig();
  const queryClient = useQueryClient();

  const query = useQuery<ServerFavorite[]>({
    queryKey: ['server-favorites'],
    queryFn: async () => {
      const res = await fetch(`${backendUrl}/api/favorites`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Favorites fetch failed');
      return res.json();
    },
    enabled: !!authToken && !!backendUrl,
    staleTime: 5 * 60 * 1000,
  });

  const addFavorite = useMutation({
    mutationFn: async (placeId: string) => {
      const res = await fetch(`${backendUrl}/api/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ place_id: placeId }),
      });
      if (!res.ok) throw new Error('Add favorite failed');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['server-favorites'] }),
  });

  const removeFavorite = useMutation({
    mutationFn: async (favoriteId: string) => {
      const res = await fetch(`${backendUrl}/api/favorites/${favoriteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Remove favorite failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['server-favorites'] }),
  });

  return {
    ...query,
    addFavorite: addFavorite.mutate,
    removeFavorite: removeFavorite.mutate,
    isAdding: addFavorite.isPending,
    isRemoving: removeFavorite.isPending,
  };
}
```

- [ ] **Step 2: Re-export**

---

### Task 19: Create useHotelSearch and useFlightSearch hooks

**Files:**
- Create: `packages/shared/src/hooks/useHotelSearch.ts`
- Create: `packages/shared/src/hooks/useFlightSearch.ts`
- Modify: `packages/shared/src/hooks/index.ts`

- [ ] **Step 1: Create useHotelSearch**

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiConfig } from '../config/api';

export interface HotelSearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
}

export function useHotelSearch(params: Partial<HotelSearchParams>) {
  const { backendUrl } = useApiConfig();
  const { destination, checkIn, checkOut, guests } = params;
  const enabled = !!destination && !!checkIn && !!checkOut && !!backendUrl;

  return useQuery({
    queryKey: ['hotel-search', destination, checkIn, checkOut, guests],
    queryFn: async () => {
      const qs = new URLSearchParams({
        destination: destination!,
        check_in: checkIn!,
        check_out: checkOut!,
      });
      if (guests) qs.set('guests', String(guests));
      const res = await fetch(`${backendUrl}/api/hotels/search?${qs}`);
      if (!res.ok) throw new Error('Hotel search failed');
      return res.json();
    },
    enabled,
    staleTime: 15 * 60 * 1000,
  });
}
```

- [ ] **Step 2: Create useFlightSearch**

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiConfig } from '../config/api';

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  passengers?: number;
}

export function useFlightSearch(params: Partial<FlightSearchParams>) {
  const { backendUrl } = useApiConfig();
  const { origin, destination, departDate, returnDate, passengers } = params;
  const enabled = !!origin && !!destination && !!departDate && !!backendUrl;

  return useQuery({
    queryKey: ['flight-search', origin, destination, departDate, returnDate, passengers],
    queryFn: async () => {
      const qs = new URLSearchParams({
        origin: origin!,
        destination: destination!,
        depart_date: departDate!,
      });
      if (returnDate) qs.set('return_date', returnDate);
      if (passengers) qs.set('passengers', String(passengers));
      const res = await fetch(`${backendUrl}/api/flights/search?${qs}`);
      if (!res.ok) throw new Error('Flight search failed');
      return res.json();
    },
    enabled,
    staleTime: 15 * 60 * 1000,
  });
}
```

- [ ] **Step 3: Re-export both from hooks barrel**

---

### Task 20: Wire server favorites into web

**Files:**
- Modify: `apps/web/components/PlaceDetailOverlay.tsx` (or wherever favorites are toggled)
- Modify: web favorites page/section

- [ ] **Step 1: Add useServerFavorites alongside existing localStorage favorites**

For authenticated users, use server favorites. For anonymous, keep localStorage. On login, sync local → server.

- [ ] **Step 2: Test locally**

Sign in, favorite a place, refresh — verify it persists from server.

---

### Task 21: Wire server favorites into mobile

**Files:**
- Modify: `apps/mobile/app/(tabs)/favorites/index.tsx`
- Modify: `apps/mobile/components/places/MagazineCurtain.tsx`

- [ ] **Step 1: Replace AsyncStorage favorites with useServerFavorites for authed users**

Keep AsyncStorage as fallback for unauthenticated users.

- [ ] **Step 2: Test on mobile**

User tests favorites sync.

---

### Task 22: Wire hotel/flight search into web trip tabs

**Files:**
- Modify: `apps/web/app/(dashboard)/trip/[id]/hotels/page.tsx` (or equivalent)
- Modify: `apps/web/app/(dashboard)/trip/[id]/flights/page.tsx` (or equivalent)

- [ ] **Step 1: Add search form to hotels tab**

Destination pre-filled from trip data. Date pickers for check-in/check-out. Guests count.

- [ ] **Step 2: Render useHotelSearch results below trip_context hotels**

- [ ] **Step 3: Same pattern for flights tab**

Origin input, dates from trip, passengers count. Render results below trip_context flights.

- [ ] **Step 4: Test locally**

Navigate to a trip's hotels and flights tabs. Verify search form and results.

---

## Phase 5: Mobile UI Integration (after web is tested)

### Task 23: Wire Tier 1 into mobile places page

**Files:**
- Modify: `apps/mobile/app/(tabs)/favorites/index.tsx`

- [ ] **Step 1: Add ApiProvider to mobile app root**

In `apps/mobile/app/_layout.tsx`, wrap with ApiProvider:

```tsx
import { ApiProvider, getApiConfigFromEnv } from '@travyl/shared';

const apiConfig = getApiConfigFromEnv();

// Wrap children:
<ApiProvider value={apiConfig}>
  {children}
</ApiProvider>
```

- [ ] **Step 2: Add weather pill to places page header**

```tsx
import { useWeather, useDestinationImage } from '@travyl/shared';

const { data: weather } = useWeather(currentCity);
const { data: heroImage } = useDestinationImage(currentCity);
```

Render weather inline with city name. Use heroImage as header background.

- [ ] **Step 3: Add events tab to category pills**

Add "Events" pill. When selected, fetch with `useEvents` and render as cards.

- [ ] **Step 4: Test on mobile**

User tests places page on device.

---

### Task 24: Wire Tier 1 into mobile trip overview

**Files:**
- Modify: `apps/mobile/app/trip/[id]/index.tsx`

- [ ] **Step 1: Add weather widget and events section**

Same hooks as web — `useWeather`, `useEvents`, `useDestinationImage`.

- [ ] **Step 2: Test on mobile**

---

### Task 25: Wire hotel/flight search into mobile trip tabs

**Files:**
- Modify: mobile trip hotel/flight pages (if they exist)

- [ ] **Step 1: Add search forms and results using shared hooks**

Same pattern as web — `useHotelSearch`, `useFlightSearch`.

- [ ] **Step 2: Test on mobile**
