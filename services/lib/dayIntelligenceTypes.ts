import type { PlaceDetails } from './serpapi'

export interface DayIntelligenceEntry {
  place: PlaceDetails
  logistics: {
    travelTimeMinutes: number | null
    distanceKm: number | null
    previousActivityName: string | null
  }
  conflicts: {
    hours: boolean
    travelTime: boolean
  }
}

export interface DayIntelligenceResponse {
  weather: {
    tempMaxC: number | null
    precipitationMm: number | null
    weatherCode: number | null
  } | null
  activities: Record<string, DayIntelligenceEntry>
}

export interface DayActivityRow {
  id: string
  activity_name: string
  latitude: number
  longitude: number
  starting_date: string
  starting_time: string   // 'HH:MM:SS'
  ending_time: string     // 'HH:MM:SS'
}
