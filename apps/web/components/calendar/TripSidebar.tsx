'use client'
import { useState, useRef } from 'react'
import { motion } from 'motion/react'
import { MiniCalendar } from './MiniCalendar'
import { CollaboratorAvatars } from './CollaboratorAvatars'
import type { CalendarActivity, UserAwareness } from './types'
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
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5 2V4M11 2V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M2 7H14" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    id: 'info',
    label: 'Info',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 7V11M8 5.5V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'budget',
    label: 'Budget',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 2V3M8 13V14M4 8C4 5.791 5.791 4 8 4C10.209 4 12 5.791 12 8C12 10.209 10.209 12 8 12C5.791 12 4 10.209 4 8Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.05 3.05L4.1 4.1M11.9 11.9L12.95 12.95M3.05 12.95L4.1 11.9M11.9 4.1L12.95 3.05"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

interface TripSidebarProps {
  activeNav?: string
  onNavChange?: (id: string) => void
  collaborators: UserAwareness[]
  activities: CalendarActivity[]
  tripStartDate: Date
  tripDays: number
  currentDay: number
  onSelectDay: (dayIndex: number) => void
}

export function TripSidebar({
  activeNav = 'calendar',
  onNavChange,
  collaborators,
  activities,
  tripStartDate,
  tripDays,
  currentDay,
  onSelectDay,
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
      className="relative flex flex-col shrink-0 overflow-hidden border-r border-white/10 bg-[#141824]"
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
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white',
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

      {/* Mini calendar (expanded only) */}
      {expanded && (
        <div className="border-t border-white/10">
          <MiniCalendar
            tripStartDate={tripStartDate}
            tripDays={tripDays}
            currentDay={currentDay}
            onSelectDay={onSelectDay}
          />
        </div>
      )}

      {/* Collaborator avatars */}
      <div className="border-t border-white/10">
        <CollaboratorAvatars
          collaborators={collaborators}
          activities={activities}
          expanded={expanded}
        />
      </div>
    </motion.nav>
  )
}
