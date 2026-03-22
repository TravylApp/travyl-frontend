'use client'

import { useCallback } from 'react'
import type { Trip } from '@travyl/shared'
import { updateTripDetails } from '@travyl/shared'
import { AppearanceSection } from './AppearanceSection'
import { TabsSection } from './TabsSection'
import { TripDetailsSection } from './TripDetailsSection'
import { SharingSection } from './SharingSection'
import { DangerZoneSection } from './DangerZoneSection'

interface TripSettingsLayoutProps {
  trip: Trip
  userId: string
  isOwner: boolean
  canEdit: boolean
  onRefetch: () => void
}

export function TripSettingsLayout({ trip, userId, isOwner, canEdit, onRefetch }: TripSettingsLayoutProps) {
  const handleFieldChange = useCallback(async (updates: Partial<Trip>) => {
    try {
      await updateTripDetails(trip.id, updates)
    } catch {
      // silent — field will revert on next data load
    }
  }, [trip.id])

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <TripDetailsSection trip={trip} canEdit={canEdit} onFieldChange={handleFieldChange} />

      {canEdit && (
        <>
          <hr className="border-gray-200 my-8" />
          <AppearanceSection canEdit={canEdit} />
        </>
      )}

      {canEdit && (
        <>
          <hr className="border-gray-200 my-8" />
          <TabsSection canEdit={canEdit} />
        </>
      )}

      <hr className="border-gray-200 my-8" />
      <SharingSection trip={trip} isOwner={isOwner} onRefetch={onRefetch} />

      <hr className="border-gray-200 my-8" />
      <DangerZoneSection trip={trip} userId={userId} isOwner={isOwner} />
    </div>
  )
}
