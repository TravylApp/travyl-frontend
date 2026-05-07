/**
 * @module services
 * Barrel export for all shared service modules.
 * Re-exports the Supabase client, all data-fetching functions, budget CRUD,
 * packing CRUD, and the packing suggestion generator.
 */

export { supabase, configureSupabase } from './supabase';
export {
  fetchTrips,
  fetchCollaboratorTrips,
  fetchSavedItems,
  fetchProfile,
  updateProfile,
  uploadAvatar,
  updateUserMetadata,
  updateUserPassword,
  fetchMosaicTiles,
  fetchInspirationCards,
  fetchExploreRows,
  fetchHeroConfig,
  fetchTripById,
  fetchItineraryDays,
  fetchFlights,
  fetchHotels,
  fetchCars,
  fetchActivities,
  forkTrip,
  fetchPublicTrips,
  fetchUserPublicTrips,
  fetchTripByShareToken,
  updateTripVisibility,
  ensureShareLinkToken,
  rotateShareLinkToken,
  addToItinerary,
  removeFromItinerary,
  toggleFavorite,
  updateBudgetExpense,
  addBudgetExpense,
  updateTripThemeSettings,
  updateTripDetails,
  deleteTrip,
  leaveTrip,
  inviteCollaborator,
  fetchCollaborators,
  updateCollaboratorRole,
  removeCollaborator,
  acceptInviteByToken,
  joinTripViaLink,
  findPendingInviteByEmail,
  savePlanToSupabase,
  fetchDocumentUploadUrl,
  uploadToS3Presigned,
  fetchDocumentParse,
} from './api';
export {
  fetchBudgetCategories,
  upsertBudgetCategory,
  deleteBudgetCategory,
  fetchManualExpenses,
  addManualExpense,
  deleteManualExpense,
} from './budgetService';
export {
  fetchPackingItems,
  fetchPackingAuditLog,
  insertPackingItem,
  updatePackingItemPacked,
  deletePackingItem,
  fetchPackingSuggestions,
  updateSuggestionStatus,
  dismissAllSuggestions,
  seedDefaultPackingItems,
} from './packingService';

export {
  generatePackingSuggestions,
} from './packingSuggestions';

export {
  fetchDiscoverPage,
  fetchNearbyPlaces,
  fetchNearbyPage,
  searchPlaces,
  dedupPlaces,
  distanceLabel,
  mapApiPlace,
} from './placesDiscovery';
export type { DiscoverPageResult } from './placesDiscovery';

export { fetchTransit } from './transitApi';

export {
  fetchAuditEntries,
  groupAuditEntries,
  buildRestorePlan,
} from './historyService';
