'use client'

import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Search, Sparkles } from 'lucide-react'
import type { PackingSuggestion } from '@travyl/shared'
import { SuggestionChip } from './SuggestionChip'

interface PackingSuggestionsProps {
  suggestionsByCategory: Record<string, PackingSuggestion[]>
  isGenerating: boolean
  hasGenerated: boolean
  onAccept: (id: string) => void
  onDismiss: (id: string) => void
  maxVisible?: number
}

export function PackingSuggestions({
  suggestionsByCategory,
  isGenerating,
  hasGenerated,
  onAccept,
  onDismiss,
  maxVisible = 6,
}: PackingSuggestionsProps) {
  const [search, setSearch] = useState('')

  const flat = Object.values(suggestionsByCategory).flat()
  const filtered = search.trim()
    ? flat.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : flat
  const visible = filtered.slice(0, maxVisible)

  if (isGenerating && flat.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-7 rounded-lg bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    )
  }

  if (flat.length === 0) {
    return (
      <p className="text-[12px] text-gray-400 py-2">
        {hasGenerated
          ? 'All caught up — nothing new to suggest right now.'
          : 'Tap More to get AI suggestions based on your trip.'}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Search bar */}
      <div className="flex items-center gap-2 h-8 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] focus-within:border-[var(--trip-base)] transition-colors">
        <Search size={13} className="text-gray-400 shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter suggestions…"
          className="flex-1 text-[12px] bg-transparent text-gray-900 dark:text-white outline-none placeholder:text-gray-400"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Clear
          </button>
        )}
      </div>

      <AnimatePresence>
        {visible.length === 0 ? (
          <p className="text-[12px] text-gray-400 py-2">No suggestions match that filter.</p>
        ) : (
          visible.map((suggestion) => (
            <SuggestionChip
              key={suggestion.id}
              suggestion={suggestion}
              onAccept={onAccept}
              onDismiss={onDismiss}
            />
          ))
        )}
      </AnimatePresence>
      {visible.length > 0 && filtered.length > visible.length && (
        <p className="text-[10px] text-gray-400 mt-0.5 text-center">
          +{filtered.length - visible.length} more
        </p>
      )}
    </div>
  )
}

export function SuggestionsHeaderAction({
  onGenerate,
  isGenerating,
}: {
  onGenerate: () => void
  isGenerating: boolean
}) {
  return (
    <button
      onClick={onGenerate}
      disabled={isGenerating}
      className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--trip-base)] hover:bg-[rgb(var(--trip-base-rgb)/0.08)] px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      <Sparkles size={11} />
      {isGenerating ? 'Thinking…' : 'More'}
    </button>
  )
}
