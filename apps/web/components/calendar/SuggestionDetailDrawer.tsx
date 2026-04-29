'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import type { SuggestionCard } from './types'

interface SuggestionDetailDrawerProps {
  suggestion: SuggestionCard
  isClosing: boolean
  onClose: () => void
}

export function SuggestionDetailDrawer({
  suggestion,
  isClosing,
  onClose,
}: SuggestionDetailDrawerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [isImageHovered, setIsImageHovered] = useState(false)
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())

  const images = (suggestion.imageUrl ? [suggestion.imageUrl] : []).filter((u) => !failedUrls.has(u))
  const hasMultiple = images.length > 1
  const tagColor = getActivityColor(suggestion.category)

  // Slide-in: flip to visible on next animation frame so CSS transition plays
  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Reset image index when suggestion changes
  useEffect(() => {
    setActiveIdx(0)
    setFailedUrls(new Set())
  }, [suggestion.id])

  // Esc key: capture phase, stopPropagation to prevent CommandPalette from also closing
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handler, { capture: true })
    return () => document.removeEventListener('keydown', handler, { capture: true })
  }, [onClose])

  const navigateImage = (dir: 1 | -1) => {
    setActiveIdx((i) => Math.max(0, Math.min(images.length - 1, i + dir)))
  }

  const formatPrice = (price: number | null, currency: string) => {
    if (price === null || price === 0) return 'Free'
    return `${currency}${price}`
  }

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`
    if (hours % 1 === 0) return `${hours}h`
    return `${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`
  }

  return (
    <div
      className={[
        'absolute inset-y-0 right-0 w-full z-30',
        'bg-cal-surface-elevated flex flex-col',
        'transition-transform duration-300 ease-out',
        !isVisible || isClosing ? 'translate-x-full' : 'translate-x-0',
      ].join(' ')}
    >
      {/* Photo carousel — sticky header */}
      <div
        className="relative w-full shrink-0 overflow-hidden"
        style={{ height: 200 }}
        onMouseEnter={() => setIsImageHovered(true)}
        onMouseLeave={() => setIsImageHovered(false)}
      >
        {images.length === 0 ? (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${tagColor}28 0%, ${tagColor}55 100%)`,
            }}
          />
        ) : (
          images.map((url, idx) => (
            <Image
              key={url}
              src={url}
              alt=""
              fill
              className="object-cover transition-opacity duration-500"
              style={{ opacity: idx === activeIdx ? 1 : 0 }}
              draggable={false}
              sizes="100vw"
              onError={() => {
                setFailedUrls((prev) => new Set(prev).add(url))
                if (idx === activeIdx) setActiveIdx((i) => Math.max(0, i - 1))
              }}
            />
          ))
        )}

        {/* Dot indicators */}
        {hasMultiple && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-[3px] z-10">
            {images.map((_, idx) => (
              <div
                key={idx}
                className="h-[3px] rounded-full transition-all duration-300"
                style={{
                  width: idx === activeIdx ? 14 : 4,
                  background:
                    idx === activeIdx
                      ? 'rgba(255,255,255,0.95)'
                      : 'rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </div>
        )}

        {/* Image nav arrows */}
        {isImageHovered && hasMultiple && activeIdx > 0 && (
          <button
            aria-label="Previous photo"
            onClick={() => navigateImage(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white text-sm hover:bg-black/70 transition-colors"
          >
            ‹
          </button>
        )}
        {isImageHovered && hasMultiple && activeIdx < images.length - 1 && (
          <button
            aria-label="Next photo"
            onClick={() => navigateImage(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white text-sm hover:bg-black/70 transition-colors"
          >
            ›
          </button>
        )}

        {/* Close button */}
        <button
          aria-label="Close detail"
          onClick={onClose}
          className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white text-xs hover:bg-black/70 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {/* Name */}
        <h3 className="text-[15px] font-semibold text-cal-text leading-snug">
          {suggestion.name}
        </h3>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {suggestion.rating != null && (
            <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-[3px]">
              ★ {suggestion.rating}
            </span>
          )}
          {suggestion.price != null && (
            <span className="text-[11px] text-cal-text-secondary">
              {formatPrice(suggestion.price, suggestion.currency)}
            </span>
          )}
          <span
            className="text-[10px] font-semibold px-[6px] py-[2px] rounded-[4px]"
            style={{
              background: `${tagColor}28`,
              color: `${tagColor}cc`,
            }}
          >
            {suggestion.category.charAt(0).toUpperCase() +
              suggestion.category.slice(1)}
          </span>
          <span className="text-[11px] text-cal-text-tertiary">
            ~{formatDuration(suggestion.duration)}
          </span>
        </div>

        {/* Location */}
        {suggestion.location && (
          <p className="text-[11px] text-cal-text-secondary flex items-start gap-1">
            <span className="mt-[1px] shrink-0" aria-hidden="true">📍</span>
            <span>{suggestion.location}</span>
          </p>
        )}

        {/* Description */}
        {suggestion.description && (
          <p className="text-[12px] text-cal-text-secondary leading-relaxed">
            {suggestion.description}
          </p>
        )}

        {/* View full details link */}
        <div className="pt-1">
          <Link
            href={`/activity/${suggestion.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-cal-border text-[12px] font-medium text-cal-text-secondary hover:bg-cal-border-light hover:text-cal-text transition-colors"
          >
            View full details
          </Link>
        </div>
      </div>
    </div>
  )
}
