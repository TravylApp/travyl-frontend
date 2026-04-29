'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Xmark } from 'iconoir-react'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import type { CalendarActivity } from './types'

// ─── Constants ──────────────────────────────────────────────

const MODAL_WIDTH = 440

const ACTIVITY_TYPE_OPTIONS = [
  'sightseeing', 'dining', 'tour', 'cultural', 'museum',
  'shopping', 'nightlife', 'outdoor', 'flight', 'transport', 'hotel',
] as const

/** Generate time options in 15-min increments */
function generateTimeOptions(): { label: string; value: number }[] {
  const options: { label: string; value: number }[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
      const ampm = h < 12 ? 'AM' : 'PM'
      const label = `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
      options.push({ label, value: h + m / 60 })
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

// ─── Types ──────────────────────────────────────────────────

interface ActivityEditModalProps {
  activity: CalendarActivity
  tripDays: { dayIndex: number; label: string }[]
  onSave: (id: string, patch: Partial<CalendarActivity>) => void
  onClose: () => void
}

interface FormState {
  title: string
  type: string
  day: number
  startHour: number
  endHour: number
  location: string
  price: string
  notes: string
  flightNumber: string
  airline: string
  checkIn: string
  checkOut: string
  bookingRef: string
}

// ─── Component ──────────────────────────────────────────────

export function ActivityEditModal({
  activity,
  tripDays,
  onSave,
  onClose,
}: ActivityEditModalProps) {
  const [form, setForm] = useState<FormState>(() => ({
    title: activity.title,
    type: activity.type,
    day: activity.day,
    startHour: activity.startHour,
    endHour: activity.startHour + activity.duration,
    location: activity.location ?? '',
    price: activity.price ?? '',
    notes: activity.notes ?? '',
    flightNumber: activity.flightNumber ?? '',
    airline: activity.airline ?? '',
    checkIn: activity.checkIn ?? '',
    checkOut: activity.checkOut ?? '',
    bookingRef: activity.bookingRef ?? '',
  }))

  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (form.endHour <= form.startHour) errs.endHour = 'End must be after start'
    if (form.endHour - form.startHour < 0.25) errs.endHour = 'Minimum 15 minutes'
    if (form.price && (isNaN(Number(form.price)) || Number(form.price) < 0)) {
      errs.price = 'Must be a non-negative number'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = () => {
    if (!validate()) return

    const patch: Partial<CalendarActivity> = {}

    if (form.title.trim() !== activity.title) patch.title = form.title.trim()
    if (form.type !== activity.type) patch.type = form.type
    if (form.day !== activity.day) patch.day = form.day
    if (form.startHour !== activity.startHour) patch.startHour = form.startHour
    const newDuration = form.endHour - form.startHour
    if (newDuration !== activity.duration) patch.duration = newDuration
    if (form.location !== (activity.location ?? '')) patch.location = form.location || undefined
    if (form.price !== (activity.price ?? '')) patch.price = form.price || undefined
    if (form.notes !== (activity.notes ?? '')) patch.notes = form.notes || undefined
    if (form.flightNumber !== (activity.flightNumber ?? '')) patch.flightNumber = form.flightNumber || undefined
    if (form.airline !== (activity.airline ?? '')) patch.airline = form.airline || undefined
    if (form.checkIn !== (activity.checkIn ?? '')) patch.checkIn = form.checkIn || undefined
    if (form.checkOut !== (activity.checkOut ?? '')) patch.checkOut = form.checkOut || undefined
    if (form.bookingRef !== (activity.bookingRef ?? '')) patch.bookingRef = form.bookingRef || undefined

    if (Object.keys(patch).length > 0) {
      onSave(activity.id, patch)
    }
    onClose()
  }

  const color = getActivityColor(form.type)
  const hasImage = !!activity.image
  const showFlightFields = form.type === 'flight' || form.type === 'transport'
  const showHotelFields = form.type === 'hotel'
  const showTravelSection = showFlightFields || showHotelFields

  const durationHours = Math.max(0, form.endHour - form.startHour)
  const durationLabel = durationHours < 1
    ? `${Math.round(durationHours * 60)}m`
    : durationHours % 1 === 0
      ? `${durationHours}h`
      : `${Math.floor(durationHours)}h ${Math.round((durationHours % 1) * 60)}m`

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="edit-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{ width: MODAL_WIDTH }}
          className="rounded-xl border border-cal-border bg-cal-surface-elevated shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Hero header */}
          <div
            className="relative flex flex-col justify-end shrink-0"
            style={{
              height: 140,
              ...(hasImage
                ? { backgroundImage: `url(${activity.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)` }),
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-7 h-7 rounded-md bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors z-10"
              aria-label="Close"
            >
              <Xmark width={16} height={16} strokeWidth={1.5} />
            </button>
            <div className="relative px-4 pb-3 pt-8 z-10">
              <input
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className="w-full bg-transparent border-none text-white text-xl font-serif outline-none placeholder-white/50"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                placeholder="Activity name..."
              />
              {errors.title && (
                <span className="text-red-300 text-xs">{errors.title}</span>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: `${color}60`, color: 'white' }}
                >
                  {form.type.charAt(0).toUpperCase() + form.type.slice(1)}
                </span>
                <span className="text-white/70 text-[11px]">{durationLabel}</span>
              </div>
            </div>
          </div>

          {/* Form body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            {/* Type */}
            <FieldRow label="Type">
              <select
                value={form.type}
                onChange={(e) => update('type', e.target.value)}
                className="flex-1 bg-cal-bg border border-cal-border rounded-md px-3 py-1.5 text-sm text-cal-text outline-none focus:border-cal-accent"
              >
                {ACTIVITY_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </FieldRow>

            {/* When */}
            <SectionLabel>When</SectionLabel>
            <FieldRow label="Date">
              <select
                value={form.day}
                onChange={(e) => update('day', Number(e.target.value))}
                className="flex-1 bg-cal-bg border border-cal-border rounded-md px-3 py-1.5 text-sm text-cal-text outline-none focus:border-cal-accent"
              >
                {tripDays.map((d) => (
                  <option key={d.dayIndex} value={d.dayIndex}>{d.label}</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Time">
              <div className="flex-1 flex items-center gap-2">
                <select
                  value={form.startHour}
                  onChange={(e) => update('startHour', Number(e.target.value))}
                  className="flex-1 bg-cal-bg border border-cal-border rounded-md px-3 py-1.5 text-sm text-cal-text outline-none focus:border-cal-accent"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <span className="text-cal-text-tertiary text-sm">–</span>
                <select
                  value={form.endHour}
                  onChange={(e) => update('endHour', Number(e.target.value))}
                  className={[
                    'flex-1 bg-cal-bg border rounded-md px-3 py-1.5 text-sm text-cal-text outline-none focus:border-cal-accent',
                    errors.endHour ? 'border-red-500' : 'border-cal-border',
                  ].join(' ')}
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </FieldRow>
            {errors.endHour && (
              <span className="text-red-500 text-xs -mt-2 ml-[82px]">{errors.endHour}</span>
            )}

            {/* Where */}
            <SectionLabel>Where</SectionLabel>
            <FieldRow label="Location">
              <input
                value={form.location}
                onChange={(e) => update('location', e.target.value)}
                className="flex-1 bg-cal-bg border border-cal-border rounded-md px-3 py-1.5 text-sm text-cal-text outline-none focus:border-cal-accent"
                placeholder="Address or place name"
              />
            </FieldRow>

            {/* Cost */}
            <SectionLabel>Cost</SectionLabel>
            <FieldRow label="Price">
              <input
                value={form.price}
                onChange={(e) => update('price', e.target.value)}
                className={[
                  'flex-1 bg-cal-bg border rounded-md px-3 py-1.5 text-sm text-cal-text outline-none focus:border-cal-accent',
                  errors.price ? 'border-red-500' : 'border-cal-border',
                ].join(' ')}
                placeholder="0.00"
              />
            </FieldRow>
            {errors.price && (
              <span className="text-red-500 text-xs -mt-2 ml-[82px]">{errors.price}</span>
            )}

            {/* Notes */}
            <SectionLabel>Notes</SectionLabel>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              className="bg-cal-bg border border-cal-border rounded-md px-3 py-2 text-sm text-cal-text outline-none focus:border-cal-accent resize-none"
              placeholder="Add notes..."
            />

            {/* Travel Details (conditional) */}
            {showTravelSection && (
              <>
                <SectionLabel>Travel Details</SectionLabel>
                {showFlightFields && (
                  <>
                    <FieldRow label="Flight #">
                      <input
                        value={form.flightNumber}
                        onChange={(e) => update('flightNumber', e.target.value)}
                        className="flex-1 bg-cal-bg border border-cal-border rounded-md px-3 py-1.5 text-sm text-cal-text outline-none focus:border-cal-accent"
                        placeholder="BA 123"
                      />
                    </FieldRow>
                    <FieldRow label="Airline">
                      <input
                        value={form.airline}
                        onChange={(e) => update('airline', e.target.value)}
                        className="flex-1 bg-cal-bg border border-cal-border rounded-md px-3 py-1.5 text-sm text-cal-text outline-none focus:border-cal-accent"
                        placeholder="British Airways"
                      />
                    </FieldRow>
                  </>
                )}
                {showHotelFields && (
                  <>
                    <FieldRow label="Check-in">
                      <input
                        value={form.checkIn}
                        onChange={(e) => update('checkIn', e.target.value)}
                        className="flex-1 bg-cal-bg border border-cal-border rounded-md px-3 py-1.5 text-sm text-cal-text outline-none focus:border-cal-accent"
                        placeholder="3:00 PM"
                      />
                    </FieldRow>
                    <FieldRow label="Check-out">
                      <input
                        value={form.checkOut}
                        onChange={(e) => update('checkOut', e.target.value)}
                        className="flex-1 bg-cal-bg border border-cal-border rounded-md px-3 py-1.5 text-sm text-cal-text outline-none focus:border-cal-accent"
                        placeholder="11:00 AM"
                      />
                    </FieldRow>
                  </>
                )}
                <FieldRow label="Booking Ref">
                  <input
                    value={form.bookingRef}
                    onChange={(e) => update('bookingRef', e.target.value)}
                    className="flex-1 bg-cal-bg border border-cal-border rounded-md px-3 py-1.5 text-sm text-cal-text outline-none focus:border-cal-accent"
                    placeholder="ABC123"
                  />
                </FieldRow>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-cal-border px-4 py-3 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-cal-border text-sm text-cal-text-secondary hover:bg-cal-border-light hover:text-cal-text transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-primary text-sm text-white hover:bg-primary transition-colors"
            >
              Save
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

// ─── Sub-components ─────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-cal-text-tertiary border-b border-cal-border-light pb-1">
      {children}
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-cal-text-secondary w-[70px] shrink-0">{label}</span>
      {children}
    </div>
  )
}
