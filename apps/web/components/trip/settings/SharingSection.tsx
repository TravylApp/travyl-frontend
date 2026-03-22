'use client'

import { useState } from 'react'
import { updateTripVisibility } from '@travyl/shared'
import type { Trip } from '@travyl/shared'
import { SectionHeading, SectionDescription, Toggle } from './shared'

interface SharingSectionProps {
  trip: Trip
  isOwner: boolean
  onRefetch: () => void
}

export function SharingSection({ trip, isOwner, onRefetch }: SharingSectionProps) {
  const [updating, setUpdating] = useState(false)
  const isPublic = trip.visibility === 'public'

  const handleTogglePublic = async () => {
    if (updating || !isOwner) return
    setUpdating(true)
    try {
      await updateTripVisibility(trip.id, isPublic ? 'private' : 'public')
      onRefetch()
    } catch {
      alert('Failed to update visibility')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div>
      <SectionHeading>Privacy</SectionHeading>
      <SectionDescription>Control who can see this trip.</SectionDescription>
      <div className="flex items-center justify-between py-1">
        <div>
          <p className="text-sm font-medium text-gray-900">Public trip</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {isPublic
              ? 'Anyone can discover and fork this trip'
              : 'Only you and collaborators can see this trip'}
          </p>
        </div>
        {isOwner ? (
          <Toggle enabled={isPublic} onToggle={handleTogglePublic} />
        ) : (
          <span className="text-xs text-gray-400">{isPublic ? 'Public' : 'Private'}</span>
        )}
      </div>
    </div>
  )
}
