# Design: Replace Amazon Location with Foursquare Direct Search

**Date:** 2026-03-19
**Branch:** feature/tra-204
**Status:** Approved

## Problem

The For You panel shows empty because the `/suggest` Lambda uses Amazon Location (`SearchPlaceIndexForText`) as its POI discovery layer. Amazon Location is a geocoding/routing service — its activity discovery coverage is poor, and queries like "things to do in Paris" return sparse or zero results.

## Solution

Replace Amazon Location with Foursquare's Places Search API (`GET /v3/places/search`). Foursquare is purpose-built for POI discovery and already returns photos, ratings, price, and tips in a single call — eliminating the two-step Location → enrich pipeline.

## Data Flow (new)

```
GET /suggest?destination=Paris
  → Foursquare /v3/places/search?query=things+to+do&near=Paris&fields=...
  → map to SuggestionCard[] (photos, rating, price, description included)
  → DynamoDB cache (unchanged)
  → return { suggestions, source }
```

## Files Changed

### `services/lib/location.ts` — rewrite

- Remove all `@aws-sdk/client-location` imports and `LocationClient`
- Replace `searchPlaces()` implementation with a call to `GET /v3/places/search`
  - `query`: user-supplied query string, or `"things to do"` as default
  - `near`: the destination string (e.g. `"Paris"`)
  - `fields`: `fsq_id,name,categories,photos,rating,price,tips,geocodes,location,description`
  - Auth: `Authorization: <Resource.FoursquareApiKey.value>` header
- Keep exported `searchPlaces(destination, options?)` signature identical so callers require no changes
- Map Foursquare categories to our slugs using Foursquare category names
- Map response directly to enriched `SuggestionCard[]` — photos, rating, price, description populated inline (no separate enrichment pass needed)
- `getPlaceDetails()` can be removed (no longer used)

**Category mapping (Foursquare → our slugs):**

| Foursquare category name contains | Our slug |
|---|---|
| Museum, Gallery, Exhibition | `museum` |
| Restaurant, Food, Café, Bar | `dining` |
| Nightlife, Club, Bar | `nightlife` |
| Shopping, Market, Boutique | `shopping` |
| Park, Garden, Trail, Outdoor | `outdoor` |
| Tour, Sightseeing, Landmark, Monument, Historic | `sightseeing` |
| Theater, Music, Cultural, Arts | `cultural` |
| (default) | `sightseeing` |

### `services/suggest.ts` — simplify

- Remove `enrichSuggestions` import and call
- `searchPlaces()` now returns fully enriched cards, so the result is used directly

### `infra/storage.ts` — remove Place Index

- Remove `placeIndex` export (`aws.location.PlaceIndex`)
- On next `sst deploy`, AWS will destroy the Place Index resource

### `infra/api.ts` — remove Location dependencies

- Remove `locationPolicy` (`aws.iam.Policy`) definition
- Remove `permissions` array from `/suggest` and `/search` route configs
- Remove `PLACE_INDEX_NAME` environment variable from both routes
- Remove `placeIndex` import from `./storage`

## What Does Not Change

- `services/search.ts` — calls `searchPlaces()` with the same interface, works automatically
- `services/interact.ts` — unrelated
- `services/lib/cache.ts` — unrelated
- `services/lib/auth.ts` — unrelated
- `services/lib/foursquare.ts` — `enrichSuggestions` and `matchPlace` become unused; can be deleted or left in place
- All frontend code (`useSuggestions`, `ForYouPanel`, etc.) — no changes needed

## Deployment

After code changes:
1. `sst deploy` — provisions updated Lambda code, destroys Place Index, removes IAM policy
2. No new secrets needed — `FoursquareApiKey` is already in SST secrets

## Error Handling

- Foursquare `fetch` errors surface as thrown exceptions → React Query catches → `error` state in ForYouPanel (existing UI)
- If Foursquare returns 0 results for a destination, `suggestions: []` → ForYouPanel empty state (acceptable)
- Individual field mismatches (missing photo, null rating) degrade gracefully — `SuggestionCard` has nullable `imageUrl`, `rating`, `price`
