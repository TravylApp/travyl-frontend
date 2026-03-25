'use client'

import { useEffect, useRef } from 'react'
import { Trash } from 'iconoir-react'
import type { CalendarActivity } from './types'

interface UnscheduledPopoverProps {
  activities: CalendarActivity[]
  tripStartDate: Date
  tripEndDate: Date
  onAssign: (id: string, dayOffset: number) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export function UnscheduledPopover({
  activities,
  tripStartDate,
  tripEndDate,
  onAssign,
  onDelete,
  onClose,
}: UnscheduledPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const minDate = tripStartDate.toISOString().slice(0, 10)
  const maxDate = tripEndDate.toISOString().slice(0, 10)

  function handleDateChange(id: string, value: string) {
    if (!value) return
    const selected = new Date(value + 'T00:00:00Z')
    const offset = Math.round(
      (selected.getTime() - tripStartDate.getTime()) / (1000 * 60 * 60 * 24),
    )
    onAssign(id, offset)
  }

  return (
    <div
      ref={ref}
      className="absolute top-full mt-1 z-40 bg-white dark:bg-[#0f1a28] border border-gray-200 dark:border-[#1e3a5f]/40 rounded-xl shadow-xl w-72 p-3"
    >
      <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-[#4a7ab5] mb-2">
        Unscheduled activities
      </p>
      <ul className="space-y-2 max-h-60 overflow-y-auto">
        {activities.map((a) => (
          <li
            key={a.id}
            className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-[#1e3a5f]/10 px-2 py-1.5"
          >
            <span className="flex-1 text-[12px] text-gray-700 dark:text-[#cdd9e5] truncate min-w-0">
              {a.title || 'Untitled'}
            </span>
            <input
              type="date"
              min={minDate}
              max={maxDate}
              onChange={(e) => handleDateChange(a.id, e.target.value)}
              title="Assign to day"
              className="w-32 text-[11px] rounded border border-gray-200 dark:border-[#1e3a5f]/40 bg-transparent px-1.5 py-0.5 text-gray-600 dark:text-[#cdd9e5] focus:outline-none focus:ring-1 focus:ring-[#003594]"
            />
            <button
              onClick={() => onDelete(a.id)}
              aria-label="Delete activity"
              className="text-gray-400 dark:text-[#4a7ab5] hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
            >
              <Trash width={14} height={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
