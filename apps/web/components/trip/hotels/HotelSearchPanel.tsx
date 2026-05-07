'use client'

import { useState, useEffect, useRef } from 'react'
import { useHotelSearch } from '@travyl/shared'
import type { HotelData } from '@travyl/shared'
import { Star, MapPin, Loader2, Search, Plus, Building2 } from 'lucide-react'
import { Input, FieldLabel, PrimaryButton, DateInput, Select } from '@/components/trip/BookingFormPrimitives'

const GUEST_OPTIONS = [
  { value: '1', label: '1 guest' }, { value: '2', label: '2 guests' }, { value: '3', label: '3 guests' },
  { value: '4', label: '4 guests' }, { value: '5', label: '5 guests' }, { value: '6', label: '6 guests' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapResultToHotelData(hotel: any, checkIn: string, checkOut: string, defaultCurrency: string): HotelData {
  return {
    name: hotel.name, address: hotel.address || null,
    latitude: hotel.lat || null, longitude: hotel.lng || null,
    check_in: checkIn, check_out: checkOut,
    price_per_night: hotel.price, total_price: null,
    currency: hotel.currency || defaultCurrency,
    rating: hotel.rating || null, star_rating: hotel.stars || null,
    image_url: hotel.images?.[0] ?? null, booking_ref: null, offer_id: null,
  }
}

function HotelImage({ src, name }: { src: string | null | undefined; name: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="w-[88px] h-[88px] rounded-xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center shrink-0">
        <Building2 size={24} className="text-gray-300" />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} className="w-[88px] h-[88px] rounded-xl object-cover shrink-0" onError={() => setFailed(true)} />
  )
}

export function HotelSearchPanel({ tripDestination, tripCheckIn, tripCheckOut, defaultCurrency, onAdd, onAddManually }: {
  tripDestination?: string; tripCheckIn?: string; tripCheckOut?: string; defaultCurrency: string
  onAdd: (data: HotelData) => Promise<void>; onAddManually?: () => void
}) {
  const [destination, setDestination] = useState(tripDestination ?? '')
  const [checkIn, setCheckIn] = useState(tripCheckIn ?? '')
  const [checkOut, setCheckOut] = useState(tripCheckOut ?? '')
  const [guests, setGuests] = useState('2')
  const [addingId, setAddingId] = useState<string | null>(null)

  // Sync props → state when trip data loads asynchronously
  const prevProps = useRef({ tripDestination, tripCheckIn, tripCheckOut })
  useEffect(() => {
    const prev = prevProps.current
    if (!prev.tripDestination && tripDestination) setDestination(tripDestination)
    if (!prev.tripCheckIn && tripCheckIn) setCheckIn(tripCheckIn)
    if (!prev.tripCheckOut && tripCheckOut) setCheckOut(tripCheckOut)
    prevProps.current = { tripDestination, tripCheckIn, tripCheckOut }
  }, [tripDestination, tripCheckIn, tripCheckOut])

  const searchEnabled = !!destination && !!checkIn && !!checkOut
  const { data, isLoading } = useHotelSearch({ destination: destination || undefined, checkIn: checkIn || undefined, checkOut: checkOut || undefined, guests: Number(guests) })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = (data as any)?.hotels ?? []
  const hasResults = results.length > 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAdd = async (hotel: any) => {
    setAddingId(hotel.id)
    try { await onAdd(mapResultToHotelData(hotel, checkIn, checkOut, defaultCurrency)) } finally { setAddingId(null) }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-3 gap-y-3">
          <div className="md:col-span-2"><FieldLabel>Destination</FieldLabel><Input value={destination} onChange={setDestination} placeholder="e.g. Paris, France" /></div>
          <div><FieldLabel>Check-in</FieldLabel><DateInput value={checkIn} onChange={setCheckIn} /></div>
          <div><FieldLabel>Check-out</FieldLabel><DateInput value={checkOut} onChange={setCheckOut} /></div>
          <div className="hidden md:block"><FieldLabel>Guests</FieldLabel><Select value={guests} onChange={setGuests} options={GUEST_OPTIONS} /></div>
        </div>
      </div>

      {isLoading && <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-gray-400" /></div>}

      {!isLoading && !hasResults && searchEnabled && (
        <div className="text-center py-12">
          <Search size={22} className="mx-auto text-gray-300 mb-3" />
          <p className="text-[13px] text-gray-500">No hotels found for this destination and dates.</p>
          <p className="text-[11px] text-gray-400 mt-1">Try a different destination or adjust your dates.</p>
          {onAddManually && (
            <button onClick={onAddManually} className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.08] transition">
              <Plus size={13} /> Add manually
            </button>
          )}
        </div>
      )}

      {!isLoading && !hasResults && !searchEnabled && (
        <div className="text-center py-12">
          <Building2 size={22} className="mx-auto text-gray-300 mb-3" />
          <p className="text-[13px] text-gray-500">Search hotels for your trip</p>
          <p className="text-[11px] text-gray-400 mt-1">Enter a destination and travel dates above to see available hotels.</p>
          {onAddManually && (
            <button onClick={onAddManually} className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.08] transition">
              <Plus size={13} /> Add manually
            </button>
          )}
        </div>
      )}

      {hasResults && (
        <div className="space-y-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {results.map((hotel: any) => (
            <div key={hotel.id} className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4">
              <div className="flex gap-4">
                <HotelImage src={hotel.images?.[0]} name={hotel.name} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">{hotel.name}</h3>
                  {hotel.address && <p className="flex items-center gap-1 text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 truncate"><MapPin size={11} className="shrink-0" /><span className="truncate">{hotel.address}</span></p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {hotel.stars > 0 && <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5"><Star size={10} fill="currentColor" />{hotel.stars}</span>}
                    {hotel.rating > 0 && <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">{hotel.rating} rating</span>}
                    {hotel.price != null && <span className="text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">${hotel.price}/night</span>}
                  </div>
                  {hotel.amenities?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {hotel.amenities.slice(0, 4).map((a: string) => <span key={a} className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/[0.04] px-1.5 py-0.5 rounded">{a}</span>)}
                    </div>
                  )}
                </div>
                <div className="shrink-0 self-end">
                  <PrimaryButton onClick={() => handleAdd(hotel)} busy={addingId === hotel.id}>
                    {addingId === hotel.id ? '' : 'Add to Trip'}
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
