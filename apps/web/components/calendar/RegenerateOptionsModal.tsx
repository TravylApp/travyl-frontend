'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import type { SuggestionCard } from './types'

interface RegenerateOptionsModalProps {
  alternatives: SuggestionCard[]
  onSelect: (alternative: SuggestionCard) => void
  onClose: () => void
  isLoading: boolean
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-[10px] overflow-hidden bg-gray-100 animate-pulse"
          style={{ height: 180 }}
        >
          <div className="h-[120px] bg-gray-200" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-2 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function AlternativeCard({
  alternative,
  onSelect,
}: {
  alternative: SuggestionCard
  onSelect: () => void
}) {
  const tagColor = getActivityColor(alternative.category)

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return 'Free'
    const currencyMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' }
    const sym = currencyMap[alternative.currency] ?? `${alternative.currency} `
    return `${sym}${price}`
  }

  const imageUrl = alternative.imageUrl || alternative.imageUrls?.[0] || ''

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group rounded-[10px] overflow-hidden bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#003594]/40"
    >
      {/* Image area */}
      <div className="relative h-[120px] bg-gray-100 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={alternative.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, 200px"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${tagColor}28 0%, ${tagColor}55 100%)` }}
          />
        )}

        {/* Price badge */}
        <div className="absolute top-[7px] left-[7px] bg-black/55 backdrop-blur-[8px] rounded-md px-[7px] py-[2px] text-[11px] font-semibold text-white">
          {formatPrice(alternative.price)}
        </div>

        {/* Rating badge */}
        {alternative.rating != null && (
          <div className="absolute top-[7px] right-[7px] bg-black/55 backdrop-blur-[8px] rounded-md px-[7px] py-[2px] text-[10px] font-semibold text-amber-400 flex items-center gap-[3px]">
            ★ {alternative.rating}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="text-[13px] font-semibold text-gray-900 leading-tight line-clamp-2">
          {alternative.name}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span
            className="inline-flex text-[10px] font-semibold px-[5px] py-[1px] rounded-[3px]"
            style={{
              background: `${tagColor}20`,
              color: tagColor,
            }}
          >
            {alternative.category.charAt(0).toUpperCase() + alternative.category.slice(1)}
          </span>
          <span className="text-[10px] text-gray-400">
            {alternative.duration}h
          </span>
        </div>
      </div>
    </button>
  )
}

export function RegenerateOptionsModal({
  alternatives,
  onSelect,
  onClose,
  isLoading,
}: RegenerateOptionsModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

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

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto mx-4 p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {isLoading ? 'Finding alternatives...' : 'Choose an alternative'}
          </h3>
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

        {/* Content */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : alternatives.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No alternatives found. Try a different category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {alternatives.map((alt) => (
              <AlternativeCard
                key={alt.id}
                alternative={alt}
                onSelect={() => onSelect(alt)}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
