'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { NavArrowDown, NavArrowRight } from 'iconoir-react'
import type { DbPackingItem } from '@travyl/shared'
import { getCategoryLabel } from './utils'
import { PackingItem } from './PackingItem'

interface PackingCategoryProps {
  category: string
  items: DbPackingItem[]
  onToggle: (id: string) => void
  onIncrementPacked: (id: string) => void
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  onClaim?: (id: string) => void
  onRelease?: (id: string) => void
  currentUserId?: string
  defaultExpanded?: boolean
}

export function PackingCategory({
  category,
  items,
  onToggle,
  onIncrementPacked,
  onUpdateQuantity,
  onRemove,
  onClaim,
  onRelease,
  currentUserId,
  defaultExpanded = true,
}: PackingCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const packedUnits = items.reduce((s, i) => s + i.packed_count, 0)
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors duration-150 group"
      >
        {isExpanded ? (
          <NavArrowDown width={14} height={14} className="text-gray-400 shrink-0 transition-transform duration-200" />
        ) : (
          <NavArrowRight width={14} height={14} className="text-gray-400 shrink-0 transition-transform duration-200" />
        )}

        <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-gray-400 flex-1 text-left">
          {getCategoryLabel(category)}
        </span>

        <span className="text-xs tabular-nums text-gray-400">
          {packedUnits}/{totalUnits}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <motion.div layout className="pt-0.5">
              <AnimatePresence>
                {items.map((item) => (
                  <PackingItem
                    key={item.id}
                    item={item}
                    onToggle={onToggle}
                    onIncrementPacked={onIncrementPacked}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemove={onRemove}
                    onClaim={onClaim}
                    onRelease={onRelease}
                    currentUserId={currentUserId}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
