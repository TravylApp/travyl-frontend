'use client'

import { Building2, Search, AlertCircle } from 'lucide-react'
import type { SerpHotel } from './hotelSearch'
import { HotelResultCard } from './HotelResultCard'

export interface HotelSearchState {
  loading: boolean
  results: SerpHotel[]
  error: string | null
  hasSearched: boolean
}

export interface HotelResultsListProps {
  state: HotelSearchState
  savedOfferIds: Set<string>
  busyOfferId: string | null
  onAdd: (hotel: SerpHotel) => Promise<void>
  formatPrice: (n: number, currency?: string | null) => string
}

export function HotelResultsList({ state, savedOfferIds, busyOfferId, onAdd, formatPrice }: HotelResultsListProps) {
  if (!state.hasSearched && !state.loading) return null

  if (state.loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="flex flex-col items-center text-center py-10">
        <AlertCircle size={20} className="text-gray-400 mb-2" />
        <p className="text-[13px] text-gray-700 dark:text-gray-200">{state.error}</p>
      </div>
    )
  }

  if (state.results.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-10">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
        >
          <Search size={20} />
        </div>
        <p className="text-[14px] text-gray-700 dark:text-gray-200">No matches for these dates</p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">Try adjusting your search.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400">
        <Building2 size={12} />
        <span>{state.results.length} {state.results.length === 1 ? 'option' : 'options'}</span>
      </div>
      {state.results.map((hotel) => (
        <HotelResultCard
          key={hotel.id}
          hotel={hotel}
          alreadySaved={savedOfferIds.has(hotel.id)}
          busy={busyOfferId === hotel.id}
          onAdd={onAdd}
          formatPrice={formatPrice}
        />
      ))}
    </div>
  )
}
