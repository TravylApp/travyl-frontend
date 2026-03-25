'use client'

import { Clock, Building2, Plane, UtensilsCrossed, MapPin } from 'lucide-react'

interface Props {
  recentSearches: string[]
  onSelectRecent: (query: string) => void
  onClearRecent: () => void
}

const QUICK_CATEGORIES = [
  { label: 'Hotels', icon: Building2 },
  { label: 'Flights', icon: Plane },
  { label: 'Restaurants', icon: UtensilsCrossed },
  { label: 'Activities', icon: MapPin },
]

export function SpotlightEmptyState({ recentSearches, onSelectRecent, onClearRecent }: Props) {
  return (
    <div className="px-4 py-3">
      {recentSearches.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Recent</span>
            <button onClick={onClearRecent} className="text-[11px] text-gray-400 hover:text-gray-600">
              Clear
            </button>
          </div>
          {recentSearches.slice(0, 5).map((q) => (
            <button
              key={q}
              onClick={() => onSelectRecent(q)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-md"
            >
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {q}
            </button>
          ))}
        </div>
      )}
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block">Browse</span>
        <div className="flex gap-2 flex-wrap">
          {QUICK_CATEGORIES.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => onSelectRecent(label.toLowerCase())}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
