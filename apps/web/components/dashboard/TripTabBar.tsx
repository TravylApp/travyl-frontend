'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTripTheme } from '@/components/trip/TripThemeContext'
import { getTabMeta } from '@/components/trip-tabs'

interface TripTabBarProps {
  tripId: string
}

export function TripTabBar({ tripId }: TripTabBarProps) {
  const pathname = usePathname()
  const basePath = `/trip/${tripId}`
  const { theme } = useTripTheme()

  const tabSegments = [
    '', 'itinerary', 'calendar', 'hotels', 'flights',
    'activities', 'packing', 'budget', 'cars', 'favorites', 'settings',
  ]

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
      {tabSegments.map((segment) => {
        const tab = getTabMeta(segment)
        if (!tab) return null
        const Icon = tab.icon
        const href = segment ? `${basePath}/${segment}` : basePath
        const isActive = segment === ''
          ? pathname === basePath || pathname === basePath + '/'
          : pathname === `${basePath}/${segment}` || pathname.startsWith(`${basePath}/${segment}/`)

        return (
          <Link
            key={segment || 'overview'}
            href={href}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'text-white'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06]',
            ].join(' ')}
            style={isActive ? { backgroundColor: theme.base } : undefined}
          >
            <Icon size={14} />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
