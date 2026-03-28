'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'iconoir-react'
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

  // Stream high-res Pexels images for each suggestion — resolves independently per card
  const suggestionNames = useMemo(() => suggestions.map(s => s.name), [suggestions])
  const imageResults = usePlaceImages(suggestionNames)

  // Merge resolved Pexels images into suggestions as they stream in
  const enrichedSuggestions = useMemo(() => {
    if (!imageResults.length) return suggestions
    return suggestions.map((suggestion, i) => {
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

  return (
    <aside
      style={{ width: width ?? FOR_YOU_PANEL_DEFAULT_WIDTH }}
      className="relative flex flex-col shrink-0 self-stretch border-l border-[var(--cal-border)] bg-[var(--cal-surface-elevated)] overflow-hidden"
      aria-label="Activity suggestions"
    >
      {/* Header */}
      <div className="p-3.5 pb-3 border-b border-[var(--cal-border-light)]">
        <h2 className="text-sm font-semibold text-[var(--cal-text)] mb-2.5">
          For You
        </h2>
        <div className="flex items-center gap-2 bg-[var(--cal-border-light)] border border-[var(--cal-border)] rounded-lg px-3 py-2">
          <Search
            width={14}
            height={14}
            strokeWidth={1.5}
            className="shrink-0 text-[var(--cal-text-tertiary)] opacity-50"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitSearch() }}
            placeholder="Search activities..."
            className="flex-1 bg-transparent text-sm text-[var(--cal-text)] placeholder-[var(--cal-text-tertiary)] outline-none"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 px-3.5 pt-2.5 pb-0 overflow-x-auto">
        {filterCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat as FilterCategory)}
            className={[
              'text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-all border',
              activeFilter === cat
                ? 'bg-[#003594] border-[#003594] text-white'
                : 'border-[var(--cal-border)] text-[var(--cal-text-secondary)] hover:bg-[var(--cal-border-light)] hover:text-[var(--cal-text)]',
            ].join(' ')}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Section label */}
      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--cal-text-secondary)] px-3.5 pt-3 pb-1.5">
        {searchQuery.trim()
          ? `Results for '${searchQuery}'`
          : `Recommended for ${destination}`}
      </div>

      {/* Content area */}
      <div className="h-0 grow overflow-y-auto px-2 pb-3 scrollbar-thin">
        {isLoading ? (
          <div className="columns-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="break-inside-avoid mb-2 rounded-[10px] bg-[var(--cal-border)] animate-pulse"
                style={{ height: 120 + i * 20 }}
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-sm text-[var(--cal-text-secondary)]">
              Couldn&apos;t load suggestions
            </p>
            <button onClick={() => refetch()} className="text-xs text-[var(--cal-accent)] hover:underline">
              Tap to retry
            </button>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-1">
            <p className="text-sm text-[var(--cal-text-secondary)]">
              {searchQuery.trim()
                ? `No results for '${searchQuery}'`
                : 'No suggestions available'}
            </p>
            {searchQuery.trim() && (
              <p className="text-xs text-[var(--cal-text-tertiary)]">
                Try broader terms
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="columns-2 gap-2">
              {enrichedSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onVisible={() => trackEvent(suggestion.id, 'impression', suggestion.category)}
                  onSelect={openDrawer}
                />
              ))}
            </div>

            {/* Load more / loading spinner */}
            {isLoadingMore ? (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 rounded-full border-2 border-[var(--cal-border)] border-t-[#003594] animate-spin" />
              </div>
            ) : hasMore ? (
              <button
                type="button"
                onClick={loadMore}
                className="w-full py-3 mt-2 text-xs font-medium text-[var(--cal-accent)] border border-[var(--cal-border)] hover:bg-[var(--cal-border-light)] rounded-lg transition-colors"
              >
                Load more suggestions
              </button>
            ) : null}
          </>
        )}
      </div>

      {/* Footer hint */}
      {enrichedSuggestions.length > 0 && (
        <div className="text-center text-[11px] text-[var(--cal-text-tertiary)] py-2.5 border-t border-[var(--cal-border-light)]">
          Drag any card onto the calendar to schedule it
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
