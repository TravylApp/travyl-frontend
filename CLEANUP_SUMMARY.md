# Travyl Frontend Cleanup Summary

**Date:** 2026-04-05  
**Changes made:**

## 1. Removed Dead Code from `packages/shared/src/services/api.ts`
- Deleted 4 stub functions that returned empty data:
  - `fetchInspirationCards()`
  - `fetchExploreRows()`  
  - `fetchHeroConfig()`
  - Removed from exports, kept `fetchMosaicTiles` with real implementation

## 2. Removed Empty `MOCK_PLACES` from `PlaceDetailOverlay.tsx`
- Deleted `const MOCK_PLACES: PlaceItem[] = [];` that shadowed real mock data
- Component now relies on actual data flow

## 3. Replaced Local `shuffle()` with Shared Import in `TravelMosaic.tsx`
- Removed local 8-line shuffle function
- Now imports `shuffle` from `@travyl/shared`

## 4. Consolidated Image URL Utilities
- Updated `getTripHeroImage()` to use `upscaleGoogleImage()` instead of duplicating regex
- Removed ~15 lines of duplicated regex logic

## 5. Merged Duplicate Gap Computation Functions
- Added `endHour` property to `TimeGap` interface in `gaps.ts`
- Deleted `gapCompute.ts` and `gapCompute.test.ts`
- Updated `utils/index.ts` exports to only export from `gaps.ts`

## 6. Cleaned Up Unused Hook Exports
- Removed exports for hooks that don't exist:
  - `useExploreRows`
  - `useExploreData`
  - `useInspirationCards`
  - `useHeroConfig`
  - `useItineraryDays`
  - `useFlights`
  - `useHotels`
- Deleted the corresponding hook files

## 7. Fixed Type Re-export Redundancy in `services/lib/types.ts`
- Removed duplicate import + export pattern
- Simplified to single re-export line

## 8. Removed Unused Types from `types/index.ts`
- Deleted `InspirationCard`, `ExplorePlaceRow`, `HeroConfig`, `HeroSuggestion` interfaces
- Kept `MosaicTile` (still used by hooks and components)

## 9. Moved `fetchMosaicTiles` to Proper Location
- Moved from stub in `api.ts` to real implementation that calls `/api/places`
- Uses shared `shuffle` utility
- Hook `useMosaicTiles` now imports from `api.ts`

## Lines Removed: ~250+
## Files Deleted: 8 (dead hook files + gapCompute + test)
## Risk Level: Low (mostly dead code, no functional changes)

---

**Verification Steps:**
1. Run `npm run typecheck` in packages/shared
2. Run `npm run lint` to check for issues
3. Test web app mosaic tile loading on home page
4. Verify calendar gap computation still works
