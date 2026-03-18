'use client'

import { Search } from 'iconoir-react'
import { FOR_YOU_PANEL_WIDTH } from './constants'
import { SuggestionCard } from './SuggestionCard'
import { useSuggestions } from './hooks/useSuggestions'
import type { FilterCategory } from './hooks/useSuggestions'

interface ForYouPanelProps {
  destination: string
  scheduledActivityIds?: string[]
}

export function ForYouPanel({
  destination,
  scheduledActivityIds,
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

  return (
    <aside
      style={{ width: FOR_YOU_PANEL_WIDTH }}
      className="flex flex-col shrink-0 border-l border-gray-200 dark:border-[#1e3a5f]/30 bg-white dark:bg-[#0f1d2e] overflow-hidden"
      aria-label="Activity suggestions"
    >
      {/* Header */}
      <div className="p-3.5 pb-3 border-b border-gray-200/50 dark:border-[#1e3a5f]/20">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-[#f5efe8] mb-2.5">
          For You
        </h2>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#1a2d42] border border-gray-200 dark:border-[#1e3a5f] rounded-lg px-3 py-2">
          <Search
            width={14}
            height={14}
            strokeWidth={1.5}
            className="shrink-0 text-gray-400 dark:text-[#4a7ab5] opacity-50"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-[#f5efe8] placeholder-gray-400 dark:placeholder-[#4a7ab5] outline-none"
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
                : 'border-gray-200 dark:border-[#1e3a5f] text-gray-500 dark:text-[#6a8fba] hover:bg-gray-100 dark:hover:bg-[#1a2d42] hover:text-gray-900 dark:hover:text-[#f5efe8]',
            ].join(' ')}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Section label */}
      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-400 dark:text-[#4a7ab5] px-3.5 pt-3 pb-1.5">
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
                className="break-inside-avoid mb-2 rounded-[10px] bg-gray-200 dark:bg-[#1a2d42] animate-pulse"
                style={{ height: 120 + i * 20 }}
              />
            ))}
          </div>
        ) : error ? (
          /* Error state */
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-sm text-gray-500 dark:text-[#4a7ab5]">
              Couldn&apos;t load suggestions
            </p>
            <button onClick={() => refetch()} className="text-xs text-[#003594] dark:text-[#4a7dff] hover:underline">
              Tap to retry
            </button>
          </div>
        ) : suggestions.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 gap-1">
            <p className="text-sm text-gray-500 dark:text-[#4a7ab5]">
              {searchQuery.trim()
                ? `No results for '${searchQuery}'`
                : 'No suggestions available'}
            </p>
            {searchQuery.trim() && (
              <p className="text-xs text-gray-400 dark:text-[#4a7ab5]/70">
                Try broader terms
              </p>
            )}
          </div>
        ) : (
          /* Masonry grid */
          <div className="columns-2 gap-2">
            {suggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {suggestions.length > 0 && (
        <div className="text-center text-[11px] text-gray-400/50 dark:text-[#4a7ab5]/30 py-2.5 border-t border-gray-100 dark:border-[#1e3a5f]/15">
          Drag any card onto the calendar to schedule it
        </div>
      )}
    </aside>
  )
}
