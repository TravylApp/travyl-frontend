'use client'

import { usePathname } from 'next/navigation'
import {
  HomeSimple,
  Globe,
  MapPin,
} from 'iconoir-react'

export interface DashboardNavItem {
  icon: React.ElementType
  label: string
  href: string
  segment: string
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { icon: HomeSimple, label: 'My Trips', href: '/trips', segment: 'trips' },
  { icon: Globe, label: 'Explore', href: '/explore', segment: 'explore' },
  { icon: MapPin, label: 'Places', href: '/places', segment: 'places' },
]

export function useDashboardNav() {
  const pathname = usePathname()

  const tripIdMatch = pathname.match(/^\/trip\/([^/]+)/)
  const tripId = tripIdMatch ? tripIdMatch[1] : null
  const isInsideTrip = tripId !== null && tripId !== 'preview'

  const activeSection = pathname.startsWith('/explore')
    ? 'explore' as const
    : pathname.startsWith('/places')
      ? 'places' as const
      : 'trips' as const

  const activeTab = isInsideTrip
    ? (() => {
        const basePath = `/trip/${tripId}`
        const segment = pathname.replace(basePath, '').replace(/^\//, '') || ''
        return segment || null
      })()
    : null

  return {
    sidebarItems: DASHBOARD_NAV_ITEMS,
    activeSection,
    isInsideTrip,
    tripId,
    activeTab,
    pathname,
  }
}
