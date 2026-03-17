import type { SuggestionCard, CalendarActivity } from '../types'

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
    image: suggestion.imageUrl,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
    notes: suggestion.description,
  }
}
