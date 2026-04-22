import type { SuggestionCard } from '@travyl/shared/types'

export type { SuggestionCard } from '@travyl/shared/types'

export interface SuggestResponse {
  suggestions: SuggestionCard[]
  source: 'cache' | 'fresh'
}

export interface SearchResponse {
  results: SuggestionCard[]
}

export interface InteractRequest {
  suggestionId: string
  action: 'impression' | 'click' | 'drag' | 'dismiss'
  tripId: string
  category?: string
}

export interface LocalEvent {
  id: string
  name: string
  category: 'music' | 'sports' | 'arts' | 'family' | 'festival' | 'other'
  date: string          // YYYY-MM-DD
  startTime: string     // HH:mm (24h)
  endTime?: string      // HH:mm, optional
  venueName: string
  venueAddress?: string
  imageUrl?: string
  ticketUrl?: string
  priceMin?: number
  priceMax?: number
  currency?: string
}

export interface EventsResponse {
  events: LocalEvent[]
}

export interface Restaurant {
  id: string
  name: string
  cuisine?: string
  priceLevel?: 1 | 2 | 3 | 4  // $ to $$$$
  rating?: number              // 0-5 scale
  reviewCount?: number
  address: string
  phone?: string
  website?: string
  reserveUrl?: string          // OpenTable booking link
  imageUrl?: string
  coordinates?: {
    lat: number
    lng: number
  }
  hours?: string               // Today's hours
  tags?: string[]              // Features: outdoor seating, wifi, etc.
}

export interface RestaurantsResponse {
  restaurants: Restaurant[]
  total: number
  source: string
}
