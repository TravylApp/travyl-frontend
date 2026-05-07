import { supabase } from './supabase';
import type { TransitSegment } from '../types';

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
