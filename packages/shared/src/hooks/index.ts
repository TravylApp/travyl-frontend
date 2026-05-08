/**
 * @module hooks
 * Central barrel export for all shared React hooks consumed by both the
 * Next.js web app (`@travyl/web`) and the Expo mobile app (`@travyl/mobile`).
 *
 * Hooks are grouped by concern:
 * - **Home/Explore**: `useHomeScreen`, `useExploreRows`, `useExploreData`,
 *   `useMosaicTiles`, `useInspirationCards`, `useHeroConfig`
 * - **Trips**: `useTrips`, `useTrip`, `useItineraryDays`, `useItineraryScreen`,
 *   `useForkTrip`, `useCollaborators`, `useTripPlanner`
 * - **Budget/Packing**: `useTripBudget`, `usePackingList`, `usePackingSuggestions`,
 *   `useExchangeRates`, `useHomeCurrency`
 * - **Places/Search**: `useSimilarPlaces`, `usePlaceImage`, `usePlaceImages`,
 *   `usePlaceSuggest`, `usePlaceDetail`, `usePlaceEnrich`, `usePlaceMenu`
 * - **External data**: `useFlights`, `useHotels`, `useWeather`, `useEvents`,
 *   `useDestinationImage`, `useTagUsDestinations`, `useTrendingDestinations`
 * - **Filters**: `useRestaurantFilters`, `useActivityFilters`
 * - **Auth/Profile**: `useProfile`, `saveAnonTripId`
 * - **Commerce**: `useServerFavorites`, `useHotelSearch`, `useFlightSearch`
 */

'use client';

export { useTrips } from './useTrips';
export { useHomeScreen } from './useHomeScreen';
export { useExploreRows } from './useExploreRows';
export { useExploreData } from './useExploreData';
export { useMosaicTiles } from './useMosaicTiles';
export { useInspirationCards } from './useInspirationCards';
export { useHeroConfig } from './useHeroConfig';
export { useTagUsDestinations } from './useTagUsDestinations';
export { useTrip } from './useTrip';
export { useItineraryDays } from './useItineraryDays';
export { useTripActivities, type TripActivityRow } from './useTripActivities';
export { useFlights } from './useFlights';
export { useHotels } from './useHotels';
export { useCars } from './useCars';
export { useItineraryScreen } from './useItineraryScreen';
export { useForkTrip } from './useForkTrip';
export { useSimilarPlaces } from './useSimilarPlaces';
export { useCollaborators } from './useCollaborators';
export { useExchangeRates } from './useExchangeRates';
export { useTripBudget } from './useTripBudget';
export { usePackingList } from './usePackingList';
export { usePackingSuggestions } from './usePackingSuggestions';
export { usePlaceImage, usePlaceImages } from './usePlaceImage';
export { useProfile } from './useProfile';
export { useDisplayPrefs } from './useDisplayPrefs';
export type { DisplayPrefs } from './useDisplayPrefs';
export { useRestaurantFilters, RESTAURANT_CATEGORIES, CUISINE_SUBFILTERS, RESTAURANT_SORT_OPTIONS, RESTAURANT_CATEGORY_ICONS } from './useRestaurantFilters';
export type { RestaurantCategory, RestaurantSortOption } from './useRestaurantFilters';
export { useActivityFilters, ACTIVITY_CATEGORIES, ACTIVITY_SUBFILTERS, ACTIVITY_SORT_OPTIONS, ACTIVITY_CATEGORY_ICONS, mapActivityCategory } from './useActivityFilters';
export type { ActivityFilterCategory, ActivitySortOption } from './useActivityFilters';
export { useHomeCurrency } from './useHomeCurrency';
export { useTripPlanner } from './useTripPlanner';
export type { FollowUpQuestion, PlanResponse, DayPlan, DaySlot, TripExtraction } from './useTripPlanner';
export { useWeather } from './useWeather';
export { useEvents } from './useEvents';
export { useDestinationImage } from './useDestinationImage';
export { usePlaceSuggest } from './usePlaceSuggest';
export { usePlaceDetail } from './usePlaceDetail';
export { usePlaceEnrich } from './usePlaceEnrich';
export { usePlaceMenu } from './usePlaceMenu';
export { useServerFavorites } from './useServerFavorites';
export { useHotelSearch } from './useHotelSearch';
export type { HotelSearchParams } from './useHotelSearch';
export { useFlightSearch } from './useFlightSearch';
export type { FlightSearchParams } from './useFlightSearch';
export { useTrendingDestinations } from './useTrendingDestinations';
export type { TrendingDestination } from './useTrendingDestinations';
export { useCarSearch } from './useCarSearch';
export type { CarSearchParams } from './useCarSearch';
export { useTransit } from './useTransit';
export { useDayStory } from './useDayStory';
export { useDayImages } from './useDayImages';