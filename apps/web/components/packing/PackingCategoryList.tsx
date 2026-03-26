'use client'

import type { DbPackingItem, PackingSuggestion } from '@travyl/shared'
import { PackingCategory } from './PackingCategory'

interface PackingCategoryListProps {
  orderedCategories: string[]
  itemsByCategory: Record<string, DbPackingItem[]>
  suggestionsByCategory?: Record<string, PackingSuggestion[]>
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onClaim?: (id: string) => void
  onRelease?: (id: string) => void
  currentUserId?: string
  onAcceptSuggestion?: (id: string) => void
  onDismissSuggestion?: (id: string) => void
  isGenerating?: boolean
}

export function PackingCategoryList({
  orderedCategories,
  itemsByCategory,
  suggestionsByCategory = {},
  onToggle,
  onRemove,
  onClaim,
  onRelease,
  currentUserId,
  onAcceptSuggestion,
  onDismissSuggestion,
  isGenerating = false,
}: PackingCategoryListProps) {
  const hasAnyVisible = orderedCategories.some(
    (cat) => (itemsByCategory[cat]?.length ?? 0) > 0 || (suggestionsByCategory[cat]?.length ?? 0) > 0
  )

  if (!hasAnyVisible) {
    if (isGenerating) {
      return (
        <div className="flex flex-col gap-3 py-6 px-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-[var(--cal-surface)] animate-pulse" />
          ))}
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <span className="text-3xl">🧳</span>
        <p className="text-sm text-[var(--cal-text-muted)]">No items yet — search above to add</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {orderedCategories.map((category) => {
        const categoryItems = itemsByCategory[category] || []
        const categorySuggestions = suggestionsByCategory?.[category] || []
        if (categoryItems.length === 0 && categorySuggestions.length === 0) return null
        return (
          <PackingCategory
            key={category}
            category={category}
            items={categoryItems}
            suggestions={categorySuggestions}
            onToggle={onToggle}
            onRemove={onRemove}
            onClaim={onClaim}
            onRelease={onRelease}
            currentUserId={currentUserId}
            onAcceptSuggestion={onAcceptSuggestion}
            onDismissSuggestion={onDismissSuggestion}
            defaultExpanded
          />
        )
      })}
    </div>
  )
}
