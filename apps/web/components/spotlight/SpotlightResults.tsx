'use client'

import { useMemo, forwardRef } from 'react'
import type { RefObject } from 'react'
import { AnimatePresence } from 'motion/react'
import type { SpotlightResult } from '@travyl/shared'
import { SpotlightResultGroup } from './SpotlightResultGroup'

const CATEGORY_ORDER = ['trip', 'restaurant', 'activity', 'destination', 'navigation', 'command', 'setting']

interface Props {
  results: Record<string, SpotlightResult[]>
  activeIndex: number
  onSelect: (result: SpotlightResult) => void
  query: string
  itemRefs: RefObject<(HTMLButtonElement | null)[]>
  isPinned?: (id: string) => boolean
}

export const SpotlightResults = forwardRef<HTMLDivElement, Props>(
  function SpotlightResults({ results, activeIndex, onSelect, query, itemRefs, isPinned }, ref) {
    const orderedCategories = useMemo(() => {
      return CATEGORY_ORDER.filter((type) => results[type]?.length)
    }, [results])

    let runningIndex = 0

    if (orderedCategories.length === 0) {
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
        <AnimatePresence mode="wait">
          {orderedCategories.map((type, groupIndex) => {
            const baseIndex = runningIndex
            runningIndex += results[type].length
            return (
              <SpotlightResultGroup
                key={type}
                type={type}
                results={results[type]}
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
        </AnimatePresence>
      </div>
    )
  },
)
