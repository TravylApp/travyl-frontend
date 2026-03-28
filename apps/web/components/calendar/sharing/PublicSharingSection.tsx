'use client'

import { useRef, useState } from 'react'
import { updateTripVisibility } from '@travyl/shared'
import type { Visibility, LinkPermission } from '@travyl/shared'
import { Globe } from 'iconoir-react'

interface PublicSharingSectionProps {
  tripId: string
  currentVisibility: Visibility
  currentLinkPermission: LinkPermission
  isOwner: boolean
  onSettingsChange: () => Promise<void>
}

export function PublicSharingSection({
  tripId,
  currentVisibility,
  currentLinkPermission,
  isOwner,
  onSettingsChange,
}: PublicSharingSectionProps) {
  const [loading, setLoading] = useState(false)

  // Capture prior state at the moment of first toggle-ON (not at mount)
  const hasToggledOnRef = useRef(false)
  const priorVisibilityRef = useRef<Visibility>(currentVisibility)
  const priorLinkPermissionRef = useRef<LinkPermission>(currentLinkPermission)

  if (!isOwner) return null

  const isPublic = currentVisibility === 'public'

  const handleToggle = async () => {
    setLoading(true)
    try {
      if (!isPublic) {
        // Snapshot prior state before changing (once per toggle cycle)
        if (!hasToggledOnRef.current) {
          priorVisibilityRef.current = currentVisibility
          priorLinkPermissionRef.current = currentLinkPermission
          hasToggledOnRef.current = true
        }
        await updateTripVisibility(tripId, 'public')
      } else {
        // Restore to prior state
        if (priorVisibilityRef.current === 'link') {
          await updateTripVisibility(tripId, 'link', priorLinkPermissionRef.current)
        } else {
          await updateTripVisibility(tripId, 'private')
        }
        hasToggledOnRef.current = false
      }
      await onSettingsChange()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Globe className="shrink-0 text-white/50" width={15} height={15} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white leading-tight">Public on Explore</p>
            <p className="text-xs text-white/50 mt-0.5 leading-tight">Anyone can find and fork this trip</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          aria-pressed={isPublic}
          className={`relative shrink-0 h-5 w-9 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-50 ${
            isPublic ? 'bg-emerald-500' : 'bg-white/20'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
              isPublic ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
