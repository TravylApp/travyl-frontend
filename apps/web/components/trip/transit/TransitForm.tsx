'use client'

import { useState } from 'react'
import type { TransitData, VehicleType } from '@travyl/shared'
import { FieldLabel, Input, Select, DateTimeInput, PrimaryButton, SecondaryButton } from '@/components/trip/BookingFormPrimitives'

const VEHICLE_OPTIONS: { value: VehicleType; label: string; icon: string }[] = [
  { value: 'train', label: 'Train', icon: '\u{1F686}' },
  { value: 'bus', label: 'Bus', icon: '\u{1F68C}' },
  { value: 'ferry', label: 'Ferry', icon: '\u26F4\uFE0F' },
  { value: 'rideshare', label: 'Rideshare', icon: '\u{1F695}' },
  { value: 'shuttle', label: 'Shuttle', icon: '\u{1F690}' },
]

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (\u20AC)' },
  { value: 'GBP', label: 'GBP (\u00A3)' },
  { value: 'JPY', label: 'JPY (\u00A5)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'MXN', label: 'MXN ($)' },
]

function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

export interface TransitFormProps {
  initial?: Partial<TransitData> & { id?: string }
  defaultCurrency?: string
  onSubmit: (data: TransitData) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}

export function TransitForm({ initial, defaultCurrency = 'USD', onSubmit, onCancel, onDelete }: TransitFormProps) {
  const isAddMode = !initial?.originLabel && !initial?.destinationLabel

  const [vehicleType, setVehicleType] = useState<VehicleType>(initial?.vehicleType ?? 'train')
  const [provider, setProvider] = useState(initial?.provider ?? '')
  const [routeName, setRouteName] = useState(initial?.routeName ?? '')
  const [originLabel, setOriginLabel] = useState(initial?.originLabel ?? '')
  const [destinationLabel, setDestinationLabel] = useState(initial?.destinationLabel ?? '')
  const [departureLocal, setDepartureLocal] = useState(isoToLocalInput(initial?.departureAt))
  const [arrivalLocal, setArrivalLocal] = useState(isoToLocalInput(initial?.arrivalAt))
  const [price, setPrice] = useState(initial?.price?.toString() ?? '')
  const [currency, setCurrency] = useState(initial?.currency ?? defaultCurrency)
  const [bookingRef, setBookingRef] = useState(initial?.bookingRef ?? '')
  const [confirmationCode, setConfirmationCode] = useState(initial?.confirmationCode ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const validate = () => {
    if (!isAddMode) return true
    const next: Record<string, boolean> = {}
    if (!originLabel.trim()) next.originLabel = true
    if (!destinationLabel.trim()) next.destinationLabel = true
    if (!departureLocal) next.departure = true
    if (!arrivalLocal) next.arrival = true
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setBusy(true)
    try {
      const departureIso = isAddMode ? localInputToIso(departureLocal) : (initial?.departureAt ?? null)
      const arrivalIso = isAddMode ? localInputToIso(arrivalLocal) : (initial?.arrivalAt ?? null)
      const data: TransitData = {
        vehicleType,
        provider: provider.trim() || null,
        routeName: routeName.trim() || null,
        originLabel: originLabel.trim(),
        destinationLabel: destinationLabel.trim(),
        departureAt: departureIso ?? initial?.departureAt ?? '',
        arrivalAt: arrivalIso ?? initial?.arrivalAt ?? '',
        price: price ? Number(price) : null,
        currency: currency || defaultCurrency,
        bookingRef: bookingRef.trim() || null,
        confirmationCode: confirmationCode.trim() || null,
        notes: notes.trim() || null,
      }
      await onSubmit(data)
    } finally {
      setBusy(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel()
    else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
  }

  // Vehicle type pills
  const vehiclePills = VEHICLE_OPTIONS.map((opt) => (
    <button
      key={opt.value}
      type="button"
      onClick={() => setVehicleType(opt.value)}
      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
        vehicleType === opt.value
          ? 'bg-[var(--trip-base)]/10 text-[var(--trip-base)] border-2 border-[var(--trip-base)]/30'
          : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400 border-2 border-transparent hover:border-gray-200'
      }`}
    >
      {opt.icon} {opt.label}
    </button>
  ))

  return (
    <div onKeyDown={handleKey} className="rounded-xl border border-[var(--trip-base)]/30 bg-white dark:bg-white/[0.04] p-5 space-y-4">
      {!isAddMode && (
        <div className="space-y-1">
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">
            {initial?.provider} {initial?.routeName ?? ''}
          </h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">
            {initial?.originLabel} {'\u2192'} {initial?.destinationLabel}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-3">
        {/* Vehicle type */}
        <div className="md:col-span-6">
          <FieldLabel>Vehicle type</FieldLabel>
          <div className="flex gap-2 flex-wrap">{vehiclePills}</div>
        </div>

        {isAddMode && (
          <>
            <div className="md:col-span-3">
              <FieldLabel>Provider</FieldLabel>
              <Input value={provider} onChange={setProvider} autoFocus placeholder="Amtrak, FlixBus, Uber, etc." />
            </div>
            <div className="md:col-span-3">
              <FieldLabel>Route name</FieldLabel>
              <Input value={routeName} onChange={setRouteName} placeholder="Northeast Regional (optional)" />
            </div>
            <div className="md:col-span-3">
              <FieldLabel>Origin</FieldLabel>
              <Input value={originLabel} onChange={setOriginLabel} invalid={errors.originLabel} placeholder="NYC Penn Station" />
            </div>
            <div className="md:col-span-3">
              <FieldLabel>Destination</FieldLabel>
              <Input value={destinationLabel} onChange={setDestinationLabel} invalid={errors.destinationLabel} placeholder="Boston South Station" />
            </div>
            <div className="md:col-span-3">
              <FieldLabel>Departure</FieldLabel>
              <DateTimeInput value={departureLocal} onChange={setDepartureLocal} invalid={errors.departure} />
            </div>
            <div className="md:col-span-3">
              <FieldLabel>Arrival</FieldLabel>
              <DateTimeInput value={arrivalLocal} onChange={setArrivalLocal} invalid={errors.arrival} />
            </div>
          </>
        )}

        {/* Price/currency/ref — always visible */}
        <div className="md:col-span-2">
          <FieldLabel>Price</FieldLabel>
          <Input type="number" value={price} onChange={setPrice} placeholder="0" min={0} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Currency</FieldLabel>
          <Select value={currency} onChange={setCurrency} options={CURRENCY_OPTIONS} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Booking ref</FieldLabel>
          <Input value={bookingRef} onChange={setBookingRef} placeholder="Optional" />
        </div>
        <div className="md:col-span-6">
          <FieldLabel>Confirmation code</FieldLabel>
          <Input value={confirmationCode} onChange={setConfirmationCode} placeholder="Optional" />
        </div>
        <div className="md:col-span-6">
          <FieldLabel>Notes</FieldLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            rows={2}
            className="w-full rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] px-4 py-2 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--trip-base)]/20 resize-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            onClick={onDelete}
            disabled={busy}
            className="text-[13px] font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
          >
            Delete transit
          </button>
        ) : <span />}
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onCancel} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} busy={busy}>{isAddMode ? 'Add transit' : 'Save'}</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
