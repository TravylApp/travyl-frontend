'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, MapPin, Clock, Star } from 'iconoir-react'
import { usePlaceImages } from '@travyl/shared'
import { FOR_YOU_PANEL_DEFAULT_WIDTH } from './constants'
import { SuggestionCard } from './SuggestionCard'
import { SuggestionDetailDrawer } from './SuggestionDetailDrawer'
import { useSuggestions } from './hooks/useSuggestions'
import type { FilterCategory } from './hooks/useSuggestions'
import { useInteractionTracking } from './hooks/useInteractionTracking'
import type { SuggestionCard as SuggestionCardType } from './types'

interface ForYouPanelProps {
  destination: string
  tripId: string
  scheduledActivityIds?: string[]
  width?: number
}

const CATEGORY_ICONS: Record<string, string> = {
  sightseeing: '🏛️',
  dining: '🍽️',
  tours: '🚌',
  culture: '🎭',
  shopping: '🛍️',
  nightlife: '🌙',
  outdoor: '🌲',
  attractions: '🎡',
  entertainment: '🎬',
  wellness: '🧘',
}

export function ForYouPanel({
  destination,
  tripId,
  scheduledActivityIds,
  width,
}: ForYouPanelProps) {
  const {
    suggestions,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    commitSearch,
    activeFilter,
    setActiveFilter,
    filterCategories,
    refetch,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useSuggestions({ destination, scheduledActivityIds })

  const { trackEvent } = useInteractionTracking(tripId)

  const suggestionNames = useMemo(() => suggestions.map(s => s.name), [suggestions])
  const imageResults = usePlaceImages(suggestionNames)

  const enrichedSuggestions = useMemo(() => {
    if (!imageResults.length) return suggestions
    return suggestions.map((suggestion, i) => {
      if (suggestion.imageUrl) return suggestion
      const pexelsUrl = imageResults[i]?.data?.url
      if (!pexelsUrl) return suggestion
      return {
        ...suggestion,
        imageUrl: pexelsUrl,
        imageUrls: [pexelsUrl, ...(suggestion.imageUrls ?? [])],
      }
    })
  }, [suggestions, imageResults])

  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionCardType | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openDrawer = useCallback((suggestion: SuggestionCardType) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setSelectedSuggestion(suggestion)
    setIsClosing(false)
  }, [])

  const closeDrawer = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    setIsClosing(true)
    closeTimerRef.current = setTimeout(() => {
      setSelectedSuggestion(null)
      setIsClosing(false)
    }, 300)
  }, [])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const cityName = destination.split(',')[0]

  return (
    <aside
      style={{ width: width ?? FOR_YOU_PANEL_DEFAULT_WIDTH }}
      className="relative flex flex-col shrink-0 self-stretch border-l border-cal-border-light bg-cal-surface-elevated overflow-hidden"
      aria-label="Activity suggestions"
    >
      {/* Header */}
      <div className="px-3.5 pt-3.5 pb-2.5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Star width={13} height={13} className="text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-cal-text">For You</h2>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search
            width={14}
            height={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-cal-text-tertiary pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitSearch() }}
            placeholder="Search activities..."
            className="w-full bg-cal-bg border border-cal-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-cal-text placeholder-cal-text-tertiary outline-none transition-all focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Filter chips */}
      {filterCategories.length > 0 && (
        <div className="px-3.5 pb-2.5 overflow-x-auto scrollbar-none">
          <div className="flex gap-1.5">
            {filterCategories.map((cat) => {
              const isActive = activeFilter === cat
              return (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat as FilterCategory)}
                  className={[
                    'flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all border',
                    isActive
                      ? 'bg-primary border-primary text-white shadow-sm'
                      : 'border-cal-border text-cal-text-secondary hover:bg-cal-bg hover:text-cal-text hover:border-cal-text-tertiary',
                  ].join(' ')}
                >
                  {CATEGORY_ICONS[cat.toLowerCase()] && (
                    <span className="text-[10px]">{CATEGORY_ICONS[cat.toLowerCase()]}</span>
                  )}
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Section label */}
      {!isLoading && !error && suggestions.length > 0 && (
        <div className="text-[11px] font-medium text-cal-text-secondary/70 px-3.5 pb-1.5 flex items-center gap-1.5">
          <MapPin width={10} height={10} />
          {searchQuery.trim()
            ? `Results for '${searchQuery}'`
            : `${cityName || 'Recommended'} picks`}
        </div>
      )}

      {/* Content area */}
      <div className="h-0 grow overflow-y-auto px-2 pb-3 scrollbar-thin">
        {isLoading ? (
          <div className="px-1 pt-1 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-cal-border-light animate-pulse" style={{ height: [100, 80, 110, 90, 95, 85][i] }} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-medium text-cal-text mb-1">
              Couldn&apos;t load suggestions
            </p>
            <p className="text-xs text-cal-text-tertiary mb-4">
              Something went wrong. Check your connection.
            </p>
            <button
              onClick={() => refetch()}
              className="text-xs font-medium text-white bg-primary px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              Try again
            </button>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            {/* Compass illustration */}
            <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary/40">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2v20M2 12h20" strokeLinecap="round" opacity="0.3" />
                <path d="M12 6v2M12 16v2M6 12H8M16 12h2" strokeLinecap="round" opacity="0.3" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88" opacity="0.6" />
              </svg>
            </div>
            <p className="text-sm font-medium text-cal-text mb-1">
              {searchQuery.trim()
                ? `No results for '${searchQuery}'`
                : 'No suggestions yet'}
            </p>
            <p className="text-xs text-cal-text-tertiary max-w-[200px]">
              {searchQuery.trim()
                ? 'Try different keywords or browse categories'
                : 'Try searching for things to do or browse a category above'}
            </p>
          </div>
        ) : (
          <>
            <div className="masonry-grid px-0.5">
              {enrichedSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onVisible={() => trackEvent(suggestion.id, 'impression', suggestion.category)}
                  onSelect={openDrawer}
                />
              ))}
            </div>

            {isLoadingMore ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <div className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <span className="text-xs text-cal-text-tertiary">Loading more...</span>
              </div>
            ) : hasMore ? (
              <button
                type="button"
                onClick={loadMore}
                className="w-full py-2.5 mt-1 text-xs font-medium text-cal-text-secondary border border-dashed border-cal-border hover:border-cal-text-tertiary hover:text-cal-text rounded-xl transition-all hover:bg-cal-bg/50"
              >
                Load more suggestions
              </button>
            ) : null}
          </>
        )}
      </div>

      {/* Footer hint */}
      {enrichedSuggestions.length > 0 && (
        <div className="text-center text-[10px] text-cal-text-tertiary/40 py-2">
          Drag cards onto the calendar
        </div>
      )}

      {/* Detail drawer */}
      {selectedSuggestion && (
        <SuggestionDetailDrawer
          suggestion={selectedSuggestion}
          isClosing={isClosing}
          onClose={closeDrawer}
        />
      )}
    </aside>
  )
}
