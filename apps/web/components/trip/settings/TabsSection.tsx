'use client'

import {
  Home, Calendar, Building2, Plane, UtensilsCrossed, Compass,
  Luggage, PieChart, Car, Heart, Settings2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTripTheme } from '@/components/trip/TripThemeContext'
import { SectionHeading, SectionDescription, Toggle } from './shared'

const CONFIGURABLE_TABS: { segment: string; label: string; icon: LucideIcon; alwaysOn?: boolean }[] = [
  { segment: 'index',       label: 'Overview',    icon: Home,              alwaysOn: true },
  { segment: 'itinerary',   label: 'Itinerary',   icon: Calendar },
  { segment: 'hotels',      label: 'Hotels',      icon: Building2 },
  { segment: 'flights',     label: 'Flights',     icon: Plane },
  { segment: 'restaurants', label: 'Restaurants',  icon: UtensilsCrossed },
  { segment: 'activities',  label: 'Explore',     icon: Compass },
  { segment: 'packing',     label: 'Packing',     icon: Luggage },
  { segment: 'budget',      label: 'Budget',      icon: PieChart },
  { segment: 'cars',        label: 'Car Rental',  icon: Car },
  { segment: 'favorites',   label: 'Favorites',   icon: Heart },
  { segment: 'settings',    label: 'Settings',    icon: Settings2,         alwaysOn: true },
]

interface TabsSectionProps {
  canEdit: boolean
}

export function TabsSection({ canEdit }: TabsSectionProps) {
  const { theme, tabColorOverrides, hiddenTabs, setTabHidden } = useTripTheme()

  if (!canEdit) {
    return (
      <div>
        <SectionHeading>Tabs</SectionHeading>
        <p className="text-sm text-gray-500">You don&apos;t have permission to manage tabs.</p>
      </div>
    )
  }

  return (
    <div>
      <SectionHeading>Tabs</SectionHeading>
      <SectionDescription>Choose which tabs appear in your trip navigation.</SectionDescription>
      <div className="space-y-1">
        {CONFIGURABLE_TABS.map(({ segment, label, icon: Icon, alwaysOn }) => {
          const isEnabled = !hiddenTabs[segment]
          const tabColor = tabColorOverrides[segment] ?? theme.tabColors[segment] ?? theme.base
          return (
            <div key={segment} className="flex items-center justify-between rounded-lg py-2.5 px-3 hover:bg-gray-50 transition">
              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: isEnabled ? tabColor : '#E5E7EB' }}
                >
                  <Icon size={13} style={{ color: theme.textOnBase }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  {alwaysOn && <p className="text-[11px] text-gray-400">Always visible</p>}
                </div>
              </div>
              {alwaysOn ? (
                <span className="text-xs font-medium text-gray-400">Required</span>
              ) : (
                <Toggle enabled={isEnabled} onToggle={() => setTabHidden(segment, isEnabled)} color={theme.base} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
