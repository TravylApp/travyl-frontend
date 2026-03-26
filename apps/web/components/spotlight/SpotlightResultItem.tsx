'use client'

import { forwardRef, useState } from 'react'
import { motion } from 'motion/react'
import { Building2, Plane, UtensilsCrossed, MapPin, Compass, ArrowRight, Settings, Terminal, Star, Calendar, Pin, Sparkles } from 'lucide-react'
import type { SpotlightResult } from '@travyl/shared'
import { highlightMatch } from './highlightMatch'

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
  action: Sparkles,
}

const TYPE_ICON_COLORS: Record<string, string> = {
  trip: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
  hotel: 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400',
  flight: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400',
  restaurant: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
  activity: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
  destination: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
  navigation: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  command: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  setting: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  action: 'bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/50 dark:to-blue-900/50 text-indigo-600 dark:text-indigo-400',
}

interface Props {
  result: SpotlightResult
  isActive: boolean
  onClick: () => void
  query: string
  isPinned?: boolean
}

export const SpotlightResultItem = forwardRef<HTMLButtonElement, Props>(
  function SpotlightResultItem({ result, isActive, onClick, query, isPinned }, ref) {
    const [imgError, setImgError] = useState(false)
    const Icon = TYPE_ICONS[result.type] ?? MapPin
    const iconColor = TYPE_ICON_COLORS[result.type] ?? TYPE_ICON_COLORS.navigation

    // Type-specific rendering
    const isActionType = result.type === 'action'
    const isRichType = ['trip', 'hotel', 'flight', 'restaurant', 'activity', 'destination'].includes(result.type)
    const isSimpleType = ['navigation', 'command', 'setting'].includes(result.type)
    const meta = result.metadata as Record<string, unknown> | undefined

    return (
      <button
        ref={ref}
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors relative ${
          isActionType ? 'my-0.5' : ''
        }`}
      >
        {/* Animated highlight background */}
        {isActive && (
          <motion.div
            layoutId="spotlight-highlight"
            className={`absolute inset-0 rounded-lg ${
              isActionType
                ? 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40'
                : 'bg-blue-50 dark:bg-blue-950/30'
            }`}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}

        {/* Action type subtle background when not active */}
        {isActionType && !isActive && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20" />
        )}

        {/* Active indicator bar */}
        {isActive && (
          <motion.div
            layoutId="spotlight-indicator"
            className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full ${
              isActionType ? 'bg-indigo-500' : 'bg-blue-500'
            }`}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}

        {/* Icon / Image */}
        <div className="relative z-10 flex-shrink-0">
          {result.imageUrl && isRichType && !imgError ? (
            <img
              src={result.imageUrl}
              alt=""
              className="w-10 h-10 rounded-lg object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconColor}`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {highlightMatch(result.title, query)}
            </span>
            {isPinned && (
              <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />
            )}
          </div>
          {result.subtitle && (
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {highlightMatch(result.subtitle, query)}
            </div>
          )}

          {/* Type-specific metadata row */}
          {isRichType && <MetadataRow result={result} meta={meta} />}
        </div>

        {/* Right-side extras */}
        <div className="relative z-10 flex-shrink-0">
          {isSimpleType && result.shortcut && (
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              {result.shortcut.display}
            </kbd>
          )}
          {result.tripTitle && result.type !== 'trip' && !isSimpleType && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 max-w-[80px] truncate">
              {result.tripTitle}
            </span>
          )}
          {isActive && !isSimpleType && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-2">
              &rarr;
            </span>
          )}
        </div>
      </button>
    )
  },
)

function MetadataRow({ result, meta }: { result: SpotlightResult; meta?: Record<string, unknown> }) {
  if (!meta && result.type !== 'trip') return null

  switch (result.type) {
    case 'trip': {
      const startDate = meta?.startDate as string | undefined
      const endDate = meta?.endDate as string | undefined
      const activityCount = meta?.activityCount as number | undefined
      const status = meta?.status as string | undefined
      if (!startDate && !activityCount && !status) return null
      return (
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {startDate && endDate && (
            <span className="flex items-center gap-0.5 text-[11px] text-gray-400 dark:text-gray-500">
              <Calendar className="w-3 h-3" />
              {formatShortDate(startDate)} - {formatShortDate(endDate)}
            </span>
          )}
          {typeof activityCount === 'number' && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              &middot; {activityCount} activities
            </span>
          )}
          {status && <StatusBadge status={status} />}
        </div>
      )
    }
    case 'hotel': {
      const stars = meta?.stars as number | undefined
      const pricePerNight = meta?.pricePerNight as string | undefined
      return (
        <div className="flex items-center gap-2 mt-0.5">
          {stars && (
            <span className="flex items-center gap-0.5">
              {Array.from({ length: Math.min(stars, 5) }).map((_, i) => (
                <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              ))}
            </span>
          )}
          {pricePerNight && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {pricePerNight}/night
            </span>
          )}
        </div>
      )
    }
    case 'flight': {
      const departure = meta?.departure as string | undefined
      const cabin = meta?.cabin as string | undefined
      return (
        <div className="flex items-center gap-2 mt-0.5">
          {departure && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500">{departure}</span>
          )}
          {cabin && (
            <span className="inline-flex px-1.5 py-0 text-[10px] font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded-full">
              {cabin}
            </span>
          )}
        </div>
      )
    }
    case 'restaurant': {
      const priceLevel = meta?.priceLevel as string | undefined
      const rating = meta?.rating as number | undefined
      const category = meta?.category as string | undefined
      return (priceLevel || rating || category) ? (
        <div className="flex items-center gap-2 mt-0.5">
          {typeof rating === 'number' && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              <Star className="w-2.5 h-2.5 fill-current" />
              {rating.toFixed(1)}
            </span>
          )}
          {priceLevel && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500">{priceLevel}</span>
          )}
          {category && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 capitalize">{category}</span>
          )}
        </div>
      ) : null
    }
    case 'activity': {
      const rating = meta?.rating as number | undefined
      const category = meta?.category as string | undefined
      return (rating || category) ? (
        <div className="flex items-center gap-2 mt-0.5">
          {typeof rating === 'number' && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              <Star className="w-2.5 h-2.5 fill-current" />
              {rating.toFixed(1)}
            </span>
          )}
          {category && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 capitalize">{category}</span>
          )}
        </div>
      ) : null
    }
    default:
      return null
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    planning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    booked: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    active: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    completed: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  }
  return (
    <span className={`inline-flex px-1.5 py-0 text-[10px] font-medium rounded-full capitalize ${styles[status] ?? styles.planning}`}>
      {status}
    </span>
  )
}

function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
  } catch {
    return dateStr
  }
}
