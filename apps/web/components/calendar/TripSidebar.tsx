'use client'
import { useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import {
  Home, CalendarDays, BookOpen, Plane, Building2, UtensilsCrossed,
  Compass, Luggage, PieChart, Heart, Car, Settings,
  type LucideIcon,
} from 'lucide-react'
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_COLLAPSE_DELAY,
} from './constants'

interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  /** Defined = navigate to /trip/[id]/[segment]; undefined = in-page via onNavChange */
  segment?: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview',     label: 'Overview',     icon: Home,              segment: '' },
  { id: 'calendar',     label: 'Calendar',     icon: CalendarDays,      segment: 'calendar' },
  { id: 'itinerary',    label: 'Itinerary',    icon: BookOpen,          segment: 'itinerary' },
  { id: 'hotels',       label: 'Hotels',       icon: Building2,         segment: 'hotels' },
  { id: 'flights',      label: 'Flights',      icon: Plane,             segment: 'flights' },
  { id: 'restaurants',  label: 'Restaurants',  icon: UtensilsCrossed,   segment: 'restaurants' },
  { id: 'activities',   label: 'Explore',      icon: Compass,           segment: 'activities' },
  { id: 'packing',      label: 'Packing',      icon: Luggage,           segment: 'packing' },
  { id: 'budget',       label: 'Budget',       icon: PieChart,          segment: 'budget' },
  { id: 'cars',         label: 'Car Rental',   icon: Car,               segment: 'cars' },
  { id: 'favorites',    label: 'Favorites',    icon: Heart,             segment: 'favorites' },
  { id: 'settings',     label: 'Settings',     icon: Settings,          segment: 'settings' },
]

interface TripSidebarProps {
  tripId?: string
  onNavChange?: (id: string) => void
}

export function TripSidebar({ tripId, onNavChange }: TripSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleMouseEnter() {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current)
      collapseTimer.current = null
    }
    setExpanded(true)
  }

  function handleMouseLeave() {
    collapseTimer.current = setTimeout(() => setExpanded(false), SIDEBAR_COLLAPSE_DELAY)
  }

  function isActive(item: NavItem): boolean {
    if (!tripId) return false
    const base = `/trip/${tripId}`
    if (item.segment === '') return pathname === base
    return pathname === `${base}/${item.segment}`
  }

  function handleClick(item: NavItem) {
    if (item.segment === undefined) {
      onNavChange?.(item.id)
    } else if (tripId) {
      router.push(item.segment ? `/trip/${tripId}/${item.segment}` : `/trip/${tripId}`)
    }
  }

  return (
    <motion.nav
      animate={{ width: expanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex flex-col self-stretch shrink-0 overflow-hidden border-r border-[var(--cal-border)] bg-[var(--cal-surface)]"
      aria-label="Trip navigation"
    >
      <ul className="flex flex-col gap-0.5 p-2 mt-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item)
          const Icon = item.icon
          return (
            <li key={item.id}>
              <button
                onClick={() => handleClick(item)}
                aria-current={active ? 'page' : undefined}
                title={!expanded ? item.label : undefined}
                className={[
                  'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors',
                  active
                    ? 'bg-[var(--cal-nav-active-bg)] text-[var(--cal-nav-active-text)]'
                    : 'text-[var(--cal-nav-inactive)] hover:bg-[var(--cal-border-light)] hover:text-[var(--cal-text)]',
                ].join(' ')}
              >
                <span className="shrink-0">
                  <Icon width={18} height={18} strokeWidth={1.5} aria-hidden="true" />
                </span>
                {expanded && (
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.label}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="flex-1" />
    </motion.nav>
  )
}
