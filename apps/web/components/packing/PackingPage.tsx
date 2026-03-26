'use client'

import { useState } from 'react'
import { Sparks, SidebarCollapse, SidebarExpand } from 'iconoir-react'
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
  const userId = user?.id
  const [filterBy, setFilterBy] = useState<string>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { items, itemsByCategory, orderedCategories, filteredItems, auditLog, progress, isLoading, error, addItem, togglePacked, removeItem, claimItem, releaseItem, transferItem } = usePackingList(tripId, userId, filterBy)
  const {
    suggestionsByCategory,
    isGenerating,
    hasGenerated,
    generateSuggestions,
    acceptSuggestion,
    dismissSuggestion,
  } = usePackingSuggestions(tripId, items, addItem as (name: string, category: string) => void)

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

  // Compute itemsByCategory and orderedCategories based on filteredItems for display
  const filteredItemsByCategory: Record<string, typeof filteredItems> = {}
  for (const item of filteredItems) {
    if (!filteredItemsByCategory[item.category]) filteredItemsByCategory[item.category] = []
    filteredItemsByCategory[item.category].push(item)
  }
  const filteredOrderedCategories = orderedCategories.filter((cat) => (filteredItemsByCategory[cat]?.length ?? 0) > 0)

  return (
    <div className="flex flex-col h-full p-6">
      {/* Header row with sidebar toggle */}
      <div className="flex items-center justify-between mb-3">
        <PackingProgress packed={progress.packed} total={progress.total} percent={progress.percent} />
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="p-1.5 rounded-lg text-[var(--cal-text-muted)] hover:text-[var(--cal-text)] hover:bg-[var(--cal-surface)] transition-colors"
          aria-label={sidebarOpen ? 'Hide activity sidebar' : 'Show activity sidebar'}
          title={sidebarOpen ? 'Hide activity' : 'Show activity'}
        >
          {sidebarOpen ? <SidebarCollapse width={16} height={16} /> : <SidebarExpand width={16} height={16} />}
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center gap-1.5 mb-4">
        {['all', 'mine', 'shared', 'kids', 'adults'].map((filter) => (
          <button key={filter} onClick={() => setFilterBy(filter)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterBy === filter ? 'bg-[#1e3a5f] text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10'
            }`}>
            {filter === 'all' ? 'All' : filter === 'mine' ? 'My Items' : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Main layout: list + optional sidebar */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Main list area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-auto">
          <SpotlightSearch existingItems={items} onAddItem={addItem as (name: string, category: string) => void} />
          <div className="flex-1 overflow-auto mt-4">
            <PackingCategoryList
              orderedCategories={filteredOrderedCategories}
              itemsByCategory={filteredItemsByCategory}
              suggestionsByCategory={suggestionsByCategory}
              onToggle={togglePacked}
              onRemove={removeItem}
              onAcceptSuggestion={acceptSuggestion}
              onDismissSuggestion={dismissSuggestion}
              isGenerating={isGenerating}
              onClaim={claimItem}
              onRelease={releaseItem}
              currentUserId={userId}
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

        {/* Collapsible activity sidebar */}
        {sidebarOpen && (
          <div className="w-72 shrink-0 border-l border-gray-200 dark:border-white/10 pl-4 overflow-auto">
            <PackingActivityFeed entries={auditLog} currentUserId={userId} />
          </div>
        )}
      </div>
    </div>
  )
}
