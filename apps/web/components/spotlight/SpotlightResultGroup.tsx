'use client'

import { motion } from 'motion/react'
import type { SpotlightResult } from '@travyl/shared'
import { SpotlightResultItem } from './SpotlightResultItem'
import type { RefObject } from 'react'

const TYPE_LABELS: Record<string, string> = {
  trip: 'Trips',
  hotel: 'Hotels',
  flight: 'Flights',
  restaurant: 'Restaurants',
  activity: 'Activities',
  destination: 'Destinations',
  navigation: 'Navigation',
  command: 'Commands',
  setting: 'Settings',
  action: 'Quick Actions',
}

const SOURCE_LABELS: Record<string, string> = {
  'my-trips': 'Your trips',
  'foursquare': 'Foursquare',
  'discover': 'Discover',
  'serpapi': 'Web',
  'collaborators': 'People',
}

interface Props {
  type: string
  results: SpotlightResult[]
  activeIndex: number | null
  baseIndex: number
  onSelect: (result: SpotlightResult) => void
  query: string
  animationDelay?: number
  itemRefs: RefObject<(HTMLButtonElement | null)[]>
  isPinned?: (id: string) => boolean
}

export function SpotlightResultGroup({
  type,
  results,
  activeIndex,
  baseIndex,
  onSelect,
  query,
  animationDelay = 0,
  itemRefs,
  isPinned,
}: Props) {
  if (!results.length) return null

  return (
    <motion.div
      className="px-2 pb-1"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: animationDelay }}
    >
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {TYPE_LABELS[type] ?? type}
        </span>
        <span className="text-[10px] text-gray-300 dark:text-gray-600">
          ({results.length})
        </span>
        {(() => {
          const src = results[0]?.metadata?.source as string | undefined
          return src ? (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 leading-none">
              {SOURCE_LABELS[src] ?? src}
            </span>
          ) : null
        })()}
      </div>
      {results.map((result, i) => (
        <SpotlightResultItem
          key={result.id}
          ref={(el) => {
            if (itemRefs.current) {
              itemRefs.current[baseIndex + i] = el
            }
          }}
          result={result}
          isActive={activeIndex === baseIndex + i}
          onClick={() => onSelect(result)}
          query={query}
          isPinned={isPinned?.(result.id)}
        />
      ))}
    </motion.div>
  )
}
