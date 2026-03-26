import { supabase } from './supabase';
import type { Trip, Profile, SavedItem, MosaicTile, InspirationCard, ExplorePlaceRow, HeroConfig, Activity, ItineraryDayWithActivities, Flight, Hotel, TripCollaborator, TripNote, Visibility, LinkPermission, CollaboratorRole } from '../types';

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

export async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  } catch { return null; }
}

// ─── Home Page Data ──────────────────────────────────────────

export async function fetchMosaicTiles(): Promise<MosaicTile[]> {
  try {
    const { data, error } = await supabase
      .from('mosaic_tiles')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch { return []; }
}

export async function fetchInspirationCards(): Promise<InspirationCard[]> {
  try {
    const { data, error } = await supabase
      .from('inspiration_cards')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch { return []; }
}

export async function fetchExploreRows(): Promise<ExplorePlaceRow[]> {
  try {
    const { data, error } = await supabase
      .from('explore_rows')
      .select('*, items:explore_items(*)');
    if (error) return [];
    return data ?? [];
  } catch { return []; }
}

export async function fetchHeroConfig(): Promise<HeroConfig | null> {
  try {
    const { data, error } = await supabase
      .from('hero_config')
      .select('*, suggestions:hero_suggestions(*)');
    if (error) return null;
    return data?.[0] ?? null;
  } catch { return null; }
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

// These tables don't exist yet — data lives in trip_context JSONB.
// Pages already fall back to trip_context when these return empty.
// TODO: Create these tables when we need per-item CRUD (booking, reordering).
export async function fetchItineraryDays(tripId: string): Promise<ItineraryDayWithActivities[]> {
  const { data, error } = await supabase
    .from('itinerary_days').select('*, activities(*)')
    .eq('trip_id', tripId).order('day_number', { ascending: true });
  if (error) return []; // Table doesn't exist yet — fall back to trip_context
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
  if (error) return []; // Table doesn't exist yet — fall back to trip_context
  return data ?? [];
}

export async function fetchHotels(tripId: string): Promise<Hotel[]> {
  const { data, error } = await supabase
    .from('hotels').select('*').eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) return []; // Table doesn't exist yet — fall back to trip_context
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
    .maybeSingle();
  if (error || !data) return null;
  if (data.visibility === 'private') return null;
  return data;
}

export async function updateTripVisibility(tripId: string, visibility: Visibility, linkPermission?: LinkPermission): Promise<void> {
  const updates: Record<string, unknown> = { visibility }
  if (linkPermission !== undefined) { updates.link_permission = linkPermission }
  const { error } = await supabase.from('trips').update(updates).eq('id', tripId)
  if (error) throw error
}

export async function ensureShareLinkToken(tripId: string): Promise<string> {
  const { data: trip, error: fetchError } = await supabase.from('trips').select('share_link_token').eq('id', tripId).single()
  if (fetchError) throw fetchError
  if (trip.share_link_token) return trip.share_link_token
  const token = crypto.randomUUID()
  const { error: updateError } = await supabase.from('trips').update({ share_link_token: token }).eq('id', tripId)
  if (updateError) throw updateError
  return token
}

export async function updateTripDetails(
  tripId: string,
  updates: Partial<Pick<Trip, 'title' | 'destination' | 'start_date' | 'end_date' | 'budget' | 'currency' | 'travelers' | 'status'>>
): Promise<void> {
  const { error } = await supabase.from('trips').update(updates).eq('id', tripId)
  if (error) throw error
}

export async function deleteTrip(tripId: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', tripId)
  if (error) throw error
}

export async function leaveTrip(tripId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_collaborators')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', userId)
  if (error) throw error
}

// ─── Mutations ─────────────────────────────────────────────

export async function addToItinerary(tripId: string, itemId: string, dayNumber: number, timeSlot?: string) {
  const { error } = await supabase.from('itinerary_items').insert({
    trip_id: tripId,
    item_id: itemId,
    day_number: dayNumber,
    time_slot: timeSlot ?? null,
  });
  if (error) throw error;
}

export async function removeFromItinerary(tripId: string, itemId: string) {
  const { error } = await supabase
    .from('itinerary_items')
    .delete()
    .eq('trip_id', tripId)
    .eq('item_id', itemId);
  if (error) throw error;
}

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

export async function updateBudgetExpense(expenseId: string, updates: { amount?: number; note?: string }) {
  const { error } = await supabase
    .from('budget_expenses')
    .update(updates)
    .eq('id', expenseId);
  if (error) throw error;
}

export async function addBudgetExpense(tripId: string, category: string, amount: number, note: string) {
  const { error } = await supabase
    .from('budget_expenses')
    .insert({ trip_id: tripId, category, amount, note });
  if (error) throw error;
}

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

export async function fetchCollaborators(tripId: string): Promise<TripCollaborator[]> {
  const { data, error } = await supabase.from('trip_collaborators').select('*').eq('trip_id', tripId).order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function updateCollaboratorRole(collaboratorId: string, role: CollaboratorRole): Promise<void> {
  const { error } = await supabase.from('trip_collaborators').update({ role_type: role }).eq('id', collaboratorId)
  if (error) throw error
}

export async function removeCollaborator(collaboratorId: string): Promise<void> {
  const { error } = await supabase.from('trip_collaborators').delete().eq('id', collaboratorId)
  if (error) throw error
}

export async function acceptInviteByToken(inviteToken: string, userId: string): Promise<{ tripId: string }> {
  const { data, error } = await supabase.from('trip_collaborators').update({ user_id: userId, invite_status: 'accepted', accepted_at: new Date().toISOString() }).eq('invite_token', inviteToken).eq('invite_status', 'pending').select('trip_id').single()
  if (error) throw error
  return { tripId: data.trip_id }
}

export async function joinTripViaLink(tripId: string, userId: string, role: CollaboratorRole): Promise<void> {
  const { error } = await supabase.from('trip_collaborators').insert({ trip_id: tripId, user_id: userId, role_type: role, invite_status: 'accepted', invited_by: userId, accepted_at: new Date().toISOString() })
  if (error) throw error
}

export async function findPendingInviteByEmail(tripId: string, email: string): Promise<TripCollaborator | null> {
  const { data, error } = await supabase.from('trip_collaborators').select('*').eq('trip_id', tripId).eq('invited_email', email.toLowerCase()).eq('invite_status', 'pending').maybeSingle()
  if (error) throw error
  return data
}

export async function inviteCollaborator(tripId: string, email: string, role: CollaboratorRole): Promise<TripCollaborator> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Skip if there's already a pending invite for this email
  const existing = await findPendingInviteByEmail(tripId, email)
  if (existing) return existing

  const inviteToken = crypto.randomUUID()
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

// ── Trip Notes ─────────────────────────────────────────

export async function fetchTripNotes(tripId: string): Promise<TripNote[]> {
  const { data, error } = await supabase.from('trip_notes').select('*').eq('trip_id', tripId).order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createTripNote(tripId: string, userId: string, day: number, hour: number, color: string): Promise<TripNote> {
  const { data, error } = await supabase.from('trip_notes').insert({ trip_id: tripId, user_id: userId, day, hour, text: '', color }).select().single()
  if (error) throw error
  return data
}

export async function updateTripNote(noteId: string, text: string): Promise<void> {
  const { error } = await supabase.from('trip_notes').update({ text }).eq('id', noteId)
  if (error) throw error
}

export async function moveTripNote(noteId: string, day: number, hour: number): Promise<void> {
  const { error } = await supabase.from('trip_notes').update({ day, hour }).eq('id', noteId)
  if (error) throw error
}

export async function deleteTripNote(noteId: string): Promise<void> {
  const { error } = await supabase.from('trip_notes').delete().eq('id', noteId)
  if (error) throw error
}

// ─── Save AI Plan to Supabase ─────────────────────────────

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

export async function savePlanToSupabase(
  plan: PlanToSave,
  onProgress?: (stage: string, pct: number) => void
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be logged in to save a trip. Please sign in and try again.')

  const ext = plan.extracted
  const dest = ext.destination

  onProgress?.('Creating trip...', 10)

  // 1. Create trip
  const tripInsert: Record<string, unknown> = {
    user_id: user.id,
    title: `${dest.city}, ${dest.country}`,
    destination: `${dest.city}, ${dest.country}`,
    start_date: ext.dates.start,
    end_date: ext.dates.end,
    travelers: ext.travelers.count,
    budget: ext.daily_estimate_usd * ext.duration_days,
    currency: 'USD',
    status: 'planning',
    is_generated: true,
    trip_context: {
      hero_image_url: plan.destination_photo_url || null,
      hero_images: plan.destination_photo_url ? [plan.destination_photo_url] : [],
      quick_facts: {
        budget_level: ext.budget_level,
        daily_budget: ext.daily_estimate_usd,
        interests: ext.interests,
        timezone: plan.timezone,
      },
      weather: plan.itinerary.filter(d => d.weather).map(d => d.weather),
    },
  }

  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .insert(tripInsert)
    .select('id')
    .single()

  if (tripErr) {
    throw new Error(`Failed to create trip: ${tripErr.message} (code: ${tripErr.code})`)
  }
  const tripId = trip.id

  onProgress?.('Building itinerary...', 30)

  // 2. Create itinerary days + activities
  for (let d = 0; d < plan.itinerary.length; d++) {
    const day = plan.itinerary[d]
    const pct = 30 + Math.round((d / plan.itinerary.length) * 40)
    onProgress?.(`Day ${day.day}...`, pct)

    const { data: dayRow, error: dayErr } = await supabase
      .from('itinerary_days')
      .insert({ trip_id: tripId, day_number: day.day, date: day.date })
      .select('id')
      .single()

    if (dayErr) {
      console.error('Failed to create itinerary day:', dayErr)
      continue // don't fail the whole save for one day
    }

    if (day.slots.length > 0) {
      const activities = day.slots.map((slot, i) => {
        const poi = slot.poi
        const catMap: Record<string, string> = {
          restaurant: 'food', cafe: 'food', bar: 'food',
          park: 'nature', beach: 'nature', garden: 'nature', hiking: 'nature',
          hotel: 'hotel', hostel: 'hotel', airport: 'airport',
        }
        return {
          trip_id: tripId,
          itinerary_day_id: dayRow.id,
          user_id: user.id,
          activity_name: poi.name,
          activity_type: catMap[poi.subcategory] || catMap[poi.category] || 'other',
          starting_date: day.date,
          ending_date: day.date,
          starting_time: slot.start_time,
          ending_time: slot.end_time,
          latitude: poi.lat,
          longitude: poi.lng,
          sort_order: i,
          activity_data: {
            category: poi.category,
            subcategory: poi.subcategory,
            location_name: poi.name,
            image_url: poi.photo_url || null,
            rating: poi.rating || null,
            description: poi.description || null,
            tags: poi.tags,
            visit_duration_min: poi.visit_duration_min,
          },
        }
      })

      const { error: actErr } = await supabase.from('activities').insert(activities)
      if (actErr) console.error('Failed to save activities for day', day.day, actErr)
    }
  }

  onProgress?.('Saving hotels...', 75)

  // 3. Save hotels (best effort)
  if (plan.hotels.length > 0) {
    const hotelRows = plan.hotels.map(h => {
      // Backend may return extra fields beyond the TS interface (lat, lng, amenities, link, etc.)
      const extra = h as Record<string, unknown>
      return {
        trip_id: tripId,
        data: {
          name: h.name,
          address: (extra.address as string) || null,
          latitude: (extra.lat as number) || null,
          longitude: (extra.lng as number) || null,
          price_per_night: h.price_per_night,
          total_price: (extra.total_price as number) || (h.price_per_night ? h.price_per_night * ext.duration_days : null),
          currency: h.currency,
          rating: h.rating || null,
          star_rating: h.stars || null,
          image_url: h.photo_url || null,
          check_in: ext.dates.start,
          check_out: ext.dates.end,
          booking_ref: null,
          offer_id: null,
          amenities: (extra.amenities as string[]) || [],
          booking_url: h.booking_url || (extra.link as string) || null,
        },
      }
    })
    const { error: hotelErr } = await supabase.from('hotels').insert(hotelRows)
    if (hotelErr) console.error('Failed to save hotels:', hotelErr)
  }

  onProgress?.('Saving flights...', 85)

  // 4. Save flights (best effort)
  if (plan.flights.length > 0) {
    // City-to-IATA lookup for destination airport
    const CITY_AIRPORTS: Record<string, string> = {
      'Paris': 'CDG', 'London': 'LHR', 'Tokyo': 'NRT', 'Rome': 'FCO',
      'Barcelona': 'BCN', 'New York': 'JFK', 'Dubai': 'DXB', 'Bali': 'DPS',
      'Sydney': 'SYD', 'Istanbul': 'IST', 'Bangkok': 'BKK', 'Lisbon': 'LIS',
      'Prague': 'PRG', 'Marrakech': 'RAK', 'Cape Town': 'CPT', 'Amsterdam': 'AMS',
      'Berlin': 'BER', 'Madrid': 'MAD', 'Athens': 'ATH', 'Seoul': 'ICN',
      'Singapore': 'SIN', 'Hong Kong': 'HKG', 'Mumbai': 'BOM', 'Delhi': 'DEL',
      'Cairo': 'CAI', 'Nairobi': 'NBO', 'Mexico City': 'MEX', 'Rio de Janeiro': 'GIG',
      'Milan': 'MXP', 'Vienna': 'VIE', 'Zurich': 'ZRH', 'Dublin': 'DUB',
      'Edinburgh': 'EDI', 'Florence': 'FLR', 'Venice': 'VCE', 'Nice': 'NCE',
      'Cancun': 'CUN', 'Havana': 'HAV', 'Lima': 'LIM', 'Bogota': 'BOG',
      'Buenos Aires': 'EZE', 'Santiago': 'SCL', 'Reykjavik': 'KEF',
      'Oslo': 'OSL', 'Stockholm': 'ARN', 'Copenhagen': 'CPH', 'Helsinki': 'HEL',
      'Warsaw': 'WAW', 'Budapest': 'BUD', 'Bucharest': 'OTP',
      'Kuala Lumpur': 'KUL', 'Jakarta': 'CGK', 'Manila': 'MNL',
      'Taipei': 'TPE', 'Osaka': 'KIX', 'Beijing': 'PEK', 'Shanghai': 'PVG',
      'Johannesburg': 'JNB', 'Casablanca': 'CMN', 'Doha': 'DOH',
      'Abu Dhabi': 'AUH', 'Muscat': 'MCT', 'Riyadh': 'RUH',
    }
    const destCity = dest.city
    const destIata = CITY_AIRPORTS[destCity] || ''

    const flightRows = plan.flights.map((f) => ({
      trip_id: tripId,
      data: {
        airline: f.airline,
        flight_number: null,
        origin_iata: '',
        origin_name: null,
        dest_iata: destIata,
        dest_name: destCity,
        departure_at: f.departure_time,
        arrival_at: f.arrival_time,
        price: f.price,
        currency: f.currency,
        cabin_class: null,
        booking_ref: null,
        offer_id: null,
      },
    }))
    const { error: flightErr } = await supabase.from('flights').insert(flightRows)
    if (flightErr) console.error('Failed to save flights:', flightErr)
  }

  onProgress?.('Done!', 100)
  return tripId
}
