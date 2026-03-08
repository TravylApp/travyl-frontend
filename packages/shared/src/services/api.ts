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
