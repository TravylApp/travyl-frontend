'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { FlightViewModel, FlightData, Trip } from '@travyl/shared'
import { supabase, useProfile } from '@travyl/shared'
import { FlightCard } from './FlightCard'
import { FlightForm } from './FlightForm'
import { FlightSearchPanel } from './FlightSearchPanel'
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

  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingManually, setAddingManually] = useState(false)
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null)
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

  // Derive the default From airport.
  //  1. profile.home_airport (explicit IATA override, e.g., "BFL") wins
  //  2. otherwise derive from profile.city — search airports near "Austin"
  //     and use the first airport result. This is the "where you live →
  //     nearest airport" path the user expected; they can still change in
  //     the search panel itself.
  useEffect(() => {
    let cancelled = false
    const iata = profile?.home_airport
    const city = profile?.city
    if (!iata && !city) {
      setDefaultFrom(null)
      return
    }
    void (async () => {
      try {
        const query = iata || city || ''
        if (!query) return
        const matches = await searchAirports(query)
        if (cancelled) return
        // Prefer an exact IATA hit when override was set; otherwise take the
        // first proper airport in the city's results.
        const pick = iata
          ? matches.find((m) => m.iata === iata) ?? matches[0]
          : matches.find((m) => m.type === 'airport') ?? matches[0]
        if (pick?.iata) {
          setDefaultFrom({ iata: pick.iata, name: pick.name ?? '', city: pick.city ?? '' })
        } else if (iata) {
          setDefaultFrom({ iata, name: '', city: '' })
        } else {
          setDefaultFrom(null)
        }
      } catch {
        if (!cancelled && iata) setDefaultFrom({ iata, name: '', city: '' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile?.home_airport, profile?.city])

  const sorted = useMemo(
    () =>
      [...flights].sort((a, b) => {
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

  // Open the manual form on `?expand=` deep-link from itinerary
  useEffect(() => {
    const expandId = searchParams.get('expand')
    if (expandId && flights.some((f) => f.id === expandId)) setEditingId(expandId)
  }, [searchParams, flights])

  // Page header "Add manually" button dispatches this
  useEffect(() => {
    const onAdd = () => setAddingManually(true)
    window.addEventListener('flights:add-manual', onAdd)
    return () => window.removeEventListener('flights:add-manual', onAdd)
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
    try {
      await updateFlight(id, data)
      invalidate()
      setEditingId(null)
      if (searchParams.get('expand')) router.replace(`/trip/${tripId}/flights`, { scroll: false })
    } catch (e) {
      console.error(e)
      toast.error("Couldn't save — try again")
    }
  }
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this flight?')) return
    try {
      await deleteFlight(id)
      invalidate()
      setEditingId(null)
      if (searchParams.get('expand')) router.replace(`/trip/${tripId}/flights`, { scroll: false })
    } catch (e) {
      console.error(e)
      toast.error("Couldn't delete — try again")
    }
  }
  const handleAddManual = async (data: FlightData) => {
    try {
      await addFlight(tripId, data)
      invalidate()
      setAddingManually(false)
      toast.success('Flight added')
    } catch (e) {
      console.error(e)
      toast.error("Couldn't save — try again")
    }
  }

  const tripForPanel = {
    id: tripId,
    start_date: trip?.start_date ?? '',
    end_date: trip?.end_date ?? '',
    destination: trip?.destination ?? '',
  }

  return (
    <div className="space-y-6">
      {/* Manual-entry form (opt-in) */}
      {addingManually && (
        <FlightForm
          defaultCurrency={defaultCurrency}
          onSubmit={handleAddManual}
          onCancel={() => setAddingManually(false)}
        />
      )}

      {/* Saved bookings strip */}
      {flights.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[15px] font-serif text-gray-700 dark:text-gray-200">Your bookings</h2>
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
        </section>
      )}

      {/* Always-on search */}
      <section className="space-y-3">
        {flights.length > 0 && (
          <h2 className="text-[15px] font-serif text-gray-700 dark:text-gray-200">Find more</h2>
        )}
        <FlightSearchPanel
          trip={tripForPanel}
          defaultFrom={defaultFrom}
          savedOfferIds={savedOfferIds}
          busyOfferId={busyOfferId}
          onAdd={handleAddFromSearch}
          formatPrice={formatPrice}
          onAddManually={() => setAddingManually(true)}
        />
      </section>
    </div>
  )
}
