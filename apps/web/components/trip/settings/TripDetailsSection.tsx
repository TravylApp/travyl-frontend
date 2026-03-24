'use client'

import { useState, useEffect } from 'react'
import type { Trip } from '@travyl/shared'
import { SectionHeading, FieldLabel, Input, Select, ReadOnlyField } from './shared'

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
  onDirty: () => void
  onFieldChange: (updates: Partial<Trip>) => void
}

export function TripDetailsSection({ trip, canEdit, onDirty, onFieldChange }: TripDetailsSectionProps) {
  const [title, setTitle] = useState(trip.title)
  const [destination, setDestination] = useState(trip.destination)
  const [startDate, setStartDate] = useState(trip.start_date)
  const [endDate, setEndDate] = useState(trip.end_date)
  const [budget, setBudget] = useState(trip.budget?.toString() ?? '')
  const [currency, setCurrency] = useState(trip.currency)
  const [travelers, setTravelers] = useState(trip.travelers.toString())
  const [status, setStatus] = useState(trip.status)

  useEffect(() => {
    setTitle(trip.title)
    setDestination(trip.destination)
    setStartDate(trip.start_date)
    setEndDate(trip.end_date)
    setBudget(trip.budget?.toString() ?? '')
    setCurrency(trip.currency)
    setTravelers(trip.travelers.toString())
    setStatus(trip.status)
  }, [trip])

  const update = (field: string, value: string) => {
    onDirty()
    switch (field) {
      case 'title': setTitle(value); onFieldChange({ title: value }); break
      case 'destination': setDestination(value); onFieldChange({ destination: value }); break
      case 'start_date': setStartDate(value); onFieldChange({ start_date: value }); break
      case 'end_date': setEndDate(value); onFieldChange({ end_date: value }); break
      case 'budget': setBudget(value); onFieldChange({ budget: value === '' ? null : Number(value) }); break
      case 'currency': setCurrency(value); onFieldChange({ currency: value }); break
      case 'travelers': setTravelers(value); onFieldChange({ travelers: Number(value) || 1 }); break
      case 'status': setStatus(value as Trip['status']); onFieldChange({ status: value as Trip['status'] }); break
    }
  }

  if (!canEdit) {
    const budgetDisplay = trip.budget != null ? `${trip.budget} ${trip.currency}` : 'Not set'
    return (
      <div>
        <SectionHeading>Trip Details</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReadOnlyField label="Title" value={trip.title} />
          <ReadOnlyField label="Destination" value={trip.destination} />
          <ReadOnlyField label="Start Date" value={trip.start_date} />
          <ReadOnlyField label="End Date" value={trip.end_date} />
          <ReadOnlyField label="Budget" value={budgetDisplay} />
          <ReadOnlyField label="Travelers" value={String(trip.travelers)} />
          <ReadOnlyField label="Status" value={trip.status} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionHeading>Trip Details</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Title</FieldLabel>
          <Input value={title} onChange={(v) => update('title', v)} />
        </div>
        <div>
          <FieldLabel>Destination</FieldLabel>
          <Input value={destination} onChange={(v) => update('destination', v)} />
        </div>
        <div>
          <FieldLabel>Start Date</FieldLabel>
          <Input value={startDate} onChange={(v) => update('start_date', v)} type="date" />
        </div>
        <div>
          <FieldLabel>End Date</FieldLabel>
          <Input value={endDate} onChange={(v) => update('end_date', v)} type="date" />
        </div>
        <div>
          <FieldLabel>Budget</FieldLabel>
          <Input value={budget} onChange={(v) => update('budget', v)} type="number" placeholder="Optional" />
        </div>
        <div>
          <FieldLabel>Currency</FieldLabel>
          <Select value={currency} onChange={(v) => update('currency', v)} options={CURRENCY_OPTIONS} />
        </div>
        <div>
          <FieldLabel>Travelers</FieldLabel>
          <Input value={travelers} onChange={(v) => update('travelers', v)} type="number" />
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <Select value={status} onChange={(v) => update('status', v)} options={STATUS_OPTIONS} />
        </div>
      </div>
    </div>
  )
}
