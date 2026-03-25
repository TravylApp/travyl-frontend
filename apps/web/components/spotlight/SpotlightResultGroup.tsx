'use client'

import type { SpotlightResult } from '@travyl/shared'
import { SpotlightResultItem } from './SpotlightResultItem'

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
}

interface Props {
  type: string
  results: SpotlightResult[]
  activeIndex: number | null
  baseIndex: number
  onSelect: (result: SpotlightResult) => void
}

export function SpotlightResultGroup({ type, results, activeIndex, baseIndex, onSelect }: Props) {
  if (!results.length) return null

  return (
    <div className="px-2 pb-1">
      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {TYPE_LABELS[type] ?? type}
      </div>
      {results.map((result, i) => (
        <SpotlightResultItem
          key={result.id}
          result={result}
          isActive={activeIndex === baseIndex + i}
          onClick={() => onSelect(result)}
        />
      ))}
    </div>
  )
}
