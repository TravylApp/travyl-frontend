'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { FieldLabel, Input, Select, DateInput, PrimaryButton } from '@/components/trip/BookingFormPrimitives'
import { AirportAutocomplete } from './AirportAutocomplete'
import { searchFlights, type FlightSearchInput, type SerpFlight } from './flightSearch'
import type { FlightSearchState } from './FlightResultsList'

const CABIN_OPTIONS = [
  { value: 'economy', label: 'Economy' },
  { value: 'premium_economy', label: 'Premium economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First' },
]

export interface FlightSearchPanelProps {
  trip: { id: string; start_date: string; end_date: string }
  onResultsChange: (state: FlightSearchState) => void
}

export function FlightSearchPanel({ trip, onResultsChange }: FlightSearchPanelProps) {
  const [from, setFrom] = useState<{ iata: string; name: string; city: string } | null>(null)
  const [to, setTo] = useState<{ iata: string; name: string; city: string } | null>(null)
  const [date, setDate] = useState(trip.start_date ?? '')
  const [returnDate, setReturnDate] = useState(trip.end_date ?? '')
  const [oneWay, setOneWay] = useState(false)
  const [passengers, setPassengers] = useState('1')
  const [cabin, setCabin] = useState<FlightSearchInput['cabin']>('economy')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<{ from?: boolean; to?: boolean; date?: boolean }>({})

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
    <div onKeyDown={handleKey} className="rounded-xl border border-[var(--trip-base)]/30 bg-white dark:bg-white/[0.04] p-5 space-y-4">
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
