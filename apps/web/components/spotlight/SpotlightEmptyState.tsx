'use client'

import { Clock, Building2, Plane, UtensilsCrossed, MapPin, Plus, Calendar, Pin, Compass, ArrowRight, Terminal, Settings, Luggage, User, Info } from 'lucide-react'
// Building2 and Plane kept for PINNED_TYPE_ICONS (pinned hotel/flight results may persist in localStorage)
import { useRouter } from 'next/navigation'
import { useCommandRegistry } from '@/stores/commandRegistry'
import type { PinnedResult } from '@/hooks/useSpotlightSearch'

interface Props {
  recentSearches: string[]
  onSelectRecent: (query: string) => void
  onClearRecent: () => void
  onClose: () => void
  pinnedResults: PinnedResult[]
  onSelectPinned: (pinned: PinnedResult) => void
}

const QUICK_CATEGORIES = [
  { label: 'Restaurants', icon: UtensilsCrossed },
  { label: 'Activities', icon: MapPin },
]

const QUICK_ACTIONS = [
  { label: 'New Trip', icon: Plus, href: '/trips?new=true' },
  { label: 'My Trips', icon: Luggage, href: '/trips' },
  { label: 'Explore', icon: Compass, href: '/explore' },
  { label: 'Places', icon: MapPin, href: '/places' },
  { label: 'Profile', icon: User, href: '/profile' },
  { label: 'Settings', icon: Settings, href: '/profile/settings' },
  { label: 'About', icon: Info, href: '/about' },
]

const PINNED_TYPE_ICONS: Record<string, React.ElementType> = {
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

export function SpotlightEmptyState({ recentSearches, onSelectRecent, onClearRecent, onClose, pinnedResults, onSelectPinned }: Props) {
  const router = useRouter()
  const pageCommands = useCommandRegistry((s) => s.pageCommands)

  return (
    <div className="px-4 py-3">
      {/* Pinned Favorites */}
      {pinnedResults.length > 0 && (
        <div className="mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block">
            Pinned
          </span>
          <div className="space-y-0.5">
            {pinnedResults.map((pinned) => {
              const Icon = PINNED_TYPE_ICONS[pinned.type] ?? MapPin
              return (
                <button
                  key={pinned.id}
                  onClick={() => onSelectPinned(pinned)}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                >
                  <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <Pin className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium truncate">{pinned.title}</div>
                    {pinned.subtitle && (
                      <div className="text-xs text-gray-400 truncate">{pinned.subtitle}</div>
                    )}
                  </div>
                  <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                </button>
              )
            })}
          </div>
        </div>
      )}

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

      {/* Page Commands */}
      {pageCommands.length > 0 && (
        <div className="mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block">
            Page Commands
          </span>
          <div className="space-y-0.5">
            {pageCommands.slice(0, 6).map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => { cmd.execute(); onClose() }}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
              >
                <div className="w-7 h-7 rounded-md bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Terminal className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-medium truncate">{cmd.label}</div>
                  {cmd.shortcut && (
                    <span className="text-xs text-gray-400">{cmd.shortcut.display}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
        Type to search &middot; Use arrow keys to navigate &middot; &rarr; for actions
      </p>
    </div>
  )
}
