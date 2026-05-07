export interface CarRentalData {
  vendor: string
  vehicle: string | null
  pickup_location: string
  dropoff_location: string | null
  pickup_at: string
  dropoff_at: string
  price: number | null
  currency: string | null
  booking_ref: string | null
  /** Supplier brand logo URL captured from the search result so the saved
      card matches what the user picked. */
  supplier_logo?: string | null
  /** Deep-link to the supplier's booking page (when available); falls back to
      a homepage lookup keyed off vendor name in CarCard if absent. */
  booking_url?: string | null
}

export interface CarRental {
  id: string
  data: CarRentalData
}
