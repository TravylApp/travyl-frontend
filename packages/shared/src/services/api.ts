/**
 * @module api
 * Supabase data-fetching and mutation functions used throughout the app.
 * Queries the `trips`, `profiles`, `activities`, `flights`, `hotels`,
 * `trip_collaborators`, and related Supabase tables.
 * Consumed by React Query hooks in `packages/shared/src/hooks/`.
 */

import { supabase } from './supabase';
import { mapToDbType, getWebApiBase } from '../utils';
import type { Trip, Profile, SavedItem, MosaicTile, InspirationCard, ExplorePlaceRow, HeroConfig, Activity, ItineraryDayWithActivities, Flight, Hotel, TripCollaborator, TripNote, Visibility, LinkPermission, CollaboratorRole } from '../types';

/**
 * Fetches all trips owned by a user, sorted by creation date (newest first).
 * @param userId - Supabase auth user UUID
 * @returns Array of Trip objects
 * @throws PostgrestError if the query fails
 */
export async function fetchTrips(userId: string): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetches trips where the user is an accepted collaborator (not the owner).
 * Uses a security definer function to avoid RLS issues with joins.
 * @param userId - Supabase auth user UUID
 * @returns Array of Trip objects the user collaborates on
 * @throws PostgrestError if the query fails
 */
export async function fetchCollaboratorTrips(userId: string): Promise<Trip[]> {
  // Use the security definer function to avoid RLS issues
  const { data, error } = await supabase
    .rpc('get_collaborator_trips', { p_user_id: userId });
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetches all saved items for the currently authenticated user, sorted newest first.
 * @returns Array of SavedItem objects
 * @throws PostgrestError if the query fails
 */
export async function fetchSavedItems(): Promise<SavedItem[]> {
  const { data, error } = await supabase
    .from('saved_items')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetches a user profile by ID.
 * If the profile row does not exist yet, creates a default one with null name/avatar.
 * @param userId - Supabase auth user UUID
 * @returns Profile object, or null if creation also failed
 */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // If profile doesn't exist yet, create a default one
    if (error || !data) {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          display_name: null,
          avatar_url: null,
        })
        .select()
        .single();

      if (insertError) return null;
      return newProfile;
    }

    return data;
  } catch { return null; }
}

/**
 * Updates a user's profile fields (display name, avatar, location).
 * @param userId - Supabase auth user UUID
 * @param updates - Partial profile fields to update
 * @returns The updated Profile object
 * @throws PostgrestError if the update fails
 */
export async function updateProfile(userId: string, updates: Partial<Pick<Profile, 'display_name' | 'avatar_url' | 'city' | 'country' | 'preferences' | 'onboarding_completed'>>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Updates the phone number for the currently authenticated user.
 * Stores phone in user metadata to avoid SMS verification requirements.
 * @param phone - The new phone number
 * @throws Error if no user is authenticated
 * @throws AuthError if the update fails
 */
export async function updateUserPhone(phone: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase.auth.updateUser({
    data: { phone },
  });

  if (error) throw error;
}

export async function uploadAvatar(userId: string, base64Data: string): Promise<string> {
  // Validate the data URL format
  if (!base64Data.startsWith('data:image/')) {
    throw new Error('Invalid image data - must be a data URL');
  }

  // Check file size (limit to 100KB for database storage)
  const base64Content = base64Data.split(';base64,').pop();
  if (!base64Content) {
    throw new Error('Invalid base64 data');
  }

  const sizeInKB = ((base64Content.length * 3) / 4) / 1024;

  if (sizeInKB > 100) {
    throw new Error('Image must be smaller than 100KB for database storage. Please use a smaller image or compress it first.');
  }

  // Return the data URL directly - it will be stored in the database
  return base64Data;
}

/**
 * Updates the Supabase Auth `user_metadata` for the currently authenticated user.
 * @param metadata - Key-value pairs to merge into user metadata
 * @throws Error if no user is authenticated
 * @throws AuthError if the update fails
 */
export async function updateUserMetadata(metadata: Record<string, unknown>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase.auth.updateUser({
    data: metadata,
  });

  if (error) throw error;
}

/**
 * Updates the password for the currently authenticated user.
 * @param newPassword - The new plaintext password
 * @throws AuthError if the update fails
 */
export async function updateUserPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}

// ─── Home Page Data ──────────────────────────────────────────

