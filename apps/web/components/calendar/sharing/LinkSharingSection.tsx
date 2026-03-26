'use client'

import { useEffect, useState } from 'react'
import { Link } from 'iconoir-react'
import type { Visibility, LinkPermission } from '@travyl/shared'

interface LinkSharingSectionProps {
  visibility: Visibility
  linkPermission: LinkPermission
  shareToken: string | null
  isOwner: boolean
  onToggleLinkSharing: () => void
  onChangeLinkPermission: (permission: LinkPermission) => void
  onCopyLink: () => void
  onRevokeLink: () => Promise<void>
}

export function LinkSharingSection({
  visibility,
  linkPermission,
  shareToken,
  isOwner,
  onToggleLinkSharing,
  onChangeLinkPermission,
  onCopyLink,
  onRevokeLink,
}: LinkSharingSectionProps) {
  const [copied, setCopied] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)
  const [revoked, setRevoked] = useState(false)

  const isLinkEnabled = visibility !== 'private'

  // Reset confirm/revoked state if link sharing is turned off
  useEffect(() => {
    if (!isLinkEnabled) {
      setShowConfirm(false)
      setRevoked(false)
    }
  }, [isLinkEnabled])

  const handleCopy = () => {
    onCopyLink()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRevoke = async () => {
    setIsRevoking(true)
    try {
      await onRevokeLink()
      setShowConfirm(false)
      setRevoked(true)
      setTimeout(() => setRevoked(false), 2000)
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <div className="border-t border-white/10 pt-4">
      {!isLinkEnabled ? (
        <button onClick={onToggleLinkSharing} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white">
          <Link className="h-4 w-4 text-white/60" />
          <span>Enable link sharing</span>
        </button>
      ) : (
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-white/60" />
              <div>
                <div className="text-sm text-white">Anyone with the link</div>
                <div className="text-xs text-white/40">can {linkPermission === 'editor' ? 'edit' : 'view'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select value={linkPermission} onChange={(e) => onChangeLinkPermission(e.target.value as LinkPermission)} className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80">
                <option value="viewer">Can view</option>
                <option value="editor">Can edit</option>
              </select>
              <button onClick={handleCopy} disabled={!shareToken} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/10">
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>

          {isOwner && shareToken && (
            <div className="mt-2">
              {!showConfirm ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
                >
                  {revoked ? 'Link revoked' : 'Revoke link'}
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2">
                  <span className="flex-1 text-xs text-red-300">Old link will stop working.</span>
                  <button
                    onClick={handleRevoke}
                    disabled={isRevoking}
                    className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    {isRevoking ? 'Revoking…' : 'Revoke'}
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="text-xs text-white/40 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
