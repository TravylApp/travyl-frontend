import { supabase } from './supabase';
import type { TransitSegment, CreateTransitBookingInput } from '../types';

// `transit` is not yet provisioned in every environment. PostgREST returns
// PGRST205 / Postgres 42P01 when the relation is missing — treat that as an
// empty result instead of error-spamming the console on every itinerary load.
const MISSING_TABLE_CODES = new Set(['PGRST205', '42P01']);

export async function fetchTransit(tripId: string): Promise<TransitSegment[]> {
  const { data, error } = await supabase
    .from('transit')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) {
    if (MISSING_TABLE_CODES.has(error.code ?? '')) return [];
    // PostgrestError fields are non-enumerable, so a bare `console.error(error)`
    // logs `{}`. Pull the useful bits out by hand.
    console.error('[transitApi] fetch error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }
  return (data as any[])?.map(row => ({
    id: row.id,
    trip_id: row.trip_id,
    data: row.data as TransitSegment['data'],
    created_at: row.created_at,
  })) ?? [];
}

export async function addTransit(tripId: string, input: CreateTransitBookingInput): Promise<TransitSegment> {
  const { data, error } = await supabase
    .from('transit')
    .insert({ trip_id: tripId, data: input.data })
    .select()
    .single();
  if (error) {
    if (MISSING_TABLE_CODES.has(error.code ?? '')) throw Object.assign(error, { _missingTable: true });
    throw error;
  }
  return {
    id: data.id,
    trip_id: data.trip_id,
    data: data.data,
    created_at: data.created_at,
  };
}

export async function updateTransit(id: string, input: Partial<CreateTransitBookingInput>): Promise<TransitSegment> {
  const { data, error } = await supabase
    .from('transit')
    .update({ data: input.data })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    if (MISSING_TABLE_CODES.has(error.code ?? '')) throw Object.assign(error, { _missingTable: true });
    throw error;
  }
  return {
    id: data.id,
    trip_id: data.trip_id,
    data: data.data,
    created_at: data.created_at,
  };
}

export async function deleteTransit(id: string): Promise<void> {
  const { error } = await supabase
    .from('transit')
    .delete()
    .eq('id', id);
  if (error) {
    if (MISSING_TABLE_CODES.has(error.code ?? '')) throw Object.assign(error, { _missingTable: true });
    throw error;
  }
}
