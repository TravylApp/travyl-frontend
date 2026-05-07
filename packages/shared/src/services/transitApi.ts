import { supabase } from './supabase';
import type { TransitSegment, CreateTransitBookingInput } from '../types';

export async function fetchTransit(tripId: string): Promise<TransitSegment[]> {
  const { data, error } = await supabase
    .from('transit')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[transitApi] fetch error:', error);
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
  if (error) throw error;
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
  if (error) throw error;
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
  if (error) throw error;
}
