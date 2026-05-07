'use client'

import { Menu } from 'iconoir-react'
import { useDashboardNav } from '@/hooks/useDashboardNav'
import { useDashboardTopBarSlot } from '@/components/dashboard/DashboardTopBarSlot'

interface DashboardTopBarProps {
  onMobileMenuToggle?: () => void
}

export function DashboardTopBar({ onMobileMenuToggle }: DashboardTopBarProps) {
  const { activeSection, isInsideTrip } = useDashboardNav()
  const tripTabs = useDashboardTopBarSlot()

  return (
    <header className="shrink-0 h-12 border-b border-gray-200 dark:border-white/[0.06] bg-white dark:bg-background flex items-center px-4 sticky top-0 z-20">
      {/* Mobile hamburger */}
      <button
        onClick={onMobileMenuToggle}
        className="md:hidden mr-3 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
        aria-label="Toggle menu"
      >
        <Menu width={20} height={20} strokeWidth={1.5} className="text-gray-600 dark:text-gray-400" />
      </button>

      {/* Content — breadcrumb or trip tabs */}
      {!isInsideTrip ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Dashboard</span>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {activeSection === 'trips' ? 'My Trips' : activeSection === 'explore' ? 'Explore' : 'Places'}
          </span>
        </div>
      ) : (
        tripTabs ?? <div className="flex-1" />
      )}
    </header>
  )
}
