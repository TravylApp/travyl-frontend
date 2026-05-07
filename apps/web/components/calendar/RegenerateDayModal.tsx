'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import type { SuggestionCard } from './types'
import type { DaySlotAlternatives } from './hooks/useRegenerateDay'

interface RegenerateDayModalProps {
  slots: DaySlotAlternatives[]
  onApply: (selections: Map<string, SuggestionCard>) => void
  onClose: () => void
  isLoading: boolean
}

function SlotCard({
  slot,
  selected,
  onSelect,
}: {
  slot: DaySlotAlternatives
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
      {/* Slot header */}
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <div className="text-sm font-medium text-gray-900">
          {slot.startHour.toString().padStart(2, '0')}:00 —{' '}
          {(slot.startHour + slot.duration).toString().padStart(2, '0')}:00
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          Replace <span className="font-medium text-gray-700">{slot.originalType}</span> activity
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
                <div className="relative h-[80px] bg-gray-100">
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
  slots,
  onApply,
  onClose,
  isLoading,
}: RegenerateDayModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const [selections, setSelections] = useState<Map<string, SuggestionCard>>(new Map())

  // Reset selections when slots change
  useEffect(() => {
    setSelections(new Map())
  }, [slots])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSelect = (activityId: string, alternative: SuggestionCard) => {
    setSelections((prev) => {
      const next = new Map(prev)
      // Toggle: deselect if already selected
      if (next.get(activityId)?.id === alternative.id) {
        next.delete(activityId)
      } else {
        next.set(activityId, alternative)
      }
      return next
    })
  }

  const hasSelections = selections.size > 0

  if (isLoading) {
    return createPortal(
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-8">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#003594] border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-sm text-gray-600">Finding alternatives for this day...</span>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-4 p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Regenerate Day</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Choose alternatives for each slot ({selections.size} selected)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Slots */}
        <div className="space-y-4">
          {slots.map((slot) => (
            <SlotCard
              key={slot.activityId}
              slot={slot}
              selected={selections.get(slot.activityId) ?? null}
              onSelect={(alt) => handleSelect(slot.activityId, alt)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
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
            Apply {hasSelections ? `(${selections.size})` : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
