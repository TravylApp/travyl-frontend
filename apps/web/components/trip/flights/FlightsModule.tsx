'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FlightViewModel, FlightData, Trip } from '@travyl/shared'
import { supabase, useProfile } from '@travyl/shared'
import { FlightCard } from './FlightCard'
import { FlightForm } from './FlightForm'
import { FlightSearchPanel } from './FlightSearchPanel'
import { FlightResultsList, type FlightSearchState } from './FlightResultsList'
import { mapSerpFlightToFlightData, type SerpFlight } from './flightSearch'
import { searchAirports } from './airportSearch'
import { addFlight, updateFlight, deleteFlight } from './flightMutations'

export interface FlightsModuleProps {
  tripId: string
  flights: FlightViewModel[]
  rawFlights: { id: string; data: FlightData }[]
  defaultCurrency: string
  formatPrice: (n: number, currency?: string | null) => string
}

export function FlightsModule({ tripId, flights, rawFlights, defaultCurrency, formatPrice }: FlightsModuleProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: profile } = useProfile()

  const [searching, setSearching] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchState, setSearchState] = useState<FlightSearchState>({
    loading: false, results: [], error: null, hasSearched: false,
  })
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null)
  const hasExpandedRef = useRef(false)
  const [defaultFrom, setDefaultFrom] = useState<{ iata: string; name: string; city: string } | null>(null)

  const { data: trip } = useQuery<Trip | null>({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      const { data } = await supabase.from('trips').select('*').eq('id', tripId).single()
      return data as Trip | null
    },
    enabled: !!tripId,
    staleTime: 60_000,
  })

  // Resolve profile.home_airport (IATA) into the full airport object for the search panel.
  useEffect(() => {
    let cancelled = false
    const iata = profile?.home_airport
    if (!iata) { setDefaultFrom(null); return }
    void (async () => {
      try {
        const matches = await searchAirports(iata)
        if (cancelled) return
        const exact = matches.find((m) => m.iata === iata)
        if (exact) {
          setDefaultFrom({
            iata: exact.iata,
            name: exact.name ?? '',
            city: exact.city ?? '',
          })
        } else {
          setDefaultFrom({ iata, name: '', city: '' })
        }
      } catch {
        if (!cancelled) setDefaultFrom({ iata, name: '', city: '' })
      }
    })()
    return () => { cancelled = true }
  }, [profile?.home_airport])

  const sorted = useMemo(
    () => [...flights].sort((a, b) => {
      const av = a.departureAt ?? ''
      const bv = b.departureAt ?? ''
      return av.localeCompare(bv)
    }),
    [flights],
  )

  const savedOfferIds = useMemo(
    () => new Set(rawFlights.map((r) => r.data.offer_id).filter(Boolean) as string[]),
    [rawFlights],
  )

  useEffect(() => {
    if (hasExpandedRef.current) return
    const expandId = searchParams.get('expand')
    if (expandId && flights.some((f) => f.id === expandId)) { setEditingId(expandId); hasExpandedRef.current = true }
  }, [searchParams, flights])

  useEffect(() => {
    const onAdd = () => setSearching(true)
    window.addEventListener('flights:add', onAdd)
    return () => window.removeEventListener('flights:add', onAdd)
  }, [])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['flights', tripId] })
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
  }

  const handleAddFromSearch = async (serpFlight: SerpFlight) => {
    setBusyOfferId(serpFlight.id)
    try {
      const data = mapSerpFlightToFlightData(serpFlight)
      await addFlight(tripId, data)
      invalidate()
      toast.success(`Added ${data.airline || 'flight'}`)
    } catch (e) {
      console.error(e)
      toast.error("Couldn't add — try again")
    } finally {
      setBusyOfferId(null)
    }
  }
  const handleUpdate = async (id: string, data: FlightData) => {
    try { await updateFlight(id, data); invalidate(); setEditingId(null); if (searchParams.get('expand')) router.replace(`/trip/${tripId}/flights`, { scroll: false }) } catch (e) { console.error(e); toast.error("Couldn't save — try again") }
  }
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this flight?')) return
    try { await deleteFlight(id); invalidate(); setEditingId(null); if (searchParams.get('expand')) router.replace(`/trip/${tripId}/flights`, { scroll: false }) } catch (e) { console.error(e); toast.error("Couldn't delete — try again") }
  }

  const tripForPanel = {
    id: tripId,
    start_date: trip?.start_date ?? '',
    end_date: trip?.end_date ?? '',
    destination: trip?.destination ?? '',
  }

  return (
    <div className="space-y-4">
      {searching && (
        <>
          <FlightSearchPanel
            trip={tripForPanel}
            defaultFrom={defaultFrom}
            onResultsChange={setSearchState}
            onClose={() => {
              setSearching(false)
              setSearchState({ loading: false, results: [], error: null, hasSearched: false })
            }}
          />
          <FlightResultsList
            state={searchState}
            savedOfferIds={savedOfferIds}
            busyOfferId={busyOfferId}
            onAdd={handleAddFromSearch}
            formatPrice={formatPrice}
          />
        </>
      )}

      {flights.length === 0 && !searching && (
        <div className="flex flex-col items-center text-center py-12">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
          </div>
          <p className="text-[15px] font-serif text-gray-700 dark:text-gray-200">No flights booked yet</p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
            Search live inventory to add a flight to your trip.
          </p>
          <button
            onClick={() => setSearching(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium text-white shadow-sm hover:shadow-md transition"
            style={{ backgroundColor: 'var(--trip-base)' }}
          >
            Search flights
          </button>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((f) => {
          const raw = rawFlights.find((r) => r.id === f.id)
          if (editingId === f.id && raw) {
            return (
              <FlightForm
                key={f.id}
                initial={{ ...raw.data, id: f.id }}
                defaultCurrency={defaultCurrency}
                onSubmit={(data) => handleUpdate(f.id, data)}
                onCancel={() => setEditingId(null)}
                onDelete={() => handleDelete(f.id)}
              />
            )
          }
          return (
            <FlightCard
              key={f.id}
              flight={f}
              onEdit={() => setEditingId(f.id)}
              onDelete={() => handleDelete(f.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
