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
}
