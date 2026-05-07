'use client'

import { useState, useEffect, useRef } from 'react'
import { useCarSearch } from '@travyl/shared'
import type { CarRentalData } from './types'
import { Car, Loader2, Search, Plus, Fuel, Users } from 'lucide-react'
import { Input, FieldLabel, PrimaryButton, DateInput } from '@/components/trip/BookingFormPrimitives'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRateToCarData(rate: any, pickupLocation: string, dropoffLocation: string): CarRentalData {
  return {
    vendor: rate.supplier ?? 'Unknown',
    vehicle: rate.vehicle ?? null,
    pickup_location: rate.pickup_name ?? pickupLocation,
    dropoff_location: rate.dropoff_name ?? dropoffLocation,
    pickup_at: '',  // will be set by the caller with actual dates
    dropoff_at: '',
    price: rate.total_amount ? parseFloat(rate.total_amount) : null,
    currency: rate.total_currency ?? null,
    booking_ref: null,
  }
}

function CarRateImage({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="w-[88px] h-[88px] rounded-xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center shrink-0">
        <Car size={24} className="text-gray-300" />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="w-[88px] h-[88px] rounded-xl object-cover shrink-0 bg-gray-100 dark:bg-white/[0.04]" onError={() => setFailed(true)} />
  )
}

export function CarSearchPanel({ tripDestination, tripStartDate, tripEndDate, onAdd, onAddManually }: {
  tripDestination?: string
  tripStartDate?: string
  tripEndDate?: string
  onAdd: (data: CarRentalData) => Promise<void>
  onAddManually?: () => void
}) {
  const [pickupLocation, setPickupLocation] = useState(tripDestination ?? '')
  const [dropoffLocation, setDropoffLocation] = useState('')
  const [pickupDate, setPickupDate] = useState(tripStartDate ?? '')
  const [dropoffDate, setDropoffDate] = useState(tripEndDate ?? '')
  const [addingId, setAddingId] = useState<string | null>(null)

  // Sync props → state when trip data loads asynchronously
  const prevProps = useRef({ tripDestination, tripStartDate, tripEndDate })
  useEffect(() => {
    const prev = prevProps.current
    if (!prev.tripDestination && tripDestination) { setPickupLocation(tripDestination) }
    if (!prev.tripStartDate && tripStartDate) { setPickupDate(tripStartDate) }
    if (!prev.tripEndDate && tripEndDate) { setDropoffDate(tripEndDate) }
    prevProps.current = { tripDestination, tripStartDate, tripEndDate }
  }, [tripDestination, tripStartDate, tripEndDate])

  const searchEnabled = !!pickupLocation && !!pickupDate && !!dropoffDate
  const { data, isLoading } = useCarSearch({
    pickupLocation: pickupLocation || undefined,
    dropoffLocation: dropoffLocation || undefined,
    pickupDate: pickupDate || undefined,
    dropoffDate: dropoffDate || undefined,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rates: any[] = (data as any)?.rates ?? []
  const hasResults = rates.length > 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAdd = async (rate: any) => {
    setAddingId(rate.id)
    try {
      const carData = mapRateToCarData(rate, pickupLocation, dropoffLocation || pickupLocation)
      // Set the actual pickup/dropoff dates from the search params
      carData.pickup_at = new Date(`${pickupDate}T${rate.pickup_time || '10:00'}`).toISOString()
      carData.dropoff_at = new Date(`${dropoffDate}T${rate.dropoff_time || '10:00'}`).toISOString()
      await onAdd(carData)
    } finally {
      setAddingId(null)
    }
  }

  const mileageLabel = (mileage: any) => {
    if (!mileage) return null
    if (mileage.type === 'unlimited') return 'Unlimited mileage'
    if (mileage.type === 'limited') return `${mileage.limit} ${mileage.unit === 'kilometres' ? 'km' : 'mi'}`
    return null
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-3 gap-y-3">
          <div className="md:col-span-2">
            <FieldLabel>Pickup location</FieldLabel>
            <Input value={pickupLocation} onChange={setPickupLocation} placeholder="City or airport" />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Dropoff location</FieldLabel>
            <Input value={dropoffLocation} onChange={setDropoffLocation} placeholder="Same as pickup if blank" />
          </div>
          <div>
            <FieldLabel>Pickup date</FieldLabel>
            <DateInput value={pickupDate} onChange={setPickupDate} />
          </div>
          <div>
            <FieldLabel>Dropoff date</FieldLabel>
            <DateInput value={dropoffDate} onChange={setDropoffDate} />
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {!isLoading && !hasResults && searchEnabled && (
        <div className="text-center py-12">
          <Search size={22} className="mx-auto text-gray-300 mb-3" />
          <p className="text-[13px] text-gray-500">No car rentals found for this location and dates.</p>
          <p className="text-[11px] text-gray-400 mt-1">Try a different location or adjust your dates.</p>
          {onAddManually && (
            <button
              onClick={onAddManually}
              className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.08] transition"
            >
              <Plus size={13} /> Add manually
            </button>
          )}
        </div>
      )}

      {!isLoading && !hasResults && !searchEnabled && (
        <div className="text-center py-12">
          <Car size={22} className="mx-auto text-gray-300 mb-3" />
          <p className="text-[13px] text-gray-500">Search car rentals for your trip</p>
          <p className="text-[11px] text-gray-400 mt-1">Enter a pickup location and dates above to see available rates.</p>
          {onAddManually && (
            <button
              onClick={onAddManually}
              className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.08] transition"
            >
              <Plus size={13} /> Add manually
            </button>
          )}
        </div>
      )}

      {hasResults && (
        <div className="space-y-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {rates.map((rate: any) => (
            <div key={rate.id} className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4">
              <div className="flex gap-4">
                <CarRateImage src={rate.images?.[0] || rate.supplier_logo} alt={rate.vehicle || rate.supplier} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
                    {[rate.supplier, rate.vehicle].filter(Boolean).join(' · ')}
                  </h3>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    Pick-up: {rate.pickup_name} &middot; Drop-off: {rate.dropoff_name}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {rate.category && (
                      <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full capitalize">
                        {rate.category}
                      </span>
                    )}
                    {rate.transmission && (
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.04] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Car size={10} /> {rate.transmission}
                      </span>
                    )}
                    {rate.fuel && (
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.04] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Fuel size={10} /> {rate.fuel}
                      </span>
                    )}
                    {rate.passengers && (
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.04] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Users size={10} /> {rate.passengers}
                      </span>
                    )}
                    {mileageLabel(rate.mileage) && (
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.04] px-2 py-0.5 rounded-full">
                        {mileageLabel(rate.mileage)}
                      </span>
                    )}
                    {rate.total_amount != null && (
                      <span className="text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums ml-auto">
                        {rate.total_currency === 'USD' ? '$' : rate.total_currency + ' '}{parseFloat(rate.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 self-end">
                  <PrimaryButton onClick={() => handleAdd(rate)} busy={addingId === rate.id}>
                    {addingId === rate.id ? '' : 'Add to Trip'}
                  </PrimaryButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
