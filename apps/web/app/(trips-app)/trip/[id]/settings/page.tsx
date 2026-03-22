'use client'

import { use } from 'react'
import { useItineraryScreen, useAuthStore, isTripOwner, canEditTrip } from '@travyl/shared'
import { TripSettingsLayout } from '@/components/trip/settings/TripSettingsLayout'

export default function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { trip, isLoading, refetch } = useItineraryScreen(id)
  const user = useAuthStore((s) => s.user)

  if (isLoading || !trip) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-xl bg-gray-200 animate-pulse" />
        <div className="h-16 rounded-xl bg-gray-200 animate-pulse" />
      </div>
    )
  }

  const userId = user?.id ?? ''
  const isOwner = isTripOwner(trip, userId)
  const canEdit = canEditTrip(trip, userId)

  return (
    <TripSettingsLayout
      trip={trip}
      userId={userId}
      isOwner={isOwner}
      canEdit={canEdit}
      onRefetch={refetch}
    />
  )
}
