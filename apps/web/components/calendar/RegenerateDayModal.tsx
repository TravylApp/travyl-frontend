'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import { formatHour12 } from './utils'
import type { SuggestionCard } from './types'
import type { CalendarActivity } from '@travyl/shared/types'
import type { DaySlotAlternatives } from './hooks/useRegenerateDay'

interface RegenerateDayPanelProps {
  dayIndex: number
  dayLabel: string
  slots: DaySlotAlternatives[]
  originalActivities: CalendarActivity[]
  onApply: (selections: Map<string, SuggestionCard>) => void
  onClose: () => void
  isLoading: boolean
}

function SlotCard({
  slot,
  originalActivity,
  selected,
  onSelect,
}: {
  slot: DaySlotAlternatives
  originalActivity: CalendarActivity | undefined
  selected: SuggestionCard | null
  onSelect: (alternative: SuggestionCard) => void
}) {
  const formatPrice = (price: number | null, currency: string) => {
    if (price === null || price === 0) return 'Free'
    const currencyMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' }
    const sym = currencyMap[currency] ?? `${currency} `
    return `${sym}${price}`
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Slot header — shows original activity + time */}
      <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {formatHour12(slot.startHour)} — {formatHour12(slot.startHour + slot.duration)}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Replace{' '}
              {originalActivity ? (
                <span className="font-medium text-gray-700">&ldquo;{originalActivity.title}&rdquo;</span>
              ) : (
                <span className="font-medium text-gray-700">{slot.originalType}</span>
              )}
            </div>
          </div>
          {originalActivity?.image && (
            <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
              <Image
                src={originalActivity.image}
                alt={originalActivity.title}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
          )}
        </div>
      </div>

      {/* Alternatives grid */}
      {slot.alternatives.length === 0 ? (
        <div className="p-4 text-center text-sm text-gray-400">
          No alternatives found
        </div>
      ) : (
        <div className="p-3 grid grid-cols-2 gap-2">
          {slot.alternatives.map((alt) => {
            const isSelected = selected?.id === alt.id
            const tagColor = getActivityColor(alt.category)
            const imageUrl = alt.imageUrl || alt.imageUrls?.[0] || ''

            return (
              <button
                key={alt.id}
                type="button"
                onClick={() => onSelect(alt)}
                className={[
                  'rounded-lg overflow-hidden border-2 transition-all text-left',
                  isSelected
                    ? 'border-[#003594] shadow-md'
                    : 'border-gray-100 hover:border-gray-300',
                ].join(' ')}
              >
                {/* Image */}
                <div className="relative h-[72px] bg-gray-100">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={alt.name}
                      fill
                      className="object-cover"
                      sizes="150px"
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{ background: `linear-gradient(135deg, ${tagColor}28 0%, ${tagColor}55 100%)` }}
                    />
                  )}
                  {alt.rating != null && (
                    <div className="absolute top-1 right-1 bg-black/55 backdrop-blur-sm rounded px-1.5 py-0.5 text-[9px] font-semibold text-amber-400">
                      ★ {alt.rating}
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-1 left-1 bg-[#003594] rounded-full w-5 h-5 flex items-center justify-center">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2">
                  <div className="text-[11px] font-semibold text-gray-900 leading-tight line-clamp-2">
                    {alt.name}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded"
                      style={{ background: `${tagColor}15`, color: tagColor }}
                    >
                      {alt.category.slice(0, 8)}
                    </span>
                    <span className="text-[9px] text-gray-400">
                      {formatPrice(alt.price, alt.currency)}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function RegenerateDayModal({
  dayIndex,
  dayLabel,
  slots,
  originalActivities,
  onApply,
  onClose,
  isLoading,
}: RegenerateDayPanelProps) {
  const [selections, setSelections] = useState<Map<string, SuggestionCard>>(new Map())

  // Reset selections when slots change
  useEffect(() => {
    setSelections(new Map())
  }, [slots])

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const handleSelect = (activityId: string, alternative: SuggestionCard) => {
    setSelections((prev) => {
      const next = new Map(prev)
      if (next.get(activityId)?.id === alternative.id) {
        next.delete(activityId)
      } else {
        next.set(activityId, alternative)
      }
      return next
    })
  }

  const hasSelections = selections.size > 0
  const totalSlots = slots.length
  const selectedCount = selections.size

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-6 h-6 border-2 border-[#003594] border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 mt-3 text-sm text-gray-500">Finding alternatives for this day...</span>
      </div>
    )
  }

  return (
    <>
      {/* Backdrop for closing on click outside */}
      <div
        className="absolute inset-0 z-10 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Slide-in panel from the right */}
      <div
        className="absolute inset-y-0 right-0 z-20 w-full max-w-[400px] bg-white border-l border-gray-200 shadow-2xl flex flex-col animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Regenerate Day</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {dayLabel || `Day ${dayIndex + 1}`} &middot; {selectedCount} of {totalSlots} slots selected
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0 ml-3"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Slots list — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {slots.map((slot) => (
            <SlotCard
              key={slot.activityId}
              slot={slot}
              originalActivity={originalActivities.find((a) => a.id === slot.activityId)}
              selected={selections.get(slot.activityId) ?? null}
              onSelect={(alt) => handleSelect(slot.activityId, alt)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!hasSelections}
            onClick={() => onApply(selections)}
            className={[
              'px-5 py-2 text-sm font-semibold rounded-lg transition-colors',
              hasSelections
                ? 'bg-[#003594] text-white hover:bg-[#002a75]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed',
            ].join(' ')}
          >
            Apply {hasSelections ? `(${selectedCount})` : ''}
          </button>
        </div>
      </div>
    </>
  )
}
