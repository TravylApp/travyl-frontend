'use client'

import { useState } from 'react'
import { Link } from 'iconoir-react'
import type { Visibility, LinkPermission } from '@travyl/shared'

interface LinkSharingSectionProps {
  visibility: Visibility
  linkPermission: LinkPermission
  shareToken: string | null
  onToggleLinkSharing: () => void
  onChangeLinkPermission: (permission: LinkPermission) => void
  onCopyLink: () => void
}

export function LinkSharingSection({ visibility, linkPermission, shareToken, onToggleLinkSharing, onChangeLinkPermission, onCopyLink }: LinkSharingSectionProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    onCopyLink()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isLinkEnabled = visibility !== 'private'

  return (
    <div className="border-t border-white/10 pt-4">
      {!isLinkEnabled ? (
        <button onClick={onToggleLinkSharing} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white">
          <Link className="h-4 w-4 text-white/60" />
          <span>Enable link sharing</span>
        </button>
      ) : (
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
      )}
    </div>
  )
}
