'use client'

import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { FieldLabel, Input, Select, DateInput, PrimaryButton } from '@/components/trip/BookingFormPrimitives'
import { AirportAutocomplete } from './AirportAutocomplete'
import { searchAirports } from './airportSearch'
import { searchFlights, type FlightSearchInput, type SerpFlight } from './flightSearch'
import type { FlightSearchState } from './FlightResultsList'

const CABIN_OPTIONS = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium_economy', label: 'Premium economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First' },
]

type AirportValue = { iata: string; name: string; city: string } | null

export interface FlightSearchPanelProps {
  trip: { id: string; start_date: string; end_date: string; destination?: string | null }
  defaultFrom?: AirportValue
  onResultsChange: (state: FlightSearchState) => void
  onClose?: () => void
}

export function FlightSearchPanel({ trip, defaultFrom, onResultsChange, onClose }: FlightSearchPanelProps) {
  const [from, setFrom] = useState<AirportValue>(defaultFrom ?? null)
  const [to, setTo] = useState<AirportValue>(null)
  const [date, setDate] = useState(trip.start_date ?? '')
  const [returnDate, setReturnDate] = useState(trip.end_date ?? '')
  const [oneWay, setOneWay] = useState(false)
  const [passengers, setPassengers] = useState('1')
  const [cabin, setCabin] = useState<FlightSearchInput['cabin']>('economy')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<{ from?: boolean; to?: boolean; date?: boolean }>({})

  useEffect(() => {
    if (defaultFrom && !from) setFrom(defaultFrom)
    // We only want this to fire when defaultFrom resolves on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultFrom?.iata])

  useEffect(() => {
    let cancelled = false
    const query = trip.destination?.trim()
    if (!query || to) return
    void (async () => {
      try {
        const matches = await searchAirports(query)
        if (cancelled) return
        const pick = matches.find((m) => m.type === 'airport') ?? matches[0]
        if (pick) setTo({ iata: pick.iata, name: pick.name, city: pick.city })
      } catch {}
    })()
    return () => { cancelled = true }
    // We only want to auto-resolve once when trip.destination first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.destination])

  const validate = () => {
    const next: typeof errors = {}
    if (!from?.iata) next.from = true
    if (!to?.iata) next.to = true
    if (!date) next.date = true
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSearch = async () => {
    if (!validate() || busy) return
    setBusy(true)
    onResultsChange({ loading: true, results: [], error: null, hasSearched: true })
    try {
      const input: FlightSearchInput = {
        origin: from!.iata,
        destination: to!.iata,
        date,
        return: oneWay ? undefined : (returnDate || undefined),
        passengers: Number(passengers),
        cabin,
      }
      const res = await searchFlights(input)
      if (res.error) {
        onResultsChange({ loading: false, results: [], error: res.error, hasSearched: true })
      } else {
        const flights: SerpFlight[] = res.flights ?? []
        onResultsChange({ loading: false, results: flights, error: null, hasSearched: true })
      }
    } catch (e) {
      onResultsChange({
        loading: false,
        results: [],
        error: e instanceof Error ? e.message : 'Search failed',
        hasSearched: true,
      })
    } finally {
      setBusy(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div onKeyDown={handleKey} className="space-y-4 relative pb-2">
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close search"
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition"
        >
          <X size={14} />
        </button>
      )}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-3">
        <div className="md:col-span-3">
          <AirportAutocomplete label="From" value={from} onChange={setFrom} invalid={errors.from} />
        </div>
        <div className="md:col-span-3">
          <AirportAutocomplete label="To" value={to} onChange={setTo} invalid={errors.to} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Depart</FieldLabel>
          <DateInput value={date} onChange={setDate} invalid={errors.date} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Return</FieldLabel>
          <DateInput value={returnDate} onChange={setReturnDate} disabled={oneWay} />
        </div>
        <div className="md:col-span-1">
          <FieldLabel>Passengers</FieldLabel>
          <Input type="number" value={passengers} onChange={setPassengers} min={1} />
        </div>
        <div className="md:col-span-1">
          <FieldLabel>Cabin</FieldLabel>
          <Select value={cabin} onChange={(v) => setCabin(v as FlightSearchInput['cabin'])} options={CABIN_OPTIONS} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <label className="inline-flex items-center gap-2 text-[12px] text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={oneWay}
            onChange={(e) => setOneWay(e.target.checked)}
            className="rounded"
          />
          One-way
        </label>
        <PrimaryButton onClick={handleSearch} busy={busy}>
          <span className="inline-flex items-center gap-1.5">
            <Search size={13} /> Search flights
          </span>
        </PrimaryButton>
      </div>
    </div>
  )
}
