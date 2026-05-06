'use client'

import { AnimatePresence } from 'motion/react'
import { Sparks } from 'iconoir-react'
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
  const flat = Object.values(suggestionsByCategory).flat()
  const visible = flat.slice(0, maxVisible)

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
    <div className="flex flex-col">
      <AnimatePresence>
        {visible.map((suggestion) => (
          <SuggestionChip
            key={suggestion.id}
            suggestion={suggestion}
            onAccept={onAccept}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
      {flat.length > visible.length && (
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
          +{flat.length - visible.length} more
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
      <Sparks width={11} height={11} />
      {isGenerating ? 'Thinking…' : 'More'}
    </button>
  )
}
