'use client'

import { useState, useCallback } from 'react'
import { Palette, LayoutGrid, FileText, Share2, AlertTriangle, ChevronRight, X, Save } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Trip } from '@travyl/shared'
import { updateTripDetails } from '@travyl/shared'
import { useTripTheme } from '@/components/trip/TripThemeContext'
import { AppearanceSection } from './AppearanceSection'
import { TabsSection } from './TabsSection'
import { TripDetailsSection } from './TripDetailsSection'
import { SharingSection } from './SharingSection'
import { DangerZoneSection } from './DangerZoneSection'

interface SubTab {
  id: string
  label: string
  icon: LucideIcon
}

const SUB_TABS: SubTab[] = [
  { id: 'appearance',  label: 'Theme & Colors', icon: Palette },
  { id: 'tabs',        label: 'Tabs',           icon: LayoutGrid },
  { id: 'details',     label: 'Trip Details',   icon: FileText },
  { id: 'sharing',     label: 'Sharing',        icon: Share2 },
  { id: 'danger',      label: 'Danger Zone',    icon: AlertTriangle },
]

interface TripSettingsLayoutProps {
  trip: Trip
  userId: string
  isOwner: boolean
  canEdit: boolean
  onRefetch: () => void
}

export function TripSettingsLayout({ trip, userId, isOwner, canEdit, onRefetch }: TripSettingsLayoutProps) {
  const { theme } = useTripTheme()
  const [activeTab, setActiveTab] = useState('appearance')
  const [dirty, setDirty] = useState(false)
  const [pendingUpdates, setPendingUpdates] = useState<Partial<Trip>>({})

  const markDirty = useCallback(() => setDirty(true), [])

  const handleFieldChange = useCallback((updates: Partial<Trip>) => {
    setPendingUpdates((prev) => ({ ...prev, ...updates }))
  }, [])

  const handleSave = async () => {
    if (Object.keys(pendingUpdates).length > 0) {
      try {
        await updateTripDetails(trip.id, pendingUpdates)
        onRefetch()
      } catch {
        alert('Failed to save changes')
        return
      }
    }
    setPendingUpdates({})
    setDirty(false)
  }

  const handleDiscard = () => {
    setPendingUpdates({})
    setDirty(false)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'appearance':
        return <AppearanceSection canEdit={canEdit} onDirty={markDirty} />
      case 'tabs':
        return <TabsSection canEdit={canEdit} />
      case 'details':
        return <TripDetailsSection trip={trip} canEdit={canEdit} onDirty={markDirty} onFieldChange={handleFieldChange} />
      case 'sharing':
        return <SharingSection trip={trip} isOwner={isOwner} onRefetch={onRefetch} />
      case 'danger':
        return <DangerZoneSection trip={trip} userId={userId} isOwner={isOwner} />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[480px]">
      {/* Sidebar */}
      <nav className="shrink-0 md:w-56">
        <ul className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          {SUB_TABS.map(({ id: tabId, label, icon: Icon }) => {
            const isActive = activeTab === tabId
            return (
              <li key={tabId}>
                <button
                  onClick={() => setActiveTab(tabId)}
                  className={`flex items-center gap-2.5 w-full whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                    isActive ? 'shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  style={isActive ? { backgroundColor: theme.base, color: theme.textOnBase } : undefined}
                >
                  <Icon size={16} style={isActive ? { color: theme.textOnBase } : undefined} className={isActive ? '' : 'text-gray-400'} />
                  <span className="flex-1 text-left">{label}</span>
                  <ChevronRight
                    size={14}
                    style={isActive ? { color: theme.textOnBase, opacity: 0.7 } : undefined}
                    className={`hidden md:block ${isActive ? '' : 'text-gray-300'}`}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          {renderContent()}
        </div>
      </div>

      {/* Floating save bar */}
      {dirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-xl">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <AlertTriangle size={14} className="text-amber-500" />
            Unsaved changes
          </div>
          <button
            onClick={handleDiscard}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
          >
            <X size={14} />
            Discard
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg text-white transition hover:opacity-90"
            style={{ backgroundColor: theme.base, color: theme.textOnBase }}
          >
            <Save size={14} />
            Save Changes
          </button>
        </div>
      )}
    </div>
  )
}
