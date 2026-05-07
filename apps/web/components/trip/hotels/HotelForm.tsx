'use client'

import { useState } from 'react'
import type { HotelData } from '@travyl/shared'
import { FieldLabel, Input, Select, DateInput, PrimaryButton, SecondaryButton } from '@/components/trip/BookingFormPrimitives'

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'MXN', label: 'MXN ($)' },
]

export interface HotelFormProps {
  initial: Partial<HotelData> & { id: string }
  defaultCurrency?: string
  onSubmit: (data: HotelData) => Promise<void>
  onCancel: () => void
  onDelete: () => Promise<void>
}

export function HotelForm({ initial, defaultCurrency = 'USD', onSubmit, onCancel, onDelete }: HotelFormProps) {
  const [checkIn, setCheckIn] = useState(initial.check_in ?? '')
  const [checkOut, setCheckOut] = useState(initial.check_out ?? '')
  const [pricePerNight, setPricePerNight] = useState(initial.price_per_night?.toString() ?? '')
  const [totalPrice, setTotalPrice] = useState(initial.total_price?.toString() ?? '')
  const [currency, setCurrency] = useState(initial.currency ?? defaultCurrency)
  const [bookingRef, setBookingRef] = useState(initial.booking_ref ?? '')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<{ checkIn?: boolean; checkOut?: boolean }>({})

  const validate = () => {
    const next: typeof errors = {}
    if (!checkIn) next.checkIn = true
    if (!checkOut) next.checkOut = true
    else if (checkIn && checkOut < checkIn) next.checkOut = true
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setBusy(true)
    try {
      const data: HotelData = {
        name: initial.name ?? '',
        address: initial.address ?? null,
        latitude: initial.latitude ?? null,
        longitude: initial.longitude ?? null,
        check_in: checkIn,
        check_out: checkOut,
        price_per_night: pricePerNight ? Number(pricePerNight) : null,
        total_price: totalPrice ? Number(totalPrice) : null,
        currency: (pricePerNight || totalPrice) ? currency : null,
        rating: initial.rating ?? null,
        star_rating: initial.star_rating ?? null,
        image_url: initial.image_url ?? null,
        booking_ref: bookingRef.trim() || null,
        offer_id: initial.offer_id ?? null,
      }
      await onSubmit(data)
    } finally {
      setBusy(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div onKeyDown={handleKey} className="rounded-xl border border-[var(--trip-base)]/30 bg-white dark:bg-white/[0.04] p-5 space-y-4">
      <div className="space-y-2">
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">{initial.name}</h3>
        {initial.address && <p className="text-[12px] text-gray-500 dark:text-gray-400">{initial.address}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-x-4 gap-y-3">
        <div className="md:col-span-3">
          <FieldLabel>Check-in</FieldLabel>
          <DateInput value={checkIn} onChange={setCheckIn} invalid={errors.checkIn} />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Check-out</FieldLabel>
          <DateInput value={checkOut} onChange={setCheckOut} invalid={errors.checkOut} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Per night</FieldLabel>
          <Input type="number" value={pricePerNight} onChange={setPricePerNight} placeholder="0" min={0} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Total</FieldLabel>
          <Input type="number" value={totalPrice} onChange={setTotalPrice} placeholder="0" min={0} />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Currency</FieldLabel>
          <Select value={currency} onChange={setCurrency} options={CURRENCY_OPTIONS} />
        </div>
        <div className="md:col-span-6">
          <FieldLabel>Booking ref</FieldLabel>
          <Input value={bookingRef} onChange={setBookingRef} placeholder="Confirmation number (optional)" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onDelete}
          disabled={busy}
          className="text-[13px] font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
        >
          Delete hotel
        </button>
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={onCancel} disabled={busy}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSubmit} busy={busy}>Save</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
