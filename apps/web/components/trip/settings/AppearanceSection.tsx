'use client'

import { ThemePicker } from '@/components/trip/ThemePicker'
import { useTripTheme } from '@/components/trip/TripThemeContext'
import { SectionHeading, SectionDescription } from './shared'

interface AppearanceSectionProps {
  canEdit: boolean
}

export function AppearanceSection({ canEdit }: AppearanceSectionProps) {
  const {
    theme, themeId, customColor,
    setTripTheme,
    tabColorOverrides, setTabColor, resetTabColors,
    itineraryColorOverrides, setItineraryColor, resetItineraryColors,
  } = useTripTheme()

  if (!canEdit) {
    return (
      <div>
        <SectionHeading>Theme & Colors</SectionHeading>
        <p className="text-sm text-gray-500">You don&apos;t have permission to change the trip theme.</p>
      </div>
    )
  }

  return (
    <div>
      <SectionHeading>Theme & Colors</SectionHeading>
      <SectionDescription>Customize the look and feel of your trip.</SectionDescription>
      <ThemePicker
        currentTheme={themeId}
        customColor={customColor}
        onSelectTheme={(tid, color) => setTripTheme(tid, color)}
        tabColors={theme.tabColors}
        tabColorOverrides={tabColorOverrides}
        onTabColorChange={(name, color) => setTabColor(name, color)}
        onResetTabColors={() => resetTabColors()}
        itineraryColors={theme.itineraryColors}
        itineraryColorOverrides={itineraryColorOverrides}
        onItineraryColorChange={(section, color) => setItineraryColor(section, color)}
        onResetItineraryColors={() => resetItineraryColors()}
      />
    </div>
  )
}
