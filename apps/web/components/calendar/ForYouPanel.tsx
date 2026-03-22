'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Search } from 'iconoir-react'
import { SuggestionCard } from './SuggestionCard'
import { SuggestionSection } from './SuggestionSection'
import { CardPopover } from './CardPopover'
import { formatDuration } from './utils'
import { useSuggestions } from './hooks/useSuggestions'
import { useInteractionTracking } from './hooks/useInteractionTracking'
import type { SuggestionCard as SuggestionCardType } from './types'

interface ForYouPanelProps {
  destination: string
  tripId: string
  scheduledActivityIds?: string[]
  width: number
  columnCount: number
}

export function ForYouPanel({
  destination,
  tripId,
  scheduledActivityIds,
  width,
  columnCount,
}: ForYouPanelProps) {
  const {
    sections,
    suggestions,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    searchQuery,
    setSearchQuery,
    refetch,
  } = useSuggestions({ destination, scheduledActivityIds })

  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNextPage])

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
    trackEvent(suggestion.id, 'click', suggestion.category)
    if (popoverSuggestion?.id === suggestion.id) {
      setPopoverSuggestion(null)
      setPopoverAnchor(null)
    } else {
      setPopoverSuggestion(suggestion)
      setPopoverAnchor(anchorEl)
    }
  }, [popoverSuggestion?.id, trackEvent])

  const handlePopoverClose = useCallback(() => {
    setPopoverSuggestion(null)
    setPopoverAnchor(null)
  }, [])

  const handleSave = useCallback((suggestion: SuggestionCardType) => {
    // TODO: wire to useFavoritePlaces hook when available
    console.log('[ForYou] save:', suggestion.id)
  }, [])

  const handleSchedule = useCallback((suggestion: SuggestionCardType) => {
    // TODO: wire to createActivity mutation for quick-schedule
    console.log('[ForYou] schedule:', suggestion.id)
  }, [])

  const handleCardVisible = useCallback((id: string, category: string) => {
    trackEvent(id, 'impression', category)
  }, [trackEvent])

  const formatPrice = (price: number | null, currency: string) => {
    if (price === null || price === 0) return 'Free'
    return `\u20AC${price}`
  }

  const isSearching = searchQuery.trim().length > 0
  const totalSuggestions = sections.reduce((sum, s) => sum + s.suggestions.length, 0)

  return (
    <aside
      style={{ width }}
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

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3 pt-2">
        {isLoading ? (
          <>
            {[0, 1].map((sectionIdx) => (
              <div key={sectionIdx} className="mb-3">
                <div className="rounded-lg bg-[var(--cal-border)] animate-pulse h-10 mb-2" />
                <div className="flex gap-2">
                  {Array.from({ length: columnCount }).map((_, colIdx) => (
                    <div key={colIdx} className="flex-1 flex flex-col gap-2">
                      {[0, 1].map((i) => (
                        <div
                          key={i}
                          className="rounded-[10px] bg-[var(--cal-border)] animate-pulse"
                          style={{ height: 120 + ((sectionIdx * 2 + colIdx + i) % 4) * 15 }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-sm text-[var(--cal-text-secondary)]">
              Couldn&apos;t load suggestions
            </p>
            <button onClick={() => refetch()} className="text-xs text-[var(--cal-accent)] hover:underline">
              Tap to retry
            </button>
          </div>
        ) : isSearching ? (
          suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-1">
              <p className="text-sm text-[var(--cal-text-secondary)]">
                No results for &lsquo;{searchQuery}&rsquo;
              </p>
              <p className="text-xs text-[var(--cal-text-tertiary)]">
                Try broader terms
              </p>
            </div>
          ) : (
            <>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--cal-text-secondary)] px-1.5 pb-2">
                {suggestions.length} results for &lsquo;{searchQuery}&rsquo;
              </div>
              <div className="flex gap-2">
                {Array.from({ length: columnCount }).map((_, colIdx) => (
                  <div key={colIdx} className="flex-1 flex flex-col gap-2">
                    {suggestions.filter((_, i) => i % columnCount === colIdx).map((suggestion) => (
                      <SuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        onVisible={() => handleCardVisible(suggestion.id, suggestion.category)}
                        onClick={handleCardClick}
                        onSave={handleSave}
                        onSchedule={handleSchedule}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </>
          )
        ) : totalSuggestions === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-1">
            <p className="text-sm text-[var(--cal-text-secondary)]">
              No suggestions available
            </p>
          </div>
        ) : (
          sections.map((section) => (
            <SuggestionSection
              key={section.sectionTitle}
              section={section}
              columnCount={columnCount}
              onCardVisible={handleCardVisible}
              onCardClick={handleCardClick}
              onSave={handleSave}
              onSchedule={handleSchedule}
            />
          ))
        )}

        <div ref={sentinelRef} className="h-4" />

        {isFetchingNextPage && (
          <div className="flex justify-center py-3">
            <div className="w-4 h-4 rounded-full border-2 border-[var(--cal-border)] border-t-[var(--cal-accent)] animate-spin" />
          </div>
        )}
      </div>

      {totalSuggestions > 0 && (
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
