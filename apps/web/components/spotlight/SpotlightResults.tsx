'use client'

import { useMemo, forwardRef } from 'react'
import type { RefObject } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { SpotlightResult } from '@travyl/shared'
import { SpotlightResultGroup } from './SpotlightResultGroup'

const CATEGORY_ORDER = ['trip', 'restaurant', 'activity', 'destination', 'navigation', 'command', 'setting']

interface Props {
  results: Record<string, SpotlightResult[]>
  quickResults?: Record<string, SpotlightResult[]>
  deepResults?: Record<string, SpotlightResult[]>
  activeIndex: number
  onSelect: (result: SpotlightResult) => void
  query: string
  itemRefs: RefObject<(HTMLButtonElement | null)[]>
  isPinned?: (id: string) => boolean
  deepLoading?: boolean
}

export const SpotlightResults = forwardRef<HTMLDivElement, Props>(
  function SpotlightResults({ results, quickResults, deepResults, activeIndex, onSelect, query, itemRefs, isPinned, deepLoading }, ref) {
    const orderedCategories = useMemo(() => {
      return CATEGORY_ORDER.filter((type) => results[type]?.length)
    }, [results])

    // Phase 1 categories: those present in quickResults, or all categories if no quickResults provided
    const quickCategories = useMemo(() => {
      if (!quickResults) return orderedCategories
      return CATEGORY_ORDER.filter((type) => quickResults[type]?.length)
    }, [quickResults, orderedCategories])

    // Phase 2 categories: those in deepResults but NOT already in Phase 1
    const deepCategories = useMemo(() => {
      if (!deepResults) return []
      return CATEGORY_ORDER.filter(
        (type) => deepResults[type]?.length && !quickResults?.[type]?.length
      )
    }, [deepResults, quickResults])

    let runningIndex = 0

    if (orderedCategories.length === 0 && !deepLoading) {
      return (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-400">No results found</p>
          <p className="text-xs text-gray-400/70 mt-1">
            Try searching for trips, activities, restaurants, or places
          </p>
        </div>
      )
    }

    return (
      <div ref={ref} className="max-h-[400px] overflow-y-auto py-2 scroll-smooth">
        {/* Phase 1: renders immediately */}
        {quickCategories.map((type, groupIndex) => {
          const baseIndex = runningIndex
          runningIndex += results[type]?.length ?? 0
          return (
            <SpotlightResultGroup
              key={type}
              type={type}
              results={results[type] ?? []}
              activeIndex={activeIndex}
              baseIndex={baseIndex}
              onSelect={onSelect}
              query={query}
              animationDelay={groupIndex * 0.05}
              itemRefs={itemRefs}
              isPinned={isPinned}
            />
          )
        })}

        {/* Phase 2: animates in when deep results arrive */}
        <AnimatePresence>
          {deepCategories.map((type, groupIndex) => {
            const baseIndex = runningIndex
            runningIndex += results[type]?.length ?? 0
            return (
              <motion.div
                key={`deep-${type}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, delay: groupIndex * 0.05 }}
              >
                <SpotlightResultGroup
                  type={type}
                  results={results[type] ?? []}
                  activeIndex={activeIndex}
                  baseIndex={baseIndex}
                  onSelect={onSelect}
                  query={query}
                  itemRefs={itemRefs}
                  isPinned={isPinned}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Phase 2 loading indicator */}
        <AnimatePresence>
          {deepLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-2 text-center"
            >
              <p className="text-[11px] text-gray-400/60">Searching external sources...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  },
)