// These tables don't exist in the current schema — return empty to avoid 404s
/** Returns an empty array — mosaic_tiles table is not yet in the schema. */
export async function fetchMosaicTiles(): Promise<MosaicTile[]> { return []; }
/** Returns an empty array — inspiration_cards table is not yet in the schema. */
export async function fetchInspirationCards(): Promise<InspirationCard[]> { return []; }
/** Returns an empty array — explore_place_rows table is not yet in the schema. */
export async function fetchExploreRows(): Promise<ExplorePlaceRow[]> { return []; }
/** Returns null — hero_config table is not yet in the schema. */
export async function fetchHeroConfig(): Promise<HeroConfig | null> { return null; }

// ─── Itinerary Data ─────────────────────────────────────────

/**
 * Fetches a single trip by its primary key.
 * Remaps `owner_id` → `user_id` for legacy schema compatibility.
 * @param tripId - UUID of the trip
 * @returns The matching Trip object
 * @throws PostgrestError if the trip is not found or query fails
 */
export async function fetchTripById(tripId: string): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips').select('*').eq('id', tripId).single();
  if (error) throw error;
  // If schema uses owner_id + JSONB data column, remap; otherwise return as-is
  if (data && 'owner_id' in data && !('user_id' in data)) {
    const { data: tripData, owner_id, ...rest } = data as any;
    return { ...rest, ...(typeof tripData === 'object' ? tripData : {}), user_id: owner_id } as Trip;
  }
  return data as Trip;
}

/**
 * Returns an empty array — itinerary_days table is not used.
 * Day-by-day data lives in `trip_context.itinerary` on the trips row.
 * @param _tripId - Unused trip ID
 */
export async function fetchItineraryDays(_tripId: string): Promise<ItineraryDayWithActivities[]> {
  return [];
}

/**
 * Fetches all flights associated with a trip, sorted by creation date.
 * Falls back to an empty array if the `flights` table does not exist yet.
 * @param tripId - UUID of the trip
 * @returns Array of Flight objects, or empty array on table-missing error
 */
export async function fetchFlights(tripId: string): Promise<Flight[]> {
  const { data, error } = await supabase
    .from('flights').select('*').eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) return []; // Table doesn't exist yet — fall back to trip_context
  return data ?? [];
}

/**
 * Fetches all hotels associated with a trip, sorted by creation date.
 * Falls back to an empty array if the `hotels` table does not exist yet.
 * @param tripId - UUID of the trip
 * @returns Array of Hotel objects, or empty array on table-missing error
 */
export async function fetchHotels(tripId: string): Promise<Hotel[]> {
  const { data, error } = await supabase
    .from('hotels').select('*').eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) return []; // Table doesn't exist yet — fall back to trip_context
  return data ?? [];
}

/**
 * Fetches all activities for a trip, ordered by `sort_order` ascending.
 * @param tripId - UUID of the trip
 * @returns Array of Activity objects
 * @throws PostgrestError if the query fails
 */
