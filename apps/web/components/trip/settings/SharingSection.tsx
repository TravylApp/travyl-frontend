'use client'

import { useState } from 'react'
import { Globe, Share2, GitFork, Copy, Shield } from 'lucide-react'
import { updateTripVisibility, ensureShareLinkToken } from '@travyl/shared'
import type { Trip } from '@travyl/shared'
import { SectionHeading, Toggle, Select } from './shared'

interface SharingSectionProps {
  trip: Trip
  isOwner: boolean
  onRefetch: () => void
}

export function SharingSection({ trip, isOwner, onRefetch }: SharingSectionProps) {
  const [copied, setCopied] = useState(false)
  const [updating, setUpdating] = useState(false)

  const isPublic = trip.visibility === 'public'
  const isShared = trip.visibility !== 'private'

  const shareUrl = trip.share_link_token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/trip/${trip.id}/share/${trip.share_link_token}`
    : ''

  const copyShareLink = () => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleToggleShareLink = async () => {
    if (updating) return
    setUpdating(true)
    try {
      if (isShared) {
        await updateTripVisibility(trip.id, 'private')
      } else {
        await ensureShareLinkToken(trip.id)
        await updateTripVisibility(trip.id, 'link')
      }
      onRefetch()
    } catch {
      alert('Failed to update sharing settings')
    } finally {
      setUpdating(false)
    }
  }

  const handleTogglePublic = async () => {
    if (updating) return
    setUpdating(true)
    try {
      await updateTripVisibility(trip.id, isPublic ? 'link' : 'public')
      onRefetch()
    } catch {
      alert('Failed to update visibility')
    } finally {
      setUpdating(false)
    }
  }

  const handleLinkPermissionChange = async (permission: string) => {
    if (updating) return
    setUpdating(true)
    try {
      await updateTripVisibility(trip.id, trip.visibility, permission as 'viewer' | 'editor')
      onRefetch()
    } catch {
      alert('Failed to update link permission')
    } finally {
      setUpdating(false)
    }
  }

  if (!isOwner) {
    const visibilityLabel =
      trip.visibility === 'public' ? 'This trip is public' :
      trip.visibility === 'link' ? 'This trip is shared via link' :
      'This trip is private'

    return (
      <div>
        <SectionHeading>Sharing</SectionHeading>
        <div className="text-center py-8">
          <Shield size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Only the trip owner can manage sharing settings.</p>
          <p className="text-xs text-gray-400 mt-1">{visibilityLabel}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionHeading>Sharing</SectionHeading>
      <div className="space-y-4">
        {/* Share Link Toggle */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-50">
              <Share2 size={16} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Share Link</p>
              <p className="text-xs text-gray-500 mt-0.5">Generate a link to share with specific people</p>
            </div>
          </div>
          <Toggle enabled={isShared} onToggle={handleToggleShareLink} />
        </div>

        {/* Make Public Toggle — only when shared */}
        {isShared && (
          <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50">
                <Globe size={16} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Make Public</p>
                <p className="text-xs text-gray-500 mt-0.5">Allow anyone to discover and fork this trip</p>
              </div>
            </div>
            <Toggle enabled={isPublic} onToggle={handleTogglePublic} />
          </div>
        )}

        {/* Link Permission — only when shared */}
        {isShared && (
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">Link Permission</p>
            <p className="text-xs text-gray-500 mb-3">What can people with the link do?</p>
            <Select
              value={trip.link_permission}
              onChange={handleLinkPermissionChange}
              options={[
                { value: 'viewer', label: 'Can view' },
                { value: 'editor', label: 'Can edit' },
              ]}
            />
          </div>
        )}

        {/* Share URL Display */}
        {isShared && trip.share_link_token && (
          <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <Copy size={14} className="text-gray-500" />
              <p className="text-sm font-medium text-gray-700">Share URL</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs text-gray-600 font-mono truncate">
                {shareUrl}
              </div>
              <button
                onClick={copyShareLink}
                className="shrink-0 text-xs font-medium px-3 py-2 rounded-lg text-white transition"
                style={{ backgroundColor: copied ? '#10b981' : '#1e3a5f' }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Fork Count */}
        {trip.fork_count > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-green-50">
              <GitFork size={16} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {trip.fork_count} Fork{trip.fork_count === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">This trip has been forked by other users</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
