'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { CarRental, CarRentalData } from './types'
import { CarCard } from './CarCard'
import { CarForm } from './CarForm'
import { CarSearchPanel } from './CarSearchPanel'
import { addCar, updateCar, deleteCar } from './carMutations'

export interface CarsModuleProps {
  tripId: string
  cars: CarRental[]
  defaultCurrency: string
  formatPrice: (n: number, currency?: string | null) => string
  tripDestination?: string
  tripStartDate?: string
  tripEndDate?: string
}

export function CarsModule({ tripId, cars, defaultCurrency, formatPrice, tripDestination, tripStartDate, tripEndDate }: CarsModuleProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const hasExpandedRef = useRef(false)

  // Sort by pickup_at ascending. Defensive `?? ''` in case someone hand-edits trip_context.
  const sorted = useMemo(
    () => [...cars].sort((a, b) => (a.data.pickup_at ?? '').localeCompare(b.data.pickup_at ?? '')),
    [cars],
  )

  // Auto-expand if URL ?expand=<id> is present. Only fires once.
  useEffect(() => {
    if (hasExpandedRef.current) return
    const expandId = searchParams.get('expand')
    if (expandId && cars.some((c) => c.id === expandId)) {
      setEditingId(expandId)
      hasExpandedRef.current = true
    }
  }, [searchParams, cars])

  // Listen for the page-header "+ Rental" CustomEvent to open the add form.
  useEffect(() => {
    const onAdd = () => setAdding(true)
    window.addEventListener('cars:add', onAdd)
    return () => window.removeEventListener('cars:add', onAdd)
  }, [])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
  }

  const handleAdd = async (data: CarRentalData) => {
    try {
      await addCar(tripId, data)
      invalidate()
      setAdding(false)
    } catch (e) {
      console.error(e)
      toast.error("Couldn't save — try again")
    }
  }

  const handleUpdate = async (id: string, data: CarRentalData) => {
    try {
      await updateCar(tripId, id, data)
      invalidate()
      setEditingId(null)
      if (searchParams.get('expand')) {
        router.replace(`/trip/${tripId}/cars`, { scroll: false })
      }
    } catch (e) {
      console.error(e)
      toast.error("Couldn't save — try again")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this car rental?')) return
    try {
      await deleteCar(tripId, id)
      invalidate()
      setEditingId(null)
      if (searchParams.get('expand')) {
        router.replace(`/trip/${tripId}/cars`, { scroll: false })
      }
    } catch (e) {
      console.error(e)
      toast.error("Couldn't delete — try again")
    }
  }

  if (cars.length === 0 && !adding) {
    return (
      <CarSearchPanel
        tripDestination={tripDestination}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        onAdd={handleAdd}
        onAddManually={() => setAdding(true)}
      />
    )
  }

  return (
    <div className="space-y-3">
      {adding && (
        <CarForm
          defaultCurrency={defaultCurrency}
          onSubmit={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}
      {sorted.map((c) => {
        if (editingId === c.id) {
          return (
            <CarForm
              key={c.id}
              initial={{ ...c.data, id: c.id }}
              defaultCurrency={defaultCurrency}
              onSubmit={(data) => handleUpdate(c.id, data)}
              onCancel={() => setEditingId(null)}
              onDelete={() => handleDelete(c.id)}
            />
          )
        }
        return (
          <CarCard
            key={c.id}
            car={c}
            formatPrice={formatPrice}
            onEdit={() => setEditingId(c.id)}
            onDelete={() => handleDelete(c.id)}
          />
        )
      })}
    </div>
  )
}
