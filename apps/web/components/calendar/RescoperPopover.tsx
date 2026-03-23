'use client'

import { useState, useEffect, useRef } from 'react'
import type { Trip } from '@travyl/shared'
import type { CalendarActivity } from './types'
import { useRescope } from './hooks/useRescope'
import { RescoperConflictModal } from './RescoperConflictModal'

// userId is passed from CalendarDashboard (which already receives it as a prop).
// tripStartDate is derived from trip.start_date inside the component — no separate prop needed.
interface RescoperPopoverProps {
  trip: Trip
  userId: string
  scheduledActivities: CalendarActivity[]
  onClose: () => void
}

function toInputValue(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function fromInputValue(s: string): Date {
  return new Date(s + 'T00:00:00Z')
}

function addOneDayTo(d: Date): Date {
  const n = new Date(d)
  n.setUTCDate(n.getUTCDate() + 1)
  return n
}

function subtractOneDayFrom(d: Date): Date {
  const n = new Date(d)
  n.setUTCDate(n.getUTCDate() - 1)
  return n
}

export function RescoperPopover({
  trip,
  userId,
  scheduledActivities,
  onClose,
}: RescoperPopoverProps) {
  const tripStartDate = trip.start_date  // ISO string, e.g. "2026-06-12"
  const [destination, setDestination] = useState(trip.destination)
  const [startDate, setStartDate] = useState(() => new Date(trip.start_date + 'T00:00:00Z'))
  const [endDate, setEndDate]     = useState(() => new Date(trip.end_date + 'T00:00:00Z'))
  const [errorMsg, setErrorMsg]   = useState<string | null>(null)

  const popoverRef = useRef<HTMLDivElement>(null)

  const oldStartDate = new Date(trip.start_date + 'T00:00:00Z')
  const oldEndDate   = new Date(trip.end_date   + 'T00:00:00Z')

  const { status, conflicts, rescope, confirmRescope, cancelRescope } = useRescope(
    trip.id,
    tripStartDate,
    userId,
    scheduledActivities,
  )

  // Dismiss on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Show error toast when status === 'error'
  useEffect(() => {
    if (status === 'error') {
      setErrorMsg('Something went wrong. Please try again.')
    } else {
      setErrorMsg(null)
    }
  }, [status])

  // Close popover when a direct (no-conflict) write completes:
  // detect the 'loading' → 'idle' transition using a ref to hold the previous status.
  // (Conflict-resolution path also triggers this transition, but onClose is harmlessly
  // called twice there — the second call is a no-op since the popover is already closing.)
  const prevStatusRef = useRef<typeof status>(status)
  useEffect(() => {
    if (prevStatusRef.current === 'loading' && status === 'idle') {
      onClose()
    }
    prevStatusRef.current = status
  }, [status, onClose])

  const nights = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const isInvalid = nights <= 0
  const isLoading = status === 'loading'

  function handleApply() {
    rescope({ destination, startDate, endDate }, oldStartDate, oldEndDate)
  }

  return (
    <>
      <div
        ref={popoverRef}
        className="absolute top-full mt-1 left-0 z-40 bg-white dark:bg-[#0f1a28] border border-gray-200 dark:border-[#1e3a5f]/40 rounded-xl shadow-xl w-80 p-4"
      >
        {errorMsg && (
          <div className="mb-3 text-[12px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">
            {errorMsg}
          </div>
        )}

        {/* Destination */}
        <div className="mb-3">
          <label className="block text-[11px] uppercase tracking-wide text-gray-400 dark:text-[#4a7ab5] mb-1">
            Destination
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-[#1e3a5f]/40 bg-transparent px-3 py-1.5 text-[13px] text-gray-800 dark:text-[#f5efe8] focus:outline-none focus:ring-1 focus:ring-[#003594]"
          />
        </div>

        {/* Start date */}
        <div className="mb-2">
          <label className="block text-[11px] uppercase tracking-wide text-gray-400 dark:text-[#4a7ab5] mb-1">
            Start
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStartDate(subtractOneDayFrom(startDate))}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-[#1e3a5f]/40 text-gray-500 dark:text-[#4a7ab5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 text-[15px] font-light transition-colors"
              aria-label="Remove start day"
            >
              −
            </button>
            <input
              type="date"
              value={toInputValue(startDate)}
              onChange={(e) => e.target.value && setStartDate(fromInputValue(e.target.value))}
              className="flex-1 rounded-lg border border-gray-200 dark:border-[#1e3a5f]/40 bg-transparent px-2 py-1.5 text-[13px] text-gray-800 dark:text-[#f5efe8] focus:outline-none focus:ring-1 focus:ring-[#003594]"
            />
          </div>
        </div>

        {/* End date */}
        <div className="mb-3">
          <label className="block text-[11px] uppercase tracking-wide text-gray-400 dark:text-[#4a7ab5] mb-1">
            End
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={toInputValue(endDate)}
              onChange={(e) => e.target.value && setEndDate(fromInputValue(e.target.value))}
              className="flex-1 rounded-lg border border-gray-200 dark:border-[#1e3a5f]/40 bg-transparent px-2 py-1.5 text-[13px] text-gray-800 dark:text-[#f5efe8] focus:outline-none focus:ring-1 focus:ring-[#003594]"
            />
            <button
              onClick={() => setEndDate(addOneDayTo(endDate))}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 dark:border-[#1e3a5f]/40 text-gray-500 dark:text-[#4a7ab5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 text-[15px] font-light transition-colors"
              aria-label="Add end day"
            >
              +
            </button>
          </div>
        </div>

        {/* Night count */}
        <p className="text-[12px] text-gray-400 dark:text-[#4a7ab5] mb-4">
          {isInvalid ? (
            <span className="text-red-500">End must be after start</span>
          ) : (
            `${nights} ${nights === 1 ? 'night' : 'nights'}`
          )}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-[13px] text-gray-500 dark:text-[#4a7ab5] hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isInvalid || isLoading}
            className="px-4 py-1.5 rounded-lg bg-[#003594] text-white text-[13px] font-medium hover:bg-[#002a7a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Saving…' : 'Apply'}
          </button>
        </div>
      </div>

      {/* Conflict modal rendered outside popover so it overlays everything */}
      {status === 'pending-conflict' && (
        <RescoperConflictModal
          conflictingActivities={conflicts}
          onMoveToLastDay={() => confirmRescope('moveToLastDay').then(onClose)}
          onKeepUnscheduled={() => confirmRescope('unscheduled').then(onClose)}
          onCancel={cancelRescope}
        />
      )}
    </>
  )
}
