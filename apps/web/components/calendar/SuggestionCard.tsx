'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import Image from 'next/image'
import { useDraggable, useDndMonitor } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import type { SuggestionCard as SuggestionCardType } from './types'

/** Derive a consistent card height from suggestion metadata to avoid layout shifts. */
function getCardHeight(suggestion: SuggestionCardType): number {
  const baseHeights: Record<string, number> = {
    sightseeing: 160,
    dining: 130,
    tours: 150,
    culture: 155,
    shopping: 120,
    nightlife: 140,
    outdoor: 165,
    attractions: 150,
    entertainment: 145,
    wellness: 135,
  }
  const base = baseHeights[suggestion.category.toLowerCase()] ?? 145
  const offset = (suggestion.name.length % 5) * 6
  return base + offset
}

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

  const [isHovered, setIsHovered] = useState(false)
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())
  const cardHeight = useMemo(() => getCardHeight(suggestion), [suggestion])

  const rawImages = suggestion.imageUrls?.length ? suggestion.imageUrls : suggestion.imageUrl ? [suggestion.imageUrl] : []
  const images = rawImages.filter(u => !failedUrls.has(u))

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
        'group masonry-item mb-2 rounded-[10px] overflow-hidden cursor-grab active:cursor-grabbing',
        'relative transition-all duration-200',
        isDragging ? '' : 'hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(0,0,0,0.4)]',
      ].join(' ')}
    >
      {/* Image section — collage layout when multiple images, full width when single */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: cardHeight }}
      >
        {/* Always show gradient behind images as fallback for broken loads */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${tagColor}28 0%, ${tagColor}55 100%)` }}
        />

        {images.length === 0 ? null : images.length === 1 ? (
          <Image
            src={images[0]}
            alt=""
            fill
            loading="lazy"
            className="object-cover"
            draggable={false}
            sizes="(max-width: 640px) 100vw, 300px"
            onError={() => setFailedUrls(prev => new Set(prev).add(images[0]))}
          />
        ) : (
          <div className="flex w-full h-full">
            {/* 2 images: 50/50 split — 3+ images: first image takes left half */}
            <div className="relative w-[calc(50%-1px)] h-full overflow-hidden">
              <Image
                src={images[0]}
                alt=""
                fill
                loading="lazy"
                className="object-cover"
                draggable={false}
                sizes="150px"
                onError={() => setFailedUrls(prev => new Set(prev).add(images[0]))}
              />
            </div>

            {/* Divider between columns */}
            <div className="w-[2px] h-full bg-black/20 relative z-10 shrink-0" />

            {images.length === 2 ? (
              <div className="relative w-[calc(50%-1px)] h-full overflow-hidden">
                <Image
                  src={images[1]}
                  alt=""
                  fill
                  loading="lazy"
                  className="object-cover"
                  draggable={false}
                  sizes="150px"
                  onError={() => setFailedUrls(prev => new Set(prev).add(images[1]))}
                />
              </div>
            ) : (
              <div className="flex flex-col w-[calc(50%-1px)] h-full">
                <div className="relative w-full h-[calc(50%-1px)] overflow-hidden">
                  <Image
                    src={images[1]}
                    alt=""
                    fill
                    loading="lazy"
                    className="object-cover"
                    draggable={false}
                    sizes="150px"
                    onError={() => setFailedUrls(prev => new Set(prev).add(images[1]))}
                  />
                </div>
                {/* Divider between rows */}
                <div className="w-full h-[2px] bg-black/20 relative z-10 shrink-0" />
                <div className="relative w-full h-[calc(50%-1px)] overflow-hidden">
                  <Image
                    src={images[2]}
                    alt=""
                    fill
                    loading="lazy"
                    className="object-cover"
                    draggable={false}
                    sizes="150px"
                    onError={() => setFailedUrls(prev => new Set(prev).add(images[2]))}
                  />
                  {images.length > 3 && (
                    <div className="absolute bottom-[5px] right-[5px] bg-black/60 backdrop-blur-sm rounded-md px-[6px] py-[2px] z-10">
                      <span className="text-white text-[10px] font-semibold">+{images.length - 3}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gradient overlay at bottom for text readability */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none z-10"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)' }}
        />
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
