import { supabase } from './supabase';
import type { Trip, Profile, SavedItem, MosaicTile, InspirationCard, ExploreRow, HeroConfig, Activity, ItineraryDayWithActivities, Flight, Hotel } from '../types';

export async function fetchTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchSavedItems(): Promise<SavedItem[]> {
  const { data, error } = await supabase
    .from('saved_items')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// ─── Home Page Data ──────────────────────────────────────────

export async function fetchMosaicTiles(): Promise<MosaicTile[]> {
  const { data, error } = await supabase
    .from('mosaic_tiles')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchInspirationCards(): Promise<InspirationCard[]> {
  const { data, error } = await supabase
    .from('inspiration_cards')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchExploreRows(): Promise<ExploreRow[]> {
  const { data, error } = await supabase
    .from('explore_rows')
    .select('*, items:explore_items(*)');
  if (error) throw error;
  return data ?? [];
}

export async function fetchHeroConfig(): Promise<HeroConfig | null> {
  const { data, error } = await supabase
    .from('hero_config')
    .select('*, suggestions:hero_suggestions(*)');
  if (error) throw error;
  return data?.[0] ?? null;
}

// ─── Itinerary Data ─────────────────────────────────────────

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

export async function fetchItineraryDays(tripId: string): Promise<ItineraryDayWithActivities[]> {
  const { data, error } = await supabase
    .from('itinerary_days').select('*, activities(*)')
    .eq('trip_id', tripId).order('day_number', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((day: any) => ({
    ...day,
    activities: (day.activities ?? []).sort(
      (a: Activity, b: Activity) => (a.sort_order ?? 999) - (b.sort_order ?? 999)
    ),
  }));
}

export async function fetchFlights(tripId: string): Promise<Flight[]> {
  const { data, error } = await supabase
    .from('flights').select('*').eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchHotels(tripId: string): Promise<Hotel[]> {
  const { data, error } = await supabase
    .from('hotels').select('*').eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

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
 * Fork a trip, copying all related data (itinerary days, activities, flights, hotels)
 * with attribution to the original trip.
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
  const { forked_from_trip_id, fork_count, is_public, created_at, updated_at, id, ...tripData } = originalTrip;
  const newTripData = {
    ...tripData,
    user_id: user.id,
    forked_from_trip_id: tripId,
    title: `${originalTrip.title} (Fork)`,
    is_generated: false,
    is_shared: false,
    share_link_token: null,
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

  // 7. Increment fork count on original trip
  const { error: updateError } = await supabase
    .from('trips')
    .update({ fork_count: (originalTrip.fork_count || 0) + 1 })
    .eq('id', tripId);

  if (updateError) {
    console.warn('Failed to increment fork count:', updateError);
    // Don't throw - fork was successful, just attribution update failed
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
    .or('is_public.eq.true,is_shared.eq.true')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch a user's public trips (for public profile page)
 */
export async function fetchUserPublicTrips(userId: string): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch a trip by share token (for shared trip access)
 */
export async function fetchTripByShareToken(token: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('share_link_token', token)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

/**
 * Update trip public status
 */
export async function updateTripVisibility(tripId: string, isPublic: boolean): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .update({ is_public: isPublic, updated_at: new Date().toISOString() })
    .eq('id', tripId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
