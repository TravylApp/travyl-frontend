export interface BookingActivity {
  id: string
  title: string
  type: string
  latitude: number
  longitude: number
  /** ISO date string for the activity's scheduled day — used by Ticketmaster date matching */
  scheduledDate?: string
}

export interface ProviderMatch {
  provider: string
  matchedName: string
  bookingUrl: string
  affiliateUrl: string
  /** Lat/lng of matched venue — used to compute proximity score */
  lat: number
  lng: number
}
