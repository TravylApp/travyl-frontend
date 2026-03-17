'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { X, Plane } from 'lucide-react'
import { useAuthStore } from '@travyl/shared'
import { supabase } from '@travyl/shared'

interface CreateTripModalProps {
  open: boolean
  onClose: () => void
}

interface FieldErrors {
  title?: string
  destination?: string
  start_date?: string
  end_date?: string
}

export function CreateTripModal({ open, onClose }: CreateTripModalProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle('')
      setDestination('')
      setStartDate('')
      setEndDate('')
      setFieldErrors({})
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function validate(): boolean {
    const errors: FieldErrors = {}
    if (!title.trim()) errors.title = 'Trip name is required'
    if (!destination.trim()) errors.destination = 'Destination is required'
    if (!startDate) errors.start_date = 'Start date is required'
    if (!endDate) errors.end_date = 'End date is required'
    else if (startDate && endDate <= startDate) errors.end_date = 'End date must be after start date'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!user) {
      setError('You must be signed in to create a trip.')
      return
    }
    if (!validate()) return

    setSubmitting(true)
    try {
      const { data, error: insertError } = await supabase
        .from('trips')
        .insert({
          title: title.trim(),
          destination: destination.trim(),
          start_date: startDate,
          end_date: endDate,
          status: 'planning',
          user_id: user.id,
        })
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
        return
      }

      await queryClient.invalidateQueries({ queryKey: ['trips'] })
      onClose()
      router.push(`/trip/${data.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-trip-title"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center">
              <Plane size={14} className="text-white -rotate-12" />
            </div>
            <h2 id="create-trip-title" className="text-lg font-bold text-[#1e3a5f]">Plan a Trip</h2>
          </div>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div role="alert" className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Trip name */}
          <div>
            <label htmlFor="trip-title" className="block text-sm font-medium text-gray-700 mb-1">Trip name</label>
            <input
              id="trip-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Paris Adventure"
              disabled={submitting}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40 disabled:opacity-50 transition-all"
            />
            {fieldErrors.title && <p className="mt-1 text-xs text-red-500">{fieldErrors.title}</p>}
          </div>

          {/* Destination */}
          <div>
            <label htmlFor="trip-destination" className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
            <input
              id="trip-destination"
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Paris, France"
              disabled={submitting}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40 disabled:opacity-50 transition-all"
            />
            {fieldErrors.destination && <p className="mt-1 text-xs text-red-500">{fieldErrors.destination}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="trip-start-date" className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
              <input
                id="trip-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={submitting}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40 disabled:opacity-50 transition-all"
              />
              {fieldErrors.start_date && <p className="mt-1 text-xs text-red-500">{fieldErrors.start_date}</p>}
            </div>
            <div>
              <label htmlFor="trip-end-date" className="block text-sm font-medium text-gray-700 mb-1">End date</label>
              <input
                id="trip-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={submitting}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40 disabled:opacity-50 transition-all"
              />
              {fieldErrors.end_date && <p className="mt-1 text-xs text-red-500">{fieldErrors.end_date}</p>}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#2a4d78] disabled:opacity-50 transition-all mt-2"
          >
            {submitting ? 'Creating...' : 'Create Trip'}
          </button>
        </form>
      </div>
    </div>
  )
}