export async function fetchActivities(tripId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ─── Fork Trip Functions ───────────────────────────────────────

/**
 * Forks a trip by deep-copying all related data (itinerary days, activities, flights, hotels)
 * into a new private trip attributed to the current user.
 * Increments the fork count on the original via `increment_fork_count` RPC.
 * @param tripId - UUID of the trip to fork
 * @returns The newly created Trip object
 * @throws Error if user is not authenticated or original trip is not found
 * @throws PostgrestError on any database write failure
 */
export async function forkTrip(tripId: string): Promise<Trip> {
  // 1. Fetch the original trip
  const { data: originalTrip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (tripError) throw tripError;
  if (!originalTrip) throw new Error('Trip not found');

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // 2. Create new trip with fork attribution
  const { forked_from_trip_id, fork_count, created_at, updated_at, id, ...tripData } = originalTrip;
  const newTripData = {
    ...tripData,
    user_id: user.id,
    forked_from_trip_id: tripId,
    title: `${originalTrip.title} (Fork)`,
    is_generated: false,
    share_link_token: null,
    visibility: 'private' as const,
  };

  const { data: newTrip, error: createError } = await supabase
    .from('trips')
    .insert(newTripData)
    .select()
    .single();

  if (createError) throw createError;
  if (!newTrip) throw new Error('Failed to create forked trip');

  // 3. Fetch and copy itinerary days
  const { data: itineraryDays, error: daysError } = await supabase
    .from('itinerary_days')
    .select('*')
    .eq('trip_id', tripId);

  if (daysError) throw daysError;

  // 4. Copy itinerary days, activities, and related data
  if (itineraryDays && itineraryDays.length > 0) {
    for (const day of itineraryDays) {
      const { id: dayId, trip_id, created_at, ...dayData } = day;
      const newDayData = { ...dayData, trip_id: newTrip.id };

      const { data: newDay, error: dayInsertError } = await supabase
        .from('itinerary_days')
        .insert(newDayData)
        .select()
        .single();

      if (dayInsertError) throw dayInsertError;

      // Copy activities for this day
      if (newDay) {
        const { data: activities, error: activitiesError } = await supabase
          .from('activities')
          .select('*')
          .eq('itinerary_day_id', dayId);

        if (activitiesError) throw activitiesError;

        if (activities && activities.length > 0) {
          const newActivities = activities.map((activity) => {
            const { id: activityId, itinerary_day_id, trip_id, created_at, ...activityData } = activity;
            return {
              ...activityData,
              itinerary_day_id: newDay.id,
              trip_id: newTrip.id,
            };
          });

          const { error: activityInsertError } = await supabase
            .from('activities')
            .insert(newActivities);

          if (activityInsertError) throw activityInsertError;
        }
      }
    }
  }

  // 5. Copy flights
  const { data: flights, error: flightsError } = await supabase
    .from('flights')
    .select('*')
    .eq('trip_id', tripId);

  if (flightsError) throw flightsError;

  if (flights && flights.length > 0) {
    const newFlights = flights.map((flight) => {
      const { id, trip_id, created_at, ...flightData } = flight;
      return { ...flightData, trip_id: newTrip.id };
    });

    const { error: flightInsertError } = await supabase
      .from('flights')
      .insert(newFlights);

    if (flightInsertError) throw flightInsertError;
  }

  // 6. Copy hotels
  const { data: hotels, error: hotelsError } = await supabase
    .from('hotels')
    .select('*')
    .eq('trip_id', tripId);

  if (hotelsError) throw hotelsError;

  if (hotels && hotels.length > 0) {
    const newHotels = hotels.map((hotel) => {
      const { id, trip_id, created_at, ...hotelData } = hotel;
      return { ...hotelData, trip_id: newTrip.id };
    });

    const { error: hotelInsertError } = await supabase
      .from('hotels')
      .insert(newHotels);

    if (hotelInsertError) throw hotelInsertError;
  }

  // 7. Increment fork count on original trip via security-definer RPC (bypasses RLS)
  const { error: rpcError } = await supabase.rpc('increment_fork_count', { trip_id: tripId });
  if (rpcError) {
    console.warn('Failed to increment fork count:', rpcError);
  }

  return newTrip;
}

/**
 * Fetch all public trips (for explore page)
 */
export async function fetchPublicTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*, profiles!trips_user_id_fkey(display_name, avatar_url)')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetches a specific user's public trips (for their public profile page).
 * @param userId - Supabase auth user UUID
 * @returns Array of Trip objects with visibility === 'public'
 * @throws PostgrestError if the query fails
 */
export async function fetchUserPublicTrips(userId: string): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetches a trip by its share link token.
 * Returns null if the token is invalid or the trip is private.
 * @param token - UUID share link token from the trip's `share_link_token` column
 * @returns Matching Trip object, or null if not found / not accessible
 */
export async function fetchTripByShareToken(token: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('share_link_token', token)
    .maybeSingle();
  if (error || !data) return null;
  if (data.visibility === 'private') return null;
  return data;
}

/**
 * Updates the visibility and optional link permission for a trip.
 * @param tripId - UUID of the trip
 * @param visibility - New visibility level ('private' | 'link' | 'public')
 * @param linkPermission - Optional permission for link-based access ('viewer' | 'editor')
 * @throws PostgrestError if the update fails
 */
export async function updateTripVisibility(tripId: string, visibility: Visibility, linkPermission?: LinkPermission): Promise<void> {
  const updates: Record<string, unknown> = { visibility }
  if (linkPermission !== undefined) { updates.link_permission = linkPermission }
  const { error } = await supabase.from('trips').update(updates).eq('id', tripId)
  if (error) throw error
}

/**
 * Returns the existing share link token for a trip, or creates one if missing.
 * @param tripId - UUID of the trip
 * @returns The share link token UUID string
 * @throws PostgrestError if the fetch or update fails
 */
export async function ensureShareLinkToken(tripId: string): Promise<string> {
  const { data: trip, error: fetchError } = await supabase.from('trips').select('share_link_token').eq('id', tripId).single()
  if (fetchError) throw fetchError
  if (trip.share_link_token) return trip.share_link_token
  const token = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 6)}`
  const { error: updateError } = await supabase.from('trips').update({ share_link_token: token }).eq('id', tripId)
  if (updateError) throw updateError
  return token
}

/**
 * Generates a new UUID share link token for a trip, invalidating the old one.
 * @param tripId - UUID of the trip
 * @returns The new share link token UUID string
 * @throws PostgrestError if the update fails
 */
export async function rotateShareLinkToken(tripId: string): Promise<string> {
  const newToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 6)}`
  const { error } = await supabase
    .from('trips')
    .update({ share_link_token: newToken })
    .eq('id', tripId)
  if (error) throw error
  return newToken
}

