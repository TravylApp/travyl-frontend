import { supabase } from '@travyl/shared'
import type { HotelData } from '@travyl/shared'

export async function addHotel(tripId: string, data: HotelData): Promise<void> {
  const { error } = await supabase.from('hotels').insert({ trip_id: tripId, data })
  if (error) throw error
}

export async function updateHotel(id: string, data: HotelData): Promise<void> {
  const { error } = await supabase.from('hotels').update({ data }).eq('id', id)
  if (error) throw error
}

export async function deleteHotel(id: string): Promise<void> {
  const { error } = await supabase.from('hotels').delete().eq('id', id)
  if (error) throw error
}
