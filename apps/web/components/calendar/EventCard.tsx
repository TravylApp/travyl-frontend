'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useDraggable, useDndMonitor } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { upscaleGoogleImage } from '@travyl/shared'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import type { SuggestionCard as SuggestionCardType } from './types'
import type { LocalEvent } from './types'

const CATEGORY_LABELS: Record<LocalEvent['category'], string> = {
  music:    'Music',
  sports:   'Sports',
  arts:     'Arts',
  family:   'Family',
  festival: 'Festival',
  other:    'Other',
}

function formatEventDate(date: string, startTime: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = startTime.split(':').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day, hour, minute))
  if (Number.isNaN(d.getTime())) return ''
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
  const monthLabel = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  const dayLabel = d.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
  return `${weekday} ${monthLabel} ${dayLabel} · ${time}`
}

/** Synthesize a SuggestionCard from a LocalEvent so the existing 'suggestion'
 * drop handler in useCalendarDnd can convert it into a calendar activity. */
export function eventToSuggestion(event: LocalEvent): SuggestionCardType {
  return {
    id: `event-${event.id}`,
    name: event.name,
    category: event.category as SuggestionCardType['category'],
    imageUrl: event.imageUrl ?? '',
    duration: 2,
    price: event.priceMin ?? null,
    currency: event.currency ?? '$',
    rating: null,
    location: [event.venueName, event.venueAddress].filter(Boolean).join(', '),
    latitude: 0,
    longitude: 0,
    description: '',
    source: 'search',
    relevanceScore: 0,
  }
}

interface EventCardProps {
  event: LocalEvent
  onSelect: (event: LocalEvent) => void
}

export function EventCard({ event, onSelect }: EventCardProps) {
  const draggableId = `event-${event.id}`
  const synthSuggestion = useMemo(() => eventToSuggestion(event), [event])

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: { type: 'suggestion' as const, suggestion: synthSuggestion },
  })

  // Drag-vs-click detection: a click after a drag shouldn't open the drawer.
  const didDragRef = useRef(false)
  useDndMonitor({
    onDragStart(e) { if (e.active.id === draggableId) didDragRef.current = true },
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

  const handleClick = () => {
    if (didDragRef.current) {
      didDragRef.current = false
      return
    }
    onSelect(event)
  }

  // Reset the drag flag if the component remounts mid-drag
  useEffect(() => () => { didDragRef.current = false }, [])

  const tagColor = getActivityColor(event.category)
  const dateLabel = formatEventDate(event.date, event.startTime)
  const heroImage = event.imageUrl ? (upscaleGoogleImage(event.imageUrl) || event.imageUrl) : null
  const [imgFailed, setImgFailed] = useState(false)
  const showImage = !!heroImage && !imgFailed

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...extendedListeners}
      onClick={handleClick}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }}
      className={[
        'group relative flex gap-3 p-2 rounded-xl border border-cal-border bg-cal-surface',
        'cursor-grab active:cursor-grabbing transition-all duration-150',
        isDragging
          ? ''
          : 'hover:border-cal-text-tertiary/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-px',
      ].join(' ')}
      title="Click for details · drag onto a day to schedule"
    >
      {/* Thumbnail — same 88×88 treatment as SuggestionCard */}
      <div
        className="relative shrink-0 w-[88px] h-[88px] rounded-lg overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${tagColor}28 0%, ${tagColor}55 100%)`,
        }}
      >
        {showImage && (
          <Image
            src={heroImage!}
            alt=""
            fill
            loading="lazy"
            className="object-cover"
            draggable={false}
            sizes="88px"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-cal-text leading-snug line-clamp-2">
            {event.name}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-cal-text-tertiary">
            <span
              className="font-medium px-1.5 py-px rounded"
              style={{ background: `${tagColor}1f`, color: tagColor }}
            >
              {CATEGORY_LABELS[event.category]}
            </span>
            {event.venueName && (
              <span className="truncate">{event.venueName}</span>
            )}
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-cal-text-secondary">
          <span className="font-medium text-cal-text truncate">
            {dateLabel || 'Date TBD'}
          </span>
        </div>
      </div>
    </div>
  )
}