/**
 * Updates core trip metadata fields.
 * If dates changed, trims `trip_context.itinerary` to the new duration.
 * If destination changed, clears stale `trip_context` enrichment keys so
 * the overview re-enriches on next visit.
 * @param tripId - UUID of the trip
 * @param updates - Fields to update (title, destination, dates, budget, currency, travelers, status)
 * @throws PostgrestError if the update fails
 */
export async function updateTripDetails(
  tripId: string,
  updates: Partial<Pick<Trip, 'title' | 'destination' | 'start_date' | 'end_date' | 'budget' | 'currency' | 'travelers' | 'status'>>
): Promise<void> {
  // If dates changed, also trim trip_context.itinerary to match new duration
  if (updates.start_date && updates.end_date) {
    const newDuration = Math.max(1, Math.ceil(
      (new Date(updates.end_date).getTime() - new Date(updates.start_date).getTime()) / 86400000
    ) + 1)

    const { data: existing } = await supabase
      .from('trips')
      .select('trip_context')
      .eq('id', tripId)
      .single()

    const itinerary = existing?.trip_context?.itinerary as unknown[] | undefined
    if (itinerary && itinerary.length > newDuration) {
      const trimmed = itinerary.slice(0, newDuration)
      const ctx = { ...existing!.trip_context, itinerary: trimmed }
      const { error } = await supabase.from('trips').update({ ...updates, trip_context: ctx }).eq('id', tripId)
      if (error) throw error
      return
    }
  }

  // If destination changed, clear stale trip_context so re-enrichment repopulates
  if (updates.destination) {
    const { data: existing } = await supabase.from('trips').select('trip_context, destination').eq('id', tripId).single()
    if (existing && updates.destination !== existing.destination) {
      const ctx = { ...(existing.trip_context || {}) }
      for (const key of ['wiki', 'country', 'cuisine', 'phrases', 'cost_of_living', 'safety', 'sunrise', 'aqi', 'timezone_info', 'holidays', 'nearby_cities', 'hero_image_url', 'hero_images', 'explore_items', 'foursquare_venues', 'events', 'news', 'restaurants', 'hotels', 'lat', 'lng', 'quick_facts']) {
        delete ctx[key]
      }
      const { error } = await supabase.from('trips').update({ ...updates, trip_context: ctx }).eq('id', tripId)
      if (error) throw error
      return
    }
  }

  const { error } = await supabase.from('trips').update(updates).eq('id', tripId)
  if (error) throw error
}

/**
 * Permanently deletes a trip and all its related rows (cascaded by the DB).
 * @param tripId - UUID of the trip to delete
 * @throws PostgrestError if the delete fails
 */
export async function deleteTrip(tripId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_trip_cascade', { p_trip_id: tripId })
  if (error) throw error
}

/**
 * Removes a collaborator's membership from a trip (used by the collaborator themselves).
 * @param tripId - UUID of the trip to leave
 * @param userId - Supabase auth UUID of the collaborator leaving
 * @throws PostgrestError if the delete fails
 */
export async function leaveTrip(tripId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_collaborators')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', userId)
  if (error) throw error
}

// ─── Mutations ─────────────────────────────────────────────

/**
 * Adds an item to the trip itinerary at a specific day and optional time slot.
 * @param tripId - UUID of the trip
 * @param itemId - UUID of the item to add
 * @param dayNumber - 1-based day index in the itinerary
 * @param timeSlot - Optional time slot string (e.g. '09:00')
 * @throws PostgrestError if the insert fails
 */
