'use client'

import type { DbPackingItem } from '@travyl/shared'
import { PACKING_CATEGORIES } from '@travyl/shared'
import { PackingCategory } from './PackingCategory'

interface PackingCategoryListProps {
  itemsByCategory: Record<string, DbPackingItem[]>
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

export function PackingCategoryList({
  itemsByCategory,
  onToggle,
  onRemove,
}: PackingCategoryListProps) {
  const categoriesWithItems = PACKING_CATEGORIES.filter(
    (cat) => (itemsByCategory[cat]?.length ?? 0) > 0
  )

  if (categoriesWithItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <span className="text-3xl">🧳</span>
        <p className="text-sm text-[var(--cal-text-muted)]">No items yet — search above to add</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {categoriesWithItems.map((category) => (
        <PackingCategory
          key={category}
          category={category}
          items={itemsByCategory[category] ?? []}
          onToggle={onToggle}
          onRemove={onRemove}
          defaultExpanded
        />
      ))}
    </div>
  )
}
