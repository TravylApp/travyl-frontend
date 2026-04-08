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

/** Filter an array of items with lat/lng to only those within maxRadiusKm of center */
export function filterByRadius<T extends { lat?: number | null; lng?: number | null }>(
  items: T[],
  centerLat: number,
  centerLng: number,
  maxRadiusKm: number = 50,
): T[] {
  const filtered = items.filter((item) => {
    if (item.lat == null || item.lng == null) return true // keep items without coords
    return haversineDistance(centerLat, centerLng, item.lat, item.lng) <= maxRadiusKm
  })
  // If filtering removed everything, return original (better to show something than nothing)
  return filtered.length > 0 ? filtered : items
}
