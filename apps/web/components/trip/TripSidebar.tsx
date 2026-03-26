'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import {
  Map, Calendar, PageEdit, Wallet, Settings, Suitcase,
  Airplane, Compass, Heart, Car, HomeSimple, Building,
  Cutlery,
} from 'iconoir-react'

const SIDEBAR_COLLAPSED_WIDTH = 48
const SIDEBAR_EXPANDED_WIDTH = 240
const SIDEBAR_COLLAPSE_DELAY = 200

interface NavItem {
  segment: string
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  {
    segment: '',
    label: 'Overview',
    icon: <HomeSimple width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    segment: 'itinerary',
    label: 'Itinerary',
    icon: <PageEdit width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    segment: 'calendar',
    label: 'Calendar',
    icon: <Calendar width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    segment: 'hotels',
    label: 'Hotels',
    icon: <Building width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    segment: 'flights',
    label: 'Flights',
    icon: <Airplane width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    segment: 'restaurants',
    label: 'Restaurants',
    icon: <Cutlery width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    segment: 'activities',
    label: 'Explore',
    icon: <Compass width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    segment: 'packing',
    label: 'Packing',
    icon: <Suitcase width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    segment: 'budget',
    label: 'Budget',
    icon: <Wallet width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    segment: 'cars',
    label: 'Car Rental',
    icon: <Car width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    segment: 'favorites',
    label: 'Favorites',
    icon: <Heart width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    segment: 'settings',
    label: 'Settings',
    icon: <Settings width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
]

interface TripSidebarProps {
  tripId: string
}

export function TripSidebar({ tripId }: TripSidebarProps) {
  const pathname = usePathname()
  const basePath = `/trip/${tripId}`
  const [expanded, setExpanded] = useState(false)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function isActive(segment: string) {
    if (segment === '') return pathname === basePath || pathname === basePath + '/'
    return pathname === `${basePath}/${segment}` || pathname.startsWith(`${basePath}/${segment}/`)
  }

  function handleMouseEnter() {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current)
      collapseTimer.current = null
    }
    setExpanded(true)
  }

  function handleMouseLeave() {
    collapseTimer.current = setTimeout(() => {
      setExpanded(false)
    }, SIDEBAR_COLLAPSE_DELAY)
  }

  return (
    <motion.nav
      animate={{ width: expanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex flex-col shrink-0 overflow-hidden border-r border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-[#111827] h-screen sticky top-0"
      aria-label="Trip navigation"
    >
      <ul className="flex flex-col gap-0.5 p-2 mt-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.segment)
          const href = item.segment ? `${basePath}/${item.segment}` : basePath
          return (
            <li key={item.segment}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors group relative',
                  active
                    ? 'bg-[#1e3a5f]/10 text-[#1e3a5f] dark:bg-white/10 dark:text-white font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-gray-200',
                ].join(' ')}
              >
                <span className="shrink-0">{item.icon}</span>
                {expanded ? (
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.label}
                  </span>
                ) : (
                  <span className="absolute left-full ml-2 px-2.5 py-1 bg-gray-900 text-white text-[11px] font-medium rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-30">
                    {item.label}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="flex-1" />
    </motion.nav>
  )
}
