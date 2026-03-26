const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/** Returns distance in km between two lat/lng points */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Returns estimated drive time in minutes (assume 40 km/h urban average) */
export function driveTimeMinutes(distanceKm: number): number {
  return Math.round((distanceKm / 40) * 60)
}
