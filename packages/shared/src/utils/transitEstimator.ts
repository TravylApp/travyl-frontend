import type { VehicleType } from '../types/transit'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const VEHICLE_SPEEDS: Record<Exclude<VehicleType, 'rideshare' | 'shuttle' | 'tram' | 'light_rail' | 'ferry' | 'cable_car' | 'funicular'>, number> = {
  bus: 25,
  subway: 35,
  train: 80,
}

const DISTANCE_BRACKETS: { maxKm: number; vehicle: VehicleType }[] = [
  { maxKm: 3, vehicle: 'bus' },
  { maxKm: 15, vehicle: 'subway' },
  { maxKm: Infinity, vehicle: 'train' },
]

export interface TransitEstimate {
  vehicleType: VehicleType
  distanceKm: number
  durationHours: number
}

/**
 * Estimates transit between two locations using haversine distance and
 * speed-based vehicle type selection.
 *
 * Returns null when the distance is <500m (walkable).
 *
 * @param fromLat - Origin latitude in decimal degrees
 * @param fromLng - Origin longitude in decimal degrees
 * @param toLat - Destination latitude in decimal degrees
 * @param toLng - Destination longitude in decimal degrees
 * @returns TransitEstimate with vehicle type, distance, and duration, or null
 */
export function estimateTransit(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
): TransitEstimate | null {
  const distanceKm = haversineKm(fromLat, fromLng, toLat, toLng)

  // Under 500m — walkable, no transit needed
  if (distanceKm < 0.5) return null

  // Pick vehicle type by distance bracket
  const bracket = DISTANCE_BRACKETS.find((b) => distanceKm < b.maxKm) ?? DISTANCE_BRACKETS[DISTANCE_BRACKETS.length - 1]
  const vehicleType = bracket.vehicle

  const speedKmh = VEHICLE_SPEEDS[vehicleType as keyof typeof VEHICLE_SPEEDS] ?? 25
  const durationHours = distanceKm / speedKmh

  return { vehicleType, distanceKm, durationHours }
}
