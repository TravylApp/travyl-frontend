import { supabase } from './supabase';
import type { Trip, Profile, SavedItem, Activity, ItineraryDayWithActivities, Flight, Hotel, TripCollaborator, TripNote, Visibility, LinkPermission, CollaboratorRole } from '../types';

export async function fetchTrips(userId: string): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchCollaboratorTrips(userId: string): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*, trip_collaborators!inner(*)')
    .eq('trip_collaborators.user_id', userId)
    .eq('trip_collaborators.invite_status', 'accepted')
    .order('created_at', { ascending: false });
  if (error) throw error;
  // Strip the join column before returning
  return (data ?? []).map(({ trip_collaborators: _tc, ...trip }) => trip as Trip);
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

// ─── Mosaic Tiles ──────────────────────────────────────────

import { shuffle } from '../utils';
import type { MosaicTile } from '../types';

const ALL_MOSAIC_CITIES = [
  { lat: '48.8566', lng: '2.3522' },   // Paris
  { lat: '35.6762', lng: '139.6503' }, // Tokyo
  { lat: '41.9028', lng: '12.4964' },  // Rome
  { lat: '-8.4095', lng: '115.1889' }, // Bali
  { lat: '40.7128', lng: '-74.0060' }, // New York
  { lat: '41.3874', lng: '2.1686' },   // Barcelona
  { lat: '51.5074', lng: '-0.1278' },  // London
  { lat: '25.2048', lng: '55.2708' },  // Dubai
  { lat: '-33.8688', lng: '151.2093' }, // Sydney
  { lat: '37.9838', lng: '23.7275' },  // Athens
  { lat: '13.7563', lng: '100.5018' }, // Bangkok
  { lat: '38.7223', lng: '-9.1393' },  // Lisbon
  { lat: '-22.9068', lng: '-43.1729' }, // Rio
  { lat: '52.3676', lng: '4.9041' },   // Amsterdam
  { lat: '37.7749', lng: '-122.4194' }, // San Francisco
  { lat: '31.6295', lng: '-7.9811' },  // Marrakech
  { lat: '19.4326', lng: '-99.1332' }, // Mexico City
  { lat: '1.3521', lng: '103.8198' },  // Singapore
];

const MOSAIC_CATEGORIES: MosaicTile['category'][] = ['destination', 'attraction', 'dining', 'experience'];

export async function fetchMosaicTiles(): Promise<MosaicTile[]> {
  const cities = shuffle(ALL_MOSAIC_CITIES).slice(0, 6);
  const cats = shuffle(MOSAIC_CATEGORIES);

  const results = await Promise.all(
    cities.map(async (city, i) => {
      const cat = cats[i % cats.length];
      try {
        const res = await fetch(`/api/places?lat=${city.lat}&lng=${city.lng}&category=${cat}&limit=3`);
        if (!res.ok) return [];
        return res.json();
      } catch {
        return [];
      }
    })
  );

  const typeMap: Record<string, MosaicTile['category']> = {
    destination: 'destination', attraction: 'attraction',
    restaurant: 'dining', experience: 'experience',
  };

  const seen = new Set<string>();
  const tiles: MosaicTile[] = results.flat()
    .filter((p: any) => {
      if (!p?.image_url && !p?.image) return false;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    })
    .map((p: any, i: number) => ({
      id: p.id,
      name: p.name || p.title || 'Untitled',
      category: typeMap[p.type] || cats[i % cats.length],
      tagline: p.tagline || p.subtitle || '',
      image_url: p.image_url || p.image || null,
      gridSpan: [1, 1] as [number, number],
    }));

  return tiles;
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

// itinerary_days table doesn't exist — itinerary lives in trip_context
export async function fetchItineraryDays(_tripId: string): Promise<ItineraryDayWithActivities[]> {
  return [];
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
 * Fetch a user's public trips (for public profile page)
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

export async function rotateShareLinkToken(tripId: string): Promise<string> {
  const newToken = crypto.randomUUID()
  const { error } = await supabase
    .from('trips')
    .update({ share_link_token: newToken })
    .eq('id', tripId)
  if (error) throw error
  return newToken
}

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

export async function acceptInviteByToken(inviteToken: string): Promise<{ tripId: string }> {
  const { data, error } = await supabase.rpc('accept_invite_by_token', { p_token: inviteToken })
  if (error) throw error
  return { tripId: (data as { trip_id: string }).trip_id }
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

  const ext = plan.extracted
  const dest = ext.destination
  const duration = ext.duration_days || 5

  // Ensure we have concrete dates — default to tomorrow if API returned null
  if (!ext.dates.start) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    ext.dates.start = tomorrow.toISOString().split('T')[0]
  }
  if (!ext.dates.end) {
    const end = new Date(ext.dates.start)
    end.setDate(end.getDate() + duration - 1)
    ext.dates.end = end.toISOString().split('T')[0]
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
  for (const day of cappedItinerary) {
    const dayDate = day.date || ext.dates.start
    for (const slot of day.slots ?? []) {
      const poi = slot.poi ?? {}
      activityRows.push({
        trip_id: tripId,
        user_id: user?.id || null,
        activity_name: poi.name || 'Activity',
        activity_type: poi.category || 'sightseeing',
        starting_date: dayDate,
        ending_date: dayDate,
        starting_time: slot.start_time || '09:00',
        ending_time: slot.end_time || '11:00',
        latitude: poi.lat || null,
        longitude: poi.lng || null,
        notes: poi.description || null,
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

  onProgress?.('Done!', 100)
  return tripId
}
