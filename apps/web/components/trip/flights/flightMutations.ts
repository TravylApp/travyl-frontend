import { supabase } from '@travyl/shared'
import type { FlightData } from '@travyl/shared'

export async function addFlight(tripId: string, data: FlightData): Promise<void> {
  const { error } = await supabase.from('flights').insert({ trip_id: tripId, data })
  if (error) throw error
}

export async function updateFlight(id: string, data: FlightData): Promise<void> {
  const { error } = await supabase.from('flights').update({ data }).eq('id', id)
  if (error) throw error
}

export async function deleteFlight(id: string): Promise<void> {
  const { error } = await supabase.from('flights').delete().eq('id', id)
  if (error) throw error
}
