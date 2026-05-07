'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Plane, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { FlightViewModel, FlightData } from '@travyl/shared'
import { FlightCard } from './FlightCard'
import { FlightForm } from './FlightForm'
import { FlightSearchPanel } from './FlightSearchPanel'
import { addFlight, updateFlight, deleteFlight } from './flightMutations'

export function FlightsModule({ tripId, flights, rawFlights, defaultCurrency, tripDestination, tripStartDate, tripEndDate }: {
  tripId: string; flights: FlightViewModel[]; rawFlights: { id: string; data: FlightData }[]; defaultCurrency: string
  tripDestination?: string; tripStartDate?: string; tripEndDate?: string
}) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [adding, setAdding] = useState(false)
  const [searchMode, setSearchMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const hasExpandedRef = useRef(false)

  const sorted = useMemo(() => [...flights].sort((a, b) => (a.departureAt ?? '').localeCompare(b.departureAt ?? '')), [flights])

  useEffect(() => {
    if (hasExpandedRef.current) return
    const expandId = searchParams.get('expand')
    if (expandId && flights.some((f) => f.id === expandId)) { setEditingId(expandId); hasExpandedRef.current = true }
  }, [searchParams, flights])

  useEffect(() => {
    const onAdd = () => { setAdding(true); setSearchMode(false) }
    window.addEventListener('flights:add', onAdd)
    return () => window.removeEventListener('flights:add', onAdd)
  }, [])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['flights', tripId] })
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
  }

  const handleAdd = async (data: FlightData) => {
    try { await addFlight(tripId, data); invalidate(); setAdding(false); setSearchMode(false) } catch (e) { console.error(e); toast.error("Couldn't save — try again") }
  }
  const handleUpdate = async (id: string, data: FlightData) => {
    try { await updateFlight(id, data); invalidate(); setEditingId(null); if (searchParams.get('expand')) router.replace(`/trip/${tripId}/flights`, { scroll: false }) } catch (e) { console.error(e); toast.error("Couldn't save — try again") }
  }
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this flight?')) return
    try { await deleteFlight(id); invalidate(); setEditingId(null); if (searchParams.get('expand')) router.replace(`/trip/${tripId}/flights`, { scroll: false }) } catch (e) { console.error(e); toast.error("Couldn't delete — try again") }
  }

  if (flights.length === 0 && !adding) {
    if (searchMode) {
      return <FlightSearchPanel tripDestination={tripDestination} tripStartDate={tripStartDate} tripEndDate={tripEndDate} defaultCurrency={defaultCurrency} onAdd={handleAdd} />
    }
    return (
      <div className="flex flex-col items-center text-center py-12">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}><Plane size={20} /></div>
        <p className="text-[15px] font-serif text-gray-700 dark:text-gray-200">No flights booked yet</p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 max-w-sm">Search for flights or add your booking details manually.</p>
        <div className="flex items-center gap-2 mt-4">
          <button onClick={() => setSearchMode(true)} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium text-white shadow-sm hover:shadow-md transition" style={{ backgroundColor: 'var(--trip-base)' }}>
            <Search size={13} /> Search flights
          </button>
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.08] transition">
            <Plus size={13} /> Add manually
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {adding && <FlightForm defaultCurrency={defaultCurrency} onSubmit={handleAdd} onCancel={() => setAdding(false)} />}
      {sorted.map((f) => {
        const raw = rawFlights.find((r) => r.id === f.id)
        if (editingId === f.id && raw) return <FlightForm key={f.id} initial={{ ...raw.data, id: f.id }} defaultCurrency={defaultCurrency} onSubmit={(data) => handleUpdate(f.id, data)} onCancel={() => setEditingId(null)} onDelete={() => handleDelete(f.id)} />
        return <FlightCard key={f.id} flight={f} onEdit={() => setEditingId(f.id)} onDelete={() => handleDelete(f.id)} />
      })}
    </div>
  )
}
