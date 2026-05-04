'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { NavArrowLeft } from 'iconoir-react'
import { useAuthStore, useItineraryScreen } from '@travyl/shared'
import { DASHBOARD_NAV_ITEMS } from '@/hooks/useDashboardNav'
import type { DashboardNavItem } from '@/hooks/useDashboardNav'

const COLLAPSED_WIDTH = 48
const EXPANDED_WIDTH = 200
const COLLAPSE_DELAY = 200

function TripBadge({ tripId, expanded }: { tripId: string; expanded: boolean }) {
  const { trip } = useItineraryScreen(tripId)
  return (
    <div className="px-2 pt-3 pb-1 border-b border-gray-200 dark:border-white/[0.06]">
      <Link
        href="/trips"
        className="flex items-center gap-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <NavArrowLeft width={16} height={16} strokeWidth={1.5} />
        {expanded && <span className="text-[11px] font-medium">Back to Trips</span>}
      </Link>
      {expanded && trip?.destination && (
        <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-200 mt-1 truncate px-0.5">
          {trip.destination}
        </p>
      )}
    </div>
  )
}

export function DashboardSidebar() {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { user } = useAuthStore()

  const tripIdMatch = pathname.match(/^\/trip\/([^/]+)/)
  const tripId = tripIdMatch?.[1] ?? null
  const isInsideTrip = !!tripId && tripId !== 'preview'

  function isActive(item: DashboardNavItem) {
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  function handleMouseEnter() {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current)
      collapseTimer.current = null
    }
    setExpanded(true)
  }

  function handleMouseLeave() {
    collapseTimer.current = setTimeout(() => setExpanded(false), COLLAPSE_DELAY)
  }

  const initials = user?.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <motion.nav
      animate={{ width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex flex-col shrink-0 overflow-hidden border-r border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-[#111827] h-screen"
      aria-label="Dashboard navigation"
    >
      {/* Trip badge — only rendered when inside a trip */}
      <AnimatePresence>
        {isInsideTrip && tripId && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <TripBadge tripId={tripId} expanded={expanded} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main nav items */}
      <ul className="flex flex-col gap-0.5 p-2 mt-2">
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const active = isActive(item)
          const Icon = item.icon
          return (
            <li key={item.segment}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors group relative',
                  active
                    ? 'bg-[#1e3a5f]/10 text-[#1e3a5f] dark:bg-white/10 dark:text-white font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-gray-200',
                ].join(' ')}
              >
                <Icon width={18} height={18} strokeWidth={1.5} className="shrink-0" />
                {expanded ? (
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
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

      {/* Bottom: user avatar */}
      <div className="p-2 border-t border-gray-200 dark:border-white/[0.06]">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1e3a5f] text-white text-[11px] font-medium mx-auto">
          {initials}
        </div>
      </div>
    </motion.nav>
  )
}
