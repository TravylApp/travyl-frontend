'use client'
import { useState, useRef } from 'react'
import { motion } from 'motion/react'
import { Map, Calendar, PageEdit, Wallet, Settings, Suitcase } from 'iconoir-react'
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_COLLAPSE_DELAY,
} from './constants'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <Map width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: <Calendar width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    id: 'info',
    label: 'Info',
    icon: <PageEdit width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    id: 'budget',
    label: 'Budget',
    icon: <Wallet width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    id: 'packing',
    label: 'Packing',
    icon: <Suitcase width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
  },
]

interface TripSidebarProps {
  activeNav?: string
  onNavChange?: (id: string) => void
}

export function TripSidebar({
  activeNav = 'calendar',
  onNavChange,
}: TripSidebarProps) {
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
      className="relative flex flex-col shrink-0 overflow-hidden border-r border-[var(--cal-border)] bg-[var(--cal-surface)]"
      aria-label="Trip navigation"
    >
      {/* Nav items */}
      <ul className="flex flex-col gap-0.5 p-2 mt-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === activeNav
          return (
            <li key={item.id}>
              <button
                onClick={() => onNavChange?.(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-[var(--cal-nav-active-bg)] text-[var(--cal-nav-active-text)]'
                    : 'text-[var(--cal-nav-inactive)] hover:bg-[var(--cal-border-light)] hover:text-[var(--cal-text)]',
                ].join(' ')}
              >
                <span className="shrink-0">{item.icon}</span>
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

      {/* Spacer */}
      <div className="flex-1" />

    </motion.nav>
  )
}
