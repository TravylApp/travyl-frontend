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

export function SuggestionCard({ suggestion, onVisible, onSelect }: SuggestionCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `suggestion-${suggestion.id}`,
      data: { type: 'suggestion' as const, suggestion },
    })

  useEffect(() => {
    onVisible?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Drag vs. click detection: reset on pointer down, set when dnd-kit activates drag
  const didDragRef = useRef(false)
  const draggableId = `suggestion-${suggestion.id}`
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

  const [activeIdx, setActiveIdx] = useState(0)
  const [cycleKey, setCycleKey] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())

  const rawImages = suggestion.imageUrls?.length ? suggestion.imageUrls : suggestion.imageUrl ? [suggestion.imageUrl] : []
  const images = rawImages.filter(u => !failedUrls.has(u))
  const hasMultiple = images.length > 1

  useEffect(() => {
    if (!hasMultiple || !isHovered) return
    const id = setInterval(() => {
      setActiveIdx(i => (i + 1) % images.length)
    }, 1800)
    return () => clearInterval(id)
  }, [isHovered, hasMultiple, images.length, cycleKey])

  useEffect(() => {
    if (!isHovered) setActiveIdx(0)
  }, [isHovered])

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  const tagColor = getActivityColor(suggestion.category)

  const formatPrice = (price: number | null, currency: string) => {
    if (price === null || price === 0) return 'Free'
    return `${currency}${price}`
  }

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`
    if (hours % 1 === 0) return `${hours}h`
    return `${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`
  }

  const navigate = (dir: 1 | -1, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveIdx(i => Math.max(0, Math.min(images.length - 1, i + dir)))
    setCycleKey(k => k + 1)
  }

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      className={[
        'group break-inside-avoid mb-2 rounded-[10px] overflow-hidden cursor-grab active:cursor-grabbing',
        'relative transition-all duration-200',
        isDragging ? '' : 'hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(0,0,0,0.4)]',
      ].join(' ')}
    >
      {/* Image carousel */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: [130, 150, 170, 140, 160, 120, 145, 155, 135, 165][suggestion.id.charCodeAt(suggestion.id.length - 1) % 10] }}
      >
        {/* Always show gradient behind images as fallback for broken loads */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${tagColor}28 0%, ${tagColor}55 100%)` }}
        />
        {images.length === 0 ? null : (
          images.map((url, idx) => (
            <Image
              key={url}
              src={url}
              alt=""
              fill
              loading="lazy"
              className="object-cover transition-opacity duration-700"
              style={{ opacity: idx === activeIdx ? 1 : 0 }}
              draggable={false}
              sizes="(max-width: 640px) 100vw, 300px"
              onError={() => {
                setFailedUrls(prev => new Set(prev).add(url))
                if (idx === activeIdx) setActiveIdx(i => Math.max(0, i - 1))
              }}
            />
          ))
        )}
        {hasMultiple && (
          <div className="absolute bottom-[7px] left-1/2 -translate-x-1/2 flex gap-[3px] z-10">
            {images.map((_, idx) => (
              <div
                key={idx}
                className="h-[3px] rounded-full transition-all duration-300"
                style={{
                  width: idx === activeIdx ? 14 : 4,
                  background: idx === activeIdx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </div>
        )}

        {/* Arrow navigation — visible on hover when multiple images exist */}
        {isHovered && hasMultiple && activeIdx > 0 && (
          <button
            aria-label="Previous photo"
            onClick={(e) => navigate(-1, e)}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white text-[10px] hover:bg-black/70 transition-colors"
          >
            ‹
          </button>
        )}
        {isHovered && hasMultiple && activeIdx < images.length - 1 && (
          <button
            aria-label="Next photo"
            onClick={(e) => navigate(1, e)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white text-[10px] hover:bg-black/70 transition-colors"
          >
            ›
          </button>
        )}
      </div>

      {/* Price badge — top left */}
      <div className="absolute top-[7px] left-[7px] bg-black/55 backdrop-blur-[8px] rounded-md px-[7px] py-[2px] text-[11px] font-semibold text-white">
        {formatPrice(suggestion.price, suggestion.currency)}
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

    </div>
  )
}
