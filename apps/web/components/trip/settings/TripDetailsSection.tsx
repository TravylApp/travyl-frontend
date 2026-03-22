'use client'

import { useState, useEffect, useRef } from 'react'
import type { Trip } from '@travyl/shared'
import { SectionHeading, SectionDescription, FieldLabel, Select, ReadOnlyField } from './shared'

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CAD', label: 'CAD ($)' },
]

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planning' },
  { value: 'booked', label: 'Booked' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'abandoned', label: 'Abandoned' },
]

interface TripDetailsSectionProps {
  trip: Trip
  canEdit: boolean
  onFieldChange: (updates: Partial<Trip>) => void
}

// Text input that saves on blur
function BlurInput({
  value: initialValue,
  onSave,
  type = 'text',
  placeholder,
}: {
  value: string
  onSave: (v: string) => void
  type?: string
  placeholder?: string
}) {
  const [value, setValue] = useState(initialValue)
  const ref = useRef(initialValue)

  useEffect(() => {
    setValue(initialValue)
    ref.current = initialValue
  }, [initialValue])

  const handleBlur = () => {
    if (value !== ref.current) {
      ref.current = value
      onSave(value)
    }
  }

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#003594]/20 focus:border-[#003594] transition"
    />
  )
}

export function TripDetailsSection({ trip, canEdit, onFieldChange }: TripDetailsSectionProps) {
  if (!canEdit) {
    const budgetDisplay = trip.budget != null ? `${trip.budget} ${trip.currency}` : 'Not set'
    return (
      <div>
        <SectionHeading>Trip Details</SectionHeading>
        <SectionDescription>Basic information about your trip.</SectionDescription>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnlyField label="Title" value={trip.title} />
          <ReadOnlyField label="Destination" value={trip.destination} />
          <ReadOnlyField label="Start Date" value={trip.start_date} />
          <ReadOnlyField label="End Date" value={trip.end_date} />
          <ReadOnlyField label="Budget" value={budgetDisplay} />
          <ReadOnlyField label="Travelers" value={String(trip.travelers ?? 1)} />
          <ReadOnlyField label="Status" value={trip.status} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionHeading>Trip Details</SectionHeading>
      <SectionDescription>Basic information about your trip.</SectionDescription>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Title</FieldLabel>
          <BlurInput value={trip.title} onSave={(v) => onFieldChange({ title: v })} />
        </div>
        <div>
          <FieldLabel>Destination</FieldLabel>
          <BlurInput value={trip.destination} onSave={(v) => onFieldChange({ destination: v })} />
        </div>
        <div>
          <FieldLabel>Start Date</FieldLabel>
          <BlurInput value={trip.start_date} onSave={(v) => onFieldChange({ start_date: v })} type="date" />
        </div>
        <div>
          <FieldLabel>End Date</FieldLabel>
          <BlurInput value={trip.end_date} onSave={(v) => onFieldChange({ end_date: v })} type="date" />
        </div>
        <div>
          <FieldLabel>Budget</FieldLabel>
          <BlurInput
            value={trip.budget?.toString() ?? ''}
            onSave={(v) => onFieldChange({ budget: v === '' ? null : Number(v) })}
            type="number"
            placeholder="Optional"
          />
        </div>
        <div>
          <FieldLabel>Currency</FieldLabel>
          <Select value={trip.currency} onChange={(v) => onFieldChange({ currency: v })} options={CURRENCY_OPTIONS} />
        </div>
        <div>
          <FieldLabel>Travelers</FieldLabel>
          <BlurInput
            value={(trip.travelers ?? 1).toString()}
            onSave={(v) => onFieldChange({ travelers: Number(v) || 1 })}
            type="number"
          />
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <Select value={trip.status} onChange={(v) => onFieldChange({ status: v as Trip['status'] })} options={STATUS_OPTIONS} />
        </div>
      </div>
    </div>
  )
}
