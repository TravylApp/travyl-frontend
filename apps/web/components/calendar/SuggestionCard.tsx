'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useDraggable, useDndMonitor } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import type { SuggestionCard as SuggestionCardType } from './types'

interface SuggestionCardProps {
  suggestion: SuggestionCardType
  onVisible?: () => void
  onSelect?: (suggestion: SuggestionCardType) => void
}

function formatPrice(price: number | null, currency: string) {
  if (price === null || price === 0) return 'Free'
  return `${currency}${price}`
}

function formatDuration(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours % 1 === 0) return `${hours}h`
  return `${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`
}

function formatCategory(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
}

export function SuggestionCard({ suggestion, onVisible, onSelect }: SuggestionCardProps) {
  const draggableId = `suggestion-${suggestion.id}`
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: { type: 'suggestion' as const, suggestion },
  })

  useEffect(() => {
    onVisible?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Drag vs. click detection
  const didDragRef = useRef(false)
  useDndMonitor({
    onDragStart(event) {
      if (event.active.id === draggableId) didDragRef.current = true
    },
  })
  const extendedListeners = listeners
    ? {
        ...listeners,
        onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
          didDragRef.current = false
          listeners.onPointerDown?.(e)
        },
      }
    : {}

  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())

  const rawImages = suggestion.imageUrls?.length
    ? suggestion.imageUrls
    : suggestion.imageUrl
      ? [suggestion.imageUrl]
      : []
  const heroImage = rawImages.find((u) => !failedUrls.has(u)) ?? null

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  const tagColor = getActivityColor(suggestion.category)

  const handleClick = () => {
    if (didDragRef.current) {
      didDragRef.current = false
      return
    }
    onSelect?.(suggestion)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...extendedListeners}
      onClick={handleClick}
      className={[
        'group relative flex gap-3 p-2 rounded-xl border border-cal-border bg-cal-surface',
        'cursor-grab active:cursor-grabbing transition-all duration-150',
        isDragging
          ? ''
          : 'hover:border-cal-text-tertiary/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-px',
      ].join(' ')}
    >
      {/* Thumbnail */}
      <div
        className="relative shrink-0 w-[88px] h-[88px] rounded-lg overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${tagColor}28 0%, ${tagColor}55 100%)`,
        }}
      >
        {heroImage && (
          <Image
            src={heroImage}
            alt=""
            fill
            loading="lazy"
            className="object-cover"
            draggable={false}
            sizes="88px"
            onError={() => setFailedUrls((prev) => new Set(prev).add(heroImage))}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-cal-text leading-snug line-clamp-2">
            {suggestion.name}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-cal-text-tertiary">
            <span
              className="font-medium px-1.5 py-px rounded"
              style={{
                background: `${tagColor}1f`,
                color: tagColor,
              }}
            >
              {formatCategory(suggestion.category)}
            </span>
            {suggestion.rating != null && (
              <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                </svg>
                {suggestion.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-cal-text-secondary">
          <span className="font-semibold text-cal-text">
            {formatPrice(suggestion.price, suggestion.currency)}
          </span>
          <span className="text-cal-text-tertiary">{formatDuration(suggestion.duration)}</span>
        </div>
      </div>
    </div>
  )
}
