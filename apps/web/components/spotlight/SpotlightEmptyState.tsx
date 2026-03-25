'use client'

import { Clock, Building2, Plane, UtensilsCrossed, MapPin, Plus, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  recentSearches: string[]
  onSelectRecent: (query: string) => void
  onClearRecent: () => void
  onClose: () => void
}

const QUICK_CATEGORIES = [
  { label: 'Hotels', icon: Building2 },
  { label: 'Flights', icon: Plane },
  { label: 'Restaurants', icon: UtensilsCrossed },
  { label: 'Activities', icon: MapPin },
]

const QUICK_ACTIONS = [
  { label: 'New Trip', icon: Plus, href: '/trips?new=true', shortcut: null },
  { label: 'Go to Calendar', icon: Calendar, href: '/trips', shortcut: null },
]

export function SpotlightEmptyState({ recentSearches, onSelectRecent, onClearRecent, onClose }: Props) {
  const router = useRouter()

  return (
    <div className="px-4 py-3">
      {/* Quick Actions */}
      <div className="mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block">
          Quick Actions
        </span>
        <div className="space-y-0.5">
          {QUICK_ACTIONS.map(({ label, icon: Icon, href }) => (
            <button
              key={label}
              onClick={() => {
                onClose()
                router.push(href)
              }}
              className="flex items-center gap-2.5 w-full px-2.5 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
            >
              <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-blue-500" />
              </div>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Recent</span>
            <button onClick={onClearRecent} className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              Clear
            </button>
          </div>
          {recentSearches.slice(0, 5).map((q) => (
            <button
              key={q}
              onClick={() => onSelectRecent(q)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-md transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Browse Categories */}
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

      {/* Keyboard hint */}
      <p className="text-[11px] text-gray-400/60 mt-4 text-center">
        Type to search &middot; Use arrow keys to navigate
      </p>
    </div>
  )
}
