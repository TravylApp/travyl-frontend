'use client'

import { motion, AnimatePresence } from 'motion/react'
import type { DbPackingItem } from '@travyl/shared'
import { PackingCategory } from './PackingCategory'

interface PackingCategoryListProps {
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

export function PackingCategoryList({
  orderedCategories,
  itemsByCategory,
  onToggle,
  onIncrementPacked,
  onUpdateQuantity,
  onRemove,
  onClaim,
  onRelease,
  currentUserId,
}: PackingCategoryListProps) {
  if (orderedCategories.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-400">
        No items yet — add one above.
      </div>
    )
  }

  return (
    <motion.div layout className="flex flex-col gap-1">
      <AnimatePresence>
        {orderedCategories.map((category) => {
          const items = itemsByCategory[category] ?? []
          if (items.length === 0) return null
          return (
            <PackingCategory
              key={category}
              category={category}
              items={items}
              onToggle={onToggle}
              onIncrementPacked={onIncrementPacked}
              onUpdateQuantity={onUpdateQuantity}
              onRemove={onRemove}
              onClaim={onClaim}
              onRelease={onRelease}
              currentUserId={currentUserId}
            />
          )
        })}
      </AnimatePresence>
    </motion.div>
  )
}
