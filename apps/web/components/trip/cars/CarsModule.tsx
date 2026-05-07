'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Car, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { CarRental, CarRentalData } from './types'
import { CarCard } from './CarCard'
import { CarForm } from './CarForm'
import { addCar, updateCar, deleteCar } from './carMutations'

export interface CarsModuleProps {
  tripId: string
  cars: CarRental[]
  defaultCurrency: string
  formatPrice: (n: number, currency?: string | null) => string
}

export function CarsModule({ tripId, cars, defaultCurrency, formatPrice }: CarsModuleProps) {
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
      <div className="flex flex-col items-center text-center py-12">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)', color: 'var(--trip-base)' }}
        >
          <Car size={20} />
        </div>
        <p className="text-[15px] font-serif text-gray-700 dark:text-gray-200">No car rentals yet</p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
          Add a rental to track your ground transportation.
        </p>
        <button
          onClick={() => setAdding(true)}
          className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-xl text-[13px] font-medium border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.08] transition"
        >
          <Plus size={13} /> Add rental
        </button>
      </div>
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
