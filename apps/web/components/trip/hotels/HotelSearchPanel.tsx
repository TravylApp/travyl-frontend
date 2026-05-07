'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { FieldLabel, Input, Select, DateInput, PrimaryButton } from '@/components/trip/BookingFormPrimitives'
import { searchHotels, type HotelSearchInput } from './hotelSearch'
import type { HotelSearchState } from './HotelResultsList'

const SORT_OPTIONS = [
  { value: '3', label: 'Lowest price' },
  { value: '8', label: 'Highest rating' },
]

export interface HotelSearchPanelProps {
  trip: { id: string; destination: string; start_date: string; end_date: string }
  onResultsChange: (state: HotelSearchState) => void
  onInputsChange: (inputs: { check_in: string; check_out: string; guests: number }) => void
  onClose?: () => void
}

export function HotelSearchPanel({ trip, onResultsChange, onInputsChange, onClose }: HotelSearchPanelProps) {
  const [destination, setDestination] = useState(trip.destination ?? '')
  const [checkIn, setCheckIn] = useState(trip.start_date ?? '')
  const [checkOut, setCheckOut] = useState(trip.end_date ?? '')
  const [guests, setGuests] = useState('2')
  const [sort, setSort] = useState<'3' | '8'>('3')
  const [busy, setBusy] = useState(false)

  const handleSearch = async () => {
    if (!destination.trim() || !checkIn || !checkOut || busy) return
    setBusy(true)
    onResultsChange({ loading: true, results: [], error: null, hasSearched: true })
    onInputsChange({ check_in: checkIn, check_out: checkOut, guests: Number(guests) })
    try {
      const input: HotelSearchInput = {
        destination: destination.trim(),
        check_in: checkIn,
        check_out: checkOut,
        guests: Number(guests),
        sort,
      }
      const res = await searchHotels(input)
      if (res.error) {
        onResultsChange({ loading: false, results: [], error: res.error, hasSearched: true })
      } else {
        onResultsChange({ loading: false, results: res.hotels, error: null, hasSearched: true })
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
        <div className="md:col-span-6">
          <FieldLabel>Destination</FieldLabel>
          <Input value={destination} onChange={setDestination} placeholder="City, country" autoFocus />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Check-in</FieldLabel>
          <DateInput value={checkIn} onChange={setCheckIn} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Check-out</FieldLabel>
          <DateInput value={checkOut} onChange={setCheckOut} />
        </div>
        <div className="md:col-span-1">
          <FieldLabel>Guests</FieldLabel>
          <Input type="number" value={guests} onChange={setGuests} min={1} />
        </div>
        <div className="md:col-span-1">
          <FieldLabel>Sort</FieldLabel>
          <Select value={sort} onChange={(v) => setSort(v as '3' | '8')} options={SORT_OPTIONS} />
        </div>
      </div>

      <div className="flex justify-end">
        <PrimaryButton onClick={handleSearch} busy={busy}>
          <span className="inline-flex items-center gap-1.5">
            <Search size={13} /> Search hotels
          </span>
        </PrimaryButton>
      </div>
    </div>
  )
}
