/**
 * @module suggestionMapper
 * Maps AI suggestion API responses (`SuggestionCard`) into `CalendarActivity`
 * objects that can be inserted directly into the Yjs calendar document.
 * Used by the AI suggestion sidebar when the user taps "Add to Calendar".
 */

import type { SuggestionCard, CalendarActivity } from '../types'

/**
 * Converts a `SuggestionCard` from the AI suggestion API into a `CalendarActivity`
 * suitable for insertion into the Yjs calendar at the given day and start hour.
 * A new UUID is generated for each call.
 *
 * @param suggestion - The suggestion card returned by the AI suggestion endpoint
 * @param day - Zero-based day index within the trip (0 = first day)
 * @param startHour - Start hour in fractional hours (e.g. 9.5 = 9:30 AM)
 * @returns A new `CalendarActivity` ready to be inserted into Yjs
 * @example
 * suggestionToCalendarActivity(suggestionCard, 2, 10)
 * // → CalendarActivity for day 3, starting at 10:00 AM
 */
export function suggestionToCalendarActivity(
  suggestion: SuggestionCard,
  day: number,
  startHour: number,
): CalendarActivity {
  return {
    id: crypto.randomUUID(),
    title: suggestion.name,
    type: suggestion.category,
    day,
    startHour,
    duration: suggestion.duration,
    price: suggestion.price != null ? String(suggestion.price) : undefined,
    rating: suggestion.rating ?? undefined,
    location: suggestion.location,
    image: suggestion.imageUrls?.[0] ?? suggestion.imageUrl,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
    notes: suggestion.description,
  }
}
