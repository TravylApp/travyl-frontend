'use client'

import type { TripCollaborator, CollaboratorRole } from '@travyl/shared'

interface CollaboratorListProps {
  ownerName: string
  ownerEmail: string
  collaborators: TripCollaborator[]
  onChangeRole: (collaboratorId: string, role: CollaboratorRole) => void
  onRemove: (collaboratorId: string) => void
}

export function CollaboratorList({ ownerName, ownerEmail, collaborators, onChangeRole, onRemove }: CollaboratorListProps) {
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-wide text-white/40">People with access</div>

      {/* Owner row */}
      <div className="flex items-center justify-between border-b border-white/10 py-2">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#003594] text-xs text-white">
            {ownerName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm text-white">{ownerName}</div>
            <div className="text-xs text-white/40">{ownerEmail}</div>
          </div>
        </div>
        <span className="text-xs text-white/40">Owner</span>
      </div>

      {/* Collaborator rows */}
      {collaborators.map((collab) => (
        <div key={collab.id} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
              {(collab.invited_email ?? 'U').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-sm text-white">{collab.invited_email ?? 'Unknown'}</div>
              {collab.invite_status === 'pending' && <span className="text-xs text-amber-400">Pending</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
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
    </div>
  )
}
