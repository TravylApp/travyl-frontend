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
}

export interface CarRental {
  id: string
  data: CarRentalData
}
