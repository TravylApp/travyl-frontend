'use client'

import { useMemo } from 'react'
import type { DbPackingItem, PackingSuggestion } from '@travyl/shared'
import { PACKING_CATEGORIES } from '@travyl/shared'
import { PackingCategory } from './PackingCategory'

interface PackingCategoryListProps {
  itemsByCategory: Record<string, DbPackingItem[]>
  suggestionsByCategory?: Record<string, PackingSuggestion[]>
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onAcceptSuggestion?: (id: string) => void
  onDismissSuggestion?: (id: string) => void
  isGenerating?: boolean
}

export function PackingCategoryList({
  itemsByCategory,
  suggestionsByCategory = {},
  onToggle,
  onRemove,
  onAcceptSuggestion,
  onDismissSuggestion,
  isGenerating = false,
}: PackingCategoryListProps) {
  const visibleCategories = useMemo(() =>
    PACKING_CATEGORIES.filter(
      (cat) => (itemsByCategory[cat]?.length ?? 0) > 0 || (suggestionsByCategory[cat]?.length ?? 0) > 0
    ),
    [itemsByCategory, suggestionsByCategory]
  )

  if (visibleCategories.length === 0) {
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
      {visibleCategories.map((category) => (
        <PackingCategory
          key={category}
          category={category}
          items={itemsByCategory[category] ?? []}
          suggestions={suggestionsByCategory[category]}
          onToggle={onToggle}
          onRemove={onRemove}
          onAcceptSuggestion={onAcceptSuggestion}
          onDismissSuggestion={onDismissSuggestion}
          defaultExpanded
        />
      ))}
    </div>
  )
}
