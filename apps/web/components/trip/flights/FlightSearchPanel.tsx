'use client'

import { useState } from 'react'
import { useFlightSearch, useSettingsStore } from '@travyl/shared'
import type { FlightData } from '@travyl/shared'
import { Plane, Loader2, Search } from 'lucide-react'
import { Input, FieldLabel, PrimaryButton, Select } from '@/components/trip/BookingFormPrimitives'

const PASSENGER_OPTIONS = [
  { value: '1', label: '1 passenger' }, { value: '2', label: '2 passengers' }, { value: '3', label: '3 passengers' },
  { value: '4', label: '4 passengers' }, { value: '5', label: '5 passengers' }, { value: '6', label: '6 passengers' },
]
const CABIN_OPTIONS = [
  { value: 'economy', label: 'Economy' }, { value: 'premium_economy', label: 'Premium economy' },
  { value: 'business', label: 'Business' }, { value: 'first', label: 'First' },
]

function AirlineLogo({ src, airline }: { src: string | null | undefined; airline: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}>
        <Plane size={18} />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={airline} className="w-11 h-11 rounded-lg object-contain shrink-0 bg-white p-1" onError={() => setFailed(true)} />
  )
}

function formatDuration(minutes: number): string { const h = Math.floor(minutes / 60); const m = minutes % 60; return `${h}h ${m}m` }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapResultToFlightData(flight: any, origin: string, destination: string, cabin: string): FlightData {
  const firstLeg = flight.legs?.[0]
  const lastLeg = flight.legs?.[flight.legs.length - 1]
  return {
    airline: firstLeg?.airline ?? '', flight_number: firstLeg?.flightNumber ?? null,
    origin_iata: firstLeg?.departure?.id ?? origin.toUpperCase(), origin_name: firstLeg?.departure?.airport ?? null,
    dest_iata: lastLeg?.arrival?.id ?? destination.toUpperCase(), dest_name: lastLeg?.arrival?.airport ?? null,
    departure_at: firstLeg?.departure?.time ?? null, arrival_at: lastLeg?.arrival?.time ?? null,
    price: flight.price, currency: 'USD', cabin_class: firstLeg?.travelClass?.toLowerCase() ?? cabin,
    booking_ref: null, offer_id: null,
  }
}

export function FlightSearchPanel({ tripDestination, tripStartDate, tripEndDate, onAdd }: {
  tripDestination?: string; tripStartDate?: string; tripEndDate?: string; defaultCurrency: string; onAdd: (data: FlightData) => Promise<void>
}) {
  const preferredAirport = useSettingsStore((s) => s.preferredAirport)
  const [origin, setOrigin] = useState(preferredAirport || '')
  const [destination, setDestination] = useState(tripDestination ?? '')
  const [departDate, setDepartDate] = useState(tripStartDate ?? '')
  const [returnDate, setReturnDate] = useState(tripEndDate ?? '')
  const [passengers, setPassengers] = useState('1')
  const [cabin, setCabin] = useState('economy')
  const [addingId, setAddingId] = useState<string | null>(null)

  const { data, isLoading } = useFlightSearch({ origin: origin || undefined, destination: destination || undefined, departDate: departDate || undefined, returnDate: returnDate || undefined, passengers: Number(passengers) })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = (data as any)?.flights ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAdd = async (flight: any) => {
    setAddingId(flight.id)
    try { await onAdd(mapResultToFlightData(flight, origin, destination, cabin)) } finally { setAddingId(null) }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.02] p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-3 gap-y-3">
          <div><FieldLabel>From (IATA)</FieldLabel><Input value={origin} onChange={(v) => setOrigin(v.toUpperCase())} maxLength={3} placeholder="JFK" /></div>
          <div><FieldLabel>To (IATA)</FieldLabel><Input value={destination} onChange={(v) => setDestination(v.toUpperCase())} maxLength={3} placeholder="CDG" /></div>
          <div><FieldLabel>Depart</FieldLabel><Input type="date" value={departDate} onChange={setDepartDate} /></div>
          <div><FieldLabel>Return</FieldLabel><Input type="date" value={returnDate} onChange={setReturnDate} placeholder="One-way" /></div>
          <div className="hidden md:block"><FieldLabel>Passengers</FieldLabel><Select value={passengers} onChange={setPassengers} options={PASSENGER_OPTIONS} /></div>
          <div className="hidden md:block"><FieldLabel>Cabin</FieldLabel><Select value={cabin} onChange={setCabin} options={CABIN_OPTIONS} /></div>
        </div>
      </div>

      {isLoading && <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-gray-400" /></div>}

      {!isLoading && results.length === 0 && (
        <div className="text-center py-8">
          <Search size={20} className="mx-auto text-gray-400 mb-2" />
          <p className="text-[13px] text-gray-500">Enter airports and dates to search for flights.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {results.map((flight: any) => {
            const firstLeg = flight.legs?.[0]
            const lastLeg = flight.legs?.[flight.legs.length - 1]
            return (
              <div key={flight.id} className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4">
                <div className="flex items-start gap-4">
                  <AirlineLogo src={firstLeg?.airlineLogo} airline={firstLeg?.airline} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
                      {[firstLeg?.airline, firstLeg?.flightNumber, firstLeg?.travelClass].filter(Boolean).join(' · ')}
                    </h3>
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 mt-3">
                      <div>
                        <div className="font-serif text-[22px] text-[var(--trip-base)] tabular-nums leading-none">{firstLeg?.departure?.id ?? '—'}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{firstLeg?.departure?.time ? new Date(firstLeg.departure.time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-gray-200 dark:bg-white/[0.10]" />
                        <span className="text-[10px] uppercase tracking-wide text-gray-400">{formatDuration(flight.totalDuration)}{flight.stops > 0 ? ` · ${flight.stops} stop${flight.stops > 1 ? 's' : ''}` : ''}</span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-white/[0.10]" />
                      </div>
                      <div className="text-right">
                        <div className="font-serif text-[22px] text-[var(--trip-base)] tabular-nums leading-none">{lastLeg?.arrival?.id ?? '—'}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{lastLeg?.arrival?.time ? new Date(lastLeg.arrival.time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}</div>
                      </div>
                    </div>
                    {flight.price != null && <div className="text-right mt-3 text-[13px] font-semibold text-gray-900 dark:text-white tabular-nums">${flight.price}</div>}
                  </div>
                  <div className="shrink-0 self-end"><PrimaryButton onClick={() => handleAdd(flight)} busy={addingId === flight.id}>{addingId === flight.id ? '' : 'Add to Trip'}</PrimaryButton></div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
