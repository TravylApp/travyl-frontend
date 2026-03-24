'use client'

import { Search } from 'iconoir-react'
import { FOR_YOU_PANEL_DEFAULT_WIDTH } from './constants'
import { SuggestionCard } from './SuggestionCard'
import { useSuggestions } from './hooks/useSuggestions'
import type { FilterCategory } from './hooks/useSuggestions'
import { useInteractionTracking } from './hooks/useInteractionTracking'

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
    activeFilter,
    setActiveFilter,
    filterCategories,
    refetch,
  } = useSuggestions({ destination, scheduledActivityIds })

  const { trackEvent } = useInteractionTracking(tripId)

  return (
    <aside
      style={{ width: width ?? FOR_YOU_PANEL_DEFAULT_WIDTH }}
      className="flex flex-col shrink-0 border-l border-[var(--cal-border)] bg-[var(--cal-surface-elevated)] overflow-hidden"
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
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {isLoading ? (
          /* Skeleton loading */
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
          /* Masonry grid */
          <div className="columns-2 gap-2">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onVisible={() => trackEvent(suggestion.id, 'impression', suggestion.category)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {suggestions.length > 0 && (
        <div className="text-center text-[11px] text-[var(--cal-text-tertiary)] py-2.5 border-t border-[var(--cal-border-light)]">
          Drag any card onto the calendar to schedule it
        </div>
      )}
    </aside>
  )
}
