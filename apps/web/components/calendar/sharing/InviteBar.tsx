'use client'

import { useState } from 'react'
import type { CollaboratorRole } from '@travyl/shared'

interface InviteBarProps {
  onInvite: (email: string, role: CollaboratorRole) => Promise<void>
  isLoading?: boolean
}

export function InviteBar({ onInvite, isLoading }: InviteBarProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<CollaboratorRole>('viewer')

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    try {
      await onInvite(trimmed, role)
      setEmail('') // only clear on success
    } catch {
      // error display handled by parent
    }
  }

  return (
    <div className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="Add people by email..."
        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-primary"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as CollaboratorRole)}
        className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-white/80"
      >
        <option value="viewer">Viewer</option>
        <option value="editor">Editor</option>
      </select>
      <button
        onClick={handleSubmit}
        disabled={isLoading || !email.trim()}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Invite
      </button>
    </div>
  )
}
