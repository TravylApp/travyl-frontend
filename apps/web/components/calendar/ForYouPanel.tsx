'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Search } from 'iconoir-react'
import { FOR_YOU_PANEL_WIDTH } from './constants'
import { SuggestionCard } from './SuggestionCard'
import { CardPopover } from './CardPopover'
import { formatDuration } from './utils'
import { useSuggestions } from './hooks/useSuggestions'
import type { FilterCategory } from './hooks/useSuggestions'
import { useInteractionTracking } from './hooks/useInteractionTracking'
import type { SuggestionCard as SuggestionCardType } from './types'

interface ForYouPanelProps {
  destination: string
  tripId: string
  scheduledActivityIds?: string[]
}

export function ForYouPanel({
  destination,
  tripId,
  scheduledActivityIds,
}: ForYouPanelProps) {
  const {
    suggestions,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    filterCategories,
    refetch,
  } = useSuggestions({ destination, scheduledActivityIds })

  const sentinelRef = useRef<HTMLDivElement>(null)

  // Prefetch next page as soon as the current page lands
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNextPage])

  // Also trigger on scroll — 400px before sentinel becomes visible
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '400px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const { trackEvent } = useInteractionTracking(tripId)

  const [popoverSuggestion, setPopoverSuggestion] = useState<SuggestionCardType | null>(null)
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null)

  const handleCardClick = useCallback((suggestion: SuggestionCardType, anchorEl: HTMLElement) => {
    if (popoverSuggestion?.id === suggestion.id) {
      setPopoverSuggestion(null)
      setPopoverAnchor(null)
    } else {
      setPopoverSuggestion(suggestion)
      setPopoverAnchor(anchorEl)
    }
  }, [popoverSuggestion?.id])

  const handlePopoverClose = useCallback(() => {
    setPopoverSuggestion(null)
    setPopoverAnchor(null)
  }, [])

  const formatPrice = (price: number | null, currency: string) => {
    if (price === null || price === 0) return 'Free'
    return `€${price}`
  }

  return (
    <aside
      style={{ width: FOR_YOU_PANEL_WIDTH }}
      className="flex flex-col shrink-0 border-l border-[var(--cal-border)] bg-[var(--cal-surface-elevated)] overflow-hidden"
      aria-label="Activity suggestions"
    >
      {/* Header */}
      <div className="p-3.5 pb-3 border-b border-[var(--cal-border-light)]">
        <h2 className="text-base font-serif font-normal tracking-wide text-[var(--cal-text)] mb-2.5">
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
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--cal-text-secondary)] px-3.5 pt-3 pb-1.5">
        {searchQuery.trim()
          ? `Results for '${searchQuery}'`
          : `Recommended for ${destination}`}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3">
        {isLoading ? (
          /* Skeleton loading */
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-2">
              {[0, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-[10px] bg-[var(--cal-border)] animate-pulse"
                  style={{ height: 120 + i * 20 }}
                />
              ))}
            </div>
            <div className="flex-1 flex flex-col gap-2">
              {[1, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-[10px] bg-[var(--cal-border)] animate-pulse"
                  style={{ height: 120 + i * 20 }}
                />
              ))}
            </div>
          </div>
        ) : error ? (
          /* Error state */
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-sm text-[var(--cal-text-secondary)]">
              Couldn&apos;t load suggestions
            </p>
            <button onClick={() => refetch()} className="text-xs text-[var(--cal-accent)] hover:underline">
              Tap to retry
            </button>
          </div>
        ) : suggestions.length === 0 ? (
          /* Empty state */
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
          /* Masonry grid — two explicit flex columns avoid the css columns/overflow-y clipping bug */
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-2">
              {suggestions.filter((_, i) => i % 2 === 0).map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onVisible={() => trackEvent(suggestion.id, 'impression')}
                  onClick={handleCardClick}
                />
              ))}
            </div>
            <div className="flex-1 flex flex-col gap-2">
              {suggestions.filter((_, i) => i % 2 === 1).map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onVisible={() => trackEvent(suggestion.id, 'impression')}
                  onClick={handleCardClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />

        {isFetchingNextPage && (
          <div className="flex justify-center py-3">
            <div className="w-4 h-4 rounded-full border-2 border-[var(--cal-border)] border-t-[var(--cal-accent)] animate-spin" />
          </div>
        )}
      </div>

      {/* Footer hint */}
      {suggestions.length > 0 && (
        <div className="text-center text-[11px] text-[var(--cal-text-tertiary)] py-2.5 border-t border-[var(--cal-border-light)]">
          Drag any card onto the calendar to schedule it
        </div>
      )}

      <CardPopover
        anchorEl={popoverAnchor}
        isOpen={!!popoverSuggestion}
        onClose={handlePopoverClose}
        position="left"
        image={popoverSuggestion?.imageUrl}
        title={popoverSuggestion?.name ?? ''}
        category={popoverSuggestion?.category ?? ''}
        rating={popoverSuggestion?.rating ?? undefined}
        price={popoverSuggestion ? formatPrice(popoverSuggestion.price, popoverSuggestion.currency) : undefined}
        duration={popoverSuggestion ? formatDuration(popoverSuggestion.duration) : undefined}
        description={popoverSuggestion?.description}
        actions={popoverSuggestion ? [
          {
            label: 'Add to calendar',
            onClick: () => {
              handlePopoverClose()
            },
            variant: 'primary' as const,
          },
        ] : []}
      />
    </aside>
  )
}