export async function addToItinerary(tripId: string, itemId: string, dayNumber: number, timeSlot?: string) {
  const { error } = await supabase.from('itinerary_items').insert({
    trip_id: tripId,
    item_id: itemId,
    day_number: dayNumber,
    time_slot: timeSlot ?? null,
  });
  if (error) throw error;
}

/**
 * Removes an item from the trip itinerary.
 * @param tripId - UUID of the trip
 * @param itemId - UUID of the item to remove
 * @throws PostgrestError if the delete fails
 */
export async function removeFromItinerary(tripId: string, itemId: string) {
  const { error } = await supabase
    .from('itinerary_items')
    .delete()
    .eq('trip_id', tripId)
    .eq('item_id', itemId);
  if (error) throw error;
}

/**
 * Toggles a favorite on or off for a trip item.
 * Deletes the row if currently favorited; inserts a new row if not.
 * @param tripId - UUID of the trip
 * @param itemId - UUID of the item to toggle
 * @param isFavorited - Current state; pass true to unfavorite, false to favorite
 * @throws PostgrestError if the insert or delete fails
 */
export async function toggleFavorite(tripId: string, itemId: string, isFavorited: boolean) {
  if (isFavorited) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('trip_id', tripId)
      .eq('item_id', itemId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('favorites')
      .insert({ trip_id: tripId, item_id: itemId });
    if (error) throw error;
  }
}

/**
 * Updates an existing budget expense row.
 * @param expenseId - UUID of the budget_expenses row
 * @param updates - Fields to patch (amount and/or note)
 * @throws PostgrestError if the update fails
 */
export async function updateBudgetExpense(expenseId: string, updates: { amount?: number; note?: string }) {
  const { error } = await supabase
    .from('budget_expenses')
    .update(updates)
    .eq('id', expenseId);
  if (error) throw error;
}

/**
 * Inserts a new budget expense for a trip.
 * @param tripId - UUID of the trip
 * @param category - Budget category label (e.g. 'accommodation', 'food')
 * @param amount - Expense amount in the trip's currency
 * @param note - Free-text description of the expense
 * @throws PostgrestError if the insert fails
 */
export async function addBudgetExpense(tripId: string, category: string, amount: number, note: string) {
  const { error } = await supabase
    .from('budget_expenses')
    .insert({ trip_id: tripId, category, amount, note });
  if (error) throw error;
}

/**
 * Updates visual theme settings for a trip (theme preset, custom color, tab overrides).
 * @param tripId - UUID of the trip
 * @param updates - Partial theme settings to persist
 * @throws PostgrestError if the update fails
 */
export async function updateTripThemeSettings(
  tripId: string,
  updates: {
    theme?: string
    custom_theme_color?: string | null
    tab_color_overrides?: Record<string, string>
    itinerary_color_overrides?: Record<string, string>
    hidden_tabs?: Record<string, boolean>
  }
): Promise<void> {
  const { error } = await supabase.from('trips').update(updates).eq('id', tripId)
  if (error) throw error
}

// ── Collaborators ──────────────────────────────────────

/**
 * Fetches all collaborators for a trip, sorted by join date ascending.
 * @param tripId - UUID of the trip
 * @returns Array of TripCollaborator objects (includes pending invites)
 * @throws PostgrestError if the query fails
 */
export async function fetchCollaborators(tripId: string): Promise<TripCollaborator[]> {
  const { data, error } = await supabase
    .from('trip_collaborators')
    .select('*, profile:profiles(display_name, avatar_url)')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(({ profile, ...collaborator }) => ({
    ...collaborator,
    display_name: profile?.display_name ?? null,
    avatar_url: profile?.avatar_url ?? null,
  })) as TripCollaborator[]
}

/**
 * Updates the role of an existing collaborator.
 * @param collaboratorId - UUID of the trip_collaborators row
 * @param role - New role ('viewer' | 'editor' | 'admin')
 * @throws PostgrestError if the update fails
 */
export async function updateCollaboratorRole(collaboratorId: string, role: CollaboratorRole): Promise<void> {
  const { error } = await supabase.from('trip_collaborators').update({ role_type: role }).eq('id', collaboratorId)
  if (error) throw error
}

/**
 * Removes a collaborator from a trip (used by the trip owner).
 * @param collaboratorId - UUID of the trip_collaborators row to delete
 * @throws PostgrestError if the delete fails
 */
export async function removeCollaborator(collaboratorId: string): Promise<void> {
  const { error } = await supabase.from('trip_collaborators').delete().eq('id', collaboratorId)
  if (error) throw error
}

