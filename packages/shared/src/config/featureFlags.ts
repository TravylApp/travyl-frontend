/**
 * Feature flags for controlling mock data behavior.
 *
 * When USE_MOCK_DATA is true:
 *   - useItineraryScreen falls back to MOCK_TRIP, MOCK_DAYS, etc. when API returns empty
 *   - Components show demo content for development/presentation
 *
 * When USE_MOCK_DATA is false:
 *   - No mock fallbacks — components show empty/loading states when API returns empty
 *   - This is the production setting once the backend populates trip_context
 *
 * To remove all mock data later:
 *   1. Set USE_MOCK_DATA = false
 *   2. Verify all pages work with real data
 *   3. Delete the mock data files (mockItineraryData.ts, mockTripsData.ts, etc.)
 *   4. Remove this flag
 */
export const USE_MOCK_DATA = true;
