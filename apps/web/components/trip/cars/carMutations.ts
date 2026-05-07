import { supabase } from '@travyl/shared'
import type { CarRental, CarRentalData } from './types'

async function readContext(tripId: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from('trips')
    .select('trip_context')
    .eq('id', tripId)
    .single()
  if (error) throw error
  return (data?.trip_context as Record<string, unknown>) ?? {}
}

export async function readCars(tripId: string): Promise<CarRental[]> {
  const ctx = await readContext(tripId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((ctx as any).cars as CarRental[] | undefined) ?? []
}

async function writeCars(tripId: string, cars: CarRental[]): Promise<void> {
  const ctx = await readContext(tripId)
  const { error } = await supabase
    .from('trips')
    .update({ trip_context: { ...ctx, cars } })
    .eq('id', tripId)
  if (error) throw error
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `car-${crypto.randomUUID()}`
  }
  return `car-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function addCar(tripId: string, data: CarRentalData): Promise<void> {
  const cars = await readCars(tripId)
  const next: CarRental = { id: newId(), data }
  await writeCars(tripId, [...cars, next])
}

export async function updateCar(tripId: string, id: string, data: CarRentalData): Promise<void> {
  const cars = await readCars(tripId)
  await writeCars(tripId, cars.map((c) => c.id === id ? { ...c, data } : c))
}

export async function deleteCar(tripId: string, id: string): Promise<void> {
  const cars = await readCars(tripId)
  await writeCars(tripId, cars.filter((c) => c.id !== id))
}
