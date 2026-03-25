'use client'

import { useMemo } from 'react'
import type { SpotlightResult } from '@travyl/shared'
import { SpotlightResultGroup } from './SpotlightResultGroup'

const CATEGORY_ORDER = ['trip', 'hotel', 'flight', 'restaurant', 'activity', 'destination', 'navigation', 'command', 'setting']

interface Props {
  results: Record<string, SpotlightResult[]>
  activeIndex: number
  onSelect: (result: SpotlightResult) => void
}

export function SpotlightResults({ results, activeIndex, onSelect }: Props) {
  const orderedCategories = useMemo(() => {
    return CATEGORY_ORDER.filter((type) => results[type]?.length)
  }, [results])

  let runningIndex = 0

  if (orderedCategories.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-gray-400">
        No results found
      </div>
    )
  }

  return (
    <div className="max-h-[400px] overflow-y-auto py-2">
      {orderedCategories.map((type) => {
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
          />
        )
      })}
    </div>
  )
}
