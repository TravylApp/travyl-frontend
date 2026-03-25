'use client'

import { Building2, Plane, UtensilsCrossed, MapPin, Compass, ArrowRight, Settings, Terminal } from 'lucide-react'
import type { SpotlightResult } from '@travyl/shared'

const TYPE_ICONS: Record<string, React.ElementType> = {
  trip: Compass,
  hotel: Building2,
  flight: Plane,
  restaurant: UtensilsCrossed,
  activity: MapPin,
  destination: MapPin,
  navigation: ArrowRight,
  command: Terminal,
  setting: Settings,
}

interface Props {
  result: SpotlightResult
  isActive: boolean
  onClick: () => void
}

export function SpotlightResultItem({ result, isActive, onClick }: Props) {
  const Icon = TYPE_ICONS[result.type] ?? MapPin

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
        isActive ? 'bg-blue-50 dark:bg-blue-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      {result.imageUrl ? (
        <img src={result.imageUrl} alt="" className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-gray-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{result.title}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.subtitle}</div>
      </div>
      {result.tripTitle && result.type !== 'trip' && (
        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">{result.tripTitle}</span>
      )}
    </button>
  )
}
