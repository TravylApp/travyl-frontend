'use client'

import { forwardRef } from 'react'
import type { DbPackingItem } from '@travyl/shared'
import { SpotlightSearch, type SpotlightSearchHandle } from './SpotlightSearch'
import { PackingCategoryList } from './PackingCategoryList'

export interface PackingListModuleProps {
  filterBy: string
  onFilterChange: (next: string) => void
  isLoggedIn: boolean
  existingItems: DbPackingItem[]
  onAddItem: (name: string, category: string) => void
  orderedCategories: string[]
  itemsByCategory: Record<string, DbPackingItem[]>
  onToggle: (id: string) => void
  onIncrementPacked: (id: string) => void
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  onClaim?: (id: string) => void
  onRelease?: (id: string) => void
  currentUserId?: string
}

export const PackingListModule = forwardRef<SpotlightSearchHandle, PackingListModuleProps>(function PackingListModule(
  props,
  searchRef,
) {
  const {
    filterBy, onFilterChange, isLoggedIn,
    existingItems, onAddItem,
    orderedCategories, itemsByCategory,
    onToggle, onIncrementPacked, onUpdateQuantity, onRemove, onClaim, onRelease, currentUserId,
  } = props

  const filters = isLoggedIn
    ? ['all', 'mine', 'shared', 'adults', 'kids']
    : ['all', 'adults', 'kids']

  const filterLabel = (f: string) =>
    f === 'all' ? 'All'
    : f === 'mine' ? 'My items'
    : f.charAt(0).toUpperCase() + f.slice(1)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        {filters.map((f) => {
          const active = filterBy === f
          return (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                active
                  ? 'bg-[var(--trip-base)] text-white'
                  : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.08]'
              }`}
            >
              {filterLabel(f)}
            </button>
          )
        })}
      </div>

      <SpotlightSearch ref={searchRef} existingItems={existingItems} onAddItem={onAddItem} />

      <PackingCategoryList
        orderedCategories={orderedCategories}
        itemsByCategory={itemsByCategory}
        onToggle={onToggle}
        onIncrementPacked={onIncrementPacked}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
        onClaim={onClaim}
        onRelease={onRelease}
        currentUserId={currentUserId}
      />
    </div>
  )
})