/**
 * Accepts a pending collaborator invite via its invite token.
 * Calls the `accept_invite_by_token` Supabase RPC.
 * @param inviteToken - UUID invite token from the email link
 * @returns Object containing the `tripId` of the accepted trip
 * @throws PostgrestError if the RPC fails or token is invalid
 */
export async function acceptInviteByToken(inviteToken: string): Promise<{ tripId: string }> {
  const { data, error } = await supabase.rpc('accept_invite_by_token', { p_token: inviteToken })
  if (error) throw error
  return { tripId: (data as { trip_id: string }).trip_id }
}

/**
 * Joins a trip via a share link, inserting an accepted collaborator row.
 * Used when a user follows a link-permission trip URL while authenticated.
 * @param tripId - UUID of the trip to join
 * @param userId - Supabase auth UUID of the user joining
 * @param role - Role granted to the user ('viewer' | 'editor')
 * @throws PostgrestError if the insert fails
 */
export async function joinTripViaLink(tripId: string, userId: string, role: CollaboratorRole): Promise<void> {
  console.log('[joinTripViaLink] Adding collaborator:', { tripId, userId, role })
  try {
    // Use SECURITY DEFINER function to bypass RLS and avoid infinite recursion
    const { error, data, status, statusText } = await supabase
      .rpc('join_trip_via_link', {
        p_trip_id: tripId,
        p_user_id: userId,
        p_role_type: role
      })

    if (error) {
      const errorInfo = {
        message: error.message || 'No error message',
        details: error.details || 'No details',
        hint: error.hint || 'No hint',
        code: error.code || 'No code',
        status,
        statusText,
        name: error.name,
        timestamp: new Date().toISOString()
      }
      console.error('[joinTripViaLink] Failed to add collaborator:', JSON.stringify(errorInfo, null, 2))
      throw new Error(error.message || 'Failed to join trip')
    }
    console.log('[joinTripViaLink] Successfully added collaborator:', data)
  } catch (err) {
    console.error('[joinTripViaLink] Exception caught:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
    throw err
  }
}

/**
 * Checks whether a pending invite already exists for a given email on a trip.
 * Used to avoid sending duplicate invites.
 * @param tripId - UUID of the trip
 * @param email - Email address to check (compared case-insensitively)
 * @returns Existing TripCollaborator row, or null if none found
 * @throws PostgrestError if the query fails
 */
export async function findPendingInviteByEmail(tripId: string, email: string): Promise<TripCollaborator | null> {
  const { data, error } = await supabase.from('trip_collaborators').select('*').eq('trip_id', tripId).eq('invited_email', email.toLowerCase()).eq('invite_status', 'pending').maybeSingle()
  if (error) throw error
  return data
}

/**
 * Sends a collaborator invite for a trip to the given email address.
 * Returns the existing pending invite if one already exists for that email.
 * Generates a UUID `invite_token` that is included in the email link.
 * @param tripId - UUID of the trip
 * @param email - Email address of the invitee
 * @param role - Role to grant upon acceptance ('viewer' | 'editor')
 * @returns The TripCollaborator row (new or existing)
 * @throws Error if user is not authenticated
 * @throws PostgrestError if the insert fails
 */
export async function inviteCollaborator(tripId: string, email: string, role: CollaboratorRole): Promise<TripCollaborator> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Skip if there's already a pending invite for this email
  const existing = await findPendingInviteByEmail(tripId, email)
  if (existing) return existing

  const inviteToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 6)}`
  const { data, error } = await supabase
    .from('trip_collaborators')
    .insert({
      trip_id: tripId,
      invited_email: email.toLowerCase(),
      role_type: role,
      invite_status: 'pending',
      invited_by: user.id,
      invite_token: inviteToken,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Save AI Plan to Supabase ─────────────────────────────

/**
 * Structured AI planner response ready to be persisted to Supabase.
 * Produced by the mobile AI planner and passed directly to `savePlanToSupabase`.
 */
interface PlanToSave {
  extracted: {
    destination: { city: string; country: string; lat: number; lng: number };
    dates: { start: string | null; end: string | null };
    duration_days: number;
    travelers: { count: number };
    budget_level: string | null;
    daily_estimate_usd: number;
    interests: string[];
  };
  itinerary: Array<{
    day: number;
    date: string;
    slots: Array<{
      poi: {
        id: string;
        name: string;
        lat: number;
        lng: number;
        category: string;
        subcategory: string;
        rating?: number;
        description?: string;
        photo_url?: string;
        visit_duration_min: number;
        tags: string[];
      };
      start_time: string;
      end_time: string;
      start_time_12h: string;
      end_time_12h: string;
      travel_from_prev_min: number;
    }>;
    weather?: { date: string; high_c: number; low_c: number; condition: string; icon: string };
  }>;
  hotels: Array<{ name: string; stars: number; price_per_night: number; currency: string; rating?: number; photo_url?: string; amenities: string[]; booking_url?: string }>;
  flights: Array<{ airline: string; departure_time: string; arrival_time: string; duration_min: number; stops: number; price: number; currency: string; booking_url?: string }>;
  destination_photo_url: string | null;
  timezone: string | null;
}

/**
 * Persists an AI-generated plan to Supabase, including the trip row, hotels, flights,
 * activities, and triggers background enrichment (wiki, cuisine, cost_of_living, etc.).
 * Trims the itinerary to `plan.extracted.duration_days` to avoid oversized WAF payloads.
 * @param plan - Structured AI plan object containing destination, itinerary, hotels, flights
 * @param onProgress - Optional callback called with a stage label and 0-100 percentage
 * @returns The UUID of the newly created trip
 * @throws Error if trip creation fails
 */
export async function savePlanToSupabase(
  plan: PlanToSave,
  onProgress?: (stage: string, pct: number) => void
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()

  const ext = plan.extracted
  const dest = ext.destination
  // Cap duration to a reasonable max — prevent 30+ day trips from vague prompts
  const rawDuration = ext.duration_days || 5
  const duration = Math.min(rawDuration, 14)

  // Ensure dates are concrete and never in the past
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  if (!ext.dates.start || ext.dates.start < tomorrowStr) {
    ext.dates.start = tomorrowStr
  }
  // Always recompute end_date from the capped duration so the day-strip count
  // matches `trip_context.itinerary.length`. Previously, the AI could return
  // a month-long range (e.g. May 1 → May 31) and only the itinerary was capped,
  // leaving the trip header showing 31 days against a 14-day itinerary.
  const startMs = new Date(ext.dates.start + 'T00:00:00').getTime()
  const computedEnd = new Date(startMs + (duration - 1) * 86400000)
    .toISOString().split('T')[0]
  if (!ext.dates.end || ext.dates.end <= ext.dates.start || ext.dates.end > computedEnd) {
    ext.dates.end = computedEnd
  }

  // Cap itinerary to requested duration — API sometimes returns more days than asked
  const cappedItinerary = plan.itinerary.slice(0, duration)

  onProgress?.('Creating trip...', 10)

  // Build trimmed trip_context — keep payloads small for CloudFront WAF (<8KB)
  const tripContext: Record<string, unknown> = {
    lat: dest.lat,
    lng: dest.lng,
    hero_image_url: plan.destination_photo_url || null,
    hero_images: plan.destination_photo_url ? [plan.destination_photo_url] : [],
    quick_facts: {
      budget_level: ext.budget_level,
      daily_budget: ext.daily_estimate_usd,
      interests: ext.interests,
      timezone: plan.timezone,
    },
    lede_text: `A ${ext.duration_days}-day trip to ${dest.city}.`,
    // Trimmed hotels — name/price/rating/stars only
    hotels: (plan.hotels ?? []).slice(0, 5).map((h: any) => ({
      id: `hotel-${h.name?.replace(/\s+/g, '-').toLowerCase()}`,
      name: h.name, rating: h.rating, price: h.price_per_night, stars: h.stars,
    })),
    // Trimmed flights — airline/price/times only
    flights: (plan.flights ?? []).slice(0, 5).map((f: any) => ({
      airline: f.airline, price: f.price,
      departure_time: f.departure_time, arrival_time: f.arrival_time,
    })),
    // Trimmed itinerary — POI id/name/category/lat/lng + times only (capped to duration)
    itinerary: cappedItinerary.map((day: any) => ({
      day: day.day, date: day.date,
      weather: day.weather ? { high_c: day.weather.high_c, low_c: day.weather.low_c, condition: day.weather.condition } : undefined,
      slots: (day.slots ?? []).map((slot: any) => ({
        start_time: slot.start_time, end_time: slot.end_time,
        poi: { id: slot.poi.id, name: slot.poi.name, category: slot.poi.category, lat: slot.poi.lat, lng: slot.poi.lng },
      })),
    })),
    // Trimmed explore items — id/name/category only
    explore_items: cappedItinerary.flatMap((day: any) =>
      (day.slots ?? []).map((slot: any) => ({
        id: slot.poi.id, title: slot.poi.name, category: slot.poi.category,
      }))
    ).filter((e: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === e.id) === i),
  }

  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .insert({
      user_id: user?.id || null,
      visibility: user?.id ? 'private' : 'public',
      title: `${dest.city}, ${dest.country}`,
      destination: `${dest.city}, ${dest.country}`,
      start_date: ext.dates.start,
      end_date: ext.dates.end,
      travelers: ext.travelers.count,
      budget: ext.daily_estimate_usd * ext.duration_days,
      currency: 'USD',
      status: 'planning',
      is_generated: true,
      trip_context: tripContext,
    })
    .select('id')
    .single()

  if (tripErr) {
    throw new Error(`Failed to create trip: ${tripErr.message} (code: ${tripErr.code})`)
  }
  const tripId = trip.id

  onProgress?.('Saving hotels...', 60)

  // Save hotels to hotels table (best effort, non-blocking)
  if (plan.hotels.length > 0) {
    const hotelRows = plan.hotels.slice(0, 5).map(h => {
      const extra = h as Record<string, unknown>
      return {
        trip_id: tripId,
        data: {
          name: h.name, price_per_night: h.price_per_night, currency: h.currency,
          rating: h.rating || null, star_rating: h.stars || null,
          image_url: h.photo_url || null, check_in: ext.dates.start, check_out: ext.dates.end,
          amenities: (extra.amenities as string[]) || [],
          booking_url: h.booking_url || (extra.link as string) || null,
        },
      }
    })
    const { error: hotelErr } = await supabase.from('hotels').insert(hotelRows)
    if (hotelErr) console.error('Failed to save hotels:', hotelErr)
  }

  onProgress?.('Saving flights...', 80)

  // Save flights to flights table (best effort, non-blocking)
  if (plan.flights.length > 0) {
    const flightRows = plan.flights.slice(0, 5).map((f) => ({
      trip_id: tripId,
      data: {
        airline: f.airline, departure_at: f.departure_time, arrival_at: f.arrival_time,
        price: f.price, currency: f.currency,
      },
    }))
    const { error: flightErr } = await supabase.from('flights').insert(flightRows)
    if (flightErr) console.error('Failed to save flights:', flightErr)
  }

  // Save itinerary activities to activity table (powers the calendar)
  onProgress?.('Saving activities...', 90)
  const activityRows: Record<string, unknown>[] = []
  let sortOrder = 0
  for (const day of cappedItinerary) {
    const dayDate = day.date || ext.dates.start
    for (const slot of day.slots ?? []) {
      const poi = slot.poi ?? {}
      activityRows.push({
        trip_id: tripId,
        user_id: user?.id || null,
        activity_name: poi.name || 'Activity',
        activity_type: mapToDbType(poi.category || 'sightseeing'),
        starting_date: dayDate,
        ending_date: dayDate,
        starting_time: slot.start_time || '09:00',
        ending_time: slot.end_time || '11:00',
        latitude: poi.lat || null,
        longitude: poi.lng || null,
        notes: poi.description || null,
        sort_order: sortOrder++,
        activity_data: {
          category: poi.category,
          location_name: poi.name,
          image_url: poi.photo_url || null,
          rating: poi.rating || null,
          tags: poi.tags || [],
        },
      })
    }
  }
  if (activityRows.length > 0) {
    const { error: actErr } = await supabase.from('activity').insert(activityRows)
    if (actErr) console.error('Failed to save activities:', actErr)
  }

  // Fire enrichment in the background (fills wiki, news, phrases, cuisine, cost_of_living, etc.)
  onProgress?.('Enriching trip details...', 95)
  try {
    const enrichBase = getWebApiBase()
    const { data: { session } } = await supabase.auth.getSession()
    const enrichRes = await fetch(`${enrichBase}/api/trips/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        ...(enrichBase ? { 'Origin': enrichBase } : {}),
      },
      body: JSON.stringify({ tripId }),
    })
    if (!enrichRes.ok) console.error('Enrichment failed:', enrichRes.status)
  } catch (e) {
    // Non-blocking — overview page will auto-enrich on first visit as fallback
    console.error('Enrichment error:', e)
  }

  onProgress?.('Done!', 100)
  return tripId
}
