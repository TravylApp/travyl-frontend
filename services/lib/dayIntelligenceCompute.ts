import { haversineDistance, driveTimeMinutes } from './haversine'
import { hasHoursConflict, hasTravelTimeConflict } from './conflictDetection'
import type { DayIntelligenceEntry, DayActivityRow } from './dayIntelligenceTypes'
import type { PlaceDetails } from './serpapi'

function getDayOfWeek(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' })
}

/**
 * Pure function: computes day intelligence entries for a sorted list of activities.
 * Accepts an optional placeDetailsMap (activityId → PlaceDetails) for enrichment.
 * Falls back to stub PlaceDetails (no opening hours) when map entry is absent.
 */
export function computeDayIntelligence(
  activities: DayActivityRow[],
  placeDetailsMap: Record<string, PlaceDetails> = {},
): Record<string, DayIntelligenceEntry> {
  const result: Record<string, DayIntelligenceEntry> = {}

  for (let i = 0; i < activities.length; i++) {
    const act = activities[i]
    const prev = i > 0 ? activities[i - 1] : null
    const dayOfWeek = getDayOfWeek(act.starting_date)

    const place = placeDetailsMap[act.id] ?? {
      name: act.activity_name,
      address: '',
      rating: null,
      priceTier: null,
      photos: [],
      openingHours: null,
    }

    const distanceKm = prev
      ? haversineDistance(prev.latitude, prev.longitude, act.latitude, act.longitude)
      : null
    const travelTimeMinutes = distanceKm !== null ? driveTimeMinutes(distanceKm) : null

    result[act.id] = {
      place,
      logistics: {
        travelTimeMinutes,
        distanceKm,
        previousActivityName: prev?.activity_name ?? null,
      },
      conflicts: {
        hours: hasHoursConflict(
          place.openingHours ?? null,
          dayOfWeek,
          act.starting_time.slice(0, 5),
          act.ending_time.slice(0, 5),
        ),
        travelTime: hasTravelTimeConflict(
          prev?.ending_time?.slice(0, 5) ?? null,
          act.starting_time.slice(0, 5),
          travelTimeMinutes,
        ),
      },
    }
  }

  return result
}
