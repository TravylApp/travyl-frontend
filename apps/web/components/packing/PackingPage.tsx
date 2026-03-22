'use client'

import { Sparks } from 'iconoir-react'
import { usePackingList, useAuthStore, usePackingSuggestions } from '@travyl/shared'
import { SpotlightSearch } from './SpotlightSearch'
import { PackingProgress } from './PackingProgress'
import { PackingCategoryList } from './PackingCategoryList'
import { PackingActivityFeed } from './PackingActivityFeed'

interface PackingPageProps {
  tripId: string
}

export function PackingPage({ tripId }: PackingPageProps) {
  const { user } = useAuthStore()
  const { items, itemsByCategory, auditLog, progress, isLoading, error, addItem, togglePacked, removeItem } = usePackingList(tripId, user?.id)
  const {
    suggestionsByCategory,
    isGenerating,
    hasGenerated,
    generateSuggestions,
    acceptSuggestion,
    dismissSuggestion,
  } = usePackingSuggestions(tripId, items, addItem)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--cal-border,#334155)] border-t-[#003594] rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[13px] text-red-400">Failed to load packing list.</p>
      </div>
    )
  }

  return (
    <div className="flex gap-6 h-full p-6">
      <div className="flex-1 flex flex-col min-w-0">
        <SpotlightSearch existingItems={items} onAddItem={addItem} />
        <div className="flex-1 overflow-auto mt-4">
          <PackingCategoryList
            itemsByCategory={itemsByCategory}
            suggestionsByCategory={suggestionsByCategory}
            onToggle={togglePacked}
            onRemove={removeItem}
            onAcceptSuggestion={acceptSuggestion}
            onDismissSuggestion={dismissSuggestion}
            isGenerating={isGenerating}
          />
        </div>
        {/* Suggest button */}
        <div className="py-3">
          <button
            onClick={generateSuggestions}
            disabled={isGenerating}
            className="flex items-center gap-1.5 text-xs text-[var(--cal-text-muted)] hover:text-[var(--cal-text)] transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparks width={14} height={14} />
            )}
            {isGenerating ? 'Generating...' : hasGenerated ? 'Suggest more' : 'Suggest items'}
          </button>
        </div>
      </div>
      <div className="w-80 flex flex-col gap-4 shrink-0">
        <PackingProgress packed={progress.packed} total={progress.total} percent={progress.percent} />
        <div className="flex-1 overflow-auto">
          <PackingActivityFeed entries={auditLog} defaultCollapsed={false} />
        </div>
      </div>
    </div>
  )
}
