'use client'

import { useDraggable } from '@dnd-kit/core'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import type { SuggestionCard as SuggestionCardType } from './types'

interface SuggestionCardProps {
  suggestion: SuggestionCardType
  /** When true, renders as a drag overlay preview (no drag listeners, styled as ghost) */
  isOverlay?: boolean
}

export function formatPrice(price: number | null) {
  if (price === null || price === 0) return 'Free'
  return `€${price}`
}

export function formatDuration(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours % 1 === 0) return `${hours}h`
  return `${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`
}

function cardHeight(id: string) {
  return [130, 150, 170, 140, 160, 120, 145, 155, 135, 165][id.charCodeAt(id.length - 1) % 10]
}

export function SuggestionCard({ suggestion, isOverlay = false }: SuggestionCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({
      id: `suggestion-${suggestion.id}`,
      data: { type: 'suggestion' as const, suggestion },
      disabled: isOverlay,
    })

  const tagColor = getActivityColor(suggestion.category)

  // When used as overlay: no transform on original, just opacity change
  // The DragOverlay in CalendarDashboard renders this component as the ghost
  const style: React.CSSProperties = isOverlay
    ? { width: 150, opacity: 0.85 }
    : { opacity: isDragging ? 0.3 : 1 }

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
      className={[
        'break-inside-avoid mb-2 rounded-[10px] overflow-hidden',
        'relative',
        isOverlay
          ? 'shadow-2xl ring-2 ring-white/30 cursor-grabbing scale-95'
          : [
              'group cursor-grab active:cursor-grabbing',
              isDragging ? '' : 'transition-[opacity,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(0,0,0,0.4)]',
            ].join(' '),
      ].join(' ')}
    >
      {/* Image */}
      <img
        src={suggestion.imageUrl}
        alt=""
        className="w-full block object-cover"
        style={{ height: isOverlay ? 100 : cardHeight(suggestion.id) }}
        draggable={false}
      />

      {/* Price badge — top left */}
      <div className="absolute top-[7px] left-[7px] bg-black/55 backdrop-blur-[8px] rounded-md px-[7px] py-[2px] text-[11px] font-semibold text-white">
        {formatPrice(suggestion.price)}
      </div>

      {/* Rating badge — top right */}
      {suggestion.rating != null && (
        <div className="absolute top-[7px] right-[7px] bg-black/55 backdrop-blur-[8px] rounded-md px-[7px] py-[2px] text-[10px] font-semibold text-amber-400 flex items-center gap-[3px]">
          ★ {suggestion.rating}
        </div>
      )}

      {/* Bottom gradient with metadata */}
      <div
        className="absolute bottom-0 left-0 right-0 px-[10px] pb-[9px] pt-8"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)',
        }}
      >
        <div className="text-[12px] font-bold text-white leading-[1.3] [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
          {suggestion.name}
        </div>
        <div className="flex items-center gap-1 mt-[3px] text-[10px] text-white/75 [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">
          <span
            className="inline-flex text-[9px] font-semibold px-[5px] py-[1px] rounded-[3px] backdrop-blur-[4px]"
            style={{
              background: `${tagColor}40`,
              color: `${tagColor}cc`,
            }}
          >
            {suggestion.category.charAt(0).toUpperCase() + suggestion.category.slice(1)}
          </span>
          <span className="opacity-50">·</span>
          <span>{formatDuration(suggestion.duration)}</span>
        </div>
      </div>

      {/* Hover overlay + drag badge (only on source card, not overlay) */}
      {!isOverlay && (
        <>
          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-[10px] rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-white text-[11px] font-medium flex items-center gap-[5px]">
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
        </>
      )}
    </div>
  )
}
