'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { NavArrowDown, NavArrowRight } from 'iconoir-react'
import type { DbPackingItem, PackingSuggestion } from '@travyl/shared'
import { getCategoryLabel, isStaticCategory } from './utils'
import { PackingItem } from './PackingItem'
import { SuggestionChip } from './SuggestionChip'

interface PackingCategoryProps {
  category: string
  items: DbPackingItem[]
  suggestions?: PackingSuggestion[]
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onClaim?: (id: string) => void
  onRelease?: (id: string) => void
  currentUserId?: string
  onAcceptSuggestion?: (id: string) => void
  onDismissSuggestion?: (id: string) => void
  defaultExpanded?: boolean
}

export function PackingCategory({
  category,
  items,
  suggestions = [],
  onToggle,
  onRemove,
  onClaim,
  onRelease,
  currentUserId,
  onAcceptSuggestion,
  onDismissSuggestion,
  defaultExpanded = true,
}: PackingCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const packedCount = items.filter((i) => i.is_packed).length
  const totalCount = items.length

  return (
    <div className="mb-1">
      {/* Header row */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-[var(--cal-surface)] transition-colors duration-150 group"
      >
        {isExpanded ? (
          <NavArrowDown
            width={14}
            height={14}
            className="text-[var(--cal-text-muted)] shrink-0 transition-transform duration-200"
          />
        ) : (
          <NavArrowRight
            width={14}
            height={14}
            className="text-[var(--cal-text-muted)] shrink-0 transition-transform duration-200"
          />
        )}

        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--cal-text-muted)] flex-1 text-left">
          {getCategoryLabel(category)}
          {!isStaticCategory(category) && (
            <span className="text-[9px] text-purple-600 dark:text-purple-400 ml-1">✦ AI</span>
          )}
        </span>

        <span className="text-xs tabular-nums text-[var(--cal-text-muted)]">
          {packedCount}/{totalCount}
        </span>
      </button>

      {/* Expanded items list */}
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
                    onRemove={onRemove}
                    onClaim={onClaim}
                    onRelease={onRelease}
                    currentUserId={currentUserId}
                  />
                ))}
                {suggestions.map((suggestion) => (
                  <SuggestionChip
                    key={`suggestion-${suggestion.id}`}
                    suggestion={suggestion}
                    onAccept={onAcceptSuggestion ?? (() => {})}
                    onDismiss={onDismissSuggestion ?? (() => {})}
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
