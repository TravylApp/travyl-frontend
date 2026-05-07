'use client'

import { useMemo, useState } from 'react'
import { Plane, Search, AlertCircle } from 'lucide-react'
import type { SerpFlight } from './flightSearch'
import { FlightResultCard } from './FlightResultCard'

export interface FlightSearchState {
  loading: boolean
  results: SerpFlight[]
  error: string | null
  hasSearched: boolean
}

type Tab = 'best' | 'cheapest' | 'fastest'

export interface FlightResultsListProps {
  state: FlightSearchState
  savedOfferIds: Set<string>
  busyOfferId: string | null
  onAdd: (flight: SerpFlight) => Promise<void>
  formatPrice: (n: number, currency?: string | null) => string
}

export function FlightResultsList({ state, savedOfferIds, busyOfferId, onAdd, formatPrice }: FlightResultsListProps) {
  const [tab, setTab] = useState<Tab>('best')

  const sorted = useMemo(() => {
    if (tab === 'best') return state.results.filter((f) => f.tier === 'best').concat(state.results.filter((f) => f.tier !== 'best'))
    if (tab === 'cheapest') return [...state.results].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
    return [...state.results].sort((a, b) => a.totalDuration - b.totalDuration)
  }, [state.results, tab])

  if (!state.hasSearched && !state.loading) return null

  if (state.loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
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
        <p className="text-[14px] text-gray-700 dark:text-gray-200">No flights for these dates</p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">Try different airports or dates.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] text-gray-500 dark:text-gray-400">
          <Plane size={12} />
          <span>{state.results.length} {state.results.length === 1 ? 'flight' : 'flights'}</span>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-white/[0.04]">
          {(['best', 'cheapest', 'fastest'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 h-7 rounded text-[12px] font-medium transition ${tab === t ? 'bg-white dark:bg-white/[0.08] text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {sorted.map((flight) => (
        <FlightResultCard
          key={flight.id}
          flight={flight}
          alreadySaved={savedOfferIds.has(flight.id)}
          busy={busyOfferId === flight.id}
          onAdd={onAdd}
          formatPrice={formatPrice}
        />
      ))}
    </div>
  )
}
