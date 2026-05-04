'use client'

import { useMemo, useState } from 'react'
import { Flag } from 'lucide-react'
import { toast } from 'sonner'
import type { TripCollaborator, CollaboratorRole } from '@travyl/shared'
import { AvatarReportModal, type AvatarReportDraft } from './AvatarReportModal'

interface CollaboratorListProps {
  tripId: string
  currentUserId: string | null
  ownerUserId: string | null
  ownerName: string
  ownerEmail: string
  ownerAvatarUrl?: string | null
  collaborators: TripCollaborator[]
  onChangeRole: (collaboratorId: string, role: CollaboratorRole) => void
  onRemove: (collaboratorId: string) => void
}

export function CollaboratorList({
  tripId,
  currentUserId,
  ownerUserId,
  ownerName,
  ownerEmail,
  ownerAvatarUrl,
  collaborators,
  onChangeRole,
  onRemove,
}: CollaboratorListProps) {
  const [reportTarget, setReportTarget] = useState<{
    collaboratorId: string
    reportedUserId: string | null
    reportedLabel: string
    avatarUrl?: string | null
    sourceTripId?: string
  } | null>(null)

  const acceptedCollaborators = useMemo(
    () => collaborators.filter((collab) => collab.invite_status === 'accepted'),
    [collaborators]
  )

  const handleSubmitReport = async (draft: AvatarReportDraft) => {
    console.info('[avatar-report-draft]', draft)
    toast.success(`Saved avatar report draft for ${draft.reportedLabel}`)
  }

  const renderAvatar = (label: string, avatarUrl?: string | null, fallbackClassName?: string) => {
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt=""
          className="h-8 w-8 rounded-full object-cover"
        />
      )
    }

    return (
      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs text-white ${fallbackClassName ?? 'bg-emerald-500'}`}>
        {label.slice(0, 2).toUpperCase()}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-wide text-white/40">People with access</div>

      {/* Owner row */}
      <div className="flex items-center justify-between border-b border-white/10 py-2">
        <div className="flex items-center gap-3">
          {renderAvatar(ownerName || ownerEmail || 'U', ownerAvatarUrl, 'bg-primary')}
          <div>
            <div className="text-sm text-white">{ownerName}</div>
            <div className="text-xs text-white/40">{ownerEmail}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Owner</span>
          {ownerUserId && ownerUserId !== currentUserId && (
            <button
              type="button"
              onClick={() =>
                setReportTarget({
                  collaboratorId: 'owner',
                  reportedUserId: ownerUserId,
                  reportedLabel: ownerName || ownerEmail || 'Trip owner',
                  avatarUrl: ownerAvatarUrl ?? null,
                  sourceTripId: tripId,
                })
              }
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/55 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              <Flag size={12} />
              Report avatar
            </button>
          )}
        </div>
      </div>

      {/* Collaborator rows */}
      {collaborators.map((collab) => (
        <div key={collab.id} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            {renderAvatar(collab.display_name || collab.invited_email || 'U', collab.avatar_url)}
            <div>
              <div className="text-sm text-white">{collab.display_name ?? collab.invited_email ?? 'Unknown'}</div>
              {collab.display_name && collab.invited_email && (
                <div className="text-xs text-white/40">{collab.invited_email}</div>
              )}
              {collab.invite_status === 'pending' && <span className="text-xs text-amber-400">Pending</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {collab.invite_status === 'accepted' && collab.user_id && collab.user_id !== currentUserId && (
              <button
                type="button"
                onClick={() =>
                  setReportTarget({
                    collaboratorId: collab.id,
                    reportedUserId: collab.user_id,
                    reportedLabel: collab.display_name ?? collab.invited_email ?? 'Unknown collaborator',
                    avatarUrl: collab.avatar_url ?? null,
                    sourceTripId: tripId,
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/55 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
              >
                <Flag size={12} />
                Report avatar
              </button>
            )}
            <select
              value={collab.role_type}
              onChange={(e) => onChangeRole(collab.id, e.target.value as CollaboratorRole)}
              className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button onClick={() => onRemove(collab.id)} className="text-white/30 transition-colors hover:text-red-400" aria-label="Remove collaborator">&times;</button>
          </div>
        </div>
      ))}

      {acceptedCollaborators.length === 0 && (
        <div className="mt-3 text-xs text-white/35">
          No accepted collaborators yet. Avatar reporting is shown only when another visible user avatar is available.
        </div>
      )}

      <AvatarReportModal
        isOpen={!!reportTarget}
        target={reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={handleSubmitReport}
      />
    </div>
  )
}
