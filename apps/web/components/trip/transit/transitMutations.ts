import { supabase } from '@travyl/shared'
import type { TransitData } from '@travyl/shared'

export async function addTransit(tripId: string, data: TransitData): Promise<void> {
  const { error } = await supabase.from('transit').insert({ trip_id: tripId, data })
  if (error) throw error
}

export async function updateTransit(id: string, data: TransitData): Promise<void> {
  const { error } = await supabase.from('transit').update({ data }).eq('id', id)
  if (error) throw error
}

export async function deleteTransit(id: string): Promise<void> {
  const { error } = await supabase.from('transit').delete().eq('id', id)
  if (error) throw error
}
