'use client'

import { useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import type { SuggestionCard as SuggestionCardType } from './types'
import { formatDuration } from './utils'

interface SuggestionCardProps {
  suggestion: SuggestionCardType
  onVisible?: () => void
  onClick?: (suggestion: SuggestionCardType, anchorEl: HTMLElement) => void
  onSave?: (suggestion: SuggestionCardType) => void
  onSchedule?: (suggestion: SuggestionCardType) => void
}

export function SuggestionCard({ suggestion, onVisible, onClick, onSave, onSchedule }: SuggestionCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `suggestion-${suggestion.id}`,
      data: { type: 'suggestion' as const, suggestion },
      activationConstraint: { distance: 5 },
    })

  useEffect(() => {
    onVisible?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(suggestion, e.currentTarget)
  }

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  const tagColor = getActivityColor(suggestion.category)

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return 'Free'
    return `\u20AC${price}`
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={handleClick}
      className={[
        'group rounded-[10px] overflow-hidden cursor-pointer',
        'relative transition-all duration-200 bg-[var(--cal-surface-elevated)]',
        isDragging ? '' : 'hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(0,0,0,0.4)]',
      ].join(' ')}
    >
      {/* Image area */}
      <div className="relative">
        {suggestion.imageUrl ? (
          <img
            src={suggestion.imageUrl}
            alt=""
            className="w-full block object-cover"
            style={{ height: [130, 150, 170, 140, 160, 120, 145, 155, 135, 165][suggestion.id.charCodeAt(suggestion.id.length - 1) % 10] }}
            draggable={false}
          />
        ) : (
          <div
            className="w-full flex items-center justify-center text-2xl"
            style={{
              height: [130, 150, 170, 140, 160, 120, 145, 155, 135, 165][suggestion.id.charCodeAt(suggestion.id.length - 1) % 10],
              backgroundColor: tagColor + '33',
            }}
          >
            {suggestion.category.charAt(0).toUpperCase()}
          </div>
        )}

        {/* "Why" banner — top of image */}
        {suggestion.reason && (
          <div
            className="absolute top-0 left-0 right-0 px-[10px] pt-[8px] pb-6"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)',
            }}
          >
            <div className="text-[9px] font-medium text-white/80 uppercase tracking-[0.5px] [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
              {suggestion.reason}
            </div>
          </div>
        )}

        {/* Bottom gradient with metadata — name, category, rating, duration, price */}
        <div
          className="absolute bottom-0 left-0 right-0 px-[10px] pb-[9px] pt-10"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)',
          }}
        >
          <div className="text-[12px] font-bold text-white leading-[1.3] [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
            {suggestion.name}
          </div>
          <div className="flex items-center gap-1 mt-[3px] text-[10px] text-white/75 [text-shadow:0_1px_2px_rgba(0,0,0,0.3)] flex-wrap">
            <span
              className="inline-flex text-[9px] font-semibold px-[5px] py-[1px] rounded-[3px] backdrop-blur-[4px]"
              style={{ background: `${tagColor}40`, color: `${tagColor}cc` }}
            >
              {suggestion.category.charAt(0).toUpperCase() + suggestion.category.slice(1)}
            </span>
            <span className="opacity-50">&middot;</span>
            <span>{formatDuration(suggestion.duration)}</span>
            {suggestion.rating != null && (
              <>
                <span className="opacity-50">&middot;</span>
                <span className="text-amber-400 font-semibold">{suggestion.rating}</span>
              </>
            )}
            <span className="opacity-50">&middot;</span>
            <span>{formatPrice(suggestion.price)}</span>
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Drag handle */}
        <div
          {...listeners}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-[10px] rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-white text-[11px] font-medium flex items-center gap-[5px]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
          Drag to schedule
        </div>
      </div>

      {/* Action strip */}
      <div className="flex border-t border-[var(--cal-border-light)]">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSave?.(suggestion)
          }}
          className="flex-1 py-[7px] text-[11px] text-[var(--cal-text-tertiary)] hover:text-[var(--cal-text)] hover:bg-[var(--cal-border-light)] transition-colors border-r border-[var(--cal-border-light)]"
        >
          Save
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSchedule?.(suggestion)
          }}
          className="flex-1 py-[7px] text-[11px] font-semibold text-[var(--cal-accent)] hover:bg-[var(--cal-border-light)] transition-colors"
        >
          + Schedule
        </button>
      </div>
    </div>
  )
}
